---
sidebar_position: 4
---

# ADR-0003: HookProvider with optional file fallback

:::warning[AI-generated docs]
This document was AI-generated and may have some mistakes - we apologize for this, we're in the process of reviewing all documents. If you find any issues, we'd be thankful if you [submit an edit PR](https://github.com/pixel-agents-hq/docs/edit/main/docs/decisions/0003-hookprovider-with-optional-file-fallback.md).
:::

**Status:** Accepted
**Date:** 2026-05-26
**Deciders:** Pixel Agents core team
**Related:** [HookProvider reference](/reference/hookprovider), [Hooks coverage](/reference/hooks-coverage), [Hooks vs heuristic](/learn/hooks-vs-heuristic)

## Context

Detecting AI-agent activity is the core problem Pixel Agents solves. The agent runs in a terminal; the office UI needs to know when it starts a tool, when it stops, when it asks for permission, when it ends a turn. The fidelity of those signals determines whether the office feels alive or unstable.

The original implementation watched JSONL transcripts at `~/.claude/projects/<hash>/<session-id>.jsonl` and inferred state from the records. Polling worked at 500ms intervals but had two persistent failure modes:

1. **Lag.** A tool would start at t=0, the JSONL append would land at t=0.05, the polling tick would fire at t=0.5. The office showed the action half a second late.
2. **False positives.** Heuristic timers had to estimate when a long-running tool was "waiting for permission" vs "still executing." A 7-second permission timer would misfire on slow operations like `WebFetch` against a slow site, lighting up a permission bubble that did not correspond to anything happening in the terminal.

In late 2025 Claude Code introduced a Hooks API: user-configured commands that Claude runs synchronously on session lifecycle and tool-use events. The payloads contain the structured data we had been reconstructing from JSONL. Using them directly gives instant, lossless detection.

The question: how do we adopt hooks without abandoning users who haven't installed them (yet) or who use providers that don't have hooks?

## Decision

`HookProvider` is the canonical interface (`core/src/provider.ts:60-128`). Hooks are the primary signal. File fallback lives on the same interface as optional methods (`getSessionDirs?`, `parseTranscriptLine?`, `buildLaunchCommand?` at lines 99-121). A provider can:

1. Implement hooks only. File methods undefined; agents only appear when their hook scripts run.
2. Implement hooks + file fallback. Hooks are preferred; the fallback handles the gap between agent launch and first hook delivery, and survives a hook-script failure.
3. Implement file fallback only. Future providers without a hooks API. Today no such provider ships, but the interface accommodates it.

A per-agent flag tracks which signal is in charge:

```ts
// server/src/types.ts:32
/** Whether a hook event has been delivered for this agent (suppresses heuristic timers) */
hookDelivered: boolean;
```

Set to `true` on the first successful hook event delivered to the agent (see `server/src/hookEventHandler.ts` - the assignment lives in the per-kind branches). When `hookDelivered === true`, the heuristic timers in `server/src/timerManager.ts` are suppressed for that agent. The relevant constants are at `server/src/constants.ts:13-17`:

```ts
export const TOOL_DONE_DELAY_MS = 300;
export const PERMISSION_TIMER_DELAY_MS = 7000;
export const TEXT_IDLE_DELAY_MS = 5000;
export const CLEAR_IDLE_THRESHOLD_MS = 2000;
```

Hook events carry a `protocolVersion` (`HookProvider.protocolVersion`, `core/src/provider.ts:64-67`). `HookEventHandler` refuses events from a provider whose version it does not understand. `SUPPORTED_PROTOCOL_VERSION = 1` is hardcoded at `server/src/hookEventHandler.ts:62`. Bumping this is a deliberate operation that signals a breaking change to `AgentEvent` or `HookProvider`.

## Consequences

**Positive.**

- When hooks work, detection is instant and reliable. The office responds in the same frame as the terminal.
- When hooks are not installed (new user; user toggled off; hooks failed silently), the fallback keeps the experience functional, just with the original lag and the occasional false positive.
- A new provider can ship with hooks only, file only, or both. The interface does not force a choice.
- Protocol versioning prevents a stale provider from corrupting state when `AgentEvent` evolves. The version mismatch is logged once and the events are dropped (`server/src/hookEventHandler.ts:72-78`).
- Reading-vs-typing classification (`HookProvider.readingTools`, `subagentToolNames`) is provider-side metadata, so new providers can override the animation without touching the webview.

**Negative.**

- Dual paths means more code surface. The heuristic timers still ship and need tests. The hook-event normalization layer also needs tests. Both have edge cases.
- The `hookDelivered` flag is per-agent, which means in mixed scenarios (one agent has hooks, another doesn't) the runtime executes both code paths simultaneously. The implementation handles this cleanly, but it is one more thing to keep in mind during debugging.
- Users must install hooks to get the better experience. The first-run UI prompts them; older sessions may not have noticed.

## Alternatives considered

- **Hooks only, no fallback.** Abandoned. Users running `claude` without our hooks installed would see no agents at all. The first-run UX would be poor: install Pixel Agents, see nothing, get told to also enable hooks before anything works.
- **File only, no hooks.** Abandoned. The lag and the false-positive permission bubbles were the original pain. Hooks remove them.
- **Two separate provider interfaces, FileProvider and HookProvider.** Considered. Today there is only one provider (Claude) and it has both. Splitting the interface adds upfront cost with no concrete payoff. The TODO at `core/src/provider.ts:130-131` reserves the option:

  ```ts
  // TODO(provider type taxonomy): FileProvider (polling-only CLIs) and StreamProvider
  // (push-based external services) will be added alongside the first real second provider
  ```

  When a second provider lands that genuinely needs only one mode, the taxonomy split becomes worth doing.
- **Heuristic timers always run, hooks accelerate them.** Considered. Rejected because the heuristic timers occasionally produce false positives (the misfiring permission bubble is the worst symptom). Suppressing them when hooks are working is cleaner than reconciling two competing signals.

## Migration notes

Hook installation is gated by a per-host setting (`pixel-agents.hooksEnabled`, default `true`). On startup, the CLI calls `claudeProvider.installHooks(serverUrl, authToken)` if the setting is on (`server/src/cli.ts:128-140`). The VS Code adapter does the same.

Uninstall (`claudeProvider.uninstallHooks()`) is symmetric. If the user toggles hooks off, the script entries are removed from `~/.claude/settings.json`. The fallback resumes automatically.

The hook script (`server/src/providers/hook/claude/hooks/claude-hook.ts`) is bundled to a single CJS file by `esbuild.js`'s `buildHooks()` and copied to `~/.pixel-agents/hooks/claude-hook.js` (the path constant `HOOK_SCRIPTS_DIR = '.pixel-agents/hooks'` lives at `core/src/constants.ts:14`). The bundle has no `node_modules` dependency at runtime.

## Open questions

- When a second provider ships (Codex, Goose, etc.), is the taxonomy split worth doing immediately or should we wait for a third? Decide at PR time, not in advance.
- Should heuristic timer constants be per-provider rather than global? Today they are global (`server/src/constants.ts`). A fast CLI might want shorter timers; a slow one might want longer. Deferred until a provider actually needs the override.
- Do we want to expose a "hooks status" UI surface so users can see at a glance which agents are on hooks vs heuristics? Future product decision.
