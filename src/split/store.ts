import { useSyncExternalStore } from 'react';
import { SPLITS, splitFromPath } from './splits';
import type { SplitId, SplitState } from './types';

/**
 * The one source of truth for which split is showing. It drives the page
 * tokens (data-split on <html>), the URL, the remembered split, and the
 * cover / reveal phases that the dissolve overlay and the hero engine follow.
 */

let state: SplitState = {
  split: 'creative',
  phase: 'idle',
  target: null,
  origin: null,
  motion: true,
};

const listeners = new Set<() => void>();

// Until something registers a visible transition these stay 0, so a switch is instant.
let coverMs = 0;
let revealMs = 0;

function set(next: Partial<SplitState>) {
  state = { ...state, ...next };
  listeners.forEach((fn) => fn());
}

export function getSplitState(): SplitState {
  return state;
}

export function subscribeSplit(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function useSplit(): SplitState {
  return useSyncExternalStore(subscribeSplit, getSplitState, getSplitState);
}

/** Set the starting split without side effects. Used by the server render and before hydration. */
export function initSplit(split: SplitId) {
  state = { ...state, split, phase: 'idle', target: null, origin: null };
}

/** Whoever draws the transition tells the store how long each half takes. */
export function configureTransition(cover: number, reveal: number) {
  coverMs = cover;
  revealMs = reveal;
}

function commit(split: SplitId, fromHistory: boolean) {
  const root = document.documentElement;
  root.setAttribute('data-split', split);
  document.title = SPLITS[split].title;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', SPLITS[split].themeColor);
  try {
    localStorage.setItem('split', split);
  } catch {
    // private mode: the split just is not remembered
  }
  if (!fromHistory) {
    history.pushState({ split }, '', SPLITS[split].path + location.search + location.hash);
  }
}

// A request that arrives mid-transition waits here and runs once the page is idle again.
let queued: [SplitId, [number, number] | null, boolean] | null = null;

function settle() {
  set({ phase: 'idle', target: null, origin: null });
  const next = queued;
  queued = null;
  if (next) setSplit(...next);
}

export function setSplit(next: SplitId, origin: [number, number] | null = null, fromHistory = false) {
  if (state.phase !== 'idle') {
    queued = [next, origin, fromHistory];
    return;
  }
  if (next === state.split) return;
  if (!state.motion || coverMs + revealMs === 0) {
    commit(next, fromHistory);
    set({ split: next });
    return;
  }
  set({ phase: 'covering', target: next, origin });
  setTimeout(() => {
    commit(next, fromHistory);
    set({ split: next, phase: 'revealing' });
    setTimeout(settle, revealMs);
  }, coverMs);
}

export function setMotion(motion: boolean, remember = true) {
  if (remember) {
    try {
      localStorage.setItem('motion', motion ? 'on' : 'off');
    } catch {
      // not remembered
    }
  }
  set({ motion });
}

/** Wire the store to the browser. Call once, after hydration. */
export function startSplitClient() {
  history.replaceState({ split: state.split }, '');
  window.addEventListener('popstate', () => setSplit(splitFromPath(location.pathname), null, true));

  let stored: string | null = null;
  try {
    stored = localStorage.getItem('motion');
  } catch {
    // fall through to the media query
  }
  const query = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (stored) setMotion(stored === 'on', false);
  else {
    setMotion(!query.matches, false);
    query.addEventListener('change', (e) => setMotion(!e.matches, false));
  }
}
