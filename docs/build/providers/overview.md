---
sidebar_position: 1
title: Overview
---

# Providers overview

A **provider** is the translator between one specific AI CLI and Pixel Agents. Claude Code emits hooks in one shape, Codex would emit them in another, Copilot in yet another. The provider turns those raw payloads into the shared `AgentEvent` union so everything downstream (timers, broadcasts, the webview) does not care which CLI the user is running.

This page covers what a provider is, what it is responsible for, and the three taxonomy slots that may eventually exist. If you want to build one start to finish, jump to [Adding a provider](/build/providers/adding-a-provider). If you want to read the canonical example, see [Reference implementation](/build/providers/reference-implementation).

## The normalization boundary

A provider exists to draw exactly one line in the codebase: the line between **raw CLI JSON** and **normalized `AgentEvent`**.

Every other Pixel Agents module, the hook handler, the timer manager, the broadcaster, the webview, consumes only the normalized shape. They never see `tool_name`, `agent_type`, or `notification_type`. The provider is the one and only place those fields are read.

This boundary is enforced in code at `server/src/hookEventHandler.ts:131-143`:

```ts
handleEvent(_providerId: string, event: HookEvent): void {
  if (this.provider.protocolVersion !== HookEventHandler.SUPPORTED_PROTOCOL_VERSION) {
    return;
  }
  // ── Provider normalization boundary ───────────────────────────────────────
  // All raw Claude-specific fields (tool_name, tool_input, agent_type, ...)
  // are extracted by provider.normalizeHookEvent. Downstream dispatch uses the
  // normalized AgentEvent.kind.
  const normalized = this.provider.normalizeHookEvent(event);
  if (!normalized) return;
  const normEvent = normalized.event;
  // ...
}
```

If you find yourself wanting to read a raw provider field outside `normalizeHookEvent`, that is a signal to extend `AgentEvent` instead.

## The taxonomy: today and planned

The provider contract is intentionally narrow. Today only **HookProvider** ships, and it is the only taxonomy slot you can implement right now.

The `provider.ts` header says it directly (`core/src/provider.ts:1-8`):

```ts
/**
 * Provider abstraction for AI agent tools.
 *
 * Only HookProvider ships today (Claude Code). Transcript-polling and push-based
 * provider types will be added when a real second provider (Codex, Goose,
 * Discord, etc.) actually lands, derived from that provider's needs rather than
 * speculation.
 */
```

And the TODO is parked at the bottom of the same file (`core/src/provider.ts:130-131`):

```ts
// TODO(provider type taxonomy): FileProvider (polling-only CLIs) and StreamProvider
// (push-based external services) will be added alongside the first real second provider
```

The three slots are:

- **HookProvider** the CLI fires shell hooks (Claude's `~/.claude/settings.json` style). Today only this exists.
- **FileProvider** (planned, not implemented) the CLI does not fire hooks but writes a transcript file we can poll. Will be designed when the first such CLI is integrated.
- **StreamProvider** (planned, not implemented) the CLI is a remote service that pushes events to us (WebSocket, SSE). Will be designed when the first cloud agent is integrated.

If you are integrating a CLI that needs `FileProvider` or `StreamProvider`, open an issue first. We do not want to write the interface speculatively, the design will be derived from your concrete needs.

## What a HookProvider must implement

Every HookProvider declares the same shape (`core/src/provider.ts:60-128`). Below is each member, what it does, and the rule of thumb for filling it in.

### Identity and protocol version

```ts
readonly kind: 'hook';
readonly id: string;            // e.g. 'claude', 'codex'
readonly displayName: string;   // e.g. 'Claude Code'
readonly protocolVersion: number; // start at 1
```

`protocolVersion` is the lock between provider and host. The `HookEventHandler` declares `SUPPORTED_PROTOCOL_VERSION = 1` (`server/src/hookEventHandler.ts:62`) and refuses to dispatch events from any provider with a different version (`server/src/hookEventHandler.ts:72-78, 131-134`). You bump this number any time a breaking change lands in `AgentEvent`, `HookProvider`, or `TeamProvider`.

### normalizeHookEvent

```ts
normalizeHookEvent(raw: Record<string, unknown>): {
  sessionId: string;
  event: AgentEvent;
} | null;
```

This is 90 percent of your work. Walk through each hook event the CLI fires, pull out the session id, and build the corresponding `AgentEvent`. Return `null` for events you intentionally drop.

Claude's implementation (`server/src/providers/hook/claude/claude.ts:123-235`) is a switch on `hook_event_name`. The full set of `AgentEvent.kind` values to map to is at `core/src/provider.ts:14-56`:

- `toolStart` `toolEnd` ordinary tool execution.
- `subagentStart` `subagentEnd` `subagentTurnEnd` sub-agent lifecycle (only relevant if the CLI has subtasks).
- `turnEnd` the model finished its current turn.
- `permissionRequest` the CLI is blocked waiting for the user to approve a tool.
- `progress` mid-tool status (rarely emitted, currently dropped downstream).
- `sessionStart` `sessionEnd` session lifecycle. `sessionStart` is also how `/clear` and `/resume` are detected (`server/src/hookEventHandler.ts:151-234`).

### Install, uninstall, query hooks

```ts
installHooks(serverUrl: string, authToken: string): Promise<void>;
uninstallHooks(): Promise<void>;
areHooksInstalled(): Promise<boolean>;
```

The provider owns its CLI's hook configuration. For Claude this means editing `~/.claude/settings.json` and dropping a hook script at `~/.pixel-agents/hooks/claude-hook.js`. See `server/src/providers/hook/claude/claudeHookInstaller.ts:113-140` for the canonical pattern (atomic tmp + rename writes, idempotent install, full uninstall on remove).

### Tool classification sets

```ts
formatToolStatus(toolName: string, input?: unknown): string;
readonly permissionExemptTools: ReadonlySet<string>;
readonly subagentToolNames: ReadonlySet<string>;
readonly readingTools: ReadonlySet<string>;
```

These four pieces let the UI render activity without provider-specific code:

- `formatToolStatus` produces a human-readable status line like "Reading foo.ts" or "Running: npm test". The Claude version lives at `server/src/providers/hook/claude/claude.ts:21-67`.
- `permissionExemptTools` tools that never trigger the 7-second heuristic permission timer (Claude's `Task`, `Agent`, `AskUserQuestion` at `server/src/providers/hook/claude/claude.ts:268`).
- `subagentToolNames` tools that spawn sub-agent characters (Claude's `Task` and `Agent` at `server/src/providers/hook/claude/claude.ts:269`).
- `readingTools` tools that should render the reading animation instead of typing (Claude's `Read`, `Grep`, `Glob`, `WebFetch`, `WebSearch` at `server/src/providers/hook/claude/claude.ts:270`). This lets a new provider override animation choice without touching the webview, see `core/src/provider.ts:91-94`.

### Optional: file fallback

If your CLI also writes a transcript file we can poll as a fallback when hooks are unavailable, implement:

```ts
getSessionDirs?(workspacePath: string): string[];
getAllSessionRoots?(): string[];
readonly sessionFilePattern?: string;
parseTranscriptLine?(line: string): AgentEvent | null;
buildLaunchCommand?(sessionId: string, cwd: string, opts?): {
  command: string;
  args: string[];
  env?: Record<string, string>;
};
```

Everything here is optional. Claude implements all five (`server/src/providers/hook/claude/claude.ts:71-110, 271-276`) because Claude writes `~/.claude/projects/<hash>/<uuid>.jsonl`. A CLI without transcripts simply leaves these undefined.

### Optional: team support

```ts
readonly team?: TeamProvider;
```

If the CLI has a "spawn a persistent background teammate" feature distinct from ephemeral subtasks, implement `TeamProvider` from `core/src/teamProvider.ts:13-66` and attach it here. See [TeamProvider extension](/build/providers/teamprovider-extension) for the full walk-through. A provider without teams simply leaves `team` undefined and no team-gated code runs for it (`core/src/teamProvider.ts:10-12`).

## Reading-tool versus writing-tool classification

The "reading versus typing" animation choice used to be hard-coded in the webview. It is now driven by `readingTools` on the provider. The rule of thumb:

- Read-like tools (file reads, code searches, web fetches, web searches) -> reading animation.
- Write-like tools (file writes, edits, shell commands, notebook edits) -> typing animation.

If a CLI has tools the webview has never seen, the provider's classification is the source of truth. The webview renders whichever animation the provider selected, no webview change required.

## Protocol versioning, in practice

The `protocolVersion` field is a tripwire, not a compatibility layer. The handler does not try to "downgrade" events from an older provider, it drops them.

You bump `protocolVersion` when:

- You add or remove a kind in `AgentEvent` (`core/src/provider.ts:14-56`).
- You add a required field to an existing kind.
- You add or change a required field on `HookProvider` or `TeamProvider`.

You do not bump it for:

- New optional fields on existing kinds (handlers that ignore the field still work).
- Provider-internal refactors that do not change the contract.

When you bump it, also bump `SUPPORTED_PROTOCOL_VERSION` in `server/src/hookEventHandler.ts:62` in the same PR.

## Where the references live

- Interface contract: [HookProvider reference](/reference/hookprovider).
- Step-by-step walkthrough: [Adding a provider](/build/providers/adding-a-provider).
- Canonical implementation read-through: [Reference implementation (Claude)](/build/providers/reference-implementation).
- Optional team support: [TeamProvider extension](/build/providers/teamprovider-extension).
- Testing patterns: [Testing your provider](/build/providers/testing-your-provider).
- Publishing: [Publishing](/build/providers/publishing).
- Event catalog: [AgentEvent reference](/reference/protocol/agent-events).
- Full hook coverage table: [Hooks coverage](/reference/hooks-coverage).
