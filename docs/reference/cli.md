---
sidebar_position: 1
---

# CLI Reference

The `pixel-agents` CLI starts a standalone Pixel Agents server. This page is the lookup reference for every flag, every exit code, every environment variable that affects CLI behavior.

For the use-case walkthrough, see [/use/standalone/running-the-server.md](/use/standalone/running-the-server). For the source, see `server/src/cli.ts:1-175`.

## Synopsis

```
pixel-agents [options]
npx pixel-agents [options]
```

Both invocations run the same code. `npx` downloads the package on first use; the global install gives you a permanent `pixel-agents` binary on `PATH`.

## Options

### `--port <number>`, `-p <number>`

| Default | `3100` |
|---|---|
| Type | integer |

The port to listen on. The Fastify server binds to this port on the configured host.

If the port is in use, the server fails to start with an EADDRINUSE error. Pass a different port or stop the conflicting process.

Pass `--port 0` to let the OS assign a free port. The actual port appears in the startup log line and in `~/.pixel-agents/server.json`.

Source: `server/src/cli.ts:36-39`.

### `--host <string>`

| Default | `127.0.0.1` |
|---|---|
| Type | string |

The host interface to bind to. Default is loopback (127.0.0.1), meaning only local clients can connect.

Setting to `0.0.0.0` binds to all interfaces, exposing the WebSocket to the network with no authentication (in standalone mode, WebSocket has no auth - the loopback boundary is the security model). Don't do this on an untrusted network.

If you need network access, run behind a reverse proxy that handles auth, or use SSH port forwarding from the trusted machine.

Source: `server/src/cli.ts:40-43`.

### `--help`

Print help and exit with code 0.

Source: `server/src/cli.ts:43-50`.

## Exit codes

| Code | Meaning |
|---|---|
| 0 | Normal shutdown (`--help` or SIGINT / SIGTERM after `npx pixel-agents` runs). |
| 1 | Start failure (port conflict, asset load error, etc.). |

The server runs indefinitely until SIGINT (`Ctrl+C`) or SIGTERM. Both trigger graceful shutdown: `runtime.dispose()`, `server.stop()`, `process.exit(0)`.

Source: `server/src/cli.ts:156-164`.

## What the CLI does at startup

1. Parses `argv`.
2. Loads assets from `__dirname` (which contains the CLI bundle plus `assets/` and `webview/` subdirectories at build time).
3. Constructs `FileStateAdapter({ namespace: 'standalone' })`.
4. Constructs `AgentStateStore`, calls `store.setAdapter(adapter)`.
5. Constructs `AgentRuntime(store, claudeProvider)`.
6. Starts the HTTP + WebSocket server via `PixelAgentsServer.start({ embedded: false, ... })`.
7. Reads persisted settings (`hooksEnabled`, `watchAllSessions`) into runtime refs.
8. If `hooksEnabled` is true (default), installs Claude hooks via `claudeProvider.installHooks(serverUrl, authToken)` and copies the hook script to `~/.pixel-agents/hooks/claude-hook.js`.
9. Starts project scanning of the current working directory.
10. Starts external session scanning.
11. Starts the stale-check timer.
12. Prints the server URL and waits.

Source: `server/src/cli.ts:58-169`.

## Startup output

A successful start prints:

```
[Pixel Agents] Loading assets...
[Pixel Agents] Assets loaded: 6 characters, 47 furniture items
[Pixel Agents] Server: listening on 127.0.0.1:3100
[Pixel Agents] Hooks installed
[Pixel Agents] Scanning project dir: /Users/you/.claude/projects/-Users-you-myproject

  Pixel Agents server running at http://127.0.0.1:3100
```

The asset counts depend on your bundled set and any external asset directories. The "Hooks installed" line only appears if `hooksEnabled` is true.

## Detecting an already-running server

Before starting, `PixelAgentsServer.start()` reads `~/.pixel-agents/server.json`. If it exists and the recorded PID is alive (via `process.kill(pid, 0)`), the new invocation returns that config and does NOT start a second server. The output line becomes:

```
[Pixel Agents] Reusing existing server on port 3100 (PID 12345)
```

This is the multi-window safety mechanism. The second `npx pixel-agents` invocation doesn't error - it gracefully delegates to the running one. Hooks still fire normally; clients connecting to the second instance's URL actually connect to the first's server.

Source: `server/src/server.ts:66-75, 173-181`.

## What gets written to disk

When the CLI starts:

| Path | Why |
|---|---|
| `~/.pixel-agents/` | Created (mode 0o700) if missing. |
| `~/.pixel-agents/server.json` | Written (mode 0o600) with port, PID, token, startedAt. Owned by this process. |
| `~/.pixel-agents/hooks/claude-hook.js` | Copied from the bundle if hooks are enabled. |
| `~/.claude/settings.json` | Hook entries added if hooks are enabled. |

On graceful shutdown:

- `server.json` is deleted if this process owns it (PID matches).
- Hooks remain installed (intentional - the user can toggle off via the UI to uninstall).

On crash:

- `server.json` is left behind. The next start detects the stale PID and starts fresh.
- Hooks remain installed.

## Watching the current working directory

The CLI scans `process.cwd()` for active Claude sessions, not the directory you launched from. If you `cd /tmp && npx pixel-agents`, it watches `/tmp`'s project hash.

To watch a specific project: `cd /path/to/project && npx pixel-agents`.

To watch every project simultaneously: launch from any directory, then in the UI toggle "Watch all sessions" on.

Source: `server/src/cli.ts:143-151`.

## Environment variables

The CLI itself doesn't read any environment variables for configuration. The runtime does read some optionally:

| Variable | Purpose |
|---|---|
| `PIXEL_AGENTS_DEBUG` | When `'0'`, suppresses debug log lines in `server/src/hookEventHandler.ts`. Default: debug on. |
| `PIXEL_AGENTS_VERSION` | Used by the server to populate `SettingsLoaded.extensionVersion`. Set by the bundler at build time. |

See [Environment variables reference](./environment-variables) for the full list.

## Versions and updates

To check the installed version:

```sh
npm list -g pixel-agents
# or
pixel-agents --version    # not implemented; will print help instead
```

To update:

```sh
npm install -g pixel-agents@latest
```

Or for `npx` users, the next invocation picks up the latest version automatically (npx caches recently-downloaded packages).

## What the CLI doesn't do

- **No interactive setup.** There's no first-run wizard. Settings live in `~/.pixel-agents/config.json` under the `standalone` namespace and are edited via the UI's Settings modal.
- **No config file argument.** You can't point the CLI at a custom config path.
- **No daemon mode.** The process must stay attached to the terminal. To run in the background, use your OS's process supervision (systemd, launchd, `nohup`).
- **No multi-instance mode.** Multiple `npx pixel-agents` invocations always converge on the first one's server.

## Comparison to VS Code embedded mode

The VS Code extension runs the same `server/` code but in embedded mode (`embedded: true`):

| Mode | Embedded (VS Code) | Standalone (CLI) |
|---|---|---|
| Default port | 0 (auto-assigned ephemeral) | 3100 |
| Default host | 127.0.0.1 | 127.0.0.1 |
| Static SPA serving | No | Yes (`fastify-static`) |
| WebSocket auth | Yes (Bearer required) | No (loopback boundary) |
| Hook auth | Yes (Bearer) | Yes (Bearer) |
| Logger | Quiet | Full Fastify logger |
| Adapter namespace | `vscode` | `standalone` |

## Future flags (not yet implemented)

The CLI may grow these in the future:

- `--config <path>` - point at a custom config file.
- `--no-hooks` - disable hook installation.
- `--watch-all` - turn on Watch All Sessions from the CLI.
- `--no-server-discovery` - always start a fresh server.

None of these exist today. Track issues at [github.com/pixel-agents-hq/pixel-agents/issues](https://github.com/pixel-agents-hq/pixel-agents/issues) for status.

## Related

- [Running the server (use-case guide)](/use/standalone/running-the-server)
- [Standalone troubleshooting](/use/standalone/troubleshooting)
- [Discovery and auth](/build/clients/discovery-and-auth) - server.json format and Bearer auth.
- [Config reference](./config) - the shared settings file.
- [Environment variables](./environment-variables)
