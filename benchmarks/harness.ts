import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdir, mkdtemp, rename, rm, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { pathToFileURL } from 'node:url';
import { array, commandMetrics, groupReferenceClicks, legacyCommands, record, replayCommands, string, tupleCommands, type Definition, type Metrics, type TupleCommand } from './validation.ts';
import { catalogSha256, git, jsonFile, loadCatalog, readMetrics, sha256, upstreamPin, verifyReferenceSource, type Fixture } from './catalog.ts';
import { combineVerdicts, compareMetrics, confirmPerformance, performanceVerdict, statistics } from './comparison.ts';

export type ModuleFormat = 'tuple' | 'legacy';
export type Implementation = { label: string; solve: (definition: Definition) => unknown;
  normalize: (raw: unknown) => unknown; requiresOptimality: boolean; expectedPath?: 'bfs' | 'upstream' };
export type Solution = Metrics & { commands: readonly TupleCommand[] };
export type Snapshot = { schemaVersion: number; fixtureSha256: string; source: Record<string, unknown>; reason: string;
  locks: (Solution & { id: string; optimumA: number })[] };
export type Measurement = Solution & { samplesMs: number[]; timingMs: ReturnType<typeof statistics> };

export async function loadImplementation(modulePath: string, format: ModuleFormat, label: string): Promise<Implementation> {
  const module: unknown = await import(pathToFileURL(resolve(modulePath)).href);
  const exported = record(module, 'solver module')['solveLock'];
  if (typeof exported !== 'function') throw new Error(`Missing named solveLock export: ${modulePath}`);
  return { label, requiresOptimality: true,
    solve: (definition) => { const raw: unknown = format === 'tuple' ? exported(definition.state, definition.links) : exported(definition); return raw; },
    normalize: (raw) => {
      if (format === 'tuple') return raw;
      const result = record(raw, 'legacy result');
      if (result['status'] === 'unsolvable') return null;
      if (result['status'] !== 'solved') throw new Error('Unexpected legacy solver status.');
      return legacyCommands(result['commands']);
    } };
}
export function loadUpstream(directory: string): Implementation {
  const pin = upstreamPin();
  const html = readFileSync(join(directory, pin.solver.path), 'utf8');
  const block = verifyReferenceSource({ revision: git(directory, ['rev-parse', 'HEAD']), html }, pin);
  // Executes only the independently hash-verified external source, never copied into this repository.
  const exported: unknown = Function(`${block}\n; return solveLock;`)();
  if (typeof exported !== 'function') throw new Error('Pinned upstream solveLock is missing.');
  return { label: 'UnlockMyLoot pinned external reference', requiresOptimality: false, expectedPath: 'upstream',
    solve: (definition) => { const raw: unknown = exported(definition.state, definition.links); return raw; }, normalize: groupReferenceClicks };
}
export function readSnapshot(path: string): Snapshot {
  const value = record(jsonFile(path), 'snapshot');
  if (value['schemaVersion'] !== 1 || value['fixtureSha256'] !== catalogSha256) throw new Error('Snapshot schema or fixture hash mismatch.');
  const locks = array(value['locks'], 'snapshot locks').map((raw) => {
    const row = record(raw); const metrics = readMetrics(row); const commands = tupleCommands(row['commands']);
    assert.deepEqual(commandMetrics(commands), metrics, 'Snapshot metric/path mismatch.');
    if (typeof row['optimumA'] !== 'number' || !Number.isInteger(row['optimumA'])) throw new Error('Snapshot optimum missing.');
    return { id: string(row['id']), optimumA: row['optimumA'], ...metrics, commands };
  });
  if (locks.length !== 45 || new Set(locks.map((lock) => lock.id)).size !== 45) throw new Error('Snapshot requires 45 unique locks.');
  return { schemaVersion: 1, fixtureSha256: catalogSha256, source: record(value['source']), reason: string(value['reason']), locks };
}
export async function writeSnapshot(path: string, snapshot: unknown): Promise<void> {
  // Deliberately exclusive. Refreshes require a new reviewed destination, never an implicit replacement.
  await writeFile(path, `${JSON.stringify(snapshot, null, 2)}\n`, { flag: 'wx' });
}
function validate(lock: Fixture, implementation: Implementation, raw: unknown): Solution {
  if (raw === null) throw new Error(`${lock.id}: lost solvability.`);
  const commands = tupleCommands(raw);
  assert.deepEqual(replayCommands(lock.definition, commands), lock.definition.state.map(() => 4), `${lock.id}: target not reached.`);
  const metrics = commandMetrics(commands);
  if (implementation.requiresOptimality) assert.equal(metrics.A, lock.expectedActions, `${lock.id}: wrong exact action minimum.`);
  else assert.ok(metrics.A >= lock.expectedActions, `${lock.id}: upstream beats claimed optimum.`);
  if (implementation.expectedPath === 'bfs') assert.deepEqual(commands, lock.baselineCommands, `${lock.id}: pinned BFS path changed.`);
  if (implementation.expectedPath === 'upstream') {
    assert.deepEqual(commands, lock.historicalReference.commands, `${lock.id}: pinned upstream path drift.`);
    assert.deepEqual(metrics, commandMetrics(lock.historicalReference.commands), `${lock.id}: upstream metrics drift.`);
  }
  return { ...metrics, commands };
}
function measure(lock: Fixture, implementation: Implementation, clock: () => number): { solution: Solution; elapsed: number } {
  const definition = structuredClone(lock.definition); const before = JSON.stringify(definition);
  const start = clock(); const raw = implementation.solve(definition); const elapsed = clock() - start;
  assert.equal(JSON.stringify(definition), before, `${lock.id}: solver mutated its input.`);
  return { solution: validate(lock, implementation, implementation.normalize(raw)), elapsed };
}
export function runComparison(options: {
  locks?: Fixture[]; candidate: Implementation; baseline: Implementation; baselineSnapshot?: Snapshot;
  others?: Record<string, Implementation>; repetitions?: number; warmups?: number; clock?: () => number;
  onProgress?: (completed: number, total: number, id: string) => void;
}) {
  const locks = options.locks ?? loadCatalog(); const repetitions = options.repetitions ?? 7;
  const warmups = options.warmups ?? 2; const clock = options.clock ?? (() => performance.now());
  if (!Number.isSafeInteger(repetitions) || repetitions < 1 || !Number.isSafeInteger(warmups) || warmups < 0) throw new Error('Invalid repetition/warmup count.');
  if (locks.length === 0 || new Set(locks.map((lock) => lock.id)).size !== locks.length) throw new Error('Expected unique nonempty fixture set.');
  const implementations = { ...options.others, candidate: options.candidate, baseline: options.baseline };
  const entries = Object.entries(implementations);
  const results = locks.map((lock, lockIndex) => {
    assert.deepEqual(replayCommands(lock.definition, lock.baselineCommands), lock.definition.state.map(() => 4));
    assert.equal(lock.baselineCommands.length, lock.expectedActions, 'Pinned BFS optimum mismatch.');
    assert.deepEqual(replayCommands(lock.definition, lock.historicalReference.commands), lock.definition.state.map(() => 4));
    assert.deepEqual(commandMetrics(lock.historicalReference.commands), readMetrics(lock.historicalReference));
    const selfA: number[] = []; const selfB: number[] = [];
    let baselineControl: Solution | undefined;
    for (let round = -warmups; round < repetitions; round += 1) {
      for (const slot of (round + warmups) % 2 === 0 ? [selfA, selfB] : [selfB, selfA]) {
        const measured = measure(lock, options.baseline, clock);
        if (baselineControl !== undefined) assert.deepEqual(measured.solution, baselineControl, `${lock.id}: nondeterministic baseline control.`);
        baselineControl = measured.solution;
        if (round >= 0) slot.push(measured.elapsed);
      }
    }
    const measured = new Map<string, { samplesMs: number[]; solution?: Solution }>();
    for (const [name] of entries) measured.set(name, { samplesMs: [] });
    for (let round = -warmups; round < repetitions; round += 1) {
      const offset = (round + warmups + lockIndex) % entries.length;
      for (let index = 0; index < entries.length; index += 1) {
        const entry = entries[(offset + index) % entries.length]; if (entry === undefined) throw new Error('Missing implementation.');
        const [name, implementation] = entry; const prior = measured.get(name); if (prior === undefined) throw new Error('Missing measurement.');
        const call = measure(lock, implementation, clock);
        if (prior.solution !== undefined) assert.deepEqual(call.solution, prior.solution, `${lock.id}/${name}: nondeterministic path.`);
        prior.solution = call.solution;
        if (round >= 0) prior.samplesMs.push(call.elapsed);
      }
    }
    const solvers: Record<string, Measurement> = Object.fromEntries([...measured].map(([name, value]) => {
      if (value.solution === undefined) throw new Error('Missing measured solution.');
      return [name, { ...value.solution, samplesMs: value.samplesMs, timingMs: statistics(value.samplesMs) }];
    }));
    const candidate = solvers['candidate']; const baseline = solvers['baseline'];
    if (candidate === undefined || baseline === undefined) throw new Error('Missing matched implementations.');
    assert.deepEqual({ ...baseline, samplesMs: undefined, timingMs: undefined }, { ...baselineControl, samplesMs: undefined, timingMs: undefined }, 'Baseline changed between calibration and measurement.');
    if (options.baselineSnapshot !== undefined) {
      const stored = options.baselineSnapshot.locks.find((row) => row.id === lock.id);
      if (stored === undefined || stored.optimumA !== lock.expectedActions) throw new Error(`${lock.id}: baseline snapshot optimum/identity mismatch.`);
      assert.deepEqual(baseline.commands, stored.commands, `${lock.id}: target-branch baseline snapshot path drift.`);
      assert.deepEqual(commandMetrics(baseline.commands), readMetrics(stored), `${lock.id}: target-branch baseline snapshot metrics drift.`);
    }
    const quality = compareMetrics(candidate, baseline);
    const firstTiming = performanceVerdict(candidate.samplesMs, baseline.samplesMs, selfA, selfB);
    const timingAttempts = [{ ...firstTiming, candidate: candidate.samplesMs, baseline: baseline.samplesMs, selfA, selfB }];
    if (firstTiming.verdict !== 'passed' && repetitions >= 5) {
      const repeatSamples = new Map<string, number[]>(['candidate', 'baseline', 'selfA', 'selfB'].map((name) => [name, []]));
      const repeated = [['selfA', options.baseline], ['selfB', options.baseline], ['candidate', options.candidate], ['baseline', options.baseline]] as const;
      for (let round = -warmups; round < repetitions; round += 1) {
        for (let index = 0; index < repeated.length; index += 1) {
          const entry = repeated[(index + round + warmups) % repeated.length];
          if (entry === undefined) throw new Error('Missing repeat entry.');
          const [name, implementation] = entry;
          const call = measure(lock, implementation, clock);
          const expected: Measurement = name === 'candidate' ? candidate : baseline;
          assert.deepEqual(call.solution.commands, expected.commands, `${lock.id}: nondeterministic repeat.`);
          if (round >= 0) repeatSamples.get(name)?.push(call.elapsed);
        }
      }
      const candidateRepeat = repeatSamples.get('candidate') ?? []; const baselineRepeat = repeatSamples.get('baseline') ?? [];
      const selfARepeat = repeatSamples.get('selfA') ?? []; const selfBRepeat = repeatSamples.get('selfB') ?? [];
      timingAttempts.push({ ...performanceVerdict(candidateRepeat, baselineRepeat, selfARepeat, selfBRepeat),
        candidate: candidateRepeat, baseline: baselineRepeat, selfA: selfARepeat, selfB: selfBRepeat });
    }
    const repeatTiming = timingAttempts[1];
    const timing = { ...firstTiming, verdict: repeatTiming === undefined ? firstTiming.verdict : confirmPerformance(firstTiming.verdict, repeatTiming.verdict),
      reason: repeatTiming === undefined ? firstTiming.reason : `First: ${firstTiming.verdict}; bounded repeat: ${repeatTiming.verdict}. Conflicting verdicts remain inconclusive.` };
    options.onProgress?.(lockIndex + 1, locks.length, lock.id);
    return { id: lock.id, title: lock.title, optimumA: lock.expectedActions, solvers, quality, timing,
      timingAttempts, calibration: { baselineSelfA: selfA, baselineSelfB: selfB },
      historicalReference: { ...lock.historicalReference, timingCompared: false },
      differences: Object.fromEntries(Object.entries(solvers).filter(([name]) => name !== 'candidate').map(([name, other]) => [name, compareMetrics(candidate, other)])) };
  });
  const aggregates = Object.fromEntries(entries.map(([name]) => [name, results.reduce((total, row) => {
    const result = row.solvers[name]; if (result === undefined) throw new Error('Missing solver aggregate.');
    return { A: total.A + result.A, U: total.U + result.U, C: total.C + result.C, plateSwitches: total.plateSwitches + result.plateSwitches,
      sumOfMediansMs: total.sumOfMediansMs + result.timingMs.median };
  }, { A: 0, U: 0, C: 0, plateSwitches: 0, sumOfMediansMs: 0 })]));
  return { schemaVersion: 1, createdAt: new Date().toISOString(),
    config: { repetitions, warmups, lockCount: locks.length, scope: locks.length === 45 ? 'full-45-catalog' : 'subset',
      timingBoundary: 'Only synchronous public solver call; cloning, legacy/reference normalization, replay and metrics excluded.',
      order: 'Per-lock baseline-vs-itself calibration first; matched rounds rotate by lock and round. A non-pass receives one bounded repeat with all raw attempts retained.',
      uncertainty: 'Paired log-ratio mean with conservative 2.776 standard-error envelope; control sets tolerance. >=5 samples; >25% control envelope cannot certify a pass.',
      gc: 'Natural GC; no forced collection.', fixtureSha256: catalogSha256 },
    correctness: { passed: true }, quality: results.some((row) => row.quality.quality === 'regression') ? 'regression' : 'passed',
    performance: combineVerdicts(results.map((row) => row.timing.verdict)),
    implementations: Object.fromEntries(entries.map(([name, implementation]) => [name, implementation.label])), aggregates, results };
}
export type ComparisonReport = ReturnType<typeof runComparison>;
export function renderMarkdown(report: ComparisonReport, metadata: unknown, memory: unknown): string {
  const lines = ['# Gothic Lock Solver benchmark evidence', '', `Scope: **${report.config.scope}**; quality: **${report.quality}**; performance: **${report.performance}**.`, '',
    `Warmups: ${report.config.warmups}; repetitions: ${report.config.repetitions}. A = grouped actions, U = distinct plates, C = unit divisions, S = plate switches.`, '',
    report.config.timingBoundary, report.config.order, report.config.uncertainty, '',
    '| Implementation | A | U | C | S | Sum of per-lock medians (ms) |', '| --- | ---: | ---: | ---: | ---: | ---: |'];
  for (const [name, metrics] of Object.entries(report.aggregates)) lines.push(`| ${name} | ${metrics.A} | ${metrics.U} | ${metrics.C} | ${metrics.plateSwitches} | ${metrics.sumOfMediansMs.toFixed(3)} |`);
  lines.push('', '| Lock | Optimum A | Implementation | A/U/C/S | Median / p95 ms | Quality vs base | Timing vs base |', '| --- | ---: | --- | --- | --- | --- | --- |');
  for (const row of report.results) for (const [name, value] of Object.entries(row.solvers)) lines.push(`| ${row.id} | ${row.optimumA} | ${name} | ${value.A}/${value.U}/${value.C}/${value.plateSwitches} | ${value.timingMs.median.toFixed(3)} / ${value.timingMs.p95.toFixed(3)} | ${name === 'candidate' ? row.quality.quality : ''} | ${name === 'candidate' ? row.timing.verdict : ''} |`);
  lines.push('', '## Per-lock candidate differences', '', '| Lock | Comparator | ΔA / ΔU / ΔC / ΔS |', '| --- | --- | --- |');
  for (const row of report.results) for (const [name, difference] of Object.entries(row.differences)) lines.push(`| ${row.id} | ${name} | ${difference.deltas.A}/${difference.deltas.U}/${difference.deltas.C}/${difference.deltas.plateSwitches} |`);
  lines.push('', '## Isolated process peak RSS', '', 'RSS includes Node, module loading and runtime allocation; it is not exact algorithm heap allocation. Browser peak memory is unavailable. Memory runs are separate from timed calls.', '', '```json', JSON.stringify(memory, null, 2), '```', '',
    '## Environment and source provenance', '', '```json', JSON.stringify(metadata, null, 2), '```', '',
    '## Interpretation', '', 'Every warmup and measured solution is replayed independently one unit division at a time, checked against the stored exact action minimum, input immutability and deterministic paths. Target snapshot changes cannot mask candidate drift: the supplied baseline module must reproduce the supplied baseline snapshot.', '',
    'Historical upstream observations have a different objective (unit divisions, then switches); they are never a substitute for live paired timings. U/C/switches are descriptive and are still strict migration regression gates. Timings describe this Node runtime and machine only. A performance inconclusive verdict does not establish absence of regression. Sum of per-lock medians is not a whole-catalog wall-clock median. Raw samples, paths and calibration envelopes are in benchmark.json.', '');
  return lines.join('\n');
}
export async function publishReport(report: ComparisonReport, outputDir: string, metadata: unknown = {}, memory: unknown = {} ) {
  if (!report.correctness.passed) throw new Error('Correctness gates must pass before publishing.');
  const root = resolve(outputDir); await mkdir(root, { recursive: true });
  const staged = await mkdtemp(join(root, '.benchmark-'));
  const directory = join(root, `run-${report.createdAt.replaceAll(/[^0-9TZ]/g, '')}-${randomUUID().slice(0, 8)}`);
  const full = { ...report, metadata, memory };
  const json = `${JSON.stringify(full, null, 2)}\n`; const markdown = renderMarkdown(report, metadata, memory);
  const metadataRecord = record(metadata);
  const candidateSource = metadataRecord['candidate'] ?? {};
  const qualitySnapshot = { schemaVersion: 1, fixtureSha256: catalogSha256, source: candidateSource,
    reason: 'Measured candidate paths and quality in this immutable benchmark evidence.',
    locks: report.results.map((row) => {
      const value = row.solvers['candidate']; if (value === undefined) throw new Error('Missing candidate quality snapshot.');
      return { id: row.id, optimumA: row.optimumA, A: value.A, U: value.U, C: value.C, plateSwitches: value.plateSwitches, commands: value.commands };
    }) };
  const evidence = { schemaVersion: 1, createdAt: report.createdAt, quality: report.quality, performance: report.performance, qualitySnapshot,
    metadata, memory, config: report.config, aggregates: report.aggregates,
    reports: { json: { path: 'benchmark.json', sha256: sha256(json) }, markdown: { path: 'benchmark.md', sha256: sha256(markdown) } } };
  try {
    await writeFile(join(staged, 'benchmark.json'), json, { flag: 'wx' });
    await writeFile(join(staged, 'benchmark.md'), markdown, { flag: 'wx' });
    await writeFile(join(staged, 'benchmark-evidence.json'), `${JSON.stringify(evidence, null, 2)}\n`, { flag: 'wx' });
    await rename(staged, directory);
  } catch (error) { await rm(staged, { recursive: true, force: true }); throw error; }
  return { directory, jsonPath: join(directory, 'benchmark.json'), markdownPath: join(directory, 'benchmark.md'), evidencePath: join(directory, 'benchmark-evidence.json') };
}
