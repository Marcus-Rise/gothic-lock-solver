import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

// A dependency-boundary check, not a substitute for a real browser run.
// SourceTextModule requires --experimental-vm-modules on supported Node versions.
const root = new URL('../src/', import.meta.url);
const context = vm.createContext(Object.create(null));
const modules = new Map();

async function load(url) {
  if (!url.href.startsWith(root.href) || !url.pathname.endsWith('.mjs')) {
    throw new Error(`Core import leaves browser-safe source tree: ${url.href}`);
  }
  if (modules.has(url.href)) return modules.get(url.href);
  // Cache the pending read too: multiple importers may request one dependency
  // concurrently while the module graph is linking.
  const pending = readFile(url, 'utf8').then(source => new vm.SourceTextModule(source, {
    context,
    identifier: url.href,
  }));
  modules.set(url.href, pending);
  return pending;
}

const entry = await load(new URL('index.mjs', root));
await entry.link((specifier, referencingModule) => {
  if (!specifier.startsWith('./') && !specifier.startsWith('../')) {
    throw new Error(`Core has an external/Node import: ${specifier}`);
  }
  return load(new URL(specifier, referencingModule.identifier));
});
await entry.evaluate();
assert.equal(vm.runInContext('typeof process', context), 'undefined');
assert.equal(vm.runInContext('typeof Buffer', context), 'undefined');
assert.equal(vm.runInContext('typeof require', context), 'undefined');

const solve = entry.namespace.solveLock;
const independent = { state: [1, 7], links: [[0, 0], [0, 0]] };
for (const algorithm of ['matrix-astar', 'bfs']) {
  const result = solve(independent, { algorithm });
  assert.equal(result.status, 'solved');
  assert.equal(result.commands.length, 2);
  assert.equal(JSON.stringify(result.finalState), '[4,4]');
}
console.log(JSON.stringify({
  status: 'passed',
  environment: 'isolated ECMAScript module context without Node globals',
  modules: [...modules.keys()].map(url => fileURLToPath(url).slice(fileURLToPath(root).length)),
}));
