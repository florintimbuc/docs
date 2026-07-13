---
sidebar_position: 5
---

# ADR-0004: AgentRuntime as shared lifecycle core

:::warning[AI-generated docs]
This document was AI-generated and may have some mistakes - we apologize for this, we're in the process of reviewing all documents. If you find any issues, we'd be thankful if you [submit an edit PR](https://github.com/pixel-agents-hq/docs/edit/main/docs/decisions/0004-agentruntime-as-shared-lifecycle-core.md).
:::

**Status:** Accepted
**Date:** 2026-05-26
**Deciders:** Pixel Agents core team
**Related:** [State management reference](/reference/state-management), [Architecture overview](/learn/architecture), [ADR-0001 four-package split](./four-package-split)

## Context

Pre-refactor, both `PixelAgentsViewProvider` (VS Code) and the early standalone CLI prototype set up agent lifecycle plumbing themselves. Each constructed its own timer Maps, started its own file watchers, instantiated its own `HookEventHandler` and `DismissalTracker`, and ran its own session-scanning loop. The constructor bodies in both places were near-identical sequences of `new`s and wire-ups.

Two problems compounded:

1. **Drift.** A bug fix in the VS Code side did not propagate to standalone (and vice versa) unless someone remembered. Three or four small bugs survived weeks of development purely because the parallel structures looked similar enough to skip the cross-check.
2. **Onboarding cost.** Reading the codebase, a contributor had to follow two parallel constructors to understand how an agent comes alive. Both told mostly the same story, with subtle differences that turned out to be bugs rather than intentional differences.

The team needed a single owner for agent lifecycle that both hosts could compose against.

## Decision

Introduce `AgentRuntime` (`server/src/agentRuntime.ts:48-436`) as the single owner of:

- **Per-agent timer Maps:**
  ```ts
  readonly fileWatchers      = new Map<number, fs.FSWatcher>();
  readonly pollingTimers     = new Map<number, ReturnType<typeof setInterval>>();
  readonly waitingTimers     = new Map<number, ReturnType<typeof setTimeout>>();
  readonly permissionTimers  = new Map<number, ReturnType<typeof setTimeout>>();
  readonly jsonlPollTimers   = new Map<number, ReturnType<typeof setInterval>>();
  ```
  (`server/src/agentRuntime.ts:50-54`)
- **Helper instances:** `HookEventHandler`, `DismissalTracker`, `SessionRouter` (constructor body at lines 72-94).
- **Scanning state:** `knownJsonlFiles`, `projectScanTimer`, `activeAgentId`, `externalScanTimer`, `staleCheckTimer` (lines 57-61).
- **Configuration refs:** `watchAllSessions` and `hooksEnabled`. Refs (not values) because they're shared mutably with the scanner functions in `fileWatcher.ts` (lines 64-65).
- **Module-level dependency wiring:** `setDismissalTracker`, `setHookProvider`, `setTeamProvider`, `setAgentRemovalCallback`, `setTeammateRemovalCallback` are called from the constructor (lines 77-84) to wire the global helpers that `fileWatcher.ts` and `transcriptParser.ts` use.
- **Lifecycle callbacks:** `onExternalSessionDetected`, `onSessionClear`, `onSessionResume`, `onTeammateDetected`, `onTeammateRemoved`, `onSessionEnd` are registered with `HookEventHandler` (lines 95-176) to share session-routing logic.
- **Adapter-specific callbacks:** `setLifecycleCallbacks` (lines 179-182) accepts `onAgentRemoved` and `onTeammateRemoved` so the VS Code adapter can dismiss JSONL files and remove teammates from its own bookkeeping.

Adapters construct an `AgentRuntime`, register their callbacks, and start scanning. The VS Code adapter wires it inside `PixelAgentsViewProvider`. The standalone CLI wires it in `server/src/cli.ts:89-95`:

```ts
const runtime = new AgentRuntime(store, claudeProvider);
server.onHookEvent((providerId, event) => {
  runtime.handleHookEvent(providerId, event);
});
```

`AgentRuntime.dispose()` (lines 415-435) is the single shutdown path: it disposes the hook handler, clears scanner timers, and removes every agent (which closes watchers and cancels timers). Adapters call `runtime.dispose()` on shutdown and that is the entire cleanup story.

## Consequences

**Positive.**

- The VS Code adapter and the standalone CLI share the entire lifecycle code. Bug fixes apply to both at once.
- Adding a third adapter (JetBrains, Zed, custom Electron shell) requires registering callbacks, not re-implementing the scanners. The adapter is a thin layer.
- `AgentRuntime.dispose()` is one path. Tests can construct a runtime, exercise it, and dispose cleanly without worrying about leaked timers.
- The constructor reads top-to-bottom as a wiring story: dependency injection, instance creation, callback registration. Contributors learn the lifecycle by reading one file.

**Negative.**

- `AgentRuntime` has a lot of fields and a dense constructor. It is worth a careful re-read on every change. Adding fields without thinking about where they belong (state, scanning, configuration, dependencies) erodes the structure.
- The module-level setters (`setDismissalTracker`, `setHookProvider`, `setTeamProvider`, `setAgentRemovalCallback`, `setTeammateRemovalCallback`) are a global-state pattern. They are tolerable today because we never run two `AgentRuntime` instances in one process. If we ever do (e.g. multi-tenant tests, multiple providers in one runtime), the global state will block first. The refactor target is: pass these helpers as explicit args rather than via module-level setters.
- The `fileWatcher.ts` module imports the module-level setters from `AgentRuntime`'s constructor, which creates a one-way coupling. It is the right call for the scope of the refactor; the alternative (passing every helper through every scanner function signature) would have ballooned the call sites.

## Alternatives considered

- **Keep duplicated wiring.** Already rejected by experience.
- **Class-per-concern with explicit DI.** Considered. Would have produced more files and more `inject()` boilerplate for the same outcome. Skipped for the scope of the refactor.
- **Constructor injection of every helper instead of module-level setters.** Possible refactor target if `AgentRuntime` gets too dense. Today the setters keep the constructor readable; the trade-off is the global-state caveat above.
- **Two `AgentRuntime` classes, one per host.** Defeats the purpose. The whole point is to share.
- **Move `AgentRuntime` into `core/`.** Rejected. `core/` is type-only. `AgentRuntime` does I/O (file watching, timers, hooks). It belongs in `server/`.

## Migration notes

The refactor pulled lifecycle code out of `PixelAgentsViewProvider.ts` and `server/src/cli.ts` into `agentRuntime.ts`. The diff was large because nearly every scanner function in `fileWatcher.ts` had its signature changed to accept the timer Maps as parameters. After the refactor, every scanner is callable with `runtime.fileWatchers`, `runtime.pollingTimers`, etc.

`PixelAgentsViewProvider.ts` and `server/src/cli.ts` shrank substantially. Both now look like "construct adapter; construct store; construct runtime; register callbacks; start scanning."

## Open questions

- Should `AgentRuntime` own the `AgentStateStore` (today the store is passed in) so the lifetime is unambiguous? Today the adapter outlives the store and the store outlives the runtime; that ordering is fragile.
- Do we want to extract the scanning logic from `fileWatcher.ts` into a `Scanner` class that `AgentRuntime` composes? Today the scanner is a set of free functions wired by module-level setters. A class would clean up the module-level state but add an indirection.
- What happens to `AgentRuntime` if we eventually run multiple providers in one runtime? Today the constructor takes a single `provider: HookProvider`. The future-design question is whether to accept `Map<providerId, HookProvider>` and route by providerId at dispatch time, or to instantiate one runtime per provider. Deferred until a second bundled provider exists.
