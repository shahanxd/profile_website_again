# Art

Everything the hero scene is drawn from, and the tool that cleans generated art into it.

| Path | What it is |
|---|---|
| `palette.json` | The master palette: 48 colours, the ramps they belong to, and the dusk swap table. |
| `sprites/` | The sprites the site ships, plus `sprites.json`, which describes them. Committed. |
| `art.config.json` | What `pixelize.mjs build` makes: assets cleaned from raw generations, and tiny sprites drawn as pixel maps. |
| `overrides/` | Hand repaints at art resolution. A file here replaces the generated version of the same name. |
| `raw/` | Raw generations and preview images. Git-ignored. |
| `fixtures/` | Synthetic test inputs, rebuilt by `tools/art/make-fixtures.mjs`. Git-ignored. |
| `private/` | The owner's reference photo. Git-ignored, never ships. |

The tool is `tools/art/pixelize.mjs`. It needs Node 22.12 or newer and `sharp`, nothing else. Run it from the repo root; every path in the config is relative to the root.

## Why it exists

Generated "pixel art" is not pixel art. It arrives 1000 to 2000 px wide, its apparent pixels are off any grid and not all the same size, edges are soft, colours wander, and JPEG adds noise. The tool turns one such image into a true sprite: one image pixel per art pixel, only palette colours, alpha either 0 or 255.

## Commands

```bash
# What is in this raw image? Key colour, objects, pixel grid, and a size to try.
node tools/art/pixelize.mjs inspect art/raw/parrot/take-03.png
node tools/art/pixelize.mjs inspect "art/raw/prop sheet 2.png" --key "#0000ff"   # quote paths with spaces

# Build everything in the config into art/sprites and update sprites.json.
node tools/art/pixelize.mjs build
node tools/art/pixelize.mjs build --only parrot,character     # just these ids
node tools/art/pixelize.mjs build --out art/raw/try           # somewhere else, to look before committing
node tools/art/pixelize.mjs build --strict                    # warnings become errors; nothing is written

# Verify a sprite folder against the contract below.
node tools/art/pixelize.mjs check
node tools/art/pixelize.mjs check --dir art/raw/try

# A quick look at sprites in place: every config entry with a "pos", on a flat sky and lawn.
node tools/art/pixelize.mjs compose --staging creative --scale 6        # art/raw/preview-creative.png
node tools/art/pixelize.mjs compose --staging tech --scale 6 --out art/raw/tech.png

# The palette: a swatch sheet, files for paint programs, and how well an image fits.
node tools/art/pixelize.mjs palette --swatch                  # art/palette-swatch.png
node tools/art/pixelize.mjs palette --export hex,gpl,act      # art/palette.hex (Aseprite), .gpl (GIMP, Krita), .act (Photoshop)
node tools/art/pixelize.mjs palette --fit art/raw/keyart/creative-01.png
```

`build` and `check` exit with status 1 on any error, so they can gate a commit. `build` writes nothing unless every asset came through: one error, or one warning under `--strict`, and the sprite folder is left as it was.

## Before generating

What to ask the image tool for, so the clean-up has something it can work with.

- **Background.** Flat magenta `#ff00ff` for almost everything: no palette colour is near it. Pure blue `#0000ff` for pink and purple subjects (the blossom canopy, petals), because generated pinks wander towards magenta. Not blue for anything navy: `blueviolet`, the colour of the character's sweater, sits close to a blue key, and `build` warns when an asset that may use it is keyed on blue. Never green (the parrot, the lawn), white, grey or black (parchment, marble, outlines). A real transparent PNG is as good as a key colour and is detected by itself.
- **Say in the prompt:** one flat solid background colour, no shadow, no ground, no glow, no gradient, no text; the whole subject inside the frame with a margin around it; hard pixel edges.
- **Resolution.** At least 12 raw pixels per art pixel, 16 to 24 if the tool allows. A 50-pixel-wide character should fill most of a 1024 px image. Below about 7 the result needs repainting. Take PNG over JPEG or WebP when offered.
- **One object per image,** or a sheet with clear gaps: objects closer than 3% of the image's longer side are taken for one object.
- **Choosing `size`.** `size` is not the size you want; it is the number of art pixels the generated subject really has, counted over its own tight box. Run `inspect` and use what it suggests when both grid lines report a strength of 0.6 or more. If that is not the size the scene needs, regenerate (ask for "a 52 by 50 pixel sprite"): forcing another `size` resamples the art into mush, and `build` warns when it can tell.

## The sprite contract

- `sprites/<id>.png` is used by both stagings. `sprites/<id>.creative.png` and `sprites/<id>.tech.png` are for one staging each. A staging file is shown in place of the shared one, so `cat.creative.png` beside `cat.png` means: creative has its own cat, tech uses the shared one.
- An id is lowercase letters, digits and dashes.
- A PNG is one frame, or equal-width frames side by side.
- One image pixel is one art pixel. Alpha is 0 or 255. Every opaque pixel is a palette colour.
- `sprites/sprites.json` has one line per sprite, under the file's name without `.png`:

  ```json
  "parrot.creative": { "frames": 4, "anchor": [6, 10], "points": { "eye": [10, 2] }, "emissive": false, "source": "generated" }
  ```

  `anchor` is the spot placed at the layer's position, and `points` are named spots other things attach to. Both are in pixels within one frame, from the top-left, and may sit on the frame's edge: `[0, h]` is the bottom-left corner, the usual anchor for something standing on the ground. `emissive` marks things that glow. `source` is `greybox` (placeholder), `generated` (made by this tool) or `override` (a hand repaint).
- A file with no line of its own uses the line of its id (`cat.tech.png` falls back to `"cat"`).

`build` only changes the lines of the ids it builds. When a new sprite makes an old file of the same id unreachable (a shared file once both stagings have their own, or staging files nothing in the config asks for once a shared file arrives), `build` removes that file and says so. The old line stays, as a copy of the new one, because `scripts/make-greybox.mjs` redraws every name whose line does not say `generated` or `override`. A file that has no line in `sprites.json` was put there by hand; `build` stops with an error rather than remove it.

## The pipeline

Each asset in the config goes through these steps.

1. **Load** the raw image.
2. **Key.** Find the flat background colour from the image border (or take it from the config) and mark everything else as subject. `"auto"` only takes a colour that fills three quarters of the border, so a plate with a flat sky is not mistaken for a sprite on a background; when it finds none it warns and uses the whole image. A shadow on the key, which is the key colour darkened, counts as key. Pixels on the subject's rim are a blend of both colours; they take the colour of the pixel just inside them (despill).
3. **Split.** For a sheet of several objects, take the asset's `cell`, or its numbered `component`.
4. **Grid.** The box around the subject becomes the sprite, and `size` says how many art pixels it holds. The lines between them are then moved onto the art's own pixel edges (`"grid": "snap"`), because generated art drifts: its pixels are not all the same size and an even grid slides off them. If the art's own grid is clear and gives a different count than `size`, `build` warns. The grid is measured to about 3%, so one pixel out in ten is caught and one in fifty is not.
5. **Downscale.** Each art pixel takes the most common palette colour in the middle 60% of its cell (`"mode"`). The middle is where a fake pixel is flat, and a vote cannot invent an in-between colour the way an average does.
6. **Quantise** to the nearest colour in OKLab, restricted to the asset's `ramps`, so a parrot cannot borrow grass green.
7. **Alpha.** A cell is opaque if at least half of it is subject (`cover`).
8. **Despeckle** (off by default). Lone pixels take the majority of their neighbours.
9. **Outline** (off by default). `ink` or `selout`.
10. **Trim** to the art, moving the anchor and points along.
11. **Rig.** Build animation frames from the one clean frame by small pixel edits.
12. **Grade.** A sprite shared by both stagings that does not glow also gets a dusk version: every pixel takes one step through the palette's `duskSwap`. The pair is written as `<id>.creative.png` and `<id>.tech.png`. If the swap changes nothing, one `<id>.png` is written. A sprite with a `staging`, or marked `emissive`, is written as it is.
13. **Write** the PNGs and update `sprites.json`.
14. **Self-check.** Every file is read back and held to the contract.

## Config

```json
{
  "palette": "art/palette.json",
  "out": "art/sprites",
  "overrides": "art/overrides",
  "assets": [
    {
      "id": "parrot",
      "staging": "creative",
      "src": "art/raw/parrot/take-03.png",
      "size": [14, 10],
      "ramps": ["bird", "red", "ink"],
      "anchor": [6, 10],
      "points": { "eye": [10, 2] },
      "pos": [143, 134],
      "frames": [
        { "name": "idle", "ops": [] },
        { "name": "blink", "ops": [{ "recolor": { "ink": "ringneck" }, "in": [10, 2, 1, 1] }] }
      ]
    }
  ],
  "pixelmaps": {}
}
```

| Field | Meaning | Default |
|---|---|---|
| `id` | The sprite's id. | required |
| `staging` | `"creative"`, `"tech"`, or `null` for both. An id may appear once with `null`, or once per staging. | `null` |
| `src` | The raw image. Not needed when a repaint exists in `overrides/`. | |
| `size` | `[w, h]` of the finished sprite in art pixels: how many pixels the subject's own box holds. `inspect` suggests it. | required |
| `key` | `"auto"` (from the border; a transparent background is found the same way), `"#rrggbb"`, `"alpha"` (the image is already transparent) or `"none"` (a full plate, no background). | `"auto"` |
| `tolerance` | How far from the key a pixel may be and still count as key, in OKLab. Raise it if a halo survives, lower it if the subject is eaten. | `0.1` |
| `shadow` | How dark a shadow on the key may get and still count as key: `1` allows none, lower allows darker. Try `0.5` when a drop shadow comes out as a dark smear. | `0.75` |
| `cell` | `[x0, y0, x1, y1]` as fractions of the image: the part of a sheet this asset is in. `inspect` prints one per object. | whole image |
| `component` | Instead of `cell`: the object's number on the sheet, in reading order from 0. | |
| `grid` | `"snap"` follows the art's own pixel edges. `"even"` spaces the lines evenly and does not look at the art's grid at all. | `"snap"`; `"even"` with `dither` |
| `downscale` | `"mode"`, `"center"` (the one pixel in the middle of each cell) or `"box"` (the cell's average; for smooth plates). | `"mode"`; `"box"` with `dither` |
| `cover` | The share of a cell that must be subject for its pixel to be opaque. Lower it (`0.25`) to keep lines the art drew thinner than its own pixels, such as a kite string. | `0.5` |
| `ramps` | The palette ramps this asset may use. | all colours |
| `dither` | `"bayer4"` for a smooth sky or plate that was not drawn as pixel art. Never for sprites. | `"none"` |
| `despeckle` | `1` fixes lone pixels that are only a shade off their surroundings. `2` fixes every lone pixel, and with it eyes and glints. | `0` |
| `outline` | `"ink"` turns the sprite's edge pixels ink. `"selout"` turns each into the darkest shade of its own ramp; an edge that is already ink takes the shade of the colour inside it. | `"none"` |
| `anchor`, `points` | In art pixels within `size`. | `[0, 0]`, none |
| `emissive` | The sprite glows. No dusk version is written here. For a shared sprite the atlas packer (`scripts/pack-atlas.mjs`) then makes one that holds the palette's `emissive` colours and steps the rest down, so a lantern's flame stays lit while its brass darkens. A glow painted in any other colour will dim. | `false` |
| `pos` | Where `compose` puts the anchor, in camera pixels (320 x 180). Preview only. | not drawn |
| `frames` | The animation frames, each the clean frame plus `ops`. Without it the sprite is one frame. | one frame |

A field the tool does not know, or one of the wrong shape, is an error: a misspelt `ramps` would otherwise quietly allow every colour.

### Warnings

A warning means the sprite was built but probably not as meant. With `--strict` each one is an error.

| Warning | What to do |
|---|---|
| only N% of the border is one colour | `"auto"` found no background. Set `"key": "none"` for a plate, or give the key as `"#rrggbb"`. |
| the key is close to (colours) | The background is too near colours the asset uses; those parts get holes. Regenerate on another key, or list fewer `ramps`. |
| the art's own pixels are N px wide, which makes it M wide | `size` disagrees with the art. Use the size `inspect` suggests. It also appears when a shadow or a stray object has widened the subject's box. |
| the art touches the (side) edge of its "cell" | The cell cuts through the object or includes a piece of its neighbour. Use the cell `inspect` prints. |
| trimmed from A to B | Rows or columns at the edge came out empty, often a thin detail that was lost (see `cover`). |
| (override) is not used | A repaint has no asset of that name in the config. |

### Sheets

One image with several objects on it feeds several assets. Run `inspect` on it: it numbers the objects in reading order and prints a `cell` for each. Give every asset the same `src` and its own `cell` (or `component`), `size` and `ramps`. Parts closer together than 3% of the image's longer side count as one object, so steam stays with its cup; objects need a wider gap than that between them. Two objects that nearly touch are counted as one and shift the numbering, so give those a `cell` each.

### Frame ops

Coordinates are art pixels in the untrimmed frame. A frame with no ops is the clean frame.

```json
{ "shift": [8, 0, 6, 4], "by": [0, 1], "fill": "leaf" }
{ "recolor": { "ink": "ringneck" }, "in": [10, 2, 1, 1] }
{ "overlay": "hat", "at": [8, 0] }
```

- `shift` moves a rectangle `[x, y, w, h]` by `[dx, dy]`. What it leaves behind becomes `fill`, or transparent.
- `recolor` changes colours, all at once, so `{ "a": "b", "b": "a" }` swaps two. `in` limits it to a rectangle. The name `clear` means transparent.
- `overlay` stamps a pixel map (the name of one in `pixelmaps`, or `{ "legend", "rows" }` in place) with its top-left corner at `at`. Its transparent pixels leave the frame alone; a legend entry of `"clear"` erases.

### Overrides

Paint over a sprite at art resolution, with the exported palette loaded, and save it as `overrides/<id>.png` (or `overrides/<id>.creative.png` for an asset with a staging). It replaces steps 1 to 9; the rest of the pipeline (frames, trim, dusk version) still runs, and the sprite is recorded with `"source": "override"`. The image must be the asset's `size`. A pixel that is not exactly a palette colour is snapped to the nearest allowed one, with a warning. A repaint only takes effect through an asset of the same name in the config; `build` warns about one that has none.

### Pixel maps

Sprites too small to be worth generating are drawn in the config. A pixel map is named like the sprite it becomes (`flame`, `leaf.tech`).

```json
"glint.tech": {
  "legend": { "s": "moonstone", "m": "moonlight" },
  "emissive": true,
  "anchor": [1, 1],
  "frames": [
    ["...", ".s.", "..."],
    [".s.", "sms", ".s."]
  ]
}
```

`.` is transparent. Use `"rows"` instead of `"frames"` for a single frame. A pixel map takes `anchor`, `points`, `emissive` and `pos` like an asset, and is written exactly as drawn.

The shipped config has `petal.creative` (three shapes, one per frame), `leaf.tech`, `flame`, `glint.creative`, `glint.tech`, `firefly.tech` and `font`. `font` is a 3x5 pixel font, one frame per character, in the order `abcdefghijklmnopqrstuvwxyz0123456789`. It is parchment, which is not a glow colour, so it is graded like any shared sprite: `font.creative.png` in parchment and `font.tech.png` in moonlight. The swatch sheet is labelled with it.

## Adding a generated sprite

1. Put the raw image under `art/raw/`. Generate on flat magenta `#ff00ff`, or pure blue `#0000ff` for pink subjects.
2. `inspect` it. Check that the key colour is right and note the suggested `size`.
3. Add the asset to `art.config.json` with that `size` and the `ramps` it should use.
4. `build --only <id> --out art/raw/try`, then look at the PNG enlarged. Adjust `size` if `build` warns that the art has a different number of pixels, and `ramps` if a colour comes out wrong.
5. `build`, `compose` for both stagings, `check`, then `npm run art:atlas` so the site picks it up.
6. If a few pixels are still wrong, repaint them into `overrides/` rather than fighting the settings.

## Tests

No real art exists yet, so the tool is tested on synthetic inputs with known answers:

```bash
node tools/art/test-fixtures.mjs          # exits 1 if recovery drops below 97%
```

`make-fixtures.mjs` draws small true pixel-art sprites (a parrot, a seated figure, a sheet of six props, a blossom sprig) and damages them the way image models do: enlarged by an awkward factor (21.3x, 17.7x, 12.6x), off the grid, the grid itself stretching and squeezing by about 5%, each fake pixel a little off-colour, blurred, noisy, saved as JPEG at quality 85, on magenta (or blue) with soft edges and a faint shadow. The test then runs the real `build` and counts the pixels that come back exactly as drawn.

Measured on 2026-10-01 (share of pixels with exactly the right colour and transparency):

| Fixture | Size | `mode` + `snap` (default) | even grid | `center` | `box` |
|---|---|---|---|---|---|
| Seated figure, 21.3x | 50x47 | 100% | 93.6% | 100% | 98.5% |
| Parrot, 21.3x | 14x10 | 100% | 100% | 100% | 97.9% |
| Blossom on blue, 12.6x | 9x10 | 100% | 100% | 100% | 98.9% |
| Six props on one sheet, 17.7x | 9x12 to 20x5 | 100% each | 100% each | 100% each | 94.4% to 100% |
| Parrot, tiny: 6.3x | 14x10 | 98.6% | 98.6% | 98.6% | 78.6% |
| Figure, rough: 13.7x, blur 2.2, JPEG 60, twice the colour drift and noise | 50x47 | 98.3% | 93.7% | 97.5% | 93.0% |
| All pixels | | 99.3% | 94.9% | 99.0% | 95.8% |

What the numbers say:

- Following the art's grid is what matters most on anything large. An even grid loses 6% of the figure to drift; snapping loses none.
- `box` (averaging) is the worst choice for sprites, as expected. It is there for plates.
- `despeckle: 1` did not help on these inputs (99.1% overall, against 99.3% without) because it also removes real one-pixel highlights. It is off by default.
- Despill makes no difference to `mode` or `center`, which never look at a cell's rim. It is what keeps `box` usable: without it `box` drops from 95.8% to about 94%.

The test ends by breaking three fixture assets on purpose (a `size` one pixel too wide, a `cell` that takes in part of the next object, a key colour the subject is made of) and fails unless `build` warns about each.

### Harder inputs

A second set of inputs, made to break the tool rather than to resemble a good generation, was run once by hand on 2026-10-01. They are not part of `test-fixtures.mjs`. Exact pixels recovered with default settings unless a setting is named:

| Input | Result |
|---|---|
| A different scale on each axis (figure at 19.4 x 14.2, parrot at 11.3 x 17.9) | 100% |
| 320x180 plate with a dithered sky at 6x, no key colour | 100% with `"key": "none"`; left on `"auto"` it warns and gives the same result |
| The same plate with a flat dusk sky | 100%, with a warning. Before `"auto"` asked for three quarters of the border it took the sky for a key and cut out half the plate without a word |
| Pink blossom with no outline, on magenta and on blue | 100% on both |
| Sheet with two objects 1.2 art pixels apart | 100% with a `cell` each; `component` counts the two as one |
| Soft drop shadow at 45% | 100% |
| Drop shadow at 80% | 72%, warned (the shadow widens the box); 94% with `"shadow": 0.5` |
| Transparent PNG with soft edges and a 40% shadow | 100% |
| Sprite in neighbouring darks (ink, plum, umber, indigo) | 100%; 2 of 112 pixels wrong at JPEG 60 with heavier blur |
| 9x8 sprite at 23x, at 12x (PNG) and at 7.4x (WebP) | 100% |
| Kite with a one-pixel string | 100% |
| Kite whose string is drawn 0.4 of a pixel wide | string lost, warned (`trimmed`); 100% with `"cover": 0.25` |
| White, grey checkerboard and graded-magenta backgrounds, green subject | 100% here, because the subject has no light colours; `inspect` flags white as close to eighteen palette colours |
| The kite rotated by 1.5 degrees | 100% |
| 16-bit, indexed, CMYK and Display P3 files | 100% (colour profiles are not applied) |

## Known limits

- **Colours closer than the art's drift.** The rough figure's 39 misses (of 2350 pixels) are almost all dark neighbours: ink, plum and indigo are 0.05 to 0.08 apart in OKLab, and a fake pixel whose colour is that far off reads as its neighbour. Listing fewer ramps for an asset removes the confusion at its source.
- **Tiny art pixels.** Below about 7 raw px per art pixel, blur reaches the middle of every cell and the subject's box is only good to the nearest pixel. The 6.3x test gets 2 of its 140 pixels wrong. Ask the image tool for at least 12 px per art pixel.
- **`size` is trusted.** The tool cannot know how many pixels the artist meant. It warns when the art's own grid clearly disagrees, which catches one pixel out in sixteen or fewer; in a sprite fifty wide a `size` that is one out goes through, with one column or row doubled or lost. Use the size `inspect` suggests.
- **Shadows.** A faint shadow on the key is removed. A dark one becomes part of the sprite and stretches its box, so everything lands on the wrong grid. `"shadow": 0.5` removes most of it; where the shadow meets the subject a few dark pixels stay. A translucent shadow in a transparent PNG is kept once it is more than half opaque. Ask for no shadow.
- **Detail finer than the art's pixels.** A line drawn thinner than the grid covers less than half of each cell and is dropped. `cover` brings it back, at the price of a slightly fatter silhouette. Parts of one image drawn at a different pixel size, or a grid that is rotated or in perspective by more than a degree or two, are not handled; neither has been tested.
- **The key is a colour, not a shape.** Anything in the subject that is the key colour becomes a hole, wherever it is. That is why the background must be far from every colour the subject uses, and why `build` warns when it is not.
- **Plates need as many raw pixels as sprites do.** The 400x200 world at 6 px per art pixel is a 2400 px image, more than most tools give. Generate the scene as its layers, each at full density.
- **Heavy JPEG.** At quality 60, JPEG's own 8 px blocks can be mistaken for the art's grid by `inspect`; it then reports a low strength and says the size is a guess. `build` ignores a low-strength reading.
- **Things the art never had.** Anti-aliased curves, in-between colours and inconsistent shading in the generated image are cleaned to the nearest palette colour, not redrawn. That is what `overrides/` is for.
- **Entries nothing builds any more.** Removing an asset from the config leaves its sprite and its `sprites.json` line in place. Delete both by hand.
- **`compose` is a preview.** Flat sky, flat lawn, first frame only, no parallax, and a shared `emissive` sprite is shown as it is by day. The hero engine is the real renderer.
