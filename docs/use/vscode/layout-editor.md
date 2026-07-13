---
sidebar_position: 3
---

# Layout editor

:::warning[AI-generated docs]
This document was AI-generated and may have some mistakes - we apologize for this, we're in the process of reviewing all documents. If you find any issues, we'd be thankful if you [submit an edit PR](https://github.com/pixel-agents-hq/docs/edit/main/docs/use/vscode/layout-editor.md).
:::

The layout editor lets you design your office: paint floor tiles, place furniture, put up walls, expand the grid. Everything saves to `~/.pixel-agents/layout.json` and syncs across windows.

The editor is the same in VS Code and standalone. This page applies to both.

## Entering and exiting

**Enter:** click the **Layout** button in the bottom toolbar.

**Exit:** press `Esc`. The Esc key is multi-stage:

1. Exits the furniture-pick eyedropper (if active).
2. Deselects the catalog item (if one is selected).
3. Closes the current tool tab.
4. Deselects placed furniture.
5. Closes the editor.

So a single rapid Esc-mash takes you all the way back to view mode.

## The tools

The editor toolbar appears at the top of the canvas. Tools:

| Tool | Shortcut effect |
|---|---|
| **SELECT** | Default. Click furniture to select; drag to move; click empty to deselect. |
| **Floor** | Paint floor tiles with the chosen pattern + color. |
| **Wall** | Paint wall tiles (auto-tiled). |
| **Erase** | Set tiles to VOID (transparent, non-walkable, no furniture). |
| **Furniture** | Place items from the catalog. |
| **Furniture pick** | Eyedropper for furniture (click an item to select its catalog type). |
| **Eyedropper** | Floor eyedropper (click a tile to pick its pattern + color). |

## Floor painting

Selecting Floor opens the floor palette: nine grayscale 16×16 patterns in `assets/floors/`. Pick a pattern, then adjust the **HSBC sliders**:

- **H** (hue, 0-360)
- **S** (saturation, 0-200)
- **B** (brightness, ±100)
- **C** (contrast, ±100)

There's also a **Colorize** checkbox. When checked (default for floors), the grayscale is mapped to luminance then to a fixed HSL color (Photoshop-style Colorize). When unchecked, the source pixel's HSL is shifted instead.

Click a tile to paint it with the current pattern + color. Drag to paint multiple. Each tile stores its own color independently; the toolbar's HSBC values are the default for new paints.

**Eyedropper:** with the Floor tool active, hold the eyedropper modifier (or click the eyedropper icon) and click a tile to pick its pattern + HSBC into the toolbar.

## Wall painting

Walls are a separate tool. Click/drag to add walls. Click/drag existing walls to remove them (toggle behavior: the first tile of the drag sets whether you're adding or removing).

The HSBC sliders for walls are global - all walls share one color. Adjusting the slider re-colorizes every wall in the layout. There's no per-wall color.

Eyedropper on a wall picks its color and switches to the Wall tool.

Walls auto-tile based on the 4-bit bitmask of cardinal neighbors (N=1, E=2, S=4, W=8). You don't pick which wall piece; the bitmask determines it.

Furniture cannot be placed on wall tiles by default, with one exception: furniture marked `canPlaceOnWalls` (paintings, windows, clocks) can only be placed on wall tiles.

Background rows of furniture (`backgroundTiles`) can overlap walls.

## Erase

Erase sets tiles to VOID:

- Transparent (no rendering).
- Non-walkable for pathfinding.
- No furniture allowed.

Click or drag to erase. The right mouse button also erases when the Floor, Wall, or Erase tool is active.

The browser's context menu is suppressed during edit mode so right-click erase works without the menu popping up.

## Furniture placement

Selecting Furniture opens the catalog grouped by category: desks, chairs, storage, electronics, decor, wall, misc.

Categories:

- **Desks** - tables and desks. `isDesk: true`.
- **Chairs** - chairs become seats.
- **Storage** - bookshelves, cabinets, file drawers.
- **Electronics** - monitors, laptops, mugs (yes, mugs are here). Many have on/off states.
- **Decor** - plants, paintings, decorations.
- **Wall** - dedicated tab for `canPlaceOnWalls: true` items.
- **Misc** - everything else.

Click an item to select it; the cursor shows a green/red ghost preview indicating valid (green) or invalid (red) placement.

Click an empty valid tile to place.

### Rotation

Press **R** while the ghost is visible to rotate. The rotation cycles through orientations defined in the catalog entry's `groupId` (e.g. front → back → left → right → front).

Single-orientation items don't rotate.

### State toggle (on/off)

Press **T** while the ghost is visible (or when a placed stateful item is selected) to toggle between on and off states. Used for electronics with `state: 'on' | 'off'` pairs sharing a `groupId`.

In the catalog palette, only the off-state version is shown (the on-state is reserved for auto-state rendering when an agent uses a desk).

## Drag-to-move

In SELECT mode, click a placed furniture item to select it (blue selection indicator). Click and drag to move it. Drop on a valid empty tile.

Multi-tile furniture moves as a unit. Surface items (laptops, mugs) prefer being clicked over the desk beneath when stacked.

## Per-item color (furniture)

Any selected furniture item shows a **Color** toggle in the toolbar. Enable it to reveal HSBC sliders. Adjust to colorize the sprite.

A single drag-edit session counts as one undo step (tracked by `colorEditUidRef`), so dragging through 20 different hues lands as one undo, not 20.

Click the **Clear** button to reset the color to the asset's default.

## Delete and rotate buttons

A selected furniture item floats two buttons near its top:

- 🔴 X (red) - delete.
- 🔵 ↻ (blue) - rotate. Same as pressing R but click-accessible.

## Undo / Redo

50-level history. Standard:

- **Ctrl/Cmd+Z** - undo.
- **Ctrl/Cmd+Y** or **Ctrl/Cmd+Shift+Z** - redo.

The EditActionBar (top-center, visible when dirty) also has Undo / Redo buttons plus Save and Reset.

Each tile paint, furniture place, furniture move, furniture rotate, and furniture state toggle is one undo step. A color edit session (drag the slider continuously) is one step.

## Save and reset

**Save** writes the current layout to `~/.pixel-agents/layout.json` (atomic via tmp + rename). The EditActionBar disappears (no longer dirty). Other windows pick up the change within ~2 seconds via the file watcher.

**Reset** discards unsaved changes and restores the layout to the last saved state. Different from "Reset Layout" in the settings modal (which restores the bundled default).

## Grid expansion

In Floor, Wall, or Erase tools, you'll see a ghost border (dashed outline) one tile outside the current grid. Click a ghost tile to expand the grid by one tile in that direction (left, right, up, or down).

New tiles default to VOID. Existing furniture positions shift when expanding left or up to preserve their visual position.

Max grid size: 64 x 64 (`MAX_COLS` x `MAX_ROWS`). Default size: 20 x 11.

Characters whose seats fall outside the new bounds after a shrink (via Reset or import) are relocated to random walkable tiles.

## Furniture catalog metadata

Each catalog entry has fields that affect editor behavior:

| Field | Effect |
|---|---|
| `footprintW`, `footprintH` | Item size in tiles. |
| `isDesk` | Allows surface items to overlap. |
| `canPlaceOnSurfaces` | Item can overlap with all tiles of any `isDesk` furniture. |
| `canPlaceOnWalls` | Item can ONLY be placed on wall tiles. |
| `backgroundTiles` | Top N rows are "background": characters can walk through, other furniture can overlap. |
| `groupId` + `orientation` | Defines rotation group. |
| `groupId` + `state` | Defines on/off pair. |

For the schema, see [furniture in the assets section](/build/assets/furniture).

## Auto-state for electronics

Electronics with on/off variants (monitors, laptops) automatically swap to the ON sprite when an active agent (in TYPE state) is sitting at an adjacent desk and facing the electronic.

The detection runs at render time: it does NOT modify the saved layout. Stops as soon as the agent stops typing.

Range: 3 tiles deep in the agent's facing direction, 1 tile to each side.

## Multi-window sync

Saved layout changes propagate across windows within ~2 seconds via `fs.watch` + a 2-second polling fallback. The receiving window applies the new layout unless it has unsaved edits (last-save-wins, no merge).

If you have unsaved edits in window A and window B saves over your layout, you'll keep your edits; if you save in A, you'll overwrite B's save. That's the trade-off.

## Selecting characters in edit mode

Characters are still clickable in edit mode (for seat reassignment). The SELECT tool prioritizes furniture clicks; click on an empty area near a character to select the character.

## Cancelling a placement

While a furniture ghost is visible, press **Esc** to deselect the catalog item. The ghost disappears; you're back to "no item selected" within the Furniture tool.

## Saving as default (developer command)

The command `Pixel Agents: Export Layout as Default` writes your current layout to `webview-ui/public/assets/default-layout.json`. This is used during development to update the bundled default. End users won't need it.

## Tips and tricks

- **Paint multiple tiles fast:** click + drag continuously. Each new tile under the cursor gets the current color.
- **Reset to default for the floor:** delete everything in the layout, then paint floor everywhere - or use the Reset Layout button.
- **Make a tight office:** use the grid expansion ghost to shrink (no - you can't shrink). Use VOID tiles around the perimeter for the same visual effect.
- **Highlight a desk area:** paint the floor under a desk in a different color from the surroundings.
- **Build a corridor:** wall tiles auto-bitmask, so a single row of wall paints becomes a connected corridor wall.

## Next

- [Settings](./settings) - Export/Import/Reset Layout buttons.
- [Troubleshooting](./troubleshooting) - if the editor misbehaves.
- [Furniture catalog format](/build/assets/furniture) - if you're authoring assets.
- [External assets](/use/workflows/external-assets) - using third-party tilesets.
