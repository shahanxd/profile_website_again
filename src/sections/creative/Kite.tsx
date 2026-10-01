import type { CSSProperties } from 'react';
import { Sprite } from '../../components/Sprite';

/** Where the line is tied, in the kite sprite's art pixels: under the left corner of its body. */
const KNOT = { x: 3, y: 5 };

/**
 * The line as a stair of single art pixels, from the knot (top right) to the
 * hand (bottom left): steep at the kite and flattening as it comes down, the
 * way a kite line hangs.
 */
function line(run: number, drop: number): string {
  const fall = (x: number) => Math.round(drop * (1 - x / run) ** 0.6);
  let path = '';
  for (let x = 0; x < run; x++) {
    const [from, to] = [fall(x + 1), fall(x)];
    path += `M${x} ${Math.min(from, drop - 1)}h1v${Math.max(to - from, 1)}h-1z`;
  }
  return path;
}

interface KiteProps {
  name?: 'kite' | 'kite-blue';
  /** How far the line runs to the left of the kite, and how far it falls, in art pixels. */
  run: number;
  drop: number;
  className?: string;
}

/**
 * One of the garden's kites on its line, at the page's own pixel size. The
 * kite holds its place; only its tail of bows swings (the sprite's own loop).
 * Decoration: hidden from assistive tech.
 */
export function Kite({ name = 'kite', run, drop, className = '' }: KiteProps) {
  return (
    <span
      className={`cr-kite ${className}`}
      style={{ '--run': run, '--drop': drop, '--knot-x': KNOT.x, '--knot-y': KNOT.y } as CSSProperties}
      aria-hidden="true"
    >
      <svg className="cr-kite-line" viewBox={`0 0 ${run} ${drop}`} shapeRendering="crispEdges" focusable="false">
        <path d={line(run, drop)} fill="currentColor" />
      </svg>
      <Sprite name={name} />
    </span>
  );
}
