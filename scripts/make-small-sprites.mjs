// Draws the handful of sprites that are authored in code, not painted: the
// one-to-five-pixel things in the air and on the water (petals, steam,
// fireflies, moths, glints, a star's twinkle) and the cursor on the tablet.
// Each is a short strip of frames in colours of art/palette.json.
//
//   node scripts/make-small-sprites.mjs
//
// Everything else in art/sprites is the painted scene, brought in by
// import-scene.mjs. Where a sprite goes is decided in
// src/hero/scene/manifest.ts; this file only decides what each one looks like.
// A sprite whose sprites.json entry says "generated" or "override" (made by
// tools/art, or repainted by hand) is never touched here.
import sharp from 'sharp';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'art', 'sprites');
const palette = JSON.parse(await readFile(path.join(root, 'art', 'palette.json'), 'utf8'));

const sprites = new Map();

/** frames: lists of [x, y, colour name], one list per frame; a frame may be empty. */
function add(stem, w, h, frames, { anchor = [0, 0], emissive = false } = {}) {
  sprites.set(stem, { w, h, frames, anchor, emissive });
}

const cross = (core, arms) => [[1, 1, core], [1, 0, arms], [0, 1, arms], [2, 1, arms], [1, 2, arms]];

// A petal turns over as it falls.
add('petal.creative', 3, 3, [
  [[0, 1, 'blossomlt'], [1, 1, 'petal'], [1, 0, 'petal']],
  [[1, 0, 'blossomlt'], [1, 1, 'petal'], [1, 2, 'blossomlt']],
  [[1, 1, 'petal'], [2, 1, 'blossomlt'], [2, 2, 'petal']],
  [[0, 1, 'petal'], [1, 1, 'blossomlt'], [2, 1, 'petal']],
], { anchor: [1, 1] });

// Steam thins and greys over its frames; the engine plays the strip once per wisp.
add('steam.creative', 3, 5, [
  [[1, 4, 'parchment'], [1, 3, 'parchment']],
  [[1, 4, 'parchment'], [2, 3, 'marbleshade'], [1, 2, 'parchment']],
  [[0, 3, 'marbleshade'], [1, 1, 'marbleshade']],
  [[1, 2, 'marbleshade']],
], { anchor: [1, 5] });

// A firefly is dark until it glows: a point, a small cross, a point, and gone.
add('firefly.tech', 3, 3, [
  [],
  [[1, 1, 'sunlitgrass']],
  cross('cream', 'sunlitgrass'),
  cross('grasshi', 'sunlitgrass'),
  [[1, 1, 'sunlitgrass']],
], { anchor: [1, 1], emissive: true });

// A moth is two wing beats.
add('moth.tech', 3, 2, [
  [[0, 0, 'moonlight'], [2, 0, 'moonlight'], [1, 1, 'moonstone']],
  [[0, 1, 'moonlight'], [2, 1, 'moonlight'], [1, 1, 'moonstone']],
], { anchor: [1, 1] });

// Light on water: a point that flares into a small cross and goes.
add('glint.creative', 3, 3, [[[1, 1, 'gold']], cross('cream', 'gold'), [[1, 1, 'cream']]], { anchor: [1, 1], emissive: true });
add('glint.tech', 3, 3, [[[1, 1, 'moonstone']], cross('moonlight', 'moonstone'), [[1, 1, 'moonlight']]], { anchor: [1, 1], emissive: true });

// A star's twinkle, laid over a star painted in the sky: nothing at rest, then a brief small cross.
add('twinkle.tech', 3, 3, [[], [[1, 1, 'parchment']], cross('parchment', 'moonstone'), [[1, 1, 'parchment']]], { anchor: [1, 1], emissive: true });

// The cursor on the tablet's dark screen: on, then off.
add('cursor.creative', 1, 2, [[[0, 0, 'moonstone'], [0, 1, 'moonstone']], []]);

// ---------------------------------------------------------------------- write

const hexToRgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

async function writeSprite(stem, { w, h, frames }) {
  const data = Buffer.alloc(w * frames.length * h * 4);
  frames.forEach((pixels, f) => {
    for (const [x, y, name] of pixels) {
      if (!palette.colors[name]) throw new Error(`${stem}: "${name}" is not a palette colour`);
      if (x < 0 || y < 0 || x >= w || y >= h) throw new Error(`${stem}: (${x}, ${y}) is outside the ${w}x${h} frame`);
      data.set([...hexToRgb(palette.colors[name]), 255], (y * w * frames.length + f * w + x) * 4);
    }
  });
  await sharp(data, { raw: { width: w * frames.length, height: h, channels: 4 } })
    .png({ compressionLevel: 9 })
    .toFile(path.join(outDir, `${stem}.png`));
}

await mkdir(outDir, { recursive: true });
const metaPath = path.join(outDir, 'sprites.json');
let meta = {};
try {
  meta = JSON.parse(await readFile(metaPath, 'utf8'));
} catch {
  // first run: nothing to keep
}

// Sprites this script drew on an earlier run and no longer draws are removed with their entries.
const retired = [];
for (const [stem, entry] of Object.entries(meta)) {
  if (entry.source !== 'code' || sprites.has(stem)) continue;
  delete meta[stem];
  await rm(path.join(outDir, `${stem}.png`), { force: true });
  retired.push(stem);
}

let written = 0;
const kept = [];
for (const [stem, sprite] of sprites) {
  const source = meta[stem]?.source;
  if (source === 'generated' || source === 'override') {
    kept.push(stem);
    continue;
  }
  await writeSprite(stem, sprite);
  meta[stem] = { frames: sprite.frames.length, anchor: sprite.anchor, points: {}, emissive: sprite.emissive, source: 'code' };
  written++;
}

// One sprite per line, sorted, so the file is easy to scan and to diff.
const flat = (v) => {
  if (Array.isArray(v)) return `[${v.map(flat).join(', ')}]`;
  if (!v || typeof v !== 'object') return JSON.stringify(v);
  const fields = Object.entries(v).map(([key, value]) => `${JSON.stringify(key)}: ${flat(value)}`);
  return fields.length ? `{ ${fields.join(', ')} }` : '{}';
};
const rows = Object.keys(meta).sort().map((key) => `  ${JSON.stringify(key)}: ${flat(meta[key])}`);
await writeFile(metaPath, `{\n${rows.join(',\n')}\n}\n`);
console.log(
  `small sprites: wrote ${written} to art/sprites` +
    (kept.length ? `, left ${kept.join(', ')} alone` : '') +
    (retired.length ? `, retired ${retired.length} (${retired.join(', ')})` : ''),
);
