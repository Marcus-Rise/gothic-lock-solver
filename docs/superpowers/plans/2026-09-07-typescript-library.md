# Gothic Lock Solver TypeScript Library Implementation Plan

> **For agentic workers:** use superpowers:subagent-driven-development; follow this plan task by task with independent review.

**Goal:** Выпустить проверяемую TypeScript-библиотеку с четырьмя самодостаточными форматами, доказательными сравнениями и подготовленным npm/Release workflow.

**Architecture:** Один именованный facade solveLock делегирует проверенной модели и точным стратегиям поиска. Инструменты сборки, независимый oracle и измерения находятся вне runtime. npm и Release получают байты одного проверенного tarball; jsDelivr раздаёт файлы npm.

**Tech Stack:** TypeScript 7.0.2, Vite 8.2.2, Vitest 5.0.0, Playwright 1.63.0, Oxlint 1.81.0, pnpm 12.3.4; актуальность перепроверена через npm registry.

**Spec:** `docs/superpowers/specs/2026-09-07-typescript-library-design.md`.

## Global Constraints

- Только наш репозиторий, ветка feat/typescript-core-library; main и референс не меняются.
- Публичный API: `solveLock(state, links): readonly Command[] | null`, без default export и параметров настройки.
- Position=1..7, N>=2, goal=4; links[source][target]=-1/0/1, диагональ 0. Command=[zero-based index, signed numeric pin delta], delta!=0.
- Минимум действий A обязателен; U и C измеряются отдельно. Null означает доказанную недостижимость, не исчерпание ресурсов.
- Strict TypeScript, noUncheckedIndexedAccess, exactOptionalPropertyTypes и остальные флаги спецификации; без any, ts-ignore и необоснованных assertions.
- Ровно четыре независимых runtime-файла: gothic-lock-solver.mjs, gothic-lock-solver.min.mjs, gothic-lock-solver.js, gothic-lock-solver.min.js. IIFE global GothicLockSolver, ноль runtime-зависимостей.
- Node 24/26 и настоящие Chromium/Firefox/WebKit; обязательные среды не заменяются VM/jsdom.
- 45 исходных fixtures сохраняют hashes/provenance. Сторонний код AGPL не включается в пакет и репозиторий; подключается из закреплённого checkout.
- Метрики и baseline не перезаписываются автоматически; время/память с неопределённостью, без выдуманной точности.
- Только официальные Actions latest stable с SHA, официальный npm CLI/OIDC и gh; публичный npm и бесплатный CDN.

## Ownership and interfaces

| Task | Owns | Consumes / produces |
|---|---|---|
| 1 build and environment | package.json, lockfile, tsconfig*, vite/vitest/playwright config, .oxlintrc*, scripts/build*, scripts/verify-package*, tests/distribution*, tests/e2e*, tests/browser* | Consumes src/index.ts; produces dist four files plus declarations, package.tgz and `pnpm check`, `pnpm test:node`, `pnpm test:browser`, `pnpm test:e2e`, `pnpm build`, `pnpm verify:package` |
| 2 mathematical core | src/**/*.ts, tests/unit/core*, tests/helpers/oracle*, tests/types* | Produces named solveLock/types/errors; tests do not require bundle build |
| 3 evidence | benchmarks/**/*.ts, benchmarks/snapshots/*, tests/unit/benchmark*, scripts/benchmark*, benchmarks/README.md | Consumes public solveLock and pinned reference; produces `pnpm benchmark --reference PATH --output-dir PATH`, `pnpm benchmark:compare --baseline-module PATH --baseline-snapshot PATH --reference PATH --output-dir PATH` |
| 4 integration and delivery | .github/**, README.md, AGENTS.md, cli/**, solve-lock.mjs, docs/**, obsolete-file cleanup | Consumes all above commands; preserves repo CLI, prepares release/canary, produces draft PR and measured evidence |

Task 1 and Task 2 share an interface, not source files; installing tooling may precede core tests. Task 3 starts on preserved fixtures and reference while Tasks 1/2 proceed. Main coordinator owns integration and removes obsolete production code only after equivalence checks.

## Task 1: Build and verified consumers

- [ ] Configure exact devDependencies and strict compiler options; install with pnpm and save lockfile. No optional lint/typecheck bypass.
- [ ] Write distribution tests against actual outputs: import both .mjs in Node; execute both classic files in browsers; exercise Worker and isolated HTML from a static server.
- [ ] Observe missing-artifact failure before implementing build. Configure Vite library ESM/IIFE twice for readable/minified outputs; verify actual minification and no imports/chunks/runtime globals requiring Node.
- [ ] Type declarations accompany package exports; no default export. Test negative type imports and clean installed tarball outside repo resolution.
- [ ] Vitest projects run shared core/catalog cases in Node and Chromium/Firefox/WebKit. Playwright E2E imports static bytes without Vite transformations.
- [ ] Complete build/package tests and report exact commands, engines and limitations.

Expected consumer behavior:

```ts
import { solveLock } from 'gothic-lock-solver';
import * as GothicLockSolver from 'gothic-lock-solver';
expect(solveLock([6, 2], [[0, -1], [0, 0]])).toEqual([[0, -2]]);
expect(GothicLockSolver.solveLock([4, 4], [[0, 0], [0, 0]])).toEqual([]);
```

## Task 2: Exact typed core

- [ ] Write new tuple-contract behavior tests before the new entry exists. Test asymmetric direction/sign, no cascade, immutability, open/unsolvable, invalid sparse input and independent action optimality.
- [ ] Port the already proven matrix algorithm into typed single-responsibility model, exact rational functions, indexed heap, budget, A* and BFS. Preserve command order and resource limits; the old object API remains only in pinned reference code.
- [ ] Enforce compile-time tuple dimension checks where known, plus dynamic runtime validation. Document exactly which assertions are logically justified; no unverified non-null indexing.
- [ ] Differential-test all 441 N2 cases, seeded N3, singular/deadlocked/fractional matrices, N8 and safe wider state codes, limits separately from null.
- [ ] Run all 45 catalog cases with independent replay and expected minimum A. Apply each intermediate unit shift in oracle replay.
- [ ] Run typecheck and focused tests; provide self-review of mathematical invariants and time/memory impact.

Representative red tests:

```ts
expect(solveLock([6, 2], [[0, -1], [0, 0]])).toEqual([[0, -2]]);
expect(solveLock([1, 1, 1], [[0,-1,-1],[-1,0,-1],[-1,-1,0]])).toBeNull();
expect(() => Reflect.apply(solveLock, undefined, [[0, 4], [[0,0],[0,0]]])).toThrow();
```

## Task 3: Reproducible benchmark evidence

- [ ] Preserve fixture hashes and isolate immutable reference matrix source from commit 6b1cfbc13bcec68f609d45d5dc97504dd84f1760 (or byte-identical current reference). Keep original Apache BFS and upstream pin.
- [ ] Write tests for independent tuple replay, metrics A/U/C/switches, compare regression/inconclusive, source tampering and baseline non-overwrite before implementing new harness.
- [ ] Produce stable quality snapshot for all 45 locks and compare against target branch snapshot. Store optimum A and candidate result metrics separately from historic upstream counts.
- [ ] Measure warmups/repetitions, median/p95/raw samples; alternate candidate/base in one environment. Calibrate unchanged-vs-itself before a performance verdict. Paired comparison must not rely on historical times from another machine.
- [ ] Measure process peak RSS in isolated workers separately from timing; record baseline/runtime cost and browser-memory unavailable explicitly.
- [ ] Report environment/source/fixture hashes, compared SHAs, bundle bytes, per-lock differences and full JSON/Markdown. Upstream adapter verifies pinned file/block hashes before executing external code.
- [ ] Add meaningful Vitest bench entry for developer runs; release verdict uses controlled comparison rather than a noisy single benchmark threshold.
- [ ] Run reference + candidate on all 45; report improvements and regressions honestly, fix algorithmic regressions rather than relaxing snapshot.

Comparison test semantics:

```ts
// A regression is always a deterministic failure; timing uncertainty cannot hide it.
expect(compareMetrics({ A: 4, U: 2, C: 8 }, { A: 3, U: 2, C: 8 }).quality).toBe('regression');
// Historical timings alone never prove a matched-environment performance pass.
```

## Task 4: Integrate, document and deliver

- [ ] Adapt repo CLI to invoke typed facade, preserving Russian terminal messages and explicit output file behavior; test CLI against actual built core.
- [ ] Prepare official pinned GitHub Actions CI: frozen install, lint/typecheck, Node/browser/package/E2E, pinned upstream checkout and base-branch comparison; upload visible evidence.
- [ ] Prepare main stable and optional manually invoked canary workflow: same checked tarball -> npm OIDC -> registry/CDN verification -> GitHub Release. Fail distinctly on partial publish; never overwrite npm versions or source evidence.
- [ ] Document package/bootstrap ownership, exports and all examples, exact mathematical guarantee and complexity, resource errors, benchmark interpretation, source/style conventions and reviewer commands.
- [ ] Remove superseded handwritten bundler and duplicate active .mjs core only after replacement passes; preserve original historical docs and pinned reference implementations.
- [ ] Run full `pnpm check`, package consumer tests, full benchmark compare, and independent whole-branch review. Fix material findings and recheck affected behavior.
- [ ] Publish source branch and generated evidence, create draft PR against feat/matrix-astar-benchmarks. Do not merge main, publish npm, create release, or modify upstream repository.

## Verification record

Before migration: `pnpm test` passes 113/113 tests, no failures/skips; Node 24.19.0.
Latest registry versions were checked before tooling installation. Main remains a87e739; reference branch remains 3cbbeed.

## Accepted execution refinements (2026-09-07)

The owner added a fifth Vite-built self-contained Node CLI (`gothic-lock-solver.cli.mjs`) with npm bin, maintained Node22 consumer support, strict >=80% statements/branches/functions/lines across src+cli, and English README/focused engineering docs. The four library formats and two-argument tuple API remain as specified. An independent reviewer reads the owner's public-safe principles and current official TypeScript7 documentation, reviews code and real behavior evidence. Workflows are the final step after all local checks and benchmarks; no .github implementation starts before local acceptance. All changes belong to one draft PR from the preserved reference branch.
