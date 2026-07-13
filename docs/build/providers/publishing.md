---
sidebar_position: 5
---

# Publishing a provider

:::warning[AI-generated docs]
This document was AI-generated and may have some mistakes - we apologize for this, we're in the process of reviewing all documents. If you find any issues, we'd be thankful if you [submit an edit PR](https://github.com/pixel-agents-hq/docs/edit/main/docs/build/providers/publishing.md).
:::

You finished writing a provider and the tests pass. This page covers the contribution flow: where the registry lives today, the naming and semver rules, the hook-script bundling requirement, and the license.

Read this after [Adding a provider](/build/providers/adding-a-provider) and [Testing your provider](/build/providers/testing-your-provider).

## The registry, today

There is no separate plugin registry. Today every provider ships **inside** the pixel-agents package. The registry is one file: `server/src/providers/index.ts`.

The file's own header documents the rule:

```ts
/**
 * Provider registry: re-exports all bundled providers.
 *
 * Adding a new CLI provider:
 *   1. Create `server/src/providers/hook/<cli>/<cli>.ts` implementing HookProvider.
 *      (File-based and stream-based provider types will land when the first such
 *       provider ships.)
 *   2. Add an export line below.
 *
 * The adapter (VS Code extension, standalone CLI, etc.) imports from here rather
 * than reaching into each provider directory directly.
 */

export { claudeProvider } from './hook/claude/claude.js';
export { copyHookScript } from './hook/claude/claudeHookInstaller.js';
```

A separate provider registry (npm-installable plugins) is a possible future direction, but it is not the contribution path you should plan for now.

## The contribution flow

1. **Open a PR** with your provider directory, the export line in `server/src/providers/index.ts`, your test suite under `server/__tests__/`, and any bundler config changes (see Hook-script bundling below).
2. **Maintainers review** for:
   - **Protocol version compatibility.** Your `protocolVersion` matches `HookEventHandler.SUPPORTED_PROTOCOL_VERSION` (today `1`, at `server/src/hookEventHandler.ts:62`). If you needed to bump the version, the PR also updates both sides plus any other providers in tree.
   - **Hook script safety.** The script bundles to a single CJS file, exits cleanly on missing config, never blocks the user's CLI for more than a few seconds. See Hook-script bundling below.
   - **Test coverage.** At least the seven patterns in [Testing your provider](/build/providers/testing-your-provider), specifically:
     - Unit tests for `normalizeHookEvent` against captured fixtures.
     - Round-trip coverage on `AgentEvent` kinds.
     - Hook install / uninstall in a temp HOME.
     - Integration test of the hook script.
     - Permission timer cancellation behavior.
     - Multi-session safety.
     - Protocol version mismatch behavior.
   - **`isTeammateSpawnCall` correctness** if you implemented `TeamProvider`. False positives create ghost teammate agents; false negatives leave teammates undiscovered.
3. **Maintainers ship** in the next minor release. See [Maintainer triage flow](/maintainers/triage-flow) for what the maintainer side looks like.

For the general PR mechanics (commit style, branch naming, code of conduct), see [Contributing](/community/contributing).

## Naming

Directory and id naming, in order of preference:

- **Directory name**: lowercase, the CLI's canonical short name. `claude`, `codex`, `copilot`. Avoid hyphens unless the CLI's own name has one. Avoid version numbers, `codex-v2` is not a separate provider, it is a new version of `codex`.
- **Provider `id` field**: matches the directory name exactly. `codexProvider.id === 'codex'`.
- **Provider object export name**: `<cliId>Provider`. `claudeProvider`, `codexProvider`.
- **Hook script name**: `<cliId>-hook.ts`, bundles to `<cliId>-hook.js`. The script's POST path is `${HOOK_API_PREFIX}/<cliId>` (`server/src/httpServer.ts:106` accepts `/api/hooks/:providerId`).
- **Provider constants file**: `server/src/providers/hook/<cliId>/constants.ts`. Constants prefixed with the CLI name, like `CODEX_TERMINAL_NAME_PREFIX`, `CODEX_HOOK_SCRIPT_NAME`, `CODEX_HOOK_EVENTS`.

If two CLIs share a name (rare but possible), pick the one without ambiguity. If the conflict is unavoidable, file an issue. Do not invent a workaround.

## Semver

The repo follows semver loosely on the package version, strictly on protocol versions.

### Package version

The pixel-agents extension publishes to the VS Code Marketplace with semver:

- **Major bump** when a change breaks user-visible behavior, an existing layout, or backward compatibility with the persisted state.
- **Minor bump** when a provider is added, a feature lands, or a non-breaking interface expansion ships.
- **Patch bump** when a provider is fixed, a bug is squashed, or behavior tightens without changing the contract.

Adding a new provider is a minor version bump. Fixing an existing provider is a patch.

### Protocol version

Protocol changes do not bump the package version. They bump the **provider's `protocolVersion` field** plus the `SUPPORTED_PROTOCOL_VERSION` constant on the handler side.

You bump `protocolVersion` when:

- An `AgentEvent` kind is added or removed (`core/src/provider.ts:14-56`).
- A required field is added to an existing `AgentEvent` kind.
- A required field is added to the `HookProvider` or `TeamProvider` interface.

You do not bump it for:

- New optional fields on existing `AgentEvent` kinds (handlers that ignore the field still work).
- Provider-internal refactors that do not change the externally observable contract.

When you bump it, every provider in the tree must update to the new version in the same PR, otherwise the handler refuses events from any provider that still reports the old version (`server/src/hookEventHandler.ts:72-78, 131-134`).

## Hook-script bundling

The script that runs inside the user's CLI (`<cliId>-hook.ts`) must be bundled to a **single CJS file with no `node_modules` dependency**. The user's CLI invokes it via plain `node /path/to/hook.js`. Anything that requires a package directory next to the script will fail.

Claude's bundling lives in `esbuild.js`, in a function called `buildHooks()`. The output goes to `dist/hooks/claude-hook.js`. New providers add another esbuild call (or extend the existing one) so the build produces a sibling file like `dist/hooks/codex-hook.js`.

Rules for the script itself:

- Single file, CJS format, no external dependencies, no dynamic `require` of anything outside Node's built-ins.
- Reads stdin once. The CLI sends one JSON payload per invocation, no streaming protocol.
- Reads `~/.pixel-agents/server.json` for the port and Bearer token. If the file is missing or malformed, exit `0` cleanly. Do not crash the user's CLI session.
- Uses `Authorization: Bearer ${token}` on the POST. Bearer auth is the only auth on `/api/hooks` (`server/src/httpServer.ts:108`).
- POSTs to `http://127.0.0.1:<port>${HOOK_API_PREFIX}/<cliId>`. The path is provider-specific, the host is always loopback.
- Timeout is 2 seconds, hard. The user's CLI is blocking on this hook. If the server is down or slow, fail fast and let the CLI continue.
- On any error (parse error, network error, timeout), exit `0`. Never propagate failures to the CLI.

Compare to the reference at `server/src/providers/hook/claude/hooks/claude-hook.ts` to confirm the shape.

## License

Providers contributed to the main pixel-agents repository follow the **MIT license** under which the rest of the project is licensed. Submitting a PR implicitly grants the project this license on your contribution.

If you want to ship a provider under a different license, you cannot put it in `server/src/providers/`. File an issue and we will discuss whether the separate-plugin-registry path can be designed for your case. As noted above, that path does not exist today.

## What maintainers check

For a complete picture of what maintainers look at during review, see [Triage flow](/maintainers/triage-flow). The provider-specific items they verify:

- `protocolVersion` matches the supported version on the handler.
- The export line in `server/src/providers/index.ts` is the only registry change needed.
- The hook script bundles cleanly via the project's `esbuild.js` (run `npm run build`).
- `installHooks` / `uninstallHooks` are idempotent and preserve unrelated user entries.
- No raw provider field is referenced outside the provider's own files. The `normalizeHookEvent` boundary is intact.
- Tests in `server/__tests__/` cover the seven patterns.
- `isTeammateSpawnCall` (if `TeamProvider` is implemented) has explicit tests for both true and false cases.
- `formatToolStatus` strings respect the truncation constants from `server/src/constants.ts`.
- Constants live in the provider's `constants.ts`, not in the shared `server/src/constants.ts`.

## Cross references

- General PR flow: [Contributing](/community/contributing).
- Maintainer review checklist: [Triage flow](/maintainers/triage-flow).
- Provider walkthrough: [Adding a provider](/build/providers/adding-a-provider).
- Testing rules: [Testing your provider](/build/providers/testing-your-provider).
- Canonical implementation: [Reference implementation](/build/providers/reference-implementation).
