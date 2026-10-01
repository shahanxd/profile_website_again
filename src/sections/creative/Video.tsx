import { useState } from 'react';
import { ArchFrame } from '../../components/ArchFrame';
import { PixelEdge } from '../../components/PixelEdge';
import { Thumb } from '../../components/PixelImage';
import { Reveal } from '../../components/Reveal';
import { Text } from '../../components/Text';
import { copyText, type ShowcaseItem } from '../../content/types';
import { devMark, isPlaceholder } from '../../content/visible';

/** What a frame says when its play mark is pressed and there is no video behind it yet. */
const NOT_YET = 'not cut yet. the video will play here.';

interface PieceProps {
  item: ShowcaseItem;
  /** The featured piece: a cusped arch, a larger play mark and title. */
  big?: boolean;
  /** Slides the eaten edge along, so neighbouring frames differ. */
  cut?: number;
}

/**
 * One video: its picture in a frame with a play mark over it, and its words.
 * The player is not loaded until the mark is pressed, and only when there is
 * a video to play; a stand-in says that its video is still to come. A playing
 * video sits in a plain frame, so no cusp or eaten edge covers the player's
 * own controls.
 */
function Piece({ item, big, cut = 0 }: PieceProps) {
  const [state, setState] = useState<'poster' | 'playing' | 'asked'>('poster');
  const title = copyText(item.title);

  const poster = (
    <div className="cr-screen" data-big={big ? '' : undefined}>
      {item.image ? (
        <img src={item.image.src} alt={item.image.alt} width={item.image.width} height={item.image.height} loading="lazy" decoding="async" />
      ) : (
        <Thumb name={item.thumb} />
      )}
      <button type="button" className="cr-hit" onClick={() => setState(item.youtubeId ? 'playing' : 'asked')}>
        <span className="cr-mark cr-play" aria-hidden="true">
          <span>
            <i />
          </span>
        </span>
        <span className="sr-only">play: {title}</span>
      </button>
      <p className="cr-slate" role="status">
        {state === 'asked' && NOT_YET}
      </p>
    </div>
  );

  return (
    <article {...devMark(isPlaceholder(item))}>
      {state === 'playing' ? (
        <div className="cr-player">
          <div className="cr-screen">
            <iframe
              // the play mark that had focus is gone: hand focus to the player
              ref={(frame) => frame?.focus()}
              src={`https://www.youtube-nocookie.com/embed/${item.youtubeId}?autoplay=1&rel=0`}
              title={title}
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
            />
          </div>
        </div>
      ) : big ? (
        <ArchFrame scale={2} shadow>
          {poster}
        </ArchFrame>
      ) : (
        <PixelEdge variant="frame" cut={cut} lift>
          {poster}
        </PixelEdge>
      )}
      <div className="cr-caption" data-big={big ? '' : undefined}>
        <Text as="h4" copy={item.title} />
        {item.role && <Text as="p" copy={item.role} />}
      </div>
    </article>
  );
}

/**
 * The video group: the first piece large, in a cusped arch like the
 * pavilion's, and the rest as a small column beside it.
 */
export function Videos({ items }: { items: ShowcaseItem[] }) {
  const [featured, ...rest] = items;
  if (!featured) return null;

  return (
    <div className="cr-videos">
      <Reveal className="cr-videos-first">
        <Piece item={featured} big />
      </Reveal>
      {rest.length > 0 && (
        <div className="cr-videos-rest">
          {rest.map((item, i) => (
            <Reveal key={item.id} order={i + 1}>
              <Piece item={item} cut={i + 1} />
            </Reveal>
          ))}
        </div>
      )}
    </div>
  );
}
