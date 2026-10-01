// Turns the approved stills and cut-out sheets in art/raw/ into the scene's
// real layers at art resolution: one background plate, the tree, and one
// sprite per foreground thing, all snapped to one palette fitted to the scene.
//
//   node scripts/build-scene-art.mjs [--staging creative|tech] [--scale 3]
//
// Output: art/scene/<staging>/<id>.png, art/scene/<staging>/layout.json and
// art/scene/preview-<staging>.png (the layers composed, enlarged, for review).
//
// The raw images are 1088x608 "pixel art" whose pixels sit on no real grid, so
// everything is reduced by the same factor to a true 352x198 grid. Positions
// below are in RAW pixels of the plate, because that is where they are measured.
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RAW = { w: 1088, h: 608 };
const GRID = { w: 352, h: 198 };
const REDUCE = GRID.w / RAW.w;
const PALETTE_SIZE = 96;

/**
 * Each sheet lists its things left to right. `foot` is where the bottom-centre
 * of the thing stands on the plate; `height` is how tall it should be there
 * (raw pixels). z orders the layers; the plate is 0 and the tree is 20.
 */
const STAGINGS = {
  creative: {
    plate: 'layers/creative-plate.png',
    tree: { file: 'layers/creative-tree.png', key: 'checker', scale: 0.68, at: [0, 0] },
    sheet: {
      file: 'layers/creative-sheet.png',
      things: [
        { id: 'figure', foot: [230, 500], height: 190, z: 50 },
        { id: 'parrot', foot: [322, 474], height: 92, z: 55 },
        { id: 'cat', foot: [66, 522], height: 95, z: 60 },
        { id: 'tray', foot: [362, 548], height: 75, z: 58 },
        { id: 'table', foot: [436, 510], height: 128, z: 45 },
        { id: 'lantern', top: [236, 92], height: 145, z: 30 },
        { id: 'kite-a', foot: [972, 310], height: 34, z: 5 },
        { id: 'kite-b', foot: [1046, 304], height: 26, z: 5 },
      ],
    },
  },
  tech: {
    plate: 'layers/tech-plate.png',
    tree: { file: 'layers/tech-tree.png', key: 'magenta', scale: 0.68, at: [0, 0] },
    sheet: {
      file: 'layers/tech-sheet.png',
      things: [
        { id: 'figure', foot: [250, 512], height: 186, z: 50 },
        { id: 'cat', foot: [66, 522], height: 62, z: 60 },
        { id: 'tray', foot: [345, 542], height: 56, z: 58 },
        { id: 'table', foot: [436, 510], height: 128, z: 45 },
        { id: 'lantern', top: [205, 96], height: 150, z: 30 },
        { id: 'rover', foot: [470, 560], height: 60, z: 62 },
      ],
    },
  },
};

// --- pixels -----------------------------------------------------------------

async function loadRgb(file) {
  const { data, info } = await sharp(path.join(root, 'art/raw', file)).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, w: info.width, h: info.height };
}

/** True for the flat magenta the sheets are drawn on. */
const isMagenta = (r, g, b) => r > 140 && b > 140 && Math.min(r, b) - g > 90;
/** True for a pixel on a thing's rim that the magenta has bled into. */
const isMagentaTinted = (r, g, b) => r > 80 && b > 80 && Math.min(r, b) - g > 45;
/** True for the grey-and-white checkerboard painted behind the creative tree. */
const isChecker = (r, g, b) => Math.max(r, g, b) - Math.min(r, g, b) < 14 && Math.min(r, g, b) > 205;

/**
 * Opaque mask (1 = part of a thing) for an image drawn on a key background.
 * With `isTinted`, rim pixels the key colour has bled into are peeled off too,
 * working inwards from the background for a few pixels, so no coloured fringe is left.
 */
function mask({ data, w, h }, isKey, isTinted) {
  const out = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) out[i] = isKey(data[i * 3], data[i * 3 + 1], data[i * 3 + 2]) ? 0 : 1;
  for (let pass = 0; isTinted && pass < 3; pass++) {
    const peel = [];
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (!out[i] || !isTinted(data[i * 3], data[i * 3 + 1], data[i * 3 + 2])) continue;
        const touchesBackground =
          (x > 0 && !out[i - 1]) || (x < w - 1 && !out[i + 1]) || (y > 0 && !out[i - w]) || (y < h - 1 && !out[i + w]);
        if (touchesBackground) peel.push(i);
      }
    }
    if (!peel.length) break;
    for (const i of peel) out[i] = 0;
  }
  return out;
}

/** Bounding boxes of the separate things on a sheet, left to right. Specks are ignored. */
function findThings(opaque, w, h) {
  const seen = new Uint8Array(w * h);
  const boxes = [];
  const stack = [];
  for (let start = 0; start < w * h; start++) {
    if (!opaque[start] || seen[start]) continue;
    let x0 = w, y0 = h, x1 = 0, y1 = 0, count = 0;
    seen[start] = 1;
    stack.push(start);
    while (stack.length) {
      const p = stack.pop();
      const x = p % w;
      const y = (p - x) / w;
      count++;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const q = ny * w + nx;
          if (opaque[q] && !seen[q]) {
            seen[q] = 1;
            stack.push(q);
          }
        }
      }
    }
    if (count > 60) boxes.push({ x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 });
  }
  return boxes.sort((a, b) => a.x - b.x);
}

/**
 * Reduces a region of a raw image to art pixels. Each art pixel takes the most
 * common colour in its cell (an average would turn crisp pixel art to mud) and
 * is opaque when at least half of its cell is.
 */
function reduce(image, opaque, box, outW, outH) {
  const out = Buffer.alloc(outW * outH * 4);
  const stepX = box.w / outW;
  const stepY = box.h / outH;
  for (let ty = 0; ty < outH; ty++) {
    for (let tx = 0; tx < outW; tx++) {
      const sx0 = Math.floor(box.x + tx * stepX);
      const sx1 = Math.max(sx0 + 1, Math.floor(box.x + (tx + 1) * stepX));
      const sy0 = Math.floor(box.y + ty * stepY);
      const sy1 = Math.max(sy0 + 1, Math.floor(box.y + (ty + 1) * stepY));
      const bins = new Map();
      let solid = 0;
      let total = 0;
      for (let sy = sy0; sy < sy1; sy++) {
        for (let sx = sx0; sx < sx1; sx++) {
          if (sx < 0 || sy < 0 || sx >= image.w || sy >= image.h) continue;
          total++;
          const i = sy * image.w + sx;
          if (opaque && !opaque[i]) continue;
          solid++;
          const r = image.data[i * 3];
          const g = image.data[i * 3 + 1];
          const b = image.data[i * 3 + 2];
          const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
          const bin = bins.get(key) ?? [0, 0, 0, 0];
          bin[0] += r;
          bin[1] += g;
          bin[2] += b;
          bin[3]++;
          bins.set(key, bin);
        }
      }
      if (total === 0 || solid * 2 < total) continue;
      let best = null;
      for (const bin of bins.values()) if (!best || bin[3] > best[3]) best = bin;
      const o = (ty * outW + tx) * 4;
      out[o] = Math.round(best[0] / best[3]);
      out[o + 1] = Math.round(best[1] / best[3]);
      out[o + 2] = Math.round(best[2] / best[3]);
      out[o + 3] = 255;
    }
  }
  return { data: out, w: outW, h: outH };
}

/** Crops fully transparent rows and columns away. Returns the sprite and how far its origin moved. */
function trim(sprite) {
  let x0 = sprite.w, y0 = sprite.h, x1 = -1, y1 = -1;
  for (let y = 0; y < sprite.h; y++) {
    for (let x = 0; x < sprite.w; x++) {
      if (!sprite.data[(y * sprite.w + x) * 4 + 3]) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  if (x1 < 0) return { sprite, dx: 0, dy: 0 };
  const w = x1 - x0 + 1;
  const h = y1 - y0 + 1;
  const data = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) sprite.data.copy(data, y * w * 4, ((y + y0) * sprite.w + x0) * 4, ((y + y0) * sprite.w + x0 + w) * 4);
  return { sprite: { data, w, h }, dx: x0, dy: y0 };
}

// --- colour -----------------------------------------------------------------

const toLinear = (c) => (c /= 255) <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;

function oklab(r, g, b) {
  const lr = toLinear(r), lg = toLinear(g), lb = toLinear(b);
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

/**
 * A palette fitted to the given RGBA layers by median cut in OKLab, then a few
 * rounds of k-means. Deterministic, so the same art always gives the same palette.
 */
function fitPalette(layers, size) {
  // Histogram of the colours present. Small sprites count extra so the plate does not drown them out.
  const histogram = new Map();
  for (const layer of layers) {
    const weight = layer.w * layer.h < 4000 ? 12 : 1;
    for (let i = 0; i < layer.w * layer.h; i++) {
      if (!layer.data[i * 4 + 3]) continue;
      const key = (layer.data[i * 4] << 16) | (layer.data[i * 4 + 1] << 8) | layer.data[i * 4 + 2];
      histogram.set(key, (histogram.get(key) ?? 0) + weight);
    }
  }
  const colours = [...histogram].map(([key, count]) => {
    const rgb = [key >> 16, (key >> 8) & 255, key & 255];
    return { rgb, lab: oklab(...rgb), count };
  });

  // Median cut: keep splitting the box with the widest spread along its widest axis.
  const spread = (box) => {
    let widest = 0;
    let axis = 0;
    for (let c = 0; c < 3; c++) {
      let lo = Infinity;
      let hi = -Infinity;
      for (const colour of box) {
        if (colour.lab[c] < lo) lo = colour.lab[c];
        if (colour.lab[c] > hi) hi = colour.lab[c];
      }
      if (hi - lo > widest) {
        widest = hi - lo;
        axis = c;
      }
    }
    return { widest, axis };
  };
  const boxes = [colours];
  while (boxes.length < size) {
    let pick = -1;
    let pickSpread = null;
    for (let i = 0; i < boxes.length; i++) {
      if (boxes[i].length < 2) continue;
      const measured = spread(boxes[i]);
      if (!pickSpread || measured.widest > pickSpread.widest) {
        pick = i;
        pickSpread = measured;
      }
    }
    if (pick < 0) break;
    const box = boxes[pick].sort((p, q) => p.lab[pickSpread.axis] - q.lab[pickSpread.axis]);
    const half = box.reduce((sum, colour) => sum + colour.count, 0) / 2;
    let running = 0;
    let cut = 1;
    for (let i = 0; i < box.length - 1; i++) {
      running += box[i].count;
      if (running >= half) {
        cut = i + 1;
        break;
      }
    }
    boxes.splice(pick, 1, box.slice(0, cut), box.slice(cut));
  }

  const mean = (box) => {
    const sum = [0, 0, 0];
    let total = 0;
    for (const colour of box) {
      for (let c = 0; c < 3; c++) sum[c] += colour.lab[c] * colour.count;
      total += colour.count;
    }
    return sum.map((value) => value / total);
  };
  let centres = boxes.map(mean);
  for (let round = 0; round < 6; round++) {
    const groups = centres.map(() => []);
    for (const colour of colours) {
      let best = 0;
      let bestDistance = Infinity;
      for (let i = 0; i < centres.length; i++) {
        const d = (colour.lab[0] - centres[i][0]) ** 2 + (colour.lab[1] - centres[i][1]) ** 2 + (colour.lab[2] - centres[i][2]) ** 2;
        if (d < bestDistance) {
          bestDistance = d;
          best = i;
        }
      }
      groups[best].push(colour);
    }
    centres = groups.map((group, i) => (group.length ? mean(group) : centres[i]));
  }

  // Each palette entry is the real colour nearest its centre, so no invented in-between tones.
  return centres.map((centre) => {
    let best = colours[0];
    let bestDistance = Infinity;
    for (const colour of colours) {
      const d = (colour.lab[0] - centre[0]) ** 2 + (colour.lab[1] - centre[1]) ** 2 + (colour.lab[2] - centre[2]) ** 2;
      if (d < bestDistance) {
        bestDistance = d;
        best = colour;
      }
    }
    return best.rgb;
  });
}

/** Snaps every opaque pixel of a layer to its nearest palette colour (in OKLab). */
function snap(layer, palette, labs, cache) {
  for (let i = 0; i < layer.w * layer.h; i++) {
    if (!layer.data[i * 4 + 3]) continue;
    const r = layer.data[i * 4], g = layer.data[i * 4 + 1], b = layer.data[i * 4 + 2];
    const key = (r << 16) | (g << 8) | b;
    let index = cache.get(key);
    if (index === undefined) {
      const lab = oklab(r, g, b);
      let best = Infinity;
      for (let p = 0; p < labs.length; p++) {
        const d = (lab[0] - labs[p][0]) ** 2 + (lab[1] - labs[p][1]) ** 2 + (lab[2] - labs[p][2]) ** 2;
        if (d < best) {
          best = d;
          index = p;
        }
      }
      cache.set(key, index);
    }
    layer.data.set(palette[index], i * 4);
  }
}

// --- build ------------------------------------------------------------------

async function buildStaging(name, enlarge) {
  const config = STAGINGS[name];
  const missing = [config.plate, config.tree.file, config.sheet.file].filter((file) => !existsSync(path.join(root, 'art/raw', file)));
  if (missing.length) {
    console.log(`${name}: skipped, waiting for ${missing.join(', ')}`);
    return;
  }

  const layers = [];

  const plate = await loadRgb(config.plate);
  layers.push({ id: 'plate', z: 0, x: 0, y: 0, ...reduce(plate, null, { x: 0, y: 0, w: plate.w, h: plate.h }, GRID.w, GRID.h) });

  // The tree was drawn larger than it is in the approved still, so it is scaled as it is reduced.
  const tree = await loadRgb(config.tree.file);
  const treeMask = config.tree.key === 'checker' ? mask(tree, isChecker) : mask(tree, isMagenta, isMagentaTinted);
  const treeFactor = config.tree.scale * REDUCE;
  const reducedTree = trim(reduce(tree, treeMask, { x: 0, y: 0, w: tree.w, h: tree.h }, Math.round(tree.w * treeFactor), Math.round(tree.h * treeFactor)));
  layers.push({
    id: 'tree',
    z: 20,
    x: Math.round(config.tree.at[0] * REDUCE) + reducedTree.dx,
    y: Math.round(config.tree.at[1] * REDUCE) + reducedTree.dy,
    ...reducedTree.sprite,
  });

  const sheet = await loadRgb(config.sheet.file);
  // Things are found on the plain mask; the peeled mask (which can nibble a kite tail apart) only decides pixels.
  const boxes = findThings(mask(sheet, isMagenta), sheet.w, sheet.h);
  const sheetMask = mask(sheet, isMagenta, isMagentaTinted);
  if (boxes.length !== config.sheet.things.length) {
    throw new Error(`${config.sheet.file}: expected ${config.sheet.things.length} things, found ${boxes.length}`);
  }
  config.sheet.things.forEach((thing, i) => {
    const box = boxes[i];
    const factor = (thing.height / box.h) * REDUCE;
    const w = Math.max(1, Math.round(box.w * factor));
    const h = Math.max(1, Math.round(box.h * factor));
    const { sprite, dx, dy } = trim(reduce(sheet, sheetMask, box, w, h));
    // A thing stands on its foot point, or (the lantern) hangs from its top point.
    const anchor = thing.foot ?? thing.top;
    const left = Math.round(anchor[0] * REDUCE - w / 2) + dx;
    const top = thing.foot ? Math.round(anchor[1] * REDUCE) - h + dy : Math.round(anchor[1] * REDUCE) + dy;
    layers.push({ id: thing.id, z: thing.z, x: left, y: top, ...sprite });
  });

  const palette = fitPalette(layers, PALETTE_SIZE);
  const labs = palette.map(([r, g, b]) => oklab(r, g, b));
  const cache = new Map();
  for (const layer of layers) snap(layer, palette, labs, cache);

  const out = path.join(root, 'art/scene', name);
  await mkdir(out, { recursive: true });
  layers.sort((a, b) => a.z - b.z);
  for (const layer of layers) {
    await sharp(layer.data, { raw: { width: layer.w, height: layer.h, channels: 4 } })
      .png({ compressionLevel: 9 })
      .toFile(path.join(out, `${layer.id}.png`));
  }
  const layout = {
    grid: GRID,
    palette: palette.map(([r, g, b]) => `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`),
    layers: layers.map(({ id, z, x, y, w, h }) => ({ id, z, x, y, w, h })),
  };
  await writeFile(path.join(out, 'layout.json'), `${JSON.stringify(layout, null, 2)}\n`);

  const composed = await sharp({ create: { width: GRID.w, height: GRID.h, channels: 4, background: '#000' } })
    .composite(
      await Promise.all(
        layers.map(async (layer) => ({
          input: await sharp(layer.data, { raw: { width: layer.w, height: layer.h, channels: 4 } }).png().toBuffer(),
          left: layer.x,
          top: layer.y,
        })),
      ),
    )
    .png()
    .toBuffer();
  await sharp(composed)
    .resize(GRID.w * enlarge, GRID.h * enlarge, { kernel: 'nearest' })
    .png()
    .toFile(path.join(root, 'art/scene', `preview-${name}.png`));

  console.log(`${name}: ${layers.length} layers, ${palette.length} colours`);
  for (const layer of layers) console.log(`  ${layer.id.padEnd(8)} ${layer.w}x${layer.h} at ${layer.x},${layer.y}`);
}

const { values } = parseArgs({ options: { staging: { type: 'string' }, scale: { type: 'string', default: '3' } } });
for (const name of values.staging ? [values.staging] : Object.keys(STAGINGS)) {
  if (!STAGINGS[name]) throw new Error(`unknown staging "${name}"`);
  await buildStaging(name, Number(values.scale));
}
