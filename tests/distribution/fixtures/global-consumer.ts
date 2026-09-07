/// <reference path="./node_modules/gothic-lock-solver/dist/global.d.ts" />
const globalCommands: readonly GothicLockSolver.Command[] | null = GothicLockSolver.solveLock([6, 2], [[0, -1], [0, 0]]);
void globalCommands;
// @ts-expect-error The classic namespace exposes no default property.
GothicLockSolver.default;
