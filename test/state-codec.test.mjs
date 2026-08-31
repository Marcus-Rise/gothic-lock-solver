import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createTargetState,
  decodeState,
  encodeState,
  stateSpaceSize,
} from '../src/state-codec.mjs';

test('base-7 encoding has stable boundary values', () => {
  assert.equal(encodeState([1, 1]), 0);
  assert.equal(encodeState([7, 7]), 48);
  assert.equal(stateSpaceSize(7), 823_543);
});

test('encodeState and decodeState round-trip a seven-plate state', () => {
  const state = [7, 4, 1, 3, 6, 2, 5];
  assert.deepEqual(decodeState(encodeState(state), state.length), state);
});

test('createTargetState creates only center positions', () => {
  assert.deepEqual(createTargetState(5), [4, 4, 4, 4, 4]);
});
