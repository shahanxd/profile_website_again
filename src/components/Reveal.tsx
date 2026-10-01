import type { ElementType, ReactNode, Ref } from 'react';
import { useResolve } from '../motion/resolve';

interface RevealProps {
  as?: ElementType;
  /** Milliseconds to wait after it scrolls into view, to stagger a row of blocks. Keep it small: content must not wait. */
  delay?: number;
  className?: string;
  children: ReactNode;
}

/**
 * A block that resolves out of dither, in steps, the first time it scrolls
 * into view (the same resolve as the headings). What is already on screen
 * when the page arrives is never hidden.
 */
export function Reveal({ as: Tag = 'div', delay = 0, className, children }: RevealProps) {
  const ref = useResolve<HTMLElement>(delay);
  return (
    <Tag ref={ref as Ref<HTMLElement>} className={className}>
      {children}
    </Tag>
  );
}
