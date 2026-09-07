import { execFileSync } from 'node:child_process';
import { appendFile, mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import {
  NPM_REGISTRY,
  PACKAGE_NAME,
  assertDigest,
  previousStableVersion,
  record,
  sha256,
  string,
  validateManifest,
} from './release-lib.ts';
import { writeJson } from './release-files.ts';
import { fetchBytes, verifyRegistry } from './release-network.ts';

const REGISTRY_TIMEOUT_MS = 30_000;

async function emit(fields: Readonly<Record<string, string>>): Promise<void> {
  const text = Object.entries(fields)
    .map(([key, value]) => `${key}=${value}\n`)
    .join('');
  const githubOutput = process.env['GITHUB_OUTPUT'];
  if (githubOutput) {
    await appendFile(githubOutput, text);
  }
  console.log(JSON.stringify(fields));
}

async function checkoutBaseline(checkoutDirectory: string, outputDirectory: string): Promise<void> {
  const base = resolve(checkoutDirectory);
  const legacyModule = join(base, 'src/index.mjs');
  const legacy = await stat(legacyModule).then(
    (value) => value.isFile(),
    () => false,
  );
  const module = legacy ? legacyModule : join(base, 'dist/gothic-lock-solver.mjs');
  const format = legacy ? 'legacy' : 'tuple';
  const snapshot = join(outputDirectory, 'baseline-snapshot.json');

  // The supplied base checkout, never a candidate-owned expected snapshot, supplies the live baseline.
  execFileSync(process.execPath, [
    'tests/benchmarks/snapshot.ts',
    '--source-module', module,
    '--source-format', format,
    '--reason', 'Fresh snapshot from the separately checked-out PR target/reference commit; candidate snapshot is not read.',
    '--output', snapshot,
  ], { stdio: 'inherit' });
  await emit({ available: 'true', module, snapshot, format });
}

async function releaseBaseline(candidateVersion: string, outputDirectory: string): Promise<void> {
  const response = await fetch(`${NPM_REGISTRY}/${PACKAGE_NAME}`, {
    signal: AbortSignal.timeout(REGISTRY_TIMEOUT_MS),
  });
  if (response.status === 404) {
    await emit({ available: 'false', reason: 'No npm package yet; use the explicitly pinned reference checkout.' });
    return;
  }
  if (!response.ok) {
    throw new Error(`npm baseline metadata HTTP ${response.status}`);
  }

  const metadata: unknown = await response.json();
  const versions = record(record(metadata, 'package metadata')['versions'], 'versions');
  const previous = previousStableVersion(Object.keys(versions), candidateVersion);
  if (previous === null) {
    await emit({ available: 'false', reason: 'No preceding stable version; use the explicitly pinned reference checkout.' });
    return;
  }

  const prefix = `https://github.com/Marcus-Rise/gothic-lock-solver/releases/download/v${previous}/`;
  const manifestBytes = await fetchBytes(`${prefix}release-manifest.json`);
  const manifestJson: unknown = JSON.parse(manifestBytes.toString('utf8'));
  const manifest = validateManifest(manifestJson);
  if (manifest.version !== previous || manifest.kind !== 'stable') {
    throw new Error('Previous stable release identity mismatch');
  }
  await verifyRegistry(manifest);

  const moduleBytes = await fetchBytes(`${prefix}gothic-lock-solver.mjs`);
  const moduleHash = string(manifest.assets['gothic-lock-solver.mjs'], 'previous ESM hash');
  assertDigest(moduleBytes, moduleHash, 'previous release module');

  const evidenceBytes = await fetchBytes(`${prefix}benchmark-evidence.json`);
  const evidenceHash = string(manifest.assets['benchmark-evidence.json'], 'previous evidence hash');
  assertDigest(evidenceBytes, evidenceHash, 'previous release evidence');

  const evidenceJson: unknown = JSON.parse(evidenceBytes.toString('utf8'));
  const evidence = record(evidenceJson, 'previous evidence');
  const snapshot = record(evidence['qualitySnapshot'], 'previous quality snapshot');
  const source = record(snapshot['source'], 'previous snapshot source');
  if (source['revision'] !== manifest.sourceSha || source['moduleSha256'] !== sha256(moduleBytes)) {
    throw new Error('Previous release snapshot source differs from published module');
  }

  const module = join(outputDirectory, 'baseline.mjs');
  const snapshotPath = join(outputDirectory, 'baseline-snapshot.json');
  await writeFile(module, moduleBytes, { flag: 'wx' });
  await writeFile(join(outputDirectory, 'previous-release-manifest.json'), manifestBytes, { flag: 'wx' });
  await writeFile(join(outputDirectory, 'previous-benchmark-evidence.json'), evidenceBytes, { flag: 'wx' });
  await writeJson(snapshotPath, {
    ...snapshot,
    source: {
      ...source,
      releaseVersion: previous,
      kind: 'previous-stable-release',
      releaseManifestSha256: sha256(manifestBytes),
      releaseEvidenceSha256: sha256(evidenceBytes),
    },
  });

  // Re-read the bytes that will actually be imported, after writing the evidence chain.
  assertDigest(await readFile(module), string(source['moduleSha256'], 'snapshot module hash'), 'saved baseline module');
  await emit({ available: 'true', module, snapshot: snapshotPath, format: 'tuple', version: previous });
}

const [mode, sourceArgument, outputArgument] = process.argv.slice(2);
if (!['checkout', 'release'].includes(mode ?? '') || !sourceArgument || !outputArgument) {
  throw new Error('Usage: node .github/scripts/ci-baseline.ts checkout BASE_CHECKOUT OUTPUT_DIR | release CANDIDATE_VERSION OUTPUT_DIR');
}

const outputDirectory = resolve(outputArgument);
await mkdir(outputDirectory, { recursive: true });
if (mode === 'checkout') {
  await checkoutBaseline(sourceArgument, outputDirectory);
} else {
  await releaseBaseline(sourceArgument, outputDirectory);
}
