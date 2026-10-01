// The config file. Every path in it is relative to the repo root, which is
// where the tool is run from. A misspelt field would otherwise be ignored in
// silence ("ramp" for "ramps" lets a parrot borrow grass green), so every
// field is checked by name and by shape before anything is built.
import { access, readFile } from 'node:fs/promises';

export const exists = (file) => access(file).then(() => true, () => false);

const whole = Number.isInteger;
const list = (n, test) => (v) => Array.isArray(v) && v.length === n && v.every(test);
const oneOf = (...choices) => [(v) => choices.includes(v), choices.map((c) => JSON.stringify(c)).join(' or ')];
const text = [(v) => typeof v === 'string' && v !== '', 'text'];
const pair = [list(2, whole), '[x, y] in whole pixels'];
const share = [(v) => v > 0 && v <= 1, 'a number above 0, up to 1'];
const points = [(v) => typeof v === 'object' && !Array.isArray(v) && Object.values(v).every(pair[0]), 'an object of name: [x, y]'];
const flag = [(v) => typeof v === 'boolean', 'true or false'];

// field: [test, what it must be]. A field left out or set to null takes its default.
const SHARED = { anchor: pair, points, emissive: flag, pos: pair };
const ASSET = {
  ...SHARED,
  id: text,
  staging: oneOf('creative', 'tech'),
  src: text,
  key: text,
  tolerance: share,
  shadow: share,
  cell: [(v) => list(4, (n) => n >= 0 && n <= 1)(v) && v[0] < v[2] && v[1] < v[3], '[x0, y0, x1, y1] as fractions of the image, from 0 to 1'],
  component: [(v) => whole(v) && v >= 0, 'a whole number from 0'],
  size: [list(2, (v) => whole(v) && v > 0), '[w, h] in whole art pixels'],
  grid: oneOf('snap', 'even'),
  downscale: oneOf('mode', 'center', 'box'),
  cover: share,
  ramps: [(v) => Array.isArray(v) && v.every((r) => typeof r === 'string'), 'a list of ramp names'],
  dither: oneOf('none', 'bayer4'),
  despeckle: oneOf(0, 1, 2),
  outline: oneOf('none', 'ink', 'selout'),
  frames: [(v) => Array.isArray(v) && v.every((f) => f && Array.isArray(f.ops ?? [])), 'a list of { "name", "ops": [...] }'],
};
const rows = (v) => Array.isArray(v) && v.length > 0 && v.every((r) => typeof r === 'string');
const PIXELMAP = {
  ...SHARED,
  legend: [(v) => typeof v === 'object' && Object.values(v).every((c) => typeof c === 'string'), 'an object of character: colour name'],
  rows: [rows, 'a list of strings'],
  frames: [(v) => Array.isArray(v) && v.length > 0 && v.every(rows), 'a list of frames, each a list of strings'],
};

/** Throws on the first field that is unknown or has the wrong shape. */
function checkFields(item, fields) {
  if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error('must be an object');
  for (const [field, value] of Object.entries(item)) {
    if (!fields[field]) throw new Error(`unknown field "${field}" (known: ${Object.keys(fields).join(', ')})`);
    const [test, what] = fields[field];
    if (value != null && !test(value)) throw new Error(`"${field}" must be ${what}, not ${JSON.stringify(value)}`);
  }
}
export const checkAsset = (asset) => checkFields(asset, ASSET);
export const checkPixelmap = (def) => checkFields(def, PIXELMAP);

export async function loadConfig(file = 'art/art.config.json') {
  let config;
  try {
    config = JSON.parse(await readFile(file, 'utf8'));
  } catch (err) {
    const hint = err.code === 'ENOENT' ? ' (run the tool from the repo root, or pass --config)' : '';
    throw new Error(`${file}: ${err.message}${hint}`);
  }
  const defaults = { palette: 'art/palette.json', out: 'art/sprites', overrides: 'art/overrides', assets: [], pixelmaps: {} };
  const unknown = Object.keys(config).find((key) => !(key in defaults));
  if (unknown) throw new Error(`${file}: unknown field "${unknown}" (known: ${Object.keys(defaults).join(', ')})`);
  config = { ...defaults, ...config };
  if (!Array.isArray(config.assets)) throw new Error(`${file}: "assets" must be a list`);
  if (!config.pixelmaps || typeof config.pixelmaps !== 'object' || Array.isArray(config.pixelmaps)) throw new Error(`${file}: "pixelmaps" must be an object of name: pixel map`);
  return config;
}
