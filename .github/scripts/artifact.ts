import { appendFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const CI_WORKFLOW = '.github/workflows/ci.yml';
const PAGE_SIZE = 100;
const REQUEST_TIMEOUT_MS = 30_000;
const COMMIT_SHA = /^[a-f0-9]{40}$/;

interface CiArtifact {
  readonly artifactId: number;
  readonly runId: number;
  readonly runAttempt: number;
  readonly sourceSha: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function record(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) throw new Error('Invalid GitHub API object');
  return value;
}

function items(value: unknown, field: string): readonly Record<string, unknown>[] {
  const list = record(value)[field];
  if (!Array.isArray(list)) throw new Error(`Invalid GitHub API ${field}`);
  return list.map(record);
}

function positiveInteger(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1) {
    throw new Error('Invalid GitHub run/artifact identity');
  }
  return value;
}

async function request(repository: string, path: string): Promise<unknown> {
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository)) throw new Error('Invalid repository');
  const headers: Record<string, string> = { Accept: 'application/vnd.github+json' };
  const token = process.env['GH_TOKEN'];
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const response = await fetch(`https://api.github.com/repos/${repository}/${path}`, {
    headers,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`GitHub API HTTP ${response.status}`);
  const value: unknown = await response.json();
  return value;
}

function isSuccessfulCi(run: Record<string, unknown>, repository: string): boolean {
  const path = run['path'];
  const matchesWorkflow = typeof path === 'string'
    && (path === CI_WORKFLOW || path.startsWith(`${CI_WORKFLOW}@`));
  return matchesWorkflow
    && run['status'] === 'completed'
    && run['conclusion'] === 'success'
    && record(run['repository'])['full_name'] === repository
    && record(run['head_repository'])['full_name'] === repository;
}

async function artifactFromRun(
  repository: string,
  run: Record<string, unknown>,
  kind: 'benchmark' | 'build',
): Promise<CiArtifact | null> {
  const sourceSha = run['head_sha'];
  if (typeof sourceSha !== 'string' || !COMMIT_SHA.test(sourceSha)) throw new Error('Invalid CI source SHA');
  const runId = positiveInteger(run['id']);
  const attempt = positiveInteger(run['run_attempt']);
  const name = `${kind}-${sourceSha}-${attempt}`;
  for (let page = 1; ; page += 1) {
    const result = await request(repository, `actions/runs/${runId}/artifacts?per_page=${PAGE_SIZE}&page=${page}`);
    if (result === null) return null;
    const artifacts = items(result, 'artifacts');
    const artifact = artifacts.find(item => item['name'] === name && item['expired'] === false);
    if (artifact) {
      return {
        artifactId: positiveInteger(artifact['id']),
        runId,
        runAttempt: attempt,
        sourceSha,
      };
    }
    if (artifacts.length < PAGE_SIZE) return null;
  }
}

/** A missing report is a normal bootstrap/retention case; no source fallback. */
export async function findBenchmarkArtifact(repository: string, sha: string): Promise<CiArtifact | null> {
  if (!COMMIT_SHA.test(sha)) throw new Error('Invalid target SHA');
  for (let page = 1; ; page += 1) {
    const result = await request(repository, `actions/workflows/ci.yml/runs?head_sha=${sha}&status=success&per_page=${PAGE_SIZE}&page=${page}`);
    if (result === null) return null;
    const runs = items(result, 'workflow_runs');
    for (const run of runs) {
      if (run['head_sha'] !== sha || !isSuccessfulCi(run, repository)) continue;
      const artifact = await artifactFromRun(repository, run, 'benchmark');
      if (artifact) return artifact;
    }
    if (runs.length < PAGE_SIZE) return null;
  }
}

/** Release artifacts must come from an explicitly identified successful main CI. */
export async function findReleaseArtifact(repository: string, runId: string): Promise<CiArtifact> {
  if (!/^[1-9]\d*$/.test(runId)) throw new Error('Invalid CI run ID');
  const result = await request(repository, `actions/runs/${runId}`);
  const run = record(result);
  if (!isSuccessfulCi(run, repository) || run['event'] !== 'push' || run['head_branch'] !== 'main') {
    throw new Error('Release requires a successful main CI push in this repository');
  }
  const artifact = await artifactFromRun(repository, run, 'build');
  if (artifact === null) throw new Error('The tested build artifact is unavailable; run CI again');
  return artifact;
}

async function main(): Promise<void> {
  const [mode, identity, ...extra] = process.argv.slice(2);
  const repository = process.env['GITHUB_REPOSITORY'] ?? '';
  if ((mode !== 'baseline' && mode !== 'release') || identity === undefined || extra.length > 0) {
    throw new Error('Usage: node .github/scripts/artifact.ts baseline TARGET_SHA | release CI_RUN_ID');
  }
  // A manual CI run or a first branch push may have no previous target commit.
  const absentTarget = identity === '' || /^0{40}$/.test(identity);
  let artifact: CiArtifact | null = null;
  if (mode === 'release') {
    artifact = await findReleaseArtifact(repository, identity);
  } else if (!absentTarget) {
    artifact = await findBenchmarkArtifact(repository, identity);
  }
  const outputs = artifact === null
    ? { available: 'false' }
    : {
      available: 'true',
      'artifact-id': artifact.artifactId,
      'run-id': artifact.runId,
      'run-attempt': artifact.runAttempt,
      'source-sha': artifact.sourceSha,
    };
  if (process.env['GITHUB_OUTPUT']) {
    const text = Object.entries(outputs).map(([key, value]) => `${key}=${value}\n`).join('');
    await appendFile(process.env['GITHUB_OUTPUT'], text);
  }
  console.log(artifact ?? 'No report for the exact target SHA; comparison skipped.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
