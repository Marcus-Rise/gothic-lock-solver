import { solveLock } from '../../src/index.ts';
import type { Command, Delta, Link, Links, Position, State } from '../../src/index.ts';
const state = [6, 2] as const satisfies State;
const links = [[0, -1], [0, 0]] as const satisfies Links<typeof state>;
const result: readonly Command[] | null = solveLock(state, links);
void result;
const dynamicState: readonly Position[] = [1, 7, 4];
const dynamicLinks: readonly (readonly Link[])[] = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
solveLock(dynamicState, dynamicLinks);
// @ts-expect-error one plate is not a fixed valid state
solveLock([4], [[0]]);
// @ts-expect-error no state positions outside 1..7
solveLock([0, 4], [[0, 0], [0, 0]]);
// @ts-expect-error N is inferred only from state; row count must be N
solveLock([4, 4], [[0, 0], [0, 0], [0, 0]]);
// @ts-expect-error fixed tuples require square rows
solveLock([4, 4], [[0, 0, 0], [0, 0, 0]]);
// @ts-expect-error short rows must be rejected
solveLock(state, [[0], [0]]);
// @ts-expect-error links are -1, 0 or 1
solveLock(state, [[0, 2], [0, 0]]);
// @ts-expect-error old object wrapper is not public
solveLock({ state, links });
// @ts-expect-error public solver has no third options argument
solveLock(state, links, { algorithm: 'bfs' });
// @ts-expect-error zero delta is not a command
const invalidDelta: Delta = 0;
void invalidDelta;
if (result !== null) {
  // @ts-expect-error returned list is readonly
  result.push([0, 1]);
  const first = result[0];
  if (first !== undefined) {
    // @ts-expect-error returned command is readonly
    first[1] = 1;
  }
}
