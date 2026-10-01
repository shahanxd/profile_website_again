// Draws the grey-box placeholder sprites: rough but recognisable stand-ins for
// every element of the garden, in both stagings, so composition, motion and
// framing can be judged before any real art exists. Real art replaces these
// file by file; a sprite whose sprites.json entry says "generated" or
// "override" is never touched here.
//
// Positions are not decided in this file. Where a sprite goes is the job of
// src/hero/scene/manifest.ts; this file only decides what each one looks like.
import sharp from 'sharp';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'art', 'sprites');
const palette = JSON.parse(await readFile(path.join(root, 'art', 'palette.json'), 'utf8'));

// ---------------------------------------------------------------- drawing kit
// A canvas is a grid of palette colour names; null is transparent. Working in
// names keeps every pixel on the palette by construction.

const C = (w, h) => ({ w, h, px: new Array(w * h).fill(null) });
const clone = (c) => ({ w: c.w, h: c.h, px: c.px.slice() });
const get = (c, x, y) => (x < 0 || y < 0 || x >= c.w || y >= c.h ? null : c.px[y * c.w + x]);

function put(c, x, y, name) {
  x = Math.round(x);
  y = Math.round(y);
  if (x >= 0 && y >= 0 && x < c.w && y < c.h) c.px[y * c.w + x] = name;
}

function rect(c, x, y, w, h, name) {
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) put(c, i, j, name);
}

const hline = (c, x, y, w, name) => rect(c, x, y, w, 1, name);
const vline = (c, x, y, h, name) => rect(c, x, y, 1, h, name);

/** Filled ellipse. With over = true it only repaints pixels that are already opaque. */
function ell(c, cx, cy, rx, ry, name, over = false) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const dx = (x + 0.5 - cx) / rx;
      const dy = (y + 0.5 - cy) / ry;
      if (dx * dx + dy * dy <= 1 && (!over || get(c, x, y))) put(c, x, y, name);
    }
  }
}

function line(c, x0, y0, x1, y1, name) {
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  for (let i = 0; i <= steps; i++) put(c, x0 + ((x1 - x0) * i) / steps, y0 + ((y1 - y0) * i) / steps, name);
}

/** A thick line through the points, tapering from radius r0 to r1: trunks, boughs, arms, legs. */
function limb(c, points, r0, r1, name) {
  const lengths = points.slice(1).map((p, i) => Math.hypot(p[0] - points[i][0], p[1] - points[i][1]));
  const total = lengths.reduce((a, b) => a + b, 0);
  let walked = 0;
  for (let s = 0; s < lengths.length; s++) {
    const [ax, ay] = points[s];
    const [bx, by] = points[s + 1];
    for (let d = 0; d <= lengths[s]; d += 0.5) {
      const r = r0 + ((r1 - r0) * (walked + d)) / total;
      const f = d / lengths[s];
      ell(c, ax + (bx - ax) * f + 0.5, ay + (by - ay) * f + 0.5, r, r, name);
    }
    walked += lengths[s];
  }
}

/** Repaint every pixel for which pick(x, y, current) returns a colour. */
function remap(c, pick) {
  for (let y = 0; y < c.h; y++) {
    for (let x = 0; x < c.w; x++) {
      const now = c.px[y * c.w + x];
      const next = pick(x, y, now);
      if (next !== undefined) c.px[y * c.w + x] = next;
    }
  }
}

/** Light comes from the low sun on the right: lit right edges, shaded left edges. */
function rim(c, lit, shade) {
  const src = clone(c);
  remap(c, (x, y, now) => {
    if (!now) return undefined;
    if (lit && !get(src, x + 1, y)) return lit;
    if (shade && !get(src, x - 1, y)) return shade;
    return undefined;
  });
}

// 4x4 ordered dither, for flat tone changes inside a sprite.
const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const dither = (x, y, level) => (BAYER4[(y & 3) * 4 + (x & 3)] + 0.5) / 16 < level;

/** Small seeded generator, so every run draws the same sprites. */
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = (rnd, list) => list[Math.floor(rnd() * list.length)];

/** A cusped (three-lobed) arch opening, the motif shared by the gate, the pavilion and the side table. */
function cuspedArch(c, cx, spring, half, bottom, name) {
  rect(c, Math.round(cx - half), spring, Math.round(half * 2), bottom - spring, name);
  ell(c, cx - half * 0.48, spring, half * 0.56, half * 0.6, name);
  ell(c, cx + half * 0.48, spring, half * 0.56, half * 0.6, name);
  ell(c, cx, spring - half * 0.55, half * 0.56, half * 0.7, name);
  put(c, Math.floor(cx), Math.round(spring - half * 1.25) - 1, name);
  put(c, Math.ceil(cx) - 1, Math.round(spring - half * 1.25) - 1, name);
}

// Sprites without a staging suffix are drawn in daylight colours; pack-atlas
// bakes their dusk form from the palette. Sprites named .creative or .tech are
// drawn in their final colours here.

// ------------------------------------------------------------------- registry

const sprites = new Map();

/** frames: one canvas or a list of equal-sized canvases (written as a horizontal strip). */
function add(stem, frames, { anchor = [0, 0], points = {}, emissive = false } = {}) {
  sprites.set(stem, { frames: [].concat(frames), anchor, points, emissive });
}

// --------------------------------------------------------------- sky and far

{
  const sun = C(14, 14);
  ell(sun, 7, 7, 7, 7, 'gold');
  ell(sun, 7, 7, 5, 5, 'cream');
  add('sun.creative', sun, { anchor: [7, 7], emissive: true });

  const moon = C(10, 10);
  ell(moon, 5, 5, 5, 5, 'moonlight');
  ell(moon, 6, 4.6, 4.4, 4.6, 'cream', true);
  put(moon, 6, 3, 'moonlight');
  put(moon, 7, 6, 'moonlight');
  add('moon.tech', moon, { anchor: [5, 5], emissive: true });

  // A star rests as one dim pixel and now and then flares into a small cross.
  const star = (core, arms) => {
    const c = C(3, 3);
    if (arms) for (const [x, y] of [[1, 0], [0, 1], [2, 1], [1, 2]]) put(c, x, y, arms);
    put(c, 1, 1, core);
    return c;
  };
  add('star.tech', [star('moonlight'), star('cream'), star('cream', 'moonstone'), star('cream')], {
    anchor: [1, 1],
    emissive: true,
  });
}

function cloud(w, h, lumps) {
  const c = C(w, h);
  for (const [cx, rx, ry] of lumps) ell(c, cx, h, rx, ry, 'parchment');
  rect(c, 2, h - 2, w - 4, 2, 'parchment');
  remap(c, (x, y, now) => (now && y === h - 1 ? 'marbleshade' : undefined));
  return c;
}
add('cloud-a', cloud(34, 8, [[9, 8, 5], [18, 9, 8], [26, 7, 5]]));
add('cloud-b', cloud(26, 6, [[7, 6, 4], [15, 8, 6], [21, 5, 3]]));
add('cloud-c', cloud(18, 5, [[6, 5, 3], [11, 6, 5]]));

// The old city: a far row of flat roofs, a nearer and darker row in front,
// water tanks and wires. Only its top half shows above the garden wall.
function skyline(far, near) {
  const c = C(400, 20);
  const lit = C(400, 20);
  const rnd = rng(11);
  for (let x = -4; x < 400; ) {
    const w = 10 + Math.floor(rnd() * 16);
    const h = 11 + Math.floor(rnd() * 9);
    rect(c, x, 20 - h, w, h, far);
    if (rnd() < 0.4) rect(c, x + 2, 20 - h - 2, 4, 2, far); // stair head
    if (rnd() < 0.35) vline(c, x + w - 3, 20 - h - 4, 4, far); // antenna
    // a lit window near the top of a tall building, clear of the nearer row
    if (h >= 15 && w >= 12 && rnd() < 0.55) rect(lit, x + 3 + Math.floor(rnd() * (w - 7)), 20 - h + 2, 1, 2, 'lanterngold');
    x += w + (rnd() < 0.3 ? 3 : 0);
  }
  let pole = null;
  for (let x = -6; x < 400; ) {
    const w = 12 + Math.floor(rnd() * 20);
    const h = 9 + Math.floor(rnd() * 5);
    const top = 20 - h;
    rect(c, x, top, w, h, near);
    if (rnd() < 0.45) {
      // water tank on two legs
      const tx = x + 2 + Math.floor(rnd() * (w - 8));
      rect(c, tx, top - 4, 4, 3, near);
      put(c, tx, top - 1, near);
      put(c, tx + 3, top - 1, near);
    }
    if (rnd() < 0.5) {
      // a pole, with a sagging wire back to the previous one
      const px = x + w - 2;
      vline(c, px, top - 5, 5, near);
      if (pole && px - pole[0] < 70) {
        const [ax, ay] = pole;
        for (let i = ax; i <= px; i++) {
          const f = (i - ax) / (px - ax);
          put(c, i, ay + (top - 5 - ay) * f + Math.round(Math.sin(f * Math.PI) * 2), near);
        }
      }
      pole = [px, top - 5];
    }
    x += w; // the near row is unbroken, so no slit of sky runs down to the wall
  }
  return { c, lit };
}
{
  add('skyline.creative', skyline('mauve', 'umber').c);
  const night = skyline('blueviolet', 'indigo');
  add('skyline.tech', night.c);
  add('windows.tech', night.lit, { emissive: true });
}

function kite(body, spine) {
  return [0, 1].map((f) => {
    const c = C(7, 12);
    for (let y = 0; y < 7; y++) {
      const half = y < 4 ? y : 6 - y;
      hline(c, 3 - half, y, half * 2 + 1, body);
    }
    vline(c, 3, 0, 7, spine);
    // the tail flutters between two shapes
    for (let i = 0; i < 5; i++) put(c, 3 + (i % 2 === f ? 1 : 0) - (i > 2 ? 1 : 0), 7 + i, 'umber');
    return c;
  });
}
add('kite-a.creative', kite('vermilion', 'gold'), { anchor: [3, 3] });
add('kite-b.creative', kite('turquoise', 'cream'), { anchor: [3, 3] });

// ------------------------------------------------------- wall, cypress, beds

{
  const c = C(400, 24);
  rect(c, 0, 6, 400, 18, 'redsand');
  hline(c, 0, 4, 400, 'sandlight');
  hline(c, 0, 5, 400, 'sandshadow');
  for (let x = 1; x < 400; x += 6) {
    // small merlons along the coping
    rect(c, x, 2, 3, 2, 'redsand');
    hline(c, x, 2, 3, 'sandlight');
  }
  remap(c, (x, y, now) => {
    if (now !== 'redsand' || y < 6) return undefined;
    if (y >= 22) return 'sandshadow';
    if ((y === 11 || y === 16) && dither(x, y, 0.5)) return 'sandshadow'; // courses of stone
    return undefined;
  });
  // the gate: a taller block with a cusped doorway
  rect(c, 190, 0, 20, 24, 'redsand');
  hline(c, 190, 0, 20, 'sandlight');
  vline(c, 209, 1, 23, 'sandlight');
  vline(c, 190, 1, 23, 'sandshadow');
  cuspedArch(c, 200, 12, 6, 24, 'sandshadow');
  cuspedArch(c, 200, 13, 5, 24, 'plum');
  add('wall', c);
}

{
  const widths = [1, 1, 3, 3, 3, 5, 5, 5, 5, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 5, 5, 5, 3];
  const c = C(7, 26);
  widths.forEach((w, y) => hline(c, 3 - (w - 1) / 2, y, w, 'cypress'));
  rim(c, 'deepleaf', null);
  remap(c, (x, y, now) => (now === 'cypress' && x > 3 && (x + y) % 3 === 0 ? 'deepleaf' : undefined));
  vline(c, 3, 24, 2, 'umber');
  add('cypress', c, { anchor: [3, 26] });
}

{
  const c = C(40, 7);
  const rnd = rng(23);
  rect(c, 0, 4, 40, 3, 'deepleaf');
  for (let x = 2; x < 40; x += 4) ell(c, x + rnd(), 4, 2.6, 2.2, 'leaf');
  for (let x = 1; x < 40; x += 3) {
    const y = 1 + Math.floor(rnd() * 2);
    const bloom = pick(rnd, ['madder', 'vermilion', 'blossomlt', 'gold', 'vermilion']);
    rect(c, x, y, 1, 2, bloom);
    put(c, x, y + 2, 'leaf');
  }
  add('flowerbed', c);
}

// --------------------------------------------------------- pavilion and water

{
  const c = C(80, 66);
  // plinth
  rect(c, 0, 60, 80, 6, 'redsand');
  hline(c, 0, 60, 80, 'sandlight');
  hline(c, 0, 65, 80, 'sandshadow');
  // The arcade wall, then three cusped openings. The pavilion is open on
  // both sides: inside each arch is the shaded interior, and inside that a
  // smaller arch cut clean through, the far side, where the sky and the
  // garden wall show (the layout puts the low sun right behind the pavilion).
  rect(c, 4, 22, 72, 38, 'redsand');
  hline(c, 4, 25, 72, 'sandlight');
  const bays = [[8, 27], [31, 49], [53, 72]];
  for (const [l, r] of bays) {
    const cx = (l + r) / 2;
    const half = (r - l) / 2 - 2;
    cuspedArch(c, cx, 38, half + 1, 60, 'sandshadow'); // the reveal
    cuspedArch(c, cx, 39, half, 60, 'umber'); // the shaded interior
    rect(c, Math.round(cx - half), 53, Math.round(half * 2), 7, 'plum'); // deeper shade low down
    cuspedArch(c, cx, 40, half - 2, 52, null); // the far arch
  }
  // piers catch the light on their right edge
  for (const x of [4, 27, 49, 72]) {
    vline(c, x + 3, 26, 34, 'sandlight');
    vline(c, x, 26, 34, 'sandshadow');
  }
  // jali railing across the two side bays; the centre bay is the way in
  for (const [l, r] of [bays[0], bays[2]]) {
    for (let x = l; x < r; x++) {
      for (let y = 51; y < 60; y++) {
        const rail = y === 51 || y === 59 || (x + y) % 2 === 0;
        if (rail) put(c, x, y, y === 51 ? 'parchment' : 'marbleshade');
      }
    }
  }
  rect(c, 33, 60, 14, 2, 'parchment'); // the step up
  hline(c, 33, 61, 14, 'marbleshade');
  // deep eave with its shadow
  rect(c, 0, 16, 80, 2, 'sandlight');
  rect(c, 1, 18, 78, 2, 'redsand');
  rect(c, 3, 20, 74, 2, 'sandshadow');
  // parapet, merlons and four small finials (no domes)
  rect(c, 6, 9, 68, 7, 'redsand');
  hline(c, 6, 9, 68, 'sandlight');
  for (let x = 6; x < 74; x += 4) rect(c, x, 7, 2, 2, 'redsand');
  remap(c, (x, y, now) => (now === 'redsand' && y === 13 && x % 2 === 0 ? 'sandshadow' : undefined));
  for (const x of [8, 29, 50, 71]) {
    rect(c, x - 1, 4, 3, 5, 'redsand');
    put(c, x, 3, 'sandlight');
    vline(c, x + 1, 4, 5, 'sandlight');
  }
  add('pavilion', c, { points: { glow: [33, 34] } });

  // dusk only: a lantern lit inside the centre arch, and the light it throws
  const glow = C(14, 24);
  remap(glow, (x, y) => {
    const d = Math.hypot(x + 0.5 - 7, (y + 0.5 - 8) * 0.8);
    if (d < 9 && dither(x, y, 0.75 - d / 12)) return d < 4.5 ? 'brass' : 'brasssh';
    return undefined;
  });
  vline(glow, 7, 0, 6, 'brasssh');
  rect(glow, 6, 6, 3, 4, 'lanterngold');
  put(glow, 7, 7, 'cream');
  put(glow, 7, 8, 'cream');
  add('pavilion-glow.tech', glow, { emissive: true });
}

{
  // the rill, running into a square pool with a marble rim
  const c = C(94, 12);
  hline(c, 0, 4, 94, 'parchment');
  rect(c, 0, 5, 94, 2, 'turquoise');
  hline(c, 0, 7, 94, 'marbleshade');
  rect(c, 46, 0, 28, 12, 'parchment');
  rect(c, 47, 1, 26, 9, 'turquoise');
  rect(c, 47, 8, 26, 2, 'teal');
  hline(c, 46, 11, 28, 'marbleshade');
  for (const [x, y] of [[8, 5], [21, 6], [35, 5], [52, 3], [60, 5], [67, 2], [81, 6], [88, 5]]) hline(c, x, y, 2, 'sparkle');
  add('water', c, { points: { jet: [60, 9] } });

  // a one-pixel jet with drops falling away from its head
  const jet = [[[1, 2], [3, 2]], [[0, 3], [4, 3]], [[0, 5], [4, 5]], [[1, 8], [3, 8]]].map((drops, f) => {
    const f0 = C(5, 10);
    vline(f0, 2, 2 - (f % 2), 8 + (f % 2), 'sparkle');
    for (const [x, y] of drops) put(f0, x, y, 'parchment');
    return f0;
  });
  add('fountain', jet, { anchor: [2, 10] });
}

// ----------------------------------------------------------------------- tree

{
  const c = C(190, 172);
  ell(c, 98, 170, 10, 3, 'umber'); // root flare
  limb(c, [[98, 169], [97, 140], [99, 112], [100, 92]], 6, 5, 'umber');
  limb(c, [[101, 98], [118, 88], [140, 82], [162, 82], [178, 85], [188, 90]], 4.5, 1.2, 'umber'); // the bough over the carpet
  limb(c, [[98, 96], [84, 74], [62, 56], [40, 46]], 4, 1.5, 'umber');
  limb(c, [[100, 94], [104, 66], [112, 40], [118, 24]], 3.5, 1.2, 'umber');
  limb(c, [[140, 82], [150, 66], [158, 54]], 2, 0.8, 'umber');
  limb(c, [[84, 74], [76, 50], [70, 34]], 2, 0.8, 'umber');
  rim(c, 'taupe', 'plum');
  const rnd = rng(5);
  for (let i = 0; i < 26; i++) {
    // bark
    const x = 93 + Math.floor(rnd() * 9);
    const y = 100 + Math.floor(rnd() * 64);
    if (get(c, x, y) === 'umber') vline(c, x, y, 2 + Math.floor(rnd() * 3), 'plum');
  }
  add('tree', c, { anchor: [98, 170], points: { lantern: [178, 88] } });
}

// One set of clumps for both canopies, so the blossom and the green tree are
// plainly the same tree. Each clump is a core with smaller puffs round it, and
// every puff is shaded on its own (lit towards the upper right, dark below,
// dithered between), which is what makes a mass of foliage read as clumps.
const CLUMPS = [
  [70, 22, 34, 19], [28, 32, 27, 20], [112, 26, 30, 19], [150, 24, 26, 17], [143, 44, 23, 15], [13, 54, 13, 14],
  [172, 42, 15, 13], [56, 48, 29, 17], [98, 50, 26, 15], [34, 62, 22, 13], [128, 62, 21, 12], [156, 60, 16, 11],
  [20, 78, 18, 10], [62, 72, 24, 12], [96, 72, 20, 11], [136, 76, 16, 8], [164, 70, 15, 9], [178, 76, 10, 7],
];
function canopy(tones, extra, seed) {
  const [shade, mid, light, hi] = tones;
  const c = C(190, 100);
  const rnd = rng(seed);
  const puffs = [];
  for (const [cx, cy, rx, ry] of [...CLUMPS, ...extra]) {
    puffs.push([cx, cy, rx * 0.8, ry * 0.8]);
    for (let i = 0; i < 7; i++) {
      const angle = ((i + rnd()) / 7) * Math.PI * 2;
      const size = 0.34 + rnd() * 0.2;
      puffs.push([cx + Math.cos(angle) * rx * 0.62, cy + Math.sin(angle) * ry * 0.62, rx * size, ry * size + 2]);
    }
  }
  // higher puffs first, so lower ones overlap them and their dark undersides separate the layers
  puffs.sort((a, b) => a[1] - b[1]);
  for (const [cx, cy, rx, ry] of puffs) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const nx = (x + 0.5 - cx) / rx;
        const ny = (y + 0.5 - cy) / ry;
        if (nx * nx + ny * ny > 1) continue;
        const lit = nx * 0.4 - ny * 0.8 + (BAYER4[(y & 3) * 4 + (x & 3)] / 16 - 0.5) * 0.35;
        put(c, x, y, lit > 0.32 ? light : lit > -0.3 ? mid : shade);
      }
    }
  }
  // a scatter of brightest flecks, and a roughened outline
  const whole = clone(c);
  remap(c, (x, y, now) => {
    if (!now) return undefined;
    const edge = !get(whole, x - 1, y) || !get(whole, x + 1, y) || !get(whole, x, y - 1) || !get(whole, x, y + 1);
    const r = rnd();
    if (edge && r < 0.2) return null;
    if (now === light && r < 0.12) return hi;
    return undefined;
  });
  return c;
}
add('canopy.creative', canopy(['blossomsh', 'blossom', 'blossomlt', 'petal'], [], 7));
add('canopy.tech', canopy(['cypress', 'deepleaf', 'leaf', 'duskgrasslt'], [[90, 36, 30, 16], [44, 44, 22, 12]], 7));

function lantern(lit, frame) {
  const c = C(7, 18);
  for (let y = 0; y < 4; y++) put(c, 3, y, y % 2 ? 'brass' : 'brasssh');
  put(c, 3, 4, 'brass');
  hline(c, 2, 5, 3, 'brass');
  hline(c, 1, 6, 5, lit ? 'brasssh' : 'brass');
  rect(c, 1, 7, 5, 6, lit ? 'lanterngold' : 'umber'); // the glass
  for (let y = 7; y < 13; y++) {
    put(c, 1, y, 'brasssh');
    put(c, 5, y, lit ? 'brasssh' : 'brass');
    if (y % 2 === 0) put(c, 3, y, 'brasssh'); // pierced work
  }
  if (lit) {
    // the flame: a pale core that shifts and dims between frames
    put(c, 2 + (frame === 2 ? 2 : 0), 9, 'cream');
    put(c, 3, 9 + (frame === 1 ? 1 : 0), 'cream');
    put(c, 3, 11, frame === 1 ? 'ember' : 'cream');
    put(c, 4 - (frame === 2 ? 2 : 0), 10, 'ember');
  }
  hline(c, 1, 13, 5, lit ? 'brasssh' : 'brass');
  hline(c, 2, 14, 3, 'brasssh');
  put(c, 3, 15, 'brass');
  vline(c, 3, 16, 2, lit ? 'oxblood' : 'madder'); // tassel
  return c;
}
add('lantern.creative', lantern(false, 0), { anchor: [3, 0] });
add('lantern.tech', [lantern(true, 0), lantern(true, 1), lantern(true, 2)], { anchor: [3, 0], emissive: true });

// ----------------------------------------------------------------------- lawn

{
  const c = C(400, 62);
  const rnd = rng(31);
  rect(c, 0, 0, 400, 62, 'grass');
  remap(c, (x, y) => {
    // the far edge of the lawn catches the low sun
    if (y < 8 && dither(x, y, 0.7 - y / 10)) return 'sunlitgrass';
    // the tree's long shadow, falling across the carpet
    const d = Math.hypot((x - 150) / 112, (y - 37) / 15);
    if (d < 1 && dither(x, y, (1 - d) * 0.9)) return 'leaf';
    return undefined;
  });
  for (let i = 0; i < 520; i++) {
    const x = Math.floor(rnd() * 400);
    const y = 6 + Math.floor(rnd() * 55);
    vline(c, x, y, rnd() < 0.4 ? 2 : 1, rnd() < 0.5 ? 'sunlitgrass' : 'leaf');
  }
  add('lawn', c);
}

// ------------------------------------------------------- carpet and its things

{
  const c = C(104, 18);
  const skew = 6; // the far edge sits this many pixels to the right of the near edge
  for (let y = 0; y < 18; y++) {
    const x0 = 2 + Math.round((skew * (17 - y)) / 17);
    for (let u = 0; u < 94; u++) {
      let name = 'madder';
      if (y < 2 || y > 15 || u < 3 || u > 90) name = 'indigo';
      else if (y === 2 || y === 15 || u === 3 || u === 90) name = 'gold';
      else {
        const d = Math.abs(((u + 4) % 14) - 7) + Math.abs(y - 8.5) * 1.4;
        if (d < 2.2) name = 'turquoise';
        else if (d < 4.6) name = 'cream';
        else if ((u + 4) % 14 === 0 && (y === 5 || y === 12)) name = 'vermilion';
      }
      put(c, x0 + u, y, name);
    }
    if (y % 2 === 0) {
      // fringed ends
      rect(c, x0 - 2, y, 2, 1, 'parchment');
      rect(c, x0 + 94, y, 2, 1, 'parchment');
    }
  }
  add('carpet', c);
}

{
  const c = C(16, 12);
  rect(c, 1, 1, 14, 10, 'vermilion');
  rect(c, 0, 3, 16, 6, 'vermilion');
  remap(c, (x, y, now) => {
    if (!now) return undefined;
    if (x % 4 === 1) return 'parchment'; // stripes
    if (y >= 9) return 'madder';
    return undefined;
  });
  put(c, 0, 5, 'gold');
  put(c, 0, 6, 'gold');
  put(c, 15, 5, 'gold');
  put(c, 15, 6, 'gold');
  add('bolster', c);
}

// ------------------------------------------------------------------ the owner
// Short curly black hair, short beard, navy zip-neck sweater with a white
// collar, light blue jeans. Only the pose changes between stagings.

function sketching(hand) {
  const c = C(32, 42);
  // crossed legs, with the knee nearest us raised
  ell(c, 15, 36, 15, 5.5, 'moonstone');
  ell(c, 26, 32, 5.5, 7, 'moonstone');
  ell(c, 12, 33.5, 8, 2.5, 'moonlight', true);
  ell(c, 27, 28, 3.5, 2.5, 'moonlight', true);
  ell(c, 15, 40, 12, 1.5, 'periwinkle', true);
  ell(c, 5, 39, 4, 2.2, 'skin'); // bare foot tucked under
  // torso, leaning into the work
  limb(c, [[14, 31], [13, 22], [14, 16]], 6, 5, 'indigo');
  ell(c, 17, 20, 2, 5, 'blueviolet', true);
  rect(c, 14, 12, 4, 3, 'parchment'); // collar
  // head: looking down and to the right
  ell(c, 16.5, 8, 4.5, 5, 'skin');
  ell(c, 18.5, 7, 2, 2.5, 'skinlt', true);
  rect(c, 13, 10, 7, 3, 'hair'); // beard
  put(c, 20, 10, 'hair');
  put(c, 20, 9, 'skin');
  ell(c, 15, 4.5, 5.5, 4, 'ink'); // curls
  for (const [x, y] of [[10, 6], [10, 8], [11, 9], [13, 1], [17, 1], [20, 3], [20, 5]]) put(c, x, y, 'ink');
  put(c, 18, 8, 'ink'); // eye
  // the tab, propped between lap and knee, and the far hand steadying it
  for (let i = 0; i < 6; i++) line(c, 15, 26 + i, 25, 21 + i, i === 0 || i === 5 ? 'plum' : 'cream');
  vline(c, 15, 26, 6, 'plum');
  vline(c, 25, 21, 6, 'plum');
  rect(c, 14, 29, 2, 2, 'skin');
  // near arm and the stylus hand, which is what moves
  limb(c, [[17, 17], [22, 20], [21 + hand, 22]], 2.2, 1.6, 'indigo');
  rect(c, 19 + hand, 22, 2, 2, 'skinlt');
  line(c, 19 + hand, 24, 18 + hand, 25, 'umber');
  return c;
}
add('character.creative', [0, 1, 2, 1].map(sketching), { anchor: [0, 42], points: { perch: [28, 26] } });

function typing(hand) {
  const c = C(52, 32);
  // legs stretched out, ankles crossed
  limb(c, [[25, 26], [37, 24], [47, 28]], 3.6, 2.6, 'periwinkle');
  limb(c, [[25, 25], [37, 22], [47, 26]], 3.4, 2.4, 'moonstone');
  line(c, 27, 22, 37, 19, 'moonlight');
  line(c, 38, 20, 46, 24, 'moonlight');
  ell(c, 49.5, 25, 2.5, 4, 'umber'); // shoes
  // torso, leaning back into the bolster
  limb(c, [[10, 15], [17, 21], [24, 26]], 5.5, 5, 'indigo');
  line(c, 13, 12, 22, 20, 'blueviolet');
  rect(c, 11, 11, 4, 2, 'moonlight'); // collar
  // head
  ell(c, 9.5, 6.5, 4.5, 5, 'skinsh');
  ell(c, 11.5, 6, 2.5, 3, 'skin', true); // the screen lights his face
  rect(c, 8, 9, 6, 3, 'hair');
  put(c, 13, 8, 'skin');
  ell(c, 7.5, 3.5, 5.5, 4, 'ink');
  for (const [x, y] of [[2, 5], [3, 7], [4, 8], [6, 0], [10, 0], [13, 2]]) put(c, x, y, 'ink');
  put(c, 11, 6, 'ink');
  // laptop: base on the lap, lid open towards him with the lit screen on the inside
  line(c, 25, 20, 35, 19, 'moonstone');
  line(c, 25, 21, 35, 20, 'periwinkle');
  line(c, 36, 19, 40, 9, 'periwinkle');
  line(c, 35, 19, 39, 9, 'mint');
  // arm to the keyboard; the hand is what moves
  limb(c, [[15, 15], [22, 19], [28 + hand, 18]], 2.3, 1.7, 'indigo');
  rect(c, 29 + hand, 17, 2, 2, 'skin');
  return c;
}
add('character.tech', [0, 1, 0, 1].map(typing), { anchor: [0, 32], points: { perch: [18, 13] }, emissive: true });

// ----------------------------------------------------------------- the parrot

function parrotAwake(tilt, blink) {
  const c = C(14, 10);
  line(c, 9, 6, 13, 9, 'leaf'); // long tail
  line(c, 9, 7, 12, 9, 'teal');
  ell(c, 6.5, 5.5, 3.5, 3, 'ringneck');
  ell(c, 7.5, 6, 2.5, 2, 'leaf', true); // folded wing
  ell(c, 3.5, 3 - tilt, 2.5, 2.5, 'ringneck');
  put(c, 5, 4 - tilt, 'blossom'); // the rose-and-black neck ring
  put(c, 4, 5 - tilt, 'ink');
  put(c, 0, 3 - tilt, 'vermilion');
  put(c, 1, 3 - tilt, 'vermilion');
  put(c, 0, 4 - tilt, 'madder');
  put(c, 3, 2 - tilt, blink ? 'leaf' : 'ink');
  put(c, 5, 9, 'taupe');
  put(c, 7, 9, 'taupe');
  return c;
}
add('parrot.creative', [parrotAwake(0, false), parrotAwake(1, false), parrotAwake(1, true), parrotAwake(1, false)], {
  anchor: [6, 10],
});

function parrotAsleep(breath) {
  const c = C(9, 8);
  ell(c, 4.5, 4.5 - breath * 0.5, 4, 3.5 + breath * 0.5, 'leaf');
  ell(c, 5, 6, 3.5, 2, 'deepleaf', true);
  put(c, 7, 6, 'deepleaf');
  put(c, 8, 7, 'deepleaf');
  hline(c, 2, 3, 2, 'cypress'); // closed eye
  put(c, 1, 4, 'madder'); // beak, tucked in
  return c;
}
add('parrot.tech', [parrotAsleep(0), parrotAsleep(1)], { anchor: [4, 8] });

// ------------------------------------------------------------- tray, cat, kit

{
  const tray = (body, rimTone, under) => {
    const c = C(20, 10);
    ell(c, 10, 8, 10, 2, body);
    hline(c, 2, 6, 16, rimTone);
    hline(c, 3, 9, 14, under);
    return c;
  };

  const coffee = tray('brass', 'lanterngold', 'brasssh');
  ell(coffee, 5.5, 5, 2.5, 3, 'brass'); // the pot
  rect(coffee, 5, 0, 2, 2, 'brass');
  put(coffee, 5, 3, 'lanterngold');
  put(coffee, 2, 3, 'brass');
  put(coffee, 1, 2, 'brass');
  for (const [x, y] of [[8, 3], [9, 4], [8, 6]]) put(coffee, x, y, 'brasssh');
  rect(coffee, 13, 5, 4, 3, 'parchment'); // the cup
  hline(coffee, 13, 5, 4, 'umber');
  put(coffee, 17, 6, 'parchment');
  hline(coffee, 12, 8, 6, 'marbleshade');
  add('tray.creative', coffee, { points: { steam: [15, 4] } });

  const lunch = tray('brasssh', 'brass', 'umber');
  ell(lunch, 7, 7, 5.5, 1.6, 'moonlight'); // plate, half cleared
  rect(lunch, 4, 5, 3, 2, 'redsand');
  put(lunch, 7, 6, 'sandshadow');
  put(lunch, 8, 6, 'deepleaf');
  rect(lunch, 14, 3, 3, 5, 'moonstone'); // steel tumbler
  vline(lunch, 16, 3, 5, 'moonlight');
  add('tray.tech', lunch);
}

function catSitting(tail) {
  const c = C(12, 13);
  ell(c, 7, 9, 4, 4, 'taupe');
  rect(c, 3, 9, 3, 4, 'taupe'); // front legs
  ell(c, 4, 4.5, 3, 2.6, 'taupe');
  put(c, 2, 1, 'taupe');
  put(c, 5, 1, 'taupe');
  rect(c, 3, 7, 2, 4, 'parchment'); // chest
  put(c, 3, 4, 'ink');
  put(c, 5, 4, 'ink');
  for (const [x, y] of [[8, 6], [9, 8], [8, 10]]) put(c, x, y, 'umber'); // tabby marks
  line(c, 10, 12, 11, 11 - tail, 'umber');
  put(c, 11, 10 - tail * 2, 'umber');
  return c;
}
add('cat.creative', [catSitting(0), catSitting(1)], { anchor: [0, 13] });

function catAsleep(breath) {
  const c = C(14, 7);
  ell(c, 7.5, 4.5 - breath * 0.5, 6.5, 2.5 + breath * 0.5, 'umber');
  ell(c, 3, 4, 2.6, 2.4, 'umber');
  put(c, 2, 1, 'umber');
  put(c, 4, 1, 'umber');
  hline(c, 6, 2 - breath, 6, 'taupe'); // moonlight along the back
  hline(c, 2, 6, 9, 'plum'); // tail wrapped round
  hline(c, 2, 4, 2, 'plum'); // closed eyes
  return c;
}
add('cat.tech', [catAsleep(0), catAsleep(1)], { anchor: [0, 7] });

{
  // creative: a camera and a pair of headphones
  const c = C(22, 8);
  rect(c, 0, 3, 8, 5, 'plum');
  rect(c, 2, 2, 3, 1, 'plum');
  ell(c, 4, 5.5, 2, 2, 'taupe');
  put(c, 4, 5, 'ink');
  put(c, 6, 2, 'vermilion');
  ell(c, 16, 5, 5, 5, 'ink');
  ell(c, 16, 5.5, 4, 4.5, null);
  rect(c, 11, 6, 11, 2, null);
  rect(c, 11, 4, 2, 4, 'madder');
  rect(c, 19, 4, 2, 4, 'madder');
  add('clutter.creative', c, { anchor: [0, 8] });
}

function rover(on) {
  const c = C(22, 9);
  rect(c, 1, 4, 11, 3, 'moonstone');
  rect(c, 3, 2, 6, 2, 'periwinkle');
  for (const x of [2.5, 6.5, 10.5]) ell(c, x, 7.5, 1.5, 1.5, 'ink');
  vline(c, 9, 0, 2, 'taupe');
  put(c, 10, 0, 'taupe');
  put(c, 4, 1, on ? 'ember' : 'oxblood'); // the light that blinks
  rect(c, 16, 6, 6, 3, 'plum'); // power bank
  put(c, 17, 7, 'mint');
  return c;
}
add('clutter.tech', [rover(true), rover(false)], { anchor: [0, 9], emissive: true });

{
  // The tablet prop. Its screen is one flat lit colour because the site menu's
  // real links are laid over it; "screen" marks the screen's top-left corner.
  const c = C(22, 30);
  rect(c, 0, 0, 22, 30, 'plum');
  for (const [x, y] of [[0, 0], [21, 0], [0, 29], [21, 29]]) put(c, x, y, null);
  rect(c, 2, 2, 18, 26, 'cream');
  add('tablet', c, { points: { screen: [2, 2] }, emissive: true });

  const table = C(18, 16);
  hline(table, 2, 0, 14, 'sandlight');
  hline(table, 0, 1, 18, 'sandlight');
  hline(table, 1, 2, 16, 'redsand');
  for (let x = 2; x < 16; x += 3) put(table, x, 1, x % 2 ? 'turquoise' : 'parchment'); // inlay
  rect(table, 2, 3, 14, 13, 'redsand');
  vline(table, 15, 3, 13, 'sandlight');
  vline(table, 2, 3, 13, 'sandshadow');
  cuspedArch(table, 6, 10, 2, 16, 'umber');
  cuspedArch(table, 12, 10, 2, 16, 'umber');
  add('side-table', table);
}

// ------------------------------------------------------------------ foreground

{
  const tuft = C(9, 6);
  for (const [x0, y0, x1, y1] of [[0, 5, 1, 2], [2, 5, 2, 1], [4, 5, 4, 0], [6, 5, 6, 2], [8, 5, 7, 3]]) {
    line(tuft, x0, y0, x1, y1, 'leaf');
    put(tuft, x1, y1, 'sunlitgrass');
  }
  add('tuft', tuft, { anchor: [4, 6] });

  const c = C(26, 16);
  ell(c, 13, 16, 13, 5, 'deepleaf');
  const stems = [[3, 7], [7, 3], [10, 6], [14, 2], [18, 5], [22, 8]];
  const blooms = ['vermilion', 'blossomlt', 'madder', 'vermilion', 'gold', 'madder'];
  stems.forEach(([x, top], i) => {
    vline(c, x, top + 2, 14 - top, 'leaf');
    line(c, x, 13, x + (i % 2 ? 2 : -2), 9, 'leaf'); // a leaf blade
    rect(c, x - 1, top + 1, 3, 2, blooms[i]);
    put(c, x - 1, top, blooms[i]);
    put(c, x + 1, top, blooms[i]);
  });
  add('tulips', c, { anchor: [0, 16] });
}

// -------------------------------------------------- small things for particles

{
  const dots = (w, h, frames) =>
    frames.map((pixels) => {
      const c = C(w, h);
      for (const [x, y, name] of pixels) put(c, x, y, name);
      return c;
    });
  const cross = (core, arms) => [[1, 1, core], [1, 0, arms], [0, 1, arms], [2, 1, arms], [1, 2, arms]];

  add('petal.creative', dots(3, 3, [
    [[0, 1, 'blossomlt'], [1, 1, 'petal'], [1, 0, 'petal']],
    [[1, 0, 'blossomlt'], [1, 1, 'petal'], [1, 2, 'blossomlt']],
    [[1, 1, 'petal'], [2, 1, 'blossomlt'], [2, 2, 'petal']],
    [[0, 1, 'petal'], [1, 1, 'blossomlt'], [2, 1, 'petal']],
  ]), { anchor: [1, 1] });

  add('leaf.tech', dots(3, 3, [
    [[0, 1, 'deepleaf'], [1, 1, 'leaf'], [2, 0, 'leaf']],
    [[1, 0, 'leaf'], [1, 1, 'deepleaf'], [1, 2, 'deepleaf']],
  ]), { anchor: [1, 1] });

  add('firefly.tech', dots(3, 3, [
    [[1, 1, 'brass']],
    [[1, 1, 'lanterngold']],
    cross('cream', 'lanterngold'),
    [[1, 1, 'lanterngold']],
  ]), { anchor: [1, 1], emissive: true });

  add('steam.creative', dots(3, 5, [
    [[1, 4, 'parchment'], [1, 3, 'parchment'], [2, 2, 'parchment']],
    [[1, 3, 'parchment'], [0, 2, 'parchment'], [1, 1, 'parchment']],
    [[2, 2, 'parchment'], [1, 1, 'parchment'], [1, 0, 'parchment']],
  ]), { anchor: [1, 5] });

  add('glint.creative', dots(3, 3, [[[1, 1, 'gold']], cross('cream', 'gold'), [[1, 1, 'cream']]]), {
    anchor: [1, 1],
    emissive: true,
  });
  add('glint.tech', dots(3, 3, [[[1, 1, 'moonstone']], cross('moonlight', 'moonstone'), [[1, 1, 'moonlight']]]), {
    anchor: [1, 1],
    emissive: true,
  });
}

// ---------------------------------------------------------------------- write

const hexToRgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const rgb = Object.fromEntries(Object.entries(palette.colors).map(([name, hex]) => [name, hexToRgb(hex)]));

async function writeSprite(stem, frames) {
  const { w, h } = frames[0];
  if (frames.some((f) => f.w !== w || f.h !== h)) throw new Error(`${stem}: frames differ in size`);
  const data = Buffer.alloc(w * frames.length * h * 4);
  frames.forEach((frame, f) => {
    frame.px.forEach((name, i) => {
      if (!name) return;
      if (!rgb[name]) throw new Error(`${stem}: "${name}" is not a palette colour`);
      const at = ((Math.floor(i / w) * frames.length + f) * w + (i % w)) * 4;
      data.set(rgb[name], at);
      data[at + 3] = 255;
    });
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

let written = 0;
const kept = [];
for (const [stem, sprite] of sprites) {
  const source = meta[stem]?.source;
  if (source === 'generated' || source === 'override') {
    kept.push(stem); // real art has taken this one over
    continue;
  }
  await writeSprite(stem, sprite.frames);
  meta[stem] = {
    frames: sprite.frames.length,
    anchor: sprite.anchor,
    points: sprite.points,
    emissive: sprite.emissive,
    source: 'greybox',
  };
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
console.log(`greybox: wrote ${written} sprites to art/sprites` + (kept.length ? `, left ${kept.join(', ')} alone` : ''));
