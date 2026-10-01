import { StrictMode, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { draft, type ThumbName } from '../../content/types';
import { MotionRoot } from '../../motion/live';
import { Section } from '../../sections/Section';
import { initSplit, startSplitClient, useSplit } from '../../split/store';
import type { SplitId } from '../../split/types';
import '../../styles/index.css';
import { AmbientLayer } from '../AmbientLayer';
import { ArchFrame } from '../ArchFrame';
import type { SpriteName } from '../art';
import { Glass } from '../Glass';
import { KilimDivider } from '../KilimDivider';
import { PixelButton, PixelLink } from '../PixelButton';
import { PixelEdge } from '../PixelEdge';
import { Thumb } from '../PixelImage';
import { PixelSeam } from '../PixelSeam';
import { ResolveHeading } from '../ResolveHeading';
import { Reveal } from '../Reveal';
import { SceneBand } from '../SceneBand';
import { Sprite } from '../Sprite';

/**
 * The kit: every primitive on one page, for building and reviewing sections.
 * Development only (see index.html beside this file). ?split=tech shows the
 * night mood; ?still=1 holds everything still.
 */

const split: SplitId = new URLSearchParams(location.search).get('split') === 'tech' ? 'tech' : 'creative';
document.documentElement.setAttribute('data-split', split);
initSplit(split);

const CAST: Record<SplitId, SpriteName[]> = {
  creative: ['lantern', 'parrot', 'cat', 'tray', 'table', 'figure', 'kite', 'kite-blue', 'cypress'],
  tech: ['lantern', 'cat', 'rover', 'tray', 'table', 'figure', 'cypress'],
};

const THUMBS: ThumbName[] = ['pavilion', 'pool', 'horizon', 'canopy', 'beds', 'lantern', 'carpet', 'sky', 'cypress', 'cat'];

const SWATCHES = ['bg', 'bg-2', 'card', 'shade', 'ink', 'ink-2', 'ink-3', 'accent', 'accent-2', 'leaf', 'brass', 'blossom', 'orange'];

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mt-20">
      <p className="eyebrow mb-6">{title}</p>
      {children}
    </div>
  );
}

function Kit() {
  const { split: shown } = useSplit();
  const other = shown === 'tech' ? 'creative' : 'tech';

  return (
    <>
      <MotionRoot />
      <div className="relative h-[46vh] overflow-hidden bg-bg-2">
        <Thumb name="pavilion" className="h-full" />
        <PixelSeam />
      </div>
      <main>
        <Section
          id="about"
          index={1}
          label="the kit"
          heading={draft('everything the sections are made of')}
          mark="made of"
          ornament={<Sprite name="lantern" />}
        >
          <p className="max-w-[60ch] text-lg text-ink-2">
            this is the {shown} mood. <PixelLink href={`?split=${other}`}>see it in {other}</PixelLink>. body copy can carry a link{' '}
            <PixelLink inline href="#work">
              inside a sentence
            </PixelLink>{' '}
            too.
          </p>

          <Block title="tokens">
            <ul className="flex flex-wrap gap-3 font-mono text-xs">
              {SWATCHES.map((name) => (
                <li key={name}>
                  <span className="block h-12 w-24 border border-line" style={{ background: `var(--${name})` }} />
                  {name}
                </li>
              ))}
            </ul>
          </Block>

          <Block title="PixelButton, PixelLink">
            <div className="flex flex-wrap items-center gap-6">
              <PixelButton href="#work">see the work</PixelButton>
              <PixelButton tone="ink">an ink button</PixelButton>
              <PixelButton tone="paper">a paper one</PixelButton>
              <PixelLink href="#work">source</PixelLink>
              <PixelLink href="#work">visit</PixelLink>
            </div>
          </Block>

          <Block title="PixelEdge: cards">
            <div className="grid gap-8 md:grid-cols-3">
              {['paper', 'sunk', 'accent'].map((tone, i) => (
                <PixelEdge key={tone} as="article" tone={tone as 'paper'} cut={i} lift>
                  <h3 className="text-2xl lowercase">a {tone} card</h3>
                  <p className="mt-3 text-sm opacity-80">
                    ragged edges, a hard shadow, and it lifts one page pixel on hover or when the link inside has focus.
                  </p>
                  <p className="mt-5">
                    <a href="#work" className="underline">
                      a link
                    </a>
                  </p>
                </PixelEdge>
              ))}
            </div>
          </Block>

          <Block title="PixelEdge: frames, with placeholder thumbnails">
            <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-3">
              {THUMBS.slice(0, 6).map((name, i) => (
                <PixelEdge key={name} variant="frame" cut={i + 3}>
                  <Thumb name={name} />
                </PixelEdge>
              ))}
            </div>
          </Block>

          <Block title="ArchFrame">
            <div className="grid items-end gap-10 md:grid-cols-[2fr_1fr_auto]">
              <ArchFrame shadow>
                <Thumb name="pool" className="aspect-[16/9]" />
              </ArchFrame>
              <ArchFrame>
                <Thumb name="carpet" className="aspect-[4/5]" />
              </ArchFrame>
              <ArchFrame pointed shadow>
                <Thumb name="sky" className="aspect-[2/3]" />
              </ArchFrame>
            </div>
          </Block>

          <Block title="Sprite: the cast">
            <ul className="flex flex-wrap items-end gap-10 font-mono text-xs">
              {CAST[shown].map((name) => (
                <li key={name} className="flex flex-col items-center gap-3">
                  <Sprite name={name} scale={name.startsWith('kite') ? 2 : 1} />
                  {name}
                </li>
              ))}
              {shown === 'tech' && (
                <li className="flex flex-col items-center gap-3">
                  <Sprite name="rover" sequence="drive" />
                  rover, driving
                </li>
              )}
            </ul>
          </Block>
        </Section>

        <KilimDivider />

        <Section id="work" index={2} label="more of it" heading={draft('glass, reveals and the band')} mark="the band">
          <Block title="Glass (over a picture)">
            <div className="relative">
              <Thumb name="horizon" className="aspect-[3/1]" />
              <Glass className="absolute bottom-6 left-6 max-w-sm p-5">
                <p className="font-display text-2xl lowercase">glass that suits pixels</p>
                <p className="mt-2 text-sm text-ink-2">blur, a faint bayer tile, stepped corners, one pixel of light.</p>
              </Glass>
            </div>
          </Block>

          <Block title="Reveal (staggered), ResolveHeading as h3">
            <ResolveHeading as="h3" copy="a smaller heading that also resolves" mark="resolves" className="text-3xl lowercase" />
            <div className="mt-8 grid gap-8 md:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <Reveal key={i} delay={i * 90}>
                  <PixelEdge cut={i + 7}>
                    <p>block {i + 1} resolves out of dither when it scrolls into view.</p>
                  </PixelEdge>
                </Reveal>
              ))}
            </div>
          </Block>

          <Block title="plain tone: the ambient layer goes quiet around this">
            <PixelEdge plain shadow={false} tone="sunk">
              <p>serious content is marked plain. no petals or fireflies cross it.</p>
            </PixelEdge>
          </Block>
        </Section>

        <SceneBand
          line={draft('the band, with its numbers on glass.')}
          numbers={[
            { value: '00', label: 'a number', confirmed: false, asOf: 'never' },
            { value: '0+', label: 'another', confirmed: true },
          ]}
        />

        <Section id="contact" index={3} label="the end" heading={draft('that is the lot')} mark="the lot">
          <KilimDivider bleed />
        </Section>
      </main>
      <AmbientLayer />
    </>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Kit />
  </StrictMode>,
);
startSplitClient();
