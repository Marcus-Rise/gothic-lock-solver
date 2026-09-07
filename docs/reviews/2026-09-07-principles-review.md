# Independent engineering review

Date: 2026-09-07. Scope: the TypeScript library migration, its five distribution
files, tests, benchmark evidence, documentation, release helpers and subsequent
workflow integration.

**Verdict: the reviewed local implementation passes the required checks.** Three
delivery findings were corrected and verified. Timing equivalence with the
preserved matrix implementation remains **inconclusive**, not a performance pass.
This review does not authorize publication or merging.

## Reviewed source and evidence

The measured runtime source is commit
`1651cd478b61f368d2fb7ce4cb0f3f644ade4eb9`. The review also includes the subsequent
release-pagination correction and its regression test. After the independent
full build, all five executable-file hashes still matched the
[clean-source benchmark report](../benchmarks/run-20260907T091221367Z-d505e32e/benchmark.json).
Documentation and delivery-only changes do not change those measured runtime bytes.

The reviewer independently read the owner's applicable public-safe engineering
principles, including proportional verification, invariant ownership, real
production-artifact checks and separation of deterministic and environmental
verdicts. Private wiki material is not reproduced here.

## Principles applied to this implementation

| Principle | Concrete evidence and assessment |
| --- | --- |
| DDD | `LockModel` owns validated state and directed links. `PreparedSearch` owns safe encoding and direct effects. Pin positions, numeric displacements, actions and search limits have explicit meanings. CLI/UI coordinates stay outside the mathematical model. |
| SOLID | Model validation, exact arithmetic, search budgets, priority queues, search strategies and file IO have distinct responsibilities. The public facade has two inputs. Internal strategies share a small contract; no public strategy registry is needed. |
| KISS / YAGNI | No DI container, repository layer, event bus, plugin mechanism or solver-instance wrapper was added. Stateful classes encapsulate actual state; rational operations remain functions. Vite builds the files; release helpers coordinate official CLIs and verified artifacts. |
| DRY | Production mechanics have one owner. CLI delegates to the core. The separate test simulator deliberately does not reuse production transitions: that independence can expose a shared implementation mistake. Preserved reference code is benchmark-only and excluded from the package. |
| BDD | Tests express observable results: signed asymmetric links, no cascade, blocked motion, nonmutation, already-open versus unreachable, distinct resource errors, installed imports and CLI exit codes. A Gherkin dependency would not strengthen these scenarios. |
| TDD | New contract and distribution tests were written before the corresponding entries/artifacts existed. The available historical red evidence has the limits stated below. Review findings received failing regression tests before fixes. |
| Evidence-driven verification | The reviewer executed the complete local production check, inspected the package-consumer matrix log, recomputed benchmark totals and verified report hashes. Author summaries alone were not treated as a passing gate. |

The complexity and patterns are proportionate to an exact mathematical library
with multiple distribution environments. The review found no remaining concrete
mathematical correctness defect in the inspected implementation.

## Mathematics and contract

The implementation and [algorithm document](../algorithm.md) agree on
`M = I + linksᵀ`, direct noncascading effects and numeric pin displacement.
Endpoint bounds suffice because each affected position moves monotonically
within a command; independent replay nevertheless checks every unit shift.

Exact rational elimination establishes necessary algebraic conditions. A
successful greedy certificate attains a lower bound; failed scheduling falls
through to search. For invertible M, an action changes one residual coordinate
by at most six, making `sum(ceil(abs(r[i])/6))` consistent. A* and the singular
case's unit-cost BFS therefore minimize grouped actions when they return a path.

The documentation correctly avoids promising minimum unit shifts or distinct
selected plates. It separates the N≤18 safe-number representation limit from
the game's model, and distinguishes resource failure from proved impossibility.
Its complexity table includes exponential state space, dense initialization,
frontier storage and the distinction between rational-operation and bit costs.

The 45 catalog cases are supported by independent unit-step replay and preserved
minimum-action results. All 441 two-plate configurations and 192 seeded
three-plate inputs are additionally checked against an independent exhaustive
oracle. These tests complement the optimality argument; their count is not a
proof over every larger input.

## TypeScript and JavaScript review

The pinned compiler is TypeScript 7.0.2. Its use was checked against the
[official TypeScript 7 announcement](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/)
and current handbook guidance. The code uses ordinary JavaScript control flow
with explicit narrowing of unknown external data, as described in
[Narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html).
There are no production `any` types, non-null assertions or unchecked type casts.

Readonly tuples and mapped types express the known dimensions; runtime checks
handle dynamic arrays and JSON. Type-only imports, explicit module exports and
installed declaration-consumer tests agree with the
[module reference](https://www.typescriptlang.org/docs/handbook/modules/reference.html).
Strictness includes checked indexed access, exact optional properties and library
checking; see the [compiler option reference](https://www.typescriptlang.org/tsconfig/).

Class fields with explicit constructor assignments remain current TypeScript.
Using every new syntax feature would not improve this contract; the
[classes handbook](https://www.typescriptlang.org/docs/handbook/2/classes.html)
supports the chosen composition of classes and functions.

One compatibility exception is explicit: Vitest 5.0.0 needs a narrow declaration
patch under the selected strict checks. It corrects an absent type dependency
and optional-property unions, without changing runtime behavior or disabling
library checking. The rationale and removal condition are documented in
[development guidance](../development.md#strictness-and-the-dependency-patch).
This is not presented as an untouched upstream declaration package.

## Independent local execution

The reviewer ran the repository's actual `pnpm test` command, covering the entire
local pipeline, before GitHub workflow integration. A PTY capture preserved the
continuous output and final process status. The run exited **0**.

| Gate | Observed result |
| --- | --- |
| Oxlint and strict TypeScript | Passed |
| Node behavior/coverage tests | 170 tests passed |
| Vite build | All five executable files built |
| Distribution tests | 13 tests passed |
| Vitest browser projects | 324 tests passed across Chromium, Firefox and WebKit |
| Static-file E2E | 24 scenarios passed, including all 45 locks for each of four core formats |
| Installed tarball | Type resolution, named/namespace imports and CLI exit codes 0/1/2 passed; all 24 browser scenarios passed again against installed package bytes |

Browser versions were Chromium 153.0.8010.12, Firefox 155.0 and WebKit 26.6.
The reviewer directly ran Node 24.19.0. The separately captured package matrix
was inspected and showed the identical tarball passing Node 22.23.2 and 26.8.1
consumer and CLI checks as well.

Coverage includes all production `src/` and `cli/` sources, including unimported
files. The aggregate gate is 80% for each metric, not 80% per individual file.

| Metric | Measured | Required |
| --- | ---: | ---: |
| Statements | 95.44% | 80% |
| Branches | 91.59% | 80% |
| Functions | 100% | 80% |
| Lines | 98.38% | 80% |

The CLI entry's single top-level statement is exercised through subprocesses and
is still included as uncovered in the in-process coverage report. It was not
excluded to increase the percentage. The author also demonstrated a failing
100% threshold probe while its tests passed. Threshold semantics follow
[Vitest's coverage documentation](https://vitest.dev/config/coverage.html).

Execution capture: `artifacts/verification/reviewer-full-test.log`, SHA-256
`f588a5eee4a8c9aab920ed3560871f020b475b157b4336c32808aabacdc9d068`.
The verified npm tarball SHA-256 was
`cc9471e3958394d7dec04c17b1089b9849f675cf915601a88d5bb6a5ff883e19`.
These are evidence for this run, not permanent hashes for future releases.

## TDD evidence and its limits

The core author's recorded initial failure was an import of the missing
`src/index.ts`; a second probe called the new two-input contract against the
preserved old API and failed in its option validator. The second probe did not
reach its result assertion. Vitest was unavailable at that point, so a separate
Vitest red assertion was not captured for every new core test.

Distribution testing recorded missing-file failures before the four bundles
existed, and a further missing-CLI failure before adding the fifth file.
Delivery review corrections recorded failures for semantic evidence tampering,
recovery and pagination before the corresponding fixes. This supports test-first
work, while falling short of a complete independently recorded red/green history
for every line of the migration. A passing final suite cannot reconstruct that
missing history, and this review does not claim otherwise.

## Corrected review findings

1. **Publishing-side evidence gate.** Prepared-artifact verification originally
   checked hashes without rechecking benchmark semantics. It now validates
   quality, performance acceptance, candidate source/module identity, linked
   report hashes and agreement with the detailed report. Tests recompute the
   manifest digest after changing evidence and still require rejection. Any
   performance acceptance must come from the trusted caller for the exact
   evidence hash; an artifact cannot approve itself.
2. **Older stable-release recovery.** Finalizing an older draft could promote it
   above a newer stable release. Promotion now considers npm's latest version
   and published stable versions; recovery tests retain the newer latest.
3. **Release-list pagination.** An existing release beyond the first 100 entries
   could be mistaken for a missing release. The official `gh api --paginate
   --slurp` result is validated and flattened before existence and promotion
   decisions. A test places the release after 100 canaries and verifies recovery.

Transport tests exercise absent versus unavailable registry responses, exact
existing tarball resumption, conflicting bytes, CDN MIME/CORS/hash rejection,
tag conflicts and draft versus published-asset behavior. They mock only external
transport/CLI boundaries and do not claim that npm publication happened locally.

## Benchmark assessment and remaining limits

The reviewer independently verified the JSON/Markdown report hashes, matching
evidence envelopes, 45 unique locks and all aggregate action metrics in the
[full report](../benchmarks/run-20260907T091221367Z-d505e32e/benchmark.md).

| Implementation | Actions A | Distinct plates U | Unit shifts C |
| --- | ---: | ---: | ---: |
| Typed candidate | 483 | 245 | 1723 |
| Preserved matrix implementation | 483 | 245 | 1723 |
| Original BFS | 483 | 245 | 1727 |
| Pinned Unlock My Loot | 491 | 245 | 1695 |

Against the upstream objective, the candidate uses fewer actions on five locks
and ties on 40, with no action-count loss. It uses more unit shifts in aggregate;
the documentation must retain that tradeoff.

Against the matrix reference, timing produced six passed and 39 inconclusive
per-lock verdicts, with no confirmed regression. This does **not** prove timing
equivalence. Both attempts of bounded repeats remain recorded. Memory passed its
calibrated comparison, but the measured Linux RSS high-water includes runtime
and harness allocation; it is not exact solver heap usage or browser memory.

Live GitHub Actions execution, npm trusted-publisher/OIDC configuration and
post-publication CDN delivery require the future authorized release environment.
The local tests establish the executable preparation and verification paths;
they do not establish that an unpublished package already resolves through a CDN.
Workflow configuration was added and reviewed after this passing local gate, as
described below. No main merge, npm publication or upstream-project modification
was performed as part of this review.

## Workflow integration review

The independent full local run finished successfully before `.github/workflows/`
was introduced. The reviewer then inspected both workflows and Dependabot
configuration, parsed the YAML, checked every shell block with `bash -n` and
verified action pins and permission scopes, and independently ran standalone
actionlint 1.7.12. These checks passed; no third-party workflow action was added.

- CI uses the proven local commands, preserves coverage/package/browser reports,
  and compares the built candidate with a separate checkout of the actual PR
  target SHA. A candidate snapshot cannot replace that target implementation.
- Each `uses:` entry belongs to GitHub's `actions` organization or pnpm's own
  action, pinned to the reviewed complete commit SHA. Dependabot tracks Actions
  and npm dependency updates.
- Release preparation produces one verified archive, measures it, saves immutable
  raw inputs, then validates the saved evidence without rebuilding or remeasuring.
  Job outputs identify the particular artifact needed for a failed-job retry.
- Candidate code runs in a job with read-only repository permissions. The npm
  and GitHub publication jobs check out the trusted main workflow source and do
  not install or execute candidate package dependencies. Only the npm job receives
  OIDC token permission; only GitHub finalization receives repository write
  permission. Checkout does not persist credentials.
- The publication order is npm, exact registry/CDN verification with real browser
  consumers, then GitHub Release finalization. Partial failure keeps the existing
  immutable version available for verified resumption. Canaries do not promote
  stable tags, and older stable recovery does not replace a newer latest release.
- Inconclusive or regressed timing is not silently converted to a pass. Preparation
  requires a passed comparison or an explicit trusted acceptance tied to the exact
  saved evidence hash; quality regressions remain blocking. Initial publication
  readiness is disabled until the owner configures npm trusted publishing.

No new blocking workflow finding remained in this static review. Hosted execution
and live OIDC/CDN publication are separate evidence surfaces; YAML validation and
local mocked transport tests do not substitute for their eventual execution.
