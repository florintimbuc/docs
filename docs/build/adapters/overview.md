---
sidebar_position: 1
title: Overview
---

# Adapters

An Adapter integrates the Pixel Agents runtime into a specific host environment: an IDE, an Electron shell, a container. Adapters are the only part of the codebase that touches host-specific APIs (VS Code commands, JetBrains plugin SDK, etc.). The runtime (`server/`) and the protocol (`core/`) stay host-agnostic.

For the architectural reasoning, see [Decision 0001: Four-package split](/decisions/four-package-split).

## What an Adapter does

Concretely, an adapter:

1. Picks a **namespace** (`'vscode'`, `'standalone'`, future: `'jetbrains'`, etc.).
2. Constructs a `FileStateAdapter` (or its own `StateAdapter` implementation).
3. Wraps the host's terminal API as an `ITerminalAdapter` (if the host has terminals).
4. Constructs an `AgentStateStore`, an `AgentRuntime`, and a `PixelAgentsServer` in embedded mode.
5. Registers platform-specific lifecycle callbacks (e.g. "when an agent is removed, also remove its terminal").
6. Exposes host-specific UI: commands, settings panels, panel registration.

The boundary is sharp. Everything host-specific lives here. Everything host-independent lives in `server/`.

## What ships today

Only `adapters/vscode/`.

- `extension.ts` - entry point, calls `activate()` and `deactivate()`. Constructs the `FileStateAdapter` and the `PixelAgentsViewProvider`.
- `PixelAgentsViewProvider.ts` - VS Code `WebviewViewProvider` implementation. Owns the webview lifecycle, message dispatch, asset loading, terminal management.
- `vscodeTerminalAdapter.ts` - the entire `ITerminalAdapter` impl is ~13 lines (see [terminal-adapter.md](./terminal-adapter)).
- `migrateVsCodeState.ts` - one-time migration of legacy `workspaceState` / `globalState` into `~/.pixel-agents/`. Idempotent, runs every activation, verifies file writes before clearing legacy keys.
- `constants.ts` - VS Code-specific identifiers (view IDs, command IDs, config keys).

## The interfaces an adapter implements

### `StateAdapter`

Persistence boundary. Defined at `core/src/adapter.ts:15-28`:

```ts
export interface StateAdapter {
  loadAgents(): PersistedAgent[];
  saveAgents(agents: PersistedAgent[]): void;
  loadSeats(): Record<string, { palette?; hueShift?; seatId? }>;
  saveSeats(seats): void;
  getSetting<T>(key: string, defaultValue: T): T;
  setSetting<T>(key: string, value: T): void;
}
```

Adapters can implement `StateAdapter` from scratch, but most should compose `FileStateAdapter` (which lives in `server/`) with a host-specific namespace. See [state-adapter.md](./state-adapter) for details.

Layout persistence is intentionally **not** in this interface. Layout lives in `~/.pixel-agents/layout.json` and is handled by `server/src/layoutPersistence.ts` directly. Every adapter shares the same layout file (cross-host sync is desirable).

### `ITerminalAdapter`

Terminal boundary. Defined at `core/src/terminalAdapter.ts:13-16`:

```ts
export interface ITerminalAdapter {
  activeTerminal(): TerminalHandle | undefined;
  allTerminals(): TerminalHandle[];
}

export interface TerminalHandle {
  name: string;
}
```

Minimal. The runtime only uses `.name` to match terminals to agents during heuristic adoption. Hosts without terminals (the standalone server) simply don't provide an `ITerminalAdapter`; the heuristic adoption path is skipped.

See [terminal-adapter.md](./terminal-adapter).

## Why `FileStateAdapter` lives in `server/`

`FileStateAdapter` is the shared implementation reused by both VS Code and standalone. Putting it in `server/` lets both adapters import it without each having to reimplement file I/O.

The interface (`StateAdapter`) lives in `core/`, but the implementation is in `server/` because:

1. It does file I/O (`fs.readFileSync`, `fs.writeFileSync`).
2. It's the same file regardless of host.
3. Both bundled adapters use it; future adapters can opt to use it or implement their own.

If you build an adapter that needs different persistence (e.g. browser localStorage for a mock test harness), write your own `StateAdapter` and use it instead.

## Namespaces

Each adapter that uses `FileStateAdapter` picks a unique `namespace` string:

```ts
new FileStateAdapter({ namespace: 'vscode' });
new FileStateAdapter({ namespace: 'standalone' });
new FileStateAdapter({ namespace: 'jetbrains' });  // future
```

The namespace determines:

- The state file path: `~/.pixel-agents/<namespace>-state.json`.
- The settings section key: `config.json[<namespace>]`.

Layout stays cross-namespace at `~/.pixel-agents/layout.json`. See [Decision 0005: Namespaced persistence](/decisions/namespaced-persistence).

## What's next

- [Adding an Adapter](./adding-an-adapter) - step-by-step walkthrough for a new IDE host.
- [Terminal adapter contract](./terminal-adapter)
- [State adapter contract](./state-adapter)

For consumers, see [/learn/architecture.md](/learn/architecture) for the high-level picture and [/reference/state-management.md](/reference/state-management) for the deep dive on the classes adapters compose.
