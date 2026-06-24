---
sidebar_position: 6
---

# Troubleshooting

Cross-surface symptom-driven debug guide. For surface-specific guides, see [VS Code troubleshooting](./vscode/troubleshooting) and [Standalone troubleshooting](./standalone/troubleshooting). For Q&A-style answers, see [FAQ](./faq).

This page groups by symptom, not by cause. Find the symptom that matches, walk through the diagnose + fix steps in order.

## Office never appears

**Symptom:** the panel (VS Code) or browser (standalone) loads but shows no rendered office.

**Diagnose:**
1. Open developer tools. VS Code: Command Palette → "Developer: Open Webview Developer Tools". Standalone: browser's built-in (F12).
2. Look for `[Pixel Agents]` log lines. Look for errors.
3. Check the Network tab for failed requests on PNG asset files.

**Fix:**
- If assets failed to load: confirm `dist/` exists in the extension/install dir.
- If the canvas is just black: reload the panel (VS Code: right-click panel header → Reload Webview). Standalone: reload the browser tab.
- If the issue persists: file an issue with the dev tools console output.

## No agents appear when I run claude

**Symptom:** you ran `claude` in a terminal but no character shows up in the office.

**Diagnose:**
1. Verify Claude actually started a session: in the Claude terminal, you should see the interactive prompt.
2. Verify Claude is creating a JSONL: `ls -lt ~/.claude/projects/*/` (Linux/macOS) - the newest file should be the current session.
3. Verify Pixel Agents is watching the right directory. The project hash is the workspace path with `:`, `\`, `/` replaced by `-`.
4. Check Output (VS Code) or terminal (standalone) for `[Pixel Agents]` log lines mentioning the session ID.

**Fix:**
- If Claude isn't creating JSONL files: there's a Claude config issue. Reinstall Claude.
- If the project hash doesn't match: in standalone, re-launch from the right cwd (`cd /path/to/project && npx pixel-agents`). In VS Code, open the right workspace.
- Toggle "Watch all sessions" on in Settings as a workaround - it scans all of `~/.claude/projects/`.

## Agents appear then immediately disappear

**Symptom:** a character spawns, then despawns within seconds.

**Diagnose:**
- The JSONL file's `mtime` is older than `EXTERNAL_ACTIVE_THRESHOLD_MS = 120_000ms` (2 minutes). The scanner adopted, but the activity check decided it was stale.

**Fix:**
- Generate fresh activity in the Claude session (type any prompt). The character should re-appear within 1 second.
- If Claude is genuinely idle (you started it, walked away, came back), the auto-cleanup is working as designed. To keep a session in the office regardless, configure `EXTERNAL_ACTIVE_THRESHOLD_MS` to be longer (not currently a user-visible setting; would require a code change).

## Tool animations don't update

**Symptom:** Claude is doing work in the terminal but the character looks idle.

**Diagnose:**
1. With hooks enabled, look for `[Pixel Agents] Hook:` lines in the Output / terminal.
2. Without hooks, the polling interval is 500ms. There can be a brief lag.
3. The character might be selected but the camera is panned away. Check the bottom of the office (the camera may have lost track).

**Fix:**
- Enable hooks if not already (see [Enabling hooks](./workflows/enabling-hooks)).
- Pan the camera back: middle-mouse drag in the office. Or click any character to camera-follow.
- Reload the panel/webview.

## Permission bubble misfires

**Symptom:** "..." bubble appears on a tool that isn't actually waiting for permission.

**Cause:** heuristic timer false positive on a slow tool (WebFetch, slow Bash). Without hooks, we can't tell "slow" from "waiting."

**Fix:** enable hooks. See [Enabling hooks](./workflows/enabling-hooks). Permission detection becomes accurate.

## Permission bubble never appears

**Symptom:** Claude is waiting for permission in the terminal but no bubble shows.

**Diagnose:**
- Heuristic timer is 7 seconds. If the prompt resolves faster than that, no bubble.
- Hook script not delivering: check `~/.pixel-agents/server.json` exists and PID is alive.

**Fix:**
- Enable hooks for instant detection.
- If hooks are enabled but events aren't flowing: toggle hooks off, then on. This reinstalls the script and the settings.json entries.

## Layout changes don't save

**Symptom:** painted tiles, placed furniture, clicked Save, but on reload the changes are gone.

**Diagnose:**
- Check `~/.pixel-agents/layout.json` was actually updated: `ls -la ~/.pixel-agents/layout.json`. The mtime should be when you saved.
- Check `layout.json.tmp` is not lingering (the atomic write may have left a tmp file).
- Check write permissions on `~/.pixel-agents/`.

**Fix:**
- `rm ~/.pixel-agents/layout.json.tmp` if it exists.
- `chmod -R u+rw ~/.pixel-agents/` to ensure writability.
- If the save dialog (Settings → Export) works, the issue is specific to the inline save - reload the webview.

## Layout doesn't sync across windows

**Symptom:** edited in window A, saved, opened window B - still seeing the old layout.

**Diagnose:**
- The cross-window sync uses `fs.watch` plus a 2-second polling fallback (`LAYOUT_FILE_POLL_INTERVAL_MS = 2000`). On exotic filesystems neither may work.
- Window B may have unsaved edits, in which case the inbound layout is rejected (last-save-wins, no merge).

**Fix:**
- Wait 2 seconds, then reload the panel/webview on window B.
- If window B has unsaved edits: save or reset them first.

## Settings UI is missing

**Symptom:** clicking the ⚙ button does nothing.

**Diagnose:**
- The modal is rendered in the webview. If the webview is misbehaving, modal interactions break.

**Fix:**
- Reload the webview/panel.
- Reload VS Code (or restart the standalone server).

## Sound never plays

**Symptom:** waiting bubbles appear but no chime.

**Diagnose:**
- "Sound notifications" toggle is off in Settings.
- Browser AudioContext is suspended (you've never clicked the canvas).

**Fix:**
- Toggle Sound on.
- Click anywhere in the office.
- If still nothing, check browser console for AudioContext errors.

## Sub-agent characters never appear

**Symptom:** Claude runs a `Task` tool but no sub-agent character shows up.

**Diagnose:**
- Confirm the tool name is in `provider.subagentToolNames`: for Claude, that's `Set(['Task', 'Agent'])`.
- Without hooks, the sub-agent is detected by parsing the JSONL `progress` records. This sometimes lags or misses.

**Fix:**
- Enable hooks for reliable sub-agent detection.

## Teammates never appear

**Symptom:** lead spawned teammates (via `Agent(... run_in_background: true)`) but no teammate characters.

**Diagnose:**
- `TeamProvider.isTeammateSpawnCall` must return `true` for the call. Verify the Agent tool input actually has `run_in_background: true`.
- The teammate's JSONL must exist. Look in `~/.claude/projects/<hash>/subagents/<lead-session>/` (Claude's standard teammate transcript location).
- Without hooks, teammate detection relies on `SubagentStart` JSONL records, which may lag.

**Fix:**
- Enable hooks.
- Confirm Claude actually spawned the teammate (look at the lead's transcript or output).
- Look at the lead's character: it may show a "background tool" indicator confirming the spawn fired.

## External agent shows up unexpectedly

**Symptom:** a character appears that you didn't spawn.

**Diagnose:**
- Some other terminal on your machine has `claude` running. The scanner detected it.
- This is intentional behavior.

**Fix:**
- If unwanted: click the character's X button to dismiss (3-minute cooldown before re-adoption).
- If you don't want any cross-terminal detection at all: toggle "Watch all sessions" off and ensure you're in the right workspace.

## Server won't start (port in use)

**Symptom:** `npx pixel-agents` fails with EADDRINUSE.

**Cause:** something else is listening on port 3100.

**Fix:**
- `npx pixel-agents --port 4000` (or any free port).
- Or find the conflicting process: `lsof -i :3100` (Linux/macOS) / `netstat -ano | findstr 3100` (Windows). Stop it.

## Two `npx pixel-agents` instances both think they own the server

**Symptom:** both terminals say "Server: listening on..." rather than one saying "Reusing existing server".

**Diagnose:**
- The PID-alive check in `server.json` should detect the running server. If both think there's no existing server, one of them is wrong.

**Fix:**
- `rm ~/.pixel-agents/server.json` and start fresh.
- If the issue persists, look at `~/.pixel-agents/server.json` after one launch. The PID should match the running process.

## Build / install errors

**Symptom:** errors during `npm install` or `npm run build` of the source.

**Diagnose:**
- Wrong Node version. Run `node -v` - should be 18+ (22 recommended per `.nvmrc`).
- Network issue downloading npm packages.

**Fix:**
- Use nvm/fnm/asdf to install the right Node version.
- Clear npm cache: `npm cache clean --force`.
- Delete `node_modules/` and `package-lock.json`, retry `npm install`.

## When to escalate

If none of the above helps:

1. Capture relevant logs (Output → "Pixel Agents" in VS Code, or the standalone terminal).
2. Note your OS, VS Code version, Node version, Pixel Agents version.
3. Note hooks enabled/disabled.
4. If reproducible, write the exact steps.
5. File an issue at [github.com/pixel-agents-hq/pixel-agents/issues](https://github.com/pixel-agents-hq/pixel-agents/issues).

## Related

- [VS Code troubleshooting](./vscode/troubleshooting) - VS Code-specific deeper guide.
- [Standalone troubleshooting](./standalone/troubleshooting) - standalone-specific deeper guide.
- [FAQ](./faq) - Q&A-style answers.
- [Enabling hooks](./workflows/enabling-hooks) - the first-line fix for most issues.
- [Hooks vs heuristic](/learn/hooks-vs-heuristic) - why hooks matter.
