import { useEffect, useLayoutEffect, useRef } from 'react';
import {
  COVER_MS,
  heldDissolve,
  markPlace,
  originFor,
  restorePlace,
  REVEAL_MS,
  selfDissolving,
  spreadFrom,
  threshold,
  type Place,
} from './dissolve';
import { SPLITS } from './splits';
import { configureTransition, getSplitState, subscribeSplit, useSplit } from './store';

/** Things fixed over the hero (the navigation bar) carry this mark: they belong to the page, so the overlay covers them. */
const COVERED = '[data-dissolve="cover"]';

/**
 * The page-wide half of the split dissolve: a canvas fixed over the window
 * that nothing can click. While the store is covering, cells the size of the
 * hero's dissolve blocks fill with the new split's page colour, spreading
 * from the control that was pressed; the store then swaps the split under
 * full cover, and the cells clear in the same order. The hero's own rectangle
 * is left alone, because the garden dissolves itself there in step.
 *
 * Mounting this is what gives the switch its duration. With motion off the
 * store swaps at once and nothing is drawn. Either way, the section being
 * read is kept in place across the swap.
 */
export function DissolveOverlay() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const place = useRef<Place | null>(null);
  const { split } = useSplit();

  useEffect(() => {
    const canvas = canvasRef.current!;
    const context = canvas.getContext('2d')!;
    let request = 0;
    let holding = 0;
    let started = 0;
    let origin: [number, number] = [0, 0];
    let colour = '';
    let last = getSplitState();

    /** Gives the canvas one pixel per device pixel. It has no pixels at all while nothing is happening. */
    const open = () => {
      const box = canvas.getBoundingClientRect();
      const [width, height] = [Math.round(box.width * devicePixelRatio), Math.round(box.height * devicePixelRatio)];
      if (canvas.width !== width) canvas.width = width;
      if (canvas.height !== height) canvas.height = height;
    };
    const close = () => {
      canvas.width = canvas.height = 0;
    };

    /** Paints the cells that are filled at this moment. Covering, cells fill as progress rises; uncovering, they clear. */
    const paint = (covering: boolean, progress: number) => {
      const ratio = devicePixelRatio;
      const device = (box: { left: number; top: number; right: number; bottom: number }) => {
        const [x, y] = [Math.round(box.left * ratio), Math.round(box.top * ratio)];
        return [x, y, Math.round(box.right * ratio) - x, Math.round(box.bottom * ratio) - y] as const;
      };
      // The grid is the hero's: block (0, 0) sits at its canvas's top-left corner, wherever the page has scrolled to,
      // and a cell is a whole number of device pixels, as the hero's blocks are.
      const hero = selfDissolving.element?.getBoundingClientRect();
      const left = hero ? hero.left : 0;
      const top = hero ? hero.top : -scrollY;
      const size = Math.max(1, Math.round(selfDissolving.cell * ratio));
      const [x0, y0] = [Math.round(left * ratio), Math.round(top * ratio)];
      const spread = spreadFrom(origin, left, top, selfDissolving.cell);

      const cells = () => {
        for (let by = Math.floor(-y0 / size); y0 + by * size < canvas.height; by++) {
          for (let bx = Math.floor(-x0 / size); x0 + bx * size < canvas.width; bx++) {
            if (progress > threshold(bx, by, spread) === covering) context.fillRect(x0 + bx * size, y0 + by * size, size, size);
          }
        }
      };

      context.clearRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = colour;
      cells();
      if (!hero || !selfDissolving.live) return;
      context.clearRect(...device(hero));
      for (const bar of document.querySelectorAll(COVERED)) {
        const box = bar.getBoundingClientRect();
        const within = {
          left: Math.max(box.left, hero.left),
          top: Math.max(box.top, hero.top),
          right: Math.min(box.right, hero.right),
          bottom: Math.min(box.bottom, hero.bottom),
        };
        if (within.right <= within.left || within.bottom <= within.top) continue;
        context.save();
        context.beginPath();
        context.rect(...device(within));
        context.clip();
        cells();
        context.restore();
      }
    };

    const frame = () => {
      const { phase } = getSplitState();
      if (phase === 'idle') return;
      const covering = phase === 'covering';
      paint(covering, Math.min((performance.now() - started) / (covering ? COVER_MS : REVEAL_MS), 1));
      request = requestAnimationFrame(frame);
    };

    // A switch that nothing was pressed for is the back or forward button. The browser then also moves the page
    // to wherever it was scrolled when that history entry was left: the wrong place (the splits' sections differ
    // in height), and before the cover is up. It does so after telling the page, so the place is noted now and
    // put back before the next paint. Every other step through history is left to the browser, which is what
    // makes Back after a menu link return to where the visitor was.
    const stayPut = () => {
      const top = scrollY;
      requestAnimationFrame(() => window.scrollTo({ top, behavior: 'instant' }));
    };

    const onChange = () => {
      const state = getSplitState();
      // The store has swapped the split but React has not redrawn the page yet: note what is being read.
      if (state.split !== last.split) place.current = markPlace();
      if (state.phase !== last.phase) {
        cancelAnimationFrame(request);
        if (state.phase === 'idle') close();
        else {
          if (state.phase === 'covering' && state.target) {
            origin = originFor(state.target, state.origin);
            colour = SPLITS[state.target].themeColor; // the theme colour is the page's background colour
            open();
            if (!state.origin) stayPut();
          }
          started = performance.now();
          // Painted here and now, not a frame later: at the swap this is what hides the page while it changes.
          frame();
        }
      }
      last = state;
    };

    close();
    configureTransition(COVER_MS, REVEAL_MS);
    const unsubscribe = subscribeSplit(onChange);

    // The ?dissolve= switch: hold the cells where they would be at that moment, for as long as the page is open.
    const held = heldDissolve(last.split);
    if (held) {
      colour = SPLITS[held.to].themeColor;
      const hold = () => {
        if (getSplitState().phase === 'idle') {
          origin = originFor(held.to, null);
          open();
          paint(held.covering, held.local);
        }
        holding = requestAnimationFrame(hold);
      };
      hold();
    }

    return () => {
      unsubscribe();
      cancelAnimationFrame(request);
      cancelAnimationFrame(holding);
      configureTransition(0, 0);
      close();
    };
  }, []);

  // Runs once React has put the new split on the page, before the browser paints it.
  useLayoutEffect(() => {
    if (place.current) restorePlace(place.current);
    place.current = null;
  }, [split]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-50 h-full w-full"
      style={{ imageRendering: 'pixelated' }}
    />
  );
}
