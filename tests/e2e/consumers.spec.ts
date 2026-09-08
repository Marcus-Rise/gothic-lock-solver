import { copyFile, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, test } from '@playwright/test';
import type { BrowserContext, Page } from '@playwright/test';
import { loadCatalog, loadExpectedSolutions, verifySolution } from './catalog.ts';
import type { CatalogFixture } from './catalog.ts';
import { distDirectory } from './paths.ts';

const catalog = loadCatalog();
let nativeNodeSolutions: readonly unknown[] | undefined;
const reportedBrowserVersions = new Set<string>();
test.beforeEach(({ browser, browserName }, testInfo) => {
  const version = browser.version();
  testInfo.annotations.push({ type: 'browser-version', description: `${browserName} ${version}` });
  if (!reportedBrowserVersions.has(browserName)) {
    console.log(JSON.stringify({ browser: browserName, version }));
    reportedBrowserVersions.add(browserName);
  }
});
const formats = [
  { fixture: 'module.html', bundle: 'gothic-lock-solver.mjs', classic: false },
  { fixture: 'module.min.html', bundle: 'gothic-lock-solver.min.mjs', classic: false },
  { fixture: 'classic.html', bundle: 'gothic-lock-solver.js', classic: true },
  { fixture: 'classic.min.html', bundle: 'gothic-lock-solver.min.js', classic: true },
];

function observeRequests(context: BrowserContext, page: Page) {
  const requests: string[] = [];
  const failures: string[] = [];
  const pageErrors: string[] = [];
  context.on('request', (request) => requests.push(request.url()));
  context.on('requestfailed', (request) => failures.push(request.url()));
  page.on('pageerror', (error) => pageErrors.push(error.message));
  return { requests, failures, pageErrors };
}

// Playwright serializes this function into the consumer page. All invocation logic
// stays here; the only solver available to it came from the HTML's dist import.
function exerciseConsumer(fixtures: readonly CatalogFixture[]) {
  const consumer: unknown = Reflect.get(globalThis, 'consumer');
  if (typeof consumer !== 'object' || consumer === null) {
    throw new Error('The plain HTML consumer did not load');
  }
  const solveLock: unknown = Reflect.get(consumer, 'solveLock');
  if (typeof solveLock !== 'function') {
    throw new Error('Missing public solveLock function');
  }
  const factory: unknown = Reflect.get(consumer, 'createSolverConfig');
  if (typeof factory !== 'function') throw new Error('Missing configuration factory');
  const config: unknown = Reflect.apply(factory, undefined, [{ maxDenseBytes: 0 }]);
  const invoke = (state: unknown, links: unknown): unknown => Reflect.apply(
    solveLock, undefined, [state, links, config],
  );
  const publicExports: unknown = Reflect.get(consumer, 'exports');
  const namedMatchesNamespace: unknown = Reflect.get(consumer, 'namedMatchesNamespace');
  const hasClassicGlobal: unknown = Reflect.get(consumer, 'hasClassicGlobal');
  let invalidError: string | null = null;
  try {
    invoke([0, 4], [[0, 0], [0, 0]]);
  } catch (error) {
    invalidError = error instanceof Error ? error.name : 'non-Error thrown';
  }
  return {
    publicExports,
    config,
    configFrozen: Object.isFrozen(config),
    namedMatchesNamespace,
    hasClassicGlobal,
    signed: invoke([6, 2], [[0, -1], [0, 0]]),
    opened: invoke([4, 4], [[0, 0], [0, 0]]),
    impossible: invoke([1, 1, 1], [[0, -1, -1], [-1, 0, -1], [-1, -1, 0]]),
    invalidError,
    catalog: fixtures.map((fixture) => {
      const state = Object.freeze([...fixture.state]);
      const links = Object.freeze(fixture.links.map((row) => Object.freeze([...row])));
      const commands = invoke(state, links);
      return { id: fixture.id, commands, repeat: invoke(state, links), state, links };
    }),
  };
}

for (const format of formats) {
  test(`${format.bundle}: static HTML, public contract, and all 45 locks`, async ({ context, page }) => {
    nativeNodeSolutions ??= loadExpectedSolutions(catalog);
    const observed = observeRequests(context, page);
    const bundlePath = `/dist/${format.bundle}`;
    const fixturePath = `/tests/e2e/fixtures/${format.fixture}`;
    const responsePromise = page.waitForResponse((response) => new URL(response.url()).pathname === bundlePath);
    await page.goto(fixturePath);
    await expect(page.locator('#status')).toHaveText('ready');
    const response = await responsePromise;
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toBe('application/javascript; charset=utf-8');
    expect(await response.body()).toEqual(await readFile(join(distDirectory, format.bundle)));

    const result = await page.evaluate(exerciseConsumer, catalog);
    expect(result.publicExports).toContain('solveLock');
    expect(result.publicExports).toContain('createSolverConfig');
    expect(result.config).toEqual({ maxVisited: 2_000_000, maxExpanded: 1_000_000, maxFrontier: 1_000_000, maxDenseBytes: 0 });
    expect(result.configFrozen).toBe(true);
    expect(result.publicExports).not.toContain('default');
    expect(result.namedMatchesNamespace).toBe(true);
    expect(result.hasClassicGlobal).toBe(format.classic);
    expect(result.signed).toEqual([[0, -2]]);
    expect(result.opened).toEqual([]);
    expect(result.impossible).toBeNull();
    expect(result.invalidError).toBe('LockInputError');
    expect(result.catalog).toHaveLength(45);
    for (const [index, entry] of result.catalog.entries()) {
      const fixture = catalog[index];
      if (fixture === undefined) throw new Error(`Unexpected result ${entry.id}`);
      expect(entry.id).toBe(fixture.id);
      verifySolution(fixture, entry.commands);
      expect(entry.commands, `${fixture.id}: exact format and environment equivalence`).toEqual(nativeNodeSolutions[index]);
      expect(entry.repeat, `${fixture.id}: deterministic repeat`).toEqual(entry.commands);
      expect(entry.state, `${fixture.id}: state mutation`).toEqual(fixture.state);
      expect(entry.links, `${fixture.id}: links mutation`).toEqual(fixture.links);
    }
    expect(observed.pageErrors).toEqual([]);
    expect(observed.failures).toEqual([]);
    expect(observed.requests.sort()).toEqual([
      `http://127.0.0.1:4177${fixturePath}`,
      `http://127.0.0.1:4177${bundlePath}`,
      `http://127.0.0.1:4177/tests/e2e/fixtures/${format.fixture.replace('.html', format.classic ? '.js' : '.mjs')}`,
    ].sort());
  });
}

for (const minified of [false, true]) {
  const suffix = minified ? '.min' : '';
  test(`module Worker imports gothic-lock-solver${suffix}.mjs`, async ({ context, page }) => {
    const observed = observeRequests(context, page);
    await page.goto('/tests/e2e/fixtures/worker.html');
    const results = await page.evaluate(async (workerFile) => {
      const worker = new Worker(`./${workerFile}`, { type: 'module' });
      const cases = [
        { state: [6, 2], links: [[0, -1], [0, 0]] },
        { state: [4, 4], links: [[0, 0], [0, 0]] },
      ];
      return await new Promise<unknown[]>((resolve, reject) => {
        const received: unknown[] = [];
        worker.onerror = (event) => {
          worker.terminate();
          reject(new Error(event.message));
        };
        worker.onmessage = (event: MessageEvent<unknown>) => {
          received.push(event.data);
          if (received.length === cases.length) {
            worker.terminate();
            resolve(received);
          } else {
            worker.postMessage(cases[received.length]);
          }
        };
        worker.postMessage(cases[0]);
      });
    }, `worker${suffix}.mjs`);
    expect(results).toEqual([[[0, -2]], []]);
    expect(observed.pageErrors).toEqual([]);
    expect(observed.failures).toEqual([]);
    expect(observed.requests.sort()).toEqual([
      'http://127.0.0.1:4177/tests/e2e/fixtures/worker.html',
      `http://127.0.0.1:4177/tests/e2e/fixtures/worker${suffix}.mjs`,
      `http://127.0.0.1:4177/dist/gothic-lock-solver${suffix}.mjs`,
    ].sort());
  });

  test(`classic gothic-lock-solver${suffix}.js loads through file://`, async ({ context, page }) => {
    const observed = observeRequests(context, page);
    const isolatedDirectory = await mkdtemp(join(tmpdir(), 'gothic-classic-'));
    try {
      const fixtureName = `classic${suffix}.html`;
      const bundleName = `gothic-lock-solver${suffix}.js`;
      const html = await readFile(new URL(`./fixtures/${fixtureName}`, import.meta.url), 'utf8');
      await writeFile(join(isolatedDirectory, fixtureName), html.replace('src="../../../dist/', 'src="./'));
      await copyFile(join(distDirectory, bundleName), join(isolatedDirectory, bundleName));
      const consumerName = `classic${suffix}.js`;
      await copyFile(new URL(`../../artifacts/e2e/fixtures/${consumerName}`, import.meta.url), join(isolatedDirectory, consumerName));
      const consumerUrl = pathToFileURL(join(isolatedDirectory, consumerName)).href;
      const fixtureUrl = pathToFileURL(join(isolatedDirectory, fixtureName)).href;
      const bundleUrl = pathToFileURL(join(isolatedDirectory, bundleName)).href;
      await page.goto(fixtureUrl);
      await expect(page.locator('#status')).toHaveText('ready');
      expect(page.url()).toBe(fixtureUrl);
      const externalScript = page.locator('script[src]').first();
      await expect(externalScript).toHaveCount(1);
      await expect(externalScript).toHaveJSProperty('src', bundleUrl);
      await expect(externalScript).toHaveJSProperty('type', '');
      const result = await page.evaluate(exerciseConsumer, []);
      expect(result.signed).toEqual([[0, -2]]);
      expect(result.opened).toEqual([]);
      expect(result.impossible).toBeNull();
      expect(result.invalidError).toBe('LockInputError');
      expect(result.hasClassicGlobal).toBe(true);
      expect(observed.pageErrors).toEqual([]);
      expect(observed.failures).toEqual([]);
      // Firefox does not emit request events for file:// loads. Verify the actual
      // local document/script above, and reject unexpected URLs when events exist.
      const allowedRequests = new Set([fixtureUrl, bundleUrl, consumerUrl]);
      expect(observed.requests.filter((url) => !allowedRequests.has(url))).toEqual([]);
    } finally {
      await rm(isolatedDirectory, { recursive: true, force: true });
    }
  });
}
