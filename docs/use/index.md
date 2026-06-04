---
sidebar_position: 1
title: Overview
---

# Use Pixel Agents

How to actually use Pixel Agents to do things. Audience: end users.

This section is task-oriented. If you want to understand *why* Pixel Agents
behaves the way it does, see [/learn/](../learn). If you need to look
something up (a setting key, a port number, a close code, a message type), see
[/reference/](../reference/protocol/overview). If you want to extend Pixel
Agents with a new provider or client, see [/build/](../build).

The pages here split into two main delivery channels for Pixel Agents
(VS Code extension and standalone CLI), a workflow library that crosses both,
and quick-lookup pages for symptoms and questions.

## VS Code

The bundled IDE integration. Available on the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=pablodelucca.pixel-agents)
as `pablodelucca.pixel-agents`. This is the original, most-tested delivery
channel and the one most users start with.

What lives under [/use/vscode/](./vscode/overview):

- [/use/vscode/overview.md](./vscode/overview) - what the extension gives you,
  where the panel lives, the relationship between terminals and characters.
- [/use/vscode/settings.md](./vscode/settings) - every toggle in
  the in-panel settings modal, what it persists, and what happens when you flip
  it.
- [/use/vscode/layout-editor.md](./vscode/layout-editor) - paint floor,
  paint walls, place furniture, undo, redo, save, and how to share a layout
  across VS Code windows.
- [/use/vscode/troubleshooting.md](./vscode/troubleshooting) - VS Code
  specific symptoms: panel not appearing, agents not adopting their terminal,
  layout not syncing, etc.

> The /use/vscode/ pages are written by the maintainer team. If a link looks
> broken right now, that page hasn't been published yet.

## Standalone

`npx pixel-agents`. A local Fastify server starts on your machine, serves the
same React SPA the VS Code webview uses, and watches your `~/.claude/projects/`
directory the same way the extension does. The browser tab becomes the office.

This is the path of choice when:

- You don't use VS Code (Cursor, Zed, Neovim, plain shell, etc.).
- You want to watch Claude sessions that you spawned from somewhere outside an
  IDE.
- You're a multi-monitor user and you want the office on a screen of its own,
  in its own browser window.

What lives under [/use/standalone/](./standalone/overview):

- [/use/standalone/overview.md](./standalone/overview) - the feature tour.
  What `npx pixel-agents` actually does, what it can and can't do today, how it
  compares to the VS Code extension.
- [/use/standalone/running-the-server.md](./standalone/running-the-server) -
  CLI flags, port and host binding, multi-window discovery, where state goes
  on disk, graceful shutdown, hook auto-install.
- [/use/standalone/troubleshooting.md](./standalone/troubleshooting) -
  symptom-driven fixes: start failures, blank pages, agents missing, ports in
  use, stale `server.json`.

## Workflows

Task-oriented guides that cross both delivery channels. These pages answer
questions like "How do I enable hooks for instant detection?" or "How do I
add my own asset pack?" without assuming you're on VS Code or standalone.

What lives under [/use/workflows/](./workflows/enabling-hooks):

- [/use/workflows/enabling-hooks.md](./workflows/enabling-hooks) - what hook
  detection is, how to turn it on, what to expect when it's working, how to
  verify.
- [/use/workflows/using-agent-teams.md](./workflows/using-agent-teams) - how teammate
  characters appear when you use the Agent SDK or run a Task in
  `run_in_background` mode.
- [/use/workflows/external-assets.md](./workflows/external-assets) - point
  Pixel Agents at a directory of your own furniture PNGs and a
  matching `manifest.json` in their folder under `furniture/`, and they appear in the editor palette.
- [/use/workflows/bypassing-permissions.md](./workflows/bypassing-permissions) -
  how the permission bubble system works and what flags affect it on the
  Claude side.

> The /use/workflows/ pages are written by the maintainer team. Links may
> point to unpublished pages.

## FAQ and Troubleshooting

Quick-lookup pages, used when you have a specific symptom or question and you
don't want to read a full guide.

- [/use/faq.md](./faq) - common questions with short answers.
- [/use/troubleshooting.md](./troubleshooting) - the cross-channel
  symptom-driven index. For VS Code only, see
  [/use/vscode/troubleshooting.md](./vscode/troubleshooting). For standalone
  only, see [/use/standalone/troubleshooting.md](./standalone/troubleshooting).

> The two pages above are written by the maintainer team. If you can't find an
> answer, see [/reference/errors.md](../reference/errors) (close codes and
> structured errors) or open an issue on
> [GitHub](https://github.com/pablodelucca/pixel-agents/issues).

## How to read this section

Pick the channel you're using (VS Code or Standalone) and read the
overview + troubleshooting page for it. The workflows pages are referenced
from both. The FAQ and Troubleshooting pages are best used as lookup, not
read top to bottom.

If something is unclear, the canonical "why" content lives under
[/learn/](../learn). Architecture deep dives, including the rationale
for hooks-versus-heuristic detection and the postMessage protocol, are there.
