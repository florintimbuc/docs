---
sidebar_position: 4
---

# `StateAdapter` Contract

The interface adapters implement to persist agent state and user settings. Defined at `core/src/adapter.ts:15-28`.

## Interface

```ts
// core/src/adapter.ts:15-28
export interface StateAdapter {
  // Per-adapter persisted state (agents + seats)
  loadAgents(): PersistedAgent[];
  saveAgents(agents: PersistedAgent[]): void;

  loadSeats(): Record<string, { palette?: number; hueShift?: number; seatId?: string }>;
  saveSeats(seats: Record<string, { palette?: number; hueShift?: number; seatId?: string }>): void;

  // User-level settings (shared file, namespaced per adapter)
  getSetting<T>(key: string, defaultValue: T): T;
  setSetting<T>(key: string, value: T): void;
}
```

Six methods, three concerns: agents, seats, settings.

## What lives where

| Data | Where | Why |
|---|---|---|
| **Agents** | Per-adapter file (e.g. `~/.pixel-agents/vscode-state.json`) | Each host owns its own agent list; running VS Code and standalone at the same time shouldn't conflate them. |
| **Seats** | Same per-adapter file | Seats are tied to specific agent IDs, which are per-host. |
| **Settings** | Shared `~/.pixel-agents/config.json`, namespaced section | Multiple hosts can have their own preferences (e.g. sound on in one, off in another) without overwriting each other. |
| **Layout** | Shared `~/.pixel-agents/layout.json` | Cross-host sync is desirable. The office is the same regardless of who's hosting. |

Layout is **not** in `StateAdapter`. It's handled directly by `server/src/layoutPersistence.ts` because it's already host-agnostic (plain fs I/O on a shared file).

For the rationale, see [Decision 0005: Namespaced persistence](/decisions/namespaced-persistence).

## Method semantics

### `loadAgents()`

Returns the array of `PersistedAgent` (from `core/src/schemas.ts:8-22`). Empty array if there's no state to load. Should never throw - return empty on error.

`PersistedAgent` shape:

```ts
export interface PersistedAgent {
  id: number;
  sessionId?: string;
  terminalName: string;     // empty string for non-terminal sessions
  isExternal?: boolean;
  jsonlFile: string;
  projectDir: string;
  folderName?: string;
  teamName?: string;
  agentName?: string;
  isTeamLead?: boolean;
  leadAgentId?: number;
  teamUsesTmux?: boolean;
}
```

### `saveAgents(agents)`

Persists the full agent list. Atomic preferred - write to a tmp file, rename to the final path. `FileStateAdapter` uses tmp+rename (`server/src/fileStateAdapter.ts:121-132`).

Called from `AgentStateStore.persist()`, which is itself called from `AgentRuntime.removeAgent()` and other lifecycle transitions. Don't call it from your own host code unless you're sure no other path will.

### `loadSeats()`

Returns the map of agent ID (as string) to seat assignment. Empty object if none.

Today the seat record carries `palette`, `hueShift`, and `seatId`. All three are optional, but in practice they're all set together. See `core/src/messages.ts:89-93` for the message-shape equivalent `AgentSeatMeta`.

### `saveSeats(seats)`

Persists the full seat map. Called from `handleClientMessage` when a `saveAgentSeats` message arrives (`server/src/clientMessageHandler.ts:64-69`).

### `getSetting(key, defaultValue)`

Reads a settings key, returns the default if not set. The runtime uses fully-qualified keys like `'pixel-agents.hooksEnabled'`.

The bundled `FileStateAdapter` strips the `pixel-agents.` prefix and routes to the namespace section (`server/src/fileStateAdapter.ts:60-66`):

```ts
function settingNameOf(key: string): AdapterSettingKey | null {
  const bare = key.startsWith('pixel-agents.') ? key.slice('pixel-agents.'.length) : key;
  return ADAPTER_SETTING_KEY_SET.has(bare) ? (bare as AdapterSettingKey) : null;
}

getSetting<T>(key: string, defaultValue: T): T {
  const field = settingNameOf(key);
  if (!field) return defaultValue;
  const config = readConfig();
  return config[this.namespace][field] as unknown as T;
}
```

Unknown keys (not in `ADAPTER_SETTING_KEYS`) return the default and are silently ignored on writes. The known list lives in `server/src/configPersistence.ts`.

### `setSetting(key, value)`

Writes a settings key. The runtime calls this when the user toggles something in the UI (e.g. `setHooksEnabled` arrives → adapter records it).

## The bundled implementation: `FileStateAdapter`

Most adapters should compose `FileStateAdapter` rather than implementing `StateAdapter` from scratch. It lives in `server/` (not `core/`) because it does file I/O - see [Decision 0001](/decisions/four-package-split).

Construction:

```ts
import { FileStateAdapter } from '../../server/src/fileStateAdapter.js';

const adapter = new FileStateAdapter({ namespace: 'jetbrains' });
```

Namespace is a string-literal union (`'vscode' | 'standalone'`) at `server/src/configPersistence.ts:ConfigNamespace`. Adding a new namespace requires extending that union. (See [adding-an-adapter.md](./adding-an-adapter) for the migration path.)

What it does:

- Reads/writes `~/.pixel-agents/<namespace>-state.json` for agents + seats.
- Reads/writes `~/.pixel-agents/config.json` for settings, scoped to its namespace section.
- Atomic writes (tmp + rename) on all state files.

What it doesn't do:

- Hot reload on external edits. If you `vi` the state file by hand, the running adapter doesn't notice.
- Migration. The VS Code adapter handles legacy data via `adapters/vscode/migrateVsCodeState.ts`; that's a separate one-shot path.

## Writing your own StateAdapter

If `FileStateAdapter` doesn't fit (e.g. you're in a browser-only test harness, or your IDE has a strict "all state goes through our API" rule), implement the interface yourself.

Minimal mock for tests:

```ts
class InMemoryStateAdapter implements StateAdapter {
  private agents: PersistedAgent[] = [];
  private seats: Record<string, any> = {};
  private settings = new Map<string, any>();

  loadAgents() { return [...this.agents]; }
  saveAgents(agents: PersistedAgent[]) { this.agents = [...agents]; }
  loadSeats() { return { ...this.seats }; }
  saveSeats(seats: Record<string, any>) { this.seats = { ...seats }; }
  getSetting<T>(key: string, defaultValue: T): T {
    return (this.settings.has(key) ? this.settings.get(key) : defaultValue) as T;
  }
  setSetting<T>(key: string, value: T): void { this.settings.set(key, value); }
}
```

JetBrains-style host with native PropertiesComponent:

```ts
class JetBrainsStateAdapter implements StateAdapter {
  constructor(private props: PropertiesComponent, private storageDir: string) {}

  loadAgents(): PersistedAgent[] {
    const json = this.props.getValue('pixelAgents.agents');
    return json ? JSON.parse(json) : [];
  }
  saveAgents(agents: PersistedAgent[]): void {
    this.props.setValue('pixelAgents.agents', JSON.stringify(agents));
  }
  // ... seats + settings similarly
}
```

## Common gotchas

- **`PersistedAgent.terminalName` is empty string when there's no terminal.** Don't filter on truthiness; the empty value is intentional.
- **Don't persist `AgentState` directly.** It contains live `Set`s and `Map`s that don't serialize. The store builds `PersistedAgent[]` from `AgentState` in `AgentStateStore.persist()` (`server/src/agentStateStore.ts:122-144`).
- **Settings keys are namespaced by the `pixel-agents.` prefix.** Stripping happens inside `FileStateAdapter`; if you implement your own adapter, accept both prefixed and bare keys.
- **`loadAgents()` may return zero agents on startup.** That's fine. The runtime starts empty and discovers agents via the scanner.
- **`saveAgents()` is called frequently.** Every lifecycle transition triggers a save. If your storage backend has rate limits, batch with debounce; the in-memory list is the source of truth.

## Related

- [Adapters overview](./overview)
- [Adding an Adapter](./adding-an-adapter)
- [Terminal adapter contract](./terminal-adapter)
- [State management reference](/reference/state-management)
- [Decision 0005: Namespaced persistence](/decisions/namespaced-persistence)
- Reference impl: `server/src/fileStateAdapter.ts:45-134`
- VS Code adapter wiring: `adapters/vscode/extension.ts:14-26`
