---
sidebar_position: 1
title: Overview
---

# VS Code overview

:::warning[AI-generated docs]
This document was AI-generated and may have some mistakes - we apologize for this, we're in the process of reviewing all documents. If you find any issues, we'd be thankful if you [submit an edit PR](https://github.com/pixel-agents-hq/docs/edit/main/docs/use/vscode/overview.md).
:::

The VS Code extension is the original Pixel Agents surface. This page is the full feature tour. For installation, see [Install](/start/install); for the 5-minute path, see [Quickstart: VS Code](/start/quickstart-vscode).

## The panel

Pixel Agents lives in a VS Code panel (a `WebviewViewProvider`, not a `WebviewPanel`). You can drag it to any side or the bottom; it docks like a tool window.

Open it via:

- Command Palette: `Pixel Agents: Show Panel`.
- View menu (if you've pinned it).
- The dedicated view container in the activity bar.

The panel persists across reloads. Closed terminals get re-bound to their agents on reopen.

## The bottom toolbar

```
[+ Agent ▾] [Layout] [...] [⚙ Settings]
```

- **+ Agent**: spawn a new Claude terminal and character. In multi-root workspaces, the dropdown caret lets you pick which folder the agent's terminal opens in.
- **Layout**: enter edit mode. See [Layout editor](./layout-editor).
- **⚙ Settings**: opens the centered settings modal.

The toolbar may show additional controls depending on state (an EditActionBar appears when the layout is dirty, with Undo / Redo / Save / Reset buttons).

## The zoom controls (top-right)

`+` and `-` buttons increase or decrease the integer zoom level. Default zoom is calculated from your display: `Math.round(2 * devicePixelRatio)`, typically 4x on Retina, 2x otherwise.

Zoom range is 1x to 10x. The canvas is always pixel-perfect; there's no fractional zoom.

## The office canvas

A pixel-art office grid with floor tiles, wall tiles, furniture, and characters. Middle-mouse drag pans. Mouse wheel does nothing by default (no scroll-zoom).

Character interactions:

- **Click a character** → select. White outline appears. Camera smoothly centers on it.
- **Click an empty tile** → deselect.
- **Click a different character** → re-select.
- **Hover over a character** → activity label appears above the head (e.g. "Reading foo.ts").

Selected character interactions:

- **Click a seat** → reassign the character to that seat.
- **Click the X button on the character** → dismiss the agent (close the terminal too if there is one).

The X button is small but real - look for it floating near the head of a selected character.

## Tool activity visualization

What you see when an agent runs a tool:

| Tool family | Animation |
|---|---|
| `Read`, `Grep`, `Glob`, `WebFetch`, `WebSearch` | Reading animation (character holds notebook). |
| `Write`, `Edit`, `Bash`, `Task` | Typing animation (tiny keyboard). |
| `Task`, `Agent` (subagent) | Spawns a sub-agent character next to the parent. |
| `Agent` with `run_in_background: true` | Spawns a persistent teammate with the lead's palette. |

Reading vs typing is decided by the provider's `readingTools` set. The default for Claude is `Set(['Read', 'Grep', 'Glob', 'WebFetch', 'WebSearch'])`.

## Speech bubbles

Two kinds:

- **Permission bubble** (amber "..."): the agent is waiting for permission. With hooks, this appears instantly; without hooks, after a 7-second heuristic timer.
- **Waiting bubble** (green ✓): the agent is otherwise idle but expects input. Auto-fades after 2 seconds. A chime sound plays at the same time by default.

## Sub-agent and teammate display

**Sub-agents** (Task tool) appear as small characters next to the parent. They have the parent's palette and a "Subtask:" prefixed activity label. They despawn when the Task completes.

**Teammates** (Agent + run_in_background) appear as full characters with their own seats. They share the lead's palette plus an inherited hue shift, making the team visually grouped.

Clicking a sub-agent focuses the parent's terminal (since sub-agents don't have their own). Clicking a teammate focuses the teammate's terminal if one exists, otherwise falls back to the lead.

## Multi-root workspaces

If your workspace has multiple folders, you'll see the workspace folder name on each character (e.g. "frontend" / "backend"). The "+ Agent" dropdown lets you pick which folder the agent's terminal opens in.

Agents from different folders coexist in the same office. Their `folderName` field appears in the activity label.

## Multi-window

Open the same workspace in two VS Code windows. Both panels show the same layout (synced via `~/.pixel-agents/layout.json`). Each window owns its own agents (separate terminals → separate agents), but each appears as "external" in the other window.

The shared server (started by the first window) is detected by the second via `~/.pixel-agents/server.json`. Both panels connect to the same server. Layout edits in one window propagate to the other within ~2 seconds.

## Tool activity label

Hover or select a character to see the current tool's status. The label is formatted by the provider's `formatToolStatus(toolName, input)` function. Examples:

- `Reading package.json`
- `Editing src/cli.ts`
- `Running: ls -la`
- `Searching files`
- `Subtask: refactor auth flow`

When no tool is active, no label appears.

## Sound notifications

A two-note ascending chime (E5 → E6) plays when an agent enters the waiting state. Toggleable in Settings. Persisted per-host.

The Web Audio context is unlocked on first canvas mousedown. If you've never clicked the canvas, no sound plays even if the toggle is on.

## Commands

| Command | What it does |
|---|---|
| `Pixel Agents: Show Panel` | Focuses the panel. |
| `Pixel Agents: Export Layout as Default` | Writes the current layout to `webview-ui/public/assets/default-layout.json` (developer command). |

The full command IDs are in `package.json` under `contributes.commands` (`pixel-agents.showPanel`, `pixel-agents.exportDefaultLayout`).

## Settings

Three groups, all in the centered settings modal:

- Behavior: sound notifications, hooks toggle, Watch All Sessions, Always Show Labels.
- Layout: Export / Import / Reset.
- Assets: External Asset Directories (Add / Remove).

Full reference: [Settings](./settings).

## What VS Code can do that standalone can't

- **+ Agent button** spawns a new terminal. Standalone has no terminal-spawning surface.
- **Focus agent's terminal** when clicking a character (standalone has no terminals to focus).
- **Export/Import Layout** via native save/open dialogs.
- **Multi-root workspace** awareness.

The standalone equivalent of these features is "open a terminal yourself" - the agent will appear as external when its JSONL is detected.

## What's the same in standalone

- The office, characters, animations, bubbles, sound.
- The layout editor.
- Settings (with per-host scoping).
- External asset directories.
- Multi-window agents (each VS Code window is one "host" instance; same as multiple `npx pixel-agents` processes).

## Next

- [Settings](./settings) - every toggle, explained.
- [Layout editor](./layout-editor) - paint, place, move, save.
- [Troubleshooting](./troubleshooting) - VS Code-specific symptoms and fixes.
- [Enabling hooks](/use/workflows/enabling-hooks) - turn on the better detection mode.
