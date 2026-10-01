import type { Backdrop, Stop } from '../scene/types';

/**
 * The sky and the ground behind every sprite: vertical gradients between
 * palette colours, mixed with an ordered 8x8 dither and nothing else, so every
 * pixel is still a palette colour.
 *
 * The pattern repeats every 8 pixels across, so the whole backdrop is one
 * strip 8 pixels wide. The engine tiles it sideways and holds its first and
 * last rows for everything above and below; the poster script paints from the
 * same strip, which is why the poster and the live scene cannot disagree.
 *
 * No imports with code here: the art scripts load this file directly in Node.
 */

// prettier-ignore
export const BAYER8 = [
   0, 32,  8, 40,  2, 34, 10, 42,
  48, 16, 56, 24, 50, 18, 58, 26,
  12, 44,  4, 36, 14, 46,  6, 38,
  60, 28, 52, 20, 62, 30, 54, 22,
   3, 35, 11, 43,  1, 33,  9, 41,
  51, 19, 59, 27, 49, 17, 57, 25,
  15, 47,  7, 39, 13, 45,  5, 37,
  63, 31, 55, 23, 61, 29, 53, 21,
];

/** Dither threshold for a pixel, between 0 and 1. A blend of strength s paints the pixel when s is above it. */
export function bayer8(x: number, y: number): number {
  return (BAYER8[(y & 7) * 8 + (x & 7)] + 0.5) / 64;
}

export interface Strip {
  /** World y of the strip's first row. */
  top: number;
  height: number;
  /** RGBA, 8 pixels wide, `height` rows. */
  pixels: Uint8Array;
}

export const STRIP_WIDTH = 8;

function colorAt(stops: Stop[], x: number, y: number): string {
  let i = 0;
  while (i < stops.length - 2 && y >= stops[i + 1][0]) i++;
  const [y0, from] = stops[i];
  const [y1, to] = stops[i + 1] ?? stops[i];
  const blend = y1 > y0 ? (y - y0) / (y1 - y0) : 1;
  return blend > bayer8(x, y) ? to : from;
}

export function backdropStrip(backdrop: Backdrop, colors: Record<string, string>): Strip {
  const { sky, ground } = backdrop;
  const top = sky[0][0];
  const height = ground[ground.length - 1][0] - top + 1;
  const pixels = new Uint8Array(STRIP_WIDTH * height * 4);
  for (let row = 0; row < height; row++) {
    const y = top + row;
    for (let x = 0; x < STRIP_WIDTH; x++) {
      const name = colorAt(y < ground[0][0] ? sky : ground, x, y);
      const hex = colors[name];
      if (!hex) throw new Error(`backdrop: "${name}" is not a palette colour`);
      const rgb = parseInt(hex.slice(1), 16);
      pixels.set([rgb >> 16, (rgb >> 8) & 255, rgb & 255, 255], (row * STRIP_WIDTH + x) * 4);
    }
  }
  return { top, height, pixels };
}
