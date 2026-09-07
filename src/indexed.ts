/**
 * Checked indexed access for internally dense arrays and bounded state tables.
 * Call sites establish bounds through validated dimensions, allocated lengths or
 * search membership. The check keeps that invariant executable and avoids type
 * assertions / unchecked non-null accesses under noUncheckedIndexedAccess.
 */
export function readAt<T>(values: readonly T[], index: number): T {
  const value = values[index];
  if (value === undefined) throw new Error(`Internal indexed-access invariant failed at ${index}.`);
  return value;
}

/** Typed readers keep hot typed-array access separate from object-array shapes. */
export function readByte(values: Uint8Array, index: number): number {
  const value = values[index];
  if (value === undefined) throw new Error(`Internal byte-access invariant failed at ${index}.`);
  return value;
}

export function readInt32(values: Int32Array, index: number): number {
  const value = values[index];
  if (value === undefined) throw new Error(`Internal integer-access invariant failed at ${index}.`);
  return value;
}
