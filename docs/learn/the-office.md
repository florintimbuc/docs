---
sidebar_position: 4
---

# The office

The office is the visual world Pixel Agents renders. This page explains what you see, what it means, and how the UI maps to the underlying state.

For the conceptual vocabulary, see [Concepts](./concepts). For "how do I do X" tasks (paint a wall, place furniture, configure sound), see the [Use section](/use).

## The view

![The Pixel Agents panel: zoom controls top-left, the office canvas, and the bottom toolbar](/img/panel-view.png)

The canvas is pixel-perfect: integer zoom levels only, no anti-aliasing, no fractional pixels. The default zoom is picked from your display (typically 4x on Retina, 2x on a standard screen). Zoom with the +/- buttons; pan with middle-mouse drag. There's no rotation; the office is always viewed from the same angle.

## Characters

Each character is one agent.

Characters can have different **skins** - distinct character designs from the bundled set. Once every design is in use, new agents reuse them with shifted color hues, so any number of agents stay visually distinguishable. Sub-agents are the exception: they clone their parent's look on purpose (see [sub-agents](#sub-agents) below).

Want different characters? You can draw or import your own - see [character assets](/build/assets/characters) and [external assets](/use/workflows/external-assets).

What a character is doing mirrors what its agent is doing:

| Pose | When |
|---|---|
| **Typing** | The default while the agent is working or while idle at its seat. |
| **Reading** | The agent is running a read-style tool: reading files, searching, fetching. |
| **Walking** | The character is moving - to its seat, or wandering around when idle. |
| **Standing** | Idle between activities. |

### Spawn, despawn, and wandering

Characters arrive and leave with a brief Matrix-style digital-rain effect. Restored agents (reconnecting after a reload) skip it, so reopening VS Code doesn't set off a visual blast.

Idle characters occasionally get bored: they wander to a random walkable tile, stroll around a bit, and return to their seat. Wandering stops the moment the agent has work to do.

### Speech bubbles

Two kinds of bubbles appear above characters:

**Permission bubble** - a white bubble with "..." dots. Appears when the agent asks for permission (instantly when hooks deliver; in the heuristic fallback, after a tool has been pending for 7 seconds). It persists until you click on the character or the underlying tool completes.

**Done bubble** - a white bubble with a green checkmark. Appears when the agent finishes its turn and is waiting for you. It auto-fades after 2 seconds; the done sound plays at the same moment (see [Sound](#sound)).

### Sub-agents

When an agent delegates work to sub-agents, ephemeral characters appear next to the parent - at the closest free walkable tile, not necessarily a seat. They look like clones of the parent (same skin and hue), their activity label shows the delegated task, and they vanish when the subtask completes.

Clicking a sub-agent focuses the parent's terminal, since sub-agents don't have their own.

### Teammates

Agents can also spawn **teammates**: persistent agents with their own session, seat, and activity. The spawning agent becomes the **lead**, and together they form a team - see [Agent teams](./agent-teams) for the full pattern.

Unlike sub-agents, teammates are full characters with their own skin (they don't inherit the lead's). Teams change the labels instead: the lead is labelled **LEAD**, and each teammate is labelled with its name, so you can tell the team apart at a glance. Teammates stay alive across the lead's turns; when the lead closes, its teammates close with it.

### Activity labels

Hover over a character (or click to select it) and a small label appears above its head showing what the agent is doing right now. Examples:

| Activity | Label |
|---|---|
| Reading a file | `Reading <filename>` |
| Editing / writing a file | `Editing <filename>` / `Writing <filename>` |
| Running a command | `Running: <command>` |
| Searching | `Searching files` / `Searching code` |
| Fetching a page | `Fetching web content` |
| Delegating to a sub-agent | The delegated task's description |

Labels show on hover and selection by default; to keep them always visible, turn on **Always Show Labels** in settings.

For reference, the exact label formats live in [the provider source on GitHub](https://github.com/pixel-agents-hq/pixel-agents/blob/main/server/src/providers/hook/claude/claude.ts).

### Pets

The office isn't only agents: you can place **pets** - small animated companions. Pets aren't bound to agents. They wander the office on their own, pause wherever they like, and every so often trail a nearby character around for a while. Click a pet to pet it - a heart bubble pops up.

Two pets ship with the app: **Claudio** and **Gitcat**. While pets are characters, they are placed with the layout editor's Pets tool and saved in the layout file.

## The layout

### Editing the office

The office itself is fully editable. The **Layout** button in the bottom toolbar enters edit mode: paint floor and wall tiles, place and rotate furniture, undo/redo, expand the grid, and save. The full guide is at [Layout editor](/use/vscode/layout-editor).

Your design is stored in `~/.pixel-agents/layout.json` and shared across every surface - all VS Code windows and the standalone app render the same office.

### Floor tiles

Floors are 16x16px grayscale patterns colorized at render time: each placed tile carries hue/saturation/brightness/contrast values that turn the base pattern into its final color, so any floor can be any color. Painting applies the toolbar's current color settings per tile.

Two colorization modes exist: **Colorize** (default - recolors from luminance, Photoshop-style) and **Adjust** (shifts the source pixel's colors; subtler).

For a feel of what a floor asset looks like, here's one from the bundled set: [floor_0.png](https://github.com/pixel-agents-hq/pixel-agents/blob/main/webview-ui/public/assets/floors/floor_0.png).

### Wall tiles

Walls are auto-tiled: each placed wall picks the right sprite piece based on which of its neighbors are also walls, so corners, edges, and junctions connect seamlessly. Walls extend above their tile to give a 3D face effect, and they z-sort with furniture and characters.

Wall color is global: one color setting applies to every wall in the layout.

The bundled wall sheet is [wall_0.png](https://github.com/pixel-agents-hq/pixel-agents/blob/main/webview-ui/public/assets/walls/wall_0.png); to see how the auto-tiling picks pieces from it, try the [wall tile editor](https://github.com/pixel-agents-hq/pixel-agents/blob/main/scripts/wall-tile-editor.html), a small visualization app that's included in the git repo.

### Furniture

Furniture is everything you place on the grid: desks, chairs, storage, electronics, decor, and wall items. Each item has a tile footprint and a category. Some items can sit on top of desks and other surfaces (laptops, monitors, mugs), some hang on walls, and many come in rotation groups so you can place them facing different directions. Some have on/off or animated states.

Two kinds of furniture carry meaning beyond decoration: chairs define [seats](#seats), and desks influence which way a seat faces.

The bundled catalog ships with the app, and you can add your own items via asset packs - see [furniture assets](/build/assets/furniture) and [external assets](/use/workflows/external-assets).

### Seats

Chairs are seats; multi-tile chairs (couches, benches) provide one seat per tile. Each seat faces a direction, taken from the chair's design or from an adjacent desk.

When an agent appears, it takes the closest free seat - preferring seats inside its folder's [area](#areas) when one is mapped. To reassign, click a character to select it, then click any free seat.

Chair tiles are blocked for walking, with one exception: a character's own seat is unblocked for it, so it can step onto its chair to sit down.

### Areas

Areas are named zones painted onto the floor with the layout editor's Areas tool. On their own they're just labelled regions; their power is folder mapping: assign a workspace folder to an area, and agents from that folder will always spawn and seat inside it by default.

Areas render as a translucent color overlay with the area's label on top. The overlay is always visible while editing the layout; outside the editor, toggle **Show Areas** in settings.

For the moment, areas only appear in VS Code when the window is opened from a `.code-workspace` file - that's what provides the workspace folders to map. Without one, the Areas tool and the Show Areas toggle stay hidden. The standalone app has no workspace folders, so the Areas UI doesn't appear there either.

## Camera and sound

### Camera

Most of the time the camera follows the selected agent. Click a character to select it; the camera smoothly centers on it. Click an empty tile to deselect; the camera stays put.

Middle-mouse drag pans the view manually. Manual pan clears the camera follow.

### Sound

There are two notification sounds: a **permission sound** when an agent asks for permission, and the **done chime** when an agent finishes its turn.

Both sit behind the single "Sound notifications" toggle in [Settings](/use/vscode/settings) - flip it off for a silent office. The setting persists per host.

One browser caveat: audio is unlocked on your first click on the canvas. If you've never clicked it, sounds won't play even with the toggle on.

## Next

- [Agent lifecycle](./agent-lifecycle) - the lifecycle of a single character.
- [Hooks vs heuristic](./hooks-vs-heuristic) - why the office responds instantly with hooks vs lagging without.
- [Layout editor](/use/vscode/layout-editor) - editing the office layout.
- [Building a client](/build/clients/building-a-client) - if you want to render the office somewhere else.
