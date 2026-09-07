import test from 'node:test';
import assert from 'node:assert/strict';
import * as api from '../src/index.mjs';
import { findShortestCommands } from '../src/solver.mjs';
import { validateLockDefinition } from '../src/lock-definition.mjs';

const independent = (state) => ({ state, links: state.map(() => state.map(() => 0)) });
const inverseLinks = [[0, -1, -1], [-1, 0, -1], [-1, -1, 0]];

// This oracle intentionally imports no production transition/encoding helpers.
function unitMove(state, links, plate, direction) {
  const next = [...state];
  next[plate] += direction;
  for (let target = 0; target < state.length; target += 1) {
    if (target !== plate) next[target] += direction * links[plate][target];
  }
  return next.some((position) => position < 1 || position > 7) ? null : next;
}

function replay(definition, commands) {
  let state = [...definition.state];
  for (const command of commands) {
    assert.ok(Number.isInteger(command.plate) && command.plate >= 1 && command.plate <= state.length);
    assert.ok(command.direction === 'left' || command.direction === 'right');
    assert.ok(Number.isInteger(command.steps) && command.steps >= 1 && command.steps <= 6);
    for (let click = 0; click < command.steps; click += 1) {
      state = unitMove(state, definition.links, command.plate - 1, command.direction === 'left' ? 1 : -1);
      assert.notEqual(state, null, 'each individual division must be legal');
    }
  }
  assert.deepEqual(state, state.map(() => 4));
}

function referenceActions(definition) {
  const queue = [{ state: [...definition.state], depth: 0 }];
  const visited = new Set([definition.state.join(',')]);
  for (let head = 0; head < queue.length; head += 1) {
    const { state, depth } = queue[head];
    if (state.every((position) => position === 4)) return depth;
    for (let plate = 0; plate < state.length; plate += 1) {
      for (const direction of [1, -1]) {
        let next = state;
        for (let steps = 1; steps <= 6; steps += 1) {
          next = unitMove(next, definition.links, plate, direction);
          if (next === null) break;
          const key = next.join(',');
          if (visited.has(key)) continue;
          visited.add(key);
          queue.push({ state: next, depth: depth + 1 });
        }
      }
    }
  }
  return null;
}

test('default matrix solver accepts eight independent plates and keeps result shape', () => {
  const definition = independent([1, 7, 2, 6, 3, 5, 4, 1]);
  const before = structuredClone(definition);
  const result = api.solveLock(definition);
  assert.equal(result.status, 'solved');
  assert.equal(result.metrics.commands, 7);
  assert.deepEqual(Object.keys(result), ['status', 'initialState', 'targetState', 'commands', 'finalState', 'metrics']);
  replay(definition, result.commands);
  assert.deepEqual(definition, before);
});

test('explicit BFS keeps previous deterministic command ordering', () => {
  const definition = { state: [2, 7, 1], links: [[0, 0, 0], [-1, 0, -1], [-1, -1, 0]] };
  assert.deepEqual(api.solveLock(definition, { algorithm: 'bfs' }).commands, [
    { plate: 1, direction: 'left', steps: 5 },
    { plate: 3, direction: 'left', steps: 3 },
  ]);
  assert.deepEqual(api.solveLock(definition, { algorithm: 'bfs' }).commands, findShortestCommands(definition));
});

test('rejects unknown algorithms and invalid resource budgets even on an open lock', () => {
  const definition = independent([4, 4]);
  assert.throws(() => api.solveLock(definition, { algorithm: 'greedy' }), /algorithm/);
  for (const value of [null, [], 'bfs']) assert.throws(() => api.solveLock(definition, value), TypeError);
  for (const name of ['maxExpanded', 'maxVisited', 'maxFrontier', 'maxDenseBytes']) {
    for (const value of [-1, NaN, Infinity, 0.5, Number.MAX_SAFE_INTEGER + 1, '20']) {
      assert.throws(() => api.solveLock(definition, { [name]: value }), TypeError, `${name}=${value}`);
    }
  }
});

test('a safe model size is separate from safe computational representation', () => {
  const definition = independent(Array(19).fill(4));
  assert.deepEqual(validateLockDefinition(definition), definition);
  for (const algorithm of ['matrix-astar', 'bfs']) {
    assert.throws(() => api.solveLock(definition, { algorithm }), (error) => error.name === 'SearchLimitError' && error.limit === 'stateEncoding');
  }
});

test('matrix equation is necessary but a legal schedule remains required', () => {
  assert.equal(api.solveLock({ state: [1, 1, 1], links: inverseLinks }).status, 'unsolvable');
  const definition = { state: [3, 1, 1], links: inverseLinks };
  const result = api.solveLock(definition);
  assert.equal(result.metrics.commands, 4, 'three nonzero net movements require a repeated plate here');
  assert.ok(new Set(result.commands.map((command) => command.plate)).size < result.commands.length);
  replay(definition, result.commands);
  assert.deepEqual(api.solveLock(definition), result, 'matrix tie selection is deterministic');
});

test('fractional and inconsistent equations prove unreachable targets', () => {
  for (const links of [[[0, 1], [-1, 0]], [[0, 1], [1, 0]]]) {
    assert.equal(api.solveLock({ state: [3, 4], links }).status, 'unsolvable');
  }
});

test('singular matrices fall back to exact action BFS', () => {
  const definition = { state: [1, 1], links: [[0, 1], [1, 0]] };
  assert.deepEqual(api.solveLock(definition).commands, [{ plate: 1, direction: 'left', steps: 3 }]);
});

test('every graph-search route throws SearchLimitError rather than unsolvable on exhaustion', () => {
  assert.equal(typeof api.SearchLimitError, 'function');
  for (const [definition, algorithm] of [
    [independent([1, 7]), 'bfs'],
    [{ state: [3, 1, 1], links: inverseLinks }, 'matrix-astar'],
    [{ state: [1, 1], links: [[0, 1], [1, 0]] }, 'matrix-astar'],
  ]) {
    for (const [limit, value] of [['maxExpanded', 0], ['maxVisited', 1], ['maxFrontier', 1]]) {
      assert.throws(() => api.solveLock(definition, { algorithm, [limit]: value }),
        (error) => error instanceof api.SearchLimitError && error.limit === limit,
        `${algorithm} ${limit}`);
    }
  }
  assert.throws(() => findShortestCommands(independent([1, 7]), { maxExpanded: 0 }), (error) => error.name === 'SearchLimitError');
});

test('zero dense-memory budget selects sparse BFS without changing the answer', () => {
  const definition = { state: [3, 2, 1], links: [[0, 0, -1], [-1, 0, -1], [-1, -1, 0]] };
  assert.deepEqual(api.solveLock(definition, { algorithm: 'bfs', maxDenseBytes: 0 }), api.solveLock(definition, { algorithm: 'bfs' }));
});

test('greedy certificates respect visited and expanded budgets', () => {
  const definition = independent([1, 7]);
  for (const [limit, value] of [['maxExpanded', 1], ['maxVisited', 2]]) {
    assert.throws(() => api.solveLock(definition, { [limit]: value }), (error) => error instanceof api.SearchLimitError && error.limit === limit);
  }
  assert.equal(api.solveLock(definition, { maxExpanded: 2, maxVisited: 3, maxFrontier: 1 }).metrics.commands, 2);
  assert.equal(api.solveLock(independent([4, 4]), { maxExpanded: 0, maxVisited: 1 }).metrics.commands, 0);
});

test('safe state codes beyond 32 bits survive sparse BFS and matrix search', () => {
  const definition = independent([1, ...Array(17).fill(4)]);
  for (const algorithm of ['bfs', 'matrix-astar']) {
    const result = api.solveLock(definition, { algorithm, maxDenseBytes: 0, maxVisited: 5, maxExpanded: 1, maxFrontier: 4 });
    assert.deepEqual(result.commands, [{ plate: 1, direction: 'left', steps: 3 }]);
    replay(definition, result.commands);
  }
});

test('A* handles net movement larger than one command without overestimating actions', () => {
  // A z = [-3,-3,3] has unique integer z=[-3,-6,12], so at least four
  // commands are necessary even though only three plates must be selected.
  const definition = { state: [7, 7, 1], links: [[0, -1, 1], [0, 0, 1], [0, 0, 0]] };
  const result = api.solveLock(definition);
  assert.equal(referenceActions(definition), 4);
  assert.equal(result.metrics.commands, 4);
  replay(definition, result.commands);
});

test('new matrix solver matches independent complete search for all 441 two-plate cases', () => {
  for (const firstLink of [-1, 0, 1]) {
    for (const secondLink of [-1, 0, 1]) {
      for (let first = 1; first <= 7; first += 1) {
        for (let second = 1; second <= 7; second += 1) {
          const definition = { state: [first, second], links: [[0, firstLink], [secondLink, 0]] };
          const expected = referenceActions(definition);
          const actual = api.solveLock(definition);
          assert.equal(actual.status === 'solved' ? actual.commands.length : null, expected, JSON.stringify(definition));
          if (expected !== null) replay(definition, actual.commands);
        }
      }
    }
  }
});

test('matrix and both BFS storage modes match independent complete search on 192 seeded N3 inputs', () => {
  let seed = 0x51405;
  const random = (max) => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed % max; };
  for (let sample = 0; sample < 192; sample += 1) {
    const definition = {
      state: Array.from({ length: 3 }, () => 1 + random(7)),
      links: Array.from({ length: 3 }, (_, row) => Array.from({ length: 3 }, (_, column) => row === column ? 0 : random(3) - 1)),
    };
    const expected = referenceActions(definition);
    for (const options of [{}, { algorithm: 'bfs' }, { algorithm: 'bfs', maxDenseBytes: 0 }]) {
      const actual = api.solveLock(definition, options);
      assert.equal(actual.status === 'solved' ? actual.commands.length : null, expected, JSON.stringify({ definition, options }));
      if (expected !== null) replay(definition, actual.commands);
    }
  }
});
