import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { array, commandMetrics, replayCommands, legacyCommands, record } from '../../benchmarks/validation.ts';
import { compareMetrics, confirmPerformance, performanceVerdict, statistics } from '../../benchmarks/comparison.ts';
import { catalogSha256, loadCatalog, sha256, verifySource, verifyReferenceSource } from '../../benchmarks/catalog.ts';
import { publishReport, readSnapshot, runComparison, writeSnapshot, type Implementation } from '../../benchmarks/harness.ts';

import { parseBenchmarkArgs } from '../../benchmarks/cli.ts';

const definition = { state: [3, 4], links: [[0, 0], [0, 0]] };
const commands: readonly (readonly [number, number])[] = [[0, 1]];
const fixture = { id: 'unit', title: 'Unit', definition, expectedActions: 1,
  baselineCommands: commands, historicalReference: { commands, A: 1, U: 1, C: 1, plateSwitches: 0 } };
const implementation = (solve: Implementation['solve'] = () => commands): Implementation => ({
  label: 'unit', solve, normalize: (value) => value, requiresOptimality: true,
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
  it('retains all 45 immutable fixtures and original source pins', () => {
    expect(loadCatalog()).toHaveLength(45);
    expect(verifySource(new URL('../../benchmarks/baseline/', import.meta.url))).toHaveProperty('revision', 'a87e739a22ccc4215d6d9b14fa06b0738171cb60');
    expect(verifySource(new URL('../../benchmarks/reference-matrix/', import.meta.url))).toHaveProperty('revision', '6b1cfbc13bcec68f609d45d5dc97504dd84f1760');
  });
  it('rejects source changes before external code can execute', async () => {
    const root = await mkdtemp(join(tmpdir(), 'benchmark-source-'));
    try {
      await writeFile(join(root, 'solver.mjs'), 'original');
      await writeFile(join(root, 'manifest.json'), JSON.stringify({ revision: 'test', files: { 'solver.mjs': sha256('original') } }));
      verifySource(root);
      await writeFile(join(root, 'solver.mjs'), 'modified');
      expect(() => verifySource(root)).toThrow(/hash/i);
    } finally { await rm(root, { recursive: true, force: true }); }
  });
  it('checks upstream revision, entire file and marked block independently', () => {
    const block = '/* solver-start */ function solveLock() {} /* solver-end */';
    const html = `<script>${block}</script>`;
    const pin = { revision: 'pin', solver: { path: 'index.html', sha256: sha256(html), blockSha256: sha256(block), startMarker: '/* solver-start', endMarker: '/* solver-end */' } };
    expect(verifyReferenceSource({ revision: 'pin', html }, pin)).toBe(block);
    expect(() => verifyReferenceSource({ revision: 'bad', html }, pin)).toThrow(/revision/i);
    expect(() => verifyReferenceSource({ revision: 'pin', html: 'modified' }, pin)).toThrow(/hash/i);
    expect(() => verifyReferenceSource({ revision: 'pin', html }, { ...pin, solver: { ...pin.solver, blockSha256: 'wrong' } })).toThrow(/block hash/i);
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
  expect(() => parseBenchmarkArgs([], true)).toThrow(/explicit/);
  expect(parseBenchmarkArgs(['--baseline-module', '/base.mjs', '--baseline-snapshot', '/quality.json', '--baseline-format', 'legacy'], true).baselineFormat).toBe('legacy');
  for (const args of [['--warmups', '-1'], ['--warmups', '01'], ['--repetitions', '0'], ['--warmups', '1', '--warmups', '2'], ['--reference'], ['--unknown', '1']]) {
    expect(() => parseBenchmarkArgs(args)).toThrow(/argument|integer/);
  }
});

it('checks target-branch snapshot against the live base independently of candidate expectations', () => {
  const baselineSnapshot = { schemaVersion: 1, fixtureSha256: catalogSha256, source: {}, reason: 'test baseline',
    locks: [{ id: 'unit', optimumA: 1, ...commandMetrics(commands), commands: [[0, 2], [0, -1]] as const }] };
  expect(() => runComparison({ locks: [fixture], candidate: implementation(), baseline: implementation(), baselineSnapshot, repetitions: 1, warmups: 0 })).toThrow(/snapshot path drift/);
  expect(readSnapshot(new URL('../../benchmarks/snapshots/reference-matrix.json', import.meta.url).pathname).locks).toHaveLength(45);
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
  const { measureRss } = await import('../../benchmarks/memory.ts');
  const result = measureRss({ name: 'baseline', module: new URL('../../benchmarks/reference-matrix/src/index.mjs', import.meta.url).pathname, format: 'legacy' }, 'cor-galom-chest,cor-galom-bedroom-chest');
  expect(result.lockCount).toBe(2);
  expect(result.peakRssBytes).toBeGreaterThan(0);
  expect(result.startupRssBytes).toBeGreaterThan(0);
});

it('names the process-image RSS metric and preserves launch-floor diagnostics', async () => {
  const { measureRss } = await import('../../benchmarks/memory.ts');
  const result = measureRss({ name: 'baseline', module: new URL('../../benchmarks/reference-matrix/src/index.mjs', import.meta.url).pathname, format: 'legacy' }, 'cor-galom-chest');
  expect(result.peakRssMetric).toBe(process.platform === 'linux' ? 'linux-proc-VmHWM' : 'node-resourceUsage-maxRSS');
  expect(result.startupPeakRssBytes).toBeGreaterThan(0);
  expect(result.resourceUsageMaxRssBytes).toBeGreaterThan(0);
});
