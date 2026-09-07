import { SearchLimitError } from './errors.ts';
import {
  DIRECTIONS,
  MAX_SHIFT,
  commandFor,
  decodeDigits,
  minimumActionsForShift,
  movementLimits,
  readAt,
  readByte,
} from './lock.ts';
import type { Effect, LockModel, PreparedSearch } from './lock.ts';
import { IndexedHeap, NOT_QUEUED } from './priority-queue.ts';
import type { SearchNode } from './priority-queue.ts';
import { analyzeMatrix } from './matrix.ts';
import { BfsSearch } from './bfs.ts';
import type { SearchBudget } from './config.ts';
import type { Command } from './types.ts';

function findExecutablePlate(
  prepared: PreparedSearch,
  remainingShifts: readonly number[],
  positionDigits: Uint8Array,
): number | null {
  for (let plate = 0; plate < prepared.plateCount; plate += 1) {
    const shift = readAt(remainingShifts, plate);
    if (shift === 0) {
      continue;
    }
    const effect = readAt(prepared.effects, plate);
    const [positiveLimit, negativeLimit] = movementLimits(positionDigits, effect);
    const allowedShift = shift > 0 ? positiveLimit : negativeLimit;
    if (Math.abs(shift) <= allowedShift) {
      return plate;
    }
  }
  return null;
}

/**
 * A sufficient certificate: one legal action per nonzero net shift attains the
 * lower bound. Failure proves nothing; A* then starts from the initial state.
 */
function greedyCertificate(
  prepared: PreparedSearch,
  requiredShifts: readonly number[],
  budget: SearchBudget,
): readonly Command[] | null {
  if (requiredShifts.some((shift) => Math.abs(shift) > MAX_SHIFT)) {
    return null;
  }

  const remainingShifts = [...requiredShifts];
  const positionDigits = new Uint8Array(prepared.plateCount);
  decodeDigits(prepared.initialCode, positionDigits);
  const commands: Command[] = [];
  let pendingActions = remainingShifts.filter((shift) => shift !== 0).length;
  while (pendingActions > 0) {
    const plate = findExecutablePlate(prepared, remainingShifts, positionDigits);
    if (plate === null) {
      return null;
    }
    const shift = readAt(remainingShifts, plate);
    const effect = readAt(prepared.effects, plate);
    for (const { target, sign } of effect.shifts) {
      positionDigits[target] = readByte(positionDigits, target) + shift * sign;
    }
    commands.push(commandFor(plate, shift));
    remainingShifts[plate] = 0;
    pendingActions -= 1;
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
 * An invertible matrix gives unique remaining shifts for each physical state.
 * Their action lower bound is consistent, so the first popped goal is optimal.
 */
export class MatrixSearch {
  private readonly model: LockModel;
  private readonly prepared: PreparedSearch;
  private readonly budget: SearchBudget;

  constructor(model: LockModel, prepared: PreparedSearch, budget: SearchBudget) {
    this.model = model;
    this.prepared = prepared;
    this.budget = budget;
  }

  solve(): readonly Command[] | null {
    if (this.prepared.initialCode === this.prepared.goalCode) {
      this.budget.visit();
      return [];
    }
    const analysis = analyzeMatrix(this.model);
    if (analysis.kind === 'inconsistent' || analysis.kind === 'noninteger') {
      return null;
    }
    if (analysis.kind === 'singular') {
      return new BfsSearch(this.prepared, this.budget).solve();
    }
    const certificate = greedyCertificate(this.prepared, analysis.net, this.budget);
    if (certificate !== null) {
      return certificate;
    }
    return new AStarSearch(this.prepared, this.budget).solve(analysis.net, analysis.lowerBound);
  }
}

/** Mutable A* state is allocated only after the certificate cannot finish. */
class AStarSearch {
  private readonly prepared: PreparedSearch;
  private readonly budget: SearchBudget;
  private readonly positionDigits: Uint8Array;
  private readonly frontier = new IndexedHeap();
  private readonly records = new Map<number, SearchNode>();
  private nextSequence = 1;

  constructor(prepared: PreparedSearch, budget: SearchBudget) {
    this.prepared = prepared;
    this.budget = budget;
    this.positionDigits = new Uint8Array(prepared.plateCount);
  }

  solve(requiredShifts: readonly number[], lowerBound: number): readonly Command[] | null {
    this.budget.visit();
    const root: SearchNode = {
      state: this.prepared.initialCode,
      actionCount: 0,
      estimate: lowerBound,
      remainingShifts: requiredShifts,
      previous: null,
      // The root has no incoming command; reconstruction stops at previous=null.
      plate: -1,
      delta: 0,
      sequence: 0,
      heapIndex: NOT_QUEUED,
      closed: false,
    };
    this.frontier.push(root);
    this.records.set(root.state, root);

    while (this.frontier.size > 0) {
      const node = this.frontier.pop();
      if (node.state === this.prepared.goalCode) {
        return reconstruct(node);
      }
      this.budget.expand();
      node.closed = true;
      decodeDigits(node.state, this.positionDigits);
      for (let plate = 0; plate < this.prepared.plateCount; plate += 1) {
        this.expandPlate(node, plate);
      }
    }
    return null;
  }

  private expandPlate(node: SearchNode, plate: number): void {
    const effect = readAt(this.prepared.effects, plate);
    const remainingShift = readAt(node.remainingShifts, plate);
    const preferredDirection = remainingShift < 0 ? -1 : 1;
    const [positiveLimit, negativeLimit] = movementLimits(this.positionDigits, effect);

    // Preserve plate order, preferred direction, then larger displacement first.
    for (const preference of DIRECTIONS) {
      const direction = preferredDirection * preference;
      const limit = direction > 0 ? positiveLimit : negativeLimit;
      for (let steps = limit; steps >= 1; steps -= 1) {
        this.visitNeighbor(node, plate, direction * steps, effect);
      }
    }
  }

  private visitNeighbor(parent: SearchNode, plate: number, delta: number, effect: Effect): void {
    const state = parent.state + delta * effect.stateCodeOffset;
    const actionCount = parent.actionCount + 1;
    const existing = this.records.get(state);
    if (existing !== undefined) {
      if (existing.closed || existing.actionCount <= actionCount) {
        return;
      }
      // The physical state fixes remaining shifts and their lower bound.
      // A shorter path only changes the predecessor and queue priority.
      existing.actionCount = actionCount;
      existing.previous = parent;
      existing.plate = plate;
      existing.delta = delta;
      this.frontier.decreasePriority(existing);
      return;
    }

    this.budget.visit();
    this.budget.check('maxFrontier', this.frontier.size + 1);
    const previousShift = readAt(parent.remainingShifts, plate);
    const remainingShift = previousShift - delta;
    const remainingShifts = [...parent.remainingShifts];
    remainingShifts[plate] = remainingShift;
    const estimate = parent.estimate
      - minimumActionsForShift(previousShift)
      + minimumActionsForShift(remainingShift);
    if (!Number.isSafeInteger(remainingShift) || !Number.isSafeInteger(actionCount + estimate)) {
      throw new SearchLimitError('matrixArithmetic', Number.MAX_SAFE_INTEGER, String(remainingShift));
    }

    const next: SearchNode = {
      state,
      actionCount,
      estimate,
      remainingShifts,
      previous: parent,
      plate,
      delta,
      sequence: this.nextSequence,
      heapIndex: NOT_QUEUED,
      closed: false,
    };
    this.nextSequence += 1;
    this.records.set(state, next);
    this.frontier.push(next);
  }
}
