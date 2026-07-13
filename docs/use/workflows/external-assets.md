---
sidebar_position: 3
---

# Bring your own assets

:::warning[AI-generated docs]
This document was AI-generated and may have some mistakes - we apologize for this, we're in the process of reviewing all documents. If you find any issues, we'd be thankful if you [submit an edit PR](https://github.com/pixel-agents-hq/docs/edit/main/docs/use/workflows/external-assets.md).
:::

Pixel Agents ships with a small bundled asset set: 6 character palettes, 7 floor patterns, an auto-tile wall set, and a basic furniture catalog. For the full visual experience, point Pixel Agents at one or more external asset directories.


For authoring custom asset packs from scratch, see [Build > Assets > Publishing a pack](/build/assets/publishing-a-pack).

## Where bundled assets come from

The bundled tileset is small because the high-quality "Office Interior Tileset (16x16)" by Donarg (itch.io, $2 USD) is not redistributable. Run `npm run import-tileset` after purchasing to import via the 7-stage pipeline at `scripts/`.

Character art is based on JIK-A-4's "Metro City" pack.

The extension works without the purchased tileset: default characters plus a basic layout. But the full furniture catalog is unlocked only after importing.

## Quickest path: use a community-published pack

Community asset packs (when they exist) are typically published as npm packages or as plain directories you can clone.

### From an npm package

```sh
npm install -g pixel-agents-pack-coolkitchen
```

Find where it installed:

```sh
npm root -g
# Output: /usr/local/lib/node_modules
# So the pack is at: /usr/local/lib/node_modules/pixel-agents-pack-coolkitchen
```

Open Pixel Agents settings → "Add Asset Directory" → paste the path.

### From a git clone

```sh
git clone https://github.com/someone/awesome-pixel-furniture ~/pixel-assets/awesome-furniture
```

Open Pixel Agents settings → "Add Asset Directory" → paste `/Users/you/pixel-assets/awesome-furniture`.

## What a valid asset directory contains

At minimum, a `furniture/` folder with per-item subfolders. Each item has a `manifest.json` plus the PNGs it references:

```
my-assets/
  furniture/
    ESPRESSO_MACHINE/
      manifest.json
      ESPRESSO_MACHINE.png
    ANOTHER_ITEM/
      manifest.json
      ANOTHER_ITEM.png
    ...
```

A `manifest.json` for a simple single-sprite item:

```json
{
  "id": "ESPRESSO_MACHINE",
  "name": "Espresso Machine",
  "category": "electronics",
  "type": "asset",
  "file": "ESPRESSO_MACHINE.png",
  "width": 16,
  "height": 16,
  "footprintW": 1,
  "footprintH": 1,
  "canPlaceOnSurfaces": true,
  "canPlaceOnWalls": false,
  "backgroundTiles": 0
}
```

For multi-orientation, on/off state, or animated items, use the grouped manifest format described in [/build/assets/furniture](/build/assets/furniture#manifest-format). Field reference: [`FurnitureAssetMessage` in protocol schemas](/reference/protocol/schemas).

Optional fields:

- `groupId` + `orientation` - rotation groups (front/back/left/right).
- `groupId` + `state` - on/off pairs for toggleable items.
- `backgroundTiles` - top N footprint rows that other furniture and characters can pass through.
- `canPlaceOnSurfaces` - laptops, mugs, etc. that can overlap with desks.
- `canPlaceOnWalls` - paintings, windows, clocks that can only attach to wall tiles.

## Adding a directory

### Via UI

1. Open Settings.
2. Click "Add Asset Directory".
3. Choose the directory in the native picker.
4. Furniture loads immediately; the editor catalog updates.
5. `~/.pixel-agents/config.json` is updated with the path under `externalAssetDirectories`.

### Manually

Edit `~/.pixel-agents/config.json`:

```json
{
  "externalAssetDirectories": [
    "/Users/you/pixel-assets/awesome-furniture",
    "/Users/you/pixel-assets/my-custom-pack"
  ],
  "vscode": { ... },
  "standalone": { ... }
}
```

Restart Pixel Agents (or hit the file watcher's 2-second poll interval).

## Removing a directory

### Via UI

Settings → "Remove Asset Directory" → pick from the list.

### Manually

Remove the path from `config.json`. Restart.

## How merging works

When Pixel Agents starts up, it loads bundled assets first, then merges external directories one by one in the order they appear in the config.

ID collision: external IDs override bundled IDs. If your pack defines `chair_basic` and the bundled set defines `chair_basic`, your version wins.

This means you can ship a pack that "themes" the bundled set by reusing IDs.

## Character packs

The bundled set has 6 character palettes (`char_0.png` through `char_5.png` under `webview-ui/public/assets/characters/`). Each PNG is 112x96: 7 frames wide × 16px each, 3 direction rows × 32px each.

External directories can include character overrides:

```
my-pack/
  characters/
    char_0.png
    char_1.png
    ...
```

Format must match exactly (see [Characters reference in build/assets/](/build/assets/characters)). The first matching subdirectory wins.

## Floor and wall packs

`assets/floors/` (9 grayscale PNGs, one per pattern) and `assets/walls/` (one or more 64×128 auto-tile tilesets) can also be replaced by external directories.

Format requirements are strict:

- Floors: `floor_0.png` through `floor_8.png`, each 16×16 grayscale.
- Walls: `wall_0.png` (and optional alternates) at 64×128, 4×4 grid of 16×32 pieces in the canonical bitmask order.

See [Floors reference](/build/assets/floors) and [Walls reference](/build/assets/walls).

## Asset import via npm package

The most portable way to ship a pack is as a published npm package. End users install with `npm install -g`. The package contents structure:

```
pixel-agents-pack-name/
  package.json
  furniture/
    ITEM_A/
      manifest.json
      ITEM_A.png
    ITEM_B/
      manifest.json
      ITEM_B.png
    ...
  characters/  (optional)
    char_0.png
    ...
  floors/      (optional)
    floor_0.png
    ...
  walls/       (optional)
    wall_0.png
```

`package.json`:

```json
{
  "name": "pixel-agents-pack-name",
  "version": "1.0.0",
  "license": "MIT",
  "description": "A Pixel Agents asset pack",
  "files": ["furniture/", "characters/", "floors/", "walls/"]
}
```

After global install, the pack directory is at `$(npm root -g)/pixel-agents-pack-name`.

For full publishing flow, see [/build/assets/publishing-a-pack.md](/build/assets/publishing-a-pack).

## Asset extraction pipeline (for custom imports)

If you have a third-party tileset (e.g. an itch.io pack) you want to import:

1. `npm run import-tileset` - launches the interactive 7-stage CLI:
   - Stage 1: flood-fill asset detection on the source tileset.
   - Stage 2: browser UI for position/bounds editing (`scripts/2-asset-editor.html`).
   - Stage 3: Claude vision auto-metadata (`scripts/3-vision-inspect.ts`).
   - Stage 4: browser UI for metadata review (`scripts/4-review-metadata.html`).
   - Stage 5: export per-item folders with `manifest.json` + PNG sprites (`scripts/5-export-assets.ts`).

There's also a unified editor (`scripts/asset-manager.html`) combining stages 2 and 4.

For walls specifically, `scripts/wall-tile-editor.html` lets you edit the auto-tile pieces visually.

## Validating a pack

Before adding a directory, check the basics:

```sh
cd /path/to/my-pack

# 1. Verify every manifest.json parses
find furniture -name manifest.json -exec jq . {} \; > /dev/null

# 2. Verify every referenced PNG exists (recurses into nested group members)
for d in furniture/*/; do
  jq -r '.. | objects | select(.file) | .file' "$d/manifest.json" | while read f; do
    [ -f "$d/$f" ] || echo "MISSING: $d/$f"
  done
done

# 3. Optional: pngquant or pngcheck the files
pngcheck *.png
```

Pixel Agents itself is forgiving on bad data: malformed entries are logged and skipped, missing PNGs become invisible furniture (still placeable but with empty sprites).

## Authoring tips

- 16x16 is the tile size. Furniture footprints are in tiles, but the sprite pixel dimensions can exceed the footprint if the item visually overhangs.
- Use transparent backgrounds. Alpha threshold is 2 (anything below is treated as fully transparent).
- For semi-transparent pixels (smoke, glass), use `#RRGGBBAA` color values - Pixel Agents preserves them.
- Background-tile items should put their decorative top rows in `backgroundTiles`. Characters walk through them; other furniture stacks on them.
- Surface items (`canPlaceOnSurfaces: true`) z-sort in front of desks. They must visually fit on a 16x16 area.

## Multi-window with external assets

External asset directories live in the shared `~/.pixel-agents/config.json`. All Pixel Agents instances on the machine see them. Add a directory in VS Code, restart `npx pixel-agents`, the new furniture is there.

The shared config means: when you add or remove a directory in one window, other windows pick it up via the config file watcher within ~2 seconds.

## Related

- [Furniture catalog format](/build/assets/furniture)
- [Characters format](/build/assets/characters)
- [Floors format](/build/assets/floors)
- [Walls format](/build/assets/walls)
- [Publishing an asset pack](/build/assets/publishing-a-pack)
- [Settings](/use/vscode/settings) - Add/Remove asset directories.
