import test from 'node:test';
import assert from 'node:assert/strict';
import { solveLock } from '../src/index.mjs';
import { createSolveResult, formatConsoleResult } from '../src/result.mjs';

const definition = {
  state: [1, 7],
  links: [[0, 0], [0, 0]],
};
const commands = [
  { plate: 1, direction: 'left', steps: 3 },
  { plate: 2, direction: 'right', steps: 3 },
];

test('createSolveResult replays commands and calculates metrics', () => {
  const result = createSolveResult(definition, commands);
  assert.deepEqual(result.finalState, [4, 4]);
  assert.deepEqual(result.metrics, {
    commands: 2,
    divisions: 6,
    plateSwitches: 1,
  });
});

test('formatConsoleResult renders grouped Russian commands', () => {
  const result = createSolveResult(definition, commands);
  assert.equal(
    formatConsoleResult(result),
    'Найдено команд: 2\n'
      + '1. Пластина 1 - влево x3\n'
      + '2. Пластина 2 - вправо x3',
  );
});

test('already-open and unsolvable results have distinct text', () => {
  const open = createSolveResult({ state: [4, 4], links: definition.links }, []);
  const unsolvable = createSolveResult(definition, null);
  assert.equal(formatConsoleResult(open), 'Замок уже открыт.');
  assert.equal(formatConsoleResult(unsolvable), 'Решение не найдено.');
  assert.deepEqual(unsolvable.commands, []);
});

test('already-open result exposes independent initial and final states', () => {
  const result = createSolveResult({ state: [4, 4], links: definition.links }, []);
  assert.notStrictEqual(result.initialState, result.finalState);
  result.finalState[0] = 1;
  assert.deepEqual(result.initialState, [4, 4]);
});

test('solveLock validates and solves through the website-safe facade', () => {
  const result = solveLock(definition);
  assert.equal(result.status, 'solved');
  assert.deepEqual(result.finalState, [4, 4]);
});
