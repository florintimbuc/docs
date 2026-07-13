---
sidebar_position: 2
---

# Install

Pixel Agents is currently available as a **VS Code extension** and as a **standalone local web app** launched from the command line (`npx pixel-agents` starts a local server and serves the office in your browser). Both use the same runtime, and they can run side by side on the same machine.

There are five ways to get it, covered below:

- **[VS Code Marketplace](#option-a-vs-code-marketplace)** - the most popular install, for VS Code users.
- **[Open VSX](#option-b-open-vsx-vscodium-theia-etc)** - the same extension, for Cursor, VSCodium, Theia, and other VS Code derivatives.
- **[npx](#option-c-standalone-via-npx)** - run the standalone app with a single command, nothing to install.
- **[Global npm install](#option-d-global-npm-install)** - a permanent `pixel-agents` command on your PATH.
- **[From source](#option-e-from-source)** - for contributors and anyone wanting the bleeding edge.

## System requirements

Shared across all options:

- **Operating system:** macOS, Linux, or Windows.
- **An AI agent CLI:** today that's mainly [Claude Code](https://docs.claude.com/en/docs/claude-code/setup) - install and authenticate it separately. Pixel Agents visualizes existing agent sessions; it doesn't bundle the agent. Support for more agents arrives via [providers](/build/providers/overview).
- **Disk:** under 20 MB.

Each option adds its own requirement:

- **VS Code extension (options A and B):** [VS Code](https://code.visualstudio.com/) 1.105.0 or newer, or a compatible derivative. No Node.js needed.
- **Standalone (options C and D):** Node.js 18 or newer (22 recommended).
- **From source (option E):** Node.js 22 (pinned in `.nvmrc`) and git.

## Option A: VS Code Marketplace

The most popular install.

1. Open VS Code.
2. Open the Extensions sidebar (`Cmd/Ctrl+Shift+X`).
3. Search for **Pixel Agents**.
4. Click Install.

That's it. Open the Pixel Agents panel via `Cmd/Ctrl+Shift+P` then "Pixel Agents: Show Panel" and you're set.

The Marketplace listing is at [marketplace.visualstudio.com/items?itemName=pablodelucca.pixel-agents](https://marketplace.visualstudio.com/items?itemName=pablodelucca.pixel-agents).

## Option B: Open VSX (VSCodium, Theia, etc.)

For VS Code-derivative editors that don't use the Microsoft Marketplace:

1. Open the Extensions view.
2. Search for **Pixel Agents** on Open VSX.
3. Install.

Open VSX maintains the same release versions as the Microsoft Marketplace.

## Option C: Standalone via npx

Run a local server with a browser UI. No IDE required.

```sh
npx pixel-agents
```

The first invocation downloads the package; subsequent runs start instantly. Open the printed URL (default `http://127.0.0.1:3100/`) in any modern browser.

For installation options, custom ports, and host binding details see [Running the server](/use/standalone/running-the-server).

## Option D: Global npm install

If you prefer a permanent local binary:

```sh
npm install -g pixel-agents
pixel-agents
```

Then `pixel-agents` is in your PATH. Behaves identically to `npx pixel-agents`.

## Option E: From source

For contributors or anyone wanting the bleeding edge.

```sh
git clone https://github.com/pixel-agents-hq/pixel-agents.git
cd pixel-agents
npm install
cd webview-ui && npm install && cd ..
cd server && npm install && cd ..
npm run build
```

Then either:

- Press F5 in VS Code (with the repo open) to launch the Extension Development Host.
- `node server/dist/cli.js` to run the standalone server with your local build.

See [CONTRIBUTING.md](https://github.com/pixel-agents-hq/pixel-agents/blob/main/CONTRIBUTING.md) for the contributor workflow.

## Verifying the install

After installing, verify by running an AI agent and watching the office.

**VS Code:**
1. Open the Pixel Agents panel.
2. Click "+ Agent" in the bottom toolbar.
3. A terminal opens running the agent (`claude --session-id <uuid>`).
4. Within 2 seconds a character should appear in the office.

**Standalone:**
1. `npx pixel-agents` from a project directory.
2. Open the printed URL in a browser.
3. In a separate terminal, run `claude`.
4. Within ~3 seconds a character should appear.

If the character doesn't appear, see [troubleshooting](/use/troubleshooting).

## Hooks are on by default

Pixel Agents installs agent hooks by default: it writes hook entries into `~/.claude/settings.json` and copies its hook script to `~/.pixel-agents/hooks/claude-hook.js`. Hooks make activity detection instant and reliable.

If you prefer not to use hooks, toggle "Hooks enabled" off in the Pixel Agents settings (gear icon); the visualization then falls back to file watching, which is slightly delayed and can occasionally show a false-positive permission bubble.

See [Enabling hooks](/use/workflows/enabling-hooks) for the detail.

## Uninstall

**VS Code Marketplace / Open VSX:** Extensions view → find Pixel Agents → click the gear → Uninstall.

**Global npm:** `npm uninstall -g pixel-agents`.

**Cleanup (any install):** `rm -rf ~/.pixel-agents` removes layout, agent state, and the hook script. The extension does not modify `~/.claude/settings.json` on uninstall by default; if you had hooks enabled, manually remove the `pixel-agents.*` hook entries from `~/.claude/settings.json`.

## Next

- [Quickstart: VS Code](./quickstart-vscode)
- [Quickstart: Standalone](./quickstart-standalone)
- [How it works](/learn/how-it-works)
