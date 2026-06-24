---
sidebar_position: 4
---

# Protocol Schemas

Supporting (non-discriminated) schemas referenced by the [`ServerMessage`](./server-messages) and [`ClientMessage`](./client-messages) variants. These are not messages themselves - they live as nested types inside messages.

Some shapes (notably `OfficeLayout`, `PlacedFurniture`, `FloorColor`, `FurnitureCatalogEntry`, `HookEvent`, `PersistedAgent`) are owned by the rendering / state layers and the protocol treats them as opaque objects. The authoritative definitions live in `core/src/schemas.ts`; this page links them by line number.

---

## ProviderCapabilities

The full message - discriminated, but listed here for completeness as it's effectively a capabilities envelope.

Schema: `core/asyncapi.yaml:141-161`, TS: `core/src/messages.ts:58-62`. Full reference in [server-messages.md](./server-messages#providercapabilities).

```ts
export interface ProviderCapabilities {
  type: 'providerCapabilities';
  readingTools: string[];
  subagentToolNames: string[];
}
```

`readingTools` is sourced from [`HookProvider.readingTools`](../hookprovider#readingtools) and `subagentToolNames` from [`HookProvider.subagentToolNames`](../hookprovider#subagenttoolnames). For Claude these are:

```ts
readingTools: new Set(['Read', 'Grep', 'Glob', 'WebFetch', 'WebSearch']),
subagentToolNames: new Set(['Task', 'Agent']),
```

`server/src/providers/hook/claude/claude.ts:269-270`

---

## ExistingAgents

The full message. Full reference in [server-messages.md](./server-messages#existingagents).

```ts
export interface ExistingAgents {
  type: 'existingAgents';
  agents: number[];
  agentMeta: Record<string, AgentSeatMeta>;
  folderNames: Record<string, string>;
  externalAgents: Record<string, boolean>;
}
```

`core/src/messages.ts:81-87`

Keys in `agentMeta`, `folderNames`, `externalAgents` are agent IDs stringified.

---

## AgentSeatMeta

Schema: `core/asyncapi.yaml:770-783`, TS: `core/src/messages.ts:89-93`.

Seat metadata associated with an agent. Used inside `ExistingAgents.agentMeta`. All fields are optional because some agents may not have a seat assignment yet.

```ts
export interface AgentSeatMeta {
  palette?: number;
  hueShift?: number;
  seatId?: string;
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `palette` | `integer` | no | Palette index (0–5; one of the 6 pre-colored character PNGs) |
| `hueShift` | `integer` | no | Additional hue rotation in degrees (45–315) applied on top of the palette for agents past the first 6 |
| `seatId` | `string` | no | Stable seat identifier (chair UID + sub-tile index, e.g. `"u_004:0"`) |

```json
{ "palette": 3, "hueShift": 45, "seatId": "u_004:0" }
```

Note the asymmetry with [`SeatAssignment`](#seatassignment) used on the client→server side: that message requires all three fields, with `seatId` allowed to be `null` for explicitly unseated agents.

---

## SeatAssignment

Schema: `core/asyncapi.yaml:785-798`, TS: `core/src/messages.ts:291-295`.

Required seat assignment payload sent inside [`saveAgentSeats`](./client-messages#saveagentseats).

```ts
export interface SeatAssignment {
  palette: number;
  hueShift: number;
  seatId: string | null;
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `palette` | `integer` | yes | Palette index (0–5) |
| `hueShift` | `integer` | yes | Hue rotation degrees |
| `seatId` | `string \| null` | yes | Seat identifier, or `null` when the agent is unseated (left their chair) |

```json
{ "palette": 0, "hueShift": 0, "seatId": "u_004:0" }
```

```json
{ "palette": 2, "hueShift": 90, "seatId": null }
```

---

## WorkspaceFolder

Schema: `core/asyncapi.yaml:800-808`, TS: `core/src/messages.ts:256-259`.

One entry in [`workspaceFolders.folders`](./server-messages#workspacefolders).

```ts
export interface WorkspaceFolder {
  name: string;
  path: string;
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | `string` | yes | Display name of the workspace folder |
| `path` | `string` | yes | Absolute path to the folder |

```json
{ "name": "frontend", "path": "/Users/alice/proj/frontend" }
```

---

## CharacterSpriteSet

Schema: `core/asyncapi.yaml:810-841`, TS: `core/src/messages.ts:218-222`.

One palette's character sprites as 3D hex-string arrays (`frames × rows × pixels`). Three direction sets per palette: `down`, `up`, `right`. The left-facing direction is rendered as a horizontally-flipped `right` at runtime, not stored separately.

```ts
export interface CharacterSpriteSet {
  down: string[][][];
  up: string[][][];
  right: string[][][];
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `down` | `string[][][]` | yes | Frames for the down-facing direction |
| `up` | `string[][][]` | yes | Frames for the up-facing direction |
| `right` | `string[][][]` | yes | Frames for the right-facing direction (mirrored at runtime for left) |

Each frame is a 2D array indexed `[row][col]`. `''` means transparent, `'#RRGGBB'` is opaque, `'#RRGGBBAA'` is semi-transparent. Standard sheet from `assets/characters/char_<n>.png` is 7 frames × 24 px tall × 16 px wide: walk1, walk2, walk3, type1, type2, read1, read2.

```json
{
  "down": [
    [["", "#ff8b3b", ""], ["#ff8b3b", "#ff8b3b", "#ff8b3b"]]
  ],
  "up": [],
  "right": []
}
```

---

## FurnitureAssetMessage

Schema: `core/asyncapi.yaml:843-899`, TS: `core/src/messages.ts:190-211`.

One entry in [`furnitureAssetsLoaded.catalog`](./server-messages#furnitureassetsloaded). The protocol type combines the catalog metadata with the source PNG dimensions; the runtime ([`FurnitureCatalogEntry`](#furniturecatalogentry)) drops the PNG-specific fields once sprites are loaded.

```ts
export interface FurnitureAssetMessage {
  id: string;
  name: string;
  label: string;
  category: string;
  file: string;
  width: number;
  height: number;
  footprintW: number;
  footprintH: number;
  isDesk: boolean;
  canPlaceOnWalls: boolean;
  groupId?: string;
  canPlaceOnSurfaces?: boolean;
  backgroundTiles?: number;
  orientation?: string;
  state?: string;
  mirrorSide?: boolean;
  rotationScheme?: string;
  animationGroup?: string;
  frame?: number;
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `string` | yes | Unique asset ID (e.g. `"DESK_FRONT"`, `"MONITOR_FRONT_OFF"`) |
| `name` | `string` | yes | Short name |
| `label` | `string` | yes | Human-readable label for editor UI |
| `category` | `string` | yes | One of: `desks`, `chairs`, `storage`, `electronics`, `decor`, `wall`, `misc` |
| `file` | `string` | yes | Source PNG filename |
| `width` | `integer` | yes | Sprite width in pixels |
| `height` | `integer` | yes | Sprite height in pixels |
| `footprintW` | `integer` | yes | Footprint width in tiles |
| `footprintH` | `integer` | yes | Footprint height in tiles |
| `isDesk` | `boolean` | yes | True if other surface items can be placed on top |
| `canPlaceOnWalls` | `boolean` | yes | True for paintings, clocks, windows |
| `groupId` | `string` | no | Rotation group ID - items sharing this cycle via the rotate button |
| `canPlaceOnSurfaces` | `boolean` | no | True for laptops, mugs that overlap `isDesk` furniture |
| `backgroundTiles` | `integer` | no | Top N rows of the footprint that are walkable and stack-permeable |
| `orientation` | `string` | no | `front` / `back` / `left` / `right` - used for chair facing and z-sort |
| `state` | `string` | no | `on` / `off` - paired by `groupId + orientation` for toggleable electronics |
| `mirrorSide` | `boolean` | no | True when the left-orientation sprite is a flip of the right one |
| `rotationScheme` | `string` | no | Future: alternate rotation cycle semantics |
| `animationGroup` | `string` | no | Future: ties together animated frames of a furniture item |
| `frame` | `integer` | no | Frame index within an animation group |

```json
{
  "id": "MONITOR_FRONT_OFF",
  "name": "Monitor",
  "label": "Monitor",
  "category": "electronics",
  "file": "monitor_front_off.png",
  "width": 16,
  "height": 24,
  "footprintW": 1,
  "footprintH": 1,
  "isDesk": false,
  "canPlaceOnWalls": false,
  "groupId": "monitor_front",
  "canPlaceOnSurfaces": true,
  "orientation": "front",
  "state": "off"
}
```

---

## OfficeLayout

Owned by the rendering layer; the protocol treats it as opaque (`core/asyncapi.yaml:421-428`):

> `Opaque layout object (cols, rows, tiles, furniture, tileColors). Format defined by the OfficeLayout schema in webview-ui; not modeled here because it's owned by the rendering layer.`

The actual TypeScript shape lives in `core/src/schemas.ts:63-70`:

```ts
export interface OfficeLayout {
  version: number;
  cols: number;
  rows: number;
  tiles: number[];
  furniture: PlacedFurniture[];
  tileColors?: FloorColor[];
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `version` | `number` | yes | Schema version; currently `1` |
| `cols` | `number` | yes | Grid width in tiles |
| `rows` | `number` | yes | Grid height in tiles |
| `tiles` | `number[]` | yes | Flat row-major array of [`TileType`](#tiletype-values) ints (length `cols * rows`) |
| `furniture` | `PlacedFurniture[]` | yes | Placed furniture instances |
| `tileColors` | `FloorColor[]` | no | Optional per-tile floor color overrides |

```json
{
  "version": 1,
  "cols": 20,
  "rows": 11,
  "tiles": [0, 0, 1, 1, 0, ...],
  "furniture": [
    { "type": "DESK_FRONT", "uid": "u_001", "col": 3, "row": 5 }
  ],
  "tileColors": []
}
```

### TileType values

Defined in `webview-ui/src/office/types.ts` (not in core). The integer values appear in `OfficeLayout.tiles`. Refer to the webview source for the authoritative list.

---

## PlacedFurniture

Schema: `core/src/schemas.ts:43-49`.

A placed furniture item in the layout.

```ts
export interface PlacedFurniture {
  type: string;
  uid: string;
  col: number;
  row: number;
  color?: ColorValue;
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `type` | `string` | yes | [`FurnitureCatalogEntry.id`](#furniturecatalogentry) referencing the catalog |
| `uid` | `string` | yes | Unique instance ID inside this layout |
| `col` | `number` | yes | Top-left column position (in tiles) |
| `row` | `number` | yes | Top-left row position; may be **negative** for wall-placed items |
| `color` | [`ColorValue`](#colorvalue) | no | Optional per-item color override |

```json
{
  "type": "MONITOR_FRONT_OFF",
  "uid": "u_017",
  "col": 4,
  "row": 5,
  "color": { "h": 200, "s": 0, "b": 0, "c": 0 }
}
```

---

## ColorValue

Schema: `core/src/schemas.ts:34-40`.

HSBC color value for floor/wall/furniture colorization.

```ts
export interface ColorValue {
  h: number;
  s: number;
  b: number;
  c: number;
  colorize?: boolean;
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `h` | `number` | yes | Hue (Colorize: target HSL hue 0–360; Adjust: hue rotation ±180) |
| `s` | `number` | yes | Saturation (Colorize: target 0–100; Adjust: shift ±100) |
| `b` | `number` | yes | Brightness/Lightness |
| `c` | `number` | yes | Contrast |
| `colorize` | `boolean` | no | True selects Colorize mode (Photoshop-style); false/absent selects Adjust mode |

See `webview-ui/src/office/colorize.ts` for the two modes. Floor tiles are always Colorize. Furniture and characters default to Adjust.

```json
{ "h": 200, "s": 80, "b": 50, "c": 0, "colorize": true }
```

---

## FloorColor

Schema: `core/src/schemas.ts:52-60`.

Per-tile floor color override.

```ts
export interface FloorColor {
  tileIndex: number;
  pattern: number;
  h: number;
  s: number;
  b: number;
  c: number;
  colorize?: boolean;
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `tileIndex` | `number` | yes | Index into the flat `tiles` array (`row * cols + col`) |
| `pattern` | `number` | yes | Floor pattern index. Values 1–9 correspond to `TileType.FLOOR_1` through `TileType.FLOOR_9`; 0 is the solid fallback. |
| `h`, `s`, `b`, `c` | `number` | yes | HSBC values |
| `colorize` | `boolean` | no | Mode flag (almost always `true` for floors) |

```json
{
  "tileIndex": 134,
  "pattern": 2,
  "h": 30,
  "s": 60,
  "b": 50,
  "c": 0,
  "colorize": true
}
```

---

## FurnitureCatalogEntry

Schema: `core/src/schemas.ts:78-96`.

Runtime form of [`FurnitureAssetMessage`](#furnitureassetmessage) - same as the protocol version minus the source PNG fields (`file`, `width`, `height`). Used by the editor and renderer after assets are decoded.

```ts
export interface FurnitureCatalogEntry {
  id: string;
  name: string;
  label: string;
  category: string;
  footprintW: number;
  footprintH: number;
  isDesk: boolean;
  canPlaceOnWalls: boolean;
  groupId?: string;
  canPlaceOnSurfaces?: boolean;
  backgroundTiles?: number;
  orientation?: string;
  state?: string;
  mirrorSide?: boolean;
  rotationScheme?: string;
  animationGroup?: string;
  frame?: number;
}
```

See the field table under [FurnitureAssetMessage](#furnitureassetmessage) - only `file`, `width`, `height` are dropped.

---

## HookEvent

Schema: `core/src/schemas.ts:101-105`.

Raw hook event received from any provider's hook script via the HTTP server (`POST /api/hooks/:providerId`). This is the unnormalized payload - see [agent-events.md](./agent-events) for the normalized `AgentEvent` produced by `HookProvider.normalizeHookEvent`.

```ts
export interface HookEvent {
  hook_event_name: string;
  session_id: string;
  [key: string]: unknown;
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `hook_event_name` | `string` | yes | CLI-specific hook name (e.g. `PreToolUse`, `SessionStart`, `Notification`) |
| `session_id` | `string` | yes | CLI session identifier; for Claude this matches the JSONL filename |
| `*` | `unknown` | no | Any other provider-specific fields (e.g. `tool_name`, `tool_input`, `agent_type`, `notification_type`, `transcript_path`, `cwd`, `reason`) |

Both `session_id` and `hook_event_name` are required - events missing either are silently dropped at the HTTP layer (`server/src/httpServer.ts:123-125`). See [errors.md](../errors).

```json
{
  "hook_event_name": "PreToolUse",
  "session_id": "01HXYZABC123",
  "tool_name": "Read",
  "tool_input": { "file_path": "/path/to/server.ts" },
  "transcript_path": "/Users/alice/.claude/projects/.../01HXYZABC123.jsonl",
  "cwd": "/Users/alice/proj"
}
```

The body limit on the hook endpoint is **64 KB** (`MAX_HOOK_BODY_SIZE = 65_536` in `server/src/constants.ts:55`). Bodies above this size are rejected by Fastify before they reach the handler.

---

## PersistedAgent

Schema: `core/src/schemas.ts:9-22`.

Persisted agent data (survives F5 reload / restart). Stored by [`StateAdapter.saveAgents`](../state-management#filestateadapter) into the namespaced state file (e.g. `~/.pixel-agents/vscode-state.json` or `~/.pixel-agents/standalone-state.json`).

```ts
export interface PersistedAgent {
  id: number;
  sessionId?: string;
  terminalName: string;
  isExternal?: boolean;
  jsonlFile: string;
  projectDir: string;
  folderName?: string;
  teamName?: string;
  agentName?: string;
  isTeamLead?: boolean;
  leadAgentId?: number;
  teamUsesTmux?: boolean;
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `number` | yes | Agent ID (positive integer) |
| `sessionId` | `string` | no | CLI session ID (Claude: the JSONL UUID) |
| `terminalName` | `string` | yes | Terminal display name (empty string for non-terminal agents) |
| `isExternal` | `boolean` | no | True for adopted external sessions |
| `jsonlFile` | `string` | yes | Absolute path to the session transcript |
| `projectDir` | `string` | yes | Absolute path to the project directory |
| `folderName` | `string` | no | Workspace folder name (multi-root only) |
| `teamName` | `string` | no | Agent Teams: team name |
| `agentName` | `string` | no | Agent Teams: teammate role name (undefined for lead) |
| `isTeamLead` | `boolean` | no | Agent Teams: lead flag |
| `leadAgentId` | `number` | no | Agent Teams: lead's agent ID (for teammates) |
| `teamUsesTmux` | `boolean` | no | True when the lead spawns teammates via tmux |

```json
{
  "id": 1,
  "sessionId": "01HXYZABC123",
  "terminalName": "Claude 1",
  "jsonlFile": "/Users/alice/.claude/projects/-Users-alice-proj/01HXYZABC123.jsonl",
  "projectDir": "/Users/alice/.claude/projects/-Users-alice-proj",
  "folderName": "frontend"
}
```

---

## See also

- [overview.md](./overview) - channel, transport, top-level union counts
- [server-messages.md](./server-messages) - every server-emitted message
- [client-messages.md](./client-messages) - every client-emitted command
- [agent-events.md](./agent-events) - the normalized internal event union
- [../hookprovider.md](../hookprovider) - provider interface, including `normalizeHookEvent`
- [../state-management.md](../state-management) - where these schemas are persisted
