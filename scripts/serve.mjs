// Petit serveur statique sans dépendance : `npm start` puis ouvrir l'adresse affichée.
// Sur le même Wi-Fi, l'iPhone peut ouvrir http://<ip-de-l-ordinateur>:8080.

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const ROOT = new URL('../app/', import.meta.url).pathname;
const PORT = Number(process.env.PORT) || 8080;
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.pdf': 'application/pdf',
  '.mp3': 'audio/mpeg',
  '.json': 'application/json',
};

export function startServer(port = PORT, root = ROOT) {
  const server = createServer(async (req, res) => {
    const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const file = normalize(join(root, path.endsWith('/') ? `${path}index.html` : path));
    if (!file.startsWith(root)) {
      res.writeHead(403).end();
      return;
    }
    try {
      const body = await readFile(file);
      const type = TYPES[extname(file)] || 'application/octet-stream';
      // une partie du fichier (« Range: bytes=a-b ») : un son pris dans un paquet de sons, comme sur GitHub Pages
      const range = /^bytes=(\d+)-(\d*)$/.exec(req.headers.range || '');
      if (range) {
        const start = Number(range[1]);
        const end = Math.min(range[2] ? Number(range[2]) : body.length - 1, body.length - 1);
        if (start > end) {
          res.writeHead(416, { 'Content-Range': `bytes */${body.length}` }).end();
          return;
        }
        res.writeHead(206, { 'Content-Type': type, 'Content-Range': `bytes ${start}-${end}/${body.length}`, 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-cache' });
        res.end(body.subarray(start, end + 1));
        return;
      }
      res.writeHead(200, { 'Content-Type': type, 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-cache' });
      res.end(body);
    } catch {
      res.writeHead(404).end('Introuvable');
    }
  });
  return new Promise((resolve) => server.listen(port, () => resolve(server)));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await startServer();
  console.log(`Lire & Compter : http://localhost:${PORT}`);
}
