import { SearchLimitError } from './errors.ts';
import { TARGET_POSITION, minimumActionsForShift, readAt } from './lock.ts';
import type { LockModel } from './lock.ts';

interface Rational {
  readonly numerator: bigint;
  readonly denominator: bigint;
}

function absolute(value: bigint): bigint {
  return value < 0n ? -value : value;
}

function greatestCommonDivisor(left: bigint, right: bigint): bigint {
  while (right !== 0n) {
    const remainder = left % right;
    left = right;
    right = remainder;
  }
  return left;
}

/** Coprime numerator and denominator, with a positive denominator. */
function fraction(numerator: bigint, denominator: bigint = 1n): Rational {
  if (denominator === 0n) {
    throw new Error('Internal zero-denominator invariant failed.');
  }
  if (numerator === 0n) {
    return { numerator: 0n, denominator: 1n };
  }
  if (denominator < 0n) {
    numerator = -numerator;
    denominator = -denominator;
  }
  const divisor = greatestCommonDivisor(absolute(numerator), denominator);
  return { numerator: numerator / divisor, denominator: denominator / divisor };
}

function divide(value: Rational, divisor: Rational): Rational {
  return fraction(
    value.numerator * divisor.denominator,
    value.denominator * divisor.numerator,
  );
}

function subtractProduct(value: Rational, factor: Rational, pivotValue: Rational): Rational {
  const denominator = value.denominator * factor.denominator * pivotValue.denominator;
  const scaledValue = value.numerator * factor.denominator * pivotValue.denominator;
  const scaledProduct = factor.numerator * pivotValue.numerator * value.denominator;
  return fraction(scaledValue - scaledProduct, denominator);
}

export type MatrixAnalysis =
  | { readonly kind: 'inconsistent'; readonly rank: number }
  | { readonly kind: 'singular'; readonly rank: number }
  | { readonly kind: 'noninteger'; readonly rank: number }
  | {
    readonly kind: 'unique-integer';
    readonly rank: number;
    readonly net: readonly number[];
    readonly lowerBound: number;
  };

/** Transpose source-first links, add self-motion, then append goal minus state. */
function createAugmentedMatrix({ state, links }: LockModel): Rational[][] {
  const rows: Rational[][] = [];
  for (let target = 0; target < state.length; target += 1) {
    const row: Rational[] = [];
    for (let source = 0; source < state.length; source += 1) {
      const coefficient = source === target ? 1 : readAt(readAt(links, source), target);
      row.push(fraction(BigInt(coefficient)));
    }
    row.push(fraction(BigInt(TARGET_POSITION - readAt(state, target))));
    rows.push(row);
  }
  return rows;
}

function findPivotRow(rows: readonly Rational[][], column: number, firstRow: number): number | null {
  for (let row = firstRow; row < rows.length; row += 1) {
    if (readAt(readAt(rows, row), column).numerator !== 0n) {
      return row;
    }
  }
  return null;
}

function normalizePivotRow(row: Rational[], pivotColumn: number): void {
  const divisor = readAt(row, pivotColumn);
  for (let column = pivotColumn; column < row.length; column += 1) {
    row[column] = divide(readAt(row, column), divisor);
  }
}

function eliminatePivotColumn(rows: Rational[][], pivotRowIndex: number, pivotColumn: number): void {
  const pivotRow = readAt(rows, pivotRowIndex);
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    const row = readAt(rows, rowIndex);
    const factor = readAt(row, pivotColumn);
    if (rowIndex === pivotRowIndex || factor.numerator === 0n) {
      continue;
    }
    for (let column = pivotColumn; column < row.length; column += 1) {
      row[column] = subtractProduct(readAt(row, column), factor, readAt(pivotRow, column));
    }
  }
}

function toSafeInteger({ numerator }: Rational): number {
  if (absolute(numerator) > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new SearchLimitError('matrixArithmetic', Number.MAX_SAFE_INTEGER, String(numerator));
  }
  return Number(numerator);
}

/**
 * Solve the exact necessary equation A z = goal - state using Gauss–Jordan.
 * Inconsistency or a fractional unique z proves no integer path exists.
 * Rank deficiency alone says nothing about reachability and requires exact BFS.
 */
export function analyzeMatrix(model: LockModel): MatrixAnalysis {
  const rows = createAugmentedMatrix(model);
  const plateCount = model.state.length;
  let rank = 0;

  for (let column = 0; column < plateCount; column += 1) {
    const pivot = findPivotRow(rows, column, rank);
    if (pivot === null) {
      continue;
    }
    const pivotRow = readAt(rows, pivot);
    rows[pivot] = readAt(rows, rank);
    rows[rank] = pivotRow;
    normalizePivotRow(pivotRow, column);
    eliminatePivotColumn(rows, rank, column);
    rank += 1;
  }

  for (let row = rank; row < plateCount; row += 1) {
    const rightHandSide = readAt(readAt(rows, row), plateCount);
    if (rightHandSide.numerator !== 0n) {
      return { kind: 'inconsistent', rank };
    }
  }
  if (rank < plateCount) {
    return { kind: 'singular', rank };
  }

  // A full-rank square system has one pivot per column, in plate order.
  const exactShifts = rows.map((row) => readAt(row, plateCount));
  if (exactShifts.some(({ denominator }) => denominator !== 1n)) {
    return { kind: 'noninteger', rank };
  }

  const net = exactShifts.map(toSafeInteger);
  const lowerBound = net.reduce((sum, shift) => sum + minimumActionsForShift(shift), 0);
  if (!Number.isSafeInteger(lowerBound)) {
    throw new SearchLimitError('matrixArithmetic', Number.MAX_SAFE_INTEGER, lowerBound);
  }
  return { kind: 'unique-integer', rank, net, lowerBound };
}
