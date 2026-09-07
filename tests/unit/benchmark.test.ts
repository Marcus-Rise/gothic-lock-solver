import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { commandMetrics, replayCommands, type Definition } from '../benchmarks/validation.ts';
import { compareMetrics, statistics } from '../benchmarks/comparison.ts';
import { catalogSha256, loadCatalog } from '../benchmarks/catalog.ts';
import { createReport, loadImplementation, parseReport, publishReport, readReport, runBenchmark, type BenchmarkReport } from '../benchmarks/harness.ts';
import { assertArtifactOutput, parseBenchmarkArgs } from '../benchmarks/cli.ts';
import { measureRss, type MemoryMeasurement } from '../benchmarks/memory.ts';

const definition = { state: [3, 4], links: [[0, 0], [0, 0]] };
const commands: readonly (readonly [number, number])[] = [[0, 1]];
const fixture = { id: 'unit', ...definition, expectedActions: 1 };
const source = { revision: '1'.repeat(40), dirty: false, moduleSha256: '2'.repeat(64) };
const environment = { node: process.version, v8: process.versions.v8, platform: process.platform, arch: process.arch,
  cpu: 'unit test', logicalCpus: 1, osRelease: 'test', totalMemoryBytes: 1024 };
const settings = { warmups: 0, repetitions: 1, memoryRepetitions: 1 };
const memory: MemoryMeasurement = { metric: 'linux-proc-VmHWM', limitations: 'Whole-process approximate RSS, including Node; not browser memory.',
  browser: { available: false, reason: 'No portable browser peak-memory API.' },
  samples: [{ peakRssBytes: 20, startupRssBytes: 10, loadedRssBytes: 12, lockCount: 45, peakRssMetric: 'linux-proc-VmHWM', startupPeakRssBytes: 10,
    loadedPeakRssBytes: 12, resourceUsageMaxRssBytes: 30, startupResourceUsageMaxRssBytes: 30, resourceUsageLaunchFloorDetected: true }],
  peakRssBytes: statistics([20]) };
let fullReport: BenchmarkReport;
beforeAll(async () => {
  const solver = await loadImplementation(new URL('../../src/index.ts', import.meta.url).pathname);
  const results = runBenchmark({ solve: solver, warmups: 0, repetitions: 1 });
  fullReport = createReport({ source, environment, settings, results, memory });
});

describe('independent benchmark replay', () => {
  it('uses outgoing links and checks every intermediate unit shift', () => {
    expect(replayCommands(definition, commands)).toEqual([4, 4]);
    expect(replayCommands({ state: [2, 5, 6], links: [[0, -1, 0], [0, 0, 1], [0, 0, 0]] }, [[0, 2]])).toEqual([4, 3, 6]);
    expect(() => replayCommands({ state: [6, 6], links: [[0, 1], [0, 0]] }, [[0, 2]])).toThrow(/blocked/i);
    expect(definition.state).toEqual([3, 4]);
  });
  it('rejects invalid commands', () => {
    for (const invalid of [[[0, 0]], [[-1, 1]], [[2, 1]], [[0, 7]], [[0, 1.5]], [[0, 1, 2]], [{ plate: 1 }]]) {
      expect(() => replayCommands(definition, invalid)).toThrow(/command/i);
    }
  });
  it('reports actions, distinct plates, unit shifts and plate switches', () => {
    expect(commandMetrics([[0, 2], [1, -3], [0, 1]])).toEqual({ A: 3, U: 2, C: 6, plateSwitches: 2 });
  });
});

describe('current solver measurement', () => {
  it('runs all 45 fixed inputs with their unchanged exact minima', () => {
    expect(loadCatalog()).toHaveLength(45);
    expect(loadCatalog().reduce((sum, lock) => sum + lock.expectedActions, 0)).toBe(483);
    expect(fullReport.results).toHaveLength(45);
    expect(fullReport.totals.A).toBe(483);
    expect(fullReport.quality).toBe('passed');
    expect(fullReport.comparison).toMatchObject({ status: 'skipped', reason: expect.stringMatching(/saved.*report/i) });
  });
  it('retains raw measurements while excluding warmups', () => {
    let calls = 0;
    let clock = 0;
    const results = runBenchmark({ locks: [fixture], solve: () => { calls += 1; clock += calls; return commands; },
      warmups: 2, repetitions: 3, clock: () => clock });
    expect(calls).toBe(5);
    expect(results[0]?.samplesMs).toEqual([3, 4, 5]);
    expect(results[0]?.timingMs).toEqual({ min: 3, median: 4, p95: 5, max: 5 });
  });
  it('checks input immutability, completion and minimum actions during warmups too', () => {
    const run = (solve: (input: Definition) => unknown) => runBenchmark({ locks: [fixture], solve, warmups: 1, repetitions: 1 });
    expect(() => run(() => null)).toThrow(/solvability/i);
    expect(() => run(() => [])).toThrow(/target/i);
    expect(() => run(() => [[0, 2], [0, -1]])).toThrow(/minimum/i);
    expect(() => run((input) => { input.state[0] = 4; return commands; })).toThrow(/mutat/i);
  });
  it('rejects nondeterministic equal-optimum paths', () => {
    const lock = { id: 'choice', state: [3, 3], links: [[0, 1], [1, 0]], expectedActions: 1 };
    let calls = 0;
    expect(() => runBenchmark({ locks: [lock], solve: () => [[calls++ % 2, 1]], warmups: 1, repetitions: 1 })).toThrow(/determin/i);
  });
  it('computes median and nearest-rank p95 without reordering samples', () => {
    const samples = [9, 1, 5, 3];
    expect(statistics(samples)).toEqual({ min: 1, median: 4, p95: 9, max: 9 });
    expect(samples).toEqual([9, 1, 5, 3]);
    for (const bad of [[], [-1], [NaN]]) expect(() => statistics(bad)).toThrow(/sample/i);
  });
});

describe('saved report comparison', () => {
  it('compares stored metrics and historical ratios without executing a baseline', () => {
    const baseline = structuredClone(fullReport);
    for (const row of baseline.results) { row.samplesMs = row.samplesMs.map((value) => value / 2); row.timingMs = statistics(row.samplesMs); }
    const report = createReport({ source, environment, settings, results: fullReport.results, memory, baseline });
    expect(report.quality).toBe('passed');
    expect(report.comparison).toMatchObject({ status: 'compared', baselineSha: source.revision, quality: 'passed',
      memoryPeakMedianRatio: 1, limitations: expect.stringMatching(/historical.*informational/i) });
    if (report.comparison.status !== 'compared') throw new Error('Missing comparison');
    expect(report.comparison.results[0]?.timingMedianRatio).toBe(2);
    expect(report.comparison.results[0]?.deltas).toEqual({ A: 0, U: 0, C: 0, plateSwitches: 0 });
    expect(parseReport(report)).toEqual(report);
  });
  it('fails an increase in every deterministic metric independently', () => {
    const baseline = { A: 3, U: 2, C: 8, plateSwitches: 1 };
    for (const name of ['A', 'U', 'C', 'plateSwitches'] as const) {
      expect(compareMetrics({ ...baseline, [name]: baseline[name] + 1 }, baseline)).toMatchObject({ quality: 'regression', regressions: [name] });
    }
    expect(compareMetrics({ A: 3, U: 1, C: 9, plateSwitches: 0 }, baseline).quality).toBe('regression');
  });
  it('accepts only exact source SHA reports and requires clean source identity', () => {
    expect(parseReport(fullReport, source.revision)).toEqual(fullReport);
    expect(() => parseReport(fullReport, '3'.repeat(40))).toThrow(/source|revision|SHA/i);
    expect(() => parseReport({ ...fullReport, source: { ...source, dirty: true } }, source.revision)).toThrow(/dirty|clean/i);
    expect(() => parseReport({ ...fullReport, source: {} })).toThrow(/source|revision/i);
  });
  it('rejects corrupt schema, catalog, incomplete rows and fabricated measurements', () => {
    const first = fullReport.results[0];
    if (first === undefined) throw new Error('Fixture missing');
    for (const change of [
      { schemaVersion: 1 }, { fixtures: { count: 45, catalogSha256: '0'.repeat(64) } },
      { results: fullReport.results.slice(1) }, { results: [first, ...fullReport.results.slice(0, 44)] },
      { results: [{ ...first, C: first.C + 1 }, ...fullReport.results.slice(1)] },
      { results: [{ ...first, commands: [] }, ...fullReport.results.slice(1)] },
      { results: [{ ...first, timingMs: { ...first.timingMs, median: first.timingMs.median + 1 } }, ...fullReport.results.slice(1)] },
      { totals: { ...fullReport.totals, A: 0 } }, { memory: { ...memory, peakRssBytes: statistics([1]) } },
      { quality: 'regression' }, { comparison: { status: 'skipped' } },
    ]) expect(() => parseReport({ ...fullReport, ...change })).toThrow();
  });
  it('rejects missing and malformed provided report files', async () => {
    const root = await mkdtemp(join(tmpdir(), 'benchmark-corrupt-'));
    try {
      const path = join(root, 'benchmark.json');
      expect(() => readReport(path, source.revision)).toThrow();
      await writeFile(path, '{broken');
      expect(() => readReport(path, source.revision)).toThrow();
    } finally { await rm(root, { recursive: true, force: true }); }
  });
});

it('accepts a standalone CLI and requires a target SHA for a provided report', () => {
  expect(parseBenchmarkArgs([])).toMatchObject({ warmups: 2, repetitions: 7, memoryRepetitions: 3 });
  expect(parseBenchmarkArgs([]).outputDir).toMatch(/artifacts\/benchmark$/);
  expect(parseBenchmarkArgs(['--baseline-sha', source.revision]).baselineReport).toBeUndefined();
  expect(parseBenchmarkArgs(['--baseline-report', '/saved.json', '--baseline-sha', source.revision]).baselineReport).toBe('/saved.json');
  for (const args of [['--baseline-report', '/saved.json'], ['--baseline-sha', 'main'], ['--baseline-module', '/base.mjs'],
    ['--baseline-snapshot', '/snapshot.json'], ['--smoke'], ['--skip-memory'], ['--warmups', '-1'], ['--warmups', '01'],
    ['--repetitions', '0'], ['--warmups', '1', '--warmups', '2'], ['--unknown']]) {
    expect(() => parseBenchmarkArgs(args)).toThrow();
  }
});

it('publishes exactly JSON and Markdown with full rows and explicit skipped comparison', async () => {
  const root = await mkdtemp(join(tmpdir(), 'benchmark-output-'));
  try {
    const paths = await publishReport(fullReport, root);
    expect((await readdir(root)).sort()).toEqual(['benchmark.json', 'benchmark.md']);
    expect(readReport(paths.jsonPath, source.revision)).toEqual(fullReport);
    const markdown = await readFile(paths.markdownPath, 'utf8');
    expect(markdown).toMatch(/comparison.*skipped/i);
    expect(markdown).toContain('lock-045');
    expect(markdown).toMatch(/actions.*distinct plates.*unit shifts.*switches/i);
    expect(markdown).toMatch(/Node.*browser/i);
  } finally { await rm(root, { recursive: true, force: true }); }
});

it('measures only the requested current solver in an isolated RSS worker', () => {
  const ids = loadCatalog().slice(0, 2).map((lock) => lock.id);
  const sample = measureRss(new URL('../../src/index.ts', import.meta.url).pathname, ids);
  expect(sample.lockCount).toBe(2);
  expect(sample.peakRssBytes).toBeGreaterThan(0);
  expect(sample.startupRssBytes).toBeGreaterThan(0);
  expect(sample.peakRssMetric).toBe(process.platform === 'linux' ? 'linux-proc-VmHWM' : 'node-resourceUsage-maxRSS');
  expect(sample.resourceUsageMaxRssBytes).toBeGreaterThan(0);
});

it('keeps report output in ignored artifacts and retains the fixed catalog hash', () => {
  expect(() => assertArtifactOutput('docs/benchmarks')).toThrow(/ignored artifacts/);
  expect(() => assertArtifactOutput('artifacts/../tests')).toThrow(/ignored artifacts/);
  expect(() => assertArtifactOutput('artifacts/benchmark')).not.toThrow();
  expect(catalogSha256).toBe('902a57e0c867b7ed7513af09257fde765396593ab45738bb60967b412b4bcd69');
});
