import { Text } from '../components/Text';
import type { Copy } from '../content/types';

interface AboutProps {
  paragraphs: Copy[];
  toolkit: string[];
}

export function About({ paragraphs, toolkit }: AboutProps) {
  return (
    <div className="grid gap-10 md:grid-cols-12">
      <div className="space-y-5 text-lg md:col-span-7">
        {paragraphs.map((paragraph, i) => (
          <Text key={i} as="p" copy={paragraph} />
        ))}
      </div>
      <div className="md:col-span-4 md:col-start-9">
        <p className="eyebrow">toolkit</p>
        <ul className="mt-3 flex flex-wrap gap-2 font-mono text-sm">
          {toolkit.map((tool) => (
            <li key={tool} className="border border-line px-2 py-1 lowercase">
              {tool}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
