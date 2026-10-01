import type { Emitter, Layer, Scene } from './types';

/**
 * The garden, as data. One place staged twice: creative is golden hour, tech
 * is the same garden at dusk. The painted world is the plate, 352 x 198 art
 * pixels with its origin at the top-left; a 16:9 screen shows 320 x 180 of
 * it, down to its last row. Framing lives in framing.ts.
 *
 * The scene is painted: a plate with everything that never moves, the tree,
 * and one sprite for each thing on the carpet. Those sprites carry their own
 * place (scripts/import-scene.mjs takes it from the art), so a layer here
 * only says what is drawn, in what order, and how deep it is. To change art,
 * rebuild it and run `npm run art:build`. Neither needs an engine change.
 *
 * What moves is small. A thing that changes shape is a strip of whole frames
 * (the parrot, the cats). A thing that changes a few pixels inside itself is
 * a patch: a tiny sprite of only those pixels, pinned over its pose at a point
 * of the same name, showing nothing at rest. The frames and the points are
 * made in import-scene.mjs. Everything is meant to be noticed second, not
 * first: few, small and slow, and never two things asking for the eye at once.
 *
 * Depth: the plate is far (0.35), the tree and its lantern nearer (0.8), and
 * everything on the carpet moves the full distance (1).
 *
 * z: 0 plate and lawn, 1-5 things in the far sky and on the water, 20 tree,
 * 30 lantern, 40 air behind the carpet group, 45-63 the carpet group,
 * 70 air in front.
 */

/** A patch over one of the painted sprites. */
const patch = (on: string, name: string, z: number, depth: number, rest: Partial<Layer>): Layer => ({
  id: `${on}-${name}`,
  sprite: `${on}-${name}`,
  z,
  depth,
  attachTo: { layer: on, point: name },
  ...rest,
});

const layers: Layer[] = [
  { id: 'plate', sprite: 'plate', z: 0, depth: 0.35 },
  // the lawn, carried on below the plate for screens taller than the painted world
  { id: 'lawn', sprite: 'lawn', z: 0, depth: 0.35 },
  // the fountain's jet never quite holds still
  patch('plate', 'jet', 1, 0.35, { anim: { mode: 'loop', fps: 2.5 } }),
  // dusk: three of the painted stars twinkle, rarely (most screens have one or two of them in view)
  ...(['star-a', 'star-b', 'star-c'] as const).map(
    (point, i): Layer => ({
      id: `twinkle-${i}`,
      sprite: 'twinkle',
      in: ['tech'],
      z: 1,
      depth: 0.35,
      attachTo: { layer: 'plate', point },
      anim: { mode: 'random-hold', fps: 4, every: 8 + i * 3 },
    }),
  ),
  // golden hour: two kites far off over the old city, rocking on their strings
  { id: 'kite-a', sprite: 'kite-a', in: ['creative'], z: 5, depth: 0.35, sway: { by: [1, 1], period: 7 } },
  { id: 'kite-b', sprite: 'kite-b', in: ['creative'], z: 5, depth: 0.35, sway: { by: [1, 1], period: 9 } },

  { id: 'tree', sprite: 'tree', z: 20, depth: 0.8 },
  { id: 'lantern', sprite: 'lantern', z: 30, depth: 0.8 },
  // lit at dusk: the flame burns steady and gutters now and then
  patch('lantern', 'flame', 31, 0.8, { in: ['tech'], anim: { mode: 'random-hold', fps: 6, every: 1.6 } }),

  // The carpet and bolster are painted on the plate; these are the things on them.
  { id: 'table', sprite: 'table', z: 45, depth: 1 },
  // The tablet on the side table is only a prop, kept alive: by day a cursor waits on its dark screen,
  // at dusk its glow rises and falls.
  { id: 'cursor', sprite: 'cursor', in: ['creative'], z: 46, depth: 1, at: [1, 2], attachTo: { layer: 'table', point: 'screen' }, anim: { mode: 'loop', fps: 1 } },
  patch('table', 'glow', 46, 1, { in: ['tech'], anim: { mode: 'pingpong', fps: 0.5 } }),

  { id: 'figure', sprite: 'figure', z: 50, depth: 1 },
  // creative: a stroke of the stylus now and then
  patch('figure', 'hand', 51, 1, { in: ['creative'], anim: { mode: 'random-hold', fps: 3, every: 4 } }),
  // tech: typing in short bursts, the laptop's light barely moving, and the parrot asleep behind the shoulder
  patch('figure', 'hands', 51, 1, { in: ['tech'], anim: { mode: 'random-hold', fps: 7, every: 3.2 } }),
  patch('figure', 'screen', 51, 1, { in: ['tech'], anim: { mode: 'pingpong', fps: 0.8 } }),
  patch('figure', 'parrot', 51, 1, { in: ['tech'], anim: { mode: 'pingpong', fps: 0.35 } }),

  // creative: awake beside him; it blinks and draws its head back
  { id: 'parrot', sprite: 'parrot', in: ['creative'], z: 55, depth: 1, anim: { mode: 'random-hold', fps: 3, every: 7 } },
  { id: 'tray', sprite: 'tray', z: 58, depth: 1 },
  // sitting up, an ear flicks; asleep at dusk, it breathes
  {
    id: 'cat',
    sprite: 'cat',
    z: 60,
    depth: 1,
    anim: { mode: 'random-hold', fps: 4, every: 9 },
    when: { tech: { anim: { mode: 'pingpong', fps: 0.3 } } },
  },
  { id: 'rover', sprite: 'rover', in: ['tech'], z: 62, depth: 1 },
  // its light dips for a moment every few seconds
  patch('rover', 'light', 63, 1, { in: ['tech'], anim: { mode: 'random-hold', fps: 2.5, every: 3.5 } }),
];

const emitters: Emitter[] = [
  // creative: blossom coming down from the canopy on a light breeze. A petal sets off from inside the
  // blossom, where it cannot be seen to appear, and lasts until it is down among the beds or on the lawn.
  {
    id: 'petals',
    in: ['creative'],
    sprite: 'petal',
    z: 70,
    depth: 0.9,
    count: 9,
    area: [15, 20, 125, 35],
    move: { kind: 'drift', velocity: [2, 6], jitter: [1.2, 1], life: [15, 19], gap: [0, 4], wobble: { by: 3, period: 5 } },
    anim: { mode: 'loop', fps: 2 },
  },
  // creative: steam off the coffee
  {
    id: 'steam',
    in: ['creative'],
    sprite: 'steam',
    z: 59,
    depth: 1,
    count: 2,
    area: [-1, -1, 2, 1],
    from: { layer: 'tray', point: 'steam' },
    move: { kind: 'drift', velocity: [0.4, -3.2], jitter: [0.3, 0.6], life: [2.6, 3.4], gap: [0.2, 1.2], wobble: { by: 1, period: 2.6 } },
    anim: 'life',
  },
  // tech: fireflies low over the lawn, dark until one glows: behind the carpet and whoever is on it, over the
  // open lawn beside the pool, and one nearer. None over the carpet itself.
  ...(
    [
      ['behind', [20, 140, 140, 8], 2],
      ['beside', [150, 140, 180, 22], 3],
      ['near', [215, 170, 110, 16], 1],
    ] as const
  ).map(
    ([name, area, count]): Emitter => ({
      id: `fireflies-${name}`,
      in: ['tech'],
      sprite: 'firefly',
      z: 40,
      depth: 0.9,
      count,
      area: [...area],
      move: { kind: 'wander', reach: [8, 4], period: [9, 17] },
      anim: { mode: 'random-hold', fps: 4, every: 7 },
    }),
  ),
  // tech: two moths round the lit lantern
  {
    id: 'moths',
    in: ['tech'],
    sprite: 'moth',
    z: 32,
    depth: 0.8,
    count: 2,
    area: [0, 0, 0, 0],
    from: { layer: 'lantern', point: 'flame' },
    move: { kind: 'orbit', radius: [9, 5], period: [5, 8] },
    anim: { mode: 'loop', fps: 4 },
  },
  // both: light catching the water, in the pool either side of the fountain and in the rill above it
  ...(
    [
      ['pool-left', [0, 0, 26, 8], 2],
      ['pool-right', [0, 0, 26, 8], 2],
      ['rill', [0, 0, 4, 9], 1],
    ] as const
  ).map(
    ([point, area, count]): Emitter => ({
      id: `glints-${point}`,
      sprite: 'glint',
      z: 2,
      depth: 0.35,
      count,
      area: [...area],
      from: { layer: 'plate', point },
      move: { kind: 'drift', velocity: [0, 0], life: [0.7, 1.1], gap: [2, 6] },
      anim: 'life',
    }),
  ),
];

export const scene: Scene = { layers, emitters };
