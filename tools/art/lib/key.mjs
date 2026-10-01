// Steps 2 and 3: find the flat key colour behind the art, mark what is
// subject, clean the fringe where the two blend, and find the separate
// objects on a sheet.
import { memoRgb, oklab, parseHex, toHex } from './color.mjs';

// Parts of one object may sit this far apart, as a share of the image's longer side.
export const OBJECT_GAP = 0.03;
// "auto" takes the border's main colour for a key only when it fills this
// share of the border. A plate with a flat sky reaches half; a sprite on a
// key colour is near 1.
export const KEY_SURE = 0.75;
// An asset's "tolerance" and "shadow", with their defaults.
const keySettings = (options) => ({ tolerance: options?.tolerance ?? 0.1, shadow: options?.shadow ?? 0.75 });

/** Indices of the pixels in a thin frame around the image. */
function borderPixels({ w, h }) {
  const band = Math.max(1, Math.round(Math.min(w, h) * 0.02));
  const out = [];
  for (let y = 0; y < h; y++) {
    const full = y < band || y >= h - band;
    for (let x = 0; x < w; x++) {
      if (!full && x === band) x = w - band; // skip the interior of the row
      out.push(y * w + x);
    }
  }
  return out;
}

/**
 * (r, g, b) => how far the colour is from the key, in OKLab. A shadow painted
 * on the key darkens it in linear light, which in OKLab is a straight move
 * towards black, so the distance is measured to that line (down to `shadow`
 * of the way) and not just to the key itself.
 */
function keyDistance(rgb, shadow) {
  const k = oklab(...rgb);
  const kk = k[0] * k[0] + k[1] * k[1] + k[2] * k[2] || 1;
  return (r, g, b) => {
    const p = oklab(r, g, b);
    const t = Math.min(1, Math.max(shadow, (p[0] * k[0] + p[1] * k[1] + p[2] * k[2]) / kk));
    return Math.hypot(p[0] - t * k[0], p[1] - t * k[1], p[2] - t * k[2]);
  };
}

/** (r, g, b) => 1 when the colour is the key. */
export function keyTest(rgb, options) {
  const { tolerance, shadow } = keySettings(options);
  const away = keyDistance(rgb, shadow);
  return memoRgb((r, g, b) => (away(r, g, b) < tolerance ? 1 : 0));
}

/**
 * The names of the allowed palette colours the key would eat, or nearly:
 * those within one and a half times the tolerance of it. Art in those colours
 * drifts into the key and comes out with holes.
 */
export function coloursNearKey(key, palette, allowed, options) {
  if (!key?.rgb) return [];
  const { tolerance, shadow } = keySettings(options);
  const away = keyDistance(key.rgb, shadow);
  return allowed.filter((i) => away(...palette.rgb[i]) < tolerance * 1.5).map((i) => palette.names[i]);
}

/**
 * What the background is, judged from the image border: { alpha: true } for
 * a transparent one, else { rgb, coverage }, the border's main colour and the
 * share of the border it fills. Whether that is a key is the caller's call
 * (see KEY_SURE).
 */
export function findKey(img, keyOptions) {
  const border = borderPixels(img);
  const bins = new Map(); // border colours at 5 bits a channel: [count, sum r, sum g, sum b]
  let clear = 0;
  for (const p of border) {
    const [r, g, b, a] = img.data.subarray(p * 4, p * 4 + 4);
    if (a < 128) {
      clear++;
      continue;
    }
    const k = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
    const bin = bins.get(k) ?? bins.set(k, [0, 0, 0, 0]).get(k);
    [1, r, g, b].forEach((v, i) => (bin[i] += v));
  }
  if (clear > border.length / 2) return { alpha: true };

  const [n, r, g, b] = [...bins.values()].sort((p, q) => q[0] - p[0])[0];
  const rgb = [Math.round(r / n), Math.round(g / n), Math.round(b / n)];
  const isKey = keyTest(rgb, keyOptions);
  let hits = 0;
  for (const p of border) hits += isKey(img.data[p * 4], img.data[p * 4 + 1], img.data[p * 4 + 2]);
  return { rgb, coverage: hits / border.length };
}

/**
 * The config's "key" setting ("auto" | "alpha" | "none" | "#rrggbb") to a key
 * for subjectMask, or null for none. `unsure` is set when "auto" found no key:
 * it says what the border does hold, for the warning.
 */
export function resolveKey(setting, img, keyOptions) {
  if (setting === 'none') return { key: null };
  if (setting === 'alpha') return { key: { alpha: true } };
  if (setting !== 'auto') return { key: { rgb: parseHex(setting) } };
  const found = findKey(img, keyOptions);
  if (found.alpha || found.coverage >= KEY_SURE) return { key: found };
  return { key: null, unsure: `only ${Math.round(found.coverage * 100)}% of the border is one colour (${toHex(found.rgb)})` };
}

export function describeKey(key) {
  if (!key) return 'none';
  return key.alpha ? 'transparent background' : toHex(key.rgb);
}

/** One byte per pixel: 1 where the pixel is subject, 0 where it is key. */
export function subjectMask(img, key, keyOptions) {
  const mask = new Uint8Array(img.w * img.h);
  if (!key) return mask.fill(1);
  const isKey = key.alpha ? () => 0 : keyTest(key.rgb, keyOptions);
  for (let i = 0; i < mask.length; i++) {
    const d = i * 4;
    mask[i] = img.data[d + 3] >= 128 && !isKey(img.data[d], img.data[d + 1], img.data[d + 2]) ? 1 : 0;
  }
  return mask;
}

/**
 * Despill. Subject pixels within `band` of the key are a blend of both
 * colours. Each takes the colour of the neighbour one step further in, layer
 * by layer from the inside out, so the fringe ends up in the clean interior
 * colour. Parts too thin to have an interior keep their own colour.
 */
export function despill(img, mask, band) {
  const { w, h, data } = img;
  const depth = new Uint8Array(w * h); // 0 = key or interior, 1..band = steps in from the key
  const near = [-1, 1, -w, w];
  const inside = (i, j) => j >= 0 && j < w * h && Math.abs((j % w) - (i % w)) <= 1;

  let layer = [];
  for (let i = 0; i < w * h; i++) {
    if (mask[i] && near.some((o) => inside(i, i + o) && !mask[i + o])) {
      depth[i] = 1;
      layer.push(i);
    }
  }
  const layers = [layer];
  for (let d = 2; d <= band; d++) {
    const next = [];
    for (const i of layer) {
      for (const o of near) {
        const j = i + o;
        if (inside(i, j) && mask[j] && !depth[j]) {
          depth[j] = d;
          next.push(j);
        }
      }
    }
    layer = next;
    layers.push(layer);
  }

  for (let d = band; d >= 1; d--) {
    for (const i of layers[d - 1]) {
      // "further in" is the next layer, or the untouched interior behind the last one
      const j = near.map((o) => i + o).find((j) => inside(i, j) && mask[j] && (depth[j] === d + 1 || (d === band && !depth[j])));
      if (j !== undefined) data.copyWithin(i * 4, j * 4, j * 4 + 3);
    }
  }
}

/**
 * Tight box around the subject inside rect, or null when there is none. A row
 * or column only counts once it has minRun subject pixels, so a stray speck
 * cannot stretch the box.
 */
export function subjectBox(mask, w, rect, minRun = 1) {
  const cols = new Int32Array(rect.x1 - rect.x0);
  const rows = new Int32Array(rect.y1 - rect.y0);
  for (let y = rect.y0; y < rect.y1; y++) {
    for (let x = rect.x0; x < rect.x1; x++) {
      if (!mask[y * w + x]) continue;
      cols[x - rect.x0]++;
      rows[y - rect.y0]++;
    }
  }
  const enough = (n) => n >= minRun;
  if (!cols.some(enough) || !rows.some(enough)) return null;
  return {
    x0: rect.x0 + cols.findIndex(enough),
    y0: rect.y0 + rows.findIndex(enough),
    x1: rect.x0 + cols.findLastIndex(enough) + 1,
    y1: rect.y0 + rows.findLastIndex(enough) + 1,
  };
}

/**
 * The separate objects on a sheet, in reading order, as loose boxes (run
 * subjectBox on each for the tight one). Parts closer than OBJECT_GAP belong
 * to one object, so steam stays with its cup.
 */
export function components(mask, w, h) {
  // A coarse grid is plenty for finding objects and keeps the search quick.
  const cell = Math.max(1, Math.ceil(Math.max(w, h) / 400));
  const cw = Math.ceil(w / cell);
  const ch = Math.ceil(h / cell);
  const on = new Uint8Array(cw * ch);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) if (mask[y * w + x]) on[((y / cell) | 0) * cw + ((x / cell) | 0)] = 1;
  }

  // Flood fill, where "touching" means within `reach` cells.
  const reach = Math.max(1, Math.ceil((Math.max(w, h) * OBJECT_GAP) / cell));
  const seen = new Uint8Array(cw * ch);
  const found = [];
  for (let start = 0; start < on.length; start++) {
    if (!on[start] || seen[start]) continue;
    const box = { x0: cw, y0: ch, x1: 0, y1: 0, cells: 0 };
    const stack = [start];
    seen[start] = 1;
    while (stack.length) {
      const i = stack.pop();
      const x = i % cw;
      const y = (i / cw) | 0;
      box.cells++;
      box.x0 = Math.min(box.x0, x);
      box.y0 = Math.min(box.y0, y);
      box.x1 = Math.max(box.x1, x + 1);
      box.y1 = Math.max(box.y1, y + 1);
      for (let ny = Math.max(0, y - reach); ny <= Math.min(ch - 1, y + reach); ny++) {
        for (let nx = Math.max(0, x - reach); nx <= Math.min(cw - 1, x + reach); nx++) {
          const j = ny * cw + nx;
          if (on[j] && !seen[j]) {
            seen[j] = 1;
            stack.push(j);
          }
        }
      }
    }
    found.push(box);
  }

  // Drop dust: anything under a fiftieth of the largest object is not an object.
  const largest = Math.max(0, ...found.map((b) => b.cells));
  const boxes = found
    .filter((b) => b.cells * 50 >= largest)
    .map((b) => ({ x0: b.x0 * cell, y0: b.y0 * cell, x1: Math.min(w, b.x1 * cell), y1: Math.min(h, b.y1 * cell) }));

  // Reading order: group into rows by vertical overlap, then left to right.
  boxes.sort((p, q) => p.y0 - q.y0);
  const rows = [];
  for (const b of boxes) {
    const row = rows.at(-1);
    if (row && (b.y0 + b.y1) / 2 < row.y1) {
      row.items.push(b);
      row.y1 = Math.max(row.y1, b.y1);
    } else {
      rows.push({ y1: b.y1, items: [b] });
    }
  }
  return rows.flatMap((row) => row.items.sort((p, q) => p.x0 - q.x0));
}
