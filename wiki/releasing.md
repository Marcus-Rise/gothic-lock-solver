# CI and releases

Two workflows. CI has a build job and a test matrix:

| Workflow | Trigger | Result |
| --- | --- | --- |
| `ci.yml` | Pull request or push to main | One build and benchmark; six Node/browser test environments |
| `release.yml` | Successful main-push CI | Automatic npm canary and GitHub prerelease |
| `release.yml` | Manual dispatch | Stable version from a selected successful main CI run |

Build commands invoke Vite and TypeScript directly. CI and release coordination
lives in the two workflow files; there are no repository script wrappers.

The Node 24 build job runs lint, type checking, the build, distribution checks
and benchmarks. Six Ubuntu matrix rows then test the same package archive:
Node 22/24/26 and Chromium/Firefox/WebKit. Browser rows use Node 24 as their test
driver and install only the selected browser. The matrix does not rebuild the
distribution. Diagnostics identify the Node version and test environment.
The build and every matrix row must succeed before automatic canary publication.
Within a CI run, `build-SHA` and `benchmark-SHA` identify its canonical artifacts.
Rerunning failed tests reuses the successful build; rerunning the build replaces
its artifacts through GitHub's `overwrite` option.

CI downloads a benchmark baseline only when a report
exists for the exact target SHA; otherwise comparison is skipped. See
[benchmarks](benchmarks.md). All build output, reports, coverage and browser
diagnostics remain CI artifacts.

## First publication setup

Establish the public `gothic-lock-solver` npm package and configure a GitHub trusted
publisher for this repository, `release.yml` and the `npm-production` environment.
Enable direct `npm publish` permission in the publisher settings. Follow the
[official npm instructions](https://docs.npmjs.com/trusted-publishers/).
Then set the repository variable `NPM_PUBLICATION_READY=true`.

The workflow uses OIDC rather than a stored npm token. Actions are pinned to
official releases; GitHub CLI and jq are provided by GitHub's Ubuntu runner.
Public npm, standard public GitHub
runners and jsDelivr require no paid subscription for this setup.

## Automatic canaries

A successful CI run for a push to main triggers the release workflow. The release
job checks the selected CI run's workflow, branch, event and success,
then downloads its named `build-SHA` artifact with `gh run download`.
PR artifacts cannot be published.

Preparation assigns a unique version such as
`1.0.0-canary.RUN_ID.ATTEMPT.SOURCE_SHA_PREFIX`. It changes only the package version
and the build manifest's version, then packs with lifecycle scripts disabled.
Every other archive entry must remain byte-identical to the tested package.
The five runtime files are not rebuilt.

The package is published under npm's `canary` tag and attached to a GitHub
prerelease. Stable `latest` is unchanged. The full JSON/Markdown benchmark report,
source identity and package/CDN links accompany the release.

## Manual stable release

In GitHub Actions, choose **Release → Run workflow** on **main** and provide:

- `ci_run_id`: the successful main CI run whose tested artifact you reviewed.
- `version`: the stable SemVer to publish, for example `1.0.0`.

The workflow validates that run and prepares a new package version from its tested
archive. Only the same two version metadata fields may change. npm versions are
immutable: assigning the `latest` tag to a canary would not turn its prerelease
version into a stable SemVer, so stable delivery needs this metadata-only repack.
The resulting npm version uses `latest` and a regular GitHub Release.

If the artifact expired, run CI again before releasing. No source rebuild or
fallback artifact is hidden inside the release workflow. Publication uses ordinary `npm publish` and `gh release create` commands.
Standard npm and GitHub CLI errors stop publication. If delivery
fails after npm succeeds, inspect the job log and published version, then complete the
remaining delivery manually; rerunning the entire job is not an automatic recovery
mechanism. Published npm versions are never overwritten.

## Browser delivery

jsDelivr serves the files already published to npm. No CDN account, SDK, Action or
upload is needed. Pin the complete version in integrations:

```html
<script src="https://cdn.jsdelivr.net/npm/gothic-lock-solver@VERSION/dist/gothic-lock-solver.min.js"></script>
<script type="module">
  import { solveLock } from 'https://cdn.jsdelivr.net/npm/gothic-lock-solver@VERSION/dist/gothic-lock-solver.min.mjs';
</script>
```

CI checks the runtime files in Chromium, Firefox and WebKit and verifies the
installed archive in every matrix row. Release downloads that successful build,
updates version metadata, packs and publishes it through the standard CLIs. The fifth
file is the standalone Node CLI. Release assets include all five runtime files,
the npm archive and the two benchmark reports.

Official references: [workflow run triggers](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#workflow_run),
[artifact downloads](https://cli.github.com/manual/gh_run_download),
[runner tools](https://github.com/actions/runner-images/blob/main/images/ubuntu/Ubuntu2404-Readme.md),
[npm publishing](https://docs.npmjs.com/cli/commands/npm-publish/),
[jsDelivr npm delivery](https://github.com/jsdelivr/jsdelivr#npm).
