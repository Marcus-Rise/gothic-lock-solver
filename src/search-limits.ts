import { SearchLimitError } from './errors.ts';
import { readAt, readByte } from './indexed.ts';
import type { LockModel } from './lock-model.ts';
import type { Command, Delta } from './types.ts';

export interface SearchLimits {
  readonly maxVisited: number;
  readonly maxExpanded: number;
  readonly maxFrontier: number;
  readonly maxDenseBytes: number;
}

const DEFAULTS: SearchLimits = Object.freeze({
  maxVisited: 2_000_000,
  maxExpanded: 1_000_000,
  maxFrontier: 1_000_000,
  maxDenseBytes: 64 * 1024 * 1024,
});

/** Internal budgets are intentionally absent from the public two-argument API. */
export class SearchBudget {
  readonly options: SearchLimits;
  private visited = 0;
  private expanded = 0;

  constructor(options: Partial<SearchLimits> = {}) {
    this.options = { ...DEFAULTS, ...options };
  }

  check(name: keyof SearchLimits, used: number): void {
    if (used > this.options[name]) throw new SearchLimitError(name, this.options[name], used);
  }

  visit(): void {
    this.check('maxVisited', this.visited + 1);
    this.visited += 1;
  }

  expand(): void {
    this.check('maxExpanded', this.expanded + 1);
    this.expanded += 1;
  }
}

export interface Effect {
  readonly shifts: readonly { readonly target: number; readonly sign: number }[];
  readonly offset: number;
}

/** Base-7 encoding and precomputed direct effects belong to one search instance. */
export class PreparedSearch {
  readonly n: number;
  readonly size: number;
  readonly source: number;
  readonly goal: number;
  readonly effects: readonly Effect[];

  constructor(model: LockModel) {
    const { state, links } = model;
    const n = state.length;
    const size = 7 ** n;
    // Check before matrix work and even the already-open shortcut. N=18 is safe.
    if (!Number.isSafeInteger(size)) {
      throw new SearchLimitError('stateEncoding', Number.MAX_SAFE_INTEGER, size);
    }
    const powers = Array.from({ length: n }, (_, index) => 7 ** (n - index - 1));
    let source = 0;
    let goal = 0;
    for (let index = 0; index < n; index += 1) {
      const power = readAt(powers, index);
      source += (readAt(state, index) - 1) * power;
      goal += 3 * power;
    }
    this.n = n;
    this.size = size;
    this.source = source;
    this.goal = goal;
    this.effects = links.map((row, plate) => {
      const shifts: { target: number; sign: number }[] = [];
      let offset = 0;
      for (let target = 0; target < n; target += 1) {
        const sign = plate === target ? 1 : readAt(row, target);
        if (sign === 0) continue;
        shifts.push({ target, sign });
        offset += sign * readAt(powers, target);
      }
      return { shifts, offset };
    });
  }
}

export function decodeDigits(code: number, digits: Uint8Array): void {
  for (let index = digits.length - 1; index >= 0; index -= 1) {
    digits[index] = code % 7;
    code = Math.floor(code / 7);
  }
}

/** Monotone direct motion makes these endpoint bounds valid for every unit step. */
export function movementLimits(digits: Uint8Array, effect: Effect): readonly [number, number] {
  let plus = 6;
  let minus = 6;
  for (const { target, sign } of effect.shifts) {
    const position = readByte(digits, target);
    if (sign === 1) {
      if (6 - position < plus) plus = 6 - position;
      if (position < minus) minus = position;
    } else {
      if (position < plus) plus = position;
      if (6 - position < minus) minus = 6 - position;
    }
  }
  return [plus, minus];
}

function isDelta(value: number): value is Delta {
  return Number.isInteger(value) && value !== 0 && value >= -6 && value <= 6;
}

export function commandFor(plate: number, delta: number): Command {
  if (!isDelta(delta)) throw new Error('Internal command displacement invariant failed.');
  return [plate, delta];
}
