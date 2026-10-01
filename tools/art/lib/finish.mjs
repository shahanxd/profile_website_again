// Steps 8 to 12: everything that happens to a sprite once it is on the
// palette. All of it works on palette indices, so nothing here can introduce
// an off-palette colour or a soft edge.
import { distance } from './color.mjs';
import { CLEAR, newSprite } from './image.mjs';

const N4 = [[0, -1], [-1, 0], [1, 0], [0, 1]];
const N8 = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];

// Colours closer than this (OKLab) are neighbouring shades: a lone pixel that
// differs from its surroundings by less is far more likely noise than detail.
const SUBTLE = 0.13;

const reader = (sprite) => (x, y) => (x < 0 || y < 0 || x >= sprite.w || y >= sprite.h ? CLEAR : sprite.px[y * sprite.w + x]);

function mostCommon(values) {
  const counts = new Map();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts].sort((a, b) => b[1] - a[1])[0] ?? [undefined, 0];
}

/**
 * Step 8. An orphan is a pixel none of whose 8 neighbours shares its value
 * (transparent counts as a value). It takes the majority of its neighbours.
 *   level 1  only an orphan that is a shade away from the colour most of its
 *            neighbours share: that is what a misread fake pixel looks like.
 *            Details with real contrast (an eye, a glint, loose steam) stay.
 *   level 2  every orphan, specks and pinholes included. For flat props; it
 *            eats eyes and glints.
 * It cannot tell a misread pixel from a deliberate one-pixel highlight, so it
 * is off unless the asset asks for it.
 */
export function despeckle(sprite, palette, level) {
  if (!level) return sprite;
  const at = reader(sprite);
  const out = { ...sprite, px: sprite.px.slice() };
  for (let y = 0; y < sprite.h; y++) {
    for (let x = 0; x < sprite.w; x++) {
      const me = at(x, y);
      const around = N8.map(([dx, dy]) => at(x + dx, y + dy));
      if (around.includes(me)) continue;
      const [major, count] = mostCommon(around);
      const shade = me !== CLEAR && major !== CLEAR && count >= 5 && distance(palette.lab[me], palette.lab[major]) < SUBTLE;
      if (level >= 2 || shade) out.px[y * sprite.w + x] = major;
    }
  }
  return out;
}

/**
 * Step 9. Recolours the sprite's edge pixels (opaque with a transparent
 * 4-neighbour); the silhouette and size never change.
 *   ink     every edge pixel becomes ink
 *   selout  every edge pixel becomes the darkest shade of its own ramp, the
 *           first of the asset's ramps that holds its colour. An edge pixel
 *           that is already ink has no hue of its own, so it borrows the ramp
 *           of the coloured pixels just inside it: a black outline becomes a
 *           tinted one.
 */
export function outline(sprite, palette, how, rampNames) {
  if (!how || how === 'none') return sprite;
  const ink = palette.id('ink', 'outline');
  const ramps = (rampNames?.length ? rampNames : Object.keys(palette.ramps)).map((name) => palette.ramps[name]);
  const darkest = (colour) => {
    const ramp = ramps.find((r) => r.includes(colour)) ?? [colour];
    return ramp.reduce((a, b) => (palette.lab[b][0] < palette.lab[a][0] ? b : a));
  };
  const at = reader(sprite);
  const isEdge = (x, y) => at(x, y) !== CLEAR && N4.some(([dx, dy]) => at(x + dx, y + dy) === CLEAR);

  const out = { ...sprite, px: sprite.px.slice() };
  for (let y = 0; y < sprite.h; y++) {
    for (let x = 0; x < sprite.w; x++) {
      if (!isEdge(x, y)) continue;
      let colour = at(x, y);
      if (how === 'selout' && colour === ink) {
        const inner = N8.filter(([dx, dy]) => !isEdge(x + dx, y + dy)).map(([dx, dy]) => at(x + dx, y + dy));
        colour = mostCommon(inner.filter((c) => c !== CLEAR && c !== ink))[0] ?? ink;
      }
      out.px[y * sprite.w + x] = how === 'ink' ? ink : darkest(colour);
    }
  }
  return out;
}

/** Smallest box that holds the opaque pixels of every frame, or null if all are empty. */
export function contentBox(frames) {
  const box = { x0: Infinity, y0: Infinity, x1: 0, y1: 0 };
  for (const frame of frames) {
    for (let i = 0; i < frame.px.length; i++) {
      if (frame.px[i] === CLEAR) continue;
      const x = i % frame.w;
      const y = (i / frame.w) | 0;
      box.x0 = Math.min(box.x0, x);
      box.y0 = Math.min(box.y0, y);
      box.x1 = Math.max(box.x1, x + 1);
      box.y1 = Math.max(box.y1, y + 1);
    }
  }
  return box.x1 ? box : null;
}

/**
 * A pixel map: rows of characters and a legend from character to colour name.
 * '.' and ' ' are transparent. Returns one sprite per frame.
 *   { legend, rows: ['P.', 'pP'] }  or  { legend, frames: [[...rows], [...rows]] }
 */
export function pixelmapFrames(def, palette, where) {
  const frames = (def.frames ?? [def.rows]).map((rows, f) => {
    if (!Array.isArray(rows) || !rows.length) throw new Error(`${where}: frame ${f} has no rows`);
    const sprite = newSprite(rows[0].length, rows.length);
    rows.forEach((row, y) => {
      if (row.length !== sprite.w) throw new Error(`${where}: frame ${f} row ${y} is ${row.length} wide, expected ${sprite.w}`);
      [...row].forEach((ch, x) => {
        if (ch === '.' || ch === ' ') return;
        if (!def.legend?.[ch]) throw new Error(`${where}: "${ch}" is not in the legend`);
        sprite.px[y * sprite.w + x] = palette.id(def.legend[ch], where);
      });
    });
    return sprite;
  });
  if (frames.some((f) => f.w !== frames[0].w || f.h !== frames[0].h)) throw new Error(`${where}: frames differ in size`);
  return frames;
}

/**
 * Step 11. One animation frame: a copy of the clean frame with a few small
 * pixel edits. Coordinates are art pixels in the untrimmed frame.
 *   { shift: [x, y, w, h], by: [dx, dy], fill: 'colour' }  move a rectangle; what it leaves behind
 *                                                          becomes `fill` (transparent by default)
 *   { recolor: { from: 'to', ... }, in: [x, y, w, h] }     swap colours, all at once, so
 *                                                          { a: 'b', b: 'a' } exchanges two; `in` is optional
 *   { overlay: 'pixelmap-id' | { legend, rows }, at: [x, y] }  stamp a pixel map; its transparent pixels
 *                                                          leave the frame alone, legend value "clear" erases
 */
export function rigFrame(base, ops, { palette, pixelmaps, where }) {
  const out = { ...base, px: base.px.slice() };
  const put = (x, y, c) => {
    if (x >= 0 && y >= 0 && x < out.w && y < out.h) out.px[y * out.w + x] = c;
  };
  const colour = (name) => (name === 'clear' || name == null ? CLEAR : palette.id(name, where));
  // every number an op takes is a whole art pixel
  const ints = (op, field, n) => {
    const v = op[field];
    if (!Array.isArray(v) || v.length !== n || !v.every(Number.isInteger)) throw new Error(`${where}: "${field}" must be ${n} whole numbers in ${JSON.stringify(op)}`);
    return v;
  };

  for (const op of ops ?? []) {
    if (op.shift) {
      const [x, y, w, h] = ints(op, 'shift', 4);
      const [dx, dy] = ints(op, 'by', 2);
      const before = reader({ ...out, px: out.px.slice() });
      for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) put(xx, yy, colour(op.fill));
      for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) put(xx + dx, yy + dy, before(xx, yy));
    } else if (op.recolor) {
      const [x, y, w, h] = op.in ? ints(op, 'in', 4) : [0, 0, out.w, out.h];
      const table = new Map(Object.entries(op.recolor).map(([from, to]) => [colour(from), colour(to)]));
      const before = reader({ ...out, px: out.px.slice() });
      for (let yy = y; yy < y + h; yy++) {
        for (let xx = x; xx < x + w; xx++) if (table.has(before(xx, yy))) put(xx, yy, table.get(before(xx, yy)));
      }
    } else if (op.overlay) {
      const def = typeof op.overlay === 'string' ? pixelmaps?.[op.overlay] : op.overlay;
      if (!def) throw new Error(`${where}: no pixelmap "${op.overlay}" to overlay`);
      const [x, y] = op.at ? ints(op, 'at', 2) : [0, 0];
      const rows = def.frames?.[0] ?? def.rows;
      rows.forEach((row, yy) => {
        [...row].forEach((ch, xx) => {
          if (ch === '.' || ch === ' ') return;
          if (!def.legend?.[ch]) throw new Error(`${where}: overlay character "${ch}" is not in its legend`);
          put(x + xx, y + yy, colour(def.legend[ch]));
        });
      });
    } else {
      throw new Error(`${where}: unknown op ${JSON.stringify(op)} (use shift, recolor or overlay)`);
    }
  }
  return out;
}

/** Step 12. The dusk variant: every colour steps through the palette's duskSwap table. */
export function grade(sprite, palette) {
  return { ...sprite, px: sprite.px.map((c) => (c === CLEAR ? c : palette.duskSwap[c])) };
}

/** Equal-sized frames side by side as one horizontal strip. */
export function strip(frames) {
  const { w, h } = frames[0];
  const out = newSprite(w * frames.length, h);
  frames.forEach((frame, f) => {
    for (let y = 0; y < h; y++) out.px.set(frame.px.subarray(y * w, (y + 1) * w), y * out.w + f * w);
  });
  return out;
}
