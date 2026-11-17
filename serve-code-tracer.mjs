import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';

const ROOT = import.meta.dirname;
const PORT = Number(process.env.CODETRACER_PORT || 4280);
const DIST_BROWSER = path.join(ROOT, 'dist', 'code-tracer', 'browser');
const DIST_ALT = path.join(ROOT, 'dist', 'code-tracer');
const DIST_DIR = fs.existsSync(DIST_BROWSER) ? DIST_BROWSER : DIST_ALT;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

if (!fs.existsSync(path.join(DIST_DIR, 'index.html'))) {
  console.error(`[Code Tracer] No se encontró build en ${DIST_DIR}. Ejecuta npm run build.`);
  process.exit(1);
}

const server = http.createServer((req, res) => {
  const urlPath = new URL(req.url || '/', 'http://127.0.0.1').pathname;
  if (urlPath === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: true, app: 'code-tracer' }));
    return;
  }

  const rel = urlPath === '/' ? 'index.html' : urlPath.replace(/^\/+/, '');
  let target = path.join(DIST_DIR, rel);
  if (!target.startsWith(DIST_DIR) || !fs.existsSync(target) || fs.statSync(target).isDirectory()) {
    target = path.join(DIST_DIR, 'index.html');
  }

  const ext = path.extname(target).toLowerCase();
  res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
  fs.createReadStream(target).pipe(res);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[Code Tracer] Servidor listo en http://127.0.0.1:${PORT}`);
});
