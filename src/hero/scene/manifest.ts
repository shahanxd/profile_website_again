import type { Emitter, Hotspot, Layer, Light, Scene, Vec2 } from './types';

/**
 * The garden, as data. One place staged twice: creative is golden hour, tech
 * is the same garden at dusk. Positions are whole art pixels in the painted
 * world (400 x 200, origin top-left); the default desktop view shows the
 * 320 x 180 that starts at (40, 20). Framing lives in framing.ts.
 *
 * To change art, replace files in art/sprites and run `npm run art:build`.
 * To move something, change `at` here. Neither needs an engine change.
 *
 * z bands: 10 sky things, 20 skyline, 30 wall, 35 lawn, 38-45 middle garden,
 * 50 tree, 60 carpet and everything on it, 70 things in the air, 80 foreground.
 */

// Layers that are the same thing placed several times.
const stars: Vec2[] = [[204, 30], [226, 58], [247, 36], [271, 68], [286, 24], [323, 58], [341, 33], [150, -34], [201, -58], [232, -16], [176, -84]];
const cypresses: Vec2[] = [[63, 138], [335, 138], [349, 138]];
const flowerbeds: Vec2[] = [[108, 137], [148, 137], [212, 137], [330, 137]];
const tufts: Vec2[] = [[24, 196], [88, 199], [152, 194], [203, 199], [262, 196], [318, 199], [372, 195]];

const layers: Layer[] = [
  // Sky. The sun sits half sunk behind the skyline; the moon rides high.
  { id: 'sun', sprite: 'sun', in: ['creative'], z: 10, depth: 0.05, at: [276, 112] },
  { id: 'moon', sprite: 'moon', in: ['tech'], z: 10, depth: 0.05, at: [302, 44] },
  ...stars.map((at, i): Layer => ({
    id: `star-${i}`,
    sprite: 'star',
    in: ['tech'],
    z: 11,
    depth: 0.05,
    at,
    anim: { mode: 'random-hold', fps: 5, every: 5 + (i % 4) },
  })),
  { id: 'cloud-a', sprite: 'cloud-a', z: 12, depth: 0.08, at: [214, 38], drift: { secondsPerPixel: 2, span: [-40, 440] } },
  { id: 'cloud-b', sprite: 'cloud-b', z: 12, depth: 0.08, at: [318, 60], drift: { secondsPerPixel: 2.5, span: [-40, 440] } },
  { id: 'cloud-c', sprite: 'cloud-c', z: 12, depth: 0.08, at: [120, 22], drift: { secondsPerPixel: 3, span: [-40, 440] } },

  // The old city, far off.
  { id: 'skyline', sprite: 'skyline', z: 20, depth: 0.15, at: [0, 108] },
  { id: 'windows', sprite: 'windows', in: ['tech'], z: 21, depth: 0.15, at: [0, 108] },
  { id: 'kite-a', sprite: 'kite-a', in: ['creative'], z: 22, depth: 0.15, at: [216, 52], anim: { mode: 'loop', fps: 2 }, sway: { by: [2, 1], period: 7 } },
  { id: 'kite-b', sprite: 'kite-b', in: ['creative'], z: 22, depth: 0.15, at: [338, 46], anim: { mode: 'loop', fps: 2 }, sway: { by: [1, 2], period: 9 } },

  // Garden wall with its gate, and the cypresses standing against it.
  { id: 'wall', sprite: 'wall', z: 30, depth: 0.3, at: [0, 114] },
  ...cypresses.map((at, i): Layer => ({ id: `cypress-${i}`, sprite: 'cypress', z: 31, depth: 0.3, at })),

  // The lawn lies under everything from here on.
  { id: 'lawn', sprite: 'lawn', z: 35, depth: 1, at: [0, 138] },

  // Middle of the garden: beds, the pavilion, the rill and its pool.
  ...flowerbeds.map((at, i): Layer => ({ id: `flowerbed-${i}`, sprite: 'flowerbed', z: 38, depth: 0.5, at })),
  { id: 'pavilion', sprite: 'pavilion', z: 40, depth: 0.5, at: [244, 80] },
  { id: 'pavilion-glow', sprite: 'pavilion-glow', in: ['tech'], z: 41, depth: 0.5, at: [0, 0], attachTo: { layer: 'pavilion', point: 'glow' } },
  { id: 'water', sprite: 'water', z: 43, depth: 0.5, at: [150, 140] },
  { id: 'fountain', sprite: 'fountain', z: 44, depth: 0.5, at: [0, 0], attachTo: { layer: 'water', point: 'jet' }, anim: { mode: 'loop', fps: 6 } },

  // The tree: one trunk, blossom or green leaves, and the lantern on the bough that reaches over the carpet.
  { id: 'tree', sprite: 'tree', z: 50, depth: 0.75, at: [98, 170] },
  {
    id: 'lantern',
    sprite: 'lantern',
    z: 51,
    depth: 0.75,
    at: [0, 0],
    attachTo: { layer: 'tree', point: 'lantern' },
    // lit at dusk: the flame burns steady and gutters now and then (the light it throws is in `lights` below)
    when: { tech: { anim: { mode: 'random-hold', fps: 4, every: 2.5 } } },
  },
  { id: 'canopy', sprite: 'canopy', z: 52, depth: 0.75, at: [0, 0] },

  // The carpet and everything on it. This group is what a phone frames.
  { id: 'carpet', sprite: 'carpet', z: 60, depth: 1, at: [124, 164] },
  { id: 'bolster', sprite: 'bolster', z: 61, depth: 1, at: [130, 161] },
  {
    id: 'character',
    sprite: 'character',
    z: 62,
    depth: 1,
    // creative: cross-legged, sketching in bursts
    at: [150, 172],
    anim: { mode: 'random-hold', fps: 4, every: 3 },
    // tech: leaning back on the bolster, legs out, typing in bursts
    when: { tech: { at: [140, 172], anim: { mode: 'random-hold', fps: 5, every: 2.5 } } },
  },
  {
    id: 'parrot',
    sprite: 'parrot',
    z: 63,
    depth: 1,
    at: [0, 0],
    // on the raised knee, awake; at dusk asleep on the shoulder, breathing slowly
    attachTo: { layer: 'character', point: 'perch' },
    anim: { mode: 'random-hold', fps: 4, every: 5 },
    when: { tech: { anim: { mode: 'pingpong', fps: 0.7 } } },
  },
  {
    id: 'cat',
    sprite: 'cat',
    z: 64,
    depth: 1,
    at: [213, 174],
    anim: { mode: 'random-hold', fps: 3, every: 6 },
    when: { tech: { at: [212, 175], anim: { mode: 'pingpong', fps: 0.5 } } },
  },
  { id: 'tray', sprite: 'tray', z: 65, depth: 1, at: [196, 168] },
  { id: 'clutter', sprite: 'clutter', z: 66, depth: 1, at: [130, 181], when: { tech: { anim: { mode: 'loop', fps: 1 } } } },
  // dusk: a mosquito coil smoulders at the front of the carpet
  { id: 'coil', sprite: 'coil', in: ['tech'], z: 66, depth: 1, at: [172, 180] },
  { id: 'side-table', sprite: 'side-table', z: 67, depth: 1, at: [254, 162] },
  // The tablet prop. On wide screens the site menu is laid over the top of its screen (see hotspots);
  // the cursor waits on the line below, which is what keeps the prop alive on every screen.
  { id: 'tablet', sprite: 'tablet', z: 68, depth: 1, at: [236, 148] },
  { id: 'cursor', sprite: 'cursor', z: 69, depth: 1, at: [1, 22], attachTo: { layer: 'tablet', point: 'screen' }, anim: { mode: 'loop', fps: 2 } },

  // Foreground: nearest to the eye, so it moves the most.
  { id: 'tulips', sprite: 'tulips', z: 80, depth: 1.15, at: [42, 200] },
  ...tufts.map((at, i): Layer => ({ id: `tuft-${i}`, sprite: 'tuft', z: 80, depth: 1.15, at })),
];

// Things in the air. All of it is meant to be noticed second, not first: few, small and slow.
const emitters: Emitter[] = [
  // creative: blossom coming down from the canopy on a light breeze
  {
    id: 'petals',
    in: ['creative'],
    sprite: 'petal',
    z: 70,
    depth: 0.9,
    count: 12,
    area: [20, 62, 170, 26],
    move: { kind: 'drift', velocity: [2.5, 7], jitter: [1.5, 1.2], life: [11, 14], gap: [0, 2.5], wobble: { by: 3, period: 4 } },
    anim: { mode: 'loop', fps: 2 },
  },
  // tech: the odd leaf
  {
    id: 'leaves',
    in: ['tech'],
    sprite: 'leaf',
    z: 70,
    depth: 0.9,
    count: 1,
    area: [30, 62, 150, 26],
    move: { kind: 'drift', velocity: [1.5, 8], jitter: [1, 1], life: [10, 13], gap: [9, 20], wobble: { by: 2, period: 5 } },
    anim: { mode: 'loop', fps: 1.5 },
  },
  // creative: steam off the coffee
  {
    id: 'steam',
    in: ['creative'],
    sprite: 'steam',
    z: 69,
    depth: 1,
    count: 3,
    area: [-1, -1, 2, 1],
    from: { layer: 'tray', point: 'steam' },
    move: { kind: 'drift', velocity: [0.4, -3.2], jitter: [0.3, 0.6], life: [2.6, 3.4], gap: [0.2, 1.2], wobble: { by: 1, period: 2.6 } },
    anim: 'life',
  },
  // tech: a thread of smoke from the mosquito coil
  {
    id: 'smoke',
    in: ['tech'],
    sprite: 'smoke',
    z: 69,
    depth: 1,
    count: 2,
    area: [0, -1, 1, 1],
    from: { layer: 'coil', point: 'tip' },
    move: { kind: 'drift', velocity: [0.5, -2.6], jitter: [0.3, 0.4], life: [4.5, 6], gap: [0, 0.8], wobble: { by: 1.5, period: 3.4 } },
    anim: 'life',
  },
  // tech: fireflies low over the lawn, each glowing up now and then. They pass behind the carpet and whoever is on it.
  {
    id: 'fireflies',
    in: ['tech'],
    sprite: 'firefly',
    z: 59,
    depth: 0.9,
    count: 5,
    area: [112, 136, 150, 22],
    move: { kind: 'wander', reach: [10, 5], period: [9, 17] },
    anim: { mode: 'random-hold', fps: 5, every: 6 },
  },
  // tech: two moths round the lit lantern
  {
    id: 'moths',
    in: ['tech'],
    sprite: 'moth',
    z: 53,
    depth: 0.75,
    count: 2,
    area: [0, 0, 0, 0],
    from: { layer: 'lantern', point: 'flame' },
    move: { kind: 'orbit', radius: [9, 5], period: [5, 8] },
    anim: { mode: 'loop', fps: 4 },
  },
  // both: light catching the water, in the rill either side of the pool and in the pool itself
  ...(
    [
      ['rill', 'rill', [0, 0, 46, 2], 2],
      ['pool', 'pool', [1, 1, 24, 7], 2],
      ['tail', 'rill', [75, 0, 19, 2], 1],
    ] as const
  ).map(
    ([name, point, area, count]): Emitter => ({
      id: `glints-${name}`,
      sprite: 'glint',
      z: 45,
      depth: 0.5,
      count,
      area: [...area],
      from: { layer: 'water', point },
      move: { kind: 'drift', velocity: [0, 0], life: [0.7, 1.1], gap: [2, 6] },
      anim: 'life',
    }),
  ),
];

const lights: Light[] = [
  // dusk: the pool of light under the lantern, on the carpet and the lawn round it; it dips when the flame does
  { in: ['tech'], at: [176, 173], radius: [46, 14], depth: 1, flame: { layer: 'lantern', strength: [1, 0.96, 0.98] } },
];

const hotspots: Hotspot[] = [
  // The tablet prop's screen, down to the line the cursor waits on: the site menu's real links are laid over it.
  { id: 'menu', layer: 'tablet', point: 'screen', size: [18, 21] },
];

export const scene: Scene = {
  layers,
  emitters,
  lights,
  hotspots,
  backdrop: {
    creative: {
      // above the painted world the sky cools rather than darkens, so the copy on a phone keeps its contrast
      sky: [[-100, 'moonlight'], [-25, 'mauve'], [50, 'coral'], [92, 'apricot'], [124, 'gold']],
      ground: [[130, 'grass'], [200, 'grass'], [290, 'leaf']],
    },
    tech: {
      // a thin afterglow is left along the horizon
      sky: [[-110, 'ink'], [-30, 'indigo'], [40, 'blueviolet'], [96, 'periwinkle'], [116, 'mauve'], [128, 'coral']],
      ground: [[130, 'duskgrass'], [200, 'duskgrass'], [290, 'cypress']],
    },
  },
};
