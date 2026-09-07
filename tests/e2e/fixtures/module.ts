import { createSolverConfig, solveLock } from '../../../src/index.ts';
import * as namespace from '../../../src/index.ts';

Reflect.set(globalThis, 'consumer', {
  solveLock,
  createSolverConfig,
  exports: Object.keys(namespace),
  namedMatchesNamespace: solveLock === namespace.solveLock && createSolverConfig === namespace.createSolverConfig,
  hasClassicGlobal: Object.hasOwn(globalThis, 'GothicLockSolver'),
});
const status = document.querySelector('#status');
if (status === null) throw new Error('Missing consumer status');
status.textContent = 'ready';
