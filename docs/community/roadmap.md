---
sidebar_position: 5
---

# Roadmap

:::warning[AI-generated docs]
This document was AI-generated and may have some mistakes - we apologize for this, we're in the process of reviewing all documents. If you find any issues, we'd be thankful if you [submit an edit PR](https://github.com/pixel-agents-hq/docs/edit/main/docs/community/roadmap.md).
:::

What's planned, what's in flight, what's done. Reflects the state of `CHANGELOG.md` and the open issues / PRs at the time of writing. The repo is the source of truth for fresh status; this page is a narrative summary.

For the canonical changelog, see [CHANGELOG.md in the repo](https://github.com/pixel-agents-hq/pixel-agents/blob/main/CHANGELOG.md).

## Recently shipped

The v1.x line is built on the four-package refactor that landed in #273. Key shipped pieces:

- **Four-package split** (`core/`, `server/`, `adapters/`, `webview-ui/`) - see [ADR-0001](/decisions/four-package-split).
- **AsyncAPI 3.0 protocol contract** - see [ADR-0002](/decisions/asyncapi-as-protocol-contract).
- **HookProvider + optional file fallback** - see [ADR-0003](/decisions/hookprovider-with-optional-file-fallback).
- **AgentRuntime as shared lifecycle core** - see [ADR-0004](/decisions/agentruntime-as-shared-lifecycle-core).
- **Namespaced persistence** (`~/.pixel-agents/<namespace>-state.json`) - see [ADR-0005](/decisions/namespaced-persistence).
- **Standalone CLI hardening** - the `npx pixel-agents` path is feature-equivalent to embedded mode for the visualization layer.
- **Agent Teams support** via the optional `TeamProvider` interface.
- **External asset directories** - load custom furniture / characters / floors / walls from any directory.
- **Layout editor** with paint, place, undo/redo (50-level), grid expansion, multi-window sync.
- **Hooks integration** with the 11 Claude hook events plus heuristic fallback.
- **`autoShowPanel` and `autoSpawnAgent`** VS Code settings (#221).

For the version-by-version breakdown, see the [CHANGELOG](https://github.com/pixel-agents-hq/pixel-agents/blob/main/CHANGELOG.md).

## In progress

These are areas with open PRs or actively discussed:

- **Docs site v1.4 launch** - the docs you're reading. New structure under `docs/` with Diataxis-aligned sections (Start, Learn, Use, Build, Reference, Maintainers, Decisions, Community).
- **Provider taxonomy expansion** - the TODO at `core/src/provider.ts:130-131` reserves slots for FileProvider (transcript-polling only) and StreamProvider (push-based) types alongside the first real second provider.

## Near-term focus

What the maintainer team would like to ship in the next few releases:

- **Reliability of agent-terminal sync** in edge cases (rapid open/close, session restore corner cases).
- **Better status detection signals** beyond the heuristic timers for text-only turn ends.
- **Community asset packs** ecosystem - freely usable tilesets and characters published as npm packages.

## Open questions

Big-picture decisions that need community input before they ship:

- **Multi-provider in one runtime.** Today one `AgentRuntime` takes one `HookProvider`. Should we support multiple providers in one runtime (a single office showing Claude + Codex + Goose simultaneously)? If yes, how is provider-specific behavior routed?
- **Agent creation / definition UI.** Today an agent is just "another Claude session." Should there be a Pixel Agents-managed concept of an agent with a name, role, custom skills, system prompt, skin? Where does that data live (Pixel Agents owns it, or pulls from the underlying CLI)?
- **Desks as directories.** Idea: clicking a desk selects a working directory; spawning an agent from that desk launches Claude in that directory. Concrete UX TBD.
- **Git worktree integration.** Multiple parallel sessions on the same repo but different branches. The desk-as-directory idea would naturally extend to "desk-as-worktree."
- **Visualization for non-Claude frameworks.** OpenCode, Aider, Goose, Roo, etc. - each has a different lifecycle model. The HookProvider interface is the entry point but provider-specific UX (custom characters, custom animations) may be wanted.

## Things deliberately not on the roadmap

These come up sometimes; they're not planned:

- **Cloud-hosted Pixel Agents.** Pixel Agents is local. No multiplayer office; no remote inference. Adding a cloud component would change the security model fundamentally.
- **Telemetry.** We don't collect usage data, error reports, or anything else.
- **Built-in AI inference.** Pixel Agents visualizes; it doesn't run inference itself.
- **Multi-language UI translations.** The webview is English-only today. Internationalization would be a substantial cross-cutting change; not prioritized.

## How to influence the roadmap

- **File an issue** describing what you want. The repo has issue templates for feature requests.
- **Comment on existing issues** that align with your interest. Thumbs-up counts; substantive comments count more.
- **Start a Discussion** at [github.com/pixel-agents-hq/pixel-agents/discussions](https://github.com/pixel-agents-hq/pixel-agents/discussions) for things that aren't quite issues yet.
- **Send PRs** for the work you want to see. Substantial PRs are best preceded by a discussion to avoid wasted effort.
- **Submit asset packs** to the showcase. A vibrant pack ecosystem is itself a roadmap goal.

## Release cadence

There's no fixed release schedule. Patch releases happen as bug fixes land. Minor releases happen when features accumulate. Major releases happen when breaking changes warrant.

For the release process, see [/maintainers/release-cutting.md](/maintainers/release-cutting).

## Versioning policy

Standard semver:

- `patch` (0.0.X): bug fixes, dependency patches.
- `minor` (0.X.0): new features, additive changes, new providers, new clients.
- `major` (X.0.0): breaking changes.

Protocol changes have their own version on `HookProvider.protocolVersion`. Bumping the provider's version doesn't necessarily bump the package version (and vice versa).

## Long-term direction

Pixel Agents has three north stars:

1. **An agent-agnostic interface.** Today Claude-only; tomorrow any CLI with a hook API or transcript file format.
2. **A platform-agnostic interface.** Today VS Code and browser; tomorrow any IDE, any device.
3. **A cuteness-first interface for serious work.** The pixel office is not ironic. It's a real tool for keeping track of long-running AI sessions in a way that respects the user's attention.

Everything on the roadmap should serve at least one of those.

## Related (on this site)

- [CHANGELOG (canonical)](https://github.com/pixel-agents-hq/pixel-agents/blob/main/CHANGELOG.md)
- [Contributing](./contributing) - how to push the roadmap forward.
- [Governance](./governance) - how roadmap decisions get made.
- [Decisions (ADRs)](/decisions/overview) - the architecture-level decisions that shape the roadmap.
- [Showcase](./showcase) - what the community has built.
