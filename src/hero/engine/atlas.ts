import type { AtlasData } from './stage';

export interface LoadedAtlas extends AtlasData {
  image: ImageBitmap;
}

/**
 * Loads public/art/atlas.json and atlas.png (see scripts/pack-atlas.mjs).
 * `base` is their address without the extension.
 */
export async function loadAtlas(base: string): Promise<LoadedAtlas> {
  // Always ask the server about the json; it is small, and it names the version of the image to fetch.
  const response = await fetch(`${base}.json`, { cache: 'no-cache' });
  if (!response.ok) throw new Error(`atlas.json: ${response.status}`);
  const data: AtlasData = await response.json();

  const png = await fetch(`${base}.png?v=${data.version}`);
  if (!png.ok) throw new Error(`atlas.png: ${png.status}`);
  // Decoded as stored: no colour management and no premultiplying, so palette colours reach the GPU exactly.
  const image = await createImageBitmap(await png.blob(), { premultiplyAlpha: 'none', colorSpaceConversion: 'none' });
  return { ...data, image };
}
