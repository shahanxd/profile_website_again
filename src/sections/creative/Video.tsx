import { useEffect, useRef, useState } from 'react';
import { ArchFrame } from '../../components/ArchFrame';
import { PixelEdge } from '../../components/PixelEdge';
import { Thumb } from '../../components/PixelImage';
import { Reveal } from '../../components/Reveal';
import { Text } from '../../components/Text';
import { copyText, type ShowcaseItem } from '../../content/types';
import { devMark, isPlaceholder } from '../../content/visible';

/** What a frame says when its play mark is pressed and there is no video behind it yet. */
const NOT_YET = 'not cut yet. the video will play here.';

/** A running time as a player shows it: 62 seconds is "1:02". */
function runtime(seconds: number): string {
  const whole = Math.round(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

interface PieceProps {
  item: ShowcaseItem;
  /** The featured piece: a cusped arch, a larger play mark and title. */
  big?: boolean;
  /** Slides the eaten edge along, so neighbouring frames differ. */
  cut?: number;
  /** This is the piece now playing. */
  playing: boolean;
  onPlay: () => void;
  /** The video has run to its end: back to its poster. */
  onStop: () => void;
}

/**
 * One video: its poster in a frame with a play mark over it, and its words.
 * Nothing of the video is fetched until the mark is pressed; then the poster
 * gives way to the browser's own player, in the same sixteen-by-nine space,
 * and it starts. A playing video sits in a plain frame, so no cusp or eaten
 * edge covers the player's controls. When it has run out, the poster comes
 * back. A stand-in (no video yet) says that its video is still to come.
 */
function Piece({ item, big, cut = 0, playing, onPlay, onStop }: PieceProps) {
  const [asked, setAsked] = useState(false);
  const mark = useRef<HTMLButtonElement>(null);
  // the player had the keyboard's focus when it ended: the play mark that replaces it takes it over
  const refocus = useRef(false);
  const title = copyText(item.title);
  const { video } = item;

  useEffect(() => {
    if (playing || !refocus.current) return;
    refocus.current = false;
    mark.current?.focus();
  }, [playing]);

  const poster = (
    <div className="cr-screen" data-big={big ? '' : undefined}>
      {video ? (
        <img src={video.poster.src} alt={video.poster.alt} width={video.poster.width} height={video.poster.height} loading="lazy" decoding="async" />
      ) : (
        item.thumb && <Thumb name={item.thumb} />
      )}
      {/* the whole picture is the button; its mark keeps to the lower left corner, clear of what the poster shows */}
      <button ref={mark} type="button" className="cr-hit" data-corner="start" onClick={() => (video ? onPlay() : setAsked(true))}>
        <span className="cr-mark cr-play" aria-hidden="true">
          <span>
            <i />
          </span>
        </span>
        <span className="sr-only">play: {title}</span>
      </button>
      {!video && (
        <p className="cr-slate" role="status">
          {asked && NOT_YET}
        </p>
      )}
    </div>
  );

  return (
    <article {...devMark(isPlaceholder(item))}>
      {playing && video ? (
        <div className="cr-player">
          <div className="cr-screen" data-big={big ? '' : undefined}>
            <video
              // the play mark that had focus is gone: hand focus to the player, and start it
              ref={(player) => {
                if (!player || player.dataset.started) return;
                player.dataset.started = '';
                player.focus({ preventScroll: true });
                player.play().catch(() => {});
              }}
              src={video.src}
              poster={video.poster.src}
              width={video.width}
              height={video.height}
              controls
              playsInline
              preload="none"
              aria-label={title}
              onEnded={(event) => {
                refocus.current = event.currentTarget === document.activeElement;
                onStop();
              }}
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
        <div className="cr-caption-head">
          <Text as="h4" copy={item.title} />
          {video && (
            <p className="cr-meta">
              <span className="sr-only">runs </span>
              {runtime(video.seconds)}
            </p>
          )}
        </div>
        {item.role && <Text as="p" copy={item.role} />}
      </div>
    </article>
  );
}

/**
 * The video group: the first piece large, in a cusped arch like the
 * pavilion's, and the rest as a small column beside it. Only one plays at a
 * time: pressing another's play mark puts the first back to its poster.
 */
export function Videos({ items }: { items: ShowcaseItem[] }) {
  const [playing, setPlaying] = useState<string | null>(null);
  const [featured, ...rest] = items;
  if (!featured) return null;

  const piece = (item: ShowcaseItem, extra: { big?: boolean; cut?: number }) => (
    <Piece
      item={item}
      {...extra}
      playing={playing === item.id}
      onPlay={() => setPlaying(item.id)}
      onStop={() => setPlaying((now) => (now === item.id ? null : now))}
    />
  );

  return (
    <div className="cr-videos">
      <Reveal className="cr-videos-first">{piece(featured, { big: true })}</Reveal>
      {rest.length > 0 && (
        <div className="cr-videos-rest">
          {rest.map((item, i) => (
            <Reveal key={item.id} order={i + 1}>
              {piece(item, { cut: i + 1 })}
            </Reveal>
          ))}
        </div>
      )}
    </div>
  );
}
