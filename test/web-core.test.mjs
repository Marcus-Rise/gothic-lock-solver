import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

test('public core imports and solves in an ESM context without Node globals', () => {
  const output = execFileSync(process.execPath, [
    '--experimental-vm-modules',
    fileURLToPath(new URL('../scripts/verify-web-core.mjs', import.meta.url)),
  ], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  assert.equal(JSON.parse(output).status, 'passed');
});
