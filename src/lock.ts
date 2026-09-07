import { LockInputError, SearchLimitError } from './errors.ts';
import type { Command, Delta, Link, Position } from './types.ts';

export const MIN_POSITION = 1;
export const MAX_POSITION = 7;
export const TARGET_POSITION = 4;
export const POSITION_COUNT = MAX_POSITION - MIN_POSITION + 1;
export const MAX_SHIFT = MAX_POSITION - MIN_POSITION;
export const DIRECTIONS = [1, -1] as const;
const MIN_PLATES = 2;

function isArray(value: unknown): value is readonly unknown[] {
  return Array.isArray(value);
}

function isPosition(value: unknown): value is Position {
  return typeof value === 'number'
    && Number.isInteger(value)
    && value >= MIN_POSITION
    && value <= MAX_POSITION;
}

function isLink(value: unknown): value is Link {
  return value === -1 || value === 0 || value === 1;
}

function copyState(state: unknown): readonly Position[] {
  if (!isArray(state) || state.length < MIN_PLATES) {
    throw new LockInputError(`state должен содержать не менее ${MIN_PLATES} пластин.`);
  }

  const positions: Position[] = [];
  for (let plate = 0; plate < state.length; plate += 1) {
    const position = state[plate];
    if (!Object.hasOwn(state, plate) || !isPosition(position)) {
      throw new LockInputError(`state[${plate}] должен быть целым числом от ${MIN_POSITION} до ${MAX_POSITION}.`);
    }
    positions.push(position);
  }
  return Object.freeze(positions);
}

function copyLinkRow(row: unknown, source: number, plateCount: number): readonly Link[] {
  if (!isArray(row) || row.length !== plateCount) {
    throw new LockInputError(`links[${source}] должен содержать ${plateCount} элементов.`);
  }

  const coefficients: Link[] = [];
  for (let target = 0; target < plateCount; target += 1) {
    const coefficient = row[target];
    if (!Object.hasOwn(row, target) || !isLink(coefficient)) {
      throw new LockInputError(`links[${source}][${target}] должен быть -1, 0 или 1.`);
    }
    if (source === target && coefficient !== 0) {
      throw new LockInputError(`links[${source}][${target}] на диагонали должен быть 0.`);
    }
    coefficients.push(coefficient);
  }
  return Object.freeze(coefficients);
}

function copyLinks(links: unknown, plateCount: number): readonly (readonly Link[])[] {
  if (!isArray(links) || links.length !== plateCount) {
    throw new LockInputError(`links должен быть матрицей ${plateCount}x${plateCount}.`);
  }

  const rows: (readonly Link[])[] = [];
  for (let source = 0; source < plateCount; source += 1) {
    if (!Object.hasOwn(links, source)) {
      throw new LockInputError(`links[${source}] должен содержать ${plateCount} элементов.`);
    }
    rows.push(copyLinkRow(links[source], source, plateCount));
  }
  return Object.freeze(rows);
}

/** Owns validated immutable inputs, independent of caller mutations. */
export class LockModel {
  readonly state: readonly Position[];
  readonly links: readonly (readonly Link[])[];

  constructor(state: unknown, links: unknown) {
    this.state = copyState(state);
    this.links = copyLinks(links, this.state.length);
  }
}

export interface Effect {
  readonly shifts: readonly { readonly target: number; readonly sign: number }[];
  readonly stateCodeOffset: number;
}

/** Base-7 state codes and direct plate effects prepared once per search. */
export class PreparedSearch {
  readonly plateCount: number;
  readonly stateCount: number;
  readonly initialCode: number;
  readonly goalCode: number;
  readonly effects: readonly Effect[];

  constructor({ state, links }: LockModel) {
    this.plateCount = state.length;
    this.stateCount = POSITION_COUNT ** this.plateCount;
    // Enforce the representation limit before even the already-open shortcut.
    if (!Number.isSafeInteger(this.stateCount)) {
      throw new SearchLimitError('stateEncoding', Number.MAX_SAFE_INTEGER, this.stateCount);
    }

    const placeValues = Array.from(
      { length: this.plateCount },
      (_, plate) => POSITION_COUNT ** (this.plateCount - plate - 1),
    );
    let initialCode = 0;
    let goalCode = 0;
    for (let plate = 0; plate < this.plateCount; plate += 1) {
      const placeValue = readAt(placeValues, plate);
      initialCode += (readAt(state, plate) - MIN_POSITION) * placeValue;
      goalCode += (TARGET_POSITION - MIN_POSITION) * placeValue;
    }
    this.initialCode = initialCode;
    this.goalCode = goalCode;
    this.effects = links.map((row, plate) => prepareEffect(row, plate, placeValues));
  }
}

function prepareEffect(row: readonly Link[], plate: number, placeValues: readonly number[]): Effect {
  const shifts: { target: number; sign: number }[] = [];
  let stateCodeOffset = 0;
  for (let target = 0; target < row.length; target += 1) {
    const sign = plate === target ? 1 : readAt(row, target);
    if (sign === 0) {
      continue;
    }
    shifts.push({ target, sign });
    stateCodeOffset += sign * readAt(placeValues, target);
  }
  return { shifts, stateCodeOffset };
}

export function decodeDigits(stateCode: number, digits: Uint8Array): void {
  for (let plate = digits.length - 1; plate >= 0; plate -= 1) {
    digits[plate] = stateCode % POSITION_COUNT;
    stateCode = Math.floor(stateCode / POSITION_COUNT);
  }
}

/** Monotone direct motion makes endpoint bounds sufficient for every unit step. */
export function movementLimits(digits: Uint8Array, effect: Effect): readonly [positive: number, negative: number] {
  let positiveLimit = MAX_SHIFT;
  let negativeLimit = MAX_SHIFT;
  for (const { target, sign } of effect.shifts) {
    const positionDigit = readByte(digits, target);
    const distanceToStart = positionDigit;
    const distanceToEnd = MAX_SHIFT - positionDigit;
    if (sign === 1) {
      positiveLimit = Math.min(positiveLimit, distanceToEnd);
      negativeLimit = Math.min(negativeLimit, distanceToStart);
    } else {
      positiveLimit = Math.min(positiveLimit, distanceToStart);
      negativeLimit = Math.min(negativeLimit, distanceToEnd);
    }
  }
  return [positiveLimit, negativeLimit];
}

/** One grouped action can contribute at most MAX_SHIFT positions on one plate. */
export function minimumActionsForShift(shift: number): number {
  return Math.ceil(Math.abs(shift) / MAX_SHIFT);
}

function isDelta(value: number): value is Delta {
  return Number.isInteger(value) && value !== 0 && value >= -MAX_SHIFT && value <= MAX_SHIFT;
}

export function commandFor(plate: number, delta: number): Command {
  if (!isDelta(delta)) {
    throw new Error('Internal command displacement invariant failed.');
  }
  return [plate, delta];
}

/** Checked access keeps dense-array invariants executable under strict indexing. */
export function readAt<T>(values: readonly T[], index: number): T {
  const value = values[index];
  if (value === undefined) {
    throw new Error(`Internal indexed-access invariant failed at ${index}.`);
  }
  return value;
}

/** Typed readers keep hot typed-array access separate from object-array shapes. */
export function readByte(values: Uint8Array, index: number): number {
  const value = values[index];
  if (value === undefined) {
    throw new Error(`Internal byte-access invariant failed at ${index}.`);
  }
  return value;
}

export function readInt32(values: Int32Array, index: number): number {
  const value = values[index];
  if (value === undefined) {
    throw new Error(`Internal integer-access invariant failed at ${index}.`);
  }
  return value;
}

export function readFloat64(values: Float64Array, index: number): number {
  const value = values[index];
  if (value === undefined) {
    throw new Error(`Internal number-access invariant failed at ${index}.`);
  }
  return value;
}
