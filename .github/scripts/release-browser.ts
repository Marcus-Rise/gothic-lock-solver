import { createServer } from 'node:http';
import { chromium, firefox, webkit, type Browser, type BrowserType } from 'playwright';
import { loadCatalog, type Fixture } from '../../tests/benchmarks/catalog.ts';
import { replayCommands, tupleCommands } from '../../tests/benchmarks/validation.ts';
import { CDN_ORIGIN, REQUIRED_LOCK_COUNT, runtimeFiles, type ReleaseManifest } from './release-lib.ts';

const TARGET_POSITION = 4;

function verifySolutions(results: unknown, locks: readonly Fixture[], context: string): void {
  if (!Array.isArray(results) || results.length !== REQUIRED_LOCK_COUNT) {
    throw new Error('CDN fixture results are incomplete');
  }

  for (const [index, result] of results.entries()) {
    const lock = locks[index];
    if (!lock) {
      throw new Error('Unexpected CDN fixture');
    }
    const commands = tupleCommands(result);
    const hasMinimumActions = commands.length === lock.expectedActions;
    const solved = hasMinimumActions && replayCommands(lock, commands)
      .every((position) => position === TARGET_POSITION);
    if (!solved) {
      throw new Error(`CDN fixture mismatch: ${context}/${lock.id}`);
    }
  }
}

async function verifyBundle(
  browser: Browser,
  filename: string,
  manifest: ReleaseManifest,
  locks: readonly Fixture[],
  origin: string,
): Promise<void> {
  const engineName = browser.browserType().name();
  const page = await browser.newPage();
  try {
    await page.goto(origin);
    const url = `${CDN_ORIGIN}/npm/${manifest.name}@${manifest.version}/dist/${filename}`;
    const runtimeRequests: string[] = [];
    page.on('request', (request) => {
      if (request.url().startsWith('https://')) {
        runtimeRequests.push(request.url());
      }
    });

    if (filename.endsWith('.js')) {
      await page.addScriptTag({ url });
    }
    const results: unknown = await page.evaluate(async ({ moduleUrl, moduleFormat, definitions }) => {
      const namespace: unknown = moduleFormat
        ? await import(moduleUrl)
        : Reflect.get(globalThis, 'GothicLockSolver');
      if (typeof namespace !== 'object' || namespace === null || !('solveLock' in namespace) || typeof namespace.solveLock !== 'function') {
        throw new Error('Missing CDN solveLock export');
      }
      const solve = namespace.solveLock;
      return definitions.map((definition): unknown => Reflect.apply(solve, undefined, [definition.state, definition.links]));
    }, {
      moduleUrl: url,
      moduleFormat: filename.endsWith('.mjs'),
      definitions: locks.map(({ state, links }) => ({ state, links })),
    });

    verifySolutions(results, locks, `${engineName}/${filename}`);
    // Each bundle must work with exactly its own request and no runtime imports.
    if (runtimeRequests.length !== 1 || runtimeRequests[0] !== url) {
      throw new Error(`Additional CDN runtime dependency: ${runtimeRequests.join(', ')}`);
    }
    console.log(`CDN browser passed: ${engineName}, ${filename}, ${REQUIRED_LOCK_COUNT} fixtures`);
  } finally {
    await page.close();
  }
}

async function verifyEngine(
  engine: BrowserType,
  manifest: ReleaseManifest,
  locks: readonly Fixture[],
  origin: string,
): Promise<void> {
  const browser = await engine.launch();
  try {
    for (const filename of runtimeFiles) {
      await verifyBundle(browser, filename, manifest, locks, origin);
    }
  } finally {
    await browser.close();
  }
}

/** Real CDN imports, in each supported engine, after byte/header verification. */
export async function verifyCdnBrowsers(manifest: ReleaseManifest): Promise<void> {
  const locks = loadCatalog();
  const server = createServer((_request, response) => {
    response.writeHead(200, { 'Content-Type': 'text/html' });
    response.end('<!doctype html><title>Gothic Lock Solver CDN verification</title>');
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });

  try {
    const address = server.address();
    if (address === null || typeof address === 'string') {
      throw new Error('Local CDN test origin unavailable');
    }
    const origin = `http://127.0.0.1:${address.port}/`;
    for (const engine of [chromium, firefox, webkit]) {
      await verifyEngine(engine, manifest, locks, origin);
    }
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => {
      if (error) reject(error);
      else resolve();
    }));
  }
}
