import type { Tool } from '../../content/types';

/**
 * What the owner works with, as one row: a label in the pixel face, then the
 * tools in the mono face, parted by a page pixel. A tool may carry a word
 * about itself ("main camera"), set after it in the label face. The same on
 * both sides; only the colours change with the split.
 */
export function Toolkit({ tools }: { tools: Tool[] }) {
  return (
    <div className="toolkit">
      <p className="tag" id="toolkit-label">
        toolkit
      </p>
      <ul className="dotted-row" aria-labelledby="toolkit-label">
        {tools.map((tool) => {
          const { name, note } = typeof tool === 'string' ? { name: tool, note: undefined } : tool;
          return (
            <li key={name}>
              {name}
              {note && <span className="toolkit-note">{note}</span>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
