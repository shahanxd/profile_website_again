import { watch } from './watch';

/**
 * Quiet: serious content is being read (anything marked data-tone="plain":
 * sumud, salamah), so nothing playful moves near it. While it lasts <html>
 * carries data-quiet, which the stylesheet uses to fade the ambient layer
 * and hold the scene band's loops; sprites and the ambient canvas ask here.
 */

const listeners = new Set<() => void>();
let quiet = false;

export const isQuiet = (): boolean => quiet;

/** Calls `listener` whenever quiet begins or ends. Returns a way to stop. */
export function onQuiet(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function setQuiet(next: boolean) {
  if (next === quiet) return;
  quiet = next;
  document.documentElement.toggleAttribute('data-quiet', quiet);
  listeners.forEach((listener) => listener());
}

/**
 * Watches every plain-toned element now on the page: quiet lasts while any of
 * them is well inside the window. Returns a way to stop, which also ends the
 * quiet. Call again when the page's content changes (a split switch).
 */
export function watchPlain(): () => void {
  const inside = new Set<Element>();
  const stops = [...document.querySelectorAll('[data-tone="plain"]')].map((element) =>
    watch(
      element,
      (visible) => {
        if (visible) inside.add(element);
        else inside.delete(element);
        setQuiet(inside.size > 0);
      },
      '-12% 0px -12% 0px',
    ),
  );
  return () => {
    stops.forEach((stop) => stop());
    setQuiet(false);
  };
}
