import type { Framing } from './types';

/**
 * How the garden is fitted to a screen. Kept apart from the manifest because
 * the page needs it before the engine loads, to place the poster image.
 */
export const framing: Framing = {
  world: [400, 200],
  focus: [175, 150],
  floor: 196,
  // On a 16:9 screen this shows 320 x 180 art pixels starting at world (40, 20).
  landscape: { height: 180, target: [135 / 320, 130 / 180] },
  // A phone frames the carpet group, with sky above it for the copy. The span runs from the tree's
  // roots to the tablet prop, so neither pokes in at the edge of a narrow screen.
  portrait: { width: 128, target: [0.5, 0.8], span: [108, 236] },
  parallax: [6, 2],
  // Tall enough for any phone: the sky above the painted world and the lawn below it are included.
  poster: { top: -120, height: 360 },
};
