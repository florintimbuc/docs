---
sidebar_position: 2
---

# Install

Two surfaces ship today: the VS Code extension and the standalone CLI. They use the same runtime; pick whichever fits your workflow. Both can run side by side on the same machine.

## System requirements

- **Operating system:** macOS, Linux, or Windows.
- **Node.js:** version 22 or newer (pinned in `.nvmrc` for development; runtime supports 18+ but 22 is recommended). Required by the standalone CLI; not by the VS Code extension if you only use VS Code.
- **VS Code:** 1.105.0 or newer (per `package.json` engines).
- **Claude Code CLI:** install separately if you plan to use Pixel Agents with Claude. Pixel Agents visualizes existing Claude sessions; it doesn't bundle the CLI.
- **Disk:** under 20 MB for the extension; standalone is similar.

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

## Option C: Standalone CLI (`npx`)

Run a local server with a browser SPA. No IDE required.

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
3. A terminal opens running `claude --session-id <uuid>`.
4. Within 2 seconds a character should appear in the office.

**Standalone:**
1. `npx pixel-agents` from a project directory.
2. Open the printed URL in a browser.
3. In a separate terminal, run `claude`.
4. Within ~3 seconds a character should appear.

If the character doesn't appear, see [troubleshooting](/use/troubleshooting).

## Optional: install Claude Code Hooks

The visualization works without hooks (it uses file-watching fallback), but enabling hooks makes detection instant and removes the occasional false-positive permission bubble.

1. Open the Pixel Agents settings (gear icon).
2. Toggle "Hooks enabled" on.
3. The extension writes hook entries into `~/.claude/settings.json` and copies the hook script to `~/.pixel-agents/hooks/claude-hook.js`.

See [Enabling hooks](/use/workflows/enabling-hooks) for the detail.

## Optional: import a tileset

Pixel Agents ships with a small bundled tileset (basic furniture, characters, floor/wall patterns). For the full experience, the project documents a 7-stage asset pipeline to import third-party tilesets:

```sh
npm run import-tileset
```

See [Bring your own assets](/use/workflows/external-assets).

## Uninstall

**VS Code Marketplace / Open VSX:** Extensions view → find Pixel Agents → click the gear → Uninstall.

**Global npm:** `npm uninstall -g pixel-agents`.

**Cleanup (any install):** `rm -rf ~/.pixel-agents` removes layout, agent state, and the hook script. The extension does not modify `~/.claude/settings.json` on uninstall by default; if you had hooks enabled, manually remove the `pixel-agents.*` hook entries from `~/.claude/settings.json`.

## Next

- [Quickstart: VS Code](./quickstart-vscode)
- [Quickstart: Standalone](./quickstart-standalone)
- [How it works](./how-it-works)
