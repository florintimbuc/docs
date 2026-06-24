---
sidebar_position: 3
---

# Quickstart: VS Code

Zero to your first agent character in under 5 minutes.

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

Three things happen in sequence:

1. A new VS Code terminal opens, named `claude`, running `claude --session-id <uuid>`.
2. Within 2 seconds, a character spawns in the office with a green matrix-rain reveal effect.
3. The character walks to an available seat and sits down.

You now have a live agent. Anything you type in the terminal is what the agent responds to; the character will animate accordingly.

## Step 4: Make the agent do something

In the terminal that just opened, type:

```
read package.json and tell me what it does
```

Watch the character:

- **Reading animation** plays (character holds an open notebook) while the Read tool runs.
- **Typing animation** plays (character types on a tiny keyboard) while Claude composes the answer.
- When Claude is done, the character returns to idle.

If at any point Claude asks for permission (e.g. for a Bash command), the character displays a "..." amber speech bubble above its head. You'll also hear a two-note chime by default. Approve in the terminal and the bubble disappears.

## Step 5: Spawn a second agent

Click **+ Agent** again. A second terminal opens, a second character spawns. They have different palettes (skin colors). Run different tasks in each. Watch them work in parallel.

If both terminals get busy with Tasks, you'll see ephemeral sub-agent characters appear next to each parent.

## What you just did

You ran two agents and watched their tool activity in real time without leaving VS Code. The visualization is the point - it scales gracefully when one terminal becomes many.

## What to try next

| Action | Where |
|---|---|
| Customize the office layout | Click "Layout" in the bottom toolbar. See [Layout editor](/use/vscode/layout-editor). |
| Enable hooks for instant detection | Settings → "Hooks enabled" on. See [Enabling hooks](/use/workflows/enabling-hooks). |
| Turn off sound notifications | Settings → "Sound notifications" off. See [Settings](/use/vscode/settings). |
| Watch agents from other terminals | "Watch all sessions" toggle in settings. |
| Spawn an Agent Team | Run `Agent` tool with `run_in_background: true`. See [Agent Teams](/learn/agent-teams). |

## If something didn't work

| Symptom | Quick check |
|---|---|
| Panel doesn't open | Reload VS Code (`Cmd/Ctrl+Shift+P` → "Reload Window"). |
| + Agent button does nothing | Confirm `claude` is in PATH (`which claude`). |
| Character doesn't appear after spawning | Check Output → "Pixel Agents" for errors. |
| Permission bubbles never appear | Enable hooks (see [Enabling hooks](/use/workflows/enabling-hooks)). |

Full symptom-driven guide: [Troubleshooting](/use/vscode/troubleshooting).

## Next steps

- [How it works](./how-it-works) - the mental model behind what you just saw.
- [VS Code overview](/use/vscode/overview) - the full feature tour.
- [Concepts](/learn/concepts) - vocabulary you'll hit in the docs.
