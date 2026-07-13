---
sidebar_position: 2
---

# Concepts

The vocabulary used across these docs. If a term is used in multiple pages without re-definition, it lives here.

For the quick-lookup version, see the [glossary](/reference/glossary). This page explains each term in context.

## Agent

An AI coding assistant at work in a terminal, shown as a character in the office. Agents can have different skins (six distinct characters in the default app; beyond six, the characters repeat with shifted color hues - see [skin and hue shift](#skin-and-hue-shift)), each one gets a seat assigned, and Pixel Agents tracks what each one is doing - which tools are running, whether it's waiting for you - in an `AgentState` that drives the animations.

How agents bind to terminals and sessions depends on the surface:

- **In VS Code**, one agent corresponds to one terminal (except when "Watch all sessions" is enabled). The agent persists across new sessions within the same terminal: clear a session and the same character simply picks up the new one.
- **In standalone**, one agent corresponds to one session.

Agents persist across reloads via `~/.pixel-agents/<namespace>-state.json`; their look persists via the seat map.

## Sub-agent

A temporary character spawned when an agent delegates a subtask to a within-turn tool. For Claude Code this is the `Task` tool.

Sub-agents live only for the duration of the parent tool call. The character appears next to the parent and disappears when the subtask completes. Sub-agents inherit the parent's skin and hue shift so they're visually grouped.

## Team

A named group consisting of one lead and zero or more teammates. Today only Claude Code's Agent Teams uses this concept; the underlying interface (`TeamProvider`) is opt-in via `HookProvider.team`.

See [Agent teams](./agent-teams) for the full pattern.

## Teammate

A persistent agent spawned via a teammate-spawn tool (for Claude Code, the `Agent` tool called with `run_in_background: true`).

Unlike sub-agents, teammates are full agents with their own session, their own transcript, and their own lifecycle. They show up as separate characters, labelled by their role, and stay alive across the lead's turns.

The distinction between sub-agent and teammate is the predicate `TeamProvider.isTeammateSpawnCall(toolName, toolInput)` from `core/src/teamProvider.ts:31`. The same tool name can produce either kind depending on inputs.

## Lead

The originating agent of a team - the one that spawned the teammates. It owns the team's permission flow and the routed permission hook events.

## Seat

A chair in the office where a character sits when working. Seats are derived from chair furniture in the layout; multi-tile chairs (e.g. 2-tile couches) produce multiple seats.

Each agent is assigned a seat on first appearance via a closest-free-seat heuristic (biased by [areas](#area) when folders are mapped). Reassignment is interactive: click character, click seat.

## Transcript

The file that records everything that happens in a session. Each line is a JSON object with a `type` (`assistant`, `user`, `system`, `progress`, etc.) and supporting fields.

Transcripts are produced by the agent CLI itself - Pixel Agents never creates or writes them, it only reads them. For Claude Code they live under `~/.claude/projects/<workspace-hash>/<session-id>.jsonl`.

The transcript is the source of truth in heuristic mode (when hooks are disabled). In hook mode the transcript is still appended to by the CLI, but the runtime gets its signals from hooks instead.

## Session

A single conversation with an agent. Each session has a unique ID (a UUID for Claude Code) and produces its own [transcript](#transcript).

Sessions can be ended by exiting the CLI, cleared by typing `/clear` (which creates a new session in the same terminal), or resumed with `--resume`, `--continue`, or `/resume`.

## Terminal

A shell process running an agent CLI. In VS Code this is a `vscode.Terminal` opened by the extension; in standalone mode it's any terminal in any application you opened yourself.

The runtime uses terminals for two reasons:

- **Spawning agents** from the "+ Agent" button (VS Code only).
- **Matching unknown transcripts** to focused terminals during heuristic adoption.

Terminals are wrapped by [`ITerminalAdapter`](/build/adapters/terminal-adapter) so the runtime doesn't import VS Code or any host-specific terminal API directly.

## Heuristic mode

The fallback when hooks aren't installed (or have failed). The runtime polls transcripts at 500ms intervals and uses timing heuristics (a 7-second permission timer, a 5-second text-idle timer) to infer state.

Heuristic mode works but is laggy and occasionally produces false positives. The `hookDelivered` flag per agent is the switch: when true, heuristic timers are suppressed for that agent.

See [Hooks vs heuristic](./hooks-vs-heuristic) for the full comparison.

## Hook

A synchronous, structured event fired by the agent CLI on activity (tool start, tool end, turn end, permission request, etc.).

Pixel Agents uses Claude Code's Hooks API. When enabled (the default), the CLI runs our script (`~/.pixel-agents/hooks/claude-hook.js`) on every event and our script POSTs to the local server. The result: instant, lossless activity detection.

Not all CLIs have hooks. The `HookProvider` interface supports both hook-only and hook-plus-file-fallback providers.

## Provider

A `HookProvider` implementation that integrates one agent CLI. The provider knows how to normalize raw CLI events into the canonical `AgentEvent` shape, how to install/uninstall hook scripts, and how to format tool status strings for display.

See [HookProvider reference](/reference/hookprovider) for the interface, [Providers overview](/build/providers/overview) for adding one.

## Client

Anything that renders the office and speaks the protocol. Today: the VS Code webview and the standalone browser SPA. Both are "clients" in this sense; they consume `ServerMessage` broadcasts and send `ClientMessage` commands.

Third-party clients (mobile, TUI, custom embed) are first-class. The protocol is the contract.

See [Clients overview](/build/clients/overview).

## Adapter

A host integration. Today: `adapters/vscode/`. An adapter implements `StateAdapter` (for persistence) and `ITerminalAdapter` (for terminals), and bridges the host's UI to the embedded server.

The standalone app is intentionally not called an "adapter" because it isn't integrating into a host; it ships its own server.

See [Adapters overview](/build/adapters/overview).

## Transport

The wire layer between the runtime and a client. Two transports today:

- **PostMessage** - VS Code webview. The extension host bridges messages to/from the webview iframe.
- **WebSocket** - everything else. Connects to `ws://127.0.0.1:<port>/ws`.

The interface is `MessageTransport` at `core/src/transport.ts:10-17`. Clients code against the message shapes (`ServerMessage`, `ClientMessage`), not the transport.

## Hook script

The bundled JavaScript file at `~/.pixel-agents/hooks/claude-hook.js`. Built by esbuild from `server/src/providers/hook/claude/hooks/claude-hook.ts` into a single CJS file with no node_modules dependency.

It runs in the agent's process (Claude invokes it per the entries in `~/.claude/settings.json`), reads the event from stdin, and POSTs to our local server. Tiny, fast, no surprises.

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

## Area

A named, colored zone painted onto the office floor in the [layout editor](/use/vscode/layout-editor). Areas can be mapped to workspace folders: agents from a mapped folder take a [seat](#seat) inside that folder's area, and agents with no mapping prefer unzoned seats - so each project's agents gather in their own corner of the office.

In VS Code, areas only appear when the window is opened from a `.code-workspace` file - that's what provides the workspace folders to map. The standalone app has no workspace folders, so the Areas UI doesn't appear there.

Areas render as a translucent color overlay with the area's label. The overlay always shows while editing the layout; outside the editor it sits behind the "Show Areas" toggle in settings.

## Pet

A small animated companion placed in the office via the layout editor. Pets aren't bound to agents: they wander the office on their own and occasionally follow a nearby character around for a while. Click a pet to pet it - a heart bubble pops up.

## Sprite, SpriteData

A 2D array of hex color strings (`'' = transparent, '#RRGGBB' = opaque, '#RRGGBBAA' = semi-transparent`). Type alias at `core/src/schemas.ts:75`.

All assets (characters, floor tiles, wall tiles, furniture) ship as PNGs and are parsed server-side via `pngjs` into SpriteData before being sent to clients.

## Skin and hue shift

A character's skin is which of the six pre-colored character designs it wears. In code this is the `palette` field: an integer 0-5 indexing into the six character PNG sets. A `hueShift` (degrees, applied via HSL rotation at render time) differentiates characters further.

The first six agents each get a unique skin, picked in random order via `pickDiversePalette`. Beyond six, skins repeat with a random hue shift (45-315 degrees). This produces a diverse visual identity without needing 50 unique PNG sets.

## Bubble (speech bubble)

A small overlay above a character indicating special state:

- **Permission bubble** - a white bubble with "..." that appears when the agent is waiting for permission. Persists until resolved.
- **Waiting bubble** - a green checkmark that appears when the agent finishes its turn and is waiting for your input. Auto-fades after 2 seconds.

Sprites for both live in `webview-ui/src/office/sprites/spriteData.ts`.

## Next

- [The office](./the-office) - the UI in detail.
- [Agent lifecycle](./agent-lifecycle) - what happens from spawn to despawn.
- [Architecture](./architecture) - the four packages.
- [Glossary](/reference/glossary) - quick-lookup version of this page.
