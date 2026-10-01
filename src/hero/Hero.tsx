import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { Text } from '../components/Text';
import { site } from '../content/site';
import { BLOCK, COVER_MS, heldDissolve, originFor, REVEAL_MS, selfDissolving } from '../split/dissolve';
import { getSplitState, useSplit } from '../split/store';
import type { GardenEngine } from './engine';
import { loadAtlas } from './engine/atlas';
import { frameView, isPortrait, watchDeviceSize } from './engine/camera';
import { framing } from './scene/framing';
import './hero.css';

const percent = (fraction: number) => `${fraction * 100}%`;

/** The poster holds the whole painted world and the lawn below it. */
const POSTER = { width: framing.world[0], height: framing.world[1] + framing.lawn };

// framing.ts and the switch timings, handed to hero.css so the scene is already in place before any script runs.
const heroVars = {
  '--world-w': framing.world[0],
  '--world-h': framing.world[1],
  '--rows': POSTER.height,
  '--focus-x': framing.focus[0],
  '--focus-y': framing.focus[1],
  '--floor': framing.floor,
  '--land-h': framing.landscape.height,
  '--land-w': framing.landscape.width,
  '--land-left': framing.landscape.left,
  '--land-y': percent(framing.landscape.target),
  '--port-w': framing.portrait.width,
  '--port-h': framing.portrait.height,
  '--cover-ms': `${COVER_MS}ms`,
  '--reveal-ms': `${REVEAL_MS}ms`,
} as CSSProperties;

/**
 * Puts the poster on exactly the pixel grid the canvas uses, so the canvas can
 * take over without a jump, and gives the stylesheet the true size of an art
 * pixel and the true place of the world, which the copy is set against.
 */
function placeScene(hero: HTMLElement, poster: HTMLImageElement, canvas: HTMLCanvasElement, deviceW: number, deviceH: number) {
  if (!deviceW || !deviceH) return;
  const view = frameView(deviceW, deviceH, framing, isPortrait());
  const cssPerDevice = canvas.getBoundingClientRect().width / deviceW;
  const cssPerArt = cssPerDevice * view.k;
  hero.style.setProperty('--k', `${cssPerArt}px`);
  hero.style.setProperty('--poster-left', `${-view.x * cssPerArt}px`);
  hero.style.setProperty('--poster-top', `${-view.y * cssPerArt}px`);
  // Scaled and moved as a transform. The stylesheet's way (left, top, width and height) goes through layout,
  // which keeps lengths to 1/64 px and snaps boxes to whole pixels: at a pixel ratio of 3 in Chrome's phone
  // emulation that put the poster one device pixel below the canvas. A transform is applied as given.
  //
  // The box that is scaled must itself be a whole number of device pixels each way, or layout rounds it and
  // the picture is stretched by that fraction: far down a tall screen, rows land a device pixel out. At its
  // natural size (one CSS pixel per art pixel) the box is whole at most pixel ratios; where it is not, it is
  // laid out one device pixel per art pixel instead, which is whole at every ratio.
  const whole = (cssPixels: number) => Math.abs(cssPixels * devicePixelRatio - Math.round(cssPixels * devicePixelRatio)) < 1e-3;
  const box = whole(POSTER.width) && whole(POSTER.height) ? 1 : cssPerDevice;
  Object.assign(poster.style, {
    left: '0',
    top: '0',
    width: `${POSTER.width * box}px`,
    height: `${POSTER.height * box}px`,
    transformOrigin: '0 0',
    transform: `translate(${-view.x * cssPerArt}px, ${-view.y * cssPerArt}px) scale(${cssPerArt / box})`,
  });
  selfDissolving.cell = BLOCK * cssPerArt; // the page overlay matches its cells to the garden's dissolve blocks
}

/** Runs `work` once the browser has painted a frame. Returns a way to call it off. */
function afterPaint(work: () => void): () => void {
  // The first callback runs just before a paint; the one it schedules runs after that paint.
  let request = requestAnimationFrame(() => {
    request = requestAnimationFrame(work);
  });
  return () => cancelAnimationFrame(request);
}

/**
 * The garden, with the hero copy on top. The poster and the text are in the
 * page from the first paint; the engine is fetched afterwards and its canvas
 * replaces the poster once it has a frame. Without WebGL2 the poster stays.
 */
export function Hero() {
  const { split, motion, phase, target, origin } = useSplit();
  const hero = site[split].hero;
  const sectionRef = useRef<HTMLElement>(null);
  const posterRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GardenEngine | null>(null);
  const [live, setLive] = useState(false);

  useLayoutEffect(() => {
    const canvas = canvasRef.current!;
    selfDissolving.element = canvas;
    const stop = watchDeviceSize(canvas, (w, h) => placeScene(sectionRef.current!, posterRef.current!, canvas, w, h));
    return () => {
      stop();
      selfDissolving.element = null;
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current!;
    let gone = false;
    const cleanups: (() => void)[] = [];
    // While the canvas is live the garden dissolves itself on a split switch; otherwise the page overlay covers the poster.
    const onLive = (now: boolean) => {
      selfDissolving.live = now;
      setLive(now);
    };

    // The poster and the copy are on screen before the engine is even requested.
    const cancelStart = afterPaint(async () => {
      // The sprites are asked for at the same moment as the engine, not after it has arrived.
      const atlas = loadAtlas(`${import.meta.env.BASE_URL}art/atlas`);
      try {
        const { createGardenEngine } = await import('./engine');
        if (gone) throw new Error('unmounted');
        const { split: startSplit, motion: startMotion } = getSplitState();
        const engine = await createGardenEngine(canvas, { split: startSplit, motion: startMotion, onLive, atlas });
        if (gone) return engine.destroy();
        engineRef.current = engine;
        cleanups.push(() => engine.destroy());
        // Catch up with anything that changed while the atlas was loading.
        engine.setSplit(getSplitState().split);
        engine.setMotion(getSplitState().motion);
        // The ?dissolve= switch. Past the swap the garden has finished turning, so there is nothing to hold.
        const held = heldDissolve(getSplitState().split);
        if (held?.covering) engine.transition(held.to, originFor(held.to, null), COVER_MS, held.local);

        // Layers follow a mouse. Touch is left alone: a finger on the scene is someone scrolling.
        const follow = (event: PointerEvent) => {
          if (event.pointerType !== 'mouse') return;
          const box = canvas.getBoundingClientRect();
          engine.setPointer(((event.clientX - box.left) / box.width) * 2 - 1, ((event.clientY - box.top) / box.height) * 2 - 1);
        };
        window.addEventListener('pointermove', follow, { passive: true });
        cleanups.push(() => window.removeEventListener('pointermove', follow));
      } catch (error) {
        // No WebGL2, or the atlas did not load: the poster is the scene. No engine took the sprites, so let them go.
        atlas.then((loaded) => loaded.image.close()).catch(() => {});
        if (import.meta.env.DEV && !gone) console.warn('garden engine not started:', error);
      }
    });

    return () => {
      gone = true;
      cancelStart();
      cleanups.forEach((cleanup) => cleanup());
      engineRef.current = null;
      onLive(false);
    };
  }, []);

  // While the rest of the page is being covered the garden dissolves, in step with the cover. Anything else is
  // a cut. A layout effect, so that the garden and the cover start in the same frame.
  useLayoutEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    if (phase === 'covering' && target) engine.transition(target, originFor(target, origin), COVER_MS);
    else if (phase === 'idle') engine.setSplit(split);
  }, [split, phase, target, origin]);

  useEffect(() => {
    engineRef.current?.setMotion(motion);
  }, [motion]);

  return (
    <section
      ref={sectionRef}
      id="top"
      className="hero relative min-h-svh overflow-hidden bg-bg-2"
      style={heroVars}
      data-phase={phase}
    >
      <div className="garden" aria-hidden="true">
        <img
          ref={posterRef}
          className="garden-poster"
          src={`${import.meta.env.BASE_URL}art/poster-${split}.png`}
          width={POSTER.width}
          height={POSTER.height}
          alt=""
          // the first thing a visitor sees: it goes ahead of every other picture on the page
          fetchPriority="high"
          draggable={false}
        />
        <canvas ref={canvasRef} className="garden-canvas" style={{ visibility: live ? 'visible' : 'hidden' }} />
      </div>
      <div className="hero-copy hero-swap">
        <Text as="h1" copy={hero.line} className="lowercase" />
        <Text as="p" copy={hero.sub} />
      </div>
    </section>
  );
}
