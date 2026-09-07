import { SearchLimitError } from './search-limits.mjs';

const abs = (value) => value < 0n ? -value : value;

function fraction(n, d = 1n) {
  if (n === 0n) return { n: 0n, d: 1n };
  if (d < 0n) { n = -n; d = -d; }
  let a = abs(n);
  let b = d;
  while (b !== 0n) [a, b] = [b, a % b];
  return { n: n / a, d: d / a };
}

const divide = (a, b) => fraction(a.n * b.d, a.d * b.n);
const subtractProduct = (a, b, c) => fraction(a.n * b.d * c.d - b.n * c.n * a.d, a.d * b.d * c.d);

/**
 * Exact necessary equation A z = goal - state. links[source][target] is
 * transposed into A[target][source]; selected-plate movement is the diagonal 1.
 * Rational inconsistency or a fractional unique z is a proof of no integer path.
 * Rank deficiency alone says nothing about whether a path exists.
 */
export function analyzeMatrix({ state, links }) {
  const n = state.length;
  const rows = Array.from({ length: n }, (_, target) => [
    ...Array.from({ length: n }, (_, source) => fraction(BigInt(source === target ? 1 : links[source][target]))),
    fraction(BigInt(4 - state[target])),
  ]);
  const columns = [];
  let rank = 0;
  for (let column = 0; column < n; column += 1) {
    let pivot = rank;
    while (pivot < n && rows[pivot][column].n === 0n) pivot += 1;
    if (pivot === n) continue;
    [rows[rank], rows[pivot]] = [rows[pivot], rows[rank]];
    const divisor = rows[rank][column];
    for (let j = column; j <= n; j += 1) rows[rank][j] = divide(rows[rank][j], divisor);
    for (let row = 0; row < n; row += 1) {
      if (row === rank || rows[row][column].n === 0n) continue;
      const factor = rows[row][column];
      for (let j = column; j <= n; j += 1) rows[row][j] = subtractProduct(rows[row][j], factor, rows[rank][j]);
    }
    columns.push(column);
    rank += 1;
  }
  for (let row = rank; row < n; row += 1) {
    if (rows[row][n].n !== 0n) return { kind: 'inconsistent', rank };
  }
  if (rank < n) return { kind: 'singular', rank };
  const exact = Array(n);
  for (let row = 0; row < n; row += 1) exact[columns[row]] = rows[row][n];
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
