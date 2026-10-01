import { useState } from 'react';
import { PixelEdge } from '../../components/PixelEdge';
import { Reveal } from '../../components/Reveal';
import { Text } from '../../components/Text';
import { copyText, type ShowcaseItem } from '../../content/types';
import { Lightbox, type Opened, type Slide } from './Lightbox';

/**
 * The photographs: a row of square prints in matching frames, each under the
 * owner's own title for it. Pressed, one opens larger, and the arrows go on
 * to the others. Only the frames are pixel art: the photographs themselves
 * are shown smooth.
 */
export function Photos({ items, line }: { items: ShowcaseItem[]; line?: string }) {
  const [open, setOpen] = useState<Opened | null>(null);
  const shown = items.filter((item) => item.image);
  const slides: Slide[] = shown.map((item) => ({ picture: item.full ?? item.image!, title: copyText(item.title), line }));

  return (
    <>
      <ul className="cr-photos">
        {shown.map((item, i) => {
          const { src, alt, width, height } = item.image!;
          return (
            <li key={item.id}>
              <Reveal order={i}>
                <PixelEdge variant="frame" cut={i * 3 + 7} lift>
                  <img src={src} alt={alt} width={width} height={height} loading="lazy" decoding="async" />
                  <button type="button" className="cr-hit" data-corner="" aria-haspopup="dialog" onClick={() => setOpen({ slides, at: i })}>
                    <span className="cr-mark cr-plus" aria-hidden="true">
                      <span>
                        <i />
                      </span>
                    </span>
                    <span className="sr-only">view larger: {copyText(item.title)}</span>
                  </button>
                </PixelEdge>
              </Reveal>
              <div className="cr-caption">
                <Text as="h4" copy={item.title} />
              </div>
            </li>
          );
        })}
      </ul>
      <Lightbox open={open} onClose={() => setOpen(null)} />
    </>
  );
}
