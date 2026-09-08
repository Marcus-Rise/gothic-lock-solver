import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { isBuiltin } from 'node:module';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import metadata from './package.json' with { type: 'json' };

async function writeDistributionManifest(): Promise<void> {
  const dist = new URL('./dist/', import.meta.url);
  await writeFile(new URL('global.d.ts', dist), [
    '/** Types for the classic GothicLockSolver global. */',
    'export as namespace GothicLockSolver;',
    "export * from './index.js';",
    '',
  ].join('\n'));

  const files: Record<string, string> = {};
  for (const filename of (await readdir(dist)).sort()) {
    if (filename === 'manifest.json') continue;
    const bytes = await readFile(new URL(filename, dist));
    files[filename] = createHash('sha256').update(bytes).digest('hex');
  }
  const manifest = {
    schemaVersion: 1,
    package: metadata.name,
    version: metadata.version,
    sourceSha: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: import.meta.dirname, encoding: 'utf8' }).trim(),
    files,
  };
  await writeFile(new URL('manifest.json', dist), `${JSON.stringify(manifest, null, 2)}\n`);
}

export default defineConfig(({ mode }) => {
  const minified = mode === 'minified';
  const cli = mode === 'cli';
  return {
    plugins: cli ? [{ name: 'distribution-manifest', closeBundle: writeDistributionManifest }] : [],
    build: {
      target: cli ? 'node22' : 'es2022',
      outDir: 'dist',
      emptyOutDir: !minified && !cli,
      sourcemap: false,
      minify: false,
      lib: {
        entry: fileURLToPath(new URL(cli ? './src/cli.ts' : './src/index.ts', import.meta.url)),
        name: 'GothicLockSolver',
        formats: cli ? ['es'] : ['es', 'iife'],
        fileName: (format) => cli ? 'gothic-lock-solver.cli.mjs'
          : `gothic-lock-solver${minified ? '.min' : ''}.${format === 'es' ? 'mjs' : 'js'}`,
      },
      rolldownOptions: {
        external: cli ? isBuiltin : [],
        output: {
          // Explicit full Rolldown minification includes ESM whitespace, unlike
          // the Vite library-mode build.minify shortcut.
          minify: minified,
          exports: 'named',
          codeSplitting: false,
          comments: { legal: false },
        },
      },
    },
  };
});
