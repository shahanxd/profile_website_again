import { useEffect, useRef, type RefObject } from 'react';

/**
 * Shared watchers, so the page keeps a handful of observers and one scroll
 * listener however many sprites, seams and headings are on it.
 */

type Seen = (visible: boolean) => void;

/** What is known about one watched element: whether it is on screen (once the observer has said), and who wants to hear. */
interface Watched {
  visible?: boolean;
  listeners: Set<Seen>;
}

/** One observer for each margin in use. */
const observers = new Map<string, { observer: IntersectionObserver; watched: Map<Element, Watched> }>();

/**
 * Calls `seen` whenever the element comes into or leaves the window, starting
 * with where it is now. `margin` grows or shrinks the window
 * (IntersectionObserver's rootMargin). Returns a way to stop.
 */
export function watch(element: Element, seen: Seen, margin = '0px'): () => void {
  let entry = observers.get(margin);
  if (!entry) {
    const watched = new Map<Element, Watched>();
    const observer = new IntersectionObserver(
      (changes) => {
        for (const change of changes) {
          const state = watched.get(change.target);
          if (!state) continue;
          state.visible = change.isIntersecting;
          state.listeners.forEach((listener) => listener(change.isIntersecting));
        }
      },
      { rootMargin: margin },
    );
    entry = { observer, watched };
    observers.set(margin, entry);
  }
  const { observer, watched } = entry;
  const known = watched.get(element);
  const state: Watched = known ?? { listeners: new Set() };
  if (!known) {
    watched.set(element, state);
    observer.observe(element);
  } else if (state.visible !== undefined) {
    // The observer has already reported on this element and will not again until it changes: pass on what it said.
    const { visible } = state;
    queueMicrotask(() => state.listeners.has(seen) && seen(visible));
  }
  state.listeners.add(seen);
  return () => {
    state.listeners.delete(seen);
    if (state.listeners.size) return;
    watched.delete(element);
    observer.unobserve(element);
  };
}

/**
 * Marks an element with data-on while it is on screen. Small loops written in
 * the stylesheet run only on marked elements, so nothing animates unseen.
 */
export function useOnScreen<T extends Element>(): RefObject<T | null> {
  const ref = useRef<T>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    return watch(element, (visible) => element.toggleAttribute('data-on', visible));
  }, []);
  return ref;
}

const updates = new Set<() => void>();
let queued = false;

function flush() {
  queued = false;
  updates.forEach((update) => update());
}

function onScroll() {
  if (queued) return;
  queued = true;
  requestAnimationFrame(flush);
}

/**
 * Runs `update` on scroll and resize (at most once a frame), but only while
 * the element is on screen. Returns a way to stop.
 */
export function whileOnScreen(element: Element, update: () => void): () => void {
  const start = () => {
    if (!updates.size) {
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onScroll, { passive: true });
    }
    updates.add(update);
    update();
  };
  const stop = () => {
    updates.delete(update);
    if (!updates.size) {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    }
  };
  const unwatch = watch(element, (visible) => (visible ? start() : stop()));
  return () => {
    unwatch();
    stop();
  };
}
