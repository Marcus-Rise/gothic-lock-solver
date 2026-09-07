import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import {
  CDN_ORIGIN,
  PACKAGE_NAME,
  REQUIRED_LOCK_COUNT,
  assertDigest,
  executableFiles,
  parseReleaseVersion,
  record,
  releaseAssets,
  sha256,
  string,
  validateEvidenceGate,
  validateManifest,
  type ReleaseKind,
  type ReleaseManifest,
} from './release-lib.ts';

const MAX_ARCHIVE_FILE_BYTES = 16 * 1024 * 1024;

export async function readJson(path: string): Promise<unknown> {
  const value: unknown = JSON.parse(await readFile(path, 'utf8'));
  return value;
}

export async function writeJson(path: string, value: unknown): Promise<void> {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, { flag: 'wx' });
}

function archiveFile(tarball: string, filename: string): Buffer {
  return execFileSync('tar', ['-xOf', tarball, `package/${filename}`], {
    maxBuffer: MAX_ARCHIVE_FILE_BYTES,
  });
}

export interface EvidenceAcceptance {
  readonly acceptedEvidenceSha256?: string;
  readonly acceptanceReason?: string;
}

export async function verifyPreparedRelease(
  directory: string,
  acceptance: EvidenceAcceptance = {},
): Promise<ReleaseManifest> {
  const manifest = validateManifest(await readJson(join(directory, 'release-manifest.json')));
  for (const filename of releaseAssets) {
    const bytes = await readFile(join(directory, filename));
    const expectedHash = string(manifest.assets[filename], filename);
    assertDigest(bytes, expectedHash, filename);
  }

  const tarball = resolve(directory, 'package.tgz');
  const packed: unknown = JSON.parse(archiveFile(tarball, 'package.json').toString('utf8'));
  const metadata = record(packed, 'packed metadata');
  if (
    metadata['name'] !== manifest.name ||
    metadata['version'] !== manifest.version ||
    metadata['private'] === true
  ) {
    throw new Error('Packed package identity differs from release');
  }

  const build: unknown = JSON.parse(archiveFile(tarball, 'dist/manifest.json').toString('utf8'));
  const buildManifest = record(build, 'packed build manifest');
  if (buildManifest['sourceSha'] !== manifest.sourceSha || buildManifest['version'] !== manifest.version) {
    throw new Error('Packed build source/version differs from release');
  }

  for (const filename of executableFiles) {
    const bytes = archiveFile(tarball, `dist/${filename}`);
    const expectedHash = string(manifest.assets[filename], filename);
    assertDigest(bytes, expectedHash, `packed ${filename}`);
  }

  // The publishing-side verifier receives acceptance from its trusted caller, never from an artifact.
  const moduleSha256 = string(manifest.assets['gothic-lock-solver.mjs'], 'prepared ESM hash');
  await verifyBenchmarkEvidence(
    directory,
    manifest.sourceSha,
    moduleSha256,
    acceptance.acceptedEvidenceSha256,
    acceptance.acceptanceReason,
  );
  return manifest;
}

export interface PrepareOptions {
  readonly root: string;
  readonly outputDir: string;
  readonly benchmarkDir: string;
  readonly sourceSha: string;
  readonly kind: ReleaseKind;
  readonly acceptedEvidenceSha256?: string;
  readonly acceptanceReason?: string;
}

export async function verifyBenchmarkEvidence(
  directory: string,
  sourceSha: string,
  moduleSha256: string,
  acceptedSha256 = '',
  acceptanceReason = '',
): Promise<string | null> {
  const bytes = await readFile(join(directory, 'benchmark-evidence.json'));
  const parsed: unknown = JSON.parse(bytes.toString('utf8'));
  const evidence = record(parsed, 'benchmark evidence');
  const acceptance = validateEvidenceGate(evidence, sha256(bytes), acceptedSha256, acceptanceReason);
  const metadata = record(evidence['metadata'], 'benchmark metadata');
  const candidate = record(metadata['candidate'], 'benchmark candidate');
  if (
    candidate['revision'] !== sourceSha ||
    candidate['moduleSha256'] !== moduleSha256 ||
    candidate['format'] !== 'tuple'
  ) {
    throw new Error('Benchmark candidate differs from prepared source/artifact');
  }

  const reports = record(evidence['reports'], 'benchmark report hashes');
  const reportFiles = [
    ['json', 'benchmark.json'],
    ['markdown', 'benchmark.md'],
  ] as const;
  for (const [field, filename] of reportFiles) {
    const report = record(reports[field], field);
    if (report['path'] !== filename) {
      throw new Error('Unexpected benchmark report path');
    }
    const reportBytes = await readFile(join(directory, filename));
    const expectedHash = string(report['sha256'], 'report hash');
    assertDigest(reportBytes, expectedHash, filename);
  }

  const report = record(await readJson(join(directory, 'benchmark.json')), 'detailed benchmark report');
  const correctness = record(report['correctness'], 'report correctness');
  if (correctness['passed'] !== true) {
    throw new Error('Detailed report correctness must pass');
  }
  for (const field of ['schemaVersion', 'quality', 'performance', 'config', 'metadata', 'memory']) {
    if (!isDeepStrictEqual(report[field], evidence[field])) {
      throw new Error(`Detailed report ${field} differs from benchmark evidence`);
    }
  }
  return acceptance;
}

function releaseAssetPath(filename: string, options: PrepareOptions): string {
  if (filename === 'package.tgz') {
    return join(options.root, 'artifacts/package/package.tgz');
  }
  if (filename.startsWith('benchmark')) {
    return join(options.benchmarkDir, filename);
  }
  return join(options.root, 'dist', filename);
}

/** Copies the already tested archive; this function never invokes a build or npm pack. */
export async function prepareRelease(options: PrepareOptions): Promise<ReleaseManifest> {
  const build = record(await readJson(join(options.root, 'dist/manifest.json')), 'build manifest');
  const metadata = record(await readJson(join(options.root, 'package.json')), 'package metadata');
  const version = string(metadata['version'], 'package version');
  if (parseReleaseVersion(version).prerelease !== (options.kind === 'canary')) {
    throw new Error('Stable/canary version mismatch');
  }
  if (build['sourceSha'] !== options.sourceSha || build['version'] !== version) {
    throw new Error('Build source/version differs from requested release');
  }

  const moduleSha256 = sha256(await readFile(join(options.root, 'dist/gothic-lock-solver.mjs')));
  const acceptance = await verifyBenchmarkEvidence(
    options.benchmarkDir,
    options.sourceSha,
    moduleSha256,
    options.acceptedEvidenceSha256,
    options.acceptanceReason,
  );

  const assets: Record<string, string> = {};
  await mkdir(options.outputDir, { recursive: true });
  for (const filename of releaseAssets) {
    const bytes = await readFile(releaseAssetPath(filename, options));
    assets[filename] = sha256(bytes);
    await writeFile(join(options.outputDir, filename), bytes, { flag: 'wx' });
  }

  const manifest = validateManifest({
    schemaVersion: 1,
    name: PACKAGE_NAME,
    version,
    sourceSha: options.sourceSha,
    kind: options.kind,
    tarballSha256: assets['package.tgz'],
    assets,
  });
  await writeJson(join(options.outputDir, 'release-manifest.json'), manifest);
  await verifyPreparedRelease(options.outputDir, options);

  const evidence = record(await readJson(join(options.benchmarkDir, 'benchmark-evidence.json')), 'release evidence');
  const notes = releaseNotes(manifest, evidence, acceptance);
  await writeFile(join(options.outputDir, 'release-notes.md'), notes, { flag: 'wx' });
  return manifest;
}

function releaseNotes(
  manifest: ReleaseManifest,
  evidence: Record<string, unknown>,
  acceptance: string | null,
): string {
  const evidenceMetadata = record(evidence['metadata'], 'evidence metadata');
  const baseline = record(evidenceMetadata['baseline'] ?? {}, 'evidence baseline');
  const baselineKind = typeof baseline['kind'] === 'string' ? baseline['kind'] : 'reference/previous release';
  const baselineRevision = typeof baseline['revision'] === 'string'
    ? baseline['revision']
    : 'see benchmark-evidence.json';
  const memory = record(evidence['memory'], 'memory evidence');
  const memoryPerformance = record(memory['performance'], 'memory verdict');
  const timingVerdict = string(evidence['performance'], 'performance');
  const memoryVerdict = string(memoryPerformance['verdict'], 'memory verdict');
  const acceptanceNote = acceptance === null
    ? 'The calibrated timing and memory gates passed.'
    : `Accepted performance evidence: ${acceptance}`;
  const cdn = `${CDN_ORIGIN}/npm/${manifest.name}@${manifest.version}/dist`;

  return `# Gothic Lock Solver ${manifest.version}

Source: ${manifest.sourceSha}.

[npm ${manifest.version}](https://www.npmjs.com/package/${manifest.name}/v/${manifest.version})

Install: \`npm install ${manifest.name}@${manifest.version}\`.

This release provides solveLock(state, links, config?) and createSolverConfig(overrides?). Commands are [zero-based index, signed numeric pin delta]. See the Wiki API contract for integration details.

Benchmark quality: **passed**, ${REQUIRED_LOCK_COUNT} fixtures. Performance: **${timingVerdict}**; memory: **${memoryVerdict}**.
Baseline: ${baselineKind}, source ${baselineRevision}. Detailed report hashes and the comparison source are preserved in benchmark-evidence.json.
${acceptanceNote}

\`\`\`html
<script src="${cdn}/gothic-lock-solver.min.js"></script>
<script>console.log(GothicLockSolver.solveLock([6, 2], [[0, -1], [0, 0]]));</script>
\`\`\`

\`\`\`html
<script type="module">
import { solveLock } from '${cdn}/gothic-lock-solver.min.mjs';
console.log(solveLock([6, 2], [[0, -1], [0, 0]]));
</script>
\`\`\`

All five executable files, the exact tested npm archive, checksum manifest and detailed benchmark reports are attached.
`;
}
