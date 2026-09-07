import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';

const dist = new URL('../../../dist/', import.meta.url);
const runtime = ['gothic-lock-solver.js', 'gothic-lock-solver.min.js', 'gothic-lock-solver.min.mjs', 'gothic-lock-solver.mjs'];

describe('published artifacts', () => {
  test('ships exactly four core runtime files and one Node CLI', async () => {
    expect((await readdir(dist)).filter((name) => /\.(?:m?js)$/.test(name)).sort()).toEqual(['gothic-lock-solver.cli.mjs', ...runtime].sort());
  });

  for (const extension of ['js', 'mjs']) {
    test(`minifies ${extension} bytes and whitespace`, async () => {
      const readable = await readFile(new URL(`gothic-lock-solver.${extension}`, dist), 'utf8');
      const minified = await readFile(new URL(`gothic-lock-solver.min.${extension}`, dist), 'utf8');
      expect(minified.length).toBeLessThan(readable.length * 0.8);
      expect(minified.split('\n').length).toBeLessThan(readable.split('\n').length * 0.1);
      expect(minified).not.toBe(readable);
    });
  }

  for (const filename of runtime) {
    test(`${filename} has no external loading or Node runtime requirements`, async () => {
      const code = await readFile(new URL(filename, dist), 'utf8');
      expect(code).not.toMatch(/\b(?:require|fetch|importScripts)\s*\(|\bimport\s*(?:\(|["'{*])|\bfrom\s*["']|\b(?:process|Buffer|__dirname|__filename)\b|\bnode:/);
      expect(code).not.toMatch(/sourceMappingURL/);
      expect(code).not.toContain('export default');
    });
  }

  for (const filename of runtime.filter((name) => name.endsWith('.mjs'))) {
    test(`${filename} exposes the actual ESM namespace`, async () => {
      // A variable file URL deliberately bypasses Vite source transformation.
      const url = new URL(filename, dist).href;
      const api: unknown = await import(/* @vite-ignore */ url);
      expect(api).not.toHaveProperty('default');
      expect(api).toHaveProperty('solveLock');
      const node = await import('node:child_process');
      const output = node.execFileSync(process.execPath, ['--input-type=module', '-e', `import { solveLock, createSolverConfig } from ${JSON.stringify(url)}; import * as api from ${JSON.stringify(url)}; console.log(JSON.stringify([solveLock([6,2],[[0,-1],[0,0]],createSolverConfig({maxDenseBytes:0})),api.solveLock([4,4],[[0,0],[0,0]]),Object.keys(api).sort()]));`], { encoding: 'utf8', cwd: fileURLToPath(dist) });
      expect(JSON.parse(output)).toEqual([[[0, -2]], [], ['LockInputError', 'SearchLimitError', 'createSolverConfig', 'solveLock']]);
    });
  }

  test('manifest binds every runtime file and declaration to its bytes', async () => {
    const raw: unknown = JSON.parse(await readFile(new URL('manifest.json', dist), 'utf8'));
    const packageMetadata: unknown = JSON.parse(await readFile(new URL('../../../package.json', import.meta.url), 'utf8'));
    if (typeof packageMetadata !== 'object' || packageMetadata === null || !('version' in packageMetadata)) throw new Error('Malformed package metadata');
    expect(raw).toMatchObject({ schemaVersion: 1, package: 'gothic-lock-solver', version: packageMetadata.version, sourceSha: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim() });
    if (typeof raw !== 'object' || raw === null || !('files' in raw) || typeof raw.files !== 'object' || raw.files === null) throw new Error('Malformed distribution manifest');
    expect(Object.keys(raw.files).sort()).toEqual((await readdir(dist)).filter((name) => name !== 'manifest.json').sort());
    for (const [name, digest] of Object.entries(raw.files)) {
      expect(createHash('sha256').update(await readFile(new URL(name, dist))).digest('hex')).toBe(digest);
    }
  });
});
