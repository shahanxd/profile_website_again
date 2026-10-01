// Measures the clean-up pipeline against known answers. It regenerates the
// synthetic fixtures (make-fixtures.mjs), runs the real `build` command on
// them once per variant below, and reports the share of pixels that come back
// exactly as drawn: same colour and same transparency.
//   node tools/art/test-fixtures.mjs [--out dir] [--min 97]
// Then it breaks three of the fixture assets on purpose and checks that the
// build warns about each.
// Exits 1 when the default settings recover less than --min percent of all
// pixels, when a build or its self-check fails, or when a warning is missing.
import { spawnSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { loadPalette } from './lib/color.mjs';
import { CLEAR, loadRaster, rasterToSprite } from './lib/image.mjs';
import { makeFixtures } from './make-fixtures.mjs';

const { values: opts } = parseArgs({ options: { out: { type: 'string' }, min: { type: 'string' } } });
const outRoot = opts.out ?? path.join(os.tmpdir(), 'garden-art-fixtures');
const min = Number(opts.min ?? 97);
// The default first, then what each alternative would have done with the same inputs.
const VARIANTS = {
  mode: { downscale: 'mode' },
  'even grid': { downscale: 'mode', grid: 'even' },
  'despeckle 1': { downscale: 'mode', despeckle: 1 },
  center: { downscale: 'center' },
  box: { downscale: 'box' },
};
const METHODS = Object.keys(VARIANTS);
// A fixture asset, the one thing wrong with it, and a phrase from the warning it must draw.
const MUST_WARN = [
  ['fx-parrot', { size: [15, 10] }, 'which makes it 14 wide'], // one pixel too wide
  ['fx-cup', { cell: [0.2, 0, 2 / 3, 0.5] }, 'edge of its "cell"'], // the cell takes in part of the pot
  ['fx-pot', { key: '#b08030' }, 'is close to brass'], // keyed on a colour the pot is made of
];

const config = await makeFixtures();
const palette = await loadPalette(config.palette);
const load = async (file) => rasterToSprite(await loadRaster(file), palette).sprite;

/** Compares frame 0 of a built sprite with its truth. */
async function compare(dir, id) {
  const truth = await load(path.join('art/fixtures/truth', `${id}.png`));
  // graded assets come out as <id>.creative.png (the daylight original) plus <id>.tech.png
  const built = await load(path.join(dir, `${id}.creative.png`)).catch(() => load(path.join(dir, `${id}.png`)));
  const frames = config.assets.find((a) => a.id === id).frames?.length ?? 1;
  const result = { total: truth.w * truth.h, same: 0, alpha: 0, colour: 0, confusions: new Map(), size: `${truth.w}x${truth.h}` };
  if (built.w / frames !== truth.w || built.h !== truth.h) return { ...result, size: `${built.w / frames}x${built.h}, expected ${result.size}` };
  for (let y = 0; y < truth.h; y++) {
    for (let x = 0; x < truth.w; x++) {
      const want = truth.px[y * truth.w + x];
      const got = built.px[y * built.w + x];
      if (want === got) result.same++;
      else if (want === CLEAR || got === CLEAR) result.alpha++;
      else {
        result.colour++;
        const pair = `${palette.names[want]} read as ${palette.names[got]}`;
        result.confusions.set(pair, (result.confusions.get(pair) ?? 0) + 1);
      }
    }
  }
  return result;
}

/** Runs the real build on a variant of the fixture assets, into its own folder under outRoot. */
async function build(name, assets) {
  const dir = path.join(outRoot, name.replaceAll(' ', '-'));
  await mkdir(dir, { recursive: true });
  const configFile = path.join(dir, 'config.json');
  await writeFile(configFile, JSON.stringify({ ...config, assets }, null, 2));
  return { dir, run: spawnSync(process.execPath, ['tools/art/pixelize.mjs', 'build', '--config', configFile, '--out', dir], { encoding: 'utf8' }) };
}

const results = {};
for (const how of METHODS) {
  const { dir, run } = await build(how, config.assets.map((a) => ({ ...a, ...VARIANTS[how] })));
  if (run.status !== 0) {
    console.error(run.stdout + run.stderr);
    console.error(`build failed for the "${how}" variant`);
    process.exit(1);
  }
  if (how === 'mode') process.stdout.write(run.stderr); // the default method's warnings are part of the result
  results[how] = {};
  for (const asset of config.assets) results[how][asset.id] = await compare(dir, asset.id);
}

const pct = (r) => ((r.same / r.total) * 100).toFixed(1).padStart(5) + '%';
console.log(`\nExact pixels recovered (colour and transparency). "mode" is the default; the others change one setting.`);
console.log(`${'asset'.padEnd(18)}${'size'.padEnd(8)}${METHODS.map((m) => m.padStart(13)).join('')}   mode: wrong colour / wrong alpha`);
for (const { id } of config.assets) {
  const r = results.mode[id];
  console.log(`${id.padEnd(18)}${r.size.padEnd(8)}${METHODS.map((m) => pct(results[m][id]).padStart(13)).join('')}   ${r.colour} / ${r.alpha}`);
}
// The total leaves out the hand repaint: it never went through the clean-up, so it says nothing about it.
const cleaned = config.assets.filter((a) => a.src).map((a) => a.id);
const sum = (how) => cleaned.reduce((a, id) => ({ same: a.same + results[how][id].same, total: a.total + results[how][id].total }), { same: 0, total: 0 });
console.log(`${'all cleaned pixels'.padEnd(26)}${METHODS.map((m) => pct(sum(m)).padStart(13)).join('')}`);

const confusions = new Map();
for (const r of Object.values(results.mode)) for (const [pair, n] of r.confusions) confusions.set(pair, (confusions.get(pair) ?? 0) + n);
if (confusions.size) {
  console.log(`\nWhere "mode" got a colour wrong`);
  for (const [pair, n] of [...confusions].sort((a, b) => b[1] - a[1]).slice(0, 12)) console.log(`  ${String(n).padStart(4)}  ${pair}`);
}
console.log(`\nbuilt sprites are in ${outRoot}`);

const { run: broken } = await build('must warn', MUST_WARN.map(([id, change]) => ({ ...config.assets.find((a) => a.id === id), ...change })));
const silent = MUST_WARN.filter(([, , phrase]) => !broken.stderr.includes(phrase));
console.log(`broken on purpose: ${MUST_WARN.length - silent.length} of ${MUST_WARN.length} drew their warning`);
for (const [id, change] of silent) console.error(`  no warning for ${id} with ${JSON.stringify(change)}`);

const overall = (sum('mode').same / sum('mode').total) * 100;
if (overall < min) console.error(`the default settings recovered ${overall.toFixed(1)}% of all cleaned pixels; the bar is ${min}%`);
if (overall < min || silent.length) process.exit(1);
