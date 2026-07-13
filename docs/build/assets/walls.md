---
sidebar_position: 5
---

# Wall tiles

:::warning[AI-generated docs]
This document was AI-generated and may have some mistakes - we apologize for this, we're in the process of reviewing all documents. If you find any issues, we'd be thankful if you [submit an edit PR](https://github.com/pixel-agents-hq/docs/edit/main/docs/build/assets/walls.md).
:::

Walls use a 4-bit auto-tile bitmask system. Sixteen sprite pieces in one PNG; the runtime picks the right piece based on which cardinal neighbors are also walls.

For the assets overview, see [overview.md](./overview). For consumers wanting a custom wall pack, see [external assets](/use/workflows/external-assets).

## File layout

Wall tilesets live under `webview-ui/public/assets/walls/`. The bundled set ships as a single PNG:

```
webview-ui/public/assets/walls/
  wall_0.png    # 64×128 — 16 auto-tile variants
```

Each tileset PNG is **64 wide × 128 tall** pixels:

```
Width  = 4 columns × 16 px = 64 px
Height = 4 rows × 32 px = 128 px
```

Sixteen pieces total in a 4×4 grid. Each piece is 16 wide × 32 tall (walls extend 16 pixels above their tile for the 3D face look).

Additional tilesets can ship as `wall_1.png`, `wall_2.png`, etc., addressable by a tileset index at render time. The bundled set is `wall_0`.

## The auto-tile bitmask

Each placed wall tile gets a 4-bit bitmask based on its cardinal neighbors:

| Bit | Neighbor | Value |
|---|---|---|
| 0 | North | 1 |
| 1 | East | 2 |
| 2 | South | 4 |
| 3 | West | 8 |

The bitmask is the sum of bits for which neighbors are also wall tiles. Sixteen possible values (0 through 15).

The 4x4 grid in `walls.png` is laid out in row-major bitmask order:

```
Bitmask values (row, col):
  Row 0:   0,  1,  2,  3
  Row 1:   4,  5,  6,  7
  Row 2:   8,  9, 10, 11
  Row 3:  12, 13, 14, 15
```

So the piece at `(row=2, col=1)` (i.e. pixel y=64..95, x=16..31) corresponds to bitmask 9 (binary 1001) = West + North walls, no East, no South. The sprite should look like a corner facing southeast.

## Why 16 pieces

A 4-cardinal-direction auto-tile has 2^4 = 16 possible connection patterns. The canonical mapping covers every possibility:

| Bitmask | Binary (W S E N) | Description |
|---|---|---|
| 0 | 0000 | Isolated (no neighbors) |
| 1 | 0001 | North only |
| 2 | 0010 | East only |
| 3 | 0011 | North + East (L-corner) |
| 4 | 0100 | South only |
| 5 | 0101 | North + South (vertical) |
| 6 | 0110 | East + South (L-corner) |
| 7 | 0111 | North + East + South (T) |
| 8 | 1000 | West only |
| 9 | 1001 | West + North (L-corner) |
| 10 | 1010 | East + West (horizontal) |
| 11 | 1011 | West + North + East (T) |
| 12 | 1100 | West + South (L-corner) |
| 13 | 1101 | West + North + South (T) |
| 14 | 1110 | West + East + South (T) |
| 15 | 1111 | Full cross |

Source: `webview-ui/src/office/wallTiles.ts` for the canonical mapping.

## The 3D face

Each sprite is 32 pixels tall but the tile footprint is only 16 (the bottom row). The top 16 pixels extend above the tile to give a 3D face appearance, as if the wall is a low cuboid.

Wall sprites are anchored at the bottom of the tile via a negative Y offset:

```ts
yOffset = TILE_SIZE - spriteHeight   // 16 - 32 = -16
```

This means:

- Walls are z-sorted with characters and furniture. The wall's `zY` is the same as a 1×1 furniture item at its tile: `zY = (row + 1) * TILE_SIZE`.
- A character behind a wall is hidden by the wall.
- A character in front of a wall renders in front.

Adjacent walls form a connected face thanks to the bitmask choosing the right piece (so two horizontally-adjacent walls don't show a gap between their 3D faces).

## Colorization

Wall color is global — one HSBC setting applies to all walls in the layout. There's no per-wall color (unlike floor tiles, where each tile carries its own color).

When no wall sprite is loaded or as the base flat fill, walls fall back to the `WALL_COLOR` constant exported from `webview-ui/src/constants.ts`. Custom colorization remaps the grayscale wall sprite through the same HSL pipeline floors use.

Adjusting the wall HSBC re-colorizes every wall. The cache key includes the HSBC values so changes don't require re-decoding the PNG.

Same Colorize / Adjust modes as floors. Default for walls is Colorize.

## Editor behavior

The Wall tool is separate from Floor and Erase. Click or drag to add walls. Click or drag existing walls to remove them (toggle behavior: the first tile of the drag sets whether the rest add or remove).

The wall auto-tile recomputes on every change. You don't pick which piece - it's deterministic from neighbors.

Eyedropper on a wall picks the global wall color and switches to the Wall tool.

## Cannot place furniture on walls (mostly)

Walls block furniture placement by default. The exception: items with `canPlaceOnWalls: true` (paintings, windows, clocks) can only be placed on wall tiles.

Background-row tiles of furniture (`backgroundTiles`) can overlap walls.

## Generating walls.png

The bundled `walls.png` is generated by `scripts/generate-walls.js`, which produces a programmatic 4x4 grid from a wall texture template. The script can be customized to generate alternate wall styles.

For interactive editing, `scripts/wall-tile-editor.html` is a browser tool that lets you draw each of the 16 pieces and export the combined PNG.

## Authoring tips

If you're creating a custom `walls.png`:

- **Stay in 16x32 per piece.** The runtime hardcodes these dimensions.
- **Match the bitmask order.** The piece at position N corresponds to bitmask N.
- **Make piece 0 (isolated) look intentional.** A wall with no neighbors should still look correct - it's the equivalent of a pillar or a short standalone wall section.
- **Make piece 15 (full cross) feel solid.** A wall surrounded on all sides is the middle of a thick wall mass; it should be uniform.
- **Test in a real layout.** Some bitmask combinations look strange in isolation but right in context. Always paint a real wall section and verify.

The `wall-tile-editor.html` tool shows previews of common patterns (single wall, corner, T, cross) so you can verify each piece looks right.

## Implementation

The bitmask computation is in `webview-ui/src/office/wallTiles.ts`:

```ts
// Pseudocode
function bitmaskAt(layout, row, col): number {
  let mask = 0;
  if (isWall(layout, row - 1, col)) mask |= 1;   // N
  if (isWall(layout, row, col + 1)) mask |= 2;   // E
  if (isWall(layout, row + 1, col)) mask |= 4;   // S
  if (isWall(layout, row, col - 1)) mask |= 8;   // W
  return mask;
}
```

The selected piece is then at `(row = mask >> 2, col = mask & 3)` within the 4x4 grid.

## Wall instances in the renderer

Walls are z-sorted with furniture and characters. The renderer builds `FurnitureInstance[]` for all wall tiles via `getWallInstances()` (the function name in `webview-ui/src/office/wallTiles.ts`) with `zY = (row + 1) * TILE_SIZE`.

Only the flat base color is rendered in the tile pass (so the floor coloring doesn't bleed through). The 3D sprite comes through later in the z-sorted pass.

## Wall removal mechanics

The Wall tool's toggle behavior: the first tile of a click-drag sets the operation. If the first tile is a wall, the drag removes walls. If the first tile is not a wall, the drag adds walls.

The state is tracked by `wallDragAdding` in the editor. It resets on mouse-up.

## What walls can't do

- **Per-wall color.** Walls share one global HSBC. To get a multi-colored wall scheme, place multiple wall sections separated by VOID and color each section's surrounding tiles to fake the appearance.
- **Diagonal walls.** The bitmask is cardinal-only. No 45-degree pieces.
- **Wall thickness > 1 tile.** A "thick wall" is two adjacent rows of walls. The 3D face on each row stacks.

## Replacing wall tilesets in a custom pack

Place one or more 64×128 PNGs in a `walls/` subfolder of your external asset directory:

```
my-pack/
  walls/
    wall_0.png    # the canonical bundled-set replacement
    wall_1.png    # optional alternate style
```

The first matching directory wins. Bundled walls are replaced wholesale.

## Key functions

| Function | File | Purpose |
|---|---|---|
| `buildWallMask(col, row, tileMap)` | `webview-ui/src/office/wallTiles.ts` | Scan 4 cardinal neighbors, return 4-bit mask |
| `getWallSprite(col, row, tileMap, setIndex)` | `webview-ui/src/office/wallTiles.ts` | Get sprite + Y offset for a wall tile |
| `getColorizedWallSprite(...)` | `webview-ui/src/office/wallTiles.ts` | Get colorized variant for the current `WALL_COLOR` + HSBC |
| `getWallInstances(...)` | `webview-ui/src/office/wallTiles.ts` | Build `FurnitureInstance[]` for z-sorted rendering |
| `WALL_COLOR` constant | `webview-ui/src/constants.ts` | Base wall color fallback (uncolorized) |

## Related

- [Assets overview](./overview)
- [Floors](./floors) - sibling tile family.
- [Furniture > canPlaceOnWalls](./furniture#wall-placement)
- [External assets (consumer guide)](/use/workflows/external-assets)
- `scripts/wall-tile-editor.html` - visual editor for the 16 pieces.
- `scripts/generate-walls.js` - programmatic generator.
