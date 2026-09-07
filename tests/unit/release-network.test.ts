import { readFileSync, writeFileSync } from 'node:fs';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { releaseAssets, sha256, validateManifest } from '../../scripts/release-lib.ts';
import { completeGithubRelease, publishOrResumeNpm, registryMetadata, verifyCdn, verifyRegistry } from '../../scripts/release-network.ts';

const command = vi.hoisted(() => vi.fn<(file: string, args: readonly string[]) => string>());
vi.mock('node:child_process', () => ({ execFileSync: command }));
const fetchMock = vi.fn<typeof fetch>();
const archive = Buffer.from('exact prepared archive');
const assetBytes = (filename: string): Buffer => filename === 'package.tgz' ? archive : Buffer.from(`prepared ${filename}`);
const manifest = validateManifest({ schemaVersion: 1, name: 'gothic-lock-solver', version: '1.0.0', sourceSha: 'a'.repeat(40), kind: 'stable',
  tarballSha256: sha256(archive), assets: Object.fromEntries(releaseAssets.map(filename => [filename, sha256(assetBytes(filename))])) });
const metadata = { name: manifest.name, version: manifest.version, dist: { tarball: 'https://registry.npmjs.org/gothic-lock-solver/-/gothic-lock-solver-1.0.0.tgz' } };
const jsonResponse = (body: unknown): Response => new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });

beforeEach(() => { command.mockReset(); fetchMock.mockReset(); vi.stubGlobal('fetch', fetchMock); });
afterEach(() => { vi.unstubAllGlobals(); });

async function releaseDirectory(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'gothic-network-test-'));
  for (const filename of releaseAssets) await writeFile(join(directory, filename), assetBytes(filename));
  await writeFile(join(directory, 'release-manifest.json'), JSON.stringify(manifest));
  await writeFile(join(directory, 'release-notes.md'), 'Prepared release notes');
  return directory;
}

describe('npm and CDN delivery boundaries', () => {
  it('distinguishes an absent version from a registry outage', async () => {
    fetchMock.mockResolvedValueOnce(new Response('', { status: 404 }));
    expect(await registryMetadata('1.0.0')).toBeNull();
    fetchMock.mockResolvedValueOnce(new Response('', { status: 503 }));
    await expect(registryMetadata('1.0.0')).rejects.toThrow(/503/);
  });

  it('verifies an existing archive and rejects different bytes at the same version', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(metadata)).mockResolvedValueOnce(new Response(archive));
    await expect(verifyRegistry(manifest)).resolves.toBeUndefined();
    fetchMock.mockResolvedValueOnce(jsonResponse(metadata)).mockResolvedValueOnce(new Response('different archive'));
    await expect(verifyRegistry(manifest)).rejects.toThrow(/identity/);
  });

  it('publishes the one prepared archive only when the npm version is absent', async () => {
    const directory = await releaseDirectory();
    try {
      fetchMock.mockResolvedValue(new Response('', { status: 404 }));
      await publishOrResumeNpm(directory, manifest);
      expect(command).toHaveBeenCalledWith('npm', ['publish', join(directory, 'package.tgz'), '--access', 'public', '--tag', 'latest', '--provenance', '--ignore-scripts', '--registry', 'https://registry.npmjs.org/'], expect.objectContaining({ stdio: 'inherit' }));
    } finally { await rm(directory, { recursive: true, force: true }); }
  });

  it('resumes identical npm bytes without republishing and refuses different existing bytes', async () => {
    const directory = await releaseDirectory();
    try {
      fetchMock.mockResolvedValueOnce(jsonResponse(metadata)).mockResolvedValueOnce(jsonResponse(metadata)).mockResolvedValueOnce(new Response(archive));
      await publishOrResumeNpm(directory, manifest);
      expect(command).not.toHaveBeenCalled();
      fetchMock.mockResolvedValueOnce(jsonResponse(metadata)).mockResolvedValueOnce(jsonResponse(metadata)).mockResolvedValueOnce(new Response('changed'));
      await expect(publishOrResumeNpm(directory, manifest)).rejects.toThrow(/identity/);
      expect(command).not.toHaveBeenCalled();
    } finally { await rm(directory, { recursive: true, force: true }); }
  });

  it.each([
    { name: 'MIME type', type: 'text/plain', cors: '*', bytes: assetBytes('gothic-lock-solver.mjs'), error: /headers/ },
    { name: 'CORS', type: 'application/javascript', cors: 'https://elsewhere.test', bytes: assetBytes('gothic-lock-solver.mjs'), error: /headers/ },
    { name: 'runtime hash', type: 'application/javascript', cors: '*', bytes: Buffer.from('changed'), error: /identity/ },
  ])('rejects an invalid CDN $name', async ({ type, cors, bytes, error }) => {
    fetchMock.mockResolvedValue(new Response(bytes.toString('utf8'), { headers: { 'Content-Type': type, 'Access-Control-Allow-Origin': cors } }));
    await expect(verifyCdn(manifest)).rejects.toThrow(error);
  });
});

function mockGithub(directory: string, options: { draft: boolean; missing?: string; tagSha?: string; newer?: boolean; onSecondPage?: boolean }): void {
  const tag = `v${manifest.version}`;
  const filenames = [...releaseAssets, 'release-manifest.json'];
  const release = { tag_name: tag, draft: options.draft, prerelease: false, assets: filenames.filter(name => name !== options.missing).map(name => ({ name })) };
  command.mockImplementation((file, args) => {
    if (file !== 'gh') throw new Error('Unexpected executable');
    if (args[0] === 'api') {
      const endpoint = args[1] ?? '';
      if (endpoint.includes('matching-refs')) return JSON.stringify([{ ref: `refs/tags/${tag}` }]);
      if (endpoint.includes('/git/ref/tags/')) return JSON.stringify({ object: { type: 'commit', sha: options.tagSha ?? manifest.sourceSha } });
      if (endpoint.includes('releases?')) {
        const firstPage = options.onSecondPage ? Array.from({ length: 100 }, (_, index) => ({ tag_name: `v2.0.0-canary.${index}`, draft: false, prerelease: true })) : [release];
        const pages = [firstPage, ...(options.onSecondPage ? [[release]] : []), ...(options.newer ? [[{ tag_name: 'v1.1.0', draft: false, prerelease: false }]] : [])];
        return JSON.stringify(args.includes('--paginate') && args.includes('--slurp') ? pages : firstPage);
      }
      if (endpoint.includes('/releases/tags/')) return JSON.stringify(release);
    }
    if (args[0] === 'release' && args[1] === 'download') {
      const filename = args[args.indexOf('--pattern') + 1]; const destination = args[args.indexOf('--dir') + 1];
      if (!filename || !destination) throw new Error('Missing download arguments');
      writeFileSync(join(destination, filename), readFileSync(join(directory, filename)));
      return '';
    }
    if (args[0] === 'release' && ['upload', 'edit'].includes(args[1] ?? '')) return '';
    throw new Error(`Unexpected gh call: ${args.join(' ')}`);
  });
  fetchMock.mockResolvedValue(jsonResponse({ ...metadata, version: options.newer ? '1.1.0' : '1.0.0' }));
}

describe('GitHub partial-release recovery', () => {
  it('rejects an existing tag at a different commit before uploading or finalizing', async () => {
    const directory = await releaseDirectory();
    try {
      mockGithub(directory, { draft: true, tagSha: 'b'.repeat(40) });
      await expect(completeGithubRelease(directory, manifest, 'owner/repo')).rejects.toThrow(/tag/);
      expect(command.mock.calls.some(([, args]) => args[0] === 'release')).toBe(false);
    } finally { await rm(directory, { recursive: true, force: true }); }
  });

  it('uploads only missing draft assets and verifies downloads before finalizing', async () => {
    const directory = await releaseDirectory();
    try {
      mockGithub(directory, { draft: true, missing: 'benchmark-evidence.json' });
      await completeGithubRelease(directory, manifest, 'owner/repo');
      const uploads = command.mock.calls.filter(([, args]) => args[1] === 'upload');
      expect(uploads).toHaveLength(1);
      expect(uploads[0]?.[1]).toContain(join(directory, 'benchmark-evidence.json'));
      expect(command.mock.calls.some(([, args]) => args.includes('--clobber'))).toBe(false);
      expect(command.mock.calls.at(-1)?.[1]).toEqual(['release', 'edit', 'v1.0.0', '--repo', 'owner/repo', '--draft=false', '--latest=true']);
    } finally { await rm(directory, { recursive: true, force: true }); }
  });

  it('refuses to add missing assets to an already published release', async () => {
    const directory = await releaseDirectory();
    try {
      mockGithub(directory, { draft: false, missing: 'benchmark-evidence.json' });
      await expect(completeGithubRelease(directory, manifest, 'owner/repo')).rejects.toThrow(/Published release/);
      expect(command.mock.calls.some(([, args]) => args[1] === 'upload' || args[1] === 'edit')).toBe(false);
    } finally { await rm(directory, { recursive: true, force: true }); }
  });

  it('finishes an older draft while preserving the newer stable latest release', async () => {
    const directory = await releaseDirectory();
    try {
      mockGithub(directory, { draft: true, newer: true });
      await completeGithubRelease(directory, manifest, 'owner/repo');
      expect(command.mock.calls.at(-1)?.[1]).toContain('--latest=false');
    } finally { await rm(directory, { recursive: true, force: true }); }
  });

  it('resumes an existing release beyond the first 100 entries without duplicate creation', async () => {
    const directory = await releaseDirectory();
    try {
      mockGithub(directory, { draft: true, onSecondPage: true, newer: true });
      await completeGithubRelease(directory, manifest, 'owner/repo');
      expect(command.mock.calls.some(([, args]) => args[0] === 'release' && args[1] === 'create')).toBe(false);
      expect(command.mock.calls.at(-1)?.[1]).toContain('--latest=false');
    } finally { await rm(directory, { recursive: true, force: true }); }
  });
});
