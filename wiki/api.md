# Public API and integration

## Module exports

The runtime exports are `solveLock`, `createSolverConfig`, `LockInputError` and
`SearchLimitError`.
There is no default export, configuration registry or required solver instance.
Classes inside the implementation do not expand the public API.

```ts
import { solveLock, createSolverConfig, LockInputError, SearchLimitError } from "gothic-lock-solver";
import type { State, Links, Command, Position, Delta, Link, SearchLimit, SolverConfig } from "gothic-lock-solver";
```

`Position` is `1 | 2 | 3 | 4 | 5 | 6 | 7`; `Link` is `-1 | 0 | 1`.
`Delta` contains integers −6 through −1 and +1 through +6.
`State` is a readonly tuple with at least two positions.
`Command` is `readonly [index: number, delta: Delta]`.
`Links<S>` preserves the dimensions of a fixed-length state tuple.

```ts
const state = [6, 2] as const satisfies State;
const links = [[0, -1], [0, 0]] as const satisfies Links<typeof state>;
const result = solveLock(state, links);
```

The state determines the matrix size. Literal tuples with too few plates,
wrong dimensions or out-of-range values fail type checking. Dynamically sized
`readonly Position[]` arrays are supported and checked at runtime. JSON remains
untrusted input regardless of a caller's TypeScript annotations.

## Inputs and configuration

`solveLock(state, links, config?)` accepts an optional complete `SolverConfig`.
Use `createSolverConfig(overrides?)` to fill defaults and validate partial settings;
see [configuration](configuration.md). Omitting config selects the same defaults.
`state[i]` is the numeric
pin position on plate `i`. Both plate indices and matrix indices start at zero;
pin positions retain their game labels 1 through 7. All target positions are 4.

The square matrix is **source first**: `links[i][j]` specifies the direct effect
on plate `j` when selecting plate `i`. A diagonal value other than zero is invalid.
The selected plate moves independently of the links. A reverse link has value −1,
a synchronous link +1, and no link 0. Effects apply once and never cascade.

The solver validates dense arrays, dimensions, integers and ranges. It makes
immutable internal copies; caller-owned arrays remain unchanged, including on
failure. `readonly` expresses the type contract but does not replace validation.

## Commands and outcomes

`[i, k]` moves pin `i` by signed numeric displacement `k` and applies its links.
Zero displacement is not a command. A command costs one action irrespective of
`abs(k)`. Each affected pin must remain within 1–7 during every unit shift.

The result is a sequence of these commands, `[]` if already open, or `null` if
unreachability has been proved. It is deterministic for identical valid inputs
within a version. Consumers must not depend on a particular tie-breaking path
across versions; minimum actions and legal completion are the guarantees.

`LockInputError` signals malformed lock input or configuration. `SearchLimitError` exposes a documented
`limit` discriminator and `maximum`; it signals unavailable computation, never
unreachability. The current resource limits are documented with
[the algorithm](algorithm.md#computation-limits).

```ts
try {
  const result = solveLock([6, 2], [[0, -1], [0, 0]]);
  if (result === null) {
    console.log("No legal solution exists.");
  } else {
    for (const [index, delta] of result) console.log(index, delta);
  }
} catch (error) {
  if (error instanceof LockInputError) console.error("Invalid lock", error.message);
  else if (error instanceof SearchLimitError) console.error("Search limit", error.limit);
  else throw error;
}
```

Positive delta increases the numbered pin position. Physical left/right may be
opposite depending on whether an interface describes plate movement or pin
movement. That conversion belongs in the adapter, not in the matrix solver.

## Web Workers

For a local installed or copied ESM bundle, a module Worker can isolate synchronous
search from the page's main thread:

```js
// solver-worker.mjs, hosted by the integrator
import { solveLock } from "https://cdn.jsdelivr.net/npm/gothic-lock-solver@VERSION/dist/gothic-lock-solver.min.mjs";

self.onmessage = ({ data: { state, links } }) => {
  try {
    self.postMessage({ commands: solveLock(state, links) });
  } catch (error) {
    self.postMessage({ error: String(error) });
  }
};
```

```js
// page.js
const worker = new Worker(new URL("./solver-worker.mjs", import.meta.url), { type: "module" });
worker.onmessage = ({ data }) => console.log(data);
worker.postMessage({ state: [6, 2], links: [[0, -1], [0, 0]] });
```

Host the Worker entry on your own origin and pin the library's exact CDN version.
Browser CSP must permit the chosen script source. No Worker wrapper is required
by the core contract; message shape and cancellation belong to the integrator.

## CLI

The fifth distribution file bundles the same solver and a Node.js file adapter.
It requires no sibling files or installed dependencies.

```sh
node dist/gothic-lock-solver.cli.mjs lock.json
node dist/gothic-lock-solver.cli.mjs lock.json --config solver.config.json --output solution.json
# Equivalent installed npm bin:
gothic-lock-solver lock.json --output solution.json
# Source entry for development:
pnpm solve lock.json --config solver.config.json
```

The input file is a JSON object with `state` and `links`. `--config` reads a
partial config JSON object through the same factory; `--help` lists CLI options. The console is Russian
for compatibility. The optional output preserves the original structured format:

```json
{
  "status": "solved",
  "initialState": [6, 2],
  "targetState": [4, 4],
  "commands": [{ "plate": 1, "direction": "right", "steps": 2 }],
  "finalState": [4, 4],
  "metrics": { "commands": 1, "divisions": 2, "plateSwitches": 0 }
}
```

Here plate numbers are one-based, `left` means positive numeric displacement,
and `right` means negative. A proved unreachable result has `status: "unsolvable"`,
`initialState`, `targetState`, and `commands: []`, without success metrics.
An open lock has `status: "solved"` and an empty command list.

Exit codes: 0 solved, 2 proved unreachable, 1 validation, IO or resource error.
With `--output`, the destination is created or overwritten before a success
message is printed. Without it, no result file is created.

A CLI process measures startup, parsing and filesystem work as well as the solver.
Use the paired [benchmark harness](benchmarks.md) for algorithm timings;
use the CLI to measure your actual end-to-end command-line workload.
