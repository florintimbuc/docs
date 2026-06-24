---
sidebar_position: 2
---

# Building a client

This is a hands-on walkthrough that takes you from zero to a working WebSocket client of the Pixel Agents server in roughly fifteen minutes. By the end you will have a connection that receives the full state bundle, processes live agent broadcasts, and sends back a command.

We walk the same five-step flow in four languages: **TypeScript**, **Python**, **Swift**, and **Kotlin**. Pick whichever fits your host. The protocol is identical in all of them.

## What you are building

A minimal client that:

1. Discovers the running server via `~/.pixel-agents/server.json`.
2. Opens a WebSocket to `ws://127.0.0.1:<port>/ws`.
3. Sends `webviewReady` to request the state bundle.
4. Logs three or four message types it cares about (agent created, tool start, tool done).
5. Sends one command (`launchAgent`) so you can see a fresh character appear in the bundled UI alongside your client.

You will not yet render an office. That is a much bigger task and lives in [handling assets](./handling-assets). For now we focus on the **wire layer**.

## Prerequisites

- The Pixel Agents server is running. Either launch the VS Code extension (which embeds it) or run the standalone CLI (`npx pixel-agents` once published, or `node server/dist/cli.js` from a build).
- A shell that can `cat ~/.pixel-agents/server.json` and see a `{ port, pid, token, startedAt }` object. The schema is defined at `server/src/server.ts:14-23`.

## The five-step flow

Every Pixel Agents client, in any language, follows these five steps. Each language example below is a direct translation.

### Step 1 - Discover the server

Read `~/.pixel-agents/server.json`. The path constants live in `core/src/constants.ts:12-13`:

```ts
export const SERVER_JSON_DIR = '.pixel-agents';
export const SERVER_JSON_NAME = 'server.json';
```

The file content (`server/src/server.ts:14-23`):

```ts
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

Verify the PID is alive before connecting. A leftover `server.json` from a crashed process is a real failure mode - the server intentionally avoids deleting it if it cannot prove the owner is gone (`server/src/server.ts:158-170`).

### Step 2 - Connect

Open a WebSocket to `ws://127.0.0.1:<port>/ws`.

- In **embedded mode** (VS Code), include `Authorization: Bearer <token>` on the upgrade.
- In **standalone mode**, no auth is required because the server binds to `127.0.0.1` only (`server/src/httpServer.ts:139-148`).

If unsure which mode the user is running, sending the Bearer header in both cases is safe. The standalone WebSocket route ignores the header when `embedded` is false.

### Step 3 - Send `webviewReady`

The server does not push state until it sees `{ "type": "webviewReady" }`. The handler at `server/src/clientMessageHandler.ts:132-214` (`handleWebviewReady`) replies in canonical order:

1. `providerCapabilities` - tool name lists for "reading" and "sub-agent" rendering.
2. `characterSpritesLoaded` - six character sprite sets.
3. `floorTilesLoaded` - seven floor patterns.
4. `wallTilesLoaded` - wall auto-tile bitmask pieces.
5. `furnitureAssetsLoaded` - catalog plus sprite map.
6. `layoutLoaded` - current office layout.
7. `settingsLoaded` - persisted user settings.
8. `existingAgents` - currently tracked agent IDs, seats, folder names, external flags.

The client must wait for the full bundle before it can render the office. Logging it is enough for this walkthrough.

### Step 4 - Subscribe to broadcasts

After the bundle, the server streams broadcasts as they happen. The interesting subset for a minimal client:

| Type | When | Important fields |
| --- | --- | --- |
| `agentCreated` | New agent appears | `id`, `folderName?`, `isExternal?` |
| `agentClosed` | Agent removed | `id` |
| `agentStatus` | Agent state changed | `id`, `status: 'active' \| 'waiting'` |
| `agentToolStart` | Tool started | `id`, `toolId`, `status`, `toolName?` |
| `agentToolDone` | Tool finished | `id`, `toolId` |
| `agentToolsClear` | Turn ended | `id` |
| `agentToolPermission` | Permission requested | `id` |
| `agentToolPermissionClear` | Permission resolved | `id` |
| `subagentToolStart` | Sub-agent tool started | `id`, `parentToolId`, `toolId`, `status` |
| `subagentClear` | Sub-agent task finished | `id`, `parentToolId` |

Schemas for all variants live in `core/src/messages.ts:58-264`. The discriminator is always `type`.

### Step 5 - Send a command

Any `ClientMessage` from `core/src/messages.ts:266-354`. The minimal interesting one is `launchAgent`:

```ts
export interface LaunchAgent {
  type: 'launchAgent';
  folderPath?: string;
  bypassPermissions?: boolean;
}
```

Send it as JSON over the same socket. The server replies asynchronously: a new `agentCreated` broadcast follows soon after.

> **Note.** In standalone mode the server does not yet spawn terminals from `launchAgent` - see the default branch comment at `server/src/clientMessageHandler.ts:125-129`. In embedded mode VS Code handles the terminal spawn. Treat this command as the right hook to call; in standalone mode it will become a no-op (or a future spawn) without breaking your code.

## TypeScript (Node 20+ / browser)

Uses the `ws` package on Node or the native `WebSocket` constructor in the browser. The code below is Node-flavored; replace the `ws` import with `globalThis.WebSocket` to run in a browser.

```ts
import { readFileSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import WebSocket from 'ws';

interface ServerConfig {
  port: number;
  pid: number;
  token: string;
  startedAt: number;
}

// Step 1: discover
function loadServerConfig(): ServerConfig {
  const file = join(homedir(), '.pixel-agents', 'server.json');
  if (!existsSync(file)) throw new Error('server.json not found; is the server running?');
  const cfg = JSON.parse(readFileSync(file, 'utf-8')) as ServerConfig;
  try {
    process.kill(cfg.pid, 0); // signal 0 = check liveness
  } catch {
    throw new Error(`server.json points at dead PID ${cfg.pid}; restart the server`);
  }
  return cfg;
}

const cfg = loadServerConfig();

// Step 2: connect (Bearer header is harmless in standalone mode)
const socket = new WebSocket(`ws://127.0.0.1:${cfg.port}/ws`, {
  headers: { Authorization: `Bearer ${cfg.token}` },
});

socket.on('open', () => {
  // Step 3: webviewReady
  socket.send(JSON.stringify({ type: 'webviewReady' }));

  // Step 5: optional, after a short delay so the bundle arrives first
  setTimeout(() => {
    socket.send(JSON.stringify({ type: 'launchAgent' }));
  }, 1000);
});

// Step 4: handle broadcasts
socket.on('message', (data) => {
  const msg = JSON.parse(data.toString());
  switch (msg.type) {
    case 'providerCapabilities':
      console.log('reading tools:', msg.readingTools);
      break;
    case 'existingAgents':
      console.log('current agents:', msg.agents);
      break;
    case 'agentCreated':
      console.log('agent created:', msg.id, msg.folderName);
      break;
    case 'agentToolStart':
      console.log(`agent ${msg.id} started tool: ${msg.status}`);
      break;
    case 'agentToolDone':
      console.log(`agent ${msg.id} finished tool ${msg.toolId}`);
      break;
  }
});

socket.on('close', (code, reason) => {
  console.error('socket closed:', code, reason.toString());
});
```

If `socket.on('close')` fires with code `4001`, your Bearer token is stale or wrong. Re-read `server.json` and reconnect. See [discovery and auth](./discovery-and-auth).

## Python (3.11+ with `websockets`)

```python
import asyncio
import json
import os
from pathlib import Path

import websockets

SERVER_JSON = Path.home() / ".pixel-agents" / "server.json"


def load_server_config() -> dict:
    if not SERVER_JSON.exists():
        raise RuntimeError("server.json not found; is the server running?")
    cfg = json.loads(SERVER_JSON.read_text())
    try:
        os.kill(cfg["pid"], 0)  # signal 0 = liveness probe
    except ProcessLookupError as exc:
        raise RuntimeError(f"stale server.json: PID {cfg['pid']} is gone") from exc
    return cfg


async def main() -> None:
    cfg = load_server_config()
    url = f"ws://127.0.0.1:{cfg['port']}/ws"
    headers = {"Authorization": f"Bearer {cfg['token']}"}

    async with websockets.connect(url, additional_headers=headers) as ws:
        # Step 3: webviewReady
        await ws.send(json.dumps({"type": "webviewReady"}))

        async def launch_after_bundle() -> None:
            await asyncio.sleep(1)
            await ws.send(json.dumps({"type": "launchAgent"}))

        asyncio.create_task(launch_after_bundle())

        # Step 4: broadcast loop
        async for raw in ws:
            msg = json.loads(raw)
            t = msg.get("type")
            if t == "providerCapabilities":
                print("reading tools:", msg["readingTools"])
            elif t == "existingAgents":
                print("current agents:", msg["agents"])
            elif t == "agentCreated":
                print(f"agent created: {msg['id']} ({msg.get('folderName', '?')})")
            elif t == "agentToolStart":
                print(f"agent {msg['id']} started tool: {msg.get('status')}")
            elif t == "agentToolDone":
                print(f"agent {msg['id']} finished tool {msg['toolId']}")


if __name__ == "__main__":
    asyncio.run(main())
```

On disconnect, `websockets.connect` raises `ConnectionClosed`. Catch it and re-run `load_server_config()` before reconnecting, because the port may have changed.

## Swift (URLSessionWebSocketTask, macOS or iOS)

```swift
import Foundation

struct ServerConfig: Decodable {
    let port: Int
    let pid: Int
    let token: String
    let startedAt: Int
}

func loadServerConfig() throws -> ServerConfig {
    let home = FileManager.default.homeDirectoryForCurrentUser
    let url = home.appendingPathComponent(".pixel-agents/server.json")
    let data = try Data(contentsOf: url)
    let cfg = try JSONDecoder().decode(ServerConfig.self, from: data)
    if kill(pid_t(cfg.pid), 0) != 0 {
        throw NSError(domain: "PixelAgents", code: -1,
                      userInfo: [NSLocalizedDescriptionKey: "Stale server.json: PID \(cfg.pid) is gone"])
    }
    return cfg
}

let cfg = try loadServerConfig()

var request = URLRequest(url: URL(string: "ws://127.0.0.1:\(cfg.port)/ws")!)
request.setValue("Bearer \(cfg.token)", forHTTPHeaderField: "Authorization")

let task = URLSession.shared.webSocketTask(with: request)

func receive(_ task: URLSessionWebSocketTask) {
    task.receive { result in
        switch result {
        case .failure(let err):
            print("ws error:", err)
        case .success(.string(let s)):
            if let data = s.data(using: .utf8),
               let obj = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
               let type = obj["type"] as? String {
                switch type {
                case "providerCapabilities":
                    print("reading tools:", obj["readingTools"] ?? "[]")
                case "existingAgents":
                    print("current agents:", obj["agents"] ?? "[]")
                case "agentCreated":
                    print("agent created:", obj["id"] ?? "?", obj["folderName"] ?? "?")
                case "agentToolStart":
                    print("tool start:", obj["status"] ?? "?")
                case "agentToolDone":
                    print("tool done:", obj["toolId"] ?? "?")
                default: break
                }
            }
            receive(task)
        case .success(.data):
            receive(task)
        @unknown default:
            receive(task)
        }
    }
}

task.resume()
task.send(.string(#"{"type":"webviewReady"}"#)) { _ in }
receive(task)

// Step 5
DispatchQueue.main.asyncAfter(deadline: .now() + 1) {
    task.send(.string(#"{"type":"launchAgent"}"#)) { _ in }
}

RunLoop.main.run()
```

`URLSessionWebSocketTask` delivers close codes through the completion handler of `task.cancel(with:reason:)` or on the next `receive` failure. A close with code `4001` means the Bearer token did not match.

## Kotlin (OkHttp WebSocket, JVM)

```kotlin
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import org.json.JSONObject
import java.io.File
import kotlin.system.exitProcess

data class ServerConfig(val port: Int, val pid: Int, val token: String)

fun loadServerConfig(): ServerConfig {
    val file = File(System.getProperty("user.home"), ".pixel-agents/server.json")
    if (!file.exists()) error("server.json not found; is the server running?")
    val obj = JSONObject(file.readText())
    val pid = obj.getInt("pid")
    val running = try {
        ProcessHandle.of(pid.toLong()).map { it.isAlive }.orElse(false)
    } catch (_: Throwable) { false }
    if (!running) error("stale server.json: PID $pid is gone")
    return ServerConfig(obj.getInt("port"), pid, obj.getString("token"))
}

fun main() {
    val cfg = loadServerConfig()
    val client = OkHttpClient()
    val req = Request.Builder()
        .url("ws://127.0.0.1:${cfg.port}/ws")
        .header("Authorization", "Bearer ${cfg.token}")
        .build()

    val ws = client.newWebSocket(req, object : WebSocketListener() {
        override fun onOpen(webSocket: WebSocket, response: Response) {
            webSocket.send("""{"type":"webviewReady"}""")
            Thread {
                Thread.sleep(1000)
                webSocket.send("""{"type":"launchAgent"}""")
            }.start()
        }

        override fun onMessage(webSocket: WebSocket, text: String) {
            val msg = JSONObject(text)
            when (msg.optString("type")) {
                "providerCapabilities" -> println("reading tools: ${msg.optJSONArray("readingTools")}")
                "existingAgents"       -> println("current agents: ${msg.optJSONArray("agents")}")
                "agentCreated"         -> println("agent created: ${msg.optInt("id")} (${msg.optString("folderName")})")
                "agentToolStart"       -> println("tool start: ${msg.optString("status")}")
                "agentToolDone"        -> println("tool done: ${msg.optString("toolId")}")
            }
        }

        override fun onClosing(webSocket: WebSocket, code: Int, reason: String) {
            println("closing: $code $reason")
            if (code == 4001) {
                System.err.println("unauthorized; re-read server.json and reconnect")
                exitProcess(1)
            }
        }
    })

    Runtime.getRuntime().addShutdownHook(Thread { ws.close(1000, "bye") })
    Thread.sleep(Long.MAX_VALUE)
}
```

## Walking through a real session

Run the standalone server in one terminal:

```sh
npx pixel-agents
# or, from a local checkout:
node server/dist/cli.js
```

In the second terminal, run any of the four clients above. You should see a flood of output in this order:

```
reading tools: [ 'Read', 'Grep', ... ]
current agents: []
(empty; no agents yet)
(after launchAgent fires)
agent created: 1 (my-project)
tool start: Read package.json
tool done: tool-1
tool start: Edit something.ts
tool done: tool-2
```

The exact tool names depend on what the launched agent does, but the broadcast pattern is the one above.

## Common gotchas

**The server is not running.** `~/.pixel-agents/server.json` is missing. Tell the user to launch the extension or run the CLI. Do not retry: failure here is human-visible.

**`server.json` exists but PID is dead.** A previous server crashed without cleaning up. The next started server detects this via `isProcessRunning(existing.pid)` (`server/src/server.ts:67-75`) and overwrites the file. Until that happens, your liveness check will fail. The fix is to start a fresh server.

**WebSocket closes with code `4001 'unauthorized'`.** Embedded mode, wrong token. Re-read `server.json` (the running server may have rotated it) and reconnect. See [discovery and auth](./discovery-and-auth).

**Bundle never arrives.** Either you forgot to send `webviewReady`, or your `message` handler crashed on the first message and the connection died. Add a logger inside the handler before the `switch`.

**Asset messages are huge.** `furnitureAssetsLoaded` carries every sprite as a `string[][]`. The bundled webview pre-decodes them into offscreen canvases. If your client cannot handle large messages on the main thread, defer processing to a worker.

**Server restarts midstream.** The WebSocket closes (no code) and the port may change. Always re-read `server.json` before reconnecting. See [connection lifecycle](./connection-lifecycle) for the resync rules.

**No replay buffer.** When you reconnect, `webviewReady` returns the **current** state, not the events you missed. The contract is: discard cached agent state and trust the new `existingAgents` plus subsequent broadcasts.

**Malformed JSON sent.** The server silently drops it (`server/src/httpServer.ts:192-194`). Log the outgoing payload on your side to catch this early.

## Where to go next

- [Discovery and auth](./discovery-and-auth) - the full schema and the Bearer flow.
- [Connection lifecycle](./connection-lifecycle) - what to do when the connection drops.
- [Handling assets](./handling-assets) - how to interpret `SpriteData`, ordering rules, caching.
- [Server messages reference](/reference/protocol/server-messages) - every variant with its fields.
- [Client messages reference](/reference/protocol/server-messages) - paired list of commands you can send.
