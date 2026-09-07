import { test } from 'vitest';
import { loadCatalog } from './catalog.ts';
import { loadImplementation } from './harness.ts';
import { replayCommands } from './validation.ts';
import { fileURLToPath } from 'node:url';

const candidate = await loadImplementation(fileURLToPath(new URL('../src/index.ts', import.meta.url)), 'tuple', 'Developer source');
const baseline = await loadImplementation(fileURLToPath(new URL('./reference-matrix/src/index.mjs', import.meta.url)), 'legacy', 'Pinned matrix');
const locks = loadCatalog();
// One representative from each encountered plate count, selected deterministically from the fixed catalog.
const representatives = [...new Map(locks.map((lock) => [lock.definition.state.length, lock])).values()];
for (const lock of representatives) {
  for (const solver of [candidate, baseline]) {
    const commands = solver.normalize(solver.solve(structuredClone(lock.definition)));
    if (commands === null || replayCommands(lock.definition, commands).some((position) => position !== 4)) throw new Error('Developer benchmark setup did not reach target.');
  }
  test(`${lock.id} (${lock.definition.state.length} plates)`, async ({ bench }) => {
    await bench.compare(
      bench('candidate tuple API', () => { candidate.solve(lock.definition); }),
      bench('pinned legacy matrix API', () => { baseline.solve(lock.definition); }),
      { iterations: 10, time: 100 },
    );
  });
}
