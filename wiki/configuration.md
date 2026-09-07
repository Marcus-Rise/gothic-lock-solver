# Solver configuration

`solveLock(state, links, config?)` accepts a complete readonly `SolverConfig`.
`createSolverConfig(overrides?)` accepts partial overrides, fills defaults, validates
values and returns a frozen object. Both APIs are available through ESM and the
`GothicLockSolver` browser global.

```ts
import { createSolverConfig, solveLock } from "gothic-lock-solver";
import type { SolverConfig } from "gothic-lock-solver";

const config: SolverConfig = createSolverConfig({ maxVisited: 500_000 });
solveLock([6, 2], [[0, -1], [0, 0]], config);
solveLock([6, 2], [[0, -1], [0, 0]]); // Defaults
```

| Field | Default | Unit / permitted range | Effect |
| --- | ---: | --- | --- |
| `maxVisited` | 2,000,000 | Discovered states; positive safe integer | Bounds retained search history |
| `maxExpanded` | 1,000,000 | Expanded states; nonnegative safe integer | Bounds processing; zero permits no expansion |
| `maxFrontier` | 1,000,000 | Pending states; positive safe integer | Bounds the queue |
| `maxDenseBytes` | 67,108,864 | Bytes; nonnegative safe integer | Dense-storage budget; zero selects sparse storage |

Unknown fields, null, arrays, strings, fractional/unsafe numbers and invalid ranges
are rejected with `LockInputError`. The solver revalidates complete configurations
supplied from ordinary JavaScript. Neither API mutates the caller's object.

Larger budgets permit more resource consumption without guaranteeing success.
Safe-number state representation limits still apply. `maxDenseBytes` controls
only dense storage, not total heap or process RSS; sparse structures and runtime
costs remain relevant. Exceeding a search budget throws `SearchLimitError` with
`limit` and `maximum`, never `null` for interrupted work. An open state or algebraic
impossibility can be decided without expansion. Every returned path still has the
minimum action count. Positions 1–7, goal 4 and direct links are fixed domain rules.

## CLI

Save partial overrides in `solver.config.json`:

```json
{
  "maxVisited": 500000,
  "maxFrontier": 100000
}
```

```sh
gothic-lock-solver lock.json --config solver.config.json
node gothic-lock-solver.cli.mjs lock.json --config solver.config.json --output solution.json
```

CLI uses the same factory. Without `--config`, defaults apply. Unreadable files,
invalid JSON and invalid settings produce an error and exit 1; exit 2 is reserved
for proved unreachability. `--help` lists flags; `--output` optionally creates or
overwrites the result JSON. See [API](api.md#cli).
