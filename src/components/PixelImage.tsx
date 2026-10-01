import type { CSSProperties } from 'react';
import type { ThumbName } from '../content/types';
import { useSplit } from '../split/store';
import { thumbArt } from './art';

interface PixelImageProps {
  src: string;
  /** The picture's size in art pixels. */
  w: number;
  h: number;
  alt: string;
  /** The point of the picture to keep in the middle of the box, in art pixels. Its centre, unless given. */
  focus?: readonly [number, number];
  /** Load at once instead of when it nears the screen. */
  eager?: boolean;
  className?: string;
}

/**
 * Pixel art in a box, at exactly one page pixel to an art pixel, as every
 * sprite on the page is. The box is as wide as its parent (never wider than
 * the picture) and keeps the picture's shape unless a class gives it another
 * (an aspect-ratio or a height); it shows as much of the picture as it has
 * room for, around the point it looks at.
 */
export function PixelImage({ src, w, h, alt, focus = [w / 2, h / 2], eager, className = '' }: PixelImageProps) {
  return (
    <span className={`pixel-image ${className}`} style={{ '--w': w, '--h': h, '--fx': focus[0], '--fy': focus[1] } as CSSProperties}>
      <img src={src} width={w} height={h} alt={alt} loading={eager ? undefined : 'lazy'} decoding="async" draggable={false} />
    </span>
  );
}

const THUMB_ALT: Record<ThumbName, string> = {
  pavilion: 'the garden pavilion',
  pool: 'the pool and its fountain',
  horizon: 'the old city on the horizon',
  canopy: 'the bough of the tree',
  beds: 'the flower beds',
  lantern: 'the lantern under the tree',
  carpet: 'the carpet, with the side table',
  sky: 'the sky over the garden',
  cypress: 'cypresses by the wall',
  cat: 'the cat on the carpet',
};

/**
 * A view of the garden, in the staging of the split being shown, that stands
 * in for a picture the owner has not supplied yet. The alt text says so.
 */
export function Thumb({ name, className }: { name: ThumbName; className?: string }) {
  const { split } = useSplit();
  return <PixelImage {...thumbArt(name, split)} alt={`${THUMB_ALT[name]} (a stand-in picture)`} className={className} />;
}
