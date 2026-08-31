import { validateLockDefinition } from './lock-definition.mjs';
import { createSolveResult } from './result.mjs';
import { findShortestCommands } from './solver.mjs';

export function solveLock(value) {
  const definition = validateLockDefinition(value);
  return createSolveResult(definition, findShortestCommands(definition));
}

export { applyCommand, generateTransitions } from './transition.mjs';
