---
sidebar_position: 10
---

# Errors Reference

:::warning[AI-generated docs]
This document was AI-generated and may have some mistakes - we apologize for this, we're in the process of reviewing all documents. If you find any issues, we'd be thankful if you [submit an edit PR](https://github.com/pixel-agents-hq/docs/edit/main/docs/reference/errors.md).
:::

Error codes, HTTP statuses, and WebSocket close codes the server produces. Use this as a lookup when diagnosing a connection or hook failure.

## WebSocket close codes

| Code | Meaning | When |
|---|---|---|
| `1000` | Normal close | Client or server shut down cleanly. |
| `4001` | `unauthorized` | Embedded mode only. Bearer token missing or invalid. See `server/src/httpServer.ts:145`. |

Source citation:

```ts
// server/src/httpServer.ts:139-148
if (options.embedded) {
  const auth = request.headers.authorization ?? '';
  const expected = `Bearer ${options.token}`;
  const authBuf = Buffer.from(auth);
  const expectedBuf = Buffer.from(expected);
  if (authBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(authBuf, expectedBuf)) {
    socket.close(4001, 'unauthorized');
    return;
  }
}
```

Standalone mode skips this check (loopback-only binding is the security boundary). The WebSocket close code `4001` only ever appears in VS Code embedded mode.

Client recovery: re-read `~/.pixel-agents/server.json` (the server may have rotated the token), then reconnect with the fresh token. Don't retry with the same token in a tight loop.

## HTTP status codes

### 200 OK

Successful hook event POST or health check.

### 401 Unauthorized

Bearer auth failed on a `/api/hooks/:providerId` POST. See `server/src/httpServer.ts:208-217`:

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

Hooks **always** require Bearer auth (in both embedded and standalone modes) because hook scripts may be invoked by any process that can read `~/.pixel-agents/server.json`.

### 400 Bad Request

The Fastify route schema rejects the request before reaching the handler. Causes:

- `providerId` path parameter doesn't match `^[a-z0-9-]+$` (`server/src/httpServer.ts:113`).
- Body is malformed JSON.
- Body exceeds `MAX_HOOK_BODY_SIZE` limit.

### 404 Not Found

In standalone mode, unknown HTTP routes serve `index.html` (HTML5 history fallback, `server/src/httpServer.ts:69-71`):

```ts
app.setNotFoundHandler((_req, reply) => {
  reply.sendFile('index.html');
});
```

In embedded mode, no static fallback exists; unknown routes return Fastify's default 404.

## Body limits

```ts
// server/src/constants.ts:55
export const MAX_HOOK_BODY_SIZE = 65_536; // 64KB
```

Fastify enforces this via the `bodyLimit` option at server construction (`server/src/httpServer.ts:54-57`):

```ts
const app = Fastify({
  logger: !options.embedded,
  bodyLimit: MAX_HOOK_BODY_SIZE,
});
```

Hook events larger than 64KB are rejected with `413 Payload Too Large`. In practice, Claude hook payloads are well under 1KB; hitting this limit indicates an unusual tool input (e.g. a massive `Write` payload) and the event is dropped.

## Silent drops

The server silently ignores some classes of input rather than returning an error:

### Missing session_id or hook_event_name

```ts
// server/src/httpServer.ts:123-125
if (event.session_id && event.hook_event_name) {
  options.onHookEvent?.(providerId, event);
}
reply.send('ok');
```

The route returns `200 ok` to keep the hook script happy, but the event is not dispatched. This avoids surfacing CLI quirks (an unexpected payload shape from a new Claude version) as user-visible errors.

### Protocol version mismatch

```ts
// server/src/hookEventHandler.ts:72-78
if (provider.protocolVersion !== HookEventHandler.SUPPORTED_PROTOCOL_VERSION) {
  console.warn(
    `[Pixel Agents] HookProvider "${provider.id}" reports protocolVersion=${provider.protocolVersion}, ` +
      `but handler understands ${HookEventHandler.SUPPORTED_PROTOCOL_VERSION}. ` +
      `Events from this provider will be dropped.`,
  );
}
```

Logged once at handler construction. Subsequent `handleEvent` calls return immediately without doing work (line 132-134).

### Malformed WebSocket messages

```ts
// server/src/httpServer.ts:180-195
socket.on('message', (data: Buffer | string) => {
  try {
    const msg = JSON.parse(data.toString()) as Record<string, unknown>;
    // ... dispatch ...
  } catch {
    // Malformed JSON, ignore
  }
});
```

JSON parse failures are swallowed. The WebSocket stays open.

### Unknown ClientMessage.type

```ts
// server/src/clientMessageHandler.ts:125-128
default:
  // focusAgent, exportLayout, importLayout
  // require IDE-specific handling (not yet implemented for standalone)
  break;
```

Unknown or unsupported message types fall through to `default` and do nothing.

## Validation rules

### providerId path parameter

```ts
// server/src/httpServer.ts:110-116
schema: {
  params: {
    type: 'object',
    properties: {
      providerId: { type: 'string', pattern: '^[a-z0-9-]+$' },
    },
    required: ['providerId'],
  },
},
```

Allowed characters: lowercase ASCII letters, digits, hyphen. Rejects anything else with 400.

## Discovery file format errors

The server's startup checks `~/.pixel-agents/server.json` to detect an existing instance:

```ts
// server/src/server.ts:131-140
private readServerJson(): ServerConfig | null {
  try {
    const filePath = this.getServerJsonPath();
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as ServerConfig;
  } catch {
    return null;
  }
}
```

A malformed or unreadable `server.json` returns `null` and the server starts fresh (potentially overwriting the file). This is intentional: we'd rather lose a stale entry than refuse to start.

PID-alive check (`server/src/server.ts:173-181`):

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

A PID that doesn't exist (process was killed without cleanup) returns `false`, and the new instance proceeds as if no server were running.

## Related

- [Discovery and auth](/build/clients/discovery-and-auth)
- [Connection lifecycle](/build/clients/connection-lifecycle)
- [Server messages](/reference/protocol/server-messages)
- [HookProvider reference](./hookprovider)
