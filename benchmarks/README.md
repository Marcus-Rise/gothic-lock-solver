# Reproducible benchmark evidence

The 45 fixed catalog inputs in `fixtures/catalog.json` come from
[UnlockMyLoot at eee0bf50ebcb7fffd2b47954fd76bb015854e365](https://github.com/1h8s/unlockmyloot/tree/eee0bf50ebcb7fffd2b47954fd76bb015854e365).
The original fixture bytes, IDs, initial positions, directed links, provenance,
encoded lock codes, optimum grouped-action counts and historic paths are unchanged.
The catalog SHA256 is
`0eb5b641eac4bda105bde24b60399220f1767dd13db6a312b78638b2750ba675`.
The loader verifies this immutable hash independently of the manifest.

`baseline/` preserves the original Apache-2.0 BFS unchanged at
`a87e739a22ccc4215d6d9b14fa06b0738171cb60`. `reference-matrix/` preserves the
byte-identical Apache matrix implementation measured at
`6b1cfbc13bcec68f609d45d5dc97504dd84f1760`, including its original license.
Their manifests verify every preserved source file. These are benchmark references;
they are excluded from the published library. The external AGPL solver is never
vendored: `--reference` reads the separate pinned checkout, verifies its Git revision,
whole `index.html` hash and marked solver-block hash, then evaluates that unchanged
block in the same Node realm as the other timed implementations.

## Running the controlled comparison

```bash
pnpm build
pnpm benchmark --reference /path/to/unlockmyloot --output-dir docs/benchmarks

pnpm benchmark:compare \
  --baseline-module /path/to/base/dist/gothic-lock-solver.mjs \
  --baseline-snapshot /path/to/base-quality.json \
  --baseline-format tuple \
  --reference /path/to/unlockmyloot \
  --output-dir docs/benchmarks
```

`benchmark` defaults to the pinned matrix reference. `benchmark:compare` requires
explicit module and snapshot paths from the PR target branch or previous release.
Both default to the candidate's built `dist/gothic-lock-solver.mjs`; the optional
`--candidate-module PATH` selects another named-export ESM. Its exact bytes and
SHA256 appear in evidence. `--baseline-format legacy` adapts the old one-argument
facade: one-based `plate` becomes a zero-based index, `left` becomes positive delta,
and `right` negative delta. `tuple` calls `solveLock(state, links)` directly.

The default uses two warmups and seven measured repetitions per implementation
and lock. `--warmups N`, `--repetitions N` and `--memory-repetitions N` explicitly
set sampling. At least five matched measurements and five unchanged-control
measurements are needed for a performance verdict. Positive repetition counts
and nonnegative warmups are validated; duplicate and unknown arguments fail.

`--smoke` selects the first two locks and labels the timing report `subset`.
`--skip-memory` explicitly records memory as unavailable and cannot establish a
performance pass. Neither is complete release evidence. Without `--reference`,
upstream cached counts remain visible, but there are no live upstream timings.

## Quality and performance gates

`validation.ts` independently replays tuple commands one unit division at a time.
It imports no production transition, state encoder, matrix analysis or search.
Every warmup and timed result must reach the goal, preserve input data and repeat
its deterministic path. Both candidate and baseline must attain the exact A
minimum originally proven by BFS on every fixture. Original BFS paths must match
the preserved path; live upstream paths and metrics must match pinned observations.

Metrics are kept separately for each implementation and each lock:

| Metric | Meaning | Comparison rule |
| --- | --- | --- |
| A | Grouped commands | Must equal the fixture's proven optimum |
| U | Distinct selected plates | An increase over the target snapshot fails quality |
| C | Sum of absolute selected-plate deltas | An increase over the target snapshot fails quality |
| plateSwitches | Changes of selected plate between adjacent commands | An increase fails this migration's quality gate |

Only A is the solver's optimization objective. U/C/switches are descriptive; the
migration still must preserve them unless a separate reviewed change explicitly
accepts different behavior. Improving one metric does not conceal deterioration
in another. A bad path, lost solvability, input mutation, resource failure or
invalid command is a deterministic failure independent of timing uncertainty.

The live baseline must reproduce the supplied target snapshot, including commands.
Candidate expectations are never consulted. Snapshot source module SHA256 must
match the actual loaded baseline. Thus editing the candidate's snapshot cannot
mask a regression against the PR target. Historic timing values are provenance
only and never establish a current performance pass.

Timing calls share one Node process. The harness calibrates the unchanged baseline
against itself, then rotates measured implementation order by lock and round.
The public call is inside the timer; input cloning, normalization, independent
replay, metric calculation and reporting are outside it. Public validation and
legacy result construction are part of their respective public call costs.
Raw sample order, min, median, nearest-rank p95 and max are retained.

The performance procedure uses paired log ratios and a conservative uncertainty
envelope (`mean ± 2.776 × standard error`, at least five observations). This is a
practical noise screen, not a claim of an exact distribution-free confidence
interval. The unchanged-control envelope determines the tolerance. A control
envelope wider than 25% cannot certify equivalence; it can still identify a
slowdown clearly exceeding that envelope. This ceiling rejects noisy evidence;
it is not a regression allowance.

- `passed`: the candidate's upper slowdown envelope lies within the calibrated
  control envelope.
- `regression`: a slowdown exceeds the envelope and is confirmed in one bounded
  repeat.
- `inconclusive`: insufficient samples, wide control noise, overlap or conflicting
  initial/repeat observations. This does not mean that regression is absent.

A non-pass receives one bounded repeat; both attempts and raw samples remain in
JSON. An initial regression followed by a pass remains inconclusive. No repeated
runs continue until a preferred verdict appears. Every per-lock timing verdict
is visible; aggregate time never hides a slower lock. A confirmed regression or
quality regression returns a nonzero CLI status. Inconclusive evidence is retained
for explicit release review; release readiness requires acceptance of that exact
evidence, not merely passing unit tests.

## Memory and environment limits

Memory is measured separately in fresh Node child processes, never inside the
timing process. Each implementation has one isolated observation per lock. These
individual observations are explicitly inconclusive about regressions because one
sample cannot estimate environmental variation. A second measurement series runs
the entire catalog in fresh processes, rotating candidate, base and unchanged
controls for five repetitions by default; a non-pass gets one bounded repeat.
The whole-catalog comparison concerns peak RSS of that workload, not the sum of
per-lock RSS. A smoke run restricts both timing and memory to the same two selected fixtures.

On Linux the metric is `/proc/self/status` **VmHWM × 1024 bytes**, the current
process image's RSS high-water. The raw Node `process.resourceUsage().maxRSS × 1024`
is also retained: controlled investigation showed that it could retain a heavy
launcher's pre-exec high-water, producing an artificial floor in otherwise fresh
workers. Each sample includes startup/post-import/current-image peaks, current RSS,
raw getrusage peak, and a flag when the startup getrusage peak exceeds VmHWM.

The [Linux kernel documentation](https://docs.kernel.org/filesystems/proc.html)
defines VmHWM and warns that scalable RSS accounting is asynchronous and approximate.
The [Node API documentation](https://nodejs.org/api/process.html#processresourceusage)
specifies maxRSS in kibibytes. Neither metric is exact algorithm allocation: they
include runtime, modules, fixtures and measurement infrastructure. On other
platforms raw Node maxRSS is labeled as a fallback and the memory verdict remains
inconclusive until the platform's process-image semantics are verified. No values
are pooled across platforms. Browser peak memory remains explicitly unavailable;
Node RSS is not browser heap or Web Worker memory.

Every run records Node/V8/OS/CPU, runtime arguments, candidate/base revisions,
dirty state, TypeScript and harness hashes, exact ESM SHA256, four library
bundle sizes/hashes plus the separate Node CLI bundle, fixture/source pins, compared snapshot SHA256, samples,
paths, metrics and per-lock differences. See the algorithm documentation for
worst-case time and space complexity: these 45 measured configurations are not a
random sample and cannot establish asymptotic complexity or universal speedups.

An isolated memory correction can retain earlier timing samples without rewriting
them:

```bash
node scripts/benchmark-memory.ts /path/to/prior/benchmark.json \
  --reference /path/to/unlockmyloot --output-dir docs/benchmarks
```

The correction checks that candidate bytes are unchanged, creates a separate RSS
supplement and adds an explicit superseded-memory notice next to the original
report. The original hashed JSON/Markdown/evidence files remain unchanged.

## Reports and deliberate snapshot updates

Each successful correctness run atomically publishes a new `run-*` directory:

- `benchmark.json`: complete paths, raw samples, calibration, differences,
  memory observations and provenance.
- `benchmark.md`: English review report, totals and per-lock tables.
- `benchmark-evidence.json`: versioned release evidence with report SHA256 links,
  source/artifact provenance, verdicts and the candidate `qualitySnapshot`.

Existing reports and snapshots are never overwritten automatically. To establish
quality from the actual PR target code, or propose a separate snapshot update:

```bash
node scripts/benchmark-snapshot.ts \
  --source-module /path/to/base/src/index.mjs \
  --source-format legacy \
  --reason 'Initial migration baseline from the actual PR target revision' \
  --output /new/path/base-quality.json
```

The explicit generator verifies all 45 paths, their exact minima and determinism,
records the source revision/hash and reason, and creates the destination
exclusively. An existing destination causes an error. It does not establish a
performance pass. Review any proposed new snapshot together with a matched
comparison; do not regenerate expected quality from candidate code inside PR CI.
For a previous release, use its `qualitySnapshot` from verified evidence and the
exact previously published ESM bytes as the baseline.

`pnpm benchmark:vitest` runs representative fixed inputs through Vitest 5's test
context `bench.compare()` for day-to-day investigation. This developer report is
not the release gate and writes no tracked snapshot. The controlled harness above
is authoritative for matched environment evidence. The current API is documented
in the [official Vitest benchmarking guide](https://vitest.dev/guide/benchmarking).
