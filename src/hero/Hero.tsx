import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { Text } from '../components/Text';
import { site } from '../content/site';
import { BLOCK, COVER_MS, heldDissolve, originFor, REVEAL_MS, selfDissolving, TOTAL_MS } from '../split/dissolve';
import { getSplitState, useSplit } from '../split/store';
import type { GardenEngine } from './engine';
import { frameView, watchDeviceSize } from './engine/camera';
import { framing } from './scene/framing';
import { MENU_MIN_WIDTH, TabletMenu, type MenuBox } from './TabletMenu';
import './hero.css';

const percent = (fraction: number) => `${fraction * 100}%`;

// framing.ts and the switch timings, handed to hero.css so the scene is already in place before any script runs.
const heroVars = {
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
  '--cover-ms': `${COVER_MS}ms`,
  '--reveal-ms': `${REVEAL_MS}ms`,
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
  // Where the tablet prop's screen is, when it is big enough to carry the menu.
  const [menu, setMenu] = useState<MenuBox | null>(null);

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
      try {
        const { createGardenEngine } = await import('./engine');
        if (gone) return;
        const held = heldDissolve(getSplitState().split); // the ?dissolve= switch
        const start = held?.from ?? getSplitState().split;
        const engine = await createGardenEngine(canvas, { split: start, motion: getSplitState().motion, onLive });
        if (gone) return engine.destroy();
        engineRef.current = engine;
        cleanups.push(() => engine.destroy());
        // Catch up with anything that changed while the atlas was loading.
        if (held) engine.transition(held.to, originFor(held.to, null), TOTAL_MS);
        else engine.setSplit(getSplitState().split);
        engine.setMotion(getSplitState().motion);

        engine.onLayout(({ hotspots }) => {
          const next = hotspots.menu && hotspots.menu[2] >= MENU_MIN_WIDTH ? hotspots.menu : null;
          setMenu((was) => (was && next && was.every((value, i) => value === next[i]) ? was : next));
        });

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

    return () => {
      gone = true;
      cancelStart();
      cleanups.forEach((cleanup) => cleanup());
      engineRef.current = null;
      onLive(false);
      setMenu(null);
    };
  }, []);

  // A switch with a cover and a reveal is one dissolve in the garden, start to finish. Anything else is a cut.
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    if (phase === 'covering' && target) engine.transition(target, originFor(target, origin), TOTAL_MS);
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
          width={framing.world[0]}
          height={framing.poster.height}
          alt=""
          draggable={false}
        />
        <canvas ref={canvasRef} className="garden-canvas" style={{ visibility: live ? 'visible' : 'hidden' }} />
      </div>
      <div className="hero-copy hero-swap">
        <Text as="h1" copy={hero.line} className="lowercase" />
        <Text as="p" copy={hero.sub} />
      </div>
      {live && menu && <TabletMenu split={split} box={menu} />}
    </section>
  );
}
