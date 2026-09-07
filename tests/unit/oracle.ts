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

export interface OracleCost {
  readonly actions: number;
  readonly unitShifts: number;
}

export function commandCost(commands: readonly (readonly [number, number])[] | null): OracleCost | null {
  return commands === null ? null : {
    actions: commands.length,
    unitShifts: commands.reduce((sum, [, delta]) => sum + Math.abs(delta), 0),
  };
}

function compareCost(left: OracleCost, right: OracleCost): number {
  return left.actions - right.actions || left.unitShifts - right.unitShifts;
}

/** Deliberately simple Dijkstra: string keys, sorted queue, unit-by-unit edges. */
export function referenceCost(lock: OracleLock): OracleCost | null {
  const root = { actions: 0, unitShifts: 0 };
  const queue = [{ state: [...lock.state], cost: root }];
  const best = new Map([[lock.state.join(','), root]]);
  while (queue.length > 0) {
    queue.sort((left, right) => compareCost(left.cost, right.cost));
    const current = queue.shift();
    if (current === undefined) throw new Error('Missing oracle frontier state');
    if (best.get(current.state.join(',')) !== current.cost) continue;
    if (current.state.every((position) => position === 4)) return current.cost;
    for (let source = 0; source < current.state.length; source += 1) {
      for (const direction of [1, -1]) {
        let next = current.state;
        for (let steps = 1; steps <= 6; steps += 1) {
          const moved = unitMove(next, lock.links, source, direction);
          if (moved === null) break;
          next = moved;
          const key = next.join(',');
          const cost = { actions: current.cost.actions + 1, unitShifts: current.cost.unitShifts + steps };
          const previous = best.get(key);
          if (previous !== undefined && compareCost(previous, cost) <= 0) continue;
          best.set(key, cost);
          queue.push({ state: next, cost });
        }
      }
    }
  }
  return null;
}

export function referenceActions(lock: OracleLock): number | null {
  return referenceCost(lock)?.actions ?? null;
}
