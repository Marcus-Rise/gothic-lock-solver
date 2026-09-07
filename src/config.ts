import { LockInputError } from './errors.ts';

/** Per-solve resource limits. Byte and expansion limits may be zero. */
export interface SolverConfig {
  readonly maxVisited: number;
  readonly maxExpanded: number;
  readonly maxFrontier: number;
  readonly maxDenseBytes: number;
}

const DEFAULTS: SolverConfig = Object.freeze({
  maxVisited: 2_000_000,
  maxExpanded: 1_000_000,
  maxFrontier: 1_000_000,
  maxDenseBytes: 64 * 1024 * 1024,
});

function isConfigField(key: PropertyKey): key is keyof SolverConfig {
  return key === 'maxVisited' || key === 'maxExpanded' || key === 'maxFrontier' || key === 'maxDenseBytes';
}

/** Shared runtime boundary for typed callers, ordinary JavaScript and CLI JSON. */
export function validateSolverConfig(value: unknown, partial = false): SolverConfig {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new LockInputError('Конфигурация поиска должна быть объектом.');
  }
  const config = { ...DEFAULTS };
  for (const key of Reflect.ownKeys(value)) {
    if (!isConfigField(key)) throw new LockInputError(`Неизвестное поле конфигурации: ${String(key)}.`);
    const setting: unknown = Reflect.get(value, key);
    const minimum = key === 'maxVisited' || key === 'maxFrontier' ? 1 : 0;
    if (typeof setting !== 'number' || !Number.isSafeInteger(setting) || setting < minimum) {
      throw new LockInputError(`${key} должен быть безопасным целым числом не меньше ${minimum}.`);
    }
    config[key] = setting;
  }
  if (!partial) {
    for (const key of Object.keys(DEFAULTS)) {
      if (!Object.hasOwn(value, key)) throw new LockInputError(`В конфигурации отсутствует поле ${key}.`);
    }
  }
  return Object.freeze(config);
}

/** Return a complete immutable configuration without changing the overrides. */
export function createSolverConfig(overrides: Partial<SolverConfig> = {}): SolverConfig {
  return validateSolverConfig(overrides, true);
}
