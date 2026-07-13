---
sidebar_position: 3
---

# TeamProvider extension

:::warning[AI-generated docs]
This document was AI-generated and may have some mistakes - we apologize for this, we're in the process of reviewing all documents. If you find any issues, we'd be thankful if you [submit an edit PR](https://github.com/pixel-agents-hq/docs/edit/main/docs/build/providers/teamprovider-extension.md).
:::

This is an optional extension to a `HookProvider`. Skip this page entirely if your CLI does not have a "spawn a persistent background teammate" feature.

This page is separate from [Adding a provider](/build/providers/adding-a-provider) because most CLIs do not have teams. The base `HookProvider` already covers ephemeral sub-agents (Claude's `Task` tool, similar concepts in other CLIs). `TeamProvider` is only for the rarer pattern of long-lived teammates that survive across many turns.

## When to implement TeamProvider

Implement `TeamProvider` only if the CLI exposes a distinct mechanism for spawning persistent teammates separate from ephemeral subtasks. Claude is the reference: it has both:

- `Task` tool, an ephemeral subagent that runs within one parent turn and disappears.
- `Agent` tool with `run_in_background: true`, a persistent teammate that lives in its own JSONL file and can be re-invoked across many turns.

If your CLI only has one of those (ephemeral or persistent, but not both), you do not need `TeamProvider`. The base `HookProvider.subagentToolNames` set is enough.

The header on `core/src/teamProvider.ts:1-12` makes the rule explicit:

```ts
/**
 * Providers without team support simply don't set `HookProvider.team`. No team-
 * gated code runs for them -- no stubs, no dead branches.
 */
```

## The interface

`TeamProvider` is defined at `core/src/teamProvider.ts:13-66`. There are eight members. Walk through each one in order.

### providerId

```ts
providerId: string;
```

The CLI identifier, used for logging only. Match your `HookProvider.id` (`'claude'`, `'codex'`, etc.).

### teammateSpawnTools

```ts
teammateSpawnTools: ReadonlySet<string>;
```

Tool names that **can** spawn persistent teammates. This is a fast-path filter only, not the authoritative answer. The same tool name might also spawn basic subagents (Claude's `Agent` tool spawns either a teammate or a basic subagent depending on the `run_in_background` flag). Use `isTeammateSpawnCall` for the real decision.

Claude's value (`server/src/providers/hook/claude/claudeTeamProvider.ts:44`):

```ts
teammateSpawnTools: new Set(['Agent']),
```

### withinTurnSubagentTools

```ts
withinTurnSubagentTools: ReadonlySet<string>;
```

Tool names that spawn ephemeral, within-turn subagents tied to a parent tool call. These create the negative-ID sub-agent characters that appear and disappear within one turn. Claude's value:

```ts
withinTurnSubagentTools: new Set(['Task']),
```

The hook handler merges `teammateSpawnTools` and `withinTurnSubagentTools` into one combined set when finding parent tool ids for subagent events (`server/src/hookEventHandler.ts:82-91`).

### isTeammateSpawnCall

```ts
isTeammateSpawnCall(toolName: string, toolInput: Record<string, unknown>): boolean;
```

The authoritative predicate. Given a specific tool call (name plus input), decide whether this one spawns a persistent teammate. Inspect tool input flags.

Claude's implementation (`server/src/providers/hook/claude/claudeTeamProvider.ts:47-51`):

```ts
isTeammateSpawnCall(toolName, toolInput) {
  // Claude's Agent tool spawns a teammate ONLY when run_in_background is true.
  // Agent without that flag is a basic within-turn subagent (identical UX to Task).
  return toolName === 'Agent' && toolInput.run_in_background === true;
},
```

Without this predicate, the handler cannot distinguish a teammate spawn from a basic subagent spawn when the same tool name is reused. Get this right.

### extractTeammateNameFromEvent

```ts
extractTeammateNameFromEvent(event: Record<string, unknown>): string | undefined;
```

Pull the teammate's identity (their name) from a raw hook event payload. The handler uses this to route `TeammateIdle` and `TaskCompleted` hooks to the specific teammate.

Claude reads the `agent_type` field (`server/src/providers/hook/claude/claudeTeamProvider.ts:53-56`):

```ts
extractTeammateNameFromEvent(event) {
  const value = event.agent_type;
  return typeof value === 'string' ? value : undefined;
},
```

Return `undefined` when the event does not carry a teammate name. The handler falls back to marking all inline teammates as waiting (`server/src/hookEventHandler.ts:649-657`).

### discoverTeammates

```ts
discoverTeammates(
  projectDir: string,
  leadSessionId: string,
): Array<{ jsonlPath: string; teammateName: string }>;
```

Find every teammate that belongs to a given lead session. The provider picks the discovery mechanism (filesystem scan, API call, database query, in-memory cache). The returned `jsonlPath` is an opaque transcript handle the host hands back to adoption code, the `teammateName` identifies which member it is.

Claude scans `<projectDir>/<leadSessionId>/subagents/` for `.jsonl` files and reads each one's sidecar `.meta.json` for the `agentType` field (`server/src/providers/hook/claude/claudeTeamProvider.ts:58-76`):

```ts
discoverTeammates(projectDir, leadSessionId) {
  const dir = teammateDir(projectDir, leadSessionId);
  let entries: string[];
  try {
    entries = fs.readdirSync(dir);
  } catch {
    return []; // directory missing -> no teammates yet
  }
  const result: Array<{ jsonlPath: string; teammateName: string }> = [];
  for (const entry of entries) {
    if (!entry.endsWith('.jsonl')) continue;
    const jsonlPath = path.join(dir, entry);
    const teammateName = parseSidecarAgentType(jsonlPath);
    if (teammateName) {
      result.push({ jsonlPath, teammateName });
    }
  }
  return result;
},
```

If your CLI stores teammates differently (one big database row, an API endpoint, a SQLite file), just return the same shape. The host does not care how you found them.

### getTeamMetadataForSession

```ts
getTeamMetadataForSession(jsonlPath: string): {
  teamName: string;
  agentName?: string;
} | null;
```

Given a transcript path, return team metadata if the session participates in a team. Return `null` if it does not.

`agentName` is undefined for the lead and set to the teammate's name for a teammate.

Claude reads the first line of the JSONL and looks for `teamName` plus optional `agentName` fields (`server/src/providers/hook/claude/claudeTeamProvider.ts:78-102`).

If your CLI keeps team metadata elsewhere (a sidecar file, an API call, a registry), return the same shape from whichever source.

### extractTeamMetadataFromRecord

```ts
extractTeamMetadataFromRecord(
  record: Record<string, unknown>,
): { teamName?: string; agentName?: string } | null;
```

The in-memory counterpart to `getTeamMetadataForSession`. Called by the transcript parser, which already has the parsed JSONL record and should not re-open the file.

Claude's implementation just reads the `teamName` and `agentName` fields from the record (`server/src/providers/hook/claude/claudeTeamProvider.ts:104-112`).

### getTeamMembers

```ts
getTeamMembers(teamName: string): Set<string> | null;
```

Return the currently active member names of a team. This is the source of truth for team membership. Return `null` if the team cannot be read (team dissolved, config missing, network error).

Claude reads `~/.claude/teams/<teamName>/config.json` and pulls out `members[].name` (`server/src/providers/hook/claude/claudeTeamProvider.ts:114-133`). An API-driven team store implements this without a file path.

The host calls `getTeamMembers` periodically to detect removals: a teammate that used to be in the set and no longer is gets removed from the office. Return `null` to signal "I cannot answer", which is treated differently from returning an empty set (which means "team exists but has no members").

## Wiring TeamProvider into your HookProvider

Attach the `TeamProvider` via the optional `team` field on your `HookProvider` (`core/src/provider.ts:123-127`):

```ts
import { codexTeamProvider } from './codexTeamProvider.js';

export const codexProvider: HookProvider = {
  // ...all the other fields
  team: codexTeamProvider,
};
```

When `team` is set, `HookEventHandler` registers team-aware branches: subagent routing splits by `isTeammateSpawnCall`, the merged subagent set drives `getSubagentToolSet()`, and `TeammateIdle` / `TaskCompleted` events route to specific teammates via `extractTeammateNameFromEvent` (`server/src/hookEventHandler.ts:308-342, 474-686`).

When `team` is undefined, none of that code runs. The handler treats subagent events as basic within-turn subagents only.

## The shape of a complete TeamProvider

A minimal teammate-aware provider has both files. Below is the `codexTeamProvider.ts` skeleton you would write (hypothetical, your CLI's details differ):

```ts
// server/src/providers/hook/codex/codexTeamProvider.ts
import * as fs from 'fs';
import * as path from 'path';

import type { TeamProvider } from '../../../../../core/src/teamProvider.js';

export const codexTeamProvider: TeamProvider = {
  providerId: 'codex',

  teammateSpawnTools: new Set(['spawn_agent']),
  withinTurnSubagentTools: new Set(['subtask']),

  isTeammateSpawnCall(toolName, toolInput) {
    return toolName === 'spawn_agent' && toolInput.persistent === true;
  },

  extractTeammateNameFromEvent(event) {
    const name = event.agent_name;
    return typeof name === 'string' ? name : undefined;
  },

  discoverTeammates(projectDir, leadSessionId) {
    // Codex stores teammates under <projectDir>/<lead>/teammates/<name>.jsonl
    const dir = path.join(projectDir, leadSessionId, 'teammates');
    let entries: string[];
    try {
      entries = fs.readdirSync(dir);
    } catch {
      return [];
    }
    return entries
      .filter((e) => e.endsWith('.jsonl'))
      .map((e) => ({
        jsonlPath: path.join(dir, e),
        teammateName: e.replace(/\.jsonl$/, ''),
      }));
  },

  getTeamMetadataForSession(jsonlPath) {
    // Inspect the file header or a sidecar; return null if not a team session
    try {
      const first = fs.readFileSync(jsonlPath, 'utf-8').split('\n', 1)[0];
      const rec = JSON.parse(first) as { team_name?: unknown; agent_name?: unknown };
      if (typeof rec.team_name !== 'string') return null;
      return {
        teamName: rec.team_name,
        agentName: typeof rec.agent_name === 'string' ? rec.agent_name : undefined,
      };
    } catch {
      return null;
    }
  },

  extractTeamMetadataFromRecord(record) {
    const teamName = record.team_name;
    if (typeof teamName !== 'string') return null;
    const agentName = record.agent_name;
    return {
      teamName,
      agentName: typeof agentName === 'string' ? agentName : undefined,
    };
  },

  getTeamMembers(teamName) {
    // Read whatever store the CLI uses
    return null; // stub until you know how Codex stores teams
  },
};
```

## The reference implementation

`server/src/providers/hook/claude/claudeTeamProvider.ts` is short enough to read end to end (135 lines). It is the canonical example for all eight methods. The two helpers at the top (`sidecarPath`, `parseSidecarAgentType`, `teammateDir`) are private to the file and not part of the interface, those are Claude-specific filesystem layout.

## How the host uses TeamProvider

You do not need to know the host internals to implement TeamProvider, but it helps to know roughly when each method is called:

- `isTeammateSpawnCall` called at every `PreToolUse` hook (`server/src/hookEventHandler.ts:405-406`). The result is stored on `agent.currentHookIsTeammateSpawn` and consulted when the matching `SubagentStart` arrives.
- `extractTeammateNameFromEvent` called when routing `SubagentStart`, `TeammateIdle`, and `TaskCompleted` to a specific teammate.
- `discoverTeammates` called via the `onTeammateDetected` lifecycle callback when a new teammate spawn is detected.
- `getTeamMetadataForSession` and `extractTeamMetadataFromRecord` called by transcript adoption code (the file watcher) to label a newly discovered transcript as a teammate.
- `getTeamMembers` called periodically by the host to detect removals (teammate no longer in members list -> remove agent).

## Cross references

- Interface contract: [TeamProvider reference](/reference/teamprovider).
- Agent Teams concept: [Agent teams](/learn/agent-teams).
- Base provider doc: [Providers overview](/build/providers/overview).
- End-to-end Claude walkthrough including the team paths: [Reference implementation](/build/providers/reference-implementation).
