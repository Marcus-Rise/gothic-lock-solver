import test from 'node:test';
import assert from 'node:assert/strict';
import { solveLock } from '../src/index.mjs';
import { loadCatalog, loadManifest } from '../benchmarks/catalog.mjs';
import { commandMetrics, replayCommands } from '../benchmarks/validation.mjs';

const catalog = loadCatalog();

test('catalog preserves 45 named inputs and pinned source provenance', () => {
  assert.equal(catalog.length, 45);
  assert.equal(new Set(catalog.map((lock) => lock.id)).size, 45);
  assert.equal(loadManifest().source.revision, 'eee0bf50ebcb7fffd2b47954fd76bb015854e365');
  for (const lock of catalog) {
    assert.ok(lock.code && lock.title && lock.url && lock.provenance.catalog);
    assert.equal(lock.provenance.commit, loadManifest().source.revision);
    assert.ok(Number.isInteger(lock.expectedActions));
    assert.equal(lock.historicalReference.kind, 'cached-observation');
    const historic = commandMetrics(lock.historicalReference.commands);
    assert.equal(historic.A, lock.historicalReference.A, lock.id);
    assert.equal(historic.U, lock.historicalReference.U, lock.id);
    assert.equal(historic.C, lock.historicalReference.C, lock.id);
    assert.deepEqual(replayCommands(lock.definition, lock.historicalReference.commands),
      lock.definition.state.map(() => 4), lock.id);
  }
});

for (const lock of catalog) {
  test(`catalog ${lock.id}: default and exact BFS agree on minimum actions`, () => {
    const before = structuredClone(lock.definition);
    const matrix = solveLock(lock.definition);
    const bfs = solveLock(lock.definition, { algorithm: 'bfs' });
    assert.equal(matrix.status, 'solved', lock.id);
    assert.equal(bfs.status, 'solved', lock.id);
    assert.equal(matrix.commands.length, lock.expectedActions, lock.id);
    assert.equal(bfs.commands.length, lock.expectedActions, lock.id);
    assert.deepEqual(bfs.commands, lock.baselineCommands, `BFS ordering: ${lock.id}`);
    for (const result of [matrix, bfs]) {
      assert.deepEqual(replayCommands(lock.definition, result.commands),
        lock.definition.state.map(() => 4), lock.id);
      assert.equal(result.metrics.commands, commandMetrics(result.commands).A);
      assert.equal(result.metrics.divisions, commandMetrics(result.commands).C);
    }
    assert.deepEqual(lock.definition, before, `input mutation: ${lock.id}`);
  });
}
