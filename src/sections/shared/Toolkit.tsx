/**
 * What the owner works with, as one row: a label in the pixel face, then the
 * tools in the mono face, parted by a page pixel. The same on both sides;
 * only the colours change with the split.
 */
export function Toolkit({ tools }: { tools: string[] }) {
  return (
    <div className="toolkit">
      <p className="tag" id="toolkit-label">
        toolkit
      </p>
      <ul className="dotted-row" aria-labelledby="toolkit-label">
        {tools.map((tool) => (
          <li key={tool}>{tool}</li>
        ))}
      </ul>
    </div>
  );
}
