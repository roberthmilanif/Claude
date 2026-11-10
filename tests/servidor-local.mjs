// Servidor estático para desenvolvimento e testes: imita a Vercel (URLs limpas e os cabeçalhos do vercel.json).
// Uso: node tests/servidor-local.mjs [porta]
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'web');
const porta = Number(process.argv[2] || 4173);
const TIPOS = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8',
};
const cfg = JSON.parse(await readFile(path.join(RAIZ, 'vercel.json'), 'utf8'));
const gerais = cfg.headers.find((h) => h.source === '/(.*)').headers;

http.createServer(async (req, res) => {
  let caminho = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (caminho.endsWith('/')) caminho += 'index.html';
  for (const c of [caminho, caminho + '.html', caminho + '/index.html']) {
    const arq = path.join(RAIZ, path.normalize(c));
    if (!arq.startsWith(RAIZ)) break;
    try {
      const corpo = await readFile(arq);
      for (const h of gerais) if (h.key !== 'Strict-Transport-Security') res.setHeader(h.key, h.value);
      res.setHeader('Content-Type', TIPOS[path.extname(arq)] || 'application/octet-stream');
      res.setHeader('Cache-Control', 'no-store');
      res.end(corpo);
      return;
    } catch { /* tenta o próximo candidato */ }
  }
  res.statusCode = 404;
  res.end('não encontrado');
}).listen(porta, '127.0.0.1', () => console.log(`http://127.0.0.1:${porta}`));
