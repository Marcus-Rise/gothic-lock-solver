import { createServer } from 'node:http';
import { chromium, firefox, webkit } from 'playwright';
import { loadCatalog } from '../benchmarks/catalog.ts';
import { replayCommands, tupleCommands } from '../benchmarks/validation.ts';
import { runtimeFiles, type ReleaseManifest } from './release-lib.ts';

/** Real CDN imports, in each supported engine, after byte/header verification. */
export async function verifyCdnBrowsers(manifest: ReleaseManifest): Promise<void> {
  const locks = loadCatalog();
  const server = createServer((_request, response) => {
    response.writeHead(200, { 'Content-Type': 'text/html' });
    response.end('<!doctype html><title>Gothic Lock Solver CDN verification</title>');
  });
  await new Promise<void>((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const address = server.address();
  if (address === null || typeof address === 'string') throw new Error('Local CDN test origin unavailable');
  try {
    for (const engine of [chromium, firefox, webkit]) {
      const browser = await engine.launch();
      try {
        for (const filename of runtimeFiles) {
          const page = await browser.newPage();
          try {
            await page.goto(`http://127.0.0.1:${address.port}/`);
            const url = `https://cdn.jsdelivr.net/npm/${manifest.name}@${manifest.version}/dist/${filename}`;
            const runtimeRequests: string[] = [];
            page.on('request', request => { if (request.url().startsWith('https://')) runtimeRequests.push(request.url()); });
            if (filename.endsWith('.js')) await page.addScriptTag({ url });
            const results: unknown = await page.evaluate(async ({ moduleUrl, moduleFormat, definitions }) => {
              const namespace: unknown = moduleFormat ? await import(moduleUrl) : Reflect.get(globalThis, 'GothicLockSolver');
              if (typeof namespace !== 'object' || namespace === null || !('solveLock' in namespace) || typeof namespace.solveLock !== 'function') throw new Error('Missing CDN solveLock export');
              const solve = namespace.solveLock;
              return definitions.map((definition): unknown => Reflect.apply(solve, undefined, [definition.state, definition.links]));
            }, { moduleUrl: url, moduleFormat: filename.endsWith('.mjs'), definitions: locks.map(lock => lock.definition) });
            if (!Array.isArray(results) || results.length !== 45) throw new Error('CDN fixture results are incomplete');
            for (const [index, result] of results.entries()) {
              const lock = locks[index];
              if (!lock) throw new Error('Unexpected CDN fixture');
              const commands = tupleCommands(result);
              if (commands.length !== lock.expectedActions || replayCommands(lock.definition, commands).some(position => position !== 4)) throw new Error(`CDN fixture mismatch: ${engine.name()}/${filename}/${lock.id}`);
            }
            if (runtimeRequests.length !== 1 || runtimeRequests[0] !== url) throw new Error(`Additional CDN runtime dependency: ${runtimeRequests.join(', ')}`);
            console.log(`CDN browser passed: ${engine.name()}, ${filename}, 45 fixtures`);
          } finally { await page.close(); }
        }
      } finally { await browser.close(); }
    }
  } finally { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
}
