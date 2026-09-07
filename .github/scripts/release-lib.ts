import { createHash } from 'node:crypto';

export const PACKAGE_NAME = 'gothic-lock-solver';
export const REQUIRED_LOCK_COUNT = 45;
export const NPM_REGISTRY = 'https://registry.npmjs.org';
export const CDN_ORIGIN = 'https://cdn.jsdelivr.net';

const COMMIT_SHA = /^[a-f0-9]{40}$/;
const SHA256 = /^[a-f0-9]{64}$/;
const POSITIVE_INTEGER = /^[1-9]\d*$/;
const VERSION = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;
const CANARY_SHA_LENGTH = 12;

export const runtimeFiles = [
  'gothic-lock-solver.mjs',
  'gothic-lock-solver.min.mjs',
  'gothic-lock-solver.js',
  'gothic-lock-solver.min.js',
] as const;

export const executableFiles = [...runtimeFiles, 'gothic-lock-solver.cli.mjs'] as const;
export const releaseAssets = [
  ...executableFiles,
  'benchmark-evidence.json',
  'benchmark.json',
  'benchmark.md',
  'package.tgz',
] as const;

export type ReleaseKind = 'stable' | 'canary';

export interface ReleaseManifest {
  readonly schemaVersion: 1;
  readonly name: typeof PACKAGE_NAME;
  readonly version: string;
  readonly sourceSha: string;
  readonly kind: ReleaseKind;
  readonly tarballSha256: string;
  readonly assets: Readonly<Record<string, string>>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function record(value: unknown, context: string): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new Error(`Invalid ${context}`);
  }
  return value;
}

export function string(value: unknown, context: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Invalid ${context}`);
  }
  return value;
}

export function sha256(value: Uint8Array | string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function assertDigest(bytes: Uint8Array, expected: string, context: string): void {
  if (!SHA256.test(expected) || sha256(bytes) !== expected) {
    throw new Error(`${context} identity mismatch; existing versions/assets must never be overwritten`);
  }
}

export function parseReleaseVersion(version: string): { version: string; prerelease: boolean } {
  const match = VERSION.exec(version);
  const prerelease = match?.[4];
  const hasLeadingZero = prerelease?.split('.').some(part => /^0\d+$/.test(part));
  if (match === null || hasLeadingZero) {
    throw new Error(`Invalid release SemVer: ${version}`);
  }
  return { version, prerelease: prerelease !== undefined };
}

export function canaryVersion(base: string, sourceSha: string, runId: string, attempt: string): string {
  const validRun = POSITIVE_INTEGER.test(runId) && POSITIVE_INTEGER.test(attempt);
  if (parseReleaseVersion(base).prerelease || !COMMIT_SHA.test(sourceSha) || !validRun) {
    throw new Error('Canary requires stable base version, source SHA and positive run identifiers');
  }
  return `${base}-canary.${runId}.${attempt}.${sourceSha.slice(0, CANARY_SHA_LENGTH)}`;
}

function compareStableVersions(left: string, right: string): number {
  const [leftMajor, leftMinor, leftPatch] = left.split('.').map(BigInt);
  const [rightMajor, rightMinor, rightPatch] = right.split('.').map(BigInt);
  const components = [
    [leftMajor, rightMajor],
    [leftMinor, rightMinor],
    [leftPatch, rightPatch],
  ] as const;

  for (const [first, second] of components) {
    if (first === undefined || second === undefined) {
      throw new Error('Missing version component');
    }
    if (first !== second) {
      return first < second ? -1 : 1;
    }
  }
  return 0;
}

export function previousStableVersion(versions: readonly string[], current: string): string | null {
  const currentIsCanary = parseReleaseVersion(current).prerelease;
  const currentBase = string(current.split('-')[0], 'current version base');
  let previous: string | null = null;

  for (const version of versions) {
    if (parseReleaseVersion(version).prerelease) {
      continue;
    }
    const comparedWithCurrent = compareStableVersions(version, currentBase);
    const isEligible = comparedWithCurrent < 0 || (currentIsCanary && comparedWithCurrent === 0);
    if (isEligible && (previous === null || compareStableVersions(version, previous) > 0)) {
      previous = version;
    }
  }
  return previous;
}

export function shouldPromoteGithubLatest(
  kind: ReleaseKind,
  version: string,
  npmLatest: string | null,
  publishedStableVersions: readonly string[],
): boolean {
  if (kind !== 'stable' || version !== npmLatest) {
    return false;
  }
  if (parseReleaseVersion(version).prerelease) {
    throw new Error('Stable latest must be a stable version');
  }
  return !publishedStableVersions.some(published => compareStableVersions(published, version) > 0);
}

export function assertReleaseSource(
  kind: ReleaseKind,
  ref: string,
  event: string,
  repository: string,
  sourceRepository: string,
): void {
  if (!repository || repository !== sourceRepository || !ref.startsWith('refs/heads/')) {
    throw new Error('Release must use a branch in the owner repository');
  }
  const stableEvent = event === 'push' || event === 'workflow_dispatch';
  if (kind === 'stable' && (ref !== 'refs/heads/main' || !stableEvent)) {
    throw new Error('Stable releases require main push or explicit main resume');
  }
  if (kind === 'canary' && event !== 'workflow_dispatch') {
    throw new Error('Canaries require workflow_dispatch');
  }
}

export function validateManifest(value: unknown): ReleaseManifest {
  const input = record(value, 'release manifest');
  if (input['schemaVersion'] !== 1 || input['name'] !== PACKAGE_NAME) {
    throw new Error('Unsupported release manifest');
  }

  const version = string(input['version'], 'version');
  const sourceSha = string(input['sourceSha'], 'source SHA');
  const kind = input['kind'];
  const tarballSha256 = string(input['tarballSha256'], 'tarball hash');
  if (!COMMIT_SHA.test(sourceSha) || !SHA256.test(tarballSha256) || (kind !== 'stable' && kind !== 'canary')) {
    throw new Error('Invalid release identity');
  }
  if (parseReleaseVersion(version).prerelease !== (kind === 'canary')) {
    throw new Error('Release kind and version disagree');
  }

  const rawAssets = record(input['assets'], 'asset hashes');
  if (Object.keys(rawAssets).length !== releaseAssets.length) {
    throw new Error('Incomplete or unexpected release assets');
  }
  const assets: Record<string, string> = {};
  for (const filename of releaseAssets) {
    const hash = string(rawAssets[filename], `hash for ${filename}`);
    if (!SHA256.test(hash)) {
      throw new Error(`Invalid asset hash: ${filename}`);
    }
    assets[filename] = hash;
  }
  if (assets['package.tgz'] !== tarballSha256) {
    throw new Error('Tarball hash disagrees with asset manifest');
  }

  return { schemaVersion: 1, name: PACKAGE_NAME, version, sourceSha, kind, tarballSha256, assets };
}

export function validateEvidenceGate(
  value: unknown,
  evidenceSha256: string,
  acceptedSha256 = '',
  acceptanceReason = '',
): string | null {
  const evidence = record(value, 'benchmark evidence');
  if (evidence['schemaVersion'] !== 1 || evidence['quality'] !== 'passed') {
    throw new Error('Release requires passed benchmark quality');
  }
  const config = record(evidence['config'], 'benchmark config');
  if (config['lockCount'] !== REQUIRED_LOCK_COUNT) {
    throw new Error(`Release requires all ${REQUIRED_LOCK_COUNT} fixtures`);
  }

  const memory = record(evidence['memory'], 'memory evidence');
  const memoryPerformance = record(memory['performance'], 'memory performance');
  const memoryVerdict = string(memoryPerformance['verdict'], 'memory performance verdict');
  const timingVerdict = string(evidence['performance'], 'timing performance verdict');
  const allowedVerdicts = ['passed', 'inconclusive', 'regression'];
  if (!allowedVerdicts.includes(timingVerdict) || !allowedVerdicts.includes(memoryVerdict)) {
    throw new Error('Unknown performance verdict');
  }
  if (timingVerdict === 'passed' && memoryVerdict === 'passed') {
    return null;
  }

  const exactEvidenceAccepted = SHA256.test(evidenceSha256) && acceptedSha256 === evidenceSha256;
  if (!exactEvidenceAccepted || acceptanceReason.trim().length === 0) {
    throw new Error('Release performance needs a passed result or explicit acceptance of this exact evidence SHA with a reason');
  }
  return acceptanceReason;
}
