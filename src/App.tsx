import { AmbientLayer } from './components/AmbientLayer';
import { Menu } from './components/Menu';
import { PixelSeam } from './components/PixelSeam';
import { SceneBand } from './components/SceneBand';
import { site } from './content/site';
import { Hero } from './hero/Hero';
import { MotionRoot } from './motion/live';
import { CreativeAbout } from './sections/creative/About';
import { CreativeProof } from './sections/creative/Proof';
import { CreativeWork } from './sections/creative/Work';
import { Section } from './sections/Section';
import { Contact } from './sections/shared/Contact';
import { Footer } from './sections/shared/Footer';
import { TechAbout } from './sections/tech/TechAbout';
import { TechProof } from './sections/tech/TechProof';
import { TechWork } from './sections/tech/TechWork';
import { DissolveOverlay } from './split/DissolveOverlay';
import { useSplit } from './split/store';

export function App() {
  const { split } = useSplit();
  const content = site[split];
  const label = (slot: string) => content.nav.find((item) => item.slot === slot)?.label ?? slot;

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
        {/* The tech sections bring their own shells (heading, ornament and all); the creative ones are bodies for the shells here. */}
        {split === 'tech' ? (
          <TechAbout />
        ) : (
          <Section id="about" index={1} label={label('about')} heading={content.about.heading} mark={content.about.mark}>
            <CreativeAbout />
          </Section>
        )}
        {split === 'tech' ? (
          <TechWork />
        ) : (
          <Section id="work" index={2} label={label('work')} heading={content.work.heading} mark={content.work.mark}>
            <CreativeWork />
          </Section>
        )}
        <SceneBand line={content.band.line} numbers={content.band.numbers} />
        {split === 'tech' ? (
          <TechProof />
        ) : (
          <Section id="proof" index={3} label={label('proof')} heading={content.proof.heading} mark={content.proof.mark}>
            <CreativeProof />
          </Section>
        )}
        <Section id="contact" index={4} label={label('contact')} heading={content.contact.heading} mark={content.contact.mark}>
          <Contact line={content.contact.line} links={content.contact.links} note={content.contact.note} />
        </Section>
      </main>
      <Footer name={site.owner.name} city={site.owner.city} />
      <AmbientLayer />
      <DissolveOverlay />
    </>
  );
}
