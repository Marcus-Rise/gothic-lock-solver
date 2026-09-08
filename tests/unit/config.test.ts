import { describe, expect, it } from 'vitest';
import * as api from '../../src/index.ts';
import type { SolverConfig } from '../../src/index.ts';

const defaults = {
  maxVisited: 2_000_000,
  maxExpanded: 1_000_000,
  maxFrontier: 1_000_000,
  maxDenseBytes: 67_108_864,
};
const state = [1, 7] as const;
const links = [[0, 0], [0, 0]] as const;

function configFromJavaScript(value: unknown): unknown {
  return Reflect.apply(api.createSolverConfig, undefined, [value]);
}

function solveFromJavaScript(value: unknown): unknown {
  return Reflect.apply(api.solveLock, undefined, [state, links, value]);
}

describe('public solver configuration', () => {
  it('exports a factory that returns complete frozen defaults', () => {
    expect(api).toHaveProperty('createSolverConfig');
    const config = api.createSolverConfig();
    expect(config).toEqual(defaults);
    expect(Object.isFrozen(config)).toBe(true);
    expect(api.createSolverConfig(undefined)).toEqual(defaults);
    expect(api.solveLock(state, links, config)).toEqual([[0, 3], [1, -3]]);
    expect(api.solveLock(state, links)).toEqual([[0, 3], [1, -3]]);
  });

  it('copies partial overrides without freezing or mutating the caller', () => {
    const overrides = { maxVisited: 3, maxDenseBytes: 0 };
    const config = api.createSolverConfig(overrides);
    expect(config).toEqual({ ...defaults, maxVisited: 3, maxDenseBytes: 0 });
    expect(overrides).toEqual({ maxVisited: 3, maxDenseBytes: 0 });
    expect(Object.isFrozen(overrides)).toBe(false);
    overrides.maxVisited = 1;
    expect(config.maxVisited).toBe(3);
    expect(Reflect.set(config, 'maxVisited', 1)).toBe(false);
    expect(api.solveLock(state, links, config)).toEqual([[0, 3], [1, -3]]);
  });

  it('accepts inclusive integer bounds and zero for expansion and dense storage', () => {
    expect(api.createSolverConfig({ maxVisited: 1, maxFrontier: 1, maxExpanded: 0, maxDenseBytes: 0 }))
      .toEqual({ maxVisited: 1, maxFrontier: 1, maxExpanded: 0, maxDenseBytes: 0 });
    const maximum = Object.fromEntries(Object.keys(defaults).map((key) => [key, Number.MAX_SAFE_INTEGER]));
    expect(configFromJavaScript(maximum)).toEqual(maximum);
  });

  it.each([null, [], 1, 'config', true, { unknown: 1 }, { [Symbol('unknown')]: 1 }].map((value) => ({ value })))
  ('rejects invalid override objects and unknown fields: $value', ({ value }) => {
    expect(() => configFromJavaScript(value)).toThrow(api.LockInputError);
  });

  for (const field of Object.keys(defaults)) {
    it.each([undefined, null, true, '1', 1n, -1, 0.5, Number.NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])
    (`rejects invalid ${field} values: %s`, (value) => {
      expect(() => configFromJavaScript({ [field]: value })).toThrow(api.LockInputError);
      expect(() => solveFromJavaScript({ ...defaults, [field]: value })).toThrow(api.LockInputError);
    });
  }

  it('rejects zero visited/frontier bounds and nonenumerable unknown fields', () => {
    for (const field of ['maxVisited', 'maxFrontier']) {
      expect(() => configFromJavaScript({ [field]: 0 })).toThrow(api.LockInputError);
    }
    expect(() => configFromJavaScript(Object.defineProperty({}, 'unknown', { value: 1 }))).toThrow(api.LockInputError);
  });

  it.each([null, [], false, {}, { maxVisited: 3 }, { ...defaults, unknown: 1 }].map((value) => ({ value })))
  ('revalidates complete configs from JavaScript: $value', ({ value }) => {
    expect(() => solveFromJavaScript(value)).toThrow(api.LockInputError);
  });

  it('requires own complete fields and validates ordinary caller mutations', () => {
    const inherited: unknown = Object.create(defaults);
    expect(() => solveFromJavaScript(inherited)).toThrow(api.LockInputError);
    const ordinary = { ...defaults };
    expect(solveFromJavaScript(ordinary)).toEqual([[0, 3], [1, -3]]);
    expect(ordinary).toEqual(defaults);
    expect(Object.isFrozen(ordinary)).toBe(false);
    ordinary.maxExpanded = -1;
    expect(() => solveFromJavaScript(ordinary)).toThrow(api.LockInputError);
  });
});

describe('public search budgets', () => {
  const cases = [
    { name: 'certificate', state, links },
    { name: 'A*', state: [3, 1, 1] as const, links: [[0, -1, -1], [-1, 0, -1], [-1, -1, 0]] as const },
    { name: 'singular BFS', state: [1, 1] as const, links: [[0, 1], [1, 0]] as const },
  ];
  for (const lock of cases) {
    for (const overrides of [{ maxExpanded: 0 }, { maxVisited: 1 }]) {
      it(`${lock.name} reports ${Object.keys(overrides)[0]} exhaustion instead of null`, () => {
        const config = api.createSolverConfig(overrides);
        expect(() => api.solveLock(lock.state, lock.links, config)).toThrow(api.SearchLimitError);
      });
    }
  }

  it('enforces frontier limits in both exact search strategies', () => {
    for (const lock of cases.slice(1)) {
      expect(() => api.solveLock(lock.state, lock.links, api.createSolverConfig({ maxFrontier: 1 })))
        .toThrow(api.SearchLimitError);
    }
  });

  it('counts the certificate path and permits exactly sufficient budgets', () => {
    const overrides: Partial<SolverConfig> = { maxVisited: 3, maxExpanded: 2, maxFrontier: 1 };
    expect(api.solveLock(state, links, api.createSolverConfig(overrides))).toEqual([[0, 3], [1, -3]]);
    expect(() => api.solveLock(state, links, api.createSolverConfig({ ...overrides, maxVisited: 2 })))
      .toThrow(api.SearchLimitError);
    expect(() => api.solveLock(state, links, api.createSolverConfig({ ...overrides, maxExpanded: 1 })))
      .toThrow(api.SearchLimitError);
  });

  it('preserves singular BFS action order in dense and forced sparse storage', () => {
    const singular = [[0, 1, 0], [1, 0, 0], [0, 0, 0]] as const;
    for (const maxDenseBytes of [0, defaults.maxDenseBytes]) {
      expect(api.solveLock([1, 1, 7], singular, api.createSolverConfig({ maxDenseBytes })))
        .toEqual([[0, 3], [2, -3]]);
    }
  });

  it('allows open and algebraically unreachable locks without state expansion', () => {
    const config = api.createSolverConfig({ maxExpanded: 0 });
    expect(api.solveLock([4, 4], links, config)).toEqual([]);
    expect(api.solveLock([3, 4], [[0, 1], [-1, 0]], config)).toBeNull();
  });
});
