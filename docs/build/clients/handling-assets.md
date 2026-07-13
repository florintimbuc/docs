---
sidebar_position: 5
---

# Handling Assets

:::warning[AI-generated docs]
This document was AI-generated and may have some mistakes - we apologize for this, we're in the process of reviewing all documents. If you find any issues, we'd be thankful if you [submit an edit PR](https://github.com/pixel-agents-hq/docs/edit/main/docs/build/clients/handling-assets.md).
:::

How clients consume the four asset bundles, what shape they take, and how to cache them efficiently.

For the message-level reference, see [server-messages.md](/reference/protocol/server-messages). For the connection sequence that delivers them, see [connection-lifecycle.md](./connection-lifecycle).

## The four asset messages

All four arrive between `providerCapabilities` and `existingAgents` during the `webviewReady` handshake. Order is fixed:

```
characterSpritesLoaded → floorTilesLoaded → wallTilesLoaded → furnitureAssetsLoaded
```

`layoutLoaded` follows immediately after. The layout references furniture by `id`, so a client must wait for `furnitureAssetsLoaded` before rendering placed furniture; characters and floor/wall can be rendered as soon as their bundle arrives.

## The SpriteData shape

`SpriteData` is the universal sprite format used by every bundle:

```ts
// core/src/schemas.ts:75
export type SpriteData = string[][];
```

A 2D array of hex color strings, row by row, top to bottom, left to right.

| Cell value | Meaning |
|---|---|
| `''` (empty string) | Transparent. |
| `'#RRGGBB'` | Fully opaque pixel. |
| `'#RRGGBBAA'` | Semi-transparent pixel (alpha in the last two hex digits). |

A 16×16 sprite with one red pixel at (0, 0) looks like:

```js
const sprite = [
  ['#ff0000', '', '', '' /* ...14 more empties */],
  // 15 more rows of empty strings
];
```

This is the format every client must understand and render. Browser clients typically blit pixels onto an offscreen canvas; non-canvas clients (mobile, TUI) translate to their native sprite primitive.

The PNG → SpriteData translation happens on the server side via `pngjs`, before the bundle is broadcast. The alpha threshold is 2 - pixels with alpha less than 2 become `''`. See `core/src/schemas.ts:74-75` and the bundled asset loader (`server/src/assetLoader.ts`).

## characterSpritesLoaded

Six pre-colored palettes, each with three direction sets. Schema in [server-messages.md](/reference/protocol/server-messages).

```ts
interface CharacterSpritesLoaded {
  type: 'characterSpritesLoaded';
  characters: CharacterSpriteSet[];   // exactly 6 entries
}

interface CharacterSpriteSet {
  down: string[][][];   // frames × rows × pixels
  up: string[][][];
  right: string[][][];
}
```

- `characters` always has 6 entries. Palette index 0-5 selects a palette.
- Each direction set is an array of frames (7 frames: walk1, walk2, walk3, type1, type2, read1, read2 - see the project root CLAUDE.md for the layout). Left is rendered by flipping `right` horizontally at draw time.
- Frame dimensions: 16 wide × 32 tall, with the character bottom-aligned in the lower 24px (8px of top padding).
- Per-agent hue shift: each agent carries a `hueShift` (degrees) in `AgentSeatMeta`. Clients apply HSL hue rotation to the palette at render time and cache per `(palette, hueShift)` key.

A reasonable cache key for the bundled webview is `"palette:hueShift"`. The bundled webview's hue shift uses `adjustSprite()` from `webview-ui/src/office/colorize.ts`. Third-party clients can choose any equivalent transform.

## floorTilesLoaded

```ts
interface FloorTilesLoaded {
  type: 'floorTilesLoaded';
  sprites: string[][][];  // 9 patterns (one per pattern index)
}
```

Seven grayscale floor tile patterns. Tiles are colorized at render time using HSBC (hue/saturation/brightness/contrast) values stored per-tile in `OfficeLayout.tileColors`. See `FloorColor` in [schemas.md](/reference/protocol/schemas).

The bundled webview uses `colorize.ts` in two modes:

- **Colorize mode** (Photoshop-style) - grayscale → luminance → HSL. Always used for floor tiles.
- **Adjust mode** - shift original pixel HSL. Used for furniture and character hue shifts.

A third-party client can choose any colorization strategy; the protocol just delivers the raw `h, s, b, c` numbers.

## wallTilesLoaded

```ts
interface WallTilesLoaded {
  type: 'wallTilesLoaded';
  sets: string[][][][];  // array of wall sets, each with 16 auto-tile pieces
}
```

Auto-tile bitmask: 4 bits (N=1, E=2, S=4, W=8) index into the 16-piece set. The bitmask is computed at render time by looking at which of the four cardinal neighbors are also wall tiles.

Wall sprites are 16 wide × 32 tall - they extend 16px above the tile to give a 3D face look. Z-sort handling: walls are mixed with furniture and characters in the render pass; their `zY` is `(row + 1) * TILE_SIZE`. Only the flat base color is rendered in the tile pass; the 3D piece comes through z-sorted later.

## furnitureAssetsLoaded

```ts
interface FurnitureAssetsLoaded {
  type: 'furnitureAssetsLoaded';
  catalog: FurnitureAssetMessage[];     // one per asset id
  sprites: Record<string, string[][]>;  // id → SpriteData
}
```

Two parts:

1. **Catalog** - metadata for each furniture asset: `id`, `name`, `label`, `category`, `footprintW`, `footprintH`, `isDesk`, `canPlaceOnWalls`, plus optionals: `groupId` (for rotation), `orientation`, `state` (on/off), `canPlaceOnSurfaces`, `backgroundTiles`, `rotationScheme`, `animationGroup`, `frame`. Full field list in [schemas.md](/reference/protocol/schemas).
2. **Sprites** - map keyed by `id` to a `SpriteData`. Look up the sprite by the asset id in a `PlacedFurniture` entry.

The catalog is also where rotation groups live. Items with the same `groupId` and different `orientation` values rotate as a set (front/back/left/right). State groups (`state: "on"` / `"off"`) toggle in place.

## Bundle ordering and rendering gates

Order of arrival is fixed by `handleWebviewReady` in `server/src/clientMessageHandler.ts:132-214`. A correct client renders nothing visible until the relevant bundles have arrived:

- **Characters** can render after `characterSpritesLoaded`.
- **Floor tiles** require `floorTilesLoaded` plus `layoutLoaded` (for `tileColors`).
- **Walls** require `wallTilesLoaded` plus `layoutLoaded` (for wall tile positions).
- **Furniture** requires `furnitureAssetsLoaded` plus `layoutLoaded`.

The simplest implementation: hold the canvas blank until `layoutLoaded` arrives, then render all four layers in z-order.

## Caching strategy

### Within a session

Sprites are static for the lifetime of a WebSocket connection. Decode each bundle once and cache:

```ts
class AssetCache {
  characters: CharacterSpriteSet[] | null = null;
  floor: string[][][] | null = null;
  wall: string[][][][] | null = null;
  furniture: { catalog: FurnitureAssetMessage[]; sprites: Map<string, string[][]> } | null = null;
}
```

Pre-render to an offscreen canvas at each integer zoom level you support. The bundled webview pre-renders at zooms 1×–10× and stores them in a `WeakMap` keyed by SpriteData. Other clients can store native bitmap handles instead.

### Across reconnects

The server has no message replay buffer; on reconnect, it re-sends the entire bundle. The simplest correct strategy is to discard the cache on disconnect and accept a re-load.

If you want to skip the re-decode, you can hash the bundle (e.g. SHA-256 over the JSON) and reuse the cached decode if the hash matches. This is an optimization; don't reach for it before measuring.

### Per-agent variations

Each agent carries a `palette` (0–5) and a `hueShift` (degrees). Cache key for character sprites: `"palette:hueShift"` (e.g. `"3:120"`). Each unique combination produces a new offscreen canvas.

For furniture, the per-item `PlacedFurniture.color` (a `ColorValue` with `h, s, b, c`) determines colorization. Cache the colorized sprite per-item keyed by the asset id plus the color values.

## Colorization details

The `ColorValue` shape from [schemas.md](/reference/protocol/schemas):

```ts
interface ColorValue {
  h: number;          // hue 0-360
  s: number;          // saturation
  b: number;          // brightness
  c: number;          // contrast
  colorize?: boolean; // true: Colorize mode; false/undefined: Adjust mode
}
```

The same shape is used for `FloorColor.h/s/b/c` and `PlacedFurniture.color`. Floors default to colorize mode (`true`); furniture defaults to adjust mode (`false`).

Client implementation tip: the colorization step is per-pixel. If your client is GPU-accelerated, this is a fragment shader; on a CPU canvas, it's a per-pixel loop in JavaScript. Pre-bake colorized variants at colorize time, not every frame.

## Asset bundles and reconnects

Each `webviewReady` from a (re)connected client triggers the full bundle resend. The server reads from its in-memory `AssetCache` (`server/src/clientMessageHandler.ts:14-20`), so the cost is JSON serialization, not disk reads. Even so, the bundles can be large (the furniture sprites map can exceed 1MB depending on the catalog size); minimizing reconnects is the right product instinct.

## Related

- [Connection lifecycle](./connection-lifecycle)
- [Discovery and auth](./discovery-and-auth)
- [Server messages](/reference/protocol/server-messages)
- [Schemas](/reference/protocol/schemas)
