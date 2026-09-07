# Reproducible benchmarks

`tests/benchmarks/fixtures.json` contains 45 fixed numerical inputs and expected
mathematical minima. These are regression cases, not a random sample of all locks.
Independent unit-step replay checks legal completion, nonmutation and deterministic
commands. Only the candidate and our own actual baseline are compared.

## Run

Prepare a separate checkout of this repository's reference branch:

```sh
git worktree add --detach ../gothic-lock-solver-base feat/matrix-astar-benchmarks
pnpm build
pnpm benchmark \
  --baseline-module ../gothic-lock-solver-base/src/index.mjs \
  --baseline-format legacy \
  --output-dir artifacts/benchmark
```

That legacy module belongs to the separate checkout. For a typed target, build it
and use `dist/gothic-lock-solver.mjs` with `--baseline-format tuple`. The command
generates a snapshot by executing the exact baseline, then compares both modules.
`pnpm benchmark:compare` also accepts `--baseline-snapshot PATH` for a verified
release snapshot. Fixture and baseline identities must match.

Defaults: two warmups, seven timing repetitions and five whole-workload memory
repetitions. Set `--warmups`, `--repetitions`, `--memory-repetitions` explicitly
when needed. `--smoke` labels a subset; `--skip-memory` records unavailable memory.
Neither establishes full release readiness. Unknown/duplicate flags fail.

## Metrics and gates

| Metric | Meaning |
| --- | --- |
| A | Grouped commands; must equal the mathematical minimum |
| U | Distinct selected plates |
| C | Sum of absolute command displacements |
| Switches | Changes of selected plate between adjacent commands |

Only A is the optimization objective. This change also preserves U/C/switches
against the actual baseline. Improvement in one metric cannot conceal loss in
another. Candidate results cannot supply their own expected baseline.

Only the synchronous public call is timed. Cloning, normalization, replay and
reporting are outside the timer; public validation/config handling are inside.
Matched rounds alternate implementation order; baseline-versus-itself samples
calibrate noise. The screen uses paired log ratios and a conservative standard-error
envelope with at least five observations, not an exact distribution-free confidence
interval. A control envelope above 25% cannot certify a pass.

- `passed`: the upper slowdown envelope lies within calibrated control noise.
- `regression`: a slowdown outside the envelope is confirmed in one bounded repeat.
- `inconclusive`: insufficient precision, noisy controls or conflicting attempts.

A non-pass gets one bounded repeat; both attempts remain visible. Never rerun
until a preferred verdict appears. Confirmed performance or quality regressions
fail the command; uncertainty is retained for explicit release review. A sum of
per-lock medians is not a measured whole-workload latency or universal promise.

## Memory

Fresh Linux workers measure `/proc/self/status` VmHWM in bytes. Raw Node maxRSS,
startup and loaded RSS remain diagnostics: maxRSS can retain a launcher's pre-exec
peak. Per-lock observations are descriptive; repeated whole-workload workers
supply the matched comparison. Values include Node, loading, replay and harness
costs; they are not exact solver allocation. Kernel RSS accounting is approximate.

Other-platform fallbacks cannot establish a pass without equivalent semantics
being verified. Portable exact browser peak memory is unavailable; Node RSS is
not browser heap. See [Linux proc](https://docs.kernel.org/filesystems/proc.html)
and [Node resource usage](https://nodejs.org/api/process.html#processresourceusage).

## Storage

Each run creates fresh ignored output: baseline snapshot, full JSON/Markdown,
raw samples and versioned `benchmark-evidence.json` with a generated quality
snapshot. Reports include environment, source/module/fixture hashes, bundle sizes
and paths. Existing evidence is never silently overwritten.

GitHub Actions stores these as artifacts. PR CI uses the actual target SHA in a
separate checkout; releases verify preceding-release bytes/snapshot. The first
release explicitly uses our preserved reference. GitHub Releases retain evidence
with the checked package. No snapshots or run reports are committed to Git.
