import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { prepareArchive, prepareRelease, checkRelease } from '../../.github/scripts/release.ts';
import { createReport, loadImplementation, runBenchmark, type BenchmarkReport } from '../benchmarks/harness.ts';
import { statistics } from '../benchmarks/comparison.ts';

const sourceSha = 'a'.repeat(40);
const canary = '1.2.3-canary.123.2.aaaaaaaaaaaa';
const names = ['gothic-lock-solver.mjs', 'gothic-lock-solver.min.mjs', 'gothic-lock-solver.js', 'gothic-lock-solver.min.js', 'gothic-lock-solver.cli.mjs', 'index.d.ts'];
const bytes = 'export const tested = true;\n';
const digest = createHash('sha256').update(bytes).digest('hex');
let report: BenchmarkReport;
beforeAll(async () => {
  const solve = await loadImplementation(new URL('../../src/index.ts', import.meta.url).pathname);
  report = createReport({ source: { revision: sourceSha, dirty: false, moduleSha256: digest },
    environment: { node: process.version, v8: process.versions.v8, platform: process.platform, arch: process.arch, cpu: 'test', logicalCpus: 1, osRelease: 'test', totalMemoryBytes: 1024 },
    settings: { warmups: 0, repetitions: 1, memoryRepetitions: 1 }, results: runBenchmark({ solve, warmups: 0, repetitions: 1 }),
    memory: { metric: 'linux-proc-VmHWM', limitations: 'Whole process RSS', browser: { available: false, reason: 'Unavailable' },
      samples: [{ peakRssBytes: 20, startupRssBytes: 10, loadedRssBytes: 12, lockCount: 45, peakRssMetric: 'linux-proc-VmHWM', startupPeakRssBytes: 10,
        loadedPeakRssBytes: 12, resourceUsageMaxRssBytes: 30, startupResourceUsageMaxRssBytes: 30, resourceUsageLaunchFloorDetected: true }], peakRssBytes: statistics([20]) } });
});

async function fixture(options: { version?: string; brokenHash?: boolean } = {}) {
  const root = await mkdtemp(join(tmpdir(), 'gothic-release-'));
  const packed = join(root, 'package');
  await mkdir(join(packed, 'dist'), { recursive: true });
  await writeFile(join(packed, 'package.json'), JSON.stringify({ name: 'gothic-lock-solver', version: options.version ?? '1.2.3', files: ['dist'],
    scripts: { prepack: 'exit 91', prepare: 'exit 92', postpack: 'exit 93' } }));
  await writeFile(join(packed, 'README.md'), 'Tested package documentation\n');
  await writeFile(join(packed, 'LICENSE'), 'Tested license\n');
  for (const name of names) await writeFile(join(packed, 'dist', name), bytes);
  await writeFile(join(packed, 'dist/manifest.json'), JSON.stringify({ schemaVersion: 1, package: 'gothic-lock-solver', version: options.version ?? '1.2.3', sourceSha,
    files: Object.fromEntries(names.map(name => [name, options.brokenHash ? '0'.repeat(64) : digest])) }));
  const input = join(root, 'tested.tgz');
  execFileSync('tar', ['-czf', input, '-C', root, 'package']);
  await copyFile(input, join(root, 'package.tgz'));
  await writeFile(join(root, 'benchmark.json'), JSON.stringify(report));
  await writeFile(join(root, 'benchmark.md'), '# All 45 measured locks\n');
  return { root, input, output: join(root, 'prepared.tgz'), runId: '123', runAttempt: '2' };
}

function archiveFile(path: string, name: string): Buffer {
  return execFileSync('tar', ['-xOzf', path, `package/${name}`]);
}

describe('publish the tested archive', () => {
  it('assigns a canary while preserving the tested runtime bytes', async () => {
    const files = await fixture();
    try {
      const result = await prepareArchive({ ...files, sourceSha });
      expect(result.version).toBe(canary);
      for (const name of names) expect(archiveFile(files.output, `dist/${name}`)).toEqual(archiveFile(files.input, `dist/${name}`));
    } finally { await rm(files.root, { recursive: true, force: true }); }
  });

  it('promotes by repacking only version metadata, keeping every runtime and declaration byte', async () => {
    const files = await fixture();
    try {
      const result = await prepareArchive({ ...files, sourceSha, version: '2.0.0' });
      expect(result.version).toBe('2.0.0');
      for (const name of [...names.map(name => `dist/${name}`), 'README.md', 'LICENSE']) {
        expect(archiveFile(files.output, name)).toEqual(archiveFile(files.input, name));
      }
      for (const name of ['package.json', 'dist/manifest.json']) {
        const before: unknown = JSON.parse(archiveFile(files.input, name).toString('utf8'));
        expect(JSON.parse(archiveFile(files.output, name).toString('utf8'))).toEqual({ ...Object(before), version: '2.0.0' });
      }
    } finally { await rm(files.root, { recursive: true, force: true }); }
  });

  it('refuses a valid archive belonging to another source SHA', async () => {
    const files = await fixture();
    try { await expect(prepareArchive({ ...files, sourceSha: 'b'.repeat(40) })).rejects.toThrow(/source/i); }
    finally { await rm(files.root, { recursive: true, force: true }); }
  });

  it('refuses altered runtime bytes even with unchanged metadata', async () => {
    const files = await fixture({ brokenHash: true });
    try { await expect(prepareArchive({ ...files, sourceSha })).rejects.toThrow(/hash|identity/i); }
    finally { await rm(files.root, { recursive: true, force: true }); }
  });

  it.each(['1.02.3', '2.0.0-beta', 'latest'])('rejects nonstable promotion version %s', async version => {
    const files = await fixture();
    try { await expect(prepareArchive({ ...files, sourceSha, version })).rejects.toThrow(/version/i); }
    finally { await rm(files.root, { recursive: true, force: true }); }
  });
});

describe('release evidence gate', () => {
  it('accepts a validated skipped comparison and preserves both original reports during stable promotion', async () => {
    const files = await fixture();
    const output = join(files.root, 'release');
    try {
      await prepareRelease({ input: files.root, output, sourceSha, version: '2.0.0' });
      expect(await readFile(join(output, 'benchmark.json'))).toEqual(await readFile(join(files.root, 'benchmark.json')));
      expect(await readFile(join(output, 'benchmark.md'))).toEqual(await readFile(join(files.root, 'benchmark.md')));
      expect(await checkRelease(output, sourceSha)).toMatchObject({ kind: 'stable', version: '2.0.0', sourceSha });
      const notes = await readFile(join(output, 'release-notes.md'), 'utf8');
      expect(notes).toContain('Benchmark quality: **passed**; 45 locks.');
      expect(notes).toContain(`A=${report.totals.A}`);
      expect(notes).toContain(`C=${report.totals.C}`);
      expect(notes).toMatch(/Comparison: skipped.*exact target SHA/);
      await writeFile(join(output, 'gothic-lock-solver.js'), 'tampered');
      await expect(checkRelease(output, sourceSha)).rejects.toThrow(/identity|hash/i);
    } finally { await rm(files.root, { recursive: true, force: true }); }
  });

  it('states the compared target SHA and measured deterministic drift in the release body', async () => {
    const files = await fixture();
    const output = join(files.root, 'release');
    try {
      const baseline = structuredClone(report);
      baseline.source.revision = 'b'.repeat(40);
      const row = baseline.results[0];
      if (row === undefined) throw new Error('Missing first fixture');
      row.C += 2;
      await writeFile(join(files.root, 'benchmark.json'), JSON.stringify(createReport({ ...report, baseline })));
      await prepareRelease({ input: files.root, output, sourceSha, version: '2.0.0' });
      const notes = await readFile(join(output, 'release-notes.md'), 'utf8');
      expect(notes).toContain(`Comparison: compared with target SHA \`${'b'.repeat(40)}\`.`);
      expect(notes).toContain('Benchmark quality: **passed**; 45 locks.');
      expect(notes).toContain('ΔA=0');
      expect(notes).toContain('ΔC=-2');
    } finally { await rm(files.root, { recursive: true, force: true }); }
  });

  it('rejects a report for another measured module', async () => {
    const files = await fixture();
    try {
      await writeFile(join(files.root, 'benchmark.json'), JSON.stringify({ ...report, source: { ...report.source, moduleSha256: '0'.repeat(64) } }));
      await expect(prepareRelease({ input: files.root, output: join(files.root, 'release'), sourceSha, runId: '123', runAttempt: '2' })).rejects.toThrow(/module/i);
    } finally { await rm(files.root, { recursive: true, force: true }); }
  });

  it('rejects deterministic quality regressions without an acceptance bypass', async () => {
    const files = await fixture();
    try {
      const baseline = structuredClone(report);
      const row = baseline.results[0];
      if (row === undefined) throw new Error('Missing first fixture');
      row.C -= 1;
      const regression = createReport({ ...report, baseline });
      await writeFile(join(files.root, 'benchmark.json'), JSON.stringify(regression));
      await expect(prepareRelease({ input: files.root, output: join(files.root, 'release'), sourceSha, runId: '123', runAttempt: '2' })).rejects.toThrow(/quality/i);
    } finally { await rm(files.root, { recursive: true, force: true }); }
  });
});
