import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { prepareRelease, verifyBenchmarkEvidence, verifyPreparedRelease } from '../../scripts/release-files.ts';
import { releaseAssets, sha256 } from '../../scripts/release-lib.ts';

async function createPreparedFixture() {
  const root = await mkdtemp(join(tmpdir(), 'gothic-release-test-'));
  const sourceSha = 'a'.repeat(40);
  const packaged = join(root, 'packed/package'); const evidence = join(root, 'evidence'); const output = join(root, 'prepared');
  for (const directory of [join(root, 'dist'), join(root, 'artifacts/package'), join(packaged, 'dist'), evidence]) await mkdir(directory, { recursive: true });
  const metadata = JSON.stringify({ name: 'gothic-lock-solver', version: '1.0.0' });
  const build = JSON.stringify({ schemaVersion: 1, sourceSha, version: '1.0.0' });
  await writeFile(join(root, 'package.json'), metadata); await writeFile(join(packaged, 'package.json'), metadata);
  await writeFile(join(root, 'dist/manifest.json'), build); await writeFile(join(packaged, 'dist/manifest.json'), build);
  for (const filename of releaseAssets.filter(name => /\.(?:mjs|js)$/.test(name))) {
    await writeFile(join(root, 'dist', filename), 'export const marker = 1;\n');
    await writeFile(join(packaged, 'dist', filename), 'export const marker = 1;\n');
  }
  const tarball = join(root, 'artifacts/package/package.tgz');
  execFileSync('tar', ['-czf', tarball, '-C', join(root, 'packed'), 'package']);
  const markdown = '# Measured evidence\n';
  const envelope = { schemaVersion: 1, quality: 'passed', performance: 'passed', config: { lockCount: 45 },
    memory: { performance: { verdict: 'passed' } }, metadata: { candidate: { revision: sourceSha, moduleSha256: sha256('export const marker = 1;\n'), format: 'tuple' } },
  };
  const reportData = { ...envelope, correctness: { passed: true } };
  const json = JSON.stringify(reportData);
  await writeFile(join(evidence, 'benchmark.json'), json); await writeFile(join(evidence, 'benchmark.md'), markdown);
  const evidenceData = { ...envelope, reports: { json: { path: 'benchmark.json', sha256: sha256(json) }, markdown: { path: 'benchmark.md', sha256: sha256(markdown) } } };
  await writeFile(join(evidence, 'benchmark-evidence.json'), JSON.stringify(evidenceData));
  const manifest = await prepareRelease({ root, outputDir: output, benchmarkDir: evidence, sourceSha, kind: 'stable' });
  return { root, sourceSha, evidence, output, tarball, manifest, evidenceData, reportData };
}

type PreparedFixture = Awaited<ReturnType<typeof createPreparedFixture>>;
type EvidenceData = PreparedFixture['evidenceData'];

async function replaceEvidence(fixture: PreparedFixture, evidenceData: unknown): Promise<string> {
  const bytes = JSON.stringify(evidenceData); const hash = sha256(bytes);
  await writeFile(join(fixture.output, 'benchmark-evidence.json'), bytes);
  await writeFile(join(fixture.output, 'release-manifest.json'), JSON.stringify({ ...fixture.manifest,
    assets: { ...fixture.manifest.assets, 'benchmark-evidence.json': hash } }));
  return hash;
}

describe('prepared archive identity', () => {
  it('copies one verified archive, verifies its packed files, and detects later asset tampering', async () => {
    const fixture = await createPreparedFixture();
    const { root, output, tarball, manifest, evidence, sourceSha } = fixture;
    try {
      expect(await readFile(join(output, 'package.tgz'))).toEqual(await readFile(tarball));
      expect((await verifyPreparedRelease(output)).tarballSha256).toBe(manifest.tarballSha256);
      await expect(verifyBenchmarkEvidence(evidence, 'b'.repeat(40), sha256('export const marker = 1;\n'))).rejects.toThrow(/candidate/);
      await writeFile(join(output, 'gothic-lock-solver.js'), 'changed');
      await expect(verifyPreparedRelease(output)).rejects.toThrow(/identity/);
      await writeFile(join(evidence, 'benchmark.md'), 'edited report');
      await expect(verifyBenchmarkEvidence(evidence, sourceSha, sha256('export const marker = 1;\n'))).rejects.toThrow(/identity/);
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  const changes: readonly { name: string; change: (value: EvidenceData) => unknown; error: RegExp }[] = [
    { name: 'quality regression', change: value => ({ ...value, quality: 'regression' }), error: /quality/ },
    { name: 'uncertain performance', change: value => ({ ...value, performance: 'inconclusive' }), error: /performance/ },
    { name: 'wrong source revision', change: value => ({ ...value, metadata: { candidate: { ...value.metadata.candidate, revision: 'b'.repeat(40) } } }), error: /candidate/ },
    { name: 'wrong measured module', change: value => ({ ...value, metadata: { candidate: { ...value.metadata.candidate, moduleSha256: 'b'.repeat(64) } } }), error: /candidate/ },
    { name: 'wrong report link', change: value => ({ ...value, reports: { ...value.reports, json: { ...value.reports.json, path: 'different.json' } } }), error: /report path/ },
    { name: 'wrong report hash', change: value => ({ ...value, reports: { ...value.reports, json: { ...value.reports.json, sha256: 'b'.repeat(64) } } }), error: /identity/ },
  ];
  it.each(changes)('rejects $name even after the matching manifest digest is recomputed', async ({ change, error }) => {
    const fixture = await createPreparedFixture();
    try {
      await replaceEvidence(fixture, change(fixture.evidenceData));
      await expect(verifyPreparedRelease(fixture.output)).rejects.toThrow(error);
    } finally { await rm(fixture.root, { recursive: true, force: true }); }
  });

  it('requires acceptance supplied by the verifier, ignoring an artifact acceptance claim', async () => {
    const fixture = await createPreparedFixture();
    try {
      const report = JSON.stringify({ ...fixture.reportData, performance: 'inconclusive' });
      await writeFile(join(fixture.output, 'benchmark.json'), report);
      fixture.manifest = { ...fixture.manifest, assets: { ...fixture.manifest.assets, 'benchmark.json': sha256(report) } };
      const hash = await replaceEvidence(fixture, { ...fixture.evidenceData, performance: 'inconclusive', acceptanceReason: 'Self-approved artifact',
        reports: { ...fixture.evidenceData.reports, json: { path: 'benchmark.json', sha256: sha256(report) } } });
      await expect(verifyPreparedRelease(fixture.output)).rejects.toThrow(/performance/);
      await expect(verifyPreparedRelease(fixture.output, { acceptedEvidenceSha256: hash, acceptanceReason: 'Maintainer reviewed this exact evidence.' })).resolves.toMatchObject({ version: '1.0.0' });
      await expect(verifyPreparedRelease(fixture.output, { acceptedEvidenceSha256: 'b'.repeat(64), acceptanceReason: 'Wrong evidence.' })).rejects.toThrow(/performance/);
    } finally { await rm(fixture.root, { recursive: true, force: true }); }
  });

  it('rejects an evidence pass that disagrees with the detailed report after all hashes are updated', async () => {
    const fixture = await createPreparedFixture();
    try {
      const report = JSON.stringify({ ...fixture.reportData, quality: 'regression' });
      await writeFile(join(fixture.output, 'benchmark.json'), report);
      fixture.manifest = { ...fixture.manifest, assets: { ...fixture.manifest.assets, 'benchmark.json': sha256(report) } };
      await replaceEvidence(fixture, { ...fixture.evidenceData, reports: { ...fixture.evidenceData.reports, json: { path: 'benchmark.json', sha256: sha256(report) } } });
      await expect(verifyPreparedRelease(fixture.output)).rejects.toThrow(/report.*quality/);
    } finally { await rm(fixture.root, { recursive: true, force: true }); }
  });
});
