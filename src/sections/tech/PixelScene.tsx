import { useEffect, useRef } from 'react';
import { useLive } from '../../motion/live';
import { watch } from '../../motion/watch';
import type { Scene, SceneMaker } from './scenes/kit';

/** Ten frames a second: these are pixel things, and move in steps. */
const FRAME_MS = 100;

/**
 * Only one illustration runs at a time: the one that came into the middle of
 * the window last. The others hold the frame they were on.
 */
const inView: Array<(run: boolean) => void> = [];

function enter(play: (run: boolean) => void) {
  inView[inView.length - 1]?.(false);
  inView.push(play);
  play(true);
}

function leave(play: (run: boolean) => void) {
  const at = inView.indexOf(play);
  if (at < 0) return;
  const wasRunning = at === inView.length - 1;
  inView.splice(at, 1);
  play(false);
  if (wasRunning) inView[inView.length - 1]?.(true);
}

interface PixelSceneProps {
  /** Builds the drawing for the size the canvas turns out to be. */
  make: SceneMaker;
  /** What the picture shows, for someone who cannot see it. */
  label: string;
}

/**
 * A project illustration: a canvas of one art pixel to a page pixel, filling
 * its box, painted by a scene (src/sections/tech/scenes). It plays while it
 * is in the middle of the window and nothing else is playing, and holds its
 * resting frame when motion is off or the page is held still.
 */
export function PixelScene({ make, label }: PixelSceneProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  const live = useLive();

  useEffect(() => {
    const canvas = ref.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;
    let scene: Scene | null = null;
    // where the loop has got to; it sets off from the resting frame, so starting to play is not a jump
    let elapsed = -1;
    let timer = 0;

    const paint = () => scene?.draw(context, elapsed % scene.loop);

    // One art pixel is one page pixel; the canvas covers its box, and a part pixel at the far edges is cropped.
    const size = () => {
      const unit = parseFloat(getComputedStyle(canvas).getPropertyValue('--px')) || 4;
      const box = canvas.parentElement!.getBoundingClientRect();
      const [w, h] = [Math.ceil(box.width / unit), Math.ceil(box.height / unit)];
      if (!w || !h || (scene && w === canvas.width && h === canvas.height)) return;
      canvas.width = w;
      canvas.height = h;
      canvas.style.width = `${w * unit}px`;
      canvas.style.height = `${h * unit}px`;
      scene = make(w, h);
      if (elapsed < 0) elapsed = scene.rest;
      paint();
    };

    const play = (run: boolean) => {
      clearInterval(timer);
      if (!run) return;
      timer = window.setInterval(() => {
        if (document.hidden) return;
        elapsed += FRAME_MS;
        paint();
      }, FRAME_MS);
    };

    size();
    const resized = new ResizeObserver(size);
    resized.observe(canvas.parentElement!);
    const unwatch = live ? watch(canvas, (visible) => (visible ? enter(play) : leave(play)), '-30% 0px -30% 0px') : undefined;

    return () => {
      resized.disconnect();
      unwatch?.();
      leave(play);
      clearInterval(timer);
    };
  }, [make, live]);

  return (
    <div className="pixel-scene">
      <canvas ref={ref} role="img" aria-label={label} />
    </div>
  );
}
