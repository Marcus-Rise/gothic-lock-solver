import { describe, expect, it } from 'vitest';
import { assertDigest, assertReleaseSource, canaryVersion, parseReleaseVersion, previousStableVersion, shouldPromoteGithubLatest, validateManifest, validateEvidenceGate } from '../../.github/scripts/release-lib.ts';

describe('release identity and publication guards', () => {
  it('accepts stable SemVer and rejects aliases, leading zeros, and shell text', () => {
    expect(parseReleaseVersion('1.2.3')).toEqual({ version: '1.2.3', prerelease: false });
    for (const value of ['latest', 'v1.2.3', '01.2.3', '1.2', '1.2.3;true', '1.2.3-01']) {
      expect(() => parseReleaseVersion(value)).toThrow();
    }
  });

  it('makes canaries unique by immutable source and run attempt without a stable tag', () => {
    expect(canaryVersion('1.2.3', 'a'.repeat(40), '12', '2')).toBe('1.2.3-canary.12.2.aaaaaaaaaaaa');
    expect(parseReleaseVersion('1.2.3-canary.12.2.aaaaaaaaaaaa').prerelease).toBe(true);
    expect(() => canaryVersion('1.2.3-beta', 'a'.repeat(40), '12', '2')).toThrow();
    expect(() => canaryVersion('1.2.3', 'bad', '12', '2')).toThrow();
  });

  it('only permits stable source on a main push or explicit main resume', () => {
    expect(() => assertReleaseSource('stable', 'refs/heads/main', 'push', 'owner/repo', 'owner/repo')).not.toThrow();
    expect(() => assertReleaseSource('stable', 'refs/heads/main', 'workflow_dispatch', 'owner/repo', 'owner/repo')).not.toThrow();
    for (const [ref, event, source] of [
      ['refs/heads/feature', 'push', 'owner/repo'],
      ['refs/heads/main', 'pull_request', 'owner/repo'],
      ['refs/heads/main', 'push', 'fork/repo'],
    ]) expect(() => assertReleaseSource('stable', ref ?? '', event ?? '', 'owner/repo', source ?? '')).toThrow();
  });

  it('only permits manually requested canaries from the owner repository', () => {
    expect(() => assertReleaseSource('canary', 'refs/heads/feature', 'workflow_dispatch', 'owner/repo', 'owner/repo')).not.toThrow();
    expect(() => assertReleaseSource('canary', 'refs/heads/feature', 'push', 'owner/repo', 'owner/repo')).toThrow();
    expect(() => assertReleaseSource('canary', 'refs/pull/1/head', 'workflow_dispatch', 'owner/repo', 'owner/repo')).toThrow();
  });

  it('refuses to resume an existing npm version with different bytes', () => {
    expect(() => assertDigest(Buffer.from('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad', 'package')).not.toThrow();
    expect(() => assertDigest(Buffer.from('changed'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad', 'package')).toThrow(/identity/);
  });

  it('rejects unsafe manifest paths and incomplete runtime assets', () => {
    expect(() => validateManifest({ schemaVersion: 1, name: 'gothic-lock-solver', version: '1.0.0', sourceSha: 'a'.repeat(40), kind: 'stable', tarballSha256: 'a'.repeat(64), assets: { '../secret': 'a'.repeat(64) } })).toThrow();
    expect(() => validateManifest(null)).toThrow();
  });

  it('never silently accepts uncertain performance and never allows a quality regression', () => {
    const evidence = { schemaVersion: 1, quality: 'passed', performance: 'inconclusive', config: { lockCount: 45 }, memory: { performance: { verdict: 'passed' } } };
    expect(() => validateEvidenceGate(evidence, 'a'.repeat(64))).toThrow(/performance/);
    expect(() => validateEvidenceGate(evidence, 'a'.repeat(64), 'b'.repeat(64), 'reviewed')).toThrow(/performance/);
    expect(validateEvidenceGate(evidence, 'a'.repeat(64), 'a'.repeat(64), 'Reviewed shared-runner uncertainty.')).toBe('Reviewed shared-runner uncertainty.');
    expect(() => validateEvidenceGate({ ...evidence, quality: 'regression' }, 'a'.repeat(64), 'a'.repeat(64), 'reviewed')).toThrow(/quality/);
    expect(() => validateEvidenceGate({ ...evidence, performance: 'passed', config: { lockCount: 44 } }, 'a'.repeat(64))).toThrow(/45/);
  });

  it('selects the preceding stable release, excluding canaries and the version being resumed', () => {
    expect(previousStableVersion(['1.2.0', '1.10.0', '1.11.0-canary.1', '1.11.0', '2.0.0'], '1.11.0')).toBe('1.10.0');
    expect(previousStableVersion(['1.0.0-canary.1'], '1.0.0')).toBeNull();
    expect(previousStableVersion(['1.0.0'], '1.0.0-canary.5')).toBe('1.0.0');
  });

  it('resumes an older stable release without downgrading GitHub latest', () => {
    expect(shouldPromoteGithubLatest('stable', '1.0.0', '1.1.0', ['1.1.0'])).toBe(false);
    expect(shouldPromoteGithubLatest('stable', '1.0.0', '1.0.0', ['1.1.0'])).toBe(false);
    expect(shouldPromoteGithubLatest('stable', '1.1.0', '1.1.0', ['1.0.0'])).toBe(true);
    expect(shouldPromoteGithubLatest('canary', '1.2.0-canary.4', '1.1.0', ['1.1.0'])).toBe(false);
  });
});
