import type { Framing } from '../scene/types';

/**
 * Fits the world to a screen in whole numbers. One art pixel is always k
 * device pixels, k a whole number, so pixels are perfectly even at any
 * devicePixelRatio (2.625 included). Everything else follows from k.
 *
 * Small and free of engine code on purpose: the page uses it before the engine
 * loads, to put the poster image on the same pixel grid.
 */

export interface View {
  /** Device pixels per art pixel. */
  k: number;
  /** Art pixels on screen. The last column and row may be partly cut off by the screen edge. */
  w: number;
  h: number;
  /** World position of the top-left art pixel. */
  x: number;
  y: number;
  /** Painted world left over beyond the nearer side edge: how far layers can shift before bare canvas would show. */
  slack: number;
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export function frameView(deviceW: number, deviceH: number, framing: Framing): View {
  const [worldW] = framing.world;
  const portrait = deviceH > deviceW;
  // Wide screens are sized by height, to the nearest whole k. Tall ones are sized by width, rounding k up
  // so the view is never wider than asked. Neither may show more than the painted width.
  const wanted = portrait ? Math.ceil(deviceW / framing.portrait.width) : Math.round(deviceH / framing.landscape.height);
  const k = Math.max(1, Math.ceil(deviceW / worldW), wanted);
  const w = Math.ceil(deviceW / k);
  const h = Math.ceil(deviceH / k);
  const target = portrait ? framing.portrait.target : framing.landscape.target;
  // Sideways the view stays inside the painting (inside a narrower span on tall screens).
  // Up and down it may leave it: sky and lawn carry on in code.
  const [from, to] = portrait ? framing.portrait.span : [0, worldW];
  // (Written the way hero.css has to write it, on the true screen size and with the same rounding,
  // so the stylesheet's first paint and this agree to the pixel.)
  const x = clamp(-Math.round((target[0] * deviceW) / k - framing.focus[0]), from, to - w);
  const y = Math.max(-Math.round((target[1] * deviceH) / k - framing.focus[1]), framing.floor - h);
  return { k, w, h, x, y, slack: Math.min(x, worldW - w - x) };
}

/**
 * Reports the element's size in real device pixels, now and whenever it
 * changes. Where the browser can tell us the exact figure we use it; rounding
 * CSS size times devicePixelRatio can be a pixel out at fractional ratios.
 */
export function watchDeviceSize(element: Element, onSize: (width: number, height: number) => void): () => void {
  const measure = (exact?: ResizeObserverSize) => {
    const box = element.getBoundingClientRect();
    const width = Math.round(box.width * devicePixelRatio);
    const height = Math.round(box.height * devicePixelRatio);
    // The exact figure only ever differs from the estimate by rounding. If it is further off, the browser
    // is emulating a device (DevTools phone mode reports unscaled sizes here) and the estimate is the truth.
    const trusted = exact && Math.abs(exact.inlineSize - width) <= 1 && Math.abs(exact.blockSize - height) <= 1;
    if (trusted) onSize(exact.inlineSize, exact.blockSize);
    else onSize(width, height);
  };
  const estimate = () => measure();
  const observer = new ResizeObserver((entries) => measure(entries[0].devicePixelContentBoxSize?.[0]));
  try {
    observer.observe(element, { box: 'device-pixel-content-box' });
  } catch {
    observer.observe(element); // Safari: no exact box, and zoom changes arrive as window resizes
    window.addEventListener('resize', estimate);
  }
  estimate();
  return () => {
    observer.disconnect();
    window.removeEventListener('resize', estimate);
  };
}
