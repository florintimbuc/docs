---
sidebar_position: 3
---

# Quickstart: VS Code

Zero to your first agent character in under 5 minutes.

:::note
This quickstart uses [Claude Code](https://docs.claude.com/en/docs/claude-code/setup) in every example - it's the first supported agent. The same concepts apply to other coding agents as [providers](/build/providers/overview) are added.
:::

## Prerequisites

- VS Code 1.105.0 or newer.
- Claude Code CLI installed and authenticated (`claude` runs and reaches an interactive session).

If either is missing, see [Install](./install).

## Step 1: Install the extension

1. Open VS Code.
2. Open the Extensions sidebar (`Cmd/Ctrl+Shift+X`).
3. Search for **Pixel Agents**.
4. Click Install.

You should see "Pixel Agents" appear in your installed extensions list.

## Step 2: Open the panel

Open the Command Palette (`Cmd/Ctrl+Shift+P`) and run:

```
Pixel Agents: Show Panel
```

A panel docks in the auxiliary area (right side by default). It shows a pixel-art office with a wood floor, a few desks, and chairs. No characters yet.

You can drag the panel to the bottom or another side; the layout will follow you.

## Step 3: Spawn your first agent

Look for the bottom toolbar inside the Pixel Agents panel. Click **+ Agent**.

Two things happen in sequence:

1. A new VS Code terminal opens, running `claude --session-id <uuid>`.
2. Within 2 seconds, a character spawns in the office, seated at an available seat.

You now have a live agent. Anything you type in the terminal is what the agent responds to; the character will animate accordingly.

## Step 4: Make the agent do something

In the terminal that just opened, type:

```
Read package.json and tell me what it does.
```

Watch the character:

- The **reading animation** plays (the character holds up a piece of paper) while the Read tool runs.
- The **typing animation** plays while the agent composes the answer.
- If the agent asks for permission at any point (e.g. for a Bash command), a **"..." speech bubble** appears above its head. Respond in the terminal and the bubble disappears.
- When the agent is done, a **checkmark bubble** appears above its head and a sound notification plays.

## Step 5: Spawn a second agent

Click **+ Agent** again. A second terminal opens, and a second character spawns - a different character. Pixel Agents ships six distinct characters; beyond six agents, the characters repeat with shifted color hues so every agent stays distinguishable.

Run different tasks in each terminal and watch the characters work in parallel.

## Step 6: Spawn sub-agents

Sub-agents get characters too. In either terminal, type:

```
Spawn three subagents in parallel to summarize the main folders of this project.
```

Ephemeral sub-agent characters appear next to the parent character while the subtasks run, and disappear as each one completes. They inherit the parent's look, so they read as a group.

That's the tour: you ran two agents and a handful of sub-agents, and watched all of their activity in real time without leaving VS Code. The visualization is the point - it scales gracefully when one terminal becomes many.

## What to try next

| Action | Where |
|---|---|
| Customize the office layout | Click "Layout" in the bottom toolbar. See [Layout editor](/use/vscode/layout-editor). |
| Customize settings (sounds, hooks, and more) | Click "Settings" in the bottom toolbar. See [Settings](/use/vscode/settings). |
| Watch agents from other terminals | "Watch all sessions" toggle in settings. |
| Run a task with an agent team | Just ask the agent: "Build X with an agent team." See [Using agent teams](/use/workflows/using-agent-teams). |

## If something didn't work

| Symptom | Quick check |
|---|---|
| Panel doesn't open | Reload VS Code (`Cmd/Ctrl+Shift+P` → "Reload Window"). |
| + Agent button does nothing | Confirm `claude` is in PATH (`which claude`). |
| Character doesn't appear after spawning | Check Output → "Pixel Agents" for errors. |
| Permission bubbles never appear | Make sure hooks are enabled (see [Enabling hooks](/use/workflows/enabling-hooks)). |

Full symptom-driven guide: [Troubleshooting](/use/vscode/troubleshooting).

## Next steps

- [How it works](/learn/how-it-works) - the mental model behind what you just saw.
- [VS Code overview](/use/vscode/overview) - the full feature tour.
- [Concepts](/learn/concepts) - vocabulary you'll hit in the docs.
