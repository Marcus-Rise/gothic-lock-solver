import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const entry = join(projectRoot, 'solve-lock.mjs');

async function createCase(t, definition) {
  const directory = await mkdtemp(join(tmpdir(), 'gothic-lock-solver-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const inputPath = join(directory, 'lock.json');
  await writeFile(inputPath, JSON.stringify(definition), 'utf8');
  return { directory, inputPath };
}

function run(args) {
  return spawnSync(process.execPath, [entry, ...args], { encoding: 'utf8' });
}

const expectedSolutionJson = `{
  "status": "solved",
  "initialState": [
    1,
    7
  ],
  "targetState": [
    4,
    4
  ],
  "commands": [
    {
      "plate": 1,
      "direction": "left",
      "steps": 3
    },
    {
      "plate": 2,
      "direction": "right",
      "steps": 3
    }
  ],
  "finalState": [
    4,
    4
  ],
  "metrics": {
    "commands": 2,
    "divisions": 6,
    "plateSwitches": 1
  }
}
`;

test('prints a solution without creating an output file by default', async (t) => {
  const { directory, inputPath } = await createCase(t, {
    state: [1, 7],
    links: [[0, 0], [0, 0]],
  });
  const outputPath = join(directory, 'solution.json');
  const result = run([inputPath]);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /Найдено команд: 2/);
  assert.equal(result.stderr, '');
  await assert.rejects(readFile(outputPath, 'utf8'), { code: 'ENOENT' });
});

test('--output creates and then overwrites exact pretty JSON bytes', async (t) => {
  const { directory, inputPath } = await createCase(t, {
    state: [1, 7],
    links: [[0, 0], [0, 0]],
  });
  const outputPath = join(directory, 'solution.json');
  const created = run([inputPath, '--output', outputPath]);
  assert.equal(created.status, 0);
  assert.equal(created.stderr, '');
  assert.equal(await readFile(outputPath, 'utf8'), expectedSolutionJson);

  await writeFile(outputPath, 'stale'.repeat(1_000), 'utf8');
  const overwritten = run([inputPath, '--output', outputPath]);
  assert.equal(overwritten.status, 0);
  assert.match(overwritten.stdout, /Пластина 1 - влево x3/);
  assert.equal(overwritten.stderr, '');
  assert.equal(await readFile(outputPath, 'utf8'), expectedSolutionJson);
});

test('invalid JSON exits with code 1 and a Russian error', async (t) => {
  const { inputPath } = await createCase(t, {
    state: [4, 4],
    links: [[0, 0], [0, 0]],
  });
  await writeFile(inputPath, '{', 'utf8');
  const result = run([inputPath]);
  assert.equal(result.status, 1);
  assert.equal(result.stdout, '');
  assert.match(result.stderr, /Ошибка: Некорректный JSON/);
});

test('an unsolvable lock writes JSON and exits with code 2', async (t) => {
  const { directory, inputPath } = await createCase(t, {
    state: [1, 7],
    links: [[0, 1], [1, 0]],
  });
  const outputPath = join(directory, 'solution.json');
  const result = run([inputPath, '--output', outputPath]);
  assert.equal(result.status, 2);
  assert.match(result.stdout, /Решение не найдено/);
  assert.equal(result.stderr, '');
  assert.equal(JSON.parse(await readFile(outputPath, 'utf8')).status, 'unsolvable');
});

test('read errors exit with code 1 and keep stdout empty', async (t) => {
  const { directory, inputPath } = await createCase(t, {
    state: [4, 4],
    links: [[0, 0], [0, 0]],
  });

  const missingInput = run([join(directory, 'missing.json')]);
  assert.equal(missingInput.status, 1);
  assert.equal(missingInput.stdout, '');
  assert.match(missingInput.stderr, /Ошибка:/);
});

test('strict CLI grammar errors exit with code 1 and keep stdout empty', async (t) => {
  const { inputPath, directory } = await createCase(t, {
    state: [4, 4],
    links: [[0, 0], [0, 0]],
  });

  for (const args of [
    [],
    ['--unknown'],
    ['--output'],
    [''],
    [inputPath, '--unknown'],
    [inputPath, '--output'],
    [inputPath, '--output', ''],
    [inputPath, 'extra'],
    [inputPath, '--output', join(directory, 'solution.json'), 'extra'],
  ]) {
    const invalidArgs = run(args);
    assert.equal(invalidArgs.status, 1);
    assert.equal(invalidArgs.stdout, '');
    assert.match(invalidArgs.stderr, /Ошибка: Использование:/);
  }
});

test('write errors exit with code 1 and keep stdout empty', async (t) => {
  const { directory, inputPath } = await createCase(t, {
    state: [4, 4],
    links: [[0, 0], [0, 0]],
  });
  const writeError = run([inputPath, '--output', directory]);
  assert.equal(writeError.status, 1);
  assert.equal(writeError.stdout, '');
  assert.match(writeError.stderr, /Ошибка:/);
});
