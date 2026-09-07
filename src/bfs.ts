import { SearchLimitError } from './errors.ts';
import {
  DIRECTIONS,
  MAX_SHIFT,
  commandFor,
  decodeDigits,
  movementLimits,
  readAt,
  readByte,
  readFloat64,
  readInt32,
} from './lock.ts';
import type { PreparedSearch } from './lock.ts';
import type { SearchBudget } from './config.ts';
import type { Command } from './types.ts';

const UNVISITED = -2;
const ROOT_PARENT = -1;
const MAX_INT32 = 0x7fffffff;
const DIRECTION_COUNT = DIRECTIONS.length;

interface Predecessor {
  readonly parent: number;
  readonly action: number;
  readonly actionCount: number;
  readonly unitShifts: number;
}

type Records =
  | {
    readonly dense: true;
    readonly parents: Int32Array;
    readonly actions: Uint8Array;
    readonly actionCounts: Int32Array;
    readonly unitShifts: Float64Array;
  }
  | { readonly dense: false; readonly parents: Map<number, Predecessor> };

function encodeCommand(plate: number, direction: number, steps: number): number {
  const directionIndex = direction > 0 ? 0 : 1;
  return (plate * DIRECTION_COUNT + directionIndex) * MAX_SHIFT + steps - 1;
}

function decodeCommand(packed: number): Command {
  const plateAndDirection = Math.floor(packed / MAX_SHIFT);
  const plate = Math.floor(plateAndDirection / DIRECTION_COUNT);
  const direction = readAt(DIRECTIONS, plateAndDirection % DIRECTION_COUNT);
  const steps = packed % MAX_SHIFT + 1;
  return commandFor(plate, direction * steps);
}

function hasVisited(records: Records, state: number): boolean {
  return records.dense
    ? readInt32(records.parents, state) !== UNVISITED
    : records.parents.has(state);
}

function remember(records: Records, state: number, parent: number, action: number,
  actionCount: number, unitShifts: number): void {
  if (records.dense) {
    records.parents[state] = parent;
    records.actions[state] = action;
    records.actionCounts[state] = actionCount;
    records.unitShifts[state] = unitShifts;
  } else {
    records.parents.set(state, { parent, action, actionCount, unitShifts });
  }
}

function readPredecessor(records: Records, state: number): Predecessor {
  if (records.dense) {
    return {
      parent: readInt32(records.parents, state),
      action: readByte(records.actions, state),
      actionCount: readInt32(records.actionCounts, state),
      unitShifts: readFloat64(records.unitShifts, state),
    };
  }
  const predecessor = records.parents.get(state);
  if (predecessor === undefined) {
    throw new Error('Internal BFS predecessor invariant failed.');
  }
  return predecessor;
}

function reconstruct(records: Records, initialCode: number, state: number): readonly Command[] {
  const commands: Command[] = [];
  while (state !== initialCode) {
    const predecessor = readPredecessor(records, state);
    commands.push(decodeCommand(predecessor.action));
    state = predecessor.parent;
  }
  return commands.reverse();
}

/** Exact action layers; each next-layer state retains its least unit-shift cost. */
export class BfsSearch {
  private readonly prepared: PreparedSearch;
  private readonly budget: SearchBudget;
  private readonly positionDigits: Uint8Array;
  private records: Records = { dense: false, parents: new Map() };
  private queue: Int32Array | number[] = [];
  private queueCapacity = 1;
  private readIndex = 0;
  private writeIndex = 0;
  private queuedStates = 0;
  private goalFound = false;

  constructor(prepared: PreparedSearch, budget: SearchBudget) {
    this.prepared = prepared;
    this.budget = budget;
    this.positionDigits = new Uint8Array(prepared.plateCount);
  }

  solve(): readonly Command[] | null {
    this.budget.visit();
    if (this.prepared.initialCode === this.prepared.goalCode) {
      return [];
    }
    this.initializeStorage();
    remember(this.records, this.prepared.initialCode, ROOT_PARENT, 0, 0, 0);
    this.enqueue(this.prepared.initialCode);

    while (this.queuedStates > 0) {
      const layerSize = this.queuedStates;
      for (let index = 0; index < layerSize; index += 1) {
        const state = this.dequeue();
        this.expandState(state);
      }
      // Every predecessor at this depth has now offered its cheapest goal path.
      if (this.goalFound) {
        return reconstruct(this.records, this.prepared.initialCode, this.prepared.goalCode);
      }
    }
    return null;
  }

  private initializeStorage(): void {
    const { stateCount } = this.prepared;
    const { maxVisited, maxFrontier, maxDenseBytes } = this.budget.options;
    this.queueCapacity = Math.min(stateCount, maxVisited, maxFrontier);
    const bytesPerRecord = 2 * Int32Array.BYTES_PER_ELEMENT
      + Uint8Array.BYTES_PER_ELEMENT + Float64Array.BYTES_PER_ELEMENT;
    const denseBytes = stateCount * bytesPerRecord + this.queueCapacity * Int32Array.BYTES_PER_ELEMENT;
    // Dense parents are signed state codes; negative values are sentinels.
    const useDenseStorage = stateCount <= MAX_INT32 && denseBytes <= maxDenseBytes;
    try {
      this.records = useDenseStorage
        ? {
          dense: true,
          parents: new Int32Array(stateCount).fill(UNVISITED),
          actions: new Uint8Array(stateCount),
          actionCounts: new Int32Array(stateCount),
          unitShifts: new Float64Array(stateCount),
        }
        : { dense: false, parents: new Map() };
      this.queue = useDenseStorage ? new Int32Array(this.queueCapacity) : [];
    } catch (error) {
      if (!(error instanceof RangeError)) {
        throw error;
      }
      throw new SearchLimitError('maxDenseBytes', maxDenseBytes, denseBytes, { cause: error });
    }
    this.readIndex = 0;
    this.writeIndex = 0;
    this.queuedStates = 0;
    this.goalFound = false;
  }

  /** Ring-buffer storage retains only the live frontier, including sparse mode. */
  private enqueue(state: number): void {
    this.budget.check('maxFrontier', this.queuedStates + 1);
    this.queue[this.writeIndex] = state;
    this.writeIndex = (this.writeIndex + 1) % this.queueCapacity;
    this.queuedStates += 1;
  }

  private dequeue(): number {
    const state = this.queue instanceof Int32Array
      ? readInt32(this.queue, this.readIndex)
      : readAt(this.queue, this.readIndex);
    this.readIndex = (this.readIndex + 1) % this.queueCapacity;
    this.queuedStates -= 1;
    return state;
  }

  private expandState(state: number): void {
    this.budget.expand();
    decodeDigits(state, this.positionDigits);
    const distance = readPredecessor(this.records, state);
    for (let plate = 0; plate < this.prepared.plateCount; plate += 1) {
      if (this.expandPlate(state, plate, distance)) {
        // Every one-command route from this state to the goal costs the same.
        return;
      }
    }
  }

  private expandPlate(state: number, plate: number, distance: Predecessor): boolean {
    const effect = readAt(this.prepared.effects, plate);
    const [positiveLimit, negativeLimit] = movementLimits(this.positionDigits, effect);
    for (const direction of DIRECTIONS) {
      const limit = direction > 0 ? positiveLimit : negativeLimit;
      for (let steps = limit; steps >= 1; steps -= 1) {
        const nextState = state + direction * steps * effect.stateCodeOffset;
        if (this.visitNeighbor(state, nextState, encodeCommand(plate, direction, steps), distance, steps)) {
          return true;
        }
      }
    }
    return false;
  }

  private visitNeighbor(state: number, nextState: number, action: number,
    distance: Predecessor, steps: number): boolean {
    const isGoal = nextState === this.prepared.goalCode;
    if (this.goalFound && !isGoal) {
      return false;
    }
    const actionCount = distance.actionCount + 1;
    const unitShifts = distance.unitShifts + steps;
    if (!Number.isSafeInteger(unitShifts)) {
      throw new SearchLimitError('matrixArithmetic', Number.MAX_SAFE_INTEGER, unitShifts);
    }
    const visited = hasVisited(this.records, nextState);
    if (visited) {
      const previous = readPredecessor(this.records, nextState);
      if (previous.actionCount !== actionCount || previous.unitShifts <= unitShifts) {
        return false;
      }
    } else {
      this.budget.visit();
    }
    remember(this.records, nextState, state, action, actionCount, unitShifts);
    if (isGoal) {
      this.goalFound = true;
      return true;
    }
    if (!visited) {
      this.enqueue(nextState);
    }
    return false;
  }
}
