// Brings the scene's real layers (art/scene/<staging>/, written by
// build-scene-art.mjs) into art/sprites under the sprite contract, so the hero
// engine can draw them:
//
//   <id>.<staging>.png   the layer, or a strip of frames when it has a few
//   sprites.json         frames, anchor, named points, source "scene", and
//                        "at": where the art puts the sprite's top-left in the world
//
// It also makes what the layers do not contain:
//   - the few animation frames each living thing needs, by small pixel edits
//     to its one pose (LIFE below). Nothing is blended, rotated or scaled.
//     A thing that changes shape gets a strip of whole frames; a thing that
//     only changes a few pixels inside itself gets a patch, <id>-<name>.png:
//     a tiny sprite of just those pixels, laid over the pose by the engine.
//   - lawn.<staging>.png, the lawn carried on below the painted world for tall
//     screens, laid from patches of the plate's own lawn.
//
//   node scripts/import-scene.mjs
//
// Re-run it after build-scene-art.mjs. Everything it wrote last time (every
// sprite whose source is "scene") is replaced; other sprites are left alone.
import sharp from 'sharp';
import { readFile, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { framing } from '../src/hero/scene/framing.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sceneDir = path.join(root, 'art', 'scene');
const spriteDir = path.join(root, 'art', 'sprites');
const STAGINGS = ['creative', 'tech'];

/** Rows of lawn laid below the plate: as many as the camera may show (framing.ts). */
const LAWN_ROWS = framing.lawn;

// ---------------------------------------------------------------------- pixels
// A sprite here is { w, h, data } with RGBA bytes; alpha is 0 or 255.

async function load(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { w: info.width, h: info.height, data };
}

const copy = (sprite) => ({ ...sprite, data: Buffer.from(sprite.data) });
const at = (sprite, x, y) => (y * sprite.w + x) * 4;
const inside = (sprite, x, y) => x >= 0 && y >= 0 && x < sprite.w && y < sprite.h;

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [n >> 16, (n >> 8) & 255, n & 255];
}

/**
 * The drawing kit the LIFE recipes use on a copy of the pose. Every colour is
 * either lifted from another pixel of the same sprite or named as a hex of the
 * staging's palette (checked), so a frame can never leave the palette.
 */
function editor(sprite, palette, name) {
  const allowed = new Set(palette);
  const colour = (hex) => {
    if (!allowed.has(hex)) throw new Error(`${name}: ${hex} is not in the staging's palette`);
    return hexToRgb(hex);
  };
  const frame = copy(sprite);
  const kit = {
    frame,
    /** Paints a pixel: a palette hex, or null to clear it. */
    set(x, y, hex) {
      if (!inside(frame, x, y)) throw new Error(`${name}: (${x}, ${y}) is outside the sprite`);
      const o = at(frame, x, y);
      if (hex === null) frame.data.fill(0, o, o + 4);
      else frame.data.set([...colour(hex), 255], o);
      return kit;
    },
    /** Gives a pixel the colour another pixel has in the untouched pose. */
    lift(x, y, fromX, fromY) {
      if (!inside(frame, x, y) || !inside(sprite, fromX, fromY)) throw new Error(`${name}: (${x}, ${y}) or (${fromX}, ${fromY}) is outside the sprite`);
      sprite.data.copy(frame.data, at(frame, x, y), at(sprite, fromX, fromY), at(sprite, fromX, fromY) + 4);
      return kit;
    },
    /**
     * Moves the pixels of a rectangle of the pose by (dx, dy). With `clear`, what they uncover is left empty;
     * otherwise it keeps the pose's pixel, to be painted over with set() or lift().
     */
    shift(x, y, w, h, dx, dy, clear = false) {
      for (let j = 0; clear && j < h; j++) {
        for (let i = 0; i < w; i++) frame.data.fill(0, at(frame, x + i, y + j), at(frame, x + i, y + j) + 4);
      }
      for (let j = 0; j < h; j++) {
        for (let i = 0; i < w; i++) {
          if (!inside(frame, x + i + dx, y + j + dy)) continue;
          sprite.data.copy(frame.data, at(frame, x + i + dx, y + j + dy), at(sprite, x + i, y + j), at(sprite, x + i, y + j) + 4);
        }
      }
      return kit;
    },
  };
  return kit;
}

/** Small seeded generator, so every run lays the same lawn. */
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ------------------------------------------------------------------------ lawn

/**
 * The lawn below the painted world. It is laid from small patches of the
 * plate's own lawn (the even, shaded stretch in its lower right corner), each
 * taken from a different spot and some of them mirrored, so the grass is the
 * painter's and no two parts of it match. Patches that catch a streak of
 * sunlight or a shadow are passed over: laid at random they would read as
 * blots, and the copy on a phone needs even ground. The first rows are the
 * plate's last rows mirrored, thinning out into the patches, so there is no
 * seam where the plate ends.
 */
function layLawn(plate, seed) {
  const SOURCE = { x: 240, y: 186, w: 112, h: 12 };
  const PATCH = { w: 16, h: 4 };
  const SEAM = 4; // rows over which the mirrored plate gives way to the patches
  // The patches repeat across after this many pixels: wider than any phone's view, and it halves the file.
  const PERIOD = 176;
  const random = rng(seed);

  // How light each possible patch is, and the middle of that range: only patches near it are used.
  const light = (x, y) => {
    let sum = 0;
    for (let j = 0; j < PATCH.h; j++) {
      for (let i = 0; i < PATCH.w; i++) {
        const o = at(plate, x + i, y + j);
        sum += 2 * plate.data[o] + 7 * plate.data[o + 1] + plate.data[o + 2];
      }
    }
    return sum;
  };
  const spots = [];
  for (let y = SOURCE.y; y <= SOURCE.y + SOURCE.h - PATCH.h; y++) {
    for (let x = SOURCE.x; x <= SOURCE.x + SOURCE.w - PATCH.w; x++) spots.push({ x, y, light: light(x, y) });
  }
  const byLight = [...spots].sort((a, b) => a.light - b.light);
  const even = byLight.slice(Math.floor(byLight.length * 0.2), Math.floor(byLight.length * 0.6));

  const grass = Buffer.alloc(PERIOD * LAWN_ROWS * 4);
  for (let band = 0; band * PATCH.h < LAWN_ROWS; band++) {
    // alternate bands are set half a patch across, so patch ends never line up into a column
    const offset = band % 2 ? PATCH.w / 2 : 0;
    for (let x0 = -offset; x0 < PERIOD; x0 += PATCH.w) {
      const { x: fromX, y: fromY } = even[Math.floor(random() * even.length)];
      const mirrored = random() < 0.5;
      const flipped = random() < 0.5;
      for (let j = 0; j < PATCH.h; j++) {
        const y = band * PATCH.h + j;
        if (y >= LAWN_ROWS) break;
        for (let i = 0; i < PATCH.w; i++) {
          const x = (x0 + i + PERIOD) % PERIOD;
          const sx = fromX + (mirrored ? PATCH.w - 1 - i : i);
          const sy = fromY + (flipped ? PATCH.h - 1 - j : j);
          plate.data.copy(grass, (y * PERIOD + x) * 4, at(plate, sx, sy), at(plate, sx, sy) + 4);
        }
      }
    }
  }

  const lawn = { w: plate.w, h: LAWN_ROWS, data: Buffer.alloc(plate.w * LAWN_ROWS * 4) };
  for (let y = 0; y < LAWN_ROWS; y++) {
    for (let x = 0; x < plate.w; x++) {
      const keepPlate = y < SEAM && random() >= (y + 1) / (SEAM + 1);
      if (keepPlate) plate.data.copy(lawn.data, at(lawn, x, y), at(plate, x, plate.h - 1 - y), at(plate, x, plate.h - 1 - y) + 4);
      else grass.copy(lawn.data, at(lawn, x, y), (y * PERIOD + (x % PERIOD)) * 4, (y * PERIOD + (x % PERIOD)) * 4 + 4);
    }
  }
  return lawn;
}

// ------------------------------------------------------------------------ life
// What each sprite needs beyond its pixels: named points (in sprite pixels,
// for things that attach to it or start from it) and the frames of its small
// movements.
//
// `frames` and each entry of `patches` get `edit`, which hands out a fresh
// copy of the pose to draw on, and return the frames that follow the pose.
// Frame 0 is always the untouched pose (for a patch: nothing at all), and it
// is what the still frame and the poster show.
//
// Coordinates are sprite pixels, so a recipe only fits the art it was made
// on. `size` records that; if the art is rebuilt at another size the script
// stops and says which recipe to redo.

const LIFE = {
  creative: {
    plate: {
      size: [352, 198],
      // where glints start (the open water either side of the fountain, and the rill)
      points: { 'pool-left': [192, 148], 'pool-right': [232, 148], rill: [211, 132] },
      patches: {
        // the fountain's jet: its bright pixels change places
        jet: (edit) => [
          edit().lift(225, 141, 226, 141).lift(226, 141, 225, 141).lift(227, 142, 225, 142),
          edit().lift(225, 140, 226, 141).lift(226, 143, 227, 143).lift(226, 141, 225, 141),
        ],
      },
    },
    figure: {
      size: [57, 61],
      patches: {
        // the stylus hand: the fingers and stylus slide a pixel right, then a pixel left, over the wrist
        hand: (edit) => [
          edit().shift(19, 31, 7, 5, 1, 0).lift(19, 31, 18, 31).lift(19, 32, 18, 32).lift(19, 33, 18, 33).lift(19, 34, 18, 34).lift(19, 35, 18, 35),
          edit().shift(19, 31, 7, 5, -1, 0).lift(25, 31, 26, 31).lift(25, 32, 26, 32).lift(25, 33, 26, 33).lift(25, 34, 26, 34).lift(25, 35, 26, 35),
        ],
      },
    },
    parrot: {
      size: [17, 30],
      // a blink, then the head drawn back a pixel for a moment
      frames: (edit) => {
        const tilt = () => edit().shift(0, 0, 7, 5, 1, 0, true);
        return [edit().lift(3, 2, 4, 2), tilt(), tilt()];
      },
    },
    cat: {
      size: [23, 30],
      // the near ear flicks down
      frames: (edit) => [edit().set(19, 0, null).set(20, 0, null).set(21, 0, null).lift(21, 1, 21, 0)],
    },
    tray: {
      size: [35, 24],
      // the rim of the coffee cup: steam rises from here
      points: { steam: [23, 13] },
    },
    table: {
      size: [28, 41],
      // the top-left of the tablet's dark screen: the cursor is placed from here
      points: { screen: [12, 3] },
    },
  },
  tech: {
    plate: {
      size: [352, 198],
      // Three of the painted stars: each twinkles now and then. 'star-a' and 'star-b' are the bright pair high
      // in the sky, which a 16:9 screen does not reach; 'star-c' is the faint one beside the moon, which it does.
      points: { 'pool-left': [192, 148], 'pool-right': [232, 148], rill: [211, 132], 'star-a': [244, 13], 'star-b': [204, 8], 'star-c': [302, 36] },
      patches: {
        jet: (edit) => [
          edit().lift(226, 141, 225, 142).lift(225, 142, 226, 141),
          edit().lift(226, 142, 226, 141).lift(226, 141, 225, 142).lift(225, 144, 226, 144),
        ],
      },
    },
    lantern: {
      size: [13, 49],
      // the middle of the flame: the moths circle it
      points: { flame: [7, 35] },
      patches: {
        // the flame's pale core draws in, then flares
        flame: (edit) => [
          edit().lift(8, 34, 8, 35).lift(7, 33, 6, 33).lift(6, 36, 8, 35),
          edit().lift(7, 33, 7, 34).lift(8, 35, 7, 35).lift(5, 36, 5, 35),
        ],
      },
    },
    figure: {
      size: [72, 53],
      patches: {
        // typing: the screen's light moves from finger to finger
        hands: (edit) => {
          const a = () => edit().lift(33, 34, 32, 34).lift(31, 34, 33, 34).lift(35, 35, 34, 35);
          const b = () => edit().lift(33, 34, 34, 34).lift(34, 35, 33, 34).lift(30, 34, 32, 34);
          return [a(), b(), a(), b(), a(), b()];
        },
        // the lit edge of the laptop's screen dims at its two ends
        screen: (edit) => [edit().lift(42, 29, 41, 32).lift(39, 35, 41, 32)],
        // the parrot asleep behind the shoulder: its back rises a pixel as it breathes in
        parrot: (edit) => [
          edit().lift(4, 13, 5, 13).lift(3, 14, 4, 14).lift(3, 15, 4, 15).lift(2, 16, 4, 16).lift(2, 17, 3, 17).lift(2, 18, 3, 18),
        ],
      },
    },
    cat: {
      size: [27, 20],
      // breathing out: the top of the back sinks a pixel
      frames: (edit) => [edit().shift(5, 0, 15, 4, 0, 1, true)],
    },
    table: {
      size: [30, 41],
      patches: {
        // the tablet's glow: the bright foot of the screen dims
        glow: (edit) => [edit().lift(16, 12, 15, 12).lift(17, 12, 15, 12).lift(15, 12, 14, 12).lift(14, 13, 15, 12).lift(16, 13, 15, 13)],
      },
    },
    rover: {
      size: [20, 19],
      patches: {
        // the light on its mast goes down to an ember
        light: (edit) => [edit().lift(10, 1, 10, 0).lift(11, 1, 10, 0).lift(10, 2, 10, 0).lift(10, 0, 8, 1).lift(9, 0, 8, 1)],
      },
    },
  },
};

// ----------------------------------------------------------------------- write

const flat = (v) => {
  if (Array.isArray(v)) return `[${v.map(flat).join(', ')}]`;
  if (!v || typeof v !== 'object') return JSON.stringify(v);
  const fields = Object.entries(v).map(([key, value]) => `${JSON.stringify(key)}: ${flat(value)}`);
  return fields.length ? `{ ${fields.join(', ')} }` : '{}';
};

async function writeStrip(stem, frames) {
  const { w, h } = frames[0];
  const data = Buffer.alloc(w * frames.length * h * 4);
  frames.forEach((frame, f) => {
    for (let y = 0; y < h; y++) frame.data.copy(data, (y * w * frames.length + f * w) * 4, y * w * 4, (y + 1) * w * 4);
  });
  await sharp(data, { raw: { width: w * frames.length, height: h, channels: 4 } })
    .png({ compressionLevel: 9 })
    .toFile(path.join(spriteDir, `${stem}.png`));
}

const metaPath = path.join(spriteDir, 'sprites.json');
const meta = JSON.parse(await readFile(metaPath, 'utf8'));

// Everything this script wrote last time goes, so a layer dropped from the art does not linger.
for (const [stem, entry] of Object.entries(meta)) {
  if (entry.source !== 'scene') continue;
  delete meta[stem];
  await rm(path.join(spriteDir, `${stem}.png`), { force: true });
}

/**
 * The pixels in which each frame differs from the pose, cut to the smallest
 * box that holds them all. Frame 0 of the patch is empty. Returns the frames
 * and where the box sits in the pose.
 */
function cutPatch(pose, frames, name) {
  let x0 = pose.w, y0 = pose.h, x1 = -1, y1 = -1;
  const differs = (frame, x, y) => frame.data.compare(pose.data, at(pose, x, y), at(pose, x, y) + 4, at(frame, x, y), at(frame, x, y) + 4) !== 0;
  for (const frame of frames) {
    for (let y = 0; y < pose.h; y++) {
      for (let x = 0; x < pose.w; x++) {
        if (!differs(frame, x, y)) continue;
        // a patch is laid over the pose, so it can paint a pixel but cannot take one away
        if (!frame.data[at(frame, x, y) + 3]) throw new Error(`${name}: a patch cannot clear (${x}, ${y}); make this a strip of whole frames`);
        x0 = Math.min(x0, x);
        y0 = Math.min(y0, y);
        x1 = Math.max(x1, x);
        y1 = Math.max(y1, y);
      }
    }
  }
  if (x1 < 0) throw new Error(`${name}: no frame differs from the pose`);
  const w = x1 - x0 + 1;
  const h = y1 - y0 + 1;
  const cut = frames.map((frame) => {
    const data = Buffer.alloc(w * h * 4);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (differs(frame, x0 + x, y0 + y)) frame.data.copy(data, (y * w + x) * 4, at(frame, x0 + x, y0 + y), at(frame, x0 + x, y0 + y) + 4);
      }
    }
    return { w, h, data };
  });
  return { frames: [{ w, h, data: Buffer.alloc(w * h * 4) }, ...cut], corner: [x0, y0] };
}

for (const staging of STAGINGS) {
  const layout = JSON.parse(await readFile(path.join(sceneDir, staging, 'layout.json'), 'utf8'));
  const report = [];
  for (const layer of layout.layers) {
    const stem = `${layer.id}.${staging}`;
    const pose = await load(path.join(sceneDir, staging, `${layer.id}.png`));
    const life = LIFE[staging][layer.id] ?? {};
    if (life.size && (pose.w !== life.size[0] || pose.h !== life.size[1])) {
      throw new Error(`${stem} is now ${pose.w}x${pose.h}. Its points and frames in LIFE were made for ${life.size.join('x')}: redo them for the new art.`);
    }
    const edit = (name) => () => editor(pose, layout.palette, name);
    const frames = [pose, ...(life.frames?.(edit(stem)) ?? []).map((kit) => kit.frame)];
    await writeStrip(stem, frames);
    const points = { ...life.points };
    report.push(`${layer.id}${frames.length > 1 ? ` (${frames.length} frames)` : ''}`);

    for (const [name, recipe] of Object.entries(life.patches ?? {})) {
      const patch = cutPatch(pose, recipe(edit(`${stem} ${name}`)).map((kit) => kit.frame), `${stem} ${name}`);
      await writeStrip(`${layer.id}-${name}.${staging}`, patch.frames);
      meta[`${layer.id}-${name}.${staging}`] = { frames: patch.frames.length, anchor: [0, 0], points: {}, emissive: false, source: 'scene' };
      // the engine pins the patch to this point of the pose
      points[name] = patch.corner;
      report.push(`${layer.id}-${name} (${patch.frames[0].w}x${patch.frames[0].h}, ${patch.frames.length} frames)`);
    }
    meta[stem] = { frames: frames.length, anchor: [0, 0], points, emissive: false, source: 'scene', at: [layer.x, layer.y] };

    if (layer.id === 'plate') {
      const lawn = layLawn(pose, staging === 'creative' ? 41 : 43);
      await writeStrip(`lawn.${staging}`, [lawn]);
      meta[`lawn.${staging}`] = { frames: 1, anchor: [0, 0], points: {}, emissive: false, source: 'scene', at: [layer.x, layer.y + pose.h] };
      report.push('lawn');
    }
  }
  console.log(`${staging}: ${report.join(', ')}`);
}

// One sprite per line, sorted, so the file is easy to scan and to diff (the layout the other art scripts write).
const rows = Object.keys(meta).sort().map((key) => `  ${JSON.stringify(key)}: ${flat(meta[key])}`);
await writeFile(metaPath, `{\n${rows.join(',\n')}\n}\n`);
