# Development

Use pnpm and maintained Node.js 24 or 26 for source development. Exact versions
and integrity hashes live in `package.json` and `pnpm-lock.yaml`. Generated
JavaScript supports Node.js 22/24/26 and ES2022-capable core consumers.

```sh
pnpm install --frozen-lockfile
pnpm exec playwright install --with-deps chromium firefox webkit
pnpm test
```

`pnpm test` runs lint, strict types, Node/coverage tests, Vite builds, distribution
checks, real browsers, static-file E2E and installed-package verification. Coverage
requires 80% each for statements, branches, functions and lines over all shipped
`src/` code, including unimported entries. Subprocess tests also exercise the CLI.

Narrower commands: `pnpm check`, `pnpm test:node`, `pnpm test:coverage`,
`pnpm test:distribution`, `pnpm test:browser`, `pnpm test:e2e`, `pnpm build`,
`pnpm verify:package` and `pnpm solve lock.json`. To check one archive across Node
versions: `pnpm verify:package --node /path/to/node22 --node /path/to/node26`.
Run [benchmarks](benchmarks.md) separately, after competing heavy tasks stop.

## Structure

`src/index.ts` and `src/cli.ts` are build entries for integrations and Node tooling.
CLI invokes the exported solver/factory. The model, matrix analysis, searches and
priority queue each own one responsibility. Config/default validation lives in
`config.ts`. Classes encapsulate useful state; arithmetic uses plain functions.

Use domain names, named mechanical bounds and explicit units for packed state or
byte arithmetic. Keep one operation per statement and short loop bodies. Matrix
iteration remains explicit; search and release orchestration should read as ordered
steps. Oxlint limits block nesting to three levels in source and delivery scripts.
Review these properties independently of test success.

Tests live in `tests/unit`, `tests/e2e` and `tests/benchmarks`. TS consumer fixtures
are compiled into ignored output when JavaScript is needed. Vite bundles the
production files; `.github/scripts` coordinates existing build/release tools.

The 45 inputs use independent replay and mathematical expected minima. A separate
exhaustive small-state oracle helps expose shared defects. Tests assert behavior,
not private structures. Add a failing test before a behavioral change, then the
smallest implementation preserving invariants. Apply DDD, BDD, TDD, SOLID, DRY,
KISS and YAGNI through these boundaries rather than extra frameworks or layers.

## Strictness and evidence

Strict flags include checked indexed access, exact optional properties and
library declaration checking. No `any`, non-null assertions or suppressed errors
are allowed; explained `ts-expect-error` proves negative type-consumer cases.
Vitest exports a plain configuration checked against public `TestUserConfig`;
dependencies remain unmodified, without coupling Vite's resolved config types.

Builds, archives, benchmark reports, coverage, traces and review
logs stay outside Git. Local output is ignored; CI uploads the same evidence and
releases retain distribution evidence. Maintained explanations live in Wiki.
Complete local gates before workflow edits, independently review the final diff,
and check hosted CI. Saved benchmark timing and memory ratios are historical
observations, not paired performance guarantees.

Official references: [TypeScript](https://www.typescriptlang.org/docs/handbook/intro.html),
[Vite configuration](https://vite.dev/config/), [Vitest configuration](https://vitest.dev/config/),
[coverage](https://vitest.dev/guide/coverage.html), [Playwright browsers](https://playwright.dev/docs/browsers).
