import { createHash } from 'node:crypto';
import { builtinModules } from 'node:module';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';

const root = fileURLToPath(new URL('../../', import.meta.url));
const dist = new URL('../../dist/', import.meta.url);
await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
for (const mode of ['readable', 'minified']) {
  await build({ root, configFile: fileURLToPath(new URL('../../vite.config.ts', import.meta.url)), mode });
}
await build({
  root, configFile: false, build: {
    target: 'node22', outDir: 'dist', emptyOutDir: false, minify: false, sourcemap: false,
    lib: { entry: fileURLToPath(new URL('../../src/cli.ts', import.meta.url)), formats: ['es'], fileName: () => 'gothic-lock-solver.cli.mjs' },
    rolldownOptions: { external: [...builtinModules, ...builtinModules.map((name) => `node:${name}`)], output: { codeSplitting: false, comments: { legal: false } } },
  },
});
execFileSync(process.execPath, [fileURLToPath(new URL('../../node_modules/typescript/bin/tsc', import.meta.url)), '-p', 'tsconfig.build.json'], { cwd: root, stdio: 'inherit' });
await writeFile(new URL('global.d.ts', dist), `/** Types for the classic GothicLockSolver global. */\nexport as namespace GothicLockSolver;\nexport * from './index.js';\n`);
const files: Record<string, string> = {};
for (const filename of (await readdir(dist)).sort()) {
  files[filename] = createHash('sha256').update(await readFile(new URL(filename, dist))).digest('hex');
}
const metadata: unknown = JSON.parse(await readFile(new URL('../../package.json', import.meta.url), 'utf8'));
if (typeof metadata !== 'object' || metadata === null || !('version' in metadata) || typeof metadata.version !== 'string') throw new Error('Package version is missing.');
const sourceSha = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
await writeFile(new URL('manifest.json', dist), `${JSON.stringify({ schemaVersion: 1, package: 'gothic-lock-solver', version: metadata.version, sourceSha, files }, null, 2)}\n`);
