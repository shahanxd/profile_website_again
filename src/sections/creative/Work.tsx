import type { ReactNode } from 'react';
import { Text } from '../../components/Text';
import { site } from '../../content/site';
import { copyText, type Copy, type ShowcaseItem } from '../../content/types';
import { isPlaceholder } from '../../content/visible';
import { Designs } from './Design';
import { Photos } from './Photo';
import { Sumud } from './Sumud';
import { Videos } from './Video';

/** How many pieces a group holds; while every one of them is a stand-in, it says so. */
function tally(items: ShowcaseItem[]): string {
  const pieces = `${items.length} ${items.length === 1 ? 'piece' : 'pieces'}`;
  return items.every(isPlaceholder) ? `${pieces}, on the way` : pieces;
}

function Group({ title, items, line, children }: { title: string; items: ShowcaseItem[]; line?: Copy; children: ReactNode }) {
  if (items.length === 0) return null;
  return (
    <section className="cr-group" aria-labelledby={`work-${title}`}>
      <header className="cr-group-head">
        <h3 id={`work-${title}`}>{title}</h3>
        <span aria-hidden="true" />
        <p className="eyebrow">{tally(items)}</p>
        {line && <Text as="p" copy={line} className="cr-group-line" />}
      </header>
      {children}
    </section>
  );
}

/** The showcase: video, then design, then photographs, then sumud, set apart and plain. */
export function CreativeWork() {
  const { intro, lines = {}, items } = site.creative.work;
  const of = (kind: ShowcaseItem['kind']) => items.filter((item) => item.kind === kind);

  return (
    <>
      {intro && <Text as="p" copy={intro} className="cr-intro" />}
      <Group title="video" items={of('video')} line={lines.video}>
        <Videos items={of('video')} />
      </Group>
      <Group title="design" items={of('design')} line={lines.design}>
        <Designs items={of('design')} />
      </Group>
      <Group title="photos" items={of('photo')} line={lines.photo}>
        <Photos items={of('photo')} line={lines.photo && copyText(lines.photo)} />
      </Group>
      {of('game').map((item) => (
        <Sumud key={item.id} item={item} />
      ))}
    </>
  );
}
