import type { CSSProperties } from 'react';
import type { Copy, Result } from '../content/types';
import { devMark, isPlaceholder } from '../content/visible';
import { useOnScreen } from '../motion/watch';
import { useSplit } from '../split/store';
import { artUrl, bandArt } from './art';
import { Glass } from './Glass';
import { PixelSeam } from './PixelSeam';
import { Sprite } from './Sprite';
import { Text } from './Text';

/** A thing placed in the scene, in art pixels. */
const at = (x: number, y: number, extra?: CSSProperties) => ({ '--x': x, '--y': y, ...extra }) as CSSProperties;

/** Where the two kites fly in the band, and how far into its drift each starts. */
const KITES = [
  { name: 'kite', x: 254, y: 74, delay: 0 },
  { name: 'kite-blue', x: 296, y: 84, delay: -5.5 },
] as const;

/** Fireflies over the beds and the lawn: where each hovers, and how far into its wander it starts. */
const FIREFLIES = [
  [146, 122, 0],
  [176, 136, -3.1],
  [262, 128, -6.4],
  [288, 114, -1.7],
  [246, 142, -8.2],
  [118, 130, -4.6],
  [318, 132, -9.3],
] as const;

const LABEL = {
  creative: 'the garden at golden hour: the pavilion, the pool, and the old city beyond the wall',
  tech: 'the garden at night: the pavilion lit from inside, the pool, and the city lights beyond the wall',
};

/**
 * The full-width band mid-page: the garden itself, at a whole-number scale,
 * with the headline numbers on a glass panel. A few things in it are alive
 * (the fountain, glints on the water, kites by day, fireflies and a window or
 * two going dark by night), and all of it rests while the band is off
 * screen. Its top and bottom edges break up into the page. On a phone the
 * panel sits across the picture's foot and runs on below it, so the pavilion
 * and the pool stay in view. Three numbers stand in a row; four are set two
 * by two, so a word like "endless" has room.
 */
export function SceneBand({ line, numbers }: { line: Copy; numbers: Result[] }) {
  const { split } = useSplit();
  const band = bandArt(split);
  // The stylesheet runs the band's little loops only while it carries data-on.
  const ref = useOnScreen<HTMLElement>();
  // figures say when they were counted ("as of now", "as of early 2025"), once for the whole panel
  const asOf = [...new Set(numbers.flatMap((number) => number.asOf ?? []))];

  return (
    <section ref={ref} aria-label="in numbers" className="band">
      <div className="band-view">
        <div
          className="band-stage"
          role="img"
          aria-label={LABEL[split]}
          style={{ '--focus-x': band.focus[0], '--focus-y': band.focus[1] } as CSSProperties}
        >
          <img src={artUrl(band.src)} width={band.w} height={band.h} alt="" loading="lazy" decoding="async" draggable={false} />
          {band.sparkles.map(([x, y], i) => (
            <i key={`s${i}`} className="band-sparkle" style={at(x, y, { animationDelay: `${i * -0.45}s` })} />
          ))}
          {band.glints.map(([x, y], i) => (
            <i key={`g${i}`} className="band-glint" style={at(x, y, { animationDelay: `${i * -1.9}s` })} />
          ))}
          {band.windows.map(([x, y, off], i) => (
            <i key={`w${i}`} className="band-window" style={at(x, y, { background: off, animationDelay: `${i * -3.7}s` })} />
          ))}
          {split === 'creative' &&
            KITES.map((kite) => (
              <span key={kite.name} className="band-thing band-kite" style={at(kite.x, kite.y, { animationDelay: `${kite.delay}s` })}>
                <Sprite name={kite.name} offset={kite.delay * -100} />
              </span>
            ))}
          {split === 'tech' &&
            FIREFLIES.map(([x, y, delay], i) => (
              <i key={`f${i}`} className="band-firefly" style={at(x, y, { animationDelay: `${delay}s, ${delay * 0.7}s` })} />
            ))}
        </div>
        <PixelSeam edge="top" />
        <PixelSeam edge="bottom" />
      </div>
      <div className="page band-content">
        <Glass className="band-panel">
          <Text as="p" copy={line} className="band-line" />
          {numbers.length > 0 && (
            <dl className="band-numbers" data-count={numbers.length}>
              {numbers.map((number) => (
                <div key={number.label} {...devMark(isPlaceholder(number))}>
                  <dt>{number.value}</dt>
                  <dd>{number.label}</dd>
                </div>
              ))}
            </dl>
          )}
          {asOf.length > 0 && <p className="band-as-of">as of {asOf.join(', ')}</p>}
        </Glass>
      </div>
    </section>
  );
}
