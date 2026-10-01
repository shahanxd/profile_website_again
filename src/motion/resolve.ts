import { useEffect, useRef, type RefObject } from 'react';
import { useLive } from './live';
import { watch } from './watch';

/** The dither steps between nothing and whole (see --dither-1 to --dither-7 in src/styles/dither.css). */
const STEPS = 7;
/** One step, in milliseconds: seven of them and the last one clearing make about half a second. */
const STEP_MS = 64;

/**
 * Makes an element resolve out of dither the first time it scrolls into view:
 * hidden, then seven Bayer steps, then whole. It happens once. An element
 * that is already on screen when the page arrives is left alone, so nothing
 * being read ever blinks; with motion off, or ?still=1, nothing is hidden at
 * all. The steps are a data-resolve attribute; the stylesheet does the rest.
 */
export function useResolve<T extends HTMLElement>(delay = 0): RefObject<T | null> {
  const ref = useRef<T>(null);
  const live = useLive();

  useEffect(() => {
    const element = ref.current;
    if (!element || !live || element.dataset.resolved !== undefined) return;

    const done = () => {
      delete element.dataset.resolve;
      element.dataset.resolved = '';
    };

    const box = element.getBoundingClientRect();
    if (box.top < innerHeight && box.bottom > 0) return done();

    element.dataset.resolve = '0';
    let timer = 0;
    let step = 0;
    const tick = () => {
      step += 1;
      if (step > STEPS) return done();
      element.dataset.resolve = String(step);
      timer = window.setTimeout(tick, STEP_MS);
    };
    // A little way in from the bottom edge, so the resolve is seen rather than caught finishing.
    const unwatch = watch(
      element,
      (visible) => {
        if (!visible) return;
        unwatch();
        timer = window.setTimeout(tick, delay);
      },
      '0px 0px -10% 0px',
    );

    return () => {
      unwatch();
      clearTimeout(timer);
      // Motion was turned off part-way: show it whole. It may resolve again later only if it never began.
      delete element.dataset.resolve;
      if (step > 0) element.dataset.resolved = '';
    };
  }, [live, delay]);

  return ref;
}
