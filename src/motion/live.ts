import { useEffect, useSyncExternalStore } from 'react';
import { useSplit } from '../split/store';

/**
 * The review switch: with ?still=1 in the address every reveal is already in
 * its final state and ambient motion is frozen, so screenshots come out the
 * same every time.
 */
export function isStill(): boolean {
  if (typeof location === 'undefined') return false;
  const value = new URLSearchParams(location.search).get('still');
  return value !== null && value !== '0';
}

const never = () => () => {};

/** False on the server and during hydration, true after: lets a component differ from the prerendered HTML without a mismatch. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    never,
    () => true,
    () => false,
  );
}

/** True when things may move: the visitor has motion on and the page is not held still. */
export function useLive(): boolean {
  const { motion } = useSplit();
  const hydrated = useHydrated();
  return hydrated && motion && !isStill();
}

/**
 * Tells the stylesheet whether things may move, as data-motion on <html>.
 * Every animation and transition in src/styles is written under
 * html[data-motion='on']; without it the page is in its final state.
 * Mount once.
 */
export function MotionRoot() {
  const live = useLive();
  useEffect(() => {
    document.documentElement.dataset.motion = live ? 'on' : 'off';
  }, [live]);
  return null;
}
