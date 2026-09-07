# Packaging and releases

The distribution is one public npm package, automatically served file-by-file by
jsDelivr, followed by a GitHub Release with the exact verified bytes and evidence.
No CDN account, SDK, Action, upload or separate deployment is involved.

## Before the first publication

This branch does not publish anything. The owner must establish the npm package
and configure its GitHub trusted publisher before the first automatic release.
GitHub and npm account names need not match.

Configure npm trusted publishing for the owner repository, `release.yml` workflow
and the `npm-production` release environment used by that workflow. Permit direct publication
in the publisher settings where npm distinguishes staged from direct publishing.
Use the [official npm instructions](https://docs.npmjs.com/trusted-publishers/).
Do not put a token in chat or repository files. Once setup is complete, set the
repository readiness variable `NPM_PUBLICATION_READY=true`. No npm token is
required by the OIDC workflow; GitHub supplies its own narrowly scoped
`GITHUB_TOKEN` for release operations.

The automated release uses official npm CLI 12.0.2 with OIDC and provenance on a
GitHub-hosted runner. GitHub assets are managed by official GitHub CLI 2.100.0.
All referenced Actions are from their tool/service authors and pinned to verified
full commit SHAs. pnpm owns dependency installation, Vite owns bundling, and
Vitest/Playwright own the checks. Workflow YAML only connects working local steps.

## Local acceptance precedes workflow integration

Run the full local test command, coverage, clean installed package verification
and the all-45 paired benchmark before creating or updating the workflow.
Keep exact failure evidence and fix the cause locally. Required browser projects
cannot be replaced by Node VM tests or skipped because a runner is inconvenient.

`pnpm build` produces five self-contained runtime files and declarations under
`dist/`, plus a build manifest binding version, source SHA and file hashes.
`pnpm verify:package` packs those existing bytes, installs the archive into an
isolated consumer, checks imports/types/CLI and reruns browser consumers against
the installed files. Only after all required checks pass does it write
`artifacts/package/package.tgz` and its checksum. It does not publish.

A completed benchmark run supplies `benchmark.json`, `benchmark.md` and
`benchmark-evidence.json`, including the generated quality snapshot. These are
CI artifacts, never tracked repository files. Prepare a release locally from the exact verified files:

```sh
node .github/scripts/release.ts prepare --benchmark-dir artifacts/benchmark/run-EXACT
node .github/scripts/release.ts check
```

The default output is `artifacts/release`. Preparation never rebuilds or repacks.
A version/source mismatch, changed tarball file, incorrect report hash or failed
quality gate stops it. Benchmark evidence must identify the exact candidate
module and source commit. Prepare output is created exclusively to prevent
accidental replacement of an earlier release candidate.

Both calibrated timing and whole-catalog peak-RSS comparisons must pass. An
inconclusive or regressed performance result requires explicit review of that
exact evidence, recorded by its SHA256 and a reason. This exception does not
waive malformed paths, lost solvability, worse deterministic quality or mismatched
source bytes. The exceptional acceptance settings are repository variables
`PERFORMANCE_ACCEPTED_EVIDENCE_SHA256` and `PERFORMANCE_ACCEPTANCE_REASON`;
privileged steps read them independently of the uploaded artifact. Ordinary code changes cannot silently accept their own regression.

## Stable publication sequence

Each release-producing PR increments the SemVer in `package.json`; versions
are never inferred from arbitrary commit text or reused for changed files.
After a future approved merge to main, the workflow validates the exact source
commit and prepares one immutable candidate:

1. Run the existing local checks and matched baseline comparison; preserve reports.
2. Verify and retain one tarball containing the five runtime files, declarations,
   package metadata, README and license. No consumer installation script builds it.
3. Publish that exact tarball to public npm with the agreed SemVer and `latest` tag.
4. Download the exact published version. Check registry integrity, tarball/file
   identity, installation and module behavior without consumer credentials.
5. Verify all four core file URLs on jsDelivr for status, JavaScript MIME, CORS
   and SHA256. Load them in real Chromium, Firefox and WebKit from another origin
   and solve all 45 fixtures. The fifth file is a Node tool, not a browser script.
6. Create a GitHub draft release, attach the same runtime files, package archive,
   checksum manifest and full evidence, verify assets, then finalize the release.

Release notes contain the npm version, source SHA, browser snippets and the actual
quality/timing/memory verdicts compared with the previous stable release. The
first release explicitly uses the preserved reference rather than inventing a
previous stable release. PR comparisons obtain their baseline from the actual
PR target checkout; candidate snapshots are not accepted as their own baseline.

## CDN contract

After npm publication, the browser endpoint is:

```text
https://cdn.jsdelivr.net/npm/gothic-lock-solver@VERSION/dist/gothic-lock-solver.min.js
```

Use the full version and one of the four already-built core filenames. Do not
use `latest`, version ranges, `+esm`, combine or generated minification endpoints
for reproducible integrations. Updating or rolling back means explicitly changing
the version. The npm archive already contains the exact served files.

npm's documented delivery contract provides registry metadata and a package
tarball, not a supported browser URL for each unpacked JavaScript file.
GitHub Packages' npm registry requires authentication even for public package
installation. jsDelivr documents automatic delivery of public npm files without
an account and supplies the required anonymous browser endpoint.

The budget is zero: public npm, jsDelivr and standard free public GitHub runners.
No paid larger runners, increased quotas, subscriptions or automatic paid overflow
are configured. Temporary CI artifacts have bounded retention; releases retain
the durable distribution and evidence.

## Partial publication and canaries

npm publication and GitHub Releases are not one atomic transaction. If npm
succeeds and later delivery verification fails, preserve the prepared artifact
and rerun the failed steps. An existing version is downloaded and checked for
identity; it is never overwritten or automatically unpublished. Changed bytes
require a new version. A temporary delivery failure allows a bounded verification
retry, not rebuilding under the same version.

Regular PRs only produce validation artifacts. An optional manual canary uses a
unique prerelease version containing the source SHA and run identifiers, and the
separate npm `canary` tag. It does not move `latest`, replace the stable benchmark
baseline or become GitHub's latest stable release. Privileged publication logic
must always come from main, even when the candidate is built from an owner branch.
No fork PR receives publication credentials or a privileged workflow context.

## Official references

- [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/)
- [npm publish](https://docs.npmjs.com/cli/commands/npm-publish/)
- [GitHub Packages npm authentication](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry#authenticating-to-github-packages)
- [jsDelivr npm delivery](https://github.com/jsdelivr/jsdelivr#npm)
- [GitHub CLI release creation](https://cli.github.com/manual/gh_release_create)
- [GitHub Actions security](https://docs.github.com/en/actions/reference/security/secure-use)
- [GitHub Actions billing and free public runners](https://docs.github.com/en/billing/concepts/product-billing/github-actions)
