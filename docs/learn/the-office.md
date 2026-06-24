---
sidebar_position: 3
---

# The office

The office is the visual world Pixel Agents renders. This page explains what you see, what it means, and how the UI maps to the underlying state.

For the conceptual vocabulary, see [Concepts](./concepts). For "how do I do X" tasks (paint a wall, place furniture, configure sound), see the [Use section](/use).

## The view

```
┌──────────────────────────────────────────┐
│                                          │ ← Top-right: zoom controls (1x-10x)
│   ┌───────────────────────────┐          │
│   │                           │          │
│   │   pixel-art office grid   │          │
│   │   (canvas)                │          │
│   │                           │          │
│   └───────────────────────────┘          │
│                                          │
├──────────────────────────────────────────┤
│ [+ Agent] [Layout] ... [⚙ Settings]      │ ← Bottom toolbar
└──────────────────────────────────────────┘
```

The canvas is pixel-perfect: integer zoom levels (1x through 10x), no anti-aliasing, no fractional pixels. Default zoom is `Math.round(2 * devicePixelRatio)`, which usually means 4x on a Retina display, 2x on a standard one.

You pan the view with middle-mouse drag. You zoom with the +/- buttons. There's no rotation; the office is always viewed from the same angle.

## Characters

Each character is one agent. The character has three direction sets (down, up, right) with the left direction rendered as flipped right. Frames are 16 wide x 32 tall, with the visible character in the bottom 24px and 8px of top padding.

What you'll see:

| Pose | When |
|---|---|
| **Standing** (idle) | The agent is between activities. Same as the walk2 frame held still. |
| **Walking** | The agent is pathfinding to its seat or wandering. Animation cycles walk1 / walk2 / walk3. |
| **Typing** | The agent is running a writing tool (Write, Edit, Bash, Task). Two-frame animation. |
| **Reading** | The agent is running a reading tool (Read, Grep, Glob, WebFetch, WebSearch). Two-frame animation. |

When a character is sitting (in the TYPE state at a seat), it shifts down 6 pixels to look like it's in the chair, not floating.

## Visual identity

Each character has a unique-ish look determined by two fields:

- **Palette** (0-5): one of six pre-colored character PNG sets. The first six agents each get a unique palette via the diverse-palette picker.
- **Hue shift** (degrees): an HSL hue rotation applied at render time. Beyond the first six agents, palettes repeat with a random hue shift between 45 and 315 degrees.

Combined, you can have dozens of agents with visually distinct characters. The cache key for the rendered sprite is `"palette:hueShift"` (e.g. `"3:120"`).

## Spawn and despawn effects

Characters arrive and leave with a Matrix-style digital-rain effect lasting 0.3 seconds. Sixteen vertical columns sweep top-to-bottom with staggered timing.

**Spawn:** green rain reveals character pixels behind the sweep.

**Despawn:** character pixels are consumed by green rain trails.

Restored agents (those loaded from `existingAgents` on reconnect) skip the effect to avoid a visual blast every time you reload VS Code.

## Speech bubbles

Two kinds of bubbles appear above characters:

**Permission bubble** - amber "..." dots. Appears when:
- Claude fires a `PermissionRequest` hook (instant), or
- Claude fires a `Notification(permission_prompt)` hook (instant), or
- The heuristic permission timer fires 7 seconds after a non-exempt tool starts and nothing has happened since.

Persists until the underlying tool either completes or you approve the permission in the terminal.

**Waiting bubble** - green checkmark. Appears when:
- The agent has finished its turn and is otherwise idle for `TEXT_IDLE_DELAY_MS = 5s` (heuristic mode), or
- A `Notification(waiting_for_input)` hook fires (hook mode).

Auto-fades after 2 seconds. The chime sound plays at the same time (toggleable in settings).

## Seats

Chairs in the office layout are seats. Multi-tile chairs (couches, benches) produce one seat per tile. Each seat has:

- An identifier (the chair's `uid`, possibly with a `:tileIndex` suffix).
- A facing direction (UP / DOWN / LEFT / RIGHT) computed from: 1) the chair's catalog `orientation`, 2) adjacent desk position, 3) defaults to DOWN.

When an agent appears, it picks a seat using a closest-free-seat heuristic. You can reassign seats interactively: click a character to select it (white outline), then click any available seat.

A chair's tile is normally blocked for pathfinding except for the character assigned to that seat (per-character `withOwnSeatUnblocked` logic). This means a character can walk to its own seat through other chairs.

## Wandering

When an agent is idle for a while, it gets bored. It picks a random walkable tile via BFS and walks there. After a configurable number of wander moves (`wanderLimit`), it returns to its seat for a rest. The cycle repeats.

Wandering is suppressed when the agent is actively typing/reading. It resumes when the agent goes back to idle.

## Sub-agents

When an agent runs a sub-agent tool (Claude's `Task`), an ephemeral sub-agent character appears next to the parent. It has:

- A negative ID (the parent has a positive ID).
- The same palette and hue shift as the parent (visually grouped).
- A "Subtask:" prefix on its activity label.

Sub-agents spawn at the closest free seat to the parent (Manhattan distance). If no seat is available, they spawn at the closest walkable tile. They don't persist; they vanish when the Task completes.

Clicking a sub-agent focuses the parent's terminal (since sub-agents don't have their own terminal to focus).

## Teammates

Teammates are full agents spawned via `Agent(... run_in_background: true)`. They show up just like top-level agents (positive IDs, their own seats, their own activity), and they inherit the lead's palette + hueShift so the team is visually grouped.

Teammates persist. They stay alive across the lead's turns, sit at their own seats, run their own tools.

When the lead closes, teammates close with it.

## Activity labels

Hover over a character (or click to select) and a small label appears above the head showing what tool is currently active. Labels are formatted by the provider's `formatToolStatus(toolName, input)` function. Examples for Claude:

| Tool | Label |
|---|---|
| `Read` | `Reading <basename>` |
| `Edit` | `Editing <basename>` |
| `Write` | `Writing <basename>` |
| `Bash` | `Running: <truncated command>` |
| `Glob` | `Searching files` |
| `Grep` | `Searching code` |
| `WebFetch` | `Fetching web content` |
| `Task`, `Agent` | `Subtask: <description>` or `Running subtask` |

Source: `server/src/providers/hook/claude/claude.ts` `formatToolStatus` function (top of file).

## Floor tiles

Floor uses one of nine grayscale 16×16 patterns in `assets/floors/` (`floor_0.png` through `floor_8.png`). Each placed tile carries HSBC (hue/saturation/brightness/contrast) values that colorize the grayscale into the final color at render time.

Two colorization modes:
- **Colorize** (default for floors): grayscale → luminance → fixed HSL. Photoshop-style.
- **Adjust**: shifts the source pixel's HSL. Less drastic.

Floor color is per-tile. Painting a tile applies the toolbar's current HSBC settings to that one tile.

## Wall tiles

Walls are auto-tiled. Each placed wall tile gets a 4-bit bitmask (N=1, E=2, S=4, W=8) based on which cardinal neighbors are also walls. The bitmask indexes into 16 sprite pieces in `assets/walls/wall_0.png` (4×4 grid, each 16 wide × 32 tall).

Walls extend 16 pixels above their tile to give a 3D face effect. They z-sort with furniture and characters.

Wall color is global: one HSBC setting applies to all walls in the layout. Adjusting the slider re-colorizes everything.

## Furniture

Items placed on the grid. Each catalog entry has:

- A footprint (width x height in tiles).
- A category (desks, chairs, storage, electronics, decor, wall, misc).
- Flags: `isDesk`, `canPlaceOnWalls`, `canPlaceOnSurfaces` (laptops, monitors, mugs that overlap with desks).
- Optional `orientation` (front/back/left/right) and `groupId` for rotation groups.
- Optional `state` (on/off) and `groupId` for state-toggle groups.

Auto-state: electronics (monitors, laptops) automatically swap to ON sprites when an active agent is facing a desk with that item nearby. The trigger is computed at render time without modifying the saved layout.

## Camera

Most of the time the camera follows the selected agent. Click a character to select; the camera smoothly centers on that character. Click an empty tile to deselect; the camera stays put.

Middle-mouse drag pans the view manually. Manual pan clears the camera follow.

## Sound

The notification chime is an ascending two-note (E5 → E6) generated via the Web Audio API. It fires when an agent enters the waiting state. Toggleable in Settings; persisted in global state.

The audio context is unlocked on first canvas mousedown (browsers start AudioContexts suspended until user interaction). If you've never clicked the canvas, sounds won't play.

## What's not shown

- **No code.** Pixel Agents doesn't render the contents of files or commands. The label tells you which tool; the terminal tells you the rest.
- **No history.** The office is real-time. Past activity isn't replayed; there's no scroll-back of character actions.
- **No multiplayer.** Each user's office is local. There's no shared remote office.

## Next

- [Agent lifecycle](./agent-lifecycle) - the lifecycle of a single character.
- [Hooks vs heuristic](./hooks-vs-heuristic) - why the office responds instantly with hooks vs lagging without.
- [Layout editor](/use/vscode/layout-editor) - editing the office layout.
- [Building a client](/build/clients/building-a-client) - if you want to render the office somewhere else.
