---
sidebar_position: 2
---

# Characters

:::warning[AI-generated docs]
This document was AI-generated and may have some mistakes - we apologize for this, we're in the process of reviewing all documents. If you find any issues, we'd be thankful if you [submit an edit PR](https://github.com/pixel-agents-hq/docs/edit/main/docs/build/assets/characters.md).
:::

Character sprites are the visual identity of agents. Six pre-colored palettes ship bundled. Runtime hue shifting expands the visual variety to dozens of distinguishable characters.

For the consumer use case (using a custom character pack), see [external assets > character packs](/use/workflows/external-assets). For the asset system overview, see [Assets overview](./overview).

## File layout

Bundled at `assets/characters/`:

```
characters/
  char_0.png
  char_1.png
  char_2.png
  char_3.png
  char_4.png
  char_5.png
```

Six PNGs, one per palette. Indexed 0 through 5.

Each file: **112 wide x 96 tall** pixels.

## Sprite grid

Each character PNG is a 7-frame x 3-direction grid:

```
Width  = 7 frames × 16 px = 112 px
Height = 3 directions × 32 px = 96 px
```

Rows top-to-bottom:

| Row | Direction enum value |
|---|---|
| 0 (y 0-31) | DOWN (facing the viewer) |
| 1 (y 32-63) | UP (facing away) |
| 2 (y 64-95) | RIGHT (facing right) |

LEFT is rendered at runtime as a horizontal flip of RIGHT. No explicit LEFT row.

The `Direction` constant from `webview-ui/src/office/types.ts`:

```ts
export const Direction = {
  DOWN: 0,
  LEFT: 1,
  RIGHT: 2,
  UP: 3,
} as const;
```

Note that the **enum numeric order** (DOWN, LEFT, RIGHT, UP) differs from the **PNG row order** (DOWN, UP, RIGHT). The runtime maps enum values to rows internally; PNG authors only need to match the row order in the table above.

Columns left-to-right:

| Col (x range) | Frame |
|---|---|
| 0 (0-15) | walk1 |
| 1 (16-31) | walk2 (also the idle frame) |
| 2 (32-47) | walk3 |
| 3 (48-63) | type1 |
| 4 (64-79) | type2 |
| 5 (80-95) | read1 |
| 6 (96-111) | read2 |

There's no dedicated idle frame. Idle uses walk2 (standing pose). Walking cycles walk1 / walk2 / walk3 at the configured frame rate.

## Frame visible area

Each 16x32 frame has the character bottom-aligned in the lower 24 pixels:

```
Frame layout:
  rows 0-7   = top padding (transparent)
  rows 8-31  = character (24 px tall)
```

This 8px top padding accommodates characters with hats or hair flair without clipping. Tiles are 16x16, but characters can be up to 32 tall.

The bottom of the visible character should sit on the bottom edge of the frame. The renderer aligns frames at the visual feet of the character to the seat or tile position.

## Authoring characters

If you're making your own palette set, start from the bundled `char_0.png` and replace the colors. Stick to the same frame layout.

Tools that work well: Aseprite, Piskel, Photoshop (with a small palette), any pixel-art editor.

Tips:

- Use transparent background. Alpha threshold is 2; anything below becomes `''` in SpriteData.
- For semi-transparent pixels (smoke effects, ghosts), use 8-bit alpha. Pixel Agents preserves them as `'#RRGGBBAA'`.
- Keep the silhouette consistent across frames. Walking should swing arms; typing should bring arms forward; reading should pose with a piece of paper.
- Stay within the 16x32 bounds. Pixels outside are clipped at PNG load time.

## Hue shifting

The runtime can rotate the hue of any character sprite at render time. This is how agent 7 (which would re-use palette 0) gets a visually distinct color from agent 1.

The shift is in degrees (0-360). 0 = no shift. 180 = inverted hue. Most generators pick between 45 and 315 to keep the result clearly different from the base.

Implementation: `adjustSprite()` in `webview-ui/src/office/colorize.ts` runs HSL hue rotation per pixel. The result is cached per `(palette, hueShift)` key. The cache key for sprites: `"palette:hueShift"` (e.g. `"3:120"`).

## Palette assignment for agents

When a new agent appears, the runtime picks a palette via `pickDiversePalette`:

1. Count the palettes of all current non-sub-agent characters.
2. Pick randomly from the least-used palette(s).
3. For the first 6 agents, each gets a unique palette.
4. For agent 7+, palettes repeat with a random hue shift between 45 and 315 degrees.

The palette and hue shift are persisted on the agent (`AgentSeatMeta.palette`, `AgentSeatMeta.hueShift`) so they survive reloads.

## Generation script

`scripts/export-characters.ts` (run with `tsx`) generates the bundled six PNGs from a template + a palette table. The script:

1. Loads the bundled template character (in template colors).
2. Bakes one set of `CHARACTER_PALETTES` colors into the template per output PNG.
3. Writes the six PNGs.

To regenerate after editing the template:

```sh
npx tsx scripts/export-characters.ts
```

If you're shipping your own pack, you don't need this script - just author the six PNGs directly.

## Reading vs typing animations

Which animation plays for which tool is determined by the provider's `readingTools` set. For Claude:

```ts
// server/src/providers/hook/claude/claude.ts:270
readingTools: new Set(['Read', 'Grep', 'Glob', 'WebFetch', 'WebSearch']),
```

Anything in this set plays the read1/read2 animation. Anything else (Write, Edit, Bash, Task, etc.) plays type1/type2.

Adding a new provider with different tool naming? Just include the read-like tool names in its `readingTools` set. The webview animation choice flows from that.

## Standing-still pose

When a character is in IDLE state (not walking, not at a desk typing), it stands still in the walk2 frame. No animation.

When sitting at a desk (TYPE state), the character is rendered 6 pixels lower so the visual feet end up "in" the chair, not floating above.

## Walk speed

Characters move at a fixed rate defined by `WALK_SPEED_PX_PER_SEC` in `webview-ui/src/constants.ts`:

```ts
export const WALK_SPEED_PX_PER_SEC = 48;
```

At `TILE_SIZE = 16`, that's **3 tiles per second**. The character FSM increments its `moveProgress` each game tick by `(WALK_SPEED_PX_PER_SEC / TILE_SIZE) * dt` (see `webview-ui/src/office/engine/characters.ts:274`).

The walk animation is a 3-frame cycle (walk1 / walk2 / walk3) on top of this motion. Frame swap cadence is driven by the same delta-time loop, not a separate animation clock.

## Outline / selection

When a character is selected (white outline) or hovered, the renderer applies an outline effect. The outline is generated at runtime by drawing the sprite multiple times with offset positions; it doesn't require a separate "outlined" sprite in the source PNG.

## Sub-agent and teammate visuals

Sub-agents (ephemeral) and teammates (persistent) both use the same character sprite as the parent / lead. The hue shift is inherited so the team is visually grouped.

Sub-agents are drawn at a slightly smaller scale (the "subtask" visual cue). Teammates are full-size.

## What the character can't show

- **Facial expressions.** 16x32 is too small for expressive faces. Mood is conveyed by animation (walking, typing, sitting still).
- **Equipment that changes per task.** The character holds a piece of paper in read frames, but you can't equip them with task-specific objects.
- **Costumes.** The same character looks the same regardless of which CLI is driving them. A future change could allow per-provider character themes.

## Replacing characters via external assets

To use your own palette set, put six `char_N.png` files in a directory with the right format and add it via Settings → Add Asset Directory.

```
my-pack/
  characters/
    char_0.png
    char_1.png
    char_2.png
    char_3.png
    char_4.png
    char_5.png
```

The first matching directory wins. Bundled set is replaced wholesale.

You can also ship fewer than 6 (e.g. just `char_0.png` and `char_1.png`); palettes 2-5 fall back to bundled. The runtime doesn't enforce all 6 being present.

## Cache and memory

Character sprites are decoded once per `(palette, hueShift)` combination and cached. With 6 palettes and dozens of possible hue shifts, the cache can grow to hundreds of entries on a long-running session. Memory cost is modest (each sprite is small).

The cache is a `Map<string, OffscreenCanvas>` per zoom level in the webview. Other clients can implement equivalent caching.

## Key files

| File | Purpose |
|---|---|
| `webview-ui/src/office/sprites/spriteData.ts` | Sprite template loading, palette hue shifts, frame extraction |
| `webview-ui/src/office/sprites/spriteCache.ts` | Per-zoom-level canvas caching and outline generation |
| `webview-ui/src/office/engine/characters.ts` | Character FSM (idle / walk / type), animation selection |
| `webview-ui/src/office/types.ts` | `Direction` constant (DOWN/LEFT/RIGHT/UP) |
| `webview-ui/src/constants.ts` | `WALK_SPEED_PX_PER_SEC`, `TILE_SIZE`, and frame timing constants |
| `scripts/export-characters.ts` | Bakes palette colors into character PNG templates |

## Related

- [Assets overview](./overview)
- [Furniture](./furniture) - the other major asset family.
- [SpriteData reference](/reference/protocol/schemas)
- [The office (concept)](/learn/the-office) - how characters appear in the UI.
- [Concepts > skin and hue shift](/learn/concepts#skin-and-hue-shift)
