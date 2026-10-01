export type SplitId = 'creative' | 'tech';

/** idle: nothing running. covering: old page is being covered. revealing: new page is being uncovered. */
export type Phase = 'idle' | 'covering' | 'revealing';

export interface SplitState {
  split: SplitId;
  phase: Phase;
  /** The split being switched to while a transition runs, else null. */
  target: SplitId | null;
  /** Viewport point the transition spreads from (the control that was pressed). */
  origin: [number, number] | null;
  /** False when the visitor prefers reduced motion or has turned motion off. */
  motion: boolean;
}
