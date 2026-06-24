---
sidebar_position: 1
title: Overview
---

# For Maintainers

> **Audience:** Pixel Agents maintainers and prospective maintainers. These pages are public but audience-flagged. End users won't typically need them.

Pixel Agents has a ~7.7k-star GitHub repo and tens of thousands of installs across the VS Code Marketplace, Open VSX, and npm. Maintenance is mostly: triage incoming PRs and issues, review for quality, cut releases, respond to security reports, and keep CI honest.

This section is the maintainer's handbook.

## The pages in this section

- [Triage flow](./triage-flow) - Daily/weekly cadence for PRs and issues, label taxonomy, cluster planning.
- [Release cutting](./release-cutting) - Tag, build, publish to VS Code Marketplace + Open VSX + npm.
- [Incident runbook](./incident-runbook) - CI break, hooks break, supply-chain alert, security report.
- [Saved replies](./saved-replies) - Ten templates for common GitHub / Discord interactions.
- [E2E tests](./e2e-tests) - The Playwright automated suite plus the pre-release manual smoke that complements it.
- [AI policy](./ai-policy) - How we handle AI-generated PRs.

## Project identity

- **Extension ID:** `pablodelucca.pixel-agents` (VS Code Marketplace)
- **npm package:** `pixel-agents` (drives `npx pixel-agents`)
- **GitHub:** `https://github.com/pixel-agents/pixel-agents` (org migration from `pablodelucca/pixel-agents` landed in #274)
- **License:** MIT
- **Maintainers:** see `MAINTAINERS.md` and the GitHub org membership

The repo has been migrated to a `pixel-agents-hq` GitHub organization (recent commit 17ad25d: `chore: update repo URLs for org migration to pixel-agents-hq`). The Marketplace identifier remains `pablodelucca.pixel-agents` for continuity.

## NON-NEGOTIABLE: GitHub push policy

**No agent (Claude Code, automation, AI assistants, or any tool) pushes to GitHub for this project without explicit, per-action authorization from a maintainer.** This covers:

- `git push` in any form
- `gh pr create` / `gh pr edit` / `gh pr merge`
- Force-pushes
- Tag pushes
- Branch pushes

Local commits and worktree work are fine. The boundary is the network / GitHub edge. Anything reaching GitHub has real downstream impact because the Marketplace publishes every signed release.

This rule is documented in `.claude/CLAUDE.md` under "NON-NEGOTIABLE: No GitHub Push Without Explicit Authorization" and is enforced by maintainer convention.

## Onboarding a new maintainer

1. Read the **architecture** ([/learn/architecture.md](/learn/architecture)) and the **state management reference** ([/reference/state-management.md](/reference/state-management)).
2. Read this section end-to-end. Bookmark the [triage flow](./triage-flow) and the [e2e tests](./e2e-tests) page.
3. Run `npm run e2e` once on your machine. If anything fails on a clean main, that's a bug - file it. Then walk the pre-release manual smoke in the same page; it should pass too.
4. Watch a release being cut (`/maintainers/release-cutting.md`). Cut the next one yourself, with another maintainer pair-reviewing.
5. Read the **decision records** at [/decisions/](/decisions/overview) so you understand why the codebase is shaped the way it is.
6. Join the Discord (link in the repo README). Discord is where the active community discussion happens.

## Skills the repo ships

Several `.claude/skills/` automations help maintainers (see the bundled skills listed in CLAUDE.md):

- `repo-daily-triage` - produces `PR-TRIAGE-REPORT.md` and `ISSUE-TRIAGE-REPORT.md` in `reports/`.
- `repo-fork-triage` - analyzes active forks for cherry-pick opportunities; outputs `FORK-TRIAGE-REPORT.md`.
- `repo-cluster-planner` - when multiple PRs conflict, runs git worktree simulation and produces an optimal merge plan.
- `repo-pr-review` - three-agent self-verifying review producing a tiered findings file. Does not comment on GitHub directly.
- `pixel-agents-reviewer` and `pixel-agents-architect` - multi-agent review and planning for code changes.

These are tools, not replacements for human judgment. Use them to scale review effort; verify their conclusions before acting on them.

## What gets cross-linked from here

- [/community/contributing.md](/community/contributing) - public contributing guide. Triage decisions reference it.
- [/community/security.md](/community/security) - security reporting flow. Linked from the incident runbook.
- [/decisions/overview.md](/decisions/overview) - ADRs. New maintainers read these to understand the codebase shape.
- [/reference/](/reference/state-management) - for deep technical lookups during review.

## When you're stuck

- Search closed PRs and issues first; many decisions are encoded there with context the docs may not have.
- The `CHANGELOG.md` is a brisk record of what shipped and when.
- The original maintainer (Pablo) is the historical context source for anything pre-refactor.

Welcome aboard.
