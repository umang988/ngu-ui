// Serves a built site the way Netlify does: files as themselves, prerendered pages from their
// folder's index.html, every other path the root index.html, and `.md` / `.txt` as text.
// Usage: node e2e/serve.mjs dist/demo/browser 4321
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';

const [dir, port] = process.argv.slice(2);
if (!dir || !port) {
  console.error('Usage: node e2e/serve.mjs <dir> <port>');
  process.exit(1);
}
const root = resolve(dir);
if (!existsSync(join(root, 'index.html'))) {
  console.error(`${root}/index.html is missing. Build the site first.`);
  process.exit(1);
}

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.ts': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname);
  let file = normalize(join(root, path));
  if (file.startsWith(root) && existsSync(file) && statSync(file).isDirectory()) {
    file = join(file, 'index.html');
  }
  if (!file.startsWith(root) || !existsSync(file)) {
    file = join(root, 'index.html');
  }
  res.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream' });
  createReadStream(file).pipe(res);
}).listen(Number(port), () => console.log(`Serving ${root} on http://localhost:${port}`));
