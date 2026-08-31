import test from 'node:test';
import assert from 'node:assert/strict';
import { applyCommand, generateTransitions } from '../src/transition.mjs';

test('applyCommand moves direct and inverse links by the full step count', () => {
  const state = [3, 5, 4];
  const links = [
    [0, 1, -1],
    [0, 0, 0],
    [0, 0, 0],
  ];
  const result = applyCommand(state, links, { plate: 1, direction: 'left', steps: 2 });
  assert.deepEqual(result, [5, 7, 2]);
  assert.deepEqual(state, [3, 5, 4]);
});

test('applyCommand does not cascade through a moved target row', () => {
  const links = [
    [0, 1, 0],
    [0, 0, 1],
    [0, 0, 0],
  ];
  assert.deepEqual(
    applyCommand([3, 5, 4], links, { plate: 1, direction: 'left', steps: 2 }),
    [5, 7, 4],
  );
});

test('applyCommand atomically blocks when one linked plate cannot finish', () => {
  const state = [3, 6];
  const links = [[0, 1], [0, 0]];
  assert.deepEqual(
    applyCommand(state, links, { plate: 1, direction: 'left', steps: 1 }),
    [4, 7],
  );
  assert.equal(
    applyCommand(state, links, { plate: 1, direction: 'left', steps: 2 }),
    null,
  );
  assert.deepEqual(state, [3, 6]);
});

test('a directed source row does not imply a reverse link', () => {
  const links = [[0, 1], [0, 0]];
  assert.deepEqual(
    applyCommand([3, 5], links, { plate: 2, direction: 'right', steps: 1 }),
    [3, 4],
  );
});

test('generateTransitions uses plate, direction, descending steps order', () => {
  const transitions = generateTransitions([4, 4], [[0, 0], [0, 0]]);
  assert.deepEqual(
    transitions.slice(0, 6).map(({ command }) => command),
    [
      { plate: 1, direction: 'left', steps: 3 },
      { plate: 1, direction: 'left', steps: 2 },
      { plate: 1, direction: 'left', steps: 1 },
      { plate: 1, direction: 'right', steps: 3 },
      { plate: 1, direction: 'right', steps: 2 },
      { plate: 1, direction: 'right', steps: 1 },
    ],
  );
});
