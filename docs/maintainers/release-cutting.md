---
sidebar_position: 3
---

# Release Cutting

:::warning[AI-generated docs]
This document was AI-generated and may have some mistakes - we apologize for this, we're in the process of reviewing all documents. If you find any issues, we'd be thankful if you [submit an edit PR](https://github.com/pixel-agents-hq/docs/edit/main/docs/maintainers/release-cutting.md).
:::

> **Audience:** Maintainers cutting a Pixel Agents release.

Pixel Agents publishes to three places on every release:

1. **VS Code Marketplace** - extension ID `pablodelucca.pixel-agents`.
2. **Open VSX** - community marketplace mirror.
3. **npm** - package `pixel-agents`, drives `npx pixel-agents`.

Each has its own credentials and own publish command. Release cutting is the orchestration.

## Pre-release checks (mandatory)

Run every item. If any fail, fix before proceeding.

| Check | Command | What pass looks like |
|---|---|---|
| Working tree clean | `git status` | No uncommitted files (untracked `.ao/` is fine). |
| On `main` | `git branch --show-current` | `main`. |
| Up to date | `git pull --ff-only` | "Already up to date." |
| CI green | (GitHub web) | Last commit on `main` has green checks. |
| Type check | `npm run typecheck` | No errors. |
| Lint | `npm run lint` | No errors. |
| Tests | `npm test` | All passing. |
| E2E | `npm run e2e` | Full Playwright suite green. See [e2e tests](./e2e-tests). |
| Manual smoke | Walk the [pre-release manual smoke](./e2e-tests#pre-release-manual-smoke-30-min) (~30 min) | All sections pass. |
| `CHANGELOG.md` updated | (visual inspection) | Has an entry for the new version. |
| `package.json` bumped | (visual inspection) | Version matches the planned tag. |

Don't skip the manual smoke. The e2e suite covers behavioral regressions; the manual smoke covers visual polish, real Claude integration, cross-browser standalone, cross-window sync, first-run experience, and platform sanity - things automated assertions structurally can't see.

## Semver decisions

| Change | Bump |
|---|---|
| Bug fix, dependency patch, doc-only | `patch` (0.0.X) |
| New feature (additive), new provider | `minor` (0.X.0) |
| Breaking change to user-visible API or settings | `major` (X.0.0) |

Protocol changes have their own version: `HookProvider.protocolVersion`. Bumping that is a deliberate operation signaling a break in the `AgentEvent` / `HookProvider` shape. Bump the provider's version, not the package version, when the protocol breaks. The `HookEventHandler.SUPPORTED_PROTOCOL_VERSION` constant at `server/src/hookEventHandler.ts:62` must match.

Conventional commits drive much of this. `feat:` → minor. `fix:` → patch. `BREAKING CHANGE:` in the body or a `!` after the type → major. Stay disciplined here so the version is automatic.

## Build

```sh
npm run build         # full build: typecheck + lint + esbuild (extension) + vite (webview)
npm run package       # production .vsix
```

Verify the artifacts:

- `*.vsix` exists in the repo root.
- `dist/` contains `extension.js`, `webview/`, `assets/`, `hooks/claude-hook.js`.
- The .vsix opens in a clean VS Code install. Drag the file into a clean VS Code window and confirm the extension activates and the panel renders.

For the npm package, test `npx`:

```sh
npm pack                                # creates pixel-agents-X.Y.Z.tgz
mkdir /tmp/pixel-agents-test && cd /tmp/pixel-agents-test
npx /path/to/pixel-agents-X.Y.Z.tgz
```

Confirm the server starts, the SPA loads in the browser, and at least one agent action works.

## Publish

The three publishes are independent. Do them in this order so a failure mid-way doesn't leave the ecosystem inconsistent (Marketplace is the most-visible).

### 1. VS Code Marketplace

```sh
vsce publish
```

Requires:
- `VSCE_PAT` environment variable (Personal Access Token from Azure DevOps).
- Maintainer access to the `pablodelucca` publisher.

The publish takes ~30 seconds to upload and a few minutes to propagate to install search. Verify by searching "Pixel Agents" in a fresh VS Code.

### 2. Open VSX

```sh
ovsx publish
```

Requires:
- `OVSX_PAT` environment variable.
- Maintainer access to the `pablodelucca` namespace on Open VSX.

Open VSX is the marketplace alternative for VSCodium / Eclipse Theia users. Failing to publish here just means those users don't get the update; not catastrophic.

### 3. npm

```sh
npm publish
```

Requires:
- `NPM_TOKEN` or being logged in via `npm login`.
- Maintainer access to the `pixel-agents` npm package.

Verify: `npx pixel-agents@latest --help` resolves to the new version.

## Post-release

| Step | Action |
|---|---|
| Push the version tag | `git push origin v<version>` - **requires explicit per-action authorization from the user**. |
| Write release notes | Create a GitHub release from the new tag, copy the `CHANGELOG.md` entry. |
| Announce | Discord `#announcements`, optional tweet/post. |
| Monitor | Watch GitHub issues for ~48 hours for regression reports. |

The `git push origin v<version>` is the GitHub-edge action that falls under the [No GitHub push without explicit authorization](./overview#non-negotiable-github-push-policy) rule. Tag locally, surface the local tag SHA, wait for an explicit "push the tag" instruction.

## Rollback

If a release is broken after publishing:

**npm:** `npm deprecate pixel-agents@<version> "use <newer-version> instead"`. Does not remove the version; users with it pinned can still install it, but new installs get the warning.

**VS Code Marketplace:** Use the publisher dashboard at marketplace.visualstudio.com to unpublish or mark deprecated. Marketplace lets you push a follow-up version that overrides; deprecation is a stronger signal.

**Open VSX:** Same as Marketplace - through their dashboard.

**Always cut a follow-up patch.** Don't rely on deprecation alone. A broken `0.5.2` should be followed by a fixed `0.5.3` within hours.

## Hotfix flow

If you discover a critical bug post-release:

1. Branch from the release tag: `git checkout -b hotfix/<bug> v<broken-version>`.
2. Fix, test, type-check, lint.
3. Bump patch (`0.5.2` → `0.5.3`).
4. Update `CHANGELOG.md` with a "Fixed" entry.
5. Open a PR to `main` for review (the hotfix branch is the source of truth until merged).
6. After merge, cut the patch release from `main` using the normal flow.

The branch-from-tag pattern matters because `main` may have moved on with unreleased changes you don't want to ship in a hotfix.

## Failure modes

| Symptom | Cause | Fix |
|---|---|---|
| `vsce publish` fails: 401 | Stale PAT | Generate a new one from Azure DevOps. |
| `vsce publish` fails: missing fields | `package.json` missing `repository`, `publisher`, or `engines.vscode` | Edit and re-run. |
| `npm publish` fails: 403 | Package name taken or you're not in the maintainer list | Confirm via `npm owner ls pixel-agents`. |
| Marketplace shows old version after publish | Propagation lag | Wait 5 minutes; clear browser cache. |
| Users report missing files in .vsix | `.vscodeignore` excluded too much | Check the file list with `vsce ls`. |

## Related

- [Triage flow](./triage-flow) - what happens before a release.
- [Incident runbook](./incident-runbook) - what happens when a release breaks.
- [E2E tests](./e2e-tests) - the automated suite plus the pre-release manual smoke.
- [AI policy](./ai-policy) - applies to PRs landing before releases.
- `CHANGELOG.md` and `CONTRIBUTING.md` in the repo root for the user-facing release notes format.
