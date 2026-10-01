import { useEffect, useRef, useState, type ReactNode } from 'react';
import { PixelButton } from '../../components/PixelButton';
import { PixelEdge } from '../../components/PixelEdge';
import { Thumb } from '../../components/PixelImage';
import { Reveal } from '../../components/Reveal';
import { Sprite } from '../../components/Sprite';
import { Text } from '../../components/Text';
import { copyText, type ShowcaseItem } from '../../content/types';
import { devMark, isPlaceholder } from '../../content/visible';

/** The shapes stand-ins take, in turn (width over height), so the ledge is not a row of identical boxes. A real piece keeps its own shape. */
const SHAPES = [4 / 5, 16 / 10, 1];

const shapeOf = (item: ShowcaseItem, i: number) => (item.image ? item.image.width / item.image.height : SHAPES[i % SHAPES.length]);

/**
 * Which piece the cat sits on: the shortest of the first row, if it is short
 * enough beside the tallest to leave the cat room. Otherwise the cat stays away.
 */
function perchOn(shapes: number[]): number {
  const row = shapes.slice(0, 2);
  if (row.length < 2) return -1;
  const [shortest, tallest] = [Math.max(...row), Math.min(...row)];
  return 1 / tallest - 1 / shortest >= 0.4 ? row.indexOf(shortest) : -1;
}

function Art({ item, fill }: { item: ShowcaseItem; fill?: boolean }): ReactNode {
  if (item.image) {
    const { src, alt, width, height } = item.image;
    return <img src={src} alt={alt} width={width} height={height} loading="lazy" decoding="async" />;
  }
  return <Thumb name={item.thumb} className={fill ? 'h-full' : undefined} />;
}

/**
 * The design group: framed pieces standing on a ledge with a jali railing
 * under it, as if leant against the pavilion, with the cat sitting on top of
 * the shortest one. A piece opens larger in a dialog.
 */
export function Designs({ items }: { items: ShowcaseItem[] }) {
  const [open, setOpen] = useState<ShowcaseItem | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const shapes = items.map(shapeOf);
  const perch = perchOn(shapes);

  useEffect(() => {
    if (open) dialog.current?.showModal();
  }, [open]);

  return (
    <>
      <ul className="cr-gallery">
        {items.map((item, i) => (
          <li key={item.id} className="cr-piece" {...devMark(isPlaceholder(item))}>
            <div className="cr-piece-top">
              {i === perch && <Sprite name="cat" className="cr-perch" />}
              <Reveal className="cr-piece-art" order={i}>
                <div style={{ aspectRatio: shapes[i] }}>
                  <PixelEdge variant="frame" cut={i + 4} lift className="h-full">
                    <Art item={item} fill />
                    <button type="button" className="cr-hit" data-corner="" aria-haspopup="dialog" onClick={() => setOpen(item)}>
                      <span className="cr-mark cr-plus" aria-hidden="true">
                        <span>
                          <i />
                        </span>
                      </span>
                      <span className="sr-only">view larger: {copyText(item.title)}</span>
                    </button>
                  </PixelEdge>
                </div>
              </Reveal>
            </div>
            <div className="cr-ledge" aria-hidden="true" />
            <div className="cr-caption">
              <Text as="h4" copy={item.title} />
              {item.role && <Text as="p" copy={item.role} />}
            </div>
          </li>
        ))}
      </ul>
      <dialog
        ref={dialog}
        className="cr-lightbox"
        aria-labelledby="lightbox-title"
        onClose={() => setOpen(null)}
        // a press on the dimmed page around the piece closes it
        onClick={(event) => event.target === event.currentTarget && dialog.current?.close()}
      >
        {open && (
          <PixelEdge>
            <div className="cr-lightbox-art" style={{ aspectRatio: open.image ? shapeOf(open, 0) : undefined }}>
              <Art item={open} />
            </div>
            <div className="cr-lightbox-foot">
              <div className="cr-caption" data-big="">
                <Text as="h4" copy={open.title} id="lightbox-title" />
                {open.role && <Text as="p" copy={open.role} />}
              </div>
              <PixelButton tone="ink" onClick={() => dialog.current?.close()}>
                close
              </PixelButton>
            </div>
          </PixelEdge>
        )}
      </dialog>
    </>
  );
}
