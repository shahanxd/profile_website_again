import { Text } from '../components/Text';
import { site } from '../content/site';
import { useSplit } from '../split/store';

/**
 * The garden. For now this is the text and a flat backdrop; the pixel scene
 * mounts behind the copy (see src/hero/engine) once it exists.
 */
export function Hero() {
  const { split } = useSplit();
  const hero = site[split].hero;

  return (
    <section id="top" className="relative flex min-h-svh items-center overflow-hidden bg-bg-2">
      <div className="page relative z-10 pt-16">
        <Text as="h1" copy={hero.line} className="max-w-[16ch] text-5xl lowercase md:text-7xl" />
        <Text as="p" copy={hero.sub} className="mt-6 max-w-[40ch] text-lg text-ink-2" />
      </div>
    </section>
  );
}
