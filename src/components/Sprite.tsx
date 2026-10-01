import { useEffect, useRef, type CSSProperties } from 'react';
import { useLive } from '../motion/live';
import { watch } from '../motion/watch';
import { useSplit } from '../split/store';
import type { SplitId } from '../split/types';
import { artUrl, spriteArt, type SpriteName } from './art';

interface SpriteProps {
  name: SpriteName;
  /** Which staging's drawing to use. Defaults to the split being shown. */
  staging?: SplitId;
  /** Which of the sprite's loops to play. Every sprite has "idle"; the rover also has "drive". */
  sequence?: string;
  /** Page pixels per art pixel: a whole number, so the sprite stays on the page's pixel grid. */
  scale?: number;
  /** Face the other way. */
  flip?: boolean;
  /** Milliseconds into the loop to start at, so two of the same sprite are not in step. */
  offset?: number;
  /** What it is, if it carries meaning. Without a label the sprite is decoration and hidden from assistive tech. */
  label?: string;
  className?: string;
  style?: CSSProperties;
}

/**
 * One of the garden's cast as a small living sprite: a strip of frames seen
 * through a window one frame wide, stepped (never tweened) through the loop
 * the art script wrote for it. It rests on frame 0 until it is on screen, and
 * stays there when motion is off or the page is held still.
 */
export function Sprite({ name, staging, sequence = 'idle', scale = 1, flip, offset = 0, label, className = '', style }: SpriteProps) {
  const { split } = useSplit();
  const art = spriteArt(name, staging ?? split);
  const steps = art.sequences[sequence] ?? art.sequences.idle;
  const strip = useRef<HTMLImageElement>(null);
  const live = useLive();

  useEffect(() => {
    const image = strip.current;
    if (!image || !live || steps.length < 2) return;
    const total = steps.reduce((sum, [, ms]) => sum + ms, 0);
    // Whole frames only: each keyframe holds until the next one. The distance is in the sprite's own units,
    // so it follows the page pixel (and the band's art pixel) if that changes.
    const at = (frame: number) => `translateX(calc(var(--w) * var(--scale, 1) * var(--px) * ${-frame}))`;
    let elapsed = 0;
    const keyframes: Keyframe[] = steps.map(([frame, ms]) => {
      const keyframe = { transform: at(frame), offset: elapsed / total, easing: 'steps(1, end)' };
      elapsed += ms;
      return keyframe;
    });
    keyframes.push({ transform: at(steps[0][0]), offset: 1 });
    const animation = image.animate(keyframes, { duration: total, iterations: Infinity });
    animation.currentTime = offset % total;
    animation.pause();
    const unwatch = watch(image.parentElement!, (visible) => (visible ? animation.play() : animation.pause()));
    return () => {
      unwatch();
      animation.cancel();
    };
  }, [live, steps, offset]);

  return (
    <span
      className={`sprite ${className}`}
      style={{ '--w': art.w, '--h': art.h, '--scale': scale, ...style } as CSSProperties}
      data-flip={flip ? '' : undefined}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <img
        ref={strip}
        src={artUrl(art.src)}
        width={art.w * art.frames}
        height={art.h}
        alt=""
        loading="lazy"
        decoding="async"
        draggable={false}
      />
    </span>
  );
}
