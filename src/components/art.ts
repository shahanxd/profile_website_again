import { sectionArt } from '../content/sectionArt';
import type { ThumbName } from '../content/types';
import type { SplitId } from '../split/types';

/**
 * The section art: what scripts/build-section-art.mjs wrote to
 * public/art/sections/, looked up by name. Sizes are art pixels.
 */

export type SpriteName = keyof typeof sectionArt.creative.sprites | keyof typeof sectionArt.tech.sprites;

export interface SpriteArt {
  src: string;
  /** One frame, in art pixels. The file is `frames` of them side by side. */
  w: number;
  h: number;
  frames: number;
  /** Where frame 0's top-left corner sits in the 352 x 198 scene. */
  at: readonly [number, number];
  /** Named loops of [frame, milliseconds] steps. Every sprite has "idle". */
  sequences: Readonly<Record<string, readonly (readonly [number, number])[]>>;
}

export interface BandArt {
  src: string;
  w: number;
  h: number;
  /** The point of the scene the band keeps in the middle, where it can. */
  focus: readonly [number, number];
  /** Places on the water that catch the light, and drops off the fountain. */
  glints: readonly (readonly [number, number])[];
  sparkles: readonly (readonly [number, number])[];
  /** Lit windows that can go dark: x, y, and the colour of the dark pane. Night only. */
  windows: readonly (readonly [number, number, string])[];
}

type Cast = Partial<Record<SpriteName, SpriteArt>>;

export const artUrl = (src: string): string => `${import.meta.env.BASE_URL}art/sections/${src}`;

/**
 * A sprite as drawn for a staging. The lantern, cat, tray, table, figure and
 * cypress exist in both; the parrot and the kites are creative only and the
 * rover is tech only, and come from the staging that has them.
 */
export function spriteArt(name: SpriteName, staging: SplitId): SpriteArt {
  const own: Cast = sectionArt[staging].sprites;
  const other: Cast = sectionArt[staging === 'tech' ? 'creative' : 'tech'].sprites;
  return (own[name] ?? other[name])!;
}

/** A crop of the garden that stands in for a picture not supplied yet. Both stagings have every name. */
export function thumbArt(name: ThumbName, staging: SplitId): { src: string; w: number; h: number } {
  return { src: artUrl(`${staging}/thumb-${name}.png`), ...sectionArt.thumb };
}

/** The garden without its owner, for the scene band, and where its living details go. */
export function bandArt(staging: SplitId): BandArt {
  return sectionArt[staging].band;
}
