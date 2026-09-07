# Gothic Lock Solver

An exact **minimum-action** solver for the coupled plate locks in Gothic 1 Remake.
A small TypeScript library for browsers, Web Workers and Node.js, with a standalone
CLI. It has no runtime dependencies.

One action selects a plate and moves it several positions in one direction.
The solver minimizes these grouped actions, rather than individual clicks.
It combines exact matrix analysis, an optimality certificate, A* and a BFS fallback.
[The algorithm and its proof](docs/algorithm.md) explain the guarantee and its limits.

> Publication status: this branch prepares the first public release. The package
> and CDN examples below become available after the first verified npm publication.
> Replace `VERSION` with an exact published version; these are integration templates.

## Install and import

```sh
npm install gothic-lock-solver
```

```ts
import { solveLock } from "gothic-lock-solver";

const commands = solveLock([6, 2], [[0, -1], [0, 0]]);
// [[0, -2]]: decrease pin 0 by two; its reverse link increases pin 1 by two.
```

A namespace import is also supported:

```ts
import * as GothicLockSolver from "gothic-lock-solver";

const commands = GothicLockSolver.solveLock([6, 2], [[0, -1], [0, 0]]);
```

There is no default export. Type declarations ship with the package.
[The complete contract](docs/api.md) covers tuple inference, validation and errors.

## Use directly in HTML

No build step, package installation or CDN account is required by the integrator.
The npm package already contains the exact files served by jsDelivr.

```html
<script src="https://cdn.jsdelivr.net/npm/gothic-lock-solver@VERSION/dist/gothic-lock-solver.min.js"></script>
<script>
  const commands = GothicLockSolver.solveLock([6, 2], [[0, -1], [0, 0]]);
  console.log(commands);
</script>
```

For browser modules:

```html
<script type="module">
  import { solveLock } from "https://cdn.jsdelivr.net/npm/gothic-lock-solver@VERSION/dist/gothic-lock-solver.min.mjs";
  console.log(solveLock([6, 2], [[0, -1], [0, 0]]));
</script>
```

Pin the full version and file path. The library is synchronous; use a
[Web Worker](docs/api.md#web-workers) for an interface that must remain responsive
while solving a difficult lock.

## Contract at a glance

```ts
solveLock(state, links): readonly Command[] | null
// Command = readonly [index: number, delta: -6 | ... | -1 | 1 | ... | 6]
```

| Value | Meaning |
| --- | --- |
| `state[i]` | Pin position, an integer from 1 to 7; the goal is 4 |
| `state.length` | Number of plates, at least 2 |
| `links[source][target]` | Direct influence: −1 reverse, 0 none, +1 same direction |
| Diagonal | Always 0; the selected plate's own movement is implicit |
| `[index, delta]` | Zero-based plate index and signed change in numeric pin position |
| `[]` | Already open |
| `null` | The target was proved unreachable |
| `LockInputError` | Invalid values or dimensions |
| `SearchLimitError` | A computation limit was reached; this does not prove impossibility |

Links do not cascade. Every affected pin must stay in positions 1–7 throughout
an action. Inputs are copied and never mutated. Positive delta means a higher
**pin position**; map it to physical left/right in the consuming UI.

The model does not impose an eight-plate maximum. The current state encoding
supports up to 18 plates, with additional search budgets. Runtime and memory can
grow exponentially; successful results retain the exact minimum-action guarantee.
The solver does not promise minimum individual clicks or minimum distinct plates
among equally short action sequences.

## Choose a distribution file

| File in `dist/` | Use |
| --- | --- |
| `gothic-lock-solver.mjs` | Readable ESM, Node.js or browser import |
| `gothic-lock-solver.min.mjs` | Minified ESM |
| `gothic-lock-solver.js` | Readable classic browser script, global `GothicLockSolver` |
| `gothic-lock-solver.min.js` | Minified classic browser script |
| `gothic-lock-solver.cli.mjs` | Standalone Node.js command-line tool |

Each runtime file is self-contained. The CLI uses only built-in Node.js modules;
the four core files use no Node.js or DOM APIs, additional chunks or network calls.
The classic files are IIFEs, not CommonJS modules. Declarations, license and build
checksums accompany the runtime files.

## Run the CLI

Use a maintained Node.js 22, 24 or 26 release (latest patch recommended). After installing the package, run `gothic-lock-solver`.
Alternatively, download the CLI release asset and run it directly:

```sh
node gothic-lock-solver.cli.mjs lock.json --output solution.json
```

```json
{
  "state": [6, 2],
  "links": [[0, -1], [0, 0]]
}
```

The CLI retains the original Russian console output and JSON result format.
Its compatibility adapter uses **one-based plates**, `left` for increasing pin
position and `right` for decreasing it. The module API uses zero-based tuples.
Exit codes are `0` for solved, `2` for proved unreachable and `1` for input,
filesystem or resource errors. No output file is written unless `--output` is
supplied; an existing output file is replaced. See [CLI details](docs/api.md#cli).

## Evidence and development

The test corpus contains all **45 pinned catalog locks**, plus all 441 two-plate
configurations and 192 reproducible three-plate configurations. An independent
unit-step simulator checks every returned path; a separate exhaustive oracle
checks minimum actions on small models.

Validation covers Node.js, real Chromium/Firefox/WebKit, both module bundles,
both classic bundles, Workers, the installed npm tarball and the standalone CLI.
Production core and CLI coverage must be at least **80% each for statements,
branches, functions and lines**. Type checking uses strict TypeScript 7; lint
warnings are errors.

A [complete measured run](docs/benchmarks/run-20260907T091221367Z-d505e32e/benchmark.md)
compares all 45 locks on clean source
[`1651cd4`](https://github.com/Marcus-Rise/gothic-lock-solver/commit/1651cd478b61f368d2fb7ce4cb0f3f644ade4eb9),
Node.js 24.19.0, Linux and AMD EPYC 9V74:

| Implementation | Actions A | Distinct plates U | Unit shifts C | Sum of per-lock medians |
| --- | ---: | ---: | ---: | ---: |
| TypeScript library | 483 | 245 | 1,723 | 47.363 ms |
| Preserved matrix reference | 483 | 245 | 1,723 | 48.507 ms |
| Original BFS | 483 | 245 | 1,727 | 2,653.701 ms |
| Pinned Unlock My Loot | 491 | 245 | 1,695 | 1,517.403 ms |

Against Unlock My Loot, five locks require fewer actions and forty tie, with
no action-count losses. It optimizes individual shifts first, so its smaller C
is a different trade-off. The TypeScript migration preserves A/U/C for every
lock compared with our matrix reference.

Timing against the matrix reference is **inconclusive**: six per-lock comparisons
passed and thirty-nine remain uncertain. One bounded repeat detected a roughly
7 μs slowdown on `alberto-mine-hut-chest`; the conflicting attempts are preserved,
not dismissed. A smaller aggregate does not prove every lock became faster.
Whole-catalog process-memory comparison passed: median Linux VmHWM was
90.04 MiB versus 91.45 MiB. This includes Node and the harness, not just solver
allocations. The time column sums per-lock medians; it is not one measured
whole-catalog latency.

The [machine-readable evidence](docs/benchmarks/run-20260907T091221367Z-d505e32e/benchmark-evidence.json)
links the complete raw samples, paths, environment and hashes. Seven timing
repetitions after two warmups, unchanged controls and bounded repeats make the
limits of these observations explicit.

[Benchmark documentation](benchmarks/README.md) describes the full reports,
immutable fixtures, paired timing, peak RSS and baseline comparisons.
Actions, distinct selected plates and individual shifts are reported separately.
A timing result is `passed`, `regression` or `inconclusive`; noisy measurements
are not silently declared successful. Machine-specific timings are evidence for
that environment, not a universal latency promise.

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm test:coverage
pnpm benchmark --reference ../unlockmyloot --output-dir artifacts/benchmark
```

Read [development and architecture](docs/development.md),
[algorithm and complexity](docs/algorithm.md), [release process](docs/releasing.md),
and [agent instructions](AGENTS.md) before contributing. Local verification
precedes workflow integration. The reference implementation remains available in
`feat/matrix-astar-benchmarks` and as a hash-pinned benchmark reference.

## Attribution and license

Apache-2.0; see [LICENSE](LICENSE). Catalog provenance and hashes are recorded in
[the fixture manifest](benchmarks/fixtures/manifest.json).
[Unlock My Loot](https://unlockmyloot.com/) and its
[source repository](https://github.com/1h8s/unlockmyloot) provide the catalog and
comparison implementation. Its solver is measured from a separately checked-out,
pinned upstream revision and is not bundled or republished in this package.
