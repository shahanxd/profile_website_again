import { PixelLink } from '../../components/PixelButton';
import { PixelEdge } from '../../components/PixelEdge';
import { Reveal } from '../../components/Reveal';
import { Text } from '../../components/Text';
import { site } from '../../content/site';
import { copyText } from '../../content/types';
import { devMark, isPlaceholder } from '../../content/visible';
import { Kite } from './Kite';

/**
 * What clients said: notes pinned along the carpet's border, with one of the
 * garden's kites in the sky beside the heading, its line tied to the border's
 * end. Stand-ins say what will sit there and name nobody.
 */
export function CreativeProof() {
  const { testimonials } = site.creative.proof;

  return (
    <div className="cr-proof">
      <Kite run={26} drop={27} className="cr-proof-kite" />
      <div className="kilim" aria-hidden="true" />
      <ul className="cr-notes">
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
