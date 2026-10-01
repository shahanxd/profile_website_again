import type { ElementType, ReactNode, Ref } from 'react';
import { useResolve } from '../motion/resolve';

interface RevealProps {
  as?: ElementType;
  /** Its place in a row of blocks that arrive together: each starts a moment after the last, and the wait stops growing after the fourth. */
  order?: number;
  className?: string;
  children: ReactNode;
}

/** The wait between one block of a row and the next, and the longest any block waits (milliseconds). */
const STAGGER = 40;
const LONGEST = 120;

/**
 * A block whose shell resolves out of dither, in steps, the first time it
 * scrolls into view (the same resolve as the headings): a card's ground and
 * shadow, a framed picture, an arch. The words inside are whole from the
 * start, so nothing waits to be read. What is already on screen when the
 * page arrives is never hidden.
 */
export function Reveal({ as: Tag = 'div', order = 0, className, children }: RevealProps) {
  const ref = useResolve<HTMLElement>(Math.min(order * STAGGER, LONGEST));
  return (
    <Tag ref={ref as Ref<HTMLElement>} className={className}>
      {children}
    </Tag>
  );
}
