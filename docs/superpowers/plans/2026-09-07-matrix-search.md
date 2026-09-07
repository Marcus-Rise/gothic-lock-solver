# Matrix search and benchmarks implementation plan

> **For agentic workers:** use the task scope and interfaces below; verification evidence is mandatory.

**Goal:** закрепить быстрый точный поиск минимума действий и воспроизводимое сравнение 45 замков в gothic-lock-solver.

**Architecture:** браузерное ESM-ядро с точной матричной подготовкой, A* и BFS fallback. Node.js используется только для CLI, независимых проверок и создания отчёта. Матричный прототип из предыдущего исследования адаптируется к стабильному API и явным бюджетам ресурсов.

**Tech Stack:** JavaScript ESM, BigInt, node:test; без runtime-зависимостей.

**Spec:** ../specs/2026-09-07-matrix-search.md

## Global Constraints

- ES modules, Node.js 20+, без сторонних runtime-зависимостей.
- `solveLock(definition, {algorithm:'matrix-astar'|'bfs'}?)`; matrix-astar по умолчанию, прежний solved/unsolvable result.
- positions1..7, target4, directed non-cascading links, atomic blocking, each grouped command costs1.
- Вычислительное ядро не зависит от Node.js/DOM/сети.
- Исчерпание ресурсов даёт SearchLimitError, не unsolvable.
- Не менять .env, проектные skills, PDF или сторонний репозиторий.

## Task 1: production search

**Files:** src/matrix*.mjs, src/search*.mjs, src/solver.mjs, src/index.mjs, src/lock-definition.mjs; covering test files. Worker owns these files; result/CLI shape stays stable.

**Interfaces:** public solveLock as above. Existing findShortestCommands remains exact BFS with previous stable command ordering; matrix path may choose another deterministic optimal sequence. Export SearchLimitError from facade.

- [x] Add failing assertions for solveLock on independent N8; explicit BFS selection; invalid algorithm; resource exhaustion; no solution versus matrix false positive. Run red stage and record failures.
- [x] Implement exact matrix analysis, cheap legal scheduling certificate and matrix A*. Use a cheap greedy legal certificate first; bounded subset scheduling may follow, with safe mask representation. For singular matrices use bounded optimized macro BFS.
- [x] Preserve old BFS command order; precompute signed effects and base-7 offsets, calculate valid movement intervals, avoid per-edge state arrays. Validate budgets and safe encodings before allocation; bound frontier storage, not only expanded nodes.
- [x] Test the counterexample start[1,1,1] with all off-diagonal links−1 (unsolvable) and start[3,1,1] with the same links (4 actions). Test fractional unique solution and singular fallback.
- [x] Validate all 441 N2 cases and a deterministic bounded N3 sample against independent complete macro BFS; assert unit-click replay and no mutation of inputs. Existing tests remain green, except the deliberately updated model maximum and new documented mode differences.
- [x] Report files, tests, result, actual options/budget defaults, and concerns. No Git commit until root integrates independent files.

## Task 2: catalog and evidence harness

**Files:** benchmarks/**, scripts/benchmark.mjs, test/catalog.test.mjs, test/benchmark.test.mjs. Worker owns only these. Parent owns package.json and docs.

**Interfaces:** call public solveLock(definition,{algorithm}); definition is {state,links}. Keep source fixtures under benchmarks/fixtures. Export a reusable independent unit-click replay helper for tests/harness.

- [x] Import 45 entries from prior analysis catalog with provenance; preserve expected optimal counts and original competitor solutions/metrics. Record upstream SHA and data checksum. Add catalog tests against explicit BFS and default solver, including independent replay.
- [x] Preserve original Apache BFS baseline from commit a87e739a22ccc4215d6d9b14fa06b0738171cb60 with attribution and unchanged algorithm. Do not vendor AGPL solver code.
- [x] Implement deterministic benchmark CLI with repetitions, warmups, output directory and optional reference-repository path. Wrong comparator revision/hash must fail; no network required by ordinary tests.
- [x] Generate JSON and Markdown with per-lock A/U/C, min/median/max milliseconds, aggregates, runtime/source metadata and truthful comparisons. CLI writes report only after all correctness checks succeed.
- [x] Add focused tests for statistics/report generation/input validation and evidence failure handling; avoid wall-clock thresholds. Make smoke run reproducible without 45×slow timing in routine tests.
- [x] Report command and output format so parent can document/run final comparison. No Git commit.

## Task 3: browser verification, docs and integration

**Files:** README.md, AGENTS.md, package.json, docs/benchmarks/**, browser verification scripts/tests; parent owns these.

- [x] Document algorithm choice, exact objective, changed deterministic tie policy, resource errors, N>=2 versus implementation capacity, browser ESM and Worker usage.
- [x] Add commands for unit tests, benchmark and browser verification. Verify actual ESM dependency graph in a browser-like restricted environment; perform a real browser import when available.
- [x] Run full tests and one repeated comparison against pinned UnlockMyLoot checkout, preserving report in docs/benchmarks. Inspect every action metric and aggregate; no claims derived from stale historical timing.
- [x] Obtain independent code review with spec and full diff. Address material findings and rerun only covering checks before final full gate.
- [x] Commit and push the feature to user's GitHub repository; return reviewable branch/PR and measured outcomes. Keep upstream submission as a separate step after our project records the result.

## Verification notes

- Independent reviews of the production search and benchmark harness found no material defects.
- Added a reproducible classic-script distribution for the requested no-build upstream variant; source synchronization and isolated execution are tested.
- A real browser attempt could not load the workspace HTTP server (`net::ERR_BLOCKED_BY_CLIENT`). ESM and classic-script VM checks passed, but actual browser/Worker verification is not claimed.

- Final own-project test gate: 113/113 passed. Published core tree matches the tested local tree exactly. Full45 benchmark at clean published commit `6b1cfbc13bcec68f609d45d5dc97504dd84f1760` passed; report stored in `docs/benchmarks/run-20260907T070258001Z-f78dff13`.
