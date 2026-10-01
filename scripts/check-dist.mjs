// Checks the built pages without a browser: each route must already contain
// its own content as plain HTML, so the site reads without JavaScript, and
// every piece of section art the pages can ask for must have been built.
import { access, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');

// Every page has the same four sections (so a split switch keeps its place) and the band between them.
const everyPage = ['<h1', 'id="about"', 'id="work"', 'id="proof"', 'id="contact"', 'class="band"', 'sumud'];

// The owner's real content, one telling line of it per page, so a page built from stale content fails.
const expectations = {
  'index.html': { split: 'creative', has: ['videographer', 'showreel', 'a returning client', 'global finalist'], lacks: ['metagross'] },
  'creative.html': { split: 'creative', has: ['videographer', 'showreel', 'a returning client', 'global finalist'], lacks: ['metagross'] },
  'tech.html': { split: 'tech', has: ['metagross', 'cassetto', 'project sparrow', '700+', 'shahan-ayyubi-resume.pdf'], lacks: ['showreel'] },
};

const failures = [];
// React writes an apostrophe in text as an entity; compare against the page with those turned back.
const plain = (html) => html.replaceAll('&#x27;', "'");

for (const [file, expected] of Object.entries(expectations)) {
  let html;
  try {
    html = plain(await readFile(path.join(dist, file), 'utf8'));
  } catch {
    failures.push(`${file}: missing`);
    continue;
  }
  if (!html.includes(`data-split="${expected.split}"`)) failures.push(`${file}: not marked as ${expected.split}`);
  if (html.includes('<!--app-->')) failures.push(`${file}: was not prerendered`);
  // The dotted outline that marks drafts and placeholders is for development only.
  if (html.includes('data-draft')) failures.push(`${file}: draft markers leaked into production HTML`);
  // Nothing may be hidden waiting for a script: reveals start in their final state.
  if (html.includes('data-resolve')) failures.push(`${file}: a reveal was prerendered in its hidden state`);
  for (const needle of [...everyPage, ...expected.has]) if (!html.includes(needle)) failures.push(`${file}: expected "${needle}"`);
  for (const needle of expected.lacks) if (html.includes(needle)) failures.push(`${file}: should not contain "${needle}"`);

  // Every section-art file the page points at was built and copied.
  for (const [, src] of html.matchAll(/(?:src|href)="\/?(art\/sections\/[^"]+)"/g)) {
    await access(path.join(dist, src)).catch(() => failures.push(`${file}: missing ${src}`));
  }
}

// The section art as a whole: the index, and everything it lists.
try {
  const index = JSON.parse(await readFile(path.join(dist, 'art', 'sections', 'index.json'), 'utf8'));
  for (const staging of ['creative', 'tech']) {
    const files = [index[staging].band.src, index[staging].garden.src, ...Object.values(index[staging].sprites).map((sprite) => sprite.src)];
    for (const src of files) {
      await access(path.join(dist, 'art', 'sections', src)).catch(() => failures.push(`section art: missing ${src}`));
    }
  }
} catch {
  failures.push('section art: dist/art/sections/index.json is missing (run npm run art:sections)');
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log(`dist ok: ${Object.keys(expectations).join(', ')}, and the section art`);
