import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));

test('example lock produces the documented four-command solution', () => {
  const result = spawnSync(
    process.execPath,
    [join(projectRoot, 'solve-lock.mjs'), join(projectRoot, 'examples/lock.example.json')],
    { encoding: 'utf8' },
  );
  assert.equal(result.status, 0);
  assert.equal(
    result.stdout,
    'Найдено команд: 4\n'
      + '1. Пластина 1 - влево x3\n'
      + '2. Пластина 2 - вправо x3\n'
      + '3. Пластина 4 - влево x2\n'
      + '4. Пластина 5 - вправо x2\n',
  );
});
