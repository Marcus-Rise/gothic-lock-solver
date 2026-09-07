# CI and releases

Two workflows, one job each:

| Workflow | Trigger | Result |
| --- | --- | --- |
| `ci.yml` | Pull request or push to main | Checks, five builds, tested package, benchmark report |
| `release.yml` | Successful main-push CI | Automatic npm canary and GitHub prerelease |
| `release.yml` | Manual dispatch | Stable version from a selected successful main CI run |

CI runs the local commands. It downloads a benchmark baseline only when a report
exists for the exact target SHA; otherwise comparison is skipped. See
[benchmarks](benchmarks.md). All build output, reports, coverage and browser
diagnostics remain CI artifacts.

## First publication setup

Establish the public `gothic-lock-solver` npm package and configure a GitHub trusted
publisher for this repository, `release.yml` and the `npm-production` environment.
Enable direct `npm publish` permission in the publisher settings. Follow the
[official npm instructions](https://docs.npmjs.com/trusted-publishers/).
Then set the repository variable `NPM_PUBLICATION_READY=true`.

The workflow uses OIDC rather than a stored npm token. GitHub Actions and the npm
and GitHub CLIs are official, pinned tools. Public npm, standard public GitHub
runners and jsDelivr require no paid subscription for this setup.

## Automatic canaries

A successful CI run for a push to main triggers the release workflow. The release
job validates the originating repository, workflow, branch, event and run result,
then downloads that run's build artifact by ID. PR artifacts cannot be published.

Preparation assigns a unique version such as
`1.0.0-canary.RUN_ID.ATTEMPT.SOURCE_SHA_PREFIX`. It changes only the package version
and the build manifest's version, then packs with lifecycle scripts disabled.
Every other archive entry must remain byte-identical to the tested package.
The five runtime files are not rebuilt.

The package is published under npm's `canary` tag and attached to a GitHub
prerelease. Stable `latest` is unchanged. The full JSON/Markdown benchmark report,
source identity and file hashes accompany the release.

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
fallback artifact is hidden inside the release workflow. Existing npm versions
must match the prepared bytes; a retry never overwrites a published version.
A matching GitHub draft resumes by uploading missing assets, checking their hashes
and publishing the completed draft. Existing complete releases remain unchanged.

## Browser delivery

jsDelivr serves the files already published to npm. No CDN account, SDK, Action or
upload is needed. Pin the complete version in integrations:

```html
<script src="https://cdn.jsdelivr.net/npm/gothic-lock-solver@VERSION/dist/gothic-lock-solver.min.js"></script>
<script type="module">
  import { solveLock } from 'https://cdn.jsdelivr.net/npm/gothic-lock-solver@VERSION/dist/gothic-lock-solver.min.mjs';
</script>
```

The release verifies npm archive identity and CDN bytes/headers. CI has already
checked the identical runtime files in Chromium, Firefox and WebKit. The fifth
file is the standalone Node CLI. Release assets include all five runtime files,
the npm archive and the two benchmark reports.

Official references: [workflow run triggers](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#workflow_run),
[artifact downloads](https://github.com/actions/download-artifact),
[npm publishing](https://docs.npmjs.com/cli/commands/npm-publish/),
[jsDelivr npm delivery](https://github.com/jsdelivr/jsdelivr#npm).
