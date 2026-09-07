import { SearchLimitError } from './errors.ts';
import { readAt, readByte, readInt32 } from './indexed.ts';
import { commandFor, decodeDigits, movementLimits } from './search-limits.ts';
import type { PreparedSearch, SearchBudget } from './search-limits.ts';
import type { Command, SearchStrategy } from './types.ts';

interface SparseRecord {
  readonly parent: number;
  readonly action: number;
}

type Records =
  | { readonly dense: true; readonly parents: Int32Array; readonly actions: Uint8Array }
  | { readonly dense: false; readonly parents: Map<number, SparseRecord> };

function unpack(packed: number): Command {
  const plateDirection = Math.floor(packed / 6);
  const sign = plateDirection % 2 === 0 ? 1 : -1;
  return commandFor(Math.floor(plateDirection / 2), sign * (packed % 6 + 1));
}

function reconstruct(records: Records, source: number, code: number): readonly Command[] {
  const commands: Command[] = [];
  while (code !== source) {
    if (records.dense) {
      commands.push(unpack(readByte(records.actions, code)));
      code = readInt32(records.parents, code);
    } else {
      const node = records.parents.get(code);
      if (node === undefined) throw new Error('Internal BFS predecessor invariant failed.');
      commands.push(unpack(node.action));
      code = node.parent;
    }
  }
  return commands.reverse();
}

/** Exact action BFS; source index, positive sign, then larger steps win ties. */
export class BfsSearch implements SearchStrategy {
  private readonly prepared: PreparedSearch;
  private readonly budget: SearchBudget;

  constructor(prepared: PreparedSearch, budget: SearchBudget) {
    this.prepared = prepared;
    this.budget = budget;
  }

  solve(): readonly Command[] | null {
    const { n, size, source, goal, effects } = this.prepared;
    const budget = this.budget;
    budget.visit();
    if (source === goal) return [];

    // Signed parents need two sentinel values. Queue holds only the live frontier.
    const capacity = Math.min(size, budget.options.maxVisited, budget.options.maxFrontier);
    const denseBytes = size * 5 + capacity * 4;
    const dense = size <= 0x7fffffff && denseBytes <= budget.options.maxDenseBytes;
    let records: Records;
    let queue: Int32Array | number[];
    try {
      records = dense
        ? { dense: true, parents: new Int32Array(size).fill(-2), actions: new Uint8Array(size) }
        : { dense: false, parents: new Map<number, SparseRecord>() };
      queue = dense ? new Int32Array(capacity) : [];
    } catch (error) {
      if (!(error instanceof RangeError)) throw error;
      throw new SearchLimitError('maxDenseBytes', budget.options.maxDenseBytes, denseBytes, { cause: error });
    }
    if (records.dense) records.parents[source] = -1;
    else records.parents.set(source, { parent: -1, action: -1 });
    queue[0] = source;
    let head = 0;
    let tail = 1 % capacity;
    let frontier = 1;
    const digits = new Uint8Array(n);

    while (frontier > 0) {
      budget.expand();
      const code = queue instanceof Int32Array ? readInt32(queue, head) : readAt(queue, head);
      head = (head + 1) % capacity;
      frontier -= 1;
      decodeDigits(code, digits);
      for (let plate = 0; plate < n; plate += 1) {
        const effect = effects[plate];
        if (effect === undefined) throw new Error('Internal search dimension invariant failed.');
        const limits = movementLimits(digits, effect);
        for (let direction = 0; direction < 2; direction += 1) {
          const sign = direction === 0 ? 1 : -1;
          const limit = direction === 0 ? limits[0] : limits[1];
          for (let steps = limit; steps >= 1; steps -= 1) {
            const next = code + sign * steps * effect.offset;
            if (records.dense ? readInt32(records.parents, next) !== -2 : records.parents.has(next)) continue;
            budget.visit();
            const action = (plate * 2 + direction) * 6 + steps - 1;
            if (records.dense) {
              records.parents[next] = code;
              records.actions[next] = action;
            } else records.parents.set(next, { parent: code, action });
            if (next === goal) return reconstruct(records, source, next);
            budget.check('maxFrontier', frontier + 1);
            queue[tail] = next;
            tail = (tail + 1) % capacity;
            frontier += 1;
          }
        }
      }
    }
    return null;
  }
}
