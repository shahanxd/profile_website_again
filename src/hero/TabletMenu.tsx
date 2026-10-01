import { useLayoutEffect, useRef } from 'react';
import { navFor } from '../content/visible';
import type { SplitId } from '../split/types';

/**
 * The narrowest the tablet's screen may be, in CSS pixels, for the menu to be
 * laid over it. Below this the labels would be too small to read, the prop is
 * only a prop, and the top navigation does the job alone.
 */
export const MENU_MIN_WIDTH = 96;

/**
 * The site menu's real links, laid over the screen of the tablet prop in the
 * garden. The engine says where the screen is (the hero passes its place on
 * as --menu-x and --menu-y); the stylesheet draws a plate in the screen's
 * colour with one row per link, all in whole art pixels. `size` is the
 * screen's width and height in CSS pixels.
 */
export function TabletMenu({ split, size }: { split: SplitId; size: [number, number] }) {
  const items = navFor(split);
  const ref = useRef<HTMLElement>(null);
  const labels = items.map((item) => item.label).join('|');
  const [width, height] = size;

  // One type size for every row: the stylesheet's, or smaller if the longest label needs it.
  useLayoutEffect(() => {
    const nav = ref.current!;
    const fit = () => {
      nav.style.fontSize = '';
      const row = nav.querySelector('a');
      if (!row) return;
      const style = getComputedStyle(row);
      const room = row.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
      const widest = Math.max(...[...nav.querySelectorAll('span')].map((label) => label.getBoundingClientRect().width));
      if (widest > room) nav.style.fontSize = `${Math.floor((parseFloat(style.fontSize) * room * 4) / widest) / 4}px`;
    };
    fit();
    // The pixel font may arrive after the first layout, and it is wider than its stand-in.
    let current = true;
    document.fonts.ready.then(() => current && fit());
    return () => {
      current = false;
    };
  }, [labels, width]);

  return (
    <nav
      ref={ref}
      aria-label="sections, on the tablet in the garden"
      className="garden-menu hero-swap font-pixel"
      style={{ width, height }}
    >
      <ul>
        {items.map((item) => (
          <li key={item.slot}>
            <a href={`#${item.slot}`}>
              <span>{item.label}</span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
