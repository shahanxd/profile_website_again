// Turns the client build into three static pages: / and /creative (creative
// split) and /tech. Run by `npm run build` after the client and server builds.
import { readFile, writeFile, rm } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');

const { render, SPLITS } = await import(pathToFileURL(path.join(root, 'dist-ssr', 'entry-server.js')).href);
const template = await readFile(path.join(dist, 'index.html'), 'utf8');

if (!template.includes('<!--app-->')) {
  throw new Error('dist/index.html has no <!--app--> marker; was it already prerendered?');
}

const escapeAttr = (value) => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;');

function page(split) {
  const meta = SPLITS[split];
  return template
    .replace('<!--app-->', render(split))
    .replace(/<html lang="en" data-split="[^"]*"/, `<html lang="en" data-split="${split}"`)
    .replace(/<title>[^<]*<\/title>/, `<title>${meta.title}</title>`)
    .replace(
      /<meta name="description" content="[^"]*"/,
      `<meta name="description" content="${escapeAttr(meta.description)}"`,
    )
    .replace(/<meta name="theme-color" content="[^"]*"/, `<meta name="theme-color" content="${meta.themeColor}"`);
}

// Flat files (tech.html, not tech/index.html) so hosts serve /tech without a trailing-slash redirect.
const pages = { 'index.html': 'creative', 'creative.html': 'creative', 'tech.html': 'tech' };

for (const [file, split] of Object.entries(pages)) {
  await writeFile(path.join(dist, file), page(split));
  console.log(`prerendered ${file} (${split})`);
}

await rm(path.join(root, 'dist-ssr'), { recursive: true, force: true });
