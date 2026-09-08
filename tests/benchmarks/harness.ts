import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { pathToFileURL } from 'node:url';
import {
  array,
  commandMetrics,
  integer,
  record,
  replayCommands,
  string,
  tupleCommands,
  type Definition,
  type Metrics,
  type TupleCommand,
} from './validation.ts';
import { catalogSha256, jsonFile, loadCatalog, readMetrics, type Fixture } from './catalog.ts';
import {
  compareMetrics,
  historicalRatio,
  statistics,
  type MetricComparison,
  type Quality,
} from './comparison.ts';
import { parseMemory, type MemoryMeasurement } from './memory.ts';

export type Solver = (definition: Definition) => unknown;
export type Solution = Metrics & { commands: readonly TupleCommand[] };
export type Measurement = Solution & {
  id: string;
  optimumA: number;
  samplesMs: number[];
  timingMs: ReturnType<typeof statistics>;
};
export type Source = {
  revision: string;
  dirty: boolean;
  moduleSha256: string;
};
export type Environment = {
  node: string;
  v8: string;
  platform: string;
  arch: string;
  cpu: string;
  logicalCpus: number;
  osRelease: string;
  totalMemoryBytes: number;
};
export type Settings = {
  warmups: number;
  repetitions: number;
  memoryRepetitions: number;
};
export type ComparedLock = MetricComparison & {
  id: string;
  baseline: Metrics;
  timingMedianRatio: number | null;
  timingP95Ratio: number | null;
};
export type Comparison =
  | { status: 'skipped'; reason: string }
  | {
      status: 'compared';
      baselineSha: string;
      quality: Quality;
      results: ComparedLock[];
      memoryPeakMedianRatio: number | null;
      limitations: string;
    };
export type BenchmarkReport = {
  schemaVersion: 2;
  createdAt: string;
  source: Source;
  environment: Environment;
  settings: Settings;
  fixtures: { count: 45; catalogSha256: string };
  quality: Quality;
  results: Measurement[];
  totals: Metrics;
  memory: MemoryMeasurement;
  comparison: Comparison;
};
const historicalLimitations = [
  'Historical timing and RSS ratios are informational observations.',
  'Hosts, runtimes, load, sample counts and measurement noise can differ;',
  'these are not paired performance gates.',
].join(' ');

export async function loadImplementation(modulePath: string): Promise<Solver> {
  const module: unknown = await import(pathToFileURL(resolve(modulePath)).href);
  const solveLock = record(module, 'solver module')['solveLock'];
  if (typeof solveLock !== 'function') {
    throw new Error(`Missing named solveLock export: ${modulePath}`);
  }
  return (definition) => {
    const result: unknown = solveLock(definition.state, definition.links);
    return result;
  };
}

export function validateSolution(lock: Fixture, raw: unknown): Solution {
  if (raw === null) {
    throw new Error(`${lock.id}: lost solvability.`);
  }
  const commands = tupleCommands(raw);
  assert.deepEqual(replayCommands(lock, commands), lock.state.map(() => 4), `${lock.id}: target not reached.`);
  const metrics = commandMetrics(commands);
  assert.equal(metrics.A, lock.expectedActions, `${lock.id}: wrong exact action minimum.`);
  return { ...metrics, commands };
}

export function runBenchmark(options: {
  solve: Solver;
  locks?: readonly Fixture[];
  repetitions?: number;
  warmups?: number;
  clock?: () => number;
  onProgress?: (completed: number, total: number, id: string) => void;
}): Measurement[] {
  const locks = options.locks ?? loadCatalog();
  const repetitions = count(options.repetitions ?? 7, 1, 'repetitions');
  const warmups = count(options.warmups ?? 2, 0, 'warmups');
  const clock = options.clock ?? (() => performance.now());
  if (locks.length === 0 || new Set(locks.map((lock) => lock.id)).size !== locks.length) {
    throw new Error('Expected unique nonempty fixtures.');
  }
  return locks.map((lock, index) => {
    const samplesMs: number[] = [];
    let solution: Solution | undefined;
    for (let round = -warmups; round < repetitions; round += 1) {
      const definition = structuredClone({ state: lock.state, links: lock.links });
      const before = JSON.stringify(definition);
      const start = clock();
      const raw = options.solve(definition);
      const elapsed = clock() - start;
      assert.equal(JSON.stringify(definition), before, `${lock.id}: solver mutated its input.`);
      const measured = validateSolution(lock, raw);
      if (solution !== undefined) {
        assert.deepEqual(measured, solution, `${lock.id}: nondeterministic solution.`);
      }
      solution = measured;
      if (round >= 0) {
        samplesMs.push(elapsed);
      }
    }
    if (solution === undefined) {
      throw new Error('Missing measured solution.');
    }
    options.onProgress?.(index + 1, locks.length, lock.id);
    return { id: lock.id, optimumA: lock.expectedActions, ...solution, samplesMs, timingMs: statistics(samplesMs) };
  });
}

function count(value: unknown, minimum: number, label: string): number {
  const parsed = integer(value, label);
  if (parsed < minimum) {
    throw new Error(`Invalid ${label} count.`);
  }
  return parsed;
}

function digest(value: unknown, length: number, label: string): string {
  const parsed = string(value, label);
  if (!new RegExp(`^[a-f0-9]{${length}}$`).test(parsed)) {
    throw new Error(`Invalid ${label}.`);
  }
  return parsed;
}

function totalMetrics(results: readonly Metrics[]): Metrics {
  const totals = { A: 0, U: 0, C: 0, plateSwitches: 0 };
  for (const row of results) {
    totals.A += row.A;
    totals.U += row.U;
    totals.C += row.C;
    totals.plateSwitches += row.plateSwitches;
  }
  return totals;
}

function compareReport(results: readonly Measurement[], memory: MemoryMeasurement, baseline?: BenchmarkReport): Comparison {
  if (baseline === undefined) {
    return { status: 'skipped', reason: 'No saved benchmark report was supplied for the exact target SHA.' };
  }
  const compared = results.map((row): ComparedLock => {
    const previous = baseline.results.find((item) => item.id === row.id);
    if (previous === undefined) {
      throw new Error(`Baseline fixture missing: ${row.id}`);
    }
    return {
      id: row.id,
      baseline: readMetrics(previous),
      ...compareMetrics(row, previous),
      timingMedianRatio: historicalRatio(row.timingMs.median, previous.timingMs.median),
      timingP95Ratio: historicalRatio(row.timingMs.p95, previous.timingMs.p95),
    };
  });
  return {
    status: 'compared',
    baselineSha: baseline.source.revision,
    quality: compared.some((row) => row.quality === 'regression') ? 'regression' : 'passed',
    results: compared,
    memoryPeakMedianRatio: memory.metric === baseline.memory.metric
      ? historicalRatio(memory.peakRssBytes.median, baseline.memory.peakRssBytes.median)
      : null,
    limitations: historicalLimitations,
  };
}

export function createReport(options: {
  source: Source;
  environment: Environment;
  settings: Settings;
  results: Measurement[];
  memory: MemoryMeasurement;
  baseline?: BenchmarkReport;
}): BenchmarkReport {
  const comparison = compareReport(options.results, options.memory, options.baseline);
  return {
    schemaVersion: 2,
    createdAt: new Date().toISOString(),
    source: options.source,
    environment: options.environment,
    settings: options.settings,
    fixtures: { count: 45, catalogSha256 },
    quality: comparison.status === 'compared' ? comparison.quality : 'passed',
    results: options.results,
    totals: totalMetrics(options.results),
    memory: options.memory,
    comparison,
  };
}

function parseMeasurements(raw: unknown, repetitions: number): Measurement[] {
  const rows = array(raw, 'benchmark results');
  const catalog = loadCatalog();
  if (rows.length !== catalog.length) {
    throw new Error('Benchmark report requires all 45 locks.');
  }
  return catalog.map((lock, index) => {
    const row = record(rows[index], 'benchmark lock');
    if (row['id'] !== lock.id || row['optimumA'] !== lock.expectedActions) {
      throw new Error('Benchmark fixture identity or optimum mismatch.');
    }
    const solution = validateSolution(lock, row['commands']);
    assert.deepEqual(readMetrics(row), commandMetrics(solution.commands), 'Report metric/path mismatch.');
    const samplesMs = array(row['samplesMs'], 'timing samples').map((value) => {
      if (typeof value !== 'number') {
        throw new Error('Invalid timing sample.');
      }
      return value;
    });
    if (samplesMs.length !== repetitions) {
      throw new Error('Timing sample count mismatch.');
    }
    const timingMs = statistics(samplesMs);
    assert.deepEqual(row['timingMs'], timingMs, 'Timing statistics mismatch.');
    return { id: lock.id, optimumA: lock.expectedActions, ...solution, samplesMs, timingMs };
  });
}

function ratio(value: unknown): number | null {
  if (value === null) {
    return null;
  }
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new Error('Invalid historical ratio.');
  }
  return value;
}

function parseComparison(raw: unknown, results: readonly Measurement[]): Comparison {
  const value = record(raw, 'comparison');
  if (value['status'] === 'skipped') {
    const reason = string(value['reason'], 'comparison skip reason');
    if (reason.trim() === '') {
      throw new Error('Comparison skip reason missing.');
    }
    return { status: 'skipped', reason };
  }
  if (value['status'] !== 'compared') {
    throw new Error('Invalid comparison status.');
  }
  const rows = array(value['results'], 'comparison results');
  if (rows.length !== results.length) {
    throw new Error('Comparison requires every lock.');
  }
  const compared = results.map((current, index): ComparedLock => {
    const row = record(rows[index], 'comparison lock');
    if (row['id'] !== current.id) {
      throw new Error('Comparison fixture mismatch.');
    }
    const baseline = readMetrics(row['baseline']);
    if (Object.values(baseline).some((metric) => metric < 0) || baseline.A !== current.optimumA) {
      throw new Error('Invalid baseline metrics.');
    }
    const comparison = compareMetrics(current, baseline);
    assert.deepEqual(row['deltas'], comparison.deltas, 'Comparison delta mismatch.');
    assert.deepEqual(row['regressions'], comparison.regressions, 'Comparison regressions mismatch.');
    if (row['quality'] !== comparison.quality) {
      throw new Error('Comparison lock quality mismatch.');
    }
    return {
      id: current.id,
      baseline,
      ...comparison,
      timingMedianRatio: ratio(row['timingMedianRatio']),
      timingP95Ratio: ratio(row['timingP95Ratio']),
    };
  });
  const quality = compared.some((row) => row.quality === 'regression') ? 'regression' : 'passed';
  if (value['quality'] !== quality) {
    throw new Error('Comparison quality mismatch.');
  }
  return {
    status: 'compared',
    baselineSha: digest(value['baselineSha'], 40, 'baseline SHA'),
    quality,
    results: compared,
    memoryPeakMedianRatio: ratio(value['memoryPeakMedianRatio']),
    limitations: string(value['limitations'], 'historical limitations'),
  };
}

export function parseReport(raw: unknown, expectedSha?: string): BenchmarkReport {
  const value = record(raw, 'benchmark report');
  const fixtures = record(value['fixtures'], 'report fixtures');
  if (value['schemaVersion'] !== 2 || fixtures['count'] !== 45 || fixtures['catalogSha256'] !== catalogSha256) {
    throw new Error('Report schema or fixture catalog mismatch.');
  }
  const rawSource = record(value['source'], 'report source');
  const revision = digest(rawSource['revision'], 40, 'source revision');
  const moduleSha256 = digest(rawSource['moduleSha256'], 64, 'source module checksum');
  if (typeof rawSource['dirty'] !== 'boolean') {
    throw new Error('Missing source dirty status.');
  }
  if (expectedSha !== undefined && revision !== digest(expectedSha, 40, 'expected source SHA')) {
    throw new Error('Report source revision differs from exact target SHA.');
  }
  if (expectedSha !== undefined && rawSource['dirty']) {
    throw new Error('An exact source SHA report requires a clean checkout; report is dirty.');
  }
  const source = { revision, moduleSha256, dirty: rawSource['dirty'] };
  const rawSettings = record(value['settings'], 'benchmark settings');
  const settings = {
    warmups: count(rawSettings['warmups'], 0, 'warmups'),
    repetitions: count(rawSettings['repetitions'], 1, 'repetitions'),
    memoryRepetitions: count(rawSettings['memoryRepetitions'], 1, 'memory repetitions'),
  };
  const rawEnvironment = record(value['environment'], 'benchmark environment');
  const environment = {
    node: string(rawEnvironment['node']),
    v8: string(rawEnvironment['v8']),
    platform: string(rawEnvironment['platform']),
    arch: string(rawEnvironment['arch']),
    cpu: string(rawEnvironment['cpu']),
    logicalCpus: count(rawEnvironment['logicalCpus'], 1, 'logical CPUs'),
    osRelease: string(rawEnvironment['osRelease']),
    totalMemoryBytes: count(rawEnvironment['totalMemoryBytes'], 1, 'total memory'),
  };
  const createdAt = string(value['createdAt'], 'report timestamp');
  if (!Number.isFinite(Date.parse(createdAt))) {
    throw new Error('Invalid report timestamp.');
  }
  const results = parseMeasurements(value['results'], settings.repetitions);
  const totals = totalMetrics(results);
  assert.deepEqual(value['totals'], totals, 'Report totals mismatch.');
  const memory = parseMemory(value['memory'], settings.memoryRepetitions);
  const comparison = parseComparison(value['comparison'], results);
  const quality = comparison.status === 'compared' ? comparison.quality : 'passed';
  if (value['quality'] !== quality) {
    throw new Error('Report quality mismatch.');
  }
  return {
    schemaVersion: 2,
    createdAt,
    source,
    environment,
    settings,
    fixtures: { count: 45, catalogSha256 },
    quality,
    results,
    totals,
    memory,
    comparison,
  };
}

export function readReport(path: string, expectedSha?: string): BenchmarkReport {
  return parseReport(jsonFile(path), expectedSha);
}

function renderComparison(comparison: Comparison): string {
  if (comparison.status === 'skipped') {
    return `Comparison: **skipped**. ${comparison.reason}`;
  }
  const rows = comparison.results.map((row) => [
    '',
    row.id,
    row.deltas.A,
    row.deltas.U,
    row.deltas.C,
    row.deltas.plateSwitches,
    row.timingMedianRatio?.toFixed(3) ?? 'unavailable',
    row.timingP95Ratio?.toFixed(3) ?? 'unavailable',
    '',
  ].join(' | '));
  const memoryRatio = comparison.memoryPeakMedianRatio?.toFixed(3)
    ?? 'unavailable (different metrics or zero baseline)';
  return [
    `Comparison: **${comparison.quality}**, saved report for ${comparison.baselineSha}.`,
    '',
    comparison.limitations,
    '',
    '| Lock | Δ actions | Δ distinct plates | Δ unit shifts | Δ switches | Median ratio | p95 ratio |',
    '| --- | ---: | ---: | ---: | ---: | ---: | ---: |',
    ...rows,
    '',
    `Whole-catalog RSS median ratio: ${memoryRatio}.`,
  ].join('\n');
}

function renderMarkdown(report: BenchmarkReport): string {
  const rows = report.results.map((row) => [
    '',
    row.id,
    row.A,
    row.U,
    row.C,
    row.plateSwitches,
    row.timingMs.median.toFixed(3),
    row.timingMs.p95.toFixed(3),
    '',
  ].join(' | '));
  const summary = [
    `Quality: **${report.quality}**. All 45 fixed locks replayed and exact action minima checked.`,
    `Totals: ${report.totals.A} actions, ${report.totals.U} distinct plates summed per lock,`,
    `${report.totals.C} unit shifts, ${report.totals.plateSwitches} switches.`,
  ].join(' ');
  const environment = [
    `Node ${report.environment.node}; ${report.environment.platform}/${report.environment.arch};`,
    `${report.environment.cpu}. ${report.settings.warmups} warmups and`,
    `${report.settings.repetitions} measured solves per lock.`,
    'Timings cover the solver call, excluding input cloning and independent validation.',
  ].join(' ');
  const memory = [
    `Whole-catalog Node peak RSS median: ${report.memory.peakRssBytes.median} bytes;`,
    `p95: ${report.memory.peakRssBytes.p95} bytes`,
    `(${report.memory.samples.length} fresh-process observations, ${report.memory.metric}).`,
  ].join(' ');
  return [
    '# Gothic Lock Solver benchmark',
    '',
    `Source: ${report.source.revision}; dirty: ${report.source.dirty}. ${report.createdAt}`,
    '',
    summary,
    '',
    environment,
    '',
    '| Lock | Actions | Distinct plates | Unit shifts | Switches | Median ms | p95 ms |',
    '| --- | ---: | ---: | ---: | ---: | ---: | ---: |',
    ...rows,
    '',
    renderComparison(report.comparison),
    '',
    memory,
    '',
    report.memory.limitations,
    '',
    report.memory.browser.reason,
    '',
    'Commands, raw timings, RSS samples, and environment details are retained in benchmark.json.',
    '',
  ].join('\n');
}

export async function publishReport(report: BenchmarkReport, outputDir: string): Promise<{ jsonPath: string; markdownPath: string }> {
  parseReport(report);
  await mkdir(outputDir, { recursive: true });
  const jsonPath = join(outputDir, 'benchmark.json');
  const markdownPath = join(outputDir, 'benchmark.md');
  await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(markdownPath, renderMarkdown(report));
  return { jsonPath, markdownPath };
}
