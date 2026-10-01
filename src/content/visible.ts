/**
 * Placeholders ship (see the policy at the top of types.ts): everything in
 * the content file is on the page in production too, and stand-ins are worded
 * so they cannot be mistaken for facts. What is left here is how to tell a
 * stand-in apart.
 */

/** True for a fact or piece the owner has not confirmed or supplied yet. */
export function isPlaceholder(item: { confirmed: boolean }): boolean {
  return !item.confirmed;
}

/**
 * Whether stand-ins are pointed out on the page: only on the development
 * server, and only when the address asks with ?drafts=1. The owner looks at
 * the development site too, and there the outline is only in the way.
 * (Development pages are not prerendered, so reading the address here cannot
 * disagree with any HTML sent ahead.)
 */
export const showDrafts: boolean =
  import.meta.env.DEV && typeof location !== 'undefined' && new URLSearchParams(location.search).get('drafts') === '1';

/** What marks an element as a stand-in, when stand-ins are being pointed out: a dotted outline (src/styles/index.css) and a tooltip. */
export function draftMark(marked: boolean, title = 'draft copy'): { 'data-draft'?: string; title?: string } {
  return showDrafts && marked ? { 'data-draft': '', title } : {};
}

/** Spread onto the element that shows a placeholder, so the owner can find what is still to be replaced. In production it adds nothing. */
export function devMark(placeholder: boolean): { 'data-draft'?: string; title?: string } {
  return draftMark(placeholder, 'placeholder');
}
