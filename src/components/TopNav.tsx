import { site } from '../content/site';
import { navFor } from '../content/visible';
import { useSplit } from '../split/store';
import { SplitSwitch } from './SplitSwitch';

/** Plain navigation for the foundation build. The tablet menu and glass pill replace it later. */
export function TopNav() {
  const { split } = useSplit();
  const items = navFor(split);

  return (
    <header className="fixed inset-x-0 top-0 z-40 bg-bg/85 backdrop-blur-sm">
      <div className="page flex h-16 items-center justify-between gap-4">
        <a href="#top" className="font-display text-xl lowercase text-ink no-underline">
          {site.owner.name}
        </a>
        <nav aria-label="sections" className="hidden items-center gap-6 font-pixel text-sm md:flex">
          {items.map((item) => (
            <a key={item.slot} href={`#${item.slot}`} className="lowercase text-ink-2 no-underline hover:text-ink">
              {item.label}
            </a>
          ))}
        </nav>
        <SplitSwitch />
      </div>
    </header>
  );
}
