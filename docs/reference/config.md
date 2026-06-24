---
sidebar_position: 2
---

# `~/.pixel-agents/config.json` schema

The shared config file. Persists per-host settings under namespace sections plus a top-level external asset directory list. Atomic writes via tmp+rename.

For the rationale, see [ADR-0005: Namespaced persistence](/decisions/namespaced-persistence). For the implementation, see `server/src/configPersistence.ts` and `server/src/fileStateAdapter.ts:45-134`.

## Location

```
~/.pixel-agents/config.json
```

The directory `~/.pixel-agents/` is created with mode `0o700` on first write. The file itself does not have an enforced mode.

## Shape

```ts
// server/src/configPersistence.ts
export interface PixelAgentsConfig {
  vscode: AdapterSettings;
  standalone: AdapterSettings;
  externalAssetDirectories: string[];
}

export interface AdapterSettings {
  soundEnabled: boolean;
  lastSeenVersion: string;
  alwaysShowLabels: boolean;
  watchAllSessions: boolean;
  hooksEnabled: boolean;
  hooksInfoShown: boolean;
}
```

Two namespaces ship today: `vscode` and `standalone`. Each is an `AdapterSettings`.

## Defaults

If the file doesn't exist, defaults are used:

```ts
// server/src/configPersistence.ts
const DEFAULT_ADAPTER_SETTINGS: AdapterSettings = {
  soundEnabled: true,
  lastSeenVersion: '',
  alwaysShowLabels: false,
  watchAllSessions: false,
  hooksEnabled: true,
  hooksInfoShown: false,
};
```

`externalAssetDirectories` defaults to `[]`.

## Field-by-field reference

### `vscode.soundEnabled` / `standalone.soundEnabled`

| Type | boolean |
|---|---|
| Default | `true` |
| Set via | Settings → Sound notifications |

When true, plays the ascending two-note chime when an agent enters the waiting state. Web Audio API. AudioContext is unlocked on first canvas mousedown.

### `vscode.lastSeenVersion` / `standalone.lastSeenVersion`

| Type | string |
|---|---|
| Default | `''` |
| Set via | `setLastSeenVersion` ClientMessage (UI internal) |

Tracks which Pixel Agents version the user has acknowledged. Used to show "What's new" callouts after updates. Compared against the bundled `extensionVersion` (from `process.env.PIXEL_AGENTS_VERSION` or the VS Code extension package version).

Format: semver string (`'1.3.0'`).

### `vscode.alwaysShowLabels` / `standalone.alwaysShowLabels`

| Type | boolean |
|---|---|
| Default | `false` |
| Set via | Settings → Always show labels |

When true, the activity label above each character is shown permanently. When false (default), labels only show on hover or when the character is selected.

### `vscode.watchAllSessions` / `standalone.watchAllSessions`

| Type | boolean |
|---|---|
| Default | `false` |
| Set via | Settings → Watch all sessions |

When true, the scanner watches all of `~/.claude/projects/` rather than only the current workspace's project hash. Useful when running `claude` in many directories.

Active session filters:
- `GLOBAL_SCAN_ACTIVE_MIN_SIZE = 3_072` bytes
- `GLOBAL_SCAN_ACTIVE_MAX_AGE_MS = 600_000` ms (10 minutes)

Sources at `server/src/constants.ts:33-36`.

### `vscode.hooksEnabled` / `standalone.hooksEnabled`

| Type | boolean |
|---|---|
| Default | `true` |
| Set via | Settings → Hooks enabled |

When true, the active `HookProvider` is asked to install its hooks (for Claude: write entries into `~/.claude/settings.json` and copy the script to `~/.pixel-agents/hooks/claude-hook.js`).

On change, the runtime's `hooksEnabled` ref is updated and the `onSetHooksEnabled` side effect fires to actually install/uninstall.

### `vscode.hooksInfoShown` / `standalone.hooksInfoShown`

| Type | boolean |
|---|---|
| Default | `false` |
| Set via | `setHooksInfoShown` ClientMessage (UI internal) |

Tracks whether the user has dismissed the hooks-explanation info modal. Used to avoid showing the same modal repeatedly.

### `externalAssetDirectories`

| Type | string[] |
|---|---|
| Default | `[]` |
| Set via | `addExternalAssetDirectory` / `removeExternalAssetDirectory` ClientMessages |

Absolute paths to external asset directories. Each directory should contain a a `furniture/` folder with per-item `manifest.json` files plus referenced PNGs (and optionally `characters/`, `floors/`, `walls/` folders).

Top-level (not per-namespace) so all hosts on the machine see the same external assets. See [External assets](/use/workflows/external-assets).

## Example file

A typical config after using the app for a while:

```json
{
  "vscode": {
    "soundEnabled": true,
    "lastSeenVersion": "1.3.0",
    "alwaysShowLabels": false,
    "watchAllSessions": false,
    "hooksEnabled": true,
    "hooksInfoShown": true
  },
  "standalone": {
    "soundEnabled": false,
    "lastSeenVersion": "1.3.0",
    "alwaysShowLabels": true,
    "watchAllSessions": true,
    "hooksEnabled": true,
    "hooksInfoShown": true
  },
  "externalAssetDirectories": [
    "/Users/you/pixel-assets/coolkitchen",
    "/Users/you/pixel-assets/cyberpunk-office"
  ]
}
```

Note: in this example, VS Code has sound on, standalone has sound off, both use the same external directories.

## Reading the config

The runtime reads via `readConfig()` (`server/src/configPersistence.ts`):

```ts
import { readConfig } from './configPersistence.js';

const cfg = readConfig();
console.log(cfg.vscode.hooksEnabled);
console.log(cfg.externalAssetDirectories);
```

Missing fields are filled with defaults via `parseAdapterSettings()`. The function is type-coercion-safe: a wrong-typed field falls back to the default.

A missing file returns the all-defaults config.

## Writing the config

```ts
import { writeConfig } from './configPersistence.js';

const cfg = readConfig();
cfg.vscode.soundEnabled = false;
writeConfig(cfg);
```

Atomic via tmp + rename: writes to `config.json.tmp` then `fs.renameSync` to `config.json`. A crash mid-write leaves the previous content intact.

## Per-namespace setting access

Adapters use the prefixed key form via `getSetting` / `setSetting`:

```ts
const adapter = new FileStateAdapter({ namespace: 'vscode' });
adapter.getSetting('pixel-agents.hooksEnabled', true);
adapter.setSetting('pixel-agents.soundEnabled', false);
```

The `pixel-agents.` prefix is stripped internally; the remainder must be a key in `AdapterSettings` (`ADAPTER_SETTING_KEYS`). Unknown keys are silently ignored.

## Concurrent writes

Multiple hosts writing the same config can race (each reads, modifies, writes). The atomic write protects against partial writes, but a last-write-wins race can drop concurrent edits.

In practice: each host writes to its own namespace section, so the race only matters if two hosts edit `externalAssetDirectories` simultaneously. Very rare.

If you experience persistent loss, ensure only one host modifies external asset directories at a time.

## Migration from VS Code-native state

Prior to the refactor in #273, VS Code stored settings in `context.globalState`. The migration in `adapters/vscode/migrateVsCodeState.ts` runs every activation:

1. Read each known key from `globalState`.
2. Write to the new `config.json` under the `vscode` namespace.
3. Verify by reading back.
4. Only on verified success, clear the legacy key.

If a write fails (disk error, permission), the legacy key is preserved and a warning is logged. The next activation retries.

This is idempotent: a fully-migrated state results in a no-op.

## Validation

The `parseAdapterSettings` function coerces each field individually:

```ts
soundEnabled: typeof obj.soundEnabled === 'boolean' ? obj.soundEnabled : DEFAULT_ADAPTER_SETTINGS.soundEnabled,
// etc.
```

Wrong-typed values fall back to defaults. The file is therefore self-healing - a corrupt or partially-edited config doesn't break the app, it just resets affected fields.

There's no JSON Schema for this file shipped. The TypeScript types are the contract.

## Future fields

The config is small and stable today. Future additions might include:

- Per-host themes (color tints for the office).
- Notification preferences beyond `soundEnabled`.
- Custom hook script paths.

Adding a field requires updating `AdapterSettings`, `ADAPTER_SETTING_KEYS`, `DEFAULT_ADAPTER_SETTINGS`, and `parseAdapterSettings`. The auto-coercion of new fields means older clients with missing keys self-heal.

## Related

- [VS Code settings (the other settings system)](./vscode-settings)
- [Layout reference (the other persisted file)](./layout)
- [StateAdapter contract](/build/adapters/state-adapter)
- [FileStateAdapter (impl)](/reference/state-management)
- [ADR-0005: Namespaced persistence](/decisions/namespaced-persistence)
- `server/src/configPersistence.ts` - source of truth.
