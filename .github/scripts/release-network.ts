import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { setTimeout } from 'node:timers/promises';
import {
  assertDigest,
  CDN_ORIGIN,
  NPM_REGISTRY,
  PACKAGE_NAME,
  record,
  releaseAssets,
  runtimeFiles,
  sha256,
  shouldPromoteGithubLatest,
  string,
  type ReleaseManifest,
} from './release-lib.ts';

const REQUEST_TIMEOUT_MS = 30_000;
const DELIVERY_ATTEMPTS = 4;
const RETRY_DELAY_MS = 5_000;
const GITHUB_RESPONSE_LIMIT_BYTES = 16 * 1024 * 1024;
const RELEASES_PER_PAGE = 100;
const STABLE_RELEASE_TAG = /^v(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)$/;

export async function fetchBytes(url: string): Promise<Buffer> {
  const response = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${url}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

export async function registryMetadata(version: string): Promise<Record<string, unknown> | null> {
  const url = `${NPM_REGISTRY}/${PACKAGE_NAME}/${encodeURIComponent(version)}`;
  const response = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error(`npm registry HTTP ${response.status}`);
  }
  const metadata: unknown = await response.json();
  return record(metadata, 'npm metadata');
}

export async function verifyRegistry(manifest: ReleaseManifest): Promise<void> {
  const metadata = await registryMetadata(manifest.version);
  if (!metadata || metadata['name'] !== manifest.name || metadata['version'] !== manifest.version) {
    throw new Error('Exact npm version is not available');
  }
  const distribution = record(metadata['dist'], 'npm distribution');
  const tarballUrl = new URL(string(distribution['tarball'], 'npm tarball URL'));
  if (tarballUrl.origin !== NPM_REGISTRY || !tarballUrl.pathname.startsWith(`/${PACKAGE_NAME}/-/`)) {
    throw new Error('Unexpected npm tarball origin/path');
  }
  assertDigest(await fetchBytes(tarballUrl.href), manifest.tarballSha256, 'published npm tarball');
}

export async function publishOrResumeNpm(directory: string, manifest: ReleaseManifest): Promise<void> {
  const existing = await registryMetadata(manifest.version);
  if (existing) {
    await verifyRegistry(manifest);
    console.log(`Resuming identical npm ${manifest.version}; no publication was needed.`);
    return;
  }

  execFileSync('npm', [
    'publish', resolve(directory, 'package.tgz'),
    '--access', 'public',
    '--tag', manifest.kind === 'stable' ? 'latest' : 'canary',
    '--provenance',
    '--ignore-scripts',
    '--registry', `${NPM_REGISTRY}/`,
  ], { stdio: 'inherit' });
}

/** Registry/CDN propagation may lag publication. Never retry publication here. */
export async function retryDelivery(action: () => Promise<void>): Promise<void> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= DELIVERY_ATTEMPTS; attempt += 1) {
    try {
      await action();
      return;
    } catch (error) {
      lastError = error;
    }
    if (attempt < DELIVERY_ATTEMPTS) {
      await setTimeout(RETRY_DELAY_MS * attempt);
    }
  }
  throw lastError;
}

export async function verifyCdn(manifest: ReleaseManifest): Promise<void> {
  for (const filename of runtimeFiles) {
    const url = `${CDN_ORIGIN}/npm/${manifest.name}@${manifest.version}/dist/${filename}`;
    const response = await fetch(url, {
      headers: { Origin: 'https://example.com' },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const contentType = response.headers.get('content-type') ?? '';
    const allowsCrossOrigin = response.headers.get('access-control-allow-origin') === '*';
    if (!response.ok || !/(?:java|ecma)script/i.test(contentType) || !allowsCrossOrigin) {
      throw new Error(`CDN delivery headers/status rejected: ${filename}`);
    }
    const expectedHash = string(manifest.assets[filename], filename);
    assertDigest(Buffer.from(await response.arrayBuffer()), expectedHash, `CDN ${filename}`);
  }
}

function github(args: readonly string[]): string {
  return execFileSync('gh', [...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: GITHUB_RESPONSE_LIMIT_BYTES,
  });
}

function githubJson(args: readonly string[]): unknown {
  const value: unknown = JSON.parse(github(args));
  return value;
}

function ensureSourceTag(repository: string, tag: string, sourceSha: string): void {
  const matchingRefs = githubJson(['api', `repos/${repository}/git/matching-refs/tags/${tag}`]);
  if (!Array.isArray(matchingRefs)) {
    throw new Error('Invalid tag refs response');
  }
  const tagExists = matchingRefs.some(value => record(value, 'tag ref')['ref'] === `refs/tags/${tag}`);
  if (!tagExists) {
    github([
      'api', '--method', 'POST', `repos/${repository}/git/refs`,
      '-f', `ref=refs/tags/${tag}`,
      '-f', `sha=${sourceSha}`,
    ]);
  }

  // The commit endpoint resolves lightweight and annotated tags for us.
  const commit = record(githubJson(['api', `repos/${repository}/commits/refs/tags/${tag}`]), 'tag commit');
  if (commit['sha'] !== sourceSha) {
    throw new Error('Existing release tag does not identify the prepared source');
  }
}

function publishedReleases(repository: string): readonly Record<string, unknown>[] {
  const pages = githubJson([
    'api', `repos/${repository}/releases?per_page=${RELEASES_PER_PAGE}`,
    '--paginate', '--slurp',
  ]);
  if (!Array.isArray(pages)) {
    throw new Error('Invalid release pages response');
  }
  return pages.flatMap((page: unknown) => {
    if (!Array.isArray(page)) {
      throw new Error('Invalid releases page');
    }
    return page.map(value => record(value, 'GitHub release'));
  });
}

function uploadMissingAssets(
  directory: string,
  repository: string,
  tag: string,
  release: Record<string, unknown>,
): void {
  const assets = release['assets'];
  if (!Array.isArray(assets)) {
    throw new Error('Invalid GitHub assets');
  }
  const existingNames = new Set(assets.map(value => record(value, 'release asset')['name']));
  const expectedFiles = [...releaseAssets, 'release-manifest.json'];
  const missingFiles = expectedFiles.filter(filename => !existingNames.has(filename));
  if (missingFiles.length === 0) {
    return;
  }
  if (release['draft'] !== true) {
    throw new Error('Published release has a missing asset; refusing to mutate it');
  }
  github([
    'release', 'upload', tag,
    ...missingFiles.map(filename => join(directory, filename)),
    '--repo', repository,
  ]);
}

async function verifyGithubAssets(directory: string, repository: string, tag: string): Promise<void> {
  const temporary = await mkdtemp(join(tmpdir(), 'gothic-release-assets-'));
  const expectedFiles = [...releaseAssets, 'release-manifest.json'];
  try {
    github([
      'release', 'download', tag,
      '--repo', repository,
      ...expectedFiles.flatMap(filename => ['--pattern', filename]),
      '--dir', temporary,
    ]);
    for (const filename of expectedFiles) {
      const expectedBytes = await readFile(join(directory, filename));
      const downloadedBytes = await readFile(join(temporary, filename));
      assertDigest(downloadedBytes, sha256(expectedBytes), `GitHub ${filename}`);
    }
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}

function stableReleaseVersions(releases: readonly Record<string, unknown>[]): readonly string[] {
  return releases
    .filter(release => release['draft'] === false && release['prerelease'] === false)
    .map(release => string(release['tag_name'], 'release tag'))
    .filter(tag => STABLE_RELEASE_TAG.test(tag))
    .map(tag => tag.slice(1));
}

/** Resume partial drafts, but never overwrite existing npm versions or assets. */
export async function completeGithubRelease(
  directory: string,
  manifest: ReleaseManifest,
  repository: string,
): Promise<void> {
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) {
    throw new Error('Invalid repository');
  }
  const tag = `v${manifest.version}`;
  ensureSourceTag(repository, tag, manifest.sourceSha);

  const releases = publishedReleases(repository);
  const existing = releases.find(release => release['tag_name'] === tag);
  if (!existing) {
    github([
      'release', 'create', tag,
      '--repo', repository,
      '--verify-tag',
      '--target', manifest.sourceSha,
      '--draft',
      '--title', tag,
      '--notes-file', join(directory, 'release-notes.md'),
      ...(manifest.kind === 'canary' ? ['--prerelease', '--latest=false'] : []),
    ]);
  }

  const release = record(githubJson(['api', `repos/${repository}/releases/tags/${tag}`]), 'GitHub release');
  if (release['prerelease'] !== (manifest.kind === 'canary')) {
    throw new Error('Existing release kind differs');
  }
  uploadMissingAssets(directory, repository, tag, release);
  await verifyGithubAssets(directory, repository, tag);
  if (release['draft'] !== true) {
    return;
  }

  const npmMetadata = await registryMetadata('latest');
  const npmLatest = npmMetadata ? string(npmMetadata['version'], 'npm latest version') : null;
  const promoteLatest = shouldPromoteGithubLatest(manifest.kind, manifest.version, npmLatest, stableReleaseVersions(releases));
  github([
    'release', 'edit', tag,
    '--repo', repository,
    '--draft=false',
    `--latest=${promoteLatest}`,
  ]);
}

export async function recordDeliveryStatus(directory: string, stage: string, detail: string): Promise<void> {
  const status = { stage, detail, recordedAt: new Date().toISOString() };
  await writeFile(join(directory, 'delivery-status.json'), `${JSON.stringify(status, null, 2)}\n`);
}
