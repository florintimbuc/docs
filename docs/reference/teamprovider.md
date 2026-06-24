---
sidebar_position: 7
---

# TeamProvider Reference

Optional extension on [HookProvider](./hookprovider) for CLIs that support the Lead + Teammates pattern. Today only Claude Code's Agent Teams uses it. Other CLIs do not set `HookProvider.team` and no team-gated code runs for them.

Source of truth: `core/src/teamProvider.ts:13-66`.

Conceptual companion: [Agent Teams (Learn)](/learn/agent-teams). For the implementation walkthrough, see [Adding teammate support to a provider](/build/providers/teamprovider-extension).

## Design principle

The interface is **semantic-level**: the host asks WHAT, the provider chooses HOW. The host calls "give me the current members of this team," not "open this sidecar file and read this field." Each provider picks its own storage (filesystem, API, database) and exposes only the queries.

Providers without team support simply do not set `HookProvider.team`. No stubs, no dead branches, no team-gated code paths execute for non-team providers.

## Interface

```ts
// core/src/teamProvider.ts:13-66
export interface TeamProvider {
  providerId: string;

  teammateSpawnTools: ReadonlySet<string>;
  withinTurnSubagentTools: ReadonlySet<string>;

  isTeammateSpawnCall(
    toolName: string,
    toolInput: Record<string, unknown>,
  ): boolean;

  extractTeammateNameFromEvent(event: Record<string, unknown>): string | undefined;

  discoverTeammates(
    projectDir: string,
    leadSessionId: string,
  ): Array<{ jsonlPath: string; teammateName: string }>;

  getTeamMetadataForSession(
    jsonlPath: string,
  ): { teamName: string; agentName?: string } | null;

  extractTeamMetadataFromRecord(
    record: Record<string, unknown>,
  ): { teamName?: string; agentName?: string } | null;

  getTeamMembers(teamName: string): Set<string> | null;
}
```

## Fields

### `providerId`

```ts
providerId: string;
```

CLI identifier (e.g. `'claude'`, `'codex'`). Used in log lines so multi-provider hosts can disambiguate.

### `teammateSpawnTools`

```ts
teammateSpawnTools: ReadonlySet<string>;
```

Tool names that **can** spawn persistent teammates. Fast-path gate only: the runtime checks this set to decide whether to even consider a tool call as a possible teammate spawn. The authoritative decision is `isTeammateSpawnCall()` (below).

Claude: `new Set(['Agent'])`. The `Agent` tool spawns a teammate when called with `run_in_background: true`, and a within-turn subagent otherwise.

### `withinTurnSubagentTools`

```ts
withinTurnSubagentTools: ReadonlySet<string>;
```

Tool names that spawn **ephemeral**, within-turn subagents. These appear as negative-ID sub-agent characters in the webview and disappear when the parent tool completes.

Claude: `new Set(['Task'])`. Optionally also `Agent` (without `run_in_background`).

### `isTeammateSpawnCall`

```ts
isTeammateSpawnCall(toolName: string, toolInput: Record<string, unknown>): boolean;
```

Authoritative predicate: does **this specific tool call** spawn a persistent teammate? Inspects `toolInput` for flags that disambiguate the same tool name.

Why this exists: the same tool name (`Agent`) can spawn either a teammate or an ephemeral subagent depending on `run_in_background`. Without this method, the runtime cannot tell them apart from the tool name alone.

Claude's implementation (paraphrased - see `server/src/providers/hook/claude/claudeTeamProvider.ts`):

```ts
isTeammateSpawnCall(toolName, toolInput) {
  if (toolName !== 'Agent') return false;
  return toolInput.run_in_background === true;
}
```

### `extractTeammateNameFromEvent`

```ts
extractTeammateNameFromEvent(event: Record<string, unknown>): string | undefined;
```

Extracts a teammate's identity (name) from a raw hook event payload **before normalization**. Used to route `SubagentStart`, `TeammateIdle`, and `TaskCompleted` hooks to the specific teammate agent.

Why pre-normalization: the normalized `AgentEvent` does not carry teammate identity (it's a provider-specific concept). The router needs raw access.

Claude: reads the `agent_type` field. Returns `undefined` if not present.

### `discoverTeammates`

```ts
discoverTeammates(
  projectDir: string,
  leadSessionId: string,
): Array<{ jsonlPath: string; teammateName: string }>;
```

Find all teammate transcripts belonging to a given lead session. Provider chooses how to discover them: filesystem scan, API call, in-memory cache, database query.

The returned `jsonlPath` is an opaque transcript handle the caller hands back to adoption code (`scanForTeammateFiles` in `server/src/fileWatcher.ts`). The `teammateName` identifies which team member it is.

Claude: scans `~/.claude/projects/<project-hash>/subagents/<lead-session-id>/` for `.jsonl` files, extracts the teammate's `agent_type` from the first line of each.

### `getTeamMetadataForSession`

```ts
getTeamMetadataForSession(jsonlPath: string): { teamName: string; agentName?: string } | null;
```

Return team metadata for a session if it participates in a team. Provider decides where to look (sidecar file, JSONL header, DB, etc.). Returns `null` if the session is not part of a team.

- `teamName` always set when the result is non-null.
- `agentName` is `undefined` for the lead and set to the teammate's name for a teammate.

Claude: reads `~/.claude/teams/<teamName>/sessions/<sessionId>.json` (sidecar files). If the file exists, returns the team's name and the role.

### `extractTeamMetadataFromRecord`

```ts
extractTeamMetadataFromRecord(
  record: Record<string, unknown>,
): { teamName?: string; agentName?: string } | null;
```

In-memory counterpart to `getTeamMetadataForSession`. Used by `transcriptParser.ts` where it already has a parsed JSONL record and should not re-open the file.

Same return shape as `getTeamMetadataForSession`, but called per-record rather than per-session.

Claude: pulls `record.team` if present (a header line embeds it on team-managed sessions).

### `getTeamMembers`

```ts
getTeamMembers(teamName: string): Set<string> | null;
```

Get the currently-active member names of a team. Source of truth for team membership. Returns the Set of names, or `null` if the team can't be read (team dissolved, missing config, permissions error).

Claude: reads `~/.claude/teams/<teamName>/config.json` and returns the `members[].name` array as a `Set`. Providers using API-driven team stores would implement this without a file path.

## Attaching a TeamProvider

A HookProvider opts in by setting the `team` field:

```ts
export const claudeProvider: HookProvider = {
  // ... other fields ...
  team: claudeTeamProvider,
};
```

`HookEventHandler` checks `provider.team` and conditionally registers team-aware branches (subagent routing, teammate discovery, permission forwarding) - see `server/src/hookEventHandler.ts:83-91`:

```ts
private getSubagentToolSet(): ReadonlySet<string> {
  if (this.provider.team) {
    return new Set<string>([
      ...this.provider.team.teammateSpawnTools,
      ...this.provider.team.withinTurnSubagentTools,
    ]);
  }
  return this.provider.subagentToolNames;
}
```

## Lifecycle in the runtime

When `provider.team` is set, `AgentRuntime` wires `setTeamProvider(provider.team)` (`server/src/agentRuntime.ts:80-82`) so the file-watching layer can find teammate transcripts.

The `onTeammateDetected` lifecycle callback (`server/src/agentRuntime.ts:143-159`) fires when a `SubagentStart` hook indicates a new teammate has appeared. The runtime then calls `scanForTeammateFiles` to find the teammate's transcript and adopt it as a new agent.

The `onTeammateRemoved` callback (lines 160-162) fires when a teammate is no longer in the team's `getTeamMembers` set, triggering removal.

## Related

- [Agent Teams concept](/learn/agent-teams)
- [Adding teammate support to a provider](/build/providers/teamprovider-extension)
- [HookProvider reference](./hookprovider)
- [AgentTeamInfo message variant](./protocol/server-messages)
- [State management reference](./state-management)
