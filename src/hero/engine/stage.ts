import type { SplitId } from '../../split/types';
import type { Anim, Emitter, Scene, Sway, Vec2 } from '../scene/types';

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
  /** Where the art places the sprite's anchor in the world: the painted scene's sprites have this. */
  at?: Vec2;
}

/** public/art/atlas.json, as written by scripts/pack-atlas.mjs. */
export interface AtlasData {
  version: string;
  size: Vec2;
  sprites: Record<string, SpriteRect>;
}

/** A layer resolved for one staging. x and y are the sprite's top-left at rest, in world pixels. */
export interface Item {
  sprite: SpriteRect;
  x: number;
  y: number;
  depth: number;
  parent: Item | null;
  anim?: Anim;
  sway?: Sway;
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

export interface Stage {
  /** Back to front. */
  entries: (Item | Source)[];
  /** The most instances this stage ever writes. */
  capacity: number;
  /** Layers and emitters left out because their sprite, parent or point does not exist. */
  missing: string[];
}

/** Whole numbers per sprite sent to the GPU: x, y, w, h on screen, then the frame's corner in the atlas. */
export const INSTANCE_SIZE = 6;

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
    const sprite = layer && (atlas.sprites[`${layer.sprite}.${split}`] ?? atlas.sprites[layer.sprite]);
    if (!layer || !sprite) return null;

    let parent: Item | null = null;
    // An attached layer is placed from its parent's point. Any other is where the manifest says, or where its art says.
    let [x, y] = layer.at ?? (layer.attachTo ? undefined : sprite.at) ?? [0, 0];
    if (layer.attachTo) {
      parent = resolve(layer.attachTo.layer);
      const point = parent?.sprite.points[layer.attachTo.point];
      if (!parent || !point) return null;
      x += parent.x + point[0];
      y += parent.y + point[1];
    }
    const item: Item = {
      sprite,
      x: x - sprite.anchor[0],
      y: y - sprite.anchor[1],
      depth: parent ? parent.depth : layer.depth,
      parent,
      anim: layer.anim,
      sway: layer.sway,
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

  return { entries: drawn.map((d) => d.entry), capacity, missing };
}

/** A repeatable number from 0 up to 1 for a pair of whole numbers. */
export function hash(a: number, b: number): number {
  let h = Math.imul(a, 374761393) + Math.imul(b, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export function frameAt(anim: Anim | undefined, frames: number, t: number, seed: number): number {
  if (!anim || frames < 2) return 0;
  if (anim.mode === 'random-hold') {
    // time is cut into cycles, and the strip plays once somewhere inside each cycle
    const play = frames / anim.fps;
    const cycle = Math.max(anim.every, play);
    const n = Math.floor(t / cycle);
    const start = n * cycle + hash(seed, n) * (cycle - play);
    const frame = Math.floor((t - start) * anim.fps);
    return frame > 0 && frame < frames ? frame : 0;
  }
  const step = Math.floor(t * anim.fps);
  if (anim.mode === 'loop') return step % frames;
  const there = step % (frames * 2 - 2);
  return there < frames ? there : frames * 2 - 2 - there;
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
  return d + Math.round(shift[axis] * item.depth);
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
    const { sprite } = entry;
    out[at++] = entry.x + moved(entry, 0, t, shift) - camera[0];
    out[at++] = entry.y + moved(entry, 1, t, shift) - camera[1];
    out[at++] = sprite.w;
    out[at++] = sprite.h;
    out[at++] = sprite.x + frameAt(entry.anim, sprite.frames, t, entry.seed) * sprite.w;
    out[at++] = sprite.y;
  }
  return at / INSTANCE_SIZE;
}
