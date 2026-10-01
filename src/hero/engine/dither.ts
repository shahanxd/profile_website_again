/**
 * The 8x8 ordered-dither table. The split dissolve uses it to decide the order
 * in which blocks turn, in the garden's shader and in the page overlay alike.
 *
 * No imports with code here: src/split/dissolve.ts and the engine both read it.
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
