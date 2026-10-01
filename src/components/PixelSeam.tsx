import { useEffect, useRef } from 'react';
import { useLive } from '../motion/live';
import { whileOnScreen } from '../motion/watch';

/** How many steps the loose specks take while the seam crosses the window. */
const STEPS = 6;

interface PixelSeamProps {
  /**
   * Which edge of a picture the page eats into. "bottom": the seam lies along
   * the bottom of its positioned parent, solid at the very bottom. "top": the
   * same, upside down, along the top.
   */
  edge?: 'bottom' | 'top';
  /**
   * For a picture the seam cannot be put inside (the hero): render it in the
   * flow straight after the picture, and it overlaps the picture's bottom edge.
   */
  after?: boolean;
}

/**
 * Where a picture meets the page: the page colour breaks up into scattered
 * pixels over the picture's edge. A sparse second layer of specks moves a
 * step at a time as the seam scrolls through the window.
 */
export function PixelSeam({ edge = 'bottom', after = false }: PixelSeamProps) {
  const ref = useRef<HTMLDivElement>(null);
  const live = useLive();

  useEffect(() => {
    const seam = ref.current;
    if (!seam || !live) return;
    let shown = -1;
    const stop = whileOnScreen(seam, () => {
      const box = seam.getBoundingClientRect();
      // 0 as the seam comes in at the bottom of the window, 1 as it leaves at the top
      const through = 1 - box.bottom / (innerHeight + box.height);
      const step = Math.round(Math.min(Math.max(through, 0), 1) * STEPS);
      if (step === shown) return;
      shown = step;
      seam.style.setProperty('--seam-step', String(step));
    });
    return () => {
      stop();
      seam.style.removeProperty('--seam-step');
    };
  }, [live]);

  // data-dissolve: over the hero the seam belongs to the page, so the split dissolve covers it (see DissolveOverlay)
  const seam = (
    <div ref={ref} className="seam" data-edge={edge} data-dissolve="cover" aria-hidden="true">
      <span />
      <span className="seam-drift" />
    </div>
  );
  return after ? <div className="seam-hold">{seam}</div> : seam;
}
