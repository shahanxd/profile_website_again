// Builds synthetic test inputs for pixelize.mjs in art/fixtures/. No real art
// exists yet, so this draws small true pixel-art sprites and then damages them
// the way image models do: enlarged by an awkward factor, off the pixel grid,
// blurred, colour-shifted, noisy, JPEG-compressed, on a flat key colour with
// soft edges and a faint shadow. Because the originals are kept
// (fixtures/truth), test-fixtures.mjs can measure how much the tool recovers.
// Everything is seeded, so two runs give identical files.
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { loadPalette } from './lib/color.mjs';
import { contentBox, pixelmapFrames } from './lib/finish.mjs';
import { CLEAR, cropSprite, newSprite, saveRaster, spriteToRaster } from './lib/image.mjs';

const DIR = 'art/fixtures';
const MAGENTA = [255, 0, 255];
const BLUE = [0, 0, 255];

// One legend for every map below.
const LEGEND = {
  '#': 'ink', p: 'plum', u: 'umber', t: 'taupe',
  D: 'deepleaf', L: 'leaf', G: 'ringneck',
  o: 'oxblood', m: 'madder', v: 'vermilion',
  b: 'brasssh', B: 'brass', Y: 'lanterngold',
  M: 'marbleshade', W: 'parchment',
  P: 'periwinkle', S: 'moonstone', l: 'moonlight',
  T: 'teal', Q: 'turquoise', q: 'sparkle',
  e: 'ember', g: 'gold',
  x: 'blossomsh', X: 'blossom', r: 'blossomlt', R: 'petal',
};

const MAPS = {
  parrot: [
    '.........###..',
    '........#GGG#.',
    '........#G#Gvv',
    '........#mGGv.',
    '.......#GGGL#.',
    '......#GGLLD#.',
    '.....#GLLLD#..',
    '...##LLDD##...',
    '.##DDD##.t.t..',
    '#DD###........',
  ],
  pot: [
    '....##.....',
    '...#YB#....',
    '....##.....',
    '...#BB#....',
    '..#YBBb#.##',
    '.#YBBBBb#B#',
    '##YBBBBb##.',
    '#B#BBBBb#..',
    '.##YBBBb#..',
    '..#YBBBb#..',
    '..#BBBBb#..',
    '.#bbbbbbb#.',
    '.#########.',
  ],
  // the steam is detached from the cup: it must stay with it when the sheet is split
  cup: [
    '...W.....',
    '....W....',
    '...W.....',
    '.........',
    '#######..',
    '#WuuuW###',
    '#WWWWW#.#',
    '#WWWWM#.#',
    '#WWWWM###',
    '.#WWM#...',
    '..###....',
    '.#####...',
  ],
  tray: [
    '...##############...',
    '.##YYBBBBBBBBBBBb##.',
    '#YBBBBBBBBBBBBBBBbb#',
    '.##bbbbbbbbbbbbbb##.',
    '...##############...',
  ],
  camera: [
    '...###........',
    '..#uuu#...##..',
    '##############',
    '#uuuu#TT#uuvu#',
    '#uuu#TQqT#uuu#',
    '#ttt#TQQT#ttt#',
    '#uuu#TTTT#uuu#',
    '#uuuu#TT#uuuu#',
    '#pppppppppppp#',
    '.############.',
  ],
  headphones: [
    '...######...',
    '..#mmmmmm#..',
    '.#mo####om#.',
    '.#m#....#m#.',
    '.#m#....#m#.',
    '###u....u###',
    '#vm#....#mo#',
    '#mm#....#mo#',
    '#mo#....#oo#',
    '###......###',
  ],
  rover: [
    '............e...',
    '............#...',
    '..###########...',
    '.#SSSSSSSSSl#...',
    '.#SPPPPPPPSl####',
    '.#SSSSSSSSSSttt#',
    '################',
    '.#tt#.#tt#.#tt#.',
    '..##...##...##..',
  ],
  // a pink subject with no outline: the case that needs a blue key
  blossom: [
    '....RR......',
    '...RrrR..R..',
    '..RrXXrRRrR.',
    '..RrXgXrrXr.',
    '...RrXrRrXr.',
    '....RRx.RrR.',
    '.....ux..R..',
    '....uu......',
    '...uu.......',
    '..uu........',
  ],
};

const RAMPS = {
  parrot: ['bird', 'red', 'ink'],
  figure: ['skin', 'hair', 'cloth', 'marble', 'ink'],
  pot: ['brass', 'ink'],
  cup: ['marble', 'ink'],
  tray: ['brass', 'ink'],
  camera: ['ink', 'water', 'red'],
  headphones: ['red', 'ink'],
  rover: ['dusk', 'ink', 'light'],
  blossom: ['blossom', 'ink', 'light'],
};

/** The sprite cut down to its own content, which is how the tool defines "size". */
function tight(sprite) {
  const box = contentBox([sprite]);
  return cropSprite(sprite, box.x0, box.y0, box.x1 - box.x0, box.y1 - box.y0);
}

/**
 * A seated figure about 50x48, drawn from shapes because a map that size is
 * unreadable. It is a stand-in with the things real character art has: an
 * outline, shading, a dithered patch, one-pixel details. It is not the owner.
 */
function drawFigure(palette) {
  const s = newSprite(52, 50);
  const set = (x, y, name) => {
    if (x >= 0 && y >= 0 && x < s.w && y < s.h) s.px[y * s.w + x] = palette.id(name, 'figure');
  };
  const rect = (x, y, w, h, name) => {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) set(xx, yy, name);
  };
  const ellipse = (cx, cy, rx, ry, name, test = () => true) => {
    for (let y = 0; y < s.h; y++) {
      for (let x = 0; x < s.w; x++) {
        if (((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1 && test(x, y)) set(x, y, name);
      }
    }
  };

  // crossed legs in light jeans, lit from above, with a crease where they cross
  ellipse(17, 41, 15, 6, 'moonstone');
  ellipse(35, 41, 15, 6, 'moonstone');
  ellipse(17, 41, 15, 6, 'moonlight', (x, y) => y < 38);
  ellipse(35, 41, 15, 6, 'moonlight', (x, y) => y < 38);
  ellipse(26, 41, 24, 6, 'periwinkle', (x, y) => y >= 45);
  for (let i = 0; i < 5; i++) set(24 + i, 39 + i, 'periwinkle');
  ellipse(7.5, 44.5, 4, 2.5, 'parchment');
  ellipse(44.5, 44.5, 4, 2.5, 'parchment');
  rect(5, 46, 5, 1, 'marbleshade');
  rect(42, 46, 5, 1, 'marbleshade');

  // sweater: lit on the left, shaded on the right through a dithered band
  for (let y = 18; y < 37; y++) {
    const half = Math.round(9 + (y - 18) * 0.12);
    for (let x = 26 - half; x < 26 + half; x++) {
      const fromRight = 26 + half - 1 - x;
      const shade = fromRight < 3 ? 'indigo' : fromRight < 6 && (x + y) % 2 ? 'indigo' : 'blueviolet';
      set(x, y, x - (26 - half) === 1 && y > 19 && y < 31 ? 'periwinkle' : shade);
    }
  }
  // arms, hands, and a stylus in the right hand
  rect(13, 20, 4, 11, 'blueviolet');
  rect(14, 21, 1, 8, 'periwinkle');
  rect(14, 30, 8, 3, 'blueviolet');
  rect(36, 20, 4, 10, 'indigo');
  rect(29, 28, 9, 3, 'indigo');
  rect(21, 30, 3, 3, 'skin');
  rect(27, 28, 3, 3, 'skin');
  set(21, 30, 'skinlt');
  set(29, 30, 'skinsh');
  for (let i = 0; i < 4; i++) set(27 - i, 29 + i, i === 3 ? 'ink' : 'parchment');

  // tablet on the lap
  rect(17, 33, 17, 5, 'ink');
  rect(18, 34, 15, 3, 'moonlight');
  rect(20, 35, 4, 1, 'periwinkle');
  set(26, 35, 'periwinkle');

  // neck, collar and zip
  rect(24, 15, 4, 3, 'skin');
  rect(24, 17, 4, 1, 'skinsh');
  rect(22, 18, 8, 1, 'parchment');
  set(23, 19, 'parchment');
  set(28, 19, 'parchment');
  rect(25, 19, 2, 4, 'marbleshade');

  // head: curly hair, face, short beard
  ellipse(26, 7, 7, 5.5, 'hair');
  ellipse(26, 7, 7, 5.5, 'umber', (x, y) => (x * 2 + y * 3) % 7 === 0);
  ellipse(26, 11, 5, 5.5, 'skin', (x, y) => y >= 7);
  ellipse(26, 11, 5, 5.5, 'hair', (x, y) => y >= 13);
  rect(25, 13, 2, 1, 'skinsh');
  set(24, 10, 'ink');
  set(28, 10, 'ink');
  set(26, 11, 'skinsh');
  rect(22, 9, 1, 3, 'skinlt');
  set(23, 12, 'skinlt');

  // a one-pixel ink outline around the whole figure
  const ink = palette.id('ink', 'figure');
  const before = s.px.slice();
  const filled = (x, y) => x >= 0 && y >= 0 && x < s.w && y < s.h && before[y * s.w + x] !== CLEAR;
  for (let y = 0; y < s.h; y++) {
    for (let x = 0; x < s.w; x++) {
      if (!filled(x, y) && (filled(x - 1, y) || filled(x + 1, y) || filled(x, y - 1) || filled(x, y + 1))) s.px[y * s.w + x] = ink;
    }
  }
  return tight(s);
}

/** Small seeded random generator (mulberry32), so fixtures never change between runs. */
function random(seed) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  next.between = (lo, hi) => lo + (hi - lo) * next();
  next.gauss = () => Math.sqrt(-2 * Math.log(1 - next())) * Math.cos(2 * Math.PI * next());
  return next;
}

// How badly the art is damaged. blur: gaussian sigma in px; drift: how far
// each fake pixel's colour strays, per channel, out of 255; noise: per-pixel
// sigma; quality: JPEG. TYPICAL is a decent generation; ROUGH is a poor one,
// there to show where recovery starts to fail.
const TYPICAL = { blur: 1.4, drift: 7, noise: 3.5, quality: 85 };
const ROUGH = { blur: 2.2, drift: 14, noise: 7, quality: 60 };

/**
 * Paints sprites onto a key-coloured canvas the way an image model would and
 * saves the result as a JPEG. placed: [{ sprite, x, y, scale }], with x, y the
 * sprite's top-left corner in canvas pixels (fractions welcome).
 */
async function degrade(file, palette, placed, { w, h, key, seed, damage = TYPICAL }) {
  const rand = random(seed);
  const rgb = new Float32Array(w * h * 3);
  for (let i = 0; i < w * h; i++) rgb.set(key, i * 3);

  for (const { sprite, x, y, scale } of placed) {
    // a faint, soft shadow on the key colour under the object
    const cx = x + (sprite.w * scale) / 2;
    const cy = y + sprite.h * scale;
    const rx = sprite.w * scale * 0.5;
    const ry = scale * 0.9;
    for (let py = Math.floor(cy - ry); py < cy + ry; py++) {
      for (let px = Math.floor(cx - rx); px < cx + rx; px++) {
        const d = ((px - cx) / rx) ** 2 + ((py - cy) / ry) ** 2;
        if (d >= 1 || px < 0 || py < 0 || px >= w || py >= h) continue;
        for (let c = 0; c < 3; c++) rgb[(py * w + px) * 3 + c] *= 1 - 0.2 * (1 - d);
      }
    }
    // Fake pixels: an awkward size; every grid line a little off; the grid
    // itself slowly stretching and squeezing (a third of a cell either way
    // over forty cells, about 5% in local scale); every cell a little
    // off-colour and not quite flat (lighter towards its top).
    const lines = (origin, count) => {
      const swing = rand() * 6.28;
      const at = (i) => i * scale + (0.35 * Math.sin((i / 40) * 6.28 + swing) + rand.between(-0.07, 0.07)) * scale;
      return Array.from({ length: count + 1 }, (_, i) => Math.round(origin + at(i)));
    };
    const xs = lines(x, sprite.w);
    const ys = lines(y, sprite.h);
    for (let sy = 0; sy < sprite.h; sy++) {
      for (let sx = 0; sx < sprite.w; sx++) {
        const colour = sprite.px[sy * sprite.w + sx];
        if (colour === CLEAR) continue;
        const cell = palette.rgb[colour].map((v) => v + rand.between(-damage.drift, damage.drift));
        for (let py = ys[sy]; py < ys[sy + 1]; py++) {
          const tilt = 4 - (8 * (py - ys[sy])) / (ys[sy + 1] - ys[sy]);
          for (let px = xs[sx]; px < xs[sx + 1]; px++) rgb.set(cell.map((v) => v + tilt), (py * w + px) * 3);
        }
      }
    }
  }

  // blur: softens the fake pixels and blends the edges into the key
  const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));
  const blurred = await sharp(Uint8Array.from(rgb, clamp), { raw: { width: w, height: h, channels: 3 } }).blur(damage.blur).raw().toBuffer();

  // colour that drifts slowly across the image, plus per-pixel noise
  const phase = [rand() * 6.28, rand() * 6.28, rand() * 6.28];
  for (let i = 0; i < w * h; i++) {
    const wave = ((i % w) / w) * 5 + (Math.floor(i / w) / h) * 3;
    for (let c = 0; c < 3; c++) blurred[i * 3 + c] = clamp(blurred[i * 3 + c] * (1 + 0.03 * Math.sin(wave + phase[c])) + rand.gauss() * damage.noise);
  }
  await sharp(blurred, { raw: { width: w, height: h, channels: 3 } }).jpeg({ quality: damage.quality }).toFile(file);
}

export async function makeFixtures() {
  const palette = await loadPalette('art/palette.json');
  await mkdir(path.join(DIR, 'truth'), { recursive: true });
  await mkdir(path.join(DIR, 'raw'), { recursive: true });
  await mkdir(path.join(DIR, 'overrides'), { recursive: true });
  // Nothing in this folder needs committing: one run of this script brings it all back.
  await writeFile(path.join(DIR, '.gitignore'), '# rebuilt by tools/art/make-fixtures.mjs\n*\n');

  const truth = Object.fromEntries(Object.entries(MAPS).map(([name, rows]) => [name, tight(pixelmapFrames({ legend: LEGEND, rows }, palette, name)[0])]));
  truth.figure = drawFigure(palette);

  // Every asset gets its ground truth saved under its own id, for test-fixtures.mjs.
  const assets = [];
  const add = async (name, entry) => {
    assets.push({ id: `fx-${name}`, staging: null, ramps: RAMPS[name], ...entry });
    await saveRaster(path.join(DIR, 'truth', `${assets.at(-1).id}.png`), spriteToRaster(truth[name], palette));
  };
  const raw = (name) => ({ key: 'auto', size: [truth[name].w, truth[name].h] });

  // one sprite per image, at the size image tools usually give
  const single = async (name, { scale, key = MAGENTA, seed, id = name, damage, ...extra }) => {
    const margin = Math.round(scale * 3);
    const [x, y] = [margin + 0.37 * scale, margin + 0.81 * scale]; // off the grid on purpose
    const size = { w: Math.round(truth[name].w * scale) + margin * 2 + 9, h: Math.round(truth[name].h * scale) + margin * 2 + 5 };
    await degrade(path.join(DIR, 'raw', `${id}.jpg`), palette, [{ sprite: truth[name], x, y, scale }], { ...size, key, seed, damage });
    await add(name, { id: `fx-${id}`, src: `${DIR}/raw/${id}.jpg`, ...raw(name), ...extra });
  };
  await single('figure', { scale: 21.3, seed: 1, pos: [100, 103] });
  await single('parrot', {
    scale: 21.3,
    seed: 2,
    // stands on its feet: the anchor is on the bottom edge, and compose puts it at `pos`
    anchor: [10, 10],
    points: { beak: [13, 2] },
    pos: [143, 134],
    // exercises the rig ops: a blink (the eye takes the head colour) and a nod (the head drops a pixel)
    frames: [
      { name: 'idle', ops: [] },
      { name: 'blink', ops: [{ recolor: { ink: 'ringneck' }, in: [10, 2, 1, 1] }] },
      { name: 'nod', ops: [{ shift: [8, 0, 6, 4], by: [0, 1] }] },
    ],
  });
  await single('blossom', { scale: 12.6, key: BLUE, seed: 3, pos: [60, 70] });
  // the same parrot far smaller: about the least an image tool would ever give per art pixel
  await single('parrot', { scale: 6.3, seed: 4, id: 'parrot-small' });
  // the figure again as a poor generation: smaller, blurrier, noisier, colours further off, heavier JPEG
  await single('figure', { scale: 13.7, seed: 7, id: 'figure-rough', damage: ROUGH });

  // a prop sheet: six objects in a 3x2 layout, each on its own grid offset
  const props = ['pot', 'cup', 'tray', 'camera', 'headphones', 'rover'];
  const scale = 17.7;
  const cell = { w: 460, h: 330 };
  const where = random(5);
  const placed = props.map((name, n) => ({
    sprite: truth[name],
    scale,
    x: (n % 3) * cell.w + (cell.w - truth[name].w * scale) / 2 + where.between(-20, 20),
    y: Math.floor(n / 3) * cell.h + (cell.h - truth[name].h * scale) / 2 + where.between(-20, 20),
  }));
  await degrade(path.join(DIR, 'raw', 'props.jpg'), palette, placed, { w: cell.w * 3, h: cell.h * 2, key: MAGENTA, seed: 6 });
  const spots = { pot: [158, 139], cup: [169, 141], tray: [156, 152], camera: [108, 153], headphones: [124, 153], rover: [178, 142] };
  for (const [n, name] of props.entries()) {
    // the top row is cut by explicit cells, the bottom row by object number
    const cut = n < 3 ? { cell: [n / 3, 0, (n + 1) / 3, 0.5] } : { component: n };
    await add(name, { src: `${DIR}/raw/props.jpg`, ...raw(name), ...cut, pos: spots[name] });
  }

  // a hand repaint with one off-palette pixel: must be accepted, snapped and warned about
  const repaint = spriteToRaster(truth.cup, palette);
  repaint.data.set([250, 240, 225], (5 * truth.cup.w + 1) * 4);
  await saveRaster(path.join(DIR, 'overrides', 'fx-repaint.png'), repaint);
  await add('cup', { id: 'fx-repaint', anchor: [4, 11] });

  const config = { palette: 'art/palette.json', out: 'art/fixtures/out', overrides: `${DIR}/overrides`, assets, pixelmaps: {} };
  await writeFile(path.join(DIR, 'fixtures.config.json'), JSON.stringify(config, null, 2) + '\n');
  return config;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const config = await makeFixtures();
  console.log(`fixtures written to ${DIR}: ${config.assets.length} assets (truth/, raw/, overrides/, fixtures.config.json)`);
}
