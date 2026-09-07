import { LockModel, PreparedSearch } from './lock.ts';
import { MatrixSearch, SearchBudget } from './astar.ts';
import { createSolverConfig, validateSolverConfig } from './config.ts';
import type { SolverConfig } from './config.ts';
import type { Command, Links, Position, State } from './types.ts';

/**
 * Find a legal sequence with the minimum number of actions, or null when the
 * goal is proved unreachable. Each [index, delta] directly changes the selected
 * pin's numeric position and applies links[index][target] once without cascades.
 * Inputs are copied and never modified; all goal positions are 4.
 *
 * Fixed tuples must have N >= 2 and matching N×N links. Dynamic arrays undergo
 * the same shape and value checks at runtime.
 * @throws {LockInputError} When an input or configuration is invalid.
 * @throws {SearchLimitError} When a computation limit is exceeded (not unsolvable).
 */
export function solveLock<const S extends readonly Position[]>(
  state: S & (number extends S['length'] ? unknown : S extends State ? unknown : never),
  links: NoInfer<Links<S>>,
  config?: SolverConfig,
): readonly Command[] | null {
  const options = config === undefined ? createSolverConfig() : validateSolverConfig(config);
  const model = new LockModel(state, links);
  const prepared = new PreparedSearch(model);
  return new MatrixSearch(model, prepared, new SearchBudget(options)).solve();
}

export { createSolverConfig } from './config.ts';
export type { SolverConfig } from './config.ts';
export { LockInputError, SearchLimitError } from './errors.ts';
export type { SearchLimit } from './errors.ts';
export type { Command, Delta, Link, Links, Position, State } from './types.ts';
