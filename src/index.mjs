import { validateLockDefinition } from './lock-definition.mjs';
import { createSolveResult } from './result.mjs';
import { searchBfs } from './search-bfs.mjs';
import { searchMatrix } from './matrix-search.mjs';
import { normalizeSearchOptions, prepareSearch, SearchBudget } from './search-limits.mjs';

export function solveLock(value, options) {
  const limits = normalizeSearchOptions(options);
  const definition = validateLockDefinition(value);
  const prepared = prepareSearch(definition);
  const budget = new SearchBudget(limits);
  const commands = limits.algorithm === 'bfs'
    ? searchBfs(prepared, budget)
    : searchMatrix(definition, prepared, budget);
  return createSolveResult(definition, commands);
}

export { applyCommand, generateTransitions } from './transition.mjs';
export { SearchLimitError } from './search-limits.mjs';
