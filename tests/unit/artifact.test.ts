import { afterEach, describe, expect, it, vi } from 'vitest';
import { findBenchmarkArtifact, findReleaseArtifact } from '../../.github/scripts/artifact.ts';

const repository = 'owner/repo';
const sha = 'a'.repeat(40);
const run = {
  id: 12, run_attempt: 2, path: '.github/workflows/ci.yml', head_sha: sha,
  status: 'completed', conclusion: 'success', event: 'push', head_branch: 'main',
  repository: { full_name: repository }, head_repository: { full_name: repository },
};

function mockApi(responses: readonly { status?: number; body: unknown }[]) {
  const pending = [...responses];
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
    const next = pending.shift();
    if (!next) throw new Error('Unexpected GitHub request');
    return new Response(JSON.stringify(next.body), { status: next.status ?? 200 });
  });
}

afterEach(() => vi.restoreAllMocks());

describe('CI report lookup for the exact target commit', () => {
  it('skips comparison when the target has no CI workflow or report', async () => {
    mockApi([{ status: 404, body: { message: 'Not Found' } }]);
    await expect(findBenchmarkArtifact(repository, sha)).resolves.toBeNull();
  });

  it('selects the report from the matching successful run and attempt', async () => {
    const api = mockApi([
      { body: { workflow_runs: [run] } },
      { body: { artifacts: [
        { id: 1, name: `benchmark-${sha}-1`, expired: false },
        { id: 2, name: `benchmark-${sha}-2`, expired: false },
      ] } },
    ]);
    await expect(findBenchmarkArtifact(repository, sha)).resolves.toEqual({ artifactId: 2, runId: 12, runAttempt: 2, sourceSha: sha });
    expect(String(api.mock.calls[0]?.[0])).toContain(`head_sha=${sha}`);
  });

  it('skips absent or expired reports without substituting another commit', async () => {
    mockApi([
      { body: { workflow_runs: [run, { ...run, head_sha: 'b'.repeat(40) }] } },
      { body: { artifacts: [{ id: 2, name: `benchmark-${sha}-2`, expired: true }] } },
    ]);
    await expect(findBenchmarkArtifact(repository, sha)).resolves.toBeNull();
  });

  it('continues through full run and artifact pages to find the exact target report', async () => {
    const pageSize = 100;
    const runsWithoutReports = Array.from({ length: pageSize }, (_, index) => ({ ...run, id: 1000 + index }));
    const otherArtifacts = Array.from({ length: pageSize }, (_, index) => ({ id: 2000 + index, name: `other-${index}`, expired: false }));
    const api = mockApi([
      { body: { workflow_runs: runsWithoutReports } },
      ...runsWithoutReports.map(() => ({ body: { artifacts: [] } })),
      { body: { workflow_runs: [run] } },
      { body: { artifacts: otherArtifacts } },
      { body: { artifacts: [{ id: 9, name: `benchmark-${sha}-2`, expired: false }] } },
    ]);

    await expect(findBenchmarkArtifact(repository, sha)).resolves.toEqual({ artifactId: 9, runId: 12, runAttempt: 2, sourceSha: sha });
    const requestedUrls = api.mock.calls.map(([url]) => String(url));
    expect(requestedUrls).toContain(`https://api.github.com/repos/${repository}/actions/workflows/ci.yml/runs?head_sha=${sha}&status=success&per_page=100&page=2`);
    expect(requestedUrls).toContain(`https://api.github.com/repos/${repository}/actions/runs/12/artifacts?per_page=100&page=2`);
  });

  it('uses an older successful run of the same SHA when the newest report expired', async () => {
    const olderRun = { ...run, id: 11, run_attempt: 1 };
    const api = mockApi([
      { body: { workflow_runs: [run, olderRun] } },
      { body: { artifacts: [{ id: 9, name: `benchmark-${sha}-2`, expired: true }] } },
      { body: { artifacts: [{ id: 8, name: `benchmark-${sha}-1`, expired: false }] } },
    ]);

    await expect(findBenchmarkArtifact(repository, sha)).resolves.toEqual({ artifactId: 8, runId: 11, runAttempt: 1, sourceSha: sha });
    expect(String(api.mock.calls.at(-1)?.[0])).toContain('/actions/runs/11/artifacts?');
  });

  it('does not hide access errors as a missing baseline', async () => {
    mockApi([{ status: 403, body: { message: 'Forbidden' } }]);
    await expect(findBenchmarkArtifact(repository, sha)).rejects.toThrow('403');
  });
});

describe('release selects only a tested main build', () => {
  it('selects an immutable build artifact by run ID', async () => {
    mockApi([
      { body: run },
      { body: { artifacts: [{ id: 9, name: `build-${sha}-2`, expired: false }] } },
    ]);
    await expect(findReleaseArtifact(repository, '12')).resolves.toEqual({ artifactId: 9, runId: 12, runAttempt: 2, sourceSha: sha });
  });

  it('accepts a workflow path qualified with its Git ref', async () => {
    mockApi([
      { body: { ...run, path: '.github/workflows/ci.yml@main' } },
      { body: { artifacts: [{ id: 9, name: `build-${sha}-2`, expired: false }] } },
    ]);
    await expect(findReleaseArtifact(repository, '12')).resolves.toEqual({ artifactId: 9, runId: 12, runAttempt: 2, sourceSha: sha });
  });

  it.each([
    { event: 'pull_request' }, { head_branch: 'feature' }, { conclusion: 'failure' },
    { path: '.github/workflows/another.yml' }, { head_repository: { full_name: 'fork/repo' } },
  ])('rejects an untrusted or unsuccessful source: %j', async (change) => {
    mockApi([{ body: { ...run, ...change } }]);
    await expect(findReleaseArtifact(repository, '12')).rejects.toThrow('successful main CI');
  });

  it('fails when the tested build expired instead of rebuilding it', async () => {
    mockApi([{ body: run }, { body: { artifacts: [] } }]);
    await expect(findReleaseArtifact(repository, '12')).rejects.toThrow('artifact is unavailable');
  });
});
