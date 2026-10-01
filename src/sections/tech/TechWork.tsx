import { PixelButton, PixelLink } from '../../components/PixelButton';
import { PixelEdge } from '../../components/PixelEdge';
import { Thumb } from '../../components/PixelImage';
import { Reveal } from '../../components/Reveal';
import { Sprite } from '../../components/Sprite';
import { Text } from '../../components/Text';
import { site } from '../../content/site';
import type { Project, Result } from '../../content/types';
import { devMark, isPlaceholder } from '../../content/visible';
import { Section } from '../Section';
import { techLabel } from './label';
import { PixelScene } from './PixelScene';
import { cassetto } from './scenes/cassetto';
import type { SceneMaker } from './scenes/kit';
import { metagross } from './scenes/metagross';
import { undumployed } from './scenes/undumployed';

/** The living illustration for a showcase, and what it shows, for someone who cannot see it. */
const SCENES: Record<string, { make: SceneMaker; label: string }> = {
  metagross: {
    make: metagross,
    label:
      'a pixel illustration: a small rover on a patch of ground seen from above. it drives only across cells it has already seen, finds a ditch, follows it to a gap, and reaches a marked goal.',
  },
  cassetto: {
    make: cassetto,
    label:
      'a pixel illustration: a small call graph. one symbol at a time is picked out, and the wires to what it calls and what calls it light up, then the wires one step further out.',
  },
  undumployed: {
    make: undumployed,
    label:
      'a pixel illustration: shelves of small labelled jars beside a pinned card. one jar at a time has its lid lifted, the card is written out and stamped "reality check", and the jar gets a tick.',
  },
};

/** A project's place among all of them: "04 / 08". */
const place = (index: number, count: number) => `${String(index + 1).padStart(2, '0')} / ${String(count).padStart(2, '0')}`;

function Results({ results }: { results: Result[] }) {
  if (results.length === 0) return null;
  return (
    <dl className="tech-results">
      {results.map((result) => (
        <div key={result.label} {...devMark(isPlaceholder(result))}>
          <dt>{result.value}</dt>
          <dd>
            {result.label}
            {result.asOf && <span> (as of {result.asOf})</span>}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function Stack({ stack }: { stack: string[] }) {
  return (
    <ul className="dotted-row tech-stack" aria-label="built with">
      {stack.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

/** A project's links. In a showcase the first is a button; the rest, and all of a card's, are text links. */
function Links({ project, button }: { project: Project; button?: boolean }) {
  return (
    <ul className="tech-links">
      {project.links.map((link, i) => {
        // the visible word ("source") is the same on every project, so the name is added for anyone listing links
        const shared = { href: link.href, rel: 'noreferrer', 'aria-label': `${link.label}: ${project.name}` };
        const Link = button && i === 0 ? PixelButton : PixelLink;
        return (
          <li key={link.href}>
            <Link {...shared}>{link.label}</Link>
          </li>
        );
      })}
    </ul>
  );
}

/** What a showcase shows: a real capture once there is one, the living illustration until then. */
function Visual({ project }: { project: Project }) {
  const scene = SCENES[project.id];
  if (project.image) {
    const { src, alt, width, height } = project.image;
    return <img src={src} alt={alt} width={width} height={height} loading="lazy" decoding="async" className="tech-capture" />;
  }
  return scene ? <PixelScene make={scene.make} label={scene.label} /> : <Thumb name={project.thumb} />;
}

function Showcase({ project, index, count }: { project: Project; index: number; count: number }) {
  const heading = `${project.id}-name`;
  return (
    <article className="tech-show" data-flip={index % 2 ? '' : undefined} aria-labelledby={heading}>
      <header className="tech-show-head">
        <p className="tech-num">{place(index, count)}</p>
        <h3 id={heading} className="tech-show-name">
          {project.name}
        </h3>
        <Text as="p" copy={project.line} className="tech-show-line" />
      </header>
      <div className="tech-show-side">
        <Reveal as="figure">
          <PixelEdge variant="frame" cut={index * 3 + 2}>
            <Visual project={project} />
          </PixelEdge>
          {project.caption && <Text as="figcaption" copy={project.caption} />}
        </Reveal>
        <Results results={project.results} />
      </div>
      <div className="tech-show-body">
        <Text as="p" copy={project.body} />
        <Stack stack={project.stack} />
        <Links project={project} button />
      </div>
    </article>
  );
}

/**
 * How the cards between two plain ones share their rows, so that no row ends
 * with an empty place: for each card, how many of them stand in its row when
 * rows hold up to three, and when they hold up to two. Short rows come
 * first, so the cards with the most to say (the first listed) get the room.
 */
function rowsOf(count: number): { three: number; two: number }[] {
  const fill = (most: number): number[] => {
    const rows: number[] = [];
    let left = count;
    // as many short rows as it takes for the rest to fill whole rows
    while (left % most !== 0 && left > 0) {
      const size = Math.min(left, most - 1);
      rows.push(size);
      left -= size;
    }
    for (; left > 0; left -= most) rows.push(most);
    return rows.flatMap((size) => Array<number>(size).fill(size));
  };
  const [three, two] = [fill(3), fill(2)];
  return three.map((size, i) => ({ three: size, two: two[i] }));
}

interface CardProps {
  project: Project;
  index: number;
  count: number;
  order: number;
  /** How many cards stand in this one's row, at each width of the grid. Not given to a plain card, which has the whole row. */
  row?: { three: number; two: number };
}

/**
 * One of the rest. A plain-toned project (a serious subject) gets the whole
 * row and a straight frame: the same card as the others, with nothing eaten,
 * raised or resolving around it. Where it has a picture of its own (sumud's
 * key art), the picture stands beside the words, whole and unframed.
 */
function Card({ project, index, count, order, row }: CardProps) {
  const plain = project.tone === 'plain';
  const picture = plain ? project.image : undefined;
  const card = (
    <PixelEdge as="article" shadow={!plain} lift={!plain} plain={plain} cut={index + 2} bodyClassName="tech-card">
      {picture && (
        <img
          className="tech-card-picture"
          src={picture.src}
          alt={picture.alt}
          width={picture.width}
          height={picture.height}
          loading="lazy"
          decoding="async"
        />
      )}
      <div className="tech-card-head">
        <p className="tech-num">{place(index, count)}</p>
        <h3>{project.name}</h3>
        <Text as="p" copy={project.line} />
      </div>
      <div className="tech-card-rest">
        <Text as="p" copy={project.body} className="tech-card-body" />
        {project.results.length > 0 && (
          <p className="tech-card-facts">{project.results.map((result) => `${result.value} ${result.label}`).join(' · ')}</p>
        )}
        <div className="tech-card-foot">
          <Stack stack={project.stack} />
          <Links project={project} />
        </div>
      </div>
    </PixelEdge>
  );
  return (
    <li data-wide={plain ? '' : undefined} data-pictured={picture ? '' : undefined} data-row3={row?.three} data-row2={row?.two}>
      {plain ? card : <Reveal order={order}>{card}</Reveal>}
    </li>
  );
}

/** The owner at work, leaning on the bolster at the edge of the carpet: company for the heading. */
function AtWork() {
  return (
    <span className="tech-at-work">
      <Sprite name="figure" />
      <span className="kilim" data-bleed="" />
    </span>
  );
}

/**
 * Projects, the heart of the tech side: three showcases, each with a living
 * illustration of what the thing does, then the rest as a grid of cards.
 */
export function TechWork() {
  const { work } = site.tech;
  const projects = work.projects.map((id) => site.projects[id]).filter(Boolean);
  const features = projects.filter((project) => project.size === 'feature');
  const rest = projects.filter((project) => project.size === 'grid');
  // the cards that resolve in do so as a row: each is told how many came before it
  const before = (index: number) => rest.slice(0, index).filter((project) => project.tone !== 'plain').length;
  // a plain card takes a whole row; the cards of each run between them share out their rows
  const rows: ({ three: number; two: number } | undefined)[] = [];
  for (let i = 0; i < rest.length; ) {
    let end = i;
    while (end < rest.length && rest[end].tone !== 'plain') end += 1;
    if (end === i) {
      rows.push(undefined);
      i += 1;
    } else {
      rows.push(...rowsOf(end - i));
      i = end;
    }
  }

  return (
    <Section id="work" index={2} label={techLabel('work')} heading={work.heading} mark={work.mark} ornament={<AtWork />}>
      {work.intro && <Text as="p" copy={work.intro} className="tech-intro" />}
      <div className="tech-shows">
        {features.map((project, i) => (
          <Showcase key={project.id} project={project} index={i} count={projects.length} />
        ))}
      </div>
      <p className="tag tech-rule">the rest</p>
      <ul className="tech-cards" aria-label="more projects">
        {rest.map((project, i) => (
          <Card key={project.id} project={project} index={features.length + i} count={projects.length} order={before(i)} row={rows[i]} />
        ))}
      </ul>
    </Section>
  );
}
