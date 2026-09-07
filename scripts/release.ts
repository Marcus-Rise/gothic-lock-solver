import { execFileSync } from 'node:child_process';
import { appendFile, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { assertReleaseSource, canaryVersion, record, string, type ReleaseKind } from './release-lib.ts';
import { prepareRelease, readJson, verifyPreparedRelease, type EvidenceAcceptance } from './release-files.ts';
import { completeGithubRelease, publishOrResumeNpm, recordDeliveryStatus, retryDelivery, verifyCdn, verifyRegistry } from './release-network.ts';

function env(name: string): string { return string(process.env[name], name); }

function workflowAcceptance(): EvidenceAcceptance {
  return { acceptedEvidenceSha256: process.env['PERFORMANCE_ACCEPTED_EVIDENCE_SHA256'] ?? '',
    acceptanceReason: process.env['PERFORMANCE_ACCEPTANCE_REASON'] ?? '' };
}

function kind(): ReleaseKind {
  const value = process.env['RELEASE_KIND'] ?? 'stable';
  if (value !== 'stable' && value !== 'canary') throw new Error('Invalid RELEASE_KIND');
  return value;
}

function requirePublicationContext(): void {
  if (process.env['NPM_PUBLICATION_READY'] !== 'true' || process.env['GITHUB_ACTIONS'] !== 'true') throw new Error('Publication readiness is not configured; prepare/verify are available locally');
  const repository = env('GITHUB_REPOSITORY');
  if (process.env['GITHUB_REF'] !== 'refs/heads/main' || process.env['GITHUB_WORKFLOW_REF'] !== `${repository}/.github/workflows/release.yml@refs/heads/main`) throw new Error('Privileged release code must come from the main workflow');
  assertReleaseSource(kind(), env('RELEASE_SOURCE_REF'), env('GITHUB_EVENT_NAME'), repository, env('RELEASE_SOURCE_REPOSITORY'));
}

const [command, ...args] = process.argv.slice(2);
const fields = new Map<string, string>();
for (let index = 0; index < args.length; index += 2) {
  const key = args[index]; const value = args[index + 1];
  if (!key || !value || !['--directory', '--benchmark-dir', '--source-sha'].includes(key) || fields.has(key)) throw new Error('Invalid release arguments');
  fields.set(key, value);
}
const directory = resolve(fields.get('--directory') ?? 'artifacts/release');

try {
  switch (command) {
    case 'canary-version': {
      const path = resolve('package.json'); const metadata = record(await readJson(path), 'package metadata');
      metadata['version'] = canaryVersion(string(metadata['version'], 'package version'), env('RELEASE_SOURCE_SHA'), env('GITHUB_RUN_ID'), env('GITHUB_RUN_ATTEMPT'));
      await writeFile(path, `${JSON.stringify(metadata, null, 2)}\n`);
      console.log(metadata['version']);
      break;
    }
    case 'prepare': {
      const sourceSha = fields.get('--source-sha') ?? execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
      const manifest = await prepareRelease({ root: process.cwd(), outputDir: directory,
        benchmarkDir: resolve(string(fields.get('--benchmark-dir'), '--benchmark-dir')), sourceSha, kind: kind(),
        ...workflowAcceptance() });
      console.log(JSON.stringify(manifest));
      if (process.env['GITHUB_OUTPUT']) await appendFile(process.env['GITHUB_OUTPUT'], `version=${manifest.version}\nsource-sha=${manifest.sourceSha}\n`);
      break;
    }
    case 'check': {
      console.log(JSON.stringify(await verifyPreparedRelease(directory, workflowAcceptance())));
      break;
    }
    case 'publish': {
      requirePublicationContext();
      const manifest = await verifyPreparedRelease(directory, workflowAcceptance());
      if (manifest.kind !== kind() || manifest.sourceSha !== env('RELEASE_SOURCE_SHA')) throw new Error('Prepared release does not match the verified workflow source');
      if (execFileSync('npm', ['--version'], { encoding: 'utf8' }).trim() !== '12.0.2') throw new Error('Expected pinned npm CLI 12.0.2');
      await publishOrResumeNpm(directory, manifest);
      break;
    }
    case 'verify': {
      const manifest = await verifyPreparedRelease(directory, workflowAcceptance());
      await retryDelivery(async () => { await verifyRegistry(manifest); await verifyCdn(manifest); });
      const { verifyCdnBrowsers } = await import('./release-browser.ts');
      await verifyCdnBrowsers(manifest);
      await recordDeliveryStatus(directory, 'registry-cdn-verified', 'Exact npm tarball and four CDN files verified; Chromium, Firefox and WebKit passed all 45 fixtures.');
      break;
    }
    case 'github': {
      requirePublicationContext();
      const manifest = await verifyPreparedRelease(directory, workflowAcceptance());
      if (manifest.kind !== kind() || manifest.sourceSha !== env('RELEASE_SOURCE_SHA')) throw new Error('Prepared GitHub release source mismatch');
      if (!execFileSync('gh', ['--version'], { encoding: 'utf8' }).startsWith('gh version 2.100.0 ')) throw new Error('Expected pinned GitHub CLI 2.100.0');
      const status = record(JSON.parse(await readFile(resolve(directory, 'delivery-status.json'), 'utf8')), 'delivery status');
      if (status['stage'] !== 'registry-cdn-verified') throw new Error('GitHub publication requires completed registry/CDN/browser verification');
      await completeGithubRelease(directory, manifest, env('GITHUB_REPOSITORY'));
      await recordDeliveryStatus(directory, 'complete', 'npm, CDN browser delivery and GitHub Release verified.');
      break;
    }
    default: throw new Error('Usage: node scripts/release.ts canary-version|prepare|check|publish|verify|github [--directory PATH] [--benchmark-dir PATH] [--source-sha SHA]');
  }
} catch (error) {
  const detail = error instanceof Error ? error.message : String(error);
  console.error(detail);
  if (['publish', 'verify', 'github'].includes(command ?? '')) {
    console.error('Release incomplete. npm may already contain this exact version; preserve prepared artifacts and rerun failed jobs. Never overwrite/unpublish to recover.');
    if (process.env['GITHUB_STEP_SUMMARY']) await appendFile(process.env['GITHUB_STEP_SUMMARY'], `\nRelease incomplete at ${command}. Preserve the prepared artifact and rerun failed jobs. Existing versions/assets are verified, never overwritten.\n`);
  }
  process.exitCode = 1;
}
