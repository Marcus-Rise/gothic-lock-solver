import { readFileSync, statSync } from 'node:fs';
import os from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertArtifactOutput, catalogSha256, git, loadCatalog, sha256 } from './catalog.ts';
import { loadImplementation, publishReport, readSnapshot, runComparison, type ModuleFormat, type Snapshot } from './harness.ts';
import { collectMemory, type MemorySpec } from './memory.ts';
import { combineVerdicts } from './comparison.ts';
import { generateSnapshot } from './snapshot.ts';
import { hashFiles, inspectComparisonBaseline, inspectSource, revision } from './source.ts';

const root = fileURLToPath(new URL('../../', import.meta.url));
export type BenchmarkOptions = { candidateModule: string; baselineModule: string; baselineSnapshot?: string;
  baselineFormat: ModuleFormat; outputDir: string; warmups: number; repetitions: number;
  memoryRepetitions: number; smoke: boolean; skipMemory: boolean; help: boolean };
export function parseBenchmarkArgs(args: readonly string[]): BenchmarkOptions {
  const options: BenchmarkOptions = { candidateModule: join(root, 'dist/gothic-lock-solver.mjs'), baselineModule: '', baselineFormat: 'tuple',
    outputDir: join(root, 'artifacts/benchmark'), warmups: 2, repetitions: 7, memoryRepetitions: 5, smoke: false, skipMemory: false, help: false };
  const valued = ['--candidate-module', '--baseline-module', '--baseline-snapshot', '--baseline-format', '--output-dir', '--warmups', '--repetitions', '--memory-repetitions'];
  const seen = new Set<string>();
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index]; if (argument === undefined) throw new Error('Missing argument.');
    if (seen.has(argument)) throw new Error(`Duplicate argument: ${argument}`); seen.add(argument);
    if (argument === '--smoke') { options.smoke = true; continue; }
    if (argument === '--skip-memory') { options.skipMemory = true; continue; }
    if (argument === '--help') { options.help = true; continue; }
    if (!valued.includes(argument)) throw new Error(`Unknown argument: ${argument}`);
    const value = args[++index]; if (value === undefined || value === '' || value.startsWith('--')) throw new Error(`Missing argument value: ${argument}`);
    switch (argument) {
      case '--candidate-module': options.candidateModule = resolve(value); break;
      case '--baseline-module': options.baselineModule = resolve(value); break;
      case '--baseline-snapshot': options.baselineSnapshot = resolve(value); break;
      case '--baseline-format': if (value !== 'tuple' && value !== 'legacy') throw new Error('Baseline format must be tuple or legacy.'); options.baselineFormat = value; break;
      case '--output-dir': options.outputDir = resolve(value); break;
      case '--warmups': case '--repetitions': case '--memory-repetitions': {
        if (!/^(0|[1-9][0-9]*)$/.test(value)) throw new Error('Expected a nonnegative integer.');
        const count = Number(value); const minimum = argument === '--warmups' ? 0 : 1;
        if (!Number.isSafeInteger(count) || count < minimum) throw new Error('Invalid repetition/warmup integer.');
        if (argument === '--warmups') options.warmups = count;
        else if (argument === '--repetitions') options.repetitions = count;
        else options.memoryRepetitions = count;
        break;
      }
    }
  }
  if (!options.help && !seen.has('--baseline-module')) throw new Error('Benchmark requires explicit --baseline-module from an own target checkout or verified previous release.');
  return options;
}
export { assertArtifactOutput } from './catalog.ts';
export function collectMetadata(options: BenchmarkOptions, baselineSnapshot: Snapshot) {
  const baselineSource = inspectComparisonBaseline(options.candidateModule, options.baselineModule, options.baselineFormat, baselineSnapshot.source);
  const runtimeFiles = ['gothic-lock-solver.mjs', 'gothic-lock-solver.min.mjs', 'gothic-lock-solver.js', 'gothic-lock-solver.min.js', 'gothic-lock-solver.cli.mjs'];
  const artifacts = Object.fromEntries(runtimeFiles.map((name) => {
    const path = join(root, 'dist', name); return [name, { bytes: statSync(path).size, sha256: sha256(readFileSync(path)) }];
  }));
  return { environment: { node: process.version, v8: process.versions.v8, platform: process.platform, arch: process.arch,
    cpu: os.cpus()[0]?.model ?? 'unknown', logicalCpus: os.cpus().length, osRelease: os.release(), totalMemoryBytes: os.totalmem(), execArgv: process.execArgv },
  source: { revision: revision(root), dirty: git(root, ['status', '--porcelain', '--untracked-files=normal']).length > 0,
    files: hashFiles(join(root, 'src'), (path) => path.endsWith('.ts')), harness: hashFiles(join(root, 'tests/benchmarks'), (path) => path.endsWith('.ts')) },
  candidate: { revision: revision(dirname(options.candidateModule)), moduleSha256: sha256(readFileSync(options.candidateModule)), format: 'tuple', module: options.candidateModule },
  baseline: { ...baselineSource, module: options.baselineModule,
    snapshotSha256: sha256(`${JSON.stringify(baselineSnapshot, null, 2)}\n`), snapshot: options.baselineSnapshot ?? 'baseline-snapshot.json', kind: baselineSource['kind'] ?? 'own-target-checkout' },
  fixtures: { count: 45, catalogSha256 }, artifacts };
}
export async function main(): Promise<void> {
  const options = parseBenchmarkArgs(process.argv.slice(2));
  if (options.help) {
    console.log('Usage: pnpm benchmark --baseline-module PATH [--baseline-format tuple|legacy] [--baseline-snapshot PATH] [--output-dir artifacts/benchmark] [--warmups 2] [--repetitions 7] [--memory-repetitions 5] [--smoke] [--skip-memory]');
    console.log('The baseline snapshot is generated from the supplied own checkout when omitted. A verified previous release supplies its module and snapshot. Candidate defaults to the built ESM; --candidate-module PATH overrides it.');
    return;
  }
  assertArtifactOutput(options.outputDir);
  const stored = options.baselineSnapshot === undefined ? undefined : readSnapshot(options.baselineSnapshot);
  inspectComparisonBaseline(options.candidateModule, options.baselineModule, options.baselineFormat, stored?.source);
  const snapshot = stored ?? await generateSnapshot(options.baselineModule, options.baselineFormat, 'Fresh execution of the supplied own baseline on the fixed inputs.');
  const metadata = collectMetadata(options, snapshot);
  const candidate = await loadImplementation(options.candidateModule, 'tuple', 'Candidate TypeScript library');
  const baseline = await loadImplementation(options.baselineModule, options.baselineFormat, 'Own target or preceding-release baseline');
  const memorySpecs: MemorySpec[] = [ { name: 'candidate', module: options.candidateModule, format: 'tuple' },
    { name: 'baseline', module: options.baselineModule, format: options.baselineFormat } ];
  const catalog = loadCatalog(); const locks = options.smoke ? catalog.slice(0, 2) : catalog;
  const report = runComparison({ locks, candidate, baseline, baselineSnapshot: snapshot, repetitions: options.repetitions, warmups: options.warmups,
    onProgress: (completed, total, id) => process.stderr.write(`[${completed}/${total}] ${id}: replay and optimum checked\n`) });
  const memory = options.skipMemory ? { performance: { verdict: 'inconclusive' as const }, available: false, reason: 'Memory explicitly skipped; no memory pass is established.', browser: { available: false } }
    : collectMemory(locks, memorySpecs, options.memoryRepetitions, (line) => process.stderr.write(`${line}\n`));
  inspectSource(options.baselineModule, options.baselineFormat, snapshot.source);
  if (sha256(readFileSync(options.candidateModule)) !== metadata.candidate.moduleSha256) throw new Error('Candidate source changed during measurement.');
  report.performance = combineVerdicts([report.performance, memory.performance.verdict]);
  const paths = await publishReport(report, options.outputDir, metadata, memory, snapshot);
  console.log(JSON.stringify({ ...paths, lockCount: locks.length, quality: report.quality, performance: report.performance }, null, 2));
  // Uncertain observations remain evidence for review; deterministic failures and confirmed regressions fail CI.
  if (report.quality === 'regression' || report.performance === 'regression') process.exitCode = 1;
}
