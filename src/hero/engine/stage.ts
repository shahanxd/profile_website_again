import type { SplitId } from '../../split/types';
import type { Anim, Drift, Emitter, Scene, Sway, Vec2 } from '../scene/types';

/**
 * Turns the manifest into what is drawn: for one staging, the list of sprites
 * and particle sources in draw order, and for a moment in time, where each
 * sprite is and which frame it shows. Everything here is plain arithmetic on
 * the clock, so the same time always gives the same picture; the poster
 * script relies on that.
 *
 * No imports with code here: the art scripts load this file directly in Node.
 */

/** One sprite in the atlas: a strip of `frames` frames, each w x h, starting at (x, y). */
export interface SpriteRect {
  x: number;
  y: number;
  w: number;
  h: number;
  frames: number;
  anchor: Vec2;
  points: Record<string, Vec2>;
}

/** public/art/atlas.json, as written by scripts/pack-atlas.mjs. */
export interface AtlasData {
  version: string;
  size: Vec2;
  colors: Record<string, string>;
  sprites: Record<string, SpriteRect>;
}

/** A layer resolved for one staging. x and y are the sprite's top-left at rest, in world pixels. */
export interface Item {
  sprite: SpriteRect;
  /** The same sprite in daylight colours, shown where lamplight falls on it. The sprite itself when it has no other form. */
  lit: SpriteRect;
  x: number;
  y: number;
  depth: number;
  parent: Item | null;
  anim?: Anim;
  sway?: Sway;
  drift?: Drift;
  /** Fixed per layer, so its uneven timing is the same on every run. */
  seed: number;
}

/** An emitter resolved for one staging. particles.ts decides where its particles are. */
export interface Source {
  emitter: Emitter;
  sprite: SpriteRect;
  /** The layer the particles follow and the point on its sprite they start from, when the emitter names one. */
  parent: Item | null;
  point: Vec2;
  seed: number;
}

/** Writes a source's particles into `out` from index `at`; (x, y) is where the emitter's world origin sits in the view. Returns the next index. */
export type Emit = (source: Source, t: number, x: number, y: number, out: Int16Array, at: number) => number;

interface StageLight {
  x: number;
  y: number;
  radius: Vec2;
  depth: number;
  flame: Item | null;
  strength: number[];
}

export interface Stage {
  /** Back to front. */
  entries: (Item | Source)[];
  /** The most instances this stage ever writes. */
  capacity: number;
  light: StageLight | null;
  /** Hotspot id to the layer it sits on, its corner within that sprite, and its size. */
  hotspots: Record<string, { item: Item; point: Vec2; size: Vec2 }>;
  /** Layers and emitters left out because their sprite, parent or point does not exist. */
  missing: string[];
}

/**
 * Whole numbers per sprite sent to the GPU: x, y, w, h on screen, the frame's
 * corner in the atlas, then the corner of the same frame in daylight colours.
 */
export const INSTANCE_SIZE = 8;

/** Whole numbers that describe the lamplight for one frame: centre x, y in view pixels, radii, and strength out of 64. */
export const LIGHT_SIZE = 5;

export function buildStage(scene: Scene, split: SplitId, atlas: AtlasData): Stage {
  const missing: string[] = [];
  const here = <T extends { in?: SplitId[] }>(thing: T) => !thing.in || thing.in.includes(split);
  const layers = new Map(
    scene.layers
      .map((layer, index) => ({ ...layer, ...layer.when?.[split], seed: index + 1 }))
      .filter(here)
      .map((layer) => [layer.id, layer]),
  );
  const done = new Map<string, Item | null>();

  // A layer may hang off another, so parents are resolved on demand, whatever order the manifest lists them in.
  const resolve = (id: string): Item | null => {
    const known = done.get(id);
    if (known !== undefined) return known;
    done.set(id, null); // guards against a layer attached to itself
    const layer = layers.get(id);
    // The staging's own sprite when there is one, otherwise the shared sprite.
    const shared = layer && atlas.sprites[layer.sprite];
    const sprite = (layer && atlas.sprites[`${layer.sprite}.${split}`]) ?? shared;
    if (!layer || !sprite) return null;

    let parent: Item | null = null;
    let [x, y] = layer.at;
    if (layer.attachTo) {
      parent = resolve(layer.attachTo.layer);
      const point = parent?.sprite.points[layer.attachTo.point];
      if (!parent || !point) return null;
      x += parent.x + point[0];
      y += parent.y + point[1];
    }
    const item: Item = {
      sprite,
      // A shared sprite baked for dusk still has its daylight form in the atlas, pixel for pixel.
      lit: shared && shared.w === sprite.w && shared.h === sprite.h && shared.frames === sprite.frames ? shared : sprite,
      x: x - sprite.anchor[0],
      y: y - sprite.anchor[1],
      depth: parent ? parent.depth : layer.depth,
      parent,
      anim: layer.anim,
      sway: layer.sway,
      drift: layer.drift,
      seed: layer.seed,
    };
    done.set(id, item);
    return item;
  };

  const drawn: { entry: Item | Source; z: number; order: number }[] = [];
  let capacity = 0;
  for (const layer of layers.values()) {
    const item = resolve(layer.id);
    if (item) drawn.push({ entry: item, z: layer.z, order: layer.seed });
    else missing.push(layer.id);
    capacity += item ? 1 : 0;
  }
  scene.emitters.filter(here).forEach((emitter, index) => {
    const sprite = atlas.sprites[`${emitter.sprite}.${split}`] ?? atlas.sprites[emitter.sprite];
    const parent = emitter.from ? resolve(emitter.from.layer) : null;
    const point = emitter.from ? parent?.sprite.points[emitter.from.point] : ([0, 0] as Vec2);
    if (!sprite || !point) return missing.push(emitter.id);
    // Seeds are spaced out so no two particles in the scene share a stream of random numbers.
    const seed = (scene.layers.length + index + 1) * 64;
    drawn.push({ entry: { emitter, sprite, parent, point, seed }, z: emitter.z, order: seed });
    capacity += emitter.count;
  });
  drawn.sort((a, b) => a.z - b.z || a.order - b.order);

  const lamp = scene.lights.find(here);
  const light = lamp && {
    x: lamp.at[0],
    y: lamp.at[1],
    radius: lamp.radius,
    depth: lamp.depth,
    flame: lamp.flame ? resolve(lamp.flame.layer) : null,
    strength: lamp.flame?.strength ?? [1],
  };

  const hotspots: Stage['hotspots'] = {};
  for (const spot of scene.hotspots) {
    const item = resolve(spot.layer);
    const point = item?.sprite.points[spot.point];
    if (item && point) hotspots[spot.id] = { item, point, size: spot.size };
  }

  return { entries: drawn.map((d) => d.entry), capacity, light: light ?? null, hotspots, missing };
}

/** A repeatable number from 0 up to 1 for a pair of whole numbers. */
export function hash(a: number, b: number): number {
  let h = Math.imul(a, 374761393) + Math.imul(b, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export function frameAt(anim: Anim | undefined, frames: number, t: number, seed: number): number {
  if (!anim || frames < 2) return 0;
  const step = Math.floor(t * anim.fps);
  if (anim.mode === 'loop') return step % frames;
  if (anim.mode === 'pingpong') {
    const there = step % (frames * 2 - 2);
    return there < frames ? there : frames * 2 - 2 - there;
  }
  // flicker: any frame, but the very first step rests, so the still frame shows the flame steady
  if (anim.mode === 'flicker') return step ? Math.floor(hash(seed, step) * frames) : 0;
  // random-hold: time is cut into cycles, and the strip plays once somewhere inside each cycle.
  const play = frames / anim.fps;
  const cycle = Math.max(anim.every, play);
  const n = Math.floor(t / cycle);
  const start = n * cycle + hash(seed, n) * (cycle - play);
  const frame = Math.floor((t - start) * anim.fps);
  return frame > 0 && frame < frames ? frame : 0;
}

/** How far an item is from its resting place right now, along one axis (0 = x, 1 = y), in whole pixels. */
export function moved(item: Item, axis: 0 | 1, t: number, shift: Vec2): number {
  let d = 0;
  if (item.sway) {
    const phase = hash(item.seed, 7);
    d += Math.round(item.sway.by[axis] * Math.sin((t / item.sway.period + phase) * Math.PI * 2));
  }
  if (item.parent) return d + moved(item.parent, axis, t, shift);
  // Rounded per layer, so parallax moves each layer by whole art pixels.
  d += Math.round(shift[axis] * item.depth);
  if (item.drift && axis === 0) {
    const [from, to] = item.drift.span;
    const travelled = item.x - from + Math.floor(t / item.drift.secondsPerPixel);
    d += from + (travelled % (to - from)) - item.x;
  }
  return d;
}

/**
 * Writes one instance per sprite into `out` for time `t`, and returns how many.
 * `shift` is how far a depth-1 layer is pushed by the pointer, in art pixels;
 * `camera` is the world position of the view's top-left. Particles are written
 * only when `emit` is given: the still frame and the poster have none.
 */
export function writeInstances(stage: Stage, t: number, shift: Vec2, camera: Vec2, out: Int16Array, emit?: Emit): number {
  let at = 0;
  for (const entry of stage.entries) {
    if ('emitter' in entry) {
      if (!emit) continue;
      const { parent, point, emitter } = entry;
      const x = parent ? parent.x + point[0] + moved(parent, 0, t, shift) : Math.round(shift[0] * emitter.depth);
      const y = parent ? parent.y + point[1] + moved(parent, 1, t, shift) : Math.round(shift[1] * emitter.depth);
      at = emit(entry, t, x - camera[0], y - camera[1], out, at);
      continue;
    }
    const { sprite, lit } = entry;
    const frame = frameAt(entry.anim, sprite.frames, t, entry.seed) * sprite.w;
    out[at++] = entry.x + moved(entry, 0, t, shift) - camera[0];
    out[at++] = entry.y + moved(entry, 1, t, shift) - camera[1];
    out[at++] = sprite.w;
    out[at++] = sprite.h;
    out[at++] = sprite.x + frame;
    out[at++] = sprite.y;
    out[at++] = lit.x + frame;
    out[at++] = lit.y;
  }
  return at / INSTANCE_SIZE;
}

/** Writes the stage's lamplight for time `t` into `out` (LIGHT_SIZE numbers). Strength 0 means there is none. */
export function writeLight(stage: Stage, t: number, shift: Vec2, camera: Vec2, out: Int32Array) {
  const { light } = stage;
  out.fill(0);
  if (!light) return;
  const frame = light.flame ? frameAt(light.flame.anim, light.flame.sprite.frames, t, light.flame.seed) : 0;
  out[0] = light.x + Math.round(shift[0] * light.depth) - camera[0];
  out[1] = light.y + Math.round(shift[1] * light.depth) - camera[1];
  out[2] = light.radius[0];
  out[3] = light.radius[1];
  out[4] = Math.round(64 * (light.strength[frame] ?? 1));
}

/**
 * Whether view pixel (x, y) is lit. `bayer` is the pixel's ordered-dither value
 * (0..63) at (x - light[0], y - light[1]), so the pattern travels with the
 * ground. Whole numbers only: the sprite shader does the same sum and the two
 * must agree on every pixel.
 */
export function inLight(light: Int32Array, x: number, y: number, bayer: number): boolean {
  const dx = x - light[0];
  const dy = y - light[1];
  const [, , rx, ry, strength] = light;
  const full = rx * rx * ry * ry;
  const q = dx * dx * ry * ry + dy * dy * rx * rx;
  // brightest in the middle, thinning to nothing at the rim
  return q < full && 2 * strength * (full - q) > (2 * bayer + 1) * full;
}

/** Where a hotspot is at time `t`: x, y, width, height in world pixels. */
export function hotspotAt(stage: Stage, id: string, t: number, shift: Vec2): [number, number, number, number] | null {
  const spot = stage.hotspots[id];
  if (!spot) return null;
  const { item, point, size } = spot;
  return [item.x + point[0] + moved(item, 0, t, shift), item.y + point[1] + moved(item, 1, t, shift), size[0], size[1]];
}
