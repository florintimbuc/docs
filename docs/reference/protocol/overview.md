---
sidebar_position: 1
title: Overview
---

# Protocol Overview

The Pixel Agents protocol is a single-channel bidirectional WebSocket contract between the server and any UI client (the bundled VS Code webview, the standalone browser SPA, or any third-party client that speaks JSON).

The protocol is provider-agnostic: a [`HookProvider`](../hookprovider) implementation turns raw CLI events into normalized [`AgentEvent`s](./agent-events), and the server translates those into [`ServerMessage`](./server-messages) broadcasts. Clients send [`ClientMessage`](./client-messages) commands.

## Source of truth

The authoritative contract is the AsyncAPI document at `core/asyncapi.yaml`. Everything in this section of the docs is derived from it.

### Pinned to AsyncAPI 3.0.0

The spec is **deliberately pinned to AsyncAPI 3.0.0**. From the comment at the top of the file (`core/asyncapi.yaml:1-8`):

```yaml
# NOTE: pinned to 3.0.0 deliberately. @asyncapi/modelina v5.10.1 hardcodes
# `supportedVersions: ['3.0.0']` in its AsyncAPIInputProcessor. Bumping to
# 3.1.0 makes Modelina fall through to a generic JSON-schema parser that emits
# only `export type Root = any` instead of our 52 named interfaces. Bump when
# Modelina adds 3.1.0 support; the upgrade is `npx asyncapi convert` + a regen.
# `npm run asyncapi:validate` will keep emitting an info note recommending 3.1.0;
# that's expected and harmless until Modelina catches up.
asyncapi: 3.0.0
```

The `info` note from `asyncapi:validate` recommending 3.1.0 is expected and harmless.

### Generated TypeScript bindings

`core/src/messages.ts` is **auto-generated** from `core/asyncapi.yaml` by Modelina. Regenerate with:

```sh
npm run asyncapi:generate
```

Do not edit `core/src/messages.ts` by hand - every change must go through the YAML. The header at the top of the file makes the contract explicit (`core/src/messages.ts:1-8`):

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

The generator emits exported types for the two top-level discriminated unions plus one interface per message variant and supporting schema.

## Transport

### Channel

A single bidirectional channel at `/ws` carries every message in both directions (`core/asyncapi.yaml:35-46`):

```yaml
channels:
  ws:
    address: /ws
    description: |
      Single bidirectional channel. The server pushes ServerMessage events on agent
      lifecycle, tool activity, asset loading, and settings. Clients send
      ClientMessage commands.
```

### Default server

The server binds to **`127.0.0.1:3100`** by default (`core/asyncapi.yaml:28-33`):

```yaml
servers:
  local:
    host: 127.0.0.1:3100
    protocol: ws
    description: Local Pixel Agents server (default port 3100)
    pathname: /ws
```

In VS Code embedded mode the port is ephemeral (Fastify picks port `0`) and discovered via `~/.pixel-agents/server.json` (`server/src/server.ts:127-156`). In standalone mode it defaults to `3100` unless `--port` overrides it.

### Authentication

| Mode | WebSocket auth | Hook POST auth | Hardening |
|---|---|---|---|
| Embedded (VS Code) | Bearer token | Bearer token | Loopback bind, ephemeral port |
| Standalone | None | Bearer token | Loopback bind only |

The hardening boundary is the loopback bind (`127.0.0.1`) - non-local clients cannot reach the server at all, so standalone mode skips the WebSocket auth check. Hook POSTs always require the bearer token because hook scripts run from arbitrary processes (`server/src/httpServer.ts:134-148`).

Failed bearer auth on `/ws` closes the socket with WebSocket close code **4001** (`server/src/httpServer.ts:144-146`). See [errors.md](../errors).

### Discriminator

Every message has a `type` field that names the variant. Both top-level unions are discriminated unions on `type` (`core/asyncapi.yaml:115`, `core/asyncapi.yaml:137`):

```yaml
ServerMessage:
  oneOf: [ ... ]
  discriminator: type

ClientMessage:
  oneOf: [ ... ]
  discriminator: type
```

Parsers should switch on `msg.type` and then narrow to the corresponding interface.

## Top-level unions

### ServerMessage - 26 variants

Broadcast by the server to connected clients. Grouped per the YAML's section comments (`core/asyncapi.yaml:79-114`):

| Group | Variants | Count |
|---|---|---|
| Provider capabilities | `providerCapabilities` | 1 |
| Agent lifecycle | `agentCreated`, `agentClosed`, `agentSelected`, `existingAgents` | 4 |
| Agent status / tool activity | `agentStatus`, `agentToolStart`, `agentToolDone`, `agentToolsClear`, `agentToolPermission`, `agentToolPermissionClear` | 6 |
| Sub-agent activity | `subagentToolStart`, `subagentToolDone`, `subagentClear`, `subagentToolPermission` | 4 |
| Agent Teams | `agentTeamInfo`, `agentTokenUsage` | 2 |
| Layout | `layoutLoaded` | 1 |
| Assets | `furnitureAssetsLoaded`, `characterSpritesLoaded`, `floorTilesLoaded`, `wallTilesLoaded` | 4 |
| Settings & config | `settingsLoaded`, `externalAssetDirectoriesUpdated`, `workspaceFolders` | 3 |
| Diagnostics | `agentDiagnostics` | 1 |
| **Total** | | **26** |

See [server-messages.md](./server-messages) for per-variant field reference.

### ClientMessage - 18 variants

Sent by clients to command the server (`core/asyncapi.yaml:117-137`):

| Group | Variants | Count |
|---|---|---|
| Lifecycle | `webviewReady` | 1 |
| Agent actions | `launchAgent`, `focusAgent`, `closeAgent`, `saveAgentSeats` | 4 |
| Layout | `saveLayout`, `exportLayout`, `importLayout` | 3 |
| Settings | `setSoundEnabled`, `setLastSeenVersion`, `setAlwaysShowLabels`, `setHooksEnabled`, `setHooksInfoShown`, `setWatchAllSessions` | 6 |
| Workspace | `openSessionsFolder` | 1 |
| Assets | `addExternalAssetDirectory`, `removeExternalAssetDirectory` | 2 |
| Diagnostics | `requestDiagnostics` | 1 |
| **Total** | | **18** |

See [client-messages.md](./client-messages) for per-variant field reference.

## Operations

Two operations are defined (`core/asyncapi.yaml:48-60`):

| Operation | Action | Carries |
|---|---|---|
| `receiveServerMessage` | `receive` | `ServerMessage` (server → client) |
| `sendClientMessage` | `send` | `ClientMessage` (client → server) |

Both operations bind to the same `/ws` channel.

## Layered architecture

```
┌─────────────────────────────────┐
│ Webview / SPA / 3rd-party       │   speaks ServerMessage + ClientMessage
└────────────────┬────────────────┘
                 │  /ws  (JSON over WebSocket)
┌────────────────┴────────────────┐
│ Server (Fastify, fileWatcher)   │   ServerMessage emitter, ClientMessage handler
├─────────────────────────────────┤
│ HookEventHandler                │   AgentEvent dispatcher
├─────────────────────────────────┤
│ HookProvider.normalizeHookEvent │   per-CLI translation boundary
└────────────────┬────────────────┘
                 │  POST /api/hooks/:providerId  (HTTP + bearer)
┌────────────────┴────────────────┐
│ Hook scripts (per-CLI)          │   raw CLI JSON payloads
└─────────────────────────────────┘
```

`AgentEvent` is the **internal contract** between the provider normalization layer and the server's dispatch layer. It never travels over the wire. See [agent-events.md](./agent-events).

## Startup handshake

When a client connects to `/ws`, the server waits for `webviewReady` before sending state. The full sequence is fixed and ordered (`server/src/clientMessageHandler.ts:132-213`):

```mermaid
sequenceDiagram
    participant C as Client
    participant S as Server

    C->>S: WebSocket connect to /ws
    Note over S: WebSocket open; no state pushed yet
    C->>S: { type: "webviewReady" }

    S->>C: providerCapabilities { readingTools, subagentToolNames }
    Note over S: Asset bundle (from in-memory cache)
    S->>C: characterSpritesLoaded { characters }
    S->>C: floorTilesLoaded { sprites }
    S->>C: wallTilesLoaded { sets }
    S->>C: furnitureAssetsLoaded { catalog, sprites }

    S->>C: layoutLoaded { layout }
    S->>C: settingsLoaded { soundEnabled, hooksEnabled, ... }
    S->>C: existingAgents { agents, agentMeta, folderNames, externalAgents }

    Note over S,C: Live updates begin
    S-->>C: agentCreated / agentToolStart / agentStatus / ...
    C-->>S: launchAgent / focusAgent / saveLayout / ...
```

The order matters:

1. **`providerCapabilities`** must arrive before any agent messages so the client knows which tool names render as "reading" vs "typing" and which spawn sub-agent characters.
2. **Assets** must arrive before `layoutLoaded` so the renderer can resolve furniture IDs.
3. **`layoutLoaded`** must arrive before agents render (so characters have somewhere to sit).
4. **`settingsLoaded`** carries the sound, hook, and watch-all flags the UI needs to draw initial toggles.
5. **`existingAgents`** is the final part of the snapshot - every agent ID in this list will already have a registered seat mapping in `agentMeta`.

After this snapshot the server streams live events (`agentToolStart`, `agentStatus`, etc.) as they happen and accepts client commands (`launchAgent`, `saveLayout`, settings setters).

## Related references

- [server-messages.md](./server-messages) - every ServerMessage variant with fields, examples, emit sites
- [client-messages.md](./client-messages) - every ClientMessage variant
- [schemas.md](./schemas) - supporting (non-discriminated) schemas
- [agent-events.md](./agent-events) - the internal provider→server contract
- [../hookprovider.md](../hookprovider) - the provider interface
- [../teamprovider.md](../teamprovider) - the optional team extension
- [../state-management.md](../state-management) - server state classes that drive these messages
- [../errors.md](../errors) - close codes, HTTP error codes, validation
