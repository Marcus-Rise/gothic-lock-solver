import { SearchLimitError } from './errors.ts';
import { readAt } from './lock.ts';
import type { LockModel } from './lock.ts';

interface Rational {
  readonly n: bigint;
  readonly d: bigint;
}

const abs = (value: bigint): bigint => value < 0n ? -value : value;

/** Canonical exact rational: coprime numerator/denominator, positive denominator. */
function fraction(n: bigint, d: bigint = 1n): Rational {
  if (d === 0n) throw new Error('Internal zero-denominator invariant failed.');
  if (n === 0n) return { n: 0n, d: 1n };
  if (d < 0n) { n = -n; d = -d; }
  let a = abs(n);
  let b = d;
  while (b !== 0n) [a, b] = [b, a % b];
  return { n: n / a, d: d / a };
}

const divide = (a: Rational, b: Rational): Rational => fraction(a.n * b.d, a.d * b.n);
const subtractProduct = (a: Rational, b: Rational, c: Rational): Rational =>
  fraction(a.n * b.d * c.d - b.n * c.n * a.d, a.d * b.d * c.d);

export type MatrixAnalysis =
  | { readonly kind: 'inconsistent'; readonly rank: number }
  | { readonly kind: 'singular'; readonly rank: number }
  | { readonly kind: 'noninteger'; readonly rank: number }
  | { readonly kind: 'unique-integer'; readonly rank: number; readonly net: readonly number[]; readonly lowerBound: number };

/**
 * Exact necessary equation A z = goal - state. links[source][target] is
 * transposed into A[target][source]; selected-pin motion gives the diagonal 1.
 * Rational inconsistency or fractional unique z proves no integer path exists.
 * Rank deficiency alone says nothing about reachability and requires exact BFS.
 */
export function analyzeMatrix({ state, links }: LockModel): MatrixAnalysis {
  const n = state.length;
  const rows = Array.from({ length: n }, (_, target) => [
    ...Array.from({ length: n }, (_, source) => fraction(BigInt(source === target ? 1 : readAt(readAt(links, source), target)))),
    fraction(BigInt(4 - readAt(state, target))),
  ]);
  const columns: number[] = [];
  let rank = 0;
  for (let column = 0; column < n; column += 1) {
    let pivot = rank;
    while (pivot < n && readAt(readAt(rows, pivot), column).n === 0n) pivot += 1;
    if (pivot === n) continue;
    const pivotRow = readAt(rows, pivot);
    rows[pivot] = readAt(rows, rank);
    rows[rank] = pivotRow;
    const divisor = readAt(pivotRow, column);
    for (let j = column; j <= n; j += 1) pivotRow[j] = divide(readAt(pivotRow, j), divisor);
    for (let row = 0; row < n; row += 1) {
      const values = readAt(rows, row);
      const factor = readAt(values, column);
      if (row === rank || factor.n === 0n) continue;
      for (let j = column; j <= n; j += 1) values[j] = subtractProduct(readAt(values, j), factor, readAt(pivotRow, j));
    }
    columns.push(column);
    rank += 1;
  }
  for (let row = rank; row < n; row += 1) {
    if (readAt(readAt(rows, row), n).n !== 0n) return { kind: 'inconsistent', rank };
  }
  if (rank < n) return { kind: 'singular', rank };
  const exact: Rational[] = Array.from({ length: n }, () => fraction(0n));
  for (let row = 0; row < n; row += 1) exact[readAt(columns, row)] = readAt(readAt(rows, row), n);
  if (exact.some((value) => value.d !== 1n)) return { kind: 'noninteger', rank };
  const net = exact.map(({ n: numerator }) => {
    if (abs(numerator) > BigInt(Number.MAX_SAFE_INTEGER)) {
      throw new SearchLimitError('matrixArithmetic', Number.MAX_SAFE_INTEGER, String(numerator));
    }
    return Number(numerator);
  });
  const lowerBound = net.reduce((sum, value) => sum + Math.ceil(Math.abs(value) / 6), 0);
  if (!Number.isSafeInteger(lowerBound)) {
    throw new SearchLimitError('matrixArithmetic', Number.MAX_SAFE_INTEGER, lowerBound);
  }
  return { kind: 'unique-integer', rank, net, lowerBound };
}
