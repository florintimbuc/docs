---
sidebar_position: 1
title: Overview
---

# Architecture Decision Records

This section captures **Architecture Decision Records (ADRs)**: short, dated, opinionated documents that record significant architectural decisions and the context that produced them.

ADRs are not changelog entries, design documents, or specifications. They sit between those: they answer the question *"why is this part of the system shaped the way it is?"* with enough context that a contributor reading the codebase in two years can reconstruct the trade-off without having to ask anyone.

---

## What is an ADR?

An ADR is a Markdown file with five sections: **Status**, **Context**, **Decision**, **Consequences**, **Alternatives considered**. It is committed to the repo alongside the code it describes and **never edited substantively after acceptance**. If a decision is walked back, you write a new ADR that *supersedes* the old one. The old ADR stays in place with its status updated to `Superseded by ADR-XXXX`.

The "never edited" rule is the key discipline. The temptation to go back and update an ADR with new information is strong and must be resisted. The whole point of the format is that it captures *what we knew at the time*, including biases and constraints that no longer apply. That historical accuracy is more valuable than freshness.

Small typo fixes and link corrections are fine. Anything that changes the substance gets a superseding ADR.

---

## When to write an ADR

Write an ADR when any of the following are true:

- **Adding a new package or top-level surface.** Examples: introducing `core/`, splitting `server/` out of `src/`, adding `adapters/jetbrains/`.
- **Changing the protocol contract.** Any edit to `core/asyncapi.yaml` that adds, removes, or restructures a message variant. Tiny shape changes (renaming an optional field) might not need one, but breaking changes always do.
- **Adopting a new dependency that other layers will depend on.** Adding Fastify, switching from `ws` to `Socket.IO`, picking React over Preact. Adding a dev-only dependency does not need an ADR.
- **Choosing one of several reasonable patterns.** When the codebase reaches a fork in the road and we pick a direction, the next contributor to think about that fork will want to know what we already considered. Example: file-based state vs server-managed state, single state file vs namespaced files.
- **Walking back a previous choice.** Always write a superseding ADR. Don't edit the old one.

---

## When *not* to write an ADR

- Small refactors that don't change public surface.
- Bug fixes, however clever.
- Dependency version bumps that don't change behavior.
- Internal helper renames, file reorganizations within a package.
- Performance tweaks that don't change architecture.
- Anything that would normally show up only in a PR description.

A rough heuristic: if a contributor opening the codebase a year from now would find the decision obvious in retrospect, you probably don't need an ADR. If they would ask "wait, why is it shaped like this?", you do.

---

## Numbering and naming

ADRs are numbered with zero-padded four-digit prefixes: `0001-*.md`, `0002-*.md`, and so on. The file name uses kebab-case after the number. Examples:

- `0001-four-package-split.md`
- `0002-asyncapi-as-protocol-contract.md`

Numbers are never reused, even if an ADR is superseded. If you're writing ADR-0014 and 0014 was already taken by a since-superseded record, you use 0015. The sequence is append-only.

---

## The current set

This is the full accepted set as of the latest refactor (PR #273, May 2026):

- [ADR-0001 - Four-package split](./four-package-split)
  Why the repo is divided into `core/`, `server/`, `adapters/`, and `webview-ui/`, and what the dependency direction is.

- [ADR-0002 - AsyncAPI as the protocol contract](./asyncapi-as-protocol-contract)
  Why we declare the wire protocol in `core/asyncapi.yaml` and generate TypeScript bindings from it, and why we pinned the spec to AsyncAPI 3.0.0.

- [ADR-0003 - HookProvider with optional file fallback](./hookprovider-with-optional-file-fallback)
  Why hook-based detection is the primary signal and file polling is a fallback gated by `hookDelivered`.

- [ADR-0004 - AgentRuntime as shared lifecycle core](./agentruntime-as-shared-lifecycle-core)
  Why agent lifecycle logic was centralized into one class shared by every adapter, and what the trade-offs were.

- [ADR-0005 - Namespaced persistence](./namespaced-persistence)
  Why VS Code and standalone use separate state files (`~/.pixel-agents/<namespace>-state.json`) but share `layout.json`, and how migration from the legacy VS Code workspaceState works.

---

## Template

When you write a new ADR, start from this template. Copy the body, fill in the title, status, date, and deciders, and rename the file to match the numbering convention.

````md
# ADR-XXXX: <Title>

**Status:** Accepted
**Date:** YYYY-MM-DD
**Deciders:** <names>
**Related:** <links>

## Context

What was the situation that forced a decision? What was painful, broken, or
ambiguous? What did we know about the alternatives at the time? Cite code
paths (`file:line`) where helpful.

Aim for one or two paragraphs. Avoid hindsight.

## Decision

What did we decide? Be specific. Name files, interfaces, types, and patterns.
Avoid vagueness like "we adopted a more modular approach" - say what we
actually did and where the change lives in the codebase.

## Consequences

What changed as a result, both positive and negative? Bullet points are fine.
Be honest about the warts. If there's an asymmetry (one direction works, the
other doesn't), call it out. If there's a known follow-up cost, name it.

## Alternatives considered

What else did we look at? Why did we not choose them? One short paragraph per
alternative is plenty. The point is to save future contributors from
re-litigating the same choices.
````

---

## Status values

We use three status values:

- **Accepted** - the decision is in force.
- **Superseded by ADR-XXXX** - a later ADR replaces this one. The old ADR stays in place.
- **Deprecated** - the decision is no longer in force but no replacement exists. Rare; usually means we removed the feature entirely.

We do not use **Proposed** or **Draft** statuses. ADRs are written after a decision has been made and merged, not before. The PR discussion is where proposals live.

---

## Cross-linking

ADRs link liberally to each other and to other docs:

- Reference the relevant `/learn/` page so readers can get the conceptual background before reading the decision.
- Reference the relevant `/reference/` page so readers can find the technical surface that resulted from the decision.
- Reference `/build/` pages when the decision affects what extension authors need to know.

The decisions section is dense and historical. The other sections are the daily-driver docs. ADRs feed those docs with context, not the other way around.

---

## A note on dating

ADRs are dated to the day they were accepted, which usually corresponds to the merge date of the PR that introduced the relevant code. If you write an ADR after the fact for an existing decision (which is fine), date it to when the underlying decision actually happened, not to the day you wrote the document. The "Deciders" field can clarify that the ADR was written retrospectively.
