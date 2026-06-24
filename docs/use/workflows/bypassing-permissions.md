---
sidebar_position: 4
---

# Bypassing permissions safely

Claude Code supports a `--dangerously-skip-permissions` flag that suppresses every permission prompt. Pixel Agents has a UI toggle (per-agent at spawn time) and a corresponding `LaunchAgent.bypassPermissions` protocol field that uses it.

This page explains when it's reasonable to enable, when it isn't, and what guardrails exist.

The flag is named "dangerous" for a reason. Read this page before turning it on.

## What --dangerously-skip-permissions does

When Claude Code is launched with this flag, every tool that would normally require a permission prompt (Bash commands, file writes outside the project, network access, etc.) runs without asking. The character in Pixel Agents will still animate; the permission bubble will never appear because there's no permission to grant.

This is genuinely dangerous because:

- A malicious or buggy prompt could trigger Bash commands you didn't expect.
- Agent Teams can spawn teammates that inherit the same lack of guardrails.
- File modifications outside the project directory are silent.

The Anthropic team ships the flag with a deliberately scary name to discourage casual use.

## When it's reasonable

- **Throwaway containers.** You're running Claude inside a Docker container or a VM, the container's filesystem is disposable, and the network is sandboxed. There's nothing to protect.
- **Tight project scope.** You've manually narrowed Claude's working directory to a small, isolated path (e.g. an experimental fork) and you know it has no access to credentials.
- **Pure-text tasks.** You're using Claude to read and summarize documents with no tool calls that touch sensitive resources. (In this case, you probably don't need the flag at all - just don't say yes to permission prompts.)
- **CI/CD pipelines.** A scripted environment where the agent runs against a checked-out clone of your repo with no other access. The CI's own sandboxing is the boundary.

## When it's not reasonable

- **Your developer laptop.** Your home directory has SSH keys, AWS credentials, browser cookies, and your work email. Don't.
- **Production servers.** Obvious.
- **Shared systems** where other users could be affected by accidentally-rooted operations.
- **Anything connected to your `git push` credentials** unless you're 100% sure of every command Claude will run.

If you're not sure, default to "not reasonable."

## How to enable per-agent in VS Code

The + Agent button has a dropdown caret. Click it to reveal options:

- Standard launch (no bypass).
- Bypass permissions (with a confirmation prompt).

Selecting "Bypass permissions" passes `bypassPermissions: true` in the `LaunchAgent` message. The extension constructs the launch command with the `--dangerously-skip-permissions` flag.

You'll see a confirmation dialog the first time you do this in a workspace. Subsequent launches in the same workspace don't re-prompt. This is a deliberate friction-vs-convenience trade-off; the team chose to ask once per workspace rather than every time.

## How to enable in standalone

Standalone doesn't have a "+ Agent" button. To launch a bypass-permissions session, run Claude yourself with the flag:

```sh
claude --dangerously-skip-permissions
```

The session is detected as external. There's no UI distinction in the office between a bypass-permissions external agent and a regular external agent; the underlying Claude process handles permission suppression itself.

## What you'll see in the office

| Action | Without bypass | With bypass |
|---|---|---|
| Bash tool starts | Reading/typing animation | Same |
| Permission prompt fires | Amber "..." bubble | No bubble (no prompt fired) |
| Tool completes | Status returns to idle | Same |

The visual signals around "is this agent waiting" change: if you toggle bypass on, you'll never see permission bubbles for that agent. Idle bubbles still fire normally for text-only turn ends.

## Guardrails Pixel Agents itself enforces

Pixel Agents does not validate `--dangerously-skip-permissions` usage. The flag is a Claude Code concern; we just pass it through.

That said:

- The first-time bypass confirmation in VS Code is on by default and can't be disabled programmatically.
- The protocol field `LaunchAgent.bypassPermissions` is opt-in per call; there's no global "always bypass" setting in Pixel Agents.
- External agents (those Claude'd outside our UI) are detected the same way regardless of bypass status; we don't differentiate.

## Combining with hooks

Hooks deliver events for tool starts and ends regardless of permission status. With hooks + bypass, you still get instant tool animations; you just lose the permission bubble.

If you find yourself wanting bypass primarily to avoid the false-positive permission bubbles in heuristic mode: that's a sign you should enable hooks instead. Hooks give you accurate permission detection without sacrificing safety.

## Combining with Agent Teams

If the lead is launched with `--dangerously-skip-permissions`, teammates inherit it (each is a new Claude process that uses the same launch flags). This compounds the risk: bypassing one agent silently bypasses N teammates.

For Agent Teams in a sandboxed environment this is fine. On your laptop it's a multiplier on the danger.

## Reverting

There's no "disable bypass" toggle for an already-running agent. The flag is set at process start. To stop bypassing:

1. Close the agent (X button or terminal exit).
2. Spawn a new one without the flag.

## Manual mode (without the flag)

If you find normal permission prompts too friction-heavy but you're not ready for full bypass, consider:

- Approving more aggressively (Claude lets you say "yes, and always allow this kind of tool"). The next time the same tool fires, no prompt.
- Curating an allow-list in Claude's settings if it supports one.
- Running Claude in a more sandboxed environment so prompts can be safely auto-yes.

## Reporting issues

If `bypassPermissions: true` is being passed unexpectedly (e.g. the UI says "no bypass" but Claude is launched with the flag), that's a bug. File at [github.com/pixel-agents-hq/pixel-agents/issues](https://github.com/pixel-agents-hq/pixel-agents/issues) with:

- The exact LaunchAgent payload you sent (visible in Output → Pixel Agents).
- The launch command the extension ran.
- The flag the Claude process is actually using (visible via `ps aux | grep claude`).

## Related

- [LaunchAgent protocol field](/reference/protocol/client-messages)
- [Enabling hooks](./enabling-hooks) - the right fix for false-positive permission bubbles.
- [HookProvider.buildLaunchCommand](/reference/hookprovider) - where the bypass flag is applied for Claude.
- [VS Code troubleshooting > permission bubbles](/use/vscode/troubleshooting)
