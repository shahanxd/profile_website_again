// Two image shapes are used throughout the tool:
//   raster: { w, h, data }  RGBA bytes, for raw art and for anything we draw
//   sprite: { w, h, px }    one palette index per pixel, -1 for transparent
// Working on palette indices after the downscale makes every later step
// (despeckle, outline, rig, grade, check) exact by construction.
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

export const CLEAR = -1;

export async function loadRaster(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { w: info.width, h: info.height, data: new Uint8Array(data.buffer, data.byteOffset, data.length) };
}

export async function saveRaster(file, { w, h, data }) {
  await mkdir(path.dirname(file), { recursive: true });
  await sharp(Buffer.from(data.buffer, data.byteOffset, data.length), { raw: { width: w, height: h, channels: 4 } })
    .png({ compressionLevel: 9 })
    .toFile(file);
}

export function newRaster(w, h, rgb) {
  const data = new Uint8Array(w * h * 4);
  if (rgb) fillRect({ w, h, data }, 0, 0, w, h, rgb);
  return { w, h, data };
}

export function fillRect(raster, x, y, w, h, [r, g, b]) {
  for (let yy = Math.max(0, y); yy < Math.min(raster.h, y + h); yy++) {
    for (let xx = Math.max(0, x); xx < Math.min(raster.w, x + w); xx++) {
      raster.data.set([r, g, b, 255], (yy * raster.w + xx) * 4);
    }
  }
}

/** A rectangle of a raster together with the same rectangle of its subject mask. */
export function cropRaster(img, mask, rect) {
  const w = rect.x1 - rect.x0;
  const h = rect.y1 - rect.y0;
  const out = { w, h, data: new Uint8Array(w * h * 4), mask: new Uint8Array(w * h) };
  for (let y = 0; y < h; y++) {
    const from = (rect.y0 + y) * img.w + rect.x0;
    out.data.set(img.data.subarray(from * 4, (from + w) * 4), y * w * 4);
    out.mask.set(mask.subarray(from, from + w), y * w);
  }
  return out;
}

export function newSprite(w, h) {
  return { w, h, px: new Int16Array(w * h).fill(CLEAR) };
}

export function cropSprite(sprite, x, y, w, h) {
  const out = newSprite(w, h);
  for (let yy = 0; yy < h; yy++) {
    for (let xx = 0; xx < w; xx++) out.px[yy * w + xx] = sprite.px[(y + yy) * sprite.w + x + xx];
  }
  return out;
}

/** Sprite to RGBA using the palette. */
export function spriteToRaster(sprite, palette) {
  const out = newRaster(sprite.w, sprite.h);
  sprite.px.forEach((c, i) => {
    if (c !== CLEAR) out.data.set([...palette.rgb[c], 255], i * 4);
  });
  return out;
}

/**
 * RGBA at art resolution to a sprite. Pixels that are not exactly a palette
 * colour, or whose alpha is not 0 or 255, are counted and snapped with
 * nearest(r, g, b) when it is given; without it they are left transparent.
 */
export function rasterToSprite(raster, palette, nearest) {
  const sprite = newSprite(raster.w, raster.h);
  let offPalette = 0;
  let softAlpha = 0;
  for (let i = 0; i < sprite.px.length; i++) {
    const [r, g, b, a] = raster.data.subarray(i * 4, i * 4 + 4);
    if (a !== 0 && a !== 255) softAlpha++;
    if (a < 128) continue;
    const exact = palette.exact.get((r << 16) | (g << 8) | b);
    if (exact === undefined) offPalette++;
    sprite.px[i] = exact ?? (nearest ? nearest(r, g, b) : CLEAR);
  }
  return { sprite, offPalette, softAlpha };
}

/** Draw a sprite frame onto a raster at whole-number scale; transparent pixels are skipped. */
export function blitSprite(raster, sprite, palette, x, y, scale = 1, frame = 0, frames = 1) {
  const fw = sprite.w / frames;
  for (let sy = 0; sy < sprite.h; sy++) {
    for (let sx = 0; sx < fw; sx++) {
      const c = sprite.px[sy * sprite.w + frame * fw + sx];
      if (c !== CLEAR) fillRect(raster, x + sx * scale, y + sy * scale, scale, scale, palette.rgb[c]);
    }
  }
}
