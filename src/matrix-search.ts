import { SearchLimitError } from './errors.ts';
import { readAt, readByte } from './indexed.ts';
import { IndexedHeap } from './indexed-heap.ts';
import type { SearchNode } from './indexed-heap.ts';
import type { LockModel } from './lock-model.ts';
import { analyzeMatrix } from './matrix-analysis.ts';
import { BfsSearch } from './search-bfs.ts';
import { commandFor, decodeDigits, movementLimits } from './search-limits.ts';
import type { PreparedSearch, SearchBudget } from './search-limits.ts';
import type { Command, SearchStrategy } from './types.ts';

/**
 * Sufficient certificate only: legal single actions for nonzero net entries
 * attain the global lower bound. Failure is discarded and full A* still runs.
 */
function greedyCertificate(prepared: PreparedSearch, net: readonly number[], budget: SearchBudget): readonly Command[] | null {
  if (net.some((value) => Math.abs(value) > 6)) return null;
  const remaining = [...net];
  const digits = new Uint8Array(prepared.n);
  decodeDigits(prepared.source, digits);
  const commands: Command[] = [];
  let pending = remaining.filter(Boolean).length;
  while (pending > 0) {
    let selected = -1;
    for (let plate = 0; plate < prepared.n; plate += 1) {
      const delta = readAt(remaining, plate);
      if (delta === 0) continue;
      const limits = movementLimits(digits, readAt(prepared.effects, plate));
      if (Math.abs(delta) <= limits[delta > 0 ? 0 : 1]) { selected = plate; break; }
    }
    if (selected === -1) return null;
    const delta = readAt(remaining, selected);
    const effect = readAt(prepared.effects, selected);
    for (const { target, sign } of effect.shifts) {
      digits[target] = readByte(digits, target) + delta * sign;
    }
    commands.push(commandFor(selected, delta));
    remaining[selected] = 0;
    pending -= 1;
  }
  budget.check('maxVisited', commands.length + 1);
  budget.check('maxExpanded', commands.length);
  return commands;
}

function reconstruct(node: SearchNode): readonly Command[] {
  const commands: Command[] = [];
  while (node.previous !== null) {
    commands.push(commandFor(node.plate, node.delta));
    node = node.previous;
  }
  return commands.reverse();
}

/**
 * Invertible A gives a unique remaining net r for each physical state. An action
 * changes one r[i] by at most six, so h = sum ceil(abs(r[i])/6) is consistent.
 * Closed nodes are final and the first popped goal minimizes action count.
 */
export class MatrixSearch implements SearchStrategy {
  private readonly model: LockModel;
  private readonly prepared: PreparedSearch;
  private readonly budget: SearchBudget;

  constructor(model: LockModel, prepared: PreparedSearch, budget: SearchBudget) {
    this.model = model;
    this.prepared = prepared;
    this.budget = budget;
  }

  solve(): readonly Command[] | null {
    const { n, source, goal, effects } = this.prepared;
    const budget = this.budget;
    if (source === goal) { budget.visit(); return []; }
    const analysis = analyzeMatrix(this.model);
    if (analysis.kind === 'inconsistent' || analysis.kind === 'noninteger') return null;
    if (analysis.kind === 'singular') return new BfsSearch(this.prepared, budget).solve();
    const certificate = greedyCertificate(this.prepared, analysis.net, budget);
    if (certificate !== null) return certificate;

    budget.visit();
    const root: SearchNode = {
      key: source, g: 0, h: analysis.lowerBound, r: analysis.net,
      previous: null, plate: -1, delta: 0, sequence: 0, heapIndex: -1, closed: false,
    };
    const heap = new IndexedHeap();
    heap.push(root);
    const records = new Map<number, SearchNode>([[source, root]]);
    const digits = new Uint8Array(n);
    let sequence = 1;
    while (heap.size > 0) {
      const node = heap.pop();
      if (node.key === goal) return reconstruct(node);
      budget.expand();
      node.closed = true;
      decodeDigits(node.key, digits);
      for (let plate = 0; plate < n; plate += 1) {
        const effect = effects[plate];
        const previousNet = node.r[plate];
        if (effect === undefined || previousNet === undefined) throw new Error('Internal search dimension invariant failed.');
        const limits = movementLimits(digits, effect);
        const preferred = previousNet < 0 ? -1 : 1;
        for (let side = 0; side < 2; side += 1) {
          const sign = side === 0 ? preferred : -preferred;
          const limit = limits[sign > 0 ? 0 : 1];
          for (let steps = limit; steps >= 1; steps -= 1) {
            const delta = sign * steps;
            const key = node.key + delta * effect.offset;
            const g = node.g + 1;
            const existing = records.get(key);
            if (existing !== undefined && (existing.closed || existing.g <= g)) continue;
            if (existing !== undefined) {
              // The physical state uniquely determines r/h; finalized parent
              // and a lower g are the only changes required by decrease-key.
              existing.g = g;
              existing.previous = node;
              existing.plate = plate;
              existing.delta = delta;
              heap.up(existing);
              continue;
            }
            budget.visit();
            budget.check('maxFrontier', heap.size + 1);
            const r = [...node.r];
            const remaining = previousNet - delta;
            r[plate] = remaining;
            const h = node.h - Math.ceil(Math.abs(previousNet) / 6) + Math.ceil(Math.abs(remaining) / 6);
            if (!Number.isSafeInteger(remaining) || !Number.isSafeInteger(g + h)) {
              throw new SearchLimitError('matrixArithmetic', Number.MAX_SAFE_INTEGER, String(remaining));
            }
            const next: SearchNode = { key, g, h, r, previous: node, plate, delta, sequence: sequence++, heapIndex: -1, closed: false };
            records.set(key, next);
            heap.push(next);
          }
        }
      }
    }
    return null;
  }
}
