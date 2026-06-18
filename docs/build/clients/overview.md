---
sidebar_position: 1
title: Overview
---

# Clients overview

A **Client** is anything that renders the Pixel Agents office and speaks the AsyncAPI protocol over a transport the server understands. Today the repo ships two clients:

- the bundled VS Code webview (postMessage transport, bridged by the extension host)
- the standalone browser SPA (WebSocket transport, served from the standalone CLI)

The protocol is intentionally transport-agnostic. Any third-party client that produces and consumes the same JSON shapes is a first-class peer: a mobile app, a terminal TUI, an alternate browser UI, a Discord embed. The server treats every connection identically once it speaks the protocol.

If you are building a new client, this page is your map. It points at the contract (`core/asyncapi.yaml`), the two transports, the abstraction that hides them, and the rest of the build guides.

## The protocol contract

The spec lives at `core/asyncapi.yaml`. It is **AsyncAPI 3.0.0**, pinned deliberately. The header comment is the canonical explanation (`core/asyncapi.yaml:1-7`):

```yaml
# NOTE: pinned to 3.0.0 deliberately. @asyncapi/modelina v5.10.1 hardcodes
# `supportedVersions: ['3.0.0']` in its AsyncAPIInputProcessor. Bumping to
# 3.1.0 makes Modelina fall through to a generic JSON-schema parser that emits
# only `export type Root = any` instead of our 52 named interfaces. Bump when
# Modelina adds 3.1.0 support; the upgrade is `npx asyncapi convert` + a regen.
```

Concretely, the spec defines:

- **One bidirectional channel**, `/ws`. The server pushes broadcasts; the client sends commands. There is no separate request/response channel and no second port for control plane traffic (`core/asyncapi.yaml:35-46`).
- **Two top-level discriminated unions**, both keyed on a `type` discriminator (`core/asyncapi.yaml:78-137`):
  - `ServerMessage` (26 variants, server to client) - agent lifecycle, tool activity, asset bundles, settings, layout, diagnostics.
  - `ClientMessage` (18 variants, client to server) - readiness, launching agents, focus/close, layout and seat saves, settings toggles, asset directory management, diagnostics requests.
- **Auto-generated TypeScript types** in `core/src/messages.ts` (the file header says `AUTO-GENERATED FROM core/asyncapi.yaml. DO NOT EDIT MANUALLY` at `core/src/messages.ts:1-8`). Both unions are exported there (`core/src/messages.ts:10-56`).

Clients should code against the message types in `ServerMessage` and `ClientMessage`. The discriminator is always the string field `type`. Treat any other field as optional unless the schema marks it `required`.

## Two transports today

Two transports already exist in the codebase. They share the message shapes. Pick the one that matches your host.

### WebSocket (standalone)

The standalone server binds Fastify to `127.0.0.1` and exposes the single `/ws` endpoint. The default port is 3100, but the server may auto-assign when 3100 is unavailable. See `server/src/httpServer.ts:82-86` for the bind logic.

```ts
// server/src/httpServer.ts:135-148
app.get('/ws', { websocket: true }, (socket, request) => {
  // In standalone mode (not embedded), skip auth for WebSocket connections.
  // The server binds to 127.0.0.1, so only local clients can connect.
  // In embedded mode (VS Code), require Bearer token for security.
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

In **standalone mode** there is no WebSocket auth. The security model is the loopback boundary, and the trust assumption is that anything that can talk to `127.0.0.1` is the user. In **embedded mode** (VS Code), the same code path requires a Bearer token on the upgrade request and closes with code `4001 'unauthorized'` on mismatch.

The default URL is `ws://127.0.0.1:3100/ws`. The actual port lives in the discovery file `~/.pixel-agents/server.json`, which you should always read before connecting. See [discovery and auth](./discovery-and-auth).

### postMessage (VS Code webview)

The VS Code webview never opens a WebSocket. It uses `window.postMessage` to talk to the extension host, which holds an in-process reference to the same `AgentStateStore` the server publishes to. The shapes on the wire are identical to the WebSocket shapes; the transport is different.

Both transports flow through the same `MessageTransport` abstraction:

```ts
// core/src/transport.ts:10-17
export interface MessageTransport {
  /** Send a message to the extension/server. */
  send(message: ClientMessage): void;
  /** Subscribe to messages from the extension/server. Returns unsubscribe function. */
  onMessage(handler: (message: ServerMessage) => void): () => void;
  /** Clean up resources (WebSocket close, etc.). */
  dispose(): void;
}
```

The webview holds a `MessageTransport` instance. So does the standalone SPA. Neither cares which transport it has, as long as the shapes match. If you build a third client, implement against this interface (or its language equivalent) and you keep the same code working across transports.

## How a session looks from a client's perspective

Whether you connect with a WebSocket or with postMessage, the client lifecycle is the same:

1. **Discover** the server. Read `~/.pixel-agents/server.json` to get the port, PID, and token. Verify the PID is alive. (Webview clients skip this; the extension hands them a transport.)
2. **Connect** the transport. WebSocket clients open the URL; webview clients receive `window.postMessage` events directly.
3. **Send `webviewReady`**. This is the single signal that you are ready to receive state.
4. **Receive the bundle**, in canonical order: `providerCapabilities`, `characterSpritesLoaded`, `floorTilesLoaded`, `wallTilesLoaded`, `furnitureAssetsLoaded`, `layoutLoaded`, `settingsLoaded`, `existingAgents`. The bundle order is fixed; see `server/src/clientMessageHandler.ts:132-214`.
5. **Steady state**. Subscribe to async broadcasts (agent lifecycle, tool activity, sub-agent activity, token usage, diagnostics). Send commands as the user interacts (`launchAgent`, `focusAgent`, `closeAgent`, `saveLayout`, `saveAgentSeats`, settings toggles).

The bundle order matters because later messages reference earlier ones. `layoutLoaded` references furniture IDs that arrive in `furnitureAssetsLoaded`. Floor and wall tiles must be present before you can render the office. See [handling assets](./handling-assets) for the rules.

There is **no message replay buffer**. If your connection drops, you re-send `webviewReady` after reconnect and treat the new bundle as canonical. The server does not remember what it sent you last time. See [connection lifecycle](./connection-lifecycle) for the resync rules.

## What a client is responsible for

A correct client implementation:

- Reads `server.json` before every connection attempt (the port can change after a restart).
- Includes the Bearer token on WebSocket upgrades **only** when running in an embedded context that requires it. In pure standalone mode the loopback boundary is the auth model.
- Re-syncs on reconnect by sending `webviewReady` again. Discards any cached agent or tool state and trusts the new `existingAgents` and subsequent asset/layout messages.
- Renders only after the four asset messages (`characterSpritesLoaded`, `floorTilesLoaded`, `wallTilesLoaded`, `furnitureAssetsLoaded`) and `layoutLoaded` have arrived. Anything earlier is a partial state.
- Treats unknown `type` values as forward-compatible no-ops. The protocol will grow.
- Sends valid `ClientMessage` shapes only. The server's `clientMessageHandler` silently ignores unknown types (`server/src/clientMessageHandler.ts:125-129`), but malformed JSON is dropped at the transport boundary (`server/src/httpServer.ts:192-194`).

## What a client is NOT responsible for

The server owns the world. Clients should not assume any of the following responsibilities:

- **State authority.** The server is the source of truth for agent presence, tool activity, layout, and settings. Clients display what the server says.
- **Asset transformation policy.** The server delivers sprite data and floor/wall/furniture colors. How you render and cache them is your choice, but the protocol does not constrain your rendering pipeline. See [handling assets](./handling-assets).
- **Hook installation.** Hook installation lives on the server side (the `setHooksEnabled` command triggers a side effect inside the server, not the client). Clients only toggle the setting.
- **Layout persistence.** Clients send `saveLayout`; the server writes the file atomically.

## When you would build a third-party client

The protocol welcomes other clients. Reasonable examples:

- **Mobile companion app** that shows which agents are typing, waiting, or asking for permission while the user is away from the keyboard.
- **Terminal TUI** that re-renders the office in ASCII and exposes `launchAgent` as a keybinding.
- **Discord or chat embed** that streams agent presence into a channel.
- **Alternate browser UI** with a different aesthetic, different layout editor, different camera, all on top of the same data.

Any of these can be implemented in any language. The server has no preference. The only requirements are: read `server.json`, open the WebSocket, send `webviewReady`, and conform to the JSON shapes.

## Where to go next

- [Building a client](./building-a-client) - the full multi-language walkthrough (TypeScript, Python, Swift, Kotlin), end to end.
- [Discovery and auth](./discovery-and-auth) - the `server.json` schema, the Bearer token, embedded vs standalone differences, and recovery actions when auth fails.
- [Connection lifecycle](./connection-lifecycle) - the handshake sequence diagram, resync rules, backoff strategy, and what happens when the server restarts.
- [Handling assets](./handling-assets) - `SpriteData`, bundle ordering, colorization, character hue shifts, and caching strategy.
- [Server messages reference](/reference/protocol/server-messages) - every `ServerMessage` variant with its fields.
- [Protocol overview](/reference/protocol/overview) - the AsyncAPI document itself, what regenerates from it, and how to validate.

If you are integrating a new IDE rather than building a UI client, the right starting point is [adapters/overview](../adapters/overview). Adapters and clients are different layers. An adapter wraps the host; a client renders the world. A new IDE typically needs both, but they can be built independently.
