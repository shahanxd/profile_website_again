import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { site } from '../content/site';
import type { NavItem, SlotId } from '../content/types';
import { useHydrated } from '../motion/live';
import { watch } from '../motion/watch';
import { setMotion, useSplit } from '../split/store';
import type { SplitId } from '../split/types';
import { Glass } from './Glass';
import { PixelButton } from './PixelButton';
import { SplitSwitch } from './SplitSwitch';

/**
 * The section being read: the one that crosses a line just above the middle
 * of the window. Each split has its own sections under the same ids, so the
 * watch starts again when the split changes.
 */
function useActiveSlot(slots: SlotId[], split: SplitId): SlotId | null {
  const [active, setActive] = useState<SlotId | null>(null);
  const key = slots.join(' ');

  useEffect(() => {
    const order = key.split(' ') as SlotId[];
    const crossing = new Set<SlotId>();
    setActive(null);
    const stops = order.map((slot) => {
      const section = document.getElementById(slot);
      if (!section) return () => {};
      return watch(
        section,
        (visible) => {
          if (visible) crossing.add(slot);
          else crossing.delete(slot);
          setActive(order.find((candidate) => crossing.has(candidate)) ?? null);
        },
        '-45% 0px -50% 0px',
      );
    });
    return () => stops.forEach((stop) => stop());
  }, [key, split]);

  return active;
}

/** True once the hero has scrolled away under the menu. */
function usePastHero(): boolean {
  const [past, setPast] = useState(false);

  // A layout effect, so a page that arrives already scrolled (a link to #work) never paints the open panel over its text.
  useLayoutEffect(() => {
    const hero = document.getElementById('top');
    if (!hero) return;
    setPast(hero.getBoundingClientRect().bottom < 96);
    return watch(hero, (visible) => setPast(!visible), '-96px 0px 0px 0px');
  }, []);

  return past;
}

function MotionToggle() {
  const { motion } = useSplit();
  // The prerendered page says "on"; a visitor's own setting is only known after hydration.
  const on = useHydrated() ? motion : true;
  return (
    <button type="button" className="menu-motion" aria-pressed={on} onClick={() => setMotion(!on)}>
      motion <span>{on ? 'on' : 'off'}</span>
    </button>
  );
}

function Links({ items, active, onPick }: { items: NavItem[]; active: SlotId | null; onPick?: () => void }) {
  return (
    <>
      {items.map((item) => (
        <li key={item.slot}>
          <a href={`#${item.slot}`} aria-current={active === item.slot ? 'location' : undefined} onClick={onPick}>
            {item.label}
          </a>
        </li>
      ))}
    </>
  );
}

/**
 * The site menu, with the wordmark that returns to the top.
 *
 * On wide screens it is one piece of glass that reads as the tablet in the
 * garden, enlarged: the wordmark, the split switch, the section links with
 * the one being read marked, and the motion switch. Over the hero it is two
 * rows at the top left, in the tree, clear of the headline in the sky; once
 * the hero has scrolled away it folds into one slim row at the top right.
 * On narrower screens it is a pill at the bottom with the split switch and a
 * button that opens the links as a sheet (a native dialog, so focus and
 * Escape behave), and the wordmark is a chip of its own over the hero that
 * goes when the hero does, so nothing opaque floats over the text.
 */
export function Menu() {
  const { split } = useSplit();
  const items = site[split].nav;
  const active = useActiveSlot(
    items.map((item) => item.slot),
    split,
  );
  const past = usePastHero();
  const sheet = useRef<HTMLDialogElement>(null);
  const close = () => sheet.current?.close();

  return (
    <>
      {/* data-dissolve: these lie over the hero but belong to the page, so the split dissolve covers them (see DissolveOverlay) */}
      <a href="#top" className="wordmark step-1" data-gone={past ? '' : undefined} data-dissolve="cover">
        {site.owner.name}
      </a>
      <Glass as="nav" className="menu" aria-label="site" data-compact={past ? '' : undefined} data-dissolve="cover">
        <a href="#top" className="menu-mark">
          {site.owner.name}
        </a>
        <SplitSwitch />
        <ul className="menu-links">
          <Links items={items} active={active} />
        </ul>
        <MotionToggle />
        <button type="button" className="menu-open" aria-haspopup="dialog" onClick={() => sheet.current?.showModal()}>
          menu
        </button>
      </Glass>
      <dialog
        ref={sheet}
        className="sheet"
        aria-label="menu"
        // a press on the dimmed page behind the sheet closes it
        onClick={(event) => event.target === event.currentTarget && close()}
      >
        <div className="sheet-body">
          <p className="eyebrow">go to</p>
          <ul className="sheet-links">
            <Links items={items} active={active} onPick={close} />
          </ul>
          <div className="sheet-foot">
            <MotionToggle />
            <PixelButton tone="ink" onClick={close}>
              close
            </PixelButton>
          </div>
        </div>
      </dialog>
    </>
  );
}
