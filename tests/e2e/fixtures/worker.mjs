import { solveLock } from '../../../dist/gothic-lock-solver.mjs';

self.addEventListener('message', ({ data }) => {
  self.postMessage(solveLock(data.state, data.links));
});
