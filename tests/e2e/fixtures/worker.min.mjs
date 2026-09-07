import { solveLock } from '../../../dist/gothic-lock-solver.min.mjs';

self.addEventListener('message', ({ data }) => {
  self.postMessage(solveLock(data.state, data.links));
});
