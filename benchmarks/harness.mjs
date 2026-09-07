import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { mkdir, mkdtemp, rename, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import { join, relative, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';
import { solveLock } from '../src/index.mjs';
import { solveLock as baselineSolveLock } from './baseline/src/index.mjs';
import { loadCatalog, loadManifest, sha256 } from './catalog.mjs';
import { commandMetrics, groupReferenceClicks, replayCommands } from './validation.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const baselineRoot = fileURLToPath(new URL('./baseline/', import.meta.url));

export function statistics(samples) {
  if (!Array.isArray(samples) || samples.length === 0
    || samples.some((sample) => !Number.isFinite(sample) || sample < 0)) {
    throw new Error('Timing samples must be a nonempty array of finite nonnegative numbers.');
  }
  const sorted = [...samples].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return {
    min: sorted[0],
    median: sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2,
    max: sorted.at(-1),
  };
}

function validateCount(value, name, minimum) {
  if (!Number.isSafeInteger(value) || value < minimum) {
    throw new Error(`${name} must be a safe integer >= ${minimum}.`);
  }
}

export function parseBenchmarkArgs(args) {
  const options = { repetitions: 5, warmups: 1, outputDir: 'docs/benchmarks', reference: null, smoke: false, help: false };
  const seen = new Set();
  const fields = { '--repetitions': 'repetitions', '--warmups': 'warmups',
    '--output-dir': 'outputDir', '--reference': 'reference' };
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (seen.has(argument)) throw new Error(`Duplicate argument: ${argument}`);
    seen.add(argument);
    if (argument === '--smoke' || argument === '--help') {
      options[argument.slice(2)] = true;
      continue;
    }
    const field = fields[argument];
    if (!field) throw new Error(`Unknown argument: ${argument}`);
    const value = args[++index];
    if (value === undefined || value.length === 0 || value.startsWith('--')) {
      throw new Error(`Missing argument value: ${argument}`);
    }
    if (field === 'repetitions' || field === 'warmups') {
      if (!/^(0|[1-9][0-9]*)$/.test(value)) throw new Error(`${argument} requires an integer.`);
      options[field] = Number(value);
    } else options[field] = value;
  }
  validateCount(options.repetitions, 'repetitions', 1);
  validateCount(options.warmups, 'warmups', 0);
  return options;
}

function git(directory, args) {
  return execFileSync('git', ['-C', directory, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

export function verifyBaseline() {
  const manifest = JSON.parse(readFileSync(join(baselineRoot, 'manifest.json'), 'utf8'));
  for (const [path, expected] of Object.entries(manifest.files)) {
    if (sha256(readFileSync(join(baselineRoot, path))) !== expected) {
      throw new Error(`Apache baseline source hash mismatch: ${path}`);
    }
  }
  return manifest;
}

export function verifyReferenceSource({ revision, html }, source = loadManifest().source) {
  if (revision !== source.revision) {
    throw new Error(`Reference revision mismatch: expected ${source.revision}, received ${revision}.`);
  }
  if (sha256(html) !== source.solver.sha256) throw new Error('Reference index.html source hash mismatch.');
  const text = Buffer.isBuffer(html) ? html.toString('utf8') : html;
  const start = text.indexOf(source.solver.startMarker);
  const end = text.indexOf(source.solver.endMarker, start);
  if (start < 0 || end < start) throw new Error('Reference solver markers are missing.');
  const block = text.slice(start, end + source.solver.endMarker.length);
  if (sha256(block) !== source.solver.blockSha256) throw new Error('Reference solver block hash mismatch.');
  return block;
}

export function loadReference(directory) {
  const source = loadManifest().source;
  const checkout = resolve(directory);
  let revision;
  try { revision = git(checkout, ['rev-parse', 'HEAD']); } catch {
    throw new Error(`Cannot read reference checkout revision: ${checkout}`);
  }
  const html = readFileSync(join(checkout, source.solver.path));
  const block = verifyReferenceSource({ revision, html }, source);
  // The hash-verified, unchanged upstream block is compiled in this Node realm.
  // This avoids cross-realm Array/typed-array overhead and does not vendor AGPL code.
  const reference = Function(`${block}\n; return solveLock;`)();
  if (typeof reference !== 'function') throw new Error('Reference solveLock function is missing.');
  return {
    implementation: {
      label: 'UnlockMyLoot (live pinned reference)', requiresOptimality: false,
      solve: (definition) => reference(definition.state, definition.links),
      normalize: (sequence) => {
        const commands = groupReferenceClicks(sequence);
        return { status: commands === null ? 'unsolvable' : 'solved', commands };
      },
    },
    metadata: { measured: true, repository: source.repository, revision, path: source.solver.path,
      fileSha256: source.solver.sha256, solverBlockSha256: source.solver.blockSha256,
      execution: 'Unchanged source compiled with Function in the same Node.js realm; no browser or vm context.' },
  };
}

export function defaultImplementations(reference = null) {
  const normalize = (result) => result;
  const implementations = {
    'matrix-astar': { label: 'Matrix A*', solve: (definition) => solveLock(definition, { algorithm: 'matrix-astar' }), normalize, requiresOptimality: true },
    bfs: { label: 'Current exact BFS', solve: (definition) => solveLock(definition, { algorithm: 'bfs' }), normalize, requiresOptimality: true },
    baseline: { label: 'Original Apache BFS', solve: baselineSolveLock, normalize, requiresOptimality: true },
  };
  if (reference) implementations.reference = reference;
  return implementations;
}

function hashTree(directory, predicate = () => true) {
  const files = {};
  function visit(path) {
    for (const entry of readdirSync(path, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const full = join(path, entry.name);
      if (entry.isDirectory()) visit(full);
      else if (entry.isFile() && predicate(full)) files[relative(directory, full)] = sha256(readFileSync(full));
    }
  }
  visit(directory);
  return { sha256: sha256(JSON.stringify(files)), files };
}

export function collectMetadata(referenceMetadata = null) {
  let revision = null; let dirty = null;
  try {
    revision = git(root, ['rev-parse', 'HEAD']);
    dirty = git(root, ['status', '--porcelain', '--untracked-files=normal']).length > 0;
  } catch { /* Source hashes remain available outside a Git checkout. */ }
  const manifest = loadManifest();
  return {
    environment: { node: process.version, v8: process.versions.v8, platform: process.platform,
      arch: process.arch, osRelease: os.release(), cpu: os.cpus()[0]?.model ?? null,
      logicalCpus: os.cpus().length, totalMemoryBytes: os.totalmem(), execArgv: process.execArgv },
    source: { repository: 'https://github.com/Marcus-Rise/gothic-lock-solver', revision,
      dirty, core: hashTree(join(root, 'src'), (path) => path.endsWith('.mjs')),
      harness: { ...hashTree(join(root, 'benchmarks'), (path) => path.endsWith('.mjs')),
        cliSha256: sha256(readFileSync(join(root, 'scripts/benchmark.mjs'))) } },
    fixtures: { count: manifest.count, catalogSha256: manifest.catalogSha256,
      manifestSha256: sha256(readFileSync(new URL('./fixtures/manifest.json', import.meta.url))),
      repository: manifest.source.repository, revision: manifest.source.revision },
    baseline: verifyBaseline(),
    reference: referenceMetadata ?? { measured: false, reason: 'No --reference checkout supplied; cached metrics are not live timings.',
      repository: manifest.source.repository, revision: manifest.source.revision },
  };
}

function assertMetricsEqual(actual, expected, message) {
  for (const field of ['A', 'U', 'C', 'plateSwitches']) {
    assert.equal(actual[field], expected[field], `${message}: ${field}`);
  }
}

function validateResult(lock, name, implementation, result) {
  assert.equal(result?.status, 'solved', `${lock.id}/${name}: expected a solved result.`);
  const finalState = replayCommands(lock.definition, result.commands);
  assert.deepEqual(finalState, lock.definition.state.map(() => 4), `${lock.id}/${name}: target state not reached.`);
  const metrics = commandMetrics(result.commands);
  if (implementation.requiresOptimality) {
    assert.equal(metrics.A, lock.expectedActions, `${lock.id}/${name}: wrong minimum action count.`);
  } else {
    assert.ok(metrics.A >= lock.expectedActions, `${lock.id}/${name}: reference beats the claimed exact minimum.`);
  }
  if (name === 'bfs' || name === 'baseline') {
    assert.deepEqual(result.commands, lock.baselineCommands, `${lock.id}/${name}: original BFS order changed.`);
  }
  if (name === 'reference') {
    assertMetricsEqual(metrics, lock.historicalReference, `${lock.id}: historical reference metric drift`);
    assert.deepEqual(result.commands, lock.historicalReference.commands, `${lock.id}: reference path drift.`);
  }
  if (result.metrics) {
    assert.equal(result.metrics.commands, metrics.A, `${lock.id}/${name}: result action metric mismatch.`);
    assert.equal(result.metrics.divisions, metrics.C, `${lock.id}/${name}: result division metric mismatch.`);
    assert.equal(result.metrics.plateSwitches, metrics.plateSwitches, `${lock.id}/${name}: result switch metric mismatch.`);
  }
  for (const [field, expected] of [['initialState', lock.definition.state], ['targetState', finalState], ['finalState', finalState]]) {
    if (result[field]) assert.deepEqual(result[field], expected, `${lock.id}/${name}: invalid ${field}.`);
  }
  return { ...metrics, commands: structuredClone(result.commands) };
}

function metricComparison(rows, getComparator, field) {
  const result = { wins: 0, ties: 0, losses: 0 };
  for (const row of rows) {
    const matrix = row.solvers['matrix-astar'][field];
    const other = getComparator(row)[field];
    result[matrix < other ? 'wins' : matrix > other ? 'losses' : 'ties'] += 1;
  }
  return result;
}

function summarize(rows, names) {
  const aggregates = {};
  for (const name of names) {
    aggregates[name] = rows.reduce((total, row) => {
      const result = row.solvers[name];
      for (const field of ['A', 'U', 'C']) total[field] += result[field];
      total.sumOfMediansMs += result.timingMs.median;
      return total;
    }, { A: 0, U: 0, C: 0, sumOfMediansMs: 0 });
  }
  const comparisons = {};
  for (const name of [...names.filter((name) => name !== 'matrix-astar'), 'historicalReference']) {
    const historic = name === 'historicalReference';
    const get = (row) => historic ? row.historicalReference : row.solvers[name];
    comparisons[name] = { actions: metricComparison(rows, get, 'A'),
      uniquePlates: metricComparison(rows, get, 'U'), clicks: metricComparison(rows, get, 'C'),
      timingCompared: !historic };
    if (!historic) {
      const values = rows.map((row) => ({ A: row.solvers['matrix-astar'].timingMs.median, B: get(row).timingMs.median }));
      const ratios = values.map(({ A, B }) => A > 0 && B > 0 ? B / A : null);
      comparisons[name].timing = {
        wins: values.filter(({ A, B }) => A < B).length,
        ties: values.filter(({ A, B }) => A === B).length,
        losses: values.filter(({ A, B }) => A > B).length,
        geometricMeanSpeedup: ratios.every((value) => value !== null)
          ? Math.exp(ratios.reduce((sum, value) => sum + Math.log(value), 0) / ratios.length) : null,
        ratioOfSummedMedians: aggregates['matrix-astar'].sumOfMediansMs > 0
          ? aggregates[name].sumOfMediansMs / aggregates['matrix-astar'].sumOfMediansMs : null,
      };
    }
  }
  return { aggregates, comparisons };
}

export function runBenchmark({ locks = loadCatalog(), implementations = defaultImplementations(),
  repetitions = 5, warmups = 1, metadata = {}, clock = () => performance.now(),
  onProgress = null } = {}) {
  validateCount(repetitions, 'repetitions', 1);
  validateCount(warmups, 'warmups', 0);
  if (!Array.isArray(locks) || locks.length === 0) throw new Error('At least one benchmark lock is required.');
  if (new Set(locks.map((lock) => lock.id)).size !== locks.length) throw new Error('Duplicate benchmark lock identifiers.');
  const names = Object.keys(implementations);
  for (const name of ['matrix-astar', 'bfs', 'baseline']) {
    if (!implementations[name]) throw new Error(`Missing benchmark implementation: ${name}`);
  }
  const results = [];
  for (const [lockIndex, lock] of locks.entries()) {
    validateCount(lock.expectedActions, 'expectedActions', 0);
    const historicalMetrics = commandMetrics(lock.historicalReference.commands);
    assertMetricsEqual(historicalMetrics, lock.historicalReference, `${lock.id}: cached historical reference metrics`);
    assert.deepEqual(replayCommands(lock.definition, lock.historicalReference.commands),
      lock.definition.state.map(() => 4), `${lock.id}: cached reference path must reach target.`);
    const baselineMetrics = commandMetrics(lock.baselineCommands);
    assert.equal(baselineMetrics.A, lock.expectedActions, `${lock.id}: cached BFS minimum mismatch.`);
    assert.deepEqual(replayCommands(lock.definition, lock.baselineCommands),
      lock.definition.state.map(() => 4), `${lock.id}: cached baseline path must reach target.`);
    const measured = Object.fromEntries(names.map((name) => [name, { samplesMs: [], solution: null }]));
    for (let round = -warmups; round < repetitions; round += 1) {
      const offset = (lockIndex + round + warmups) % names.length;
      for (let index = 0; index < names.length; index += 1) {
        const name = names[(offset + index) % names.length];
        const implementation = implementations[name];
        const definition = structuredClone(lock.definition);
        const before = JSON.stringify(definition);
        const start = clock();
        const raw = implementation.solve(definition);
        const elapsed = clock() - start;
        assert.equal(JSON.stringify(definition), before, `${lock.id}/${name}: solver mutated its input.`);
        const solution = validateResult(lock, name, implementation, implementation.normalize(raw));
        const entry = measured[name];
        if (entry.solution) assert.deepEqual(solution, entry.solution, `${lock.id}/${name}: nondeterministic solution.`);
        entry.solution = solution;
        if (round >= 0) entry.samplesMs.push(elapsed);
      }
    }
    const solvers = Object.fromEntries(names.map((name) => [name, { ...measured[name].solution,
      timingMs: statistics(measured[name].samplesMs), samplesMs: measured[name].samplesMs }]));
    results.push({ id: lock.id, title: lock.title, plateCount: lock.definition.state.length,
      url: lock.url ?? null, code: lock.code ?? null, expectedActions: lock.expectedActions,
      solvers, historicalReference: structuredClone(lock.historicalReference) });
    if (onProgress) onProgress({ completed: lockIndex + 1, total: locks.length, id: lock.id });
  }
  const inputEvidence = (entries) => JSON.stringify(entries.map(({ id, definition, expectedActions }) => ({ id, definition, expectedActions })));
  const inputs = inputEvidence(locks);
  const completeCatalog = inputs === inputEvidence(loadCatalog());
  return {
    schemaVersion: 1, createdAt: new Date().toISOString(),
    config: { repetitions, warmups, lockCount: locks.length, scope: completeCatalog ? 'full-45-catalog' : 'subset',
      inputSha256: sha256(inputs),
      units: 'milliseconds', executionOrder: 'Per lock, warmup and measured rounds rotate solver order deterministically.',
      timingBoundary: 'Only the synchronous solver call is timed. Input cloning, reference click grouping, replay, metrics, and reporting are outside timing. Current and baseline calls include their public facade validation/result construction.',
      gc: 'Natural Node.js garbage collection; no forced GC.' },
    metadata, implementations: Object.fromEntries(names.map((name) => [name, { label: implementations[name].label,
      requiresOptimality: implementations[name].requiresOptimality }])),
    correctness: { passed: true, lockCount: locks.length, checks: [
      'Every warmup and measured solution independently replayed one division at a time.',
      'Matrix A*, exact BFS, and original Apache BFS equal the stored exact action minimum.',
      'Current BFS preserves the pinned original BFS command sequence.',
      'Inputs are unchanged and every implementation returns a deterministic path.',
      names.includes('reference') ? 'Live reference path and A/U/C equal the cached pinned observation.'
        : 'Cached reference paths and metrics are validated; reference was not timed.',
    ] },
    ...summarize(results, names), results,
    limitations: [
      'These are 45 fixed catalog configurations, not a random sample or a claim about every game state.',
      'Only actions (A) are minimized by the production solver; distinct plates (U) and unit divisions (C) are descriptive metrics.',
      'The reference minimizes unit divisions before plate switches; its objective differs from minimum grouped actions.',
      'Timing reflects this runtime, machine, sample count, JIT and garbage collection; no timing threshold is a correctness gate.',
      'These are Node.js timings, not measurements in an actual browser or Web Worker.',
      'Cached historical timings are provenance only and are excluded from current speed comparisons.',
      'The sum of per-lock medians is an aggregate of medians, not the median runtime of a whole-catalog pass.',
      'Speedup ratios above 1 favor matrix A*; ratios below 1 favor the comparator. Timing ties require equal measured medians.',
    ],
  };
}

const cell = (value) => String(value ?? '—').replaceAll('|', '\\|').replaceAll('\n', ' ');
const number = (value) => value === null || value === undefined ? '—' : value.toFixed(6);
const counts = (value) => `${value.wins}/${value.ties}/${value.losses}`;

export function renderMarkdown(report) {
  const names = Object.keys(report.implementations);
  const lines = ['# Matrix search benchmark', '',
    `Generated: ${report.createdAt}. Scope: **${report.config.scope}** (${report.config.lockCount} locks).`, '',
    `Correctness gates: **${report.correctness.passed ? 'PASS' : 'FAIL'}**. Warmups per solver/lock: ${report.config.warmups}; measured repetitions: ${report.config.repetitions}.`, '',
    'A = actions (grouped commands); U = unique selected plates; C = unit divisions of the selected plate. All timings are milliseconds.', '',
    report.config.timingBoundary, '', report.config.executionOrder, '',
    `GC: ${report.config.gc}`, '', '## Runtime and source evidence', '',
    '```json', JSON.stringify(report.metadata, null, 2), '```', '',
    '## Totals across measured locks', '',
    '| Solver | A | U | C | Sum of per-lock median ms |',
    '| --- | ---: | ---: | ---: | ---: |'];
  for (const name of names) {
    const value = report.aggregates[name];
    lines.push(`| ${cell(report.implementations[name].label)} | ${value.A} | ${value.U} | ${value.C} | ${number(value.sumOfMediansMs)} |`);
  }
  lines.push('', '## Matrix A* comparisons', '',
    'Wins/ties/losses count locks where matrix A* is lower/equal/higher. A ratio above 1 favors matrix A*.', '',
    '| Comparator | A wins/ties/losses | U wins/ties/losses | C wins/ties/losses | Time wins/ties/losses | Geometric mean speedup | Ratio of summed medians |',
    '| --- | --- | --- | --- | --- | ---: | ---: |');
  for (const [name, value] of Object.entries(report.comparisons)) {
    lines.push(`| ${cell(report.implementations[name]?.label ?? 'Reference (cached metrics only)')} | ${counts(value.actions)} | ${counts(value.uniquePlates)} | ${counts(value.clicks)} | ${value.timingCompared ? counts(value.timing) : 'not timed'} | ${number(value.timing?.geometricMeanSpeedup)} | ${number(value.timing?.ratioOfSummedMedians)} |`);
  }
  lines.push('', '## Per-lock action metrics', '',
    `| Lock | N | Exact minimum A | ${names.map((name) => `${cell(report.implementations[name].label)} A/U/C`).join(' | ')} | Cached reference A/U/C |`,
    `| --- | ---: | ---: | ${names.map(() => '---').join(' | ')} | --- |`);
  for (const row of report.results) {
    const metrics = (result) => `${result.A}/${result.U}/${result.C}`;
    lines.push(`| ${cell(row.title)} (${row.id}) | ${row.plateCount} | ${row.expectedActions} | ${names.map((name) => metrics(row.solvers[name])).join(' | ')} | ${metrics(row.historicalReference)} |`);
  }
  lines.push('', '## Per-lock live timings (min / median / max ms)', '',
    `| Lock | ${names.map((name) => cell(report.implementations[name].label)).join(' | ')} |`,
    `| --- | ${names.map(() => '---').join(' | ')} |`);
  for (const row of report.results) {
    lines.push(`| ${cell(row.title)} (${row.id}) | ${names.map((name) => {
      const timing = row.solvers[name].timingMs;
      return `${number(timing.min)} / ${number(timing.median)} / ${number(timing.max)}`;
    }).join(' | ')} |`);
  }
  lines.push('', '## Correctness checks', '', ...report.correctness.checks.map((value) => `- ${value}`), '',
    '## Limits of the conclusions', '', ...report.limitations.map((value) => `- ${value}`), '',
    'The JSON report includes individual samples and independently verified command sequences. Cached observations never supply values to the live timing table.', '');
  return lines.join('\n');
}

export async function publishReport(report, outputDir) {
  if (report?.correctness?.passed !== true) throw new Error('A report cannot be published before correctness gates pass.');
  // Render both artifacts before touching disk; publish the directory with one same-filesystem rename.
  const json = `${JSON.stringify(report, null, 2)}\n`;
  const markdown = renderMarkdown(report);
  const outputRoot = resolve(outputDir);
  await mkdir(outputRoot, { recursive: true });
  const staged = await mkdtemp(join(outputRoot, '.benchmark-'));
  const directory = join(outputRoot, `run-${report.createdAt.replaceAll(/[^0-9TZ]/g, '')}-${randomUUID().slice(0, 8)}`);
  try {
    await writeFile(join(staged, 'benchmark.json'), json, { flag: 'wx' });
    await writeFile(join(staged, 'benchmark.md'), markdown, { flag: 'wx' });
    await rename(staged, directory);
  } catch (error) {
    await rm(staged, { recursive: true, force: true });
    throw error;
  }
  return { directory, jsonPath: join(directory, 'benchmark.json'), markdownPath: join(directory, 'benchmark.md') };
}

export async function runAndPublish({ outputDir, ...options }) {
  const report = runBenchmark(options);
  return { report, ...await publishReport(report, outputDir) };
}
