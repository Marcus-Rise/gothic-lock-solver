import test from 'node:test';
import assert from 'node:assert/strict';
import { createTargetState } from '../src/state-codec.mjs';
import { findShortestCommands } from '../src/solver.mjs';
import { generateTransitions } from '../src/transition.mjs';

function referenceBfs(definition) {
  const targetKey = createTargetState(definition.state.length).join(',');
  const startKey = definition.state.join(',');
  if (startKey === targetKey) {
    return [];
  }

  const queue = [{ state: definition.state, commands: [] }];
  const visited = new Set([startKey]);
  for (let head = 0; head < queue.length; head += 1) {
    const current = queue[head];
    for (const transition of generateTransitions(current.state, definition.links)) {
      const key = transition.state.join(',');
      if (visited.has(key)) {
        continue;
      }
      const commands = [...current.commands, transition.command];
      if (key === targetKey) {
        return commands;
      }
      visited.add(key);
      queue.push({ state: transition.state, commands });
    }
  }
  return null;
}

test('typed-array BFS matches reference BFS for every N=2 lock', () => {
  for (const link12 of [-1, 0, 1]) {
    for (const link21 of [-1, 0, 1]) {
      const links = [[0, link12], [link21, 0]];
      for (let first = 1; first <= 7; first += 1) {
        for (let second = 1; second <= 7; second += 1) {
          const definition = { state: [first, second], links };
          assert.deepEqual(
            findShortestCommands(definition),
            referenceBfs(definition),
            `state=${first},${second}; links=${link12},${link21}`,
          );
        }
      }
    }
  }
});
