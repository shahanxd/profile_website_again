import { Text } from '../components/Text';
import { site } from '../content/site';
import type { LinkItem, Project, Result, ShowcaseItem } from '../content/types';
import { confirmedOnly, SHOW_UNCONFIRMED } from '../content/visible';

function Links({ links }: { links: LinkItem[] }) {
  return (
    <ul className="flex flex-wrap gap-4 font-pixel text-sm">
      {links.map((link) => (
        <li key={link.href}>
          <a href={link.href} className="lowercase text-accent underline-offset-4 hover:underline">
            {link.label}
          </a>
        </li>
      ))}
    </ul>
  );
}

function Results({ results }: { results: Result[] }) {
  const shown = confirmedOnly(results);
  if (shown.length === 0) return null;
  return (
    <dl className="flex flex-wrap gap-x-10 gap-y-4">
      {shown.map((result) => (
        <div key={result.label} className="max-w-[22ch]">
          <dt className="font-display text-3xl">{result.value}</dt>
          <dd className="mt-1 text-sm text-ink-2">{result.label}</dd>
        </div>
      ))}
    </dl>
  );
}

function Stack({ stack }: { stack: string[] }) {
  return <p className="font-mono text-xs lowercase text-ink-2">{stack.join(' · ')}</p>;
}

function Feature({ project }: { project: Project }) {
  return (
    <article className="grid gap-8 border-t border-line py-12 md:grid-cols-12">
      <div className="md:col-span-5">
        <h3 className="text-3xl lowercase">{project.name}</h3>
        <Text as="p" copy={project.line} className="mt-3 text-lg" />
        <div className="mt-6">
          <Stack stack={project.stack} />
        </div>
        <div className="mt-6">
          <Links links={project.links} />
        </div>
      </div>
      <div className="space-y-8 md:col-span-6 md:col-start-7">
        <Text as="p" copy={project.body} className="text-ink-2" />
        <Results results={project.results} />
      </div>
    </article>
  );
}

function Card({ project }: { project: Project }) {
  return (
    <article className="flex flex-col gap-4 border border-line p-6">
      <h3 className="text-2xl lowercase">{project.name}</h3>
      <Text as="p" copy={project.line} />
      <Text as="p" copy={project.body} className="text-sm text-ink-2" />
      <Results results={project.results} />
      <div className="mt-auto space-y-4 pt-2">
        <Stack stack={project.stack} />
        <Links links={project.links} />
      </div>
    </article>
  );
}

export function TechWork() {
  const projects = site.tech.work.projects.map((id) => site.projects[id]).filter(Boolean);
  const features = projects.filter((project) => project.size === 'feature');
  const rest = projects.filter((project) => project.size === 'grid');

  return (
    <>
      <div>
        {features.map((project) => (
          <Feature key={project.id} project={project} />
        ))}
      </div>
      <div className="mt-12 grid gap-6 md:grid-cols-2">
        {rest.map((project) => (
          <Card key={project.id} project={project} />
        ))}
      </div>
    </>
  );
}

const KIND_LABEL: Record<ShowcaseItem['kind'], string> = {
  video: 'video',
  design: 'design',
  game: 'game',
};

function ShowcaseCard({ item }: { item: ShowcaseItem }) {
  const body = (
    <>
      <div className="flex aspect-video items-center justify-center border border-line bg-bg-2">
        {!item.confirmed && SHOW_UNCONFIRMED && <span className="eyebrow">placeholder</span>}
      </div>
      <p className="eyebrow mt-4">{KIND_LABEL[item.kind]}</p>
      <Text as="h3" copy={item.title} className="mt-1 text-2xl lowercase" />
      {item.role && <Text as="p" copy={item.role} className="mt-2 text-sm text-ink-2" />}
    </>
  );
  return (
    <article>
      {item.href ? (
        <a href={item.href} className="block text-ink no-underline">
          {body}
        </a>
      ) : (
        body
      )}
    </article>
  );
}

export function CreativeWork() {
  const items = confirmedOnly(site.creative.work.items);
  return (
    <div className="grid gap-x-6 gap-y-12 md:grid-cols-2">
      {items.map((item) => (
        <ShowcaseCard key={item.id} item={item} />
      ))}
    </div>
  );
}
