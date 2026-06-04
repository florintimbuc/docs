---
sidebar_position: 3
---

# Standalone troubleshooting

Symptom-driven fixes for `npx pixel-agents`. Each section is one problem,
its likely cause, how to diagnose, and how to fix.

For the broader cross-channel symptom index, see
[/use/troubleshooting.md](../troubleshooting). For close-code definitions
and protocol errors, see [/reference/errors.md](../../reference/errors).
For the bigger picture of when fallback heuristics kick in, see
[/learn/hooks-vs-heuristic.md](../../learn).

## `npx pixel-agents` fails to start

Symptoms: the CLI exits within a second of starting. You see something like
`Failed to start server: ...` followed by `Error: listen EADDRINUSE` or a
permissions error.

Likely causes:

- **Port 3100 already in use.** Either another `npx pixel-agents`
  invocation is running on a stale port, or some unrelated service grabbed
  it.
- **Node version too old.** The CLI requires Node 18 or newer.
- **Permission denied on `~/.pixel-agents/`.** The CLI creates the
  directory with mode `0o700` if it doesn't exist
  (`server/src/server.ts:147-149`). If a previous run created it with the
  wrong owner, write fails.

Diagnose:

```sh
# Who has port 3100?
lsof -i :3100

# What Node version?
node -v

# Can you actually write to ~/.pixel-agents/?
ls -la ~/.pixel-agents/
touch ~/.pixel-agents/.write-test && rm ~/.pixel-agents/.write-test
```

Fix:

- Port conflict: pass `--port 3101` (or any free port), or stop the other
  process. See
  [Running the server / Default port behavior](./running-the-server#default-port-behavior).
- Node too old: install Node 18+. macOS and Linux can use
  [nvm](https://github.com/nvm-sh/nvm). Windows can use [nvm-windows](https://github.com/coreybutler/nvm-windows)
  or download from [nodejs.org](https://nodejs.org/).
- Permissions: `chown -R "$USER" ~/.pixel-agents/` (Linux/macOS) or
  reset the folder's ACL on Windows.

## Server starts but the browser shows a blank page

Symptoms: terminal prints `Pixel Agents server running at http://...`, but
opening that URL in a browser shows a blank page or "Loading...".

Likely cause: assets failed to load. On startup the CLI logs how many
characters and furniture items it loaded
(`server/src/cli.ts:67-77`):

```text
[Pixel Agents] Loading assets...
[Pixel Agents] Assets loaded: 6 characters, 87 furniture items
```

If the counts are `0 characters, 0 furniture items`, the bundled
`dist/assets/` and `dist/webview/` directories are missing or empty.

Diagnose:

```sh
# Find the installed CLI bundle location
which pixel-agents 2>/dev/null
npm root -g

# Or, if invoked via npx, look in the npx cache
ls -la ~/.npm/_npx/*/node_modules/pixel-agents/dist/ 2>/dev/null
```

The `dist/webview/index.html` and `dist/assets/` must exist.

Fix:

- Clear the npx cache and re-fetch: `npx clear-npx-cache` (or
  `rm -rf ~/.npm/_npx` and re-run).
- If you installed globally with `npm install -g pixel-agents`, reinstall:
  `npm install -g pixel-agents@latest`.
- If you're running from a local clone, rebuild: from the repo root,
  `npm run build`.

## Browser connects but no agents show up

Symptoms: server starts, browser loads, office tiles render, but no
characters appear even though Claude is running in some terminal.

Most likely cause: the scanner is watching the *wrong* project directory.
The CLI scans the directory it was launched from. From
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

If your Claude session is running in, say, `/Users/you/code/foo` but you
launched `npx pixel-agents` from `/Users/you`, the scanner is watching
`~/.claude/projects/-Users-you/` (which is empty) instead of
`~/.claude/projects/-Users-you-code-foo/`.

Diagnose:

```sh
# What was scanned?
# The CLI logs "Scanning project dir: ..." on startup
# Check the terminal output, or restart and look again.

# What are the Claude project directories on this machine?
ls ~/.claude/projects/
```

Fix two ways:

- Stop the CLI, `cd` to the directory you want to watch, run `npx
  pixel-agents` again.
- Or turn on **Watch All Sessions** in the settings panel. The scanner
  will then walk every project under `~/.claude/projects/` rather than
  just one. Useful when you want one browser window to see everything.

## Agents appear, then disappear after about 2 minutes

Symptoms: an external agent shows up, runs for a bit, then vanishes from
the office even though the Claude session is still alive.

Likely cause: the JSONL transcript file mtime hasn't been updated
recently, and the external scanner treats it as inactive.

Constant: `EXTERNAL_ACTIVE_THRESHOLD_MS = 120_000` (2 minutes) at
`server/src/constants.ts:24`.

A long-running tool that streams nothing to the JSONL (rare, but possible
with some custom MCP servers) can produce a quiet file that crosses the
2-minute mark.

Diagnose:

```sh
# Look at the mtime of the JSONL the agent was bound to
ls -la ~/.claude/projects/<project-hash>/
```

If the file's mtime is more than 2 minutes old, the agent is treated as
inactive.

Fix:

- Workaround: send a short message in the Claude terminal to bump the
  transcript and re-trigger the active window.
- Long term: this is a known limitation. The 2-minute window balances
  noise (we don't want stale Claude sessions hanging around forever) and
  legitimate long tools. If you hit it often, file an issue with the
  scenario.

## Permission bubbles never appear

Symptoms: Claude pauses for a permission prompt in the terminal, but no
amber dots ever appear on the character.

Likely causes:

- Hooks are not installed.
- Hooks are installed but the toggle in the settings panel is off.
- Hook entries got corrupted in `~/.claude/settings.json`.

Diagnose:

```sh
# Are Pixel Agents hook entries in settings.json?
grep -c pixel-agents ~/.claude/settings.json

# Should be non-zero if hooks are installed
```

Fix:

1. Open the Pixel Agents settings panel in the browser.
2. Verify the "Hooks" toggle is on. Toggling it triggers a re-install.
3. If still nothing, toggle Hooks off and back on. This forces a fresh
   re-write of `settings.json`.
4. As a last resort, see the next section.

If hooks are unavailable, Pixel Agents falls back to a purely heuristic
detection mode with a 7-second delay before showing a permission bubble:
`PERMISSION_TIMER_DELAY_MS = 7000` at `server/src/constants.ts:15`. So
*some* bubble should still appear after 7 seconds even without hooks. If
you see neither hooks nor heuristic bubbles, the JSONL polling itself is
broken (see "no agents show up" above).

## Hook installation fails

Symptoms: terminal prints `[Pixel Agents] Failed to install hooks: ...`
on startup, or the Hooks toggle in the UI shows an error.

Likely cause: stale or conflicting entries in `~/.claude/settings.json`.
The installer reads, modifies, and writes the file. If the file is
malformed JSON, the read step throws.

Diagnose:

```sh
# Is the settings file valid JSON?
node -e "JSON.parse(require('fs').readFileSync(process.env.HOME + '/.claude/settings.json'))" \
  && echo OK || echo CORRUPTED

# What's in the hooks section?
node -e "console.log(JSON.stringify(JSON.parse(require('fs').readFileSync(process.env.HOME + '/.claude/settings.json')).hooks ?? null, null, 2))"
```

Fix:

1. Toggle Hooks off in the Pixel Agents settings panel, then quit
   `npx pixel-agents`.
2. Open `~/.claude/settings.json` in an editor.
3. Look for any `hooks.*` arrays containing entries that reference
   `pixel-agents` or `~/.pixel-agents/hooks/claude-hook.js`. Delete those
   array entries (not the surrounding hook category).
4. Save. Re-validate the JSON.
5. Restart `npx pixel-agents`. Toggle Hooks back on.

If your `settings.json` is fundamentally broken (Claude itself won't
read it), back it up, replace with `{}`, and re-add your other Claude
customizations one at a time.

## WebSocket connect immediately closes with code 4001

Symptoms: in the browser devtools Network tab, you see the `/ws`
connection upgrade succeed and then immediately close with code 4001
"unauthorized".

This **should not happen in standalone**. The auth code path only runs
when `embedded: true`. From `server/src/httpServer.ts:139-148`:

```ts
if (options.embedded) {
  // ...auth check that emits close 4001 on mismatch...
}
```

If you see 4001 in standalone, one of three things is wrong:

- You're not actually in standalone mode. Are you sure the page is
  pointed at the `npx pixel-agents` server and not some VS Code embed?
- Your CLI was invoked with `--embedded` flag (no such flag exists, but
  if a downstream packager set it, this would be the symptom).
- The auth check fired for some other reason. Most likely cause: you're
  running an older build of the server. Update to latest.

Fix:

- Confirm the URL in the browser address bar matches the URL printed by
  the CLI ("Pixel Agents server running at http://127.0.0.1:3100").
- Update: `npm install -g pixel-agents@latest` (or clear the npx cache
  and re-fetch).
- If you can reproduce with the latest version, file an issue with the
  CLI logs.

See [/reference/errors.md](../../reference/errors) for the canonical
close-code catalog.

## Multiple terminals show "Reusing existing server"

Symptoms: you run `npx pixel-agents` in two terminals and the second one
prints:

```text
[Pixel Agents] Reusing existing server on port 3100 (PID 1234)
```

This is **intentional**. It's multi-window discovery
(`server/src/server.ts:71-74`). The first invocation owns the running
server; the second piggybacks on it. Both terminals can be open. Only the
first owns the discovery file.

If you want two truly independent servers, pass different `--port` values
to each:

```sh
# Terminal A
npx pixel-agents --port 3100

# Terminal B
npx pixel-agents --port 3101
```

Each will write its own `server.json` (the file is overwritten, so the
last writer wins). Hook scripts will only route to the most recently
started server, which may not be what you want; in practice, run one
server at a time.

## `server.json` is stale (server crashed previously)

Symptoms: `npx pixel-agents` says something like "starting server" with
no "Reusing" message, but you wonder if there's a leftover file.

The CLI handles this automatically. If `server.json` exists but the PID
inside is dead, `isProcessRunning` returns `false` and the CLI proceeds
to start a fresh server (`server/src/server.ts:173-181`). The new server
overwrites the discovery file with its own metadata.

If you see this state persist (CLI keeps thinking the old server is
alive when it isn't):

```sh
# Manually clean up
rm ~/.pixel-agents/server.json
```

Then re-run `npx pixel-agents`.

Edge case: if a *different* user's process happens to have the same PID
the old server had, `process.kill(pid, 0)` will return true (the PID is
alive), but it isn't actually a Pixel Agents server. In that case the
new CLI invocation will *try* to reuse it, fail to connect, and
eventually you'll get errors in the browser. Workaround: delete
`server.json` manually as above.

## Hooks fire but no events are received

Symptoms: Claude logs say hooks ran (you can inspect Claude's logs if
verbose mode is on), but the office doesn't update.

The hook script reads `~/.pixel-agents/server.json` on every invocation
to find the running server's port and token. If the file doesn't exist,
or the PID is dead, or the token is wrong, the POST silently fails.

Diagnose:

```sh
# Is the discovery file there?
ls -la ~/.pixel-agents/server.json

# Is the PID inside alive?
PID=$(node -e "console.log(JSON.parse(require('fs').readFileSync(process.env.HOME + '/.pixel-agents/server.json')).pid)")
ps -p "$PID" >/dev/null && echo "alive" || echo "dead"

# Hand-fire a hook by POSTing to the endpoint with the auth token
TOKEN=$(node -e "console.log(JSON.parse(require('fs').readFileSync(process.env.HOME + '/.pixel-agents/server.json')).token)")
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"session_id":"test","hook_event_name":"SessionStart"}' \
  http://127.0.0.1:3100/api/hooks/claude
```

Should return `ok` and you should see a log line on the server side.

Fix:

- If `server.json` is missing: `npx pixel-agents` hasn't been started, or
  it crashed. Start it.
- If the PID is dead: see "server.json is stale" above.
- If the token in `server.json` doesn't match what the hook script is
  sending: this can only happen if you have multiple versions of the
  hook script installed. Remove `~/.pixel-agents/hooks/` and reinstall
  hooks via the settings panel.
- If the curl above succeeds but the script's POSTs don't: check
  Claude's hook configuration for the absolute path to the script. It
  must be `~/.pixel-agents/hooks/claude-hook.js` (or your home directory
  equivalent).

## Still stuck

- Check the close codes and error shapes in [/reference/errors.md](../../reference/errors).
- Re-read [/learn/](../../learn) to understand the
  hooks-versus-heuristic detection model. Knowing which mode you're in
  tells you which timers and scanners are involved.
- File an issue at
  [github.com/pablodelucca/pixel-agents/issues](https://github.com/pablodelucca/pixel-agents/issues)
  with: the OS, Node version, the full CLI startup log, and the contents
  of `~/.pixel-agents/server.json` (redact the token before posting).
