import { LockInputError, SearchLimitError } from './errors.ts';
import type { Command, Delta, Link, Position } from './types.ts';

function isArray(value: unknown): value is readonly unknown[] {
  return Array.isArray(value);
}

function isPosition(value: unknown): value is Position {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 7;
}

function isLink(value: unknown): value is Link {
  return value === -1 || value === 0 || value === 1;
}

/** Owns a validated immutable copy of the lock, independent of caller mutations. */
export class LockModel {
  readonly state: readonly Position[];
  readonly links: readonly (readonly Link[])[];

  constructor(state: unknown, links: unknown) {
    if (!isArray(state) || state.length < 2) {
      throw new LockInputError('state должен содержать не менее 2 пластин.');
    }
    const copiedState: Position[] = [];
    for (let index = 0; index < state.length; index += 1) {
      const position = state[index];
      if (!Object.hasOwn(state, index) || !isPosition(position)) {
        throw new LockInputError(`state[${index}] должен быть целым числом от 1 до 7.`);
      }
      copiedState.push(position);
    }
    if (!isArray(links) || links.length !== state.length) {
      throw new LockInputError(`links должен быть матрицей ${state.length}x${state.length}.`);
    }
    const copiedLinks: (readonly Link[])[] = [];
    for (let source = 0; source < links.length; source += 1) {
      const row = links[source];
      if (!Object.hasOwn(links, source) || !isArray(row) || row.length !== state.length) {
        throw new LockInputError(`links[${source}] должен содержать ${state.length} элементов.`);
      }
      const copiedRow: Link[] = [];
      for (let target = 0; target < row.length; target += 1) {
        const coefficient = row[target];
        if (!Object.hasOwn(row, target) || !isLink(coefficient)) {
          throw new LockInputError(`links[${source}][${target}] должен быть -1, 0 или 1.`);
        }
        if (source === target && coefficient !== 0) {
          throw new LockInputError(`links[${source}][${target}] на диагонали должен быть 0.`);
        }
        copiedRow.push(coefficient);
      }
      copiedLinks.push(Object.freeze(copiedRow));
    }
    this.state = Object.freeze(copiedState);
    this.links = Object.freeze(copiedLinks);
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

/**
 * Checked indexed access for internally dense arrays and bounded state tables.
 * Call sites establish bounds through validated dimensions, allocated lengths or
 * search membership. The check keeps that invariant executable and avoids type
 * assertions / unchecked non-null accesses under noUncheckedIndexedAccess.
 */
export function readAt<T>(values: readonly T[], index: number): T {
  const value = values[index];
  if (value === undefined) throw new Error(`Internal indexed-access invariant failed at ${index}.`);
  return value;
}

/** Typed readers keep hot typed-array access separate from object-array shapes. */
export function readByte(values: Uint8Array, index: number): number {
  const value = values[index];
  if (value === undefined) throw new Error(`Internal byte-access invariant failed at ${index}.`);
  return value;
}

export function readInt32(values: Int32Array, index: number): number {
  const value = values[index];
  if (value === undefined) throw new Error(`Internal integer-access invariant failed at ${index}.`);
  return value;
}
