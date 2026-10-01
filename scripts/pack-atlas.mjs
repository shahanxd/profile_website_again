// Packs every sprite in art/sprites into one image the hero engine loads:
// public/art/atlas.png and public/art/atlas.json. The json holds where each
// sprite sits, its frame count, anchor and named points, and the palette.
//
// Keys are "<id>", "<id>.creative" and "<id>.tech". A sprite with no staging
// suffix is shown in both stagings; unless a hand-made .tech file exists, its
// dusk form is baked here by stepping every pixel through the palette's
// duskSwap table and stored as "<id>.tech". The engine asks for
// "<id>.<staging>" first and falls back to "<id>".
import sharp from 'sharp';
import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const spriteDir = path.join(root, 'art', 'sprites');
const outDir = path.join(root, 'public', 'art');
const ATLAS_WIDTH = 512;

const palette = JSON.parse(await readFile(path.join(root, 'art', 'palette.json'), 'utf8'));
const meta = JSON.parse(await readFile(path.join(spriteDir, 'sprites.json'), 'utf8'));

const toInt = (hex) => parseInt(hex.slice(1), 16);
const nameOf = new Map(Object.entries(palette.colors).map(([name, hex]) => [toInt(hex), name]));

/** The colour a pixel takes at dusk. Glowing colours hold on sprites marked emissive. */
function duskColour(rgb, emissive) {
  const name = nameOf.get(rgb);
  if (!name || (emissive && palette.emissive.includes(name))) return rgb;
  return toInt(palette.colors[palette.duskSwap[name] ?? name]);
}

function atDusk(sprite) {
  const data = Buffer.from(sprite.data);
  let changed = false;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;
    const before = (data[i] << 16) | (data[i + 1] << 8) | data[i + 2];
    const after = duskColour(before, sprite.emissive);
    if (after === before) continue;
    data[i] = after >> 16;
    data[i + 1] = (after >> 8) & 255;
    data[i + 2] = after & 255;
    changed = true;
  }
  return changed ? { ...sprite, data } : null;
}

// ----------------------------------------------------------------------- read

const files = (await readdir(spriteDir)).filter((name) => name.endsWith('.png')).sort();
const sprites = new Map();
const problems = [];

for (const file of files) {
  const key = file.slice(0, -4);
  if (!/^[a-z0-9-]+(\.(creative|tech))?$/.test(key)) {
    problems.push(`${file}: names are lowercase letters, digits and dashes, plus an optional .creative or .tech`);
    continue;
  }
  const { data, info } = await sharp(path.join(spriteDir, file)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const about = meta[key] ?? meta[key.split('.')[0]] ?? {};
  const frames = about.frames ?? 1;
  if (info.width % frames) problems.push(`${file}: ${info.width} px wide does not divide into ${frames} frames`);
  let offPalette = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] !== 0 && data[i + 3] !== 255) {
      problems.push(`${file}: alpha must be fully clear or fully solid`);
      break;
    }
    if (data[i + 3] && !nameOf.has((data[i] << 16) | (data[i + 1] << 8) | data[i + 2])) offPalette++;
  }
  if (offPalette) problems.push(`${file}: ${offPalette} pixels are not palette colours`);
  sprites.set(key, {
    data,
    width: info.width,
    w: info.width / frames,
    h: info.height,
    frames,
    anchor: about.anchor ?? [0, 0],
    points: about.points ?? {},
    emissive: about.emissive ?? false,
  });
}

if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}

for (const [key, sprite] of [...sprites]) {
  if (key.includes('.') || sprites.has(`${key}.tech`)) continue;
  const dusk = atDusk(sprite);
  if (dusk) sprites.set(`${key}.tech`, dusk);
}

// ----------------------------------------------------------------------- pack
// Shelf packing: tallest first, left to right, a new row when one fills up.
// The order depends only on sizes and names, so the same sprites always give
// the same atlas.

const order = [...sprites.keys()].sort((a, b) => {
  const [p, q] = [sprites.get(a), sprites.get(b)];
  return q.h - p.h || q.width - p.width || (a < b ? -1 : 1);
});

let x = 0;
let y = 0;
let shelf = 0;
for (const key of order) {
  const sprite = sprites.get(key);
  if (sprite.width > ATLAS_WIDTH) throw new Error(`${key}: ${sprite.width} px is wider than the atlas`);
  if (x + sprite.width > ATLAS_WIDTH) {
    x = 0;
    y += shelf;
    shelf = 0;
  }
  sprite.x = x;
  sprite.y = y;
  x += sprite.width;
  shelf = Math.max(shelf, sprite.h);
}
const height = y + shelf;

const atlas = Buffer.alloc(ATLAS_WIDTH * height * 4);
for (const sprite of sprites.values()) {
  for (let row = 0; row < sprite.h; row++) {
    const from = row * sprite.width * 4;
    sprite.data.copy(atlas, ((sprite.y + row) * ATLAS_WIDTH + sprite.x) * 4, from, from + sprite.width * 4);
  }
}

// ---------------------------------------------------------------------- write

const flat = (v) => {
  if (Array.isArray(v)) return `[${v.map(flat).join(', ')}]`;
  if (!v || typeof v !== 'object') return JSON.stringify(v);
  const fields = Object.entries(v).map(([key, value]) => `${JSON.stringify(key)}: ${flat(value)}`);
  return fields.length ? `{ ${fields.join(', ')} }` : '{}';
};

const rows = [...sprites.keys()].sort().map((key) => {
  const { x, y, w, h, frames, anchor, points } = sprites.get(key);
  return `    ${JSON.stringify(key)}: ${flat({ x, y, w, h, frames, anchor, points })}`;
});

// The version changes whenever a pixel or a number does; the engine adds it to
// the image address so a browser never pairs a new json with an old image.
const version = createHash('sha1').update(atlas).update(rows.join('\n')).digest('hex').slice(0, 10);

const json = `{
  "version": ${JSON.stringify(version)},
  "size": [${ATLAS_WIDTH}, ${height}],
  "colors": ${flat(palette.colors)},
  "sprites": {
${rows.join(',\n')}
  }
}
`;

await mkdir(outDir, { recursive: true });
await sharp(atlas, { raw: { width: ATLAS_WIDTH, height, channels: 4 } })
  .png({ compressionLevel: 9 })
  .toFile(path.join(outDir, 'atlas.png'));
await writeFile(path.join(outDir, 'atlas.json'), json);
console.log(`atlas: ${sprites.size} sprites in ${ATLAS_WIDTH}x${height}, version ${version}`);
