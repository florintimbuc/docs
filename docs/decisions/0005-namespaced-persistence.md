---
sidebar_position: 6
---

# ADR-0005: Namespaced persistence

:::warning[AI-generated docs]
This document was AI-generated and may have some mistakes - we apologize for this, we're in the process of reviewing all documents. If you find any issues, we'd be thankful if you [submit an edit PR](https://github.com/pixel-agents-hq/docs/edit/main/docs/decisions/0005-namespaced-persistence.md).
:::

**Status:** Accepted
**Date:** 2026-05-26
**Deciders:** Pixel Agents core team
**Related:** [StateAdapter contract](/build/adapters/state-adapter), [State management reference](/reference/state-management), [ADR-0001 four-package split](./four-package-split)

## Context

Pre-refactor, VS Code persisted agents to `context.workspaceState['pixel-agents.agents']` and seats to `context.workspaceState['pixel-agents.agentSeats']`. Settings went to `context.globalState`. Layout went to `~/.pixel-agents/layout.json` (already host-agnostic because of cross-window sync).

Standalone joining the party raised an immediate question: where does it store agents? Sharing `~/.pixel-agents/agents.json` between VS Code and standalone is wrong, because the agents are different processes with different terminal references and different IDs. The same workspace opened in both surfaces would produce two unrelated agent lists trampling each other on every write.

Sharing `context.workspaceState` was impossible, because the standalone CLI has no `vscode.ExtensionContext`. Sharing settings via `globalState` had the same problem.

We needed a persistence model that:

1. Lets multiple hosts coexist on one machine.
2. Keeps a single source of truth for layout (cross-window sync still works).
3. Keeps settings discoverable per-host without invading a single global blob.
4. Survives a migration from the old VS Code-native state without losing data.

## Decision

Introduce `FileStateAdapter` (`server/src/fileStateAdapter.ts:45-134`) with a `namespace` constructor option:

```ts
new FileStateAdapter({ namespace: 'vscode' });
new FileStateAdapter({ namespace: 'standalone' });
```

Two namespaces ship today; new hosts pick a new namespace string (`'jetbrains'`, `'zed'`, etc.).

Storage layout:

- **Agents + seats** persist to `~/.pixel-agents/<namespace>-state.json`. Each adapter owns its own file; no cross-namespace reads. The state file path is built at `server/src/fileStateAdapter.ts:50-55`:
  ```ts
  this.stateFilePath = path.join(
    os.homedir(),
    LAYOUT_FILE_DIR,
    `${options.namespace}-state.json`,
  );
  ```
- **Settings** persist to a shared `~/.pixel-agents/config.json` with per-namespace sections. Multiple adapters can edit it; each writes only its own namespace's keys. See `server/src/configPersistence.ts` (`ADAPTER_SETTING_KEYS` exports). The adapter's `getSetting`/`setSetting` methods strip the `pixel-agents.` prefix and route to its namespace section (`server/src/fileStateAdapter.ts:60-74`).
- **Layout** stays in `~/.pixel-agents/layout.json` (unchanged). Intentionally cross-namespace because the office is the same regardless of who's hosting. `server/src/layoutPersistence.ts` handles the cross-window watching via `fs.watch` + 2-second polling fallback.

Atomic writes (tmp + rename, `server/src/fileStateAdapter.ts:121-132`) protect against partial writes during crashes:

```ts
const tmpPath = this.stateFilePath + '.tmp';
fs.writeFileSync(tmpPath, json, 'utf-8');
fs.renameSync(tmpPath, this.stateFilePath);
```

## Consequences

**Positive.**

- VS Code and standalone coexist on one machine without trampling. Each sees its own agents.
- Layout sync across windows still works because the shared file is unchanged.
- Settings can have per-host overrides. A user can disable sound in standalone while keeping it on in VS Code.
- New adapters pick a namespace and they're done. No coordination with existing adapters required.
- Atomic writes mean a crash mid-write does not corrupt the state file. The tmp file is orphaned but the real file is untouched.

**Negative.**

- A user running both surfaces simultaneously has two agent lists. Strictly correct (the agents are different processes) but visually confusing. A "show all hosts" UI could merge them; deferred.
- The migration from VS Code-native state had to be careful. See `adapters/vscode/migrateVsCodeState.ts`: every `workspaceState` and `globalState` key is read, the new file is written, the write is verified by re-reading, and only then are the legacy keys cleared. If any step fails the migration is logged and shown as a notification on every launch until the user resolves it. This is verbose but right.
- The shared `config.json` is a single point of failure for settings. Multiple processes editing it concurrently could race. Today the writes are serialized at the host level (one process per host); cross-host concurrent writes are theoretical and unlikely (settings change manually, not in bursts), but worth keeping in mind.
- The `~/.pixel-agents/` directory accumulates files: `layout.json`, `layout.json.tmp` (if a write was interrupted), `config.json`, `vscode-state.json`, `standalone-state.json`, `server.json`, `hooks/claude-hook.js`. Users who manually inspect the directory may find the list confusing without docs. (This page is part of the answer.)

## Alternatives considered

- **Single shared state file across hosts.** Rejected; conflates two unrelated agent lists. The fix would be a "host owner" field on each agent and complex merge logic on every write. The namespace approach gets the same outcome with no merge logic.
- **Database (sqlite).** Considered. More setup, more dependencies (`better-sqlite3` or similar). The data volume is tiny (dozens of agents, hundreds of furniture positions) and the JSON files are human-readable when debugging. No advantage at this scale.
- **Per-workspace state file.** Defeats cross-window sync. The same workspace opened in two VS Code windows still needs a shared file. The current model gives that for layout while letting each host scope its own agents.
- **All state in a single file, with namespace as a top-level key.** Considered. Equivalent semantically to per-namespace files but with all hosts writing to one file. The race-condition surface is larger and a corruption affects all hosts. Per-namespace files isolate failure.
- **Store agents in the host's native state store, only share layout.** This is what we had before. Doesn't survive the standalone use case.

## Migration notes

`adapters/vscode/migrateVsCodeState.ts` runs on every extension activation. It is idempotent: when there is nothing left to migrate, it is a no-op.

Sources migrated:

- `context.globalState` settings (six keys: `pixel-agents.soundEnabled`, `lastSeenVersion`, `alwaysShowLabels`, `watchAllSessions`, `hooksEnabled`, `hooksInfoShown`) → `config.json[vscode]`.
- `context.workspaceState['pixel-agents.agents']` → `vscode-state.json.agents`.
- `context.workspaceState['pixel-agents.agentSeats']` → `vscode-state.json.seats`.
- `context.workspaceState['pixel-agents.layout']` → `~/.pixel-agents/layout.json`.

Write verification: after writing, the file is read back. If the content does not match, the migration is logged as `pending`, a VS Code notification fires, and the legacy keys are left in place for the next attempt.

## Open questions

- When a third host ships, do we want a single "host overview" UI showing agents from all namespaces in one office? Probably yes, but it requires merge logic for seat assignments and is a non-trivial product question.
- Should `config.json` migrate to a `dot-config`-style layered config (system, user, project) for advanced users? Deferred; today everything is per-user.
- Do we want `FileStateAdapter` to write to a `.bak` file before each write for crash-recovery beyond the tmp+rename pattern? Today no; the JSON files are small enough to re-create.
- Where does `server.json` (the server discovery file at `~/.pixel-agents/server.json`) fit in this model? Today it's a separate concern (transient, written by whoever owns the server). Not namespaced; there's only ever one running server per machine. Decision recorded here for completeness.
