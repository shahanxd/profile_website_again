import type { ReactNode } from 'react';
import { Text } from '../components/Text';
import type { Copy, SlotId } from '../content/types';

interface SectionProps {
  id: SlotId;
  index: number;
  label: string;
  heading: Copy;
  children: ReactNode;
}

export function Section({ id, index, label, heading, children }: SectionProps) {
  return (
    <section id={id} className="section" aria-labelledby={`${id}-heading`}>
      <div className="page">
        <p className="eyebrow">
          {String(index).padStart(2, '0')} / {label}
        </p>
        <Text
          as="h2"
          id={`${id}-heading`}
          copy={heading}
          tabIndex={-1}
          className="mt-3 text-4xl lowercase outline-none md:text-5xl"
        />
        <div className="mt-10">{children}</div>
      </div>
    </section>
  );
}
