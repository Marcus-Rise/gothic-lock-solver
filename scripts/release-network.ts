import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { setTimeout } from 'node:timers/promises';
import { assertDigest, record, releaseAssets, runtimeFiles, sha256, shouldPromoteGithubLatest, string, type ReleaseManifest } from './release-lib.ts';

export async function fetchBytes(url: string): Promise<Buffer> {
  const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`);
  return Buffer.from(await response.arrayBuffer());
}

export async function registryMetadata(version: string): Promise<Record<string, unknown> | null> {
  const response = await fetch(`https://registry.npmjs.org/gothic-lock-solver/${encodeURIComponent(version)}`, { signal: AbortSignal.timeout(30_000) });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`npm registry HTTP ${response.status}`);
  const value: unknown = await response.json();
  return record(value, 'npm metadata');
}

export async function verifyRegistry(manifest: ReleaseManifest): Promise<void> {
  const metadata = await registryMetadata(manifest.version);
  if (!metadata || metadata['name'] !== manifest.name || metadata['version'] !== manifest.version) throw new Error('Exact npm version is not available');
  const tarballUrl = new URL(string(record(metadata['dist'], 'npm dist')['tarball'], 'npm tarball URL'));
  if (tarballUrl.origin !== 'https://registry.npmjs.org' || !tarballUrl.pathname.startsWith('/gothic-lock-solver/-/')) throw new Error('Unexpected npm tarball origin/path');
  assertDigest(await fetchBytes(tarballUrl.href), manifest.tarballSha256, 'published npm tarball');
}

export async function publishOrResumeNpm(directory: string, manifest: ReleaseManifest): Promise<void> {
  const existing = await registryMetadata(manifest.version);
  if (existing) {
    await verifyRegistry(manifest);
    await recordDeliveryStatus(directory, 'npm-existing-verified', 'Resuming exact existing npm bytes; no npm publish was invoked.');
  } else {
    await recordDeliveryStatus(directory, 'npm-publish-started', 'If publication succeeds and later delivery fails, rerun the failed jobs using this same prepared artifact.');
    execFileSync('npm', ['publish', resolve(directory, 'package.tgz'), '--access', 'public', '--tag', manifest.kind === 'stable' ? 'latest' : 'canary', '--provenance', '--ignore-scripts', '--registry', 'https://registry.npmjs.org/'], { stdio: 'inherit' });
    await recordDeliveryStatus(directory, 'npm-published-awaiting-verification', 'npm publication completed; registry/CDN and GitHub release remain pending.');
  }
}

/** Retries only delivery verification; publication is never retried here. */
export async function retryDelivery(action: () => Promise<void>): Promise<void> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try { await action(); return; } catch (error) { lastError = error; }
    if (attempt < 3) await setTimeout(5_000 * (attempt + 1));
  }
  throw lastError;
}

export async function verifyCdn(manifest: ReleaseManifest): Promise<void> {
  for (const filename of runtimeFiles) {
    const url = `https://cdn.jsdelivr.net/npm/${manifest.name}@${manifest.version}/dist/${filename}`;
    const response = await fetch(url, { headers: { Origin: 'https://example.com' }, signal: AbortSignal.timeout(30_000) });
    if (!response.ok || !/(?:java|ecma)script/i.test(response.headers.get('content-type') ?? '') || response.headers.get('access-control-allow-origin') !== '*') throw new Error(`CDN delivery headers/status rejected: ${filename}`);
    assertDigest(Buffer.from(await response.arrayBuffer()), string(manifest.assets[filename], filename), `CDN ${filename}`);
  }
}

function gh(args: readonly string[]): string {
  return execFileSync('gh', [...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 16 * 1024 * 1024 });
}

/** Uploads missing assets only. Existing npm versions and GitHub assets are immutable inputs. */
export async function completeGithubRelease(directory: string, manifest: ReleaseManifest, repository: string): Promise<void> {
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) throw new Error('Invalid repository');
  const tag = `v${manifest.version}`;
  // Create the exact tag explicitly: a draft release need not have materialized its tag yet.
  const matchingRefs: unknown = JSON.parse(gh(['api', `repos/${repository}/git/matching-refs/tags/${tag}`]));
  if (!Array.isArray(matchingRefs)) throw new Error('Invalid tag refs response');
  if (!matchingRefs.map(value => record(value, 'tag ref')).some(value => value['ref'] === `refs/tags/${tag}`)) {
    gh(['api', '--method', 'POST', `repos/${repository}/git/refs`, '-f', `ref=refs/tags/${tag}`, '-f', `sha=${manifest.sourceSha}`]);
  }
  const ref: unknown = JSON.parse(gh(['api', `repos/${repository}/git/ref/tags/${tag}`]));
  let object = record(record(ref, 'tag ref')['object'], 'tag object');
  for (let depth = 0; object['type'] === 'tag' && depth < 5; depth += 1) {
    const annotated: unknown = JSON.parse(gh(['api', `repos/${repository}/git/tags/${string(object['sha'], 'tag SHA')}`]));
    object = record(record(annotated, 'annotated tag')['object'], 'tag target');
  }
  if (object['type'] !== 'commit' || object['sha'] !== manifest.sourceSha) throw new Error('Existing release tag does not identify the prepared source');
  const releases: unknown = JSON.parse(gh(['api', `repos/${repository}/releases?per_page=100`]));
  if (!Array.isArray(releases)) throw new Error('Invalid releases response');
  const existing = releases.map(value => record(value, 'release')).find(value => value['tag_name'] === tag);
  if (!existing) {
    gh(['release', 'create', tag, '--repo', repository, '--verify-tag', '--target', manifest.sourceSha, '--draft', '--title', tag,
      '--notes-file', join(directory, 'release-notes.md'), ...(manifest.kind === 'canary' ? ['--prerelease', '--latest=false'] : [])]);
  }
  const release: unknown = JSON.parse(gh(['api', `repos/${repository}/releases/tags/${tag}`]));
  const releaseRecord = record(release, 'GitHub release');
  if (releaseRecord['prerelease'] !== (manifest.kind === 'canary')) throw new Error('Existing release kind differs');
  const assets = releaseRecord['assets'];
  if (!Array.isArray(assets)) throw new Error('Invalid GitHub assets');
  const expectedFiles = [...releaseAssets, 'release-manifest.json'];
  for (const filename of expectedFiles) {
    const expectedBytes = await readFile(join(directory, filename));
    const asset = assets.map(value => record(value, 'asset')).find(value => value['name'] === filename);
    if (!asset) {
      if (releaseRecord['draft'] !== true) throw new Error('Published release has a missing asset; refusing to mutate it');
      gh(['release', 'upload', tag, join(directory, filename), '--repo', repository]);
    }
    const temp = await mkdtemp(join(tmpdir(), 'gothic-release-asset-'));
    try {
      gh(['release', 'download', tag, '--repo', repository, '--pattern', filename, '--dir', temp]);
      assertDigest(await readFile(join(temp, filename)), sha256(expectedBytes), `GitHub ${filename}`);
    } finally { await rm(temp, { recursive: true, force: true }); }
  }
  if (releaseRecord['draft'] === true) {
    const npmLatest = await registryMetadata('latest');
    const publishedStableVersions = releases.map(value => record(value, 'published release')).filter(value => value['draft'] === false && value['prerelease'] === false)
      .map(value => string(value['tag_name'], 'release tag')).filter(value => /^v(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)$/.test(value)).map(value => value.slice(1));
    const latest = shouldPromoteGithubLatest(manifest.kind, manifest.version, npmLatest ? string(npmLatest['version'], 'npm latest version') : null, publishedStableVersions);
    gh(['release', 'edit', tag, '--repo', repository, '--draft=false', `--latest=${latest}`]);
  }
}

export async function recordDeliveryStatus(directory: string, stage: string, detail: string): Promise<void> {
  await writeFile(join(directory, 'delivery-status.json'), `${JSON.stringify({ stage, detail, recordedAt: new Date().toISOString() }, null, 2)}\n`);
}
