import { expect, it } from 'vitest';
import { SearchLimitError } from '../../src/index.ts';
import { LockModel } from '../../src/lock.ts';
import { PreparedSearch, movementLimits } from '../../src/lock.ts';
import { SearchBudget } from '../../src/config.ts';
import { createSolverConfig } from '../../src/index.ts';
import { BfsSearch } from '../../src/bfs.ts';
import { MatrixSearch } from '../../src/astar.ts';
import { analyzeMatrix } from '../../src/matrix.ts';

it('reports exhaustion separately on BFS, A*, singular fallback and greedy certificate', () => {
  const inputs = [
    new LockModel([1, 7], [[0, 0], [0, 0]]),
    new LockModel([3, 1, 1], [[0, -1, -1], [-1, 0, -1], [-1, -1, 0]]),
    new LockModel([1, 1], [[0, 1], [1, 0]]),
  ];
  for (const model of inputs) {
    const prepared = new PreparedSearch(model);
    for (const options of [{ maxExpanded: 0 }, { maxVisited: 1 }]) {
      expect(() => new MatrixSearch(model, prepared, new SearchBudget(createSolverConfig(options))).solve()).toThrow(SearchLimitError);
      expect(() => new BfsSearch(prepared, new SearchBudget(createSolverConfig(options))).solve()).toThrow(SearchLimitError);
    }
    expect(() => new BfsSearch(prepared, new SearchBudget(createSolverConfig({ maxFrontier: 1 }))).solve()).toThrow(SearchLimitError);
  }
});
it('dense and sparse BFS agree on minimum-cost commands, including wider safe codes', () => {
  const model = new LockModel([2, 7, 1], [[0, 0, 0], [-1, 0, -1], [-1, -1, 0]]);
  const prepared = new PreparedSearch(model);
  const expected = [[0, -1], [1, -3]];
  expect(new BfsSearch(prepared, new SearchBudget()).solve()).toEqual(expected);
  expect(new BfsSearch(prepared, new SearchBudget(createSolverConfig({ maxDenseBytes: 0 }))).solve()).toEqual(expected);
  const state = [1, ...Array.from({ length: 17 }, () => 4)];
  const wide = new PreparedSearch(new LockModel(state, state.map(() => state.map(() => 0))));
  expect(new BfsSearch(wide, new SearchBudget(createSolverConfig({ maxDenseBytes: 0, maxVisited: 5, maxExpanded: 1, maxFrontier: 4 }))).solve()).toEqual([[0, 3]]);
});
it('distinguishes exact rational proofs from rank deficiency', () => {
  expect(analyzeMatrix(new LockModel([3, 4], [[0, 1], [-1, 0]])).kind).toBe('noninteger');
  expect(analyzeMatrix(new LockModel([3, 4], [[0, 1], [1, 0]])).kind).toBe('inconsistent');
  expect(analyzeMatrix(new LockModel([1, 1], [[0, 1], [1, 0]])).kind).toBe('singular');
  expect(analyzeMatrix(new LockModel([7, 7, 1], [[0, -1, 1], [0, 0, 1], [0, 0, 0]]))).toEqual({ kind: 'unique-integer', rank: 3, net: [-3, -6, 12], lowerBound: 4 });
});
it('computes the legal range from all direct affected pins atomically', () => {
  const prepared = new PreparedSearch(new LockModel([4, 7], [[0, 1], [0, 0]]));
  const effect = prepared.effects[0];
  if (effect === undefined) throw new Error('Missing prepared effect');
  expect(movementLimits(new Uint8Array([3, 6]), effect)).toEqual([0, 3]);
});
