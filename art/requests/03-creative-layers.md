# Request 03: creative layers (cut the approved still into pieces)

The approved creative still is `art/raw/keyart/creative-v2.png`. To animate it and to swap things between the two sides, the site needs it as separate layers: a background with the tree and the foreground things removed, the tree on its own, and the foreground things on their own.

Three runs on **GPT Image 2.5**, about 24 credits. For **every** run attach `creative-v2.png` as the reference image. Aspect ratio landscape 16:9, quality high, format PNG. Download the original PNG.

## Run 1: background plate

- **Background setting:** opaque
- **Save as:** `art/raw/layers/creative-plate.png`

```
Redraw this exact scene with exactly the same pixel art style, palette, pixel size, lighting and composition. Keep exactly where they are: the sunset sky and clouds, the sun, the skyline, the garden wall, the cypress trees, the pavilion, the flower beds and hedges, the water channel, the pool and its fountain, the lawn with its long shadows, and the kilim carpet with its bolster cushion. Remove completely, and paint in what would be behind them: the cherry blossom tree (its trunk, branches and all blossoms), the hanging lantern, the man, the parakeet, the cat, the brass tray with the coffee, the side table with the tablet, the kites, and every petal in the air and on the grass. Where the tree stood there is only lawn, flower beds, cypress trees, garden wall, skyline and sky. The carpet is empty except for the bolster. No text, no letters, no logos, no border.
```

## Run 2: the tree alone

- **Background setting:** transparent
- **Save as:** `art/raw/layers/creative-tree.png`

```
From the reference image, draw ONLY the cherry blossom tree: its trunk, roots, branches and the whole blossom canopy, exactly as it is drawn in the reference, at the same size and in the same position in the frame, in the same pixel art style, pixel size and colours. Fully transparent background. Nothing else: no hanging lantern, no ground, no grass, no sky, no garden, no people, no animals, no loose petals in the air, no text, no border.
```

## Run 3: foreground things

- **Background setting:** transparent
- **Save as:** `art/raw/layers/creative-sheet.png`

```
A sprite sheet in exactly the same pixel art style, pixel size and colours as the reference image, on a fully transparent background. It contains these things taken from the reference, each drawn exactly as it appears there and at the same size as in the reference, arranged in a row with wide empty gaps between them, nothing touching or overlapping: 1. the man sitting cross-legged, sketching on his tablet with a stylus (his whole figure, with nothing behind him); 2. the green ringneck parakeet standing; 3. the cat sitting; 4. the round brass tray with the coffee pot and the cup, without steam; 5. the octagonal inlaid side table with the upright tablet on it, the tablet screen plain dark; 6. the hanging brass lantern with its chain, unlit; 7. the two small kites. No ground, no shadows, no carpet, no grass, no sky, no text, no labels, no border.
```

## Check before sending

- Plate: the tree, the man, the animals, the tray, the table and the kites are gone; everything else is where it was.
- Tree: only the tree, on transparency (a checkerboard in most viewers).
- Sheet: seven separate things on transparency, none cut off at the edges.

If a run misses (something left in, something cut off), run it once more. Small flaws are fine; the agent cleans edges and fixes pixels by hand.

## After this

Request 04 is the same three runs for the dusk still, once `tech-v1.png` exists and has been checked.
