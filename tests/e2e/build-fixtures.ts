import { rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';

const root = fileURLToPath(new URL('../../', import.meta.url));
const output = fileURLToPath(new URL('../../artifacts/e2e/fixtures/', import.meta.url));
await rm(output, { recursive: true, force: true });
for (const minified of [false, true]) {
  const suffix = minified ? '.min' : '';
  for (const entry of ['module', 'worker', 'classic']) {
    await build({
      root,
      configFile: false,
      logLevel: 'warn',
      plugins: [{
        name: 'built-library-consumer',
        enforce: 'pre',
        resolveId(source) {
          if (source === '../../../src/index.ts') {
            return { id: `../../../dist/gothic-lock-solver${suffix}.mjs`, external: true };
          }
          return null;
        },
      }],
      build: {
        target: 'es2022',
        outDir: output,
        emptyOutDir: false,
        minify: false,
        lib: {
          name: 'GothicConsumer',
          entry: fileURLToPath(new URL(`./fixtures/${entry}.ts`, import.meta.url)),
          formats: [entry === 'classic' ? 'iife' : 'es'],
          fileName: () => `${entry}${suffix}.${entry === 'classic' ? 'js' : 'mjs'}`,
        },
        rolldownOptions: { output: { codeSplitting: false } },
      },
    });
  }
}
