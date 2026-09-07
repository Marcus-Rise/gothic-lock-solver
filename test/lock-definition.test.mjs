import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LockInputError,
  parseLockDefinition,
  validateLockDefinition,
} from '../src/lock-definition.mjs';

const validLock = {
  state: [7, 4, 1],
  links: [
    [0, 1, -1],
    [0, 0, 0],
    [1, 0, 0],
  ],
};

test('validateLockDefinition accepts and copies a valid directed lock', () => {
  const result = validateLockDefinition(validLock);
  assert.deepEqual(result, validLock);
  assert.notEqual(result.state, validLock.state);
  assert.notEqual(result.links, validLock.links);
  for (const index of validLock.links.keys()) {
    assert.notEqual(result.links[index], validLock.links[index]);
  }
  assert.notEqual(result.links[0], validLock.links[0]);
});

test('validateLockDefinition ignores additional input properties', () => {
  const result = validateLockDefinition({ ...validLock, name: 'ignored', metadata: { source: 'test' } });
  assert.deepEqual(result, validLock);
  assert.equal('name' in result, false);
  assert.equal('metadata' in result, false);
});

for (const [name, value, message] of [
  ['requires at least two plates', { state: [4], links: [[0]] }, /не менее 2/],
  ['rejects a position outside 1..7', { ...validLock, state: [7, 8, 1] }, /state\[1\]/],
  ['requires a square matrix', { ...validLock, links: [[0], [0], [0]] }, /links\[0\]/],
  ['rejects an unknown coefficient', { ...validLock, links: [[0, 2, 0], [0, 0, 0], [0, 0, 0]] }, /-1, 0 или 1/],
  ['requires a zero diagonal', { ...validLock, links: [[1, 0, 0], [0, 0, 0], [0, 0, 0]] }, /диагонали/],
]) {
  test(name, () => {
    assert.throws(() => validateLockDefinition(value), message);
  });
}

test('rejects sparse state arrays, matrix rows, and matrix entries', () => {
  const cases = [
    { state: [4, , 4], links: validLock.links },
    { state: validLock.state, links: [validLock.links[0], , validLock.links[2]] },
    { state: validLock.state, links: [[0, , -1], validLock.links[1], validLock.links[2]] },
  ];
  for (const definition of cases) assert.throws(() => validateLockDefinition(definition), LockInputError);
});

test('parseLockDefinition reports malformed JSON as LockInputError', () => {
  assert.throws(
    () => parseLockDefinition('{'),
    (error) => error instanceof LockInputError && /Некорректный JSON/.test(error.message),
  );
});
