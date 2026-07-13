---
sidebar_position: 1
---

# Enabling hooks

:::warning[AI-generated docs]
This document was AI-generated and may have some mistakes - we apologize for this, we're in the process of reviewing all documents. If you find any issues, we'd be thankful if you [submit an edit PR](https://github.com/pixel-agents-hq/docs/edit/main/docs/use/workflows/enabling-hooks.md).
:::

Hooks turn Pixel Agents from "watches your transcripts and infers" into "receives every event instantly." If you're using Claude Code, enable hooks. Almost every issue you might run into has hooks as the first-line fix.

For the conceptual reasoning, see [Hooks vs heuristic](/learn/hooks-vs-heuristic). For the per-event mapping, see [Hooks coverage](/reference/hooks-coverage).

## What this changes

| Without hooks | With hooks |
|---|---|
| 500ms polling delay on tool start/end | Instant |
| 7s heuristic timer for permission detection (occasionally misfires on slow tools) | Instant, accurate |
| 5s heuristic timer for text-only turn end | Instant via Stop hook |
| /clear detection by content sniffing in JSONL | Direct via SessionEnd+SessionStart pair |
| External session detection by polling | Instant via SessionStart |

## What hooks modify on your system

Two things:

1. **`~/.claude/settings.json`** - the extension adds entries under the `hooks` key. Each entry specifies an event (SessionStart, PreToolUse, Stop, etc.) and a command (a path to our hook script).
2. **`~/.pixel-agents/hooks/claude-hook.js`** - the hook script itself, bundled to a single JavaScript file by esbuild. Has no `node_modules` dependency at runtime.

Nothing else. No system files, no shell config, no PATH modifications.

## Enable via the UI

The fast path.

### In VS Code

1. Open the Pixel Agents panel.
2. Click the ⚙ Settings button (bottom toolbar).
3. Toggle **Hooks enabled** to ON.
4. The extension writes the settings.json entries and copies the script. You should see "Hooks installed" in the Output → Pixel Agents log.

### In standalone

1. Open the browser SPA.
2. Click the ⚙ Settings button.
3. Toggle **Hooks enabled** to ON.
4. Same effect: settings written, script copied.

Hooks are enabled by default in standalone (`server/src/cli.ts:128, 132-140` installs them on startup if the persisted setting allows). In VS Code the same default applies.

## Verify hooks are actually working

After enabling:

1. Open a Claude session (`+ Agent` in VS Code, or run `claude` somewhere standalone is watching).
2. Type any tool-using prompt (e.g. `read package.json`).
3. The reading animation should start within ~100ms of pressing enter. With heuristic mode, you'd see a ~500ms delay.

**Output / Log check (VS Code):**

Open Output → "Pixel Agents". Look for log lines like:

```
[Pixel Agents] Hook: Agent 1 - SessionStart(source=startup) known
[Pixel Agents] Hook: PreToolUse tool_name=Read
```

If you see lines starting with `[Pixel Agents] Hook:`, hooks are delivering.

**Terminal check (standalone):**

The standalone CLI logs the same prefix to stdout. Look for `[Pixel Agents] Hook:` lines after starting a Claude session.

## What the settings.json entries look like

After enabling, your `~/.claude/settings.json` will gain entries roughly like:

```json
{
  "hooks": {
    "SessionStart": [
      { "matcher": ".*", "hooks": [{ "type": "command", "command": "node /Users/you/.pixel-agents/hooks/claude-hook.js" }] }
    ],
    "PreToolUse": [
      { "matcher": ".*", "hooks": [{ "type": "command", "command": "node /Users/you/.pixel-agents/hooks/claude-hook.js" }] }
    ],
    "PostToolUse": [
      { "matcher": ".*", "hooks": [{ "type": "command", "command": "node /Users/you/.pixel-agents/hooks/claude-hook.js" }] }
    ],
    "Stop": [...],
    "Notification": [...],
    "SessionEnd": [...],
    "UserPromptSubmit": [...],
    "SubagentStart": [...],
    "SubagentStop": [...],
    "PermissionRequest": [...],
    "PostToolUseFailure": [...]
  }
}
```

The script path is absolute. The matchers are wildcards (we don't filter on Claude's side; the script does the dispatch decision).

If you already had `~/.claude/settings.json` with your own custom hooks, the extension merges its entries with yours. Your entries are preserved.

## Disable

### Via the UI

Same toggle, off. The extension removes its entries from `~/.claude/settings.json` (your custom entries remain) and leaves the script file in place at `~/.pixel-agents/hooks/claude-hook.js`. Heuristic mode resumes.

### Manually

If the UI toggle doesn't work for any reason:

1. Edit `~/.claude/settings.json`.
2. Remove every hook entry whose command references `pixel-agents/hooks/`.
3. Save.

You can also `rm -rf ~/.pixel-agents/hooks/` if you want to clean up the script file.

## How the script finds the server

Each time Claude fires a hook, our script runs. The script reads `~/.pixel-agents/server.json` to find:

- The port the server is listening on.
- The PID of the server process (used to verify it's alive).
- A Bearer token to authenticate the POST.

It then POSTs the hook payload to `http://127.0.0.1:<port>/api/hooks/claude` with `Authorization: Bearer <token>`.

If `server.json` doesn't exist or its PID is dead, the script silently drops the event. No error to Claude, no spam.

This means: hooks only deliver when a Pixel Agents server is running. If you close VS Code and run `claude` in a terminal, no hook events flow (Pixel Agents isn't listening). When you reopen the panel (or run `npx pixel-agents`), hooks resume.

## Hooks delivery and the hookDelivered flag

When a hook event is successfully delivered for an agent, that agent's `hookDelivered` flag flips to true. From that point on, the heuristic timers (`PERMISSION_TIMER_DELAY_MS = 7000`, `TEXT_IDLE_DELAY_MS = 5000`) are suppressed for that agent.

This means in a mixed scenario (one agent has hooks delivering, another doesn't), each agent independently picks the right mode. The runtime doesn't have to decide globally.

## What hooks don't change

- The JSONL transcript files are still written by Claude as normal. Pixel Agents still parses them for tool content (status text, animations) even in hook mode. Only the timer logic is suppressed.
- Hook events with no `session_id` or `hook_event_name` are silently dropped at the HTTP layer.
- Hook events from a provider whose `protocolVersion` doesn't match `SUPPORTED_PROTOCOL_VERSION` (today 1) are logged once and dropped.

## When to leave hooks off

Some scenarios where you might prefer heuristic mode:

- You don't want any external process modifying `~/.claude/settings.json`.
- You're debugging hooks behavior and want to compare against the fallback.
- You're on a system where the hook script's IPC (POST to localhost) is blocked (firewall, container isolation).

In all of these, heuristic mode just works - it's slower and less precise but functional.

## Multi-window safety

If you have multiple Pixel Agents instances (VS Code + standalone, two VS Code windows, etc.), only one of them owns the running server. The hook script reads `server.json` which always points at the owning process; events get delivered to one server regardless of how many Pixel Agents UIs are open.

That server broadcasts state to all connected clients via WebSocket / postMessage. So events you see in one window also show up in the other(s).

## Troubleshooting hooks

Symptoms and fixes:

| Symptom | Likely cause | Fix |
|---|---|---|
| Toggle ON but `~/.claude/settings.json` unchanged | Permission error on the settings file | Check file permissions; run with the user that owns it. |
| Hooks installed but no `[Pixel Agents] Hook:` log lines | Hook script can't reach the server | Confirm `~/.pixel-agents/server.json` exists and the PID is alive. |
| Some events fire, others don't | A specific hook entry was clobbered in settings.json by a manual edit | Re-toggle hooks off and on to reinstall. |
| Hooks fire but get dropped | `protocolVersion` mismatch warning in console | Update Pixel Agents; the provider's version doesn't match the handler. |

For the full debug guide, see [VS Code troubleshooting](/use/vscode/troubleshooting) and [Standalone troubleshooting](/use/standalone/troubleshooting).

## Related

- [Hooks vs heuristic (concept)](/learn/hooks-vs-heuristic)
- [Hooks coverage (per-event reference)](/reference/hooks-coverage)
- [Settings](/use/vscode/settings)
- [Reference provider implementation](/build/providers/reference-implementation)
