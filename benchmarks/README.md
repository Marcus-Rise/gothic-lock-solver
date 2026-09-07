# Reproducible catalog evidence

The 45 fixtures in `fixtures/catalog.json` are fixed catalog configurations from
[UnlockMyLoot](https://github.com/1h8s/unlockmyloot/tree/eee0bf50ebcb7fffd2b47954fd76bb015854e365),
commit `eee0bf50ebcb7fffd2b47954fd76bb015854e365`. Each entry retains its name,
encoded lock code, source URL, initial state, directed links, and original
catalog/research provenance. These are factual configurations and measured paths;
no UnlockMyLoot solver source is included. `fixtures/manifest.json` records source
file hashes, the imported analysis checksums, and the fixture checksum.

`expectedActions` is the exact grouped-command BFS minimum previously established
by the original Apache BFS and cross-checked with optimized BFS and the matrix
prototype. `baselineCommands` preserves that BFS's deterministic path. Both
public matrix search and current exact BFS must reproduce the minimum; BFS must
also preserve the path. The independent unit-click verifier in `validation.mjs`
does not use the production transitions or state encoder.

`historicalReference` preserves the original reference path, A/U/C, switches,
and prior timing observations. These timings are marked historical and excluded
from live comparisons. A = grouped actions, U = distinct selected plates,
C = unit divisions of selected plates. A is the solver's optimization objective;
U and C are descriptive and need not be minimal.

```bash
node scripts/benchmark.mjs --repetitions 5 --warmups 1 --output-dir docs/benchmarks
node scripts/benchmark.mjs --repetitions 5 --warmups 1 --output-dir docs/benchmarks --reference /path/to/unlockmyloot
node scripts/benchmark.mjs --smoke --repetitions 1 --warmups 0 --output-dir /tmp/lock-smoke
```

The default benchmarks all 45 inputs. `--smoke` selects the first two and labels
the scope `subset`; it is not evidence for the full catalog. Positive integer
repetitions and nonnegative integer warmups are required. Runtime dependencies,
network access, and a reference checkout are not required for ordinary tests.

The optional reference requires the pinned Git HEAD, exact `index.html` hash,
and exact marked solver-block hash. The unchanged block is compiled using
`Function` in the same Node.js realm as the other solvers. Reference click
grouping is outside timing; current and original Apache BFS are timed through
their public facades, including input validation and result construction.

Each measured and warmup solution passes independent replay, action-count,
determinism, input-mutation and metric checks. Current BFS and original BFS must
match the pinned path. Live reference output must match its pinned observed
path and A/U/C. The reference has a different optimization objective, so it need
not attain the exact minimum grouped-action count.

Every successful invocation creates a new `run-*` directory containing
`benchmark.json` and `benchmark.md`. Both artifacts are rendered after all
correctness checks; a single directory rename publishes them together. Existing
reports are never overwritten. Failed correctness checks publish no report.
Reports contain raw timing samples, per-lock min/median/max milliseconds, paths,
aggregates, source/core/fixture hashes, revisions, runtime and CPU metadata, and
measured matrix wins/ties/losses. No unit test imposes a wall-clock threshold.
Measurements run in Node.js and do not measure actual browser or Web Worker
performance. The harness uses natural garbage collection and never forces GC.

`runBenchmark` and `publishReport` are separate exported helpers so focused tests
can inject tiny deterministic solvers and clocks to exercise evidence failures
without timing 45 slow baseline calls.
