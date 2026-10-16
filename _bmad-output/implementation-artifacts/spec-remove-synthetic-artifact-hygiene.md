---
title: Remove synthetic artifact hygiene while preserving application privacy tests
type: chore
created: '2026-10-16'
status: done
baseline_commit: a4cd2fad1662fe5c7b8116623972ee675bce1cdd
route: dispatch
review_loop_iteration: 0
context:
  - tmp/improve-tests.md
  - .agents/rules/testing.md
  - .agents/rules/security-privacy.md
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

Execute chapter 9 of the improvement plan before chapter 8 remote QA. Remove synthetic test-artifact
hygiene requirements and machinery, not merely postpone their execution. Preserve meaningful application
privacy tests. Every retained check must detect a credible harmful failure, at the cheapest adequate layer.

Owner authorizes preserving uncommitted B work as the starting point. Its story retry passed in 3237 seconds;
its full-matrix run has no completion evidence. Neither the original failure nor its termination is explained.
Record this explicitly; do not rerun canceled hygiene solely to close B.

## Boundaries & Constraints

**Always:** Preserve synthetic fixtures, provider isolation, actual authorization/minimization, storage,
production-log, URL, sanitizer, logout and lifecycle protections. Keep B's presentation selection and routing
scheduling, preview ownership and useful failure diagnostics. Retain credential and dependency scanners.
Migrate unique application assertions before removing mixed helpers. Private reports may contain synthetic data.

**Never:** Replace the removed sweeps with another artifact-hygiene framework, erase historical evidence,
claim authorized API visibility is a disclosure, weaken product privacy, or overwrite unrelated user changes.
Remote provisioning and story/QA handoff follow in chapter 8. No GitHub push. Full macOS E2E with complete
presentation matrices is required before an epic completion or GitHub push.

## I/O & Edge-Case Matrix

| Situation | Expected behavior |
| --- | --- |
| Synthetic data in private test failure | Useful diagnostic output; no artifact-marker gate |
| Real application privacy regression | Ordinary owning test fails |
| Preview port occupied | Reject without reusing or killing unrelated listener |
| Worker failure, timeout or cancellation | Nonzero result and owned descendant cleanup |
| Story/full presentation selection | B behavior retained; no hygiene registration dependency |

</frozen-after-approval>

## Code Map

- `scripts/check-*secret-hygiene.mjs`, `check-hygiene-inventory.mjs`, `compare-hygiene-evidence.mjs`,
  checkpoint registries, `hygiene-output.mjs`, `route-hygiene-diagnostics.mjs`: artifact-only removal chain.
- `e2e/routeSecretHygiene.ts`: mixed fixture builders and probe-only assertions; inspect every branch.
  `scripts/secret-hygiene-evidence.ts`: relocate `courseUnitFixture`; checkpoints only record/throw.
- `e2e/routeFixtures.ts`: preserve ordinary journey cleanup and actual browser zoom. Keep `test/setup.ts`.
- `scripts/hygiene-preview.mjs`, `hygiene-runner.test.mjs`, `scripts/fixtures/`: retain server ownership,
  readiness, cancellation and mode tests; remove scans, reporter suppression and probe-only fixtures.
- `test/secretAssertions.ts`, `e2e/secretAssertions.ts`: retain real assertions; names alone imply no deletion.
- Dedicated hygiene Playwright/Vitest configs and failure suites: remove after checking ordinary coverage.

## Tasks & Acceptance

**Execution:**

- [x] B spec: append supersession/incomplete-verification note outside frozen intent. Snapshot pre-removal diff
  including untracked files; preserve sampling and Bash compatibility. Do not mark unverified B acceptance passed.
- [x] `e2e/{learnCourses,tutoringSessions,scaffold}.spec.ts`: preserve unique minimization, raw-error absence
  and stale table removal currently gated by `learn-metadata`, `learn-hidden`, and tutoring checkpoints.
- [x] `e2e/{courseAdministration,coursePreparation,materialPreparation,routeRecovery,scaffold,learnCourses}.spec.ts`:
  preserve meaningful collapsed-to-explicit Technical details disclosure and inert body assertions.
  Consolidate equivalents; drop exposure-only proofs whose purpose was a subsequent deliberate failure.
- [x] Mixed fixture/helpers and all callers: relocate ordinary fixtures, remove probe environment selection,
  injected throws, checkpoint calls and registry coupling. Preserve invitation API payload/CSRF/result assertions
  in `src/platform/api/invitations.test.ts`; remove its deliberate inverted-expectation mode.
- [x] Artifact-only scripts/configs/probes: remove after tracing consumers. Preserve ordinary password-reset,
  invitation token, TOTP and material lifecycle tests. No silent no-op compatibility helpers.
- [x] Preview runner/harness: retain one ordinary origin, strict build readiness and process cleanup; expose
  ordinary runner output. Rename responsibilities coherently; retain focused lifecycle and mode tests.
- [x] `package.json`, `run-all-tests.sh`, `scripts/check-browser-gate.sh`, `.github/workflows/checks.yml`,
  `playwright.config.ts`, `tsconfig.node.json`, `README.md`: reconcile commands/configuration together.
- [x] `AGENTS.md`, testing/security rules, `.opencode/story-execution.md`: remove synthetic-report mandates,
  add concrete-harm/cheapest-layer test rationale. Reconcile test-report clauses in
  `SECURITY-PRIVACY-ACCEPTANCE.md`, `BACKEND-CONTRACT-GAPS.md` and `ARCHITECTURE-SPINE.md` at their existing
  planning-artifact locations. Preserve product clauses and completed historical results.
- [x] Record disposition of unique assertions, checks executed, unresolved failures and measured savings
  in this spec and `tmp/improve-tests.md`; chapter 8 remains the next work item.

**Acceptance Criteria:**

- Given ordinary test execution, when synthetic values appear in private diagnostics, then no deliberate-failure
  sweep, marker scan or reporter suppression runs locally or in CI.
- Given removed checkpoint branches, when compared with ordinary tests, then every unique meaningful application
  assertion has a named surviving owner or a concrete rejection rationale.
- Given occupied ports, failed workers or cancellation, when the retained runner exits, then unrelated processes
  survive, owned descendants terminate, and failures remain nonzero and diagnosable.
- Given both presentation modes, when verification runs, then retained behavior passes without registry dependency;
  complete macOS E2E covers all original presentation cells.
- Given active rules and commands, when searched for canceled obligations, then none instruct rebuilding synthetic
  artifact hygiene. Historical evidence is clearly historical, not rewritten.

## Implementation Notes

- Baseline `a4cd2fad1662fe5c7b8116623972ee675bce1cdd`; preserved B's
  pre-removal tracked diff and untracked files in
  `tmp/agent-execution/spec-remove-synthetic-artifact-hygiene/pre-removal-{tracked.diff,status.log,new-files.log}`.
  B's story retry passed in 3237 seconds; full-matrix completion is unverified, and
  neither its initial failure nor termination has a known cause. No canceled sweep
  will be rerun solely to close B.
- Removed route/course-unit checkpoint calls, registries, deliberate-failure runners and
  dedicated configs. Ordinary synthetic fixture owners moved to `e2e/routeTestFixtures.ts`
  and `test/courseUnitFixture.ts`; invitation payload/CSRF/result assertions remain in
  `src/platform/api/invitations.test.ts`. B presentation selection/scheduling and
  existing application journey bodies remain. Preview ownership is now an ordinary
  single-origin runner; targeted assertion migration is complete, subject to review.
- Moved unique Learn metadata, hidden-table and raw-error assertions into Learn journeys;
  persisted tutoring text and raw-error absence into its start/intent journeys; retained
  inert, collapsed-to-explicit technical details in course administration, course
  preparation, material access, route recovery and both student/supervisor handoffs.
  Password/TOTP/input-equals-fixture, deliberate pre-failure exposure, and intentionally
  inverted matcher checks were rejected: they prove test setup or artifact formatting,
  not an application privacy defect. Existing ordinary journey assertions own form
  preservation, exact API payload/CSRF, storage/URL, logout and sanitizer behavior.
- Focused implementation checks: 940/940 ordinary Vitest, 111/111 targeted Vitest,
  8/8 preview/mode/lifecycle checks, 16/16 targeted Chromium across migrated Learn,
  tutoring, administration, preparation, material, recovery and handoff paths.
  Typecheck, lint/architecture, build and applicable Markdown lint pass.
  One preview harness assertion initially failed because the renamed readiness
  error retained a doubled prefix; repaired and rerun. Vitest prints a jsdom
  navigation-not-implemented warning; all tests pass. No full gate or complete
  full-matrix E2E has run in this implementation phase; no after-gate runtime
  or measured full-gate saving is claimed. Baseline comparison remains 3237
  seconds for B story retry and 3297 seconds for verified A; a 2350-second
  canceled hygiene stage in A is not a measured saving after removal.
- Final implementation-stage format, lint, typecheck and Markdown checks pass.
  A transient lint failure came from a temporary baseline copy created for the
  reviewer diff under `tmp/`; that copy was removed and lint reran clean.
  `tmp/agent-execution/spec-remove-synthetic-artifact-hygiene/story.diff`
  excludes pre-existing B edits; `story-manifest.log` names every changed story path.
  Uncommitted B's unchanged `e2e/presentationMatrix.ts` remains outside the delta.
  Remaining: independent review, the authoritative revised full gate and sequential
  complete-matrix macOS E2E, actual timing/saving comparison, then chapter 8 remote QA.

## Spec Change Log

## Review Triage Log

- 2026-10-16 repair: three full-gate failures in `e2e/coursePreparation.spec.ts`
  share one removal-induced root cause. Removing checkpoint statements from unbraced
  `if` branches accidentally made the following real click or fixture reset
  conditional. Restored unconditional preview opening, persisted-value reset,
  and Save changes dispatch exactly as in the pre-removal source. No timeout,
  assertion, fixture, production behavior or scope was relaxed. The exact three
  Chromium tests now pass sequentially (3/3); complete gate remains owner-side.

## Verification

Final verification completed after the three control-flow repairs:

- `full-gate-retry-1.log` and `.exit`: exit 0, 909 seconds total (15m09s).
  940 unit tests, 340 story-mode E2E tests and 8 preview/mode tests passed; zero preview-test skips.
  Ordinary E2E took 746 seconds. All configured gate stages ran.
- `full-matrix-e2e.log`, `.exit` and `.timing`: exit 0; all 352 complete-matrix macOS Chromium
  tests passed in 787 seconds (13m07s), sequentially after the gate.
- Compared with B's 3237-second passing story run: 2328 seconds saved (38m48s, 71.9%).
  Compared with A's 3297 seconds: 2388 seconds saved (39m48s, 72.4%).
  These are measured single-run comparisons, not guaranteed future durations.
- Independent scope review passed. Targeted control-flow review after the repairs found no remaining
  checkpoint-removal binding defects. Earlier failed verification remains recorded above.
- Existing non-blocking dependency/scanner findings were reported by the gate, not suppressed.
  No GitHub push. Chapter 8 remote QA remains next.

Run targeted migrated behavior and preview lifecycle tests first; use a focused known-bad change only where needed
to prove an assertion detects its intended defect. Avoid a replacement mutation framework.
Run the revised `./run-all-tests.sh`, then complete macOS E2E in full presentation mode sequentially.
Record actual commands, counts, failures, skips and timings. Compare against B's 3237-second story result
(747 seconds E2E, 2302 hygiene), distinguishing measured changes from subtraction estimates.
Store evidence under `tmp/agent-execution/spec-remove-synthetic-artifact-hygiene/`.
