# Benchmarks

The catalog contains 45 fixed numerical locks. Every run independently replays
solutions, verifies the known minimum action counts, and measures the built module.

```sh
pnpm build
pnpm benchmark
```

Output is `artifacts/benchmark/benchmark.json` and `benchmark.md`. These files are
CI artifacts, never committed. JSON contains each solution, raw timings, memory
samples, environment information, source SHA and module/catalog hashes.

## Optional comparison with a saved report

```sh
pnpm benchmark --baseline-report /path/to/benchmark.json --baseline-sha TARGET_SHA
```

CI obtains `TARGET_SHA` from the PR target commit or the previous main commit.
It selects the latest successful CI run for that exact commit and its named
benchmark report artifact. If the artifact
is absent or expired, the current benchmark still runs and explicitly records
`comparison: skipped`. CI does not check out the target, rebuild it, execute its
code or substitute an npm/GitHub release. API access failures and malformed reports
are errors, not missing baselines.

A supplied report must match its claimed SHA, current schema and fixed catalog.
Its commands are replayed and its recorded deterministic metrics checked before
comparison. The canonical `benchmark-SHA` artifact belongs to the selected CI
run. Rerunning the build replaces its report; rerunning only failed test rows
reuses the successful build and its report.

## Metrics and limits

| Metric | Meaning |
| --- | --- |
| Actions | Number of grouped commands; one command can shift several positions |
| Distinct plates | Number of different directly selected plates per lock |
| Unit shifts | Sum of absolute command displacements |
| Switches | Changes between consecutive selected plates |
| Median / p95 | Solver-call latency, excluding input cloning and replay |
| Peak RSS | Whole-catalog Node process memory, including runtime and imported module |

When a baseline exists, deterministic quality is compared per lock. The current
policy reports a regression if any action, distinct-plate, unit-shift or switch
count increases. Aggregate improvements do not hide a per-lock increase.

Saved timings and RSS come from different runs. Ratios are informative observations;
different hosts, runtimes, loads and measurement noise prevent treating them as a
paired performance experiment. They do not produce a statistical pass/fail gate.
RSS is not solver-only allocated memory and does not measure browser heap usage.

Defaults are two warmups, seven measured solves per lock and three fresh Node
process memory samples. `--warmups`, `--repetitions`, `--memory-repetitions` and
`--output-dir` allow local investigation. Run measurements after other heavy tasks
finish. Keep raw observations and environment details with any performance claim.
