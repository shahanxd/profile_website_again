import type { Framing, Vec2 } from '../scene/types';

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
  /** Painted world left over beyond the nearer edge, across and down: how far layers can shift before bare canvas would show. */
  slack: Vec2;
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

/**
 * Added before rounding the camera to a whole art pixel. Whole-number screen sizes land exactly half way between
 * two pixels all the time (a phone 390 wide at 3x does), and there the stylesheet's arithmetic and this file's
 * can fall to different sides. A sum this far off the half-way mark cannot. hero.css adds the same.
 */
const NUDGE = 0.03;
/** The same, for sums that are rounded to a whole k: hero.css adds a thousandth of a device pixel there (--tiny). */
const TINY = 0.001;

/**
 * `portrait` is whether the stylesheet is laying the hero out for a tall screen: pass isPortrait(). The element
 * is not the window (a scrollbar narrows it, long copy makes it taller), so its own shape is only the fallback.
 */
export function frameView(deviceW: number, deviceH: number, framing: Framing, portrait = deviceH >= deviceW): View {
  const [worldW, worldH] = framing.world;
  // The painted world with the lawn that carries on below it.
  const depth = worldH + framing.lawn;
  // Wide screens are sized by height, to the nearest whole k, unless that leaves too few columns: then by
  // width. Tall ones take the largest k that still shows the whole carpet group across and enough rows of
  // lawn below it for the copy.
  const wanted = portrait
    ? Math.min(Math.floor(deviceW / framing.portrait.width + TINY), Math.floor(deviceH / framing.portrait.height + TINY))
    : Math.min(Math.round(deviceH / framing.landscape.height), Math.round(deviceW / framing.landscape.width));
  // Whatever the screen, the view never shows more than is painted, across or down.
  const k = Math.max(1, Math.ceil(deviceW / worldW), Math.ceil(deviceH / depth), wanted);
  const w = Math.ceil(deviceW / k);
  const h = Math.ceil(deviceH / k);
  // (Written the way hero.css has to write it, on the true screen size and with the same rounding,
  // so the stylesheet's first paint and this agree to the pixel.)
  // A wide screen starts `left` columns in. One that shows nearly the whole width of the world sits in the
  // middle of it instead, so there is as much world to slide into on the right as on the left.
  const across = portrait
    ? -Math.round((0.5 * deviceW) / k - framing.focus[0] + NUDGE)
    : Math.min(framing.landscape.left, Math.floor((worldW - deviceW / k) / 2 + NUDGE));
  const x = clamp(across, 0, worldW - w);
  // A tall screen starts at the top of the world: the lawn below is where its copy goes. Either way the view
  // never rises above the world, and it reaches down to the floor row.
  const ideal = portrait ? 0 : -Math.round((framing.landscape.target * deviceH) / k - framing.focus[1] + NUDGE);
  const y = Math.max(0, ideal, framing.floor - h);
  return { k, w, h, x, y, slack: [Math.min(x, worldW - w - x), Math.min(y, depth - h - y)] };
}

/** The question hero.css asks to choose between its wide and its tall layout. */
export const isPortrait = () => matchMedia('(orientation: portrait)').matches;

/**
 * Reports the element's size in real device pixels, now and whenever it
 * changes. Where the browser can tell us the exact figure we use it; rounding
 * CSS size times devicePixelRatio can be a pixel out at fractional ratios.
 */
export function watchDeviceSize(element: Element, onSize: (width: number, height: number) => void): () => void {
  let exact: ResizeObserverSize | undefined;
  const measure = () => {
    const box = element.getBoundingClientRect();
    const width = Math.round(box.width * devicePixelRatio);
    const height = Math.round(box.height * devicePixelRatio);
    // The exact figure only ever differs from the estimate by rounding. If it is further off it is out of date,
    // or the browser is emulating a device (DevTools phone mode reports unscaled sizes here): use the estimate.
    if (exact && Math.abs(exact.inlineSize - width) <= 1 && Math.abs(exact.blockSize - height) <= 1) {
      onSize(exact.inlineSize, exact.blockSize);
    } else onSize(width, height);
  };
  const observer = new ResizeObserver((entries) => {
    exact = entries[0].devicePixelContentBoxSize?.[0];
    measure();
  });
  try {
    observer.observe(element, { box: 'device-pixel-content-box' });
  } catch {
    observer.observe(element); // Safari: no exact box
  }
  // Zooming the browser changes the size of a CSS pixel and nothing else: a window-filling element keeps its
  // device pixels, so the observer has nothing to report. The window does report it, as a resize.
  window.addEventListener('resize', measure);
  measure();
  return () => {
    observer.disconnect();
    window.removeEventListener('resize', measure);
  };
}
