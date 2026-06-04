---
sidebar_position: 4
---

# Quickstart: Standalone

Zero to your first agent in a browser in under 5 minutes. No IDE required.

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

The pixel-art office loads. No characters yet, because no Claude sessions are running.

## Step 3: Run Claude in another terminal

Open a second terminal in the same project directory and run:

```sh
claude
```

Claude starts an interactive session. Within ~3 seconds, a character appears in the browser office with the green matrix-rain reveal effect.

The character represents that Claude session. As you type prompts and Claude executes tools, the character animates: reading when Claude reads files, typing when Claude writes or runs commands, waiting (with a speech bubble) when Claude pauses for input.

## Step 4: Try a tool

In the Claude terminal, type:

```
read package.json and tell me what it does
```

Watch the browser:

- Character shifts to the reading animation while Read runs.
- Shifts to typing while Claude composes the response.
- Returns to idle when done.

If Claude asks for permission (e.g. to run a Bash command), the character shows a "..." amber speech bubble. A two-note chime plays. Approve in the terminal and the bubble disappears.

## Step 5: Add a second session

Open a third terminal in the same directory and run `claude` again. A second character appears in the browser with a different palette.

Both characters work independently. The browser is a real-time view of every Claude session in this project directory.

## What you just did

You ran a local server, opened a browser view, and watched two Claude sessions visualized side by side. No VS Code needed.

The standalone server is the same runtime that powers the VS Code extension. The transport is WebSocket instead of postMessage; everything else (asset loading, layout, character FSM, tool detection) is identical. See [the architecture page](/learn/architecture).

## What to try next

| Action | Where |
|---|---|
| Customize the office layout | "Layout" button in the bottom toolbar. See [Layout editor](/use/vscode/layout-editor) (the editor is the same in both surfaces). |
| Enable hooks for instant detection | Settings → "Hooks enabled". See [Enabling hooks](/use/workflows/enabling-hooks). |
| Run on a custom port | `npx pixel-agents --port 4000`. See [Running the server](/use/standalone/running-the-server). |
| Watch sessions from other directories too | "Watch all sessions" toggle in settings. |
| Run the server alongside VS Code | The VS Code extension detects a running standalone server via `~/.pixel-agents/server.json` and reuses it. |

## Stopping the server

In the terminal where `npx pixel-agents` is running, press `Ctrl+C`. The server cleans up timers, removes its `~/.pixel-agents/server.json` entry, and exits. Any browser tab will show the disconnected state.

If the terminal closed without graceful shutdown (kill -9, system crash), the next `npx pixel-agents` invocation detects the stale entry via PID check and starts fresh.

## If something didn't work

| Symptom | Quick check |
|---|---|
| `npx pixel-agents` fails to start | Port 3100 may be in use. Try `npx pixel-agents --port 4000`. |
| Server starts but browser shows blank page | Check terminal for "Assets loaded:" line. If 0 characters or 0 furniture, the install is corrupt. |
| Browser connects but no agents appear | The scanner watches the directory you launched from. Either re-launch from your project root, or enable "Watch all sessions" in settings. |
| Hooks not installing | See [Standalone troubleshooting](/use/standalone/troubleshooting). |

Full symptom-driven guide: [Standalone troubleshooting](/use/standalone/troubleshooting).

## Next steps

- [How it works](./how-it-works) - the mental model.
- [Standalone overview](/use/standalone/overview) - the full feature tour.
- [Running the server](/use/standalone/running-the-server) - CLI flags and lifecycle.
- [Concepts](/learn/concepts) - vocabulary.
