---
sidebar_position: 6
---

# E2E tests + pre-release manual smoke

:::warning[AI-generated docs]
This document was AI-generated and may have some mistakes - we apologize for this, we're in the process of reviewing all documents. If you find any issues, we'd be thankful if you [submit an edit PR](https://github.com/pixel-agents-hq/docs/edit/main/docs/maintainers/e2e-tests.md).
:::

> **Audience:** Maintainers running CI, cutting releases, or adding tests.

Pixel Agents has an automated Playwright e2e suite that covers the VS Code extension and the standalone `npx pixel-agents` server. CI green on this suite is the safety net for behavioral regressions. A short manual smoke (~30 min) covers what e2e structurally can't see.

This page is the maintainer-facing summary. The source of truth (with the auto-generated test inventory) lives in the repo at `e2e/README.md`.

## What the automated suite covers

Each area corresponds to a `test.describe` block in the spec files, an `@area:` tag on each test title, and an Allure `epic` label.

### @area:spawn

Agents being created and adopted. Covers internal terminals launched by clicking `+ Agent`, external Claude sessions adopted by the hook server or the JSONL scanner, basic Task subagent appearance/despawn, and lead+teammate routing for inline and tmux team modes.

### @area:lifecycle

Edge cases that historically caused agent-character desync: `/clear`, `--resume`, X-button close, dismissal cooldown, parallel sub-agents, teammate add/remove, rapid `/clear` followed by a new tool, late resume after stale cleanup.

### @area:cross-cutting

Invariants that should hold across every spawn path: tool status text matches the active tool name, sound chimes fire on the right events, restored agents skip the matrix spawn animation, hook installer preserves third-party hooks, settings persist across webview reload, sub-agent permission timer fires, layout editor enter/paint/save/exit smoke.

### @area:teams

Lead and teammate tool routing in both inline and tmux team modes, internal and external.

### @area:matrix

Every spawn permutation (internal vs external origin × basic vs inline-teammate vs tmux-teammate mode) re-verified against the heuristic JSONL-polling path with the hook server disabled. Confirms the polling-based detection produces the same agent state as the hook-driven path.

### @area:standalone

The `npx pixel-agents` CLI path: hook-driven lifecycle propagates from the local server into the browser SPA via the single `/ws` WebSocket endpoint.

## What's NOT covered (gaps + deferred)

Scenarios that exist as product behavior but are not in the automated suite. PRs that close a gap should remove the corresponding row in the repo's `e2e/README.md`.

| Scenario | Why not automated | Tracked |
|---|---|---|
| Multi-window `layout.json` cross-sync | Needs two VS Code instances simultaneously; fixture work | none |
| External asset directory add/remove via Settings | Needs bundled test asset packs | none |
| Bypass-permissions startup flag | Security-sensitive; manual review path | none |
| Workspace folder add/remove mid-session | Edge case; infra-heavy | none |
| Heuristic-timer cancellation after internal-terminal agent close | VS Code terminal panel collapse races the canvas click on the X overlay; covered via the external-agent variant which dodges the layout race | external variant in suite |
| Producer/viewer relay scenarios (multi-viewer replay, producer reconnect reconciliation) | Producer endpoint not yet built | `feat/producer-viewer-split` |

## Pre-release manual smoke (~30 min)

CI green is the safety net for behavioral regressions. The checks below are what e2e can't meaningfully assert on (visual polish, real-Claude integration, cross-process behaviors). Run them before tagging a Marketplace release - not on every PR.

Hand-driven testing now exists only to catch what automated assertions structurally can't see; the e2e suite covers everything else.

### Visual + interactive polish

Run these after any change touching `renderer.ts`, `spriteCache.ts`, `colorize.ts`, any `*.tsx`, CSS, or `editorActions.ts`:

- Pan around the office with middle-mouse drag - characters z-sort correctly against same-row chairs and lower-row desks, no flicker.
- Spawn 3+ agents - matrix spawn animation renders cleanly, characters move smoothly between seats.
- Open the Layout editor - paint floor with HSBC sliders, place + rotate (R) furniture, toggle on/off (T) state, drag-to-move in SELECT, multi-stage Esc unwinds correctly.
- Hover and click characters - overlay text positioning is correct, selection outline crisp, click on a seat reassigns.

### Real Claude Code integration

mock-claude is a fixture; real Claude's JSONL has edge cases the mock doesn't:

- Launch the Extension Development Host (F5), click + Agent, ask Claude to do a few tool-heavy turns and a permission-requiring tool. Watch for character desync, missing animations, stuck permission bubbles.
- Use a session with a large pasted image (multi-MB base64 user message) - confirm the "Possible format issue" warning doesn't false-fire and tool tracking still works.
- Test with one MCP server installed - confirm `mcp_progress` records don't break tool status.

### npx pixel-agents standalone

E2E covers Chrome via Playwright; verify other browsers + real workflow:

- `node dist/cli.js` (or `npx pixel-agents` after publish), open `http://localhost:3100` in Firefox AND Safari, run a real Claude session in a terminal - confirm characters appear and animate via WebSocket.
- Refresh the browser mid-session - WebSocketTransport reconnects, agents reappear from server state.

### Cross-window sync

Rarely covered by CI, easy to break:

- Open two VS Code windows. Edit the layout in one (paint a tile, save). Within ~2 s the other window picks it up.

### First-run experience (before publishing)

- Delete `~/.pixel-agents/` entirely. Launch the extension fresh - default layout loads, first-run tooltip appears, no console errors, hooks auto-install on first agent spawn.

### Platform sanity (CI hosts ≠ your machine)

- On the OS you primarily develop on, run a normal session for ~5 minutes - confirm no surprise CPU spikes, no leaked file watchers, panel reload doesn't lose state.

## Running the automated suite

```bash
cd pixel-agents
npm run compile && npm run e2e                # full suite (~10 min)

npm run e2e -- --grep "@area:spawn"           # filter by area tag
npm run e2e -- --grep "@area:cross-cutting"
npm run e2e -- --headed                       # watch chromium for standalone test

npm run e2e:inventory                         # regenerate the inventory in e2e/README.md
npm run test:report                           # build the Allure dashboard from latest run
npm run test:report:open                      # serve + open the Allure dashboard in a browser
```

CI runs the full suite on every PR. A red e2e blocks merge.

## Mocking model & rules

E2E tests drive Pixel Agents through a Claude-like **process boundary**, not by poking internals. The mocked `claude` (`e2e/fixtures/mock-claude` → `mock-claude-runner.cjs`) behaves like the real CLI for the parts Pixel Agents observes: it spawns as a process, creates its own append-only JSONL transcripts, and executes the installed hook script under `~/.pixel-agents/hooks` (the same path the real CLI uses).

The builder API (`claudeScenario(...)`, `.at()`, `.appendJsonl()`, `.emitHook()`, `.holdOpenFor()`) is documented in `CONTRIBUTING.md` under "Mock claude".

Rules for a correct test:

- **Drive behavior through a scenario, not by hand.** Define timed actions with the `claudeScenario(...)` builder and let the mock perform them. Don't hand-write transcript files or hand-fire hooks inside a terminal-driven test body.
- **Transcripts are append-only.** Existing JSONL lines are never mutated in place; new records appear later in the stream. Scenarios model this with timed `.appendJsonl(...)` steps.
- **Assert only on Playwright-visible outcomes** - agent overlays, character state, sound hooks. Never on the mock's internals. The mock never decides pass/fail.
- **Standalone is the one exception.** `standalone/hooks.spec.ts` has no VS Code terminal to host a mocked `claude`, so it POSTs to the server's hook endpoint directly via `sendHookEvent`. That is correct *only* for the standalone-server path; every terminal-driven test must use the scenario builder.

## What to read before adding a test

- The repo `CLAUDE.md` and `.claude/CLAUDE.md` - architecture and message protocol.
- `e2e/README.md` in the repo - the live source of truth, including the auto-generated test inventory.
- `e2e/fixtures/pixel-agents.ts` - fixture lifecycle.
- `e2e/helpers/` - every helper, especially `hooks.ts`, `mock-claude.ts`, `office.ts`, `webview.ts`.

## Adding a test

1. Pick a `test.describe` block that matches an existing `@area:` tag, OR add a new area in the repo's `e2e/README.md` "What this suite covers" section and pick a tag.
2. Add `@area:<tag>` to the test title.
3. Add Allure `epic` / `feature` / `story` labels matching the area.
4. Run `npm run e2e:inventory` and commit the regenerated section of `e2e/README.md`.

## Removing a test

1. Delete the test code.
2. Run `npm run e2e:inventory` so the inventory drops it.
3. If the scenario it tested is now manual or deferred, add a row to "What's NOT covered" in `e2e/README.md` and consider whether it belongs in the pre-release manual smoke above.

## Test inventory

The full inventory (47 tests at last count, broken down by area) is auto-generated by `scripts/generate-e2e-inventory.mjs` and embedded between markers in `e2e/README.md`. CI fails on drift.

Mirroring the inventory into this docs page would guarantee drift, so we don't. Look at the repo file directly: [`e2e/README.md`](https://github.com/pixel-agents-hq/pixel-agents/blob/main/e2e/README.md).

## Coverage philosophy

We do not measure e2e via code coverage (too noisy, doesn't map to user-observable scenarios). Coverage is tracked by:

1. **The repo `e2e/README.md` inventory** - every test in the suite with its area tag and file:line.
2. **The "What's NOT covered" gap list** above (deliberately maintained; closing a gap removes the corresponding row).
3. **Allure dashboard** - `epic` / `feature` / `story` labels group tests by area without needing this file. Run `npm run test:report` after a suite run, then open `allure-report/allure/index.html` → Behaviors view.

## Related

- [Release cutting](./release-cutting) - the release flow that depends on e2e green plus the manual smoke above.
- [Triage flow](./triage-flow) - PR triage requires green CI (including e2e).
- [Incident runbook](./incident-runbook) - when CI breaks, including e2e regressions.
- [Maintainer overview](./overview) - the section landing.
- [Contributing](/community/contributing) - the broader contributor flow.
- [Testing your provider](/build/providers/testing-your-provider) - the provider-level test patterns (distinct from this suite-level e2e).
