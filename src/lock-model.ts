import { LockInputError } from './errors.ts';
import type { Link, Position } from './types.ts';

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
