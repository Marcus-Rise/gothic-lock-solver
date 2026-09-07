import { expect, it } from 'vitest';
import { IndexedHeap, NOT_QUEUED } from '../../src/priority-queue.ts';
import type { SearchNode } from '../../src/priority-queue.ts';

function node(state: number, cost: readonly [actions: number, units: number],
  estimate: readonly [actions: number, units: number]): SearchNode {
  return {
    state, actionCount: cost[0], unitShifts: cost[1], estimate: estimate[0], shiftEstimate: estimate[1],
    remainingShifts: [], previous: null, plate: -1, delta: 0, sequence: state,
    heapIndex: NOT_QUEUED, closed: false,
  };
}

it('orders total actions before total units, with remaining actions only breaking cost ties', () => {
  const frontier = new IndexedHeap();
  const fewerActions = node(0, [1, 100], [0, 0]);
  const fewerUnits = node(1, [1, 3], [1, 1]);
  const moreUnits = node(2, [2, 5], [0, 0]);
  const equalCostCloser = node(3, [2, 4], [0, 0]);
  for (const entry of [moreUnits, fewerUnits, equalCostCloser, fewerActions]) frontier.push(entry);
  expect([frontier.pop(), frontier.pop(), frontier.pop(), frontier.pop()])
    .toEqual([fewerActions, equalCostCloser, fewerUnits, moreUnits]);
});

it('decreases equal-action unit cost in place without stale queue entries', () => {
  const frontier = new IndexedHeap();
  const first = node(0, [2, 7], [0, 0]);
  const improved = node(1, [1, 8], [1, 2]);
  frontier.push(first);
  frontier.push(improved);
  improved.unitShifts = 3;
  frontier.decreasePriority(improved);
  expect(frontier.size).toBe(2);
  expect(frontier.pop()).toBe(improved);
  expect(frontier.pop()).toBe(first);
  expect(frontier.size).toBe(0);
});
