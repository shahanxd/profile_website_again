import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { Text } from '../components/Text';
import { site } from '../content/site';
import { BLOCK, COVER_MS, heldDissolve, originFor, REVEAL_MS, selfDissolving } from '../split/dissolve';
import { getSplitState, useSplit } from '../split/store';
import type { GardenEngine } from './engine';
import { frameView, watchDeviceSize } from './engine/camera';
import { framing } from './scene/framing';
import { MENU_MIN_WIDTH, TabletMenu } from './TabletMenu';
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
  // Scaled and moved as a transform, from its natural size. The stylesheet's way (left, top, width and height)
  // goes through layout, which keeps lengths to 1/64 px and, in some browser modes, snaps boxes to whole CSS
  // pixels: in Chrome's phone emulation at a pixel ratio of 3 that put the poster one device pixel below the
  // canvas. A transform is applied as given.
  Object.assign(poster.style, {
    left: '0',
    top: '0',
    width: `${framing.world[0]}px`,
    height: `${framing.poster.height}px`,
    transformOrigin: '0 0',
    transform: `translate(${-view.x * cssPerArt}px, ${(framing.poster.top - view.y) * cssPerArt}px) scale(${cssPerArt})`,
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
  // The size of the tablet prop's screen in CSS pixels, when it is big enough to carry the menu.
  const [menu, setMenu] = useState<[number, number] | null>(null);

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
        const { split: startSplit, motion: startMotion } = getSplitState();
        const engine = await createGardenEngine(canvas, { split: startSplit, motion: startMotion, onLive });
        if (gone) return engine.destroy();
        engineRef.current = engine;
        cleanups.push(() => engine.destroy());
        // Catch up with anything that changed while the atlas was loading.
        engine.setSplit(getSplitState().split);
        engine.setMotion(getSplitState().motion);
        // The ?dissolve= switch. Past the swap the garden has finished turning, so there is nothing to hold.
        const held = heldDissolve(getSplitState().split);
        if (held?.covering) engine.transition(held.to, originFor(held.to, null), COVER_MS, held.local);

        engine.onLayout(({ hotspots }) => {
          const screen = hotspots.menu;
          if (!screen) return setMenu(null);
          // The screen moves with the pointer. Its place goes straight to the stylesheet, so the menu steps in the
          // same frame as the canvas; React only hears about its size, which changes with the window alone.
          sectionRef.current?.style.setProperty('--menu-x', `${screen[0]}px`);
          sectionRef.current?.style.setProperty('--menu-y', `${screen[1]}px`);
          const [x, y, width, height] = screen;
          // No menu where the screen is too small to read, or out of frame (a tall window does not show the prop at all).
          const usable = width >= MENU_MIN_WIDTH && x >= 0 && y >= 0 && x + width <= canvas.clientWidth && y + height <= canvas.clientHeight;
          setMenu((was) => (!usable ? null : was && was[0] === width && was[1] === height ? was : [width, height]));
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
      {live && menu && <TabletMenu split={split} size={menu} />}
    </section>
  );
}
