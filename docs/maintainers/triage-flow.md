---
sidebar_position: 2
---

# Triage Flow

> **Audience:** Maintainers triaging GitHub PRs and issues.

## Cadence

| Activity | Cadence | Skill that helps |
|---|---|---|
| PR triage | Daily | `repo-daily-triage` |
| Issue triage | Weekly | `repo-daily-triage` |
| Fork triage | Every 2–3 days | `repo-fork-triage` |
| Cluster planning | On demand (when 3+ PRs conflict) | `repo-cluster-planner` |
| Deep PR review | On demand (substantial PRs) | `repo-pr-review` |

Daily PR triage is the highest-leverage activity: a five-minute pass keeps the queue clear and avoids the panic-triage every-two-weeks pattern.

## PR triage steps

For each new PR:

1. **Read the description.** If the description is one line or AI-generic ("feat: add new feature based on requirements"), reply with a saved-reply asking for context. See [saved-replies.md](./saved-replies) T3.
2. **Read the diff.** Skim for size and scope. Anything 1000+ lines or touching unrelated files gets a "scope creep" comment.
3. **Verify CI passes.** If red, comment with a link to the failing job. Don't review until green.
4. **Apply labels.** Taxonomy below.
5. **Decide:**
   - **Approve + merge** if small, well-tested, low-risk, and clearly aligned with the project.
   - **Request changes** if there are concrete fixes needed.
   - **Schedule for deeper review** if substantial - add a "needs-review" label and step away to do other triage.
   - **Close** if obviously out of scope or duplicate.
6. **For AI-generated PRs**, apply the `ai-generated` label and apply the AI policy ([ai-policy.md](./ai-policy)).
7. **For PRs that conflict with another open PR**, leave a note in both and consider invoking `repo-cluster-planner`.

## Issue triage steps

For each new issue:

1. **Classify**: bug, feature request, question, duplicate, won't-fix.
2. **Label**.
3. **Request reproduction** if it's a bug without steps. Use T1 saved reply.
4. **Close as duplicate** if it is. Use T2.
5. **For security reports**, do not respond in the public issue. Forward to `SECURITY.md` instructions.

## Label taxonomy

The actual labels live in the GitHub repo settings. This is the recommended canonical set; adjust to match what's set up.

### Type

| Label | Use |
|---|---|
| `bug` | Confirmed defect. |
| `feature` | New functionality request. |
| `enhancement` | Improvement to existing functionality. |
| `documentation` | Docs-only changes. |
| `question` | User question, not a bug or feature. |
| `duplicate` | Already filed. |
| `wontfix` | Decided not to address. |

### Area

| Label | Touches |
|---|---|
| `area:extension` | `adapters/vscode/` |
| `area:server` | `server/src/` (excluding providers) |
| `area:webview` | `webview-ui/` |
| `area:asset-pipeline` | `scripts/` (asset extraction), `webview-ui/public/assets/` |
| `area:layout-editor` | `webview-ui/src/office/editor/` |
| `area:hooks` | hook scripts, `claudeHookInstaller`, `hookEventHandler` |
| `area:providers` | `server/src/providers/` |
| `area:clients` | client-facing protocol concerns |
| `area:protocol` | `core/asyncapi.yaml`, `core/src/messages.ts` |

A PR can carry multiple area labels (a protocol change usually touches both `protocol` and `webview`).

### Status

| Label | Meaning |
|---|---|
| `needs-repro` | Bug filed without enough information; waiting for steps to reproduce. |
| `needs-design` | Proposal phase; implementation deferred. |
| `ready-for-review` | PR is ready for a maintainer to evaluate. |
| `blocked` | Cannot proceed without an upstream change, a decision, or another PR. |

### Audience

| Label | Meaning |
|---|---|
| `ai-generated` | PR was produced by an AI agent. Apply the AI policy. |
| `first-time-contributor` | New to the project; be welcoming and patient. |
| `security` | Touches security-sensitive code; raise the review bar. |

## Cluster planning

When three or more open PRs overlap in the same files, manual conflict resolution is slow and error-prone. Invoke `repo-cluster-planner`:

```bash
# (illustrative - see the skill's own README for invocation)
claude --skill repo-cluster-planner --args "PR-NNN PR-MMM PR-PPP"
```

It simulates each pairwise merge via git worktrees, builds an NxN compatibility matrix, and produces a recommended merge order with cherry-pick specifications.

## Daily / weekly reports

`repo-daily-triage` writes two files in `reports/`:

- `PR-TRIAGE-REPORT.md` - new PRs since last run, classification, suggested actions.
- `ISSUE-TRIAGE-REPORT.md` - same for issues.

Read these, act on them, then re-run the next day. Resolved items are folded into history; new items are appended.

`repo-fork-triage` writes `FORK-TRIAGE-REPORT.md` analyzing active forks for cherry-pick opportunities and outreach.

## When to escalate

| Situation | Action |
|---|---|
| Disagreement on whether to accept a feature | Discuss in maintainer Discord; if unresolved, defer to project lead (Pablo). |
| Protocol change proposed without an ADR | Request an ADR. See [/decisions/overview.md](/decisions/overview). |
| Security report received | Do not engage in the public issue. Send the reporter to the security contact in `SECURITY.md`. |
| AI-generated PR with red flags | Apply the AI policy and request changes. If the contributor doesn't engage or fixes are superficial, close politely. |

## Avoiding triage debt

- Triage all new items the day they arrive, even if you only label and move on. Unlabeled items become invisible.
- Close PRs that have been stale for 30+ days with no updates. Use T4 saved reply.
- The "needs-repro" label should auto-close after 14 days of inactivity (GitHub action; check that it's enabled).
- If the queue grows past ~50 open PRs, schedule a half-day triage sprint.

## Related

- [Saved replies](./saved-replies) - for the templated responses referenced above.
- [Release cutting](./release-cutting) - what happens after PRs land.
- [Incident runbook](./incident-runbook) - for the failure modes.
- [/community/contributing.md](/community/contributing) - what contributors are told about the process.
- [AI policy](./ai-policy) - the rules applied to AI-generated PRs.
