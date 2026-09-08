import { readFileSync } from 'node:fs';
import os from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertArtifactOutput, git, jsonFile, sha256 } from './catalog.ts';
import {
  createReport,
  loadImplementation,
  publishReport,
  readReport,
  runBenchmark,
  type Environment,
  type Settings,
  type Source,
} from './harness.ts';
import { collectMemory } from './memory.ts';
import { record } from './validation.ts';

const root = fileURLToPath(new URL('../../', import.meta.url));
const modulePath = join(root, 'dist/gothic-lock-solver.mjs');
export type BenchmarkOptions = Settings & {
  baselineReport?: string;
  baselineSha?: string;
  outputDir: string;
  help: boolean;
};
export function parseBenchmarkArgs(args: readonly string[]): BenchmarkOptions {
  const options: BenchmarkOptions = {
    outputDir: join(root, 'artifacts/benchmark'),
    warmups: 2,
    repetitions: 7,
    memoryRepetitions: 3,
    help: false,
  };
  const seen = new Set<string>();
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === undefined) {
      throw new Error('Missing argument.');
    }
    if (seen.has(argument)) {
      throw new Error(`Duplicate argument: ${argument}`);
    }
    seen.add(argument);
    if (argument === '--help') {
      options.help = true;
      continue;
    }
    if (!['--baseline-report', '--baseline-sha', '--output-dir', '--warmups', '--repetitions', '--memory-repetitions'].includes(argument)) {
      throw new Error(`Unknown argument: ${argument}`);
    }
    const value = args[++index];
    if (value === undefined || value === '' || value.startsWith('--')) {
      throw new Error(`Missing argument value: ${argument}`);
    }
    switch (argument) {
      case '--baseline-report':
        options.baselineReport = resolve(value);
        break;
      case '--baseline-sha':
        if (!/^[a-f0-9]{40}$/.test(value)) {
          throw new Error('Baseline SHA must be an exact 40-character source SHA.');
        }
        options.baselineSha = value;
        break;
      case '--output-dir':
        options.outputDir = resolve(value);
        break;
      case '--warmups':
      case '--repetitions':
      case '--memory-repetitions': {
        if (!/^(0|[1-9][0-9]*)$/.test(value)) {
          throw new Error('Expected a nonnegative integer.');
        }
        const count = Number(value);
        const minimum = argument === '--warmups' ? 0 : 1;
        if (!Number.isSafeInteger(count) || count < minimum) {
          throw new Error('Invalid repetition/warmup integer.');
        }
        if (argument === '--warmups') {
          options.warmups = count;
        } else if (argument === '--repetitions') {
          options.repetitions = count;
        } else {
          options.memoryRepetitions = count;
        }
        break;
      }
    }
  }
  if (options.baselineReport !== undefined && options.baselineSha === undefined) {
    throw new Error('A provided baseline report requires --baseline-sha for the exact target revision.');
  }
  return options;
}

export { assertArtifactOutput } from './catalog.ts';
export function collectSource(): Source {
  const revision = git(root, ['rev-parse', 'HEAD']);
  const moduleSha256 = sha256(readFileSync(modulePath));
  const manifest = record(jsonFile(join(root, 'dist/manifest.json')), 'build manifest');
  if (manifest['sourceSha'] !== revision || record(manifest['files'], 'build files')['gothic-lock-solver.mjs'] !== moduleSha256) {
    throw new Error('Built solver manifest does not match the current source SHA and module checksum; run pnpm build.');
  }
  return {
    revision,
    moduleSha256,
    dirty: git(root, ['status', '--porcelain', '--untracked-files=normal']).length > 0,
  };
}

function collectEnvironment(): Environment {
  return {
    node: process.version,
    v8: process.versions.v8,
    platform: process.platform,
    arch: process.arch,
    cpu: os.cpus()[0]?.model ?? 'unknown',
    logicalCpus: os.cpus().length,
    osRelease: os.release(),
    totalMemoryBytes: os.totalmem(),
  };
}

export async function main(): Promise<void> {
  const options = parseBenchmarkArgs(process.argv.slice(2));
  if (options.help) {
    console.log([
      'Usage: pnpm benchmark [--baseline-report PATH --baseline-sha SHA]',
      '[--output-dir artifacts/benchmark] [--warmups 2]',
      '[--repetitions 7] [--memory-repetitions 3]',
    ].join(' '));
    console.log([
      'Measures the current built ESM on all 45 fixed locks.',
      'Only a saved report for the exact target SHA is compared;',
      'without one the comparison is explicitly skipped.',
    ].join(' '));
    return;
  }
  assertArtifactOutput(options.outputDir);
  const baseline = options.baselineReport === undefined ? undefined : readReport(options.baselineReport, options.baselineSha);
  if (baseline !== undefined && baseline.quality !== 'passed') {
    throw new Error('Saved baseline report quality must pass.');
  }
  const source = collectSource();
  const environment = collectEnvironment();
  const solve = await loadImplementation(modulePath);
  const results = runBenchmark({
    solve,
    warmups: options.warmups,
    repetitions: options.repetitions,
    onProgress: (completed, total, id) => {
      process.stderr.write(`[${completed}/${total}] ${id}: replay and optimum checked\n`);
    },
  });
  const memory = collectMemory(modulePath, options.memoryRepetitions, (line) => process.stderr.write(`${line}\n`));
  if (sha256(readFileSync(modulePath)) !== source.moduleSha256 || git(root, ['rev-parse', 'HEAD']) !== source.revision) {
    throw new Error('Current solver source or module changed during measurement.');
  }
  const settings = {
    warmups: options.warmups,
    repetitions: options.repetitions,
    memoryRepetitions: options.memoryRepetitions,
  };
  const report = createReport({
    source,
    environment,
    settings,
    results,
    memory,
    ...(baseline === undefined ? {} : { baseline }),
  });
  if (report.comparison.status === 'skipped' && options.baselineSha !== undefined) {
    report.comparison.reason = `No saved benchmark report is available for exact target SHA ${options.baselineSha}.`;
  }
  const paths = await publishReport(report, options.outputDir);
  console.log(JSON.stringify({
    ...paths,
    lockCount: report.fixtures.count,
    quality: report.quality,
    comparison: report.comparison.status,
  }, null, 2));
  if (report.quality === 'regression') {
    process.exitCode = 1;
  }
}
