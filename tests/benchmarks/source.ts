import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, realpathSync, statSync } from 'node:fs';
import { basename, dirname, join, relative } from 'node:path';
import { validateManifest } from '../../.github/scripts/release-lib.ts';
import { git, jsonFile, sha256 } from './catalog.ts';
import { record, string } from './validation.ts';
import type { ModuleFormat } from './harness.ts';

export function hashFiles(directory: string, matches: (path: string) => boolean): Record<string, string> {
  const result: Record<string, string> = {};
  const visit = (path: string): void => {
    for (const entry of readdirSync(path, { withFileTypes: true })) {
      const full = join(path, entry.name);
      if (entry.isDirectory()) visit(full);
      else if (entry.isFile() && matches(full)) result[relative(directory, full)] = sha256(readFileSync(full));
      else if (entry.isSymbolicLink()) throw new Error(`Source symlink cannot establish immutable provenance: ${full}`);
    }
  };
  visit(directory);
  return Object.fromEntries(Object.entries(result).sort(([a], [b]) => a.localeCompare(b)));
}
export function revision(directory: string): string | null { try { return git(directory, ['rev-parse', 'HEAD']); } catch { return null; } }
function checkout(module: string): { root: string; revision: string; built: boolean } | null {
  const sourceRevision = revision(dirname(module));
  if (sourceRevision === null) return null;
  const root = realpathSync(git(dirname(module), ['rev-parse', '--show-toplevel']));
  const tracked = git(root, ['ls-files', '--', relative(root, module)]) !== '';
  const built = !tracked && relative(root, dirname(module)) === 'dist';
  return tracked || built ? { root, revision: sourceRevision, built } : null;
}
export function validateSource(value: unknown): Record<string, unknown> {
  const source = record(value, 'baseline source identity');
  if (!/^[0-9a-f]{40}$/.test(string(source['revision'], 'baseline source revision'))
      || !/^[0-9a-f]{64}$/.test(string(source['moduleSha256'], 'baseline source module hash'))
      || (source['format'] !== 'tuple' && source['format'] !== 'legacy')) throw new Error('Baseline source identity is missing or invalid.');
  return source;
}
function verifyReleaseSource(module: string, source: Record<string, unknown>): void {
  if (source['kind'] !== 'previous-stable-release') throw new Error('A module outside its own checkout requires verified release provenance.');
  const manifestPath = join(dirname(module), 'previous-release-manifest.json');
  const evidencePath = join(dirname(module), 'previous-benchmark-evidence.json');
  const manifestHash = sha256(readFileSync(manifestPath)); const evidenceHash = sha256(readFileSync(evidencePath));
  if (source['releaseManifestSha256'] !== manifestHash || source['releaseEvidenceSha256'] !== evidenceHash) throw new Error('Verified release manifest/evidence hash mismatch.');
  const manifest = validateManifest(jsonFile(manifestPath));
  const snapshot = record(record(jsonFile(evidencePath), 'previous release evidence')['qualitySnapshot'], 'previous release snapshot');
  const original = validateSource(snapshot['source']);
  if (manifest.kind !== 'stable' || manifest.version !== source['releaseVersion'] || manifest.sourceSha !== source['revision']
      || manifest.assets['gothic-lock-solver.mjs'] !== source['moduleSha256'] || manifest.assets['benchmark-evidence.json'] !== evidenceHash
      || original['revision'] !== source['revision'] || original['moduleSha256'] !== source['moduleSha256'] || original['format'] !== source['format']) {
    throw new Error('Verified release module, manifest and snapshot identities disagree.');
  }
}
export function inspectSource(modulePath: string, format: ModuleFormat, pinned?: Record<string, unknown>): Record<string, unknown> {
  const module = realpathSync(modulePath);
  if (!statSync(module).isFile()) throw new Error('Baseline module must be a regular file.');
  const moduleSha256 = sha256(readFileSync(module));
  const moduleTree = hashFiles(dirname(module), (path) => /\.(?:mjs|js|ts)$/.test(path));
  if (pinned !== undefined) {
    validateSource(pinned);
    if (pinned['moduleSha256'] !== moduleSha256 || pinned['format'] !== format) throw new Error('Baseline module hash or format differs from supplied source identity.');
    if (pinned['moduleTree'] !== undefined) assert.deepEqual(moduleTree, pinned['moduleTree'], 'Baseline source tree hash mismatch.');
  }
  const location = checkout(module);
  let buildManifestSha256: string | undefined;
  if (location === null) {
    if (pinned === undefined) throw new Error('Baseline requires an own Git checkout or a verified release snapshot with source identity.');
    verifyReleaseSource(module, pinned);
  } else {
    const { root, revision: sourceRevision } = location;
    if (pinned !== undefined && pinned['revision'] !== sourceRevision) throw new Error('Baseline revision differs from supplied source identity.');
    if (location.built) {
      const path = join(dirname(module), 'manifest.json');
      const manifest = record(jsonFile(path), 'baseline build manifest');
      if (manifest['schemaVersion'] !== 1 || manifest['package'] !== 'gothic-lock-solver') throw new Error('Unsupported baseline build manifest.');
      if (manifest['sourceSha'] !== sourceRevision) throw new Error('Baseline build manifest revision differs from checkout HEAD.');
      if (record(manifest['files'], 'baseline build checksums')[basename(module)] !== moduleSha256) throw new Error('Baseline build manifest module checksum mismatch.');
      buildManifestSha256 = sha256(readFileSync(path));
      if (pinned?.['buildManifestSha256'] !== undefined && pinned['buildManifestSha256'] !== buildManifestSha256) throw new Error('Baseline build manifest changed after snapshot generation.');
    }
    const paths = git(root, ['ls-files', '--', 'src', relative(root, module)]).split('\n').filter((path) => /\.(?:mjs|js|ts)$/.test(path));
    if (paths.length === 0) throw new Error('Baseline checkout has no tracked solver source.');
    const untracked = git(root, ['ls-files', '--others', '--', 'src']).split('\n').filter((path) => /\.(?:mjs|js|ts)$/.test(path));
    if (untracked.length > 0) throw new Error(`Baseline contains untracked source: ${untracked.join(', ')}`);
    // The supplied own checkout is the pin: no duplicated implementation or source manifest is needed.
    for (const path of paths) {
      if (sha256(readFileSync(join(root, path))) !== sha256(execFileSync('git', ['-C', root, 'show', `HEAD:${path}`]))) throw new Error(`Baseline source hash differs from pinned revision: ${path}`);
    }
  }
  return { ...pinned, revision: location?.revision ?? pinned?.['revision'], moduleSha256, format, moduleTree,
    ...(buildManifestSha256 === undefined ? {} : { buildManifestSha256 }) };
}
export function inspectComparisonBaseline(candidatePath: string, baselinePath: string, format: ModuleFormat, pinned?: Record<string, unknown>): Record<string, unknown> {
  const candidate = realpathSync(candidatePath); const baseline = realpathSync(baselinePath);
  if (candidate === baseline) throw new Error('Candidate and baseline must not be the same module.');
  const baselineCheckout = checkout(baseline);
  const candidateRevision = revision(dirname(candidate));
  if (baselineCheckout !== null && candidateRevision !== null) {
    const candidateRoot = realpathSync(git(dirname(candidate), ['rev-parse', '--show-toplevel']));
    if (baselineCheckout.root === candidateRoot) throw new Error('Baseline must not use the candidate checkout.');
    if (baselineCheckout.revision === candidateRevision) throw new Error('Baseline checkout must not use the candidate revision.');
  }
  // A release saved inside candidate/artifacts is independent only when its persisted release chain verifies.
  return inspectSource(baseline, format, pinned);
}
