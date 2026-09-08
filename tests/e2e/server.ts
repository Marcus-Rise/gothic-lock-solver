import { access, readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { join } from 'node:path';
import { distDirectory } from './paths.ts';

const root = new URL('../../', import.meta.url);
const runtimeFiles = [
  'gothic-lock-solver.mjs',
  'gothic-lock-solver.min.mjs',
  'gothic-lock-solver.js',
  'gothic-lock-solver.min.js',
];
const fixtureFiles = [
  'module.html',
  'module.min.html',
  'classic.html',
  'classic.min.html',
  'worker.html',

];
const generatedFiles = ['module.mjs', 'module.min.mjs', 'worker.mjs', 'worker.min.mjs', 'classic.js', 'classic.min.js'];
const generated = new URL('../../artifacts/e2e/fixtures/', import.meta.url);
const paths = new Set([
  ...runtimeFiles.map((file) => `/dist/${file}`),
  ...fixtureFiles.map((file) => `/tests/e2e/fixtures/${file}`),
  ...generatedFiles.map((file) => `/tests/e2e/fixtures/${file}`),
]);

// Starting this server never builds or transforms the artifacts being tested.
await Promise.all(runtimeFiles.map(async (file) => {
  try {
    await access(join(distDirectory, file));
  } catch (cause) {
    throw new Error(`Missing ${join(distDirectory, file)}; run pnpm build before pnpm test:e2e.`, { cause });
  }
}));

const server = createServer((request, response) => {
  const pathname = new URL(request.url ?? '/', 'http://127.0.0.1:4177').pathname;
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { Allow: 'GET, HEAD' });
    response.end();
    return;
  }
  if (pathname === '/health') {
    response.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end(request.method === 'HEAD' ? undefined : 'ready');
    return;
  }
  if (!paths.has(pathname)) {
    response.writeHead(404);
    response.end();
    return;
  }
  const file = pathname.startsWith('/dist/')
    ? join(distDirectory, pathname.slice('/dist/'.length))
    : generatedFiles.includes(pathname.split('/').at(-1) ?? '')
      ? new URL(pathname.split('/').at(-1) ?? '', generated)
      : new URL(pathname.slice(1), root);
  void readFile(file).then((bytes) => {
    response.writeHead(200, {
      'Content-Type': pathname.endsWith('.html')
        ? 'text/html; charset=utf-8'
        : 'application/javascript; charset=utf-8',
      'Content-Length': bytes.byteLength,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    response.end(request.method === 'HEAD' ? undefined : bytes);
  }, () => {
    response.writeHead(500);
    response.end();
  });
});

server.listen(4177, '127.0.0.1');
process.once('SIGTERM', () => {
  server.close();
});
