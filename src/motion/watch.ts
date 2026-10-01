/**
 * Shared watchers, so the page keeps a handful of observers and one scroll
 * listener however many sprites, seams and headings are on it.
 */

type Seen = (visible: boolean) => void;

const observers = new Map<string, { observer: IntersectionObserver; seen: Map<Element, Seen> }>();

/**
 * Calls `seen` whenever the element comes into or leaves the window. `margin`
 * grows or shrinks the window (IntersectionObserver's rootMargin). Returns a
 * way to stop.
 */
export function watch(element: Element, seen: Seen, margin = '0px'): () => void {
  let entry = observers.get(margin);
  if (!entry) {
    const map = new Map<Element, Seen>();
    const observer = new IntersectionObserver(
      (changes) => changes.forEach((change) => map.get(change.target)?.(change.isIntersecting)),
      { rootMargin: margin },
    );
    entry = { observer, seen: map };
    observers.set(margin, entry);
  }
  entry.seen.set(element, seen);
  entry.observer.observe(element);
  return () => {
    entry.seen.delete(element);
    entry.observer.unobserve(element);
  };
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
