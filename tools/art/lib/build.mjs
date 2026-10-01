// The `build` command: every asset and pixelmap in the config through the
// pipeline, out as sprites, into sprites.json. Step numbers match art/README.md.
import { mkdir, readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { allowedColours, loadPalette, nearestRgb } from './color.mjs';
import { checkAsset, checkPixelmap, exists, loadConfig } from './config.mjs';
import { downscale } from './downscale.mjs';
import { contentBox, despeckle, grade, outline, pixelmapFrames, rigFrame, strip } from './finish.mjs';
import { GRID_SURE, detectPeriod, evenLines, gradientProfiles, snapLines } from './grid.mjs';
import { cropRaster, cropSprite, loadRaster, rasterToSprite, saveRaster, spriteToRaster } from './image.mjs';
import { coloursNearKey, components, describeKey, despill, resolveKey, subjectBox, subjectMask } from './key.mjs';
import { STAGINGS, checkSprite, parseName, readManifest, writeManifest } from './sprites.mjs';

const whole = (img) => ({ x0: 0, y0: 0, x1: img.w, y1: img.h });

/** The sides of a crop on which at least `run` subject pixels sit. */
function sidesTouched({ w, h, mask }, run) {
  const count = (from, step, n) => {
    let hits = 0;
    for (let i = 0; i < n; i++) hits += mask[from + i * step];
    return hits >= run;
  };
  const sides = { left: count(0, w, h), top: count(0, 1, w), right: count(w - 1, w, h), bottom: count((h - 1) * w, 1, w) };
  return Object.keys(sides).filter((side) => sides[side]);
}

/** Steps 1 to 9 for one asset: raw image in, one clean frame on the palette out. */
async function cleanFrame(asset, { palette, rawCache }, report) {
  const allowed = allowedColours(palette, asset.ramps);
  const keyOptions = { tolerance: asset.tolerance, shadow: asset.shadow };
  // Dither is for smooth plates. Those have no fake pixels to vote on or to
  // follow (the only grid in them is JPEG's 8 px blocks), so with dither the
  // defaults become an average over an even grid.
  const dither = asset.dither ?? 'none';
  const smooth = dither !== 'none';
  const snap = (asset.grid ?? (smooth ? 'even' : 'snap')) === 'snap';
  let how = asset.downscale ?? (smooth ? 'box' : 'mode');
  if (smooth && how === 'mode') {
    report.warn('dither needs a blended colour to work from; using "downscale": "box"');
    how = 'box';
  }

  // Steps 1 and 2. A sheet feeds several assets, so each image is loaded and keyed once.
  const cacheKey = JSON.stringify([asset.src, asset.key, keyOptions]);
  if (!rawCache.has(cacheKey)) {
    const img = await loadRaster(asset.src);
    const { key, unsure } = resolveKey(asset.key ?? 'auto', img, keyOptions);
    rawCache.set(cacheKey, { img, key, unsure, mask: subjectMask(img, key, keyOptions) });
  }
  const { img, key, unsure, mask } = rawCache.get(cacheKey);
  if (unsure) report.warn(`${unsure}, so no key was taken and the whole image is used. Set "key": "none" for a plate, or "key": "#rrggbb" for a background`);
  const eaten = coloursNearKey(key, palette, allowed, keyOptions);
  if (eaten.length) report.warn(`the key ${describeKey(key)} is close to ${eaten.join(', ')}, which this asset may use: parts in those colours may be cut out. Generate on a key far from the subject's colours`);

  // Step 3: the part of the image this asset comes from.
  let rect = whole(img);
  if (asset.cell) {
    const [x0, y0, x1, y1] = asset.cell;
    rect = { x0: Math.round(x0 * img.w), y0: Math.round(y0 * img.h), x1: Math.round(x1 * img.w), y1: Math.round(y1 * img.h) };
  } else if (asset.component != null) {
    const objects = components(mask, img.w, img.h);
    rect = objects[asset.component];
    if (!rect) throw new Error(`"component": ${asset.component}, but the sheet has ${objects.length} objects (numbered from 0)`);
  }
  const crop = cropRaster(img, mask, rect);

  // The subject's own box becomes the sprite, so the box's sides are the
  // outermost grid lines. The first pass only estimates the scale, to size
  // the speck filter of the second.
  const loose = key ? subjectBox(crop.mask, crop.w, whole(crop)) : whole(crop);
  if (!loose) throw new Error('found nothing but key colour');
  const speck = Math.max(1, Math.round((loose.x1 - loose.x0) / asset.size[0] / 4));
  const box = key ? subjectBox(crop.mask, crop.w, whole(crop), speck) : loose;
  const scale = [(box.x1 - box.x0) / asset.size[0], (box.y1 - box.y0) / asset.size[1]];
  if (Math.min(...scale) < 1) throw new Error(`the art is ${box.x1 - box.x0}x${box.y1 - box.y0} px, smaller than "size" [${asset.size}]`);
  if (key && asset.cell) {
    const cut = sidesTouched(crop, speck);
    if (cut.length) report.warn(`the art touches the ${cut.join(', ')} edge of its "cell": the cell cuts through an object, or takes in part of its neighbour`);
  }

  // Step 4: the grid lines, per axis. "size" decides how many cells there
  // are; the art's own grid only gets to say where the lines between them
  // fall, and to object when it clearly has a different number of pixels.
  const profiles = gradientProfiles(crop, crop.mask, box);
  const [xs, ys] = [profiles.gx, profiles.gy].map((profile, axis) => {
    const length = profile.length + 1;
    const count = asset.size[axis];
    const side = axis ? 'tall' : 'wide';
    const found = snap && detectPeriod(profile);
    // The period is good to about 3%, so a count is only doubted beyond that:
    // one off in ten is caught, one off in fifty is not.
    const fits = found && found.strength >= GRID_SURE ? length / found.period : count;
    if (Math.abs(fits - count) >= 0.5 + 0.03 * count) {
      report.warn(`the art's own pixels are ${found.period} px ${side}, which makes it ${Math.round(fits)} ${side}; "size" asks for ${count} (${scale[axis].toFixed(1)} px each)`);
    }
    // Under 4 px a cell there are no edges worth following.
    const follow = snap && scale[axis] >= 4;
    return (follow ? snapLines(profile, count) : evenLines(length, count)).map((v) => v + (axis ? box.y0 : box.x0));
  });

  // Despill, the rest of step 2, waits until the scale is known: the fringe
  // it cleans may be at most 0.15 of a cell wide, or the middle of an edge
  // cell would be painted from its neighbour.
  if (key && !key.alpha) despill(crop, crop.mask, Math.max(1, Math.round(Math.min(...scale) * 0.15)));

  // Steps 5 to 9.
  let sprite = downscale(crop, crop.mask, { xs, ys }, { how, cover: asset.cover ?? 0.5, palette, allowed, nearest: nearestRgb(palette, allowed), dither });
  sprite = despeckle(sprite, palette, asset.despeckle ?? 0);
  return outline(sprite, palette, asset.outline ?? 'none', asset.ramps);
}

/** A hand repaint at art resolution stands in for steps 1 to 9. */
async function overrideFrame(file, asset, palette, report) {
  const snap = nearestRgb(palette, allowedColours(palette, asset.ramps));
  const { sprite, offPalette, softAlpha } = rasterToSprite(await loadRaster(file), palette, snap);
  if (offPalette) report.warn(`${file}: ${offPalette} pixel(s) are not palette colours; snapped to the nearest allowed colour`);
  if (softAlpha) report.warn(`${file}: ${softAlpha} pixel(s) have soft alpha; cut at half`);
  if (asset.size && (sprite.w !== asset.size[0] || sprite.h !== asset.size[1])) {
    throw new Error(`${file} is ${sprite.w}x${sprite.h}, but "size" is [${asset.size}]`);
  }
  return sprite;
}

/**
 * Steps 10 to 12: frames in; file names, sprites and the manifest entry out.
 * `item` is an asset or a pixelmap. Pixelmaps are written exactly as drawn,
 * so they are not trimmed.
 */
function finish(item, frames, { palette, trim, source }, report) {
  let anchor = item.anchor ?? [0, 0];
  let points = item.points ?? {};
  const { w, h } = frames[0];
  for (const [name, [x, y]] of Object.entries({ anchor, ...points })) {
    if (!(x >= 0 && y >= 0 && x <= w && y <= h)) throw new Error(`${name} [${x}, ${y}] is outside the ${w}x${h} frame`);
  }
  const box = contentBox(frames);
  if (!box) throw new Error('came out fully transparent');

  if (trim) {
    // Trim to the art, but never past the anchor or a named point: they must stay within the frame.
    for (const [x, y] of [anchor, ...Object.values(points)]) {
      [box.x0, box.y0, box.x1, box.y1] = [Math.min(box.x0, x), Math.min(box.y0, y), Math.max(box.x1, x), Math.max(box.y1, y)];
    }
    frames = frames.map((f) => cropSprite(f, box.x0, box.y0, box.x1 - box.x0, box.y1 - box.y0));
    // The anchor and points were given in the untrimmed frame; move them along.
    const move = ([x, y]) => [x - box.x0, y - box.y0];
    anchor = move(anchor);
    points = Object.fromEntries(Object.entries(points).map(([name, p]) => [name, move(p)]));
    if (frames[0].w !== w || frames[0].h !== h) {
      report.warn(`trimmed from ${w}x${h} to ${frames[0].w}x${frames[0].h} (offset [${box.x0}, ${box.y0}]): the art does not fill "size"`);
    }
  }

  // Step 12: shared, non-glowing sprites also get a dusk version, unless the swap changes nothing.
  const day = strip(frames);
  const dusk = grade(day, palette);
  const graded = !item.staging && !item.emissive && dusk.px.some((c, i) => c !== day.px[i]);
  let files = [{ name: item.id, sprite: day }];
  if (item.staging) files = [{ name: `${item.id}.${item.staging}`, sprite: day }];
  else if (graded) files = [{ name: `${item.id}.creative`, sprite: day }, { name: `${item.id}.tech`, sprite: dusk }];

  return {
    id: item.id,
    entry: { frames: frames.length, anchor, points, emissive: Boolean(item.emissive), source },
    files,
    frame: { w: frames[0].w, h: frames[0].h },
  };
}

/**
 * A staging file is shown in place of the shared file of the same id, so a
 * new sprite can be hidden by an old one, or leave an old one unreachable.
 * Returns those old sprites as [{ name, by }]. `claimed` holds the names the
 * config asks for; `has(name)` says whether a sprite file will exist once the
 * build is written.
 */
function staleSprites(built, claimed, has) {
  const stale = [];
  for (const b of built) {
    const staged = STAGINGS.map((s) => `${b.id}.${s}`);
    let names = [];
    // a new shared file: staging files that nothing in the config asks for would hide it
    if (b.files[0].name === b.id) names = staged.filter((name) => !claimed.includes(name));
    // both stagings have their own file: the shared one can no longer be shown
    else if (staged.every(has)) names = [b.id];
    // (both staging sprites of an id point at the same shared file: list it once)
    stale.push(...names.filter((name) => !stale.some((old) => old.name === name)).map((name) => ({ name, by: b })));
  }
  return stale;
}

/** Counts warnings and errors as they are printed. With --strict a warning is an error. */
function reporter(strict) {
  const report = {
    warnings: 0,
    errors: 0,
    error(message) {
      report.errors++;
      console.error(`  error  ${message}`);
    },
    warn(message) {
      if (strict) return report.error(message);
      report.warnings++;
      console.warn(`  warn   ${message}`);
    },
  };
  return report;
}

export async function build(opts) {
  const config = await loadConfig(opts.config);
  const palette = await loadPalette(config.palette);
  const outDir = opts.out ?? config.out;
  const report = reporter(opts.strict);
  const built = [];

  // A pixelmap is named like the sprite it becomes: "<id>", "<id>.creative" or "<id>.tech".
  const nameOf = (asset) => (asset.staging ? `${asset.id}.${asset.staging}` : `${asset.id}`);
  const ids = [...Object.keys(config.pixelmaps).map((name) => name.split('.')[0]), ...config.assets.map((a) => a?.id)];
  const only = opts.only?.split(',').map((s) => s.trim());
  const missing = only?.filter((id) => !ids.includes(id));
  if (missing?.length) throw new Error(`--only: the config has no ${missing.join(', ')} (it has: ${[...new Set(ids)].join(', ') || 'nothing'})`);
  const wanted = (id) => !only || only.includes(id);

  const run = async (label, make) => {
    console.log(label);
    try {
      const result = await make();
      built.push(result);
      const frames = result.entry.frames > 1 ? ` x ${result.entry.frames} frames` : '';
      for (const f of result.files) console.log(`  ${f.name}.png  ${result.frame.w}x${result.frame.h}${frames}`);
    } catch (err) {
      report.error(err.message);
    }
  };

  for (const [name, def] of Object.entries(config.pixelmaps)) {
    if (!wanted(name.split('.')[0])) continue;
    await run(`${name} (pixelmap)`, async () => {
      const named = parseName(name);
      if (!named) throw new Error('name a pixelmap <id>, <id>.creative or <id>.tech (id: lowercase letters, digits, dashes)');
      checkPixelmap(def);
      return finish({ ...def, ...named }, pixelmapFrames(def, palette, name), { palette, trim: false, source: 'generated' }, report);
    });
  }

  const ctx = { palette, rawCache: new Map() };
  for (const asset of config.assets) {
    if (!wanted(asset?.id)) continue;
    const name = nameOf(asset ?? {});
    await run(name, async () => {
      checkAsset(asset);
      if (!asset.id || !parseName(name)) throw new Error(`"id" must be lowercase letters, digits and dashes, not ${JSON.stringify(asset.id)}`);
      const repaint = path.join(config.overrides, `${name}.png`);
      const overridden = await exists(repaint);
      if (!overridden && !asset.src) throw new Error(`needs "src", or a repaint at ${repaint}`);
      if (!overridden && !asset.size) throw new Error('needs "size": [w, h] in art pixels');
      const base = overridden ? await overrideFrame(repaint, asset, palette, report) : await cleanFrame(asset, ctx, report);
      // Step 11: each frame is the clean frame with its own small edits.
      const rig = { palette, pixelmaps: config.pixelmaps, where: name };
      const frames = asset.frames?.length ? asset.frames.map((f) => rigFrame(base, f.ops, rig)) : [base];
      return finish(asset, frames, { palette, trim: true, source: overridden ? 'override' : 'generated' }, report);
    });
  }

  // A repaint only takes effect through an asset of the same name; one without is easy to miss.
  const assetNames = config.assets.map((a) => nameOf(a ?? {}));
  for (const file of await readdir(config.overrides).catch(() => [])) {
    if (file.endsWith('.png') && !assetNames.includes(file.slice(0, -4))) {
      report.warn(`${path.join(config.overrides, file)} is not used: no asset in the config is named ${file.slice(0, -4)}`);
    }
  }

  const names = built.flatMap((b) => b.files.map((f) => f.name));
  const twice = names.find((n, i) => names.indexOf(n) !== i);
  if (twice) report.error(`${twice}.png is produced twice; an id may appear once, or once per staging`);

  // Old sprites the new ones replace are removed, but only ones sprites.json
  // knows: a file it has no line for was put there by hand and is not ours.
  const manifest = await readManifest(outDir);
  const onDisk = (await readdir(outDir).catch(() => [])).filter((f) => f.endsWith('.png')).map((f) => f.slice(0, -4));
  const claimed = [...Object.keys(config.pixelmaps), ...assetNames];
  const stale = staleSprites(built, claimed, (name) => names.includes(name) || onDisk.includes(name));
  for (const { name, by } of stale) {
    if (names.includes(name)) {
      report.error(`${name}.png would never be shown: both stagings have their own sprite`);
    } else if (onDisk.includes(name) && !manifest[name]) {
      report.error(`${path.join(outDir, `${name}.png`)} would be shown in place of the new ${by.files[0].name}.png, and has no line in sprites.json; move or delete it by hand`);
    }
  }
  if (report.errors) {
    console.error(`\n${report.errors} error(s); nothing was written.`);
    process.exit(1);
  }

  // Step 13: write the sprites and merge the manifest, leaving other sprites'
  // entries alone. Every file gets an entry under its own name.
  await mkdir(outDir, { recursive: true });
  for (const b of built) {
    for (const f of b.files) {
      await saveRaster(path.join(outDir, `${f.name}.png`), spriteToRaster(f.sprite, palette));
      manifest[f.name] = b.entry;
    }
  }
  // A replaced sprite's entry stays, as a copy of the new one, because
  // scripts/make-greybox.mjs redraws every name that is not marked as real art.
  for (const { name, by } of stale) {
    if (manifest[name]) manifest[name] = by.entry;
    if (!onDisk.includes(name)) continue;
    await rm(path.join(outDir, `${name}.png`));
    console.log(`  removed ${name}.png (replaced by ${by.files.map((f) => `${f.name}.png`).join(' and ')})`);
  }
  await writeManifest(outDir, manifest);

  // Step 14: read back what was written and hold it to the contract.
  for (const b of built) {
    for (const f of b.files) {
      const file = path.join(outDir, `${f.name}.png`);
      for (const problem of await checkSprite(file, b.entry, palette, b.frame)) report.error(`${file}: ${problem}`);
    }
  }
  console.log(`\n${names.length} file(s) for ${built.length} sprite(s) written to ${outDir}; ${report.warnings} warning(s), ${report.errors} self-check failure(s).`);
  if (report.errors) process.exit(1);
}
