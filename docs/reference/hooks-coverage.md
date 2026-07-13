---
sidebar_position: 9
---

# Hooks Coverage

:::warning[AI-generated docs]
This document was AI-generated and may have some mistakes - we apologize for this, we're in the process of reviewing all documents. If you find any issues, we'd be thankful if you [submit an edit PR](https://github.com/pixel-agents-hq/docs/edit/main/docs/reference/hooks-coverage.md).
:::

Per-provider hook-event → `AgentEvent` mapping. Today only the `claude` provider ships hooks; this page is the single canonical table for what each hook event does.

Source of truth: `HookProvider.normalizeHookEvent` in `server/src/providers/hook/claude/claude.ts`. The normalized `AgentEvent` shape is at `core/src/provider.ts:14-56`.

For the conceptual companion, see [Hooks vs heuristic](/learn/hooks-vs-heuristic). For the receiver, see [HookEventHandler](./state-management#hookeventhandler).

## Claude Code (provider claude)

Eleven hook events ship. Every successful delivery sets `agent.hookDelivered = true`, which suppresses the heuristic timers in `server/src/timerManager.ts`. Constants at `server/src/constants.ts:11-19`.

| Hook event | Raw fields used | Normalized `AgentEvent.kind` | Downstream effect |
|---|---|---|---|
| `UserPromptSubmit` | - | `turnEnd` (synthetic, when a previous turn was open) | Sets `hookDelivered`; resets `hadToolsInTurn`. Used as instant signal that a new turn has started. |
| `PreToolUse` | `tool_name`, `tool_use_id`, `tool_input` | `toolStart` (with `toolId`, `toolName`, `input`) + possibly `runInBackground: true` if `tool_input.run_in_background === true` | Adds to `activeToolIds`, broadcasts `agentToolStart`, cancels permission timer, sets agent active. |
| `PostToolUse` | `tool_name`, `tool_use_id` | `toolEnd` | Removes from `activeToolIds`, broadcasts `agentToolDone` (300ms delayed via `TOOL_DONE_DELAY_MS`). |
| `PostToolUseFailure` | `tool_name`, `tool_use_id`, `error` | `toolEnd` | Same as PostToolUse. Failure detail logged but not surfaced in UI today. |
| `Stop` | - | `turnEnd` | Clears all foreground tools, broadcasts `agentToolsClear`, then `agentStatus: 'active'`. |
| `PermissionRequest` | `tool_name`, `tool_use_id` | `permissionRequest` | Broadcasts `agentToolPermission`, sets `permissionSent = true`. |
| `Notification` | `notification_type` (`'waiting_for_input'` / `'permission_prompt'`) | (no kind) - direct mapping | `waiting_for_input` → broadcasts `agentStatus: 'waiting'`. `permission_prompt` → broadcasts `agentToolPermission`. |
| `SessionStart` | `source` (`'startup'` / `'clear'` / `'resume'` / `'compact'`), `transcript_path`, `cwd` | `sessionStart` (with `source`, `transcriptPath`, `cwd`) | Three branches: known agent → set `hookDelivered`. Pending external → confirm and create agent. `source=clear` or `resume` → reassign existing agent to new transcript via `onSessionClear` callback. |
| `SessionEnd` | `reason` (`'exit'` / `'logout'` / `'clear'` / `'compact'`) | `sessionEnd` (with `reason`) | `reason=clear`/`resume` → set `pendingClear=true` and start a grace timer (`SESSION_END_GRACE_MS = 2000`). `reason=exit`/`logout` → fire `onSessionEnd`, remove external agents, dismiss the JSONL file. |
| `SubagentStart` | `tool_use_id` (parent), `tool_name`, `agent_type`, `session_id` (subagent) | `subagentStart` (basic) or teammate detection (via `team.isTeammateSpawnCall`) | Basic → broadcasts `subagentToolStart`. Teammate → fires `onTeammateDetected`, which scans for the teammate's JSONL via `team.discoverTeammates` and adopts it as a new agent. |
| `SubagentStop` | `tool_use_id` (parent), `reason` (`'idle'` / `'completed'`) | `subagentTurnEnd` (with `reason`) | `idle` → no removal (teammate persists). `completed` → broadcasts `subagentClear` and removes the within-turn subagent character. For teammates, this signals readiness for more work. |

### Notes per event

#### UserPromptSubmit

The first hook fired when a user submits input to Claude. Fires before any `PreToolUse` for the new turn. Used as the "agent woke up" instant signal: the heuristic mode otherwise had to wait for `agent.lastDataAt` to update and infer activity.

#### PreToolUse and PostToolUse

The most frequent pair. Each tool execution produces a `PreToolUse` → optional progress → `PostToolUse`. The `tool_use_id` is the stable cross-event identifier; `tool_name` is matched against `provider.readingTools` to choose the reading vs typing animation in the webview.

A tool input flag `run_in_background: true` (on `Agent` calls) marks the call as a teammate spawn; the normalized `AgentEvent.runInBackground === true`. This is what the `provider.team.isTeammateSpawnCall` predicate inspects to distinguish persistent teammates from within-turn subagents (both can use the same `Agent` tool name).

#### Stop

Authoritative turn-end. The handler clears all foreground tool state as a safety measure (preserving background agent tools registered via `runInBackground`). This is the reliable signal for tool-using turns. Text-only turns may not fire `Stop` for several seconds; the `TEXT_IDLE_DELAY_MS = 5000` heuristic timer handles those.

#### PermissionRequest vs Notification(permission_prompt)

Both indicate a permission prompt. `PermissionRequest` is the structured event tied to a specific tool call. `Notification(permission_prompt)` is a UI-level event that may fire for non-tool prompts. The webview merges both into the same speech-bubble state.

For teammates, only `Notification(permission_prompt)` reliably fires (via the lead's hook). Teammates do not fire their own `PermissionRequest` because Claude's permission flow is lead-driven.

#### SessionStart (source breakdown)

| Source | Meaning | Handler action |
|---|---|---|
| `startup` | Fresh session began. | Try to match an existing agent by sessionId. If unmatched and trackable (within workspace or Watch All Sessions on), fire `onExternalSessionDetected`. |
| `clear` | User ran `/clear`. New JSONL file. | Match the existing agent in this project dir with `pendingClear === true`; reassign it to the new transcript path. |
| `resume` | User ran `--resume`. | Clear dismissal for the resumed transcript so the agent re-appears. |
| `compact` | Conversation compaction (auto). | Same flow as resume. |

The pending-clear two-tick delay (`DismissalTracker.registerPendingClear`) gives `SessionStart` time to arrive after the preceding `SessionEnd(reason=clear)`.

#### SubagentStart routing

The routing rule:

```ts
if (provider.team && provider.team.isTeammateSpawnCall(toolName, toolInput)) {
  // Teammate spawn: persistent agent, separate transcript
  fireOnTeammateDetected(parentToolId, sessionId, agentType);
} else {
  // Basic subagent: ephemeral, attached to parent tool
  broadcastSubagentToolStart(parentToolId, subToolId, toolName);
}
```

The lead agent's `currentHookIsTeammateSpawn` flag (set in the matching `PreToolUse`) is the authoritative source; the team predicate has to be consulted **before** `PreToolUse` completes because `PostToolUse` may arrive before `SubagentStart`. See `server/src/types.ts:42-48`.

#### SubagentStop

For ephemeral subagents, `reason=completed` triggers removal. For teammates, `reason=idle` means "ready for more work" (teammate persists in the office); `reason=completed` means the teammate finished its assigned task but the persistent agent stays alive.

## Common fields across all events

| Field | Type | Notes |
|---|---|---|
| `hook_event_name` | string | The event kind. Used to dispatch in `normalizeHookEvent`. |
| `session_id` | string | The Claude session ID. Used by `SessionRouter` to map to an agent. |
| `transcript_path` | string? | Path to the JSONL transcript file. Provided on `SessionStart`. |
| `cwd` | string? | Working directory the session was started in. Provided on `SessionStart`. |

The full Claude payload shape is the upstream contract; Pixel Agents reads only the fields it needs. If Claude adds new fields, they're ignored unless we add normalization for them.

## Failure modes

| Symptom | Likely cause |
|---|---|
| Hooks fire but no events received by the server | Hook script can't read `~/.pixel-agents/server.json` (file missing, stale PID, bad token). |
| `protocolVersion` mismatch logged in console | Provider declares a version other than 1; events dropped. Bump provider or runtime. |
| Permission bubbles never appear | Hook script not installed (or installed for a different server). Toggle hooks off and on. |
| Agents linger after `/clear` | `SessionEnd(reason=clear)` arrived but `SessionStart(source=clear)` didn't (CLI crashed mid-clear). `SESSION_END_GRACE_MS = 2000` falls back to full removal. |

## Related

- [Hooks vs heuristic (concept)](/learn/hooks-vs-heuristic)
- [HookProvider reference](./hookprovider)
- [AgentEvent reference](./protocol/agent-events)
- [Errors reference](./errors)
- [Reference provider implementation](/build/providers/reference-implementation)
