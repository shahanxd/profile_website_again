import type { CSSProperties } from 'react';

/** The letters a glyph may use, and the page colour each one stands for. */
const INK: Record<string, string> = {
  a: 'var(--accent)',
  b: 'var(--brass)',
  i: 'var(--ink)',
  m: 'var(--ink-3)',
  o: 'var(--orange)',
  d: 'var(--shade)',
};

interface GlyphProps {
  /** The picture, a row of letters per row of pixels: "." is empty, the other letters are colours (see INK). */
  rows: readonly string[];
  className?: string;
}

/** One colour of a glyph as a path: a one-pixel-high bar for every run of that letter. */
function runs(rows: readonly string[], letter: string): string {
  let d = '';
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x += 1) {
      if (row[x] !== letter) continue;
      let end = x;
      while (row[end + 1] === letter) end += 1;
      d += `M${x} ${y}h${end - x + 1}v1h${x - end - 1}z`;
      x = end;
    }
  });
  return d;
}

/**
 * A small pixel drawing written out in letters, one art pixel to a page
 * pixel. It is real markup (an svg of hard-edged bars), so it is in the
 * prerendered page and takes the colours of the split being shown.
 * Decoration only: what it marks is always said in words beside it.
 */
export function Glyph({ rows, className = '' }: GlyphProps) {
  const w = rows[0].length;
  const h = rows.length;
  const letters = [...new Set(rows.join(''))].filter((letter) => letter in INK);
  return (
    <svg
      className={`glyph ${className}`}
      viewBox={`0 0 ${w} ${h}`}
      style={{ '--w': w, '--h': h } as CSSProperties}
      shapeRendering="crispEdges"
      aria-hidden="true"
      focusable="false"
    >
      {letters.map((letter) => (
        <path key={letter} data-ink={letter} d={runs(rows, letter)} fill={INK[letter]} />
      ))}
    </svg>
  );
}
