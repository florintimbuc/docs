---
sidebar_position: 4
---

# VS Code troubleshooting

Symptom-driven debug guide for the VS Code extension specifically. For standalone-specific issues, see [Standalone troubleshooting](/use/standalone/troubleshooting). For the cross-surface FAQ-style guide, see [Use troubleshooting](/use/troubleshooting).

## Extension won't activate

**Symptom:** Pixel Agents commands don't appear in the Command Palette; the panel can't be opened.

**Diagnose:**
- Open **Output** view (`Cmd/Ctrl+Shift+U`), pick "Pixel Agents" from the dropdown. Look for activation errors.
- Run `Developer: Show Running Extensions` from the Command Palette. Confirm Pixel Agents is listed.
- Check VS Code version (`Code → About`). Must be 1.105.0 or newer.

**Fixes:**
- Reload window (`Cmd/Ctrl+Shift+P` → "Reload Window").
- Restart VS Code completely.
- Reinstall the extension from the Marketplace.
- If on an older VS Code, update VS Code or install an older Pixel Agents version compatible with your VS Code (check the Marketplace version history).

## Panel opens but is blank

**Symptom:** the Pixel Agents panel slides in but shows a blank dark area.

**Diagnose:**
- Open Developer Tools for the webview: Command Palette → `Developer: Open Webview Developer Tools`.
- Check the Console for errors.
- Common: asset load failure. Look for `[AssetLoader]` errors.

**Fixes:**
- Reload the webview: right-click the panel header → "Reload Webview".
- Confirm `dist/assets/` exists in the extension's install directory. If missing, reinstall.
- If the error mentions PNG parsing, the bundled assets are corrupt; reinstall.

## + Agent button does nothing

**Symptom:** clicking + Agent opens a terminal but no character appears, or doesn't even open a terminal.

**Diagnose:**
- Confirm `claude` is in PATH: open an integrated terminal and run `which claude` (or `where claude` on Windows). Must return a path.
- Confirm Claude is authenticated: run `claude` directly in a terminal. It should start an interactive session.

**Fixes:**
- If `claude` isn't in PATH: install Claude Code per their docs, ensure your shell PATH is loaded by VS Code.
- If Claude requires auth: authenticate in a terminal first, then return to VS Code.
- If a terminal opens but `claude --session-id <uuid>` fails: check Output → "Pixel Agents" for the spawn command and try running it manually to see the error.

## Character doesn't appear after spawning

**Symptom:** the Claude terminal is running, but no character shows up within 5 seconds.

**Diagnose:**
- Open Output → "Pixel Agents". Look for `[Pixel Agents]` log lines mentioning the session ID.
- Verify the JSONL file exists: `ls ~/.claude/projects/$(pwd | sed 's|/|-|g')/` (Linux/macOS). Look for a `<uuid>.jsonl`.

**Fixes:**
- If the JSONL file isn't being created: Claude might be writing to a different project hash. Check workspace path - the hash is the workspace path with `:`/`\`/`/` replaced by `-`.
- If the file exists but no character appears: the panel may have missed the broadcast. Reload the webview.
- If you're in a multi-root workspace, the scanner watches all folders; the character should appear regardless of which folder the terminal is in.

## Multiple characters for one terminal

**Symptom:** one Claude session, two characters.

**Diagnose:**
- This is an adoption race: the project scanner adopted the JSONL before the hook-mode confirmation could match it. Rare.

**Fixes:**
- Close one of the duplicate characters via its X button.
- If it keeps happening, restart VS Code.
- Report it as a bug with the steps to reproduce.

## Character won't despawn after closing terminal

**Symptom:** Claude terminal is closed, but the character lingers.

**Diagnose:**
- The terminal-close detection relies on VS Code's `onDidCloseTerminal` event. If VS Code missed the event, the agent stays.
- If the agent is external (you ran `claude` outside the + Agent button), terminal close isn't the trigger; the stale check is.

**Fixes:**
- Click the character's X button to dismiss it manually.
- For external agents, wait up to 30 seconds for the stale check (`EXTERNAL_STALE_CHECK_INTERVAL_MS = 30_000ms`) to remove the agent once the JSONL stops being written.

## Permission bubbles fire on tools that aren't actually waiting

**Symptom:** "..." bubble appears on a tool like WebFetch or Bash that's actually still running.

**Cause:** heuristic mode is on (hooks aren't installed or aren't delivering). The 7-second permission timer fired even though the tool is still working.

**Fix:** enable hooks. Settings → "Hooks enabled" on. See [Enabling hooks](/use/workflows/enabling-hooks).

If hooks are already enabled but you're still seeing this: open Output → "Pixel Agents" and look for `[Pixel Agents] Hook:` log lines. If none appear during a Claude session, the hook script isn't being invoked.

Verify `~/.claude/settings.json` has entries pointing at `~/.pixel-agents/hooks/claude-hook.js`. Toggle hooks off and on in the Pixel Agents settings to reinstall.

## Permission bubbles never appear

**Symptom:** Claude asks for permission in the terminal, but no bubble shows.

**Diagnose:**
- Hooks not delivering: see above.
- The tool completed faster than the 7-second heuristic timer: that's working as designed; the tool was fast enough that we didn't have time to flag it.

**Fix:** enable hooks for instant detection. With hooks, permission bubbles appear within a frame of Claude asking.

## /clear leaves a ghost character

**Symptom:** you typed `/clear` in a Claude terminal, but the character disappeared and a new one didn't take its place (or vice versa).

**Diagnose:**
- In hook mode: check Output for `SessionEnd(reason=clear)` followed by `SessionStart(source=clear)`. Both should fire within ms of each other.
- In heuristic mode: the `/clear` detection looks for `/clear</command-name>` in the first 8KB of the JSONL file. If the marker is missing, detection fails.

**Fixes:**
- Restart the terminal (open a new one, close the old).
- Make sure hooks are enabled.

## Layout doesn't sync across windows

**Symptom:** edited layout in window A, saved, opened window B - still seeing the old layout.

**Diagnose:**
- The cross-window sync uses `fs.watch` plus a 2-second polling fallback. On some filesystems (network mounts, Docker volumes), neither may work reliably.

**Fixes:**
- Reload window B's webview (right-click panel header → Reload Webview).
- Verify the layout file actually updated: `cat ~/.pixel-agents/layout.json` should show your edits in both windows.
- If you're editing in one window while another has unsaved changes, the unsaved window keeps its changes (last-save-wins, no merge).

## Layout file growing or corrupt

**Symptom:** the `~/.pixel-agents/layout.json` file is unusually large, or VS Code complains it can't parse it.

**Diagnose:**
- File size: should be tens of KB even for a complex layout. If it's MB-scale, something's wrong.
- Corruption: if a crash interrupted a write, the file may be partial. The atomic write (tmp + rename) protects against this, but `.tmp` files can be orphaned.

**Fixes:**
- Check for `~/.pixel-agents/layout.json.tmp`. If it exists, the previous write didn't finish; delete it.
- If `layout.json` is corrupt: copy it aside as backup, then delete it. Pixel Agents will fall back to the bundled default on next launch.

## Terminal opens in wrong workspace folder

**Symptom:** in a multi-root workspace, + Agent opens the terminal in the wrong folder.

**Diagnose:**
- The + Agent button has a dropdown caret; clicking the main button uses the first folder. The dropdown lets you pick.

**Fix:** click the caret to pick the folder explicitly.

## Sound never plays

**Symptom:** waiting bubble appears but no chime.

**Diagnose:**
- "Sound notifications" toggle off in Settings.
- AudioContext was never unlocked (you've never clicked the canvas).

**Fixes:**
- Toggle "Sound notifications" on in Settings.
- Click anywhere in the office once. Subsequent chimes should work.

If you toggled on and clicked but still nothing: open Webview Developer Tools and check the Console for AudioContext errors. Some restricted browser policies may prevent audio playback.

## External assets don't show up after adding the directory

**Symptom:** added a directory via "Add Asset Directory", but its furniture isn't in the catalog.

**Diagnose:**
- The directory must contain a `furniture/` folder with per-item subdirectories, each holding a `manifest.json`.
- The catalog file must reference PNGs that actually exist in the directory.

**Fixes:**
- Verify the structure of the added directory. See [external assets](/use/workflows/external-assets).
- Check Output → "Pixel Agents" for `[AssetLoader]` warnings.

## Restoring agents fails on startup

**Symptom:** had agents in the previous session; after VS Code restart, they don't reappear.

**Diagnose:**
- Restore tries to rebind each persisted agent to a live terminal (same name). If the terminal has different content (the Claude session inside it has exited), restore falls back to treating it as external.
- If the JSONL file is missing too (e.g. Claude cleaned it up), the agent isn't restorable.

**Fixes:**
- Open a terminal manually and re-run `claude`. The scanner will adopt it as a new agent.
- Check `~/.pixel-agents/vscode-state.json` to confirm the agent is still in the persisted list.

## "Pixel Agents: Export Layout as Default" doesn't work

**Symptom:** running the command does nothing visible.

**Cause:** this is a developer command. It writes to `webview-ui/public/assets/default-layout.json` inside the extension's install directory. If you installed via Marketplace, that path is read-only, and the write silently fails.

**Fix:** this command is intended for use with a from-source install. For Marketplace installs, ignore it.

## Reporting bugs

Before filing an issue:

1. Collect the Output → "Pixel Agents" log (especially the lines around when the problem occurred).
2. Note your VS Code version, OS, and Pixel Agents version.
3. Note whether you have hooks enabled.
4. If reproducible, write the exact steps.

File at [github.com/pixel-agents-hq/pixel-agents/issues](https://github.com/pixel-agents-hq/pixel-agents/issues).

## Related

- [Use troubleshooting (cross-surface)](/use/troubleshooting)
- [Standalone troubleshooting](/use/standalone/troubleshooting)
- [FAQ](/use/faq)
- [Hooks vs heuristic](/learn/hooks-vs-heuristic)
- [Enabling hooks](/use/workflows/enabling-hooks)
