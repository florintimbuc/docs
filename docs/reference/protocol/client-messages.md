---
sidebar_position: 3
---

# ClientMessage Reference

:::warning[AI-generated docs]
This document was AI-generated and may have some mistakes - we apologize for this, we're in the process of reviewing all documents. If you find any issues, we'd be thankful if you [submit an edit PR](https://github.com/pixel-agents-hq/docs/edit/main/docs/reference/protocol/client-messages.md).
:::

All 18 variants of the `ClientMessage` discriminated union. Discriminator field: `type` (`core/asyncapi.yaml:137`).

Every variant is cited against `core/asyncapi.yaml:LINE`. The TypeScript bindings live in `core/src/messages.ts` (auto-generated from the YAML).

```ts
export type ClientMessage =
  | WebviewReady
  | LaunchAgent
  | FocusAgent
  | CloseAgent
  | SaveAgentSeats
  | SaveLayout
  | SetSoundEnabled
  | SetLastSeenVersion
  | SetAlwaysShowLabels
  | SetHooksEnabled
  | SetHooksInfoShown
  | SetWatchAllSessions
  | ExportLayout
  | ImportLayout
  | OpenSessionsFolder
  | AddExternalAssetDirectory
  | RemoveExternalAssetDirectory
  | RequestDiagnostics;
```

`core/src/messages.ts:38-56`

The server handler dispatches on `msg.type` in `server/src/clientMessageHandler.ts:53-129`.

---

## Lifecycle (1)

### webviewReady

Schema: `core/asyncapi.yaml:583-590`.

Client signals it's ready to receive state. The server responds with the full startup snapshot: `providerCapabilities`, all asset bundles, `layoutLoaded`, `settingsLoaded`, `existingAgents`. See the sequence diagram in [overview.md](./overview#startup-handshake).

| Field | Type | Required | Description |
|---|---|---|---|
| `type` | `'webviewReady'` | yes | Discriminator |

```json
{ "type": "webviewReady" }
```

**Handled by:** `server/src/clientMessageHandler.ts:54-56` → `handleWebviewReady` (`server/src/clientMessageHandler.ts:132-213`).

---

## Agent actions (4)

### launchAgent

Schema: `core/asyncapi.yaml:592-604`.

Launch a new Claude agent in a new terminal. Standalone mode delegates to the active provider's `buildLaunchCommand` (`core/src/provider.ts:113-121`); for Claude that produces `claude --session-id <uuid>` (`server/src/providers/hook/claude/claude.ts:96-104`).

| Field | Type | Required | Description |
|---|---|---|---|
| `type` | `'launchAgent'` | yes | Discriminator |
| `folderPath` | `string` | no | Workspace folder path (for multi-root workspaces) |
| `bypassPermissions` | `boolean` | no | Pass `--dangerously-skip-permissions` to the CLI |

```json
{
  "type": "launchAgent",
  "folderPath": "/Users/alice/proj/backend",
  "bypassPermissions": false
}
```

**Handled by:** the VS Code adapter (which creates a `vscode.Terminal`). Standalone mode currently leaves this to the host process (no terminal to create from the server).

### focusAgent

Schema: `core/asyncapi.yaml:606-616`.

Focus an agent's terminal. VS Code-only.

| Field | Type | Required | Description |
|---|---|---|---|
| `type` | `'focusAgent'` | yes | Discriminator |
| `id` | `integer` | yes | Agent ID to focus |

```json
{ "type": "focusAgent", "id": 3 }
```

**Handled by:** the VS Code adapter (calls `terminal.show()` on the agent's `terminalRef`). Standalone falls into the default branch in `clientMessageHandler.ts:125-128` and is a no-op.

### closeAgent

Schema: `core/asyncapi.yaml:618-626`.

Close (dismiss) an agent. Removes the character from the office and adds the JSONL file to the [`DismissalTracker`](../state-management#dismissaltracker) so it isn't re-adopted within the 3-minute cooldown.

| Field | Type | Required | Description |
|---|---|---|---|
| `type` | `'closeAgent'` | yes | Discriminator |
| `id` | `integer` | yes | Agent ID to close |

```json
{ "type": "closeAgent", "id": 3 }
```

**Handled by:** the adapter via `AgentRuntime.removeAgent` (`server/src/agentRuntime.ts:204-234`).

### saveAgentSeats

Schema: `core/asyncapi.yaml:628-640`.

Persist seat assignments for current agents to the adapter's state file.

| Field | Type | Required | Description |
|---|---|---|---|
| `type` | `'saveAgentSeats'` | yes | Discriminator |
| `seats` | `Record<string, SeatAssignment>` | yes | Map of agent ID (string) to seat assignment |

See [`SeatAssignment`](./schemas#seatassignment).

```json
{
  "type": "saveAgentSeats",
  "seats": {
    "1": { "palette": 0, "hueShift": 0, "seatId": "desk-a:0" },
    "2": { "palette": 3, "hueShift": 45, "seatId": null }
  }
}
```

**Handled by:** `server/src/clientMessageHandler.ts:64-70` - calls `adapter.saveSeats(...)`.

---

## Layout (3)

### saveLayout

Schema: `core/asyncapi.yaml:642-652`.

Save the office layout to `~/.pixel-agents/layout.json` (atomic via tmp+rename in `server/src/layoutPersistence.ts`).

| Field | Type | Required | Description |
|---|---|---|---|
| `type` | `'saveLayout'` | yes | Discriminator |
| `layout` | `object` | yes | Opaque `OfficeLayout` object (see [schemas.md](./schemas#officelayout)) |

```json
{
  "type": "saveLayout",
  "layout": {
    "version": 1,
    "cols": 20,
    "rows": 11,
    "tiles": [0, 0, 1, 1, 0, 0, ...],
    "furniture": [],
    "tileColors": []
  }
}
```

**Handled by:** `server/src/clientMessageHandler.ts:58-62` - calls `writeLayoutToFile()`.

### exportLayout

Schema: `core/asyncapi.yaml:712-719`.

Trigger layout export via the host's native save dialog. Standalone has no native dialogs and currently falls through to the default branch (`server/src/clientMessageHandler.ts:125-128`).

| Field | Type | Required | Description |
|---|---|---|---|
| `type` | `'exportLayout'` | yes | Discriminator |

```json
{ "type": "exportLayout" }
```

**Handled by:** the VS Code adapter (uses `vscode.window.showSaveDialog`).

### importLayout

Schema: `core/asyncapi.yaml:721-728`.

Trigger layout import via the host's native open dialog. Standalone is a no-op.

| Field | Type | Required | Description |
|---|---|---|---|
| `type` | `'importLayout'` | yes | Discriminator |

```json
{ "type": "importLayout" }
```

**Handled by:** the VS Code adapter (uses `vscode.window.showOpenDialog`).

---

## Settings (6)

All setter messages persist via `StateAdapter.setSetting` (`core/src/adapter.ts:26`). The standalone adapter writes to the per-namespace section of `~/.pixel-agents/config.json` (see [state-management.md](../state-management#filestateadapter)).

### setSoundEnabled

Schema: `core/asyncapi.yaml:654-662`.

Toggle notification sound preference.

| Field | Type | Required | Description |
|---|---|---|---|
| `type` | `'setSoundEnabled'` | yes | Discriminator |
| `enabled` | `boolean` | yes | New value |

```json
{ "type": "setSoundEnabled", "enabled": true }
```

**Handled by:** `server/src/clientMessageHandler.ts:72-74` - `adapter.setSetting('pixel-agents.soundEnabled', ...)`.

### setLastSeenVersion

Schema: `core/asyncapi.yaml:664-672`.

Record the last extension version the user saw (for changelog modal logic).

| Field | Type | Required | Description |
|---|---|---|---|
| `type` | `'setLastSeenVersion'` | yes | Discriminator |
| `version` | `string` | yes | Version string (e.g. `"1.2.0"`) |

```json
{ "type": "setLastSeenVersion", "version": "1.2.0" }
```

**Handled by:** `server/src/clientMessageHandler.ts:76-78`.

### setAlwaysShowLabels

Schema: `core/asyncapi.yaml:674-682`.

Toggle always-on character labels.

| Field | Type | Required | Description |
|---|---|---|---|
| `type` | `'setAlwaysShowLabels'` | yes | Discriminator |
| `enabled` | `boolean` | yes | New value |

```json
{ "type": "setAlwaysShowLabels", "enabled": false }
```

**Handled by:** `server/src/clientMessageHandler.ts:80-82`.

### setHooksEnabled

Schema: `core/asyncapi.yaml:684-692`.

Toggle hook installation. Side-effects:

1. Persists the new value (`adapter.setSetting(...)`).
2. Updates the runtime ref `AgentRuntime.hooksEnabled.current` (which heuristic scanners check before firing).
3. Triggers the host-provided `onSetHooksEnabled` callback, which installs or uninstalls the hook scripts (`server/src/clientMessageHandler.ts:91-97`).

| Field | Type | Required | Description |
|---|---|---|---|
| `type` | `'setHooksEnabled'` | yes | Discriminator |
| `enabled` | `boolean` | yes | New value |

```json
{ "type": "setHooksEnabled", "enabled": true }
```

**Handled by:** `server/src/clientMessageHandler.ts:91-97`.

### setHooksInfoShown

Schema: `core/asyncapi.yaml:694-700`.

Mark the hooks info modal as dismissed. No payload other than the discriminator.

| Field | Type | Required | Description |
|---|---|---|---|
| `type` | `'setHooksInfoShown'` | yes | Discriminator |

```json
{ "type": "setHooksInfoShown" }
```

**Handled by:** `server/src/clientMessageHandler.ts:99-101` - `adapter.setSetting('pixel-agents.hooksInfoShown', true)`.

### setWatchAllSessions

Schema: `core/asyncapi.yaml:702-710`.

Toggle "Watch All Sessions" - when on, the server adopts active sessions from any workspace (not just the one this window is bound to). Mutates `AgentRuntime.watchAllSessions.current` so scanners and the `HookEventHandler.isTrackedSession` check (`server/src/hookEventHandler.ts:94-101`) start reflecting the new value immediately.

| Field | Type | Required | Description |
|---|---|---|---|
| `type` | `'setWatchAllSessions'` | yes | Discriminator |
| `enabled` | `boolean` | yes | New value |

```json
{ "type": "setWatchAllSessions", "enabled": true }
```

**Handled by:** `server/src/clientMessageHandler.ts:84-89`.

---

## Workspace (1)

### openSessionsFolder

Schema: `core/asyncapi.yaml:730-737`.

Open `~/.claude/projects` in the OS file manager. VS Code uses `vscode.env.openExternal` with a `vscode.Uri.file(...)`. Standalone is currently a no-op.

| Field | Type | Required | Description |
|---|---|---|---|
| `type` | `'openSessionsFolder'` | yes | Discriminator |

```json
{ "type": "openSessionsFolder" }
```

**Handled by:** the VS Code adapter.

---

## Assets (2)

### addExternalAssetDirectory

Schema: `core/asyncapi.yaml:739-746`.

Request that the host show a directory picker, then add the chosen path to `externalAssetDirectories`.

In standalone mode the WebSocket handler accepts an inlined `path` field (used by the SPA when the user pastes a path), because there's no native picker. See `server/src/clientMessageHandler.ts:103-113`.

| Field | Type | Required | Description |
|---|---|---|---|
| `type` | `'addExternalAssetDirectory'` | yes | Discriminator |

The standalone handler also accepts an extra `path: string` field outside the strict YAML schema; pure protocol clients should let the host invoke the picker.

```json
{ "type": "addExternalAssetDirectory" }
```

After success, the server emits [`externalAssetDirectoriesUpdated`](./server-messages#externalassetdirectoriesupdated).

**Handled by:** `server/src/clientMessageHandler.ts:103-113`.

### removeExternalAssetDirectory

Schema: `core/asyncapi.yaml:748-757`.

Remove an external asset directory by absolute path.

| Field | Type | Required | Description |
|---|---|---|---|
| `type` | `'removeExternalAssetDirectory'` | yes | Discriminator |
| `path` | `string` | yes | Absolute path to remove |

```json
{
  "type": "removeExternalAssetDirectory",
  "path": "/Users/alice/asset-pack"
}
```

After success, the server emits `externalAssetDirectoriesUpdated`.

**Handled by:** `server/src/clientMessageHandler.ts:115-123`.

---

## Diagnostics (1)

### requestDiagnostics

Schema: `core/asyncapi.yaml:759-766`.

Request a snapshot of per-agent connection diagnostics. The server responds with one [`agentDiagnostics`](./server-messages#agentdiagnostics) message.

| Field | Type | Required | Description |
|---|---|---|---|
| `type` | `'requestDiagnostics'` | yes | Discriminator |

```json
{ "type": "requestDiagnostics" }
```

**Handled by:** the diagnostics handler. Reads `AgentState.fileOffset`, `linesProcessed`, `hookDelivered`, `lastDataAt` from each entry in `AgentStateStore` and replies with `agentDiagnostics`.

---

## Default branch

Unknown `msg.type` values fall into the default branch and are silently ignored (`server/src/clientMessageHandler.ts:125-128`). Malformed JSON is dropped at the parse step (`server/src/httpServer.ts:180-194`). See [errors.md](../errors).

---

## See also

- [server-messages.md](./server-messages) - the inverse direction
- [schemas.md](./schemas) - supporting schemas like `SeatAssignment`, `WorkspaceFolder`
- [../state-management.md](../state-management) - `AgentStateStore`, `AgentRuntime`, settings flow
- [../hookprovider.md](../hookprovider) - `buildLaunchCommand`, `installHooks`/`uninstallHooks`
- [../errors.md](../errors) - what happens on malformed payloads or unknown providers
