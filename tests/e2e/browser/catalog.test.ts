import { describe, expect, test } from 'vitest';
import rawCatalog from '../../benchmarks/fixtures.json' with { type: 'json' };
import { replayCommands } from '../../benchmarks/validation.ts';
import { solveLock, type Link, type Position } from '../../../src/index.ts';

function position(value: number): Position {
  if (value === 1 || value === 2 || value === 3 || value === 4 || value === 5 || value === 6 || value === 7) return value;
  throw new Error('Invalid pinned position');
}
function link(value: number): Link {
  if (value === -1 || value === 0 || value === 1) return value;
  throw new Error('Invalid pinned link');
}

describe('shared immutable 45-lock catalog', () => {
  test('contains exactly 45 unique fixed fixtures', () => {
    expect(rawCatalog).toHaveLength(45);
    expect(new Set(rawCatalog.map(({ id }) => id)).size).toBe(45);
  });
  for (const fixture of rawCatalog) {
    test(`${fixture.id}: independently replays the exact action minimum`, () => {
      const state = fixture.state.map(position);
      const links = fixture.links.map((row) => row.map(link));
      const before = JSON.stringify([state, links]);
      const commands = solveLock(state, links);
      expect(commands).not.toBeNull();
      expect(commands).toHaveLength(fixture.expectedActions);
      expect(replayCommands(fixture, commands)).toEqual(state.map(() => 4));
      expect(JSON.stringify([state, links])).toBe(before);
      expect(solveLock(state, links)).toEqual(commands);
    });
  }
});
