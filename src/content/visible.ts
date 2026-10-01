import type { SplitId } from '../split/types';
import { site } from './site';
import type { NavItem } from './types';

/**
 * Unconfirmed facts and placeholder pieces are shown while developing so the
 * layout can be judged, and are left out of production builds entirely.
 */
export const SHOW_UNCONFIRMED: boolean = import.meta.env.DEV;

export function confirmedOnly<T extends { confirmed: boolean }>(items: T[]): T[] {
  return SHOW_UNCONFIRMED ? items : items.filter((item) => item.confirmed);
}

/** The proof section only exists once there is something real to show in it. */
export function hasProof(split: SplitId): boolean {
  return split === 'tech'
    ? confirmedOnly(site.tech.proof.achievements).length > 0
    : site.creative.proof.testimonials.length > 0;
}

/** Navigation entries for the sections that are actually on the page. */
export function navFor(split: SplitId): NavItem[] {
  return site[split].nav.filter((item) => item.slot !== 'proof' || hasProof(split));
}
