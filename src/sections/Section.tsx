import type { ReactNode } from 'react';
import { ResolveHeading } from '../components/ResolveHeading';
import type { Copy, SlotId } from '../content/types';

interface SectionProps {
  id: SlotId;
  index: number;
  label: string;
  heading: Copy;
  /** The phrase of the heading that gets the pen underline. */
  mark?: string;
  /** One of the garden's cast to keep the heading company (a Sprite). Decoration: it is hidden from assistive tech. */
  ornament?: ReactNode;
  children: ReactNode;
}

/**
 * The shell every section stands in: a numbered label with the star marker,
 * a heading that resolves out of dither, then the section's own content.
 */
export function Section({ id, index, label, heading, mark, ornament, children }: SectionProps) {
  return (
    <section id={id} className="section" aria-labelledby={`${id}-heading`}>
      <div className="page">
        <header className="section-head">
          <p className="eyebrow section-label">
            <span className="spark" aria-hidden="true" />
            {String(index).padStart(2, '0')} / {label}
          </p>
          <ResolveHeading id={`${id}-heading`} copy={heading} mark={mark} tabIndex={-1} className="section-heading" />
          {ornament && (
            <div className="section-ornament" aria-hidden="true">
              {ornament}
            </div>
          )}
        </header>
        {children}
      </div>
    </section>
  );
}
