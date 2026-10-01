import { Text } from '../components/Text';
import type { Copy, LinkItem } from '../content/types';

export function Contact({ line, links }: { line: Copy; links: LinkItem[] }) {
  return (
    <div>
      <Text as="p" copy={line} className="max-w-[40ch] text-lg" />
      <ul className="mt-8 flex flex-wrap gap-x-8 gap-y-3 font-display text-3xl lowercase">
        {links.map((link) => (
          <li key={link.href}>
            <a href={link.href} className="text-accent underline-offset-8 hover:underline">
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Footer({ name, city }: { name: string; city: string }) {
  return (
    <footer className="border-t border-line">
      <div className="page flex flex-wrap justify-between gap-4 py-8 font-mono text-xs lowercase text-ink-2">
        <span>
          {name}, {city}
        </span>
        <a href="#top" className="text-ink-2 hover:text-ink">
          back to the garden
        </a>
      </div>
    </footer>
  );
}
