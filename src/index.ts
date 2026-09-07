import { LockModel, PreparedSearch } from './lock.ts';
import { MatrixSearch } from './astar.ts';
import { SearchBudget, createSolverConfig, validateSolverConfig } from './config.ts';
import type { SolverConfig } from './config.ts';
import type { Command, Links, Position, StateConstraint } from './types.ts';

/**
 * Minimize actions, then total absolute pin displacement among equal-action
 * solutions; return null when the goal is proved unreachable.
 * Each [index, delta] directly changes the selected
 * pin's numeric position and applies links[index][target] once without cascades.
 * Inputs are copied and never modified; all goal positions are 4.
 *
 * Fixed tuples must have N >= 2 and matching N×N links. Dynamic arrays undergo
 * the same shape and value checks at runtime.
 * @throws {LockInputError} When an input or configuration is invalid.
 * @throws {SearchLimitError} When a computation limit is exceeded (not unsolvable).
 */
export function solveLock<const S extends readonly Position[]>(
  state: S & StateConstraint<S>,
  links: NoInfer<Links<S>>,
  config?: SolverConfig,
): readonly Command[] | null {
  const options = config === undefined ? createSolverConfig() : validateSolverConfig(config);
  const model = new LockModel(state, links);
  const prepared = new PreparedSearch(model);
  const budget = new SearchBudget(options);
  return new MatrixSearch(model, prepared, budget).solve();
}

export { createSolverConfig } from './config.ts';
export type { SolverConfig } from './config.ts';
export { LockInputError, SearchLimitError } from './errors.ts';
export type { SearchLimit } from './errors.ts';
export type { Command, Delta, Link, Links, Position, State } from './types.ts';
