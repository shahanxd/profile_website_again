import { PixelLink } from '../../components/PixelButton';
import { Thumb } from '../../components/PixelImage';
import { Text } from '../../components/Text';
import { copyText, type ShowcaseItem } from '../../content/types';

/**
 * sumud, as a made thing. A serious subject, so it is set plainly: a sunk
 * panel with a stitched border, the game's own one-line description, and a
 * link. Nothing in it moves, resolves in or lifts; it is simply there, and
 * the page around it goes quiet while it is read (data-tone="plain"). Until
 * the game's own art is supplied the picture is the evening sky, still, and
 * the line under it says that it is a stand-in.
 */
export function Sumud({ item }: { item: ShowcaseItem }) {
  return (
    <article className="cr-group cr-sumud step-2" data-tone="plain" aria-labelledby="sumud-title">
      <figure className="cr-sumud-still">
        {item.image ? (
          <img src={item.image.src} alt={item.image.alt} width={item.image.width} height={item.image.height} loading="lazy" decoding="async" />
        ) : (
          <>
            <Thumb name={item.thumb} />
            {item.standIn && <Text as="figcaption" copy={item.standIn} />}
          </>
        )}
      </figure>
      <div className="cr-sumud-words">
        <p className="eyebrow">a game</p>
        <Text as="h3" copy={item.title} id="sumud-title" />
        {item.role && <Text as="p" copy={item.role} />}
        {item.href && (
          <PixelLink href={item.href} aria-label={`${copyText(item.title)} on github`}>
            on github
          </PixelLink>
        )}
      </div>
    </article>
  );
}
