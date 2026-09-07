import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { assertArtifactOutput, catalogSha256, loadCatalog, type Fixture } from './catalog.ts';
import { loadImplementation, validateSolution, writeSnapshot, type Implementation, type ModuleFormat, type Snapshot } from './harness.ts';
import { inspectSource, validateSource } from './source.ts';

export function snapshotFromImplementation(solver: Implementation, source: Record<string, unknown>, reason: string, locks: readonly Fixture[] = loadCatalog()): Snapshot {
  validateSource(source);
  if (reason.trim() === '') throw new Error('Snapshot reason is required.');
  return { schemaVersion: 1, fixtureSha256: catalogSha256, source, reason,
    locks: locks.map((lock) => {
      const input = structuredClone({ state: lock.state, links: lock.links });
      const raw = solver.solve(input);
      assert.deepEqual(input, { state: lock.state, links: lock.links }, `${lock.id}: snapshot solver mutated its input.`);
      return { id: lock.id, optimumA: lock.expectedActions, ...validateSolution(lock, solver.normalize(raw)) };
    }) };
}
export async function generateSnapshot(modulePath: string, format: ModuleFormat, reason: string): Promise<Snapshot> {
  const source = inspectSource(modulePath, format);
  const solver = await loadImplementation(modulePath, format, 'Own baseline snapshot source');
  const snapshot = snapshotFromImplementation(solver, source, reason);
  inspectSource(modulePath, format, source);
  return snapshot;
}
async function main(): Promise<void> {
  const fields = new Map<string, string>();
  const args = process.argv.slice(2);
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index]; const value = args[index + 1];
    if (key === undefined || value === undefined || !['--source-module', '--source-format', '--reason', '--output'].includes(key) || fields.has(key)) throw new Error('Invalid snapshot arguments.');
    fields.set(key, value);
  }
  const modulePath = fields.get('--source-module'); const format = fields.get('--source-format');
  const reason = fields.get('--reason'); const output = fields.get('--output');
  if (modulePath === undefined || reason === undefined || output === undefined || (format !== 'tuple' && format !== 'legacy')) throw new Error('Usage: node tests/benchmarks/snapshot.ts --source-module PATH --source-format tuple|legacy --reason TEXT --output NEW_PATH');
  assertArtifactOutput(output);
  const snapshot = await generateSnapshot(modulePath, format, reason);
  await mkdir(dirname(resolve(output)), { recursive: true });
  await writeSnapshot(output, snapshot);
  console.log(JSON.stringify({ snapshotPath: resolve(output), lockCount: snapshot.locks.length, source: snapshot.source }));
}
if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try { await main(); } catch (error) { console.error(error); process.exitCode = 1; }
}
