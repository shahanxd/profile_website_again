import { Text } from '../components/Text';
import type { Copy, Result } from '../content/types';
import { confirmedOnly } from '../content/visible';

/** The full-width scene band. The pixel scene mounts behind this later; for now it is a flat panel. */
export function Band({ line, numbers }: { line: Copy; numbers: Result[] }) {
  const shown = confirmedOnly(numbers);
  return (
    <section aria-label="in numbers" className="bg-bg-2">
      <div className="page flex min-h-[40vh] flex-col justify-center gap-10 py-20">
        <Text as="p" copy={line} className="font-display text-3xl lowercase md:text-4xl" />
        {shown.length > 0 && (
          <dl className="flex flex-wrap gap-x-16 gap-y-6">
            {shown.map((number) => (
              <div key={number.label}>
                <dt className="font-display text-5xl">{number.value}</dt>
                <dd className="mt-1 text-sm text-ink-2">
                  {number.label}
                  {number.asOf && ` (${number.asOf})`}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </section>
  );
}
