// Builds everything the page below the hero draws with, from the scene's real
// layers in art/scene/ (already at art resolution, already on their palettes):
//
//   node scripts/build-section-art.mjs        (npm run art:sections)
//
// Output, all deterministic:
//   public/art/sections/<staging>/band.png      the garden without its owner, for the scene band
//   public/art/sections/<staging>/<sprite>.png  the cast as horizontal sprite strips
//   public/art/sections/<staging>/thumb-*.png   crops of the garden that stand in for work not supplied yet
//   public/art/sections/tiles/*.png             masks and patterns (ragged edges, seam, jali, kilim, arch, grain)
//   public/art/sections/index.json              what was made: sizes, frame counts, timings
//   src/content/sectionArt.ts                   the same index, typed, for the components
//   src/styles/dither.css                       the Bayer steps headings and blocks resolve through
//
// Frames are made by small pixel edits to the one clean pose (a row shifted by
// a pixel, a few pixels recoloured). Nothing is rotated, scaled or blended.
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sceneDir = path.join(root, 'art', 'scene');
const outDir = path.join(root, 'public', 'art', 'sections');

// --- pixels -----------------------------------------------------------------

const blank = (w, h) => ({ w, h, data: Buffer.alloc(w * h * 4) });
const clone = (img) => ({ w: img.w, h: img.h, data: Buffer.from(img.data) });
const inside = (img, x, y) => x >= 0 && y >= 0 && x < img.w && y < img.h;
const get = (img, x, y) => {
  const o = (y * img.w + x) * 4;
  return [img.data[o], img.data[o + 1], img.data[o + 2], img.data[o + 3]];
};
const put = (img, x, y, [r, g, b, a = 255]) => {
  if (!inside(img, x, y)) return;
  img.data.set([r, g, b, a], (y * img.w + x) * 4);
};
const solid = (img, x, y) => inside(img, x, y) && img.data[(y * img.w + x) * 4 + 3] >= 128;
const hex = (value) => [1, 3, 5].map((i) => parseInt(value.slice(i, i + 2), 16));
const luma = ([r, g, b]) => 0.299 * r + 0.587 * g + 0.114 * b;

async function load(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { w: info.width, h: info.height, data };
}

/** Draws src onto dst with hard alpha, as the hero does. */
function blit(dst, src, dx, dy) {
  for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) if (solid(src, x, y)) put(dst, dx + x, dy + y, get(src, x, y));
}

function crop(img, x, y, w, h) {
  const out = blank(w, h);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (inside(img, x + i, y + j)) put(out, i, j, get(img, x + i, y + j));
  return out;
}

/** The same picture with empty pixels added around it, so a frame has room to move into. */
function pad(img, left, top, right = 0, bottom = 0) {
  const out = blank(img.w + left + right, img.h + top + bottom);
  blit(out, img, left, top);
  return out;
}

/** Cuts a rectangle out and puts it back (dx, dy) away: a part of the thing moves as one piece. */
function shift(img, [x, y, w, h], dx, dy) {
  const out = clone(img);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) put(out, x + i, y + j, [0, 0, 0, 0]);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (solid(img, x + i, y + j)) put(out, x + i + dx, y + j + dy, get(img, x + i, y + j));
  return out;
}

/** Copies a rectangle (dx, dy) away without clearing what it leaves: a part inside a body moves, and nothing tears. */
function nudge(img, [x, y, w, h], dx, dy, only = () => true) {
  const out = clone(img);
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const pixel = get(img, x + i, y + j);
      if (pixel[3] >= 128 && only(pixel) && solid(img, x + i + dx, y + j + dy)) put(out, x + i + dx, y + j + dy, pixel);
    }
  }
  return out;
}

/** Each listed row grows one pixel to the left (a flank filling with breath). */
function growLeft(img, rows) {
  const out = clone(img);
  for (const y of rows) {
    let x = 0;
    while (x < img.w && !solid(img, x, y)) x++;
    if (x > 0 && x < img.w) put(out, x - 1, y, get(img, x, y));
  }
  return out;
}

/** Each listed column grows one pixel upward. */
function growUp(img, columns) {
  const out = clone(img);
  for (const x of columns) {
    let y = 0;
    while (y < img.h && !solid(img, x, y)) y++;
    if (y > 0 && y < img.h) put(out, x, y - 1, get(img, x, y));
  }
  return out;
}

const range = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

/** A small seeded generator, so every run draws the same "random" edges and stars. */
function random(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A repeatable 0..1 value for a cell, for patterns that must tile. */
function hash(x, y, salt) {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(salt, 2147483647)) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const bayer4 = (x, y) => BAYER4[(y & 3) * 4 + (x & 3)];
const smooth = (a, b, v) => {
  const t = Math.min(Math.max((v - a) / (b - a), 0), 1);
  return t * t * (3 - 2 * t);
};

const png = (img) => sharp(img.data, { raw: { width: img.w, height: img.h, channels: 4 } }).png({ compressionLevel: 9 }).toBuffer();

const written = [];
async function save(img, name) {
  const file = path.join(outDir, name);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, await png(img));
  written.push(name);
}

/** Frames side by side, left to right, as the Sprite component plays them. */
function strip(frames) {
  const [{ w, h }] = frames;
  const out = blank(w * frames.length, h);
  frames.forEach((frame, i) => blit(out, frame, i * w, 0));
  return out;
}

/** A mask: opaque black where `on` says so, nothing elsewhere. */
function mask(w, h, on) {
  const out = blank(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (on(x, y)) put(out, x, y, [0, 0, 0, 255]);
  return out;
}

// --- the garden ---------------------------------------------------------------

async function loadStaging(staging) {
  const dir = path.join(sceneDir, staging);
  const layout = JSON.parse(await readFile(path.join(dir, 'layout.json'), 'utf8'));
  const layers = {};
  for (const layer of layout.layers) layers[layer.id] = { ...layer, img: await load(path.join(dir, `${layer.id}.png`)) };
  const palette = layout.palette.map(hex);
  /** The staging's own colour nearest to an edited one, so a frame never leaves the palette. */
  const nearest = (rgb, allow = () => true) => {
    let best = palette[0];
    let distance = Infinity;
    for (const colour of palette.filter(allow)) {
      const d = (colour[0] - rgb[0]) ** 2 + (colour[1] - rgb[1]) ** 2 + (colour[2] - rgb[2]) ** 2;
      if (d < distance) [best, distance] = [colour, d];
    }
    return best;
  };
  /** The scene composed from its layers, in z order, leaving out the named ones. */
  const compose = (without = []) => {
    const out = clone(layers.plate.img);
    for (const layer of Object.values(layers).sort((a, b) => a.z - b.z)) {
      if (layer.id !== 'plate' && !without.includes(layer.id)) blit(out, layer.img, layer.x, layer.y);
    }
    return out;
  };
  return { layout, layers, nearest, compose };
}

// --- the cast -----------------------------------------------------------------
// Each builder returns the frames of one sprite and the order and time (ms)
// they play in. `at` is where frame 0's top-left sits in the scene, in art pixels.

/** Flame colours: red over green over blue. Keeps a dimmed flame from landing on a grey or a leaf green. */
const isWarm = ([r, g, b]) => r >= g && g >= b && b <= g * 0.72;
/** The pink left on a rim where the cut-out's magenta ground bled in. */
const isPinkRim = ([r, g, b]) => r > 200 && b > 110 && g < 165;

/** Brightens (factor > 1) or dims the pixels of a region whose brightness is in a band, staying on the palette. */
function relight(img, [x, y, w, h], factor, [from, to], nearest) {
  const out = clone(img);
  for (let j = y; j < y + h; j++) {
    for (let i = x; i < x + w; i++) {
      if (!solid(img, i, j)) continue;
      const pixel = get(img, i, j);
      const light = luma(pixel);
      if (light < from || light > to) continue;
      put(out, i, j, nearest(pixel.slice(0, 3).map((c) => Math.min(255, c * factor)), isWarm));
    }
  }
  return out;
}

const CAST = {
  creative: {
    // The unlit lantern hangs from the bough and swings a pixel either way, slowly.
    lantern: ({ layers }) => {
      const base = pad(layers.lantern.img, 1, 0, 1, 0);
      const body = [0, 13, base.w, base.h - 13];
      return {
        at: [layers.lantern.x - 1, layers.lantern.y],
        frames: [base, shift(base, body, 1, 0), shift(base, body, -1, 0)],
        sequences: { idle: [[0, 800], [1, 800], [0, 800], [2, 800]] },
      };
    },
    // Awake: it blinks, and now and then pulls its head back to look at something.
    parrot: ({ layers }) => {
      const base = layers.parrot.img;
      const blink = clone(base);
      put(blink, 3, 2, get(base, 3, 3));
      const turned = shift(base, [0, 0, base.w, 5], 1, 0);
      return {
        at: [layers.parrot.x, layers.parrot.y],
        frames: [base, blink, turned],
        sequences: {
          idle: [[0, 2100], [1, 130], [0, 1200], [2, 1500], [0, 400], [1, 130], [0, 1700], [2, 300], [0, 300], [2, 900]],
        },
      };
    },
    // Sitting: the flank rises and falls, and an ear flicks.
    cat: ({ layers }) => {
      const base = pad(layers.cat.img, 1, 0);
      const breath = growLeft(base, range(11, 22));
      const ear = shift(breath, [15, 0, 5, 2], -1, 0);
      return {
        at: [layers.cat.x - 1, layers.cat.y],
        frames: [base, breath, ear],
        sequences: { idle: [[0, 1800], [1, 1800], [0, 1800], [1, 1200], [2, 150], [1, 450]] },
      };
    },
    // A wisp of steam off the cup, drawn in the palette's own cream.
    tray: ({ layers, nearest }) => {
      const base = layers.tray.img;
      const cream = nearest(hex('#faeddb'));
      const wisps = [
        [[24, 12], [25, 10], [24, 8]],
        [[25, 12], [24, 10], [25, 8], [24, 6]],
        [[24, 11], [25, 9], [24, 7]],
        [[25, 11], [24, 9], [25, 7], [25, 5]],
      ];
      const frames = wisps.map((wisp) => {
        const frame = clone(base);
        for (const [x, y] of wisp) put(frame, x, y, cream);
        return frame;
      });
      return { at: [layers.tray.x, layers.tray.y], frames, sequences: { idle: frames.map((_, i) => [i, 420]) } };
    },
    table: ({ layers }) => ({ at: [layers.table.x, layers.table.y], frames: [layers.table.img], sequences: { idle: [[0, 1000]] } }),
    // Sketching: the hand with the stylus makes a short stroke, then a longer one.
    figure: ({ layers }) => {
      const base = layers.figure.img;
      const skin = ([r, g, b]) => r > 150 && r - b > 60 && g > 70;
      const hand = [15, 32, 12, 11];
      return {
        at: [layers.figure.x, layers.figure.y],
        frames: [base, nudge(base, hand, 1, 0, skin), nudge(base, hand, 0, 1, skin)],
        sequences: {
          idle: [[0, 1100], [1, 170], [0, 170], [1, 170], [0, 600], [2, 240], [0, 1700], [1, 200], [2, 200], [0, 900]],
        },
      };
    },
    kite: ({ layers }) => kite(layers['kite-a'], [hex('#c23126'), hex('#f7a635')]),
    'kite-blue': ({ layers }) => kite(layers['kite-b'], [hex('#364d72'), hex('#f8d85b')]),
    cypress: ({ layers }) => cypress(layers.plate.img),
  },
  tech: {
    // Lit: the flame gutters and flares while the lantern swings.
    lantern: ({ layers, nearest }) => {
      const base = pad(layers.lantern.img, 1, 0, 1, 0);
      for (let y = 0; y < base.h; y++) for (let x = 0; x < base.w; x++) if (solid(base, x, y) && isPinkRim(get(base, x, y))) put(base, x, y, [0, 0, 0, 0]);
      const glow = [1, 22, base.w - 2, 20];
      const body = [0, 14, base.w, base.h - 14];
      const dim = relight(base, glow, 0.8, [120, 255], nearest);
      const bright = relight(base, glow, 1.25, [70, 215], nearest);
      return {
        at: [layers.lantern.x - 1, layers.lantern.y],
        frames: [base, dim, bright, shift(base, body, 1, 0), shift(base, body, -1, 0)],
        sequences: {
          idle: [
            [0, 420], [2, 120], [0, 260], [1, 90], [0, 330], [3, 300], [2, 110], [3, 290], [0, 400],
            [1, 100], [2, 140], [0, 310], [4, 330], [1, 90], [4, 280],
          ],
        },
      };
    },
    // Asleep in a loaf: only its back moves.
    cat: ({ layers }) => {
      const base = pad(layers.cat.img, 0, 1);
      return {
        at: [layers.cat.x, layers.cat.y - 1],
        frames: [base, growUp(base, range(4, 18))],
        sequences: { idle: [[0, 2000], [1, 2000]] },
      };
    },
    // The light on its mast blinks; while it drives, the body bumps a pixel.
    rover: ({ layers }) => {
      const on = clone(layers.rover.img);
      const mast = get(on, 9, 2);
      for (const y of [3, 4, 5]) put(on, 10, y, mast);
      const off = clone(on);
      for (const [x, y] of [[9, 0], [10, 0], [10, 1], [11, 1], [10, 2]]) put(off, x, y, mast);
      const bump = (frame) => shift(frame, [0, 0, frame.w, 12], 0, 1);
      return {
        at: [layers.rover.x, layers.rover.y],
        frames: [on, off, bump(on), bump(off)],
        sequences: {
          idle: [[0, 1100], [1, 500]],
          drive: [[0, 260], [2, 260], [0, 260], [2, 260], [1, 260], [3, 260]],
        },
      };
    },
    tray: ({ layers }) => ({ at: [layers.tray.x, layers.tray.y], frames: [layers.tray.img], sequences: { idle: [[0, 1000]] } }),
    table: ({ layers }) => ({ at: [layers.table.x, layers.table.y], frames: [layers.table.img], sequences: { idle: [[0, 1000]] } }),
    // Typing in bursts, with the parrot asleep on his shoulder, breathing.
    figure: ({ layers }) => {
      const base = pad(layers.figure.img, 1, 0);
      const skin = ([r, g, b]) => r > 150 && r - b > 60 && g > 60;
      const type = (frame) => nudge(frame, [28, 34, 12, 6], 0, 1, skin);
      const breath = growLeft(base, range(12, 21));
      const frames = [base, type(base), breath, type(breath)];
      // One loop: the parrot breathes in and out every 3.6 s; the hands type, stop to think, type again.
      const typing = [1, 0, 1, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0];
      const idle = typing.map((hands, tick) => [(tick % 30 < 15 ? 0 : 2) + hands, 120]);
      return { at: [layers.figure.x - 1, layers.figure.y], frames, sequences: { idle: merge(idle) } };
    },
    cypress: ({ layers }) => cypress(layers.plate.img),
  },
};

/** Joins neighbouring steps that show the same frame. */
function merge(sequence) {
  const out = [];
  for (const [frame, ms] of sequence) {
    const last = out[out.length - 1];
    if (last && last[0] === frame) last[1] += ms;
    else out.push([frame, ms]);
  }
  return out;
}

/** A kite with a tail of bows that swings below it. The scene's kites are specks; the tail is three pixels of their own colours. */
function kite(layer, [first, second]) {
  const body = crop(layer.img, 0, 0, layer.w, 5);
  const tails = [
    [[3, 6], [3, 8], [4, 10]],
    [[4, 6], [4, 8], [4, 10]],
    [[4, 6], [5, 8], [5, 10]],
  ];
  const frames = tails.map((tail) => {
    const frame = blank(9, 12);
    blit(frame, body, 2, 0);
    tail.forEach(([x, y], i) => put(frame, x, y, i % 2 ? second : first));
    return frame;
  });
  return { at: [layer.x - 2, layer.y], frames, sequences: { idle: [[0, 520], [1, 520], [2, 520], [1, 520]] } };
}

/**
 * The cypress beside the pavilion, cut from the plate. Its outline is found in
 * daylight, where it is the only dark green thing against the sky and the wall;
 * the dusk plate shares the geometry, so the same outline cuts the night one.
 * Its tip leans a pixel in the wind.
 */
const CYPRESS = [152, 68, 15, 52];
let cypressOutline = null;
function cypress(plate) {
  const [x0, y0, w, h] = CYPRESS;
  if (!cypressOutline) {
    const dark = mask(w + 1, h, (x, y) => {
      if (x >= w) return false;
      const pixel = get(plate, x0 + x, y0 + y);
      const [r, g, b] = pixel;
      // dark, and green rather than the wall's red or the skyline's violet
      return luma(pixel) < 92 && g >= b && g >= r - 26;
    });
    // drop loose specks: keep only what is joined to the trunk
    cypressOutline = blank(w + 1, h);
    const queue = [[7, 6]];
    while (queue.length) {
      const [x, y] = queue.pop();
      if (!solid(dark, x, y) || solid(cypressOutline, x, y)) continue;
      put(cypressOutline, x, y, [0, 0, 0, 255]);
      queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
  }
  const tree = mask(w + 1, h, (x, y) => solid(cypressOutline, x, y));
  for (let y = 0; y < h; y++) for (let x = 0; x <= w; x++) if (solid(tree, x, y)) put(tree, x, y, get(plate, x0 + x, y0 + y));
  return { at: [x0, y0], frames: [tree, shift(tree, [0, 0, tree.w, 9], 1, 0)], sequences: { idle: [[0, 2600], [1, 1400]] } };
}

// --- placeholder thumbnails ---------------------------------------------------
// Crops of the garden, 112 x 70 art pixels each, all cut from the scene without
// its owner. They stand in for videos, designs and screenshots not supplied yet.
// Both stagings use the same names, so content can ask for one without knowing the split.

const THUMB = { w: 112, h: 70 };
const THUMBS = {
  creative: {
    pavilion: [156, 68],
    pool: [170, 116],
    horizon: [240, 52],
    canopy: [36, 0],
    beds: [238, 96],
    lantern: [22, 22],
    carpet: [56, 122],
    sky: [200, 4],
    cypress: [100, 58],
    cat: [0, 124],
  },
  tech: {
    pavilion: [156, 68],
    pool: [170, 116],
    horizon: [232, 52],
    canopy: [36, 0],
    beds: [238, 96],
    lantern: [22, 22],
    carpet: [70, 124],
    sky: [240, 4],
    cypress: [100, 58],
    cat: [0, 124],
  },
};

// --- the band -----------------------------------------------------------------
// The garden by itself: the plate with the small things on the carpet, without
// the owner, and without the tree, whose bough would only poke into the wide
// crop as loose blossom. Kites and fireflies are drawn live on top. Positions
// of the living details are art pixels.

const BAND = {
  creative: {
    without: ['figure', 'parrot', 'tree', 'lantern', 'kite-a', 'kite-b'],
    focus: [236, 116],
    glints: [[196, 152], [234, 150], [255, 154], [221, 157], [211, 136]],
    sparkles: [[225, 141], [228, 143], [223, 144], [227, 139]],
  },
  tech: {
    without: ['figure', 'tree', 'lantern'],
    focus: [236, 112],
    glints: [[196, 152], [236, 151], [256, 155], [224, 157], [212, 138]],
    sparkles: [[225, 141], [228, 143], [223, 144]],
  },
};

/** Lit windows in the skyline that can go dark for a moment: the brightest warm pixels, spread out. Each is [x, y, its colour when dark]. */
function findWindows(plate, nearest) {
  const found = [];
  for (let y = 92; y < 112; y++) {
    for (let x = 4; x < plate.w - 4; x++) {
      if (x > 172 && x < 250) continue; // the pavilion
      const pixel = get(plate, x, y);
      const [r, g, b] = pixel;
      if (r > 215 && g > 140 && b < 150 && found.every(([fx]) => Math.abs(fx - x) > 14)) {
        found.push([x, y, nearest([r * 0.35, g * 0.3, b * 0.6])]);
      }
    }
  }
  return found.slice(0, 9).map(([x, y, off]) => [x, y, `#${off.map((c) => c.toString(16).padStart(2, '0')).join('')}`]);
}

// --- tiles --------------------------------------------------------------------

/** How far a ragged edge is eaten at each step along it: runs of 0, 1 or 2 pixels, joined up at the ends so it tiles. */
function ragged(length, seed) {
  const next = random(seed);
  const depth = [];
  let last = -1;
  while (depth.length < length) {
    let d = [0, 0, 0, 1, 1, 1, 2][Math.floor(next() * 7)];
    if (d === last) d = (d + 1) % 3;
    const run = d === 2 ? 1 + Math.floor(next() * 3) : 3 + Math.floor(next() * 7);
    for (let i = 0; i < run && depth.length < length; i++) depth.push(d);
    last = d;
  }
  if (depth[length - 1] === depth[0]) depth[length - 1] = (depth[0] + 1) % 3;
  return depth;
}

const EDGE = 4;

/** One side of a PixelEdge card: `along` pixels long, EDGE deep, eaten from its outer side, with a few crumbs and holes. */
function edgeStrip(along, seed) {
  const depth = ragged(along, seed);
  const next = random(seed * 7 + 3);
  const rows = Array.from({ length: along }, (_, i) => Array.from({ length: EDGE }, (_, d) => d >= depth[i]));
  for (let i = 1; i < along - 1; i++) {
    const roll = next();
    // a crumb left behind just outside the edge, or a hole just inside it
    if (roll < 0.07 && depth[i] === 2 && depth[i - 1] === 2 && depth[i + 1] === 2) rows[i][0] = true;
    else if (roll > 0.94 && depth[i] < 2 && depth[i - 1] === depth[i] && depth[i + 1] === depth[i]) rows[i][depth[i] + 1] = false;
  }
  return rows;
}

const EDGES = {
  top: { along: 64, seed: 11 },
  right: { along: 40, seed: 23 },
  bottom: { along: 56, seed: 37 },
  left: { along: 48, seed: 41 },
};

function edgeTile(side) {
  const { along, seed } = EDGES[side];
  const rows = edgeStrip(along, seed);
  if (side === 'top') return mask(along, EDGE, (x, y) => rows[x][y]);
  if (side === 'bottom') return mask(along, EDGE, (x, y) => rows[x][EDGE - 1 - y]);
  if (side === 'left') return mask(EDGE, along, (x, y) => rows[y][x]);
  return mask(EDGE, along, (x, y) => rows[y][EDGE - 1 - x]);
}

const SEAM = { w: 160, h: 28 };

/**
 * The seam: nothing at the top, solid at the bottom, and between them the page
 * breaking up, as loose pixels first, then clumps, then blocks. `drift` is the
 * sparse layer of specks that steps a little as the page scrolls.
 */
function seamTile(drift) {
  const { w, h } = SEAM;
  const scales = drift
    ? [[1, 0.0, 0.5, 0.1, 5], [2, 0.15, 0.6, 0.07, 6]]
    : [[1, 0.0, 0.55, 0.3, 1], [2, 0.18, 0.72, 0.62, 2], [4, 0.42, 0.9, 1.05, 3]];
  return mask(w, h, (x, y) => {
    if (!drift && y >= h - 3) return true;
    if (drift && y > h * 0.62) return false;
    return scales.some(([size, from, to, most, salt]) => {
      const [bx, by] = [Math.floor(x / size), Math.floor(y / size)];
      const middle = (by * size + size / 2) / h;
      return hash(bx % (w / size), by, salt) < smooth(from, to, middle) * most;
    });
  });
}

/** Jali: a lattice of octagons with a small diamond where four of them meet. Opaque where the stone is. */
const JALI = 12;
function jaliTile() {
  return mask(JALI, JALI, (x, y) => {
    const [dx, dy] = [Math.abs(x - 5.5), Math.abs(y - 5.5)];
    const octagon = Math.max(dx, dy) < 4.6 && dx + dy < 6.6;
    const [cx, cy] = [Math.min(x, JALI - 1 - x) + 0.5, Math.min(y, JALI - 1 - y) + 0.5];
    const diamond = cx + cy < 2.1;
    return !octagon && !diamond;
  });
}

/** An eight-point star (a square laid over a diamond) with its heart cut out, like a jali screen. 11 x 11. */
function starTile() {
  return mask(11, 11, (x, y) => {
    const [dx, dy] = [Math.abs(x - 5), Math.abs(y - 5)];
    const star = (dx <= 3 && dy <= 3) || dx + dy <= 5;
    const cut = dx + dy <= 2 && dx + dy > 0;
    return star && !cut;
  });
}

/** The small section marker: eight rays around an open centre. 7 x 7. */
function sparkTile() {
  const rows = ['...#...', '.#.#.#.', '..###..', '###.###', '..###..', '.#.#.#.', '...#...'];
  return mask(7, 7, (x, y) => rows[y][x] === '#');
}

/**
 * The left shoulder of a cusped (multifoil) arch: opaque where the opening is.
 * Its top-right corner is the crown, so two of them back to back make a whole
 * pointed arch, and with a straight run between them a wide, shouldered one.
 * Drawn by hand: each number is where the opening starts on that row, top row
 * first. Where a row starts further in than the row above it, that is a cusp.
 */
const ARCH_EDGE = [18, 16, 14, 14, 10, 8, 7, 7, 9, 6, 4, 3, 3, 5, 3, 1, 0, 0, 2, 0];
const ARCH = { w: 20, h: ARCH_EDGE.length };
const archTile = (mirrored) => mask(ARCH.w, ARCH.h, (x, y) => (mirrored ? ARCH.w - 1 - x : x) >= ARCH_EDGE[y]);

/** Paper grain: patches of ordered dither, faint, in the scene's umber. Tiles. */
function grainTile(colour) {
  const size = 64;
  const cells = 8;
  const next = random(5);
  const lattice = Array.from({ length: cells * cells }, () => next());
  const value = (x, y) => {
    const [fx, fy] = [(x / size) * cells, (y / size) * cells];
    const [ix, iy] = [Math.floor(fx), Math.floor(fy)];
    const [tx, ty] = [smooth(0, 1, fx - ix), smooth(0, 1, fy - iy)];
    const corner = (cx, cy) => lattice[(cy % cells) * cells + (cx % cells)];
    const top = corner(ix, iy) * (1 - tx) + corner(ix + 1, iy) * tx;
    const bottom = corner(ix, iy + 1) * (1 - tx) + corner(ix + 1, iy + 1) * tx;
    return top * (1 - ty) + bottom * ty;
  };
  const out = blank(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const density = Math.max(0, value(x, y) - 0.46) * 0.8;
      if (bayer4(x, y) / 16 < density) put(out, x, y, [...colour, 13]);
    }
  }
  return out;
}

/** A patch of night sky: a few faint stars and one bright one, with rays in the larger tile. The two tiles are of sizes that never line up. */
const STARS = [211, 307];
function starsTile(size, count, seed, colours, rays) {
  const next = random(seed);
  const out = blank(size, size);
  for (let i = 0; i < count; i++) {
    const [x, y] = [2 + Math.floor(next() * (size - 4)), 2 + Math.floor(next() * (size - 4))];
    const colour = colours[Math.floor(next() * colours.length)];
    // the first star of a tile is its one bright star; the rest are faint
    const alpha = i === 0 ? 220 : [45, 70, 100, 140][Math.floor(next() * 4)];
    put(out, x, y, [...colour, alpha]);
    if (i === 0 && rays) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) put(out, x + dx, y + dy, [...colour, 60]);
  }
  return out;
}

/**
 * The kilim border: a band of stepped diamonds between two ruled edges, with
 * half-diamonds biting in from the edges between them. 16 x 11, tiles sideways.
 */
function kilimTile({ field, cream, indigo, brass }) {
  const [w, h] = [16, 11];
  const out = blank(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let colour = field;
      if (y === 0 || y === h - 1) colour = indigo;
      else if (y === 1 || y === h - 2) colour = cream;
      else {
        const [dx, dy] = [Math.abs(x - 8), Math.abs(y - 5)];
        const fromEdge = Math.min(y - 2, h - 3 - y);
        const side = Math.min(x, w - x);
        if (dx === 0 && dy === 0) colour = brass;
        else if (dy <= 1 && dx <= 2 * (1 - dy)) colour = indigo;
        else if (dy <= 3 && dx <= 2 * (3 - dy)) colour = cream;
        else if (fromEdge <= 1 && side <= 2 * (1 - fromEdge)) colour = indigo;
      }
      put(out, x, y, colour);
    }
  }
  return out;
}

const KILIM = {
  creative: { field: hex('#9c2d22'), cream: hex('#faeddb'), indigo: hex('#263953'), brass: hex('#e4b52e') },
  tech: { field: hex('#98291c'), cream: hex('#fbdc9b'), indigo: hex('#262b69'), brass: hex('#ffd84d') },
};

/** The steps a heading resolves through: how many of a 4 x 4 Bayer tile's sixteen pixels show at each. */
const DITHER_STEPS = [2, 4, 6, 8, 10, 12, 14];

// --- build --------------------------------------------------------------------

await rm(outDir, { recursive: true, force: true });

const index = { thumb: THUMB, tiles: {} };

for (const staging of ['creative', 'tech']) {
  const scene = await loadStaging(staging);
  const entry = { band: null, sprites: {}, thumbs: [] };

  for (const [name, build] of Object.entries(CAST[staging])) {
    const { at, frames, sequences } = build(scene);
    const [{ w, h }] = frames;
    await save(strip(frames), `${staging}/${name}.png`);
    entry.sprites[name] = { src: `${staging}/${name}.png`, w, h, frames: frames.length, at, sequences };
  }

  const garden = scene.compose(['figure', 'parrot']);
  for (const [name, [x, y]] of Object.entries(THUMBS[staging])) {
    await save(crop(garden, x, y, THUMB.w, THUMB.h), `${staging}/thumb-${name}.png`);
    entry.thumbs.push(name);
  }

  const band = BAND[staging];
  await save(scene.compose(band.without), `${staging}/band.png`);
  entry.band = {
    src: `${staging}/band.png`,
    w: scene.layout.grid.w,
    h: scene.layout.grid.h,
    focus: band.focus,
    glints: band.glints,
    sparkles: band.sparkles,
    windows: staging === 'tech' ? findWindows(scene.layers.plate.img, scene.nearest) : [],
  };

  await save(kilimTile(KILIM[staging]), `tiles/kilim-${staging}.png`);
  index[staging] = entry;
}

for (const side of Object.keys(EDGES)) await save(edgeTile(side), `tiles/edge-${side}.png`);
await save(seamTile(false), 'tiles/seam.png');
await save(seamTile(true), 'tiles/seam-drift.png');
await save(jaliTile(), 'tiles/jali.png');
await save(starTile(), 'tiles/star.png');
await save(sparkTile(), 'tiles/spark.png');
await save(archTile(false), 'tiles/arch-left.png');
await save(archTile(true), 'tiles/arch-right.png');
await save(grainTile(hex('#5b2e15')), 'tiles/grain.png');
await save(starsTile(STARS[0], 17, 3, [hex('#fef7d8'), hex('#c7c6f9')], false), 'tiles/stars-a.png');
await save(starsTile(STARS[1], 24, 8, [hex('#fef7d8'), hex('#fbdc9b'), hex('#c7c6f9')], true), 'tiles/stars-b.png');

index.tiles = {
  edge: { depth: EDGE, top: EDGES.top.along, right: EDGES.right.along, bottom: EDGES.bottom.along, left: EDGES.left.along },
  seam: SEAM,
  jali: { w: JALI, h: JALI },
  star: { w: 11, h: 11 },
  spark: { w: 7, h: 7 },
  arch: ARCH,
  kilim: { w: 16, h: 11 },
  grain: { w: 64, h: 64 },
  stars: STARS,
};

/** JSON with the short lists (points, steps of a sequence) kept on one line, so the index can be read. */
function tidy(value, indent = '') {
  const inner = `${indent}  `;
  if (Array.isArray(value)) {
    const flat = JSON.stringify(value).replace(/,/g, ', ');
    if (flat.length <= 96) return flat;
    return `[\n${value.map((item) => inner + tidy(item, inner)).join(',\n')}\n${indent}]`;
  }
  if (value && typeof value === 'object') {
    return `{\n${Object.entries(value).map(([key, item]) => `${inner}${JSON.stringify(key)}: ${tidy(item, inner)}`).join(',\n')}\n${indent}}`;
  }
  return JSON.stringify(value);
}

await writeFile(path.join(outDir, 'index.json'), `${tidy(index)}\n`);
written.push('index.json');

// The typed copy the components import. Sequences are [frame, ms] pairs.
const module = `// Generated by scripts/build-section-art.mjs (npm run art:sections). Do not edit by hand.
// What is in public/art/sections/: sizes are art pixels, sequences are [frame, milliseconds] steps.
export const sectionArt = ${tidy(index)} as const;
`;
await writeFile(path.join(root, 'src', 'content', 'sectionArt.ts'), module);

// The dither steps go into the stylesheet itself as data URIs: a step that had to be fetched could arrive late and blink.
const steps = [];
for (const [i, count] of DITHER_STEPS.entries()) {
  const tile = await png(mask(4, 4, (x, y) => bayer4(x, y) < count));
  steps.push(`  --dither-${i + 1}: url('data:image/png;base64,${tile.toString('base64')}');`);
}
const css = `/* Generated by scripts/build-section-art.mjs (npm run art:sections). Do not edit by hand.
 * 4 x 4 Bayer tiles with ${DITHER_STEPS.join(', ')} of 16 pixels showing: the steps of the dither resolve. */
:root {
${steps.join('\n')}
}
`;
await writeFile(path.join(root, 'src', 'styles', 'dither.css'), css);

console.log(`section art: ${written.length} files in public/art/sections, plus src/content/sectionArt.ts and src/styles/dither.css`);
