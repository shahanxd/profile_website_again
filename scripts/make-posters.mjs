// Composes one still of the garden per staging: public/art/poster-creative.png
// and poster-tech.png. The page shows these before the engine has loaded, and
// keeps them where the engine cannot run.
//
// Nothing about the layout is repeated here. The script loads the same
// manifest and the same staging code as the engine (Node runs the TypeScript
// files directly) and paints the engine's own instance list for time 0 with
// the pointer at rest and nothing in the air. That is the engine's still
// frame, and its first frame but for the particles, so the canvas can replace
// the poster without anything moving.
//
// A poster covers the whole painted world and the lawn below it, so one image
// serves every screen shape.
//
// The page asks for a poster by its version (src/hero/scene/posters.ts, also
// written here: a hash of both images), so a browser or a cache that holds an
// older picture can never show it under a newer scene.
//
// Run after pack-atlas: it reads public/art/atlas.png and atlas.json.
import sharp from 'sharp';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { buildStage, INSTANCE_SIZE, writeInstances } from '../src/hero/engine/stage.ts';
import { framing } from '../src/hero/scene/framing.ts';
import { scene } from '../src/hero/scene/manifest.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const artDir = path.join(root, 'public', 'art');

const atlas = JSON.parse(await readFile(path.join(artDir, 'atlas.json'), 'utf8'));
const { data: texels } = await sharp(path.join(artDir, 'atlas.png')).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const atlasWidth = atlas.size[0];

const width = framing.world[0];
const height = framing.world[1] + framing.lawn;
const hash = createHash('sha1');

for (const split of ['creative', 'tech']) {
  const out = Buffer.alloc(width * height * 3);
  const painted = new Uint8Array(width * height);

  // sprites, back to front, as the sprite shader draws them
  const stage = buildStage(scene, split, atlas);
  if (stage.missing.length) throw new Error(`poster-${split}: no sprite for ${stage.missing.join(', ')}`);
  const instances = new Int16Array(stage.capacity * INSTANCE_SIZE);
  const count = writeInstances(stage, 0, [0, 0], [0, 0], instances);
  for (let i = 0; i < count; i++) {
    const [dx, dy, w, h, u, v] = instances.subarray(i * INSTANCE_SIZE, (i + 1) * INSTANCE_SIZE);
    for (let y = Math.max(0, -dy); y < h && dy + y < height; y++) {
      for (let x = Math.max(0, -dx); x < w && dx + x < width; x++) {
        const from = ((v + y) * atlasWidth + u + x) * 4;
        if (texels[from + 3] < 128) continue;
        out.set(texels.subarray(from, from + 3), ((dy + y) * width + dx + x) * 3);
        painted[(dy + y) * width + dx + x] = 1;
      }
    }
  }
  // The plate and the lawn must cover everything: the engine draws nothing behind them.
  const bare = painted.reduce((sum, done) => sum + 1 - done, 0);
  if (bare) throw new Error(`poster-${split}: ${bare} pixels are not covered by any sprite`);

  const file = path.join(artDir, `poster-${split}.png`);
  // Under 256 colours, so the file is written with a colour table: the same pixels, a third of the bytes.
  const { size } = await sharp(out, { raw: { width, height, channels: 3 } })
    .png({ compressionLevel: 9, palette: true, colours: 256, dither: 0, effort: 10 })
    .toFile(file);
  const check = await sharp(file).removeAlpha().raw().toBuffer();
  if (!check.equals(out)) throw new Error(`poster-${split}: the colour table changed pixels`);
  hash.update(await readFile(file));
  console.log(`poster-${split}.png: ${width}x${height}, ${count} sprites, ${(size / 1024).toFixed(1)} kB`);
}

const version = hash.digest('hex').slice(0, 10);
await writeFile(
  path.join(root, 'src', 'hero', 'scene', 'posters.ts'),
  `/** Written by scripts/make-posters.mjs: changes whenever a pixel of either poster does. The page adds it to their address. */
export const POSTER_VERSION = '${version}';
`,
);
console.log(`posters: version ${version}`);
