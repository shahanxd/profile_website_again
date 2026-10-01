// The sprite folder contract: file names, sprites.json, and the checks that
// every sprite must pass. `build` runs the same checks on what it just wrote.
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { loadRaster, rasterToSprite } from './image.mjs';

const MANIFEST = 'sprites.json';
export const STAGINGS = ['creative', 'tech'];
const ID = /^[a-z0-9-]+$/;
// "scene": cut from the painted scene by scripts/import-scene.mjs. "code": drawn by scripts/make-small-sprites.mjs.
const SOURCES = ['generated', 'override', 'scene', 'code'];

/** "cat.tech" to { id: 'cat', staging: 'tech' }; null when the name breaks the rules. */
export function parseName(name) {
  const [id, staging, ...rest] = name.split('.');
  if (rest.length || !ID.test(id) || (staging !== undefined && !STAGINGS.includes(staging))) return null;
  return { id, staging: staging ?? null };
}

export async function readManifest(dir) {
  try {
    return JSON.parse(await readFile(path.join(dir, MANIFEST), 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT') return {};
    throw new Error(`${path.join(dir, MANIFEST)}: ${err.message}`);
  }
}

/** JSON on one line with breathing room: { "a": [1, 2] }. */
function inline(value) {
  if (Array.isArray(value)) return `[${value.map(inline).join(', ')}]`;
  if (value && typeof value === 'object') {
    const fields = Object.entries(value).map(([k, v]) => `${JSON.stringify(k)}: ${inline(v)}`);
    return fields.length ? `{ ${fields.join(', ')} }` : '{}';
  }
  return JSON.stringify(value);
}

/**
 * One sprite per line, sorted by name, so a change to one sprite is a
 * one-line diff. The scripts that write sprites (scripts/make-small-sprites.mjs,
 * scripts/import-scene.mjs) write the same layout.
 */
export async function writeManifest(dir, manifest) {
  const lines = Object.keys(manifest).sort().map((key) => `  ${JSON.stringify(key)}: ${inline(manifest[key])}`);
  await writeFile(path.join(dir, MANIFEST), `{\n${lines.join(',\n')}\n}\n`);
}

/**
 * The entry that describes a sprite file: the one under the file's own name
 * ("cat.tech"), else the one under its id ("cat"). scripts/pack-atlas.mjs
 * looks entries up the same way.
 */
export function entryFor(manifest, name) {
  return manifest[name] ?? manifest[parseName(name)?.id];
}

function entryProblems(entry) {
  const out = [];
  const pair = (v) => Array.isArray(v) && v.length === 2 && v.every(Number.isInteger);
  if (!Number.isInteger(entry.frames) || entry.frames < 1) out.push('"frames" must be a whole number, 1 or more');
  if (!pair(entry.anchor)) out.push('"anchor" must be [x, y] in whole pixels');
  if (!entry.points || typeof entry.points !== 'object' || !Object.values(entry.points).every(pair)) {
    out.push('"points" must be an object of name: [x, y]');
  }
  if (typeof entry.emissive !== 'boolean') out.push('"emissive" must be true or false');
  if (!SOURCES.includes(entry.source)) out.push(`"source" must be one of ${SOURCES.join(', ')}`);
  // where the painted scene places a sprite in the world; only scene sprites carry it
  if (entry.at !== undefined && !pair(entry.at)) out.push('"at" must be [x, y] in whole pixels');
  return out;
}

/**
 * The palettes fitted to the painted scene, one per staging, read from
 * <sceneDir>/<staging>/layout.json. A staging whose layout is missing has no
 * entry. Each is shaped like a master palette as far as the checks need.
 */
export async function readScenePalettes(sceneDir) {
  const out = {};
  for (const staging of STAGINGS) {
    let layout;
    try {
      layout = JSON.parse(await readFile(path.join(sceneDir, staging, 'layout.json'), 'utf8'));
    } catch (err) {
      if (err.code === 'ENOENT') continue;
      throw new Error(`${path.join(sceneDir, staging, 'layout.json')}: ${err.message}`);
    }
    out[staging] = { exact: new Map(layout.palette.map((hex, i) => [parseInt(hex.slice(1), 16), i])) };
  }
  return out;
}

/**
 * Checks one sprite file against the contract. `palette` is the one the
 * sprite must keep to. `expect` ({ w, h } of one frame) is what the build
 * meant to write. Returns a list of problems.
 */
export async function checkSprite(file, entry, palette, expect) {
  const raster = await loadRaster(file);
  const { sprite, offPalette, softAlpha } = rasterToSprite(raster, palette);
  const out = [];
  if (softAlpha) out.push(`${softAlpha} pixels have alpha other than 0 or 255`);
  if (offPalette) out.push(`${offPalette} opaque pixels are not palette colours`);
  // (an off-palette pixel reads as transparent here, so only judge emptiness without them)
  if (!offPalette && sprite.px.every((c) => c < 0)) out.push('is fully transparent');
  if (!entry) return [...out, `has no entry in ${MANIFEST}`];

  const broken = entryProblems(entry);
  if (broken.length) return [...out, ...broken];
  const fw = raster.w / entry.frames;
  if (!Number.isInteger(fw)) return [...out, `is ${raster.w} wide, which does not divide into ${entry.frames} frames`];
  if (expect && (fw !== expect.w || raster.h !== expect.h)) out.push(`frame is ${fw}x${raster.h}, expected ${expect.w}x${expect.h}`);
  // Positions run from 0 to the frame size inclusive: [0, h] is the frame's
  // bottom-left corner, the usual anchor for something standing on the ground.
  const within = ([x, y]) => x >= 0 && y >= 0 && x <= fw && y <= raster.h;
  if (!within(entry.anchor)) out.push(`anchor [${entry.anchor}] is outside the ${fw}x${raster.h} frame`);
  for (const [name, point] of Object.entries(entry.points)) {
    if (!within(point)) out.push(`point "${name}" [${point}] is outside the ${fw}x${raster.h} frame`);
  }
  return out;
}

/**
 * Checks a whole sprite folder. Sprites keep to the master palette, except
 * those cut from the painted scene (source "scene"): each of those keeps to
 * the palette fitted to its staging, in `scenePalettes`. Alpha is all or
 * nothing for every sprite. Returns { count, problems } with problems as
 * readable lines.
 */
export async function checkDir(dir, palette, scenePalettes = {}) {
  const manifest = await readManifest(dir);
  const names = (await readdir(dir)).filter((f) => f.endsWith('.png')).map((f) => f.slice(0, -4));
  const problems = [];

  for (const name of names) {
    const parsed = parseName(name);
    if (!parsed) {
      problems.push(`${name}.png: name must be <id>.png, <id>.creative.png or <id>.tech.png (id: a-z, 0-9, dash)`);
      continue;
    }
    // <id>.png next to both variants can never be shown; next to one it is the other staging's sprite.
    if (!parsed.staging && STAGINGS.every((s) => names.includes(`${name}.${s}`))) {
      problems.push(`${name}.png: is hidden by ${name}.creative.png and ${name}.tech.png; remove it`);
    }
    const entry = entryFor(manifest, name);
    let own = palette;
    if (entry?.source === 'scene') {
      own = scenePalettes[parsed.staging];
      if (!own) {
        problems.push(`${name}.png: a scene sprite needs its staging in its name, and that staging's palette (layout.json)`);
        continue;
      }
    }
    for (const problem of await checkSprite(path.join(dir, `${name}.png`), entry, own)) {
      problems.push(`${name}.png: ${problem}`);
    }
  }

  // An entry may outlive its own file while another file of the same id
  // stands in for it (build leaves such entries on purpose); an id with no
  // file at all is a leftover.
  const ids = new Set(names.map((name) => parseName(name)?.id));
  for (const key of Object.keys(manifest)) {
    const parsed = parseName(key);
    if (!parsed) problems.push(`${MANIFEST}: "${key}" is not a valid sprite name`);
    else if (!ids.has(parsed.id)) problems.push(`${MANIFEST}: "${key}" has no sprite file`);
  }
  return { count: names.length, problems };
}
