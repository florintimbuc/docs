---
sidebar_position: 3
---

# ADR-0002: AsyncAPI as the protocol contract

**Status:** Accepted
**Date:** 2026-05-26
**Deciders:** Pixel Agents core team
**Related:** [Protocol overview](/reference/protocol/overview), [Why a protocol](/learn/protocol), [ADR-0001 four-package split](./four-package-split)

## Context

Before this decision landed, the wire shape between the extension host and the React webview was hand-coded twice. The extension's TypeScript declared the message types under `src/`; the webview re-declared parallel interfaces under `webview-ui/src/`. Whenever a new message type was added, both sides had to be edited and any divergence (a renamed field, a different optional flag) only manifested at runtime.

The pressures that made this untenable:

1. **Standalone joined the party.** A third consumer (the browser SPA running outside VS Code, talking to the server over WebSocket) is structurally similar but cannot share the postMessage handler files. Without a contract, every new client would re-implement the types from scratch.
2. **Third-party clients are first-class.** A mobile renderer, a Discord embed, a terminal TUI - anyone speaking the protocol should be welcome. Hand-coded TypeScript is not a credible source of truth for a Swift or Python client.
3. **Documentation drift.** The hand-written tables in old docs got stale on every protocol change. Auto-generation requires an authoritative source.

## Decision

Declare the protocol in `core/asyncapi.yaml` and generate the TypeScript bindings (`core/src/messages.ts`) from it. The yaml is the source of truth; the TS file is derived. Run `npm run asyncapi:generate` to regenerate.

The `core/src/messages.ts:1-8` header is explicit:

```ts
/**
 * AUTO-GENERATED FROM core/asyncapi.yaml. DO NOT EDIT MANUALLY.
 *
 * Run `npm run asyncapi:generate` to regenerate.
 *
 * Source of truth: the yaml at core/asyncapi.yaml.
 * Editors and clients in any language can consume the spec directly.
 */
```

Pin to AsyncAPI 3.0.0, not 3.1.0. The reason is documented in the yaml header (`core/asyncapi.yaml:1-7`):

> NOTE: pinned to 3.0.0 deliberately. @asyncapi/modelina v5.10.1 hardcodes
> `supportedVersions: ['3.0.0']` in its AsyncAPIInputProcessor. Bumping to
> 3.1.0 makes Modelina fall through to a generic JSON-schema parser that emits
> only `export type Root = any` instead of our 52 named interfaces. Bump when
> Modelina adds 3.1.0 support; the upgrade is `npx asyncapi convert` + a regen.
> `npm run asyncapi:validate` will keep emitting an info note recommending 3.1.0;
> that's expected and harmless until Modelina catches up.

A single bidirectional channel (`/ws`) carries two top-level discriminated unions:

- `ServerMessage` - 26 variants. Discriminator field `type`. Lists at `core/asyncapi.yaml:78-115` and `core/src/messages.ts:10-36`.
- `ClientMessage` - 18 variants. Discriminator field `type`. Lists at `core/asyncapi.yaml:117-137` and `core/src/messages.ts:38-56`.

All variant shapes use `additionalProperties: false` so that consumers catch typos at validation time.

## Consequences

**Positive.**

- Any language can consume the yaml directly. A Python client uses [asyncapi-tools](https://www.asyncapi.com/tools), a Swift client uses [Swift-OpenAPI-Generator with the AsyncAPI plugin](https://github.com/apple/swift-openapi-generator), a TypeScript client imports `core/src/messages.ts`. The protocol page (`/reference/protocol/overview.md`) is the same for all of them.
- Documentation under `/reference/protocol/` is partially auto-generatable. Today the per-variant tables are hand-written; the structure is set up so a future CI step can regenerate them from the yaml without losing prose.
- Protocol drift is caught at generation time, not at runtime. Anyone who edits `messages.ts` directly and then runs `asyncapi:generate` watches their edits get overwritten.
- A new bundled provider does not change the protocol shape. Provider-specific metadata stays in the provider's own normalizer; only structural changes (new message variants, new schema fields) touch the yaml.

**Negative.**

- Editing yaml is fiddly. Indentation matters; editors sometimes fight you. The `core/asyncapi.yaml` file is ~900 lines and benefits from a tool that can fold sections.
- Contributors need a small mental model of which file is source-of-truth. The big comment block in `core/src/messages.ts:1-8` mitigates this, but a contributor copy-pasting their PR diff might still try to edit the generated file. The CI must check for stale `messages.ts` and refuse the PR.
- The validator emits an info-level note recommending 3.1.0 every time it runs. Expected; harmless; explained inline. The note will go away when Modelina adds 3.1.0 support.
- Hand-written `/reference/protocol/` pages can drift behind the yaml. The mitigation: in CI, run `asyncapi:validate` and grep the docs pages for known variant names. A future iteration may auto-render the variant tables.

## Alternatives considered

- **OpenAPI 3.x.** Designed around request/response. Modeling a bidirectional WebSocket channel inside OpenAPI requires creative use of webhooks and is awkward to read. Skipped.
- **JSON Schema + hand-written transport docs.** Splits the source of truth: schema in one place, channel semantics in another. The combination of both is what AsyncAPI provides natively. Skipped to avoid two-file maintenance.
- **Protocol Buffers + gRPC.** A more rigid contract, but adds binary encoding and requires native bindings per client language. The browser case is awkward. Skipped because the JSON-over-WebSocket payloads are small and developer-friendly.
- **GraphQL subscriptions.** Powerful for query-heavy APIs but heavyweight for event broadcast. Skipped.
- **No formal contract; rely on shared TypeScript imports.** This is what we had. The fact that we are writing this ADR is the evidence that it stopped working.

## Migration notes

The yaml was authored by reading every existing message type and translating to the AsyncAPI schema. The `messages.ts` generated from the new yaml was diff'd against the old hand-written types; field-by-field equivalence had to hold before the PR landed. Any divergence was treated as a contract bug to fix in the yaml, not as a hand-edit to `messages.ts`.

CI runs `npm run asyncapi:validate` on every PR. A PR that edits `core/src/messages.ts` without a matching yaml change is rejected.

## Open questions

- When AsyncAPI ships a renderer that can fully render 3.0 inside VitePress, do we drop the hand-written `/reference/protocol/` pages and serve the rendered HTML instead? Decision deferred to when the tooling matures.
- Should we publish `core/` to npm under a distinct package name so non-monorepo consumers can `npm install @pixel-agents/core` and get the typed bindings? Today the package is repo-internal.
- When the pin lifts to 3.1.0, do we adopt the new `bindings.ws` extensions for connection-level metadata (max payload, ping-pong intervals)? Deferred.
