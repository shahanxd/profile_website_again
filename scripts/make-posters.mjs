// Composes one still of the garden per staging: public/art/poster-creative.png
// and poster-tech.png. The page shows these before the engine has loaded, and
// keeps them where the engine cannot run.
//
// Nothing about the layout is repeated here. The script loads the same
// manifest, the same staging code and the same backdrop code as the engine
// (Node runs the TypeScript files directly) and paints the engine's own
// instance list for time 0 with the pointer at rest and nothing in the air.
// That is the engine's still frame, and its first frame but for the
// particles, so the canvas can replace the poster without anything moving.
//
// Run after pack-atlas: it reads public/art/atlas.png and atlas.json.
import sharp from 'sharp';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { backdropStrip, BAYER8, STRIP_WIDTH } from '../src/hero/engine/backdrop.ts';
import { buildStage, inLight, INSTANCE_SIZE, LIGHT_SIZE, writeInstances, writeLight } from '../src/hero/engine/stage.ts';
import { framing } from '../src/hero/scene/framing.ts';
import { scene } from '../src/hero/scene/manifest.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const artDir = path.join(root, 'public', 'art');

const atlas = JSON.parse(await readFile(path.join(artDir, 'atlas.json'), 'utf8'));
const { data: texels } = await sharp(path.join(artDir, 'atlas.png')).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const atlasWidth = atlas.size[0];

const width = framing.world[0];
const { top, height } = framing.poster;

for (const split of ['creative', 'tech']) {
  const out = Buffer.alloc(width * height * 3);

  // sky and ground, exactly as the backdrop shader reads the strip
  const strip = backdropStrip(scene.backdrop[split], atlas.colors);
  for (let y = 0; y < height; y++) {
    const row = Math.min(Math.max(top + y - strip.top, 0), strip.height - 1);
    for (let x = 0; x < width; x++) {
      const from = (row * STRIP_WIDTH + (x & 7)) * 4;
      out.set(strip.pixels.subarray(from, from + 3), (y * width + x) * 3);
    }
  }

  // sprites, back to front, as the sprite shader draws them: where lamplight
  // falls, a sprite shows its daylight texel instead
  const stage = buildStage(scene, split, atlas);
  if (stage.missing.length) throw new Error(`poster-${split}: no sprite for ${stage.missing.join(', ')}`);
  const instances = new Int16Array(stage.capacity * INSTANCE_SIZE);
  const light = new Int32Array(LIGHT_SIZE);
  const count = writeInstances(stage, 0, [0, 0], [0, top], instances);
  writeLight(stage, 0, [0, 0], [0, top], light);
  for (let i = 0; i < count; i++) {
    const [dx, dy, w, h, u, v, dayU, dayV] = instances.subarray(i * INSTANCE_SIZE, (i + 1) * INSTANCE_SIZE);
    for (let y = Math.max(0, -dy); y < h && dy + y < height; y++) {
      for (let x = Math.max(0, -dx); x < w && dx + x < width; x++) {
        const px = dx + x;
        const py = dy + y;
        const lit = inLight(light, px, py, BAYER8[((py - light[1]) & 7) * 8 + ((px - light[0]) & 7)]);
        const from = (((lit ? dayV : v) + y) * atlasWidth + (lit ? dayU : u) + x) * 4;
        if (texels[from + 3] < 128) continue;
        out.set(texels.subarray(from, from + 3), (py * width + px) * 3);
      }
    }
  }

  const file = path.join(artDir, `poster-${split}.png`);
  const { size } = await sharp(out, { raw: { width, height, channels: 3 } }).png({ compressionLevel: 9 }).toFile(file);
  console.log(`poster-${split}.png: ${width}x${height}, ${count} sprites, ${(size / 1024).toFixed(1)} kB`);
}
