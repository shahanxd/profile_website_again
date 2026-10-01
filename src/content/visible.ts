import type { SplitId } from '../split/types';
import { site } from './site';
import type { NavItem } from './types';

/**
 * Placeholders ship (see the policy at the top of types.ts): everything in
 * the content file is on the page in production too, and stand-ins are worded
 * so they cannot be mistaken for facts. What is left here is how to tell a
 * stand-in apart, and which sections exist.
 */

/** True for a fact or piece the owner has not confirmed or supplied yet. */
export function isPlaceholder(item: { confirmed: boolean }): boolean {
  return !item.confirmed;
}

/**
 * Spread onto the element that shows a placeholder: in development it gets
 * the same dotted outline as draft copy, so the owner can find what is still
 * to be replaced. In production it adds nothing.
 */
export function devMark(placeholder: boolean): { 'data-draft'?: string; title?: string } {
  return import.meta.env.DEV && placeholder ? { 'data-draft': '', title: 'placeholder' } : {};
}

/** The proof section exists while it has entries, stand-ins included. */
export function hasProof(split: SplitId): boolean {
  return split === 'tech' ? site.tech.proof.achievements.length > 0 : site.creative.proof.testimonials.length > 0;
}

/** Navigation entries for the sections that are actually on the page. */
export function navFor(split: SplitId): NavItem[] {
  return site[split].nav.filter((item) => item.slot !== 'proof' || hasProof(split));
}
