import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { catalogSha256, git, loadCatalog, sha256, verifySource } from '../benchmarks/catalog.ts';
import { string } from '../benchmarks/validation.ts';
import { loadImplementation, runComparison, writeSnapshot } from '../benchmarks/harness.ts';
const fields = new Map<string, string>();
const args = process.argv.slice(2);
for (let index = 0; index < args.length; index += 2) {
  const key = args[index]; const value = args[index + 1];
  if (key === undefined || value === undefined || !['--source-module', '--source-format', '--reason', '--output'].includes(key) || fields.has(key)) throw new Error('Invalid snapshot arguments.');
  fields.set(key, value);
}
const modulePath = fields.get('--source-module'); const format = fields.get('--source-format') ?? 'tuple';
const reason = fields.get('--reason'); const output = fields.get('--output');
if (modulePath === undefined || reason === undefined || reason.trim() === '' || output === undefined || (format !== 'tuple' && format !== 'legacy')) throw new Error('Usage: node scripts/benchmark-snapshot.ts --source-module PATH --source-format tuple|legacy --reason TEXT --output NEW_PATH');
const solver = await loadImplementation(modulePath, format, 'Snapshot source');
const report = runComparison({ locks: loadCatalog(), candidate: solver, baseline: solver, repetitions: 2, warmups: 1 });
const sourceDirectory = dirname(dirname(resolve(modulePath)));
const sourceRevision = existsSync(resolve(sourceDirectory, 'manifest.json'))
  ? string(verifySource(sourceDirectory)['revision'])
  : git(dirname(resolve(modulePath)), ['rev-parse', 'HEAD']);
const snapshot = { schemaVersion: 1, fixtureSha256: catalogSha256,
  source: { revision: sourceRevision, moduleSha256: sha256(readFileSync(modulePath)), format }, reason,
  locks: report.results.map((row) => {
    const value = row.solvers['candidate']; if (value === undefined) throw new Error('Missing snapshot solution.');
    return { id: row.id, optimumA: row.optimumA, A: value.A, U: value.U, C: value.C, plateSwitches: value.plateSwitches, commands: value.commands };
  }) };
await writeSnapshot(output, snapshot);
console.log(JSON.stringify({ snapshotPath: resolve(output), lockCount: snapshot.locks.length, source: snapshot.source }));
