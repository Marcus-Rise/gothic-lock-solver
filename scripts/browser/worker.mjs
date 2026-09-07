import { solveLock } from '../../src/index.mjs';

self.onmessage = ({ data }) => {
  try {
    self.postMessage({ result: solveLock(data) });
  } catch (error) {
    self.postMessage({ error: { name: error.name, message: error.message } });
  }
};
