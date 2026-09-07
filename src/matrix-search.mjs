import { analyzeMatrix } from './matrix-analysis.mjs';
import { searchBfs } from './search-bfs.mjs';
import { commandFor, decodeDigits, movementLimits, SearchLimitError } from './search-limits.mjs';

/** One entry per open state; decrease-key never leaves obsolete heap nodes. */
class IndexedHeap {
  nodes = [];

  before(a, b) {
    return a.g + a.h < b.g + b.h ||
      (a.g + a.h === b.g + b.h && (a.h < b.h || (a.h === b.h && a.sequence < b.sequence)));
  }

  up(node) {
    let index = node.heapIndex;
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (!this.before(node, this.nodes[parent])) break;
      this.nodes[index] = this.nodes[parent];
      this.nodes[index].heapIndex = index;
      index = parent;
    }
    this.nodes[index] = node;
    node.heapIndex = index;
  }

  push(node) {
    node.heapIndex = this.nodes.length;
    this.nodes.push(node);
    this.up(node);
  }

  pop() {
    const first = this.nodes[0];
    const last = this.nodes.pop();
    first.heapIndex = -1;
    if (this.nodes.length === 0) return first;
    let index = 0;
    while (true) {
      let child = index * 2 + 1;
      if (child >= this.nodes.length) break;
      if (child + 1 < this.nodes.length && this.before(this.nodes[child + 1], this.nodes[child])) child += 1;
      if (!this.before(this.nodes[child], last)) break;
      this.nodes[index] = this.nodes[child];
      this.nodes[index].heapIndex = index;
      index = child;
    }
    this.nodes[index] = last;
    last.heapIndex = index;
    return first;
  }
}

/**
 * A sufficient certificate, never an unreachability test. A legal single action
 * for each nonzero net entry attains sum ceil(abs(net[i])/6), a global bound.
 * An unsuccessful greedy attempt is discarded and full A* still runs.
 */
function greedyCertificate(prepared, net, budget) {
  if (net.some((value) => Math.abs(value) > 6)) return null;
  const remaining = [...net];
  const digits = new Uint8Array(prepared.n);
  decodeDigits(prepared.source, digits);
  const commands = [];
  let pending = remaining.filter(Boolean).length;
  while (pending > 0) {
    let selected = -1;
    for (let plate = 0; plate < prepared.n; plate += 1) {
      const delta = remaining[plate];
      if (delta === 0) continue;
      const limits = movementLimits(digits, prepared.effects[plate]);
      if (Math.abs(delta) <= limits[delta > 0 ? 0 : 1]) { selected = plate; break; }
    }
    if (selected === -1) return null;
    const delta = remaining[selected];
    const effect = prepared.effects[selected];
    for (let index = 0; index < effect.targets.length; index += 1) {
      digits[effect.targets[index]] += delta * effect.signs[index];
    }
    commands.push(commandFor(selected, delta));
    remaining[selected] = 0;
    pending -= 1;
  }
  // Successful scheduling accounts for its path states and expansions too.
  budget.check('maxVisited', commands.length + 1);
  budget.check('maxExpanded', commands.length);
  return commands;
}

function reconstruct(node) {
  const commands = [];
  while (node.previous !== null) {
    commands.push(commandFor(node.plate, node.delta));
    node = node.previous;
  }
  return commands.reverse();
}

/**
 * Invertible A makes remaining net r unique for every physical state. An action
 * changes one r[i] by at most six, hence h=sum ceil(abs(r[i])/6) is consistent.
 * Closed nodes are final; the first popped goal has the minimum action count.
 */
export function searchMatrix(definition, prepared, budget) {
  const { n, source, goal, effects } = prepared;
  if (source === goal) { budget.visit(); return []; }
  const analysis = analyzeMatrix(definition);
  if (analysis.kind === 'inconsistent' || analysis.kind === 'noninteger') return null;
  if (analysis.kind === 'singular') return searchBfs(prepared, budget);
  const certificate = greedyCertificate(prepared, analysis.net, budget);
  if (certificate !== null) return certificate;

  budget.visit();
  const root = {
    key: source, g: 0, h: analysis.lowerBound, r: analysis.net,
    previous: null, sequence: 0, heapIndex: -1, closed: false,
  };
  const heap = new IndexedHeap();
  heap.push(root);
  const records = new Map([[source, root]]);
  const digits = new Uint8Array(n);
  let sequence = 1;
  while (heap.nodes.length > 0) {
    const node = heap.pop();
    if (node.key === goal) return reconstruct(node);
    budget.expand();
    node.closed = true;
    decodeDigits(node.key, digits);
    for (let plate = 0; plate < n; plate += 1) {
      const limits = movementLimits(digits, effects[plate]);
      const preferred = node.r[plate] < 0 ? -1 : 1;
      for (let side = 0; side < 2; side += 1) {
        const sign = side === 0 ? preferred : -preferred;
        const limit = limits[sign > 0 ? 0 : 1];
        for (let steps = limit; steps >= 1; steps -= 1) {
          const delta = sign * steps;
          const key = node.key + delta * effects[plate].offset;
          const g = node.g + 1;
          const existing = records.get(key);
          if (existing && (existing.closed || existing.g <= g)) continue;
          if (existing) {
            // The physical state uniquely determines r and h, so only g and
            // the predecessor change. Its predecessor is already finalized.
            existing.g = g;
            existing.previous = node;
            existing.plate = plate;
            existing.delta = delta;
            heap.up(existing);
            continue;
          }
          budget.visit();
          budget.check('maxFrontier', heap.nodes.length + 1);
          const r = [...node.r];
          r[plate] -= delta;
          const h = node.h - Math.ceil(Math.abs(node.r[plate]) / 6) + Math.ceil(Math.abs(r[plate]) / 6);
          if (!Number.isSafeInteger(r[plate]) || !Number.isSafeInteger(g + h)) {
            throw new SearchLimitError('matrixArithmetic', Number.MAX_SAFE_INTEGER, String(r[plate]));
          }
          const next = { key, g, h, r, previous: node, plate, delta, sequence: sequence++, heapIndex: -1, closed: false };
          records.set(key, next);
          heap.push(next);
        }
      }
    }
  }
  return null;
}
