# Flat CI and canary releases

The owner replaced the previous delivery design with two simple workflows.
Keep the solver, public API, five runtime outputs and strict local checks.
This plan supersedes checkout-based benchmarks and the previous release flow.
The September 8 refinement removes `.github/scripts` entirely: configuration
belongs in Vite, ordinary build commands in package.json, and CI/release
coordination directly in workflow YAML. Do not relocate wrappers or implement
a custom publication recovery engine.
The further simplification uses the runner's GitHub CLI directly, a single latest
successful-run lookup for the benchmark, and standard download/pack/publish
commands for releases. Do not repeat CI's file and benchmark validation in the
publication job or build a CDN verification subsystem.

## CI

- One Node 24 build job checks types/lint, builds, checks the distribution, measures
  benchmarks and uploads one package archive.
- A dependent test job uses six Ubuntu matrix rows: Node 22/24/26 and Chromium/
  Firefox/WebKit. Each row tests the same archive without rebuilding; browser rows
  use Node 24. The Node 24/node row collects coverage. Diagnostic names include
  Node version and environment. All rows must succeed for release.
- Measure the current built solver on all 45 fixed inputs.
- For a PR, use its target SHA; for main pushes, use the previous main SHA.
- Select the latest successful CI run for exactly that commit and its named report.
- If no unexpired artifact exists, explicitly skip comparison. No source checkout,
  rebuild, npm lookup, previous-release fallback or synthetic baseline.
- Compare deterministic quality metrics; report historical timing/memory ratios
  with their cross-run limitations. Keep generated output out of Git.
- Save the benchmark report separately from the tested package artifact, named
  by commit SHA within the selected CI run. Full reruns overwrite these artifacts;
  failed-test reruns reuse the successful build. Diagnostics retain attempt names.

## Release

- A separate workflow runs after successful main-push CI to publish a canary.
- CI leaves tracked files unchanged. Release preparation assigns the canary or
  stable version by changing package/build version metadata only.
- Manual stable dispatch takes a successful main CI run ID and stable SemVer.
- Download only that run's tested build artifact. No algorithm rebuild.
- Stable packaging changes only package/build version metadata. Locally verify
  that preparation preserves all other archive files; CI tests the built archive.
- Publish to npm through OIDC, include CDN links, attach five runtime
  files, package archive and the benchmark report to the GitHub Release.
- Keep the two workflows readable: CI build and matrix test jobs, and one
  publication job, using official pinned Actions.
- Retain direct-publish setup and the readiness switch for first-package bootstrap.

## Execution

1. Replace the programmatic build wrapper with direct Vite/tsc commands and a
   shared Vite configuration for readable, minified and CLI builds. Preserve
   global declarations and the source/checksum manifest; verify distribution tests.
2. Replace the artifact wrapper with official gh/jq commands in a candidate CI
   workflow. Exercise exact-SHA, missing/expired, foreign-source and API-error cases.
3. Replace the release wrapper with explicit commands in a candidate release
   workflow. Verify trusted main-run selection, metadata-only repack and file
   identity using the existing tested archive, without publishing.
4. Delete tests belonging only to removed wrappers; retain mathematical, consumer,
   configuration, benchmark-report and package checks. Run all local gates and
   all 45 locks before installing the candidate workflow YAML.
5. Update Wiki, agent instructions and lint/type configuration. Independently
   review both workflow commands and the complete diff, then run actionlint.
6. Update draft PR #3 and verify CI plus artifacts on the exact new head. Keep
   minimum-(actions, shifts) behavior: lock-018 remains 14/45 and all 45 total 483/1713.

No actual merge or package publication is authorized by this implementation task.
