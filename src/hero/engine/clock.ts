export interface Loop {
  /** Most frames per second. Sprite animation is stepped, so the scene looks the same at any rate. */
  fps: number;
  readonly running: boolean;
  start(): void;
  stop(): void;
}

/**
 * The frame loop. `onFrame` gets the seconds since the frame before and the
 * time now. It runs only between start() and stop(); the engine stops it
 * whenever there is nothing to animate or nobody to see it.
 */
export function createLoop(fps: number, onFrame: (dt: number, now: number) => void): Loop {
  let request = 0;
  let last = 0;

  const frame = (now: number) => {
    request = requestAnimationFrame(frame);
    const gap = now - last;
    // A hair under the frame time, so a 60 fps cap does not skip frames on a 60 Hz screen.
    if (gap < 1000 / loop.fps - 2) return;
    last = now;
    // A long gap means the page stalled: carry on from where we were, do not jump ahead.
    onFrame(Math.min(gap, 100) / 1000, now);
  };

  const loop: Loop = {
    fps,
    get running() {
      return request !== 0;
    },
    start() {
      if (request) return;
      last = performance.now();
      request = requestAnimationFrame(frame);
    },
    stop() {
      cancelAnimationFrame(request);
      request = 0;
    },
  };
  return loop;
}
