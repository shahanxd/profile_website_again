import type { CSSProperties } from 'react';
import { ArchFrame } from '../../components/ArchFrame';
import { thumbArt } from '../../components/art';
import { PixelLink } from '../../components/PixelButton';
import { PixelEdge } from '../../components/PixelEdge';
import { PixelImage } from '../../components/PixelImage';
import { Reveal } from '../../components/Reveal';
import { Text } from '../../components/Text';
import { site } from '../../content/site';
import type { Achievement } from '../../content/types';
import { devMark, isPlaceholder } from '../../content/visible';
import { useOnScreen } from '../../motion/watch';
import { Glyph } from '../shared/Glyph';
import { Section } from '../Section';
import { DitherGlow } from './DitherGlow';
import { techLabel } from './label';

/** A small lantern for each line: lit for what has happened, dark for what is still to come. */
const LAMP_LIT = ['....b....', '...bbb...', '..bbbbb..', '..b.o.b..', '..boaob..', '..baiab..', '..boaob..', '..bbbbb..', '...bbb...'];
const LAMP_DARK = ['....m....', '...mmm...', '..mmmmm..', '..m...m..', '..m...m..', '..m.d.m..', '..m...m..', '..mmmmm..', '...mmm...'];

/** What a line says above its title: when it happened, that the date still wants confirming, or that it has not happened. Nothing, for a confirmed line whose year is not known. */
function when({ year, confirmed }: Achievement): string | null {
  if (!year) return confirmed ? null : 'not yet';
  return confirmed ? year : `${year}, to confirm`;
}

function Stop({ achievement, index }: { achievement: Achievement; index: number }) {
  // only a confirmed line shines: a stand-in or an unchecked claim never passes for a result
  const lit = achievement.confirmed;
  const date = when(achievement);
  const title = <Text copy={achievement.title} />;
  return (
    <li data-lit={lit ? '' : undefined} style={{ '--i': index } as CSSProperties} {...devMark(isPlaceholder(achievement))}>
      <span className="tech-path-lamp" aria-hidden="true">
        {lit && <DitherGlow rx={8} className="tech-path-glow" />}
        <Glyph rows={lit ? LAMP_LIT : LAMP_DARK} />
      </span>
      <Reveal order={index}>
        <PixelEdge tone={lit ? 'paper' : 'sunk'} shadow={lit} cut={index + 1} bodyClassName="tech-plaque">
          {date && <p className={achievement.year ? 'tech-num' : 'tag'}>{date}</p>}
          <p className="tech-plaque-title">
            {achievement.href ? (
              <PixelLink inline href={achievement.href} rel="noreferrer">
                {title}
              </PixelLink>
            ) : (
              title
            )}
          </p>
          {achievement.detail && <Text as="p" copy={achievement.detail} className="tech-plaque-detail" />}
        </PixelEdge>
      </Reveal>
    </li>
  );
}

/**
 * Achievements, on the tech side: lamps along a path, in the owner's order.
 * A confirmed line has its lamp lit, and says when it happened where that is
 * known. One still to come (unconfirmed, no year) keeps a dark lamp and says
 * "not yet"; one the owner has yet to confirm keeps a dark lamp too and says
 * so, so neither can pass for a result. Beside the path, and keeping pace
 * with it, where it leads: the garden wall and the city beyond, seen through
 * one of the pavilion's arches.
 */
export function TechProof() {
  const { proof } = site.tech;
  // the lit lamps gutter only while the path is on screen
  const ref = useOnScreen<HTMLOListElement>();

  return (
    <Section id="proof" index={3} label={techLabel('proof')} heading={proof.heading} mark={proof.mark}>
      <div className="tech-proof">
        <ol ref={ref} className="tech-path">
          {proof.achievements.map((achievement, i) => (
            <Stop key={i} achievement={achievement} index={i} />
          ))}
        </ol>
        <ArchFrame scale={2} shadow className="tech-proof-view">
          <PixelImage {...thumbArt('cypress', 'tech')} alt="" className="h-full" />
        </ArchFrame>
      </div>
    </Section>
  );
}
