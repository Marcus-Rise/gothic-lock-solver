import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { delimiter, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { solveLock } from 'gothic-lock-solver';
import * as GothicLockSolver from 'gothic-lock-solver';

assert.deepEqual(solveLock([6, 2], [[0, -1], [0, 0]]), [[0, -2]]);
assert.deepEqual(GothicLockSolver.solveLock([4, 4], [[0, 0], [0, 0]]), []);
assert.deepEqual(Object.keys(GothicLockSolver).sort(), ['LockInputError', 'SearchLimitError', 'solveLock']);
assert.ok(import.meta.resolve('gothic-lock-solver').includes('/node_modules/gothic-lock-solver/dist/'));
const manifest = JSON.parse(readFileSync(new URL('./node_modules/gothic-lock-solver/package.json', import.meta.url), 'utf8'));
assert.deepEqual(manifest.dependencies ?? {}, {});
assert.deepEqual(manifest.optionalDependencies ?? {}, {});
assert.deepEqual(manifest.peerDependencies ?? {}, {});
assert.deepEqual(manifest.bundleDependencies ?? [], []);
assert.equal(manifest.private, false);
for (const lifecycle of ['preinstall', 'install', 'postinstall', 'prepare']) assert.equal(manifest.scripts?.[lifecycle], undefined);
assert.deepEqual(manifest.bin, { 'gothic-lock-solver': './dist/gothic-lock-solver.cli.mjs' });
for (const path of ['gothic-lock-solver/dist/gothic-lock-solver.mjs', 'gothic-lock-solver/dist/gothic-lock-solver.min.mjs']) {
  const api = await import(path);
  assert.deepEqual(Object.keys(api).sort(), Object.keys(GothicLockSolver).sort());
  assert.deepEqual(api.solveLock([6, 2], [[0, -1], [0, 0]]), [[0, -2]]);
}
console.log(JSON.stringify({ node: process.version, installed: true, namespace: Object.keys(GothicLockSolver).sort() }));

const input = new URL('./lock.json', import.meta.url);
const output = new URL('./solution.json', import.meta.url);
const executable = new URL('./node_modules/gothic-lock-solver/dist/gothic-lock-solver.cli.mjs', import.meta.url);
const bin = fileURLToPath(new URL('./node_modules/.bin/gothic-lock-solver', import.meta.url));
assert.ok(existsSync(bin));
writeFileSync(input, JSON.stringify({ state: [6, 2], links: [[0, -1], [0, 0]] }));
let cli = spawnSync(bin, [fileURLToPath(input), '--output', fileURLToPath(output)], { encoding: 'utf8', env: { ...process.env, PATH: `${dirname(process.execPath)}${delimiter}${process.env.PATH ?? ''}` } });
assert.equal(cli.status, 0);
assert.equal(cli.stderr, '');
assert.deepEqual(JSON.parse(readFileSync(output, 'utf8')).commands, [{ plate: 1, direction: 'right', steps: 2 }]);
writeFileSync(input, JSON.stringify({ state: [1, 7], links: [[0, 1], [1, 0]] }));
cli = spawnSync(process.execPath, [fileURLToPath(executable), fileURLToPath(input)], { encoding: 'utf8' });
assert.equal(cli.status, 2);
writeFileSync(input, '{');
cli = spawnSync(process.execPath, [fileURLToPath(executable), fileURLToPath(input)], { encoding: 'utf8' });
assert.equal(cli.status, 1);
console.log(JSON.stringify({ installedCli: true, node: process.version, exitCodes: [0, 1, 2] }));
