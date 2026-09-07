# Development and architecture

## Toolchain

Use pnpm 12.3.4 and Node.js 24 or 26 for development. Exact dependency versions
and integrity hashes are recorded in `package.json` and `pnpm-lock.yaml`.

| Tool | Pinned version | Responsibility |
| --- | --- | --- |
| TypeScript | 7.0.2 | Strict type checking and declarations |
| Vite | 8.2.2 | All five runtime bundles |
| Vitest | 5.0.0 | Node/browser behavior tests, coverage and developer benchmarks |
| Playwright | 1.63.0 | Real Chromium, Firefox, WebKit consumers |
| Oxlint | 1.81.0 | Static checks; warnings fail |

Production consumers use emitted JavaScript; they do not install this toolchain.
The supported consumer runtime range is Node.js 22, 24 and 26, declared in
`package.json`. Verification uses their latest maintained patch releases (currently
22.23.2, 24.19.0 and 26.8.1); use the latest patch of your chosen line. Browser testing uses real engines, not jsdom.

```sh
pnpm install --frozen-lockfile
pnpm exec playwright install --with-deps chromium firefox webkit
pnpm test
pnpm test:coverage
```

`pnpm test` runs static checks, Node tests, Vite builds, distribution checks,
browser projects, unchanged-file E2E and clean package verification. Coverage is
also a required release gate. The benchmark is deliberately separate so it can
run without concurrent CPU-heavy test/build tasks:

```sh
pnpm benchmark --reference ../unlockmyloot --output-dir artifacts/benchmark
```

See [the benchmark instructions](../benchmarks/README.md) for pinning upstream,
comparing a PR target, creating snapshots and interpreting noise.

## Strictness and the dependency patch

`tsconfig.json` enables the relevant strict flags, checked indexed access, exact
optional properties, explicit type imports, unused checks and library checking.
The build config emits declarations with the same source contract. No `any`,
non-null assertions or suppression comments are permitted in production code.
Negative type tests use `@ts-expect-error` to prove invalid imports/calls fail.
Runtime validation handles JSON, sparse arrays and values that TypeScript cannot
protect at an external boundary.

Vitest 5.0.0 currently has three declaration incompatibilities under these checks:
its config declaration imports an absent `@vitest/expect` dependency, and the
resolved `provider`/`vmMemoryLimit` option types include explicit `undefined`
while their optional declarations omit it. The narrow checked-in
`patches/vitest@5.0.0.patch` corrects declarations only, using its direct Chai
dependency and matching those option unions. It does not change runtime code or
turn off `skipLibCheck` diagnostics. The official npm tarball was independently
verified against registry integrity before the patch was applied.

Review this patch on every Vitest update and remove it when upstream declarations
support these checks. Do not silently downgrade the current tools or force an
incompatible peer dependency. The patch is maintained through pnpm's documented
patched-dependency mechanism.

## Domain boundaries

`LockModel` owns input invariants and copies. `PreparedSearch` owns encoded effects
and safe state representation. `SearchBudget` and `IndexedHeap` encapsulate state
with operational invariants. Matrix elimination uses pure exact-arithmetic
functions; strategies implement one small internal search contract. The facade
chooses the strategy without exposing the search machinery.

The core has no filesystem, DOM, UI or network dependency. CLI formatting and IO
live in `cli/`. Benchmarks own their independent replay and reference loading;
production code does not depend on benchmark fixtures. The release scripts
orchestrate already verified files and do not implement a second bundler.

This applies DDD through explicit domain terms and invariant ownership, BDD
through observable input/outcome scenarios, and TDD through a failing behavioral
check before its implementation. It does not require a DDD framework, Gherkin,
DI container or class for every function. Composition and plain functions keep
the implementation proportionate to a small mathematical library.

## Tests and evidence

- Unit and oracle tests protect mechanics, optimal action counts, validation,
  resource outcomes and nonmutation.
- The same catalog is replayed on Node and real browser projects.
- Static consumer tests verify named/namespace imports and reject a default export.
- Distribution E2E tests serve unchanged bundle bytes from a static HTTP server,
  exercise every format and all 45 inputs, test Workers and classic `file://`,
  and detect unexpected runtime requests.
- Clean tarball verification checks package contents, type resolution, imports,
  browser use and the installed CLI. A failed required consumer prevents a
  package from being marked verified.
- Coverage includes all shipped core and CLI sources, including unimported files;
  statements, branches, functions and lines each require at least 80%.

Each gate has a purpose. Do not add tests that merely mirror private methods,
or change snapshots and thresholds to conceal regressions. Timing, peak RSS,
quality and environment compatibility are separate evidence. A benchmark with
unresolved noise remains inconclusive.

## Contribution sequence

1. Read the active specification and tests, then add the failing behavioral case.
2. Implement the smallest change that preserves domain invariants.
3. Run focused tests and static checks; then run the full local production checks.
4. Measure candidate and baseline together without competing benchmark processes.
5. Have an independent reviewer check claims, tests, code and owner principles.
6. Only after local acceptance, put the working commands in official GitHub Actions.

The migration is one draft PR based on the preserved reference branch. Publishing
and merging are separate future actions. Historical design documents and reports
remain for provenance; current API, algorithm and development docs are linked
from README and AGENTS instead of duplicated into another wiki.

## Official references

- [TypeScript handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [TypeScript strict configuration](https://www.typescriptlang.org/tsconfig/strict.html)
- [Vite TypeScript behavior](https://vite.dev/guide/features#typescript)
- [Vite build options](https://vite.dev/config/build-options)
- [Vitest Browser Mode](https://vitest.dev/guide/browser/)
- [Vitest coverage](https://vitest.dev/guide/coverage.html)
- [Playwright browsers](https://playwright.dev/docs/browsers)
- [pnpm patched dependencies](https://pnpm.io/settings#patcheddependencies)

## Independent migration review

The [2026-09-07 review](reviews/2026-09-07-principles-review.md) records independent
checks of the mathematical contract, owner principles, strict TypeScript,
production consumers and release recovery. It distinguishes executed evidence
from the future first live npm/OIDC/CDN publication. The all-45 timing report
remains inconclusive about per-lock speed equivalence; no acceptance is inferred
from the absence of a confirmed aggregate regression.
