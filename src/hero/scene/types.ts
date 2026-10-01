import type { SplitId } from '../../split/types';

/**
 * The garden is described as data (see manifest.ts and framing.ts). The engine
 * only reads these types, so replacing or adding art never means touching
 * engine code. All positions are whole art pixels in world space: the painted
 * world is 400 x 200 with its origin at the top-left.
 */

export type Vec2 = [number, number];

/** How a sprite strip plays. Frames always step; nothing is blended. */
export type Anim =
  | { mode: 'loop' | 'pingpong'; fps: number }
  /** Rests on the first frame and plays the strip through once, at an uneven moment, about every `every` seconds. */
  | { mode: 'random-hold'; fps: number; every: number };

/** A slow whole-pixel rock around the resting position. */
export interface Sway {
  by: Vec2;
  period: number;
}

/** Steady travel to the right, one pixel at a time, wrapping inside `span` (world x). */
export interface Drift {
  secondsPerPixel: number;
  span: Vec2;
}

/** The parts of a layer that may differ between stagings. */
export interface LayerPose {
  /** Sprite id in art/sprites. The file named <id>.<staging>.png is used when there is one. */
  sprite: string;
  /** Where the sprite's anchor goes. For an attached layer this is an offset from the parent's point. */
  at: Vec2;
  anim?: Anim;
  sway?: Sway;
}

export interface Layer extends LayerPose {
  id: string;
  /** Draw order, back to front. */
  z: number;
  /** Parallax depth: 0 never moves with the pointer, 1 moves the full distance. Attached layers move with their parent. */
  depth: number;
  /** Stagings this layer appears in. Leave out for both. */
  in?: SplitId[];
  drift?: Drift;
  /** Pin this layer to a named point of another layer's sprite, so it follows that sprite when the art changes. */
  attachTo?: { layer: string; point: string };
  /** Per-staging changes to pose. */
  when?: Partial<Record<SplitId, Partial<LayerPose>>>;
}

/** How one particle travels. However it moves, it is always drawn on a whole pixel. */
export type Motion =
  /** Starts somewhere in the area and travels steadily until its life is up: petals, steam, glints. */
  | {
      kind: 'drift';
      /** Art pixels per second. */
      velocity: Vec2;
      /** Each particle's velocity differs from `velocity` by up to this much. */
      jitter?: Vec2;
      /** Shortest and longest life, in seconds. */
      life: Vec2;
      /** Shortest and longest wait, in seconds, before the next particle takes the place of one that has gone. */
      gap?: Vec2;
      /** Sideways waver, in art pixels, with its period in seconds. */
      wobble?: { by: number; period: number };
    }
  /** Roams round a home spot in the area and never leaves: fireflies. `reach` is how far, `period` how slowly. */
  | { kind: 'wander'; reach: Vec2; period: Vec2 }
  /** Circles the area's corner point: moths round a flame. `period` is the shortest and longest time per lap. */
  | { kind: 'orbit'; radius: Vec2; period: Vec2 };

/** A source of small moving sprites: petals, fireflies, steam, glints. Left out of the still frame. */
export interface Emitter {
  id: string;
  in?: SplitId[];
  sprite: string;
  z: number;
  depth: number;
  /** How many there are at once at full quality. With a `gap`, some of them are waiting their turn. */
  count: number;
  /** World rectangle particles start in: x, y, width, height. Relative to the point when `from` is set. */
  area: [number, number, number, number];
  /** A named point on a layer's sprite. The particles then follow that layer, parallax included. */
  from?: { layer: string; point: string };
  move: Motion;
  /** How a particle steps through its sprite's frames. 'life' plays the strip once over the particle's life. */
  anim?: Anim | 'life';
}

/**
 * Lamplight on the ground at dusk. Inside the pool, sprites that were darkened
 * for dusk show their daylight colours again, thinned out by ordered dither
 * towards the rim. Only shared sprites with a baked dusk form are affected;
 * art made for one staging carries its own lighting. One light per staging.
 */
export interface Light {
  in?: SplitId[];
  /** Centre of the pool, in world pixels, and its radii. */
  at: Vec2;
  radius: Vec2;
  /** Parallax depth of the ground it falls on. */
  depth: number;
  /** The layer whose flame throws it. The pool dims with that sprite's frames: one strength, 0..1, per frame. */
  flame?: { layer: string; strength: number[] };
}

/**
 * A rectangle in the scene that real page elements are laid over. The page
 * covers it with its own plate, so the sprite underneath may show anything.
 */
export interface Hotspot {
  id: string;
  /** The layer it belongs to, and the named point on that layer's sprite that is its top-left corner. */
  layer: string;
  point: string;
  size: Vec2;
}

/** One colour change in a vertical dithered gradient: from this world y downwards, blend towards the next stop. */
export type Stop = [y: number, color: string];

/** What is drawn behind every sprite, and beyond the painted world above and below. */
export interface Backdrop {
  sky: Stop[];
  /** Takes over from the sky at its first stop. Its last colour continues below the painted world. */
  ground: Stop[];
}

export interface Scene {
  layers: Layer[];
  emitters: Emitter[];
  lights: Light[];
  hotspots: Hotspot[];
  backdrop: Record<SplitId, Backdrop>;
}

/** How the world is fitted to a screen. */
export interface Framing {
  /** Size of the painted world. */
  world: Vec2;
  /** The point the camera keeps in place: the middle of the carpet group. */
  focus: Vec2;
  /** The view always reaches down to at least this world row, so there is lawn under the carpet on squat screens. */
  floor: number;
  /** Wide screens show about this many art pixels of height. `target` is where the focus sits, as a fraction of the screen. */
  landscape: { height: number; target: Vec2 };
  /** Tall screens show at most this many art pixels of width, and never look outside `span` (world x, from and to). */
  portrait: { width: number; target: Vec2; span: Vec2 };
  /** Furthest a depth-1 layer moves with the pointer, in art pixels. */
  parallax: Vec2;
  /** World rows the poster image covers: first row and row count. Its width is the world's. */
  poster: { top: number; height: number };
}
