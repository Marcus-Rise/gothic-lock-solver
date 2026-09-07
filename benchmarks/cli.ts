import { readFileSync, readdirSync, statSync } from 'node:fs';
import os from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { catalogSha256, git, loadCatalog, sha256, upstreamPin, verifySource } from './catalog.ts';
import { loadImplementation, loadUpstream, publishReport, readSnapshot, runComparison, type Implementation, type ModuleFormat } from './harness.ts';
import { collectMemory, type MemorySpec } from './memory.ts';
import { combineVerdicts } from './comparison.ts';
const root = fileURLToPath(new URL('../', import.meta.url));
export type BenchmarkOptions = { candidateModule: string; baselineModule: string; baselineSnapshot: string;
  baselineFormat: ModuleFormat; reference?: string; outputDir: string; warmups: number; repetitions: number;
  memoryRepetitions: number; smoke: boolean; skipMemory: boolean; help: boolean };
export function parseBenchmarkArgs(args: readonly string[], compare = false): BenchmarkOptions {
  const options: BenchmarkOptions = { candidateModule: join(root, 'dist/gothic-lock-solver.mjs'),
    baselineModule: join(root, 'benchmarks/reference-matrix/src/index.mjs'),
    baselineSnapshot: join(root, 'benchmarks/snapshots/reference-matrix.json'), baselineFormat: compare ? 'tuple' : 'legacy',
    outputDir: join(root, 'docs/benchmarks'), warmups: 2, repetitions: 7, memoryRepetitions: 5, smoke: false, skipMemory: false, help: false };
  const seen = new Set<string>();
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index]; if (argument === undefined) throw new Error('Missing argument.');
    if (seen.has(argument)) throw new Error(`Duplicate argument: ${argument}`); seen.add(argument);
    if (argument === '--smoke') { options.smoke = true; continue; }
    if (argument === '--skip-memory') { options.skipMemory = true; continue; }
    if (argument === '--help') { options.help = true; continue; }
    const value = args[++index]; if (value === undefined || value === '' || value.startsWith('--')) throw new Error(`Missing argument value: ${argument}`);
    switch (argument) {
      case '--candidate-module': options.candidateModule = resolve(value); break;
      case '--baseline-module': options.baselineModule = resolve(value); break;
      case '--baseline-snapshot': options.baselineSnapshot = resolve(value); break;
      case '--baseline-format': if (value !== 'tuple' && value !== 'legacy') throw new Error('Baseline format must be tuple or legacy.'); options.baselineFormat = value; break;
      case '--reference': options.reference = resolve(value); break;
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
      default: throw new Error(`Unknown argument: ${argument}`);
    }
  }
  if (compare && !options.help && (!seen.has('--baseline-module') || !seen.has('--baseline-snapshot'))) throw new Error('Comparison requires explicit --baseline-module and --baseline-snapshot from the target branch or previous release.');
  return options;
}
function hashFiles(directory: string, matches: (path: string) => boolean): Record<string, string> {
  const result: Record<string, string> = {};
  const visit = (path: string): void => {
    for (const entry of readdirSync(path, { withFileTypes: true })) {
      const full = join(path, entry.name);
      if (entry.isDirectory()) visit(full);
      else if (entry.isFile() && matches(full)) result[relative(directory, full)] = sha256(readFileSync(full));
    }
  };
  visit(directory); return Object.fromEntries(Object.entries(result).sort(([a], [b]) => a.localeCompare(b)));
}
function revision(directory: string): string | null { try { return git(directory, ['rev-parse', 'HEAD']); } catch { return null; } }
export function collectMetadata(options: BenchmarkOptions) {
  const baselineSnapshot = readSnapshot(options.baselineSnapshot);
  const moduleHash = sha256(readFileSync(options.baselineModule));
  if (baselineSnapshot.source['moduleSha256'] !== moduleHash) throw new Error('Baseline module hash differs from supplied snapshot source.');
  const runtimeFiles = ['gothic-lock-solver.mjs', 'gothic-lock-solver.min.mjs', 'gothic-lock-solver.js', 'gothic-lock-solver.min.js', 'gothic-lock-solver.cli.mjs'];
  const artifacts = Object.fromEntries(runtimeFiles.map((name) => {
    const path = join(root, 'dist', name); return [name, { bytes: statSync(path).size, sha256: sha256(readFileSync(path)) }];
  }));
  return { environment: { node: process.version, v8: process.versions.v8, platform: process.platform, arch: process.arch,
    cpu: os.cpus()[0]?.model ?? 'unknown', logicalCpus: os.cpus().length, osRelease: os.release(), totalMemoryBytes: os.totalmem(), execArgv: process.execArgv },
  source: { revision: revision(root), dirty: git(root, ['status', '--porcelain', '--untracked-files=normal']).length > 0,
    files: hashFiles(join(root, 'src'), (path) => path.endsWith('.ts')), harness: hashFiles(join(root, 'benchmarks'), (path) => path.endsWith('.ts')),
    scripts: hashFiles(join(root, 'scripts'), (path) => /benchmark[^/]*\.ts$/.test(path)) },
  candidate: { revision: revision(dirname(options.candidateModule)), moduleSha256: sha256(readFileSync(options.candidateModule)), format: 'tuple', module: options.candidateModule },
  baseline: { ...baselineSnapshot.source, module: options.baselineModule, moduleTree: hashFiles(dirname(options.baselineModule), (path) => path.endsWith('.mjs') || path.endsWith('.ts')), snapshotSha256: sha256(readFileSync(options.baselineSnapshot)), snapshot: options.baselineSnapshot,
    kind: options.baselineModule.includes('reference-matrix') ? 'reference-baseline' : 'target-branch-or-previous-release' },
  fixtures: { count: 45, catalogSha256, manifestSha256: sha256(readFileSync(new URL('./fixtures/manifest.json', import.meta.url))) },
  originalBfs: verifySource(new URL('./baseline/', import.meta.url)), matrixReference: verifySource(new URL('./reference-matrix/', import.meta.url)),
  upstream: { ...upstreamPin(), measured: options.reference !== undefined, externalCheckout: options.reference ?? null,
    license: 'External AGPL source is hash-verified and executed only from the supplied pinned checkout; no upstream solver code is vendored.' }, artifacts };
}
export async function main(compare: boolean): Promise<void> {
  const options = parseBenchmarkArgs(process.argv.slice(2), compare);
  if (options.help) {
    console.log('Usage: pnpm benchmark [--reference PATH] [--output-dir PATH] [--warmups 2] [--repetitions 7] [--memory-repetitions 5] [--smoke] [--skip-memory]');
    console.log('Compare additionally requires --baseline-module PATH --baseline-snapshot PATH [--baseline-format tuple|legacy]. Candidate defaults to the built ESM; --candidate-module PATH overrides it.');
    return;
  }
  const metadata = collectMetadata(options);
  const candidate = await loadImplementation(options.candidateModule, 'tuple', 'Candidate TypeScript library');
  const baseline = await loadImplementation(options.baselineModule, options.baselineFormat, 'Target/reference baseline');
  const bfsModule = join(root, 'benchmarks/baseline/src/index.mjs');
  const bfs = await loadImplementation(bfsModule, 'legacy', 'Original Apache BFS'); bfs.expectedPath = 'bfs';
  const others: Record<string, Implementation> = { originalBfs: bfs };
  const memorySpecs: MemorySpec[] = [ { name: 'candidate', module: options.candidateModule, format: 'tuple' },
    { name: 'baseline', module: options.baselineModule, format: options.baselineFormat }, { name: 'originalBfs', module: bfsModule, format: 'legacy' } ];
  if (options.reference !== undefined) { others['upstream'] = loadUpstream(options.reference); memorySpecs.push({ name: 'upstream', module: options.reference, format: 'upstream' }); }
  const catalog = loadCatalog(); const locks = options.smoke ? catalog.slice(0, 2) : catalog;
  const report = runComparison({ locks, candidate, baseline, others, baselineSnapshot: readSnapshot(options.baselineSnapshot), repetitions: options.repetitions, warmups: options.warmups,
    onProgress: (completed, total, id) => process.stderr.write(`[${completed}/${total}] ${id}: replay and optimum checked\n`) });
  const memory = options.skipMemory ? { performance: { verdict: 'inconclusive' as const }, available: false, reason: 'Memory explicitly skipped; no memory pass is established.', browser: { available: false } }
    : collectMemory(locks, memorySpecs, options.memoryRepetitions, (line) => process.stderr.write(`${line}\n`));
  report.performance = combineVerdicts([report.performance, memory.performance.verdict]);
  const paths = await publishReport(report, options.outputDir, metadata, memory);
  console.log(JSON.stringify({ ...paths, lockCount: locks.length, quality: report.quality, performance: report.performance }, null, 2));
  // An uncertain result is retained as evidence for explicit review; deterministic failures and confirmed performance regressions fail CI.
  if (report.quality === 'regression' || report.performance === 'regression') process.exitCode = 1;
}
