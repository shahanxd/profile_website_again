import { AmbientLayer } from './components/AmbientLayer';
import { Menu } from './components/Menu';
import { PixelSeam } from './components/PixelSeam';
import { SceneBand } from './components/SceneBand';
import { site } from './content/site';
import { hasProof } from './content/visible';
import { Hero } from './hero/Hero';
import { MotionRoot } from './motion/live';
import { About } from './sections/About';
import { Contact, Footer } from './sections/Contact';
import { CreativeProof, TechProof } from './sections/Proof';
import { Section } from './sections/Section';
import { DissolveOverlay } from './split/DissolveOverlay';
import { CreativeWork, TechWork } from './sections/Work';
import { useSplit } from './split/store';

export function App() {
  const { split } = useSplit();
  const content = site[split];
  const label = (slot: string) => content.nav.find((item) => item.slot === slot)?.label ?? slot;
  const showProof = hasProof(split);

  return (
    <>
      <a href="#about" className="skip-link">
        skip to content
      </a>
      <MotionRoot />
      <Menu />
      <Hero />
      <PixelSeam after />
      <main>
        <Section id="about" index={1} label={label('about')} heading={content.about.heading} mark={content.about.mark}>
          <About paragraphs={content.about.paragraphs} toolkit={content.about.toolkit} />
        </Section>
        <Section id="work" index={2} label={label('work')} heading={content.work.heading} mark={content.work.mark}>
          {split === 'tech' ? <TechWork /> : <CreativeWork />}
        </Section>
        <SceneBand line={content.band.line} numbers={content.band.numbers} />
        {showProof && (
          <Section id="proof" index={3} label={label('proof')} heading={content.proof.heading} mark={content.proof.mark}>
            {split === 'tech' ? <TechProof /> : <CreativeProof />}
          </Section>
        )}
        <Section
          id="contact"
          index={showProof ? 4 : 3}
          label={label('contact')}
          heading={content.contact.heading}
          mark={content.contact.mark}
        >
          <Contact line={content.contact.line} links={content.contact.links} />
        </Section>
      </main>
      <Footer name={site.owner.name} city={site.owner.city} />
      <AmbientLayer />
      <DissolveOverlay />
    </>
  );
}
