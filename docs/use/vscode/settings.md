---
sidebar_position: 2
---

# Settings

Pixel Agents has two parallel settings systems:

1. **VS Code-native settings** (in `package.json contributes.configuration`): control how the extension activates. Set via the VS Code Settings UI or `settings.json`.
2. **File-backed settings** (in `~/.pixel-agents/config.json` under the `vscode` namespace): control the office behavior. Set via the in-panel settings modal.

This page documents both. For the schema, see [Reference: VS Code settings](/reference/vscode-settings) and [Reference: config.json](/reference/config).

## VS Code-native settings

Two keys today. Both boolean, both default `false`.

### `pixel-agents.autoShowPanel`

When `true`, the Pixel Agents panel automatically opens and focuses when VS Code starts. Useful if you always want the office visible.

| Default | `false` |
|---|---|
| Type | boolean |

### `pixel-agents.autoSpawnAgent`

When `true`, automatically spawn one Claude Code agent when VS Code starts, but only if no agents are currently running.

| Default | `false` |
|---|---|
| Type | boolean |

This is the "I always want at least one Claude session ready" toggle. It won't keep spawning if you close the auto-spawned agent; the check is one-time per VS Code startup.

### How to set them

**Via the Settings UI**: `Cmd/Ctrl+,` → search "pixel-agents" → toggle.

**Via `settings.json`**: add either:

```json
{
  "pixel-agents.autoShowPanel": true,
  "pixel-agents.autoSpawnAgent": false
}
```

User vs workspace scope works as expected. A workspace-scoped setting overrides the user-scoped one.

## File-backed settings (the modal)

These live in `~/.pixel-agents/config.json` under the `vscode` namespace. They're set via the gear icon in the Pixel Agents panel, not via VS Code settings.

Click the **⚙ Settings** button in the bottom toolbar. A centered modal opens.

### Sound notifications

**What it does:** plays an ascending two-note chime (E5 → E6) when an agent enters the waiting state.

**Default:** on.

**Why you might toggle off:** you find the chime distracting; you have multiple Pixel Agents windows and they fire too often; you're in a meeting.

**How it works:** uses the Web Audio API. The audio context is unlocked on first canvas mousedown (browsers require user interaction before AudioContext can play). If you toggle off, no chime; if you toggle back on, the chime resumes immediately.

### Always show labels

**What it does:** show the activity label above every character permanently (not just on hover or selection).

**Default:** off.

**Why you might toggle on:** you're running many agents and want a real-time map of who's doing what without hovering individually.

**Trade-off:** labels above every character can clutter the view when characters overlap.

### Hooks enabled

**What it does:** install Claude Code Hooks API entries into `~/.claude/settings.json` so the extension receives instant activity events.

**Default:** on.

**Why you might toggle off:** you don't want Pixel Agents modifying `~/.claude/settings.json`; you're debugging a hooks-related issue; you want to test the heuristic fallback.

When toggled on, the extension writes hook entries pointing at `~/.pixel-agents/hooks/claude-hook.js` and copies the bundled hook script into `~/.pixel-agents/hooks/`. When toggled off, the hook entries are removed (the script file stays on disk).

For the deep explanation, see [Enabling hooks](/use/workflows/enabling-hooks). For the conceptual reasoning, see [Hooks vs heuristic](/learn/hooks-vs-heuristic).

### Watch all sessions

**What it does:** scan all of `~/.claude/projects/` for active Claude sessions, not just the current workspace's project hash.

**Default:** off.

**Why you might toggle on:** you run `claude` in many directories and want all of them visible in one office; you're switching contexts frequently and don't want to relaunch the panel each time.

**Trade-off:** you'll see agents from projects unrelated to the current workspace. The office can become crowded.

The scanner uses `GLOBAL_SCAN_ACTIVE_MIN_SIZE = 3_072` (3KB) and `GLOBAL_SCAN_ACTIVE_MAX_AGE_MS = 600_000` (10 minutes) thresholds to filter out empty / stale sessions when this is enabled.

### External asset directories

**What it does:** merge furniture from external directories into the catalog at startup.

Set via "Add Asset Directory" / "Remove Asset Directory" buttons.

The directory must contain a `furniture/` folder with per-item subdirectories, each holding a `manifest.json` and its referenced PNGs. See [external assets](/use/workflows/external-assets) for the format. External IDs override bundled IDs on collision.

When you add or remove a directory, the assets reload immediately and `externalAssetDirectoriesUpdated` broadcasts; characters and layout persist through the reload.

### Layout actions (Export / Import / Reset)

**Export Layout:** opens a native save dialog. Choose where to save your current layout as a JSON file. Useful for sharing or backing up.

**Import Layout:** opens a native open dialog. Pick a JSON file (must have `version: 1` and a `tiles` array). Replaces your current layout.

**Reset Layout:** restores the bundled default layout. Confirmation required - this overwrites your current layout. The bundled default is at `webview-ui/public/assets/default-layout.json`.

## Where settings actually live

| Setting | Where stored |
|---|---|
| `pixel-agents.autoShowPanel` | VS Code `globalState` (or `settings.json` if set explicitly). |
| `pixel-agents.autoSpawnAgent` | Same. |
| Sound notifications | `~/.pixel-agents/config.json` under `vscode.soundEnabled`. |
| Always show labels | `~/.pixel-agents/config.json` under `vscode.alwaysShowLabels`. |
| Hooks enabled | `~/.pixel-agents/config.json` under `vscode.hooksEnabled`. |
| Watch all sessions | `~/.pixel-agents/config.json` under `vscode.watchAllSessions`. |
| Hooks info shown | `~/.pixel-agents/config.json` under `vscode.hooksInfoShown`. |
| Last seen version | `~/.pixel-agents/config.json` under `vscode.lastSeenVersion`. |
| External asset directories | `~/.pixel-agents/config.json` at the top level (shared across namespaces). |

The `~/.pixel-agents/config.json` file is shared across VS Code, standalone, and any future hosts. Each host writes to its own namespace section; external asset directories are shared.

For the rationale, see [ADR-0005: Namespaced persistence](/decisions/namespaced-persistence).

## How settings sync (or don't)

- **Cross-window in same host**: VS Code-native settings sync per VS Code's normal mechanism. File-backed settings sync via watch + 2-second polling on `config.json`.
- **Cross-host (VS Code ↔ standalone)**: each host has its own namespace, so they don't share. Toggling sound off in VS Code does not affect standalone.
- **Cross-host external asset directories**: shared because the list lives at the top level of `config.json`.

## Versioning

When you update Pixel Agents, the modal may show a "What's new" callout the first time you open it after the update. `lastSeenVersion` tracks which version you've already seen; the comparison is against the bundled `extensionVersion`.

## Next

- [VS Code overview](./overview) - feature tour.
- [Layout editor](./layout-editor) - the other major UI surface.
- [Enabling hooks](/use/workflows/enabling-hooks) - the "Hooks enabled" toggle in detail.
- [External assets](/use/workflows/external-assets) - using "Add Asset Directory".
- [VS Code settings reference](/reference/vscode-settings) - schema-level lookup.
- [config.json reference](/reference/config) - the file format.
