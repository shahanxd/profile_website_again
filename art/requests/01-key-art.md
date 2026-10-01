# Request 01: creative key art (bake-off)

The owner runs these by hand in Weave's web app (app.weavy.ai) and saves the results into `art/raw/keyart/`. The folder is git-ignored; nothing here ships. The key art is the style reference for every later piece, so this round decides the look.

Run the **same prompt** on three models. Total: about 25 credits.

| # | Model in Weave | Settings | Save the result as |
|---|---|---|---|
| 1 | Nano Banana Pro | aspect ratio 16:9, resolution 1K | `art/raw/keyart/creative-nbpro.png` |
| 2 | GPT Image 2.5 | aspect ratio landscape 16:9, quality high, background opaque, format PNG | `art/raw/keyart/creative-gpt.png` |
| 3 | Nano Banana 2 | aspect ratio 16:9, resolution 1K | `art/raw/keyart/creative-nb2.png` |

No reference images for this round. Download the original file (PNG if offered), not a screenshot.

## Prompt (paste exactly)

```
Detailed 16-bit pixel art landscape illustration, wide side-on view, crisp chunky square pixels on a consistent grid, limited warm palette, ordered dithering in the sky, no anti-aliasing, no blur, no smooth gradients. A walled Mughal-Ottoman pleasure garden at golden hour. Left third: a large cherry blossom tree whose bough arches over the centre of the scene, an unlit pierced-brass lantern hanging from the bough. Under the bough on the lawn: a red and indigo Turkish kilim carpet with fringed ends spread on the grass like a mattress, with a striped bolster cushion; a young man with short curly black hair and a short beard, wearing a navy zip-neck sweater with a white shirt collar and light blue jeans, sitting cross-legged on the carpet, relaxed, sketching on a tablet with a stylus; a green Indian ringneck parakeet with a red beak perched beside him watching; a round brass tray with a small coffee pot and a cup of coffee with steam rising; a cat sitting at the corner of the carpet; a small tablet computer leaning upright on a low octagonal inlaid wooden side table. Right of centre in the middle distance: a small red sandstone garden pavilion with three cusped arches, deep eaves and a marble lattice railing; a narrow water channel running from it to a square pool with a small fountain; beds of tulips and roses; tall dark cypress trees. Far distance: a hazy flat-roofed old-city skyline with two small paper kites in the sky. Low sun near the horizon, long warm shadows, pink petals drifting in the air. Calm, lived-in, relaxing. No text, no letters, no calligraphy, no logos, no UI, no border, no frame, no mountain, no domes, no minarets.
```

## What happens next

Once the three files are in the folder, the agent looks at them at full size, recommends one (or asks for a second take with a changed prompt), and the owner signs off. Request 02 is then the dusk (tech) version, made by editing the approved image.
