---
sidebar_position: 1
---

# What is Pixel Agents?

Pixel Agents turns the AI coding agents running in your terminals into animated pixel-art characters working in a tiny office. They walk to their desks, sit down, type when they're editing files, read when they're searching, and flag you visually when they're stuck waiting for input.

Run an agent in a terminal and a character appears. Open another terminal, run another agent, and a second character joins. Sub-agents pop up next to their parent while they work, and agent teams show up as persistent teammates around their lead.

There's nothing special to set up for the visualization to work: Pixel Agents detects the sessions your agents already produce and mirrors them in the office, live. Claude Code is the first supported agent and the one used in examples throughout these docs, but the system is built around [providers](/build/providers/overview), so the same experience extends to other coding agents as providers are added.

## What you'll see in the office

**Agents.** Every agent running in a terminal gets its own animated character. Characters act out what their agent is doing: they type when the agent writes or edits files, read when it searches, walk when moving between states, and idle when there's nothing to do. When an agent needs your input or permission, a speech bubble appears over its head, and an optional sound notification tells you when a turn finishes — so you can focus elsewhere without losing track.

**Teams & sub-agents.** Agent-team teammates are full, persistent characters, labelled by their role. Temporary sub-agents appear as extra characters next to their parent and disappear when their subtask completes. These appear as clones of the main agent, so even a crowded office stays readable at a glance.

**An office you can edit.** The office is yours to design: paint floors, place desks, chairs, and decorations with the layout editor, and your design is saved and synced across windows. You can also load custom or third-party asset packs from any folder on your machine. See the [layout editor](/use/vscode/layout-editor) and [external assets](/use/workflows/external-assets).

Curious where the character art comes from? See [Attributions](/community/attributions).

## What it isn't

- **It is not an AI agent.** Pixel Agents visualizes agents from other systems. It doesn't write code itself.
- **It is not a chat client.** There's no message thread. The terminal is still where you talk to the agent; the office is what you see while it works.
- **It is not a cloud service.** Everything runs locally. There's no sign-up, no telemetry pipeline, no remote inference. The server binds to 127.0.0.1.
- **It is not VS Code-only.** The VS Code extension is the most-used surface today, but the standalone app works equally well in a plain browser.

## Why use it

Pixel Agents tells you at a glance whether an agent is working, waiting on you, or done with its task — no more staring at a terminal, and no more forgetting about one. With many agents running, the office becomes a live map of everything happening across terminals, windows, and teams.

Beyond the utility, it simply makes agent-heavy work nicer to look at. Your agents deserve an office.

## What's next

- [Install](./install) - get it on your machine.
- [Quickstart: VS Code](./quickstart-vscode) - 5 minutes to your first agent.
- [Quickstart: Standalone](./quickstart-standalone) - 5 minutes via `npx`.
- [How it works](/learn/how-it-works) - the mental model behind the office.

For the conceptual deep dive once you've got it running, head to [Learn](/learn). For extending it with your own provider or client, head to [Build](/build).
