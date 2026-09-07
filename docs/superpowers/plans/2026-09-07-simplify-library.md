# Simple CI and canary releases

The owner replaced the previous delivery design with two simple workflows.
Keep the solver, public API, five runtime outputs and strict local checks.
This plan supersedes checkout-based benchmarks and the previous release flow.

## CI

- One job runs the existing checks, coverage, Vite builds, Node and browser consumers.
- Measure the current built solver on all 45 fixed inputs.
- For a PR, use its target SHA; for main pushes, use the previous main SHA.
- Look up a successful CI report artifact for exactly that commit.
- If no unexpired artifact exists, explicitly skip comparison. No source checkout,
  rebuild, npm lookup, previous-release fallback or synthetic baseline.
- Compare deterministic quality metrics; report historical timing/memory ratios
  with their cross-run limitations. Keep generated output out of Git.
- Save the benchmark report separately from the tested package artifact; name
  artifacts with commit SHA and run attempt to avoid overwriting earlier attempts.

## Release

- A separate workflow runs after successful main-push CI to publish a canary.
- CI leaves tracked files unchanged. Release preparation assigns the canary or
  stable version by changing package/build version metadata only.
- Manual stable dispatch takes a successful main CI run ID and stable SemVer.
- Download only that run's tested build artifact. No algorithm rebuild.
- Stable packaging changes only package/build version metadata; verify all other
  archive bytes remain identical before publishing the new npm version.
- Publish to npm through OIDC, check registry/CDN delivery, attach five runtime
  files, package archive and the benchmark report to the GitHub Release.
- Keep the two workflows readable, one job each, using official pinned Actions.
- Retain direct-publish setup and the readiness switch for first-package bootstrap.

## Execution

1. Replace module-vs-module benchmark machinery with current measurement and
   optional saved-report comparison; test valid/missing/wrong-SHA reports.
2. Replace release machinery with one release script; test canary identity,
   stable metadata-only repack and publication boundaries without publishing.
3. Test exact-SHA artifact selection and successful-main-only release selection.
4. Complete all local gates before changing workflow YAML.
5. Add the two workflows and update README, Wiki and agent instructions.
6. After CI simplification, fix secondary solution ordering: minimize unit shifts
   among paths already optimal in grouped actions. Verify lock-018 and all 45
   inputs with an independent lexicographic oracle; preserve the public contract.
7. Review independently, update draft PR #3 and verify CI on the exact new head.

No actual merge or package publication is authorized by this implementation task.
