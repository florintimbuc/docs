---
sidebar_position: 3
---

# Governance

How decisions get made in Pixel Agents. Lightweight; the project is small enough that it works.

## The canonical document

The full governance model lives in the repo at [GOVERNANCE.md](https://github.com/pixel-agents-hq/pixel-agents/blob/main/GOVERNANCE.md) when published. This page summarizes for the site.

## TL;DR

- The project lead has final say on contested decisions.
- Maintainers handle day-to-day review, triage, releases.
- Contributors propose changes via PRs and discussions.
- The community is involved through Discussions and Discord.

Pixel Agents is governed as a "benevolent dictator with delegated maintenance" model. This works at the current scale (one project lead, a small maintainer team, an active community). It may evolve as the project grows.

## Roles

### Project lead

Pablo de Lucca (original author). Holds the deciding vote on:

- Architectural direction.
- Protocol-level changes (anything that touches `core/asyncapi.yaml`).
- Adding or removing maintainers.
- License decisions.
- The roadmap.

The project lead is also a regular contributor; the role is primarily about being the tiebreaker, not about doing all the work.

### Maintainers

Listed in [MAINTAINERS.md](https://github.com/pixel-agents-hq/pixel-agents/blob/main/MAINTAINERS.md) on GitHub. Maintainers can:

- Merge PRs.
- Triage issues.
- Cut releases.
- Apply labels.
- Apply the Code of Conduct.
- Onboard new maintainers (with project lead sign-off).

Maintainers are recruited by demonstrating sustained quality contributions. There's no formal application process. If you've been making meaningful contributions over months and you want to take on review work, mention it in Discord or open a discussion.

### Contributors

Anyone who submits a PR, files an issue, or participates in discussions. No commit access required. Contributors:

- Propose changes via PRs.
- File bugs and suggest features.
- Help others in Discussions and Discord.
- Write asset packs, alt clients, alt providers (see [Build](/build)).

### Community

Everyone in the orbit. Reads docs, uses the extension, talks about it. Contributes by:

- Reporting bugs they encounter.
- Sharing their setups (the showcase candidates).
- Helping others in Discord / Discussions.

## How decisions get made

| Decision type | Process |
|---|---|
| Day-to-day PR review | Any maintainer can approve and merge. |
| Substantial features | Discussion-first; maintainer team weighs in; project lead resolves disagreement. |
| Protocol changes | Require an ADR in [/decisions/](/decisions/overview) and project lead sign-off. |
| Adding a maintainer | Project lead decides, ideally after consensus from existing maintainers. |
| License changes | Project lead decides. |
| Code of Conduct enforcement | Maintainer team decides; project lead handles appeals. |

In practice most decisions are made without ceremony. The structured process kicks in when there's real disagreement.

## Architectural decisions

Significant decisions are documented as ADRs. See [Decisions](/decisions/overview). The five ADRs that landed with the refactor in #273 are the canonical examples.

A change that triggers an ADR:

- Adding a new package or top-level surface.
- Changing the protocol contract (AsyncAPI shape, AgentEvent kinds).
- Adopting a new dependency that other layers will depend on.
- Choosing one of several reasonable patterns.
- Walking back a previous choice.

A change that doesn't trigger an ADR: small refactors, bug fixes, dependency bumps, internal helper renames.

## Release decisions

Releases are cut by maintainers per [/maintainers/release-cutting.md](/maintainers/release-cutting). The release author:

- Verifies CI green (including `npm run e2e`) and walks the pre-release manual smoke documented in [e2e tests](/maintainers/e2e-tests).
- Bumps semver per the changes.
- Publishes to VS Code Marketplace, Open VSX, npm.
- Pushes the version tag (with explicit per-action authorization per the NON-NEGOTIABLE policy).

Hotfix releases follow the same process with a branch-from-tag pattern. See [/maintainers/release-cutting.md](/maintainers/release-cutting#hotfix-flow).

## Conflict resolution

When two contributors (or a contributor and a maintainer) disagree:

1. Try to resolve via PR comments or discussion. Most disagreements dissolve when both sides understand each other.
2. If still stuck, ping a maintainer to weigh in.
3. If still stuck, escalate to the project lead.

For tone disagreements (someone feels disrespected): see [Code of Conduct](./code-of-conduct).

## Funding

Today Pixel Agents has no funding mechanism (donations, sponsorship, paid features). Maintainers contribute time voluntarily. The asset import path requires purchasing a third-party tileset; that money goes to the tileset author, not to Pixel Agents.

If a funding model is introduced (sponsorships, Open Collective, etc.), it'll be documented here.

## Trademark and branding

The "Pixel Agents" name and any logos are project trademarks. Forks and derivatives should use distinct names to avoid confusion.

The MIT license allows anyone to use the code, including in commercial products. Just don't pass it off as the canonical Pixel Agents.

## Forks

If you fork the project and run a parallel community:

- Be clear it's a fork (e.g. "Pixel Agents Fork: Cool Variant"). Don't impersonate.
- Don't redirect support traffic from the original community to yours.
- Cross-pollinate fixes back upstream where reasonable.

The repo has a friendly-fork policy: maintainers will accept reasonable upstream contributions from active forks.

## Future governance

As the project grows, the model may need to evolve:

- A formal maintainer election process.
- A technical steering committee.
- A foundation affiliation (Linux Foundation, OpenJS, etc.).

None of these are planned today. They'll be discussed openly when the project's scale warrants them.

## Related (on this site)

- [Contributing](./contributing)
- [Code of Conduct](./code-of-conduct)
- [Decisions (ADRs)](/decisions/overview)
- [Maintainer overview](/maintainers/overview)
- [Triage flow](/maintainers/triage-flow)
