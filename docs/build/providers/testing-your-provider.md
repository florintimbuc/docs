---
sidebar_position: 4
---

# Testing your provider

:::warning[AI-generated docs]
This document was AI-generated and may have some mistakes - we apologize for this, we're in the process of reviewing all documents. If you find any issues, we'd be thankful if you [submit an edit PR](https://github.com/pixel-agents-hq/docs/edit/main/docs/build/providers/testing-your-provider.md).
:::

A provider has three failure surfaces: the normalization function, the hook script that runs inside the CLI, and the install / uninstall flow. This page covers the test patterns for each. Use it after you have walked through [Adding a provider](/build/providers/adding-a-provider).

## Test tooling

The repo uses two test runners:

- **Vitest** for the server tier (`server/__tests__/`). Run with `npm run test:server` from the repo root. This is where your provider tests live.
- **Node test runner** for webview asset integration tests (`webview-ui/__tests__/`). You will not touch this from a provider.

Run everything via `npm test` at the repo root, which fans out to both.

No mocking framework beyond Vitest's built-ins. Use Vitest's `vi.mock`, `vi.spyOn`, temp directories under `os.tmpdir()`, and process spawning for integration tests.

## Test fixture pattern: captured raw payloads

The single most useful artifact for a provider is a folder of captured raw hook payloads from a real CLI run. Capture by registering a one-line shell hook that pipes stdin to a file, run a representative session, and save the JSON.

Store fixtures in `server/__tests__/fixtures/<providerId>/` as one `.json` file per event, named for the hook event. For Codex you might end up with:

```
server/__tests__/fixtures/codex/
  tool_call-shell.json
  tool_call-read_file.json
  tool_result.json
  turn_complete.json
  permission_required.json
  session_start.json
  session_end.json
```

Each file holds the raw JSON the CLI emitted.

## Pattern 1: unit-test normalizeHookEvent

For every fixture, assert the resulting `AgentEvent` shape. This is the highest-value test in the entire suite.

```ts
// server/__tests__/codex.normalizeHookEvent.test.ts
import { readFileSync } from 'fs';
import * as path from 'path';
import { describe, expect, it } from 'vitest';

import { codexProvider } from '../src/providers/hook/codex/codex.js';

const FIXTURE_DIR = path.join(__dirname, 'fixtures', 'codex');

function loadFixture(name: string): Record<string, unknown> {
  return JSON.parse(readFileSync(path.join(FIXTURE_DIR, name), 'utf-8')) as Record<string, unknown>;
}

describe('codexProvider.normalizeHookEvent', () => {
  it('translates tool_call to toolStart', () => {
    const raw = loadFixture('tool_call-shell.json');
    const result = codexProvider.normalizeHookEvent(raw);
    expect(result).not.toBeNull();
    expect(result!.event.kind).toBe('toolStart');
    if (result!.event.kind !== 'toolStart') return;
    expect(result!.event.toolName).toBe('shell');
    expect(result!.event.toolId).toMatch(/^tc_/); // real Codex id, not synthetic
  });

  it('translates tool_result to toolEnd with sentinel toolId', () => {
    const raw = loadFixture('tool_result.json');
    const result = codexProvider.normalizeHookEvent(raw);
    expect(result?.event).toEqual({ kind: 'toolEnd', toolId: 'current' });
  });

  it('translates turn_complete to turnEnd', () => {
    const raw = loadFixture('turn_complete.json');
    const result = codexProvider.normalizeHookEvent(raw);
    expect(result?.event.kind).toBe('turnEnd');
  });

  it('returns null for unrecognized event types', () => {
    const result = codexProvider.normalizeHookEvent({
      type: 'unknown_future_event',
      session: 'abc',
    });
    expect(result).toBeNull();
  });

  it('returns null when session id is missing', () => {
    const result = codexProvider.normalizeHookEvent({ type: 'tool_call' });
    expect(result).toBeNull();
  });
});
```

Key assertions to write for every provider:

- Every documented hook event maps to a non-null `{ sessionId, event }`.
- Malformed payloads (missing session id, missing event name, wrong types) return `null` rather than throwing.
- Events you intentionally drop return `null` (Claude drops `UserPromptSubmit` and `TaskCreated`, see `server/src/providers/hook/claude/claude.ts:156-158, 230-233`).

## Pattern 2: round-trip coverage on AgentEvent kinds

Every `AgentEvent.kind` in `core/src/provider.ts:14-56` should be reachable from at least one real CLI event. Codify this as a test:

```ts
// server/__tests__/codex.coverage.test.ts
import { describe, expect, it } from 'vitest';

import { codexProvider } from '../src/providers/hook/codex/codex.js';

const FIXTURES_BY_KIND = {
  toolStart: 'tool_call-shell.json',
  toolEnd: 'tool_result.json',
  turnEnd: 'turn_complete.json',
  permissionRequest: 'permission_required.json',
  sessionStart: 'session_start.json',
  sessionEnd: 'session_end.json',
  // subagentStart, subagentEnd, subagentTurnEnd, progress -- only if your CLI emits them
};

describe('codex AgentEvent kind coverage', () => {
  for (const [expectedKind, fixture] of Object.entries(FIXTURES_BY_KIND)) {
    it(`fixture ${fixture} normalizes to kind=${expectedKind}`, () => {
      const raw = JSON.parse(/* read fixture */); // see Pattern 1 for the helper
      const result = codexProvider.normalizeHookEvent(raw);
      expect(result?.event.kind).toBe(expectedKind);
    });
  }
});
```

If a kind has no fixture, document why: "Codex does not emit `progress` events". The handler drops `progress` events anyway (`server/src/hookEventHandler.ts:338-340`), so it is acceptable to skip.

## Pattern 3: hook install / uninstall in a temp HOME

The installer touches `~/.codex/...` (or wherever your CLI's config lives). Test it by overriding `os.homedir()` to a temp directory.

```ts
// server/__tests__/codexHookInstaller.test.ts
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  areHooksInstalled,
  installHooks,
  uninstallHooks,
} from '../src/providers/hook/codex/codexHookInstaller.js';

describe('codexHookInstaller', () => {
  let tmpHome: string;

  beforeEach(() => {
    tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-hooks-test-'));
    vi.spyOn(os, 'homedir').mockReturnValue(tmpHome);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    fs.rmSync(tmpHome, { recursive: true, force: true });
  });

  it('installs hook entries into the CLI config', () => {
    installHooks();
    expect(areHooksInstalled()).toBe(true);
    const config = JSON.parse(
      fs.readFileSync(path.join(tmpHome, '.codex', 'hooks.json'), 'utf-8'),
    );
    expect(config.hooks).toBeDefined();
  });

  it('install is idempotent', () => {
    installHooks();
    installHooks();
    installHooks();
    expect(areHooksInstalled()).toBe(true);
    const config = JSON.parse(
      fs.readFileSync(path.join(tmpHome, '.codex', 'hooks.json'), 'utf-8'),
    );
    const entries = Object.values(config.hooks).flat();
    expect(entries.length).toBeLessThan(20); // not exploding
  });

  it('uninstall removes our entries cleanly', () => {
    installHooks();
    uninstallHooks();
    expect(areHooksInstalled()).toBe(false);
  });

  it('uninstall preserves user entries from other tools', () => {
    // Write a non-pixel-agents entry first
    fs.mkdirSync(path.join(tmpHome, '.codex'), { recursive: true });
    fs.writeFileSync(
      path.join(tmpHome, '.codex', 'hooks.json'),
      JSON.stringify({
        hooks: {
          tool_call: [{ matcher: '', hooks: [{ type: 'command', command: 'some-other-tool' }] }],
        },
      }),
    );
    installHooks();
    uninstallHooks();
    const config = JSON.parse(
      fs.readFileSync(path.join(tmpHome, '.codex', 'hooks.json'), 'utf-8'),
    );
    expect(config.hooks.tool_call).toBeDefined();
    expect(config.hooks.tool_call[0].hooks[0].command).toBe('some-other-tool');
  });
});
```

The "preserves user entries" test catches the most common installer bug. Without it you may accidentally wipe an unrelated tool's hooks.

## Pattern 4: integration-test the hook script

The hook script (`codex-hook.ts` bundled to `codex-hook.js`) runs inside the CLI, reads stdin, POSTs to your server. Test it by spawning the real process and feeding it stdin.

This pattern lives at `server/__tests__/claude-hook.test.ts` for Claude. Mirror it:

```ts
// server/__tests__/codex-hook.test.ts
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as http from 'http';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('codex-hook script', () => {
  let tmpHome: string;
  let receivedBody: string | null;
  let server: http.Server;
  let port: number;

  beforeEach(async () => {
    tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-hook-test-'));
    receivedBody = null;
    server = http.createServer((req, res) => {
      let body = '';
      req.on('data', (chunk) => (body += chunk));
      req.on('end', () => {
        receivedBody = body;
        res.end('ok');
      });
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const addr = server.address();
    if (typeof addr === 'object' && addr) port = addr.port;

    // Write server.json the hook script will read
    fs.mkdirSync(path.join(tmpHome, '.pixel-agents'), { recursive: true });
    fs.writeFileSync(
      path.join(tmpHome, '.pixel-agents', 'server.json'),
      JSON.stringify({ port, token: 'test-token', pid: process.pid }),
    );
  });

  afterEach(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    fs.rmSync(tmpHome, { recursive: true, force: true });
  });

  it('POSTs stdin payload to the server', async () => {
    const scriptPath = path.join(__dirname, '..', 'dist', 'hooks', 'codex-hook.js');
    const payload = JSON.stringify({ type: 'tool_call', session: 'abc', id: 'x', name: 'shell' });

    const proc = spawn('node', [scriptPath], {
      env: { ...process.env, HOME: tmpHome, USERPROFILE: tmpHome },
    });
    proc.stdin.write(payload);
    proc.stdin.end();

    await new Promise<void>((resolve) => proc.on('exit', () => resolve()));

    expect(receivedBody).not.toBeNull();
    expect(JSON.parse(receivedBody!)).toEqual(JSON.parse(payload));
  });

  it('exits cleanly when server.json is missing', async () => {
    fs.rmSync(path.join(tmpHome, '.pixel-agents'), { recursive: true });
    const scriptPath = path.join(__dirname, '..', 'dist', 'hooks', 'codex-hook.js');
    const proc = spawn('node', [scriptPath], {
      env: { ...process.env, HOME: tmpHome, USERPROFILE: tmpHome },
    });
    proc.stdin.write('{}');
    proc.stdin.end();

    const exitCode = await new Promise<number | null>((resolve) =>
      proc.on('exit', (code) => resolve(code)),
    );
    expect(exitCode).toBe(0); // graceful, not crashed
  });
});
```

The "exits cleanly when server.json is missing" test catches the regression where a stale hook fires after the user uninstalled Pixel Agents. The script should never crash the user's CLI session.

## Pattern 5: permission timer cancellation

When the provider's CLI emits a permission-required event, the heuristic 7-second permission timer should be canceled (the hook is the authoritative signal, no need to wait). Assert this directly via the `HookEventHandler`:

```ts
// server/__tests__/codex.permissionTimer.test.ts
import { describe, expect, it, vi } from 'vitest';

import { AgentStateStore } from '../src/agentStateStore.js';
import { HookEventHandler } from '../src/hookEventHandler.js';
import { codexProvider } from '../src/providers/hook/codex/codex.js';
import { SessionRouter } from '../src/sessionRouter.js';

describe('permission timer cancellation', () => {
  it('cancels the permission timer when permission_required arrives', () => {
    const store = new AgentStateStore();
    const waiting = new Map();
    const permission = new Map();
    const router = new SessionRouter();
    const handler = new HookEventHandler(store, waiting, permission, codexProvider, router);

    // Register an agent with a pending permission timer
    const sessionId = 'sess-1';
    const agentId = 1;
    store.set(agentId, /* AgentState fixture with hookDelivered=true */);
    handler.registerAgent(sessionId, agentId);
    permission.set(agentId, setTimeout(() => {}, 99_999));

    expect(permission.has(agentId)).toBe(true);

    handler.handleEvent('codex', {
      hook_event_name: 'permission_required',
      session_id: sessionId,
    });

    expect(permission.has(agentId)).toBe(false);
  });
});
```

You need a real `AgentState` fixture for this. Use the test helpers in `server/__tests__/` for that, or factor them out into a shared `testHelpers.ts`.

## Pattern 6: multi-session safety

The `HookEventHandler` routes by `session_id`. If you have two agents in two sessions, events for one must never affect the other. Write a test that creates two agents and asserts isolation:

```ts
it('routes events to the correct agent by session_id', () => {
  const store = new AgentStateStore();
  const broadcasts: unknown[] = [];
  store.setBroadcaster((msg) => broadcasts.push(msg));

  // Register agents 1 and 2 with distinct session ids
  // ...

  handler.handleEvent('codex', {
    hook_event_name: 'tool_call',
    session_id: 'sess-1',
    id: 'tc1',
    name: 'shell',
  });

  // Agent 1 should have an active tool, agent 2 should not
  const a1 = broadcasts.filter((b: any) => b.id === 1);
  const a2 = broadcasts.filter((b: any) => b.id === 2);
  expect(a1.length).toBeGreaterThan(0);
  expect(a2.length).toBe(0);
});
```

## Pattern 7: protocolVersion mismatch behavior

Confirm the handler refuses to dispatch when the provider's protocol version is wrong:

```ts
it('drops events from a provider with mismatched protocolVersion', () => {
  const futureProvider = { ...codexProvider, protocolVersion: 99 };
  const handler = new HookEventHandler(store, waiting, permission, futureProvider, router);
  // No broadcasts after handleEvent because the handler bails at the top guard
  handler.handleEvent('codex', { hook_event_name: 'tool_call', session_id: 'x' });
  expect(broadcasts.length).toBe(0);
});
```

The guard is at `server/src/hookEventHandler.ts:131-134`.

## Common gotchas

**`protocolVersion` mismatch silently drops events.** The handler logs once at constructor time (`server/src/hookEventHandler.ts:72-78`) but does not throw. Your test suite will pass if you forget to bump the version on the handler side. Write the explicit test in Pattern 7.

**Provider tool sets are case-sensitive.** `'Read'` and `'read'` are different. Capture real fixtures and copy the exact casing the CLI emits.

**`session_id` casing.** Some CLIs hash session ids to lowercase, others preserve mixed case. The handler resolves agents by exact string match (`server/src/hookEventHandler.ts:265-274`). If your fixtures use one casing but the runtime uses another, every event drops or buffers. Capture and copy verbatim.

**Hook script tests need the bundled output.** The integration test in Pattern 4 spawns `dist/hooks/codex-hook.js`. If you forgot to run `npm run build` (or add it to your test's `beforeAll`), the test fails with `ENOENT`. CI should run the build before tests.

**Temp HOME and Windows.** The installer test in Pattern 3 mocks `os.homedir()`. On Windows your installer may also read `process.env.USERPROFILE`. Override that too when running on Windows CI:

```ts
vi.stubEnv('USERPROFILE', tmpHome);
vi.stubEnv('HOME', tmpHome);
```

## What you skip

You do not need integration tests against the real CLI. The fixture pattern (capture raw payloads, drive them through `normalizeHookEvent`) replaces a full integration run for the provider tier. Save the end-to-end smoke test for manual verification before publishing.

You also do not need to test the webview side. The protocol contract guarantees that any properly normalized `AgentEvent` produces the right office behavior. Webview tests live in `webview-ui/__tests__/` and cover that side independently.

## Cross references

- Interface contract: [HookProvider reference](/reference/hookprovider).
- Adding a provider walkthrough: [Adding a provider](/build/providers/adding-a-provider).
- Canonical provider read-through: [Reference implementation](/build/providers/reference-implementation).
- Publishing once tests pass: [Publishing](/build/providers/publishing).
