import { useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { PixelButton } from '../../components/PixelButton';
import { PixelEdge } from '../../components/PixelEdge';
import type { Picture } from '../../content/types';

/** One thing the lightbox shows: a picture, and the words under it. */
export interface Slide {
  picture: Picture;
  title: string;
  line?: string;
}

/** What is open: the slides to page through, and the one to begin on. */
export interface Opened {
  slides: Slide[];
  at: number;
}

interface LightboxProps {
  /** Null while nothing is open. */
  open: Opened | null;
  onClose: () => void;
}

/**
 * A piece opened larger: a card in the middle of the dimmed page, in a native
 * dialog (so Escape closes it and focus comes back to what opened it). With
 * more than one slide it pages: the arrow buttons, the arrow keys, Home and
 * End, and a count ("3 / 8"). Paging goes round. Only the slide being shown
 * is in the page, so nothing is fetched before it is asked for; the next one
 * is fetched quietly once the current one has arrived.
 */
export function Lightbox({ open, onClose }: LightboxProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [index, setIndex] = useState(0);
  const count = open?.slides.length ?? 0;

  useEffect(() => {
    if (!open) return;
    setIndex(open.at);
    if (!dialog.current?.open) dialog.current?.showModal();
  }, [open]);

  const at = Math.min(index, Math.max(count - 1, 0));
  const slide = open?.slides[at];
  const go = (to: number) => setIndex(((to % count) + count) % count);

  const onKey = (event: KeyboardEvent) => {
    if (count < 2) return;
    const to = { ArrowRight: at + 1, ArrowLeft: at - 1, Home: 0, End: count - 1 }[event.key];
    if (to === undefined) return;
    event.preventDefault();
    go(to);
  };

  /** Once a slide has arrived, the one after it is fetched, so the next press does not wait. */
  const warmNext = () => {
    const next = open?.slides[(at + 1) % count];
    if (count > 1 && next) new Image().src = next.picture.src;
  };

  return (
    <dialog
      ref={dialog}
      className="cr-lightbox"
      aria-labelledby={titleId}
      style={slide ? ({ '--ratio': (slide.picture.width / slide.picture.height).toFixed(4) } as CSSProperties) : undefined}
      onClose={onClose}
      onKeyDown={onKey}
      // a press on the dimmed page around the piece closes it
      onClick={(event) => event.target === event.currentTarget && dialog.current?.close()}
    >
      {slide && (
        <PixelEdge>
          <div className="cr-lightbox-art">
            <img
              // a new element for each slide, so the last picture never lingers while the next one loads
              key={slide.picture.src}
              src={slide.picture.src}
              alt={slide.picture.alt}
              width={slide.picture.width}
              height={slide.picture.height}
              decoding="async"
              onLoad={warmNext}
            />
          </div>
          <div className="cr-lightbox-foot">
            <div className="cr-caption" data-big="">
              <h4 id={titleId}>{slide.title}</h4>
              {slide.line && <p>{slide.line}</p>}
            </div>
            <div className="cr-lightbox-keys">
              {count > 1 && (
                <div className="cr-pager">
                  <PixelButton aria-label="previous" onClick={() => go(at - 1)}>
                    <i className="cr-tri" data-back="" aria-hidden="true" />
                  </PixelButton>
                  <p className="cr-count" aria-live="polite">
                    <span className="sr-only">showing </span>
                    {at + 1} / {count}
                  </p>
                  <PixelButton aria-label="next" onClick={() => go(at + 1)}>
                    <i className="cr-tri" aria-hidden="true" />
                  </PixelButton>
                </div>
              )}
              <PixelButton tone="ink" onClick={() => dialog.current?.close()}>
                close
              </PixelButton>
            </div>
          </div>
        </PixelEdge>
      )}
    </dialog>
  );
}
