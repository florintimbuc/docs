---
sidebar_position: 5
---

# FAQ

Frequently asked questions about Pixel Agents. For symptom-driven debugging, see [Troubleshooting](./troubleshooting). For deeper "how do I do X" guides, see [Use](.).

## Basics

### What does Pixel Agents do?

It turns the AI coding agents running in your terminals (Claude Code today, others later) into animated pixel-art characters in a tiny office. Each character maps 1:1 to one agent session. They walk to their desks, type when the agent is writing or running tools, read when it's searching, and show a permission bubble when waiting for your input.

### Do I need an Anthropic / OpenAI account?

You need whatever account the AI CLI you're using requires. Pixel Agents itself doesn't talk to any AI API. It only watches what your local CLI is doing.

For Claude Code, an Anthropic account is required (per Claude Code's own setup).

### Does it work without Claude Code?

Today, no. Claude Code is the only bundled provider. The codebase has a `HookProvider` interface designed to support multiple AI CLIs; future support for Codex, Goose, Copilot, etc. is planned but not shipped.

If you're a developer interested in adding a provider, see [Adding a Provider](/build/providers/adding-a-provider).

### Is it free?

Yes. MIT license. No paid tiers, no telemetry that sends data anywhere.

### Does it send data anywhere?

No. The server binds to `127.0.0.1` (loopback only). Hook events go from Claude to our local server. No outbound network calls.

The bundled tileset comes from a $2 itch.io pack you can buy and import separately; the small bundled fallback set is included for free.

## Installation

### How do I install on VS Code?

Marketplace search "Pixel Agents" → Install. See [Install](/start/install).

### How do I install on JetBrains / Cursor / Zed?

Today: not bundled. The architecture supports adapters for any host (see [Building an Adapter](/build/adapters/adding-an-adapter)) but no JetBrains/Zed adapter has shipped yet.

For Cursor (which is VS Code-derivative), the VS Code Marketplace extension may work; not officially tested.

For a browser-only experience, use `npx pixel-agents` and any browser.

### Does it work on Windows?

Yes. Pixel Agents is primarily tested on Windows 11, with macOS and Linux as also-supported. File watching uses `fs.watch` with a 500ms polling fallback for Windows reliability.

### Does it work on Linux?

Yes. The standalone CLI works on any Linux with Node 18+.

### Does it work on macOS?

Yes. Tested on recent macOS versions.

### What VS Code version do I need?

1.105.0 or newer. Older VS Code may work with older Pixel Agents releases (check Marketplace version history).

### What Node version?

18+ for the standalone CLI. The `.nvmrc` pins development to 22. Most distros / nvm setups will be fine.

## Behavior

### Why do permission bubbles fire on tools that aren't waiting?

Heuristic mode (the file-watching fallback when hooks aren't enabled) uses a 7-second timer to guess. Slow tools like `WebFetch` can outlast the timer and trigger a false positive.

**Fix:** enable hooks. See [Enabling hooks](./workflows/enabling-hooks).

### Why don't characters appear instantly?

Without hooks, the JSONL polling has a 500ms-1000ms latency. With hooks, the spawn is instant. See [Hooks vs heuristic](/learn/hooks-vs-heuristic).

### Why does the office layout look weird after an update?

If the bundled default layout changed, your existing layout file should still be honored (it's separate from the bundled default). If your custom layout disappeared, check `~/.pixel-agents/layout.json` exists; if not, the layout reset to default.

### Why do two windows show the same agents twice?

Each VS Code window is its own "host" instance. Agents you spawn in window A appear in A as terminal-bound and in B as external. Both views are correct - the same Claude session is observed twice.

To consolidate, just use one window.

### Can I see agents from other VS Code workspaces?

By default no - the scanner watches the current workspace's project hash only. Toggle "Watch all sessions" in settings to see everything in `~/.claude/projects/`.

### Why does the chime fire even though I'm not waiting?

If you have multiple agents, any one of them hitting "waiting" state plays the chime. If you find this distracting, toggle off in Settings.

### Why don't I hear the chime at all?

The browser AudioContext is suspended until you click the canvas. Click anywhere in the office once; subsequent chimes will play.

If still nothing: check that "Sound notifications" is on in Settings.

## Hooks

### What are hooks?

The Claude Code Hooks API. Claude fires structured events on session lifecycle and tool activity. Pixel Agents installs a small script that POSTs those events to its local server for instant detection. See [Hooks vs heuristic](/learn/hooks-vs-heuristic).

### Should I enable hooks?

Yes, unless you have a specific reason not to. See [Enabling hooks](./workflows/enabling-hooks).

### What does enabling hooks modify?

Two files: `~/.claude/settings.json` (adds entries pointing at our hook script) and `~/.pixel-agents/hooks/claude-hook.js` (copies the script). Nothing else.

### Can I edit `~/.claude/settings.json` manually?

Yes. Pixel Agents merges its entries with yours. Your custom hooks for other tools are preserved.

### Will hooks break my Claude Code setup?

No. The entries are additive. If our hook script fails for any reason, Claude continues normally; the event is just not delivered to Pixel Agents.

## Agent Teams

### What's an Agent Team?

A Claude feature where a lead session spawns persistent teammates (via `Agent(... run_in_background: true)`). Pixel Agents shows each teammate as its own character. See [Agent Teams (Learn)](/learn/agent-teams).

### How do I spawn a team?

In a Claude session, ask Claude to spawn teammates. The exact phrasing isn't fixed; Claude knows how to use the `Agent` tool with `run_in_background: true`. See [Using Agent Teams](./workflows/using-agent-teams).

### Why are all my teammates the same color?

They share the lead's palette with subtly different hue shifts. The team is visually grouped intentionally.

### Why don't permission bubbles appear on teammates?

They do, but the prompt itself fires on the lead's terminal (Claude's permission flow is lead-driven). With hooks enabled, the bubble is correctly routed to the teammate. Without hooks, the routing falls back to the lead.

## Layout

### How do I customize the office?

Click "Layout" in the bottom toolbar to enter edit mode. See [Layout editor](./vscode/layout-editor).

### Where does the layout save?

`~/.pixel-agents/layout.json`. Shared across all hosts (VS Code, standalone, future).

### Can I share layouts with others?

Yes. Settings → Export Layout writes a JSON file you can send to someone else. They run Settings → Import Layout to load it.

### Can I undo a layout change?

50-level undo. Ctrl/Cmd+Z. Persists within an edit session, lost on save (the undo stack resets when you save).

### Can I shrink the grid?

Not directly. You can expand only. To "shrink" visually, paint VOID tiles around the perimeter you don't want.

## Assets

### Where do the bundled assets come from?

Character sprites are based on JIK-A-4's "Metro City" pack. The bundled furniture set is small and free. The full furniture catalog requires importing the "Office Interior Tileset (16x16)" by Donarg ($2 on itch.io) via `npm run import-tileset`.

### Can I use other tilesets?

Yes. Either import them via the 7-stage pipeline (`npm run import-tileset`) or add a directory of custom assets via Settings → Add Asset Directory. See [External assets](./workflows/external-assets).

### Why does my custom furniture not appear?

Check the directory contains a `furniture/` folder with per-item subdirectories, each holding a `manifest.json` plus its PNGs. See [External assets > Validating a pack](./workflows/external-assets).

## Performance

### Will Pixel Agents slow down VS Code?

Negligibly. The render loop is throttled to requestAnimationFrame and the canvas is small. File watching uses a 500ms poll fallback. Memory usage is on the order of tens of MB.

### Does it consume tokens?

No. Pixel Agents doesn't talk to Claude's API. It watches what your local Claude process is already doing.

### Why does my CPU spike sometimes?

Asset loading at startup (decoding PNGs into SpriteData) is a brief CPU spike. After that, it should be near-idle.

If you see ongoing high CPU, that's a bug - file an issue with the steps to reproduce.

## Privacy and security

### Does Pixel Agents read my code?

It reads the JSONL transcripts at `~/.claude/projects/<hash>/<session>.jsonl`. These contain tool inputs (file paths, command strings, prompt text). Everything stays local; nothing is uploaded.

If you ran Claude with `--dangerously-skip-permissions` and Claude read sensitive files, those file paths appear in the JSONL and therefore in Pixel Agents' parsed activity. Pixel Agents doesn't display file contents, just the tool name and a truncated input.

### Are the WebSocket connections secured?

In VS Code (embedded mode), yes - WebSocket requires a Bearer token. In standalone, WebSocket has no auth because the server binds to 127.0.0.1 (loopback only). Hooks always require Bearer.

For details, see [Discovery and auth](/build/clients/discovery-and-auth).

### Can other apps on my machine see Pixel Agents data?

Other processes on the same machine can read `~/.pixel-agents/server.json` and connect to the loopback WebSocket (in standalone mode). The standalone server doesn't authenticate WebSocket clients; the loopback boundary is the security model.

If you don't trust other processes on your machine, run in VS Code embedded mode (which does authenticate) or use OS-level sandboxing.

### Does Pixel Agents collect telemetry?

No.

## Contributing

### How do I contribute?

See [Contributing](/community/contributing). PRs welcome.

### How do I add a new provider?

See [Adding a Provider](/build/providers/adding-a-provider).

### How do I build my own client?

See [Building a Client](/build/clients/building-a-client).

### How do I add my own asset pack?

See [Publishing an asset pack](/build/assets/publishing-a-pack).

## Project

### Who maintains Pixel Agents?

The maintainers are listed in [MAINTAINERS.md](https://github.com/pixel-agents-hq/pixel-agents/blob/main/MAINTAINERS.md) on GitHub. The original author is Pablo de Lucca.

### What's the license?

MIT. See [LICENSE](https://github.com/pixel-agents-hq/pixel-agents/blob/main/LICENSE).

### Where can I report bugs?

GitHub Issues: [github.com/pixel-agents-hq/pixel-agents/issues](https://github.com/pixel-agents-hq/pixel-agents/issues).

### Where can I ask questions?

GitHub Discussions: [github.com/pixel-agents-hq/pixel-agents/discussions](https://github.com/pixel-agents-hq/pixel-agents/discussions).

### What's on the roadmap?

See [Roadmap](/community/roadmap).

## Related

- [Troubleshooting](./troubleshooting) - symptom-driven debug guide.
- [Hooks vs heuristic](/learn/hooks-vs-heuristic) - the most-asked technical question.
- [Concepts](/learn/concepts) - vocabulary.
