import { createHash } from 'node:crypto';

export const runtimeFiles = ['gothic-lock-solver.mjs', 'gothic-lock-solver.min.mjs', 'gothic-lock-solver.js', 'gothic-lock-solver.min.js'] as const;
export const releaseAssets = [...runtimeFiles, 'gothic-lock-solver.cli.mjs', 'benchmark-evidence.json', 'benchmark.json', 'benchmark.md', 'package.tgz'] as const;
export type ReleaseKind = 'stable' | 'canary';

export interface ReleaseManifest {
  readonly schemaVersion: 1;
  readonly name: 'gothic-lock-solver';
  readonly version: string;
  readonly sourceSha: string;
  readonly kind: ReleaseKind;
  readonly tarballSha256: string;
  readonly assets: Readonly<Record<string, string>>;
}

export function record(value: unknown, context: string): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new Error(`Invalid ${context}`);
  return Object.fromEntries(Object.entries(value));
}

export function string(value: unknown, context: string): string {
  if (typeof value !== 'string' || value.length === 0) throw new Error(`Invalid ${context}`);
  return value;
}

export function sha256(value: Uint8Array | string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function assertDigest(bytes: Uint8Array, expected: string, context: string): void {
  if (!/^[a-f0-9]{64}$/.test(expected) || sha256(bytes) !== expected) throw new Error(`${context} identity mismatch; existing versions/assets must never be overwritten`);
}

export function parseReleaseVersion(version: string): { version: string; prerelease: boolean } {
  const match = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/.exec(version);
  if (!match || match[4]?.split('.').some(part => /^\d+$/.test(part) && part.length > 1 && part.startsWith('0'))) throw new Error(`Invalid release SemVer: ${version}`);
  return { version, prerelease: match[4] !== undefined };
}

export function canaryVersion(base: string, sourceSha: string, runId: string, attempt: string): string {
  if (parseReleaseVersion(base).prerelease || !/^[a-f0-9]{40}$/.test(sourceSha) || !/^[1-9]\d*$/.test(runId) || !/^[1-9]\d*$/.test(attempt)) throw new Error('Canary requires stable base version, source SHA and positive run identifiers');
  return `${base}-canary.${runId}.${attempt}.${sourceSha.slice(0, 12)}`;
}

export function previousStableVersion(versions: readonly string[], current: string): string | null {
  const currentIsCanary = parseReleaseVersion(current).prerelease;
  const compare = (left: string, right: string): number => {
    const a = left.split('.')[Symbol.iterator](); const b = right.split('.')[Symbol.iterator]();
    for (let index = 0; index < 3; index += 1) {
      const first = BigInt(string(a.next().value, 'version component'));
      const second = BigInt(string(b.next().value, 'version component'));
      if (first !== second) return first < second ? -1 : 1;
    }
    return 0;
  };
  const base = current.split('-')[0];
  if (base === undefined) throw new Error('Missing version base');
  return versions.filter(version => !parseReleaseVersion(version).prerelease && compare(version, base) < (currentIsCanary ? 1 : 0)).sort(compare).at(-1) ?? null;
}

export function shouldPromoteGithubLatest(kind: ReleaseKind, version: string, npmLatest: string | null, publishedStableVersions: readonly string[]): boolean {
  if (kind !== 'stable' || version !== npmLatest) return false;
  if (parseReleaseVersion(version).prerelease) throw new Error('Stable latest must be a stable version');
  return !publishedStableVersions.some(published => previousStableVersion([version], published) === version);
}

export function assertReleaseSource(kind: ReleaseKind, ref: string, event: string, repository: string, sourceRepository: string): void {
  if (!repository || repository !== sourceRepository || !ref.startsWith('refs/heads/')) throw new Error('Release must use a branch in the owner repository');
  if (kind === 'stable' && (ref !== 'refs/heads/main' || !['push', 'workflow_dispatch'].includes(event))) throw new Error('Stable releases require main push or explicit main resume');
  if (kind === 'canary' && event !== 'workflow_dispatch') throw new Error('Canaries require workflow_dispatch');
}

export function validateManifest(value: unknown): ReleaseManifest {
  const input = record(value, 'release manifest');
  if (input['schemaVersion'] !== 1 || input['name'] !== 'gothic-lock-solver') throw new Error('Unsupported release manifest');
  const version = string(input['version'], 'version');
  const sourceSha = string(input['sourceSha'], 'source SHA');
  const kind = input['kind'];
  const tarballSha256 = string(input['tarballSha256'], 'tarball hash');
  if (!/^[a-f0-9]{40}$/.test(sourceSha) || !/^[a-f0-9]{64}$/.test(tarballSha256) || (kind !== 'stable' && kind !== 'canary')) throw new Error('Invalid release identity');
  if (parseReleaseVersion(version).prerelease !== (kind === 'canary')) throw new Error('Release kind and version disagree');
  const rawAssets = record(input['assets'], 'asset hashes');
  if (Object.keys(rawAssets).length !== releaseAssets.length) throw new Error('Incomplete or unexpected release assets');
  const assets: Record<string, string> = {};
  for (const filename of releaseAssets) {
    const hash = string(rawAssets[filename], `hash for ${filename}`);
    if (!/^[a-f0-9]{64}$/.test(hash)) throw new Error(`Invalid asset hash: ${filename}`);
    assets[filename] = hash;
  }
  if (assets['package.tgz'] !== tarballSha256) throw new Error('Tarball hash disagrees with asset manifest');
  return { schemaVersion: 1, name: 'gothic-lock-solver', version, sourceSha, kind, tarballSha256, assets };
}

export function validateEvidenceGate(value: unknown, evidenceSha256: string, acceptedSha256 = '', acceptanceReason = ''): string | null {
  const evidence = record(value, 'benchmark evidence');
  if (evidence['schemaVersion'] !== 1 || evidence['quality'] !== 'passed') throw new Error('Release requires passed benchmark quality');
  if (record(evidence['config'], 'benchmark config')['lockCount'] !== 45) throw new Error('Release requires all 45 fixtures');
  const memory = record(evidence['memory'], 'memory evidence');
  const memoryVerdict = record(memory['performance'], 'memory performance')['verdict'];
  const timing = evidence['performance'];
  if (![timing, memoryVerdict].every(verdict => ['passed', 'inconclusive', 'regression'].includes(string(verdict, 'performance verdict')))) throw new Error('Unknown performance verdict');
  if (timing === 'passed' && memoryVerdict === 'passed') return null;
  if (!/^[a-f0-9]{64}$/.test(evidenceSha256) || acceptedSha256 !== evidenceSha256 || acceptanceReason.trim().length === 0) throw new Error('Release performance needs a passed result or explicit acceptance of this exact evidence SHA with a reason');
  return acceptanceReason;
}
