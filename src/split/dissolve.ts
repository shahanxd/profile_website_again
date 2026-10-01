import { bayer8 } from '../hero/engine/backdrop';
import { otherSplit, SPLITS } from './splits';
import type { SplitId } from './types';

/**
 * The pixel dissolve that carries the page from one split to the other, as
 * numbers. Two things draw it: the hero engine (in its shader, turning the
 * garden itself from one staging into the other) and the page overlay (cells
 * of flat colour over everything else). Both take their timing, their grid
 * and the order in which blocks turn from this file, so they move as one.
 */

/** The old page is covered for this long, the split is swapped underneath, then the new page is uncovered. */
export const COVER_MS = 420;
export const REVEAL_MS = 520;
export const TOTAL_MS = COVER_MS + REVEAL_MS;

/** A dissolve block is this many art pixels square. */
export const BLOCK = 4;

/**
 * How much of a block's turn is decided by its distance from where the
 * dissolve started. The rest is ordered dither, which breaks the travelling
 * edge up into loose pixels instead of a hard circle.
 */
export const SPREAD = 0.65;

/** Where a dissolve starts and how far it has to travel, in blocks of one grid. */
export interface Spread {
  x: number;
  y: number;
  reach: number;
}

/**
 * The moment block (bx, by) turns, from 0 (at once) to just under 1 (last).
 * A block shows the new picture once progress is above this. The engine's
 * present shader does the same sum; keep the two alike.
 */
export function threshold(bx: number, by: number, spread: Spread): number {
  const distance = Math.hypot(bx + 0.5 - spread.x, by + 0.5 - spread.y) / spread.reach;
  return SPREAD * Math.min(distance, 1) + (1 - SPREAD) * bayer8(bx, by);
}

/**
 * The spread for a grid whose block (0, 0) has its corner at (left, top) on
 * screen, with blocks `cell` CSS pixels wide. `origin` is a point in the
 * window. The reach is the farthest corner of the window, so the dissolve
 * crosses whatever is on screen in the same time wherever it starts.
 */
export function spreadFrom(origin: [number, number], left: number, top: number, cell: number): Spread {
  const [x, y] = origin;
  const reach = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  return { x: (x - left) / cell, y: (y - top) / cell, reach: Math.max(reach / cell, 1) };
}

/** Which half of a whole switch a moment falls in (0..1 over cover plus reveal), and how far through that half it is. */
export function halfAt(progress: number): { covering: boolean; local: number } {
  const ms = progress * TOTAL_MS;
  return ms < COVER_MS ? { covering: true, local: ms / COVER_MS } : { covering: false, local: (ms - COVER_MS) / REVEAL_MS };
}

/**
 * Where a switch to `target` spreads from: the point that was pressed, or,
 * when nothing was (the back button), the link that leads to that split.
 */
export function originFor(target: SplitId, pressed: [number, number] | null): [number, number] {
  if (pressed) return pressed;
  const box = document.querySelector(`a[href="${SPLITS[target].path}"]`)?.getBoundingClientRect();
  return box && box.width ? [box.left + box.width / 2, box.top + box.height / 2] : [innerWidth - 24, 24];
}

/**
 * The ?dissolve=<0..1> switch holds a switch part-way so it can be looked at
 * as a still. The page under the cells is always the address's own split:
 * before the swap you see this split being covered on its way to the other
 * one; after it, this split being uncovered on its way in from the other one.
 */
export function heldDissolve(split: SplitId): { progress: number; from: SplitId; to: SplitId } | null {
  const value = new URLSearchParams(location.search).get('dissolve');
  const progress = value ? Number(value) : NaN;
  if (!(progress >= 0 && progress <= 1)) return null;
  const other = otherSplit(split);
  return halfAt(progress).covering ? { progress, from: split, to: other } : { progress, from: other, to: split };
}

/**
 * The part of the page that dissolves by itself: the hero's canvas. The hero
 * keeps this up to date. The overlay reads it on every frame: it takes its
 * grid and cell size from it so the two line up, and leaves that rectangle
 * clear while `live` is true. Without a hero the overlay uses a plain grid.
 */
export const selfDissolving = {
  element: null as HTMLElement | null,
  /** CSS pixels per block. */
  cell: 16,
  live: false,
};

// ------------------------------------------------------------ keeping the place
// The two splits have the same sections at different heights. A visitor who
// switches while reading one should still be looking at it afterwards.

export interface Place {
  /** The block of the page that was being read, then the blocks after it, in order. */
  keys: string[];
  /** Where its top edge was on screen. */
  top: number;
  /** How far through it the reading line was, 0..1. */
  part: number;
}

/** Roughly where the eye rests: a third of the way down the window. */
const readingLine = () => innerHeight * 0.35;

/** The page's blocks below the hero, each under a name that means the same thing on both splits. */
function blocks(): Map<string, Element> {
  const found = new Map<string, Element>();
  let unnamed = 0;
  for (const element of document.querySelectorAll('main > *, footer')) {
    found.set(element.id || `${element.tagName}-${unnamed++}`, element);
  }
  return found;
}

/** Call before the swap. Null while the hero is what is being looked at: nothing above it changes size. */
export function markPlace(): Place | null {
  const line = readingLine();
  const all = [...blocks()];
  const at = all.findIndex(([, element]) => {
    const box = element.getBoundingClientRect();
    return box.top <= line && box.bottom > line;
  });
  if (at < 0) return null;
  const box = all[at][1].getBoundingClientRect();
  return { keys: all.slice(at).map(([key]) => key), top: box.top, part: (line - box.top) / box.height };
}

/** Call after the swap: scrolls, at once, so the same block is under the reading line again. */
export function restorePlace(place: Place) {
  const all = blocks();
  // A section the new split does not have: settle at the start of the block that came after it.
  const key = place.keys.find((candidate) => all.has(candidate));
  if (!key) return;
  const box = all.get(key)!.getBoundingClientRect();
  const same = key === place.keys[0];
  // If its heading was on screen, keep the heading where it was. Otherwise keep the same way through it.
  const top = place.top >= 0 ? place.top : readingLine() - (same ? place.part : 0) * box.height;
  window.scrollBy({ top: box.top - top, behavior: 'instant' });
}
