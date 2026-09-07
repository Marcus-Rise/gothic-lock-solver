import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { releaseAssets } from '../../.github/scripts/release-lib.ts';
import { array, commandMetrics, replayCommands, legacyCommands, record } from '../benchmarks/validation.ts';
import { compareMetrics, confirmPerformance, performanceVerdict, statistics } from '../benchmarks/comparison.ts';
import { catalogSha256, loadCatalog, sha256 } from '../benchmarks/catalog.ts';
import { publishReport, readSnapshot, runComparison, writeSnapshot, type Implementation } from '../benchmarks/harness.ts';

import { inspectComparisonBaseline, inspectSource, validateSource } from '../benchmarks/source.ts';
import { snapshotFromImplementation } from '../benchmarks/snapshot.ts';
import { assertArtifactOutput, collectMetadata, parseBenchmarkArgs } from '../benchmarks/cli.ts';

const definition = { state: [3, 4], links: [[0, 0], [0, 0]] };
const commands: readonly (readonly [number, number])[] = [[0, 1]];
const fixture = { id: 'unit', ...definition, expectedActions: 1 };
const source = { revision: '1'.repeat(40), moduleSha256: '2'.repeat(64), format: 'tuple' };
const implementation = (solve: Implementation['solve'] = () => commands): Implementation => ({
  label: 'unit', solve, normalize: (value) => value,
});

describe('benchmark replay independent of production transitions', () => {
  it('uses zero-based numeric deltas, simultaneous outgoing links and every intermediate click', () => {
    expect(replayCommands(definition, commands)).toEqual([4, 4]);
    expect(replayCommands({ state: [2, 5, 6], links: [[0, -1, 0], [0, 0, 1], [0, 0, 0]] }, [[0, 2]])).toEqual([4, 3, 6]);
    expect(() => replayCommands({ state: [6, 6], links: [[0, 1], [0, 0]] }, [[0, 2]])).toThrow(/blocked/i);
    expect(definition.state).toEqual([3, 4]);
  });
  it('rejects invalid tuple and command coordinates', () => {
    for (const invalid of [[[0, 0]], [[-1, 1]], [[2, 1]], [[0, 7]], [[0, 1.5]], [[0, 1, 2]], [{ plate: 1 }]]) {
      expect(() => replayCommands(definition, invalid)).toThrow(/command/i);
    }
  });
  it('measures A/U/C/switches and converts legacy left to positive numeric delta', () => {
    expect(commandMetrics([[0, 2], [1, -3], [0, 1]])).toEqual({ A: 3, U: 2, C: 6, plateSwitches: 2 });
    expect(legacyCommands([{ plate: 1, direction: 'left', steps: 2 }, { plate: 2, direction: 'right', steps: 3 }])).toEqual([[0, 2], [1, -3]]);
  });
});

describe('deterministic and environmental verdicts stay separate', () => {
  it('fails every metric regression even if another metric improves', () => {
    expect(compareMetrics({ A: 4, U: 1, C: 6, plateSwitches: 0 }, { A: 3, U: 2, C: 8, plateSwitches: 1 }).quality).toBe('regression');
    expect(compareMetrics({ A: 3, U: 3, C: 7, plateSwitches: 1 }, { A: 3, U: 2, C: 8, plateSwitches: 1 }).quality).toBe('regression');
    expect(compareMetrics({ A: 3, U: 2, C: 9, plateSwitches: 1 }, { A: 3, U: 2, C: 8, plateSwitches: 1 }).quality).toBe('regression');
    expect(compareMetrics({ A: 3, U: 2, C: 8, plateSwitches: 2 }, { A: 3, U: 2, C: 8, plateSwitches: 1 }).quality).toBe('regression');
  });
  it('calibrates uncertainty from self-comparison and never uses historical times as proof', () => {
    expect(performanceVerdict([10, 10, 10, 10, 10], [10, 10, 10, 10, 10], [10, 10, 10, 10, 10], [10, 10, 10, 10, 10]).verdict).toBe('passed');
    expect(performanceVerdict([20, 20, 20, 20, 20], [10, 10, 10, 10, 10], [10, 10, 10, 10, 10], [10, 10, 10, 10, 10]).verdict).toBe('regression');
    expect(performanceVerdict([20], [10], [10], [10]).verdict).toBe('inconclusive');
    expect(performanceVerdict([10, 20, 10, 20, 10], [10, 10, 10, 10, 10], [5, 20, 5, 20, 5], [10, 10, 10, 10, 10]).verdict).toBe('inconclusive');
    expect(performanceVerdict([10, 10, 10, 10, 10], [10, 10, 10, 10, 10], [], []).verdict).toBe('inconclusive');
  });
  it('requires repeat confirmation of an environmental regression and preserves conflicting signals', () => {
    expect(confirmPerformance('regression', 'regression')).toBe('regression');
    expect(confirmPerformance('regression', 'passed')).toBe('inconclusive');
    expect(confirmPerformance('inconclusive', 'passed')).toBe('inconclusive');
    expect(confirmPerformance('passed', 'passed')).toBe('passed');
  });
  it('retains raw sample order and computes nearest-rank p95', () => {
    const samples = [9, 1, 5, 3];
    expect(statistics(samples)).toEqual({ min: 1, median: 4, p95: 9, max: 9 });
    expect(samples).toEqual([9, 1, 5, 3]);
    for (const bad of [[], [-1], [NaN]]) expect(() => statistics(bad)).toThrow(/sample/i);
  });
});

describe('evidence trust boundaries', () => {
  it('retains only all 45 fixed numerical fixtures and mathematical expectations', () => {
    const locks = loadCatalog();
    expect(locks).toHaveLength(45);
    expect(Object.keys(locks[0] ?? {}).sort()).toEqual(['expectedActions', 'id', 'links', 'state']);
    expect(locks.reduce((sum, lock) => sum + lock.expectedActions, 0)).toBe(483);
  });
  it('rejects missing source identity and mismatched module, format or revision', async () => {
    expect(() => validateSource({})).toThrow(/source|baseline/i);
    expect(() => inspectSource('/missing/own-baseline.ts', 'tuple')).toThrow();
    const root = await mkdtemp(join(tmpdir(), 'benchmark-source-'));
    const module = join(root, 'solver.ts');
    try {
      await writeFile(module, 'export function solveLock() { return [[0, 1]]; }\n');
      expect(() => inspectSource(module, 'tuple')).toThrow(/own Git checkout|identity/);
      expect(() => inspectSource(module, 'tuple', source)).toThrow(/hash/);
      const pinned = { ...source, moduleSha256: sha256(await readFile(module)) };
      expect(() => inspectSource(module, 'tuple', pinned)).toThrow(/verified release/);
      expect(() => inspectSource(module, 'legacy', pinned)).toThrow(/format/);
      execFileSync('git', ['init', '--quiet', root]);
      execFileSync('git', ['-C', root, 'add', '.']);
      execFileSync('git', ['-C', root, '-c', 'user.name=Benchmark Test', '-c', 'user.email=benchmark@example.invalid', 'commit', '--quiet', '-m', 'Own baseline']);
      expect(() => inspectSource(module, 'tuple', pinned)).toThrow(/revision/);
    } finally { await rm(root, { recursive: true, force: true }); }
  });
  it('pins every own checkout source file directly to Git without copying it', async () => {
    const root = await mkdtemp(join(tmpdir(), 'benchmark-source-'));
    try {
      await mkdir(join(root, 'src'));
      const module = join(root, 'src', 'solver.ts');
      const dependency = join(root, 'src', 'dependency.ts');
      await writeFile(module, 'export function solveLock() { return [[0, 1]]; }\n');
      await writeFile(dependency, 'export const value = 1;\n');
      execFileSync('git', ['init', '--quiet', root]);
      execFileSync('git', ['-C', root, 'add', '.']);
      execFileSync('git', ['-C', root, '-c', 'user.name=Benchmark Test', '-c', 'user.email=benchmark@example.invalid', 'commit', '--quiet', '-m', 'Own baseline']);
      const pinned = inspectSource(module, 'tuple');
      expect(inspectSource(module, 'tuple', pinned)).toEqual(pinned);
      await writeFile(dependency, 'export const value = 1;\n\n');
      expect(() => inspectSource(module, 'tuple')).toThrow(/source hash/);
      expect(() => inspectSource(module, 'tuple', pinned)).toThrow(/tree hash/);
      await writeFile(dependency, 'export const value = 1;\n');
      await writeFile(join(root, 'src', 'untracked.ts'), 'export const value = 2;\n');
      expect(() => inspectSource(module, 'tuple')).toThrow(/untracked source/);
    } finally { await rm(root, { recursive: true, force: true }); }
  });
  it('generates snapshot quality by executing only the explicitly supplied baseline', () => {
    let calls = 0;
    const snapshot = snapshotFromImplementation(implementation(() => { calls += 1; return commands; }), source, 'own baseline', [fixture]);
    expect(calls).toBe(1);
    expect(snapshot.source).toEqual(source);
    expect(snapshot.locks).toEqual([{ id: 'unit', optimumA: 1, ...commandMetrics(commands), commands }]);
    expect(() => snapshotFromImplementation(implementation(() => []), source, 'own baseline', [fixture])).toThrow(/target/);
    expect(() => snapshotFromImplementation(implementation(), {}, 'own baseline', [fixture])).toThrow(/source|baseline/);
  });
  it('never overwrites a quality snapshot', async () => {
    const root = await mkdtemp(join(tmpdir(), 'benchmark-snapshot-'));
    const path = join(root, 'quality.json');
    try {
      await writeSnapshot(path, { reason: 'initial', locks: [] });
      const initial = await readFile(path, 'utf8');
      await expect(writeSnapshot(path, { reason: 'replacement', locks: [] })).rejects.toThrow();
      expect(await readFile(path, 'utf8')).toBe(initial);
    } finally { await rm(root, { recursive: true, force: true }); }
  });
  it('validates warmups, measured paths, determinism, input immutability and exact action optimum', () => {
    let calls = 0;
    const setup = { locks: [fixture], candidate: implementation(), baseline: implementation(), repetitions: 5, warmups: 1 };
    expect(runComparison(setup).quality).toBe('passed');
    expect(() => runComparison({ ...setup, candidate: implementation(() => []) })).toThrow(/target|minimum/i);
    expect(() => runComparison({ ...setup, candidate: implementation((input) => { input.state[0] = 4; return commands; }) })).toThrow(/mutat/i);
    expect(() => runComparison({ ...setup, candidate: implementation(() => ++calls === 1 ? commands : [[0, 2], [0, -1]]) })).toThrow(/minimum|determin/i);
  });
});

it('requires explicit baseline inputs and rejects unsafe or ambiguous CLI settings', () => {
  expect(() => parseBenchmarkArgs([])).toThrow(/explicit/);
  expect(parseBenchmarkArgs(['--baseline-module', '/base.mjs', '--baseline-format', 'legacy']).outputDir).toMatch(/artifacts\/benchmark$/);
  expect(parseBenchmarkArgs(['--baseline-module', '/base.mjs', '--baseline-format', 'legacy']).baselineSnapshot).toBeUndefined();
  expect(parseBenchmarkArgs(['--baseline-module', '/base.mjs', '--baseline-snapshot', '/quality.json', '--baseline-format', 'legacy']).baselineFormat).toBe('legacy');
  for (const args of [['--warmups', '-1'], ['--warmups', '01'], ['--repetitions', '0'], ['--warmups', '1', '--warmups', '2'], ['--reference'], ['--unknown', '1']]) {
    expect(() => parseBenchmarkArgs(args)).toThrow(/argument|integer/);
  }
});

it('rejects unsupported comparison slots', () => {
  expect(() => parseBenchmarkArgs(['--reference', '/separate-checkout'])).toThrow(/Unknown argument/);
});

it('reports only measurements of the supplied project implementations', () => {
  const report = runComparison({ locks: [fixture], candidate: implementation(), baseline: implementation(), repetitions: 1, warmups: 0 });
  expect(Object.keys(report.implementations)).toEqual(['candidate', 'baseline']);
  expect(report.results[0]).not.toHaveProperty('historicalReference');
});

it('checks target-branch snapshot against the live base independently of candidate expectations', () => {
  const baselineSnapshot = { schemaVersion: 1, fixtureSha256: catalogSha256, source: {}, reason: 'test baseline',
    locks: [{ id: 'unit', optimumA: 1, ...commandMetrics(commands), commands: [[0, 2], [0, -1]] as const }] };
  expect(() => runComparison({ locks: [fixture], candidate: implementation(), baseline: implementation(), baselineSnapshot, repetitions: 1, warmups: 0 })).toThrow(/snapshot path drift/);

});

it('publishes report, Markdown and hash-linked release evidence without changing earlier reports', async () => {
  const root = await mkdtemp(join(tmpdir(), 'benchmark-report-'));
  try {
    const report = runComparison({ locks: [fixture], candidate: implementation(), baseline: implementation(), repetitions: 1, warmups: 0 });
    const first = await publishReport(report, root); const previous = await readFile(first.jsonPath, 'utf8');
    const second = await publishReport(report, root);
    expect(second.directory).not.toBe(first.directory);
    expect(await readFile(first.jsonPath, 'utf8')).toBe(previous);
    const parsed: unknown = JSON.parse(await readFile(first.evidencePath, 'utf8'));
    const evidence = record(parsed);
    expect(record(record(evidence['reports'])['json'])['sha256']).toBe(sha256(previous));
    expect(record(array(record(evidence['qualitySnapshot'])['locks'])[0])['commands']).toEqual(commands);
    expect(await readFile(first.markdownPath, 'utf8')).toMatch(/inconclusive/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

it('isolated RSS worker restricts its workload to the selected smoke fixtures', async () => {
  const { measureRss } = await import('../benchmarks/memory.ts');
  const result = measureRss({ name: 'baseline', module: new URL('../../src/index.ts', import.meta.url).pathname, format: 'tuple' }, loadCatalog().slice(0, 2).map((lock) => lock.id).join(','));
  expect(result.lockCount).toBe(2);
  expect(result.peakRssBytes).toBeGreaterThan(0);
  expect(result.startupRssBytes).toBeGreaterThan(0);
});

it('names the process-image RSS metric and preserves launch-floor diagnostics', async () => {
  const { measureRss } = await import('../benchmarks/memory.ts');
  const result = measureRss({ name: 'baseline', module: new URL('../../src/index.ts', import.meta.url).pathname, format: 'tuple' }, loadCatalog()[0]?.id);
  expect(result.peakRssMetric).toBe(process.platform === 'linux' ? 'linux-proc-VmHWM' : 'node-resourceUsage-maxRSS');
  expect(result.startupPeakRssBytes).toBeGreaterThan(0);
  expect(result.resourceUsageMaxRssBytes).toBeGreaterThan(0);
});


it('requires ignored artifact output paths and rejects snapshots with missing identity', async () => {
  expect(() => assertArtifactOutput('docs/benchmarks')).toThrow(/ignored artifacts/);
  expect(() => assertArtifactOutput('artifacts/../tests')).toThrow(/ignored artifacts/);
  expect(() => assertArtifactOutput('artifacts/benchmark')).not.toThrow();
  const root = await mkdtemp(join(tmpdir(), 'benchmark-snapshot-'));
  try {
    const path = join(root, 'snapshot.json');
    await writeSnapshot(path, { schemaVersion: 1, fixtureSha256: catalogSha256, source: {}, reason: 'missing identity', locks: [] });
    expect(() => readSnapshot(path)).toThrow(/source|identity|baseline/);
  } finally { await rm(root, { recursive: true, force: true }); }
});


it('retains both complete raw timing attempts when a matched slowdown repeats', () => {
  let elapsed = 0;
  const order: string[] = [];
  const measured = (name: string, duration: number) => implementation(() => { order.push(name); elapsed += duration; return commands; });
  const report = runComparison({ locks: [fixture], candidate: measured('candidate', 2), baseline: measured('baseline', 1), repetitions: 5, warmups: 0, clock: () => elapsed });
  const row = report.results[0];
  expect(row?.timing.verdict).toBe('regression');
  expect(row?.timingAttempts).toHaveLength(2);
  for (const attempt of row?.timingAttempts ?? []) {
    expect(attempt.candidate).toEqual([2, 2, 2, 2, 2]);
    expect(attempt.baseline).toEqual([1, 1, 1, 1, 1]);
    expect(attempt.selfA).toEqual([1, 1, 1, 1, 1]);
    expect(attempt.selfB).toEqual([1, 1, 1, 1, 1]);
  }
  expect(order.slice(10, 14)).toEqual(['candidate', 'baseline', 'baseline', 'candidate']);
});

async function makeTypedCheckout() {
  const directory = await mkdtemp(join(tmpdir(), 'benchmark-typed-base-'));
  await mkdir(join(directory, 'src'));
  await mkdir(join(directory, 'dist'));
  await writeFile(join(directory, '.gitignore'), 'dist/\n');
  const trackedModule = join(directory, 'src', 'index.ts');
  await writeFile(trackedModule, 'export function solveLock() { return [[0, 1]]; }\n');
  execFileSync('git', ['init', '--quiet', directory]);
  execFileSync('git', ['-C', directory, 'add', '.']);
  execFileSync('git', ['-C', directory, '-c', 'user.name=Benchmark Test', '-c', 'user.email=benchmark@example.invalid', 'commit', '--quiet', '-m', 'Own typed source']);
  const revision = execFileSync('git', ['-C', directory, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  const module = join(directory, 'dist', 'gothic-lock-solver.mjs');
  await writeFile(module, 'export function solveLock() { return [[0, 1]]; }\n');
  const manifest = { schemaVersion: 1, package: 'gothic-lock-solver', version: '1.0.0', sourceSha: revision,
    files: { 'gothic-lock-solver.mjs': sha256(await readFile(module)) } };
  return { directory, trackedModule, module, manifest, manifestPath: join(directory, 'dist', 'manifest.json') };
}

describe('typed baseline build provenance', () => {
  it.each(['missing manifest', 'stale revision', 'wrong module checksum'] as const)('rejects %s in an otherwise clean checkout', async (problem) => {
    const checkout = await makeTypedCheckout();
    try {
      if (problem !== 'missing manifest') await writeFile(checkout.manifestPath, JSON.stringify({ ...checkout.manifest,
        ...(problem === 'stale revision' ? { sourceSha: '0'.repeat(40) } : { files: { 'gothic-lock-solver.mjs': '0'.repeat(64) } }) }));
      expect(() => inspectSource(checkout.module, 'tuple')).toThrow(/manifest|revision|checksum|hash/);
    } finally { await rm(checkout.directory, { recursive: true, force: true }); }
  });
  it('accepts the module whose manifest pins its checkout revision and bytes', async () => {
    const checkout = await makeTypedCheckout();
    try {
      await writeFile(checkout.manifestPath, JSON.stringify(checkout.manifest));
      expect(inspectSource(checkout.module, 'tuple')).toMatchObject({ revision: checkout.manifest.sourceSha, moduleSha256: checkout.manifest.files['gothic-lock-solver.mjs'] });
    } finally { await rm(checkout.directory, { recursive: true, force: true }); }
  });
  it('rejects a baseline module from the candidate checkout before measuring', async () => {
    const checkout = await makeTypedCheckout();
    try {
      await writeFile(checkout.manifestPath, JSON.stringify(checkout.manifest));
      const baseline = inspectSource(checkout.trackedModule, 'tuple');
      const snapshot = snapshotFromImplementation(implementation(), baseline, 'test', [fixture]);
      const options = parseBenchmarkArgs(['--candidate-module', checkout.module, '--baseline-module', checkout.trackedModule]);
      expect(() => collectMetadata(options, snapshot)).toThrow(/same.*checkout|candidate.*checkout/);
    } finally { await rm(checkout.directory, { recursive: true, force: true }); }
  });
  it('rejects a separate checkout at the candidate revision', async () => {
    const checkout = await makeTypedCheckout();
    const copy = await mkdtemp(join(tmpdir(), 'benchmark-same-revision-'));
    try {
      execFileSync('git', ['clone', '--quiet', checkout.directory, copy]);
      const baselineModule = join(copy, 'src', 'index.ts');
      const baseline = inspectSource(baselineModule, 'tuple');
      const snapshot = snapshotFromImplementation(implementation(), baseline, 'test', [fixture]);
      const options = parseBenchmarkArgs(['--candidate-module', checkout.trackedModule, '--baseline-module', baselineModule]);
      expect(() => collectMetadata(options, snapshot)).toThrow(/same.*revision|candidate.*revision/);
    } finally { await rm(checkout.directory, { recursive: true, force: true }); await rm(copy, { recursive: true, force: true }); }
  });
});


it('rejects a symlink alias of the candidate module', async () => {
  const checkout = await makeTypedCheckout();
  const aliasRoot = await mkdtemp(join(tmpdir(), 'benchmark-module-alias-'));
  try {
    const alias = join(aliasRoot, 'baseline.ts');
    await symlink(checkout.trackedModule, alias);
    expect(() => inspectComparisonBaseline(checkout.trackedModule, alias, 'tuple')).toThrow(/same module/);
  } finally { await rm(checkout.directory, { recursive: true, force: true }); await rm(aliasRoot, { recursive: true, force: true }); }
});

it('accepts identical module bytes from a separate checkout at a different target revision', async () => {
  const checkout = await makeTypedCheckout();
  const copy = await mkdtemp(join(tmpdir(), 'benchmark-other-revision-'));
  try {
    execFileSync('git', ['clone', '--quiet', checkout.directory, copy]);
    execFileSync('git', ['-C', copy, '-c', 'user.name=Benchmark Test', '-c', 'user.email=benchmark@example.invalid', 'commit', '--quiet', '--allow-empty', '-m', 'Another target revision']);
    const baseline = join(copy, 'src', 'index.ts');
    expect(inspectComparisonBaseline(checkout.trackedModule, baseline, 'tuple')).toHaveProperty('moduleSha256', sha256(await readFile(checkout.trackedModule)));
  } finally { await rm(checkout.directory, { recursive: true, force: true }); await rm(copy, { recursive: true, force: true }); }
});

it('allows a same-revision preceding release only with its verified manifest and evidence chain', async () => {
  const checkout = await makeTypedCheckout();
  try {
    const release = join(checkout.directory, 'artifacts', 'baseline');
    await mkdir(release, { recursive: true });
    const module = join(release, 'baseline.mjs');
    await writeFile(module, await readFile(checkout.module));
    const originalSource = { revision: checkout.manifest.sourceSha, moduleSha256: sha256(await readFile(module)), format: 'tuple' };
    const evidenceBytes = JSON.stringify({ qualitySnapshot: { source: originalSource } });
    const evidenceHash = sha256(evidenceBytes);
    const assets = { ...Object.fromEntries(releaseAssets.map((name) => [name, 'a'.repeat(64)])),
      'gothic-lock-solver.mjs': originalSource.moduleSha256, 'benchmark-evidence.json': evidenceHash };
    const manifestBytes = JSON.stringify({ schemaVersion: 1, name: 'gothic-lock-solver', version: '1.0.0', sourceSha: originalSource.revision,
      kind: 'stable', tarballSha256: 'a'.repeat(64), assets });
    const pinned = { ...originalSource, kind: 'previous-stable-release', releaseVersion: '1.0.0',
      releaseManifestSha256: sha256(manifestBytes), releaseEvidenceSha256: evidenceHash };
    expect(() => inspectComparisonBaseline(checkout.trackedModule, module, 'tuple', pinned)).toThrow(/manifest/);
    await writeFile(join(release, 'previous-release-manifest.json'), manifestBytes);
    await writeFile(join(release, 'previous-benchmark-evidence.json'), evidenceBytes);
    expect(inspectComparisonBaseline(checkout.trackedModule, module, 'tuple', pinned)).toMatchObject(pinned);
    await writeFile(join(release, 'previous-benchmark-evidence.json'), `${evidenceBytes} `);
    expect(() => inspectComparisonBaseline(checkout.trackedModule, module, 'tuple', pinned)).toThrow(/evidence hash/);
  } finally { await rm(checkout.directory, { recursive: true, force: true }); }
});
