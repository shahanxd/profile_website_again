# Art prompt log

Every generation is logged here: tool, settings, prompt, where the output went, and the verdict.

## Key art, creative

**Prompt K1** (used for every tool in the bake-off, 16:9):

> Detailed 16-bit pixel art landscape illustration, wide side-on view, crisp chunky square pixels on a consistent grid, limited warm palette, ordered dithering in the sky, no anti-aliasing, no blur, no smooth gradients. A walled Mughal-Ottoman pleasure garden at golden hour. Left third: a large cherry blossom tree whose bough arches over the centre of the scene, an unlit pierced-brass lantern hanging from the bough. Under the bough on the lawn: a red and indigo Turkish kilim carpet with fringed ends spread on the grass like a mattress, with a striped bolster cushion; a young man with short curly black hair and a short beard, wearing a navy zip-neck sweater with a white shirt collar and light blue jeans, sitting cross-legged on the carpet, relaxed, sketching on a tablet with a stylus; a green Indian ringneck parakeet with a red beak perched beside him watching; a round brass tray with a small coffee pot and a cup of coffee with steam rising; a cat sitting at the corner of the carpet; a small tablet computer leaning upright on a low octagonal inlaid wooden side table. Right of centre in the middle distance: a small red sandstone garden pavilion with three cusped arches, deep eaves and a marble lattice railing; a narrow water channel running from it to a square pool with a small fountain; beds of tulips and roses; tall dark cypress trees. Far distance: a hazy flat-roofed old-city skyline with two small paper kites in the sky. Low sun near the horizon, long warm shadows, pink petals drifting in the air. Calm, lived-in, relaxing. No text, no letters, no calligraphy, no logos, no UI, no border, no frame, no mountain, no domes, no minarets.

| # | Tool | Settings | Output | Verdict |
|---|---|---|---|---|
| 1 | Canva generate-image | LANDSCAPE_16_9 | Canva asset `MAHWvHzdNQ4` (1680x944 JPG, in the owner's Canva) | Composition matches the brief. Only a 200 px thumbnail reached the agent, so pixel quality is unjudged. |
| 2 | Weave: Nano Banana Pro | 16:9, 1K | not run by the owner | skipped |
| 3 | Weave: GPT Image 2.5 | landscape 16:9, high | `art/raw/keyart/creative-gpt.png` (1088x608) | **Winner.** Rich, detailed pixel art with a dithered sunset, close to the reference look. Reads well downscaled to 320x180. Needs open sky top right for the headline and a viewer-facing tablet. |
| 4 | Weave: Nano Banana 2 | 16:9, 1K | `art/raw/keyart/creative-nb2.png` (1376x768) | Cleaner and flatter, more cartoon illustration than pixel art; man reclining, not cross-legged. Not chosen. |

## Key art, refined creative and dusk

Prompts and settings are in `art/requests/02-key-art-refined-and-dusk.md` (GPT Image 2.5, editing from the previous image). Outputs: `creative-v2.png`, `tech-v1.png`.

| Step | Output | Verdict |
|---|---|---|
| A, refined creative | `art/raw/keyart/creative-v2.png` (1088x608) | **Approved as the creative hero still.** Open sky top right, pavilion lower, kites low, tablet upright facing the viewer. |
| B, dusk | not run | Superseded: dusk is made as layers (request 04). |

## Reduction test on creative-v2 (352x198, nearest)

- Fixed 48-colour master palette: mean OKLab error 0.043; visibly darker and muddier (olive lawn, noisy sky). Rejected for plates.
- Palette fitted to the image, 96 colours, no dither: indistinguishable from full colour at site scale. **Use this.**

## Creative layers

Prompts and settings are in `art/requests/03-creative-layers.md` (GPT Image 2.5 editing from creative-v2).

| Run | Output | Verdict |
|---|---|---|
| 1, plate | `art/raw/layers/creative-plate.png` | **Good.** Tree and foreground removed, garden filled in, carpet and bolster kept. It is a re-render, not pixel-identical to creative-v2 (mean RGB difference about 11 in the sky, 31 on the lawn), so cut-outs cannot be made by differencing; they must be generated separately. |
| 2, tree | `art/raw/layers/creative-tree.png` | **Good, with two fixes.** The file is opaque with a checkerboard painted in; it keys out cleanly (neutral and light pixels to transparent). The tree is drawn about 1.4x larger than in creative-v2, so it is scaled to about 0.72 from the top-left when composed. |
| 3, sheet | not received (the reference file was exported instead) | Re-requested in request 04 with a magenta background. |

## Foreground sheets and dusk layers

Prompts and settings are in `art/requests/04-sheets-and-dusk-layers.md`.

| Run | Output | Verdict |
|---|---|---|
| 1, creative sheet | `art/raw/layers/creative-sheet.png` | **Good.** Eight separate things on flat magenta (figure, parrot, cat, tray, table with tablet, lantern, two kites). Drawn at varying scale, so each is resized to its height in the approved still. |
| 2, dusk sheet | `art/raw/layers/tech-sheet.png` | **Good.** Six things (figure reclining with laptop and sleeping parrot, cat asleep, lunch tray, table with glowing tablet, lit lantern, rover). Needs the laptop logo painted out and its glow halos handled. |
| 3, dusk background | `art/raw/layers/tech-plate.png` | **Good.** Same garden at dusk: indigo sky, moon, stars, afterglow, lit windows, lamp in the pavilion, lantern light on the carpet. Geometry matches the creative plate. |
| 4, dusk tree | `art/raw/layers/tech-tree.png` | **Good, with one fix.** Same tree in green on flat magenta, but lit like daytime; shaded darker in the build script except near the lantern. |

Note: the owner's likeness came out right from the text description alone, so the photo has not been uploaded anywhere.
