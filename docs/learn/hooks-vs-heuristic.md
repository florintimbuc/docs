---
sidebar_position: 5
---

# Hooks vs heuristic

Pixel Agents has two ways of knowing what an agent is doing in real time. The preferred one is the Claude Code Hooks API: Claude itself POSTs an event to our server every time something interesting happens (a tool starts, a tool ends, the turn is done, a permission prompt appears). The fallback is file watching: we tail the JSONL transcript and run a set of timers that infer the same signals heuristically.

This page explains why both exist, when each is active, and what changes when the switch flips.

## The two modes, in one sentence

**Hooks mode** is push-based, instant, and unambiguous. **Heuristic mode** is pull-based, lagged by polling intervals, and approximate.

Both modes can be active for the same process at the same time. The webview never sees this directly. The server decides per agent which signals it trusts. The flag that controls the per-agent decision is called `hookDelivered`.

## Why hooks are preferred

When you ask Claude to read a file, you want the character on the canvas to turn into the "reading" animation immediately. Hooks deliver that signal directly. The `PreToolUse` hook fires before Claude executes the tool. The server receives the POST inside a few milliseconds, normalizes it to an `AgentEvent` with `kind: 'toolStart'`, and broadcasts a `agentToolStart` message. The canvas updates on the next animation frame. Total latency is dominated by network and React render, both well under a frame.

Compare that with the heuristic. Without hooks, the server can only learn that a tool started by polling the JSONL transcript at `FILE_WATCHER_POLL_INTERVAL_MS = 500` (`server/src/constants.ts:3`), reading the new lines, parsing them, and matching them to `tool_use` blocks. The fastest possible reaction is 500ms. The actual reaction is longer because the partial-line buffer waits for the newline before parsing a record. And the turn-end signal arrives even later, because the JSONL's `turn_duration` record only appears after the model is fully done. For text-only turns it never appears at all, which is why heuristic mode has a 5-second silence timer (covered below).

The differences compound when an agent is waiting on a permission prompt. Hooks send a `PermissionRequest` event the moment Claude pauses for user input. Heuristic mode has no way to see that pause directly. It uses a 7-second tool-active timer: if a non-exempt tool has been "in progress" for 7 seconds with no new activity, the server assumes a permission prompt is up and shows the dots over the character. This works most of the time, but it is approximate by construction. WebFetch and WebSearch genuinely take that long sometimes. The hook removes the guesswork.

## Why heuristic mode still exists

Hooks are not always available. There are three realistic reasons:

1. **The user turned them off.** Hooks edit `~/.claude/settings.json` on the user's machine. Some users prefer not to. The Settings modal in the webview lets them toggle it off explicitly.
2. **The hook install failed.** A read-only home directory, a permissions problem on `~/.pixel-agents/hooks/`, a missing Node binary. The install function returns false and we carry on with heuristic mode.
3. **The provider does not support hooks at all.** The `HookProvider` interface has optional file-fallback fields (`getSessionDirs`, `parseTranscriptLine`, `sessionFilePattern`, see `core/src/provider.ts:99-111`). A future provider for a CLI that ships no hook system can still produce events purely from the transcript. The same heuristic timers cover it.

So heuristic mode is the safety net. It is intentionally a degraded experience, but it works.

## The `hookDelivered` flag

The per-agent switch is a single boolean on `AgentState`. It starts at `false`. The first time the `HookEventHandler` successfully routes a hook event to that agent, it flips to `true`. The flag is set in three places in `server/src/hookEventHandler.ts`:

- Line 165: on a `SessionStart` event that registers a previously pending external session.
- Line 177: on a `SessionStart` event that registers a normal session.
- Line 299: on every subsequent event delivered to a known agent.

Once the flag is true, the heuristic timers that *guess* status are suppressed. They are gated by `!agent.hookDelivered` checks scattered across the code:

- `server/src/fileWatcher.ts:118`: suppresses one set of heuristic state transitions.
- `server/src/fileWatcher.ts:221`: suppresses the permission timer escalation.
- `server/src/transcriptParser.ts:158, 176, 185, 191, 241, 292`: suppresses the JSONL-derived inference inside the transcript parser.

Note what is *not* suppressed. The JSONL is still polled, still parsed, and still used to drive the *content* of status text and the *frame* of the animation. The animation that decides "Reading foo.ts" vs "Writing bar.ts" comes from the tool name and input, which the parser extracts whether hooks are active or not. Only the *timing inference* (am I idle? am I in a permission prompt?) is suppressed when `hookDelivered` is true.

This is important because it explains why turning hooks on still benefits from a clean JSONL: the words on the status label, the tool-specific animation, and the sub-agent characters are all derived from the transcript content, even in hooks mode.

## The 11 Claude hook events (overview)

The Claude provider listens for 11 hook event names. Each one maps to a normalized `AgentEvent.kind` via `HookProvider.normalizeHookEvent`. We don't repeat the full per-event mapping table here. That lives in [Reference → Hooks coverage](/reference/hooks-coverage) and is the canonical place to look up what each event does.

A high-level inventory:

- `SessionStart` and `SessionEnd` mark the agent's session boundary. Used for spawn/despawn effects and `/clear` detection.
- `UserPromptSubmit` fires when the user pressed Enter in the terminal. An instant signal that the agent is alive and that a turn has begun.
- `PreToolUse` fires when Claude is about to execute a tool. Instant transition to "active" with the right animation.
- `PostToolUse` and `PostToolUseFailure` mark a completed tool (success or failure). Triggers the 300ms `TOOL_DONE_DELAY_MS` delay before dispatching the "done" message to the webview to prevent UI flicker.
- `Stop` means the turn is complete. The reliable equivalent of the JSONL `turn_duration` record but earlier and less ambiguous.
- `PermissionRequest` means Claude is paused for a permission prompt.
- `Notification` carries generic notifications, including the idle and permission-prompt UI states.
- `SubagentStart` and `SubagentStop` cover sub-agent lifecycle. Drives the negative-id ghost characters and the team-routing logic.

Each of these signals would otherwise require either polling, timing inference, or both. The aggregate effect of having all 11 active is that the office reacts to Claude as fast as Claude's own UI does.

## The heuristic timers (overview)

When `hookDelivered` is false, the server falls back to four explicit timers, all defined as constants in `server/src/constants.ts:10-19`:

| Constant | Value | Purpose |
|---|---|---|
| `TOOL_DONE_DELAY_MS` | 300ms | UI flicker prevention. After a tool ends, wait 300ms before clearing it from the active set, in case another tool starts immediately. |
| `PERMISSION_TIMER_DELAY_MS` | 7000ms | After a non-exempt tool starts and 7 seconds pass with no JSONL activity, show the permission dots. Not used for teammates, which rely on the lead's routed `Notification(permission_prompt)` hook (see comment at `server/src/constants.ts:13-15`). |
| `TEXT_IDLE_DELAY_MS` | 5000ms | For text-only turns (no tools used), the JSONL has no `turn_duration` record. After 5 seconds of complete silence, assume the turn is done. |
| `CLEAR_IDLE_THRESHOLD_MS` | 2000ms | Per-agent `/clear` detection. After 2 seconds with no JSONL writes, the content check that looks for `/clear</command-name>` in the first 8KB is allowed to run. |

The `TOOL_DONE_DELAY_MS` is interesting because it is active in both modes. Even with hooks, two adjacent tools that complete and start within 300ms would cause the canvas to briefly drop to "idle" and snap back. The 300ms hold smooths that out.

The other three timers are only useful when hooks are not delivering events. They're the safety net for the safety net: even if your JSONL is being polled, you still need explicit rules to decide what silence means.

## File watching mechanics

The JSONL polling is intentionally hybrid. We use `fs.watch` for instant notifications when the kernel says the file changed, and we also poll at `FILE_WATCHER_POLL_INTERVAL_MS = 500`. The polling exists because `fs.watch` is unreliable on Windows. Without the polling backup, events get lost on Windows under network drives, watched directories, and other edge cases the CLAUDE.md condensed lessons file calls out explicitly.

Reading a JSONL file that another process is appending to is its own problem. The append might land mid-line. The server keeps a per-agent line buffer and only emits records on a complete `\n`. Partial lines stay in the buffer until the next read finds the terminator. This avoids parsing half a JSON object.

The session router decides which session id belongs to which agent. The dismissal tracker remembers files the user has closed via the X button so we don't immediately re-adopt them on the next scan. Together they prevent the most annoying UX failure of file watching: a closed agent reappearing because its JSONL was modified after the close.

## When the fallback kicks in

There are three switching surfaces the user can see:

**Per-agent.** When `hookDelivered` is false for one agent but true for another, the runtime treats them differently. This happens transiently: a new agent always starts with `hookDelivered: false` until the first hook lands. It also happens permanently for adopted external agents whose Claude is configured without hooks.

**Per-window.** The `hooksEnabled` ref on `AgentRuntime` is the global toggle. When the user turns hooks off in Settings, this becomes false. The server unregisters the Claude hook scripts and from that moment on, no agent will have `hookDelivered = true`.

**Per-provider.** A `HookProvider` whose `installHooks` returns rejected, or whose `areHooksInstalled` returns false, simply never delivers events. The runtime is unaware of the difference between "hooks are off" and "hooks are broken". Both look the same from inside.

## What this means for users

If you see misfires (a "thinking..." cloud that stays up for 7 seconds before the dots appear, or a brief animation flicker between adjacent tools), you are almost certainly in heuristic mode for that agent. Open the Settings modal and check that hooks are enabled. Then check that `~/.claude/settings.json` actually contains the Pixel Agents hook entries. If both are correct and you still see lag, the JSONL polling might be racing the model's writes.

The [Use → Standalone → Troubleshooting](/use/standalone/troubleshooting) page collects the user-visible symptoms and their fixes.

## What this means for integrators

If you are writing a new `HookProvider`, the practical implication is that you do not have to implement hooks. You can ship a transcript-polling provider on day one and the runtime will treat it as a permanent heuristic-mode setup. The timers will all run. The user experience will be 500ms-1s laggier than Claude with hooks, but it will work.

If you are writing a new provider with hooks, you only need to set `agent.hookDelivered = true` once per agent (the runtime does it for you on first successful event delivery). The rest of the suppression logic is automatic. You do, however, need to think carefully about what each hook event maps to in the `AgentEvent` union. The mapping is canonical and the same handler runs for all providers. If you call `kind: 'toolStart'` when the tool has not actually started yet, you will get permission dots seven seconds later because the heuristic permission timer has nothing to suppress it.

For the full per-event map, see [Reference → Hooks coverage](/reference/hooks-coverage). For the rationale behind the dual-mode design, see [The fallback section in the architecture overview](/learn/architecture#how-a-hook-event-becomes-a-sprite-move).

## A small worked example

Here is what happens when Claude runs `Read foo.ts` in both modes.

**Hooks mode.**

1. Claude emits `PreToolUse` hook with `tool_name: "Read"`, `tool_input: { file_path: "foo.ts" }`.
2. `claude-hook.js` POSTs to `/api/hooks/claude` in ~10ms.
3. `HookEventHandler` normalizes to `{ kind: 'toolStart', toolId, toolName: 'Read', input: { file_path: 'foo.ts' } }` and sets `agent.hookDelivered = true`.
4. The store broadcasts `agentToolStart` with status text `"Reading foo.ts"`.
5. The canvas renders the "reading" animation at the next rAF tick (~16ms after the hook event).
6. Claude finishes the read, emits `PostToolUse`.
7. The server schedules `agentToolDone` 300ms later (`TOOL_DONE_DELAY_MS`) to avoid flicker.
8. The next tool start cancels the 300ms timer and the animation stays active.

Total perceived latency: a single frame.

**Heuristic mode.**

1. Claude writes the `tool_use` record to the JSONL. The JSONL is at most 500ms stale (the poll interval).
2. The next poll reads the new line, the parser identifies the `tool_use` block, and the server broadcasts `agentToolStart` with status text `"Reading foo.ts"`.
3. The canvas renders the "reading" animation. Perceived latency: 0-500ms.
4. The permission timer starts (7 seconds). If a `tool_result` arrives before the timer fires, the timer is cancelled and the tool is marked done after `TOOL_DONE_DELAY_MS`.
5. If 7 seconds pass and nothing arrives, the permission dots appear over the character.

The user sees the same end result. The hooks-mode path is just smoother and never gets the false positives that the permission timer can produce on slow tools.
