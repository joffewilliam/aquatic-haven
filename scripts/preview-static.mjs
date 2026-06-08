#!/usr/bin/env node
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..', 'docs');
const port = +(process.env.PORT || 8081);
const base = (process.env.BASE_PATH || '/aquatic-haven').replace(/\/$/, '');
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
};

function send(res, status, body, headers = {}) {
  res.writeHead(status, headers);
  res.end(body);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${port}`);
  let pathname = decodeURIComponent(url.pathname);
  if (!pathname.startsWith(base)) return send(res, 404, 'not found', { 'content-type': 'text/plain' });
  pathname = pathname.slice(base.length) || '/';
  const rel = normalize(pathname).replace(/^(\.\.[/\\])+/, '');
  let file = join(root, rel);
  try {
    const info = await stat(file);
    if (info.isDirectory()) file = join(file, 'index.html');
    const body = await readFile(file);
    const headers = { 'content-type': mime[extname(file)] || 'application/octet-stream' };
    headers['cache-control'] = pathname.startsWith('/assets/')
      ? 'public, max-age=31536000, immutable'
      : 'no-cache';
    return send(res, 200, body, headers);
  } catch {
    return send(res, 404, 'not found', { 'content-type': 'text/plain' });
  }
});

server.listen(port, () => console.log(`Static preview -> http://localhost:${port}${base}/`));
