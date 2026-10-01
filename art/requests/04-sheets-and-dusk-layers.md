# Request 04: the foreground sheet, and the three dusk layers

This replaces the open parts of requests 02 and 03: the separate dusk still is no longer needed (the dusk layers are made directly from the approved creative layers, so both sides line up exactly), and the foreground sheet is asked for again with a magenta background.

Four runs on **GPT Image 2.5**, about 32 credits. For all four: aspect ratio landscape 16:9, quality high, **background opaque**, format PNG. Drop the results in `art/raw/layers/` under any name; the agent files them.

Why magenta and not "transparent": the tree came back with a checkerboard painted into the image instead of real transparency. A flat magenta background is easy to remove cleanly.

| Run | Attach this file as the reference | What it makes |
|---|---|---|
| 1 | `art/raw/keyart/creative-v2.png` | creative foreground sheet |
| 2 | `art/raw/keyart/creative-v2.png` | dusk foreground sheet |
| 3 | `art/raw/layers/creative-plate.png` | dusk background |
| 4 | `art/raw/layers/creative-tree.png` | dusk tree (green) |

## Run 1: creative foreground sheet (attach creative-v2.png)

```
A sprite sheet in exactly the same pixel art style, pixel size and colours as the reference image, on a flat solid magenta (#FF00FF) background. It contains these things taken from the reference, each drawn exactly as it appears there and at the same scale as in the reference, arranged in a row with wide empty magenta gaps between them, nothing touching or overlapping: 1. the man sitting cross-legged, sketching on his tablet with a stylus (his whole figure, with nothing behind him); 2. the green ringneck parakeet standing; 3. the cat sitting; 4. the round brass tray with the coffee pot and the cup, without steam; 5. the octagonal inlaid side table with the upright tablet on it, the tablet screen plain dark; 6. the hanging brass lantern with its chain, unlit; 7. the two small kites. No ground, no shadows, no carpet, no grass, no sky, no text, no labels, no border. The background is one flat magenta colour everywhere.
```

## Run 2: dusk foreground sheet (attach creative-v2.png)

```
A sprite sheet in exactly the same pixel art style, pixel size and level of detail as the reference image, on a flat solid magenta (#FF00FF) background. It shows the same man and animals as in the reference, lit for early dusk: slightly darker and cooler overall, with warm lantern light from above. Arranged in a row with wide empty magenta gaps, nothing touching or overlapping, each at the same scale as in the reference: 1. the same man (short curly black hair, short beard, navy zip-neck sweater with a white collar, light blue jeans, white socks), seen from the side and facing right, leaning back with his legs stretched out in front of him, an open laptop on his lap, typing, the laptop screen lighting his face, and the green ringneck parakeet asleep and puffed up on his shoulder (his whole figure, with nothing behind him and no cushion); 2. the same cat curled up asleep; 3. the round brass tray holding a half-eaten plate of food and a steel tumbler; 4. the octagonal inlaid side table with the upright tablet on it, the tablet screen glowing softly; 5. the hanging brass lantern with its chain, lit and glowing warm; 6. a small four-wheeled robot rover with one tiny light. No ground, no shadows, no carpet, no grass, no sky, no text, no labels, no border. The background is one flat magenta colour everywhere.
```

## Run 3: dusk background (attach creative-plate.png)

```
Same scene, same camera, same composition, same pixel art style and pixel size as the reference image; every object stays exactly where it is. Change only the time of day to early dusk: a deep indigo sky with soft dithered clouds, a gibbous moon high on the right and a few stars, a thin warm afterglow along the horizon, no sun; everything slightly darker and cooler; a few lit windows in the distant skyline; a small warm lamp glowing inside the pavilion's centre arch; the water reflects the indigo sky and the moon; a warm pool of lantern light falls on the left part of the carpet and on the bolster cushion, as if from a lantern hanging above them. No people, no animals, no tree in the foreground, no kites, no text, no letters, no border.
```

## Run 4: dusk tree (attach creative-tree.png)

```
The same tree as in the reference image: identical trunk, roots, branches and overall shape, the same size and the same position in the frame, the same pixel art style and pixel size. Change only: the pink blossoms are replaced by dense green summer leaves (deep and mid greens with a few lighter highlights); early dusk lighting, slightly darker and cooler, with a warm glow on the underside of the main bough from a lantern hanging below it. Replace the checkerboard with one flat solid magenta (#FF00FF) background everywhere. Nothing else in the image: no lantern, no ground, no grass, no sky, no text, no border.
```

## Check before sending

- Sheets: separate things on flat magenta, none touching, none cut off at the edges.
- Dusk background: same garden, same carpet and bolster, at dusk, nothing added.
- Dusk tree: same tree shape, green, on flat magenta.

If a run clearly misses, run it once more. Small flaws are fine.
