import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadCatalog, loadManifest, sha256 } from '../benchmarks/catalog.mjs';
import { commandMetrics, groupReferenceClicks, replayCommands } from '../benchmarks/validation.mjs';
import {
  parseBenchmarkArgs, statistics, renderMarkdown, runBenchmark,
  publishReport, runAndPublish, verifyReferenceSource, verifyBaseline,
} from '../benchmarks/harness.mjs';

const definition = { state: [3, 4], links: [[0, 0], [0, 0]] };
const commands = [{ plate: 1, direction: 'left', steps: 1 }];
const lock = {
  id: 'test-lock', title: 'Test lock', definition, expectedActions: 1,
  baselineCommands: commands,
  historicalReference: {
    kind: 'cached-observation', A: 1, U: 1, C: 1, plateSwitches: 0, commands,
  },
};
const makeSolver = (solve = () => ({ status: 'solved', commands })) => ({
  label: 'Test solver', solve, normalize: (result) => result, requiresOptimality: true,
});
const implementations = () => Object.fromEntries(
  ['matrix-astar', 'bfs', 'baseline'].map((name) => [name, makeSolver()]),
);
const options = () => ({
  locks: [structuredClone(lock)], implementations: implementations(),
  repetitions: 2, warmups: 1, metadata: { test: true }, clock: (() => {
    let current = 0; return () => current++;
  })(),
});

test('timing statistics sort a copy and compute even/odd medians', () => {
  const samples = [9, 1, 5, 3];
  assert.deepEqual(statistics(samples), { min: 1, median: 4, max: 9 });
  assert.deepEqual(samples, [9, 1, 5, 3]);
  assert.deepEqual(statistics([6]), { min: 6, median: 6, max: 6 });
  assert.deepEqual(statistics([3, 1, 2]), { min: 1, median: 2, max: 3 });
  for (const invalid of [[], [-1], [NaN], [Infinity]]) {
    assert.throws(() => statistics(invalid), /sample/i);
  }
});

test('CLI accepts reproducible settings and rejects malformed arguments', () => {
  const parsed = parseBenchmarkArgs(['--repetitions', '3', '--warmups', '0',
    '--output-dir', 'somewhere', '--reference', '/source', '--smoke']);
  assert.equal(parsed.repetitions, 3);
  assert.equal(parsed.warmups, 0);
  assert.equal(parsed.outputDir, 'somewhere');
  assert.equal(parsed.reference, '/source');
  assert.equal(parsed.smoke, true);
  assert.equal(parseBenchmarkArgs([]).repetitions, 5);
  for (const args of [['--repetitions', '0'], ['--warmups', '-1'],
    ['--repetitions', '1.5'], ['--repetitions', '01'], ['--reference'],
    ['--mystery'], ['--warmups', '1', '--warmups', '2']]) {
    assert.throws(() => parseBenchmarkArgs(args), /argument|integer|duplicate|missing/i);
  }
});

test('independent replay catches blocked intermediate clicks and invalid commands', () => {
  assert.deepEqual(replayCommands(definition, commands), [4, 4]);
  const start = { state: [6, 6], links: [[0, 1], [0, 0]] };
  assert.throws(() => replayCommands(start, [{ plate: 1, direction: 'left', steps: 2 }]), /blocked/i);
  assert.deepEqual(start.state, [6, 6]);
  for (const invalid of [{ plate: 0, direction: 'left', steps: 1 },
    { plate: 1, direction: 'up', steps: 1 }, { plate: 1, direction: 'left', steps: 7 },
    { plate: 1, direction: 'left', steps: 0 }]) {
    assert.throws(() => replayCommands(definition, [invalid]), /command/i);
  }
  assert.deepEqual(commandMetrics([
    ...commands, { plate: 2, direction: 'right', steps: 2 }, ...commands,
  ]), { A: 3, U: 2, C: 4, plateSwitches: 2 });
});

test('reference click grouping preserves direction changes and checks input', () => {
  assert.deepEqual(groupReferenceClicks([{ plate: 0, d: 1 }, { plate: 0, d: 1 },
    { plate: 0, d: -1 }, { plate: 1, d: -1 }]), [
    { plate: 1, direction: 'left', steps: 2 },
    { plate: 1, direction: 'right', steps: 1 },
    { plate: 2, direction: 'right', steps: 1 },
  ]);
  assert.equal(groupReferenceClicks(null), null);
  assert.throws(() => groupReferenceClicks([{ plate: 0, d: 2 }]), /reference/i);
});

test('pinned catalog data and unmodified Apache baseline hashes verify', () => {
  assert.equal(loadCatalog().length, 45);
  assert.equal(verifyBaseline().revision, 'a87e739a22ccc4215d6d9b14fa06b0738171cb60');
  const source = loadManifest().source;
  assert.throws(() => verifyReferenceSource({ revision: 'wrong', html: '' }, source), /revision/i);
  assert.throws(() => verifyReferenceSource({ revision: source.revision, html: 'modified' }, source), /hash/i);
  const block = '/* solver-start */ function solveLock() { return []; } /* solver-end */';
  const html = `<script>${block}</script>`;
  const syntheticSource = { revision: 'synthetic', solver: {
    sha256: sha256(html), blockSha256: sha256(block),
    startMarker: '/* solver-start', endMarker: '/* solver-end */',
  } };
  assert.equal(verifyReferenceSource({ revision: 'synthetic', html }, syntheticSource), block);
  assert.throws(() => verifyReferenceSource({ revision: 'synthetic', html }, {
    ...syntheticSource, solver: { ...syntheticSource.solver, blockSha256: 'wrong' },
  }), /block hash/i);
});

test('benchmark records samples, counts, scope, and separates cached reference observations', () => {
  const report = runBenchmark(options());
  assert.equal(report.correctness.passed, true);
  assert.equal(report.config.lockCount, 1);
  assert.equal(report.config.scope, 'subset');
  assert.match(report.config.inputSha256, /^[0-9a-f]{64}$/);
  assert.equal(report.results[0].solvers['matrix-astar'].A, 1);
  assert.deepEqual(report.results[0].solvers.bfs.timingMs, { min: 1, median: 1, max: 1 });
  assert.deepEqual(report.results[0].solvers.bfs.samplesMs, [1, 1]);
  assert.equal(report.results[0].historicalReference.kind, 'cached-observation');
  assert.equal(report.comparisons.historicalReference.timingCompared, false);
  assert.equal(report.comparisons.bfs.actions.ties, 1);
  const markdown = renderMarkdown(report);
  assert.match(markdown, /A = actions/);
  assert.match(markdown, /cached/i);
  assert.match(markdown, /Test lock/);
  assert.match(markdown, /subset/i);
});

test('timing comparisons and speedup ratios follow measured evidence in both directions', () => {
  for (const matrixElapsed of [1, 2, 4]) {
    let time = 0;
    const setup = options(); setup.warmups = 0; setup.clock = () => time;
    for (const [name, implementation] of Object.entries(setup.implementations)) {
      implementation.solve = () => {
        time += name === 'matrix-astar' ? matrixElapsed : 2;
        return { status: 'solved', commands };
      };
    }
    const result = runBenchmark(setup).comparisons.bfs.timing;
    assert.equal(result[matrixElapsed < 2 ? 'wins' : matrixElapsed > 2 ? 'losses' : 'ties'], 1);
    assert.equal(result.geometricMeanSpeedup, 2 / matrixElapsed);
    assert.equal(result.ratioOfSummedMedians, 2 / matrixElapsed);
  }
});

test('benchmark validates warmups and every measured solution outside timing', () => {
  for (const failAt of [1, 2, 3]) {
    const setup = options(); let calls = 0;
    setup.implementations['matrix-astar'] = makeSolver(() => {
      calls += 1;
      return calls === failAt ? { status: 'solved', commands: [] } : { status: 'solved', commands };
    });
    assert.throws(() => runBenchmark(setup), /target|minimum/i);
  }
});

test('benchmark rejects wrong optimum, mutation, nondeterminism, and reference metric drift', () => {
  const wrongMinimum = options(); wrongMinimum.locks[0].expectedActions = 2;
  assert.throws(() => runBenchmark(wrongMinimum), /minimum/i);
  const mutation = options();
  mutation.implementations.bfs = makeSolver((value) => {
    value.links[1][0] = 1; return { status: 'solved', commands };
  });
  assert.throws(() => runBenchmark(mutation), /mutat/i);
  const drift = options();
  drift.implementations.reference = { ...makeSolver(), requiresOptimality: false };
  drift.locks[0].historicalReference.C = 2;
  assert.throws(() => runBenchmark(drift), /reference|historical/i);
  const changedPath = options(); let calls = 0;
  changedPath.implementations.reference = { ...makeSolver(() => {
    calls += 1;
    return { status: 'solved', commands: calls === 1 ? commands : [
      { plate: 1, direction: 'left', steps: 2 },
      { plate: 1, direction: 'right', steps: 1 },
    ] };
  }), requiresOptimality: false };
  assert.throws(() => runBenchmark(changedPath), /determin|reference/i);
});

test('report pair is published together; correctness failure leaves existing evidence intact', async () => {
  const root = await mkdtemp(join(tmpdir(), 'lock-benchmark-'));
  try {
    await writeFile(join(root, 'existing.txt'), 'keep');
    const paths = await publishReport(runBenchmark(options()), root);
    assert.equal(JSON.parse(await readFile(paths.jsonPath, 'utf8')).correctness.passed, true);
    assert.match(await readFile(paths.markdownPath, 'utf8'), /Test lock/);
    assert.deepEqual((await readdir(paths.directory)).sort(), ['benchmark.json', 'benchmark.md']);
    const before = (await readdir(root)).sort();
    const bad = options(); bad.locks[0].expectedActions = 99;
    await assert.rejects(runAndPublish({ ...bad, outputDir: root }), /minimum/i);
    assert.deepEqual((await readdir(root)).sort(), before);
    assert.equal(await readFile(join(root, 'existing.txt'), 'utf8'), 'keep');
    await assert.rejects(publishReport({ correctness: { passed: false } }, root), /correctness/i);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
