import { describe, expect, it } from 'vitest';
import * as api from '../../src/index.ts';
import type { Link, Position } from '../../src/index.ts';
import { referenceActions, replay, unitMove } from './oracle.ts';

const inverse = [[0, -1, -1], [-1, 0, -1], [-1, -1, 0]] as const;
const independent = (state: readonly Position[]) => state.map(() => state.map((): Link => 0));

function solveUnknown(state: unknown, links: unknown): unknown {
  return Reflect.apply(api.solveLock, undefined, [state, links]);
}

describe('public tuple contract', () => {
  it('exports the named solver, config factory and documented error classes', () => {
    expect(Object.keys(api).sort()).toEqual(['LockInputError', 'SearchLimitError', 'createSolverConfig', 'solveLock']);
  });
  it('uses numeric pin delta and links[source][target] without reverse influence', () => {
    expect(api.solveLock([6, 2], [[0, -1], [0, 0]])).toEqual([[0, -2]]);
    expect(api.solveLock([4, 2], [[0, -1], [0, 0]])).toEqual([[1, 2]]);
  });
  it('applies direct effects once without cascades', () => {
    const state = [3, 3, 4] as const;
    const links = [[0, 1, 0], [0, 0, 1], [0, 0, 0]] as const;
    expect(api.solveLock(state, links)).toEqual([[0, 1]]);
  });
  it('does not mutate frozen input and returns independent repeatable results', () => {
    const state: readonly Position[] = Object.freeze([1, 7, 2, 6, 3, 5, 4, 1]);
    const links = Object.freeze(independent(state).map((row) => Object.freeze(row)));
    const result = api.solveLock(state, links);
    expect(result).toHaveLength(7);
    if (result === null) throw new Error('Expected solution');
    expect(replay({ state, links }, result)).toEqual(state.map(() => 4));
    expect(api.solveLock(state, links)).toEqual(result);
    expect(api.solveLock(state, links)).not.toBe(result);
  });
  it('returns [] for open and null only for proved unreachable locks', () => {
    expect(api.solveLock([4, 4], [[0, 0], [0, 0]])).toEqual([]);
    expect(api.solveLock([1, 1, 1], inverse)).toBeNull();
    expect(api.solveLock([3, 4], [[0, 1], [-1, 0]])).toBeNull();
    expect(api.solveLock([3, 4], [[0, 1], [1, 0]])).toBeNull();
  });
  it('handles singular matrices and repeated-plate schedules exactly', () => {
    expect(api.solveLock([1, 1], [[0, 1], [1, 0]])).toEqual([[0, 3]]);
    const lock = { state: [3, 1, 1] as const, links: inverse };
    const result = api.solveLock(lock.state, lock.links);
    expect(result).toHaveLength(4);
    if (result === null) throw new Error('Expected solution');
    expect(replay(lock, result)).toEqual([4, 4, 4]);
    expect(new Set(result.map(([index]) => index)).size).toBeLessThan(result.length);
  });
  it('allows net movements above six while minimizing actions', () => {
    const lock = { state: [7, 7, 1] as const, links: [[0, -1, 1], [0, 0, 1], [0, 0, 0]] as const };
    const result = api.solveLock(lock.state, lock.links);
    expect(referenceActions(lock)).toBe(4);
    expect(result).toHaveLength(4);
    if (result === null) throw new Error('Expected solution');
    expect(replay(lock, result)).toEqual([4, 4, 4]);
  });
  it('rejects invalid dimensions, positions, links, diagonals and sparse arrays', () => {
    const sparseState = [4, 4, 4];
    delete sparseState[1];
    const sparseMatrix = [[0, 0], [0, 0]];
    delete sparseMatrix[0];
    const sparseRow = [0, 0];
    delete sparseRow[1];
    const bad: readonly (readonly [unknown, unknown])[] = [
      [null, null], [[], []], [[4], [[0]]], [[0, 4], [[0, 0], [0, 0]]],
      [[4, 8], [[0, 0], [0, 0]]], [[4, 2.5], [[0, 0], [0, 0]]],
      [[4, NaN], [[0, 0], [0, 0]]], [[4, '4'], [[0, 0], [0, 0]]],
      [[4, 4], [[0, 0]]], [[4, 4], [[0, 0], [0]]],
      [[4, 4], [[1, 0], [0, 0]]], [[4, 4], [[0, 2], [0, 0]]],
      [sparseState, [[0, 0, 0], [0, 0, 0], [0, 0, 0]]],
      [[4, 4], sparseMatrix], [[4, 4], [sparseRow, [0, 0]]],
    ];
    for (const [state, links] of bad) expect(() => solveUnknown(state, links)).toThrow(api.LockInputError);
    const inherited = [4, 4];
    delete inherited[0];
    Object.setPrototypeOf(inherited, Object.assign(Object.create(Array.prototype), { 0: 4 }));
    expect(() => solveUnknown(inherited, [[0, 0], [0, 0]])).toThrow(api.LockInputError);
  });
  it('blocks the complete direct movement when a linked pin hits a boundary', () => {
    expect(unitMove([4, 7], [[0, 1], [0, 0]], 0, 1)).toBeNull();
    const lock = { state: [1, 7] as const, links: [[0, 1], [0, 0]] as const };
    const result = api.solveLock(lock.state, lock.links);
    const expected = referenceActions(lock);
    if (expected === null) throw new Error('Expected reachable oracle lock');
    expect(result).toHaveLength(expected);
    if (result === null) throw new Error('Expected solution');
    expect(replay(lock, result)).toEqual([4, 4]);
  });
  it('supports 18-plate safe codes and reports encoding exhaustion separately from null', () => {
    const state: Position[] = [1, ...Array.from({ length: 17 }, (): Position => 4)];
    expect(api.solveLock(state, independent(state))).toEqual([[0, 3]]);
    const tooWide = Array.from({ length: 19 }, (): Position => 4);
    expect(() => api.solveLock(tooWide, independent(tooWide))).toThrow(api.SearchLimitError);
    try { api.solveLock(tooWide, independent(tooWide)); } catch (error) {
      expect(error).toBeInstanceOf(api.SearchLimitError);
      if (error instanceof api.SearchLimitError) expect(error.limit).toBe('stateEncoding');
    }
  });
});
