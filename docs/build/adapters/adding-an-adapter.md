---
sidebar_position: 2
---

# Adding an Adapter

:::warning[AI-generated docs]
This document was AI-generated and may have some mistakes - we apologize for this, we're in the process of reviewing all documents. If you find any issues, we'd be thankful if you [submit an edit PR](https://github.com/pixel-agents-hq/docs/edit/main/docs/build/adapters/adding-an-adapter.md).
:::

This is the step-by-step for wiring Pixel Agents into a new IDE host. The current draft uses a hypothetical "JetBrains" adapter as the example. The same pattern applies to Zed, custom Electron shells, or any other host with a terminal API and a webview-like surface.

For background, see [Adapters overview](./overview) and [Decision 0001: Four-package split](/decisions/four-package-split).

## What an adapter does

1. Picks a **namespace** for state persistence.
2. Constructs a `StateAdapter` (usually `FileStateAdapter`).
3. Implements `ITerminalAdapter` over the host's terminal API.
4. Constructs an `AgentStateStore`, an `AgentRuntime`, and a `PixelAgentsServer`.
5. Registers platform-specific lifecycle callbacks.
6. Exposes host-specific UI (commands, panels, settings).
7. Tears everything down cleanly on host shutdown.

## Step 1: Scaffold

Create a new directory under `adapters/`:

```
adapters/jetbrains/
  extension.ts                  // entry point
  JetBrainsTerminalAdapter.ts   // ITerminalAdapter impl
  migrateState.ts               // optional: legacy-data migration
  constants.ts                  // host-specific IDs
  PluginPanelProvider.ts        // host webview equivalent
```

The exact files depend on the host's plugin SDK conventions. The `adapters/vscode/` layout is the reference; copy it and rename where it makes sense.

## Step 2: Choose a namespace

Pick a short, lowercase string that doesn't collide with `'vscode'` or `'standalone'`. Suggested: the IDE's official name, lowercased, no spaces.

```ts
const NAMESPACE: ConfigNamespace = 'jetbrains';
```

This determines:

- State file: `~/.pixel-agents/jetbrains-state.json`
- Settings section: `~/.pixel-agents/config.json` under `[jetbrains]`

For the rationale see [Decision 0005: Namespaced persistence](/decisions/namespaced-persistence).

Note: `ConfigNamespace` is a string-literal union (`'vscode' | 'standalone'`). Adding a new namespace today means updating that union in `server/src/configPersistence.ts`. Until that's a more open type, expect to add your literal.

## Step 3: Construct the StateAdapter

Use the bundled `FileStateAdapter` (recommended):

```ts
import { FileStateAdapter } from '../../server/src/fileStateAdapter.js';

const adapter = new FileStateAdapter({ namespace: 'jetbrains' });
```

If your host insists on owning its own persistence (some IDEs have opinionated state stores), implement `StateAdapter` from scratch. See [state-adapter.md](./state-adapter) for the full contract.

## Step 4: Implement ITerminalAdapter

Wrap the IDE's terminal API. The interface is tiny (`core/src/terminalAdapter.ts:13-16`):

```ts
import type { ITerminalAdapter, TerminalHandle } from '../../core/src/terminalAdapter.js';

export class JetBrainsTerminalAdapter implements ITerminalAdapter {
  activeTerminal(): TerminalHandle | undefined {
    // Translate JetBrains' active terminal to a TerminalHandle
    const t = TerminalToolWindowManager.getInstance().activeContent;
    return t ? { name: t.tabName } : undefined;
  }

  allTerminals(): TerminalHandle[] {
    return TerminalToolWindowManager.getInstance().allContents.map((t) => ({ name: t.tabName }));
  }
}
```

Only `.name` is required. The runtime uses it for heuristic terminal adoption (matching VS Code terminals named `claude` to spawned Claude sessions). Hosts without terminals can skip this entirely.

See `adapters/vscode/vscodeTerminalAdapter.ts` for the reference impl (13 lines).

## Step 5: Construct the runtime

The order matters: adapter → store → store.setAdapter → runtime → server.

```ts
import { AgentStateStore } from '../../server/src/agentStateStore.js';
import { AgentRuntime } from '../../server/src/agentRuntime.js';
import { PixelAgentsServer } from '../../server/src/server.js';
import { claudeProvider, copyHookScript } from '../../server/src/providers/index.js';

const adapter = new FileStateAdapter({ namespace: 'jetbrains' });
const store = new AgentStateStore();
store.setAdapter(adapter);

const runtime = new AgentRuntime(store, claudeProvider);

const server = new PixelAgentsServer();
server.onHookEvent((providerId, event) => {
  runtime.handleHookEvent(providerId, event);
});

const config = await server.start({
  store,
  runtime,
  embedded: true,             // ephemeral port + WebSocket auth + no static serve
  host: '127.0.0.1',
  // port omitted → auto-assign
  // staticDir, assetCache, onSetHooksEnabled all omitted in embedded mode
});
```

Embedded mode means:
- WebSocket connections require `Authorization: Bearer <token>` (`server/src/httpServer.ts:139-148`).
- No static SPA serving (the host renders the webview itself).
- Logging is quieter (`server/src/httpServer.ts:55`).

## Step 6: Sync runtime refs with persisted settings

Without this, scanners run with default config (`hooksEnabled: true`, `watchAllSessions: false`) until the user toggles them in the UI:

```ts
runtime.hooksEnabled.current = adapter.getSetting('pixel-agents.hooksEnabled', true);
runtime.watchAllSessions.current = adapter.getSetting('pixel-agents.watchAllSessions', false);
```

Compare to the standalone implementation at `server/src/cli.ts:128-130`.

## Step 7: Install hooks on startup (optional)

If `hooksEnabled` is on, install the bundled hooks:

```ts
if (runtime.hooksEnabled.current) {
  try {
    await claudeProvider.installHooks(`http://127.0.0.1:${config.port}`, config.token);
    copyHookScript(distRoot);  // copies dist/hooks/claude-hook.js to ~/.pixel-agents/hooks/
  } catch (err) {
    console.error('[Pixel Agents] Failed to install hooks:', err);
  }
}
```

`distRoot` is the directory containing your adapter's bundled distribution (where the hook script lives after esbuild). For VS Code that's `dist/`; for a JetBrains plugin it's wherever the IDE unpacks the plugin's resources.

## Step 8: Start project scanning

```ts
const projectDirs = claudeProvider.getSessionDirs?.(workspacePath);
if (projectDirs && projectDirs[0]) {
  const projectDir = projectDirs[0];
  runtime.startProjectScan(projectDir);
  runtime.startExternalScanning(projectDir);
  runtime.startStaleCheck();
}
```

`workspacePath` is the IDE's notion of the current project root. For VS Code it comes from `vscode.workspace.workspaceFolders`; for JetBrains it's the project base path.

## Step 9: Bridge the UI

The webview talks to the server. The bridging strategy depends on what your host offers:

**Webview-style host (VS Code, JetBrains JCEF)**: render a webview pointing at the embedded server's `http://127.0.0.1:<port>/` URL. The webview connects WebSocket with the Bearer token.

**Native UI host (Swift, Kotlin)**: code against the same `ServerMessage` / `ClientMessage` types directly. See [building-a-client.md](../clients/building-a-client) for the multi-language walkthrough.

**No UI host (headless test harness)**: skip the webview; the runtime still works.

## Step 10: Register host-specific commands

Each host has its own command palette / menu API. Wire commands like "Open Pixel Agents Panel" through the host's API, calling into your adapter. Example from `adapters/vscode/extension.ts:30-39`:

```ts
context.subscriptions.push(
  vscode.commands.registerCommand(COMMAND_SHOW_PANEL, () => {
    vscode.commands.executeCommand(`${VIEW_ID}.focus`);
  }),
);
```

## Step 11: Wire lifecycle callbacks

If your host needs to do anything on agent removal (close terminals, free resources), register a callback:

```ts
runtime.setLifecycleCallbacks({
  onAgentRemoved: (agentId, agent) => {
    // Host-specific cleanup
    if (agent.terminalRef) {
      // E.g. close the JetBrains terminal tab
    }
  },
  onTeammateRemoved: (teammateId, agent, source) => {
    // Log, notify, etc.
  },
});
```

## Step 12: Shutdown

On host shutdown, dispose in this order:

```ts
function deactivate() {
  runtime.dispose();
  server.stop();
}
```

`runtime.dispose()` (server/src/agentRuntime.ts:415-435) tears down all scanners, timers, and agents. `server.stop()` closes the Fastify server and deletes `server.json` if this process owned it.

## Optional: Legacy-data migration

If your IDE had a previous incarnation with native state, write a one-time migration following the VS Code pattern at `adapters/vscode/migrateVsCodeState.ts`:

```ts
function migrateLegacyState(adapter: StateAdapter): void {
  const pending: string[] = [];
  // For each legacy key:
  //   1. Read from host's native store
  //   2. Write to the new adapter
  //   3. Verify the write by reading back
  //   4. Only if verified, clear the legacy key
  //   5. Otherwise push the key to `pending`
  if (pending.length > 0) {
    // Log warning, show notification, run again next launch
  }
}
```

This is idempotent: when there's nothing left to migrate, it's a no-op. Run it on every activation.

## Common gotchas

- **Forgetting `store.setAdapter()` before `new AgentRuntime()`.** The runtime persists on every removal; without an adapter, state isn't saved. Construct in order: adapter → store → setAdapter → runtime.
- **Missing settings sync after server start.** `runtime.hooksEnabled.current` defaults to `true`, but the user may have disabled hooks. Read from the adapter and sync before scanning begins.
- **Calling `store.persist()` on every update.** The store doesn't call `persist()` itself; `runtime.removeAgent()` does. Don't add extra `persist()` calls in your callbacks unless you know why.
- **Using `embedded: false` in an IDE host.** That mode binds to a fixed default port (3100) without WebSocket auth and serves a static SPA. Don't do this from an IDE adapter; it's for the standalone CLI only.
- **Sharing the adapter across multiple runtimes in the same process.** Possible but untested. Today each adapter constructs one runtime.

## Reference

- VS Code adapter - `adapters/vscode/extension.ts:14-40`, `adapters/vscode/vscodeTerminalAdapter.ts`, `adapters/vscode/migrateVsCodeState.ts`
- Standalone CLI - `server/src/cli.ts:58-169` (same lifecycle, no host adapter)
- AgentRuntime API - [state-management.md](/reference/state-management)
- StateAdapter contract - [state-adapter.md](./state-adapter)
- ITerminalAdapter contract - [terminal-adapter.md](./terminal-adapter)
