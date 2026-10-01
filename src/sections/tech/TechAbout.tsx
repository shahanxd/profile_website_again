import { useEffect, useRef, useState } from 'react';
import { PixelButton } from '../../components/PixelButton';
import { Sprite } from '../../components/Sprite';
import { Text } from '../../components/Text';
import { site } from '../../content/site';
import { useLive } from '../../motion/live';
import { useOnScreen, watch } from '../../motion/watch';
import { Section } from '../Section';
import { Toolkit } from '../shared/Toolkit';
import { DitherGlow } from './DitherGlow';
import { techLabel } from './label';

/**
 * The garden's lantern, hung on its chain from the top of the section, with
 * the light it throws. Decoration: the sprite flickers by itself, and the
 * light gutters only while the lantern itself is on screen.
 */
function Lamp() {
  const ref = useOnScreen<HTMLSpanElement>();
  return (
    <div className="tech-lamp" aria-hidden="true">
      <span className="tech-lamp-chain" />
      <span ref={ref} className="tech-lamp-head">
        <DitherGlow rx={26} />
        <Sprite name="lantern" />
      </span>
    </div>
  );
}

/**
 * The ground under the lantern. The first time it scrolls into view the rover
 * trundles in along it and stops where the lamplight begins; after that it
 * waits there, blinking. Already parked when the page arrives with the ground
 * on screen, with motion off, or with ?still=1.
 */
function Ground() {
  const ref = useOnScreen<HTMLDivElement>();
  const live = useLive();
  const driven = useRef(false);
  const [state, setState] = useState<'parked' | 'waiting' | 'driving'>('parked');

  useEffect(() => {
    const ground = ref.current;
    if (!ground || !live || driven.current) return;
    const box = ground.getBoundingClientRect();
    if (box.top < innerHeight && box.bottom > 0) return;
    setState('waiting');
    const unwatch = watch(
      ground,
      (visible) => {
        if (!visible) return;
        unwatch();
        driven.current = true;
        setState('driving');
      },
      '0px 0px -12% 0px',
    );
    return () => {
      unwatch();
      setState('parked');
    };
  }, [live, ref]);

  return (
    <div ref={ref} className="tech-ground" aria-hidden="true">
      <DitherGlow rx={24} ry={4} className="tech-pool" />
      <span className="tech-rover" data-state={state} onAnimationEnd={() => setState('parked')}>
        <Sprite name="rover" sequence={state === 'driving' ? 'drive' : 'idle'} />
      </span>
    </div>
  );
}

/**
 * About, on the tech side: who the owner is in a few short paragraphs, the
 * resume as a button under them, and the toolkit as one row, with the lit
 * lantern for company and the rover on the ground below.
 */
export function TechAbout() {
  const { about } = site.tech;
  return (
    <div className="tech-about">
      <Section id="about" index={1} label={techLabel('about')} heading={about.heading} mark={about.mark}>
        <div className="tech-about-body">
          <div className="tech-about-copy">
            {about.paragraphs.map((paragraph, i) => (
              <Text key={i} as="p" copy={paragraph} />
            ))}
            {about.resume && (
              <div className="tech-about-resume">
                <PixelButton href={about.resume.href}>{about.resume.label}</PixelButton>
                <span>pdf</span>
              </div>
            )}
          </div>
          <Toolkit tools={about.toolkit} />
          <Ground />
        </div>
      </Section>
      <Lamp />
    </div>
  );
}
