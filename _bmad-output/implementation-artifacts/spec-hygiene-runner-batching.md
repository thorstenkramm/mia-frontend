---
title: Coverage-preserving hygiene runner batching
type: chore
created: '2026-10-16'
status: done
baseline_commit: e30caa8af129e1e23a3fc951ce33142900ed1f13
route: dispatch
review_loop_iteration: 0
context:
  - .agents/rules/testing.md
  - .agents/rules/security-privacy.md
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

Reduce gate runtime by sharing owned preview servers and batching independent hygiene probe executions.
The measured baseline is 3637 seconds, including 2723 seconds of hygiene: 446 browser probes and 280
course-unit probes including canaries. Preserve failure-time evidence at every existing checkpoint.

Owner decision, 2026-10-16: adopt the coverage-preserving revision of approach A. Each checkpoint
still gets its own isolated execution and immediate deliberate failure. Batch runner invocations,
not checkpoints within a journey. Ordinary passing unit tests do not replace deliberate-failure probes.
The 45-minute target is aspirational pending measurement, not an acceptance shortcut.

## Boundaries & Constraints

**Always:** retain all existing cases, checkpoints, early-failure canaries, original-output/artifact
scanning, and exact checkpoint/failure identity reconciliation. Keep fresh browser contexts and fixture
isolation. Scan captured server output too. Reject missing, duplicate, unexpected, skipped or retried
results. Parent diagnostics remain content-free even when child reports leak. Standalone commands
remain self-contained; gate and CI use the same ownership mechanism.

**Never:** defer intermediate failures until journey end, replace failure evidence with exposure records,
remove tests, reduce locale matrices, change application behavior, suppress scan findings, reuse or kill
unrelated processes, or claim SIGKILL-proof cleanup. Approach B and nightly scheduling are deferred.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected behavior | Error handling |
| --- | --- | --- | --- |
| Normal probes | Existing case/checkpoint inventory | Exact independent failures, zero leaks | Content-free summary |
| Planted leak | Output or artifact contains marker | Scan rejects before forwarding | Nonzero exit |
| Early failure | Intended checkpoint never reached | Reject claimed coverage | Canary validates rejection |
| Bad result | Missing/duplicate identity, pass, skip or retry | Exact reconciliation rejects | Nonzero exit |
| Occupied port | Unowned listener on required port | Refuse reuse; leave listener alive | Content-free error |
| Cancellation | Timeout, INT or TERM | Stop owned descendants; scan/clean artifacts | Nonzero exit |

</frozen-after-approval>

## Code Map

- `run-all-tests.sh`, `.github/workflows/checks.yml`: local gate and CI integration; CI jobs have
  separate ownership lifetimes. Preserve existing stages and timing output.
- `scripts/check-route-secret-hygiene.mjs`: actual registration inventory, browser probe execution,
  original-stream scanning and result reconciliation. Currently one process per checkpoint.
- `e2e/routeSecretHygiene.ts`, `e2e/routeFixtures.ts`: fixture ownership, immediate failures and
  protected-journey cleanup. Some checkpoints open disclosures; retain those interactions.
- `scripts/check-secret-hygiene.mjs`, `scripts/secret-hygiene-evidence.ts`: unit registry and
  independent deliberate-failure execution; preserve baseline/canary suites.
- `playwright.config.ts`, `playwright.route-secret-hygiene.config.ts`,
  `playwright.secret-hygiene.config.ts`: preview ownership; dedicated suite uses port 4174,
  ordinary and route suites use 4173. Preserve origins initially.
- `vitest.config.ts`, `vitest.secret-hygiene.config.ts`, `test/setup.ts`: normal-run and
  deliberate-failure isolation; do not swallow failures to keep workers alive.
- `tmp/improve-tests.md`, `tmp/gate-baseline-instrumented.log`: intent and measured baseline;
  earlier projected savings are unsupported and must be corrected.

## Tasks & Acceptance

**Execution:**

- [x] `scripts/check-route-secret-hygiene.mjs`, `scripts/check-secret-hygiene.mjs`, and
  `scripts/secret-hygiene-evidence.ts`: introduce bounded batches or checkpoint rounds using
  per-test selection; reconcile exact identities and scan every original artifact before cleanup.
- [x] `e2e/routeSecretHygiene.ts`, `e2e/routeFixtures.ts`, and runner configs: support independent
  checkpoint variants with unique evidence paths and fresh isolation; retain immediate failures.
- [x] `scripts/hygiene-preview.mjs` (new), Playwright configs: own strict-port preview lifetimes,
  readiness/build validation, private output capture, signal and timeout cleanup. Keep 4174 separate.
- [x] `scripts/check-hygiene-inventory.mjs` (new): fail early on actual-registration mismatches,
  duplicate identities or invalid checkpoint lists; retain runtime reachability checks.
- [x] `run-all-tests.sh`, `package.json`, `.github/workflows/checks.yml`: integrate owned servers,
  early inventory validation and harness tests while preserving standalone invocations and cadence.
- [x] `scripts/hygiene-runner.test.mjs` (new) and synthetic harness fixtures: verify real scanner,
  reporter and process-lifecycle failure paths rather than merely mirroring constants.
- [x] `tmp/improve-tests.md`: correct projections; record before/after timings and exact evidence-set
  comparison. Update `.agents/rules/testing.md` only for the revised execution mechanism.

**Acceptance Criteria:**

- Given the baseline inventories, when the new runner completes, then every original case/checkpoint
  has an independent verified deliberate failure and all original canaries remain enforced.
- Given a marker exposed only in an intermediate failure report and cleared before journey end,
  when the harness runs, then the leak is rejected without printing the marker to parent output.
- Given planted stdout, stderr or nested-artifact leaks, when scanning runs, then each is rejected;
  missing/duplicate/wrong checkpoint evidence, malformed reports, unexpected pass/skip/retry and
  early assertions also fail closed.
- Given occupied ports or interrupted child runs, when lifecycle handling completes, then unrelated
  listeners remain untouched and owned servers/workers are stopped on supported cancellation paths.
- Given the final implementation, when the full gate runs, then it passes with unchanged coverage
  and publishes measured timing deltas against the 3637-second baseline.

## Implementation Notes

- 2026-10-16: Added shared original-byte scanning/reconciliation, route checkpoint-round runner,
  per-test fixture selection and unique checkpoint paths. Added early route registration inventory
  and began course-unit checkpoint batching. In progress: owned preview lifecycle, harness negative
  tests, gate integration and measured verification. No coverage reduction is intended.
- 2026-10-16: Added per-file-isolated course-unit rounds, owned 4173/4174 previews with strict
  ports and cancellation cleanup, early actual Vitest/Playwright registration checks, gate/CI
  wiring, and scanner/reporter/lifecycle negative tests. Focused route course scope: 23/23
  deliberate failures including the canary, 79 seconds; preparation-unit scope: 33/33, 62
  seconds. Original-bytes and owned-server scans pass in those samples. Full inventory, full
  gate, final evidence-set comparison, and post-change total are verification-phase work.
- 2026-10-16: Added final owned-output scan across cancellation, actual runtime unit registration,
  real Playwright JSON reporter negative tests, and content-free evidence-set comparison invoked
  by the gate. Direct standalone routes retain self-owned strict-port Playwright previews; npm
  standalone commands and CI use the same wrapper as the gate. One full scoped course-unit run
  is in progress; no final gate was launched in this implementation phase.
- `e2e/routeFixtures.ts` already creates and closes a distinct context for zoom journeys and
  closes every protected journey page in `finally`; checkpoint rounds reuse those ownership
  boundaries without modifying them. Ordinary Playwright tests receive a fresh page/context.
  `vitest.config.ts`, `vitest.secret-hygiene.config.ts` and `test/setup.ts` already isolate files
  and restore per-test setup; selecting one course-unit test per file per batch avoids relying
  on shared module state after deliberate failures. No config weakening was necessary.
- The full course-unit scope completed in 435 seconds: 213 cases, 279 independent
  checkpoints and one rejected early canary, with no marker leaks (baseline 515 seconds).
  Final owned-output redaction was also exercised through the focused browser scope.
  The complete route sweep and full gate remain for verification, not this phase.
- Focused implementation checks passed: runtime inventory, six synthetic negative
  harness tests, typecheck, lint, Prettier, 940 normal unit tests, build, zero-clone
  scan and Markdown lint. The revised exact course-unit identity also passed a
  separate Learn scope (11 checkpoints plus canary). Final source inputs have not
  received the authoritative full gate; all its remaining stages and full evidence
  comparison require the distinct verify phase. The 45-minute target is not claimed.
- Compared exact baseline and current registration identity sets: 445 route and
  279 course-unit checkpoints have matching content-free SHA-256 digests in
  `tmp/agent-execution/spec-hygiene-runner-batching/inventory-baseline.log`.
  This does not substitute for final actual failure-evidence reconciliation.
- 2026-10-16 repair: shutdown starts escalation at cancellation and addresses
  detached groups even after their leader exits. The harness now covers success,
  worker failure, actual timeout, INT and TERM with TERM/INT-resistant workers
  and descendants, plus leader-exit cleanup; occupied harness ports fail rather
  than skip. Planted marker proof now uses a real Playwright failure report
  written while live and retained after fixture clearance, rejected by the
  wrapper with parent redaction. Preview readiness matches the built index and
  entry asset bytes, including rejection of unrelated HTML/assets. Browser
  stage annotations are fixed labels; successful browser summaries match the
  wrapper allowlist. Focused harness, typecheck, lint, duplication, formatting,
  build and real-build preview passed. The full gate and final comparison remain
  for the separate verify phase.
- 2026-10-16 repair: fenced every asynchronous preview/worker pre-spawn boundary
  and the successful readiness return against cancellation. New children are
  signalled if cancellation races registration. A delayed, TERM-resistant asset
  response now proves cancellation during a pending readiness fetch does not
  start the second preview or worker, and both ports and the owned descendant
  are released. The focused runner harness passed (9 tests); the full gate is
  reserved for the solver's verification phase.
- 2026-10-16 repair: a later cancellation during the successful worker's
  shutdown or output scan now records its nonzero signal/timeout code without
  rescheduling escalation, and final exit cannot remain zero. A regression
  waits until the owned preview receives TERM from stop(0), then sends INT or
  TERM and confirms the exit code, descendant cleanup, and both released ports.
  The scoped lifecycle harness passed (5 tests); full verification remains
  with the solver.

## Spec Change Log

## Review Triage Log

- Lifecycle review, startup cancellation: medium, patched. A readiness response could return after
  shutdown and allow a second preview spawn. Guards now fence asynchronous startup boundaries;
  delayed-readiness cancellation regression passes and verifies both ports are released.
- Independent coverage review: pass, no findings. Full gate and complete evidence comparison remain pending.
- Lifecycle review, cancellation after worker success: medium, patched. `stop(0)` previously discarded
  later cancellation while cleanup ran. Later nonzero cancellation is now retained and applied to the
  final exit status; INT/TERM-after-success regressions pass, including owned-descendant cleanup.

## Design Notes

One coherent goal: reduce hygiene orchestration overhead without changing evidence semantics.
No unresolved product choices or irreversible actions; footprint spans runner scripts, test adapters,
configs and CI. Playwright may restart workers after deliberate failures, so batching savings must be
measured. Aggregate non-test overhead does not isolate server startup costs. Do not add the same
shared-server savings twice or promise elimination of retained test executions.

## Verification

Final gate: `tmp/agent-execution/spec-hygiene-runner-batching/full-gate.log`, exit 0.
10 harness tests passed with zero skips; 940 ordinary unit tests passed; E2E passed;
445 route and 279 course-unit independent failures reconciled, each with its existing canary.
Evidence hashes match the baseline inventory in `inventory-baseline.log`:

- Route: `27a46ce6c8c17315cb94166b752064326bbe75a5dc8d4de261931334a3aa41cc`.
- Course-unit: `87d812a03cd451fa7d91d98f887b9be44de97d66b3bf6fde75a262409db069c3`.

Measured full gate: 3637 -> 3297 seconds (340 seconds / 9.3% saved).
Hygiene: 2723 -> 2350 seconds; route probes: 2164 -> 1833 seconds;
course-unit probes: 515 -> 462 seconds. E2E: 774 -> 773 seconds.
The 45-minute aspirational target was not reached. No checkpoint coverage deferred.
Approach B remains separate work. Existing non-blocking audit/Trivy findings remain reported by the gate.

- Run harness negative tests, early registry checks, and focused browser/unit batches first.
- Run typecheck, lint and formatting on touched code; preserve zero-clone enforcement.
- Run `./run-all-tests.sh` once at the implementation end; retain content-free timing and evidence
  summaries. A failed gate requires repair and re-verification before completion.
