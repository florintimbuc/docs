---
sidebar_position: 3
---

# Discovery and auth

Before a client can connect, it has to find the server. Before the server accepts certain requests, it has to know the client is allowed. Both problems are solved by a tiny on-disk file at `~/.pixel-agents/server.json` and a Bearer token that lives inside it.

This page explains the file, the auth flow, the differences between embedded mode (VS Code) and standalone mode (CLI), and what to do when your auth fails.

## The discovery file

The file path is built from constants in `core/src/constants.ts:12-13`:

```ts
export const SERVER_JSON_DIR = '.pixel-agents';
export const SERVER_JSON_NAME = 'server.json';
```

Resolved, this is `~/.pixel-agents/server.json`.

The schema is defined at `server/src/server.ts:14-23`:

```ts
/** Discovery file written to ~/.pixel-agents/server.json so hook scripts can find the server. */
export interface ServerConfig {
  /** Port the HTTP server is listening on */
  port: number;
  /** PID of the process that owns the server */
  pid: number;
  /** Auth token required in Authorization header for hook requests */
  token: string;
  /** Timestamp (ms) when the server started */
  startedAt: number;
}
```

A concrete file looks like:

```json
{
  "port": 3100,
  "pid": 84221,
  "token": "9f6d8e2a-1f4f-4c6e-9c2d-3a51b3a6e801",
  "startedAt": 1733582044931
}
```

### How the file is written

`PixelAgentsServer.writeServerJson()` writes atomically: it dumps to a `.tmp` sibling and then renames into place. The parent directory is created with mode `0o700` if missing, and the file is written with mode `0o600`. See `server/src/server.ts:142-156`:

```ts
private writeServerJson(config: ServerConfig): void {
  const filePath = this.getServerJsonPath();
  const dir = path.dirname(filePath);
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    }
    const tmpPath = filePath + '.tmp';
    fs.writeFileSync(tmpPath, JSON.stringify(config, null, 2), { mode: 0o600 });
    fs.renameSync(tmpPath, filePath);
  } catch (e) {
    console.error(`[Pixel Agents] Failed to write server.json: ${e}`);
  }
}
```

The atomic write means a reader will either see a complete file or the previous complete file. Partial writes never appear.

### How the file is deleted

Only the **owning process** deletes the file on shutdown. The check matches the PID inside the file against `process.pid` (`server/src/server.ts:158-170`):

```ts
private deleteServerJson(): void {
  try {
    const filePath = this.getServerJsonPath();
    if (!fs.existsSync(filePath)) return;
    const existing = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as ServerConfig;
    if (existing.pid === process.pid) {
      fs.unlinkSync(filePath);
    }
  } catch {
    // File may already be gone
  }
}
```

This is what makes multi-window safe: if you open two VS Code windows, the second window starts, sees `existing.pid` is alive, and reuses the existing server without writing a new file (`server/src/server.ts:66-75`). When you close the first window, the second window keeps running but does **not** own the file. If the second window later shuts down without the first ever owning it again, the file would survive - that is acceptable because a fresh server start re-checks the PID and overwrites.

### Reading sequence the client must follow

1. Check that the file exists at `~/.pixel-agents/server.json`.
2. Parse it as `ServerConfig`.
3. **Verify the PID is alive.** A stale file from a crashed process points at a port nothing is listening on. On POSIX systems, `kill(pid, 0)` returns success when the process exists and `ESRCH` when it does not. In Node, this is exposed as `process.kill(pid, 0)` inside a try/catch:

   ```ts
   function isAlive(pid: number): boolean {
     try { process.kill(pid, 0); return true; } catch { return false; }
   }
   ```

   The server itself uses the same trick (`server/src/server.ts:173-181`):

   ```ts
   function isProcessRunning(pid: number): boolean {
     try {
       process.kill(pid, 0);
       return true;
     } catch {
       return false;
     }
   }
   ```

4. Open the WebSocket to `ws://127.0.0.1:<port>/ws`.

If the PID is dead, the right user-facing action is "please start the server again." Do **not** spin in a retry loop reading the same file. Either the user starts the server (in which case the file gets rewritten with a fresh PID), or they do not (in which case retrying is pointless).

## The Bearer token

The token is generated fresh on every server start using `crypto.randomUUID()` (`server/src/server.ts:78`). It is a UUID v4, never persisted across restarts, never reused. Once the server stops, the token is gone forever.

### Where the token is required

Two endpoints require Bearer auth:

| Endpoint | Auth required | Code reference |
| --- | --- | --- |
| `POST /api/hooks/:providerId` | Always | `server/src/httpServer.ts:101-130` |
| `GET /ws` (WebSocket upgrade) | Embedded mode only | `server/src/httpServer.ts:134-148` |
| `GET /api/health` | No | `server/src/httpServer.ts:91-97` |

The Bearer header looks like:

```
Authorization: Bearer 9f6d8e2a-1f4f-4c6e-9c2d-3a51b3a6e801
```

### How the server checks it

The server uses constant-time comparison via `crypto.timingSafeEqual` on Buffer-encoded strings (`server/src/httpServer.ts:140-147` for WebSocket, `server/src/httpServer.ts:208-217` for hooks):

```ts
function bearerAuth(expectedToken: string) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const auth = request.headers.authorization ?? '';
    const expected = `Bearer ${expectedToken}`;
    const authBuf = Buffer.from(auth);
    const expectedBuf = Buffer.from(expected);
    if (authBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(authBuf, expectedBuf)) {
      reply.code(401).send('unauthorized');
    }
  };
}
```

If the header is missing or wrong, hooks get HTTP 401 and the WebSocket upgrade gets close code `4001 'unauthorized'`. There is no body on the WebSocket failure: the connection drops with that close code only.

## Embedded vs standalone

The same server binary runs in two modes. They differ only at the auth boundary.

### Embedded mode (VS Code)

- WebSocket requires Bearer (`options.embedded === true`, `server/src/httpServer.ts:139-148`).
- The VS Code extension creates the transport and supplies the token to the webview internally.
- Hooks still require Bearer (always required regardless of mode).
- The server listens on an ephemeral port (`port: 0` triggers OS-assigned).

The threat model: the VS Code extension wants defense in depth in case another local process tries to talk to it. The token is in `~/.pixel-agents/server.json` which is mode `0o600`, so only the user can read it. Combined with Bearer auth, this gives reasonable resistance to local snooping.

### Standalone mode (CLI)

- WebSocket skips Bearer (`options.embedded === false`).
- Hooks still require Bearer.
- The default port is 3100, bound to `127.0.0.1` (`server/src/cli.ts:35` and `server/src/httpServer.ts:82`).

The threat model: the standalone server is started by the user explicitly via `npx pixel-agents` or `node server/dist/cli.js`. The trust boundary is the local machine. Anything that can already reach `127.0.0.1:3100` is on the user's machine, so requiring auth on the WebSocket adds no real security.

Hooks are different. Hook scripts may be executed by Claude Code in subshells or by other tooling that does not naturally know about the server. The Bearer token ensures only invocations whose body was constructed by the actual hook script get through; random POSTs from unknown sources are rejected.

### A quick comparison table

| Concern | Embedded (VS Code) | Standalone (CLI) |
| --- | --- | --- |
| Discovery file | Yes, `~/.pixel-agents/server.json` | Yes, same path |
| Bind address | `127.0.0.1` | `127.0.0.1` (configurable via `--host`) |
| Port | Ephemeral (OS-assigned) | 3100 default, `--port` overrides |
| Static SPA served | No | Yes, `app.register(fastifyStatic, ...)` |
| WebSocket auth | Bearer required | None (loopback boundary) |
| Hook auth | Bearer required | Bearer required |
| Logging | Quiet (`logger: !options.embedded`) | Verbose Fastify logger |
| Asset cache | Loaded by VS Code extension | Loaded by CLI on startup |

The logger and asset cache differences are at `server/src/httpServer.ts:54-57` and `server/src/cli.ts:66-79`.

## Recovering from auth failures

There are two failure modes a client should plan for.

### HTTP 401 on a hook POST

The token in `server.json` does not match what the server expects. This usually means:

- The server restarted after you read `server.json`. The token rotated; your cached copy is stale.
- Your client cached the token from a previous run and is using it after a server restart.

**Recovery:** re-read `server.json`, get the fresh token, retry the POST. Do not retry with the stale token.

### WebSocket close `4001 'unauthorized'`

The Bearer header on the upgrade did not match. This is the same root cause as above: stale token.

**Recovery:** close the WebSocket, re-read `server.json`, open a new WebSocket with the fresh token. The server does **not** notify you out-of-band that the token rotated; you have to detect the close and refresh.

A useful client pattern: wrap your reconnect logic so it always begins with a fresh `loadServerConfig()` call. The token, port, and PID may all be different on the next attempt.

## What clients should NEVER do

- **Do not hard-code a port.** 3100 is a default, not a guarantee. The server may be on another port if you started it with `--port`, and embedded mode always uses an ephemeral port.
- **Do not hard-code a token.** It rotates every server start. Reading it from `server.json` each connect is the only correct strategy.
- **Do not cache the token across sessions.** A reboot, a crash, a deliberate restart - any of these invalidates it.
- **Do not log the token at info level.** Anyone with access to the user's machine can already read `server.json`, but logs are a different distribution vector. Treat the token like a secret in your logging policy.
- **Do not connect to anything other than `127.0.0.1`.** The server only listens on loopback. Any other interface is wrong.

## Verifying a healthy server

If you want to confirm the server is up without opening a WebSocket, hit `GET /api/health`. It needs no auth and returns a small JSON object (`server/src/httpServer.ts:91-97`):

```ts
function registerHealthRoute(app: FastifyInstance): void {
  app.get('/api/health', async () => ({
    status: 'ok',
    uptime: Math.floor((Date.now() - startTime) / 1000),
    pid: process.pid,
  }));
}
```

Example:

```sh
curl http://127.0.0.1:3100/api/health
# {"status":"ok","uptime":42,"pid":84221}
```

The `pid` in the response should match the `pid` in `server.json`. If they differ, your `server.json` is stale (a different server is running on that port). Re-read the file and start over.

## Cross-references

- [Building a client](./building-a-client) - uses this discovery flow in four languages.
- [Connection lifecycle](./connection-lifecycle) - what happens after the handshake.
- [Errors reference](/reference/errors) - full table of error codes the server emits.
- [Clients overview](./overview) - the layer above this one.
