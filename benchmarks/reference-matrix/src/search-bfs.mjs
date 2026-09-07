import { decodeDigits, movementLimits, SearchLimitError } from './search-limits.mjs';

function unpack(packed) {
  const plateDirection = Math.floor(packed / 6);
  return {
    plate: Math.floor(plateDirection / 2) + 1,
    direction: plateDirection % 2 === 0 ? 'left' : 'right',
    steps: packed % 6 + 1,
  };
}

/** Exact macro BFS. Loop order is the original public tie-breaking contract. */
export function searchBfs(prepared, budget) {
  const { n, size, source, goal, effects } = prepared;
  budget.visit();
  if (source === goal) return [];

  // Signed parents need two sentinel values. Queue stores only the live frontier.
  const capacity = Math.min(size, budget.options.maxVisited, budget.options.maxFrontier);
  const denseBytes = size * 5 + capacity * 4;
  const dense = size <= 0x7fffffff && denseBytes <= budget.options.maxDenseBytes;
  let parents;
  let actions;
  let queue;
  try {
    parents = dense ? new Int32Array(size).fill(-2) : new Map();
    actions = dense ? new Uint8Array(size) : null;
    queue = dense ? new Int32Array(capacity) : [];
  } catch (error) {
    if (!(error instanceof RangeError)) throw error;
    throw new SearchLimitError('maxDenseBytes', budget.options.maxDenseBytes, denseBytes, { cause: error });
  }
  if (dense) parents[source] = -1;
  else parents.set(source, { parent: -1, action: -1 });
  queue[0] = source;
  let head = 0;
  let tail = 1 % capacity;
  let frontier = 1;
  const digits = new Uint8Array(n);

  function reconstruct(code) {
    const commands = [];
    while (code !== source) {
      if (dense) {
        commands.push(unpack(actions[code]));
        code = parents[code];
      } else {
        const node = parents.get(code);
        commands.push(unpack(node.action));
        code = node.parent;
      }
    }
    return commands.reverse();
  }

  while (frontier > 0) {
    budget.expand();
    const code = queue[head];
    if (!dense) queue[head] = undefined;
    head = (head + 1) % capacity;
    frontier -= 1;
    decodeDigits(code, digits);
    for (let plate = 0; plate < n; plate += 1) {
      const limits = movementLimits(digits, effects[plate]);
      for (let direction = 0; direction < 2; direction += 1) {
        const sign = direction === 0 ? 1 : -1;
        for (let steps = limits[direction]; steps >= 1; steps -= 1) {
          const next = code + sign * steps * effects[plate].offset;
          if (dense ? parents[next] !== -2 : parents.has(next)) continue;
          budget.visit();
          const action = (plate * 2 + direction) * 6 + steps - 1;
          if (dense) {
            parents[next] = code;
            actions[next] = action;
          } else parents.set(next, { parent: code, action });
          if (next === goal) return reconstruct(next);
          budget.check('maxFrontier', frontier + 1);
          queue[tail] = next;
          tail = (tail + 1) % capacity;
          frontier += 1;
        }
      }
    }
  }
  return null;
}
