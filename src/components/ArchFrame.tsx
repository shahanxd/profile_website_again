import type { CSSProperties, ElementType, ReactNode } from 'react';

interface ArchFrameProps {
  as?: ElementType;
  /** Size of the arch's shoulders in whole multiples: 1 is 20 page pixels a side. */
  scale?: 1 | 2 | 3;
  /** Make the frame exactly two shoulders wide, so the arch comes to a point. For tall, narrow pictures. */
  pointed?: boolean;
  /** A hard offset shadow behind the frame. */
  shadow?: boolean;
  className?: string;
  /** The picture: a PixelImage, a Thumb, an img or a video. It should fill the frame's width. */
  children: ReactNode;
}

/**
 * A cusped (multifoil) arch, like the pavilion's, cut out of the picture
 * inside it, with a one-pixel rim. The shoulders are fixed-size pixel tiles
 * pinned to the top corners, so the frame takes any width and keeps whole
 * pixels; between them the top runs straight.
 */
export function ArchFrame({ as: Tag = 'div', scale = 1, pointed, shadow, className = '', children }: ArchFrameProps) {
  return (
    <Tag className={`arch ${className}`} data-pointed={pointed ? '' : undefined} style={{ '--arch-scale': scale } as CSSProperties}>
      {shadow && <span className="arch-shadow" aria-hidden="true" />}
      <span className="arch-rim" aria-hidden="true" />
      <div className="arch-media">{children}</div>
    </Tag>
  );
}
