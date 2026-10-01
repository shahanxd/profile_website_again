import { BLOCK, spreadFrom, type Spread } from '../../split/dissolve';
import type { SplitId } from '../../split/types';
import { framing as defaultFraming } from '../scene/framing';
import { scene as defaultScene } from '../scene/manifest';
import type { Framing, Scene, Vec2 } from '../scene/types';
import { loadAtlas } from './atlas';
import { backdropStrip } from './backdrop';
import { frameView, watchDeviceSize, type View } from './camera';
import { createLoop } from './clock';
import { createReadout, exposeForDebug, readSwitches } from './debug';
import { getContext, watchContext } from './gl';
import { createEmit } from './particles';
import { createRenderer } from './passes';
import { pickQuality, TIERS } from './quality';
import { buildStage, hotspotAt, INSTANCE_SIZE, LIGHT_SIZE, writeInstances, writeLight } from './stage';

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
  /** Address of the atlas without its extension. */
  atlas?: string;
}

/** Where the scene currently sits on the page, for laying DOM over it. */
export interface Layout {
  /** Each hotspot in the manifest: x, y, width, height in CSS pixels from the canvas's top-left. */
  hotspots: Record<string, [number, number, number, number]>;
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
  /** World position to CSS pixels from the canvas's top-left, following parallax for a layer of that depth. */
  project(worldX: number, worldY: number, depth?: number): Vec2;
  /** Runs now and whenever the framing, the staging or the whole-pixel parallax changes. Returns a function that stops it. */
  onLayout(callback: (layout: Layout) => void): () => void;
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
  const atlas = await loadAtlas(options.atlas ?? `${import.meta.env.BASE_URL}art/atlas`);

  const stages = { creative: buildStage(scene, 'creative', atlas), tech: buildStage(scene, 'tech', atlas) };
  const strips = {
    creative: backdropStrip(scene.backdrop.creative, atlas.colors),
    tech: backdropStrip(scene.backdrop.tech, atlas.colors),
  };
  for (const [name, stage] of Object.entries(stages)) {
    if (stage.missing.length) console.warn(`garden: no sprite for ${stage.missing.join(', ')} (${name})`);
  }

  // Two of each: [0] is the staging on show, [1] the one a dissolve is heading for.
  const capacity = Math.max(stages.creative.capacity, stages.tech.capacity) * INSTANCE_SIZE;
  const instances = [new Int16Array(capacity), new Int16Array(capacity)];
  const lights = [new Int32Array(LIGHT_SIZE), new Int32Array(LIGHT_SIZE)];
  // What the canvas currently shows, to tell whether a frame would look any different.
  const shown = { instances: new Int16Array(capacity), count: -1, light: new Int32Array(LIGHT_SIZE) };
  const deepest = Math.max(...scene.layers.map((layer) => layer.depth));
  const emit = createEmit(tier.particles);

  let renderer = createRenderer(gl, atlas, strips);
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
  const shiftShown: Vec2 = [0, 0];
  const layoutListeners = new Set<(layout: Layout) => void>();

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
    // Near the painted world's side edges there is less room to slide, so the whole effect is scaled down.
    const room = Math.min(1, view.slack / (framing.parallax[0] * deepest));
    shift[0] = -pointer.x * framing.parallax[0] * room;
    shift[1] = -pointer.y * framing.parallax[1];
  }

  const sceneTime = () => (still() ? 0 : time);

  function layout(): Layout | null {
    if (!view) return null;
    const scale = view.k * cssPerDevice;
    const hotspots: Layout['hotspots'] = {};
    for (const id of Object.keys(stages[split].hotspots)) {
      const [x, y, w, h] = hotspotAt(stages[split], id, sceneTime(), shift)!;
      hotspots[id] = [(x - view.x) * scale, (y - view.y) * scale, w * scale, h * scale];
    }
    return { hotspots };
  }

  function notifyLayout() {
    const now = layout();
    if (now) layoutListeners.forEach((listener) => listener(now));
  }

  /** The dissolve has arrived: its target is now simply the staging on show. */
  function land() {
    if (!dissolve) return;
    split = dissolve.to;
    dissolve = null;
    stale = true;
    notifyLayout();
  }

  /** Fills instances[slot] and lights[slot] for a staging, and returns the instance count. */
  function compose(slot: 0 | 1, staging: SplitId): number {
    const camera: Vec2 = [view!.x, view!.y];
    const t = sceneTime();
    writeLight(stages[staging], t, shift, camera, lights[slot]);
    return writeInstances(stages[staging], t, shift, camera, instances[slot], still() ? undefined : emit);
  }

  function render() {
    if (!view || gl.isContextLost()) return;
    const began = performance.now();
    if (dissolve && dissolve.hold === undefined && began - dissolve.start >= dissolve.duration) land();
    updateShift();
    const count = compose(0, split);

    // Most frames of a pixel scene are identical to the last one. When nothing has moved, leave the GPU alone.
    let changed = stale || dissolve !== null || count !== shown.count;
    for (let i = 0; !changed && i < LIGHT_SIZE; i++) changed = lights[0][i] !== shown.light[i];
    for (let i = 0; !changed && i < count * INSTANCE_SIZE; i++) changed = instances[0][i] !== shown.instances[i];
    if (changed) {
      renderer.calls = 0;
      renderer.paint(0, split, view, instances[0], count, lights[0]);
      let fade: { progress: number; spread: Spread } | undefined;
      if (dissolve) {
        renderer.paint(1, dissolve.to, view, instances[1], compose(1, dissolve.to), lights[1]);
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
      shown.light.set(lights[0]);
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
    if (Math.round(shift[0]) !== shiftShown[0] || Math.round(shift[1]) !== shiftShown[1]) {
      shiftShown[0] = Math.round(shift[0]);
      shiftShown[1] = Math.round(shift[1]);
      notifyLayout();
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
    const perDevice = canvas.getBoundingClientRect().width / width;
    const sameSize = view && width === canvas.width && height === canvas.height;
    if (sameSize && perDevice === cssPerDevice) return;
    // Browser zoom changes the CSS pixel and leaves the canvas as it was: only what is laid over it has to move.
    cssPerDevice = perDevice;
    if (!sameSize) {
      canvas.width = width;
      canvas.height = height;
      view = frameView(width, height, framing);
      renderer.resize(view);
      // Setting the size clears the canvas; draw again before the browser paints.
      stale = true;
      render();
    }
    notifyLayout();
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
      renderer = createRenderer(gl, atlas, strips);
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
      notifyLayout();
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

    project(worldX, worldY, depth = 0) {
      if (!view) return [0, 0];
      const scale = view.k * cssPerDevice;
      return [
        (worldX - view.x + Math.round(shift[0] * depth)) * scale,
        (worldY - view.y + Math.round(shift[1] * depth)) * scale,
      ];
    },

    onLayout(callback) {
      layoutListeners.add(callback);
      const now = layout();
      if (now) callback(now);
      return () => layoutListeners.delete(callback);
    },

    destroy() {
      loop.stop();
      watcher.disconnect();
      document.removeEventListener('visibilitychange', sync);
      stopWatchingSize();
      stopWatchingContext();
      layoutListeners.clear();
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
