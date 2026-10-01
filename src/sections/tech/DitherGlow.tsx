import { useId, type CSSProperties } from 'react';

/**
 * Three nested shapes, each lighting a different few pixels of every 4 x 4
 * Bayer tile, so the light is 2 of 16 pixels at its rim, 4 further in and 7
 * at its heart, and no pixel is lit twice. The pixels a ring adds are
 * brighter than the last ring's, so the light also warms towards the middle.
 */
const RINGS = [
  { reach: 1, strength: 0.4, pixels: [[0, 0], [2, 2]] },
  { reach: 0.68, strength: 0.65, pixels: [[2, 0], [0, 2]] },
  { reach: 0.4, strength: 1, pixels: [[1, 1], [3, 3], [3, 1]] },
];

/** A disc or flat ellipse as stepped rows of whole pixels, `reach` of the full size, about the middle pixel. */
function rows(rx: number, ry: number, reach: number): string {
  let d = '';
  for (let y = -ry; y <= ry; y += 1) {
    const inside = 1 - (y / (ry * reach + 0.5)) ** 2;
    if (inside <= 0) continue;
    const half = Math.floor(rx * reach * Math.sqrt(inside));
    d += `M${rx - half} ${y + ry}h${half * 2 + 1}v1h${-half * 2 - 1}z`;
  }
  return d;
}

interface DitherGlowProps {
  /** Half the width and half the height, in page pixels; the whole is one pixel more than twice that. */
  rx: number;
  ry?: number;
  className?: string;
}

/**
 * Lamplight, as pixel art draws it: a pool of ordered dither that thickens
 * towards the middle. It is an svg of hard-edged rows on the page pixel, in
 * the current colour, so it is in the prerendered page and costs nothing to
 * scroll. Decoration only.
 */
export function DitherGlow({ rx, ry = rx, className = '' }: DitherGlowProps) {
  const id = useId();
  const [w, h] = [rx * 2 + 1, ry * 2 + 1];
  return (
    <svg
      className={`glyph ${className}`}
      viewBox={`0 0 ${w} ${h}`}
      style={{ '--w': w, '--h': h } as CSSProperties}
      shapeRendering="crispEdges"
      aria-hidden="true"
      focusable="false"
    >
      {RINGS.map((ring, i) => (
        <pattern key={i} id={`${id}${i}`} width="4" height="4" patternUnits="userSpaceOnUse">
          {ring.pixels.map(([x, y]) => (
            <rect key={`${x}${y}`} x={x} y={y} width="1" height="1" fill="currentColor" />
          ))}
        </pattern>
      ))}
      {RINGS.map((ring, i) => (
        <path key={i} d={rows(rx, ry, ring.reach)} fill={`url(#${id}${i})`} opacity={ring.strength} />
      ))}
    </svg>
  );
}
