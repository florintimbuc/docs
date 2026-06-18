---
sidebar_position: 4
---

# Floor tiles

Floors are 16x16 grayscale patterns colorized at runtime via HSBC (hue / saturation / brightness / contrast) values stored per-tile. The pattern index is encoded directly in the layout's `TileType` (so `FLOOR_3` means "this tile uses floor pattern 3").

For the assets overview, see [overview](./overview). For the consumer side (custom floor packs), see [external assets](/use/workflows/external-assets). For the `TileType` enum, see [reference/layout.md > tiles](/reference/layout#tiles).

## File layout

Each pattern ships as its own PNG under `webview-ui/public/assets/floors/`:

```
webview-ui/public/assets/floors/
  floor_0.png    # solid gray fallback
  floor_1.png    # pattern 1
  floor_2.png    # pattern 2
  ...
  floor_8.png    # pattern 8
```

Each PNG is **16×16 pixels** grayscale. There are **9 files** (indices 0-8), matching the `TileType.FLOOR_1` through `TileType.FLOOR_9` enum values (a tile with `TileType.FLOOR_3` renders `floor_3.png` colorized).

Pattern 0 (`floor_0.png`) is the solid-gray fallback used when no specific pattern is selected.

## Why grayscale

The PNGs are monochrome. Color comes from per-tile HSBC values applied at render time. Two reasons:

1. **Variation**: a single grayscale pattern can become any color the user paints. Nine base patterns plus arbitrary color = a huge palette of possibilities from a tiny asset.
2. **Theming**: a user could paint the same office in red, blue, or green and the result would look natural.

The trade-off: the source patterns have to look good at any color. Patterns with strong implied light direction or stylized texture tend to colorize less cleanly than neutral patterns.

## The bundled patterns

The bundled set has 9 hand-drawn variations under `webview-ui/public/assets/floors/`. The exact textures can change between releases; treat the catalog as: pattern 0 is a neutral solid fallback, patterns 1-8 are distinct textures (woodgrain, grids, carpet weaves, stone, marble, etc.). Inspect the live files for the current set.

## Colorization

Per-tile, each floor has a `FloorColor`:

```ts
// core/src/schemas.ts:52-60
interface FloorColor {
  tileIndex: number;   // position in the layout
  pattern: number;     // 1-9 (matches the TileType.FLOOR_N value); 0 = solid fallback
  h: number;           // 0-360 hue
  s: number;           // 0-200 saturation
  b: number;           // -100 to +100 brightness
  c: number;           // -100 to +100 contrast
  colorize?: boolean;  // true = Colorize mode (default for floors)
}
```

**Colorize mode** (default for floors), per-pixel math:

1. Read the perceived luminance from the grayscale source pixel: `0.299×R + 0.587×G + 0.114×B`.
2. Apply contrast: `lightness = 0.5 + (lightness - 0.5) × (100 + c) / 100`.
3. Apply brightness: `lightness = lightness + b / 200`.
4. Convert to HSL using the user's `h` and `s` values.
5. Output the recolored pixel.

Result: a uniform color tint that obscures the source pattern's hue but preserves its shading.

**Adjust mode** (alternative, when `colorize: false`):

Shifts the source pixel's HSL by `h` (hue rotation), `s` (saturation delta), `b` (brightness delta), `c` (contrast delta).

Implementation: `webview-ui/src/office/colorize.ts`. The same algorithm works in any client.

**Cache key format**: `floor-{patternIndex}-{h}-{s}-{b}-{c}`. Identical colorizations across many tiles reuse the same offscreen canvas.

## Painting

In the editor, the Floor tool exposes:

- Pattern picker (7 swatches).
- HSBC sliders (H 0-360, S 0-200, B and C ±100).
- Colorize checkbox (default on).

Clicking a tile paints it with the current pattern + HSBC. Dragging paints multiple tiles.

Each tile stores its own `FloorColor`. The toolbar's values are the defaults for new paints; existing tiles keep what was painted on them.

## Eyedropper

With the Floor tool active, the eyedropper picks an existing tile's pattern and HSBC into the toolbar. Click any painted tile to pick. Subsequent paints use the picked color.

## Caching

The renderer pre-renders the colorized version of each `(pattern, h, s, b, c)` combination and caches it. A long-running session can accumulate dozens of cached variants. Memory cost is small (each 16x16 colorized tile is ~1KB in RGBA).

The cache lives in the webview at `webview-ui/src/office/floorTiles.ts`. Other clients should implement equivalent caching.

## Migration of older layouts

If you load a layout from an older Pixel Agents version where the bundled `floors.png` had different patterns, the migration logic auto-maps old pattern indices to the closest current ones. This means old layouts don't visually break across releases.

The mapping is hardcoded in the loading path. If you need to author against an older version's patterns, refer to that release's source.

## VOID tiles

Tiles set to VOID (the Erase tool) are transparent and non-walkable. They don't have a pattern or color. In the layout JSON they appear as a sentinel value (the runtime infers from missing `FloorColor` entries).

VOID tiles render as transparent. The underlying canvas color (the office background) shows through.

## Authoring custom floor patterns

To ship a custom floor set:

1. Make 16×16 grayscale PNGs, one per pattern. Name them `floor_0.png` (solid fallback) and `floor_1.png` through `floor_8.png` for distinct patterns.
2. Pure grayscale (R=G=B per pixel) for cleanest colorize results.
3. Avoid pure black (0,0,0) — colorize maps the lowest luminance to fully dark, which can look harsh.
4. Avoid pure white (255,255,255) — same issue at the other end.
5. Aim for an average luminance around mid-gray (~128).

Place in your external asset directory:

```
my-pack/
  floors/
    floor_0.png
    floor_1.png
    floor_2.png
    ...
```

Pixel Agents picks up the first matching directory. See [external assets](/use/workflows/external-assets).

## Authoring per-pattern tips

- **Solid base**: a slight noise texture instead of flat color. Pure flat looks plasticky after colorize.
- **Grids**: keep lines 1px thick for crisp colorize.
- **Carpets / weaves**: small repeating motif looks better tiled than a single complex motif.
- **Wood**: diagonal grain reads as wood across many colors; horizontal/vertical grain can look like floorboards or planks specifically.
- **Stone / marble**: organic shapes; avoid sharp edges so colorize doesn't expose pixel jaggies.

## What the renderer does

For each tile in `OfficeLayout.tiles`:

1. Look up the corresponding `FloorColor` from `tileColors`.
2. Get (or generate + cache) the colorized sprite for `(pattern, h, s, b, c)`.
3. Blit at the tile position.

The renderer doesn't know which pattern is "wood" vs "carpet"; it just sees indices.

## Visual gotchas

- Two adjacent tiles with the same pattern + slightly different HSBC can show a visible seam (the colorize is per-tile, not blended across borders). Use the same color across a region for seamless look.
- The Colorize math is not fully invariant to source luminance. A pattern with strong shading will look darker overall than a flat pattern when both are colorized to the same target.
- Contrast at the extremes can crush highlights or shadows. Stay within ±50 unless you want a stylized look.

## Bundle ordering

Floor tiles arrive at the client in `floorTilesLoaded` after `characterSpritesLoaded` and before `wallTilesLoaded`. The layout (which references tile colors) arrives later in `layoutLoaded`.

A client should not render tiles until both `floorTilesLoaded` and `layoutLoaded` have arrived.

## Multi-pack rules

If multiple external asset directories provide a `floors/` subfolder, the first one in the configured order wins. There's no per-pattern merging across packs — the entire 9-pattern set is replaced wholesale.

## Key files

| File | Purpose |
|---|---|
| `webview-ui/src/office/floorTiles.ts` | Floor pattern storage, colorized sprite caching |
| `webview-ui/src/office/colorize.ts` | HSL colorization engine (Colorize + Adjust modes) |
| `webview-ui/src/office/types.ts:10-23` | `TileType` enum (WALL, FLOOR_1..9, VOID) |
| `webview-ui/src/office/engine/renderer.ts` | `renderTileGrid()` — floor and wall rendering |
| `core/src/schemas.ts:52-60` | `FloorColor` shape on the wire |

## Related

- [Assets overview](./overview)
- [Walls](./walls) - sibling tile family.
- [Furniture](./furniture)
- [External assets (consumer guide)](/use/workflows/external-assets)
- [Layout reference > tiles](/reference/layout#tiles) - the `TileType` enum used in the `tiles[]` array.
