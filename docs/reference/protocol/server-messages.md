---
sidebar_position: 2
---

# ServerMessage Reference

All 26 variants of the `ServerMessage` discriminated union. Discriminator field: `type` (`core/asyncapi.yaml:115`).

Every variant below carries `core/asyncapi.yaml:LINE` and `core/src/messages.ts:LINE` citations so you can pin down the exact field set and types in the source of truth.

For supporting (non-discriminated) schemas like `AgentSeatMeta`, `FurnitureAssetMessage`, etc., see [schemas.md](./schemas).

```ts
export type ServerMessage =
  | ProviderCapabilities
  | AgentCreated
  | AgentClosed
  | AgentSelected
  | ExistingAgents
  | AgentStatus
  | AgentToolStart
  | AgentToolDone
  | AgentToolsClear
  | AgentToolPermission
  | AgentToolPermissionClear
  | SubagentToolStart
  | SubagentToolDone
  | SubagentClear
  | SubagentToolPermission
  | AgentTeamInfo
  | AgentTokenUsage
  | LayoutLoaded
  | FurnitureAssetsLoaded
  | CharacterSpritesLoaded
  | FloorTilesLoaded
  | WallTilesLoaded
  | SettingsLoaded
  | ExternalAssetDirectoriesUpdated
  | WorkspaceFolders
  | AgentDiagnostics;
```

`core/src/messages.ts:10-36`

---

## Provider capabilities (1)

### `providerCapabilities`

Schema: `core/asyncapi.yaml:141-161`, TS: `core/src/messages.ts:58-62`.

Sent **once** after `webviewReady`, before any agent messages. Tells the client which tool names should render with the "reading" animation and which spawn sub-agent characters. The server reads these from the active `HookProvider` (`server/src/clientMessageHandler.ts:136-141`):

```ts
send({
  type: 'providerCapabilities',
  readingTools: [...claudeProvider.readingTools],
  subagentToolNames: [...claudeProvider.subagentToolNames],
});
```

| Field | Type | Required | Description |
|---|---|---|---|
| `type` | `'providerCapabilities'` | yes | Discriminator |
| `readingTools` | `string[]` | yes | Tool names that should render the reading animation (vs typing) |
| `subagentToolNames` | `string[]` | yes | Tool names that spawn sub-agent characters (e.g. `Task`, `Agent`) |

```json
{
  "type": "providerCapabilities",
  "readingTools": ["Read", "Grep", "Glob", "WebFetch", "WebSearch"],
  "subagentToolNames": ["Task", "Agent"]
}
```

**Emitted from:** `server/src/clientMessageHandler.ts:137-141` (in `handleWebviewReady`).

---

## Agent lifecycle (4)

### `agentCreated`

Schema: `core/asyncapi.yaml:163-176`, TS: `core/src/messages.ts:64-69`.

A new agent has appeared in the office.

| Field | Type | Required | Description |
|---|---|---|---|
| `type` | `'agentCreated'` | yes | Discriminator |
| `id` | `integer` | yes | Agent ID (positive integer) |
| `folderName` | `string` | no | Workspace folder name (multi-root only) |
| `isExternal` | `boolean` | no | True when adopted from an external session, not launched by this client |

```json
{
  "type": "agentCreated",
  "id": 7,
  "folderName": "packages/server",
  "isExternal": false
}
```

**Emitted from:** `server/src/httpServer.ts:153-165` (`onAgentAdded` listener piped from `AgentStateStore`). The store fires the `agentAdded` event on `set()` (`server/src/agentStateStore.ts:87-94`).

### `agentClosed`

Schema: `core/asyncapi.yaml:178-187`, TS: `core/src/messages.ts:71-74`.

An agent has been removed from the office.

| Field | Type | Required | Description |
|---|---|---|---|
| `type` | `'agentClosed'` | yes | Discriminator |
| `id` | `integer` | yes | Agent ID being removed |

```json
{ "type": "agentClosed", "id": 7 }
```

**Emitted from:** `server/src/httpServer.ts:167-169` (`onAgentRemoved` listener) when `AgentStateStore.delete()` fires the `agentRemoved` event (`server/src/agentStateStore.ts:96-102`). Triggered from `AgentRuntime.removeAgent()` (`server/src/agentRuntime.ts:204-234`).

### `agentSelected`

Schema: `core/asyncapi.yaml:189-198`, TS: `core/src/messages.ts:76-79`.

An agent's terminal was focused (VS Code only). The UI should highlight the character.

| Field | Type | Required | Description |
|---|---|---|---|
| `type` | `'agentSelected'` | yes | Discriminator |
| `id` | `integer` | yes | Agent ID that gained focus |

```json
{ "type": "agentSelected", "id": 3 }
```

**Emitted from:** the VS Code adapter when `vscode.window.onDidChangeActiveTerminal` resolves to a known agent. Standalone never emits this.

### `existingAgents`

Schema: `core/asyncapi.yaml:200-228`, TS: `core/src/messages.ts:81-87`.

Snapshot of all current agents. Sent on initial connect after `webviewReady` and re-sent after agent set changes that the client may have missed. Includes seat/palette assignments.

| Field | Type | Required | Description |
|---|---|---|---|
| `type` | `'existingAgents'` | yes | Discriminator |
| `agents` | `integer[]` | yes | All current agent IDs |
| `agentMeta` | `Record<string, AgentSeatMeta>` | yes | Per-agent seat metadata; key is the agent ID as a string |
| `folderNames` | `Record<string, string>` | yes | Per-agent workspace folder name |
| `externalAgents` | `Record<string, boolean>` | yes | True for agents adopted from external sessions |

See [AgentSeatMeta](./schemas#agentseatmeta).

```json
{
  "type": "existingAgents",
  "agents": [1, 2, 7],
  "agentMeta": {
    "1": { "palette": 0, "hueShift": 0, "seatId": "desk-a:0" },
    "2": { "palette": 3, "hueShift": 45, "seatId": "desk-b:0" },
    "7": { "palette": 5, "hueShift": 0, "seatId": null }
  },
  "folderNames": { "2": "packages/server" },
  "externalAgents": { "7": true }
}
```

**Emitted from:** `server/src/clientMessageHandler.ts:193-213` (end of `handleWebviewReady`). The seat map comes from `adapter.loadSeats()`.

---

## Agent status / tool activity (6)

### `agentStatus`

Schema: `core/asyncapi.yaml:230-246`, TS: `core/src/messages.ts:95-99`.

Active vs waiting state for an agent. Drives the character animation (typing/reading vs waiting bubble).

| Field | Type | Required | Description |
|---|---|---|---|
| `type` | `'agentStatus'` | yes | Discriminator |
| `id` | `integer` | yes | Agent ID |
| `status` | `'active' \| 'waiting'` | yes | Activity state (see `AgentActivityStatus`, `core/asyncapi.yaml:243-246`) |

```json
{ "type": "agentStatus", "id": 1, "status": "active" }
```

**Emitted from:** multiple sites.
- `server/src/hookEventHandler.ts:433-437` - `handlePreToolUse` marks active.
- `server/src/hookEventHandler.ts:730-734` - `markAgentWaiting` marks waiting.
- `server/src/timerManager.ts:76-81` - heuristic `startWaitingTimer` marks waiting after `TEXT_IDLE_DELAY_MS` (5 s).
- `server/src/timerManager.ts:49` - `clearAgentActivity` re-marks active.

### `agentToolStart`

Schema: `core/asyncapi.yaml:248-268`, TS: `core/src/messages.ts:103-111`.

Agent began executing a tool.

| Field | Type | Required | Description |
|---|---|---|---|
| `type` | `'agentToolStart'` | yes | Discriminator |
| `id` | `integer` | yes | Agent ID |
| `toolId` | `string` | yes | Tool invocation ID (from JSONL, or synthetic `hook-<ts>` from PreToolUse) |
| `status` | `string` | yes | Human-readable status (e.g. `"Reading foo.ts"`) - produced by `HookProvider.formatToolStatus` |
| `toolName` | `string` | no | Raw tool name (e.g. `"Read"`, `"Bash"`) |
| `permissionActive` | `boolean` | no | True if the tool is currently waiting on a permission prompt |
| `runInBackground` | `boolean` | no | True for `Task`/`Agent` calls spawned with `run_in_background: true` (suppresses ghost sub-agent characters for teammate spawns) |

```json
{
  "type": "agentToolStart",
  "id": 1,
  "toolId": "toolu_01ABCDxyz",
  "status": "Reading server.ts",
  "toolName": "Read"
}
```

**Emitted from:**
- `server/src/hookEventHandler.ts:424-432` - `handlePreToolUse` instant-emit for non-Task/Agent tools.
- `server/src/hookEventHandler.ts:717-725` - re-emit background agent tools after `agentToolsClear`.
- `server/src/transcriptParser.ts` - when JSONL `tool_use` records arrive.

### `agentToolDone`

Schema: `core/asyncapi.yaml:270-282`, TS: `core/src/messages.ts:113-117`.

Agent finished executing a tool. Delayed 300 ms (`TOOL_DONE_DELAY_MS` in `server/src/constants.ts:11`) to prevent UI flicker.

| Field | Type | Required | Description |
|---|---|---|---|
| `type` | `'agentToolDone'` | yes | Discriminator |
| `id` | `integer` | yes | Agent ID |
| `toolId` | `string` | yes | Tool invocation ID being completed |

```json
{ "type": "agentToolDone", "id": 1, "toolId": "toolu_01ABCDxyz" }
```

**Emitted from:**
- `server/src/hookEventHandler.ts:446-454` - `handlePostToolUse`.
- `server/src/transcriptParser.ts` - when JSONL `tool_result` records arrive.

### `agentToolsClear`

Schema: `core/asyncapi.yaml:284-292`, TS: `core/src/messages.ts:119-122`.

All foreground tools cleared (turn end). Background-agent tools are preserved and immediately re-broadcast via `agentToolStart` (`server/src/hookEventHandler.ts:715-725`).

| Field | Type | Required | Description |
|---|---|---|---|
| `type` | `'agentToolsClear'` | yes | Discriminator |
| `id` | `integer` | yes | Agent ID |

```json
{ "type": "agentToolsClear", "id": 1 }
```

**Emitted from:** `server/src/hookEventHandler.ts:713` (inside `markAgentWaiting`), `server/src/timerManager.ts:36` (inside `clearAgentActivity`).

### `agentToolPermission`

Schema: `core/asyncapi.yaml:294-303`, TS: `core/src/messages.ts:124-127`.

Permission prompt detected for the agent's current tool. The UI renders the amber `...` permission bubble.

| Field | Type | Required | Description |
|---|---|---|---|
| `type` | `'agentToolPermission'` | yes | Discriminator |
| `id` | `integer` | yes | Agent ID |

```json
{ "type": "agentToolPermission", "id": 1 }
```

**Emitted from:**
- `server/src/hookEventHandler.ts:602-605` - hook-driven (PermissionRequest / Notification(permission_prompt)).
- `server/src/timerManager.ts:133-136` - heuristic `startPermissionTimer` fires after `PERMISSION_TIMER_DELAY_MS` (7 s) when no hook has arrived.

### `agentToolPermissionClear`

Schema: `core/asyncapi.yaml:305-314`, TS: `core/src/messages.ts:129-132`.

Permission prompt resolved. The UI clears the bubble.

| Field | Type | Required | Description |
|---|---|---|---|
| `type` | `'agentToolPermissionClear'` | yes | Discriminator |
| `id` | `integer` | yes | Agent ID |

```json
{ "type": "agentToolPermissionClear", "id": 1 }
```

**Emitted from:** transcriptParser when tool execution resumes after permission grant, and from cleanup paths in `clearAgentActivity` / `markAgentWaiting`.

---

## Sub-agent activity (4)

Sub-agents are negative-ID child characters spawned by `Task`/`Agent` tool calls. Each lives under a parent tool ID.

### `subagentToolStart`

Schema: `core/asyncapi.yaml:316-332`, TS: `core/src/messages.ts:134-140`.

A sub-agent (e.g. `Task`) started a tool.

| Field | Type | Required | Description |
|---|---|---|---|
| `type` | `'subagentToolStart'` | yes | Discriminator |
| `id` | `integer` | yes | **Parent** agent ID (the lead) |
| `parentToolId` | `string` | yes | Tool ID of the `Task`/`Agent` call that spawned the sub-agent |
| `toolId` | `string` | yes | Tool ID inside the sub-agent's transcript |
| `status` | `string` | yes | Human-readable status (e.g. `"Subtask: refactor renderer"`) |

```json
{
  "type": "subagentToolStart",
  "id": 1,
  "parentToolId": "toolu_01PARENT",
  "toolId": "hook-sub-explorer-1716835000000",
  "status": "Subtask: explorer"
}
```

**Emitted from:** `server/src/hookEventHandler.ts:526-532` (`handleSubagentStart` for within-turn subagents); transcriptParser when an `agent_progress` record with a sub-agent `tool_use` arrives.

### `subagentToolDone`

Schema: `core/asyncapi.yaml:333-346`, TS: `core/src/messages.ts:142-147`.

A sub-agent finished a tool.

| Field | Type | Required | Description |
|---|---|---|---|
| `type` | `'subagentToolDone'` | yes | Discriminator |
| `id` | `integer` | yes | Parent agent ID |
| `parentToolId` | `string` | yes | Parent tool ID |
| `toolId` | `string` | yes | Sub-agent's tool ID being completed |

```json
{
  "type": "subagentToolDone",
  "id": 1,
  "parentToolId": "toolu_01PARENT",
  "toolId": "hook-sub-explorer-1716835000000"
}
```

**Emitted from:** transcriptParser when a sub-agent's `tool_result` record arrives.

### `subagentClear`

Schema: `core/asyncapi.yaml:348-359`, TS: `core/src/messages.ts:149-153`.

A sub-agent task completed. The child character is removed from the office.

| Field | Type | Required | Description |
|---|---|---|---|
| `type` | `'subagentClear'` | yes | Discriminator |
| `id` | `integer` | yes | Parent agent ID |
| `parentToolId` | `string` | yes | Parent tool ID being cleared |

```json
{
  "type": "subagentClear",
  "id": 1,
  "parentToolId": "toolu_01PARENT"
}
```

**Emitted from:** `server/src/hookEventHandler.ts:579-583` (`handleSubagentStop`), transcriptParser at `Task` `tool_result`.

### `subagentToolPermission`

Schema: `core/asyncapi.yaml:361-372`, TS: `core/src/messages.ts:155-159`.

Permission prompt for a sub-agent's tool. UI renders the permission bubble on the child character.

| Field | Type | Required | Description |
|---|---|---|---|
| `type` | `'subagentToolPermission'` | yes | Discriminator |
| `id` | `integer` | yes | Parent agent ID |
| `parentToolId` | `string` | yes | Parent tool ID owning the sub-agent |

```json
{
  "type": "subagentToolPermission",
  "id": 1,
  "parentToolId": "toolu_01PARENT"
}
```

**Emitted from:** `server/src/hookEventHandler.ts:607-613` (the loop after `agentToolPermission`); `server/src/timerManager.ts:138-144` (heuristic mode).

---

## Agent Teams (2)

These messages are only emitted when the active `HookProvider` declares `team` (`core/src/provider.ts:127`). With Claude that's the [`claudeTeamProvider`](../teamprovider).

### `agentTeamInfo`

Schema: `core/asyncapi.yaml:374-393`, TS: `core/src/messages.ts:161-169`.

Agent Teams metadata for an agent (lead, teammate, tmux usage).

| Field | Type | Required | Description |
|---|---|---|---|
| `type` | `'agentTeamInfo'` | yes | Discriminator |
| `id` | `integer` | yes | Agent ID this metadata describes |
| `teamName` | `string` | no | Team name |
| `agentName` | `string` | no | Teammate's role name (undefined for leads) |
| `isTeamLead` | `boolean` | no | True if this agent is the team lead |
| `leadAgentId` | `integer` | no | Lead agent's ID (for teammates) |
| `teamUsesTmux` | `boolean` | no | True when the lead spawns teammates via tmux (`Agent` + `run_in_background`) |

```json
{
  "type": "agentTeamInfo",
  "id": 5,
  "teamName": "refactor-squad",
  "agentName": "reviewer",
  "isTeamLead": false,
  "leadAgentId": 1,
  "teamUsesTmux": true
}
```

**Emitted from:** the file watcher / transcriptParser when team metadata is observed in a JSONL record (via `TeamProvider.extractTeamMetadataFromRecord`).

### `agentTokenUsage`

Schema: `core/asyncapi.yaml:395-408`, TS: `core/src/messages.ts:171-176`.

Cumulative token usage for the agent's session. Re-emitted whenever the totals advance.

| Field | Type | Required | Description |
|---|---|---|---|
| `type` | `'agentTokenUsage'` | yes | Discriminator |
| `id` | `integer` | yes | Agent ID |
| `inputTokens` | `integer` | yes | Cumulative input tokens |
| `outputTokens` | `integer` | yes | Cumulative output tokens |

```json
{
  "type": "agentTokenUsage",
  "id": 1,
  "inputTokens": 142_338,
  "outputTokens": 9_104
}
```

**Emitted from:** transcriptParser when token usage fields are seen on `system`/`assistant` records. Mirrors `AgentState.inputTokens` / `outputTokens` (`server/src/types.ts:51-52`).

---

## Layout (1)

### `layoutLoaded`

Schema: `core/asyncapi.yaml:410-430`, TS: `core/src/messages.ts:178-182`.

Office layout (tiles, furniture, colors). `layout` is `null` when no layout file or bundled default exists. `wasReset` is `true` when the bundled default replaced an outdated user layout.

| Field | Type | Required | Description |
|---|---|---|---|
| `type` | `'layoutLoaded'` | yes | Discriminator |
| `layout` | `object \| null` | yes | Opaque `OfficeLayout` object (`cols`, `rows`, `tiles`, `furniture`, `tileColors`). See [schemas.md](./schemas#officelayout). |
| `wasReset` | `boolean` | no | True if the bundled default replaced an outdated user layout |

The protocol intentionally does **not** model the layout shape - it's owned by the rendering layer. See `core/src/schemas.ts:63-70` for the `OfficeLayout` interface.

```json
{
  "type": "layoutLoaded",
  "layout": {
    "version": 1,
    "cols": 20,
    "rows": 11,
    "tiles": [0, 0, 1, 1, 0, 0, ...],
    "furniture": [
      { "type": "DESK_FRONT", "uid": "u_001", "col": 3, "row": 5 }
    ],
    "tileColors": []
  }
}
```

**Emitted from:** `server/src/clientMessageHandler.ts:163-165` on every `webviewReady`, and from the layout file watcher when an external write is detected (`server/src/layoutPersistence.ts`).

---

## Assets (4)

Loaded once at server startup and cached in memory (`AssetCache` in `server/src/clientMessageHandler.ts:14-20`). Sent to each connecting client on `webviewReady`.

### `furnitureAssetsLoaded`

Schema: `core/asyncapi.yaml:432-452`, TS: `core/src/messages.ts:184-188`.

Furniture catalog and sprite data.

| Field | Type | Required | Description |
|---|---|---|---|
| `type` | `'furnitureAssetsLoaded'` | yes | Discriminator |
| `catalog` | [`FurnitureAssetMessage[]`](./schemas#furnitureassetmessage) | yes | Catalog entries (one per furniture asset) |
| `sprites` | `Record<string, string[][]>` | yes | Map of asset ID to 2D hex sprite array |

```json
{
  "type": "furnitureAssetsLoaded",
  "catalog": [
    {
      "id": "DESK_FRONT",
      "name": "Desk",
      "label": "Desk (front)",
      "category": "desks",
      "file": "desk_front.png",
      "width": 32,
      "height": 32,
      "footprintW": 2,
      "footprintH": 1,
      "isDesk": true,
      "canPlaceOnWalls": false,
      "orientation": "front"
    }
  ],
  "sprites": {
    "DESK_FRONT": [["#4a3622", "#4a3622"], ["#3a2916", "#3a2916"]]
  }
}
```

**Emitted from:** `server/src/clientMessageHandler.ts:154-160`.

### `characterSpritesLoaded`

Schema: `core/asyncapi.yaml:454-465`, TS: `core/src/messages.ts:213-216`.

Pre-colored character sprite sets (6 palettes), sent once at startup.

| Field | Type | Required | Description |
|---|---|---|---|
| `type` | `'characterSpritesLoaded'` | yes | Discriminator |
| `characters` | [`CharacterSpriteSet[]`](./schemas#characterspriteset) | yes | One entry per palette (currently 6) |

```json
{
  "type": "characterSpritesLoaded",
  "characters": [
    { "down": [[[ "" ]]], "up": [[[ "" ]]], "right": [[[ "" ]]] }
  ]
}
```

The arrays are 3D - `frames[i][row][col]` is a hex string (`'' = transparent`). See [`CharacterSpriteSet`](./schemas#characterspriteset).

**Emitted from:** `server/src/clientMessageHandler.ts:145-147`.

### `floorTilesLoaded`

Schema: `core/asyncapi.yaml:467-483`, TS: `core/src/messages.ts:224-227`.

Floor tile sprites (one entry per pattern; 9 in the bundled set).

| Field | Type | Required | Description |
|---|---|---|---|
| `type` | `'floorTilesLoaded'` | yes | Discriminator |
| `sprites` | `string[][][]` | yes | Array of 2D hex string arrays (one per pattern) |

```json
{
  "type": "floorTilesLoaded",
  "sprites": [
    [["#7f7f7f", "#7f7f7f"], ["#7f7f7f", "#7f7f7f"]]
  ]
}
```

**Emitted from:** `server/src/clientMessageHandler.ts:148-150`.

### `wallTilesLoaded`

Schema: `core/asyncapi.yaml:485-503`, TS: `core/src/messages.ts:229-232`.

Wall auto-tile sprite sets. The outer array indexes the tile set; the next level indexes one of 16 bitmask pieces (N=1, E=2, S=4, W=8); the inner two are the 2D hex sprite.

| Field | Type | Required | Description |
|---|---|---|---|
| `type` | `'wallTilesLoaded'` | yes | Discriminator |
| `sets` | `string[][][][]` | yes | `sets[setIdx][bitmask][row][col]` |

```json
{
  "type": "wallTilesLoaded",
  "sets": [
    [
      [["#888"]],
      [["#888"]]
    ]
  ]
}
```

**Emitted from:** `server/src/clientMessageHandler.ts:151-153`.

---

## Settings & config (3)

### `settingsLoaded`

Schema: `core/asyncapi.yaml:505-539`, TS: `core/src/messages.ts:234-244`.

All persisted user-level settings, sent once on connect.

| Field | Type | Required | Description |
|---|---|---|---|
| `type` | `'settingsLoaded'` | yes | Discriminator |
| `soundEnabled` | `boolean` | yes | Notification sound toggle |
| `lastSeenVersion` | `string` | yes | Last extension version the user saw (for changelog modal) |
| `extensionVersion` | `string` | yes | Current extension/server version |
| `watchAllSessions` | `boolean` | yes | "Watch All Sessions" toggle (adopts sessions from any workspace) |
| `alwaysShowLabels` | `boolean` | yes | Always-on character labels |
| `hooksEnabled` | `boolean` | yes | Whether hook scripts are installed |
| `hooksInfoShown` | `boolean` | yes | Whether the hooks info modal has been dismissed |
| `externalAssetDirectories` | `string[]` | yes | Paths to external asset pack directories |

```json
{
  "type": "settingsLoaded",
  "soundEnabled": true,
  "lastSeenVersion": "1.2.0",
  "extensionVersion": "1.2.1",
  "watchAllSessions": false,
  "alwaysShowLabels": false,
  "hooksEnabled": true,
  "hooksInfoShown": true,
  "externalAssetDirectories": ["/Users/alice/asset-pack"]
}
```

**Emitted from:** `server/src/clientMessageHandler.ts:171-181`.

### `externalAssetDirectoriesUpdated`

Schema: `core/asyncapi.yaml:541-552`, TS: `core/src/messages.ts:246-249`.

External asset directory list changed (after add/remove).

| Field | Type | Required | Description |
|---|---|---|---|
| `type` | `'externalAssetDirectoriesUpdated'` | yes | Discriminator |
| `dirs` | `string[]` | yes | Full updated list of paths |

```json
{
  "type": "externalAssetDirectoriesUpdated",
  "dirs": ["/Users/alice/asset-pack", "/Users/alice/donargs"]
}
```

**Emitted from:** `server/src/clientMessageHandler.ts:111` and `server/src/clientMessageHandler.ts:121` (after writing the new config).

### `workspaceFolders`

Schema: `core/asyncapi.yaml:554-565`, TS: `core/src/messages.ts:251-254`.

Multi-root workspace folders (VS Code only). Lets the UI offer a folder picker on `launchAgent`.

| Field | Type | Required | Description |
|---|---|---|---|
| `type` | `'workspaceFolders'` | yes | Discriminator |
| `folders` | [`WorkspaceFolder[]`](./schemas#workspacefolder) | yes | One entry per workspace folder |

```json
{
  "type": "workspaceFolders",
  "folders": [
    { "name": "frontend", "path": "/Users/alice/proj/frontend" },
    { "name": "backend", "path": "/Users/alice/proj/backend" }
  ]
}
```

**Emitted from:** the VS Code adapter on workspace folder change (`vscode.workspace.onDidChangeWorkspaceFolders`). Standalone never emits this.

---

## Diagnostics (1)

### `agentDiagnostics`

Schema: `core/asyncapi.yaml:567-579`, TS: `core/src/messages.ts:261-264`.

Connection diagnostics for all agents (response to [`requestDiagnostics`](./client-messages#requestdiagnostics)). Per-agent shape is opaque to the protocol - the server fills in whatever fields are useful for debugging (jsonl path, mtime, hookDelivered, lines processed, etc.).

| Field | Type | Required | Description |
|---|---|---|---|
| `type` | `'agentDiagnostics'` | yes | Discriminator |
| `agents` | `Record<string, any>[]` | yes | Per-agent diagnostic info |

```json
{
  "type": "agentDiagnostics",
  "agents": [
    {
      "id": 1,
      "sessionId": "01HXYZ...",
      "jsonlFile": "/Users/alice/.claude/projects/.../01HXYZ.jsonl",
      "fileOffset": 192034,
      "linesProcessed": 412,
      "hookDelivered": true,
      "isWaiting": false,
      "lastDataAt": 1716835000000
    }
  ]
}
```

**Emitted from:** `requestDiagnostics` handler (typically writes a one-shot snapshot per connected client).

---

## See also

- [client-messages.md](./client-messages) - the inverse direction
- [schemas.md](./schemas) - supporting (non-discriminated) schemas referenced above
- [agent-events.md](./agent-events) - the internal contract that produces these messages
- [../hookprovider.md](../hookprovider) - `formatToolStatus`, `readingTools`, `subagentToolNames`
- [../state-management.md](../state-management) - `AgentStateStore.broadcast`, `HookEventHandler` dispatch
- [../hooks-coverage.md](../hooks-coverage) - per-hook-event mapping table
- [../errors.md](../errors) - error codes
