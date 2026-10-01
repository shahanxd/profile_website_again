import { PixelLink } from '../../components/PixelButton';
import { PixelEdge } from '../../components/PixelEdge';
import { Reveal } from '../../components/Reveal';
import { Text } from '../../components/Text';
import { site } from '../../content/site';
import { copyText } from '../../content/types';
import { devMark, isPlaceholder } from '../../content/visible';
import { Kite } from './Kite';

/**
 * What was said about the work: notes pinned along the carpet's border, with
 * one of the garden's kites in the sky beside the heading, its line tied to
 * the border's end. The words are the client's own, exactly as written, so
 * they keep their capitals; who wrote them is said once above the notes and
 * again, briefly, under each. The notes are told how many they are, so they
 * fall into even rows whatever their lengths.
 */
export function CreativeProof() {
  const { note, testimonials } = site.creative.proof;

  return (
    <div className="cr-proof">
      {note && <Text as="p" copy={note} className="cr-proof-note" />}
      <Kite run={26} drop={27} className="cr-proof-kite" />
      <div className="kilim" aria-hidden="true" />
      <ul className="cr-notes" data-count={testimonials.length}>
        {testimonials.map((testimonial, i) => (
          <Reveal key={i} as="li" order={i}>
            <span className="cr-pin" aria-hidden="true" />
            <PixelEdge as="blockquote" cut={i + 6}>
              <Text as="p" copy={testimonial.quote} />
              <p className="cr-byline" {...devMark(isPlaceholder(testimonial))}>
                {testimonial.href ? (
                  <PixelLink inline href={testimonial.href}>
                    {copyText(testimonial.name)}
                  </PixelLink>
                ) : (
                  <Text copy={testimonial.name} />
                )}
              </p>
            </PixelEdge>
          </Reveal>
        ))}
      </ul>
    </div>
  );
}
