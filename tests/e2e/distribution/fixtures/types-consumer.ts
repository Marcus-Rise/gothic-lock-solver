import { solveLock, createSolverConfig, LockInputError, SearchLimitError } from 'gothic-lock-solver';
import * as GothicLockSolver from 'gothic-lock-solver';
import { solveLock as minified } from 'gothic-lock-solver/dist/gothic-lock-solver.min.mjs';
import { solveLock as readable } from 'gothic-lock-solver/dist/gothic-lock-solver.mjs';
import type { Command, Delta, Link, Links, Position, State, SearchLimit, SolverConfig } from 'gothic-lock-solver';

const state: State = [6, 2];
const position: Position = 4;
const delta: Delta = -2;
const link: Link = -1;
const links: Links<typeof state> = [[0, link], [0, 0]];
const config: SolverConfig = createSolverConfig({ maxExpanded: 100, maxDenseBytes: 0 });
const commands: readonly Command[] | null = solveLock(state, links, config);
solveLock(state, links, createSolverConfig());
const dynamic: Position[] = [position, position];
const dynamicLinks: Link[][] = [[0, 0], [0, 0]];
const limit: SearchLimit | undefined = undefined;
void [commands, delta, limit, new LockInputError('input'), SearchLimitError];
GothicLockSolver.solveLock(dynamic, dynamicLinks);
minified([6, 2], [[0, -1], [0, 0]]);
readable([4, 4], [[0, 0], [0, 0]]);
// @ts-expect-error The public ESM entry has no default export.
import defaultSolver from 'gothic-lock-solver';
void defaultSolver;
// @ts-expect-error Internal search modules are not public package exports.
import internalSearch from 'gothic-lock-solver/dist/astar.js';
void internalSearch;
// @ts-expect-error Position zero is outside the lock model.
solveLock([0, 4], [[0, 0], [0, 0]]);
// @ts-expect-error Fixed input tuples require at least two positions.
solveLock([4], [[0]]);
// @ts-expect-error Fixed input tuples require a matching matrix.
solveLock([4, 4], [[0, 0]]);
// @ts-expect-error The solver requires a complete configuration object.
solveLock([4, 4], [[0, 0], [0, 0]], {});
// @ts-expect-error A returned zero delta would be invalid.
const zero: Command = [0, 0];
void zero;
// @ts-expect-error Solver configuration is readonly.
config.maxExpanded = 1;
// @ts-expect-error Configuration fields require numbers.
createSolverConfig({ maxVisited: '100' });
// @ts-expect-error Unknown factory options are invalid.
createSolverConfig({ timeout: 100 });
// @ts-expect-error Configured fixed tuples still require matching matrix dimensions.
solveLock([4, 4], [[0]], config);
