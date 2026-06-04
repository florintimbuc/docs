---
sidebar_position: 2
---

# Concepts

The vocabulary used across these docs. If a term is used in multiple pages without re-definition, it lives here.

For the quick-lookup version, see the [glossary](/reference/glossary). This page explains each term in context.

## Terminal

A shell process running an AI CLI. In VS Code this is a `vscode.Terminal` opened by the extension; in standalone mode it's any terminal in any application you opened yourself.

The runtime needs terminals only for two reasons:

- **Spawning agents** from the "+ Agent" button (VS Code only).
- **Matching unknown JSONL files** to focused terminals during heuristic adoption.

Terminals are wrapped by [`ITerminalAdapter`](/reference/teamprovider) so the runtime doesn't import VS Code or any host-specific terminal API directly.

## Session

A single conversation with an AI CLI. Each session has a unique ID (a UUID for Claude). Each session has a transcript file under `~/.claude/projects/<workspace-hash>/<session-id>.jsonl`.

Sessions can be ended by exiting the CLI, cleared by typing `/clear` (which creates a new session in the same terminal), or resumed by re-running with `--resume`.

Pixel Agents tracks one session per agent. When a session is cleared, the agent is reassigned to the new transcript without despawning.

## Transcript

The JSONL file that records every record of a session. Each line is a JSON object with a `type` (`assistant`, `user`, `system`, `progress`, etc.) and supporting fields.

The transcript is the source of truth in heuristic mode (when hooks aren't installed). In hook mode the transcript is still appended to by the CLI, but the runtime gets its signals from hooks instead.

## Agent

A character in the office bound 1:1 to a session. Each agent has:

- A numeric `id` (positive for top-level agents, negative for ephemeral sub-agents).
- A `palette` (0-5) and a `hueShift` (degrees) that determine its visual identity.
- A `seatId` (where it sits when typing).
- Lifecycle state in `AgentState` (active tools, waiting status, hook-delivery flag, more).

Agents persist across reloads via `~/.pixel-agents/<namespace>-state.json`. Visual identity persists via the seat map.

## Sub-agent

A character spawned when an agent calls a within-turn subtask tool. For Claude this is the `Task` tool.

Sub-agents have negative IDs. They live only for the duration of the parent tool call. The character appears next to the parent and disappears when the Task completes.

Sub-agents inherit the parent's palette and hue shift so they're visually grouped.

## Teammate

A persistent agent spawned via a teammate-spawn tool. For Claude this is the `Agent` tool called with `run_in_background: true`.

Unlike sub-agents, teammates are full agents with their own session, their own transcript, and their own lifecycle. They show up as separate characters and stay alive across the lead's turns.

The distinction between sub-agent and teammate is the predicate `TeamProvider.isTeammateSpawnCall(toolName, toolInput)` from `core/src/teamProvider.ts:31`. The same `Agent` tool name can produce either kind depending on inputs.

See [Agent Teams](./agent-teams) for the full pattern.

## Lead

The originating agent of a team. The lead is the one that called `Agent(... run_in_background: true)` to spawn teammates. It owns the team's permission flow and the routed `Notification(permission_prompt)` hook events.

## Team

A named group consisting of one lead and zero or more teammates. Today only Claude's Agent Teams uses this concept; the underlying interface (`TeamProvider`) is opt-in via `HookProvider.team`.

## Seat

A chair in the office where a character sits when in the TYPE state. Seats are derived from chair furniture in the layout; multi-tile chairs (e.g. 2-tile couches) produce multiple seats.

Each agent gets assigned to a seat on first appearance via `pickDiversePalette` (in the engine) and a closest-free-seat heuristic. Reassignment is interactive: click character, click seat.

## Hook

A synchronous, structured event fired by the AI CLI on activity (tool start, tool end, turn end, permission request, etc.).

Pixel Agents uses Claude Code's Hooks API. When enabled, the CLI runs our script (`~/.pixel-agents/hooks/claude-hook.js`) on every event and our script POSTs to the local server. The result: instant, lossless activity detection.

Not all CLIs have hooks. The `HookProvider` interface supports both hook-only and hook-plus-file-fallback providers.

## Heuristic mode

The fallback when hooks aren't installed (or have failed). The runtime polls JSONL transcripts at 500ms intervals and uses timing heuristics (a 7-second permission timer, a 5-second text-idle timer) to infer state.

Heuristic mode works but is laggy and occasionally produces false positives. The `hookDelivered` flag per agent is the switch: when true, heuristic timers are suppressed for that agent.

See [Hooks vs heuristic](./hooks-vs-heuristic) for the full comparison.

## Provider

A `HookProvider` implementation that integrates one AI CLI. Today only `claude` ships. The provider knows how to normalize raw CLI events into the canonical `AgentEvent` shape, how to install/uninstall hook scripts, and how to format tool status strings for display.

See [HookProvider reference](/reference/hookprovider) for the interface, [Providers overview](/build/providers/overview) for adding one.

## Client

Anything that renders the office and speaks the protocol. Today: the VS Code webview and the standalone browser SPA. Both are "clients" in this sense; they consume `ServerMessage` broadcasts and send `ClientMessage` commands.

Third-party clients (mobile, TUI, custom embed) are first-class. The protocol is the contract.

See [Clients overview](/build/clients/overview).

## Adapter

A host integration. Today: `adapters/vscode/`. An adapter implements `StateAdapter` (for persistence) and `ITerminalAdapter` (for terminals), and bridges the host's UI to the embedded server.

The standalone CLI is intentionally not called an "adapter" because it isn't integrating into a host; it ships its own server.

See [Adapters overview](/build/adapters/overview).

## Transport

The wire layer between the runtime and a client. Two transports today:

- **PostMessage** - VS Code webview. The extension host bridges messages to/from the webview iframe.
- **WebSocket** - everything else. Connects to `ws://127.0.0.1:<port>/ws`.

The interface is `MessageTransport` at `core/src/transport.ts:10-17`. Clients code against the message shapes (`ServerMessage`, `ClientMessage`), not the transport.

## Hook script

The bundled JavaScript file at `~/.pixel-agents/hooks/claude-hook.js`. Built by esbuild from `server/src/providers/hook/claude/hooks/claude-hook.ts` into a single CJS file with no node_modules dependency.

It runs in Claude's process (Claude invokes it per the entries in `~/.claude/settings.json`), reads the event from stdin, and POSTs to our local server. Tiny, fast, no surprises.

## Embedded vs standalone

Two server modes:

- **Embedded** - running inside a host (VS Code extension). The host owns the WebView; the server uses an ephemeral port; WebSocket connections require Bearer authentication.
- **Standalone** - running as a top-level process (`npx pixel-agents`). The server serves a static SPA, binds to a known port (default 3100), and WebSocket connections need no auth (loopback boundary).

The same `server/` code runs in both. The mode is set via `embedded: true|false` at `server.start({...})`.

## Namespace

The string that disambiguates per-host state in `~/.pixel-agents/`. Today: `'vscode'` and `'standalone'`. Each host writes to `~/.pixel-agents/<namespace>-state.json` and to a per-namespace section of the shared `config.json`.

See [ADR-0005](/decisions/namespaced-persistence).

## Office, layout, tiles, furniture

- **Office** - the visual world. One office per host, shared via `~/.pixel-agents/layout.json`.
- **Layout** - the saved office data: tile types, floor colors, furniture placements.
- **Tile** - a 16x16 grid cell. Types: VOID (transparent), FLOOR, WALL.
- **Furniture** - placed items (desks, chairs, decor). Each has a catalog id, a position, an optional color.

The layout editor lets you paint, place, undo, expand the grid, and save. See [Layout editor](/use/vscode/layout-editor).

## Sprite, SpriteData

A 2D array of hex color strings (`'' = transparent, '#RRGGBB' = opaque, '#RRGGBBAA' = semi-transparent`). Type alias at `core/src/schemas.ts:75`.

All assets (characters, floor tiles, wall tiles, furniture) ship as PNGs and are parsed server-side via `pngjs` into SpriteData before being sent to clients.

## Palette and hue shift

A character has a `palette` (integer 0-5, indexing into the six pre-colored character PNG sets) and a `hueShift` (degrees, applied via HSL rotation at render time).

The first six agents get unique palettes via `pickDiversePalette`. Beyond six, palettes repeat with a random hue shift (45-315 degrees). This produces a diverse visual identity without needing 50 unique PNG sets.

## Bubble (speech bubble)

A small overlay above a character indicating special state:

- **Permission bubble** - amber "..." that appears when Claude is waiting for permission. Persists until resolved.
- **Waiting bubble** - green checkmark that appears when the agent is otherwise idle but waiting for user input. Auto-fades after 2 seconds.

Sprites for both live in `webview-ui/src/office/sprites/spriteData.ts`.

## Next

- [The office](./the-office) - the UI in detail.
- [Agent lifecycle](./agent-lifecycle) - what happens from spawn to despawn.
- [Architecture](./architecture) - the four packages.
- [Glossary](/reference/glossary) - quick-lookup version of this page.
