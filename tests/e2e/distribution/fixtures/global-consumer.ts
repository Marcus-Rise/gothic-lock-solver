/// <reference path="./node_modules/gothic-lock-solver/dist/global.d.ts" />
const globalConfig: GothicLockSolver.SolverConfig = GothicLockSolver.createSolverConfig({ maxDenseBytes: 0 });
const globalCommands: readonly GothicLockSolver.Command[] | null = GothicLockSolver.solveLock([6, 2], [[0, -1], [0, 0]], globalConfig);
void globalCommands;
// @ts-expect-error The classic namespace exposes no default property.
GothicLockSolver.default;
// @ts-expect-error The global solver requires a complete configuration.
GothicLockSolver.solveLock([4, 4], [[0, 0], [0, 0]], { maxExpanded: 0 });
