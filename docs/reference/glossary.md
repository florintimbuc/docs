---
sidebar_position: 12
---

# Glossary

:::warning[AI-generated docs]
This document was AI-generated and may have some mistakes - we apologize for this, we're in the process of reviewing all documents. If you find any issues, we'd be thankful if you [submit an edit PR](https://github.com/pixel-agents-hq/docs/edit/main/docs/reference/glossary.md).
:::

Quick-lookup definitions for terms used across these docs. Sorted alphabetically. For the longer-form explanations with context, see [Concepts](/learn/concepts).

## A

**Adapter** - Host integration layer. Implements `StateAdapter` and `ITerminalAdapter`. Today: `adapters/vscode/`. See [Adapters overview](/build/adapters/overview).

**Agent** - A character in the office, bound 1:1 to a session. Has a numeric `id`, a `palette`, a `hueShift`, and an optional `seatId`. See [Concepts > Agent](/learn/concepts#agent).

**`AgentEvent`** - The normalized provider-internal event shape (`core/src/provider.ts:14-56`). Kinds: `toolStart`, `toolEnd`, `turnEnd`, `subagentStart`, `subagentEnd`, `subagentTurnEnd`, `progress`, `permissionRequest`, `sessionStart`, `sessionEnd`. Never travels over the wire; producers normalize raw CLI events into this shape; the server translates to `ServerMessage` broadcasts.

**`AgentRuntime`** - The shared lifecycle core. Owns timer Maps, file watchers, `HookEventHandler`, `DismissalTracker`, `SessionRouter`, scanning state. See [State management reference](./state-management).

**`AgentState`** - The runtime state of one agent (`server/src/types.ts:3-61`). Contains session ID, JSONL path, active tool maps, `hookDelivered` flag, team metadata.

**`AgentStateStore`** - Map-compatible wrapper around `Map<number, AgentState>` with typed events (`agentAdded`, `agentRemoved`, `broadcast`). See `server/src/agentStateStore.ts:19-149`.

**Agent Teams** - Claude's feature for spawning persistent teammates. Implemented via `TeamProvider`. See [Agent Teams (Learn)](/learn/agent-teams).

**AsyncAPI** - The protocol specification format used for `core/asyncapi.yaml`. Pinned to 3.0.0. See [ADR-0002](/decisions/asyncapi-as-protocol-contract).

## B

**Bearer token** - Authentication credential carried in `Authorization: Bearer <token>` header. Required for hook POSTs (always) and WebSocket connections (embedded mode only).

**Bitmask** - The 4-bit auto-tile mask for walls: N=1, E=2, S=4, W=8. Sixteen possible values index into the 16 wall sprite pieces.

**Bundle** - The set of assets sent from server to client during the `webviewReady` handshake. Order: `providerCapabilities`, characters, floor, wall, furniture, layout, settings, existing agents.

## C

**Camera** - The viewport. Follows the selected agent unless manually panned. See [The office (concept) > Camera](/learn/the-office#camera).

**Catalog** - The furniture catalog: an array of `FurnitureCatalogEntry` items defining what each placeable item is.

**Character** - The visual sprite representing an agent. 16x32 pixels, six pre-colored palettes, hue-shifted at runtime.

**Claude / Claude Code** - The first supported AI CLI. Bundled provider at `server/src/providers/hook/claude/`.

**`ClientMessage`** - One of 18 discriminated union variants the client sends to the server. Discriminator: `type`. Catalog at [/reference/protocol/client-messages.md](./protocol/client-messages).

**`ColorValue`** - HSBC color (`{ h, s, b, c, colorize? }`). Used for floor tiles and furniture per-item color.

**Colorize mode** - Photoshop-style colorization: grayscale → luminance → fixed HSL. Default for floor tiles.

**`config.json`** - The shared persisted settings file at `~/.pixel-agents/config.json`. See [Config reference](./config).

## D

**Despawn** - The matrix-rain effect when a character leaves the office.

**`DismissalTracker`** - Four-bucket state tracker for JSONL file dismissals: dismissed, permanent, seeded, pending. See [State management reference](./state-management#dismissaltracker).

**Discriminator** - The `type` field that distinguishes variants of a `ServerMessage` or `ClientMessage` union.

## E

**Embedded mode** - The server running inside a host process (VS Code extension). Ephemeral port, WebSocket Bearer auth required. See [CLI reference](./cli#comparison-to-vs-code-embedded-mode).

**External agent** - An agent detected from a Claude session running outside the host's UI (e.g. you ran `claude` in a separate terminal). Marked with a visual indicator.

## F

**FileStateAdapter** - The bundled `StateAdapter` implementation. Persists to `~/.pixel-agents/<namespace>-state.json`. See `server/src/fileStateAdapter.ts:45-134`.

**Floor tiles** - 9 grayscale 16×16 patterns under `assets/floors/`, colorized per-tile via HSBC. See [Floors](/build/assets/floors).

**`FloorColor`** - Per-tile color carrier (`tileIndex`, `pattern`, `h`, `s`, `b`, `c`, `colorize?`).

**Footprint** - The grid space a furniture item occupies, in tiles (`footprintW` × `footprintH`).

**Furniture** - Placed items in the office: desks, chairs, electronics, decor, wall-mounted, misc. See [Furniture](/build/assets/furniture).

**`FurnitureCatalogEntry`** - Catalog metadata for one furniture asset (`core/src/schemas.ts:78-96`).

## H

**Heuristic mode** - The fallback detection mode when hooks aren't installed. Polls JSONL transcripts at 500ms with timer-based state inference. See [Hooks vs heuristic](/learn/hooks-vs-heuristic).

**Hook** - A synchronous event fired by Claude on session/tool activity. Pixel Agents installs a script that POSTs each event to its server.

**`hookDelivered`** - Per-agent flag set to `true` on the first successful hook event delivery. Suppresses heuristic timers for that agent.

**`HookEvent`** - Raw hook event payload (`core/src/schemas.ts:101-105`). Includes `hook_event_name`, `session_id`, plus provider-specific fields.

**`HookEventHandler`** - The class that dispatches incoming `AgentEvent`s to the right agent via session routing. See [State management reference](./state-management#hookeventhandler).

**`HookProvider`** - The interface a provider implements to integrate one CLI (`core/src/provider.ts:60-128`). See [HookProvider reference](./hookprovider).

**HSBC** - Hue, Saturation, Brightness, Contrast. The four colorization parameters for floors / walls / furniture.

**Hue shift** - HSL hue rotation (in degrees) applied to a character sprite at render time. Lets agents 7+ reuse palettes 0-5 with distinct colors.

## I

**`ITerminalAdapter`** - The interface adapters implement for terminal access (`core/src/terminalAdapter.ts:13-16`). See [Terminal adapter contract](/build/adapters/terminal-adapter).

## J

**JSONL** - JSON Lines: a file format where each line is a separate JSON record. Claude transcripts are JSONL.

## L

**Layout** - The persisted office data: tiles, furniture, colors. Stored at `~/.pixel-agents/layout.json`. See [Layout reference](./layout).

**Lead** - The originating agent of an Agent Team. Owns the team's permission flow.

**Loopback** - The 127.0.0.1 interface. The default bind address for the Pixel Agents server. The security boundary in standalone mode.

## M

**Matrix effect** - The green digital-rain animation when characters spawn or despawn.

**`MessageTransport`** - The abstract wire layer interface (`core/src/transport.ts:10-17`). Implementations: `PostMessageTransport`, `WebSocketTransport`.

**Multi-window** - Multiple Pixel Agents UIs (VS Code windows, browser tabs) connected to the same server.

## N

**Namespace** - The string that disambiguates per-host state. Today: `vscode` and `standalone`. See [ADR-0005](/decisions/namespaced-persistence).

**`normalizeHookEvent`** - The `HookProvider` method that translates a raw CLI hook event into an `AgentEvent`. The integration boundary for new providers.

## O

**Office** - The visual world. The pixel-art grid where characters live.

**`OfficeLayout`** - The data structure for a saved office (`core/src/schemas.ts:63-70`). Contains `version`, `cols`, `rows`, `tiles`, `furniture`, `tileColors?`.

## P

**Palette** - One of six pre-colored character PNG sets (indexed 0-5). Each agent gets a palette via the diverse-palette picker.

**Pattern** - A floor tile pattern. 9 grayscale patterns ship bundled (`floor_0.png` through `floor_8.png`); selected by `TileType.FLOOR_N`.

**Permission bubble** - The "..." bubble (white with amber dots) that appears above a character waiting for permission.

**`PersistedAgent`** - The serialized form of an agent saved to disk (`core/src/schemas.ts:8-22`).

**`PlacedFurniture`** - A single furniture instance in a layout (`core/src/schemas.ts:43-49`). Has `type` (catalog id), `uid`, `col`, `row`, optional `color`.

**`PostMessage`** - The VS Code webview message transport. Equivalent to WebSocket for the standalone case.

**Project hash** - The workspace path with `:`, `\`, `/` replaced by `-`. Used as a subdirectory under `~/.claude/projects/` to organize sessions per workspace.

**`protocolVersion`** - The `HookProvider` field declaring which `AgentEvent` shape version the provider speaks. Must match `HookEventHandler.SUPPORTED_PROTOCOL_VERSION` (today 1).

**Provider** - A `HookProvider` implementation integrating one AI CLI. Today only `claude`.

**`ProviderCapabilities`** - The first message sent on `webviewReady`. Tells the client which tools are reading-tools vs typing-tools and which spawn subagents.

## R

**Reading tool** - A tool classified by the provider as "read-like" (Read, Grep, Glob, WebFetch, WebSearch for Claude). The character plays the reading animation.

**`run_in_background`** - Claude `Agent` tool input flag distinguishing persistent teammates (true) from ephemeral subagents (false).

## S

**Seat** - A chair position where a character sits when in TYPE state. Derived from chair furniture. Multi-tile chairs produce multiple seats.

**`SeatAssignment`** - The protocol shape for persisting seat data: `palette`, `hueShift`, `seatId | null`.

**`server.json`** - The discovery file at `~/.pixel-agents/server.json`. Contains port, PID, token, startedAt. Atomic write, mode 0o600.

**Session** - One conversation with an AI CLI. Has a unique ID and a transcript file under `~/.claude/projects/<hash>/<session-id>.jsonl`.

**`SessionRouter`** - The class that owns sessionId→agentId mapping, pending external sessions, and event buffering. See [State management reference](./state-management#sessionrouter).

**`ServerMessage`** - One of 26 discriminated union variants the server broadcasts to clients. Discriminator: `type`. Catalog at [/reference/protocol/server-messages.md](./protocol/server-messages).

**`SpriteData`** - 2D array of hex color strings (`string[][]`). The universal sprite format. `''` = transparent, `'#RRGGBB'` = opaque, `'#RRGGBBAA'` = semi-transparent.

**Standalone mode** - The server running as a top-level process via `npx pixel-agents`. Serves a static SPA. WebSocket has no auth (loopback boundary).

**`StateAdapter`** - The interface adapters implement for persistence (`core/src/adapter.ts:15-28`). See [State adapter contract](/build/adapters/state-adapter).

**Subagent / sub-agent** - An ephemeral agent spawned by `Task` (or `Agent` without `run_in_background`). Has a negative ID. Despawns when the parent tool ends.

## T

**Task tool** - Claude's `Task` tool. Spawns an ephemeral sub-agent for a subtask within the parent's turn.

**Team** - A named group with one lead and zero or more teammates. Today only Claude's Agent Teams.

**Teammate** - A persistent agent spawned via `Agent(... run_in_background: true)`. Distinct from ephemeral sub-agents.

**`TeamProvider`** - Optional extension on `HookProvider` for CLIs supporting teams (`core/src/teamProvider.ts:13-66`). See [TeamProvider reference](./teamprovider).

**Terminal** - A shell process running an AI CLI. Wrapped by `ITerminalAdapter`.

**`TerminalHandle`** - The minimal terminal abstraction: just a `name` field.

**Tile** - A 16x16 grid cell. Types: VOID, FLOOR, WALL.

**`TileType`** - The integer enum-like values for tile types: `WALL=0`, `FLOOR_1=1` through `FLOOR_9=9` (pattern index), `VOID=255`. See [reference/layout > tiles](/reference/layout#tiles).

**Tool start / tool end / tool done** - The lifecycle of a Claude tool execution. Each fires an `AgentEvent` (or a heuristic-derived equivalent).

**Transcript** - The JSONL file recording a session's records. Located at `~/.claude/projects/<hash>/<session-id>.jsonl`.

**Transport** - The wire layer. WebSocket (standalone) or postMessage (VS Code).

**Turn** - One user prompt + agent response cycle. Ends with a `Stop` hook (or a `turn_duration` system record in JSONL) or a heuristic text-idle timeout.

## V

**VOID tile** - A transparent, non-walkable tile (`TileType.VOID = 255`). Used to create gaps in the office.

## W

**Waiting bubble** - The green checkmark indicator that appears when an agent is idle but expects input. Auto-fades after 2 seconds.

**Wall tiles** - The 16-piece auto-tile set in `assets/walls/wall_0.png` (and any optional alternates). Auto-tiled by 4-bit cardinal-neighbor bitmask.

**`watchAllSessions`** - The setting that expands the scanner to all of `~/.claude/projects/` rather than only the current workspace's project hash.

**Webview** - In VS Code, the iframe hosting the React canvas SPA. Equivalent to a browser tab in standalone mode.

**`webviewReady`** - The first `ClientMessage` sent after a client connects. Triggers the server to send the full initial state bundle.

**WebSocket** - The transport used for standalone clients. Loopback connection on the server port, path `/ws`.

## Z

**Z-sort** - The rendering ordering of sprites by Y coordinate (with adjustments) so that characters behind objects are visually hidden.

**Zoom** - The integer device-pixels-per-sprite-pixel multiplier (1-10). Default is `Math.round(2 * devicePixelRatio)`.

## Related

- [Concepts](/learn/concepts) - longer-form explanations.
- [State management reference](./state-management) - for the classes that implement most of these.
- [Schemas reference](./protocol/schemas) - for the data types.
- [HookProvider reference](./hookprovider), [TeamProvider reference](./teamprovider) - for the provider interfaces.
