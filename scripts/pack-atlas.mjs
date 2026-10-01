// Packs every sprite in art/sprites into one image the hero engine loads:
// public/art/atlas.png and public/art/atlas.json. The json holds where each
// sprite sits in the image, its frame count, anchor and named points and, for
// the painted scene's sprites, where the art places it in the world ("at").
//
// Keys are "<id>", "<id>.creative" and "<id>.tech". A sprite with no staging
// suffix is shown in both stagings as it is; the engine asks for
// "<id>.<staging>" first and falls back to "<id>".
//
// Every pixel is checked on the way in: alpha is all or nothing, and the
// colour is one of the palette the sprite belongs to. The painted scene's
// sprites (source "scene") belong to the palette fitted to their staging, in
// art/scene/<staging>/layout.json; the rest belong to art/palette.json.
import sharp from 'sharp';
import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const spriteDir = path.join(root, 'art', 'sprites');
const outDir = path.join(root, 'public', 'art');
// Two plates, or two lawns, side by side.
const ATLAS_WIDTH = 704;

const meta = JSON.parse(await readFile(path.join(spriteDir, 'sprites.json'), 'utf8'));

const toInt = (hex) => parseInt(hex.slice(1), 16);
const readJson = async (...parts) => JSON.parse(await readFile(path.join(root, ...parts), 'utf8'));
const master = new Set(Object.values((await readJson('art', 'palette.json')).colors).map(toInt));
const fitted = {};
for (const staging of ['creative', 'tech']) {
  fitted[staging] = new Set((await readJson('art', 'scene', staging, 'layout.json')).palette.map(toInt));
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
  const palette = about.source === 'scene' ? fitted[key.split('.')[1]] : master;
  if (!palette) {
    problems.push(`${file}: a scene sprite must be named for its staging`);
    continue;
  }
  let offPalette = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] !== 0 && data[i + 3] !== 255) {
      problems.push(`${file}: alpha must be fully clear or fully solid`);
      break;
    }
    if (data[i + 3] && !palette.has((data[i] << 16) | (data[i + 1] << 8) | data[i + 2])) offPalette++;
  }
  if (offPalette) problems.push(`${file}: ${offPalette} pixels are not colours of its palette`);
  sprites.set(key, {
    data,
    width: info.width,
    w: info.width / frames,
    h: info.height,
    frames,
    anchor: about.anchor ?? [0, 0],
    points: about.points ?? {},
    at: about.at,
  });
}

if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
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
  const { x, y, w, h, frames, anchor, points, at } = sprites.get(key);
  return `    ${JSON.stringify(key)}: ${flat({ x, y, w, h, frames, anchor, points, ...(at && { at }) })}`;
});

// The version changes whenever a pixel or a number does; the engine adds it to
// the image address so a browser never pairs a new json with an old image.
const version = createHash('sha1').update(atlas).update(rows.join('\n')).digest('hex').slice(0, 10);

const json = `{
  "version": ${JSON.stringify(version)},
  "size": [${ATLAS_WIDTH}, ${height}],
  "sprites": {
${rows.join(',\n')}
  }
}
`;

// The two fitted palettes and the master palette come to fewer than 256 colours between them, so the image
// is written with a colour table: the same pixels in about three quarters of the bytes. Should the colours
// ever outgrow a table, the encoder would start merging them; that is checked for, and the image is then
// written in full colour instead.
const raw = sharp(atlas, { raw: { width: ATLAS_WIDTH, height, channels: 4 } });
let png = await raw.clone().png({ compressionLevel: 9, palette: true, colours: 256, dither: 0, effort: 10 }).toBuffer();
const decoded = await sharp(png).ensureAlpha().raw().toBuffer();
let exact = true;
for (let i = 0; exact && i < atlas.length; i += 4) {
  exact = atlas[i + 3] === decoded[i + 3] && (atlas[i + 3] === 0 || (atlas[i] === decoded[i] && atlas[i + 1] === decoded[i + 1] && atlas[i + 2] === decoded[i + 2]));
}
if (!exact) png = await raw.png({ compressionLevel: 9 }).toBuffer();

await mkdir(outDir, { recursive: true });
await writeFile(path.join(outDir, 'atlas.png'), png);
await writeFile(path.join(outDir, 'atlas.json'), json);
console.log(
  `atlas: ${sprites.size} sprites in ${ATLAS_WIDTH}x${height}, ${(png.length / 1024).toFixed(1)} kB${exact ? '' : ' (full colour: too many colours for a table)'}, version ${version}`,
);
