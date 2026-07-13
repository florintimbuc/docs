---
sidebar_position: 2
---

# Running the server

:::warning[AI-generated docs]
This document was AI-generated and may have some mistakes - we apologize for this, we're in the process of reviewing all documents. If you find any issues, we'd be thankful if you [submit an edit PR](https://github.com/pixel-agents-hq/docs/edit/main/docs/use/standalone/running-the-server.md).
:::

Reference for the `npx pixel-agents` CLI: flags, ports, host binding,
multi-window discovery, where state goes on disk, graceful shutdown, and
hook auto-install.

For the bigger picture of what standalone mode is, see
[Overview](./overview). If something doesn't work, see
[Troubleshooting](./troubleshooting).

## Invocation

```sh
npx pixel-agents [options]
```

Source: `server/src/cli.ts`. The entry point is `main()` at
`server/src/cli.ts:58-169`, called from the script footer at
`server/src/cli.ts:171-174`.

## Flags

Argument parser: `parseArgs()` in `server/src/cli.ts:34-54`.

| Flag                     | Default       | Description                                                       |
|--------------------------|---------------|-------------------------------------------------------------------|
| `--port`, `-p <number>`  | `3100`        | Port the HTTP server listens on.                                  |
| `--host <string>`        | `127.0.0.1`   | Host to bind to. Loopback by design.                              |
| `--help`                 | -             | Print help and exit `0`.                                          |

Exit codes:

| Code | Meaning                                                                |
|------|------------------------------------------------------------------------|
| `0`  | Clean exit (Ctrl+C, SIGTERM, or `--help`).                             |
| `1`  | Start failure (see `server/src/cli.ts:165-168` and `:171-174`).        |

The exact help text printed by `--help` is at `server/src/cli.ts:44-49`:

```text
Usage: pixel-agents [options]

Options:
  --port, -p <number>   Port to listen on (default: 3100)
  --host <string>       Host to bind to (default: 127.0.0.1)
  --help                Show this help message
```

## Default port behavior

The default port is `3100`. If port 3100 is in use and you don't pass
`--port`, the CLI today will fail to start: Fastify throws `EADDRINUSE`,
the catch block at `server/src/cli.ts:165-168` logs and exits with code `1`.

There is no automatic fallback to a different port in the CLI.

Workarounds:

- Pass `--port 0` to let the OS choose a free port. Fastify reports the
  actual port back, and that value is written to `server.json` so multi-window
  discovery still works.
- Pass `--port <number>` to pick a specific alternative (for example,
  `--port 3101`).

Why not fall back automatically? A predictable port is more useful than a
silent one. If you ran two `npx pixel-agents` instances and the second
silently chose port 3101, the two would not see each other through
multi-window discovery.

## Loopback binding and security

Default host is `127.0.0.1`. This is loopback only: external network clients
cannot connect.

WebSocket authentication is **off** in standalone mode. From
`server/src/httpServer.ts:139-148`:

```ts
// In standalone mode (not embedded), skip auth for WebSocket connections.
// The server binds to 127.0.0.1, so only local clients can connect.
// In embedded mode (VS Code), require Bearer token for security.
if (options.embedded) {
  const auth = request.headers.authorization ?? '';
  const expected = `Bearer ${options.token}`;
  const authBuf = Buffer.from(auth);
  const expectedBuf = Buffer.from(expected);
  if (authBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(authBuf, expectedBuf)) {
    socket.close(4001, 'unauthorized');
    return;
  }
}
```

The security model: standalone trusts loopback. Anything that can talk to
`127.0.0.1:3100` is treated as a local user with full webview privileges.

The hook endpoint is different. Hook events always require a Bearer token,
even in standalone, because the hook script reads the token from
`~/.pixel-agents/server.json` (mode `0o600`) and a different local user
would not have read permission. See `server/src/server.ts:151` for the
`mode: 0o600` write.

### Custom host: don't expose to the network without auth

If you change `--host` to `0.0.0.0`, you expose the WebSocket to the network
with **no authentication**. Anyone on your network (and possibly the
internet, if your machine is reachable) can connect to the office, read agent
state, and send `setHooksEnabled`, `addExternalAssetDirectory`, etc.

**Don't do this on an untrusted network.** There is no built-in way to add
WebSocket auth for standalone today.

If you genuinely need network access (for example, to view the office from
another machine), run the server behind a reverse proxy that adds auth (and
TLS). The proxy should terminate the connection and validate the user before
forwarding to `127.0.0.1:3100`.

## Multi-window discovery

The CLI checks `~/.pixel-agents/server.json` at startup. If the file exists
and the PID inside is alive, the CLI reuses that existing server rather
than starting a new one. From `server/src/server.ts:66-75`:

```ts
const existing = this.readServerJson();
if (existing && isProcessRunning(existing.pid)) {
  this.config = existing;
  this.ownsServer = false;
  console.log(
    `[Pixel Agents] Reusing existing server on port ${existing.port} (PID ${existing.pid})`,
  );
  return existing;
}
```

Liveness check: `isProcessRunning` at `server/src/server.ts:173-181` uses
the no-op signal `0` to test whether the PID exists, without actually
killing the process:

```ts
function isProcessRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}
```

This makes the following workflow safe:

1. In terminal A: `npx pixel-agents` (port 3100, PID 1234).
2. In terminal B: `npx pixel-agents` again.

Terminal B prints "Reusing existing server on port 3100 (PID 1234)" and
exits its server-start logic. Both terminals can be killed independently;
only the **owning** process (the one whose PID is in `server.json`) deletes
the discovery file on shutdown (`server/src/server.ts:158-170`).

If you really want two independent servers (different ports, different
state), pass `--port` explicitly to the second invocation: `npx pixel-agents
--port 3101`. The second instance will not see the first's `server.json` as
relevant (different port), and it will overwrite the discovery file with
its own metadata.

## Where state goes on disk

All standalone state lives under `~/.pixel-agents/`.

| File                                         | What                                                                                 |
|----------------------------------------------|--------------------------------------------------------------------------------------|
| `~/.pixel-agents/server.json`                | Discovery file. `{ port, pid, token, startedAt }`. Mode `0600`. Deleted on owner shutdown. |
| `~/.pixel-agents/standalone-state.json`      | Persisted agents and seats for the standalone namespace.                             |
| `~/.pixel-agents/config.json`                | User-level settings (sound, hooks enabled, watch-all-sessions, external assets).     |
| `~/.pixel-agents/layout.json`                | Office layout. Shared with VS Code (cross-window/cross-channel).                     |
| `~/.pixel-agents/hooks/claude-hook.js`       | Hook script copied from `dist/hooks/`. Installed in `~/.claude/settings.json` so the Claude CLI runs it. |

The store namespace matters. `cli.ts` creates the adapter with
`{ namespace: 'standalone' }` so VS Code's agents and the standalone agents
don't collide. From `server/src/cli.ts:80-83`:

```ts
const store = new AgentStateStore();
const adapter = new FileStateAdapter({ namespace: 'standalone' });
store.setAdapter(adapter);
```

The layout file is not namespaced. Both VS Code and standalone write to
`~/.pixel-agents/layout.json` because the layout is conceptually a single
office that you can view from any client.

## Scanning behavior

The CLI scans the *current working directory* for Claude sessions. From
`server/src/cli.ts:143-151`:

```ts
const cwd = process.cwd();
const dirs = claudeProvider.getSessionDirs?.(cwd);
if (dirs && dirs[0]) {
  const projectDir = dirs[0];
  console.log(`[Pixel Agents] Scanning project dir: ${projectDir}`);
  runtime.startProjectScan(projectDir);
  runtime.startExternalScanning(projectDir);
  runtime.startStaleCheck();
}
```

Practical implication: if you run `npx pixel-agents` from `~/code/foo`, the
server scans `~/.claude/projects/-Users-you-code-foo/`. If you Claude-CLI in
a *different* directory, the server won't see it unless you also turn on
**Watch All Sessions** in the settings panel.

To switch which project is being scanned, stop the server (Ctrl+C),
`cd` to the target project, and run `npx pixel-agents` again.

## Graceful shutdown

`SIGINT` (Ctrl+C) and `SIGTERM` are both wired to the shutdown function at
`server/src/cli.ts:156-164`:

```ts
function shutdown(): void {
  console.log('\nShutting down...');
  runtime.dispose();
  server.stop();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
```

What `shutdown` does:

1. `runtime.dispose()` stops all timers, scanners, and per-agent file
   watchers. Hook script in `~/.pixel-agents/hooks/` is left in place
   (it's reused next time).
2. `server.stop()` closes the Fastify instance and deletes
   `~/.pixel-agents/server.json` **only if** the PID inside matches the
   current process. See `deleteServerJson()` at
   `server/src/server.ts:158-170`.
3. `process.exit(0)` exits with success.

If the process is killed with `SIGKILL` (or you yank the machine's power),
the discovery file is left behind with a stale PID. The next `npx
pixel-agents` invocation detects this (the PID won't be alive) and starts a
new server. The stale file is overwritten on next write.

## Hook auto-install

If the persisted `hooksEnabled` setting is `true` (the default), the CLI
installs hooks on startup. From `server/src/cli.ts:128, 132-140`:

```ts
runtime.hooksEnabled.current = adapter.getSetting('pixel-agents.hooksEnabled', true);
// ...
if (runtime.hooksEnabled.current) {
  try {
    await claudeProvider.installHooks(`http://127.0.0.1:${config.port}`, config.token);
    copyHookScript(distRoot);
    console.log('[Pixel Agents] Hooks installed');
  } catch (err) {
    console.error('[Pixel Agents] Failed to install hooks:', err);
  }
}
```

What "install hooks" does:

1. Reads `~/.claude/settings.json`.
2. Adds Pixel Agents hook entries for every supported event
   (`SessionStart`, `SessionEnd`, `Stop`, `PermissionRequest`,
   `Notification`, `UserPromptSubmit`, `PreToolUse`, `PostToolUse`,
   `PostToolUseFailure`, `SubagentStart`, `SubagentStop`).
3. Writes `settings.json` back atomically.
4. Copies the hook script from the bundle (`dist/hooks/claude-hook.js`) to
   `~/.pixel-agents/hooks/`. The settings.json entries reference that
   absolute path.

To opt out: open the Pixel Agents settings panel in the browser and turn
**Hooks** off. The CLI removes the entries from
`~/.claude/settings.json`. The script file in `~/.pixel-agents/hooks/`
stays on disk but is not referenced.

Toggling at runtime works because the WebSocket `setHooksEnabled` message
calls `onSetHooksEnabled`, which calls `installHooks` or `uninstallHooks`.
See `server/src/cli.ts:100-113` and
`server/src/clientMessageHandler.ts:91-97`.

## Verifying the server is healthy

Two ways:

1. Check the health endpoint:

   ```sh
   curl http://127.0.0.1:3100/api/health
   ```

   Returns `{"status":"ok","uptime":<seconds>,"pid":<pid>}`. The route is
   public, no auth required. See `registerHealthRoute` in
   `server/src/httpServer.ts:89-97`.

2. Check the discovery file:

   ```sh
   cat ~/.pixel-agents/server.json
   ```

   Should contain a port, a PID alive on your machine, a token (UUID),
   and a `startedAt` timestamp.

## Where to go next

- Symptoms and fixes: [Troubleshooting](./troubleshooting).
- How clients connect to the server (discovery, auth, WebSocket protocol):
  [/build/clients/discovery-and-auth.md](../../build/clients/discovery-and-auth).
- Close-code and error reference: [/reference/errors.md](../../reference/errors).
- WebSocket protocol contracts:
  [/reference/protocol/overview.md](../../reference/protocol/overview).
