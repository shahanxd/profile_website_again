// Art clean-up tool. Generated "pixel art" arrives large, off-grid, blurred
// and in drifting colours; this turns it into true sprites on the master
// palette and records them in sprites.json. Run it from the repo root.
// The pipeline and every option are explained in art/README.md.
import path from 'node:path';
import { parseArgs } from 'node:util';
import { build } from './lib/build.mjs';
import { allowedColours, loadPalette, nearestRgb } from './lib/color.mjs';
import { exists, loadConfig } from './lib/config.mjs';
import { GRID_SURE, detectPeriod, gradientProfiles } from './lib/grid.mjs';
import { blitSprite, fillRect, loadRaster, newRaster, rasterToSprite, saveRaster } from './lib/image.mjs';
import { OBJECT_GAP, coloursNearKey, components, describeKey, resolveKey, subjectBox, subjectMask } from './lib/key.mjs';
import { exportPalette, fit, swatch } from './lib/palette-tools.mjs';
import { STAGINGS, checkDir, entryFor, parseName, readManifest } from './lib/sprites.mjs';

const USAGE = `Usage, from the repo root:
  node tools/art/pixelize.mjs inspect <raw.png> [--key #rrggbb|alpha|none]
  node tools/art/pixelize.mjs build [--config art/art.config.json] [--only id,id] [--out dir] [--strict]
  node tools/art/pixelize.mjs compose --staging creative|tech [--scale 6] [--out file.png] [--dir sprites] [--config file]
  node tools/art/pixelize.mjs palette --swatch [--out file.png] | --export hex,gpl,act [--out dir] | --fit <image.png>
  node tools/art/pixelize.mjs check [--dir art/sprites]
See art/README.md.`;

// The camera's view of the scene in art pixels, and where the lawn starts (docs/PLAN.md).
const VIEW = { w: 320, h: 180, lawn: 118 };

const say = console.log;

/** What a raw image holds: its key colour, the objects on it, their pixel grid and a size to try. */
async function inspect(file, opts) {
  if (!file) throw new Error('inspect needs an image');
  const img = await loadRaster(file);
  const { key, unsure } = resolveKey(opts.key ?? 'auto', img);
  const mask = subjectMask(img, key);
  say(file);
  say(`  size     ${img.w} x ${img.h}`);
  say(`  key      ${describeKey(key)}${key?.coverage ? `, ${Math.round(key.coverage * 100)}% of the border` : ''}${unsure ? `: ${unsure}` : ''}`);
  const palette = await loadPalette((await loadConfig(opts.config)).palette);
  const eaten = coloursNearKey(key, palette, allowedColours(palette));
  if (eaten.length) say(`           close to palette colours ${eaten.join(', ')}: art in those colours may be cut out`);

  const objects = key ? components(mask, img.w, img.h) : [{ x0: 0, y0: 0, x1: img.w, y1: img.h }];
  if (!objects.length) return say('  nothing but key colour');
  say(`  objects  ${objects.length}${objects.length > 1 ? ' (a sheet: give each asset a "cell" or a "component")' : ''}`);

  objects.forEach((loose, n) => {
    const box = subjectBox(mask, img.w, loose);
    const { gx, gy } = gradientProfiles(img, mask, box);
    const [px, py] = [detectPeriod(gx), detectPeriod(gy)];
    const grid = (found, origin) =>
      found ? `period ${found.period} px, phase ${((origin + found.phase) % found.period).toFixed(2)}, strength ${found.strength}` : 'no clear grid';
    // A cell to paste into the config: the object plus a margin, as fractions of the image.
    const pad = (Math.max(img.w, img.h) * OBJECT_GAP) / 2;
    const cell = [(box.x0 - pad) / img.w, (box.y0 - pad) / img.h, (box.x1 + pad) / img.w, (box.y1 + pad) / img.h];
    say(`  object ${n}`);
    say(`    box    x ${box.x0}-${box.x1}, y ${box.y0}-${box.y1} (${box.x1 - box.x0} x ${box.y1 - box.y0} px)`);
    say(`    cell   [${cell.map((v) => Math.min(1, Math.max(0, v)).toFixed(3)).join(', ')}]`);
    say(`    grid x ${grid(px, box.x0)}`);
    say(`    grid y ${grid(py, box.y0)}`);
    if (px && py) {
      const size = [Math.round((box.x1 - box.x0) / px.period), Math.round((box.y1 - box.y0) / py.period)];
      const shaky = Math.min(px.strength, py.strength) < GRID_SURE ? '  (weak grid: treat as a guess)' : '';
      say(`    suggested "size": [${size.join(', ')}]${shaky}`);
    }
  });
}

/**
 * Draws every sprite that has a "pos" in the config at its place in the
 * camera view, on a flat sky and lawn. A quick look at how sprites sit
 * together; the real renderer is the hero engine.
 */
async function compose(opts) {
  if (!STAGINGS.includes(opts.staging)) throw new Error('compose needs --staging creative or --staging tech');
  const scale = Number(opts.scale ?? 6);
  if (!Number.isInteger(scale) || scale < 1) throw new Error('--scale must be a whole number');
  const config = await loadConfig(opts.config);
  const palette = await loadPalette(config.palette);
  const dir = opts.dir ?? config.out;
  const manifest = await readManifest(dir);
  const rgb = (name) => palette.rgb[palette.id(name, 'compose')];
  const snap = nearestRgb(palette, allowedColours(palette));

  const dusk = opts.staging === 'tech';
  const canvas = newRaster(VIEW.w * scale, VIEW.h * scale, rgb(dusk ? 'blueviolet' : 'apricot'));
  fillRect(canvas, 0, VIEW.lawn * scale, canvas.w, canvas.h, rgb(dusk ? 'duskgrass' : 'grass'));

  const placed = [...config.assets, ...Object.entries(config.pixelmaps).map(([name, def]) => ({ ...def, ...parseName(name) }))];
  let drawn = 0;
  for (const item of placed) {
    if (!item.pos || (item.staging && item.staging !== opts.staging)) continue;
    // the staging's own file if there is one, else the shared file
    const own = `${item.id}.${opts.staging}`;
    const name = (await exists(path.join(dir, `${own}.png`))) ? own : item.id;
    if (!(await exists(path.join(dir, `${name}.png`)))) {
      say(`  skipped ${item.id}: no sprite in ${dir}`);
      continue;
    }
    const entry = entryFor(manifest, name) ?? { frames: 1, anchor: [0, 0] };
    const { sprite } = rasterToSprite(await loadRaster(path.join(dir, `${name}.png`)), palette, snap);
    blitSprite(canvas, sprite, palette, (item.pos[0] - entry.anchor[0]) * scale, (item.pos[1] - entry.anchor[1]) * scale, scale, 0, entry.frames);
    drawn++;
  }
  // art/raw is git-ignored, so previews stay out of commits
  const out = opts.out ?? `art/raw/preview-${opts.staging}.png`;
  await saveRaster(out, canvas);
  say(`${drawn} sprite(s) composed at ${scale}x into ${out}`);
}

async function paletteCommand(opts) {
  const config = await loadConfig(opts.config);
  const palette = await loadPalette(config.palette);
  const home = path.dirname(config.palette);
  if (opts.swatch) return swatch(palette, config.pixelmaps, opts.out ?? path.join(home, 'palette-swatch.png'));
  if (opts.export) return exportPalette(palette, opts.export.split(',').map((s) => s.trim()), opts.out ?? home);
  if (opts.fit) return fit(opts.fit, palette);
  throw new Error('palette needs --swatch, --export hex,gpl,act or --fit <image>');
}

async function check(opts) {
  const config = await loadConfig(opts.config);
  const dir = opts.dir ?? config.out;
  const { count, problems } = await checkDir(dir, await loadPalette(config.palette));
  for (const problem of problems) console.error(`  ${problem}`);
  say(`${dir}: ${count} sprite file(s), ${problems.length} problem(s)`);
  if (problems.length) process.exit(1);
}

const OPTIONS = {
  config: { type: 'string' },
  only: { type: 'string' },
  out: { type: 'string' },
  dir: { type: 'string' },
  strict: { type: 'boolean' },
  staging: { type: 'string' },
  scale: { type: 'string' },
  key: { type: 'string' },
  swatch: { type: 'boolean' },
  export: { type: 'string' },
  fit: { type: 'string' },
  help: { type: 'boolean', short: 'h' },
};
const commands = { inspect: (opts, file) => inspect(file, opts), build, compose, palette: paletteCommand, check };

try {
  // inside the try: a mistyped flag should read as an error, not a stack trace
  const { values: opts, positionals } = parseArgs({ allowPositionals: true, options: OPTIONS });
  const command = commands[positionals[0]];
  if (opts.help || !command) {
    say(USAGE);
    process.exit(opts.help ? 0 : 1);
  }
  await command(opts, positionals[1]);
} catch (err) {
  console.error(`error: ${err.message}`);
  process.exit(1);
}
