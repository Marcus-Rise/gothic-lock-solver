import { performance } from 'node:perf_hooks';
import { findShortestCommands } from '../src/solver.mjs';

const plateCount = 7;
const definition = {
  state: Array.from({ length: plateCount }, () => 1),
  links: Array.from(
    { length: plateCount },
    () => Array.from({ length: plateCount }, () => 0),
  ),
};

const startedAt = performance.now();
const commands = findShortestCommands(definition);
const elapsedMs = performance.now() - startedAt;

console.log(JSON.stringify({
  elapsedMs: Math.round(elapsedMs),
  commands: commands?.length ?? null,
  rssMiB: Math.round(process.memoryUsage().rss / 1024 / 1024),
}, null, 2));

if (commands?.length !== 7) {
  process.exitCode = 1;
}
