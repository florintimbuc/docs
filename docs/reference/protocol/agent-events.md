---
sidebar_position: 5
---

# AgentEvent Reference

:::warning[AI-generated docs]
This document was AI-generated and may have some mistakes - we apologize for this, we're in the process of reviewing all documents. If you find any issues, we'd be thankful if you [submit an edit PR](https://github.com/pixel-agents-hq/docs/edit/main/docs/reference/protocol/agent-events.md).
:::

`AgentEvent` is the **normalized provider-internal contract** between the [`HookProvider.normalizeHookEvent`](../hookprovider#normalizehookevent) function and the server's [`HookEventHandler`](../state-management#hookeventhandler). It never travels over the wire - clients always see [`ServerMessage`](./server-messages).

The shape is defined in `core/src/provider.ts:14-56`:

```ts
export type AgentEvent =
  | {
      kind: 'toolStart';
      toolId: string;
      toolName: string;
      input?: unknown;
      /** True when the tool was spawned to run in the background (e.g. Claude's
       *  `run_in_background` on Agent/Task). Handlers use this to suppress ghost
       *  sub-agent characters for teammate spawns. */
      runInBackground?: boolean;
    }
  | { kind: 'toolEnd'; toolId: string }
  | { kind: 'turnEnd' }
  | {
      kind: 'subagentStart';
      parentToolId: string;
      toolId: string;
      toolName: string;
      input?: unknown;
      runInBackground?: boolean;
    }
  | { kind: 'subagentEnd'; parentToolId: string; toolId: string }
  | {
      kind: 'subagentTurnEnd';
      parentToolId: string;
      /** 'idle' = subagent is idle and ready for more work; 'completed' = subagent
       *  reported its task done. Some providers emit only one; both route to the
       *  same handler but with different downstream cleanup. */
      reason: 'idle' | 'completed';
    }
  | { kind: 'progress'; toolId: string; data: unknown }
  | { kind: 'permissionRequest' }
  | {
      kind: 'sessionStart';
      source?: string;
      /** For external-session adoption: path to the session's transcript file
       *  (if the provider uses one). Undefined for providers without transcripts. */
      transcriptPath?: string;
      /** Working directory the session was started in. Used to match pending
       *  external sessions against known workspace folders. */
      cwd?: string;
    }
  | { kind: 'sessionEnd'; reason?: string };
```

Discriminator: `kind`.

## Flow

```
Raw CLI JSON
   │
   ▼
HookProvider.normalizeHookEvent(raw)  →  { sessionId, event: AgentEvent } | null
   │
   ▼
HookEventHandler.handleEvent  →  switch on event.kind
   │
   ▼
AgentStateStore.broadcast  →  ServerMessage on /ws
```

A provider sees a raw CLI-specific payload (Claude: snake_case fields like `tool_name`, `tool_input`, `agent_type`), translates it to one of the kinds below, and returns it alongside the `sessionId`. Returning `null` silently drops the event. See the Claude implementation at `server/src/providers/hook/claude/claude.ts:123-235`.

The server then dispatches on `event.kind`, **not** on the raw hook name (`server/src/hookEventHandler.ts:308-341`):

```ts
switch (normEvent.kind) {
  case 'sessionEnd':       return this.handleSessionEnd(normEvent, agent, agentId);
  case 'toolStart':        return this.handlePreToolUse(normEvent, agent, agentId);
  case 'toolEnd':          return this.handlePostToolUse(agent, agentId);
  case 'subagentStart':    return this.provider.team ? this.handleSubagentStart(event, agent, agentId) : undefined;
  case 'subagentEnd':      return this.provider.team ? this.handleSubagentStop(agent, agentId) : undefined;
  case 'permissionRequest': return this.handlePermissionRequest(agent, agentId);
  case 'turnEnd':          return this.handleStop(agent, agentId);
  case 'subagentTurnEnd':  /* team-routing */
  case 'progress':         /* drop, not yet consumed by office viz */
}
```

---

## Kinds

### toolStart

`core/src/provider.ts:15-24`.

Tool execution started.

| Field | Type | Required | Description |
|---|---|---|---|
| `kind` | `'toolStart'` | yes | Discriminator |
| `toolId` | `string` | yes | Tool invocation ID. May be synthetic (`hook-<ts>`) when the raw payload doesn't carry it. |
| `toolName` | `string` | yes | Tool name (e.g. `"Read"`, `"Bash"`) |
| `input` | `unknown` | no | Raw tool input (typically `Record<string, unknown>`) - passed to `formatToolStatus` |
| `runInBackground` | `boolean` | no | True when the tool was spawned to run in the background (Claude's `run_in_background` on Agent/Task). Handlers use this to suppress ghost sub-agent characters for teammate spawns. |

```json
{
  "kind": "toolStart",
  "toolId": "hook-1716835000000",
  "toolName": "Read",
  "input": { "file_path": "/path/to/server.ts" }
}
```

**Produced by:** Claude `PreToolUse` hook → `server/src/providers/hook/claude/claude.ts:131-147`.

**Routed to:** `HookEventHandler.handlePreToolUse` (`server/src/hookEventHandler.ts:386-438`) which:
1. Records `currentHookToolId`, `currentHookToolName`, `currentHookIsTeammateSpawn` on the agent.
2. Cancels waiting timer (`agent.isWaiting = false`).
3. Broadcasts `agentToolStart` (skipped for `Task`/`Agent` - JSONL handles those).
4. Broadcasts `agentStatus: active`.

---

### toolEnd

`core/src/provider.ts:25`.

Tool execution finished.

| Field | Type | Required | Description |
|---|---|---|---|
| `kind` | `'toolEnd'` | yes | Discriminator |
| `toolId` | `string` | yes | Tool invocation ID. Claude uses the sentinel string `'current'` because the raw `PostToolUse` payload doesn't carry the id; the handler uses its tracked `currentHookToolId`. |

```json
{ "kind": "toolEnd", "toolId": "current" }
```

**Produced by:** Claude `PostToolUse` AND `PostToolUseFailure` hooks both normalize to `toolEnd` - the downstream handler is identical for both (`server/src/providers/hook/claude/claude.ts:149-151`).

**Routed to:** `HookEventHandler.handlePostToolUse` (`server/src/hookEventHandler.ts:445-458`) which broadcasts `agentToolDone` and clears the tracked `currentHookToolId`.

---

### turnEnd

`core/src/provider.ts:26`.

Agent finished its turn (model is no longer responding).

| Field | Type | Required | Description |
|---|---|---|---|
| `kind` | `'turnEnd'` | yes | Discriminator |

```json
{ "kind": "turnEnd" }
```

**Produced by:** Two Claude hooks normalize to `turnEnd` (`server/src/providers/hook/claude/claude.ts:153-194`):
- `Stop` - model finished generating.
- `Notification` with `notification_type: "idle_prompt"` - user is being prompted for input.

**Routed to:** `HookEventHandler.handleStop` → `markAgentWaiting` (`server/src/hookEventHandler.ts:617-619, 693-735`) which:
1. Cancels waiting + permission timers.
2. Clears foreground tools, preserves background agents.
3. Re-broadcasts background agent tools after `agentToolsClear`.
4. Sets `agent.isWaiting = true`, `agent.hadToolsInTurn = false`.
5. Broadcasts `agentStatus: waiting`.

---

### subagentStart

`core/src/provider.ts:27-34`.

A sub-agent began. Only routed when the active provider has a [`TeamProvider`](../teamprovider) attached.

| Field | Type | Required | Description |
|---|---|---|---|
| `kind` | `'subagentStart'` | yes | Discriminator |
| `parentToolId` | `string` | yes | Parent tool ID. Sentinel `'current'` for Claude - handler resolves it from `agent.activeToolNames`. |
| `toolId` | `string` | yes | Sub-agent's tool ID (synthetic: `hook-sub-<agentType>-<ts>`) |
| `toolName` | `string` | yes | The teammate / sub-agent name (Claude: `agent_type` value, or `'unknown'`) |
| `input` | `unknown` | no | Raw hook payload (the team provider may read `agent_type` etc.) |
| `runInBackground` | `boolean` | no | True when the spawn flagged `run_in_background` (teammate path vs basic subagent path) |

```json
{
  "kind": "subagentStart",
  "parentToolId": "current",
  "toolId": "hook-sub-explorer-1716835000000",
  "toolName": "explorer",
  "runInBackground": true
}
```

**Produced by:** Claude `SubagentStart` hook (`server/src/providers/hook/claude/claude.ts:160-173`).

**Routed to:** `HookEventHandler.handleSubagentStart` (`server/src/hookEventHandler.ts:474-533`). Path selection:

- **Teammate path** - when `agent.currentHookIsTeammateSpawn === true` AND `agent.teamName` is set, calls `onTeammateDetected` lifecycle callback. The teammate is discovered as an independent agent (its own JSONL file), not a sub-agent character.
- **Within-turn subagent path** - broadcasts `subagentToolStart` with the resolved `parentToolId`.

---

### subagentEnd

`core/src/provider.ts:35`.

A sub-agent finished.

| Field | Type | Required | Description |
|---|---|---|---|
| `kind` | `'subagentEnd'` | yes | Discriminator |
| `parentToolId` | `string` | yes | Parent tool ID. Sentinel `'current'` for Claude. |
| `toolId` | `string` | yes | Sub-agent's tool ID. Sentinel `'current'` for Claude. |

```json
{
  "kind": "subagentEnd",
  "parentToolId": "current",
  "toolId": "current"
}
```

**Produced by:** Claude `SubagentStop` hook (`server/src/providers/hook/claude/claude.ts:175-179`).

**Routed to:** `HookEventHandler.handleSubagentStop` (`server/src/hookEventHandler.ts:543-584`). For inline teammates (independent agents sharing the lead's session_id), marks them waiting. For basic within-turn subagents, broadcasts `subagentClear`.

---

### subagentTurnEnd

`core/src/provider.ts:36-43`.

A teammate signaled the end of its turn. The `reason` discriminates two cases:

| Field | Type | Required | Description |
|---|---|---|---|
| `kind` | `'subagentTurnEnd'` | yes | Discriminator |
| `parentToolId` | `string` | yes | Parent tool ID (sentinel `'current'` for Claude) |
| `reason` | `'idle' \| 'completed'` | yes | `'idle'` = teammate is idle and ready for more work; `'completed'` = teammate reported its task done |

```json
{
  "kind": "subagentTurnEnd",
  "parentToolId": "current",
  "reason": "idle"
}
```

**Produced by:**
- Claude `TeammateIdle` → `reason: 'idle'`.
- Claude `TaskCompleted` → `reason: 'completed'`.

`server/src/providers/hook/claude/claude.ts:216-228`.

**Routed to:** `HookEventHandler` dispatches by reason (`server/src/hookEventHandler.ts:329-337`):
- `'completed'` → `handleTaskCompleted` (`hookEventHandler.ts:663-686`)
- `'idle'` → `handleTeammateIdle` (`hookEventHandler.ts:627-657`)

Both routes use the raw hook event to call `TeamProvider.extractTeammateNameFromEvent` for routing to the specific teammate.

---

### progress

`core/src/provider.ts:44`.

Progress data for a long-running tool.

| Field | Type | Required | Description |
|---|---|---|---|
| `kind` | `'progress'` | yes | Discriminator |
| `toolId` | `string` | yes | Tool invocation ID |
| `data` | `unknown` | yes | Provider-specific payload |

```json
{
  "kind": "progress",
  "toolId": "toolu_01ABCDxyz",
  "data": { "type": "bash_progress", "output": "..." }
}
```

**Produced by:** Not currently produced by Claude's hook normalizer (Claude emits progress via JSONL `progress` records, not hooks). Reserved for future providers.

**Routed to:** Silently dropped (`server/src/hookEventHandler.ts:338-340`). The office visualization does not yet consume `progress` events delivered via hooks.

---

### permissionRequest

`core/src/provider.ts:45`.

A permission prompt is awaiting the user.

| Field | Type | Required | Description |
|---|---|---|---|
| `kind` | `'permissionRequest'` | yes | Discriminator (no payload) |

```json
{ "kind": "permissionRequest" }
```

**Produced by:** Both Claude `PermissionRequest` and `Notification(notification_type: "permission_prompt")` normalize to this single kind (`server/src/providers/hook/claude/claude.ts:181-194`).

**Routed to:** `HookEventHandler.handlePermissionRequest` (`server/src/hookEventHandler.ts:587-614`) which:
1. Cancels the heuristic permission timer.
2. Sets `agent.permissionSent = true`.
3. Broadcasts `agentToolPermission`.
4. Broadcasts `subagentToolPermission` for each active sub-agent.

For inline-teammate scenarios, the permission is routed to teammates instead of the lead.

---

### sessionStart

`core/src/provider.ts:46-55`.

A session began.

| Field | Type | Required | Description |
|---|---|---|---|
| `kind` | `'sessionStart'` | yes | Discriminator |
| `source` | `string` | no | Reason - Claude emits `startup`, `resume`, `clear`, or absent |
| `transcriptPath` | `string` | no | Path to the session's transcript file. Undefined for providers without transcripts. |
| `cwd` | `string` | no | Working directory the session was started in. Used to match pending external sessions against known workspace folders. |

```json
{
  "kind": "sessionStart",
  "source": "clear",
  "transcriptPath": "/Users/alice/.claude/projects/.../01HXYZ.jsonl",
  "cwd": "/Users/alice/proj"
}
```

**Produced by:** Claude `SessionStart` hook (`server/src/providers/hook/claude/claude.ts:196-205`).

**Routed to:** Special handling in `HookEventHandler.handleEvent` (`server/src/hookEventHandler.ts:151-235`):
- Known agent → mark `hookDelivered = true`.
- Unknown session with `transcriptPath` or `cwd` → store as pending external session in [`SessionRouter`](../state-management#sessionrouter); confirm when a follow-up event arrives.
- `source === 'clear'` or `source === 'resume'` → reassign an agent whose `pendingClear` is set.

---

### sessionEnd

`core/src/provider.ts:56`.

A session ended.

| Field | Type | Required | Description |
|---|---|---|---|
| `kind` | `'sessionEnd'` | yes | Discriminator |
| `reason` | `string` | no | Reason - Claude emits `exit`, `logout`, `clear`, `resume`, `prompt_input_exit`, etc. |

```json
{ "kind": "sessionEnd", "reason": "exit" }
```

**Produced by:** Claude `SessionEnd` hook (`server/src/providers/hook/claude/claude.ts:207-214`).

**Routed to:** `HookEventHandler.handleSessionEnd` (`server/src/hookEventHandler.ts:348-383`). Special two-step behavior for `clear` / `resume`:
1. Set `agent.pendingClear = true`.
2. Mark waiting.
3. Wait up to `SESSION_END_GRACE_MS` (2 s) for the follow-up `SessionStart`. If it never arrives, fire `onSessionEnd` so the agent is cleaned up.

All other reasons trigger immediate cleanup.

---

## The runInBackground flag

`runInBackground` appears on both `toolStart` and `subagentStart`. It's set when the tool was spawned to run in the background - for Claude that's the `Agent` or `Task` tool with `run_in_background: true` in its input.

Why it matters: a teammate spawn (persistent agent) and a basic within-turn subagent (ephemeral child character) both look like `Agent` calls in the raw payload. The `runInBackground` flag is the protocol-level signal that this is the teammate path. The authoritative predicate is [`TeamProvider.isTeammateSpawnCall`](../teamprovider#isteammatespawncall) (provider chooses how to detect it), but the flag travels through `AgentEvent` for use by handlers downstream of normalization.

For Claude:

```ts
// PreToolUse normalization
return {
  sessionId,
  event: {
    kind: 'toolStart',
    toolId: `hook-${Date.now()}`,
    toolName,
    input: toolInput,
    runInBackground: toolInput.run_in_background === true,
  },
};
```

`server/src/providers/hook/claude/claude.ts:137-146`

```ts
// claudeTeamProvider.isTeammateSpawnCall
isTeammateSpawnCall(toolName, toolInput) {
  // Claude's Agent tool spawns a teammate ONLY when run_in_background is true.
  return toolName === 'Agent' && toolInput.run_in_background === true;
}
```

`server/src/providers/hook/claude/claudeTeamProvider.ts:47-51`

Handlers that need to suppress ghost sub-agent characters for teammate spawns check `agent.currentHookIsTeammateSpawn` (set in `handlePreToolUse` from `team.isTeammateSpawnCall`).

---

## See also

- [../hookprovider.md](../hookprovider) - the interface that produces `AgentEvent`s
- [../teamprovider.md](../teamprovider) - `isTeammateSpawnCall`, `extractTeammateNameFromEvent`
- [../state-management.md](../state-management) - `HookEventHandler` dispatch and timer interaction
- [../hooks-coverage.md](../hooks-coverage) - full per-hook-event → AgentEvent mapping table
- [server-messages.md](./server-messages) - the wire messages produced from these events
