// Serves dist/ the way the production host will: /tech is tech.html, and
// unknown paths are a 404 instead of falling back to the home page.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const port = Number(process.env.PORT ?? 4173);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
};

createServer(async (request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  const clean = pathname.replace(/\/+$/, '') || '/index';
  const candidates = path.extname(clean) ? [clean] : [`${clean}.html`];

  for (const candidate of candidates) {
    const file = path.join(dist, candidate);
    if (!file.startsWith(dist)) break;
    try {
      const body = await readFile(file);
      response.writeHead(200, { 'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream' });
      response.end(body);
      return;
    } catch {
      // try the next candidate
    }
  }
  response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
  response.end('not found');
}).listen(port, () => console.log(`dist served at http://localhost:${port}`));
