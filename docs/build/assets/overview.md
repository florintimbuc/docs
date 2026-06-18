---
sidebar_position: 1
title: Overview
---

# Asset system overview

Pixel Agents renders the office from four asset families: **characters**, **floor tiles**, **wall tiles**, and **furniture**. All four are PNG-based, parsed server-side via `pngjs` into the `SpriteData` shape (`string[][]` of hex color strings) before being broadcast to clients.

This section documents the format of each family. For the consumer-side workflow (adding an external pack), see [/use/workflows/external-assets.md](/use/workflows/external-assets).

## The four families

| Family | Bundled file | Format | Per-asset metadata |
|---|---|---|---|
| **Characters** | `assets/characters/char_0.png` to `char_5.png` | 112×96, 7 frames × 16w, 3 rows × 32h | None (palette index alone identifies) |
| **Floor tiles** | `assets/floors/floor_0.png` to `floor_8.png` | 9 grayscale 16×16 PNGs (one per pattern) | Per-tile HSBC colorization at runtime; pattern index = `TileType.FLOOR_N` |
| **Wall tiles** | `assets/walls/wall_0.png` (+ optional alternates) | 64×128, 4×4 grid of 16×32 pieces | 4-bit auto-tile bitmask + global HSBC |
| **Furniture** | `assets/furniture/<ITEM_ID>/manifest.json` + per-item PNGs | Variable per item; each item is its own folder | Footprint, category, flags, optional nested rotation/state/animation groups |

## The SpriteData shape

Every sprite, regardless of family, lands on the wire as a 2D array of hex color strings:

```ts
// core/src/schemas.ts:75
export type SpriteData = string[][];
```

| Cell | Meaning |
|---|---|
| `''` (empty string) | Transparent |
| `'#RRGGBB'` | Fully opaque |
| `'#RRGGBBAA'` | Semi-transparent (alpha in the last two hex digits) |

Translation from PNG to SpriteData happens in `server/src/assetLoader.ts` using `pngjs`. Alpha threshold: 2. Pixels with alpha < 2 become `''`; pixels with alpha >= 2 and < 255 become the `'#RRGGBBAA'` form.

## The bundled set

What ships in the npm/Marketplace package:

- 6 character PNGs (the JIK-A-4 "Metro City" derivative).
- 9 floor pattern PNGs under `assets/floors/`.
- The 16-piece auto-tile wall set at `assets/walls/wall_0.png`.
- A small free furniture catalog: per-item folders under `assets/furniture/<ITEM_ID>/` each with a `manifest.json` plus the referenced PNGs.
- `default-layout.json` — a basic layout you see on first launch.

The full furniture catalog requires the purchased "Office Interior Tileset (16x16)" by Donarg ($2 USD on itch.io) imported via `npm run import-tileset`. The pipeline is documented at the top of `scripts/` and walked through in [external-assets > Asset extraction pipeline](/use/workflows/external-assets#asset-extraction-pipeline-for-custom-imports).

## How assets are loaded

On server startup (both VS Code and standalone):

1. Bundled PNGs are loaded from `dist/assets/` (production) or `webview-ui/public/assets/` (dev).
2. External asset directories (from `~/.pixel-agents/config.json` `externalAssetDirectories`) are loaded in order.
3. Each PNG is parsed into `SpriteData`.
4. For furniture, each directory's `furniture/*/manifest.json` files are scanned, parsed, and flattened via `flattenManifest()` (from `core/src/assets/manifestUtils.ts`). The flat catalogs from each directory are merged; external IDs override bundled IDs on collision.
5. The final state is cached in memory.

Order matters for the bundle send to clients (`server/src/clientMessageHandler.ts:132-214`):

```
providerCapabilities
  → characterSpritesLoaded
  → floorTilesLoaded
  → wallTilesLoaded
  → furnitureAssetsLoaded
  → layoutLoaded
  → settingsLoaded
  → existingAgents
```

Clients should not render the office until at least `furnitureAssetsLoaded` and `layoutLoaded` have arrived (the layout references furniture by id).

## What each family does in the office

**Characters** are agents. One palette per agent, identified by integer 0-5; hue shifted at render time for agents beyond the first 6. See [Characters](./characters).

**Floor tiles** cover the ground. Each placed tile has a pattern index (0-6) and HSBC colorization. See [Floors](./floors).

**Wall tiles** make the office an enclosed space. Auto-tiled by 4-bit bitmask of cardinal neighbors. See [Walls](./walls).

**Furniture** is everything else - desks, chairs (which become seats), storage, electronics, decor. Most furniture is purely decorative; chairs become seats; some electronics auto-state to "on" sprites when an agent is using them. See [Furniture](./furniture).

## What you can change

Via the editor:

- Paint floor and wall tiles.
- Place furniture (with rotation and state toggles).
- Set per-tile HSBC colors for floors.
- Set global HSBC for walls.
- Set per-item color for furniture.

Via external asset directories:

- Add furniture types not in the bundled catalog.
- Override character palettes (full directory of `char_N.png`).
- Override the `floors/` set (9 per-pattern PNGs) and the `walls/` set (one or more wall tilesets).

You cannot change at runtime: the grid is 16x16 tiles, character sprites are 16x32, the wall auto-tile bitmask scheme. These are fundamental constants. To change them you'd fork the codebase.

## Colorization modes

Pixel Agents uses two colorization modes, selected by `FloorColor.colorize?` (and per-item for furniture):

- **Colorize mode** (Photoshop-style, `colorize: true`): grayscale → luminance → contrast → brightness → fixed HSL. Used by default for floors. The result is the target color regardless of the input color.
- **Adjust mode** (`colorize: false` or undefined): shifts the source pixel's HSL. H rotates hue, S shifts saturation, B shifts brightness, C shifts contrast. Used by default for furniture and for the character hue shifts.

Implementation: `webview-ui/src/office/colorize.ts`. Same logic ports to any client that does its own canvas rendering.

## Z-sorting

Sprites are z-sorted at render time so a character behind a desk is hidden by the desk, but a character in front is visible. The sort key (`zY`) is typically `(row + 1) * TILE_SIZE`, with adjustments for:

- Characters: shifted down 6px when sitting; `zY = ch.y + TILE_SIZE/2 + 0.5` so they render in front of same-row furniture (chairs) but behind lower-row furniture (desks, bookshelves).
- Back-facing chairs: `zY = (row+1)*TILE_SIZE + 1` so the chair back renders in front of the character.
- Surface items on desks: `zY = max(spriteBottom, deskZY + 0.5)` so they render in front of the desk.
- Background-tile furniture: lower `zY` so it renders behind the host furniture.
- Walls: `zY = (row+1)*TILE_SIZE`, same as default.

This means the same physical position can yield different z-orders depending on what's around. The renderer handles it; asset authors don't need to think about z explicitly.

## Asset pipeline scripts

In `scripts/`:

| Script | Purpose |
|---|---|
| `0-import-tileset.ts` | Interactive CLI wrapper for the full pipeline. |
| `1-detect-assets.ts` | Flood-fill asset detection on a source tileset PNG. |
| `2-asset-editor.html` | Browser UI for position/bounds editing. |
| `3-vision-inspect.ts` | Claude vision auto-metadata. |
| `4-review-metadata.html` | Browser UI for metadata review. |
| `5-export-assets.ts` | Export per-item folders with `manifest.json` + PNG sprites. |
| `asset-manager.html` | Unified editor combining stages 2 + 4. |
| `generate-walls.js` | Generate `walls/wall_0.png` (4×4 auto-tile grid). |
| `wall-tile-editor.html` | Browser UI for editing wall appearance. |
| `export-characters.ts` | Bake palette colors into character PNG templates. |

Run via `npm run import-tileset` for the full flow.

## What's next

- [Characters](./characters) - sprite layout, palettes, hue shifting.
- [Furniture](./furniture) - catalog format, footprints, rotation and state groups.
- [Floors](./floors) - 7-pattern format, HSBC colorize.
- [Walls](./walls) - auto-tile bitmask, 4x4 grid format.
- [Publishing a pack](./publishing-a-pack) - distributing your work.

Or jump to the consumer guide: [Bring your own assets](/use/workflows/external-assets).
