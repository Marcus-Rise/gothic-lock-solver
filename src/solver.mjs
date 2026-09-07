import { validateLockDefinition } from './lock-definition.mjs';
import { searchBfs } from './search-bfs.mjs';
import { normalizeSearchOptions, prepareSearch, SearchBudget } from './search-limits.mjs';

export function packCommand(command) {
  const directionBit = command.direction === 'left' ? 0 : 1;
  return (((command.plate - 1) * 2 + directionBit) * 6) + command.steps - 1;
}

export function unpackCommand(packed) {
  const steps = (packed % 6) + 1;
  const plateDirection = Math.floor(packed / 6);
  return {
    plate: Math.floor(plateDirection / 2) + 1,
    direction: plateDirection % 2 === 0 ? 'left' : 'right',
    steps,
  };
}

/** Legacy entry point: always exact BFS with its original command order. */
export function findShortestCommands(value, options) {
  const limits = normalizeSearchOptions(options);
  const definition = validateLockDefinition(value);
  return searchBfs(prepareSearch(definition), new SearchBudget(limits));
}
