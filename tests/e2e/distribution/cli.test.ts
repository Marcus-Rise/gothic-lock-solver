import { spawnSync } from 'node:child_process';
import { copyFile, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';

describe('standalone Node CLI artifact', () => {
  test('runs copied bytes outside the repository with exit codes 0, 1 and 2 and --output', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'gothic-standalone-cli-'));
    try {
      const executable = join(directory, 'gothic-lock-solver.cli.mjs');
      const input = join(directory, 'lock.json');
      const output = join(directory, 'solution.json');
      const config = join(directory, 'config.json');
      await writeFile(config, JSON.stringify({ maxDenseBytes: 0 }));
      await copyFile(new URL('../../../dist/gothic-lock-solver.cli.mjs', import.meta.url), executable);
      const contents = await readFile(executable, 'utf8');
      expect(contents.startsWith('#!/usr/bin/env node\n')).toBe(true);
      // The sole Node file can import builtins; no sibling core modules or npm
      // runtime package is present in this temporary consumer directory.
      expect(contents).not.toMatch(/\bfrom\s*["'](?:\.|\/|gothic-lock-solver)/);
      await writeFile(input, JSON.stringify({ state: [6, 2], links: [[0, -1], [0, 0]] }));
      const solved = spawnSync(process.execPath, [executable, input, '--config', config, '--output', output], { cwd: directory, encoding: 'utf8' });
      expect(solved.status).toBe(0);
      expect(solved.stderr).toBe('');
      expect(solved.stdout).toContain('Найдено команд: 1');
      expect(JSON.parse(await readFile(output, 'utf8'))).toMatchObject({ status: 'solved', commands: [{ plate: 1, direction: 'right', steps: 2 }] });
      await writeFile(input, JSON.stringify({ state: [1, 7], links: [[0, 1], [1, 0]] }));
      const unreachable = spawnSync(process.execPath, [executable, input], { cwd: directory, encoding: 'utf8' });
      expect(unreachable.status).toBe(2);
      expect(unreachable.stdout).toContain('Решение не найдено.');
      await writeFile(config, JSON.stringify({ unknown: 1 }));
      const invalidConfig = spawnSync(process.execPath, [executable, input, '--config', config], { cwd: directory, encoding: 'utf8' });
      expect(invalidConfig.status).toBe(1);
      expect(invalidConfig.stderr).not.toBe('');
      await writeFile(input, '{');
      const invalid = spawnSync(process.execPath, [executable, input], { cwd: directory, encoding: 'utf8' });
      expect(invalid.status).toBe(1);
      expect(invalid.stdout).toBe('');
      expect(invalid.stderr).toContain('Некорректный JSON');
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
