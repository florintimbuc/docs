---
sidebar_position: 4
---

# VS Code Settings Reference

The VS Code-native settings exposed via `package.json contributes.configuration`. These appear in VS Code's Settings UI (`Cmd/Ctrl+,` → search "pixel-agents") and can be set in `settings.json`.

Two keys ship today. Both control extension startup behavior. For the file-backed settings (sound, hooks, layout, etc.), see [Config reference](./config). For the use-case overview of both systems, see [Settings](/use/vscode/settings).

## Source

Defined in `package.json`:

```json
{
  "contributes": {
    "configuration": {
      "title": "Pixel Agents",
      "properties": {
        "pixel-agents.autoShowPanel": { ... },
        "pixel-agents.autoSpawnAgent": { ... }
      }
    }
  }
}
```

The extension reads these via `vscode.workspace.getConfiguration('pixel-agents')` on activation.

## Keys

### `pixel-agents.autoShowPanel`

| Type | boolean |
|---|---|
| Default | `false` |
| Scope | user or workspace |

When `true`, the Pixel Agents panel automatically opens and focuses when VS Code starts. Equivalent to running `Pixel Agents: Show Panel` on every activation.

Useful when you always want the office visible. With `false` (default), the panel is dormant until you open it via the command palette or click its icon.

### `pixel-agents.autoSpawnAgent`

| Type | boolean |
|---|---|
| Default | `false` |
| Scope | user or workspace |

When `true`, automatically spawn one Claude Code agent when VS Code starts, but only if no agents are currently running.

The check is one-time per VS Code startup. If you close the auto-spawned agent, no new one is spawned to replace it.

Use case: you almost always want at least one Claude session live in your workspace. Set this true and skip the manual `+ Agent` click.

## How to set them

### Via the Settings UI

1. `Cmd/Ctrl+,` to open Settings.
2. Search "pixel-agents".
3. Toggle the checkboxes for `Auto Show Panel` and `Auto Spawn Agent`.

User scope (the default) applies to all VS Code windows. Workspace scope (toggle the "Workspace" tab) applies only to the current workspace.

### Via `settings.json`

User: `Cmd/Ctrl+Shift+P` → "Preferences: Open User Settings (JSON)".

```json
{
  "pixel-agents.autoShowPanel": true,
  "pixel-agents.autoSpawnAgent": false
}
```

Workspace: in `.vscode/settings.json` inside the workspace folder.

Workspace overrides user.

## What these settings don't do

They control activation, not runtime behavior. To toggle sound, hooks, watch-all-sessions, and other runtime settings, use the **in-panel Settings modal** (gear icon in the bottom toolbar). Those live in `~/.pixel-agents/config.json` under the `vscode` namespace.

Why two systems? VS Code's settings.json is convenient for activation-time decisions but awkward for the runtime UI's modal. The runtime modal also has to work in standalone, where there's no VS Code settings.json. Splitting the two keeps each in its natural home.

See [Settings (use)](/use/vscode/settings) for the full picture.

## Reading from code

Inside the VS Code adapter:

```ts
import * as vscode from 'vscode';

const config = vscode.workspace.getConfiguration('pixel-agents');
const autoShow = config.get<boolean>('autoShowPanel', false);
const autoSpawn = config.get<boolean>('autoSpawnAgent', false);
```

The extension reads these on `activate()`. Subsequent changes via the Settings UI fire `vscode.workspace.onDidChangeConfiguration` events; the extension does NOT currently listen for those (so changes take effect on next VS Code start).

## Change behavior

Setting `autoShowPanel` to `true`:

1. On next VS Code start, the extension activates (`onStartupFinished` event).
2. After construction, it programmatically focuses the panel (`vscode.commands.executeCommand(...VIEW_ID.focus)`).
3. The panel opens.

Setting `autoSpawnAgent` to `true`:

1. On next VS Code start, the extension activates.
2. After the webview is ready and agents are restored, it checks the agent count.
3. If zero, it triggers a `launchAgent` flow (equivalent to clicking `+ Agent`).

Both run unconditionally on activation. There's no "ask first" toggle.

## Default behavior (both false)

Without these settings:

- The panel stays in the auxiliary area, dormant. You open it manually via the command palette or the activity bar icon.
- No agent is spawned automatically. You click `+ Agent` to start one.

This is the conservative default. Most users prefer it.

## Workspace recommendations

For a workspace where you always want Pixel Agents visible:

```jsonc
// .vscode/settings.json
{
  "pixel-agents.autoShowPanel": true
}
```

For a workspace where you also always want at least one Claude session ready:

```jsonc
{
  "pixel-agents.autoShowPanel": true,
  "pixel-agents.autoSpawnAgent": true
}
```

Don't set `autoSpawnAgent: true` user-wide unless you're certain. It launches Claude in every workspace you open.

## Multi-root workspaces

Both keys are respected per-workspace. In a multi-root workspace, the settings come from the workspace file (if it has its own settings) or the user settings.

If `autoSpawnAgent: true` and the workspace has multiple folders, the auto-spawn picks the first folder for the terminal cwd. Use the `+ Agent` dropdown to pick a different folder manually for subsequent agents.

## Future keys (not yet implemented)

Potential additions:

- `pixel-agents.defaultPort` - override the server's default port for standalone.
- `pixel-agents.defaultProvider` - select a default provider when more than one is bundled.
- `pixel-agents.terminalShell` - override the shell used to launch `claude`.

None of these exist today. Track [github.com/pixel-agents-hq/pixel-agents/issues](https://github.com/pixel-agents-hq/pixel-agents/issues) for status.

## Related

- [Settings (use-case)](/use/vscode/settings) - both settings systems explained side by side.
- [Config reference](./config) - the file-backed settings system.
- [CLI reference](./cli) - the standalone-only settings (flags, not config keys).
- VS Code commands: `pixel-agents.showPanel`, `pixel-agents.exportDefaultLayout` (defined in `package.json` `contributes.commands`).
