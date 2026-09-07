# Gothic Lock Solver

An exact solver for Gothic 1 Remake coupled plate locks: minimum grouped actions,
then minimum unit shifts among equally short action sequences. A
TypeScript library and standalone Node.js CLI share one mathematical core with
no runtime dependencies. One action can move a plate several positions.

> The first public package is being prepared. npm/CDN examples become available
> after publication; replace `VERSION` with an exact published version.

## Library

```sh
npm install gothic-lock-solver
```

```ts
import { solveLock, createSolverConfig } from "gothic-lock-solver";

const state = [6, 2] as const;
const links = [[0, -1], [0, 0]] as const;
solveLock(state, links); // [[0, -2]]
solveLock(state, links, createSolverConfig({ maxVisited: 500_000 }));
```

Namespace imports (`import * as GothicLockSolver`) are also supported. Positions
are 1–7, the goal is 4, and `links[source][target]` is −1/0/+1 with zero diagonal.
Links apply directly without cascading. Commands are `[zeroBasedIndex, signedPinDelta]`.
Inputs remain unchanged; successful results minimize grouped actions.

`[]` means already open; `null` means proved unreachable. Invalid input/config
throws `LockInputError`; exhausted computation throws `SearchLimitError`.
Read [API](wiki/api.md), [configuration](wiki/configuration.md) and
[mathematics and complexity](wiki/algorithm.md) for precise guarantees and limits.

## Browser and CLI

```html
<script src="https://cdn.jsdelivr.net/npm/gothic-lock-solver@VERSION/dist/gothic-lock-solver.min.js"></script>
<script>
  console.log(GothicLockSolver.solveLock([6, 2], [[0, -1], [0, 0]]));
</script>
```

Browser modules import named exports from the corresponding `.mjs` URL.

```sh
gothic-lock-solver lock.json --config solver.config.json --output solution.json
node gothic-lock-solver.cli.mjs lock.json --config solver.config.json
```

`lock.json` contains `state` and `links`; config JSON contains partial overrides.
Both flags are optional. CLI messages are Russian; exits are 0 solved, 2 unreachable
and 1 error. `--help` lists options. Use maintained Node.js 22, 24 or 26.

Vite builds `src/index.ts` and `src/cli.ts` into five self-contained choices:

| Generated file | Consumer |
| --- | --- |
| `gothic-lock-solver.mjs` / `gothic-lock-solver.min.mjs` | Readable / minified ESM |
| `gothic-lock-solver.js` / `gothic-lock-solver.min.js` | Readable / minified classic script |
| `gothic-lock-solver.cli.mjs` | Standalone Node.js CLI |

Core browser builds use ES2022. A Worker can isolate synchronous search from the UI.

## Development

```sh
pnpm install --frozen-lockfile
pnpm exec playwright install --with-deps chromium firefox webkit
pnpm test
```

Tests cover 45 fixed inputs, independent small-state oracles, configuration,
Node/browser consumers and the installed package. Coverage requires 80% each for
statements, branches, functions and lines; strict types and lint warnings are enforced.

Read [development](wiki/development.md), [benchmarks](wiki/benchmarks.md),
[releases](wiki/releasing.md) and [AGENTS](AGENTS.md). Generated builds,
reports and coverage are CI artifacts, with the benchmark report attached to GitHub
Releases. They are not committed to the source repository.

Apache-2.0 — see [LICENSE](LICENSE).
