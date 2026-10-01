import { PixelEdge } from '../../components/PixelEdge';
import { Reveal } from '../../components/Reveal';
import { Sprite } from '../../components/Sprite';
import { Text } from '../../components/Text';
import { site } from '../../content/site';
import { useOnScreen } from '../../motion/watch';
import { Toolkit } from '../shared/Toolkit';

/**
 * Why the owner does this: the note, with the parrot perched on its corner,
 * the coffee beside it on the corner of the carpet, and the toolkit as one
 * row. The note's first paragraph is its statement, set large; the rest
 * follow in the reading size.
 */
export function CreativeAbout() {
  const { paragraphs, toolkit } = site.creative.about;
  const [statement, ...rest] = paragraphs;
  // The steam rises only while the coffee is on screen.
  const still = useOnScreen<HTMLDivElement>();

  return (
    <div className="cr-about">
      <Reveal className="cr-note">
        <PixelEdge cut={3}>
          <Text as="p" copy={statement} className="cr-statement" />
          {rest.map((paragraph, i) => (
            <Text key={i} as="p" copy={paragraph} className="cr-statement-more" />
          ))}
        </PixelEdge>
        <Sprite name="parrot" className="cr-note-parrot" />
      </Reveal>
      <div ref={still} className="cr-still" aria-hidden="true">
        <div className="cr-tray">
          <Sprite name="tray" />
          <i className="cr-steam" />
        </div>
        <div className="kilim" />
      </div>
      <Toolkit tools={toolkit} />
    </div>
  );
}
