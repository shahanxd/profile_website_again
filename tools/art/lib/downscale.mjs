// Steps 5 to 7: turn a region of the raw image into art pixels on the palette.
import { distance, nearestLab, oklab } from './color.mjs';
import { newSprite } from './image.mjs';

// 4x4 ordered-dither thresholds
const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

// 'mode' ignores this share of the cell at each side, leaving the middle 60%.
const RIM = 0.2;
// Blur does not shrink with the art, so on small cells the ignored rim stays
// 2 px wide, until only the middle fifth of the cell is left to vote.
const rimOf = (size) => Math.max(RIM, Math.min(2 / size, 0.4));

/**
 * Ordered dither between two palette colours. The partner is the allowed
 * colour whose line from the nearest colour passes closest to the wanted one.
 * A small charge for long lines keeps it from mixing two far-apart colours
 * when a quieter pair does nearly as well.
 */
function ditherPick(palette, allowed, lab, x, y) {
  const a = nearestLab(palette, allowed, lab);
  const A = palette.lab[a];
  let partner = a;
  let mix = 0;
  let bestCost = distance(lab, A);
  for (const b of allowed) {
    if (b === a) continue;
    const B = palette.lab[b];
    const ab = [B[0] - A[0], B[1] - A[1], B[2] - A[2]];
    const len2 = ab[0] * ab[0] + ab[1] * ab[1] + ab[2] * ab[2];
    const t = ((lab[0] - A[0]) * ab[0] + (lab[1] - A[1]) * ab[1] + (lab[2] - A[2]) * ab[2]) / len2;
    if (t <= 0 || t >= 1) continue;
    const cost = distance(lab, [A[0] + ab[0] * t, A[1] + ab[1] * t, A[2] + ab[2] * t]) + 0.1 * Math.sqrt(len2);
    if (cost < bestCost) (bestCost = cost), (partner = b), (mix = t);
  }
  return mix > (BAYER4[(y & 3) * 4 + (x & 3)] + 0.5) / 16 ? partner : a;
}

/**
 * lines: { xs, ys }, the grid lines in raw pixels. Cell (cx, cy) of the sprite
 *        is the raw area from xs[cx] to xs[cx + 1] and ys[cy] to ys[cy + 1].
 * how:   'mode'    the most common palette colour in the middle 60% of the cell,
 *                  each pixel's vote counting more the nearer it is to the
 *                  centre. Fake pixels are flat in the middle and dirty at the
 *                  rim, and a vote cannot invent an in-between colour the way a
 *                  mean does.
 *        'center'  the one raw pixel in the middle of the cell
 *        'box'     the mean of the cell's subject pixels (for smooth plates)
 * cover: the share of a cell that must be subject for its pixel to be opaque.
 * dither: 'bayer4' spreads the rounding error of 'center' / 'box' as a pattern.
 */
export function downscale(img, mask, { xs, ys }, { how, cover, palette, allowed, nearest, dither }) {
  const w = xs.length - 1;
  const h = ys.length - 1;
  const out = newSprite(w, h);
  // the raw pixel range of cell c along one axis, shrunk by `inset` of its size at each end
  const span = (lines, c, inset = 0) => {
    const size = lines[c + 1] - lines[c];
    const a = Math.round(lines[c] + inset * size);
    return [a, Math.max(a + 1, Math.round(lines[c + 1] - inset * size))];
  };
  const votes = new Float64Array(palette.names.length);

  for (let cy = 0; cy < h; cy++) {
    const [y0, y1] = span(ys, cy);
    for (let cx = 0; cx < w; cx++) {
      const [x0, x1] = span(xs, cx);

      // Step 7: the cell is opaque when enough of it (half, unless told otherwise) is subject.
      let subject = 0;
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) subject += mask[y * img.w + x];
      if (!subject || subject < cover * (x1 - x0) * (y1 - y0)) continue;

      let colour;
      if (how === 'mode') {
        // Vote over the middle of the cell; if that is all key, over all of it.
        const midX = (xs[cx] + xs[cx + 1]) / 2;
        const midY = (ys[cy] + ys[cy + 1]) / 2;
        for (const rim of [RIM, 0]) {
          const [ix0, ix1] = span(xs, cx, rim && rimOf(xs[cx + 1] - xs[cx]));
          const [iy0, iy1] = span(ys, cy, rim && rimOf(ys[cy + 1] - ys[cy]));
          votes.fill(0);
          let cast = 0;
          for (let y = iy0; y < iy1; y++) {
            const wy = 1 - Math.abs(y + 0.5 - midY) / (ys[cy + 1] - ys[cy]);
            for (let x = ix0; x < ix1; x++) {
              const i = y * img.w + x;
              if (!mask[i]) continue;
              const wx = 1 - Math.abs(x + 0.5 - midX) / (xs[cx + 1] - xs[cx]);
              votes[nearest(img.data[i * 4], img.data[i * 4 + 1], img.data[i * 4 + 2])] += wx * wy;
              cast++;
            }
          }
          if (cast) break;
        }
        colour = votes.indexOf(Math.max(...votes));
      } else {
        let rgb;
        const middle = Math.floor((y0 + y1) / 2) * img.w + Math.floor((x0 + x1) / 2);
        // A middle pixel that is key colour would put the key into the sprite; such a cell is averaged.
        if (how === 'center' && mask[middle]) {
          rgb = [img.data[middle * 4], img.data[middle * 4 + 1], img.data[middle * 4 + 2]];
        } else {
          rgb = [0, 0, 0];
          for (let y = y0; y < y1; y++) {
            for (let x = x0; x < x1; x++) {
              const i = y * img.w + x;
              if (mask[i]) for (let c = 0; c < 3; c++) rgb[c] += img.data[i * 4 + c];
            }
          }
          rgb = rgb.map((sum) => Math.round(sum / subject));
        }
        colour = dither === 'bayer4' ? ditherPick(palette, allowed, oklab(...rgb), cx, cy) : nearest(...rgb);
      }
      out.px[cy * w + cx] = colour;
    }
  }
  return out;
}
