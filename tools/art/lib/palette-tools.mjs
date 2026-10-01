// The `palette` command: a swatch sheet to look at, exports for paint
// programs, and a report on how well an image sits on the palette.
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { allowedColours, distance, memoRgb, nearestLab, nearestRgb, oklab, toHex } from './color.mjs';
import { pixelmapFrames } from './finish.mjs';
import { CLEAR, fillRect, loadRaster, newRaster, saveRaster } from './image.mjs';
import { describeKey, keyTest, resolveKey } from './key.mjs';

// Frame order of the "font" pixelmap in the config.
const FONT_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789';

/** Text in the config's 3x5 "font" pixelmap; characters it lacks are skipped. */
function textDrawer(pixelmaps, palette) {
  const glyphs = pixelmaps.font ? pixelmapFrames(pixelmaps.font, palette, 'font') : [];
  return (raster, text, x, y, rgb) => {
    [...text].forEach((ch, n) => {
      const glyph = glyphs[FONT_CHARS.indexOf(ch)];
      glyph?.px.forEach((c, i) => c !== CLEAR && fillRect(raster, x + n * (glyph.w + 1) + (i % glyph.w), y + ((i / glyph.w) | 0), 1, 1, rgb));
    });
  };
}

/** Every ramp as a row of named blocks, then the dusk swap as day / dusk pairs. */
export async function swatch(palette, pixelmaps, out) {
  const text = textDrawer(pixelmaps, palette);
  const ink = palette.rgb[palette.id('ink', 'swatch')];
  const ramps = Object.entries(palette.ramps);
  const swaps = palette.duskSwap.map((to, from) => [from, to]).filter(([from, to]) => from !== to);
  const CELL = 48; // one colour: a block with its name and hex under it
  const ROW = 34;
  const LEFT = 44; // room for the ramp name
  const perRow = Math.max(...ramps.map(([, list]) => list.length));
  const swapRows = Math.ceil(swaps.length / perRow);
  // A neutral grey that is not in the palette, so no colour disappears into the background.
  const sheet = newRaster(LEFT + perRow * CELL + 4, 6 + (ramps.length + swapRows) * ROW + 12, [119, 119, 119]);

  const block = (x, y, colours) => {
    const w = (CELL - 4) / colours.length;
    fillRect(sheet, x, y, CELL - 2, 14, ink);
    colours.forEach((c, n) => fillRect(sheet, x + 1 + n * w, y + 1, w, 12, palette.rgb[c]));
  };
  ramps.forEach(([name, list], row) => {
    const y = 6 + row * ROW;
    text(sheet, name, 4, y + 4, ink);
    list.forEach((c, n) => {
      block(LEFT + n * CELL, y, [c]);
      text(sheet, palette.names[c], LEFT + n * CELL, y + 16, ink);
      text(sheet, toHex(palette.rgb[c]).slice(1), LEFT + n * CELL, y + 23, ink);
    });
  });
  // The dusk swap: each block is the day colour (left) beside what it becomes (right).
  const top = 6 + ramps.length * ROW + 8;
  text(sheet, 'dusk swap', 4, top + 4, ink);
  swaps.forEach(([from, to], n) => {
    const x = LEFT + (n % perRow) * CELL;
    const y = top + Math.floor(n / perRow) * ROW;
    block(x, y, [from, to]);
    text(sheet, palette.names[from], x, y + 16, ink);
    text(sheet, palette.names[to], x, y + 23, ink);
  });

  // Drawn at 1x and enlarged 3x so the pixel font is readable.
  const big = newRaster(sheet.w * 3, sheet.h * 3);
  for (let i = 0; i < sheet.w * sheet.h; i++) fillRect(big, (i % sheet.w) * 3, ((i / sheet.w) | 0) * 3, 3, 3, sheet.data.subarray(i * 4, i * 4 + 3));
  await saveRaster(out, big);
  console.log(`swatch sheet: ${out} (${big.w}x${big.h})`);
}

/** Writes the palette as <name>.hex, .gpl and .act into dir. */
export async function exportPalette(palette, formats, dir) {
  const base = path.join(dir, path.basename(palette.file, '.json'));
  const writers = {
    // one hex per line: Lospec, Aseprite, Pixelorama
    hex: () => palette.rgb.map((c) => toHex(c).slice(1)).join('\n') + '\n',
    // GIMP, Krita, Inkscape
    gpl: () => {
      const rows = palette.rgb.map((c, i) => c.map((v) => String(v).padStart(3)).join(' ') + '\t' + palette.names[i]);
      return ['GIMP Palette', 'Name: pixel garden', 'Columns: 8', '#', ...rows].join('\n') + '\n';
    },
    // Photoshop colour table: 256 RGB slots, then the colour count and "no transparent index"
    act: () => {
      const bytes = Buffer.alloc(772);
      palette.rgb.forEach((c, i) => bytes.set(c, i * 3));
      bytes.writeUInt16BE(palette.rgb.length, 768);
      bytes.writeUInt16BE(0xffff, 770);
      return bytes;
    },
  };
  await mkdir(dir, { recursive: true });
  for (const format of formats) {
    if (!writers[format]) throw new Error(`unknown export format "${format}" (use hex, gpl, act)`);
    await writeFile(`${base}.${format}`, writers[format]());
    console.log(`wrote ${base}.${format}`);
  }
}

/** How well an image sits on the palette: which colours it would use, and how far it has to move to get there. */
export async function fit(file, palette) {
  const img = await loadRaster(file);
  const { key } = resolveKey('auto', img);
  const isKey = key?.rgb ? keyTest(key.rgb) : () => 0;
  const all = allowedColours(palette);
  const nearest = nearestRgb(palette, all);
  // distance to the nearest palette colour, in ten-thousandths so the lookup table can hold it
  const away = memoRgb((r, g, b) => Math.round(distance(oklab(r, g, b), palette.lab[nearest(r, g, b)]) * 1e4));

  const used = new Float64Array(palette.names.length);
  const histogram = new Float64Array(1e4); // pixel count per distance step
  const families = new Map(); // similar image colours (4 bits a channel), to name what the palette lacks
  let total = 0;
  for (let i = 0; i < img.w * img.h; i++) {
    const [r, g, b, a] = img.data.subarray(i * 4, i * 4 + 4);
    if (a < 128 || isKey(r, g, b)) continue;
    total++;
    used[nearest(r, g, b)]++;
    histogram[Math.min(histogram.length - 1, away(r, g, b))]++;
    const k = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
    const family = families.get(k) ?? families.set(k, { n: 0, sum: [0, 0, 0] }).get(k);
    family.n++;
    [r, g, b].forEach((v, c) => (family.sum[c] += v));
  }
  if (!total) return console.log(`${file}: nothing but key colour`);

  const mean = histogram.reduce((sum, n, d) => sum + n * d, 0) / total / 1e4;
  const percentile = (share) => {
    let seen = 0;
    return histogram.findIndex((n) => (seen += n) >= total * share) / 1e4;
  };
  const pct = (n) => ((n / total) * 100).toFixed(1).padStart(5) + '%';

  console.log(`${file}  (${img.w} x ${img.h}, key: ${describeKey(key)})`);
  console.log(`  distance to the palette in OKLab (0.02 is barely visible, 0.1 is a different colour)`);
  console.log(`    mean ${mean.toFixed(3)}   median ${percentile(0.5).toFixed(3)}   95th pct ${percentile(0.95).toFixed(3)}   max ${percentile(1).toFixed(3)}`);
  console.log(`  palette colours it would use (${used.filter(Boolean).length} of ${palette.names.length})`);
  const ranked = [...used.keys()].filter((i) => used[i]).sort((p, q) => used[q] - used[p]);
  for (const i of ranked.slice(0, 16)) console.log(`    ${pct(used[i])}  ${palette.names[i].padEnd(12)} ${toHex(palette.rgb[i])}`);

  const lacking = [...families.values()]
    .filter((f) => f.n / total >= 0.005)
    .map((f) => {
      const rgb = f.sum.map((v) => Math.round(v / f.n));
      const to = nearestLab(palette, all, oklab(...rgb));
      return { ...f, rgb, to, d: distance(oklab(...rgb), palette.lab[to]) };
    })
    .filter((f) => f.d > 0.08)
    .sort((p, q) => q.n * q.d - p.n * p.d);
  console.log(lacking.length ? `  image colours with no close palette match` : `  every common image colour has a close palette match`);
  for (const f of lacking.slice(0, 8)) console.log(`    ${pct(f.n)}  ${toHex(f.rgb)}  nearest is ${palette.names[f.to]}, ${f.d.toFixed(3)} away`);
}
