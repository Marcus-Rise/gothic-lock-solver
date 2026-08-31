import test from 'node:test';
import assert from 'node:assert/strict';
import {
  findShortestCommands,
  packCommand,
  unpackCommand,
} from '../src/solver.mjs';

const noLinks = [[0, 0], [0, 0]];

test('packs every possible command into one byte and restores it', () => {
  for (let plate = 1; plate <= 7; plate += 1) {
    for (const direction of ['left', 'right']) {
      for (let steps = 1; steps <= 6; steps += 1) {
        const command = { plate, direction, steps };
        const packed = packCommand(command);
        assert.ok(packed >= 0 && packed <= 83);
        assert.deepEqual(unpackCommand(packed), command);
      }
    }
  }
});

test('returns no commands for an already open lock', () => {
  assert.deepEqual(
    findShortestCommands({ state: [4, 4], links: noLinks }),
    [],
  );
});

test('uses one macro command per independent plate', () => {
  assert.deepEqual(
    findShortestCommands({ state: [1, 7], links: noLinks }),
    [
      { plate: 1, direction: 'left', steps: 3 },
      { plate: 2, direction: 'right', steps: 3 },
    ],
  );
});

test('prefers the lower plate when two one-command solutions exist', () => {
  const links = [[0, 1], [1, 0]];
  assert.deepEqual(
    findShortestCommands({ state: [1, 1], links }),
    [{ plate: 1, direction: 'left', steps: 3 }],
  );
});

test('returns null when every possible move is blocked', () => {
  const links = [[0, 1], [1, 0]];
  assert.equal(findShortestCommands({ state: [1, 7], links }), null);
});

test('prefers left over right when both start equally short solutions', () => {
  const definition = {
    state: [2, 7, 1],
    links: [
      [0, 0, 0],
      [-1, 0, -1],
      [-1, -1, 0],
    ],
  };
  assert.deepEqual(findShortestCommands(definition), [
    { plate: 1, direction: 'left', steps: 5 },
    { plate: 3, direction: 'left', steps: 3 },
  ]);
});

test('prefers larger steps when earlier action fields are equal', () => {
  const definition = {
    state: [3, 2, 1],
    links: [
      [0, 0, -1],
      [-1, 0, -1],
      [-1, -1, 0],
    ],
  };
  assert.deepEqual(findShortestCommands(definition), [
    { plate: 1, direction: 'right', steps: 2 },
    { plate: 3, direction: 'right', steps: 2 },
    { plate: 2, direction: 'right', steps: 2 },
    { plate: 1, direction: 'right', steps: 3 },
    { plate: 3, direction: 'right', steps: 2 },
  ]);
});
