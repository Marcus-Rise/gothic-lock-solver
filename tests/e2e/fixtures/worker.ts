import { createSolverConfig, solveLock } from '../../../src/index.ts';

self.addEventListener('message', (event: MessageEvent<unknown>) => {
  const data = event.data;
  if (typeof data !== 'object' || data === null || !('state' in data) || !('links' in data)) {
    throw new Error('Malformed Worker input');
  }
  self.postMessage(Reflect.apply(solveLock, undefined, [data.state, data.links, createSolverConfig()]));
});
