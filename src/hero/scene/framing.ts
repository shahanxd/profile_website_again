import type { Framing } from './types';

/**
 * How the garden is fitted to a screen. Kept apart from the manifest because
 * the page needs it before the engine loads, to place the poster image.
 */
export const framing: Framing = {
  world: [352, 198],
  // With the world's 198 rows this is tall enough for a 9:21 phone held upright. (424 rows in all: like the
  // width, a multiple of 8, so the poster is a whole number of device pixels at pixel ratios such as 2.625.)
  lawn: 226,
  focus: [82, 150],
  floor: 180,
  // On a 16:9 screen this shows 320 x 180 art pixels starting at world (16, 18): the plate with a margin
  // of 16 at each side for the layers to slide in, down to its last row. The page breaks in over the foot
  // of the hero (the seam, 112 CSS pixels of which the lower half is solid), so the scene is framed low:
  // what the seam covers is the lawn in front of the carpet, not the tray and the rover on it. A squarer
  // screen keeps the left edge and, from about 3:2, takes a smaller pixel so the sky stays in view; one
  // that then shows nearly the whole width of the world sits in the middle of it.
  landscape: { height: 180, width: 304, left: 16, target: 132 / 180 },
  // A phone shows the carpet group, under the tree: the cats sit at world x 9 and 10, the side table ends
  // at 156. It takes the largest pixel that keeps all of that in view, so it shows 146 columns or a few more.
  portrait: { width: 146, height: 280 },
  parallax: [3, 1],
};
