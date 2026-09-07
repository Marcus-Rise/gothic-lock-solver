import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFile, mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import vm from 'node:vm';
import { solveLock } from '../src/index.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const builderPath = join(root, 'scripts/build-browser.mjs');
const artifactPath = join(root, 'dist/gothic-lock-solver.js');
const independent = (state) => ({ state, links: state.map(() => state.map(() => 0)) });
const normalize = (value) => JSON.parse(JSON.stringify(value));

async function builder() {
  assert.ok(existsSync(builderPath), 'the reproducible classic-script builder must exist');
  return import('../scripts/build-browser.mjs');
}

test('ready browser artifact is reproducible and the CLI verifies source synchronization', async () => {
  assert.ok(existsSync(builderPath), 'the reproducible classic-script builder must exist');
  const result = spawnSync(process.execPath, [builderPath, '--check'], { encoding: 'utf8', cwd: tmpdir() });
  assert.equal(result.status, 0, result.stderr);
  const { buildBrowserBundle } = await builder();
  const first = await readFile(artifactPath, 'utf8');
  assert.equal(await buildBrowserBundle({ check: true }), first);
  assert.equal(await buildBrowserBundle({ check: true }), first);
  assert.match(first, /SPDX-License-Identifier: Apache-2\.0/);
  assert.match(first, /Apache License[\s\S]+Version 2\.0, January 2004/);
  assert.match(first, /gothic-lock-solver/);
});

test('classic script loads without module, DOM, Node, network, or dynamic-code facilities', async () => {
  assert.ok(existsSync(artifactPath), 'a ready classic-script artifact must be checked in');
  const source = await readFile(artifactPath, 'utf8');
  const context = vm.createContext({ untouched: 123 }, { codeGeneration: { strings: false, wasm: false } });
  new vm.Script(source, { filename: 'gothic-lock-solver.js' }).runInContext(context, { timeout: 5000 });
  assert.deepEqual(Object.keys(context).sort(), ['GothicLockSolver', 'untouched']);
  assert.equal(context.untouched, 123);
  assert.equal(vm.runInContext('typeof process + ":" + typeof require + ":" + typeof document + ":" + typeof fetch', context), 'undefined:undefined:undefined:undefined');
  assert.deepEqual(Object.keys(context.GothicLockSolver).sort(), ['SearchLimitError', 'applyCommand', 'generateTransitions', 'solveLock']);
  assert.equal(Object.isFrozen(context.GothicLockSolver), true);
  const definitions = [
    independent([1, 7, 4, 2, 6]),
    independent([1, 7, 2, 6, 3, 5, 4, 1]),
    { state: [3, 1, 1], links: [[0, -1, -1], [-1, 0, -1], [-1, -1, 0]] },
    { state: [1, 1, 1], links: [[0, -1, -1], [-1, 0, -1], [-1, -1, 0]] },
    { state: [1, 1], links: [[0, 1], [1, 0]] },
  ];
  for (const definition of definitions) {
    const before = structuredClone(definition);
    assert.deepEqual(normalize(context.GothicLockSolver.solveLock(definition)), solveLock(definition));
    assert.deepEqual(definition, before);
  }
  const definition = independent([1, 7]);
  assert.deepEqual(normalize(context.GothicLockSolver.solveLock(definition, { algorithm: 'bfs' })), solveLock(definition, { algorithm: 'bfs' }));
  assert.throws(() => context.GothicLockSolver.solveLock(definition, { algorithm: 'bfs', maxExpanded: 0 }),
    (error) => error instanceof context.GothicLockSolver.SearchLimitError && error.limit === 'maxExpanded');
  const otherContext = vm.createContext({}, { codeGeneration: { strings: false, wasm: false } });
  new vm.Script(source).runInContext(otherContext, { timeout: 5000 });
  assert.notEqual(otherContext.GothicLockSolver, context.GothicLockSolver);
  assert.notEqual(otherContext.GothicLockSolver.SearchLimitError, context.GothicLockSolver.SearchLimitError);
  assert.deepEqual(normalize(otherContext.GothicLockSolver.solveLock(definition)), solveLock(definition));
});

test('builder rejects unsupported imports and exports before replacing an artifact', async () => {
  const { buildBrowserBundle, BROWSER_MODULES } = await builder();
  const temporary = await mkdtemp(join(tmpdir(), 'gothic-browser-builder-'));
  try {
    await mkdir(join(temporary, 'src'));
    for (const name of BROWSER_MODULES) {
      await writeFile(join(temporary, name), await readFile(join(root, name)));
    }
    await writeFile(join(temporary, 'LICENSE'), await readFile(join(root, 'LICENSE')));
    const original = await buildBrowserBundle({ root: temporary });
    assert.equal(original, await readFile(artifactPath, 'utf8'), 'generation must not depend on the checkout path');
    const target = join(temporary, 'src/index.mjs');
    const source = await readFile(target, 'utf8');
    for (const unsupported of [
      "import ignored from './transition.mjs';",
      "import { readFile } from 'node:fs';",
      "import { x } from './not-allowlisted.mjs';",
      "export * from './transition.mjs';",
      'export default solveLock;',
      "const lazy = () => import('./transition.mjs');",
      'const address = import.meta.url;',
    ]) {
      await writeFile(target, `${source}\n${unsupported}\n`);
      await assert.rejects(() => buildBrowserBundle({ root: temporary }), /Unsupported|unsupported|allowlist/);
      assert.equal(await readFile(join(temporary, 'dist/gothic-lock-solver.js'), 'utf8'), original);
    }
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
});

test('check mode fails on stale source or changed artifact without writing', async () => {
  const { buildBrowserBundle, BROWSER_MODULES } = await builder();
  const temporary = await mkdtemp(join(tmpdir(), 'gothic-browser-sync-'));
  try {
    await mkdir(join(temporary, 'src'));
    for (const name of BROWSER_MODULES) await writeFile(join(temporary, name), await readFile(join(root, name)));
    await writeFile(join(temporary, 'LICENSE'), await readFile(join(root, 'LICENSE')));
    await buildBrowserBundle({ root: temporary });
    const artifact = join(temporary, 'dist/gothic-lock-solver.js');
    const original = await readFile(artifact, 'utf8');
    const source = join(temporary, 'src/index.mjs');
    await writeFile(source, `${await readFile(source, 'utf8')}\n// source synchronization fixture\n`);
    await assert.rejects(() => buildBrowserBundle({ root: temporary, check: true }), /out of date/);
    assert.equal(await readFile(artifact, 'utf8'), original);
    await buildBrowserBundle({ root: temporary });
    await writeFile(artifact, 'stale artifact');
    await assert.rejects(() => buildBrowserBundle({ root: temporary, check: true }), /out of date/);
    assert.equal(await readFile(artifact, 'utf8'), 'stale artifact');
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
});
