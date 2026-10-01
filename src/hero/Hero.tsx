import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { Text } from '../components/Text';
import { site } from '../content/site';
import { getSplitState, useSplit } from '../split/store';
import type { GardenEngine } from './engine';
import { frameView, watchDeviceSize } from './engine/camera';
import { framing } from './scene/framing';
import './hero.css';

const percent = (fraction: number) => `${fraction * 100}%`;

// framing.ts, handed to hero.css so the scene is already in place before any script runs.
const framingVars = {
  '--world-w': framing.world[0],
  '--poster-h': framing.poster.height,
  '--focus-x': framing.focus[0],
  '--focus-y': framing.focus[1] - framing.poster.top,
  '--floor': framing.floor - framing.poster.top,
  '--land-h': framing.landscape.height,
  '--land-x': percent(framing.landscape.target[0]),
  '--land-y': percent(framing.landscape.target[1]),
  '--port-w': framing.portrait.width,
  '--port-x': percent(framing.portrait.target[0]),
  '--port-y': percent(framing.portrait.target[1]),
  '--port-from': framing.portrait.span[0],
  '--port-to': framing.portrait.span[1],
} as CSSProperties;

/**
 * Puts the poster on exactly the pixel grid the canvas uses, so the canvas can
 * take over without a jump, and gives the stylesheet the true size of an art pixel.
 */
function placeScene(hero: HTMLElement, poster: HTMLImageElement, canvas: HTMLCanvasElement, deviceW: number, deviceH: number) {
  if (!deviceW || !deviceH) return;
  const view = frameView(deviceW, deviceH, framing);
  const cssPerArt = (canvas.getBoundingClientRect().width / deviceW) * view.k;
  hero.style.setProperty('--k', `${cssPerArt}px`);
  poster.style.left = `${-view.x * cssPerArt}px`;
  poster.style.top = `${(framing.poster.top - view.y) * cssPerArt}px`;
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
  const { split, motion } = useSplit();
  const hero = site[split].hero;
  const sectionRef = useRef<HTMLElement>(null);
  const posterRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GardenEngine | null>(null);
  const onScreen = useRef(true);
  const [live, setLive] = useState(false);

  // The scene runs only while it can be seen, and not at all for visitors who have asked for stillness.
  const syncPaused = () => engineRef.current?.setPaused(!onScreen.current || !getSplitState().motion);

  useLayoutEffect(() => {
    const canvas = canvasRef.current!;
    return watchDeviceSize(canvas, (w, h) => placeScene(sectionRef.current!, posterRef.current!, canvas, w, h));
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current!;
    let gone = false;
    const cleanups: (() => void)[] = [];

    // The poster and the copy are on screen before the engine is even requested.
    const cancelStart = afterPaint(async () => {
      try {
        const { createGardenEngine } = await import('./engine');
        if (gone) return;
        const engine = await createGardenEngine(canvas, { split: getSplitState().split, onLive: setLive });
        if (gone) return engine.destroy();
        engineRef.current = engine;
        cleanups.push(() => engine.destroy());
        engine.setSplit(getSplitState().split); // in case it changed while the atlas was loading
        syncPaused();

        // Layers follow a mouse. Touch is left alone: a finger on the scene is someone scrolling.
        const follow = (event: PointerEvent) => {
          if (event.pointerType !== 'mouse') return;
          const box = canvas.getBoundingClientRect();
          engine.setPointer(((event.clientX - box.left) / box.width) * 2 - 1, ((event.clientY - box.top) / box.height) * 2 - 1);
        };
        window.addEventListener('pointermove', follow, { passive: true });
        cleanups.push(() => window.removeEventListener('pointermove', follow));
      } catch (error) {
        // No WebGL2, or the atlas did not load: the poster is the scene.
        if (import.meta.env.DEV) console.warn('garden engine not started:', error);
      }
    });

    const watcher = new IntersectionObserver(([entry]) => {
      onScreen.current = entry.isIntersecting;
      syncPaused();
    });
    watcher.observe(sectionRef.current!);

    return () => {
      gone = true;
      cancelStart();
      watcher.disconnect();
      cleanups.forEach((cleanup) => cleanup());
      engineRef.current = null;
      setLive(false);
    };
  }, []);

  useEffect(() => {
    engineRef.current?.setSplit(split);
    syncPaused();
  }, [split, motion]);

  return (
    <section ref={sectionRef} id="top" className="hero relative min-h-svh overflow-hidden bg-bg-2" style={framingVars}>
      <div className="garden" aria-hidden="true">
        <img
          ref={posterRef}
          className="garden-poster"
          src={`${import.meta.env.BASE_URL}art/poster-${split}.png`}
          width={framing.world[0]}
          height={framing.poster.height}
          alt=""
          draggable={false}
        />
        <canvas ref={canvasRef} className="garden-canvas" style={{ visibility: live ? 'visible' : 'hidden' }} />
      </div>
      <div className="hero-copy">
        <Text as="h1" copy={hero.line} className="lowercase" />
        <Text as="p" copy={hero.sub} />
      </div>
    </section>
  );
}
