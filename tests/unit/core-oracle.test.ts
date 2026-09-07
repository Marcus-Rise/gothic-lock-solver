import { describe, expect, it } from 'vitest';
import { solveLock } from '../../src/index.ts';
import type { Link, Position } from '../../src/index.ts';
import { LockModel } from '../../src/lock-model.ts';
import { PreparedSearch, SearchBudget } from '../../src/search-limits.ts';
import { BfsSearch } from '../../src/search-bfs.ts';
import { referenceActions, replay } from '../helpers/oracle.ts';
import catalog from '../../benchmarks/fixtures/catalog.json' with { type: 'json' };
import manifest from '../../benchmarks/fixtures/manifest.json' with { type: 'json' };
import catalogText from '../../benchmarks/fixtures/catalog.json?raw';

function position(value: number): Position {
  if (value === 1 || value === 2 || value === 3 || value === 4 || value === 5 || value === 6 || value === 7) return value;
  throw new Error('Invalid fixture position');
}
function link(value: number): Link {
  if (value === -1 || value === 0 || value === 1) return value;
  throw new Error('Invalid fixture link');
}

describe('independent minimum-action oracle', () => {
  it('checks all 441 two-plate cases and replays every intermediate unit move', () => {
    let checked = 0;
    for (const a of [-1, 0, 1] as const) for (const b of [-1, 0, 1] as const) {
      for (let first = 1; first <= 7; first += 1) for (let second = 1; second <= 7; second += 1) {
        const lock = { state: [position(first), position(second)] as const, links: [[0, a], [b, 0]] as const };
        const result = solveLock(lock.state, lock.links);
        expect(result?.length ?? null, JSON.stringify(lock)).toBe(referenceActions(lock));
        if (result !== null) expect(replay(lock, result)).toEqual([4, 4]);
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
      const expected = referenceActions(lock);
      const prepared = new PreparedSearch(new LockModel(state, links));
      const results = [solveLock(state, links), new BfsSearch(prepared, new SearchBudget()).solve(),
        new BfsSearch(prepared, new SearchBudget({ maxDenseBytes: 0 })).solve()];
      for (const result of results) {
        expect(result?.length ?? null, JSON.stringify(lock)).toBe(expected);
        if (result !== null) expect(replay(lock, result)).toEqual([4, 4, 4]);
      }
    }
  });
});

describe('preserved catalog', () => {
  it('keeps all 45 fixtures and the pinned source hash', async () => {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(catalogText));
    const hash = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
    expect(hash).toBe(manifest.catalogSha256);
    expect(catalog).toHaveLength(45);
    expect(new Set(catalog.map((entry) => entry.id)).size).toBe(45);
    expect(manifest.source.revision).toBe('eee0bf50ebcb7fffd2b47954fd76bb015854e365');
  });
  for (const entry of catalog) {
    it(`${entry.id}: solves in ${entry.expectedActions} actions with legal intermediate moves`, () => {
      const state = entry.definition.state.map(position);
      const links = entry.definition.links.map((row) => row.map(link));
      const before = { state: [...state], links: links.map((row) => [...row]) };
      const result = solveLock(state, links);
      expect(result).toHaveLength(entry.expectedActions);
      if (result === null) throw new Error('Expected catalog solution');
      expect(replay({ state, links }, result)).toEqual(state.map(() => 4));
      expect({ state, links }).toEqual(before);
    });
  }
});
