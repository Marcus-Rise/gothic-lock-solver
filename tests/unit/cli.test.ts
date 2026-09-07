import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { runCli } from '../../cli/cli.ts';

const directories: string[] = [];
afterEach(async () => {
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

async function fixture(contents: unknown) {
  const directory = await mkdtemp(join(tmpdir(), 'gothic-cli-'));
  directories.push(directory);
  const input = join(directory, 'lock.json');
  await writeFile(input, JSON.stringify(contents));
  return { directory, input, output: join(directory, 'solution.json') };
}

async function run(args: readonly string[]) {
  let stdout = '';
  let stderr = '';
  const code = await runCli(args, {
    stdout: { write: (text) => { stdout += text; } },
    stderr: { write: (text) => { stderr += text; } },
  });
  return { code, stdout, stderr };
}

describe('CLI file adapter', () => {
  it('prints grouped actions while leaving files untouched unless --output is requested', async () => {
    const { input, output } = await fixture({ state: [1, 7], links: [[0, 0], [0, 0]] });
    expect(await run([input])).toEqual({ code: 0, stdout: 'Найдено команд: 2\n1. Пластина 1 - влево x3\n2. Пластина 2 - вправо x3\n', stderr: '' });
    await expect(readFile(output)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('creates and overwrites the existing structured JSON contract', async () => {
    const { input, output } = await fixture({ state: [1, 7], links: [[0, 0], [0, 0]] });
    const expected = {
      status: 'solved', initialState: [1, 7], targetState: [4, 4],
      commands: [{ plate: 1, direction: 'left', steps: 3 }, { plate: 2, direction: 'right', steps: 3 }],
      finalState: [4, 4], metrics: { commands: 2, divisions: 6, plateSwitches: 1 },
    };
    for (const stale of ['', 'stale'.repeat(1000)]) {
      await writeFile(output, stale);
      expect((await run([input, '--output', output])).code).toBe(0);
      expect(await readFile(output, 'utf8')).toBe(`${JSON.stringify(expected, null, 2)}\n`);
    }
  });

  it('distinguishes an already open lock from a proven unreachable goal', async () => {
    const open = await fixture({ state: [4, 4], links: [[0, 0], [0, 0]] });
    expect(await run([open.input])).toEqual({ code: 0, stdout: 'Замок уже открыт.\n', stderr: '' });
    const blocked = await fixture({ state: [1, 7], links: [[0, 1], [1, 0]] });
    expect(await run([blocked.input, '--output', blocked.output])).toEqual({ code: 2, stdout: 'Решение не найдено.\n', stderr: '' });
    const result: unknown = JSON.parse(await readFile(blocked.output, 'utf8'));
    expect(result).toEqual({ status: 'unsolvable', initialState: [1, 7], targetState: [4, 4], commands: [] });
  });

  it.each([[], [''], ['--unknown'], ['x', '--output'], ['x', 'extra'], ['x', '--output', ''], ['x', '--output', 'y', 'extra']])('rejects malformed command line %j', async (...args) => {
    const result = await run(args);
    expect(result.code).toBe(1);
    expect(result.stdout).toBe('');
    expect(result.stderr).toMatch(/^Ошибка: Использование:/u);
  });

  it.each([null, [], {}, { state: [0, 4], links: [[0, 0], [0, 0]] }])('rejects malformed input %j without reporting unsolvable', async (input) => {
    const files = await fixture(input);
    const result = await run([files.input]);
    expect(result.code).toBe(1);
    expect(result.stdout).toBe('');
    expect(result.stderr).toMatch(/^Ошибка:/u);
  });

  it('reports JSON, input IO and output IO failures without a success message', async () => {
    const files = await fixture({ state: [4, 4], links: [[0, 0], [0, 0]] });
    for (const args of [[join(files.directory, 'missing.json')], [files.input, '--output', files.directory]]) {
      const result = await run(args);
      expect(result).toMatchObject({ code: 1, stdout: '' });
      expect(result.stderr).toMatch(/^Ошибка:/u);
    }
    await writeFile(files.input, '{');
    expect(await run([files.input])).toMatchObject({ code: 1, stdout: '', stderr: expect.stringContaining('Некорректный JSON') });
  });
});
