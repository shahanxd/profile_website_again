import { useState, type CSSProperties } from 'react';
import { PixelEdge } from '../../components/PixelEdge';
import { Thumb } from '../../components/PixelImage';
import { Reveal } from '../../components/Reveal';
import { Sprite } from '../../components/Sprite';
import { Text } from '../../components/Text';
import { copyText, type ShowcaseItem } from '../../content/types';
import { devMark, isPlaceholder } from '../../content/visible';
import { Lightbox, type Opened } from './Lightbox';

/** The shapes stand-ins take, in turn (width over height), so the ledge is not a row of identical boxes. A real piece keeps its cover's shape. */
const SHAPES = [4 / 5, 16 / 10, 1];

const coverOf = (item: ShowcaseItem) => item.pages?.[0] ?? item.image;

function shapeOf(item: ShowcaseItem, i: number): number {
  const cover = coverOf(item);
  return cover ? cover.width / cover.height : SHAPES[i % SHAPES.length];
}

/**
 * Which piece the cat sits on: the shortest of the row, if it is short
 * enough beside the tallest to leave the cat room (the first such, should
 * two be equally short). Otherwise the cat stays away.
 */
function perchOn(shapes: number[]): number {
  const row = shapes.slice(0, 3);
  if (row.length < 2) return -1;
  const [shortest, tallest] = [Math.max(...row), Math.min(...row)];
  return 1 / tallest - 1 / shortest >= 0.4 ? row.indexOf(shortest) : -1;
}

/** How much there is to page through, said beside the title: "8 pages". Nothing for a single sheet. */
const pagesOf = (item: ShowcaseItem) => (item.pages && item.pages.length > 1 ? `${item.pages.length} pages` : null);

/**
 * The design group: framed pieces standing on a ledge with a jali railing
 * under it, as if leant against the pavilion, with the cat sitting on top of
 * the shortest one. Each piece shows its cover; pressed, it opens larger and
 * can be paged through. Side by side, a tall sheet is given a narrower place
 * than a wide one, so the pictures of a row are nearer one size.
 */
export function Designs({ items }: { items: ShowcaseItem[] }) {
  const [open, setOpen] = useState<Opened | null>(null);
  const shapes = items.map(shapeOf);
  const perch = perchOn(shapes);
  const tall = shapes.findIndex((shape) => shape < 1);
  // each piece's share of the row follows its shape, gently: the square root of width over height
  const shares = shapes.map((shape) => `minmax(0, ${Math.sqrt(shape).toFixed(3)}fr)`).join(' ');

  const view = (item: ShowcaseItem) => {
    const pictures = item.pages ?? (item.image ? [item.image] : []);
    if (pictures.length === 0) return;
    const title = copyText(item.title);
    const line = item.role ? copyText(item.role) : undefined;
    setOpen({ slides: pictures.map((picture) => ({ picture, title, line })), at: 0 });
  };

  return (
    <>
      <ul className="cr-gallery" data-fit={items.length <= 3 ? '' : undefined} style={{ '--shares': shares } as CSSProperties}>
        {items.map((item, i) => {
          const cover = coverOf(item);
          const pages = pagesOf(item);
          return (
            <li key={item.id} className="cr-piece" data-tall={shapes[i] < 1 ? '' : undefined} {...devMark(isPlaceholder(item))}>
              <div className="cr-piece-top">
                {i === perch && <Sprite name="cat" className="cr-perch" />}
                {/* on a phone the pieces stand one to a row, and the cat sits on the ledge beside the tall sheet instead */}
                {perch >= 0 && i === tall && <Sprite name="cat" className="cr-beside" />}
                <Reveal className="cr-piece-art" order={i}>
                  <div style={{ aspectRatio: shapes[i].toFixed(4) }}>
                    <PixelEdge variant="frame" cut={i + 4} lift className="h-full">
                      {cover ? (
                        <img src={cover.src} alt={cover.alt} width={cover.width} height={cover.height} loading="lazy" decoding="async" />
                      ) : (
                        item.thumb && <Thumb name={item.thumb} className="h-full" />
                      )}
                      {cover && (
                        <button type="button" className="cr-hit" data-corner="" aria-haspopup="dialog" onClick={() => view(item)}>
                          <span className="cr-mark cr-plus" aria-hidden="true">
                            <span>
                              <i />
                            </span>
                          </span>
                          <span className="sr-only">
                            view larger: {copyText(item.title)}
                            {pages && `, ${pages}`}
                          </span>
                        </button>
                      )}
                    </PixelEdge>
                  </div>
                </Reveal>
              </div>
              <div className="cr-ledge" aria-hidden="true" />
              <div className="cr-caption">
                <div className="cr-caption-head">
                  <Text as="h4" copy={item.title} />
                  {pages && <p className="cr-meta">{pages}</p>}
                </div>
                {item.role && <Text as="p" copy={item.role} />}
              </div>
            </li>
          );
        })}
      </ul>
      <Lightbox open={open} onClose={() => setOpen(null)} />
    </>
  );
}
