---
title: Measure local presentation matrix speedup
type: chore
created: '2026-10-16'
status: in-progress
baseline_commit: a4cd2fad1662fe5c7b8116623972ee675bce1cdd
route: dispatch
review_loop_iteration: 0
context:
  - .agents/rules/testing.md
  - .agents/rules/security-privacy.md
  - _bmad-output/implementation-artifacts/spec-hygiene-runner-batching.md
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

Implement and measure approach B locally: sample ordinary presentation matrices and test a bounded
concurrency improvement. Compare with verified approach A: 3297 seconds total, 773 seconds ordinary
E2E, 2350 seconds hygiene. Report measured savings rather than a runtime promise.

Owner decision: bare `./run-all-tests.sh` selects story mode; `--full-matrix` restores complete
presentation matrices for local epic/release verification. Nightly scheduling is deferred.

## Boundaries & Constraints

**Always:** Preserve complete security, authorization, existence-hiding, lifecycle, locale-loading,
request-minimization and no-replay assertions. Both modes retain every hygiene checkpoint, immediate
deliberate failure, canary, original-output scan and owned-preview cleanup. Keep all text modes,
actual browser zoom factors, forced colors, spacing checks and surfaces in selected presentation tests.
Use bundled Chromium on macOS; run measurements sequentially against the same build/toolchain.

**Never:** Sample hygiene evidence or mixed security/presentation loops; replace browser zoom with
CSS zoom; infer coverage from checkpoint hashes alone; promise linear worker scaling. No nightly
workflow, backend provisioning, product changes or security-stage reductions in this scope.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected behavior | Error handling |
| --- | --- | --- | --- |
| Story | Bare gate | Sample audited presentation locales only | Fail on failed checks |
| Complete | `--full-matrix` | Original complete matrices | Fail on failed checks |
| Bad arguments | Unknown/contradictory mode | Reject before expensive work | Nonzero, static diagnostic |
| Hygiene | Inherited story mode | Force full registration and execution | Fail on incomplete evidence |
| Scoped gate | Hygiene scope environment override | Reject authoritative gate invocation | Nonzero, static diagnostic |

</frozen-after-approval>

## Code Map

- `run-all-tests.sh`, `scripts/check-browser-gate.sh`, `package.json`: gate mode parsing and propagation.
- `e2e/courseAdministration.spec.ts:620`, `e2e/coursePreparation.spec.ts:1004`,
  `e2e/courseActivation.spec.ts:491`: audited course presentation matrices.
- `e2e/scaffold.spec.ts:985,3788`: replacement-form geometry and anonymous-entry reflow.
  Its `canonical entry routing` describe near line 4075 contains six independent tests suitable
  for a bounded ordinary-only concurrency experiment; other groups include clipboard and zoom risks.
- `scripts/check-hygiene-inventory.mjs`, `scripts/check-route-secret-hygiene.mjs`,
  `scripts/check-secret-hygiene.mjs`: force full mode across discovery and child execution.
- `scripts/compare-hygiene-evidence.mjs`: preserve exact reconciliation of 445 route and 279
  course-unit identities, plus existing canaries and dedicated probes.
- `playwright.config.ts`: already uses default CPU-based workers; no one-worker assumption.
  `playwright.route-secret-hygiene.config.ts`: retain single-worker checkpoint execution.
- `.agents/rules/testing.md`, `.github/workflows/checks.yml`: document local cadence and retain
  CI parity, without adding scheduling. `tmp/improve-tests.md`: correct stale claims and record results.

## Tasks & Acceptance

**Execution:**

- [ ] `e2e/presentationMatrix.ts` (new): explicit validated selector, full default for standalone
  execution, story selected by gate. Use en-US/de-DE/fr-FR; include pt-PT for login/session
  presentation. Keep locale ordering and all three text modes. Character-length proxies inform
  this conservative sample; they are not rendered-width measurements.
- [ ] The five mapped E2E files: apply selector only to audited presentation loops/registrations;
  retain all assertions and full-mode registration titles. Leave mixed-purpose material, Learn,
  tutoring, forbidden-link and existence-hiding matrices complete.
- [ ] Gate/browser scripts and hygiene runners: propagate ordinary mode explicitly; override to
  full for all hygiene discovery/execution. Reject scoped authoritative gates. Update CI only
  as necessary for equivalent mode selection and documented existing exceptions.
- [ ] `scripts/hygiene-runner.test.mjs` and focused selector tests: verify invalid inputs,
  story/full registration, inherited-mode override and full internal-loop selection. Preserve
  existing leak/cancellation negative tests.
- [ ] `e2e/scaffold.spec.ts`: compare parallel scheduling for canonical entry routing only,
  ordinary mode only. Retain it only with repeatable benefit and no new failures; otherwise
  preserve current scheduling and report the result. Do not change zoom helpers.
- [ ] Testing guidance and timing notes: record scope, full-matrix cadence, measurements,
  evidence comparisons and deferred nightly discussion.

**Acceptance Criteria:**

- Given either authoritative gate mode, when hygiene runs, then baseline identities and canaries
  reconcile exactly and internal presentation loops execute fully despite inherited story mode.
- Given story mode, when ordinary tests run, then only the identified presentation duplication is
  sampled; security behavior and all selected accessibility dimensions remain exercised.
- Given full mode, when registration and execution are compared with A, then all original
  presentation cells and assertions remain available.
- Given identical sampled execution, when the scheduling experiment is compared sequentially,
  then measured evidence determines whether it is retained; no unsupported speedup is claimed.
- Given implementation completion, when story and full gates run sequentially, then both pass
  and total/E2E/hygiene timings, failures and retries are reported against A.

## Implementation Notes

- Superseded 2026-10-16 by `spec-remove-synthetic-artifact-hygiene.md` for synthetic artifact
  evidence only. B's 3237-second story retry passed, but its full-matrix run has no
  completion evidence. Neither the original failure nor termination is explained;
  do not mark its unverified acceptance passed or rerun canceled hygiene to close B.
  Presentation selection, scheduling and Bash-3.2 fixes remain the starting point.

- 2026-10-16: Added validated standalone-full presentation selector and applied it only to
  course creation, preparation, activation, replacement and anonymous-entry reflow matrices.
  Mixed hygiene/presentation hub, MFA, recovery, invitation and other journeys remain full.
  Story-only canonical entry routing parallel scheduling is provisional pending sequential measurements.
- 2026-10-16: Gate now rejects conflicting/invalid mode and scoped hygiene before expensive work;
  browser gate and both hygiene runners force full child execution and inventory discovery.
  CI selects the same ordinary story mode, while standalone browser commands remain full.
  Added selector/registration/inventory/argument harness checks and documented full-matrix cadence.
- 2026-10-16: Sequential focused presentation runs against one build: full 80/78 seconds,
  story 35/35 seconds (medians 79/35, zero failures/retries). Canonical routing serial
  8/8 seconds vs story-only parallel 5/5 seconds (zero failures/retries); retained the
  bounded concurrency change. On 12 logical CPUs the Playwright default is six workers;
  Node 26.8.2, npm 11.19.1, Playwright 1.63.0 and bundled Chromium. Under inherited
  story mode, scoped course route hygiene still verified 22 separate failures and its
  canary (23 probes, 83 seconds); full 213-case inventory discovery passed. Fourteen
  harness tests, typecheck, lint, formatting, build and duplication passed. Notes are in
  `tmp/improve-tests.md`, with content-free timings under
  `tmp/agent-execution/spec-local-presentation-matrix-speedup/`.
- Remaining for the distinct verification phase: sequential bare and `--full-matrix`
  authoritative gates, total/E2E/hygiene timing against A, final complete evidence-set
  hashes and any environment/tool skips. Focused timing is not a full-gate saving claim.
- 2026-10-16 review repair: macOS `/bin/bash` is GNU Bash 3.2.57; it rejects `[[ -v ]]`
  with a syntax error. Both gate entry scripts now use Bash-3.2-compatible `${VAR+x}`
  presence checks. The harness invokes `/bin/bash` and asserts the static rejection
  diagnostic for nonempty and empty scopes (and invalid modes) before expensive work.
  The actual course-reflow route test now records locale completion after *all three*
  rendered/checked text modes and, only under a hygiene batch, requires the original
  ordered seven locales including es-AR and pt-BR before its `complete` controlled
  failure checkpoint. A scoped real route-hygiene runner launched with inherited story
  mode passed 22 independent failures plus its canary and reported one reconciled
  `course-reflow:complete` result; its existing original-output/artifact scans remained
  active. A counterfactual direct route-hygiene Playwright child inheriting story mode
  without the runner's full override failed *before* that checkpoint because the
  late es-AR/pt-BR locales were missing; its original output/artifacts scanned
  marker-free. Ordinary course reflow passed in both story and full modes.
  See `tmp/agent-execution/spec-local-presentation-matrix-speedup/runner-loop-proof.log`
  and `runner-loop-negative-control.log` in the same directory.
  These targeted results do not substitute for whole ordinary-suite comparison or
  sequential story/full final gates; both remain with the solver's verification phase.
- 2026-10-16 verification-failure diagnosis: the story gate passed its early
  checks, ordinary browser stage and course-unit hygiene (280 evidence records),
  then stopped in route hygiene. Its route report contains 327 successful records
  and no canary: the next scheduled batch was six public `supervisor-*` cases at
  `invitation-detail`. The owned wrapper correctly deleted raw child output after
  scanning, so the original failure category is unrecoverable; no fixture bytes
  were surfaced. A targeted replay of exactly that six-case batch under inherited
  story/gate mode passed all six intended failures/checkpoints with a clean
  original-output/artifact scan. A scoped supervisor-onboarding runner also passed
  all 50 checkpoints and its canary. Neither reproduces the gate failure, so its
  underlying cause remains unknown; no security behavior or thresholds were changed.
  To make a recurrence diagnosable, the route runner now labels a failed batch
  with static phase and *only* its public registry checkpoint identities. The
  owned wrapper forwards these labels only after its original-byte scan succeeds
  and after matching an exact category plus registry identity allowlist; a
  planted marker suppresses forwarding. Focused harness (16 tests), typecheck,
  lint, formatting and duplication passed. The solver must rerun the story gate
  once to establish whether the failure recurs and collect its safe category;
  the full-matrix gate remains deferred until the story gate passes.
  Content-free diagnostics: `tmp/agent-execution/spec-local-presentation-matrix-speedup/`
  contains `batch55-diagnostic.log`, `supervisor-scope.log` and
  `diagnostic-final-checks.log`. `story-gate.log` and `.exit` are the original
  solver-owned failure evidence, not replacement passing gate evidence.

## Spec Change Log

## Review Triage Log

## Design Notes

No unresolved owner decisions or irreversible operations. This crosses gate, runner and E2E
boundaries and therefore uses dispatch. Sampling is limited to ordinary presentation work; full
hygiene execution remains the dominant runtime. A's unchanged non-E2E cost is 2524 seconds, so
the old 20–30-minute projection is unsupported.

## Verification

Record CPU count, effective workers and versions. Measure ordinary E2E with A scheduling before
and after sampling, then compare the scoped concurrency experiment using the same sampled suite.
Use at least two sequential runs per compared configuration and a third if ranges overlap;
report ranges and medians rather than the fastest run. Reuse focused checks where sufficient.
Run `./run-all-tests.sh` and `./run-all-tests.sh --full-matrix` sequentially for final acceptance.
Compare hygiene evidence to A and verify full internal loops separately. Record content-free
results under `tmp/agent-execution/spec-local-presentation-matrix-speedup/`.
