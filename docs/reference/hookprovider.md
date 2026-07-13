---
sidebar_position: 6
---

# HookProvider Reference

:::warning[AI-generated docs]
This document was AI-generated and may have some mistakes - we apologize for this, we're in the process of reviewing all documents. If you find any issues, we'd be thankful if you [submit an edit PR](https://github.com/pixel-agents-hq/docs/edit/main/docs/reference/hookprovider.md).
:::

`HookProvider` is the interface every supported AI coding CLI implements. It's the single normalization boundary between provider-specific JSON (Claude's snake_case, hypothetical Copilot's camelCase, etc.) and the rest of the system, which sees only the normalized [`AgentEvent`](./protocol/agent-events) union.

Defined in `core/src/provider.ts:60-128`. Today only one provider ships - see [the Claude reference implementation](#claude-reference-implementation) at the bottom of this page.

```ts
export interface HookProvider {
  readonly kind: 'hook';
  readonly id: string;
  readonly displayName: string;
  readonly protocolVersion: number;

  normalizeHookEvent(raw: Record<string, unknown>): {
    sessionId: string;
    event: AgentEvent;
  } | null;

  installHooks(serverUrl: string, authToken: string): Promise<void>;
  uninstallHooks(): Promise<void>;
  areHooksInstalled(): Promise<boolean>;

  formatToolStatus(toolName: string, input?: unknown): string;
  readonly permissionExemptTools: ReadonlySet<string>;
  readonly subagentToolNames: ReadonlySet<string>;
  readonly readingTools: ReadonlySet<string>;
  readonly terminalNamePrefix?: string;

  // Optional file fallback (heuristic mode)
  getSessionDirs?(workspacePath: string): string[];
  getAllSessionRoots?(): string[];
  readonly sessionFilePattern?: string;
  parseTranscriptLine?(line: string): AgentEvent | null;
  buildLaunchCommand?(
    sessionId: string,
    cwd: string,
    opts?: { bypassPermissions?: boolean },
  ): {
    command: string;
    args: string[];
    env?: Record<string, string>;
  };

  // Optional team extension
  readonly team?: TeamProvider;
}
```

`core/src/provider.ts:60-128`

The header note explains the scope (`core/src/provider.ts:1-8`):

> Only HookProvider ships today (Claude Code). Transcript-polling and push-based provider types will be added when a real second provider (Codex, Goose, Discord, etc.) actually lands, derived from that provider's needs rather than speculation.

## Required fields

### kind

```ts
readonly kind: 'hook';
```

Literal discriminator. Reserves space for `FileProvider` / `StreamProvider` once a real second provider lands (`core/src/provider.ts:130-131`).

### id

```ts
readonly id: string;
```

Stable identifier - must match the URL fragment used in `POST /api/hooks/:providerId` (validated against the regex `^[a-z0-9-]+$` in `server/src/httpServer.ts:113`). Claude uses `'claude'`.

### displayName

```ts
readonly displayName: string;
```

Human-readable name shown in UI and logs.

### protocolVersion

```ts
readonly protocolVersion: number;
```

Protocol version. From the doc comment (`core/src/provider.ts:64-67`):

> Protocol version. Server refuses to dispatch events from a provider whose version it doesn't understand. Bump on every breaking change to AgentEvent / TeamProvider / HookProvider. Start at 1.

The handler currently understands version **1** only (`server/src/hookEventHandler.ts:61-62`):

```ts
/** Highest HookProvider.protocolVersion this handler understands. */
private static readonly SUPPORTED_PROTOCOL_VERSION = 1;
```

If a provider declares an unsupported value, the handler logs a warning on construction and silently drops every event (`server/src/hookEventHandler.ts:72-78, 132-134`). See [errors.md](./errors).

### normalizeHookEvent

```ts
normalizeHookEvent(raw: Record<string, unknown>): {
  sessionId: string;
  event: AgentEvent;
} | null;
```

`core/src/provider.ts:73-76`. The single Claude-specific normalization boundary in the server.

> Normalize a raw hook event payload into an AgentEvent. Each CLI sends different JSON (Claude: snake_case, Copilot: camelCase, etc.) The provider translates to the common AgentEvent format. Return null for events we should ignore.

Return shape: `{ sessionId, event }` where `event` is a normalized [`AgentEvent`](./protocol/agent-events). Returning `null` silently drops the event.

The downstream handler (`server/src/hookEventHandler.ts:140-142`) treats this as the **only** place where raw CLI fields (`tool_name`, `tool_input`, `agent_type`, `notification_type`, `reason`, `source`) are read. Everything after dispatches on `AgentEvent.kind`.

A few exceptions to that boundary: `transcriptPath`, `cwd` (for external-session adoption) and `agent_type` (for teammate routing) are read from the raw event after normalization because `AgentEvent` doesn't capture all of them (`server/src/hookEventHandler.ts:135-142`).

### installHooks / uninstallHooks / areHooksInstalled

```ts
installHooks(serverUrl: string, authToken: string): Promise<void>;
uninstallHooks(): Promise<void>;
areHooksInstalled(): Promise<boolean>;
```

`core/src/provider.ts:78-83`.

Hook lifecycle. `installHooks` writes the per-CLI hook scripts (Claude: edits `~/.claude/settings.json`). `serverUrl` and `authToken` are the values the script needs to POST events back. `uninstallHooks` removes them. `areHooksInstalled` checks current state without modifying anything.

These are all async to allow file or subprocess work. Claude's installer is synchronous internally and wraps with `Promise.resolve()` (`server/src/providers/hook/claude/claude.ts:237-251`).

### formatToolStatus

```ts
formatToolStatus(toolName: string, input?: unknown): string;
```

`core/src/provider.ts:85-86`.

Produces the human-readable status string shown on the character (`"Reading foo.ts"`, `"Running: npm test"`). Used both by hook-driven status updates (`server/src/hookEventHandler.ts:397`) and JSONL-driven ones. The webview never tries to format tool descriptions itself - that lives in the provider.

### permissionExemptTools

```ts
readonly permissionExemptTools: ReadonlySet<string>;
```

`core/src/provider.ts:87-88`.

Tools that don't trigger permission timers. The heuristic `startPermissionTimer` in `server/src/timerManager.ts:96-148` skips any tool name in this set when checking whether to fire `agentToolPermission` after `PERMISSION_TIMER_DELAY_MS` (7 s).

For Claude: `Task`, `Agent`, `AskUserQuestion`.

### subagentToolNames

```ts
readonly subagentToolNames: ReadonlySet<string>;
```

`core/src/provider.ts:89-90`.

Tools that spawn sub-agent characters. Sent to the client in [`providerCapabilities`](./protocol/server-messages#providercapabilities), and used by the server to track which active tools own sub-agents (in `agent.activeSubagentToolIds`).

For Claude: `Task`, `Agent`.

### readingTools

```ts
readonly readingTools: ReadonlySet<string>;
```

`core/src/provider.ts:91-94`.

Tools that should show the **reading** character animation (sprite row 5–6) instead of **typing** (sprite row 3–4). Sent to the client in `providerCapabilities` so the webview can pick the animation per tool.

For Claude: `Read`, `Grep`, `Glob`, `WebFetch`, `WebSearch`.

### terminalNamePrefix

```ts
readonly terminalNamePrefix?: string;
```

`core/src/provider.ts:95-97`.

Terminal name prefix used when launching this CLI. Used by the VS Code extension to match terminals to agents during heuristic adoption (when a terminal exists but the agent hasn't registered for hooks yet).

For Claude: `CLAUDE_TERMINAL_NAME_PREFIX` from `server/src/providers/hook/claude/constants.ts`.

## Optional fields - file fallback (heuristic mode)

These power the heuristic mode that activates when hooks aren't installed or `hookDelivered` is false on an agent.

### getSessionDirs

```ts
getSessionDirs?(workspacePath: string): string[];
```

`core/src/provider.ts:101-102`. Workspace-scoped session directories to scan.

> Session directories to scan. Undefined = no file fallback.

Claude's implementation (`server/src/providers/hook/claude/claude.ts:71-94`) returns `~/.claude/projects/<workspace-path-with-dashes>` with a case-insensitive Windows fallback for drive letter casing.

### getAllSessionRoots

```ts
getAllSessionRoots?(): string[];
```

`core/src/provider.ts:103-107`. Root directories containing every session this provider may have started across all workspaces. Powers the "Watch All Sessions" toggle.

Claude returns `[~/.claude/projects]` (`server/src/providers/hook/claude/claude.ts:108-110`).

### sessionFilePattern

```ts
readonly sessionFilePattern?: string;
```

`core/src/provider.ts:108-109`. Glob pattern for session files. Claude: `'*.jsonl'`.

### parseTranscriptLine

```ts
parseTranscriptLine?(line: string): AgentEvent | null;
```

`core/src/provider.ts:110-111`. Parses one line of a transcript file into an `AgentEvent`. Used by the JSONL polling fallback. For Claude this is the body of `server/src/transcriptParser.ts`. Note: in the current Claude provider, this hook is not directly wired through the `parseTranscriptLine` field - the transcriptParser module handles parsing internally using the same `formatToolStatus` and capability sets.

### buildLaunchCommand

```ts
buildLaunchCommand?(
  sessionId: string,
  cwd: string,
  opts?: { bypassPermissions?: boolean },
): {
  command: string;
  args: string[];
  env?: Record<string, string>;
};
```

`core/src/provider.ts:112-121`. Builds the CLI launch command for the "+ Agent" button.

Claude's implementation (`server/src/providers/hook/claude/claude.ts:96-104`):

```ts
function buildLaunchCommand(
  sessionId: string,
  cwd: string,
  opts?: { bypassPermissions?: boolean },
): { command: string; args: string[]; env?: Record<string, string> } {
  const args = ['--session-id', sessionId];
  if (opts?.bypassPermissions) args.push('--dangerously-skip-permissions');
  return { command: 'claude', args, env: { PWD: cwd } };
}
```

## Optional fields - team extension

### team

```ts
readonly team?: TeamProvider;
```

`core/src/provider.ts:125-127`. Optional reference to a [`TeamProvider`](./teamprovider). From the doc comment:

> When set, the hook handler registers team-aware branches (subagent routing, teammate discovery, permission forwarding, etc.).

When `team` is undefined, every team-gated code path is a no-op - no dead branches, no stubs. The handler checks `this.provider.team` before any team-aware logic (`server/src/hookEventHandler.ts:83-91, 318-321, 329-337, 485`).

For Claude, `team: claudeTeamProvider` (see [teamprovider.md](./teamprovider)).

## Provider registration

Providers are imported by `server/src/providers/index.ts` (the `claudeProvider` re-export). The runtime owner is `AgentRuntime`, which receives the provider in its constructor and wires it into the file watcher, transcript parser, and hook event handler (`server/src/agentRuntime.ts:72-93`):

```ts
constructor(
  private readonly store: AgentStateStore,
  provider: HookProvider,
) {
  setDismissalTracker(this.dismissalTracker);
  setHookProvider(provider);                  // transcriptParser
  setFileWatcherHookProvider(provider);       // fileWatcher
  if (provider.team) {
    setTeamProvider(provider.team);           // fileWatcher (team-aware path)
  }
  // ...
  this.hookEventHandler = new HookEventHandler(
    store,
    this.waitingTimers,
    this.permissionTimers,
    provider,
    new SessionRouter(),
    this.watchAllSessions,
  );
}
```

## Claude reference implementation

The full Claude `HookProvider` object is at `server/src/providers/hook/claude/claude.ts:255-279`:

```ts
export const claudeProvider: HookProvider = {
  kind: 'hook',
  id: 'claude',
  displayName: 'Claude Code',
  protocolVersion: 1,

  normalizeHookEvent,

  installHooks,
  uninstallHooks,
  areHooksInstalled,

  formatToolStatus,
  permissionExemptTools: new Set(['Task', 'Agent', 'AskUserQuestion']),
  subagentToolNames: new Set(['Task', 'Agent']),
  readingTools: new Set(['Read', 'Grep', 'Glob', 'WebFetch', 'WebSearch']),
  terminalNamePrefix: CLAUDE_TERMINAL_NAME_PREFIX,

  getSessionDirs,
  getAllSessionRoots,
  sessionFilePattern: '*.jsonl',
  buildLaunchCommand,

  team: claudeTeamProvider,
};
```

Companion files (all under `server/src/providers/hook/claude/`):
- `claude.ts` - provider object and helpers (`formatToolStatus`, `normalizeHookEvent`, etc.).
- `claudeHookInstaller.ts` - installs/uninstalls Claude hook scripts in `~/.claude/settings.json`.
- `claudeTeamProvider.ts` - `TeamProvider` implementation for Agent Teams (see [teamprovider.md](./teamprovider)).
- `hooks/claude-hook.ts` - the actual hook script. Bundled to CJS by esbuild into `dist/hooks/claude-hook.js`.
- `constants.ts` - `CLAUDE_TERMINAL_NAME_PREFIX` etc.

For the full mapping of hook event names to `AgentEvent.kind`, see [hooks-coverage.md](./hooks-coverage).

## See also

- [protocol/agent-events.md](./protocol/agent-events) - the `AgentEvent` union this provider produces
- [teamprovider.md](./teamprovider) - the optional team extension
- [hooks-coverage.md](./hooks-coverage) - per-hook-event mapping table
- [state-management.md](./state-management) - `HookEventHandler`, `AgentStateStore`, `AgentRuntime`
- [errors.md](./errors) - protocol-version mismatch, malformed payloads
