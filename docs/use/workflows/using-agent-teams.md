---
sidebar_position: 2
---

# Using Agent Teams

Claude Code's Agent Teams feature spawns persistent teammates from a lead session. Pixel Agents visualizes them as full characters in the office, color-grouped with the lead, doing their own work in parallel.

For the conceptual model, see [Agent Teams (Learn)](/learn/agent-teams). For the underlying interface, see [TeamProvider reference](/reference/teamprovider).

## When to use teams

You want teams when:

- You have a complex task that benefits from delegated parallel work (e.g. one teammate refactors auth while another writes tests for the migration).
- The work is decomposable into chunks that don't constantly need to coordinate.
- The lead can act as the orchestrator and the teammates as workers.

You don't want teams when:

- The work is fundamentally serial.
- The cost of token usage for parallel sessions outweighs the speed gain.
- You're working on something where each agent needs to see the others' output in real time (teammates don't share context the way humans on a Zoom call do).

## Prerequisites

- Claude Code with Agent Teams support (`Agent` tool with `run_in_background: true` available).
- Pixel Agents with hooks enabled is strongly recommended (without hooks, teammate detection is heuristic and can be flaky).
- A clear task to delegate; "do something useful" is not a team task.

## Step-by-step: spawn a team

### 1. Start a lead session

Spawn Claude in the usual way (+ Agent in VS Code, or `claude` in any terminal under standalone's watched dir).

A character appears for the lead.

### 2. Create a team

In the lead's terminal, ask Claude to spawn teammates. Phrasing examples:

> Spawn three teammates for this refactoring: one for the auth module, one for the migration tests, one for the docs.

Claude will use the `Agent` tool with `run_in_background: true` for each teammate. Each call:

1. Fires a `PreToolUse` hook (which Pixel Agents records as a background tool).
2. Eventually fires a `SubagentStart` hook with the teammate's identity.
3. The teammate begins running on its own.

### 3. Watch teammates appear

Within a second or two, teammate characters appear in the office. They share the lead's palette with hue shifts so they're visually grouped.

Each teammate has:

- Its own session ID and JSONL file.
- Its own seat.
- Its own activity (reading, typing, etc.).
- An `AgentTeamInfo` message broadcasting team metadata (team name, teammate name, lead agent ID).

### 4. Direct the team

The lead is the orchestrator. You talk to the lead; the lead distributes work to teammates. You don't usually talk to teammates directly.

When a teammate completes a task, it fires `SubagentStop(reason='completed')`. The teammate character stays (persistent), but the lead's tool tracking knows the work is done.

When a teammate is idle and ready for more work, it fires `SubagentStop(reason='idle')`. Same persistence; the lead can re-task.

### 5. Permission flow

This is the part that requires hooks. Claude's permission flow is **lead-driven**: when a teammate's tool needs permission, the prompt fires on the lead's terminal, not the teammate's.

The corresponding hook is `Notification(permission_prompt)` delivered to the lead. Pixel Agents routes the permission visualization to the teammate character (the one actually waiting) by consulting `agent.currentHookIsTeammateSpawn` and the `activeSubagentToolNames` map.

In heuristic mode, the 7-second permission timer can detect stuck teammates but the routing is less precise.

### 6. End a team

Three ways:

- **End the lead session** (`/exit` or close the terminal). Teammates close with the lead.
- **Specific teammate stops being a member** (e.g. removed from the team config). The runtime detects via `team.getTeamMembers()` and removes that teammate only.
- **You manually dismiss a teammate** via its X button. The teammate's transcript is dismissed and the agent is removed; if Claude is still spawning that teammate, it may reappear after the 3-minute dismissal cooldown.

## What you'll see in the office

| Visual | Meaning |
|---|---|
| Multiple characters with the same palette + similar hue shifts | A team (one lead + N teammates). |
| Lead character with a "background tool" indicator | The lead has spawned a teammate that's running in the background. |
| Teammate character running its own tools | Normal teammate activity. Same animations as a top-level agent. |
| Permission bubble on a teammate | A teammate's tool is waiting for permission. The actual prompt is on the lead's terminal. |

## Tool routing

Claude's tools that interact with teams:

| Tool | What it does | Pixel Agents reaction |
|---|---|---|
| `Agent` (with `run_in_background: true`) | Spawn a persistent teammate. | New teammate character. |
| `Agent` (without `run_in_background`) | Spawn an ephemeral sub-agent. | Negative-ID sub-agent character, despawns when done. |
| `Task` | Spawn an ephemeral sub-agent. | Same as `Agent` without background. |
| `TeamCreate` | Create a team config. | Status text `Creating team: <name>` on the lead. |
| `SendMessage` | Message a specific teammate. | Status text on the lead naming the recipient. |

The `Agent` vs `Task` distinction (and the within-`Agent` distinction by `run_in_background`) is decided by `TeamProvider.isTeammateSpawnCall(toolName, toolInput)`. See [TeamProvider reference](/reference/teamprovider).

## Multi-window with teams

If you have the lead's session in window A and you open window B (same workspace), both windows see the lead and all teammates. Each window connects to the same server; both render from the same broadcast.

If you have multiple lead sessions (e.g. two different feature workstreams, each with its own team), they coexist. Each team has its own palette family.

## Persistence

Teammates persist via `~/.pixel-agents/<namespace>-state.json`. After a VS Code restart, teammates whose JSONL files still exist will be restored. Teammates whose lead is gone (and weren't independently re-adopted) won't.

In standalone, `runtime.restoreExternalAgents()` handles the restore. See [Agent lifecycle](/learn/agent-lifecycle).

## Limits

- Teams require the provider's `team` field to be set. Today only Claude has this.
- The maximum number of teammates is a Claude product limit, not a Pixel Agents one.
- Teammates can spawn their own sub-agents (`Task`), but not their own teammates (no nested teams today).

## Tuning the experience

A few settings in Pixel Agents that interact with teams:

- **Hooks enabled** (Settings): strongly recommended for teams. Without hooks, teammate detection and permission routing are heuristic and can mis-fire.
- **Watch all sessions** (Settings): if your team spawns teammates whose JSONL files end up in a different `~/.claude/projects/` subdir, this catches them.
- **Always show labels** (Settings): useful when running many teammates so you can see who's doing what at a glance.

## Troubleshooting teams

| Symptom | Likely cause |
|---|---|
| Teammates appear once then never again | `team.getTeamMembers()` returned null (team config unreadable). Verify `~/.claude/teams/<teamName>/config.json` exists. |
| Permission bubble fires on the lead instead of the teammate | Hooks aren't delivering routing info; the heuristic falls back to the parent. Verify hooks. |
| Teammates spawn but immediately despawn | Their JSONL files are mtime-old (`EXTERNAL_ACTIVE_THRESHOLD_MS = 120_000ms`); the stale check removed them. Check that Claude is actually writing to them. |
| One teammate's character has a different palette | Visual identity is assigned per session ID. If the teammate's session ID was recycled, you may see a stale palette. Restart the lead. |

## Related

- [Agent Teams (concept)](/learn/agent-teams)
- [TeamProvider reference](/reference/teamprovider)
- [Adding teammate support to a provider](/build/providers/teamprovider-extension)
- [Hooks coverage - SubagentStart/SubagentStop](/reference/hooks-coverage)
- [Enabling hooks](./enabling-hooks)
