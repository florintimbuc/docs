---
sidebar_position: 1
---

# Contributing

Pixel Agents is open source under MIT. Contributions welcome. This page is a brief on-site landing; the authoritative guide lives in the repo.

## The canonical guide

The full contributing guide is at [CONTRIBUTING.md in the repo](https://github.com/pixel-agents-hq/pixel-agents/blob/main/CONTRIBUTING.md). Read that first.

## Quick reference

| You want to | Go to |
|---|---|
| File a bug | [GitHub Issues](https://github.com/pixel-agents-hq/pixel-agents/issues) |
| Suggest a feature | [GitHub Discussions](https://github.com/pixel-agents-hq/pixel-agents/discussions) |
| Submit a PR | [CONTRIBUTING.md](https://github.com/pixel-agents-hq/pixel-agents/blob/main/CONTRIBUTING.md) |
| Add a provider | [/build/providers/adding-a-provider.md](/build/providers/adding-a-provider) |
| Add a client | [/build/clients/building-a-client.md](/build/clients/building-a-client) |
| Add an adapter | [/build/adapters/adding-an-adapter.md](/build/adapters/adding-an-adapter) |
| Publish an asset pack | [/build/assets/publishing-a-pack.md](/build/assets/publishing-a-pack) |
| Show off your pack on the site | [Showcase](./showcase) |
| Report a security issue | [Security policy](./security) |

## Project structure

Four sibling packages in one repo. Read the [architecture overview](/learn/architecture) before making structural changes.

- `core/` - types and contracts only.
- `server/` - runtime (Fastify + WebSocket + AgentRuntime + bundled providers).
- `adapters/` - host integrations (today: VS Code).
- `webview-ui/` - the React + canvas SPA.

## Before your first PR

1. **Read the architecture.** [/learn/architecture.md](/learn/architecture) and [/reference/state-management.md](/reference/state-management).
2. **Run the e2e suite locally.** `npm run e2e` from the repo root. If anything fails on a clean main, file a bug before adding new work. See [e2e tests](/maintainers/e2e-tests) for what the suite covers and how to add to it.
3. **Check open issues and PRs.** Avoid duplicating in-progress work. If you see something that interests you and there's no assignee, comment to claim it.
4. **For substantial changes, open a discussion first.** A 200-line PR is fast to review; a 2000-line PR is not. Surface large plans early.

## How PRs are reviewed

See [/maintainers/triage-flow.md](/maintainers/triage-flow) for the full maintainer perspective. The short version:

- Daily triage. Your PR will get a first look within a day or two on most weekdays.
- CI must be green. Type-check, lint, tests.
- One PR per logical change. Don't bundle a refactor + a feature + a bugfix.
- Conventional commits (`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`). The version bump on release is derived from these.
- Link the issue number in the description.

If your PR includes AI-generated code, read the [AI policy](/maintainers/ai-policy). AI is welcome; AI-fire-and-forget is not.

## Coding conventions

From the repo CLAUDE.md and `.claude/CLAUDE.md`:

- **TypeScript strict mode.** No `any`. Use `unknown` with type guards.
- **No `enum` keyword** (enforced by `erasableSyntaxOnly`). Use `as const` objects.
- **`.js` extensions on all relative imports** (Node16 module resolution).
- **`import type` for type-only imports** (enforced by `verbatimModuleSyntax` in webview).
- **All constants in centralized files**, not inline.
- **Try-catch with graceful degradation**; never crash the extension.
- **No em dashes in text**. Replace with commas or restructure.

Run `npm run check-types && npm run lint && npm test` before pushing. The CI runs all three.

## Local development

```sh
git clone https://github.com/pixel-agents-hq/pixel-agents
cd pixel-agents
npm install
cd webview-ui && npm install && cd ..
cd server && npm install && cd ..
npm run build
```

For the VS Code extension: open the repo in VS Code, press F5 to launch the Extension Development Host.

For the standalone CLI: `node server/dist/cli.js` after building, or use `npm run watch` for hot-reload during development.

## Documentation

Docs live in `docs/`. Each page is Markdown. Diataxis quadrant per page:

- **Tutorial** - learning by doing. The Start section.
- **How-to** - task completion. Use, Build.
- **Reference** - lookup. Reference, decision overviews.
- **Explanation** - understanding. Learn, ADRs.

If you're adding a feature, also add the relevant docs page(s) in the same PR.

## Issue templates

The repo provides issue templates at `.github/ISSUE_TEMPLATE/`. Use the right one (bug, feature request, etc.) - the template ensures you include the info maintainers need.

For bug reports, especially include:

- Pixel Agents version (Marketplace shows it; standalone: `pixel-agents --version` if implemented, otherwise check `package.json`).
- OS and version.
- VS Code version (if applicable).
- Hooks enabled / disabled.
- Steps to reproduce.
- Expected vs actual behavior.

## Code of conduct

By contributing, you agree to follow the [Code of Conduct](./code-of-conduct).

## License

By contributing, you agree your contributions are licensed under MIT (the project's license).

## Maintainers

Listed in [MAINTAINERS.md](https://github.com/pixel-agents-hq/pixel-agents/blob/main/MAINTAINERS.md) on GitHub. Original author: Pablo de Lucca.

For larger conversations, the maintainer team is on Discord (linked in the repo README).

## Thanks

Asset attribution:

- Character art derived from JIK-A-4's "Metro City" pack.
- Furniture from Donarg's "Office Interior Tileset (16x16)" (imported via `npm run import-tileset` - the bundled pack is the small fallback).

Pixel Agents stands on a lot of shoulders. Thanks for adding yours.

## Related (on this site)

- [Code of Conduct](./code-of-conduct)
- [Governance](./governance)
- [Security policy](./security)
- [Roadmap](./roadmap)
- [Showcase](./showcase)
