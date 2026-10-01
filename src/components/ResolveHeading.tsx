import { copyText, isDraft, type Copy } from '../content/types';
import { draftMark } from '../content/visible';
import { useResolve } from '../motion/resolve';

interface ResolveHeadingProps {
  copy: Copy;
  /** A phrase of the heading (exactly as written in it) to underline with a pen stroke. Keep it short: it does not wrap. */
  mark?: string;
  id?: string;
  tabIndex?: number;
  className?: string;
}

/**
 * A section's heading (an h2): it resolves out of dither the first time it
 * scrolls into view, after which the pen underlines one phrase. Whole from
 * the start when it is already on screen, with motion off, or with ?still=1.
 * Smaller headings do not resolve: one thing at a time asks to be looked at.
 */
export function ResolveHeading({ copy, mark, className, ...rest }: ResolveHeadingProps) {
  const ref = useResolve<HTMLHeadingElement>();
  const text = copyText(copy);
  const at = mark ? text.indexOf(mark) : -1;

  return (
    <h2 ref={ref} className={className} {...draftMark(isDraft(copy))} {...rest}>
      {!mark || at < 0 ? (
        text
      ) : (
        <>
          {text.slice(0, at)}
          <span className="pen">
            {mark}
            <PenLine />
          </span>
          {text.slice(at + mark.length)}
        </>
      )}
    </h2>
  );
}

/** One stroke of a pen, a little unsteady, stretched under the phrase. */
function PenLine() {
  return (
    <svg className="pen-line" viewBox="0 0 100 10" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <path
        d="M1 6.2 C 14 3.4, 27 7.6, 42 5.2 S 68 3.2, 81 5.6 S 95 6.4, 99 4.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
