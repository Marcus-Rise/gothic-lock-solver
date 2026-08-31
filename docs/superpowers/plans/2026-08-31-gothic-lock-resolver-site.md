# Gothic Lock Resolver Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` to implement this plan task-by-task. Fresh implementation subagent per vertical task; review between tasks. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Создать production-quality mobile-first PWA, которая проводит игрока через явный выбор количества пластин, ввод позиций и направленных зависимостей, полный список решения и пошаговый показ, позволяя безопасно исправить модель без полного сброса и сохраняя существующие solver semantics.

**Architecture:** Весь repository root становится одним conventional Next.js App Router project с application code в `src/`. Существующий JavaScript solver механически переносится в TypeScript-модуль `src/server/solver-core/`; алгоритм остаётся framework-independent и доступен browser только через server-only adapter и Server Function. UI собирает факты и показывает ответ, web boundary валидирует и сериализует contract, core один решает замок.

**Tech Stack:** Node.js 20.9+, Next.js App Router, React, TypeScript, Tailwind CSS, Turbopack, Vercel Server Functions, native Web App Manifest + network-only service worker, `node:test` + `tsx`, Vitest + React Testing Library, Storybook `nextjs-vite`, Playwright, Vercel Speed Insights.

**Spec:** `../specs/2026-08-31-gothic-lock-resolver-site-design.md`

## Global Constraints

- Approved spec and five visual references remain authoritative and unchanged by this plan refinement.
- `docs/superpowers/specs/2026-08-31-gothic-lock-solver.md` remains sole source of game rules.
- Core still consumes `{ state, links }` and returns solver result. Migration may change language, paths and imports, never search rules, ordering, validation meaning or result meaning.
- UI owns plate count/positions, directed-link input, confirmations, solution invalidation, navigation, full-list display and playback cursor. It never runs BFS, link arithmetic or solver truth checks.
- `src/server/solver-web-adapter.ts` owns server validation, serialization, safe errors and playback-frame preparation using real core results.
- `src/server/solver-core/` owns solver semantics only. It has no React, Next.js, Server Function, DOM/SVG, `localStorage`, PWA or presentation knowledge.
- Browser code cannot import `src/server/**`. Adapter imports `server-only`; lint/build checks enforce dependency direction.
- One plate always has one numeric state `1..7`, one DOM+SVG marker and one active position.
- The user path is fixed: plate count `2..7` → initial positions → directed dependency matrix → solve → complete list → playback. Count remains safely editable at every later stage.
- Growing the model preserves all existing facts; each added plate starts at position `4`, has only its immutable self relation and has no off-diagonal relations. Shrinking requires an explicit destructive-impact dialog listing removed higher-numbered plates and every incoming/outgoing relation; cancel is a no-op and confirm preserves all surviving facts.
- Initial positions use a compact `N×7` single-choice table synchronized bidirectionally with the central DOM+SVG lock. The lock remains the primary visual model; tables remain precise input tools.
- Directed dependencies use an asymmetric `N×N` matrix: moved plate is the row, affected plate is the column, diagonal is immutable self, and each off-diagonal cell is none/sync/reverse. Meaning is never color-only; mouse, keyboard and touch are supported. Mobile keeps sticky row/column context with understandable horizontal navigation and/or fullscreen editing.
- Any confirmed count, position or dependency edit after solving invalidates the solution and playback cursor, explains that recalculation is required, returns to the relevant editor and preserves unrelated facts. There is no forced full reset.
- Runtime assets are original. Files under `docs/superpowers/specs/assets/` remain review inputs and never ship from `public/`.
- PWA installs but solving remains online-only. Service worker does not cache navigation, Server Function requests or result payloads.
- Vite is limited to Vitest/Storybook. Next.js dev/build use Turbopack.
- No extracted game assets, offline solver, Canvas state, first-run guide, separate device products, new product features or numeric performance budgets.
- No task introduces a second solver implementation. Core tests prove solver truth; other levels prove their own boundary or user behavior.
- Solver command-array length has no product maximum. Full list, stable numbering, scrolling, mobile fullscreen, return-position preservation and playback derive from actual returned array length; UI never truncates, silently collapses or stops early.
- The verified five-plate input returns 26 macro commands whose `steps` sum to 92 elementary divisions. The external reference reports 92 single shifts; this explains the units but does not prove algorithm or sequence equivalence and never authorizes fitting the core to the reference.
- The observed 26-command lock is one known real long fixture, not a boundary. Controlled UI/Storybook coverage also uses generated data longer than 26; that chosen test length is not a new cap. Neither `26` nor `92` is a product maximum or branch condition.
- Pagination, extra toggles or virtualization are not v1 requirements. Add optimization only after measured need, without hiding commands or changing result contract.

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
| `tests/e2e/` | Full Playwright regression against local production build/server plus isolated short remote-smoke project against deployed Preview. |
| `.storybook/` | Storybook configuration and Vitest browser integration. Stories stay beside feature components; they are visual/interaction evidence, not solver or E2E proof. |
| `public/` | Original PWA icons and network-only service worker only. |
| repository root | `package.json`, lockfile and Next/TypeScript/Tailwind/ESLint/Vitest/Playwright config. No second app/package. |

### Migration disposition

- Translate `src/index.mjs`, `lock-definition.mjs`, `result.mjs`, `solver.mjs`, `state-codec.mjs` and `transition.mjs` into six exact files under `src/server/solver-core/`.
- Preserve algorithm bodies and observable results; make only TypeScript typing and import-path changes required by relocation.
- Run current legacy suite first and record 37/37 PASS. During migration, compare relocated core against every existing semantic fixture and the verified five-plate regression fixture: 26 commands, 92 total divisions and final `[4,4,4,4,4]`.
- `src/cli.mjs`, root `solve-lock.mjs`, CLI-only formatter/tests, `bin` and `solve` script may exist only as temporary migration adapter inside Task 1. Remove them before Task 1 commit. Final repository exposes only website product.
- Move surviving semantic assertions into `tests/core/`. Do not move CLI presentation or filesystem behavior into core tests.

## Server, Client and Result Contract

- Request is serializable `{ state, links }`: 2–7 integer positions `1..7`; square `-1 | 0 | 1` matrix with zero diagonal.
- The matrix's immutable self cell is a UI explanation of the selected plate's mandatory own movement. It serializes as core coefficient `0`, because the core applies own movement separately from `links`; the site does not change that rule.
- Success contains unchanged semantic solver result plus serialized playback frames. Each frame contains stable step number, returned command, `before` and `after` produced server-side with core `applyCommand`.
- Failure contains safe Russian text without stack, paths or internal exception details.
- `pending` is client state. `already-solved` is UI projection of `solved` with zero commands. `unsolvable` remains core status.
- UI may validate interaction constraints for feedback, but server adapter remains contract authority. Neither layer recomputes whether solver output is correct.

## Test Commands Contract

- `npm run test:core` — `node:test` over `tests/core/**/*.test.ts` through `tsx`.
- `npm run test:unit` — Vitest + RTL over `tests/unit/`.
- `npm run test:integration` — Vitest Node project over `tests/integration/` with real adapter/core.
- `npm run test:storybook` — Storybook Vitest browser project.
- `npm run storybook` — interactive Storybook server used for agent/browser visual inspection of rendered stories and their `play` interaction sequences.
- `npm run test:e2e` — full Playwright browser scope over `tests/e2e/` against local production build/server; never dev-only.
- `npm run test:smoke` — short Playwright smoke project from `tests/e2e/` against required deployed `BASE_URL`; never aliases the full suite.
- `npm run lint`, `npm run typecheck`, `npm run build`, `npm run build:storybook` keep separate failure signals.
- `npm run verify` runs lint, typecheck, core, unit, integration, Storybook build/tests, Next production build and local production E2E.

### Two-stage release and deployment gate

1. **Pre-deploy local gate:** On exact candidate commit, run all cheaper local levels, Storybook interaction/build plus completed visual evidence, production build, then full `npm run test:e2e` against local production server. `npm run verify` is the single mechanical authorization command; unit/integration success alone never authorizes deployment.
2. **Deploy exact commit:** Deploy only SHA that passed full local gate without failed, flaky, skipped or unproven checks. Record SHA, immutable Vercel URL and their association.
3. **Post-deploy remote smoke:** Run only `BASE_URL=<immutable-preview-url> npm run test:smoke`. Smoke proves deployed wiring, not regression breadth; do not rerun full remote suite by default.
4. **Metrics evidence:** Observe logs and Speed Insights only after smoke passes. Metrics never replace smoke.

Pre-deploy full local E2E covers approved browser scope: browser to Server Function to real core to rendered result; explicit count, synchronized `N×7` positions and directed matrix; grow/shrink/confirm/cancel; edit-triggered invalidation and recalculation; pending/solved/unsolvable/already-solved/error; arbitrary-length list/fullscreen/restore; playback to actual last step; mobile/wide; mapped accessibility; PWA online-required behavior. Save exact SHA, production-build result, full Playwright report/artifacts, browsers, viewports and pass status under `docs/superpowers/reviews/gothic-lock-resolver/task-8-release/local/`.

If any local check is failed, flaky or unproven, do not deploy. Repair, rerun narrow failing check, then rerun complete `npm run verify` on resulting commit. If remote smoke fails, capture browser/server/network boundary and logs; repair on new commit, rerun complete local gate, redeploy that SHA and rerun smoke. Deployment protection/auth that prevents smoke is a blocker, never a pass.

Next.js defines unit/component, integration and E2E as distinct purposes and recommends E2E for async Server Components: [Next.js testing guide](https://nextjs.org/docs/app/guides/testing). Its Vitest guide recognizes `__tests__` or colocation; this project chooses one visible `tests/` hierarchy, with only Storybook stories colocated for tooling/visual ownership: [Next.js Vitest guide](https://nextjs.org/docs/app/guides/testing/vitest). Server-only imports receive a build-time guard through `server-only`: [Next.js Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components).

### Visual Storybook acceptance gate

- Applies to Tasks 2–7 because they create or change visible UI. It does not apply to non-visual core/integration work in Task 1 or deployment-only work in Task 8.
- Every visible feature has deterministic Storybook states plus `play` interactions, or equivalent native Storybook interaction mechanism, for its real user transition. Stories do not mock solver truth; they receive controlled serialized states appropriate to component review.
- Implementer must run `npm run storybook`, open every story touched by the task with agent/browser tooling, execute its interaction sequence and visually inspect each key frame. Green test output without rendered inspection is insufficient.
- Inspect every affected story at mobile and wide viewports. Check clipping, overflow, text readability, touch targets, `focus-visible`, keyboard order, contrast/a11y addon violations and `prefers-reduced-motion` wherever animation exists.
- Compare render with approved PNG package for housing/seven-plate geometry, one marker/position, aged materials, colors, Russian Gothic typography, beveled controls, mobile composition and wide adaptation. Written contract overrides raster defects.
- Save review evidence under `docs/superpowers/reviews/gothic-lock-resolver/task-N-storybook/`: inventory of stories/states/viewports, screenshots of key frames, interaction path, a11y result, deviations found and repair evidence. Evidence joins task atomic commit.
- Storybook owns visual and component-interaction acceptance only. Vitest owns state/render logic, integration owns web/core contract, Playwright owns full browser journey.

## Execution and Review Contract

- Execute only through `superpowers:subagent-driven-development`.
- Dispatch one fresh implementation subagent for each Task 1–8. Brief includes branch, exact task, relevant spec/plan sections, allowed files, tests and commit boundary.
- After implementation subagent reports GREEN, run review before next task. Stage 1 checks spec/plan compliance and forbidden scope. Stage 2 checks code quality, dependency direction, tests and evidence.
- For Tasks 2–7, Stage 1 also opens Storybook evidence and rendered stories; Stage 2 verifies interaction tests, a11y addon results and visual repair evidence.
- Reviewer reports gaps and violated contracts, not ready-made implementation or code for implementer.
- Maximum three review-repair iterations per vertical task. One iteration is review verdict plus one bounded repair pass plus rerun of task gates; visual/reference/a11y repair consumes the same limit.
- If third iteration still fails, stop execution. Report exact failing contract, evidence, affected task and owner decision/blocker needed. Do not start Task N+1 and do not loop again.
- Commit only after both review stages pass. Each task keeps one atomic commit boundary listed below.

---

### Task 1: Convert Repository to Next.js and Relocate Solver Core

**Goal / result:** Root becomes one working Next.js TypeScript application; real browser request reaches relocated real core through server-only adapter; CLI disappears as product surface.

**Files:** root framework config/scripts; `src/app/`; `src/features/lock-resolver/`; `src/server/`; `tests/core/`; `tests/integration/`; `tests/e2e/`. Remove legacy `.mjs`/CLI paths after parity proof.

**Test cycle:**

- [ ] Run untouched baseline: `npm test`; require exactly 37 tests and 37 PASS.
- [ ] Add RED core migration-parity cases covering validation, transition ordering/blocking, shortest path/tie-breaking, solved/unsolvable/already-open results and the verified five-plate 26-command/92-division fixture without treating either number as a limit.
- [ ] Add RED integration cases for valid/invalid requests, solved/unsolvable/already-solved serialization and frame sequence from real adapter/core.
- [ ] Add RED Playwright walking skeleton: explicit two-plate choice, position confirmation, empty off-diagonal matrix, real Server Function and visible solved result.
- [ ] Create conventional `src` App Router project and test scripts; translate/move core mechanically; wire server-only adapter and Server Function.
- [ ] Compare old and relocated semantic results before deleting temporary CLI adapter; then remove all CLI product entries.

**Verification:** `npm run lint && npm run typecheck && npm run test:core && npm run test:integration && npm run build && npm run test:e2e`.

**Acceptance evidence:** Core fixtures match before/after; client import of `src/server/**` fails lint/build; browser bundle contains no solver; final tree has no CLI entry or package script.

**Commit boundary:** `refactor: move solver into Next.js server core`

---

### Task 2: Build Live DOM+SVG Lock

**Goal / result:** UI renders the central 2–7-plate visual model with approved depth language and enforces one plate, one marker, one position; later tables can drive the same state without replacing the lock visually.

**Files:** `src/features/lock-resolver/`, colocated stories, `tests/unit/`.

**Test cycle:**

- [ ] Add RED unit/component cases for 2 and 7 plates, positions `1..7`, exactly one marker/current position per plate and stable rerender.
- [ ] Add RED keyboard/accessibility cases for names, values, focus and non-color state cues.
- [ ] Add deterministic Storybook stories for two-plate and seven-plate locks, default/selected/boundary positions, one-pin movement and raster-defect guard; `play` sequences select one plate, move it one division and expose each key frame.
- [ ] Implement DOM+SVG lock from client state only; compare stories with approved visual references.
- [ ] Run Storybook; agent/browser opens every Task 2 story at mobile and wide viewports, executes selection/movement, inspects housing/plate geometry, one marker, materials, typography, buttons, touch/focus/contrast and reduced motion.
- [ ] Save Task 2 story inventory, key-frame screenshots, a11y results, deviations and repaired frames in required review-evidence path.

**Verification:** `npm run test:core && npm run test:unit && npm run test:storybook && npm run build:storybook && npm run build`.

**Acceptance evidence:** Unit DOM assertions and inspectable mobile/wide Storybook evidence prove invariant and approved geometry; runtime imports no approved PNG; no clipping, illegible text, touch/focus/contrast or reduced-motion defect remains.

**Commit boundary:** `feat: add live Gothic lock module`

---

### Task 3: Implement Plate Count, Initial Positions and Safe Resizing

**Goal / result:** Player begins with an explicit `2..7` plate choice, enters one position per plate in a compact `N×7` table synchronized with the live lock, and safely grows or shrinks the model without losing surviving facts.

**Files:** `src/features/lock-resolver/`, stories, `tests/unit/`, `tests/e2e/`.

**Test cycle:**

- [ ] Add RED unit cases for required count step and bounds; `N×7` single selection per row; bidirectional table/lock synchronization; `1`/`7` boundaries; ignored dependencies during position entry; and the confirmation gate.
- [ ] Add RED unit cases for growth preserving current positions/dependencies while appending position `4`, immutable self and no off-diagonal relations.
- [ ] Add RED unit cases for shrink impact calculation listing every removed higher-numbered plate plus every incoming/outgoing relation; cancel changes nothing, while confirm removes only listed plates/relations and preserves surviving facts.
- [ ] Add RED cancel/back/Escape and focus-restoration cases preserving confirmed state.
- [ ] Add Task 3 Storybook interaction stories for step 0 count; compact `N×7` input synchronized with the live lock; boundary movement; growth; shrink warning with complete impact list; shrink cancel and confirm; explicit position confirmation; and cancel/back/focus return. Reuse Task 2 geometry stories.
- [ ] Add RED E2E from fresh page through count and position confirmation into matrix stage, plus grow and shrink-confirm/cancel paths after data exists.
- [ ] Implement state transitions and UI using Task 2 lock; keep resize operations as model transformations independent of solver logic.
- [ ] Run Storybook; inspect every Task 3 interaction frame at mobile and wide viewports, including table readability, one active choice per row, table/lock synchronization, destructive-impact wording, keyboard focus and touch targets; save inventory, screenshots, a11y/deviation/repair evidence.

**Verification:** `npm run test:core && npm run test:unit && npm run test:storybook && npm run build:storybook && npm run build && npm run test:e2e`.

**Acceptance evidence:** Matrix stage is unreachable before explicit count and position confirmation; initial movement never invokes core or applies dependencies; resize tests prove exact preservation/removal semantics; Storybook evidence shows readable, unclipped count/table/grow/shrink/confirmation/cancel frames with correct focus on both viewports.

**Commit boundary:** `feat: add safe lock setup flow`

---

### Task 4: Implement Directed Dependency Matrix, Warning and Result States

**Goal / result:** Player edits the complete directed dependency model in an accessible asymmetric matrix, confirms it, handles the retained first-run warning and sees every product result state through the real core boundary.

**Files:** `src/features/lock-resolver/`, `src/app/`, `src/server/solver-web-adapter.ts`, stories, `tests/unit/`, `tests/integration/`, `tests/e2e/`.

**Test cycle:**

- [ ] Add RED unit cases proving row=moved plate and column=affected plate; immutable self diagonal; off-diagonal none/sync/reverse; zero default; asymmetric edit with no inferred reverse; and exact request matrix serialization.
- [ ] Add RED keyboard, pointer and touch interaction cases plus non-color labels/symbols, focus order and announced row/column context.
- [ ] Add RED responsive cases for sticky mobile headers and understandable horizontal navigation and/or fullscreen matrix editing without losing the active pair.
- [ ] Add RED unit cases for first warning, checkbox persistence in `localStorage`, repeat suppression, focus containment/restoration and no cookies.
- [ ] Add controlled-response unit cases for pending/solved/unsolvable/already-solved/error rendering.
- [ ] Add Task 4 Storybook interaction stories for 2×2 and 7×7 matrices; none/sync/reverse changes in both asymmetric directions; immutable diagonal; mouse/keyboard/touch paths; sticky-header mobile navigation and fullscreen alternative if implemented; matrix confirmation/cancel; warning dialog/focus; and each pending/solved/unsolvable/already-solved/error view. Do not repeat Task 3 entry frames.
- [ ] Add real-core integration cases for exact submitted matrix, safe validation error and all serialized terminal states.
- [ ] Add Playwright flows for keyboard-only and touch matrix editing plus Server Function paths for solved, unsolvable, already-solved and product-visible error.
- [ ] Implement workflow without solver logic outside core.
- [ ] Run Storybook; agent/browser executes each Task 4 sequence at mobile and wide viewports, checks row/column orientation, asymmetric states, sticky context, overflow/fullscreen behavior, non-color cues, dialog/status readability, touch/focus/contrast and saves inspectable evidence plus repairs.

**Verification:** `npm run test:core && npm run test:unit && npm run test:integration && npm run test:storybook && npm run build:storybook && npm run build && npm run test:e2e`.

**Acceptance evidence:** Confirmed matrix equals adapter request; diagonal cannot change; reverse cells remain independent; all three states are visually distinct and announced; mobile context survives navigation; Storybook evidence covers matrix/dialog/result frames without clipping or inaccessible focus; raw exceptions never render.

**Commit boundary:** `feat: add directed dependency solving flow`

---

### Task 5: Implement Arbitrary-Length Full Result and Mobile Fullscreen

**Goal / result:** Every returned command remains accessible for any solver-result length; mobile fullscreen scrolls the actual full array and returns without losing result or reading position.

**Files:** `examples/lock.long.json`, `src/features/lock-resolver/`, stories, `tests/core/`, `tests/unit/`, `tests/integration/`, `tests/e2e/`.

**Verified comparison fixture:** `state = [6,4,1,6,7]`; `links = [[0,-1,0,0,0],[0,0,0,0,-1],[1,1,0,-1,0],[-1,0,1,0,0],[-1,1,0,-1,0]]`. Unchanged current core returns `solved`, 26 macro commands, `divisions = 92` and final `[4,4,4,4,4]`. The external site reports 92 single shifts for the same input. This is unit-semantics and regression evidence only: do not infer identical sequences, do not fit the algorithm, do not store a hand-written solution list and do not treat either number as a UI constant or limit.

**Test cycle:**

- [ ] Add real-core integration regression through the web adapter showing the verified fixture still returns 26 commands, 92 divisions, the complete serialized array and final state; assertion documents current core units and behavior, not external equivalence or product length.
- [ ] Add parameterized unit cases using short, observed 26-command and generated 41-command controlled results. Assert every item is present, numbering reaches actual array length and no truncation/collapse/pagination contract appears; 41 is sample data, not a maximum.
- [ ] Add Task 5 Storybook interactions for the same parameterized lengths: full numbering, mobile fullscreen open/scroll-to-last/exit, preserved reading position/focus and full-list access beside playback entry.
- [ ] Add mobile E2E that enters the known real fixture, solves through Server Function, opens fullscreen, scrolls through all returned commands, exits and verifies preserved result/position.
- [ ] Implement full-list/fullscreen state from actual command-array length, separate from playback, with no `26` branch or display cap.
- [ ] Run Storybook; inspect Task 5 key frames at mobile and wide viewports, including first/middle/last list regions, overflow, readable numbering, touch targets, focus containment/restoration and reduced motion; save screenshots and repair evidence.

**Verification:** `npm run test:core && npm run test:unit && npm run test:integration && npm run test:storybook && npm run build:storybook && npm run build && npm run test:e2e`.

**Acceptance evidence:** For observed 26 and generated 41 controlled commands, all elements remain accessible, numbering reaches actual last index, fullscreen scroll/exit/restore works and playback entry retains the same complete result. Inspectable Storybook evidence proves first/middle/last readability on both viewports; no hidden cap, truncation or duplicate result store.

**Commit boundary:** `feat: add long solution list experience`

---

### Task 6: Implement Server-Derived Playback and Recalculation Flow

**Goal / result:** Player advances through real returned commands on the live lock while the full list remains intact, and can edit count, positions or dependencies after solving or during playback with explicit invalidation and no full reset.

**Files:** `src/server/solver-web-adapter.ts`, `src/features/lock-resolver/`, stories, `tests/integration/`, `tests/unit/`, `tests/e2e/`.

**Test cycle:**

- [ ] Add real-core integration cases proving every serialized frame equals sequential internal `applyCommand`, including sync/reverse links and blocked-frame failure handling.
- [ ] Add RED state cases for count, position and dependency edits from both result and mid-playback: old result and cursor are discarded, recalculation notice appears, the relevant editor opens, unchanged facts survive and no automatic full reset occurs.
- [ ] Reuse Task 3 shrink-impact behavior during playback and prove cancel preserves the current result/cursor because the model was not changed; confirm invalidates them exactly once.
- [ ] Add Task 6 controlled-response Storybook interactions for playback start, selected plate, command, before-to-after movement, middle/end boundaries, return to full list, safe blocked-frame error, reduced-motion mode, each edit entry, recalculation notice, shrink cancel and shrink confirm. Long controlled data must reach its actual final frame beyond the sample length.
- [ ] Add E2E completing playback through real Server Function and comparing rendered final positions with returned final state; add result-stage and mid-playback edits for count, positions and dependencies followed by successful recalculation.
- [ ] Implement client playback over returned frames only and route confirmed edits through the shared model transformations from Tasks 3–4.
- [ ] Run Storybook; agent/browser walks every Task 6 frame at mobile and wide viewports, verifies one marker throughout animation, before/after clarity, edit/invalidation/recalculation messaging, preserved facts, focus/keyboard/contrast and reduced-motion fallback; save key screenshots and repairs.

**Verification:** `npm run test:core && npm run test:unit && npm run test:integration && npm run test:storybook && npm run build:storybook && npm run build && npm run test:e2e`.

**Acceptance evidence:** No transition arithmetic in client; Storybook evidence proves one-marker, before/after, focus, reduced-motion and every edit/invalidation/recalculation path; cancelled shrink preserves result/cursor, confirmed edits remove them and retain unrelated facts; E2E reaches real final state before and after recalculation; playback never hides, truncates or mutates full list.

**Commit boundary:** `feat: add editable solution playback`

---

### Task 7: Finish Visual System, Accessibility and Installable PWA

**Goal / result:** All stages match approved visual package, work on phone/tablet/desktop and install as explicit online-required PWA.

**Files:** `src/app/`, `src/features/lock-resolver/`, stories, `.storybook/`, `public/`, `tests/unit/`, `tests/e2e/`.

**Test cycle:**

- [ ] Add manifest/service-worker tests: required fields/icons resolve; no route, Server Function or result caching.
- [ ] Add only Task 7-specific Storybook states for install/network-required and offline/reconnect UI. Update styles in existing Task 2–6 stories instead of duplicating their scenarios.
- [ ] Add unit/Storybook accessibility checks for roles, names, values, heading order, focus visibility/containment, status announcements, non-color cues, matrix row/column context and compact position-table selection.
- [ ] Add Playwright phone/tablet/desktop paths covering count, positions, matrix, result, playback and edit/recalculate, plus manifest/icons, offline solve error and reconnect success.
- [ ] Implement original styling/assets and network-only PWA shell.
- [ ] Run Storybook and re-open the complete affected Task 2–7 story inventory at mobile and wide viewports. Compare all canonical frames with approved PNGs; check central-lock primacy, compact `N×7` input, matrix orientation/sticky context/fullscreen alternative, geometry, one marker, materials, colors, typography, controls, composition, adaptation, clipping, text, touch, keyboard, contrast and reduced motion.
- [ ] Save final cross-story inventory, key screenshots, a11y addon report, every deviation and repaired comparison. Do not accept a prose-only visual verdict.

**Verification:** `npm run test:storybook && npm run build:storybook && npm run verify` plus build-output scan proving approved PNG paths are absent from runtime assets.

**Acceptance evidence:** Written invariant wins over raster defect; final Storybook evidence contains rendered mobile/wide comparisons for every affected scenario with zero unresolved a11y/reference deviation; no game/reference asset ships; install succeeds; offline solve fails clearly and reconnect recovers.

**Commit boundary:** `feat: finalize responsive installable experience`

---

### Task 8: Pass Local Release Gate, Deploy Exact Commit, and Smoke Vercel Preview

**Goal / result:** Exact locally proven commit deploys to immutable Vercel Preview, short remote smoke proves critical deployed wiring, then logs/Speed Insights and operator docs record delivery evidence.

**Files:** root verification config, `src/app/` Speed Insights integration, `tests/e2e/`, README/AGENTS and delivery evidence.

**Dependencies:** Tasks 1–7 and both review stages are complete. Their commits, Storybook visual evidence and all local suites are available; Task 8 cannot deploy around an earlier incomplete gate.

**Test cycle:**

- [ ] Add integration guard proving Speed Insights stays in web layout and never enters core.
- [ ] Add isolated remote smoke project under `tests/e2e/`: deployed page/static assets/manifest load; hydration and explicit count/position/matrix controls work; one small valid lock travels through real Server Function/core and renders result; first-to-next playback transition works; console/network has no fatal error.
- [ ] Run cheaper local gates in order: lint, typecheck, core, unit/component, integration, Storybook interaction/build, inspectable visual evidence, production build.
- [ ] Run complete local production-like Playwright suite for every mapped browser scenario, browser and viewport; dev server is forbidden.
- [ ] Save pre-deploy evidence: exact candidate SHA, production build result, complete local E2E report/artifacts, browsers/viewports and clean pass status.
- [ ] If any local evidence is failed/flaky/unproven, stop before deployment; repair, rerun narrow failure, then rerun full `npm run verify` on new candidate SHA.
- [ ] Confirm clean working tree, deploy only locally proven SHA as immutable Vercel Preview and record URL-to-SHA association. No different working-tree state or later commit may use that evidence.
- [ ] Run short `test:smoke` against immutable deployed URL; save smoke report, deployed URL/SHA, console/network summary and relevant logs under `docs/superpowers/reviews/gothic-lock-resolver/task-8-release/remote/`. If Deployment Protection is enabled, use automation bypass secret without logging it; inaccessible deployment is blocked.
- [ ] If smoke fails, capture first broken boundary and logs, mark version not ready, repair on new commit, repeat full local gate, redeploy and rerun smoke. Do not expand smoke into remote full regression.
- [ ] After smoke passes, inspect Vercel logs and record real Speed Insights LCP/INP/CLS baseline when data appears; do not invent thresholds or use metrics as smoke substitute.
- [ ] Update operator docs only after commands and deployed paths are proven.

**Verification order:** `npm run verify` on exact SHA; deploy same SHA; `BASE_URL=<immutable-preview-url> npm run test:smoke`; deployment log check; Speed Insights observation. Order is mandatory and evidence must make SHA transitions mechanically visible.

**Acceptance evidence:** Full local production-like E2E report is green for entire mapped scope; deployed URL maps to same SHA; short remote smoke passes critical page/hydration/Server Function/core/result/playback wiring with no fatal console/network error; Vercel logs show no Server Function error; Speed Insights receives real data. No full remote regression duplication is required by default.

**Commit boundary:** `chore: verify Vercel resolver delivery`

---

## Test Case to User Story to Owner Level Matrix

Each row names concrete proof. Multiple levels have different oracles; none repeats BFS truth outside `node:test` core. Unless a cell explicitly says remote smoke, every Playwright case belongs to full local production-like E2E. Preview runs only critical wiring smoke defined in Task 8.

| Story | Concrete test cases | Owner level and oracle | Why this level |
|---|---|---|---|
| SITE-01 | `TC-SITE-01A` complete path at phone/tablet/desktop; `01B` same stages and controls at each size | Storybook: rendered mobile/wide frames. Local Playwright: real journey on three viewports. Remote smoke: deployed page loads and hydrates. | Storybook owns composition; local E2E proves one responsive product; smoke proves deployed shell wiring. |
| SITE-02 | `TC-SITE-02A` manifest/icons valid; `02B` offline solve explains network need; `02C` reconnect solves | Unit: manifest/service-worker policy. Storybook: install/offline/reconnect states. Local Playwright: resources and networking. Remote smoke: HTTPS manifest. | Static policy, visible messaging and real networking have different oracles; smoke remains short. |
| SITE-03 | `TC-SITE-03A` count→positions→matrix→solve→list→playback order; `03B` each required confirmation gates the next step | Unit: state transitions. Storybook: every transition frame and focus. Local Playwright: complete production journey through real Server Function. | State, rendered transitions and full wiring are distinct responsibilities. |
| SITE-04 | `TC-SITE-04A` pending; `04B` solved; `04C` unsolvable; `04D` already-solved; `04E` safe error | Unit: render/announce controlled states. Storybook: mobile/wide states. Integration: real adapter serialization. Local Playwright: terminal paths and deterministic pending evidence. | Each level owns rendering, visual acceptance, contract or full journey. |
| SITE-05 | `TC-SITE-05A` every command visible for parameterized lengths; `05B` numbering and playback reach actual last element; `05C` returning preserves the complete list | Unit: controlled arrays without a cap. Storybook: list/playback frames to actual last item. Integration: real frames. Local Playwright: verified real-fixture solve/playback. | Controlled data proves length independence; real fixture proves boundary wiring without turning its size into a limit. |
| SITE-06 | `TC-SITE-06A` approved Gothic states; `06B` central lock remains primary; `06C` no reference/game runtime assets | Storybook: mobile/wide reference comparison and a11y evidence. Unit/build: asset and layout guards. Remote smoke: original static assets load. | Inspectable local review owns visual fidelity; smoke checks only delivery. |
| SITE-07 | `TC-SITE-07A` stable numbering for varied long arrays; `07B` mobile fullscreen reaches actual last item; `07C` exit restores position and result | Unit: parameterized fullscreen state. Storybook: open/scroll/exit at mobile/wide. Local Playwright: long real-result mobile path. | Parameterized evidence rejects hidden `26`/`92` caps; local E2E proves scrolling and restoration. |
| SITE-08 | `TC-SITE-08A` edit count/position/dependency from result; `08B` same edits mid-playback; `08C` old result/cursor invalidated with notice; `08D` relevant editor opens and unchanged facts survive | Unit: shared state transformations. Storybook: each edit/notice/editor frame. Local Playwright: edit then successful recalculation through real core. | Unit proves exact preservation; Storybook proves understandable recovery; E2E proves the second solve. |
| LOCK-01 | `TC-LOCK-01A` step 0 accepts 2 and 7; `01B` rejects outside bounds; `01C` chosen count sizes lock/table/matrix | Unit: count state and derived dimensions. Storybook: step 0 and resulting 2/7 layouts. Local Playwright: cannot bypass count. | Derived UI state and visible/browsable enforcement require separate proofs. |
| LOCK-02 | `TC-LOCK-02A` grow preserves existing facts; `02B` each new plate starts at 4; `02C` self is fixed and off-diagonal relations are absent | Unit: exact model transformation. Storybook: before/after grow frames. Local Playwright: populated model grows without loss. | Exact preservation is a state oracle; rendered/browser checks prove usable behavior. |
| LOCK-03 | `TC-LOCK-03A` shrink lists removed higher plates; `03B` lists every incoming/outgoing relation; `03C` cancel is no-op; `03D` confirm preserves survivors | Unit: impact-set equality and transformations. Storybook: warning/cancel/confirm/focus. Local Playwright: shrink paths with populated asymmetric links. | Data-loss precision belongs to unit tests; dialog clarity and integrated behavior need visual/E2E proof. |
| LOCK-04 | `TC-LOCK-04A` `N×7` has one choice per row; `04B` table drives lock; `04C` lock drives table; `04D` boundaries and inactive dependencies | Core: position bounds. Unit: synchronization and invariant. Storybook: compact table/lock frames. Local Playwright: mouse, keyboard and touch position entry. | Core owns bounds; UI levels own synchronized input and real interaction. |
| LOCK-05 | `TC-LOCK-05A` approved lock geometry for 2/7 plates; `05B` one marker/active position through rerender/playback; `05C` tables remain secondary | Unit: DOM invariant and layout landmarks. Storybook: rendered reference comparison. Local Playwright: invariant during full journey. | DOM truth, visual primacy and cross-stage behavior have different oracles. |
| LOCK-06 | `TC-LOCK-06A` row=moved/column=affected; `06B` diagonal immutable; `06C` none/sync/reverse; `06D` asymmetric reverse cell unchanged; `06E` exact matrix reaches adapter | Core: coefficient semantics. Unit: matrix state and labels. Storybook: direction/state frames. Integration: serialized matrix equality. | Core movement, editor meaning, visible cues and transport must not share an oracle. |
| LOCK-07 | `TC-LOCK-07A` mouse/keyboard/touch editing; `07B` meaning not color-only; `07C` sticky row/column context; `07D` understandable horizontal and/or fullscreen mobile editing | Unit: roles, names, key/touch transitions. Storybook: focus/non-color/mobile overflow frames. Local Playwright: keyboard-only and touch paths. | Accessibility semantics, visual context and actual device interactions each need direct proof. |
| LOCK-08 | `TC-LOCK-08A` positions gate matrix; `08B` matrix gates solve; `08C` Escape/Cancel/Back preserve confirmed facts; `08D` focus restores | Unit: stage and focus state. Storybook: confirmation/cancel/back frames. Local Playwright: early actions blocked and keyboard return path. | Reducer, visible focus and browser enforcement are distinct. |
| LOCK-09 | `TC-LOCK-09A` first warning; `09B` checkbox persists; `09C` repeat suppressed; `09D` no cookies; `09E` focus contained/restored | Unit with storage mock. Storybook: warning/focus frames. Local Playwright: first and second real solve attempts. | Client persistence, visual dialog acceptance and cross-attempt behavior are separate. |
| LOCK-10 | `TC-LOCK-10A` frames equal sequential `applyCommand`; `10B` selected/before/after visible; `10C` final DOM equals core final; `10D` blocked frame safe; `10E` confirmed model edit invalidates playback | Core: command semantics. Integration: frames and guards. Unit: rendering/invalidation. Storybook: transition/reduced-motion/edit frames. Local Playwright: complete playback and recalculation. | Algorithm, adapter, component, visual transition and full user path each have one owner. |

## Coverage and Self-Review

- All 18 approved stories appear exactly once in matrix; each has concrete case IDs, owner level, oracle and level rationale.
- `node:test` proves solver semantics/migration parity only. Vitest unit proves UI state/rendering. Integration distinguishes real adapter/core from controlled UI responses. Storybook proves visual states. Full local Playwright proves every browser/Server Function/core path. Remote Preview smoke proves only deployed wiring; Speed Insights adds deployment metrics.
- Tasks 2–7 each list a non-overlapping Storybook scenario set, require actual running Storybook browser inspection at mobile and wide viewports, and save inspectable review evidence with deviations and repairs.
- Every visual Task 2–7 verification includes `test:storybook` and `build:storybook`; no visual task may commit on unit/integration/E2E alone or on prose-only “looks good”.
- Visual evidence checklist covers approved-reference geometry/materials/type/buttons/composition, central-lock primacy, compact `N×7` positions, directed-matrix orientation and mobile sticky context, one marker, clipping/overflow/text, touch targets, focus/keyboard, contrast/a11y addon and reduced motion where animation exists.
- Storybook visual/reference/a11y failures consume the same maximum three review-repair iterations; unresolved third-cycle failure blocks the task and all dependent tasks.
- Search Task 5, matrix and Preview steps for any product maximum, `26`/`92`-specific UI branch, truncation, silent collapse or required pagination. Every remaining `26` or `92` mention must label verified fixture units rather than an algorithm equivalence or display boundary; parameterized UI/Storybook evidence must include at least one longer sample.
- Full-list, fullscreen, return-position and playback acceptance must use actual command-array length and reach its last element for both observed fixture and longer controlled data.
- Count/position/dependency edits must be covered from both result and mid-playback. Search for any full-reset path, silent solution reuse, destructive shrink without complete impact listing, cancel that mutates state, inferred reverse matrix edge, editable diagonal or color-only relation state; none may remain.
- Release order is mechanically fixed: all cheaper local gates and visual evidence, production build, full local production-like E2E, deploy exact passing SHA, short remote smoke, then logs/Speed Insights. Unit/integration-only evidence never permits deployment.
- Search Task 8 and matrix for any full remote-suite default or deploy-before-local-E2E path. Neither may remain; remote smoke must stay limited to page/hydration, one small real solve, first/next playback, static assets/manifest and fatal console/network checks.
- Failed/flaky/unproven local gate blocks deploy. Failed/protected remote smoke blocks completion and requires a new commit to pass the full local gate before redeploy.
- Exact final core target: `src/server/solver-core/`. Exact tests hierarchy: `tests/core`, `tests/unit`, `tests/integration`, `tests/e2e`.
- No ad-hoc top-level application folder, parallel application, Git submodule, second package or permanent CLI surface remains.
- No task changes solver rules or duplicates solver logic.
- No unresolved product or architecture choice remains. Breakpoints and internal component names stay implementation-private.
- Placeholder scan must return no planning gaps or generic unscoped error/test instructions.
- Before Task 1 begins, untouched repository must still report 37/37 tests PASS.
