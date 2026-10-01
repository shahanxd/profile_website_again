// Colour maths and the master palette. Every distance is measured in OKLab,
// where equal steps look equally different, so "nearest colour" is the one
// the eye would pick rather than the one closest in raw RGB.
import { readFile } from 'node:fs/promises';

export function parseHex(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) throw new Error(`not a colour: "${hex}" (expected #rrggbb)`);
  const n = parseInt(m[1], 16);
  return [n >> 16, (n >> 8) & 255, n & 255];
}

export function toHex([r, g, b]) {
  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
}

const linear = new Float64Array(256);
for (let i = 0; i < 256; i++) {
  const c = i / 255;
  linear[i] = c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** sRGB bytes to OKLab [L, a, b] (Björn Ottosson's matrices). */
export function oklab(r, g, b) {
  const lr = linear[r], lg = linear[g], lb = linear[b];
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

export function distance(p, q) {
  return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
}

/**
 * Remembers the answer of fn(r, g, b) per colour, at 6 bits a channel. Raw art
 * has millions of pixels but few distinct colours, and a 2-level rounding is
 * far below its noise, so this turns per-pixel OKLab maths into a table read.
 */
export function memoRgb(fn) {
  const table = new Int16Array(1 << 18).fill(-32768);
  return (r, g, b) => {
    const k = ((r >> 2) << 12) | ((g >> 2) << 6) | (b >> 2);
    // evaluate at the middle of the 4-level bucket
    if (table[k] === -32768) table[k] = fn((r & 252) | 2, (g & 252) | 2, (b & 252) | 2);
    return table[k];
  };
}

export async function loadPalette(file) {
  const json = JSON.parse(await readFile(file, 'utf8'));
  const names = Object.keys(json.colors);
  const rgb = names.map((n) => parseHex(json.colors[n]));
  const index = new Map(names.map((n, i) => [n, i]));
  const id = (name, where) => {
    if (!index.has(name)) throw new Error(`${where}: "${name}" is not a palette colour`);
    return index.get(name);
  };

  const ramps = {};
  for (const [ramp, list] of Object.entries(json.ramps ?? {})) ramps[ramp] = list.map((n) => id(n, `ramp ${ramp}`));

  // duskSwap as a lookup by colour index; colours without an entry map to themselves.
  const duskSwap = names.map((_, i) => i);
  for (const [from, to] of Object.entries(json.duskSwap ?? {})) duskSwap[id(from, 'duskSwap')] = id(to, 'duskSwap');

  return {
    file,
    names,
    rgb,
    lab: rgb.map((c) => oklab(...c)),
    ramps,
    duskSwap,
    emissive: (json.emissive ?? []).map((n) => id(n, 'emissive')),
    /** Colour name to index; throws with a readable message on a typo. */
    id,
    /** Exact RGB to index, or undefined when the colour is not in the palette. */
    exact: new Map(rgb.map(([r, g, b], i) => [(r << 16) | (g << 8) | b, i])),
  };
}

/** The colour indices an asset may use: the union of its ramps, or everything. */
export function allowedColours(palette, rampNames) {
  if (!rampNames?.length) return palette.names.map((_, i) => i);
  const out = new Set();
  for (const ramp of rampNames) {
    if (!palette.ramps[ramp]) throw new Error(`unknown ramp "${ramp}" (have: ${Object.keys(palette.ramps).join(', ')})`);
    palette.ramps[ramp].forEach((i) => out.add(i));
  }
  return [...out];
}

/** Index of the allowed colour nearest to a Lab point. */
export function nearestLab(palette, allowed, lab) {
  let best = allowed[0];
  let bestD = Infinity;
  for (const i of allowed) {
    const d = distance(lab, palette.lab[i]);
    if (d < bestD) (bestD = d), (best = i);
  }
  return best;
}

/** A fast (r, g, b) => colour index lookup restricted to the allowed colours. */
export function nearestRgb(palette, allowed) {
  return memoRgb((r, g, b) => nearestLab(palette, allowed, oklab(r, g, b)));
}
