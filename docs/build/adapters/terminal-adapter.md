---
sidebar_position: 3
---

# `ITerminalAdapter` Contract

The interface adapters implement to expose host terminals to the runtime. Defined at `core/src/terminalAdapter.ts`.

## Interface

```ts
// core/src/terminalAdapter.ts
export interface TerminalHandle {
  name: string;
}

export interface ITerminalAdapter {
  activeTerminal(): TerminalHandle | undefined;
  allTerminals(): TerminalHandle[];
}
```

That's all of it. Two methods, one tiny handle type.

## Why so minimal

The runtime's heuristic terminal-adoption logic only needs to know:

1. Which terminal is focused right now (`activeTerminal`).
2. The list of all open terminals (`allTerminals`).

And for each terminal, only the `name` is required. The adoption logic matches a freshly-detected JSONL file to a terminal whose name starts with the active provider's terminal name prefix (`HookProvider.terminalNamePrefix`, e.g. `'claude'`).

VS Code's full `vscode.Terminal` type has many fields and methods (`processId`, `creationOptions`, `sendText`, `show`, `dispose`, etc.). The runtime never uses them, so the interface intentionally exposes only the property it needs.

## Reference implementation

The entire VS Code implementation is 13 lines:

```ts
// adapters/vscode/vscodeTerminalAdapter.ts
import * as vscode from 'vscode';

import type { ITerminalAdapter, TerminalHandle } from '../../core/src/terminalAdapter.js';

/** VS Code implementation of ITerminalAdapter. Wraps vscode.window terminal access. */
export class VscodeTerminalAdapter implements ITerminalAdapter {
  activeTerminal(): TerminalHandle | undefined {
    return vscode.window.activeTerminal;
  }

  allTerminals(): TerminalHandle[] {
    return [...vscode.window.terminals];
  }
}
```

This works because `vscode.Terminal` already has a `name` property, so it's structurally compatible with `TerminalHandle`. For hosts whose terminal type doesn't have a `name` field, wrap explicitly:

```ts
export class JetBrainsTerminalAdapter implements ITerminalAdapter {
  activeTerminal(): TerminalHandle | undefined {
    const t = TerminalToolWindowManager.getInstance().activeContent;
    return t ? { name: t.tabName } : undefined;
  }

  allTerminals(): TerminalHandle[] {
    return TerminalToolWindowManager.getInstance().allContents.map((t) => ({ name: t.tabName }));
  }
}
```

## Hosts without terminals

The standalone CLI doesn't have terminals. Its runtime is constructed without an `ITerminalAdapter`. The fileWatcher's terminal-adoption code paths check for the adapter's presence and skip themselves when absent.

If you're building a headless or browser-only adapter, omit the terminal adapter. The runtime will still detect external sessions (JSONL files appearing in `~/.claude/projects/<hash>/`), it just won't try to bind them to terminal references.

## When the runtime uses the adapter

The fileWatcher module accepts the adapter via a module-level setter (similar to `setHookProvider`, `setTeamProvider`). The adapter is queried during:

- **Project scan** - when a new JSONL appears in the workspace project directory, the scanner asks "is there an active terminal whose name matches?" If yes, the new agent is bound to that terminal (so closing the terminal closes the agent).
- **Focus events** - when the host signals a terminal focus change, the runtime uses `activeTerminal()` to find which agent should be selected.

In hook-only mode (every agent has `hookDelivered === true`), terminal adoption is mostly unnecessary because the hooks identify the session unambiguously. The adapter is still consulted for focus tracking.

## What `name` actually contains

Whatever the host calls the terminal. Examples:

- VS Code: the terminal's `name` is whatever was passed at creation, e.g. `'claude'` for terminals launched by the `+ Agent` button or `'zsh'` for default terminals.
- JetBrains: tab name (whatever the user named the terminal tab).
- Custom Electron: whatever the integrator chooses.

The provider's `terminalNamePrefix` (e.g. Claude's `CLAUDE_TERMINAL_NAME_PREFIX`) is used as a `startsWith` match, not equality. So a terminal named `'claude-agent-1'` will match prefix `'claude'`.

## Not in the interface

These are deliberately not part of `ITerminalAdapter`:

- **Sending text to a terminal.** The runtime never types into a terminal. Agents are launched via spawn (`buildLaunchCommand` in `HookProvider`), but that's a process spawn, not a terminal write.
- **Watching terminal output.** State comes from JSONL transcripts and hook events, not terminal stdout. Terminal output is not a Pixel Agents data source.
- **Terminal creation.** Spawning a new terminal is a host-specific concern. The VS Code adapter does it via `vscode.window.createTerminal`; the runtime is unaware.
- **Process IDs.** Could change in the future if the runtime grows process-aware features. Today not used.

## Related

- [Adapters overview](./overview)
- [Adding an Adapter](./adding-an-adapter)
- [State adapter contract](./state-adapter)
- VS Code reference impl: `adapters/vscode/vscodeTerminalAdapter.ts:5-13`
