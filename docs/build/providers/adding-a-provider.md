---
sidebar_position: 2
---

# Adding a provider

:::warning[AI-generated docs]
This document was AI-generated and may have some mistakes - we apologize for this, we're in the process of reviewing all documents. If you find any issues, we'd be thankful if you [submit an edit PR](https://github.com/pixel-agents-hq/docs/edit/main/docs/build/providers/adding-a-provider.md).
:::

This page walks you, step by step, from an empty directory to a working Pixel Agents provider. The example throughout is a hypothetical "Codex" provider, so you can copy the file paths and the patterns directly.

Before starting, read [Providers overview](/build/providers/overview) for the conceptual model and [Reference implementation](/build/providers/reference-implementation) for the canonical Claude example. The interface you implement is at `core/src/provider.ts:60-128`.

## Prerequisites

- Node.js and a working `npm install` in the pixel-agents repo (root, `webview-ui/`, `server/`).
- A CLI you want to integrate that fires shell hooks (today only `HookProvider` is implemented, see [Providers overview](/build/providers/overview) for the planned `FileProvider` and `StreamProvider` slots).
- Sample raw hook payloads from the CLI. Capture these by running the CLI with a dummy hook script that pretty-prints stdin.

## Step 1: scaffold the provider directory

Every provider lives under `server/src/providers/hook/<id>/`. Mirror Claude's layout (`server/src/providers/hook/claude/`):

```
server/src/providers/hook/codex/
  codex.ts                 # HookProvider object + normalizeHookEvent + formatToolStatus
  codexHookInstaller.ts    # install/uninstall hooks in the CLI's config
  constants.ts             # CLI-specific constants (terminal prefix, hook event names)
  hooks/
    codex-hook.ts          # the script that runs INSIDE the CLI, POSTs to our server
  codexTeamProvider.ts     # optional, only if the CLI supports persistent teammates
```

Keep CLI-specific constants in `constants.ts`, not in the shared `server/src/constants.ts`. The header on Claude's version explains why (`server/src/providers/hook/claude/constants.ts:1-7`):

```ts
/**
 * Claude-specific constants. Kept separate from `server/src/constants.ts` so a
 * future single-provider `server/` build doesn't accidentally depend on Claude
 * unless Claude is the active provider.
 */
```

## Step 2: implement normalizeHookEvent

This is the heart of your provider. You translate raw Codex JSON into the normalized `AgentEvent` union from `core/src/provider.ts:14-56`.

Codex (this is hypothetical, your actual CLI's payload differs) emits payloads like:

```jsonc
// raw Codex hook payload
{
  "type": "tool_call",
  "session": "8c3b...",
  "id": "tc_abc123",
  "name": "shell",
  "input": { "cmd": "ls" }
}
```

You translate to `AgentEvent`:

```ts
// server/src/providers/hook/codex/codex.ts
import type { AgentEvent, HookProvider } from '../../../../../core/src/provider.js';

function normalizeHookEvent(
  raw: Record<string, unknown>,
): { sessionId: string; event: AgentEvent } | null {
  const type = raw.type;
  const sessionId = raw.session;
  if (typeof type !== 'string' || typeof sessionId !== 'string') return null;

  switch (type) {
    case 'tool_call': {
      const toolId = typeof raw.id === 'string' ? raw.id : `hook-${Date.now()}`;
      const toolName = typeof raw.name === 'string' ? raw.name : '';
      const input =
        typeof raw.input === 'object' && raw.input !== null
          ? (raw.input as Record<string, unknown>)
          : {};
      return {
        sessionId,
        event: { kind: 'toolStart', toolId, toolName, input },
      };
    }

    case 'tool_result':
      return {
        sessionId,
        event: { kind: 'toolEnd', toolId: 'current' },
      };

    case 'turn_complete':
      return { sessionId, event: { kind: 'turnEnd' } };

    case 'permission_required':
      return { sessionId, event: { kind: 'permissionRequest' } };

    case 'session_start':
      return {
        sessionId,
        event: {
          kind: 'sessionStart',
          source: typeof raw.source === 'string' ? raw.source : undefined,
          transcriptPath:
            typeof raw.transcript_path === 'string' ? raw.transcript_path : undefined,
          cwd: typeof raw.cwd === 'string' ? raw.cwd : undefined,
        },
      };

    case 'session_end':
      return {
        sessionId,
        event: {
          kind: 'sessionEnd',
          reason: typeof raw.reason === 'string' ? raw.reason : undefined,
        },
      };

    default:
      return null;
  }
}
```

Things to copy from Claude's implementation (`server/src/providers/hook/claude/claude.ts:123-235`):

- The early `return null` if the event name and session id are not both strings. Malformed payloads happen.
- The sentinel `'current'` toolId for tool ends when the raw payload does not carry the id. The handler correlates these against `currentHookToolId` it stored at the matching tool start.
- Synthetic `hook-<ts>` toolIds for starts when the CLI does not provide a stable id. JSONL polling (if you implement it) replaces these later.
- Returning `null` (not throwing) for unknown events. The handler drops nulls silently.

## Step 3: implement formatToolStatus

This is the human-readable label that floats above the character in the office. Switch on tool name and pull display info from `input`.

Use Claude's example (`server/src/providers/hook/claude/claude.ts:21-67`) as the template:

```ts
import * as path from 'path';
import {
  BASH_COMMAND_DISPLAY_MAX_LENGTH,
  TASK_DESCRIPTION_DISPLAY_MAX_LENGTH,
} from '../../../constants.js';

export function formatToolStatus(toolName: string, input?: unknown): string {
  const inp = (input ?? {}) as Record<string, unknown>;
  const base = (p: unknown) => (typeof p === 'string' ? path.basename(p) : '');
  switch (toolName) {
    case 'shell': {
      const cmd = (inp.cmd as string) || '';
      return `Running: ${
        cmd.length > BASH_COMMAND_DISPLAY_MAX_LENGTH
          ? cmd.slice(0, BASH_COMMAND_DISPLAY_MAX_LENGTH) + '…'
          : cmd
      }`;
    }
    case 'read_file':
      return `Reading ${base(inp.path)}`;
    case 'write_file':
      return `Writing ${base(inp.path)}`;
    case 'search':
      return 'Searching code';
    default:
      return `Using ${toolName}`;
  }
}
```

Truncation constants live in `server/src/constants.ts` and are shared across providers. Do not invent your own.

## Step 4: declare the tool Sets

Three sets drive how the UI behaves for your tools. They are part of the `HookProvider` interface (`core/src/provider.ts:87-94`):

```ts
permissionExemptTools: new Set(['shell_long_running', 'background_task']),
subagentToolNames:     new Set(['spawn_agent']),
readingTools:          new Set(['read_file', 'search', 'fetch_url']),
```

- `permissionExemptTools` tools whose start should not arm the 7-second heuristic permission timer. Tools that legitimately run for a long time (web fetches, sub-agent spawns) belong here.
- `subagentToolNames` tools that spawn sub-agent characters in the office. Only fill this if the CLI has sub-agents.
- `readingTools` tools whose character should play the reading animation instead of typing.

It is fine if your tool names overlap with Claude's. The provider's sets only apply to its own agents. Two providers running side by side never share these sets.

## Step 5: implement install / uninstall hooks

Your CLI has its own way to register shell hooks. For Claude it is editing `~/.claude/settings.json`. For Codex it might be a `~/.codex/hooks.toml` file, an `codex hooks add` CLI command, or environment variables.

Mirror Claude's installer pattern (`server/src/providers/hook/claude/claudeHookInstaller.ts`):

1. Read the existing config (return an empty object on missing or malformed file).
2. Remove any existing Pixel Agents entries (idempotency).
3. Add fresh entries pointing at the hook script you ship.
4. Write back via atomic tmp + rename.

```ts
// server/src/providers/hook/codex/codexHookInstaller.ts
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { HOOK_SCRIPTS_DIR } from '../../../constants.js';
import { CODEX_HOOK_SCRIPT_NAME, CODEX_HOOK_EVENTS } from './constants.js';

function getCodexConfigPath(): string {
  return path.join(os.homedir(), '.codex', 'hooks.json');
}

function getHookScriptPath(): string {
  return path.join(os.homedir(), HOOK_SCRIPTS_DIR, CODEX_HOOK_SCRIPT_NAME);
}

export function installHooks(): void {
  // read, remove ours, add fresh, atomic write
  // ...mirror claudeHookInstaller.ts:113-140
}

export function uninstallHooks(): void {
  // remove ours, write back
  // ...mirror claudeHookInstaller.ts:143-168
}

export function areHooksInstalled(): boolean {
  // every required event references our script
  // ...mirror claudeHookInstaller.ts:98-106
}
```

Then wrap those for the async `HookProvider` interface (`server/src/providers/hook/claude/claude.ts:239-251`):

```ts
function installHooks(_serverUrl: string, _authToken: string): Promise<void> {
  installerInstallHooks();
  return Promise.resolve();
}
```

### The hook script that runs inside the CLI

The script the CLI invokes is a separate file (`server/src/providers/hook/claude/hooks/claude-hook.ts`). It reads stdin (JSON), reads our server discovery file, POSTs to our server, exits.

```ts
// server/src/providers/hook/codex/hooks/codex-hook.ts
import * as fs from 'fs';
import * as http from 'http';
import * as os from 'os';
import * as path from 'path';

import { HOOK_API_PREFIX, SERVER_JSON_DIR, SERVER_JSON_NAME } from '../../../../constants.js';
import type { ServerConfig } from '../../../../server.js';

const SERVER_JSON = path.join(os.homedir(), SERVER_JSON_DIR, SERVER_JSON_NAME);

async function main(): Promise<void> {
  let input = '';
  for await (const chunk of process.stdin) input += chunk;

  let data: Record<string, unknown>;
  try { data = JSON.parse(input); } catch { process.exit(0); }

  let server: ServerConfig;
  try { server = JSON.parse(fs.readFileSync(SERVER_JSON, 'utf-8')); } catch { process.exit(0); }

  const body = JSON.stringify(data);
  return new Promise((resolve) => {
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: server.port,
        path: `${HOOK_API_PREFIX}/codex`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
          Authorization: `Bearer ${server.token}`,
        },
        timeout: 2000,
      },
      () => resolve(),
    );
    req.on('error', () => resolve());
    req.on('timeout', () => { req.destroy(); resolve(); });
    req.end(body);
  });
}

main().catch(() => {}).finally(() => process.exit(0));
```

This is a near-verbatim copy of `server/src/providers/hook/claude/hooks/claude-hook.ts`, with two differences:

- The POST path is `${HOOK_API_PREFIX}/codex`, your provider id in the URL.
- The script name is `codex-hook.ts` and it bundles to `codex-hook.js`.

You bundle this to a single CJS file with esbuild so the user does not need any `node_modules` next to it. Add it to `esbuild.js` alongside Claude's `buildHooks()`. See [Publishing](/build/providers/publishing#hook-script-bundling) for the bundling rules.

## Step 6: optional file fallback

If your CLI also writes a transcript file we can poll when hooks fail, implement the optional members from `core/src/provider.ts:101-121`. Skip this step if your CLI has no transcript file.

```ts
function getSessionDirs(workspacePath: string): string[] {
  // Where does this CLI store its transcripts for `workspacePath`?
  return [path.join(os.homedir(), '.codex', 'sessions', encodePath(workspacePath))];
}

function getAllSessionRoots(): string[] {
  return [path.join(os.homedir(), '.codex', 'sessions')];
}

function buildLaunchCommand(sessionId: string, cwd: string): {
  command: string;
  args: string[];
  env?: Record<string, string>;
} {
  return { command: 'codex', args: ['--session-id', sessionId], env: { PWD: cwd } };
}

function parseTranscriptLine(line: string): AgentEvent | null {
  // Parse one JSONL record. Return null for records we ignore.
}
```

Wire them into the provider object below.

## Step 7: register your provider

Edit `server/src/providers/index.ts` and add the export:

```ts
// server/src/providers/index.ts (after change)
export { claudeProvider } from './hook/claude/claude.js';
export { codexProvider } from './hook/codex/codex.js';
export { copyHookScript } from './hook/claude/claudeHookInstaller.js';
// also export your installer if adapters need it directly
export { copyHookScript as copyCodexHookScript } from './hook/codex/codexHookInstaller.js';
```

The header on `server/src/providers/index.ts` documents this is the registry:

```ts
/**
 * Provider registry: re-exports all bundled providers.
 *
 * Adding a new CLI provider:
 *   1. Create `server/src/providers/hook/<cli>/<cli>.ts` implementing HookProvider.
 *   2. Add an export line below.
 *
 * The adapter (VS Code extension, standalone CLI, etc.) imports from here rather
 * than reaching into each provider directory directly.
 */
```

## Step 8: wire into the runtime

Today `AgentRuntime` is one-provider-per-runtime. The standalone CLI hard-codes the choice at `server/src/cli.ts:90`:

```ts
const runtime = new AgentRuntime(store, claudeProvider);
```

To run with Codex, swap that line:

```ts
import { codexProvider } from './providers/index.js';
// ...
const runtime = new AgentRuntime(store, codexProvider);
```

The hook route is provider-agnostic (`server/src/httpServer.ts:101-130` accepts `POST ${HOOK_API_PREFIX}/:providerId`), but the runtime currently dispatches every hook through its single provider's `normalizeHookEvent`. If you want both Claude and Codex live in the same runtime, that is a larger change to `AgentRuntime` and out of scope here. File an issue.

## The complete provider object

Putting steps 2 through 6 together, you export a single object:

```ts
// server/src/providers/hook/codex/codex.ts
import type { HookProvider } from '../../../../../core/src/provider.js';
import {
  areHooksInstalled as installerAreHooksInstalled,
  installHooks as installerInstallHooks,
  uninstallHooks as installerUninstallHooks,
} from './codexHookInstaller.js';
import { CODEX_TERMINAL_NAME_PREFIX } from './constants.js';

// (formatToolStatus, normalizeHookEvent, getSessionDirs, buildLaunchCommand defined above)

function installHooks(_serverUrl: string, _authToken: string): Promise<void> {
  installerInstallHooks();
  return Promise.resolve();
}
function uninstallHooks(): Promise<void> {
  installerUninstallHooks();
  return Promise.resolve();
}
function areHooksInstalled(): Promise<boolean> {
  return Promise.resolve(installerAreHooksInstalled());
}

export const codexProvider: HookProvider = {
  kind: 'hook',
  id: 'codex',
  displayName: 'Codex',
  protocolVersion: 1,

  normalizeHookEvent,

  installHooks,
  uninstallHooks,
  areHooksInstalled,

  formatToolStatus,
  permissionExemptTools: new Set(['shell_long_running', 'background_task']),
  subagentToolNames: new Set(['spawn_agent']),
  readingTools: new Set(['read_file', 'search', 'fetch_url']),
  terminalNamePrefix: CODEX_TERMINAL_NAME_PREFIX,

  getSessionDirs,
  getAllSessionRoots,
  sessionFilePattern: '*.jsonl',
  buildLaunchCommand,

  // team: codexTeamProvider, // only if your CLI supports teammates
};
```

Compare side by side with `server/src/providers/hook/claude/claude.ts:255-279`.

## Step 9: test

See [Testing your provider](/build/providers/testing-your-provider) for the full picture. The minimum bar:

- Unit-test `normalizeHookEvent` with captured raw payloads, assert AgentEvent shape.
- Integration-test the hook script (spawn it, write JSON to stdin, assert it POSTs).
- Smoke-test end to end: run the CLI in a workspace, watch the office update.

## Step 10: publish

See [Publishing](/build/providers/publishing). The short version: open a PR adding your directory and the export line. Maintainers review for protocol version compatibility, hook script safety, and test coverage.

## Common pitfalls

**Forgetting to bump `protocolVersion` after an `AgentEvent` change.** If the change is breaking, the handler will silently drop events from your provider until the version on both sides matches. The mismatch logs at construction time (`server/src/hookEventHandler.ts:72-78`) but does not block startup. Search the logs for `reports protocolVersion=`.

**Returning a `toolStart` event without a `toolId`.** The `toolId` is the unique identifier across the `toolStart` and `toolEnd` pair. If the CLI does not provide one, synthesize a stable one (Claude uses `hook-${Date.now()}`). Without it, the matching `toolEnd` cannot find the start record and the UI keeps the tool active forever.

**`sessionId` mismatch between hook payload and the CLI's actual session.** The `HookEventHandler` looks up agents by `sessionId` (`server/src/hookEventHandler.ts:265-274`). If your hook script POSTs `session_id: "abc"` but the CLI created its transcript at `xyz.jsonl`, every event drops or buffers. Capture a real session and double check the IDs match.

**Confusing `toolId: 'current'` for a real id.** Claude uses the sentinel because PostToolUse hooks do not echo back the id. The handler correlates against `currentHookToolId` it stored at the matching PreToolUse (`server/src/hookEventHandler.ts:400-406, 446-457`). If your CLI does echo the id back, return the real one and skip the sentinel.

**Forgetting the URL path matches your provider id.** The hook route is `POST /api/hooks/:providerId` (`server/src/httpServer.ts:101-130`). Your hook script must POST to `/api/hooks/codex`, not `/api/hooks/claude`, or the runtime will normalize the event through the wrong provider.

**Including raw CLI fields in the broadcast.** Downstream consumers only see `AgentEvent`. If you reach into `raw.tool_input` outside `normalizeHookEvent`, you have leaked the provider boundary. Extend `AgentEvent` instead.

## Read next

- [HookProvider reference](/reference/hookprovider) the full interface contract.
- [Reference implementation](/build/providers/reference-implementation) end-to-end Claude walkthrough.
- [AgentEvent reference](/reference/protocol/agent-events) every event kind and field.
- [TeamProvider extension](/build/providers/teamprovider-extension) if the CLI has persistent teammates.
- [Testing your provider](/build/providers/testing-your-provider) test fixtures and patterns.
- [Publishing](/build/providers/publishing) the contribution flow.
