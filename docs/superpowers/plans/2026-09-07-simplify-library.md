# Readability and delivery simplification

The owner requested a complete readability correction across `src/` and `.github/`.
The prior directory cleanup did not make the implementation sufficiently clear.
This is the one active plan; generated measurements and review notes stay outside Git.

## Boundaries

Keep the flat ten-file source layout, two build entries, public tuple contract,
optional validated configuration, CLI behavior and all five distribution files.
Keep exact mathematics, deterministic command ordering, search budget semantics,
all 45 fixed inputs, strict TypeScript and every required consumer environment.
No source copies, tracked reports, extra service or new abstraction framework.

Domain constants describe the fixed lock mechanics; they are not new config fields.
Ordinary counters and binary arithmetic do not need decorative constants.
Necessary matrix/search loops remain explicit, with short, cohesive bodies.

## Source

- [x] Review every source file, including small API, type and error modules.
- [x] Replace opaque internal identifiers with domain names.
- [x] Name position bounds, target, encoding units, storage byte sizes and sentinels.
- [x] Separate matrix construction, pivot operations and result classification.
- [x] Make search strategy selection, state expansion and path relaxation readable.
- [x] Keep dense/sparse predecessor storage details out of BFS traversal.
- [x] Express CLI IO and configuration validation as clear ordered operations.
- [x] Preserve all 45 exact command paths and resource-limit behavior.

## Delivery

- [x] Review and simplify every script under `.github/scripts/`.
- [x] Give preparation, publication and verification explicit responsibilities.
- [x] Remove compressed multi-statement lines and deeply nested delivery branches.
- [x] Preserve one verified archive, source identity, preceding-release baseline,
  performance acceptance and idempotent recovery from partial publication.
- [x] Verify helpers locally before editing workflow YAML.
- [x] Use one `release.yml` workflow for PR checks, main publication and manual canary.
- [x] Consolidate verification into one readonly job, including Node 26 source tests.
- [x] Use a separate npm delivery job with fresh trusted-main preparation and OIDC;
  verify npm/CDN bytes and real browser imports before the GitHub release job.
- [x] Keep GitHub write permissions separate; candidate/fork code never becomes
  privileged publication tooling.
- [x] Preserve existing checks and canary behavior; do not remove features silently.

## Verification and review

- [x] Enforce supported Oxlint block-depth limits for source and delivery scripts.
- [x] Run strict types/lint, existing behavior/oracle/config/CLI tests and coverage.
- [x] Build and verify the same archive on Node 22/24/26 and real browser engines.
- [x] Run the 45-input benchmark after competing heavy processes stop.
- [x] Adapt and validate workflow YAML only after those local gates finish.
- [x] Independently review every source/delivery file for maintainability, not only
  correctness; resolve concrete findings before updating the draft PR.
- [ ] Update the existing PR and inspect hosted CI on its exact commit.

No merge or package publication is part of this correction. Hosted evidence and
final execution status are linked from the draft PR, rather than copied into Git.
