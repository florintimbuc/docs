---
sidebar_position: 6
---

# Showcase

:::warning[AI-generated docs]
This document was AI-generated and may have some mistakes - we apologize for this, we're in the process of reviewing all documents. If you find any issues, we'd be thankful if you [submit an edit PR](https://github.com/pixel-agents-hq/docs/edit/main/docs/community/showcase.md).
:::

Community projects, asset packs, alternate clients, and integrations. This page is curated; submissions are welcome via PR.

> **Maintainer note:** This page intentionally launches with submission slots and a few stub categories rather than fabricated entries. As the community ships real assets, alt clients, and integrations, replace each slot with a real entry. Don't backfill with imaginary projects.

## How to get listed

If you've built something using Pixel Agents - an asset pack, an alt client, a provider, an adapter, an integration - and you'd like it featured here:

1. Make sure it actually works against the current release.
2. Open a PR adding an entry under the relevant section below.
3. Include: name, short description, link (repo / npm / website), screenshot if applicable, license, your name / handle for credit.

The maintainer team reviews submissions for accuracy. We don't gate on subjective quality; if it works and the description is honest, it goes up.

If a project becomes unmaintained or broken against new Pixel Agents versions, we may move it to an archive section with a note.

## Asset packs

Custom furniture, characters, floors, and walls distributed for use with Pixel Agents.

For instructions on creating your own pack, see [/build/assets/publishing-a-pack.md](/build/assets/publishing-a-pack).

### Featured

*[Submission slot: be the first to add a community asset pack here.]*

A good entry includes:

- Pack name
- 1-2 sentence description
- Install command (e.g. `npm install -g pixel-agents-pack-coolkitchen`)
- Screenshot
- License
- Repo link

### Templates

A starter template for your own pack would go here once one is published.

## Alternate clients

Implementations of the Pixel Agents protocol other than the bundled VS Code webview and standalone browser SPA. Mobile apps, terminal UIs, custom embeds, etc.

For instructions on building a client, see [/build/clients/building-a-client.md](/build/clients/building-a-client).

### Featured

*[Submission slot: alternate clients (mobile, TUI, custom) appear here as they're shipped.]*

A good entry includes:

- Client name
- Platform (iOS / Android / desktop / TUI / etc.)
- 1-2 sentence description
- Install link
- Screenshot or demo video
- Repo link
- Language / framework

## Custom providers

Providers integrating AI CLIs other than Claude. Codex, Goose, Aider, Copilot, custom internal CLIs - any CLI implementing the `HookProvider` interface.

For instructions on building a provider, see [/build/providers/adding-a-provider.md](/build/providers/adding-a-provider).

### Featured

*[Submission slot: third-party HookProvider implementations appear here as they ship.]*

Today only the bundled `claude` provider exists. As the community builds providers, list them here with:

- Provider name (matches `HookProvider.id`)
- Target CLI
- 1-2 sentence description
- Repo link
- License
- Status (hook-only / hook + file fallback / file-only)

## Custom adapters

Host integrations beyond the bundled VS Code adapter. JetBrains plugins, Zed extensions, custom Electron shells.

For instructions on building an adapter, see [/build/adapters/adding-an-adapter.md](/build/adapters/adding-an-adapter).

### Featured

*[Submission slot: IDE host adapters appear here as they ship.]*

A good entry includes:

- Adapter name
- Target host (JetBrains / Zed / Cursor / etc.)
- 1-2 sentence description
- Install link
- Repo link

## Integrations

Things that use Pixel Agents but aren't strictly providers, clients, or adapters. CI/CD dashboards, monitoring overlays, Discord bots, etc.

### Featured

*[Submission slot: integrations appear here as they're built.]*

A good entry includes:

- Integration name
- What it does
- How it integrates with Pixel Agents (reads `~/.pixel-agents/server.json`? Connects WebSocket? Other?)
- Repo link

## Talks, posts, demos

Conference talks, blog posts, video walkthroughs, podcast episodes featuring Pixel Agents.

### Featured

*[Submission slot: community-produced content appears here. We don't pay for placement; this is purely community curation.]*

A good entry includes:

- Title
- Author / presenter
- Venue
- Date
- Link
- 1-line summary

## Selection criteria

What we look for in showcase entries:

- **Actually works.** The integration / pack / client should function against the current Pixel Agents release.
- **Honest description.** No overclaiming. "Adds 30 furniture items" not "completely transforms your office."
- **Maintained or archived.** If it's been broken for six months, it's archive-worthy unless the submitter is actively fixing.
- **MIT-compatible if it includes our code.** Other licenses are fine for assets and integrations that don't redistribute our source.

We do NOT require:

- A specific minimum number of stars.
- An active community of users.
- A specific quality bar on the visual design.
- A specific contribution back to the upstream project.

## Archive

Projects that were featured but are no longer maintained or compatible.

*[No archived entries yet.]*

When a project moves to archive, the entry is kept (it's part of the project's history) but with a note. The original author can request the entry be removed entirely.

## Why curate?

A "see what others have built" page is high-signal for newcomers. It also rewards contributors with visibility. Curating (rather than auto-listing) keeps the bar honest.

The curation is light: the maintainer team reviews PRs, fact-checks the descriptions, and merges. There's no juried selection or featured tier.

## Submit

PR template for a showcase submission:

```md
### New entry: <Type, e.g. Asset pack>

**Name:** <Your project's name>
**Repo:** <link>
**Install / use:** <one line, e.g. `npm install -g pixel-agents-pack-yours`>
**Description:** <1-2 sentences>
**License:** <SPDX or "Proprietary">
**Screenshot:** <link or attach>
**Credit:** <your name / handle>

I confirm the project works against Pixel Agents <version> and I'm willing to maintain it.
```

Open the PR against `docs/community/showcase.md`. Maintainers will review and either merge, suggest edits, or explain a decline.

## Related (on this site)

- [Contributing](./contributing) - the broader contribution flow.
- [Build extensions](/build) - if you want to build one of the things this page features.
- [Roadmap](./roadmap) - what the maintainer team would love to see built.
- [Asset publishing](/build/assets/publishing-a-pack) - if you want to publish an asset pack.
