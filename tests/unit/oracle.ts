/** Independent oracle: imports no production transitions, encodings or search. */
export interface OracleLock {
  readonly state: readonly number[];
  readonly links: readonly (readonly number[])[];
}

function element<T>(values: readonly T[], index: number): T {
  const value = values[index];
  if (value === undefined) throw new Error(`Missing oracle element ${index}`);
  return value;
}

export function unitMove(state: readonly number[], links: OracleLock['links'], source: number, direction: number): number[] | null {
  const row = element(links, source);
  const next = state.map((position, target) => position + direction * (source === target ? 1 : element(row, target)));
  return next.some((position) => position < 1 || position > 7) ? null : next;
}

export function replay(lock: OracleLock, commands: readonly (readonly [number, number])[]): number[] {
  let state = [...lock.state];
  for (const [index, delta] of commands) {
    if (!Number.isInteger(index) || index < 0 || index >= state.length || !Number.isInteger(delta) || delta === 0 || Math.abs(delta) > 6) {
      throw new Error('Invalid command');
    }
    for (let step = 0; step < Math.abs(delta); step += 1) {
      const next = unitMove(state, lock.links, index, Math.sign(delta));
      if (next === null) throw new Error('Blocked intermediate unit movement');
      state = next;
    }
  }
  return state;
}

export function referenceActions(lock: OracleLock): number | null {
  const queue = [{ state: [...lock.state], depth: 0 }];
  const visited = new Set([lock.state.join(',')]);
  for (const current of queue) {
    if (current.state.every((position) => position === 4)) return current.depth;
    for (let source = 0; source < current.state.length; source += 1) {
      for (const direction of [1, -1]) {
        let next = current.state;
        for (let steps = 1; steps <= 6; steps += 1) {
          const moved = unitMove(next, lock.links, source, direction);
          if (moved === null) break;
          next = moved;
          const key = next.join(',');
          if (visited.has(key)) continue;
          visited.add(key);
          queue.push({ state: next, depth: current.depth + 1 });
        }
      }
    }
  }
  return null;
}
