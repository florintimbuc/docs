---
sidebar_position: 7
---

# AI Policy

> **Audience:** Maintainers reviewing AI-generated PRs, and contributors using AI tools.

Pixel Agents accepts AI-generated PRs. They're not categorically rejected. Several of the project's own internal tooling (`pixel-agents-architect`, `pixel-agents-reviewer`, `repo-cluster-planner`) is itself AI-driven. We are not philosophically opposed.

What we do require: the contributor be in the loop. AI is a tool you wield; the PR is yours. We review the diff, not the prompt.

## Expectations from AI-assisted contributors

- **You read the diff before submitting.** If you didn't read it, neither did the PR description, and we can tell.
- **You ran the basics locally:** `npm run typecheck`, `npm run lint`, `npm test`. CI catches them eventually, but it wastes a round-trip when they fail.
- **The PR description explains the change in human language.** "I prompted Claude to add a feature" is not a PR description. Why does this change exist? What problem is it solving? What did you consider and reject?
- **The change actually fits the architecture.** Read [/learn/architecture.md](/learn/architecture) and [/reference/state-management.md](/reference/state-management). AI tools that don't know the codebase tend to add abstractions over abstractions; we'd rather have a direct change.
- **You're available for follow-up.** A PR isn't a fire-and-forget. Reviewers will have questions.

## Red flags that get a PR closed

Patterns that indicate the diff didn't get human review:

### Generic AI commit messages

"feat: add new feature based on requirements" - what feature? Whose requirements? This level of vagueness means we'd need to read the entire diff before forming an opinion, and we have other PRs to review.

### Surgery over the entire repo for a small ask

A PR fixing a typo also rewrites `package.json` and adds three new abstractions. AI agents over-edit. The fix: stage only the relevant files. If your AI tool can't be told "just change these three lines," consider applying its output by hand.

### Tests that pass but don't test the change

Assertions like `expect(true).toBe(true)`, or tests that mock out the thing being tested. The change should be exercised by the test, not paper over.

### Comments that paraphrase the code

```ts
// Increments the counter by 1
counter++;
```

This is anti-pattern in any code, AI-written or not. Pixel Agents' style guide (in `.claude/CLAUDE.md` and the repo CLAUDE.md) is explicit: write comments only when the *why* is non-obvious. Don't explain *what* the code does.

### Files outside the obvious scope

PR title says "fix permission timer." Diff also touches `package.json`, `tsconfig.json`, and three webview files unrelated to permissions. The unrelated edits look like AI scope creep.

### "Improved error handling" with try/catch wrappers everywhere

Wrapping internal calls in try/catch for "safety" hides bugs. Our convention (also in `.claude/CLAUDE.md`): only validate at system boundaries. Internal code trusts its inputs.

## AI policy on protocol changes

**Never let an AI add a `ServerMessage` or `ClientMessage` variant without explicit human design review.**

The protocol (`core/asyncapi.yaml`) is contractual. Adding a variant is a one-way change - once shipped, removing or renaming it breaks every existing client. AI tools are good at writing the boilerplate (yaml + generated TS + handler stubs), but bad at recognizing whether the new variant is correct, whether existing variants could be reused, whether the name is right.

Human-design rule: if a PR adds anything to the `oneOf` lists in `core/asyncapi.yaml`, a maintainer must look at the design as a separate review step before approving the implementation. Ideally, an [ADR](/decisions/overview) precedes the change.

## For maintainers reviewing AI PRs

Apply normal review rigor plus an extra pass for the red flags above. The temptation is to either rubber-stamp ("AI did the work, must be fine") or reject outright ("AI = bad"). Both are wrong. The right stance: review the code on its merits, with awareness of the failure modes.

If you can't tell whether the change is correct from the diff alone, the PR description didn't do its job. Reply with [saved reply T6](./saved-replies#t6-ai-generated-pr-welcome) asking the contributor to explain.

The repo ships an internal `pixel-agents-reviewer` skill (multi-agent self-verifying review). It produces a tiered findings file. **Tier 1 findings (request changes) should be applied; tier 4 findings (praise) can be celebrated.** Tier 2 and tier 3 ("consult Pablo" and "suggestions") need human judgment. Don't blindly apply reviewer-suggested fixes; verify they're correct.

## The internal tooling is AI

The project itself uses AI heavily:

- `pixel-agents-architect` - plans features across extension host, webview UI, message protocol, and asset pipeline.
- `pixel-agents-implementer` - executes plans with team-based parallel implementation.
- `pixel-agents-reviewer` - three-agent code review with MCP self-verification.
- `repo-cluster-planner` - analyzes overlapping PRs and produces merge strategies.
- `repo-pr-review`, `repo-daily-triage`, `repo-fork-triage` - community maintenance automation.

This is documented openly because the project's identity isn't "human-written code only." It's "code that works, regardless of who or what wrote it." The bar is the same.

## What's not policy

- We don't require AI-tool disclosure in the PR description. We don't care which model you used.
- We don't reject PRs solely because the contributor used Claude / GPT-X / etc.
- We don't gate AI use behind feature flags or process. Use whatever tools help you.

## The escalation path

If a contributor sends an obviously low-effort AI PR and pushes back when asked to do the basics:

1. First exchange: ask for the basics. Use [T6](./saved-replies#t6-ai-generated-pr-welcome).
2. Second exchange (if no real engagement): close the PR with [T4](./saved-replies#t4-out-of-scope-pr) framed around effort, not AI use.
3. Repeat offenders: ignore. Don't engage in long debates about AI ethics on PRs.

## Related

- [Triage flow](./triage-flow) - where the `ai-generated` label is applied.
- [Saved replies](./saved-replies) - T6 for the welcome message.
- [/community/contributing.md](/community/contributing) - public-facing rules.
- The CLAUDE.md files in the repo root and `.claude/` for the project's own AI-collaboration conventions.
