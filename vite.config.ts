import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => {
  const minified = mode === 'minified';
  return {
    build: {
      target: 'es2022',
      outDir: 'dist',
      emptyOutDir: false,
      sourcemap: false,
      minify: false,
      lib: {
        entry: fileURLToPath(new URL('./src/index.ts', import.meta.url)),
        name: 'GothicLockSolver',
        formats: ['es', 'iife'],
        fileName: (format) => `gothic-lock-solver${minified ? '.min' : ''}.${format === 'es' ? 'mjs' : 'js'}`,
      },
      rolldownOptions: {
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
