---
sidebar_position: 3
---

# Furniture

The furniture catalog is the largest asset family. Every desk, chair, monitor, plant, mug, painting, and bookshelf is a furniture entry. Each item ships as its own folder under `webview-ui/public/assets/furniture/<ITEM_ID>/` with a `manifest.json` plus one or more PNG sprites. The runtime scans these folders at startup and flattens them into the in-memory catalog the editor uses.

For the consumer guide (using third-party furniture), see [external assets](/use/workflows/external-assets). For the catalog message shape sent on the wire (after flattening), see [protocol schemas](/reference/protocol/schemas).

## File layout

```
webview-ui/public/assets/furniture/
  BIN/
    manifest.json
    BIN.png
  PC/
    manifest.json
    PC_FRONT_OFF.png
    PC_FRONT_ON_1.png
    PC_FRONT_ON_2.png
    PC_FRONT_ON_3.png
    PC_BACK.png
    PC_SIDE.png
  DESK/
    manifest.json
    DESK_FRONT.png
    DESK_SIDE.png
  ...
```

Each item folder is self-contained. The folder name is the item id (uppercase by convention). The `manifest.json` describes the item; PNGs in the same folder are referenced by it. The runtime loader (`server/src/assetLoader.ts`'s `loadFurnitureAssets`) walks every direct subdirectory of `furniture/`, reads each `manifest.json`, and merges everything into a single in-memory `catalog: FurnitureAsset[]`. The flattened catalog is what gets sent to clients as `furnitureAssetsLoaded` (see [protocol schemas](/reference/protocol/schemas)).

There is no single `furniture-catalog.json` shipped on disk — the catalog is constructed at server startup by scanning manifests.

## Manifest format

Two shapes: simple leaf assets and nested group containers.

### Simple asset

A single sprite with no rotation, state, or animation:

```json
{
  "id": "BIN",
  "name": "Bin",
  "category": "misc",
  "type": "asset",
  "file": "BIN.png",
  "width": 16,
  "height": 16,
  "footprintW": 1,
  "footprintH": 1,
  "canPlaceOnWalls": false,
  "canPlaceOnSurfaces": false,
  "backgroundTiles": 0
}
```

### Grouped asset (rotation + state + animation)

Groups nest to compose complex behaviors. The PC is the canonical example: 3-way mirror rotation, on/off state, 3-frame animation on the "on" state:

```json
{
  "id": "PC",
  "name": "PC",
  "category": "electronics",
  "type": "group",
  "groupType": "rotation",
  "rotationScheme": "3-way-mirror",
  "canPlaceOnSurfaces": true,
  "backgroundTiles": 1,
  "members": [
    {
      "type": "group",
      "groupType": "state",
      "orientation": "front",
      "members": [
        {
          "type": "group",
          "groupType": "animation",
          "state": "on",
          "members": [
            { "type": "asset", "id": "PC_FRONT_ON_1", "file": "PC_FRONT_ON_1.png", "frame": 0 },
            { "type": "asset", "id": "PC_FRONT_ON_2", "file": "PC_FRONT_ON_2.png", "frame": 1 },
            { "type": "asset", "id": "PC_FRONT_ON_3", "file": "PC_FRONT_ON_3.png", "frame": 2 }
          ]
        },
        { "type": "asset", "id": "PC_FRONT_OFF", "file": "PC_FRONT_OFF.png", "state": "off" }
      ]
    }
  ]
}
```

The flattener (`core/src/assets/manifestUtils.ts`'s `flattenManifest`) walks the nested groups and emits a flat list where each leaf carries the composed metadata (rotation orientation, state, frame, etc.) of all its ancestors.

## Manifest properties

### Core properties

| Property | Type | Description |
|---|---|---|
| `id` | string | Unique asset identifier across the whole merged catalog. External IDs override bundled IDs on collision. |
| `name` | string | Display name for the editor palette. |
| `category` | string | One of: `desks`, `chairs`, `storage`, `electronics`, `decor`, `wall`, `misc`. |
| `type` | string | `"asset"` for a leaf sprite, `"group"` for a container with `members`. |
| `file` | string | PNG filename, relative to the item's folder (leaf assets only). |
| `width`, `height` | number | Sprite pixel dimensions. |
| `footprintW`, `footprintH` | number | Grid footprint in tiles (16-pixel units). |
| `isDesk` | boolean | Allows surface items to overlap. |

### Placement properties

| Property | Type | Default | Description |
|---|---|---|---|
| `canPlaceOnWalls` | boolean | false | Can ONLY be placed on wall tiles (paintings, windows, clocks). Goes in the "Wall" editor tab. |
| `canPlaceOnSurfaces` | boolean | false | Can overlap with any tile of any `isDesk` furniture (laptops, monitors, mugs). |
| `backgroundTiles` | number | 0 | Top N footprint rows are "background": characters can walk through them; other furniture can overlap. |

### Group properties

| Property | Type | Description |
|---|---|---|
| `groupType` | string | `"rotation"`, `"state"`, or `"animation"`. |
| `rotationScheme` | string | `"2-way"`, `"3-way-mirror"`, or omitted (default 4-way). |
| `orientation` | string | `"front"`, `"back"`, `"left"`, `"right"`, or `"side"`. |
| `state` | string | `"on"` or `"off"`. |
| `frame` | number | Animation frame index (0-based). |
| `mirrorSide` | boolean | If true, the `right` orientation is rendered by horizontally flipping `left` (saves one sprite). |

## Rotation schemes

| Scheme | Orientations | Use case |
|---|---|---|
| `2-way` | front + side | Symmetric furniture (desks, tables) |
| `3-way-mirror` | front + back + side (side mirrors to left) | Chairs, PCs, sofas |
| 4-way (default, no `rotationScheme` field) | front + back + left + right | All-around-visible items |

## Categories

The editor groups the catalog by category in tabs:

| Category | Examples |
|---|---|
| `desks` | Office desks, tables, workstations. Usually have `isDesk: true`. |
| `chairs` | Chairs and couches. Each tile of a chair becomes a seat. |
| `storage` | Bookshelves, filing cabinets, drawers. |
| `electronics` | Monitors, laptops, lamps, mugs. Many have state pairs (on/off). |
| `decor` | Plants, rugs, decorations. |
| `wall` | Wall-only items (paintings, windows, clocks). Requires `canPlaceOnWalls: true`. |
| `misc` | Everything that doesn't fit elsewhere. |

Categories are not enforced by the type system - any string is allowed. The editor's tab order is fixed; unknown categories show in a "misc" or similar bucket.

## Rotation groups (flattened view)

After the manifest flattener runs, each rotation variant becomes its own catalog entry sharing a `groupId` with different `orientation` values. This is what the editor and renderer see:

```json
[
  { "id": "office_chair_front", "groupId": "office_chair", "orientation": "front", ... },
  { "id": "office_chair_back",  "groupId": "office_chair", "orientation": "back",  ... },
  { "id": "office_chair_left",  "groupId": "office_chair", "orientation": "left",  ... },
  { "id": "office_chair_right", "groupId": "office_chair", "orientation": "right", ... }
]
```

The editor palette shows one item per group (preferring the `front` orientation). Pressing R while the ghost is visible cycles through the orientations.

Groups can have 2 or 4 orientations. Two-way groups (e.g. front/back only) are valid.

Chair facing direction comes from the `orientation` field:

- `front` → DOWN-facing
- `back` → UP-facing
- `left` → LEFT-facing
- `right` → RIGHT-facing

If `orientation` is undefined, the seat falls back to: adjacent-desk direction, then forward (DOWN).

## State groups (flattened view)

Same idea for state pairs. After flattening, items with `state: "on"` and `state: "off"` sharing a `groupId` (and same `orientation`) form toggle pairs:

```json
[
  { "id": "monitor_front_off", "groupId": "monitor", "orientation": "front", "state": "off", ... },
  { "id": "monitor_front_on",  "groupId": "monitor", "orientation": "front", "state": "on",  ... }
]
```

The editor palette shows only the off-state version. Pressing T while a stateful item is selected (or ghosted) toggles it.

Auto-state: at render time, electronics with on/off pairs swap to ON when an active agent is facing a desk with the item nearby (3 tiles deep in the facing direction, 1 tile to each side). This does NOT modify the saved layout - the auto-state is purely visual.

State groups are mirrored across orientations: on-state variants get their own rotation groups.

## Naming convention

Asset PNGs follow the pattern `{BASE}[_{ORIENTATION}][_{STATE}]`:

- `MONITOR_FRONT_OFF` → monitor, front-facing, off state
- `OFFICE_CHAIR_BACK` → office chair, back-facing (no state)
- `BOOKSHELF` → bookshelf (no orientation or state)

Capitalization is not enforced; the IDs are case-sensitive but the editor sorts them with case-insensitive comparison.

## Background tiles

If a furniture item has decorative top rows that should be walkable and overlap-able (think of a tall plant whose pot is one tile and whose leaves extend up two tiles), use `backgroundTiles`:

```json
{
  "id": "fern_tall",
  "footprintW": 1,
  "footprintH": 3,
  "backgroundTiles": 2,
  ...
}
```

This means: of the 3-tile tall footprint, the top 2 rows are background. Characters can walk through them; other furniture can stack on them. The bottom row is the "real" footprint that blocks placement.

The z-sorting renders background-tile rows behind the host furniture so a character walking through appears in front.

## Surface placement

Items with `canPlaceOnSurfaces: true` (laptops, monitors, mugs) can overlap with all tiles of any `isDesk` furniture. The placement checker builds a set of desk tiles and excludes them from collision checks for surface items.

The renderer z-sorts surface items in front of their host desk:

```ts
zY = max(spriteBottom, deskZY + 0.5)
```

So a laptop placed on a desk appears in front of the desk regardless of its row position.

## Wall placement

Items with `canPlaceOnWalls: true` (paintings, windows, clocks) can only be placed on wall tiles. They cannot be placed on floor tiles.

The bottom row of the item's footprint must align with a wall tile. Upper rows can extend above the map (negative row coordinates) or into VOID tiles. The placement helper offsets the placement so the bottom row matches the hover tile.

Wall items go into the "Wall" tab in the editor.

## Per-item color

Any placed furniture item can carry a `PlacedFurniture.color` field:

```ts
{
  type: "office_chair_front",
  uid: "abc-123",
  col: 5, row: 4,
  color: { h: 200, s: 80, b: 0, c: 0 }
}
```

The renderer colorizes the sprite at draw time using the same HSBC logic as floor tiles. Default mode for furniture is **Adjust** (shift HSL from the source) rather than **Colorize**, so the original sprite's shading is preserved.

## Editor behavior

The editor uses the catalog to:

- Populate the furniture palette (one item per rotation group, preferring `front`).
- Compute placement validity (collision with other furniture, walkability check).
- Compute rotation cycling on R.
- Compute state toggle on T.
- Render the ghost preview at the cursor.

## Editor metadata not in the catalog

A few editor concerns are not stored per-entry but computed:

- **Stack-priority on click**: surface items prefer being clicked over the desk beneath. Implemented in the editor's hit-test, not the catalog.
- **Auto-state matching**: figured out at render time by checking the agent's facing direction and the catalog's groupId + state.
- **Seat derivation**: any `chairs`-category item becomes seats at its tile positions. Multi-tile chairs become multi-seat entries.

## Authoring a new piece

1. Create a new folder under `webview-ui/public/assets/furniture/<YOUR_ID>/`.
2. Draw the PNG(s) at the right pixel size. A 1×1 chair is 16×32 pixels (accounting for the visual top extension above the tile).
3. Write a `manifest.json` describing the item. Use the simple-asset shape for one-PNG items, the grouped shape for multi-rotation / state / animation items.
4. Test in the editor.

For multi-orientation or stateful items, ship one PNG per variant in the same folder and nest the appropriate `group` containers in your `manifest.json` (see the PC example above).

For "fits on top of a desk" items: set `canPlaceOnSurfaces: true`. For "goes on a wall": set `canPlaceOnWalls: true`. Both flags cannot be true on the same item.

The bundled `scripts/asset-manager.html` provides a visual editor for creating and editing manifests interactively.

## Validating a manifest

A quick script to check your custom item folder:

```sh
cd webview-ui/public/assets/furniture/MY_ITEM/

# Verify the manifest parses
jq . manifest.json > /dev/null

# Verify every referenced PNG exists (handles nested groups via recursive descent)
jq -r '.. | objects | select(.file) | .file' manifest.json | while read f; do
  [ -f "$f" ] || echo "MISSING: $f"
done
```

Pixel Agents logs missing files via `[AssetLoader]` warnings on startup but doesn't fail loudly. Use the script above to catch typos before shipping.

## Runtime catalog API

At runtime, manifests are flattened into a catalog that manages rotation groups, state toggles, and animation sequences. The webview catalog exposes (`webview-ui/src/office/layout/furnitureCatalog.ts`):

```ts
getCatalogEntry(type)              // full entry with all variants
getCatalogByCategory(category)     // filter by category
getRotatedType(type, direction)    // next rotation variant (CW/CCW)
getToggledType(type)               // on ↔ off state
getAnimationFrames(type)           // ordered frame ids
```

The editor palette shows only the "default" variant of each item: front orientation, off state, first animation frame.

## Publishing

Bundle the directory as an npm package or as a git repository. See [Publishing an asset pack](./publishing-a-pack).

## Key files

| File | Purpose |
|---|---|
| `server/src/assetLoader.ts` | Scans `furniture/*/manifest.json`, loads PNGs, builds the in-memory catalog |
| `core/src/assets/manifestUtils.ts` | `flattenManifest()` — nested groups → flat array of leaves with composed metadata |
| `webview-ui/src/office/layout/furnitureCatalog.ts` | Runtime catalog with rotation/state/animation lookups |
| `webview-ui/src/office/layout/layoutSerializer.ts` | Grid placement → renderable `FurnitureInstance` array |
| `core/src/schemas.ts:78-96` | `FurnitureCatalogEntry` shape used internally |
| `core/src/messages.ts:190-211` | `FurnitureAssetMessage` shape on the wire |

## Related

- [Assets overview](./overview)
- [Characters](./characters)
- [Floors](./floors)
- [Walls](./walls)
- [External assets (consumer guide)](/use/workflows/external-assets)
- [Publishing an asset pack](./publishing-a-pack)
- [Protocol schemas (FurnitureAssetMessage, FurnitureCatalogEntry)](/reference/protocol/schemas)
