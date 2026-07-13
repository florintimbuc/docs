---
sidebar_position: 1
title: Overview
---

# VS Code overview

The VS Code extension is the original Pixel Agents surface. This page is the full feature tour. For installation, see [Install](/start/install); for the 5-minute path, see [Quickstart: VS Code](/start/quickstart-vscode).

## The panel

Pixel Agents lives in a VS Code panel (a `WebviewViewProvider`, not a `WebviewPanel`). You can drag it to any side or the bottom; it docks like a tool window.

Open it via:

- Command Palette: `Pixel Agents: Show Panel`.
- View menu (if you've pinned it).
- The dedicated view container in the activity bar.

The panel persists across reloads. Closed terminals get re-bound to their agents on reopen.

## The bottom toolbar

![The bottom toolbar: + Agent, Layout, and Settings](/img/bottom-toolbar.png)

- **+ Agent**: spawn a new agent terminal and character - see [Agent lifecycle](/learn/agent-lifecycle) for what happens under the hood. In multi-root workspaces, the dropdown caret lets you pick which folder the agent's terminal opens in.
- **Layout**: enter edit mode. See [Layout editor](./layout-editor).
- **⚙ Settings**: opens the settings modal. See [Settings](./settings).

## The office canvas

A pixel-art office grid with floor tiles, wall tiles, furniture, and characters. Middle-mouse drag pans. The mouse wheel zooms in and out (integer zoom levels only - the canvas is always pixel-perfect), as do the +/- buttons in the corner.

Character interactions:

- **Click a character** → select. White outline appears. Camera smoothly centers on it.
- **Click an empty tile** → deselect.
- **Click a different character** → re-select.
- **Hover over a character** → activity label appears above the head (e.g. "Reading foo.ts").

Selected character interactions:

- **Click a seat** → reassign the character to that seat.
- **Right-click a tile** → the character walks to it.
- **Click the X button near the character's head** → dismiss the agent (close the terminal too if there is one).

## Tool activity visualization

What you see when an agent runs a tool:

| Activity | What you see |
|---|---|
| Read-style tools (reading files, searching, fetching) | Reading animation. |
| Everything else | Typing animation - the default whenever the agent is working at its seat. |
| Sub-agent spawns | A sub-agent character appears next to the parent. |
| Teammate spawns | A persistent teammate character appears with its own seat. |

Which tools count as "read-style" is decided by the provider's `readingTools` set.

## Speech bubbles

A "..." bubble means the agent wants permission; a green-checkmark bubble (plus the done chime) means it finished its turn. Full detail in [The office → Speech bubbles](/learn/the-office#speech-bubbles).

## Sub-agent and teammate display

**Sub-agents** appear as clones of the parent (same skin) next to it, labelled with the delegated task. They despawn when the subtask completes.

**Teammates** appear as full characters with their own seats and their own skins. The team is identified by labels: the lead shows **LEAD**, each teammate shows its name.

Clicking a sub-agent focuses the parent's terminal (since sub-agents don't have their own). Clicking a teammate focuses the teammate's terminal if one exists, otherwise falls back to the lead.

## Multi-root workspaces

If your workspace has multiple folders, you'll see the workspace folder name on each character (e.g. "frontend" / "backend"). The "+ Agent" dropdown lets you pick which folder the agent's terminal opens in.

Agents from different folders coexist in the same office. Their `folderName` field appears in the activity label.

## Multi-window

Open the same workspace in two VS Code windows. Both panels show the same layout (synced via `~/.pixel-agents/layout.json`). Each window owns its own agents (separate terminals → separate agents), but each appears as "external" in the other window.

The shared server (started by the first window) is detected by the second via `~/.pixel-agents/server.json`. Both panels connect to the same server. Layout edits in one window propagate to the other within ~2 seconds.

## Tool activity label

Hover or select a character to see the current tool's status - `Reading package.json`, `Running: ls -la`, and so on. When no tool is active, no label appears. To keep labels always visible, turn on **Always Show Labels** in [Settings](./settings).

## Sound notifications

Two sounds: a permission sound when an agent asks for permission, and the done chime when an agent finishes its turn. Both sit behind the "Sound notifications" toggle in Settings; the setting persists per host.

The Web Audio context is unlocked on first canvas click. If you've never clicked the canvas, no sound plays even if the toggle is on.

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

The standalone equivalent of these features is "open a terminal yourself" - the agent will appear as external when its transcript is detected.

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
- [Enabling hooks](/use/workflows/enabling-hooks) - hooks are on by default; this page covers the details.
