import { strict as assert } from 'node:assert';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFile, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const consumerNodes = new Set([process.execPath]);
const args = process.argv.slice(2);
for (let index = 0; index < args.length; index += 2) {
  const executable = args[index + 1];
  if (args[index] !== '--node' || executable === undefined || executable.length === 0) {
    throw new Error('Usage: pnpm verify:package [--node PATH]...');
  }
  consumerNodes.add(executable);
}

const root = fileURLToPath(new URL('../', import.meta.url));
const temporary = await mkdtemp(join(tmpdir(), 'gothic-package-consumer-'));
const artifacts = join(root, 'artifacts', 'package');
const destination = join(artifacts, 'package.tgz');
const checksumPath = join(artifacts, 'package.sha256');
const compiler = fileURLToPath(new URL('../node_modules/typescript/bin/tsc', import.meta.url));
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
function run(command: string, args: readonly string[], cwd = temporary): string {
  return execFileSync(command, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] });
}
try {
  await mkdir(artifacts, { recursive: true });
  // A failed fresh check must not leave a stale archive labeled verified.
  await rm(destination, { force: true });
  await rm(checksumPath, { force: true });
  run(npm, ['pack', '--json', '--ignore-scripts', '--pack-destination', temporary], root);
  const archives = (await readdir(temporary)).filter((name) => name.endsWith('.tgz'));
  const archive = archives[0];
  assert.equal(archives.length, 1, 'Pack must create exactly one tarball');
  assert.ok(archive);
  const archivePath = join(temporary, archive);
  await writeFile(join(temporary, 'package.json'), JSON.stringify({ name: 'gothic-clean-consumer', version: '1.0.0', private: true, type: 'module' }));
  run(npm, ['install', '--offline', '--ignore-scripts', '--no-audit', '--no-fund', archivePath]);
  const packageRoot = join(temporary, 'node_modules', 'gothic-lock-solver');
  const packageDist = join(packageRoot, 'dist');
  assert.deepEqual((await readdir(packageRoot)).sort(), ['LICENSE', 'README.md', 'dist', 'package.json']);
  const installedMetadata: unknown = JSON.parse(await readFile(join(packageRoot, 'package.json'), 'utf8'));
  const distributionManifest: unknown = JSON.parse(await readFile(join(packageDist, 'manifest.json'), 'utf8'));
  assert.ok(typeof installedMetadata === 'object' && installedMetadata !== null && 'version' in installedMetadata);
  assert.ok(typeof distributionManifest === 'object' && distributionManifest !== null && 'version' in distributionManifest && 'sourceSha' in distributionManifest);
  assert.equal(distributionManifest.version, installedMetadata.version, 'Build version is stale');
  assert.equal(distributionManifest.sourceSha, run('git', ['rev-parse', 'HEAD'], root).trim(), 'Build source SHA is stale');
  const repoDist = join(root, 'dist');
  const sourceFiles = (await readdir(repoDist)).sort();
  assert.deepEqual((await readdir(packageDist)).sort(), sourceFiles);
  for (const file of sourceFiles) assert.deepEqual(await readFile(join(packageDist, file)), await readFile(join(repoDist, file)), `Pack changed ${file}`);
  for (const file of ['consumer.mts', 'consumer.mjs', 'global-consumer.ts']) {
    await copyFile(join(root, 'tests', 'distribution', 'fixtures', file), join(temporary, file));
  }
  const rawConfig: unknown = JSON.parse(await readFile(join(root, 'tsconfig.json'), 'utf8'));
  assert.ok(typeof rawConfig === 'object' && rawConfig !== null && 'compilerOptions' in rawConfig);
  assert.ok(typeof rawConfig.compilerOptions === 'object' && rawConfig.compilerOptions !== null);
  await writeFile(join(temporary, 'tsconfig.json'), JSON.stringify({
    compilerOptions: { ...rawConfig.compilerOptions, types: [], lib: ['ES2022'], moduleDetection: 'legacy' },
    include: ['consumer.mts', 'global-consumer.ts'],
  }));
  run(process.execPath, [compiler, '--project', join(temporary, 'tsconfig.json')]);
  for (const executable of consumerNodes) {
    process.stdout.write(run(executable, [join(temporary, 'consumer.mjs')]));
  }
  // Reuse byte-preserving HTTP and isolated file consumers against installed
  // tarball files. Vite and source resolution are absent from these pages.
  execFileSync(process.execPath, [join(root, 'node_modules', 'playwright', 'cli.js'), 'test'], {
    cwd: root,
    env: { ...process.env, GOTHIC_DIST_DIRECTORY: packageDist },
    stdio: 'inherit',
  });
  await copyFile(archivePath, destination);
  const sha256 = createHash('sha256').update(await readFile(destination)).digest('hex');
  await writeFile(checksumPath, `${sha256}  package.tgz\n`);
  console.log(JSON.stringify({ verified: true, node: process.version, tarball: destination, sha256 }));
} finally {
  await rm(temporary, { recursive: true, force: true });
}
