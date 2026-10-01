// Checks the built pages without a browser: each route must already contain
// its own content as plain HTML, so the site reads without JavaScript.
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');

const expectations = {
  'index.html': { split: 'creative', has: ['<h1', 'id="work"', 'sumud'], lacks: ['metagross'] },
  'creative.html': { split: 'creative', has: ['<h1', 'id="work"', 'sumud'], lacks: ['metagross'] },
  'tech.html': { split: 'tech', has: ['<h1', 'id="work"', 'metagross', 'cassetto', 'sumud'], lacks: [] },
};

const failures = [];

for (const [file, expected] of Object.entries(expectations)) {
  let html;
  try {
    html = await readFile(path.join(dist, file), 'utf8');
  } catch {
    failures.push(`${file}: missing`);
    continue;
  }
  if (!html.includes(`data-split="${expected.split}"`)) failures.push(`${file}: not marked as ${expected.split}`);
  if (html.includes('<!--app-->')) failures.push(`${file}: was not prerendered`);
  if (html.includes('data-draft')) failures.push(`${file}: draft markers leaked into production HTML`);
  for (const needle of expected.has) if (!html.includes(needle)) failures.push(`${file}: expected "${needle}"`);
  for (const needle of expected.lacks) if (html.includes(needle)) failures.push(`${file}: should not contain "${needle}"`);
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log(`dist ok: ${Object.keys(expectations).join(', ')}`);
