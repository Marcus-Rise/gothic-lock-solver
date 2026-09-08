/** Invalid lock shape, positions, links or solver configuration. */
export class LockInputError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'LockInputError';
  }
}

export type SearchLimit =
  | 'maxVisited'
  | 'maxExpanded'
  | 'maxFrontier'
  | 'maxDenseBytes'
  | 'stateEncoding'
  | 'matrixArithmetic';

/** Computation exhausted a resource; this is never proof of unreachability. */
export class SearchLimitError extends Error {
  readonly limit: SearchLimit;
  readonly maximum: number;
  readonly used: number | string;

  constructor(
    limit: SearchLimit,
    maximum: number,
    used: number | string,
    options?: ErrorOptions,
  ) {
    super(`Превышен ресурсный предел поиска: ${limit} (предел ${maximum}, требуется ${used}).`, options);
    this.name = 'SearchLimitError';
    this.limit = limit;
    this.maximum = maximum;
    this.used = used;
  }
}
