---
sidebar_position: 2
---

# ADR-0001: Four-package split

**Status:** Accepted
**Date:** 2026-05-26
**Deciders:** Pixel Agents core team
**Related:** [Architecture overview](/learn/architecture), [ADR-0004 AgentRuntime](./agentruntime-as-shared-lifecycle-core), [State management reference](/reference/state-management)

## Context

Pre-refactor (before the work that landed in #273), the entire codebase lived under `src/`. The extension host code, the React webview, the asset pipeline, and the message-protocol shapes were all siblings in one TypeScript project. VS Code APIs (`import * as vscode from 'vscode'`) were imported anywhere they were convenient. Tests had to mock `vscode` globally to run.

This was fine while Pixel Agents only shipped as a VS Code extension. Two pressures changed that:

1. **Standalone mode.** The team wanted `npx pixel-agents` to launch a local server that serves a browser SPA. That server cannot import `vscode` (the module does not exist outside the extension host). Untangling the dependency in place would have meant edits across most of `src/`.
2. **Third-party clients and providers.** The community had asked about Codex, Goose, and Discord-bot integrations, plus an "embed-the-office-in-my-own-app" use case. None of those should need to read VS Code-specific code to learn the protocol.

A monolithic layout made these expansions structurally awkward. Untyped boundaries between subsystems also made it too easy to write code that worked in dev but broke in standalone.

## Decision

Split the repository into four sibling packages with strict dependency direction:

```
core/         types and contracts only        depends on: nothing
server/       runtime                         depends on: core/
adapters/     host integrations               depends on: core/, server/
webview-ui/   React SPA + canvas renderer     depends on: core/ (types only)
```

- `core/` contains type-only modules: `AgentEvent` and `HookProvider` (`core/src/provider.ts`), `TeamProvider` (`core/src/teamProvider.ts`), `StateAdapter` (`core/src/adapter.ts`), `ITerminalAdapter` (`core/src/terminalAdapter.ts`), `MessageTransport` (`core/src/transport.ts`), `ServerMessage`/`ClientMessage` (`core/src/messages.ts`, auto-generated from `core/asyncapi.yaml`), and the data schemas (`core/src/schemas.ts`). The public surface is the small list at `core/src/index.ts:4-27`.
- `server/` contains the Fastify HTTP + WebSocket server (`server/src/httpServer.ts`), `AgentRuntime` (the lifecycle core, `server/src/agentRuntime.ts:48`), `AgentStateStore` (`server/src/agentStateStore.ts:19`), `HookEventHandler`, `SessionRouter`, `DismissalTracker`, `FileStateAdapter`, layout/config persistence helpers, and the bundled providers (`server/src/providers/`). It also contains the standalone CLI entry point (`server/src/cli.ts`).
- `adapters/` contains host integrations. Today: `adapters/vscode/` with `extension.ts`, `PixelAgentsViewProvider.ts`, `VscodeTerminalAdapter`, and `migrateVsCodeState.ts`. Future: JetBrains plugin, Zed extension, custom Electron shells.
- `webview-ui/` contains the React 19 + Vite app: canvas renderer, character FSM, layout editor, asset cache. It depends on `core/` for type imports only. At runtime it talks to `server/` over the wire (WebSocket in standalone, postMessage in VS Code).

The build pipeline coordinates the four targets (esbuild for the extension and the hook script, Vite for the webview, tsc for server type-check, etc.). The top-level `package.json` orchestrates them.

## Consequences

**Positive.**

- Standalone mode became possible. The same `server/` runs in both contexts. Embedded mode adds VS Code-specific glue; standalone mode adds Fastify's static-serving plugin and the SPA. Nothing else differs.
- Adding a new IDE host is a small task. The adapter only needs to implement `StateAdapter` (or reuse `FileStateAdapter`) and `ITerminalAdapter`, then construct an `AgentRuntime` and start `PixelAgentsServer` in embedded mode. The VS Code adapter at `adapters/vscode/extension.ts:14-40` is the reference.
- Tests against `server/` no longer need to mock VS Code. The Vitest suite at `server/__tests__/` runs in plain Node.
- Type contracts are visible. `ServerMessage`, `ClientMessage`, `AgentEvent`, and the provider interfaces have one home. Drift between consumers is caught at compile time.
- New providers ship inside `server/src/providers/`. They reference `core/` interfaces, never `vscode`.

**Negative.**

- More `package.json` files to keep in sync. Adding a new dependency means thinking about which package needs it.
- The build pipeline coordinates four targets. The orchestration in `esbuild.js` and the top-level scripts is non-trivial.
- `server/src/types.ts:1` still has `import type * as vscode from 'vscode'` for the `Terminal` type referenced on `AgentState.terminalRef`. Standalone never sets the field, so this is an asymmetric dependency. It compiles because the adapter package has `vscode` available; standalone's `tsconfig` includes the same path mapping. Cleaning this up is a known wart, not a structural problem.
- The four-package layout is heavier for small contributors. A first-time PR fixing a typo in a webview file needs to understand which package it lives in.

## Alternatives considered

- **Single package with conditional imports.** Rejected: nothing in TypeScript enforces "do not import `vscode` in this file." Eventually a contributor would slip a `vscode` import into a server-tier file and break standalone with no warning.
- **Monorepo with npm workspaces.** A future option. Today the four directories are sibling packages in one repo, coordinated by the top-level `package.json`. Workspaces would formalize that and let each package declare its own dependencies cleanly. The migration is cheap once it is worth doing.
- **Standalone as a separate repo.** Rejected because the shared `core/` types and the bundled providers would need to be published independently and version-pinned. Drift becomes near-certain on any rapid-iteration cycle.
- **Three packages instead of four (merging `adapters/` into `server/`).** Rejected because the dependency direction would be unclear, and the VS Code adapter would silently pull `vscode` into a package that otherwise has no host-specific code.

## Migration notes

The refactor was a single PR (#273) rather than an incremental sequence, because the imports needed to move atomically. Each package's `tsconfig.json` was set up to refuse cross-package imports that violate the dependency direction; the build failed loudly if anything slipped through.

`adapters/vscode/migrateVsCodeState.ts` runs on every extension activate and copies legacy `workspaceState` / `globalState` entries into the new file-based state. It verifies file writes before clearing the legacy keys, so a disk error cannot result in state loss.

## Open questions

- When the second bundled provider ships, do we keep all providers under `server/src/providers/` or move provider packages out so they can be installed à la carte? Today the registry (`server/src/providers/index.ts`) is a hardcoded re-export list. A plugin registry is a future decision.
- Do we add `webview-ui/` to npm workspaces so client-side dependencies can be hoisted? Not a blocker today; revisit when adding additional clients.
