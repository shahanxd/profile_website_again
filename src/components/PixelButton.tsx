import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';
import { outbound } from './outbound';

type Tone = 'accent' | 'ink' | 'paper';

type PixelButtonProps = { tone?: Tone; className?: string; children: ReactNode } & (
  | ({ href: string } & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'className' | 'children'>)
  | ({ href?: undefined } & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'children'>)
);

/**
 * A button in the label face: a flat face with stepped corners over a hard
 * shadow. Pressing it moves the face one page pixel down onto the shadow.
 * With href it is a link; without, a button.
 */
export function PixelButton({ tone = 'accent', className = '', children, ...rest }: PixelButtonProps) {
  const shared = { className: `px-btn ${className}`, 'data-tone': tone === 'accent' ? undefined : tone };
  const face = <span className="px-btn-face">{children}</span>;
  if (rest.href !== undefined) {
    return (
      <a {...rest} {...outbound(rest.href, rest.rel)} {...shared}>
        {face}
      </a>
    );
  }
  return (
    <button type="button" {...rest} {...shared}>
      {face}
    </button>
  );
}

interface PixelLinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'className'> {
  href: string;
  /** Inside a sentence: keep the surrounding type instead of the label face. */
  inline?: boolean;
  className?: string;
}

/**
 * A text link. At rest it stands on a row of faint dots; on hover and focus
 * a row of dashes is laid over them from the left, a step at a time.
 */
export function PixelLink({ inline, className = '', children, ...rest }: PixelLinkProps) {
  return (
    <a {...rest} {...outbound(rest.href, rest.rel)} className={`px-link ${className}`} data-inline={inline ? '' : undefined}>
      {children}
    </a>
  );
}
