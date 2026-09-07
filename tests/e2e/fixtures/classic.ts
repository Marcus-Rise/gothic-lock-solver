const namespace: unknown = Reflect.get(globalThis, 'GothicLockSolver');
if (typeof namespace !== 'object' || namespace === null) throw new Error('Missing classic global');
Reflect.set(globalThis, 'consumer', {
  solveLock: Reflect.get(namespace, 'solveLock'),
  createSolverConfig: Reflect.get(namespace, 'createSolverConfig'),
  exports: Object.keys(namespace),
  namedMatchesNamespace: true,
  hasClassicGlobal: Object.hasOwn(globalThis, 'GothicLockSolver'),
});
const status = document.querySelector('#status');
if (status === null) throw new Error('Missing consumer status');
status.textContent = 'ready';
