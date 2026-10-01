import { outbound } from '../../components/outbound';
import { PixelEdge } from '../../components/PixelEdge';
import { Reveal } from '../../components/Reveal';
import { Text } from '../../components/Text';
import type { Copy, LinkItem } from '../../content/types';
import { Glyph } from './Glyph';

/** An arrow up and out, for a link that leaves the garden. */
const ARROW = ['..aaaaa', '.....aa', '....a.a', '...a..a', '..a...a', '.a.....', 'a......'];

/** Where a link goes, as it would be said aloud: no scheme, and for a file of the site's own, its name. */
const whereTo = (href: string): string => href.replace(/^(https?:\/\/(www\.)?|mailto:|\/)/, '').replace(/\/$/, '');

interface ContactProps {
  line: Copy;
  links: LinkItem[];
  /** What is still to be linked (an email address, a resume), said as a stand-in. */
  note?: Copy;
}

/**
 * The contact section's body, for both splits: one line, then each way to
 * reach the owner as a large card that is a single link (the email card
 * shows the address itself). What is not linked yet gets a quieter card of
 * its own that says so. The list is told how many cards it holds, so a row
 * never ends with one card left over.
 */
export function Contact({ line, links, note }: ContactProps) {
  return (
    <>
      <Text as="p" copy={line} className="contact-line" />
      <ul className="contact-links" data-count={links.length + (note ? 1 : 0)}>
        {links.map((link, i) => (
          <Reveal as="li" key={link.href} order={i}>
            <PixelEdge lift cut={i + 4} bodyClassName="contact-card">
              <a href={link.href} className="contact-link" {...outbound(link.href, 'me')}>
                <span className="contact-label">{link.label}</span>
                <Glyph rows={ARROW} />
                <span className="contact-where">{whereTo(link.href)}</span>
              </a>
            </PixelEdge>
          </Reveal>
        ))}
        {note && (
          <Reveal as="li" order={links.length}>
            <PixelEdge tone="sunk" shadow={false} cut={links.length + 4} bodyClassName="contact-soon">
              <Text as="p" copy={note} />
            </PixelEdge>
          </Reveal>
        )}
      </ul>
    </>
  );
}
