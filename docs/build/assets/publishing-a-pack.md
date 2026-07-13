---
sidebar_position: 6
---

# Publishing an asset pack

:::warning[AI-generated docs]
This document was AI-generated and may have some mistakes - we apologize for this, we're in the process of reviewing all documents. If you find any issues, we'd be thankful if you [submit an edit PR](https://github.com/pixel-agents-hq/docs/edit/main/docs/build/assets/publishing-a-pack.md).
:::

Distribute a Pixel Agents asset pack on npm or as a plain directory. This page walks through the recommended structure, the publish flow, and the conventions that make a pack discoverable and installable.

For the asset family formats, see [Characters](./characters), [Furniture](./furniture), [Floors](./floors), [Walls](./walls). For consumer-side installation, see [external assets](/use/workflows/external-assets).

## What an asset pack contains

At minimum: a `furniture/` folder containing per-item subfolders (one per item), each with a `manifest.json` plus the PNG files it references.

Optionally:

- A character set (`characters/char_0.png` through `char_5.png`).
- A custom `floors/` folder (9 patterns).
- A custom `walls/` folder.
- A README explaining the theme, license, and any quirks.
- Sample screenshots showing the pack in action.

## Recommended directory structure

Mirror the bundled layout. Each furniture item gets its own folder with a `manifest.json` plus the referenced PNGs:

```
pixel-agents-pack-coolkitchen/
  README.md                    # what's in the pack, screenshots, license
  package.json                 # if publishing to npm
  LICENSE                      # MIT, CC-BY, or whatever you choose
  furniture/
    CHAIR_KITCHEN/
      manifest.json
      CHAIR_KITCHEN_FRONT.png
      CHAIR_KITCHEN_BACK.png
      CHAIR_KITCHEN_SIDE.png
    TABLE_KITCHEN/
      manifest.json
      TABLE_KITCHEN.png
    COFFEE_POT/
      manifest.json
      COFFEE_POT_OFF.png
      COFFEE_POT_ON.png
    ...
  characters/                  # optional character override
    char_0.png
    char_1.png
    ...
  floors/                      # optional floor override (one PNG per pattern)
    floor_0.png
    floor_1.png
    ...
  walls/                       # optional wall override
    wall_0.png
  screenshots/                 # optional but recommended
    overview.png
    kitchen-detail.png
```

Each manifest's `file` field is resolved relative to its own folder. The runtime loader scans every direct subdirectory of `furniture/` looking for a `manifest.json` and flattens them all into the in-memory catalog.

## License

Pick a license. Common choices for asset packs:

- **CC-BY-4.0** - free to use with attribution.
- **CC0** - public domain, no attribution required.
- **MIT** - most permissive; works for code-adjacent assets.
- **Proprietary** - your call; document the terms in `LICENSE`.

For packs distributed via npm, the `package.json` `license` field should match the LICENSE file. Common npm SPDX identifiers: `CC-BY-4.0`, `CC0-1.0`, `MIT`.

If the pack is derivative of someone else's tileset (e.g. you imported an itch.io tileset and re-shipped), be sure you have redistribution rights. Most paid tilesets do not permit redistribution.

## Naming

Use a clear, namespaced name:

- npm: `pixel-agents-pack-<theme>` (e.g. `pixel-agents-pack-coolkitchen`)
- GitHub: `pixel-agents-pack-<theme>` or `<theme>-for-pixel-agents`

The `pixel-agents-pack-` prefix helps people find your pack via `npm search pixel-agents-pack`.

## Publishing to npm

### Setup

```sh
cd pixel-agents-pack-coolkitchen
npm init
```

Set:

- `name`: `pixel-agents-pack-coolkitchen` (must be unique on npm).
- `version`: start at `0.1.0` or `1.0.0`.
- `description`: one-line summary.
- `license`: SPDX identifier (e.g. `CC-BY-4.0`).
- `repository`: your git URL.
- `keywords`: `["pixel-agents", "asset-pack", "pixel-art", "<theme>"]`.

Add a `files` array to `package.json` so npm only ships what you intend:

```json
{
  "files": [
    "furniture/",
    "characters/",
    "floors/",
    "walls/",
    "README.md",
    "LICENSE",
    "screenshots/"
  ]
}
```

### Publish

```sh
npm login
npm publish --access public
```

If your account uses scoped packages (`@yourname/pixel-agents-pack-coolkitchen`), the `--access public` is required to make it visible.

### Install path

After global install:

```sh
npm install -g pixel-agents-pack-coolkitchen
```

The pack lives at `$(npm root -g)/pixel-agents-pack-coolkitchen`. Users add that path via Pixel Agents Settings → Add Asset Directory.

You can include the install path in your README so users don't have to figure it out:

```md
After installing, the pack lives at:

- macOS / Linux: `$(npm root -g)/pixel-agents-pack-coolkitchen`
- Windows: `%APPDATA%\npm\node_modules\pixel-agents-pack-coolkitchen`

Add this path via Pixel Agents Settings → Add Asset Directory.
```

## Publishing to GitHub (no npm)

If npm isn't your distribution channel:

1. Create a GitHub repo.
2. Push the asset directory.
3. Tag releases (`v0.1.0`, etc.).
4. Users `git clone` the repo and add the local path.

Example user flow:

```sh
git clone https://github.com/yourname/pixel-agents-pack-coolkitchen ~/pixel-assets/coolkitchen
```

Then Settings → Add Asset Directory → paste `/home/user/pixel-assets/coolkitchen`.

For users who want updates: `git pull` periodically.

## README template

Suggested structure:

```md
# Pixel Agents Pack: Cool Kitchen

A pixel art kitchen theme for Pixel Agents.

## Preview

[screenshot]

## What's in this pack

- 24 furniture pieces (stoves, fridges, kitchen islands, plates, mugs)
- 4 character palettes (apron-wearing chefs)
- 1 floor pattern (tiled kitchen floor)
- 1 wall pattern (tiled wall, half-height)

## Install

### Via npm

`npm install -g pixel-agents-pack-coolkitchen`

Then add `$(npm root -g)/pixel-agents-pack-coolkitchen` via
Pixel Agents Settings → Add Asset Directory.

### Via git clone

`git clone https://github.com/yourname/pixel-agents-pack-coolkitchen ~/pixel-assets/coolkitchen`

Then add `~/pixel-assets/coolkitchen` via
Pixel Agents Settings → Add Asset Directory.

## License

CC-BY-4.0. Attribution: [your name].
```

## Versioning

Use semver:

- `patch` (0.0.X): fix a wrong sprite, tweak metadata.
- `minor` (0.X.0): add new furniture pieces.
- `major` (X.0.0): break compatibility (rename IDs, change footprints, remove items).

Renaming a furniture `id` is a breaking change because existing user layouts reference items by id. If you must rename, ship a major version and call it out in your README.

## Compatibility with Pixel Agents versions

If your pack uses fields that were added in a specific Pixel Agents version (e.g. `canPlaceOnWalls`), mention the minimum required version in your README.

```md
## Requirements

Pixel Agents >= 1.3.0 (uses canPlaceOnWalls for wall paintings).
```

You can also include a `peerDependencies` in your `package.json`:

```json
{
  "peerDependencies": {
    "pixel-agents": ">=1.3.0"
  }
}
```

This is informational only - npm won't enforce it for asset packs since they're not actually imported as code.

## Updating users

When you ship a new version:

- For npm-distributed packs: `npm update -g pixel-agents-pack-coolkitchen`. Users still need to restart Pixel Agents to pick up changes.
- For git-distributed packs: `git pull` in their local clone.

A new pack version won't affect existing user layouts unless you renamed or removed IDs. Adding new furniture is purely additive.

## Asset pipeline integration

If your pack is derived from a third-party tileset via `npm run import-tileset`:

- Document the source tileset in your README.
- Confirm you have redistribution rights.
- If you can't redistribute the source, ship the metadata + a script that users can run against their own copy of the source tileset.

The 7-stage pipeline (`scripts/0-import-tileset.ts` through `scripts/5-export-assets.ts`) is the canonical extraction path. See [external assets > Asset extraction pipeline](/use/workflows/external-assets#asset-extraction-pipeline-for-custom-imports).

## Discoverability

To help people find your pack:

- Use the `pixel-agents-pack-` npm prefix.
- Include `pixel-agents` and `asset-pack` in npm keywords.
- Link your repo from the Pixel Agents Discussions or Discord channel.
- If the Pixel Agents showcase page accepts community packs, submit there (see [/community/showcase.md](/community/showcase)).

## Common gotchas

- **PNG filenames are case-sensitive.** `Chair.png` and `chair.png` are different files on macOS / Linux. Stick to lowercase to avoid surprises.
- **Manifest `file` paths are relative to the item folder.** A manifest in `furniture/CHAIR/manifest.json` referencing `"file": "CHAIR.png"` looks for `furniture/CHAIR/CHAIR.png`. Don't include the folder prefix.
- **Don't ship `node_modules/`.** Use the `files` whitelist in `package.json`.
- **Don't ship screenshot directories you don't want users to see.** Same advice.
- **Validate before publish.** For each item folder, run `jq . manifest.json > /dev/null` to verify the JSON parses, and `jq -r ".. | objects | select(.file) | .file" manifest.json` to list referenced PNGs; spot-check they all exist.

## Showcasing your pack

If you'd like your pack featured on the Pixel Agents site:

1. Publish it (npm or GitHub).
2. Test it works end-to-end (install, add directory, see new furniture in editor).
3. Open a PR to add an entry to [/community/showcase.md](/community/showcase).

The showcase entry should include: pack name, repo / npm link, screenshots, license.

## Related

- [Assets overview](./overview)
- [Furniture catalog format](./furniture)
- [Characters](./characters)
- [Floors](./floors)
- [Walls](./walls)
- [External assets (consumer guide)](/use/workflows/external-assets)
- [Showcase](/community/showcase)
