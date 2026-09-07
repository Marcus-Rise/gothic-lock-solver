import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { publishNpm, publishGithub, verifyCdn, registryMetadata, sha256, runtimeFiles, type ReleaseManifest } from '../../.github/scripts/release.ts';

const command = vi.hoisted(() => vi.fn<(file: string, args: readonly string[]) => string>());
vi.mock('node:child_process', () => ({ execFileSync: command }));
const fetchMock = vi.fn<typeof fetch>();
const archive = 'exact prepared archive';
const manifest: ReleaseManifest = { schemaVersion: 1, version: '1.2.3', sourceSha: 'a'.repeat(40), kind: 'stable',
  assets: { 'package.tgz': sha256(archive), ...Object.fromEntries(runtimeFiles.map(name => [name, sha256(name)])) } };
const metadata = { name: 'gothic-lock-solver', version: manifest.version, dist: { tarball: 'https://registry.npmjs.org/gothic-lock-solver/-/gothic-lock-solver-1.2.3.tgz' } };
const response = (value: unknown) => new Response(JSON.stringify(value), { headers: { 'content-type': 'application/json' } });
beforeEach(() => { command.mockReset(); fetchMock.mockReset(); vi.stubGlobal('fetch', fetchMock); });
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe('immutable npm and public CDN delivery', () => {
  it('distinguishes a missing npm version from a registry outage', async () => {
    fetchMock.mockResolvedValueOnce(new Response('', { status: 404 }));
    expect(await registryMetadata('1.2.3')).toBeNull();
    fetchMock.mockResolvedValueOnce(new Response('', { status: 503 }));
    await expect(registryMetadata('1.2.3')).rejects.toThrow(/503/);
  });
  it('publishes the prepared archive with the chosen dist-tag and verifies registry bytes', async () => {
    fetchMock.mockResolvedValueOnce(new Response('', { status: 404 })).mockResolvedValueOnce(response(metadata)).mockResolvedValueOnce(new Response(archive));
    await publishNpm('/prepared', manifest);
    expect(command).toHaveBeenCalledWith('npm', ['publish', '/prepared/package.tgz', '--access', 'public', '--tag', 'latest', '--ignore-scripts', '--registry', 'https://registry.npmjs.org/'], expect.objectContaining({ stdio: 'inherit' }));
  });
  it('resumes an identical npm version without overwriting it', async () => {
    fetchMock.mockResolvedValueOnce(response(metadata)).mockResolvedValueOnce(new Response(archive));
    await publishNpm('/prepared', manifest);
    expect(command).not.toHaveBeenCalled();
  });
  it('refuses different bytes under an existing npm version', async () => {
    fetchMock.mockResolvedValueOnce(response(metadata)).mockResolvedValueOnce(new Response('changed'));
    await expect(publishNpm('/prepared', manifest)).rejects.toThrow(/identity/i);
    expect(command).not.toHaveBeenCalled();
  });
  it('checks all five public CDN files against the tested bytes and browser delivery headers', async () => {
    fetchMock.mockImplementation(async input => {
      const filename = String(input).split('/').at(-1) ?? '';
      return new Response(filename, { headers: { 'content-type': 'application/javascript', 'access-control-allow-origin': '*' } });
    });
    await verifyCdn(manifest);
    expect(fetchMock).toHaveBeenCalledTimes(5);
  });
  it.each([
    { type: 'text/plain', cors: '*', bytes: 'gothic-lock-solver.mjs', error: /headers/ },
    { type: 'application/javascript', cors: 'https://elsewhere.test', bytes: 'gothic-lock-solver.mjs', error: /headers/ },
    { type: 'application/javascript', cors: '*', bytes: 'changed', error: /identity/ },
  ])('refuses bad CDN headers or bytes: $type/$cors/$bytes', async value => {
    fetchMock.mockResolvedValue(new Response(value.bytes, { headers: { 'content-type': value.type, 'access-control-allow-origin': value.cors } }));
    await expect(verifyCdn(manifest)).rejects.toThrow(value.error);
  });
});

describe('GitHub release identity', () => {
  it.each(['canary', 'stable'] as const)('attaches the verified assets and changes latest only for %s', async kind => {
    const directory = await mkdtemp(join(tmpdir(), 'gothic-github-'));
    try {
      vi.stubEnv('GH_TOKEN', 'unit-test-token');
      const chosen = { ...manifest, kind };
      const bytes = JSON.stringify(chosen);
      await writeFile(join(directory, 'release-manifest.json'), bytes);
      const assets = { ...chosen.assets, 'release-manifest.json': sha256(bytes) };
      const release = { draft: false, prerelease: kind === 'canary', assets: Object.entries(assets).map(([name, hash]) => ({ name, digest: `sha256:${hash}` })) };
      let created = false;
      fetchMock.mockImplementation(async input => {
        if (String(input).includes('/commits/')) return response({ sha: chosen.sourceSha });
        return created ? response(release) : new Response('', { status: 404 });
      });
      command.mockImplementation((file, args) => {
        expect(file).toBe('gh');
        if (args[0] === 'api' && args[1] === 'graphql') {
          expect(args).toContain('owner=owner');
          expect(args).toContain('name=repo');
          expect(args).toContain('tag=v1.2.3');
          return JSON.stringify(created ? 42 : null);
        }
        expect(args).toContain('--verify-tag');
        expect(args).toContain(`--latest=${kind === 'stable'}`);
        expect(args.includes('--prerelease')).toBe(kind === 'canary');
        for (const name of Object.keys(assets)) expect(args).toContain(join(directory, name));
        created = true;
        return '';
      });
      await publishGithub(directory, chosen, 'owner/repo');
      expect(created).toBe(true);
      command.mockClear();
      await publishGithub(directory, chosen, 'owner/repo');
      expect(command.mock.calls.every(([, args]) => args[0] === 'api' && args[1] === 'graphql')).toBe(true);
    } finally { await rm(directory, { recursive: true, force: true }); }
  });

  it('refuses an existing tag for another source before creating a release', async () => {
    vi.stubEnv('GH_TOKEN', 'unit-test-token');
    fetchMock.mockImplementation(async input => String(input).includes('/commits/') ? response({ sha: 'b'.repeat(40) }) : new Response('', { status: 404 }));
    await expect(publishGithub('/prepared', manifest, 'owner/repo')).rejects.toThrow(/source/i);
    expect(command).not.toHaveBeenCalled();
  });

  it.each(['canary', 'stable'] as const)('finishes a matching partial %s draft without overwriting uploaded assets', async kind => {
    const directory = await mkdtemp(join(tmpdir(), 'gothic-draft-'));
    try {
      vi.stubEnv('GH_TOKEN', 'unit-test-token');
      const chosen = { ...manifest, kind };
      const bytes = JSON.stringify(chosen);
      await writeFile(join(directory, 'release-manifest.json'), bytes);
      const hashes = { ...chosen.assets, 'release-manifest.json': sha256(bytes) };
      const complete = Object.entries(hashes).map(([name, hash]) => ({ name, digest: `sha256:${hash}` }));
      const missing = 'gothic-lock-solver.js';
      const release = { draft: true, prerelease: kind === 'canary', assets: complete.filter(asset => asset.name !== missing) };
      fetchMock.mockImplementation(async input => {
        const url = String(input);
        if (url.includes('/commits/')) return response({ sha: chosen.sourceSha });
        // The tag endpoint exposes published releases; drafts are read by ID.
        if (url.includes('/releases/tags/')) return new Response('', { status: 404 });
        expect(url).toBe('https://api.github.com/repos/owner/repo/releases/42');
        return response(release);
      });
      command.mockImplementation((file, args) => {
        expect(file).toBe('gh');
        if (args[0] === 'api' && args[1] === 'graphql') return '42';
        if (args[1] === 'upload') {
          expect(args).toEqual(['release', 'upload', 'v1.2.3', join(directory, missing), '--repo', 'owner/repo']);
          release.assets = complete;
          return '';
        }
        expect(args).toEqual(['release', 'edit', 'v1.2.3', '--repo', 'owner/repo', '--draft=false', `--latest=${kind === 'stable'}`]);
        expect(release.assets).toEqual(complete);
        release.draft = false;
        return '';
      });
      await publishGithub(directory, chosen, 'owner/repo');
      expect(release.draft).toBe(false);
      expect(release.assets).toEqual(complete);
    } finally { await rm(directory, { recursive: true, force: true }); }
  });

  it.each(['mismatched digest', 'unexpected name'])('refuses a draft with an %s before any upload or publication', async defect => {
    const directory = await mkdtemp(join(tmpdir(), 'gothic-draft-'));
    try {
      vi.stubEnv('GH_TOKEN', 'unit-test-token');
      await writeFile(join(directory, 'release-manifest.json'), JSON.stringify(manifest));
      const asset = defect === 'mismatched digest'
        ? { name: 'package.tgz', digest: `sha256:${'0'.repeat(64)}` }
        : { name: 'unexpected.js', digest: `sha256:${sha256('unexpected')}` };
      const release = { draft: true, prerelease: false, assets: [asset] };
      fetchMock.mockImplementation(async input => {
        const url = String(input);
        if (url.includes('/commits/')) return response({ sha: manifest.sourceSha });
        if (url.includes('/releases/tags/')) return new Response('', { status: 404 });
        return response(release);
      });
      command.mockImplementation((file, args) => {
        expect(file).toBe('gh');
        expect(args.slice(0, 2)).toEqual(['api', 'graphql']);
        return '42';
      });
      await expect(publishGithub(directory, manifest, 'owner/repo')).rejects.toThrow(/identity|Unexpected/);
      expect(command.mock.calls.every(([, args]) => args[0] === 'api' && args[1] === 'graphql')).toBe(true);
    } finally { await rm(directory, { recursive: true, force: true }); }
  });
});
