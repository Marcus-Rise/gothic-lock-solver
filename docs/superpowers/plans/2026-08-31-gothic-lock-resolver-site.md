# Gothic Lock Resolver Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Создать production-quality mobile-first PWA, которая проводит пользователя от ввода замка до полного списка решения и интерактивного пошагового вскрытия, не меняя существующее вычислительное ядро.

**Architecture:** Next.js App Router размещается в корне репозитория рядом с неизменяемым ESM-ядром. Browser/UI владеет только состоянием взаимодействия; dedicated server-only boundary вызывает публичные `solveLock` и `applyCommand`, возвращая сериализованный результат и готовые кадры playback без копирования игровых правил. Web, core и integration имеют отдельные test stages; production acceptance завершается реальным Vercel Preview и Playwright E2E.

**Tech Stack:** Node.js 20.9+, Next.js App Router, React, TypeScript, Tailwind CSS, штатный Turbopack, Vercel Server Functions, native Web App Manifest + network-only service worker, Vitest + React Testing Library, Storybook `nextjs-vite` + Vitest addon, Playwright, Vercel Speed Insights.

**Spec:** `../specs/2026-08-31-gothic-lock-resolver-site-design.md`

## Global Constraints

- `docs/superpowers/specs/2026-08-31-gothic-lock-solver.md` остаётся источником игровых правил.
- Не изменять `src/*.mjs`, `solve-lock.mjs` и существующие `test/*.test.mjs`; проверять их неизменность относительно базы ветки.
- Browser code не импортирует ядро. Только server-only integration boundary импортирует `solveLock` и `applyCommand` из `src/index.mjs`.
- Одна пластина всегда имеет одно числовое состояние `1..7`, один DOM+SVG-маркер и одну активную позицию.
- Runtime assets создаются самостоятельно. Файлы `docs/superpowers/specs/assets/` служат reference input и не публикуются как игровые/runtime assets.
- Не заявлять, что лицензия репозитория распространяется на Gothic/game assets; такие assets в scope и поставку не входят.
- PWA устанавливается, но solver v1 остаётся online-only. Service worker не перехватывает и не кэширует расчёт, navigation или result payload.
- Next.js development и production build используют штатный Turbopack. Vite ограничен Vitest/Storybook.
- Не добавлять extracted game files, полное offline-решение, Canvas-state, first-run guide, отдельные продукты по типам устройств или новые продуктовые функции.
- Не вводить числовые performance budgets. Фиксировать фактический Vercel/Web Vitals baseline и видимые регрессии.
- Каждый task начинается с наблюдаемого RED, завершается независимым GREEN, core regression и атомарным commit.

## Locked Boundaries

### Repository areas

| Area | Responsibility |
|---|---|
| `src/`, `solve-lock.mjs`, existing `test/` | Неизменяемое solver core и его текущие 37 тестов. |
| `app/` | Next.js routes, root layout, Server Function entry, metadata и manifest. |
| `site/` | Browser state model, DOM+SVG lock UI, result UI и server-only adapter. Конкретное разбиение внутри area определяется cohesion, не создаёт новый public API. |
| `e2e/` | Production-like Playwright flows через настоящий browser/server boundary. |
| `.storybook/` и colocated stories | Изолированные component states и browser interaction checks. |
| `public/` | Только самостоятельно созданные runtime/PWA assets и network-only service worker. |

### Server/client contract

- Request — serializable `{ state, links }`, где `state` содержит 2–7 целых позиций `1..7`, а `links` — квадратную матрицу `-1 | 0 | 1` с нулевой диагональю.
- Success envelope содержит неизменённый semantic result `solveLock` и `playbackFrames`. Каждый frame содержит номер шага, command, `before` и `after`, вычисленные server-side через `applyCommand`.
- Failure envelope содержит safe Russian error message без stack, file paths и внутренних exception details.
- `pending` — client state. `already-solved` — UI projection успешного `solved` с пустым `commands`. `unsolvable` сохраняет core status.
- Client никогда не пересчитывает связи и не применяет команды самостоятельно.

### State ownership

- Один browser reducer/state machine владеет этапом `initial | links | solution`, draft positions, confirmed positions, directed links, modal state, solver state, result, fullscreen-list state и playback cursor.
- DOM/SVG полностью выводится из state; DOM, animation и raster references не являются источником данных.
- Для 7 пластин визуальная конструкция следует master reference. Для 2–6 активных пластин сохраняется тот же корпус/depth language без выдуманных inactive plate states.
- Cancel/back возвращает на один утверждённый уровень и не мутирует ранее подтверждённые данные.

### Verification commands contract

Implementation вводит и поддерживает scripts:

- `npm run test:core` — существующий `node --test`;
- `npm run test:web` — Vitest + React Testing Library;
- `npm run test:storybook` — Storybook Vitest browser project;
- `npm run test:e2e` — Playwright против production build;
- `npm run lint`, `npm run typecheck`, `npm run build`, `npm run build:storybook`;
- `npm run verify` — lint, typecheck, core, web, Storybook, build и local production E2E в указанном порядке.

## Framework Facts Verified Before Planning

- Next.js App Router uses Server Functions through a dedicated `use server` boundary; Client Components may call them, while security and validation remain server-side: [Next.js `use server`](https://nextjs.org/docs/app/api-reference/directives/use-server).
- Current Next.js recommends E2E rather than unit tests for async Server Components: [Next.js testing guide](https://nextjs.org/docs/app/guides/testing).
- Turbopack is default for both `next dev` and `next build`: [Next.js installation](https://nextjs.org/docs/app/getting-started/installation).
- Native App Router manifest support is sufficient for the install contract; offline solver behavior remains explicitly excluded: [Next.js PWA guide](https://nextjs.org/docs/app/guides/progressive-web-apps).
- Storybook for Next.js with Vite and its Vitest addon provide isolated real-browser component checks: [Storybook Next.js with Vite](https://storybook.js.org/docs/get-started/frameworks/nextjs-vite/), [Storybook Vitest addon](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon/index).
- Playwright `webServer` can exercise `next start` after production build: [Playwright web server](https://playwright.dev/docs/test-webserver).
- Vercel Preview URLs and Speed Insights provide actual deployment and Web Vitals evidence: [Vercel deployments](https://vercel.com/docs/deployments/overview), [Speed Insights](https://vercel.com/docs/speed-insights).

---

### Task 1: Production Walking Skeleton — UI to Server Function to `solveLock`

**Goal / result:** Реальный non-throwaway путь `/` принимает минимальный валидный замок, проходит Client Component — Server Function — existing `solveLock` и показывает visual result. Core, web и integration уже запускаются раздельно.

**Areas:**

- Modify: `package.json`, `.gitignore`, `README.md`, `AGENTS.md`
- Create framework contracts: `app/`, `site/`, `e2e/`, `next.config.ts`, `tsconfig.json`, `postcss.config.mjs`, `vitest.config.ts`, `playwright.config.ts`, ESLint config, `package-lock.json`
- Read-only boundary: `src/index.mjs`, `src/result.mjs`, existing `test/`

**Dependencies and public boundaries:**

- Root package becomes the Vercel/Next.js project; CLI commands remain available.
- Server-only adapter imports `solveLock`/`applyCommand`; browser imports only serializable types.
- Initial minimal UI uses the same reducer and contract that later tasks extend; no temporary route or mock runtime path.

**Test cycle:**

- [ ] Add a failing server-adapter integration test: valid no-link definition returns success envelope, core result and replay frames; invalid definition returns safe failure envelope.
- [ ] Add a failing Playwright walking-skeleton test that enters two plate positions, explicitly confirms initial state and empty links, then receives a visual solved result from the real Server Function.
- [ ] Run `npm run test:core`; record the 37-test baseline before adding web dependencies.
- [ ] Scaffold root App Router, TypeScript, Tailwind/PostCSS, scripts and test runners without touching core files.
- [ ] Implement server-only adapter, dedicated Server Function and minimal reducer-backed route until both RED tests pass.
- [ ] Update README/AGENTS with root web commands and the immutable core/browser/server boundary.

**Verification commands:**

- `npm run lint`
- `npm run typecheck`
- `npm run test:core`
- `npm run test:web`
- `npm run build`
- `npm run test:e2e`
- `git diff --exit-code origin/main -- src solve-lock.mjs test`

**Acceptance evidence:**

- Production build serves `/`; browser action issues a real Server Function request and renders result.
- No browser bundle imports solver modules; build inspection and dependency graph show core only in server output.
- CLI example and all 37 core tests remain byte/behavior compatible.

**Commit boundary:** `feat: add solver web walking skeleton`

---

### Task 2: Live DOM+SVG Lock and Visual Contract

**Goal / result:** Живой lock module renders 2–7 active plates from state, matches approved depth/three-quarter language, and enforces one plate = one marker = one position in data and DOM.

**Areas:**

- Create/modify: `site/` lock state/rendering area, colocated tests and stories
- Create: `.storybook/` config using `@storybook/nextjs-vite`, Vitest browser project and accessibility addon
- Reference only: five PNG files under `docs/superpowers/specs/assets/`

**Dependencies and public boundaries:**

- SVG geometry, selected state and markers derive only from reducer state.
- Full seven-plate state follows master geometry; smaller valid counts preserve housing/depth language and do not create extra stateful plates.
- Reference PNGs never move into `public/` and are not imported by runtime code.

**Test cycle:**

- [ ] Add failing Vitest/RTL cases for 2 and 7 plates, exactly one marker/current position per active plate, and no duplicate active positions during rerender.
- [ ] Add failing Storybook interaction stories for default, selected, boundary position, maximum seven-plate and raster-defect guard states.
- [ ] Implement DOM+SVG structure, independent visual materials and responsive scale until tests/stories pass.
- [ ] Add accessibility assertions: semantic interactive controls, accessible SVG name/description, visible keyboard focus, state not communicated by color alone.

**Verification commands:**

- `npm run test:web`
- `npm run test:storybook`
- `npm run build:storybook`
- `npm run test:core`
- `git diff --exit-code origin/main -- src solve-lock.mjs test`

**Acceptance evidence:**

- Storybook shows 2-plate and 7-plate locks without parallel-row or hinged-lever geometry.
- DOM inspection proves exactly one marker and one active position per plate in every story.
- Runtime contains no copied/extracted/reference PNG asset.

**Commit boundary:** `feat: add live Gothic lock module`

---

### Task 3: Initial-State Stage and Safe Stage Navigation

**Goal / result:** Пользователь выбирает 2–7 plates, reproduces positions using left/right controls, confirms initial state, and navigates safely without links affecting this stage.

**Areas:**

- Modify: `site/` reducer and initial-stage UI, related stories/tests
- Extend: `e2e/` primary user journey

**Dependencies and public boundaries:**

- Initial movement changes exactly one selected plate by one division and stops at `1`/`7`.
- Directed links remain absent/inactive until confirmation; no solver call occurs.
- Confirmed positions are immutable across cancel/back until user deliberately re-enters initial editing.

**Test cycle:**

- [ ] Add failing reducer/component cases for plate count bounds, horizontal left/right movement, position boundaries, ignored links and explicit confirmation gate.
- [ ] Add failing keyboard/focus cases for stage controls and `Escape`/«Отмена»/«Назад» without data loss.
- [ ] Extend production-like E2E from initial entry through the links-stage boundary.
- [ ] Implement the stage using the Task 2 DOM+SVG module and shared reducer.

**Verification commands:**

- `npm run test:web`
- `npm run test:storybook`
- `npm run build && npm run test:e2e`
- `npm run test:core`

**Acceptance evidence:**

- Positions never leave `1..7`; links cannot move plates during reproduction.
- The links stage is unreachable before explicit confirmation.
- Keyboard-only journey reaches and leaves each control with predictable focus.

**Commit boundary:** `feat: add initial lock setup flow`

---

### Task 4: Directed Links, Warning Gate, and Complete Solver States

**Goal / result:** Пользователь defines, reviews, edits and deletes directed sync/reverse links, confirms them, passes the first-run warning, and receives `pending`, `solved`, `unsolvable`, `already-solved` or `error` through the real core boundary.

**Areas:**

- Modify: `site/` reducer, links UI, warning dialog, result-state projection and server boundary tests
- Extend: stories and `e2e/`

**Dependencies and public boundaries:**

- Link default is zero; source confirmation precedes target/type selection; reverse link is never inferred.
- Cancel from type returns to target; earlier cancel returns to source; confirmed state remains unchanged.
- Warning suppression is one boolean in browser `localStorage`; no cookies, analytics, key exposure or solver-input persistence.
- Server validation remains authoritative even after client validation.

**Test cycle:**

- [ ] Add failing reducer/UI cases for source/target/type ordering, sync/reverse direction, edit/delete, zero default and cancel hierarchy.
- [ ] Add failing dialog cases for first display, position+link warning content, checkbox persistence, repeat suppression, focus containment and focus restoration.
- [ ] Add failing state cases for delayed `pending`, valid `solved`, existing unsolvable fixture, `[4,4]` already-solved projection and invalid-input `error`.
- [ ] Extend Playwright through actual link entry and Server Function for solved, unsolvable, already-solved and error paths; keep `pending` deterministic at component/integration level.
- [ ] Implement links workflow, modal gate and UI projections without changing core statuses.

**Verification commands:**

- `npm run test:web`
- `npm run test:storybook`
- `npm run build && npm run test:e2e`
- `npm run test:core`

**Acceptance evidence:**

- UI matrix submitted to `solveLock` matches visible confirmed directed links exactly.
- Screen-reader and keyboard flow announce dialog, pending and terminal result states.
- Raw exceptions/stacks never reach rendered output.

**Commit boundary:** `feat: add directed link solving flow`

---

### Task 5: Full Solution List and 26-Step Mobile Fullscreen

**Goal / result:** Full numbered combination is always visible from result; small screens can open an optional vertically scrollable fullscreen list and return without losing result or reading position.

**Areas:**

- Create: `examples/lock.long.json` with the verified 26-command definition below
- Modify: `site/` result/list state, stories/tests, `e2e/`

**Dependencies and public boundaries:**

- Verified fixture input: `state = [4,7,3,6,5,6]`; `links = [[0,0,-1,0,1,-1],[1,0,0,0,0,-1],[-1,0,0,0,0,-1],[1,1,0,0,0,0],[0,-1,0,1,0,1],[1,0,0,-1,0,0]]`.
- Current `solveLock` must return `solved`, 26 commands and final `[4,4,4,4,4,4]`; do not store a hand-written command list.
- Fullscreen list is a view of existing result state, not a second result store.

**Test cycle:**

- [ ] Add a failing deterministic fixture assertion for exactly 26 solver commands without modifying core tests.
- [ ] Add failing Vitest/RTL and Storybook cases for full 26-item numbering, vertical overflow, optional fullscreen action, simple exit and playback remaining separate.
- [ ] Add failing mobile Playwright flow that enters the real fixture through UI, opens fullscreen, scrolls, exits and confirms preserved result and reading position.
- [ ] Implement result list/fullscreen state and focus restoration.

**Verification commands:**

- `node --input-type=module -e "import { readFile } from 'node:fs/promises'; import { solveLock } from './src/index.mjs'; const definition=JSON.parse(await readFile('./examples/lock.long.json','utf8')); const result=solveLock(definition); if(result.status!=='solved'||result.commands.length!==26) process.exit(1)"`
- `npm run test:web`
- `npm run test:storybook`
- `npm run build && npm run test:e2e`
- `npm run test:core`

**Acceptance evidence:**

- Every number `1..26` is stable before, during and after fullscreen viewing.
- Exit returns focus to the opener and restores the same reading position.
- Full list remains reachable even when playback exists.

**Commit boundary:** `feat: add long solution list experience`

---

### Task 6: Interactive Step-by-Step Playback

**Goal / result:** «Вести по шагам» presents each command on the live lock with selected plate, before/after state and real sequential DOM+SVG movement while the full list remains available.

**Areas:**

- Modify: server success envelope/playback frames, `site/` playback state/rendering, stories/tests, `e2e/`

**Dependencies and public boundaries:**

- Server-only adapter derives every frame using public `applyCommand` from the confirmed initial state and returned commands.
- Client advances only through returned frames; no link arithmetic exists in browser code.
- Every frame preserves one marker/one active position and stable step numbering.

**Test cycle:**

- [ ] Add failing server integration cases comparing each frame with direct `applyCommand`, including sync, reverse and blocked-command guard behavior.
- [ ] Add failing component/Storybook cases for current command, selected plate, before/after values, start/end boundaries and return to full list.
- [ ] Add failing accessibility cases for current-step announcement, non-color selection cues, focus order and no duplicate markers during transition.
- [ ] Extend production-like Playwright through a complete playback and compare final visual state with `solveLock.finalState`.
- [ ] Implement playback over serialized frames only.

**Verification commands:**

- `npm run test:web`
- `npm run test:storybook`
- `npm run build && npm run test:e2e`
- `npm run test:core`
- `git diff --exit-code origin/main -- src solve-lock.mjs test`

**Acceptance evidence:**

- DOM states before/after every command match server frames and final core state.
- Playback never hides or mutates the full numbered combination.
- No raster frame or animation artifact can create a second marker/position.

**Commit boundary:** `feat: add interactive solution playback`

---

### Task 7: Approved Visual Convergence, Responsive Accessibility, and Installable PWA

**Goal / result:** All stages converge on the approved five-frame package, work as one responsive product, and install as a network-required PWA without shipping reference/game assets.

**Areas:**

- Modify: `app/` layout/metadata/manifest, `site/` visual styles and responsive behavior, Storybook stories
- Create: `public/` independently made PWA icons and network-only service worker/registration
- Reference only: approved PNG package under docs

**Dependencies and public boundaries:**

- Native manifest declares standalone installability and original icons.
- Service worker registration provides install support but no fetch cache for routes, Server Functions or results.
- Responsive acceptance uses phone, tablet and approved wide-layout view; exact CSS breakpoint values remain implementation-private and are not product contracts.
- Theme uses approved dark carved wood, aged metal, warm brass/ivory accents, Russian Gothic serif hierarchy, recessed panels and beveled controls without copying extracted assets.

**Test cycle:**

- [ ] Add failing manifest/service-worker tests: manifest fields/icons resolve; service worker contains no solver/navigation/result cache path.
- [ ] Add failing Storybook visual-state coverage for initial mobile, links mobile, solution mobile, responsive wide links, all terminal states and modal/fullscreen dialogs.
- [ ] Add failing accessibility checks for names/roles/values, heading order, focus visibility, modal/fullscreen focus containment, status announcements, keyboard-only completion and non-color cues.
- [ ] Add Playwright installability/network tests: manifest and icons load over production server; offline calculation reaches explicit error rather than false success; reconnect permits solve.
- [ ] Implement visual convergence, original runtime assets and PWA shell.

**Verification commands:**

- `npm run lint`
- `npm run typecheck`
- `npm run test:web`
- `npm run test:storybook`
- `npm run build:storybook`
- `npm run build && npm run test:e2e`
- `npm run test:core`
- `! git grep -n "docs/superpowers/specs/assets" -- app site public`

**Acceptance evidence:**

- Storybook comparison covers each approved frame role and written invariants; raster artifacts never override contract.
- PWA installs from production build; offline solve is impossible and explained, not silently cached.
- No docs reference, screenshot or extracted asset is served from `public/`.

**Commit boundary:** `feat: finalize responsive installable experience`

---

### Task 8: Vercel Preview, Actual E2E, Web Vitals, and Delivery Evidence

**Goal / result:** Branch deploys to an actual Vercel Preview, full Playwright suite passes against that URL, Speed Insights records a real baseline, and operator docs match shipped commands and boundaries.

**Areas:**

- Modify: root layout for `@vercel/speed-insights/next`, remote Playwright configuration, README/AGENTS and delivery evidence
- External: Vercel project linked to repository root; Preview Deployment only

**Dependencies and public boundaries:**

- Speed Insights only records performance metrics; Web Analytics is not added.
- Preview E2E uses `BASE_URL`; if Deployment Protection is enabled, Playwright sends `x-vercel-protection-bypass` from `VERCEL_AUTOMATION_BYPASS_SECRET` without logging the value.
- No PR merge or production promotion occurs in this task.

**Test cycle:**

- [ ] Add a failing integration assertion that the Speed Insights client is present only in web layout and does not enter core/CLI paths.
- [ ] Add remote Playwright configuration that reuses the same scenarios without starting local `webServer` when `BASE_URL` is supplied.
- [ ] Run `npm run verify` locally and fix only failures attributable to site work.
- [ ] Deploy Preview with `vercel deploy --yes`, store its immutable URL in task-specific `GOTHIC_PREVIEW_URL`, and confirm `/` plus Speed Insights script route return success.
- [ ] Run the complete Playwright suite against the Preview URL, including actual Client Component — Server Function, 26-step mobile fullscreen, playback, offline error/reconnect and all result states.
- [ ] Visit the Preview with mobile and wide profiles; record the initial Vercel Speed Insights/Core Web Vitals baseline after data appears, without inventing pass thresholds.
- [ ] Update README/AGENTS with test matrix, PWA online requirement, Vercel verification and immutable-core rule.

**Verification commands:**

- `npm run verify`
- `vercel deploy --yes`
- `BASE_URL="$GOTHIC_PREVIEW_URL" npm run test:e2e`
- `vercel curl / --deployment "$GOTHIC_PREVIEW_URL"`
- `vercel logs --deployment "$GOTHIC_PREVIEW_URL" --level error`
- `git diff --exit-code origin/main -- src solve-lock.mjs test`
- `git status --short`

**Acceptance evidence:**

- Vercel Preview URL and deployment commit SHA are recorded.
- Remote Playwright reports all flows green; no Server Function errors appear in Vercel logs.
- Speed Insights request is present and dashboard receives a real preview data point; actual LCP/INP/CLS values are recorded as baseline, not gates.
- `npm run test:core` still reports the original 37 tests passing.

**Commit boundary:** `chore: verify Vercel resolver delivery`

---

## Requirement Coverage Self-Review

| Requirement / acceptance block | Plan tasks |
|---|---|
| SITE-01 adaptive single product | 2, 3, 7, 8 |
| SITE-02 installable online-required PWA | 7, 8 |
| SITE-03 initial — links — solution gates | 1, 3, 4 |
| SITE-04 pending/solved/unsolvable/already-solved/error | 4, 8 |
| SITE-05 full list plus separate playback | 5, 6 |
| SITE-06 independent Gothic visual language/no game assets | 2, 7 |
| SITE-07 26-step mobile fullscreen and preserved position | 5, 8 |
| LOCK-01 2–7 plates, `1..7`, one pin/position | 2, 3, 7 |
| LOCK-02 explicit initial confirmation | 3 |
| LOCK-03 source confirmation/directed context | 4 |
| LOCK-04 sync/reverse link, no inferred reverse | 4 |
| LOCK-05 inspect/edit/delete/confirm links | 4 |
| LOCK-06 Escape/Cancel/Back hierarchy | 3, 4, 7 |
| LOCK-07 warning + `localStorage`, no cookies | 4 |
| LOCK-08 live before/after playback via core behavior | 6 |
| Server/client boundary and actual Server Function | 1, 4, 8 |
| Core/web/integration separation | All tasks; explicit gates in 1 and 8 |
| Storybook/Vitest/RTL/Playwright/node:test | 1, 2, 4–8 |
| Accessibility across controls, dialogs, statuses and SVG | 2–7, remote proof in 8 |
| Approved visual references and written-contract priority | 2, 7 |
| Vercel Preview and Web Vitals | 8 |

Self-review result:

- Spec and all `SITE-*`/`LOCK-*` stories map to at least one independently verifiable task.
- Error, empty/already-solved, unsolvable and pending states are explicit in Task 4 and remote acceptance.
- Async Server Components and real Client Component — Server Function flow are covered only by production-like E2E.
- No implementation task changes solver core or duplicates link/transition logic.
- Plan contains no unresolved product decision; implementation-private layout and breakpoint values are constrained by approved reference checks.
