import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import { App } from './App';
import { SPLITS } from './split/splits';
import { initSplit } from './split/store';
import type { SplitId } from './split/types';

export { SPLITS };

/** Renders one split to static HTML. Called by scripts/prerender.mjs at build time. */
export function render(split: SplitId): string {
  initSplit(split);
  return renderToString(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
