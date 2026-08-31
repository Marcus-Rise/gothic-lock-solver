# Gothic Lock Resolver Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` to implement this plan task-by-task. Fresh implementation subagent per vertical task; review between tasks. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Создать production-quality mobile-first PWA, которая проводит игрока от ввода замка до полного списка решения и пошагового показа, сохраняя существующие solver semantics.

**Architecture:** Весь repository root становится одним conventional Next.js App Router project с application code в `src/`. Существующий JavaScript solver механически переносится в TypeScript-модуль `src/server/solver-core/`; алгоритм остаётся framework-independent и доступен browser только через server-only adapter и Server Function. UI собирает факты и показывает ответ, web boundary валидирует и сериализует contract, core один решает замок.

**Tech Stack:** Node.js 20.9+, Next.js App Router, React, TypeScript, Tailwind CSS, Turbopack, Vercel Server Functions, native Web App Manifest + network-only service worker, `node:test` + `tsx`, Vitest + React Testing Library, Storybook `nextjs-vite`, Playwright, Vercel Speed Insights.

**Spec:** `../specs/2026-08-31-gothic-lock-resolver-site-design.md`

## Global Constraints

- Approved spec and five visual references remain authoritative and unchanged by this plan refinement.
- `docs/superpowers/specs/2026-08-31-gothic-lock-solver.md` remains sole source of game rules.
- Core still consumes `{ state, links }` and returns solver result. Migration may change language, paths and imports, never search rules, ordering, validation meaning or result meaning.
- UI owns plate count/positions, directed-link input, navigation, full-list display and playback cursor. It never runs BFS, link arithmetic or solver truth checks.
- `src/server/solver-web-adapter.ts` owns server validation, serialization, safe errors and playback-frame preparation using real core results.
- `src/server/solver-core/` owns solver semantics only. It has no React, Next.js, Server Function, DOM/SVG, `localStorage`, PWA or presentation knowledge.
- Browser code cannot import `src/server/**`. Adapter imports `server-only`; lint/build checks enforce dependency direction.
- One plate always has one numeric state `1..7`, one DOM+SVG marker and one active position.
- Runtime assets are original. Files under `docs/superpowers/specs/assets/` remain review inputs and never ship from `public/`.
- PWA installs but solving remains online-only. Service worker does not cache navigation, Server Function requests or result payloads.
- Vite is limited to Vitest/Storybook. Next.js dev/build use Turbopack.
- No extracted game assets, offline solver, Canvas state, first-run guide, separate device products, new product features or numeric performance budgets.
- No task introduces a second solver implementation. Core tests prove solver truth; other levels prove their own boundary or user behavior.

## Locked Project Structure

Official Next.js guidance supports putting `app` and application code in `src/`, keeping project configuration at root, and organizing project files outside `app` while `app` stays route-focused: [Next.js project structure](https://nextjs.org/docs/app/getting-started/project-structure), [Next.js installation](https://nextjs.org/docs/app/getting-started/installation).

| Path | Final responsibility |
|---|---|
| `src/app/` | App Router route, root layout, metadata/manifest and dedicated Server Function entry. No solver implementation. |
| `src/features/lock-resolver/` | Client state, DOM+SVG lock, stages, dialogs, result list and playback UI. Colocated `*.stories.tsx` only because Storybook stories describe the same component visual states. |
| `src/server/solver-core/` | Exact final home of relocated TypeScript solver: `index.ts`, `lock-definition.ts`, `result.ts`, `solver.ts`, `state-codec.ts`, `transition.ts`. Pure domain code; internal, framework-independent. |
| `src/server/solver-web-adapter.ts` | Only application boundary allowed to call core. Imports `server-only`, validates current contract, serializes result and derives playback frames through core `applyCommand`. |
| `tests/core/` | `node:test` regression suite for solver semantics and migration parity only. Runs TypeScript through `tsx`; no DOM or web assertions. |
| `tests/unit/` | Vitest + RTL tests for pure UI state, validation, rendering, accessibility, `localStorage` and long-list behavior using controlled adapter responses where isolation is intended. |
| `tests/integration/` | Vitest in Node environment against real `solver-web-adapter` + relocated core; verifies input/result/playback contract, not UI rendering. |
| `tests/e2e/` | Playwright flows through browser, Server Function and real core against production build or actual Preview. |
| `.storybook/` | Storybook configuration and Vitest browser integration. Stories stay beside feature components; they are visual/interaction evidence, not solver or E2E proof. |
| `public/` | Original PWA icons and network-only service worker only. |
| repository root | `package.json`, lockfile and Next/TypeScript/Tailwind/ESLint/Vitest/Playwright config. No second app/package. |

### Migration disposition

- Translate `src/index.mjs`, `lock-definition.mjs`, `result.mjs`, `solver.mjs`, `state-codec.mjs` and `transition.mjs` into six exact files under `src/server/solver-core/`.
- Preserve algorithm bodies and observable results; make only TypeScript typing and import-path changes required by relocation.
- Run current legacy suite first and record 37/37 PASS. During migration, compare relocated core against every existing semantic fixture and verified 26-step fixture.
- `src/cli.mjs`, root `solve-lock.mjs`, CLI-only formatter/tests, `bin` and `solve` script may exist only as temporary migration adapter inside Task 1. Remove them before Task 1 commit. Final repository exposes only website product.
- Move surviving semantic assertions into `tests/core/`. Do not move CLI presentation or filesystem behavior into core tests.

## Server, Client and Result Contract

- Request is serializable `{ state, links }`: 2–7 integer positions `1..7`; square `-1 | 0 | 1` matrix with zero diagonal.
- Success contains unchanged semantic solver result plus serialized playback frames. Each frame contains stable step number, returned command, `before` and `after` produced server-side with core `applyCommand`.
- Failure contains safe Russian text without stack, paths or internal exception details.
- `pending` is client state. `already-solved` is UI projection of `solved` with zero commands. `unsolvable` remains core status.
- UI may validate interaction constraints for feedback, but server adapter remains contract authority. Neither layer recomputes whether solver output is correct.

## Test Commands Contract

- `npm run test:core` — `node:test` over `tests/core/**/*.test.ts` through `tsx`.
- `npm run test:unit` — Vitest + RTL over `tests/unit/`.
- `npm run test:integration` — Vitest Node project over `tests/integration/` with real adapter/core.
- `npm run test:storybook` — Storybook Vitest browser project.
- `npm run test:e2e` — Playwright over `tests/e2e/` against production build or `BASE_URL`.
- `npm run lint`, `npm run typecheck`, `npm run build`, `npm run build:storybook` keep separate failure signals.
- `npm run verify` runs lint, typecheck, core, unit, integration, Storybook build/tests, Next production build and local production E2E.

Next.js defines unit/component, integration and E2E as distinct purposes and recommends E2E for async Server Components: [Next.js testing guide](https://nextjs.org/docs/app/guides/testing). Its Vitest guide recognizes `__tests__` or colocation; this project chooses one visible `tests/` hierarchy, with only Storybook stories colocated for tooling/visual ownership: [Next.js Vitest guide](https://nextjs.org/docs/app/guides/testing/vitest). Server-only imports receive a build-time guard through `server-only`: [Next.js Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components).

## Execution and Review Contract

- Execute only through `superpowers:subagent-driven-development`.
- Dispatch one fresh implementation subagent for each Task 1–8. Brief includes branch, exact task, relevant spec/plan sections, allowed files, tests and commit boundary.
- After implementation subagent reports GREEN, run review before next task. Stage 1 checks spec/plan compliance and forbidden scope. Stage 2 checks code quality, dependency direction, tests and evidence.
- Reviewer reports gaps and violated contracts, not ready-made implementation or code for implementer.
- Maximum three review-repair iterations per vertical task. One iteration is review verdict plus one bounded repair pass plus rerun of task gates.
- If third iteration still fails, stop execution. Report exact failing contract, evidence, affected task and owner decision/blocker needed. Do not start Task N+1 and do not loop again.
- Commit only after both review stages pass. Each task keeps one atomic commit boundary listed below.

---

### Task 1: Convert Repository to Next.js and Relocate Solver Core

**Goal / result:** Root becomes one working Next.js TypeScript application; real browser request reaches relocated real core through server-only adapter; CLI disappears as product surface.

**Files:** root framework config/scripts; `src/app/`; `src/features/lock-resolver/`; `src/server/`; `tests/core/`; `tests/integration/`; `tests/e2e/`. Remove legacy `.mjs`/CLI paths after parity proof.

**Test cycle:**

- [ ] Run untouched baseline: `npm test`; require exactly 37 tests and 37 PASS.
- [ ] Add RED core migration-parity cases covering validation, transition ordering/blocking, shortest path/tie-breaking, solved/unsolvable/already-open results and 26-step fixture.
- [ ] Add RED integration cases for valid/invalid requests, solved/unsolvable/already-solved serialization and frame sequence from real adapter/core.
- [ ] Add RED Playwright walking skeleton: two plates, explicit confirmation, empty links, real Server Function, visible solved result.
- [ ] Create conventional `src` App Router project and test scripts; translate/move core mechanically; wire server-only adapter and Server Function.
- [ ] Compare old and relocated semantic results before deleting temporary CLI adapter; then remove all CLI product entries.

**Verification:** `npm run lint && npm run typecheck && npm run test:core && npm run test:integration && npm run build && npm run test:e2e`.

**Acceptance evidence:** Core fixtures match before/after; client import of `src/server/**` fails lint/build; browser bundle contains no solver; final tree has no CLI entry or package script.

**Commit boundary:** `refactor: move solver into Next.js server core`

---

### Task 2: Build Live DOM+SVG Lock

**Goal / result:** UI renders 2–7 plates with approved depth language and enforces one plate, one marker, one position.

**Files:** `src/features/lock-resolver/`, colocated stories, `tests/unit/`.

**Test cycle:**

- [ ] Add RED unit/component cases for 2 and 7 plates, positions `1..7`, exactly one marker/current position per plate and stable rerender.
- [ ] Add RED keyboard/accessibility cases for names, values, focus and non-color state cues.
- [ ] Add Storybook states for default, selected, boundary, seven-plate and raster-defect guard views.
- [ ] Implement DOM+SVG lock from client state only; compare stories with approved visual references.

**Verification:** `npm run test:core && npm run test:unit && npm run test:storybook && npm run build:storybook && npm run build`.

**Acceptance evidence:** Unit DOM assertions and Storybook inspection prove invariant; runtime imports no approved PNG.

**Commit boundary:** `feat: add live Gothic lock module`

---

### Task 3: Implement Initial State and Safe Stage Navigation

**Goal / result:** Player chooses 2–7 plates, reproduces positions, confirms initial state and moves between stages without losing confirmed data.

**Files:** `src/features/lock-resolver/`, stories, `tests/unit/`, `tests/e2e/`.

**Test cycle:**

- [ ] Add RED unit cases for count bounds, one-division left/right movement, `1`/`7` boundaries, ignored links and confirmation gate.
- [ ] Add RED cancel/back/Escape and focus cases preserving confirmed state.
- [ ] Add RED E2E from fresh page through explicit initial confirmation into links stage.
- [ ] Implement state transitions and UI using Task 2 lock.

**Verification:** `npm run test:core && npm run test:unit && npm run build && npm run test:e2e`.

**Acceptance evidence:** Links stage unreachable before confirmation; initial movement never invokes core or applies links; keyboard flow complete.

**Commit boundary:** `feat: add initial lock setup flow`

---

### Task 4: Implement Directed Links, Warning and Result States

**Goal / result:** Player creates/edits/deletes directed links, confirms them, handles first-run warning and sees every product result state through real core boundary.

**Files:** `src/features/lock-resolver/`, `src/app/`, `src/server/solver-web-adapter.ts`, stories, `tests/unit/`, `tests/integration/`, `tests/e2e/`.

**Test cycle:**

- [ ] Add RED unit cases for source confirmation, target/type order, sync/reverse direction, zero default, no inferred reverse, edit/delete and cancel hierarchy.
- [ ] Add RED unit cases for first warning, checkbox persistence in `localStorage`, repeat suppression, focus containment/restoration and no cookies.
- [ ] Add controlled-response unit cases for pending/solved/unsolvable/already-solved/error rendering.
- [ ] Add real-core integration cases for exact submitted matrix, safe validation error and all serialized terminal states.
- [ ] Add Playwright flows through Server Function for solved, unsolvable, already-solved and product-visible error.
- [ ] Implement workflow without solver logic outside core.

**Verification:** `npm run test:core && npm run test:unit && npm run test:integration && npm run build && npm run test:e2e`.

**Acceptance evidence:** Confirmed links equal adapter request; states distinguishable and announced; raw exceptions never render.

**Commit boundary:** `feat: add directed link solving flow`

---

### Task 5: Implement Full Result and 26-Step Mobile Fullscreen

**Goal / result:** Full stable list always exists; mobile fullscreen scrolls 26 steps and returns without losing result or reading position.

**Files:** `examples/lock.long.json`, `src/features/lock-resolver/`, stories, `tests/core/`, `tests/unit/`, `tests/e2e/`.

**Locked fixture:** `state = [4,7,3,6,5,6]`; `links = [[0,0,-1,0,1,-1],[1,0,0,0,0,-1],[-1,0,0,0,0,-1],[1,1,0,0,0,0],[0,-1,0,1,0,1],[1,0,0,-1,0,0]]`. Real core must return `solved`, 26 commands and final `[4,4,4,4,4,4]`; never store hand-written solution list.

**Test cycle:**

- [ ] Add core fixture regression for exact 26-command count and final state.
- [ ] Add controlled-response unit/Storybook cases for numbering `1..26`, overflow, fullscreen exit, focus and preserved reading position.
- [ ] Add mobile E2E that enters real fixture, solves through Server Function, opens fullscreen, scrolls, exits and verifies preserved result/position.
- [ ] Implement fullscreen as view of one result state, separate from playback.

**Verification:** `npm run test:core && npm run test:unit && npm run test:storybook && npm run build && npm run test:e2e`.

**Acceptance evidence:** Stable numbers before/during/after fullscreen; full list remains reachable; no duplicate result store.

**Commit boundary:** `feat: add long solution list experience`

---

### Task 6: Implement Server-Derived Playback

**Goal / result:** Player advances through real returned commands on live lock with selected plate and before/after state while full list remains intact.

**Files:** `src/server/solver-web-adapter.ts`, `src/features/lock-resolver/`, stories, `tests/integration/`, `tests/unit/`, `tests/e2e/`.

**Test cycle:**

- [ ] Add real-core integration cases proving every serialized frame equals sequential internal `applyCommand`, including sync/reverse links and blocked-frame failure handling.
- [ ] Add controlled-response unit/Storybook cases for current command, selected plate, before/after, start/end boundaries, announcement and return to full list.
- [ ] Add E2E completing playback through real Server Function and comparing rendered final positions with returned final state.
- [ ] Implement client playback over returned frames only.

**Verification:** `npm run test:core && npm run test:unit && npm run test:integration && npm run build && npm run test:e2e`.

**Acceptance evidence:** No transition arithmetic in client; one-marker invariant holds through every E2E step; playback never hides or mutates full list.

**Commit boundary:** `feat: add interactive solution playback`

---

### Task 7: Finish Visual System, Accessibility and Installable PWA

**Goal / result:** All stages match approved visual package, work on phone/tablet/desktop and install as explicit online-required PWA.

**Files:** `src/app/`, `src/features/lock-resolver/`, stories, `.storybook/`, `public/`, `tests/unit/`, `tests/e2e/`.

**Test cycle:**

- [ ] Add manifest/service-worker tests: required fields/icons resolve; no route, Server Function or result caching.
- [ ] Add Storybook visual states for approved mobile/wide frames, all terminal states, warning and fullscreen.
- [ ] Add unit/Storybook accessibility checks for roles, names, values, heading order, focus visibility/containment, status announcements and non-color cues.
- [ ] Add Playwright phone/tablet/desktop paths plus manifest/icons, offline solve error and reconnect success.
- [ ] Implement original styling/assets and network-only PWA shell.

**Verification:** `npm run verify` plus build-output scan proving approved PNG paths are absent from runtime assets.

**Acceptance evidence:** Written invariant wins over raster defect; no game/reference asset ships; install succeeds; offline solve fails clearly and reconnect recovers.

**Commit boundary:** `feat: finalize responsive installable experience`

---

### Task 8: Verify Actual Vercel Preview and Delivery Evidence

**Goal / result:** Immutable Preview runs full product through real deployment; Speed Insights records actual baseline; docs match shipped project.

**Files:** root verification config, `src/app/` Speed Insights integration, `tests/e2e/`, README/AGENTS and delivery evidence.

**Test cycle:**

- [ ] Add integration guard proving Speed Insights stays in web layout and never enters core.
- [ ] Configure same Playwright scenarios to use `BASE_URL` without local `webServer`.
- [ ] Run full local `npm run verify`.
- [ ] Deploy Vercel Preview; verify browser trigger, Server Function request, real core response and rendered result. If protection is enabled, use automation bypass header without logging secret.
- [ ] Run complete E2E against Preview: happy path, unsolvable, already-solved, error, cancel/back, 26-step fullscreen, playback, mobile, PWA offline/reconnect.
- [ ] Check Preview server logs at each request boundary and stop at first broken boundary instead of continuing past it.
- [ ] Record real Speed Insights LCP/INP/CLS baseline after data appears; do not invent thresholds.
- [ ] Update operator docs only after commands and deployed paths are proven.

**Verification:** local `npm run verify`; Preview deploy; `BASE_URL` remote Playwright run; deployment log check; Speed Insights data check.

**Acceptance evidence:** Preview URL/SHA recorded; remote E2E green; Vercel logs show no Server Function errors; Speed Insights receives real data. This follows Vercel plugin full-story verification: browser, server boundary, core response, rendered UI.

**Commit boundary:** `chore: verify Vercel resolver delivery`

---

## Test Case to User Story to Owner Level Matrix

Each row names concrete proof. Multiple levels have different oracles; none repeats BFS truth outside `node:test` core.

| Story | Concrete test cases | Owner level and oracle | Why this level |
|---|---|---|---|
| SITE-01 | `TC-SITE-01A` main path at phone/tablet/desktop; `01B` same stages/controls each size | Storybook: three layouts. Playwright: real browser path on three viewports. Preview: production phone + wide smoke. | Storybook reveals layout regression; E2E proves one usable product; Preview proves deployed CSS/assets. |
| SITE-02 | `TC-SITE-02A` manifest/icons valid; `02B` offline solve shows network requirement; `02C` reconnect solves | Unit: manifest/service-worker policy. Playwright: resources and offline/reconnect. Preview: real HTTPS manifest + solve. | Static policy is local; browser/HTTPS behavior needs E2E/deployment. |
| SITE-03 | `TC-SITE-03A` explicit stage confirmation; `03B` cancel/back preserves facts | Unit: state transitions with controlled responses. Playwright: browser path through real Server Function. | Reducer owns transitions; E2E proves wiring. |
| SITE-04 | `TC-SITE-04A` pending; `04B` solved; `04C` unsolvable; `04D` already-solved; `04E` safe error | Unit: render/announce five controlled states. Integration: real adapter terminal serialization. Playwright: visible terminal paths; pending stays deterministic unit proof. | Unit isolates UI; integration proves contract; E2E proves visible outcome without timing-flaky pending. |
| SITE-05 | `TC-SITE-05A` full list stays; `05B` command/before/after; `05C` return preserves list | Unit/Storybook: controlled list/playback. Integration: real frames. Playwright: real solve/playback. | UI, adapter and full path own different truths. |
| SITE-06 | `TC-SITE-06A` approved Gothic states; `06B` no reference/game runtime assets | Storybook: visual comparison. Unit/build: asset-import guard. Preview: phone/wide inspection. | Rendered review, deterministic guard and deployment each catch distinct risk. |
| SITE-07 | `TC-SITE-07A` 26 stable numbers; `07B` mobile fullscreen scroll; `07C` exit restores position | Core: real fixture returns 26. Unit/Storybook: fullscreen state. Playwright: real mobile fixture. Preview: deployed mobile flow. | Core owns count; UI owns view; E2E/Preview own scrolling. |
| LOCK-01 | `TC-LOCK-01A` 2/7 plates; `01B` boundaries; `01C` one marker through rerender/playback; `01D` links inactive during input | Core: position/transition semantics. Unit/Storybook: DOM/SVG invariant. Playwright: invariant through playback. | Solver bounds, DOM and animation require separate oracles. |
| LOCK-02 | `TC-LOCK-02A` links unavailable early; `02B` confirmation preserves positions | Unit: state gate. Playwright: cannot advance early, advances after action. | State machine proves rule; E2E proves control. |
| LOCK-03 | `TC-LOCK-03A` source confirmation; `03B` active context; `03C` no reverse edge | Unit: state/UI. Integration: exact matrix reaches real adapter. | UI owns selection; integration owns transport. |
| LOCK-04 | `TC-LOCK-04A` zero default; `04B` sync; `04C` reverse; `04D` source differs target | Core: coefficient movement semantics. Unit: choices/labels. Integration: matrix unchanged. | Core alone proves movement meaning; UI/integration prove captured facts. |
| LOCK-05 | `TC-LOCK-05A` list; `05B` edit; `05C` delete; `05D` confirmation gate | Unit/Storybook: interactions/states. Playwright: real edit/delete/confirm journey. | Feature state and usable browser path are distinct. |
| LOCK-06 | `TC-LOCK-06A` type-to-target cancel; `06B` target-to-source; `06C` Escape/Back preserve; `06D` focus restored | Unit: hierarchy/focus. Playwright: keyboard-only path. | Reducer proves hierarchy; browser proves keyboard/focus. |
| LOCK-07 | `TC-LOCK-07A` first warning; `07B` checkbox persists; `07C` repeat suppressed; `07D` no cookies; `07E` focus containment/restoration | Unit with storage mock. Playwright: first/second real solve attempt. | Client owns storage/dialog; E2E proves persistence across attempts. |
| LOCK-08 | `TC-LOCK-08A` frames equal sequential `applyCommand`; `08B` selected/before/after visible; `08C` final DOM equals core final; `08D` blocked frame safe error | Core: command semantics. Integration: frame serialization/guard. Unit/Storybook: frame rendering. Playwright: complete real playback. | Algorithm, adapter, presentation and user path each have one owner. |

## Coverage and Self-Review

- All 15 approved stories appear exactly once in matrix; each has concrete case IDs, owner level, oracle and level rationale.
- `node:test` proves solver semantics/migration parity only. Vitest unit proves UI state/rendering. Integration distinguishes real adapter/core from controlled UI responses. Storybook proves visual states. Playwright proves real browser/Server Function/core paths. Preview/Speed Insights prove deployment-only evidence.
- Exact final core target: `src/server/solver-core/`. Exact tests hierarchy: `tests/core`, `tests/unit`, `tests/integration`, `tests/e2e`.
- No ad-hoc top-level application folder, parallel application, Git submodule, second package or permanent CLI surface remains.
- No task changes solver rules or duplicates solver logic.
- No unresolved product or architecture choice remains. Breakpoints and internal component names stay implementation-private.
- Placeholder scan must return no planning gaps or generic unscoped error/test instructions.
- Before Task 1 begins, untouched repository must still report 37/37 tests PASS.
