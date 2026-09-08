import { describe, expect, it } from 'vitest';
import { solveLock } from '../../src/index.ts';
import type { Link, Position } from '../../src/index.ts';
import { LockModel } from '../../src/lock.ts';
import { PreparedSearch } from '../../src/lock.ts';
import { SearchBudget } from '../../src/config.ts';
import { createSolverConfig } from '../../src/index.ts';
import { BfsSearch } from '../../src/bfs.ts';
import { commandCost, referenceCost, replay } from './oracle.ts';
import fixtures from '../benchmarks/fixtures.json' with { type: 'json' };

function position(value: number): Position {
  if (value === 1 || value === 2 || value === 3 || value === 4 || value === 5 || value === 6 || value === 7) return value;
  throw new Error('Invalid fixture position');
}
function link(value: number): Link {
  if (value === -1 || value === 0 || value === 1) return value;
  throw new Error('Invalid fixture link');
}

describe('independent minimum-action then minimum-unit-shift oracle', () => {
  it('checks all 441 two-plate cases and replays every intermediate unit move', () => {
    let checked = 0;
    for (const a of [-1, 0, 1] as const) for (const b of [-1, 0, 1] as const) {
      for (let first = 1; first <= 7; first += 1) for (let second = 1; second <= 7; second += 1) {
        const lock = { state: [position(first), position(second)] as const, links: [[0, a], [b, 0]] as const };
        const prepared = new PreparedSearch(new LockModel(lock.state, lock.links));
        const expected = referenceCost(lock);
        const results = [solveLock(lock.state, lock.links), new BfsSearch(prepared, new SearchBudget()).solve(),
          new BfsSearch(prepared, new SearchBudget(createSolverConfig({ maxDenseBytes: 0 }))).solve()];
        for (const result of results) {
          expect(commandCost(result), JSON.stringify(lock)).toEqual(expected);
          if (result !== null) expect(replay(lock, result)).toEqual([4, 4]);
        }
        checked += 1;
      }
    }
    expect(checked).toBe(441);
  });
  it('checks 192 seeded three-plate inputs against A*, dense BFS and sparse BFS', () => {
    let seed = 0x51405;
    const random = (max: number): number => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed % max;
    };
    for (let sample = 0; sample < 192; sample += 1) {
      const state = Array.from({ length: 3 }, () => position(1 + random(7)));
      const links = Array.from({ length: 3 }, (_, row) => Array.from({ length: 3 }, (_, column) => row === column ? 0 : link(random(3) - 1)));
      const lock = { state, links };
      const expected = referenceCost(lock);
      const prepared = new PreparedSearch(new LockModel(state, links));
      const results = [solveLock(state, links), new BfsSearch(prepared, new SearchBudget()).solve(),
        new BfsSearch(prepared, new SearchBudget(createSolverConfig({ maxDenseBytes: 0 }))).solve()];
      for (const result of results) {
        expect(commandCost(result), JSON.stringify(lock)).toEqual(expected);
        if (result !== null) expect(replay(lock, result)).toEqual([4, 4, 4]);
      }
    }
  });
});

describe('fixed mathematical expectations', () => {
  it.each([
    { id: 'lock-011', actions: 9, unitShifts: 37 },
    { id: 'lock-018', actions: 14, unitShifts: 45 },
    { id: 'lock-019', actions: 14, unitShifts: 41 },
  ])('$id: minimizes unit shifts among minimum-action solutions', ({ id, actions, unitShifts }) => {
    const entry = fixtures.find((fixture) => fixture.id === id);
    if (entry === undefined) throw new Error('Missing regression fixture');
    const lock = { state: entry.state.map(position), links: entry.links.map((row) => row.map(link)) };
    const result = solveLock(lock.state, lock.links);
    expect(commandCost(result)).toEqual({ actions, unitShifts });
    if (result === null) throw new Error('Expected catalog solution');
    expect(replay(lock, result)).toEqual(lock.state.map(() => 4));
  });
  it('keeps all 45 numerical configurations and action minima', async () => {
    const semantics = fixtures.map(({ id, state, links, expectedActions }) => ({ id, state, links, expectedActions }));
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(semantics)));
    const hash = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
    expect(hash).toBe('22cfb8a9610dd81a487dcecf40420474f9a634916af054622cbfe0ef9fafb4a4');
    expect(fixtures).toHaveLength(45);
    expect(new Set(fixtures.map((entry) => entry.id)).size).toBe(45);
  });
  for (const entry of fixtures) {
    it(`${entry.id}: solves in ${entry.expectedActions} actions with legal intermediate moves`, () => {
      const state = entry.state.map(position);
      const links = entry.links.map((row) => row.map(link));
      const before = { state: [...state], links: links.map((row) => [...row]) };
      const result = solveLock(state, links);
      expect(result).toHaveLength(entry.expectedActions);
      if (result === null) throw new Error('Expected catalog solution');
      expect(replay({ state, links }, result)).toEqual(state.map(() => 4));
      expect({ state, links }).toEqual(before);
    });
  }
});
