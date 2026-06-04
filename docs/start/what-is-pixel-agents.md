---
sidebar_position: 1
---

# What is Pixel Agents?

Pixel Agents turns the AI coding agents running in your terminals into animated pixel-art characters in a tiny office. They walk to their desks, sit down, type when they're editing files, read when they're searching, and flag you visually when they're stuck waiting for input.

The first supported agent is Claude Code (the CLI tool). Run `claude` in a terminal and a character appears. Open another terminal, run `claude` again, and a second character joins. Run a Task tool and a temporary sub-agent shows up next to the parent. Run Agent Teams and persistent teammates appear with the lead's color scheme.

You don't have to install anything special for the visualization to work. When you launch a Claude session, Pixel Agents finds its session file under `~/.claude/projects/` and watches the activity. If you enable hooks (a one-click toggle in settings), activity becomes instant and reliable.

## Three-layer positioning

Pixel Agents is built in three layers, and each one matters for a different audience:

**The office (the UI).** Characters, animations, sounds, the layout editor. This is what most users see. It runs in a VS Code panel or in a browser when you use `npx pixel-agents`.

**The runtime (the server).** A Node.js Fastify server that watches agent activity, normalizes events into a common shape, and broadcasts state to whatever UI is connected. It runs embedded inside the VS Code extension or standalone via the CLI.

**The contracts (the protocol and interfaces).** An [AsyncAPI 3.0 contract](/learn/protocol) for the wire format, plus TypeScript interfaces (`HookProvider`, `TeamProvider`, `StateAdapter`, `ITerminalAdapter`) for extending the system with new AI CLIs, alternate UIs, or new host IDEs. Anyone speaking the protocol is welcome.

This layering is why "Pixel Agents on VS Code" and "Pixel Agents standalone" feel like the same product: it's the same runtime under the hood, just with a different transport (postMessage vs WebSocket) and a different UI host. [The architecture page](/learn/architecture) walks through this in detail.

## What you'll see in the office

- **One agent, one character.** Every Claude Code terminal gets its own animated character. Characters are based on [JIK-A-4's Metro City pack](https://jik-a-4.itch.io/metrocity-free-topdown-character-pack), with 6 diverse character designs that further diversify via runtime hue shifts.
- **Live activity tracking.** Characters animate based on what the agent is doing: **typing** when writing or editing files, **reading** when searching or reading, **walking** when transitioning, **idle** when waiting.
- **Speech bubbles.** Visual indicators when an agent is waiting for input or needs permission, so attention is obvious at a glance.
- **Sound notifications.** Optional chime when an agent finishes its turn, so you can focus on other work.
- **Sub-agent and teammate visualization.** Task tool spawns appear as separate characters linked to the parent. Agent Teams teammates appear as persistent characters that share the lead's palette.
- **Persistent, sharable layouts.** Your office design is saved and synced across VS Code windows. Customize once, enjoy everywhere.
- **External asset directories.** Load custom or third-party furniture packs from any folder on your machine. See [external assets](/use/workflows/external-assets).

## What it isn't

- **It is not an AI agent.** Pixel Agents visualizes agents from other systems (today Claude Code, tomorrow others). It doesn't write code itself.
- **It is not a chat client.** There's no message thread. The terminal is still where you talk to the agent; the office is what you see while it works.
- **It is not a cloud service.** Everything runs locally. There's no sign-up, no telemetry pipeline, no remote inference. The server binds to 127.0.0.1.
- **It is not VS Code-only.** The VS Code extension is the most-used surface today, but the standalone CLI works equally well in a plain browser.

## Who uses it

- **Solo developers** running one or two Claude sessions who want a friendlier way to see when an agent is waiting for them.
- **Heavier users** running many parallel sessions (Agent Teams, multiple repos, multi-window) who need a visual map of what's happening across them.
- **Teams that like cuteness** as a debugging aid. A character that's been sitting still for ten minutes is faster to notice than a terminal scrolling past its prompt.

## What's next

- [Install](./install) - get it on your machine.
- [Quickstart: VS Code](./quickstart-vscode) - 5 minutes to your first agent.
- [Quickstart: Standalone](./quickstart-standalone) - 5 minutes via `npx`.
- [How it works](./how-it-works) - the mental model behind the office.

For the conceptual deep dive once you've got it running, head to [Learn](/learn). For extending it with your own provider or client, head to [Build](/build).
