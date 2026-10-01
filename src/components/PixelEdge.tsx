import type { CSSProperties, ElementType, ReactNode } from 'react';

interface PixelEdgeProps {
  as?: ElementType;
  /** card: padded, for text. frame: no padding, and the eaten edge cuts into the picture inside. */
  variant?: 'card' | 'frame';
  /** paper (the card colour), sunk (a shade darker than the page), ink, or accent. */
  tone?: 'paper' | 'sunk' | 'ink' | 'accent';
  /** The hard offset shadow. On unless switched off. */
  shadow?: boolean;
  /** Lift one page pixel on hover and when something inside has focus. For cards that are, or hold, a link. */
  lift?: boolean;
  /** Any whole number: slides the eaten pattern along, so neighbouring cards differ. Pass the card's index. */
  cut?: number;
  /** Serious content (sumud, salamah): a straight frame instead of the eaten edge, and the page goes quiet while it is being read. */
  plain?: boolean;
  /** Classes for the outer box (its place in a grid). */
  className?: string;
  /** Classes for the inner box (padding, layout of the content). */
  bodyClassName?: string;
  id?: string;
  children: ReactNode;
}

/**
 * A card or picture frame with ragged, pixel-eaten edges and a hard offset
 * shadow. The edge is a CSS mask of small generated tiles, so it costs
 * nothing to scroll and suits any size. A card's ground and shadow sit in a
 * layer behind its words, which is what a Reveal resolves: the words
 * themselves are never dithered.
 */
export function PixelEdge({
  as: Tag = 'div',
  variant = 'card',
  tone = 'paper',
  shadow = true,
  lift,
  cut = 0,
  plain,
  className = '',
  bodyClassName = '',
  id,
  children,
}: PixelEdgeProps) {
  return (
    <Tag
      id={id}
      className={`pe ${className}`}
      data-variant={variant}
      data-fill={tone}
      data-lift={lift ? '' : undefined}
      data-tone={plain ? 'plain' : undefined}
      style={{ '--cut': cut } as CSSProperties}
    >
      {variant === 'card' ? (
        <span className="pe-back" aria-hidden="true">
          {shadow && <span className="pe-shadow step-2" />}
          <span className="pe-ground step-2" />
        </span>
      ) : (
        shadow && <span className="pe-shadow step-2" aria-hidden="true" />
      )}
      <div className={`pe-body ${variant === 'frame' ? 'step-2' : ''} ${bodyClassName}`}>{children}</div>
    </Tag>
  );
}
