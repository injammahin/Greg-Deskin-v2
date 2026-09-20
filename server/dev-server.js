import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { processContact } from './contact-handler.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist');
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.xml': 'application/xml', '.txt': 'text/plain', '.webmanifest': 'application/manifest+json' };
const port = Number(process.env.PORT || 8080);

http.createServer(async (req, res) => {
  if (req.url?.split('?')[0] === '/api/contact') {
    let body = '';
    for await (const chunk of req) {
      body += chunk;
      if (Buffer.byteLength(body) > 16_384) {
        res.writeHead(413).end('Request too large');
        return;
      }
    }
    const result = await processContact({ method: req.method, body, contentType: req.headers['content-type'] || '' });
    res.setHeader('Cache-Control', 'no-store');
    if (result.status === 200 && !String(req.headers.accept || '').includes('application/json')) {
      res.writeHead(303, { Location: '/thank-you/' }).end();
      return;
    }
    res.writeHead(result.status, { 'Content-Type': 'application/json; charset=utf-8' }).end(JSON.stringify({ message: result.message }));
    return;
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405).end(); return; }
  let file;
  try {
    const url = new URL(req.url, 'http://localhost');
    const pathname = decodeURIComponent(url.pathname);
    file = path.resolve(root, `.${pathname}`);
    if (!file.startsWith(`${root}${path.sep}`) && file !== root) throw new Error('Invalid path');
    if ((await fs.stat(file)).isDirectory()) file = path.join(file, 'index.html');
    const data = await fs.readFile(file);
    res.writeHead(200, { 'Content-Type': `${types[path.extname(file)] || 'application/octet-stream'}; charset=utf-8` });
    res.end(req.method === 'HEAD' ? undefined : data);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' }).end(await fs.readFile(path.join(root, '404.html')));
  }
}).listen(port, () => console.log(`Site ready at http://localhost:${port}`));
