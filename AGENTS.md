# Agent instructions

Read [README](README.md), [API](wiki/api.md), [configuration](wiki/configuration.md),
[mathematics](wiki/algorithm.md) and relevant tests before editing. The approved
work is in the [current plan](docs/superpowers/plans/2026-09-07-simplify-library.md).

## Contract and ownership

- `solveLock(state, links, config?)` returns readonly `[index, delta]` commands.
- `createSolverConfig(overrides?)` validates settings and fills frozen defaults.
- Positions 1–7, target 4, at least two plates; source-first matrix, zero diagonal,
  entries −1/0/+1, direct effects without cascading. Every affected pin stays in range.
- Commands have zero-based indices and nonzero signed displacement −6…+6.
  Inputs and caller configuration remain unchanged.
- Successful paths minimize grouped actions, then unit shifts among equal-action
  paths. Do not promise minimum distinct plates or universal timing. `null` is proved unreachable; resource
  exhaustion throws `SearchLimitError`; invalid lock/config throws `LockInputError`.
- `src/index.ts` and `src/cli.ts` are the two build entries. CLI invokes the same
  public solver/factory. Shared mathematics has one implementation.
- Keep source flat under `src/`; tests in `tests/unit`, `tests/e2e` and
  `tests/benchmarks`; maintained documentation in `wiki/`. `.github/scripts`
  contains necessary build/release coordination. Keep only the current plan in `docs/`.

## Engineering

Use TDD with observed failing behavior before changes. Tests use independent
replay and an exhaustive oracle; avoid assertions that mirror private structure.
Use domain terms and clear invariant ownership. Prefer composition, small stateful
classes and plain functions over registries, extra layers or helper-file scaffolding.
Apply SOLID, DRY, KISS and YAGNI proportionately.

Use descriptive domain names and one operation per statement. Give domain bounds,
byte sizes and sentinel values names; ordinary loop indices need no constant.
Keep the top-level search/release flow readable in order. Necessary matrix loops
remain explicit, with short bodies; do not hide them in allocation-heavy pipelines.
Oxlint limits block nesting to three levels in `src/` and `.github/scripts/`.
Review responsibilities and data flow as well as tests; passing gates alone does
not establish maintainability.

Use pnpm and exact current stable dependencies with a frozen lockfile. Preserve
strict TypeScript, checked indexed access, exact optional properties and
`skipLibCheck: false`. No `any`, non-null assertions, `ts-ignore` or unchecked casts.
Explained `ts-expect-error` belongs only in negative type tests. Do not patch
libraries or weaken checks to conceal incompatibilities; verify official APIs.

## Verification

Run focused checks and `pnpm check`, then `pnpm test`. Coverage includes all shipped
source and requires 80% per metric. Verify Node.js 22/24/26, real Chromium/Firefox/
WebKit, all five generated files, Workers and an installed archive.

Run the [45-input benchmark](wiki/benchmarks.md) without competing heavy jobs.
Compare only a saved CI report for the exact target SHA. If it is absent or
expired, record that comparison was skipped. Never rebuild a target checkout or
fall back to a registry/release baseline. Validate report source and catalog identity.
Historical timing and memory ratios are observations across runs, not paired
experiments. Preserve deterministic quality checks; do not change expected minima
or comparison thresholds merely to turn a regression green.

All local gates precede workflow edits. Independently review the final diff and
check hosted CI on the exact head. CI builds and checks; a separate release
workflow publishes main canaries after successful CI and stable versions only
through a manual dispatch selecting a tested main CI run. Working logs/review outputs belong in ignored
`artifacts/` and CI artifacts. Use official SHA-pinned Actions, npm/gh CLIs and free
standard runners. Keep the PR draft; merging and publication are separate actions.

## Hygiene

Track TypeScript source, fixed test inputs, Wiki and configuration. Do not track
JavaScript/MJS/MTS sources, copied implementations, builds, result snapshots,
benchmark reports, coverage, traces, reviewer reports, dependencies, uploaded PDFs
or credentials. Do not edit `.env` files. Do not reference other solver projects
in current code, data, docs or the PR description. Official tool documentation
and this project's own package/repository/CDN URLs remain valid.
