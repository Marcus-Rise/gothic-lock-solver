# Agent instructions

## Purpose and authority

Gothic Lock Solver is a strict TypeScript mathematical library and standalone
Node.js CLI. The active requirements are in
[the library specification](docs/superpowers/specs/2026-09-07-typescript-library-design.md).
The owner approved a migration from the preserved JavaScript reference; old
specifications and reports are historical, not the active module contract.

Read [README](README.md), [API](docs/api.md), [algorithm](docs/algorithm.md),
[development](docs/development.md) and relevant tests before changing code.
Public documentation must be self-contained; access to private owner notes is
not a development prerequisite. Do not copy private notes into this repository.

## Invariants

- At least two plates; numeric pin positions 1–7; goal 4.
- `links[source][target]` has −1/0/+1 entries and zero diagonal.
- Direct links apply once; no cascading; the selected plate's effect is implicit.
- A legal command keeps every affected pin in range throughout the movement.
- Module commands are zero-based `[index, delta]`, nonzero delta −6…+6.
- `solveLock(state, links)` has exactly two inputs; no default export.
- Successful solutions minimize grouped actions. Distinct controls and individual
  shifts are separate reported metrics, not additional global guarantees.
- `null` means proved unreachable. Resource exhaustion throws `SearchLimitError`.
- Inputs are not mutated. Runtime validation and exact integer/rational arithmetic
  cannot be replaced by assertions, coercions or floating-point tolerances.

## Architecture

- `src/index.ts`: public facade and explicit type/error exports.
- `src/lock-model.ts`: validated immutable input; single owner of input invariants.
- `src/matrix-analysis.ts`: exact rational Gauss–Jordan analysis.
- `src/matrix-search.ts`: certificate and exact A*.
- `src/search-bfs.ts`: exact singular-case fallback.
- `src/search-limits.ts`: prepared effects, encoding and computation budgets.
- `src/indexed-heap.ts`: priority queue; `src/indexed.ts`: checked indexed access.
- `cli/`: Node-only adapter preserving historical console/JSON conventions.
- `benchmarks/`: pinned fixtures, immutable references, independent replay and reports.
- `scripts/`: Vite build, consumer verification, benchmarks and release orchestration.
- `tests/`: behavior, exhaustive oracle, static type, distribution and real browser checks.

Use composition and small domain objects with clear invariants. Keep exact
arithmetic as functions where a class adds no state or responsibility. Avoid
frameworks, duplicate validation policies, abstraction registries and public
options without a demonstrated requirement. Apply SOLID, KISS, YAGNI and DRY
proportionately. Test observable behavior, not private implementation inventories.

## Changes and verification

Start behavioral changes with a failing test and record the relevant red/green
evidence. Use pnpm and the exact current dependencies in the lockfile. Keep strict
TypeScript checks and lint warnings-as-errors. No `any`, `@ts-ignore`, non-null
assertions or unjustified type assertions; `@ts-expect-error` is restricted to
negative type-contract tests. Use current official tool documentation when an API
changes. Do not disable library checking to hide dependency declaration defects.

Local gates precede workflow edits:

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm test:coverage
pnpm benchmark --reference ../unlockmyloot --output-dir artifacts/benchmark
```

Core and shipped CLI coverage must be at least 80% for every coverage metric.
Every one of the 45 locks must replay legally and retain minimum action counts.
The independent small-state oracle and all required real browser projects must
pass. Verify the built files, isolated CLI and clean installed tarball; source-only
or VM tests do not establish browser/distribution compatibility.

Compare performance against the PR target in the same environment, preserving
raw samples and noise calibration. Never lower expected action counts or update
snapshots merely to turn a regression green. An inconclusive timing result stays
inconclusive. Record exact revisions, artifact hashes and environment details.

An independent reviewer checks the final implementation, tests, mathematical
claims and owner principles before the draft PR is declared ready for review.
The reference branch remains unchanged. Do not merge main, publish packages or
modify the upstream project as part of this migration.

## Repository hygiene

Keep README and current engineering docs in English; preserve Russian CLI output.
Use the same focused docs from README and this file instead of duplicating a wiki.
Never commit secrets, uploaded PDFs, `project_sources/`, `upload/`, dependency
folders or generated build/test artifacts. Do not edit `.env` files. Historical
benchmark reports and pinned reference sources are intentionally versioned.
Use official vendor Actions pinned to verified full SHAs, official npm/gh CLIs,
and standard free public runners. No separate CDN deployment service is needed.
