import type { MouseEvent } from 'react';
import { SPLIT_IDS, SPLITS } from '../split/splits';
import { setSplit, useSplit } from '../split/store';
import type { SplitId } from '../split/types';

/** Two real links, so each split can be opened in a new tab or shared; a plain click switches in place. */
export function SplitSwitch({ className = '' }: { className?: string }) {
  const { split, target } = useSplit();
  const shown = target ?? split;

  const go = (next: SplitId) => (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    const box = event.currentTarget.getBoundingClientRect();
    setSplit(next, [box.left + box.width / 2, box.top + box.height / 2]);
  };

  return (
    <div className={`inline-flex border border-line font-pixel text-sm ${className}`} role="group" aria-label="profile">
      {SPLIT_IDS.map((id) => (
        <a
          key={id}
          href={SPLITS[id].path}
          onClick={go(id)}
          aria-current={shown === id ? 'page' : undefined}
          className={`px-3 py-1.5 lowercase no-underline transition-colors ${
            shown === id ? 'bg-ink text-bg' : 'text-ink-2 hover:text-ink'
          }`}
        >
          {SPLITS[id].label}
        </a>
      ))}
    </div>
  );
}
