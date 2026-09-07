import { execFileSync } from 'node:child_process';
import { appendFile, mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { assertDigest, previousStableVersion, record, sha256, string, validateManifest } from './release-lib.ts';
import { writeJson } from './release-files.ts';
import { fetchBytes, verifyRegistry } from './release-network.ts';

const [mode, directoryArgument, outputArgument] = process.argv.slice(2);
if (!['checkout', 'release'].includes(mode ?? '') || !directoryArgument || !outputArgument) throw new Error('Usage: node scripts/ci-baseline.ts checkout BASE_CHECKOUT OUTPUT_DIR | release CANDIDATE_VERSION OUTPUT_DIR');
const output = resolve(outputArgument);
await mkdir(output, { recursive: true });

async function emit(fields: Readonly<Record<string, string>>): Promise<void> {
  const text = Object.entries(fields).map(([key, value]) => `${key}=${value}\n`).join('');
  if (process.env['GITHUB_OUTPUT']) await appendFile(process.env['GITHUB_OUTPUT'], text);
  console.log(JSON.stringify(fields));
}

if (mode === 'checkout') {
  const base = resolve(directoryArgument);
  const legacyModule = join(base, 'src/index.mjs');
  const legacy = await stat(legacyModule).then(value => value.isFile(), () => false);
  const module = legacy ? legacyModule : join(base, 'dist/gothic-lock-solver.mjs');
  const format = legacy ? 'legacy' : 'tuple';
  const snapshot = join(output, 'baseline-snapshot.json');
  // The supplied base checkout, never a candidate-owned expected snapshot, supplies the live baseline.
  execFileSync(process.execPath, ['scripts/benchmark-snapshot.ts', '--source-module', module, '--source-format', format,
    '--reason', 'Fresh snapshot from the separately checked-out PR target/reference commit; candidate snapshot is not read.', '--output', snapshot], { stdio: 'inherit' });
  await emit({ available: 'true', module, snapshot, format });
} else {
  const response = await fetch('https://registry.npmjs.org/gothic-lock-solver', { signal: AbortSignal.timeout(30_000) });
  if (response.status === 404) {
    await emit({ available: 'false', reason: 'No npm package yet; use the explicitly pinned reference checkout.' });
  } else {
    if (!response.ok) throw new Error(`npm baseline metadata HTTP ${response.status}`);
    const metadata: unknown = await response.json();
    const versions = record(record(metadata, 'package metadata')['versions'], 'versions');
    const previous = previousStableVersion(Object.keys(versions), directoryArgument);
    if (previous === null) {
      await emit({ available: 'false', reason: 'No preceding stable version; use the explicitly pinned reference checkout.' });
    } else {
      const prefix = `https://github.com/Marcus-Rise/gothic-lock-solver/releases/download/v${previous}/`;
      const manifestBytes = await fetchBytes(`${prefix}release-manifest.json`);
      const manifestJson: unknown = JSON.parse(manifestBytes.toString('utf8'));
      const manifest = validateManifest(manifestJson);
      if (manifest.version !== previous || manifest.kind !== 'stable') throw new Error('Previous stable release identity mismatch');
      await verifyRegistry(manifest);
      const moduleBytes = await fetchBytes(`${prefix}gothic-lock-solver.mjs`);
      assertDigest(moduleBytes, string(manifest.assets['gothic-lock-solver.mjs'], 'previous ESM hash'), 'previous release module');
      const evidenceBytes = await fetchBytes(`${prefix}benchmark-evidence.json`);
      assertDigest(evidenceBytes, string(manifest.assets['benchmark-evidence.json'], 'previous evidence hash'), 'previous release evidence');
      const evidenceJson: unknown = JSON.parse(evidenceBytes.toString('utf8'));
      const evidence = record(evidenceJson, 'previous evidence');
      const snapshot = record(evidence['qualitySnapshot'], 'previous quality snapshot');
      const source = record(snapshot['source'], 'previous snapshot source');
      if (source['revision'] !== manifest.sourceSha || source['moduleSha256'] !== sha256(moduleBytes)) throw new Error('Previous release snapshot source differs from published module');
      const module = join(output, 'baseline.mjs'); const snapshotPath = join(output, 'baseline-snapshot.json');
      await writeFile(module, moduleBytes, { flag: 'wx' });
      await writeFile(join(output, 'previous-release-manifest.json'), manifestBytes, { flag: 'wx' });
      await writeFile(join(output, 'previous-benchmark-evidence.json'), evidenceBytes, { flag: 'wx' });
      await writeJson(snapshotPath, { ...snapshot, source: { ...source, releaseVersion: previous, kind: 'previous-stable-release' } });
      // Re-read the bytes that will actually be imported, after writing the evidence chain.
      assertDigest(await readFile(module), string(source['moduleSha256'], 'snapshot module hash'), 'saved baseline module');
      await emit({ available: 'true', module, snapshot: snapshotPath, format: 'tuple', version: previous });
    }
  }
}
