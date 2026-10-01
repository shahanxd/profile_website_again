import type { SplitId } from '../../split/types';

/**
 * The garden is described as data (see manifest.ts and framing.ts). The engine
 * only reads these types, so replacing or adding art never means touching
 * engine code. All positions are whole art pixels in world space: the painted
 * world is the plate, 352 x 198, with its origin at the top-left.
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

/** The parts of a layer that may differ between stagings. */
export interface LayerPose {
  /** Sprite id in art/sprites. The file named <id>.<staging>.png is used when there is one. */
  sprite: string;
  /**
   * Where the sprite's anchor goes. Leave it out for the painted scene's sprites: each carries the place the
   * art gives it. For an attached layer this is an offset from the parent's point.
   */
  at?: Vec2;
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

export interface Scene {
  layers: Layer[];
  emitters: Emitter[];
}

/** How the world is fitted to a screen. */
export interface Framing {
  /** Size of the painted world: the plate. */
  world: Vec2;
  /** Rows of lawn painted on below the world, for screens taller than it. The view never goes past them, or above the world. */
  lawn: number;
  /** The middle of the carpet group: what a tall screen is centred on, and what a wide one keeps at one height. */
  focus: Vec2;
  /** The view always reaches down to at least this world row, so the things on the carpet stay in view on squat screens. */
  floor: number;
  /**
   * Wide screens show about `height` rows, unless that would leave fewer than about `width` columns: the copy
   * needs the sky beside the tree. The view starts `left` columns into the world (or in the middle of it, when
   * there are fewer than twice that to spare), and the focus sits `target` of the way down the screen.
   */
  landscape: { height: number; width: number; left: number; target: number };
  /**
   * Tall screens start at the top of the world and are centred on the focus. They show at least `width` art
   * pixels across (the carpet group, from the cat to the side table) and at least `height` rows (the copy
   * needs the lawn under the carpet), and as little more as a whole k allows.
   */
  portrait: { width: number; height: number };
  /** Furthest a depth-1 layer moves with the pointer, in art pixels. */
  parallax: Vec2;
}
