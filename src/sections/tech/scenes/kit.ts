/**
 * What the project illustrations share. Each is a small pixel drawing made
 * in code: a function of time that paints one frame onto a low-resolution
 * canvas, one art pixel to a page pixel (PixelScene.tsx runs them).
 */

export interface Scene {
  /** The length of the loop, in milliseconds. */
  loop: number;
  /** The moment shown when nothing may move (motion off, or ?still=1). */
  rest: number;
  /** Paints the frame for a moment of the loop. The same moment always paints the same picture. */
  draw(context: CanvasRenderingContext2D, ms: number): void;
}

/** Builds a scene for a canvas of this many art pixels; the scenes lay themselves out to fit. */
export type SceneMaker = (w: number, h: number) => Scene;

/** The dusk staging's own colours (art/scene/tech/layout.json) and the night page's two darks, named for what the illustrations use them for. */
export const DUSK = {
  night: '#14162e',
  deep: '#0a0b1c',
  indigo: '#181b37',
  slate: '#262745',
  blue: '#333470',
  violet: '#423b76',
  plum: '#573c63',
  periwinkle: '#7484ca',
  lilac: '#c7c6f9',
  cream: '#fef7d8',
  amber: '#f6b35d',
  gold: '#ffd84d',
  orange: '#f57a25',
  ember: '#ba361a',
  brass: '#e2aa4c',
  wood: '#864c26',
  woodLight: '#ac6923',
  woodDeep: '#43170f',
  lawn: '#1e2a19',
  grass: '#1c4416',
  leaf: '#3a5d16',
  moss: '#587115',
  lime: '#8f9e10',
  stone: '#584f24',
  stoneLit: '#8e793a',
} as const;

/** The 4 x 4 Bayer matrix, as the rank (0 to 15) of each pixel: the order things dither in and out. */
export const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

export function fill(context: CanvasRenderingContext2D, color: string, x: number, y: number, w = 1, h = 1) {
  context.fillStyle = color;
  context.fillRect(x, y, w, h);
}
