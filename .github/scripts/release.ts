import { execFileSync } from 'node:child_process';
import { appendFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import {
  assertReleaseSource,
  canaryVersion,
  record,
  string,
  type ReleaseKind,
  type ReleaseManifest,
} from './release-lib.ts';
import {
  prepareRelease,
  readJson,
  verifyPreparedRelease,
  type EvidenceAcceptance,
} from './release-files.ts';
import {
  completeGithubRelease,
  publishOrResumeNpm,
  recordDeliveryStatus,
  retryDelivery,
  verifyCdn,
  verifyRegistry,
} from './release-network.ts';

const NPM_VERSION = '12.0.2';
const GITHUB_CLI_VERSION = '2.100.0';
const MAIN_REF = 'refs/heads/main';
const USAGE = 'Usage: node .github/scripts/release.ts canary-version|prepare|check|publish|verify|github [--directory PATH] [--benchmark-dir PATH] [--source-sha SHA]';

function environmentValue(name: string): string {
  return string(process.env[name], name);
}

function workflowAcceptance(): EvidenceAcceptance {
  return {
    acceptedEvidenceSha256: process.env['PERFORMANCE_ACCEPTED_EVIDENCE_SHA256'] ?? '',
    acceptanceReason: process.env['PERFORMANCE_ACCEPTANCE_REASON'] ?? '',
  };
}

function releaseKind(): ReleaseKind {
  const value = process.env['RELEASE_KIND'] ?? 'stable';
  if (value !== 'stable' && value !== 'canary') {
    throw new Error('Invalid RELEASE_KIND');
  }
  return value;
}

function requirePublicationContext(): void {
  if (process.env['NPM_PUBLICATION_READY'] !== 'true' || process.env['GITHUB_ACTIONS'] !== 'true') {
    throw new Error('Publication readiness is not configured; prepare/verify are available locally');
  }

  const repository = environmentValue('GITHUB_REPOSITORY');
  const expectedWorkflow = `${repository}/.github/workflows/release.yml@${MAIN_REF}`;
  if (process.env['GITHUB_REF'] !== MAIN_REF || process.env['GITHUB_WORKFLOW_REF'] !== expectedWorkflow) {
    throw new Error('Privileged release code must come from the main workflow');
  }
  assertReleaseSource(
    releaseKind(),
    environmentValue('RELEASE_SOURCE_REF'),
    environmentValue('GITHUB_EVENT_NAME'),
    repository,
    environmentValue('RELEASE_SOURCE_REPOSITORY'),
  );
}

function requirePreparedSource(manifest: ReleaseManifest): void {
  if (manifest.kind !== releaseKind() || manifest.sourceSha !== environmentValue('RELEASE_SOURCE_SHA')) {
    throw new Error('Prepared release does not match the verified workflow source');
  }
}

function parseReleaseArguments() {
  const parsed = parseArgs({
    allowPositionals: true,
    tokens: true,
    options: {
      directory: { type: 'string' },
      'benchmark-dir': { type: 'string' },
      'source-sha': { type: 'string' },
    },
  });
  if (parsed.positionals.length !== 1) {
    throw new Error(USAGE);
  }

  const suppliedOptions = new Set<string>();
  for (const token of parsed.tokens) {
    if (token.kind !== 'option') {
      continue;
    }
    if (!token.value) {
      throw new Error(`Empty release option: --${token.name}`);
    }
    if (suppliedOptions.has(token.name)) {
      throw new Error(`Repeated release option: --${token.name}`);
    }
    suppliedOptions.add(token.name);
  }
  return {
    command: parsed.positionals[0],
    directory: resolve(parsed.values.directory ?? 'artifacts/release'),
    benchmarkDirectory: parsed.values['benchmark-dir'],
    sourceSha: parsed.values['source-sha'],
  };
}

async function assignCanaryVersion(): Promise<void> {
  const path = resolve('package.json');
  const metadata = record(await readJson(path), 'package metadata');
  metadata['version'] = canaryVersion(
    string(metadata['version'], 'package version'),
    environmentValue('RELEASE_SOURCE_SHA'),
    environmentValue('GITHUB_RUN_ID'),
    environmentValue('GITHUB_RUN_ATTEMPT'),
  );
  await writeFile(path, `${JSON.stringify(metadata, null, 2)}\n`);
  console.log(metadata['version']);
}

async function publishPreparedRelease(directory: string): Promise<void> {
  requirePublicationContext();
  const manifest = await verifyPreparedRelease(directory, workflowAcceptance());
  requirePreparedSource(manifest);

  const npmVersion = execFileSync('npm', ['--version'], { encoding: 'utf8' }).trim();
  if (npmVersion !== NPM_VERSION) {
    throw new Error(`Expected pinned npm CLI ${NPM_VERSION}`);
  }
  await publishOrResumeNpm(directory, manifest);
}

async function verifyDelivery(directory: string): Promise<void> {
  const manifest = await verifyPreparedRelease(directory, workflowAcceptance());
  await retryDelivery(async () => {
    await verifyRegistry(manifest);
    await verifyCdn(manifest);
  });
  const { verifyCdnBrowsers } = await import('./release-browser.ts');
  await verifyCdnBrowsers(manifest);
  await recordDeliveryStatus(
    directory,
    'registry-cdn-verified',
    'Exact npm tarball and four CDN files verified; Chromium, Firefox and WebKit passed all 45 fixtures.',
  );
}

async function finalizeGithubRelease(directory: string): Promise<void> {
  requirePublicationContext();
  const manifest = await verifyPreparedRelease(directory, workflowAcceptance());
  requirePreparedSource(manifest);

  const githubVersion = execFileSync('gh', ['--version'], { encoding: 'utf8' });
  if (!githubVersion.startsWith(`gh version ${GITHUB_CLI_VERSION} `)) {
    throw new Error(`Expected pinned GitHub CLI ${GITHUB_CLI_VERSION}`);
  }
  const status = record(await readJson(resolve(directory, 'delivery-status.json')), 'delivery status');
  if (status['stage'] !== 'registry-cdn-verified') {
    throw new Error('GitHub publication requires completed registry/CDN/browser verification');
  }
  await completeGithubRelease(directory, manifest, environmentValue('GITHUB_REPOSITORY'));
  await recordDeliveryStatus(directory, 'complete', 'npm, CDN browser delivery and GitHub Release verified.');
}

async function runReleaseCommand(): Promise<void> {
  const { command, directory, benchmarkDirectory, sourceSha } = parseReleaseArguments();
  switch (command) {
    case 'canary-version':
      await assignCanaryVersion();
      return;
    case 'prepare': {
      const revision = sourceSha ?? execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
      const manifest = await prepareRelease({
        root: process.cwd(),
        outputDir: directory,
        benchmarkDir: resolve(string(benchmarkDirectory, '--benchmark-dir')),
        sourceSha: revision,
        kind: releaseKind(),
        ...workflowAcceptance(),
      });
      console.log(JSON.stringify(manifest));
      const outputPath = process.env['GITHUB_OUTPUT'];
      if (outputPath) {
        await appendFile(outputPath, `version=${manifest.version}\nsource-sha=${manifest.sourceSha}\n`);
      }
      return;
    }
    case 'check':
      console.log(JSON.stringify(await verifyPreparedRelease(directory, workflowAcceptance())));
      return;
    case 'publish':
      await publishPreparedRelease(directory);
      return;
    case 'verify':
      await verifyDelivery(directory);
      return;
    case 'github':
      await finalizeGithubRelease(directory);
      return;
    default:
      throw new Error(USAGE);
  }
}

try {
  await runReleaseCommand();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  const command = process.argv[2];
  if (command === 'publish' || command === 'verify' || command === 'github') {
    const recovery = 'Release incomplete. Preserve the prepared artifacts and rerun failed jobs. Existing npm versions and assets are verified, never overwritten.';
    console.error(recovery);
    const summaryPath = process.env['GITHUB_STEP_SUMMARY'];
    if (summaryPath) {
      await appendFile(summaryPath, `\n${recovery}\n`);
    }
  }
  process.exitCode = 1;
}
