import { BLOCK, spreadFrom, type Spread } from '../../split/dissolve';
import type { SplitId } from '../../split/types';
import { framing as defaultFraming } from '../scene/framing';
import { scene as defaultScene } from '../scene/manifest';
import type { Framing, Scene, Vec2 } from '../scene/types';
import { loadAtlas, type LoadedAtlas } from './atlas';
import { frameView, isPortrait, watchDeviceSize, type View } from './camera';
import { createLoop } from './clock';
import { createReadout, exposeForDebug, readSwitches } from './debug';
import { getContext, watchContext } from './gl';
import { createEmit } from './particles';
import { createRenderer } from './passes';
import { pickQuality, TIERS } from './quality';
import { buildStage, INSTANCE_SIZE, writeInstances } from './stage';

/**
 * The garden engine: draws the scene described by the manifest into a canvas,
 * at art resolution, scaled up by a whole number.
 */

export interface GardenOptions {
  split: SplitId;
  /** False for visitors who want stillness. See setMotion. */
  motion?: boolean;
  /** Called with true once the canvas shows a finished frame, and with false if the GPU context is lost. */
  onLive?: (live: boolean) => void;
  scene?: Scene;
  framing?: Framing;
  /** The atlas, if the host has already started loading it (see loadAtlas). The engine closes its image when it is destroyed. */
  atlas?: Promise<LoadedAtlas>;
}

export interface GardenEngine {
  /** Switch staging at once. */
  setSplit(split: SplitId): void;
  /**
   * Switch staging with the pixel dissolve, spreading from `origin`: a point in the window, in CSS pixels
   * (what a click reports), or null for the middle of the canvas. If the scene cannot be seen the dissolve
   * waits; call setSplit when the switch is over to make sure of the result. With `holdAt` (0..1) the
   * dissolve stays at that point instead of running: the ?dissolve= switch.
   */
  transition(to: SplitId, origin: Vec2 | null, durationMs: number, holdAt?: number): void;
  /** Where the pointer is over the scene, -1..1 each way, (0, 0) at the centre. */
  setPointer(x: number, y: number): void;
  /** Stop and start the clock. The engine already stops by itself while it is off screen or the tab is hidden. */
  setPaused(paused: boolean): void;
  /** With motion off the scene is one still frame: no clock, no parallax, no particles. The poster shows the same frame. */
  setMotion(on: boolean): void;
  /** Measure the canvas again. Size changes are noticed without this; it is here for hosts that know better. */
  resize(): void;
  /** Stops everything and frees everything on the GPU. The canvas can be given to a new engine afterwards. */
  destroy(): void;
}

const clamp1 = (value: number) => Math.min(Math.max(value, -1), 1);

export async function createGardenEngine(canvas: HTMLCanvasElement, options: GardenOptions): Promise<GardenEngine> {
  const scene = options.scene ?? defaultScene;
  const framing = options.framing ?? defaultFraming;
  const switches = readSwitches(location.search);
  const quality = pickQuality(switches.quality);
  const tier = TIERS[quality];
  const frozen = switches.freeze !== undefined;

  const gl = getContext(canvas);
  const atlas = await (options.atlas ?? loadAtlas(`${import.meta.env.BASE_URL}art/atlas`));

  const stages = { creative: buildStage(scene, 'creative', atlas), tech: buildStage(scene, 'tech', atlas) };
  for (const [name, stage] of Object.entries(stages)) {
    if (stage.missing.length) console.warn(`garden: no sprite for ${stage.missing.join(', ')} (${name})`);
  }

  // Two of each: [0] is the staging on show, [1] the one a dissolve is heading for.
  const capacity = Math.max(stages.creative.capacity, stages.tech.capacity) * INSTANCE_SIZE;
  const instances = [new Int16Array(capacity), new Int16Array(capacity)];
  // What the canvas currently shows, to tell whether a frame would look any different.
  const shown = { instances: new Int16Array(capacity), count: -1 };
  const deepest = Math.max(...scene.layers.map((layer) => layer.depth), ...scene.emitters.map((emitter) => emitter.depth));
  const emit = switches.air ? createEmit(tier.particles) : undefined;

  let renderer = createRenderer(gl, atlas);
  let split = options.split;
  let dissolve: { to: SplitId; origin: Vec2 | null; start: number; duration: number; hold?: number } | null = null;
  let view: View | null = null;
  let cssPerDevice = 1;
  let time = switches.freeze ?? 0; // seconds of scene time
  let motion = options.motion ?? true;
  let paused = false;
  let seen = true; // some of the canvas is on screen
  let live = false;
  let stale = true; // the canvas must be redrawn even if no sprite has moved

  // The pointer is eased towards its target so layers step across gently instead of snapping.
  const pointer = { x: 0, y: 0, toX: switches.pointer?.[0] ?? 0, toY: switches.pointer?.[1] ?? 0 };
  if (frozen) {
    // A frozen frame shows the pointer where it was asked to be, with no easing to wait for.
    pointer.x = pointer.toX;
    pointer.y = pointer.toY;
  }
  const shift: Vec2 = [0, 0];

  const readout = switches.debug ? createReadout(canvas) : null;
  const meter = { ticks: 0, draws: 0, cpu: 0, worst: 0, since: performance.now(), calls: 0, count: 0, rates: '', cost: '' };

  /** One still frame at time 0 with nothing in the air: weak devices, and visitors who have asked for stillness. */
  const still = () => !frozen && (tier.still || !motion);
  /** Scene time is passing. */
  const ticking = () => !frozen && !still() && !paused;
  /**
   * Runs the loop only while there is something to animate and someone to see it. A dissolve counts even when
   * it is held in place: its edge is measured from a point in the window, so it moves as the page scrolls.
   */
  function sync() {
    const was = loop.running;
    if ((ticking() || dissolve) && seen && !document.hidden && !gl.isContextLost()) loop.start();
    else loop.stop();
    if (readout && was !== loop.running) report();
  }

  function updateShift() {
    if (!view || still()) {
      shift[0] = shift[1] = 0;
      return;
    }
    // Near an edge of the painted world there is less room to slide, so the effect is scaled down that way:
    // no layer's edge, the plate's least of all, may come into view.
    for (const axis of [0, 1] as const) {
      const reach = framing.parallax[axis] * deepest;
      const room = reach > 0 ? Math.min(1, view.slack[axis] / reach) : 0;
      shift[axis] = -(axis ? pointer.y : pointer.x) * framing.parallax[axis] * room;
    }
  }

  const sceneTime = () => (still() ? 0 : time);

  /** The dissolve has arrived: its target is now simply the staging on show. */
  function land() {
    if (!dissolve) return;
    split = dissolve.to;
    dissolve = null;
    stale = true;
  }

  /** Fills instances[slot] for a staging, and returns the instance count. */
  function compose(slot: 0 | 1, staging: SplitId): number {
    return writeInstances(stages[staging], sceneTime(), shift, [view!.x, view!.y], instances[slot], still() ? undefined : emit);
  }

  function render() {
    if (!view || gl.isContextLost()) return;
    const began = performance.now();
    if (dissolve && dissolve.hold === undefined && began - dissolve.start >= dissolve.duration) land();
    updateShift();
    const count = compose(0, split);

    // Most frames of a pixel scene are identical to the last one. When nothing has moved, leave the GPU alone.
    let changed = stale || dissolve !== null || count !== shown.count;
    for (let i = 0; !changed && i < count * INSTANCE_SIZE; i++) changed = instances[0][i] !== shown.instances[i];
    if (changed) {
      renderer.calls = 0;
      renderer.paint(0, view, instances[0], count);
      let fade: { progress: number; spread: Spread } | undefined;
      if (dissolve) {
        renderer.paint(1, view, instances[1], compose(1, dissolve.to));
        // Measured every frame: the page may scroll under a dissolve, and its origin is a point in the window.
        const box = canvas.getBoundingClientRect();
        const origin = dissolve.origin ?? [box.left + box.width / 2, box.top + box.height / 2];
        fade = {
          progress: dissolve.hold ?? (began - dissolve.start) / dissolve.duration,
          spread: spreadFrom(origin, box.left, box.top, BLOCK * view.k * cssPerDevice),
        };
      }
      renderer.present(view, fade);
      shown.instances.set(instances[0]);
      shown.count = count;
      stale = false;
      if (!live) {
        live = true;
        options.onLive?.(true);
      }
      const took = performance.now() - began;
      meter.draws++;
      meter.cpu += took;
      meter.worst = Math.max(meter.worst, took);
      meter.calls = renderer.calls;
      meter.count = count;
    }
    if (readout) report();
  }

  /** The ?debug=1 readout. Rates are averaged over half a second; the frame time is of frames that were drawn. */
  function report() {
    const now = performance.now();
    // While the loop runs, wait for a full window. A stopped loop draws single frames: report each as it comes.
    if (meter.draws && (now - meter.since >= 500 || !loop.running)) {
      const seconds = Math.max(now - meter.since, 1) / 1000;
      meter.rates = `loop ${Math.round(meter.ticks / seconds)} fps · drawn ${Math.round(meter.draws / seconds)}/s`;
      meter.cost = `frame ${(meter.cpu / meter.draws).toFixed(2)} ms on the cpu, worst ${meter.worst.toFixed(2)}`;
      meter.ticks = meter.draws = meter.cpu = meter.worst = 0;
      meter.since = now;
    }
    if (!view) return;
    const mode = frozen ? ` · frozen at ${time}s` : still() ? ' · still' : '';
    const held = dissolve ? ` > ${dissolve.to}${dissolve.hold !== undefined ? ` held at ${dissolve.hold.toFixed(2)}` : ''}` : '';
    readout?.show([
      `${split}${held} · ${quality}${mode}`,
      `k ${view.k} · view ${view.w}x${view.h} at ${view.x},${view.y}`,
      `canvas ${canvas.width}x${canvas.height} device px`,
      loop.running ? meter.rates || 'loop starting' : 'loop stopped',
      meter.cost,
      `${meter.count} sprites and particles · ${meter.calls} draw calls`,
    ]);
  }

  const loop = createLoop(tier.fps, (dt) => {
    // Scene time and the pointer stand still during a dissolve between two still frames.
    if (ticking()) {
      time += dt;
      const ease = 1 - Math.exp(-dt / 0.12);
      pointer.x += (pointer.toX - pointer.x) * ease;
      pointer.y += (pointer.toY - pointer.y) * ease;
    }
    meter.ticks++;
    render();
    sync(); // a dissolve that has just landed may leave nothing to animate
  });

  function onSize(width: number, height: number) {
    if (!width || !height) return;
    // Browser zoom changes the CSS pixel and leaves the canvas as it was: only the dissolve's grid has to know.
    cssPerDevice = canvas.getBoundingClientRect().width / width;
    if (view && width === canvas.width && height === canvas.height) return;
    canvas.width = width;
    canvas.height = height;
    view = frameView(width, height, framing, isPortrait());
    renderer.resize(view);
    // Setting the size clears the canvas; draw again before the browser paints.
    stale = true;
    render();
  }

  let stopWatchingSize = watchDeviceSize(canvas, onSize);

  const stopWatchingContext = watchContext(
    canvas,
    () => {
      loop.stop();
      live = false;
      options.onLive?.(false);
    },
    () => {
      // Everything on the GPU went with the old context; build it again from what we kept.
      renderer = createRenderer(gl, atlas);
      if (view) renderer.resize(view);
      stale = true;
      render();
      sync();
    },
  );

  const watcher = new IntersectionObserver(([entry]) => {
    seen = entry.isIntersecting;
    sync();
  });
  watcher.observe(canvas);
  document.addEventListener('visibilitychange', sync);

  sync();

  const engine: GardenEngine = {
    setSplit(next) {
      if (next === split && !dissolve) return;
      dissolve = null;
      split = next;
      stale = true;
      render();
      sync();
    },

    transition(to, origin, durationMs, holdAt) {
      land(); // a dissolve already under way jumps to its end first
      if (to === split) return;
      if (durationMs <= 0) return engine.setSplit(to);
      dissolve = { to, origin, start: performance.now(), duration: durationMs, hold: holdAt };
      render();
      sync();
    },

    setPointer(x, y) {
      if (switches.pointer) return; // held by the ?pointer= switch
      pointer.toX = clamp1(x);
      pointer.toY = clamp1(y);
    },

    setPaused(next) {
      paused = next;
      sync();
    },

    setMotion(on) {
      if (on === motion) return;
      motion = on;
      stale = true;
      render();
      sync();
    },

    resize() {
      stopWatchingSize();
      stopWatchingSize = watchDeviceSize(canvas, onSize);
    },

    destroy() {
      loop.stop();
      watcher.disconnect();
      document.removeEventListener('visibilitychange', sync);
      stopWatchingSize();
      stopWatchingContext();
      renderer.dispose();
      atlas.image.close();
      readout?.destroy();
      if (switches.debug) exposeForDebug(null);
    },
  };

  if (switches.debug) {
    exposeForDebug({
      engine,
      /** Draws the frame again (moving scene time to `at` first, when given) and reads the canvas back: RGBA, rows from the bottom up. */
      snapshot(at?: number) {
        if (at !== undefined) time = at;
        stale = true;
        render();
        const pixels = new Uint8Array(canvas.width * canvas.height * 4);
        gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
        return { width: canvas.width, height: canvas.height, k: view?.k ?? 0, pixels };
      },
      /** For test scripts: whether the loop is running, scene time, and what the last drawn frame cost. */
      state: () => ({ running: loop.running, time, split, to: dissolve?.to ?? null, still: still(), calls: meter.calls }),
    });
  }

  return engine;
}
