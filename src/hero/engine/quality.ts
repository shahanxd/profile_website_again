export type Quality = 'low' | 'mid' | 'high';

export interface Tier {
  /** Most frames per second the loop will run. */
  fps: number;
  /** Share of each emitter's particles to keep. */
  particles: number;
  /** One still frame: no clock, no parallax, no particles. A split switch still dissolves. */
  still: boolean;
}

export const TIERS: Record<Quality, Tier> = {
  high: { fps: 60, particles: 1, still: false },
  mid: { fps: 30, particles: 0.5, still: false },
  low: { fps: 30, particles: 0, still: true },
};

/**
 * A guess from what the browser will say about the device. The scene itself
 * is cheap (three draw calls at art resolution), so this is about battery and
 * weak phones, not about whether it can run. `forced` is the ?q= switch.
 */
export function pickQuality(forced?: Quality): Quality {
  if (forced) return forced;
  const cores = navigator.hardwareConcurrency ?? 8;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
  if (cores <= 2 || memory <= 2) return 'low';
  if (cores <= 4 || memory <= 4) return 'mid';
  return 'high';
}
