import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { readReport, type BenchmarkReport } from '../../tests/benchmarks/harness.ts';

const STABLE_VERSION = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const SOURCE_SHA = /^[a-f0-9]{40}$/;
const REQUEST_TIMEOUT_MS = 30_000;
const MAX_ARCHIVE_FILE_BYTES = 16 * 1024 * 1024;
const CANARY_VERSION = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)-canary\.[1-9]\d*\.[1-9]\d*\.[a-f0-9]{12}$/;
export const runtimeFiles = [
  'gothic-lock-solver.mjs',
  'gothic-lock-solver.min.mjs',
  'gothic-lock-solver.js',
  'gothic-lock-solver.min.js',
  'gothic-lock-solver.cli.mjs',
] as const;

export function sha256(bytes: string | Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function record(value: unknown): Record<string, unknown> {
  assert.ok(isRecord(value), 'Expected an object');
  return value;
}

function archiveFiles(path: string): Map<string, Buffer> {
  const names = execFileSync('tar', ['-tzf', path], { encoding: 'utf8' }).trim().split('\n');
  const entries = execFileSync('tar', ['-tvzf', path], { encoding: 'utf8' }).trim().split('\n');
  assert.ok(entries.every(entry => entry.startsWith('-') || entry.startsWith('d')), 'Archive contains a link or special file');
  assert.equal(new Set(names).size, names.length, 'Archive repeats a file');
  const result = new Map<string, Buffer>();
  for (const name of names.filter(name => !name.endsWith('/'))) {
    assert.ok(/^package\/(?:[A-Za-z0-9_.-]+\/)*[A-Za-z0-9_.-]+$/.test(name) && !name.split('/').includes('..'), 'Unsafe archive path');
    result.set(name.slice('package/'.length), execFileSync('tar', ['-xOzf', path, name], { maxBuffer: MAX_ARCHIVE_FILE_BYTES }));
  }
  return result;
}

function requiredFile(files: ReadonlyMap<string, Buffer>, name: string): Buffer {
  const bytes = files.get(name);
  assert.ok(bytes, `Missing packaged ${name}`);
  return bytes;
}

function archiveMetadata(files: ReadonlyMap<string, Buffer>, name: string): Record<string, unknown> {
  const value: unknown = JSON.parse(requiredFile(files, name).toString('utf8'));
  return record(value);
}

function inspectArchive(files: ReadonlyMap<string, Buffer>, sourceSha: string): string {
  const metadata = archiveMetadata(files, 'package.json');
  const build = archiveMetadata(files, 'dist/manifest.json');
  const version = metadata['version'];
  assert.equal(metadata['name'], 'gothic-lock-solver', 'Wrong package identity');
  assert.ok(typeof version === 'string' && (STABLE_VERSION.test(version) || CANARY_VERSION.test(version)), 'Invalid package version');
  assert.ok(SOURCE_SHA.test(sourceSha) && build['sourceSha'] === sourceSha, 'Build source identity differs from successful CI');
  assert.equal(build['version'], version, 'Build version differs from package');
  assert.equal(build['schemaVersion'], 1, 'Unknown build manifest');
  assert.equal(build['package'], 'gothic-lock-solver', 'Wrong build identity');
  const hashes = record(build['files']);
  const distribution = [...files.keys()].filter(name => name.startsWith('dist/') && name !== 'dist/manifest.json');
  assert.deepEqual(Object.keys(hashes).sort(), distribution.map(name => name.slice(5)).sort(), 'Build manifest file list differs');
  assert.deepEqual(distribution.filter(name => /\.(?:mjs|js)$/.test(name)).map(name => name.slice(5)).sort(), [...runtimeFiles].sort(), 'Expected exactly five runtime files');
  for (const name of distribution) assert.equal(sha256(requiredFile(files, name)), hashes[name.slice(5)], `Packaged file hash differs: ${name}`);
  return version;
}

export function canaryVersion(base: string, source: string, run: string, attempt: string): string {
  assert.ok(STABLE_VERSION.test(base), 'Expected stable package base version');
  assert.ok(SOURCE_SHA.test(source) && /^[1-9]\d*$/.test(run) && /^[1-9]\d*$/.test(attempt), 'Invalid CI source identity');
  return `${base}-canary.${run}.${attempt}.${source.slice(0, 12)}`;
}

type Preparation = {
  input: string;
  output: string;
  sourceSha: string;
  version?: string;
  runId?: string;
  runAttempt?: string;
};

/** Both release kinds change only version metadata in the tested package. */
export async function prepareArchive(options: Preparation): Promise<{ version: string }> {
  const files = archiveFiles(options.input);
  const base = inspectArchive(files, options.sourceSha);
  assert.ok(STABLE_VERSION.test(base), 'Expected a tested stable package base version');
  const version = options.version ?? canaryVersion(base, options.sourceSha, options.runId ?? '', options.runAttempt ?? '');
  assert.ok(options.version === undefined || STABLE_VERSION.test(version), 'Expected stable promotion version');
  await mkdir(dirname(options.output), { recursive: true });
  const temporary = await mkdtemp(join(tmpdir(), 'gothic-stable-'));
  try {
    for (const [name, bytes] of files) {
      const path = join(temporary, name);
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, bytes);
    }
    for (const name of ['package.json', 'dist/manifest.json']) {
      const metadata = archiveMetadata(files, name);
      await writeJson(join(temporary, name), { ...metadata, version });
    }
    const packed: unknown = JSON.parse(execFileSync('npm', ['pack', '--json', '--ignore-scripts'], { cwd: temporary, encoding: 'utf8' }));
    assert.ok(Array.isArray(packed) && packed.length === 1, 'Expected one stable archive');
    const filename = record(packed[0])['filename'];
    assert.ok(typeof filename === 'string' && /^[A-Za-z0-9_.-]+\.tgz$/.test(filename), 'Invalid packed filename');
    const archive = join(temporary, filename);
    const promoted = archiveFiles(archive);
    assert.deepEqual([...promoted.keys()].sort(), [...files.keys()].sort(), 'Repack changed packaged file list');
    for (const [name, bytes] of files) {
      const expected = name === 'package.json' || name === 'dist/manifest.json' ? await readFile(join(temporary, name)) : bytes;
      assert.deepEqual(requiredFile(promoted, name), expected, `Repack changed tested bytes: ${name}`);
    }
    inspectArchive(promoted, options.sourceSha);
    await copyFile(archive, options.output);
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
  return { version };
}

async function readJson(path: string): Promise<Record<string, unknown>> {
  const value: unknown = JSON.parse(await readFile(path, 'utf8'));
  return record(value);
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
}

function environment(name: string): string {
  const value = process.env[name];
  assert.ok(value, `Missing ${name}`);
  return value;
}

export const releaseAssets = [...runtimeFiles, 'package.tgz', 'benchmark.json', 'benchmark.md'] as const;
export type ReleaseManifest = {
  schemaVersion: 1;
  version: string;
  sourceSha: string;
  kind: 'canary' | 'stable';
  assets: Record<string, string>;
};

function checkReport(directory: string, sourceSha: string, moduleSha256: string): BenchmarkReport {
  const report = readReport(join(directory, 'benchmark.json'), sourceSha);
  assert.equal(report.quality, 'passed', 'Benchmark quality regression prevents publication');
  assert.equal(report.source.moduleSha256, moduleSha256, 'Benchmark measured a different module');
  return report;
}

export async function prepareRelease(options: Preparation): Promise<ReleaseManifest> {
  const original = archiveFiles(join(options.input, 'package.tgz'));
  inspectArchive(original, options.sourceSha);
  const report = checkReport(options.input, options.sourceSha, sha256(requiredFile(original, 'dist/gothic-lock-solver.mjs')));
  await mkdir(options.output, { recursive: true });
  const { version } = await prepareArchive({ ...options, input: join(options.input, 'package.tgz'), output: join(options.output, 'package.tgz') });
  for (const filename of runtimeFiles) await writeFile(join(options.output, filename), requiredFile(original, `dist/${filename}`));
  for (const filename of ['benchmark.json', 'benchmark.md']) await copyFile(join(options.input, filename), join(options.output, filename));
  const assets: Record<string, string> = {};
  for (const filename of releaseAssets) assets[filename] = sha256(await readFile(join(options.output, filename)));
  const manifest: ReleaseManifest = {
    schemaVersion: 1,
    version,
    sourceSha: options.sourceSha,
    kind: options.version === undefined ? 'canary' : 'stable',
    assets,
  };
  await writeJson(join(options.output, 'release-manifest.json'), manifest);
  const cdn = `https://cdn.jsdelivr.net/npm/gothic-lock-solver@${version}/dist`;
  const { totals, comparison } = report;
  const benchmarkSummary = [
    `Benchmark quality: **${report.quality}**; ${report.fixtures.count} locks.`, '',
    `Totals: A=${totals.A}, U=${totals.U}, C=${totals.C}, switches=${totals.plateSwitches}.`,
    'A counts actions, U distinct plates per lock, and C unit shifts; totals sum all locks.', '',
  ];
  if (comparison.status === 'compared') {
    const drift = comparison.results.reduce((sum, row) => ({
      A: sum.A + row.deltas.A,
      U: sum.U + row.deltas.U,
      C: sum.C + row.deltas.C,
      plateSwitches: sum.plateSwitches + row.deltas.plateSwitches,
    }), { A: 0, U: 0, C: 0, plateSwitches: 0 });
    benchmarkSummary.push(
      `Comparison: compared with target SHA \`${comparison.baselineSha}\`.`,
      `Deterministic drift: ΔA=${drift.A}, ΔU=${drift.U}, ΔC=${drift.C}, Δswitches=${drift.plateSwitches}.`, '',
    );
  } else {
    benchmarkSummary.push(`Comparison: skipped. ${comparison.reason}`, '');
  }
  await writeFile(join(options.output, 'release-notes.md'), [
    `# Gothic Lock Solver ${version}`, '', `Tested source: ${options.sourceSha}.`, '',
    ...benchmarkSummary,
    `Install: \`npm install gothic-lock-solver@${version}\`.`, '',
    `Browser module: ${cdn}/gothic-lock-solver.min.mjs`, '',
    `Classic script: ${cdn}/gothic-lock-solver.min.js`, '',
    'All five standalone runtime files, npm archive, checksums and full 45-lock benchmark reports are attached.',
    'Release packaging changes version metadata only; runtime and declaration bytes match successful CI.', '',
  ].join('\n'));
  await checkRelease(options.output, options.sourceSha);
  return manifest;
}

export async function checkRelease(directory: string, sourceSha: string): Promise<ReleaseManifest> {
  const value = await readJson(join(directory, 'release-manifest.json'));
  const version = value['version'];
  const kind = value['kind'];
  assert.ok(kind === 'stable' || kind === 'canary', 'Invalid release kind');
  assert.ok(typeof version === 'string' && (kind === 'stable' ? STABLE_VERSION.test(version) : kind === 'canary' && CANARY_VERSION.test(version)), 'Invalid release version/kind');
  assert.ok(value['schemaVersion'] === 1 && value['sourceSha'] === sourceSha && SOURCE_SHA.test(sourceSha), 'Release source identity differs');
  const hashes = record(value['assets']);
  assert.deepEqual(Object.keys(hashes).sort(), [...releaseAssets].sort(), 'Incomplete release assets');
  const assets: Record<string, string> = {};
  for (const filename of releaseAssets) {
    const hash = hashes[filename];
    assert.ok(typeof hash === 'string' && /^[a-f0-9]{64}$/.test(hash), 'Invalid asset hash');
    assert.equal(sha256(await readFile(join(directory, filename))), hash, `Release asset identity differs: ${filename}`);
    assets[filename] = hash;
  }
  const files = archiveFiles(join(directory, 'package.tgz'));
  assert.equal(inspectArchive(files, sourceSha), version, 'Prepared package version differs');
  for (const filename of runtimeFiles) assert.equal(sha256(requiredFile(files, `dist/${filename}`)), assets[filename], 'Attached and packaged runtime identity differs');
  checkReport(directory, sourceSha, sha256(requiredFile(files, 'dist/gothic-lock-solver.mjs')));
  return { schemaVersion: 1, version, sourceSha, kind, assets };
}

const NPM_REGISTRY = 'https://registry.npmjs.org';
const PACKAGE = 'gothic-lock-solver';

export async function registryMetadata(version: string): Promise<Record<string, unknown> | null> {
  const response = await fetch(`${NPM_REGISTRY}/${PACKAGE}/${encodeURIComponent(version)}`, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  if (response.status === 404) return null;
  assert.ok(response.ok, `npm registry HTTP ${response.status}`);
  const value: unknown = await response.json();
  return record(value);
}

export async function publishNpm(directory: string, manifest: ReleaseManifest): Promise<void> {
  let metadata = await registryMetadata(manifest.version);
  if (metadata === null) {
    execFileSync('npm', [
      'publish', join(directory, 'package.tgz'),
      '--access', 'public',
      '--tag', manifest.kind === 'stable' ? 'latest' : 'canary',
      '--ignore-scripts', '--registry', `${NPM_REGISTRY}/`,
    ], { stdio: 'inherit' });
    metadata = await registryMetadata(manifest.version);
  }
  assert.ok(metadata && metadata['name'] === PACKAGE && metadata['version'] === manifest.version, 'Exact npm version unavailable');
  const url = record(metadata['dist'])['tarball'];
  assert.ok(typeof url === 'string' && url.startsWith(`${NPM_REGISTRY}/${PACKAGE}/-/`), 'Unexpected registry archive URL');
  const response = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  assert.ok(response.ok, `npm archive HTTP ${response.status}`);
  assert.equal(sha256(new Uint8Array(await response.arrayBuffer())), manifest.assets['package.tgz'], 'Published npm archive identity differs');
}

export async function verifyCdn(manifest: ReleaseManifest): Promise<void> {
  for (const filename of runtimeFiles) {
    const response = await fetch(`https://cdn.jsdelivr.net/npm/${PACKAGE}@${manifest.version}/dist/${filename}`, {
      headers: { Origin: 'https://example.com' }, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const scriptType = /(?:java|ecma)script/i.test(response.headers.get('content-type') ?? '');
    const crossOrigin = response.headers.get('access-control-allow-origin') === '*';
    assert.ok(response.ok && scriptType && crossOrigin, `CDN headers rejected: ${filename}`);
    assert.equal(sha256(new Uint8Array(await response.arrayBuffer())), manifest.assets[filename], `CDN identity differs: ${filename}`);
  }
}

function publicationContext(manifest: ReleaseManifest): void {
  const repository = environment('GITHUB_REPOSITORY');
  assert.ok(process.env['GITHUB_ACTIONS'] === 'true' && process.env['NPM_PUBLICATION_READY'] === 'true', 'Publication readiness is not configured');
  assert.equal(process.env['GITHUB_REF'], 'refs/heads/main', 'Publication requires main');
  assert.equal(process.env['GITHUB_WORKFLOW_REF'], `${repository}/.github/workflows/release.yml@refs/heads/main`, 'Publication requires the main release workflow');
  assert.equal(process.env['GITHUB_EVENT_NAME'], manifest.kind === 'stable' ? 'workflow_dispatch' : 'workflow_run', 'Release kind and trigger differ');
  assert.equal(execFileSync('npm', ['--version'], { encoding: 'utf8' }).trim(), '12.0.2', 'Unexpected npm version');
}

async function githubRecord(path: string): Promise<Record<string, unknown> | null> {
  const response = await fetch(`https://api.github.com/${path}`, {
    headers: { Authorization: `Bearer ${environment('GH_TOKEN')}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' }, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (response.status === 404) return null;
  assert.ok(response.ok, `GitHub HTTP ${response.status}`);
  const value: unknown = await response.json();
  return record(value);
}

function missingGithubAssets(value: unknown, expected: Readonly<Record<string, string>>): string[] {
  assert.ok(Array.isArray(value), 'Missing GitHub assets');
  const remaining = new Set(Object.keys(expected));
  for (const raw of value) {
    const asset = record(raw);
    const name = asset['name'];
    assert.ok(typeof name === 'string' && remaining.delete(name), 'Unexpected or duplicate GitHub asset');
    assert.equal(asset['digest'], `sha256:${expected[name]}`, 'GitHub asset identity differs');
  }
  return [...remaining];
}

async function githubRelease(repository: string, tag: string): Promise<Record<string, unknown> | null> {
  const [owner, name] = repository.split('/');
  const query = 'query($owner: String!, $name: String!, $tag: String!) { repository(owner: $owner, name: $name) { release(tagName: $tag) { databaseId } } }';
  // Exact GraphQL lookup includes drafts; the REST tag endpoint only serves published releases.
  const id: unknown = JSON.parse(execFileSync('gh', [
    'api', 'graphql', '-f', `query=${query}`,
    '-f', `owner=${owner}`, '-f', `name=${name}`, '-f', `tag=${tag}`,
    '--jq', '.data.repository.release.databaseId',
  ], { encoding: 'utf8' }));
  if (id === null) return null;
  assert.ok(typeof id === 'number' && Number.isSafeInteger(id) && id > 0, 'Invalid GitHub release ID');
  return githubRecord(`repos/${repository}/releases/${id}`);
}

export async function publishGithub(directory: string, manifest: ReleaseManifest, repository: string): Promise<void> {
  assert.ok(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository), 'Invalid repository');
  const tag = `v${manifest.version}`;
  const commitPath = `repos/${repository}/commits/refs/tags/${tag}`;
  let commit = await githubRecord(commitPath);
  if (commit === null) {
    execFileSync('gh', [
      'api', '--method', 'POST', `repos/${repository}/git/refs`,
      '-f', `ref=refs/tags/${tag}`, '-f', `sha=${manifest.sourceSha}`,
    ], { stdio: 'inherit' });
    commit = await githubRecord(commitPath);
  }
  assert.equal(commit?.['sha'], manifest.sourceSha, 'GitHub tag identifies different source');

  const expected: Record<string, string> = {
    ...manifest.assets,
    'release-manifest.json': sha256(await readFile(join(directory, 'release-manifest.json'))),
  };
  let release = await githubRelease(repository, tag);
  if (release === null) {
    execFileSync('gh', [
      'release', 'create', tag, ...Object.keys(expected).map(name => join(directory, name)),
      '--repo', repository, '--verify-tag', '--title', tag,
      '--notes-file', join(directory, 'release-notes.md'),
      ...(manifest.kind === 'canary' ? ['--prerelease'] : []),
      `--latest=${manifest.kind === 'stable'}`,
    ], { stdio: 'inherit' });
    release = await githubRelease(repository, tag);
  }
  assert.ok(release && typeof release['draft'] === 'boolean', 'GitHub release unavailable');
  assert.equal(release['prerelease'], manifest.kind === 'canary', 'GitHub release kind differs');
  const missing = missingGithubAssets(release['assets'], expected);
  if (release['draft']) {
    if (missing.length > 0) {
      execFileSync('gh', [
        'release', 'upload', tag, ...missing.map(name => join(directory, name)), '--repo', repository,
      ], { stdio: 'inherit' });
    }
    const updated = await githubRelease(repository, tag);
    assert.ok(updated && updated['draft'] === true, 'GitHub draft changed during completion');
    assert.equal(updated['prerelease'], manifest.kind === 'canary', 'GitHub release kind differs');
    assert.equal(missingGithubAssets(updated['assets'], expected).length, 0, 'GitHub draft is incomplete');
    execFileSync('gh', [
      'release', 'edit', tag, '--repo', repository, '--draft=false', `--latest=${manifest.kind === 'stable'}`,
    ], { stdio: 'inherit' });
    return;
  }
  assert.equal(missing.length, 0, 'Published GitHub release is incomplete');
}

async function main(): Promise<void> {
  const args = parseArgs({
    allowPositionals: true,
    options: {
      input: { type: 'string' },
      output: { type: 'string' },
      directory: { type: 'string' },
      version: { type: 'string' },
    },
  });
  assert.equal(args.positionals.length, 1, 'Expected prepare or publish');
  const sourceSha = environment('RELEASE_SOURCE_SHA');
  if (args.positionals[0] === 'prepare') {
    await prepareRelease({
      input: resolve(args.values.input ?? 'artifacts/build'),
      output: resolve(args.values.output ?? 'artifacts/release'),
      sourceSha,
      ...(args.values.version === undefined
        ? { runId: environment('CI_RUN_ID'), runAttempt: environment('CI_RUN_ATTEMPT') }
        : { version: args.values.version }),
    });
    return;
  }
  if (args.positionals[0] === 'publish') {
    const directory = resolve(args.values.directory ?? 'artifacts/release');
    const manifest = await checkRelease(directory, sourceSha);
    publicationContext(manifest);
    await publishNpm(directory, manifest);
    await verifyCdn(manifest);
    await publishGithub(directory, manifest, environment('GITHUB_REPOSITORY'));
    return;
  }
  throw new Error('Expected prepare or publish');
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
