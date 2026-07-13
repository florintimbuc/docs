---
sidebar_position: 4
---

# Quickstart: Standalone

Zero to your first agent in a browser in under 5 minutes. No IDE required.

:::note
This quickstart uses [Claude Code](https://docs.claude.com/en/docs/claude-code/setup) in every example - it's the first supported agent. The same concepts apply to other coding agents as [providers](/build/providers/overview) are added.
:::

## Prerequisites

- Node.js 18 or newer (22 recommended). Check with `node -v`.
- Claude Code CLI installed and authenticated.
- A modern browser (Chrome, Firefox, Safari, Edge).

If Node is missing, install from [nodejs.org](https://nodejs.org/) or your favorite version manager (nvm, fnm, asdf).

## Step 1: Launch the server

Open a terminal in your project directory and run:

```sh
npx pixel-agents
```

The first invocation downloads the package. Subsequent runs start instantly.

You'll see output like:

```
[Pixel Agents] Loading assets...
[Pixel Agents] Assets loaded: 6 characters, 47 furniture items
[Pixel Agents] Server: listening on 127.0.0.1:3100

  Pixel Agents server running at http://127.0.0.1:3100
```

The server stays attached to the terminal. Use `Ctrl+C` to stop it.

## Step 2: Open the browser

Open the printed URL (default `http://127.0.0.1:3100/`).

The pixel-art office loads. No characters yet, because no agent sessions are running.

## Step 3: Run an agent in another terminal

Open a second terminal in the same project directory and run:

```sh
claude
```

The agent starts an interactive session. Within ~3 seconds, a character spawns in the office, seated at an available seat.

You now have a live agent. Anything you type in the terminal is what the agent responds to; the character will animate accordingly.

## Step 4: Make the agent do something

In the agent's terminal, type:

```
Read package.json and tell me what it does.
```

Watch the character:

- The **reading animation** plays (the character holds up a piece of paper) while the Read tool runs.
- The **typing animation** plays while the agent composes the answer.
- If the agent asks for permission at any point (e.g. for a Bash command), a **"..." speech bubble** appears above its head. Respond in the terminal and the bubble disappears.
- When the agent is done, a **checkmark bubble** appears above its head and a sound notification plays.

## Step 5: Add a second agent

Open a third terminal in the same directory and run `claude` again. A second character spawns - a different character. Pixel Agents ships six distinct characters; beyond six agents, the characters repeat with shifted color hues so every agent stays distinguishable.

Both agents work independently. The browser is a real-time view of every agent session in this project directory.

## Step 6: Spawn sub-agents

Sub-agents get characters too. In either agent terminal, type:

```
Spawn three subagents in parallel to summarize the main folders of this project.
```

Ephemeral sub-agent characters appear next to the parent character while the subtasks run, and disappear as each one completes. They inherit the parent's look, so they read as a group.

That's the tour: you ran a local server, opened a browser view, and watched two agents and a handful of sub-agents work side by side - no VS Code needed. Under the hood it's the same runtime that powers the VS Code extension; see [Architecture](/learn/architecture).

## Stopping the server

In the terminal where `npx pixel-agents` is running, press `Ctrl+C`. The server cleans up timers, removes its `~/.pixel-agents/server.json` entry, and exits. Any browser tab will show the disconnected state.

If the terminal closed without graceful shutdown (kill -9, system crash), the next `npx pixel-agents` invocation detects the stale entry via PID check and starts fresh.

## What to try next

| Action | Where |
|---|---|
| Customize the office layout | "Layout" button in the bottom toolbar. See [Layout editor](/use/vscode/layout-editor) (the editor is the same in both surfaces). |
| Customize settings (sounds, hooks, and more) | Click "Settings" in the bottom toolbar. See [Settings](/use/vscode/settings) (same settings panel in both surfaces). |
| Watch sessions from other directories too | "Watch all sessions" toggle in settings. |
| Run a task with an agent team | Just ask the agent: "Build X with an agent team." See [Using agent teams](/use/workflows/using-agent-teams). |
| Run on a custom port | `npx pixel-agents --port 4000`. See [Running the server](/use/standalone/running-the-server). |
| Run the server alongside VS Code | The VS Code extension detects a running standalone server via `~/.pixel-agents/server.json` and reuses it. |

## If something didn't work

| Symptom | Quick check |
|---|---|
| `npx pixel-agents` fails to start | Port 3100 may be in use. Try `npx pixel-agents --port 4000`. |
| Server starts but browser shows blank page | Check terminal for "Assets loaded:" line. If 0 characters or 0 furniture, the install is corrupt. |
| Browser connects but no agents appear | The scanner watches the directory you launched from. Either re-launch from your project root, or enable "Watch all sessions" in settings. |
| Hooks not installing | See [Standalone troubleshooting](/use/standalone/troubleshooting). |

Full symptom-driven guide: [Standalone troubleshooting](/use/standalone/troubleshooting).

## Next steps

- [How it works](/learn/how-it-works) - the mental model.
- [Standalone overview](/use/standalone/overview) - the full feature tour.
- [Running the server](/use/standalone/running-the-server) - CLI flags and lifecycle.
- [Concepts](/learn/concepts) - vocabulary.
