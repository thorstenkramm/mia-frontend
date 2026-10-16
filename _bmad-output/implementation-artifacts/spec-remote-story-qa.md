---
title: Remote story QA with macOS epic and GitHub gates
type: chore
created: '2026-10-16'
status: in-progress
baseline_commit: d83855b967118aaf0c2e8ba7713354bf37e87d21
route: dispatch
review_loop_iteration: 0
context:
  - tmp/improve-tests.md
  - .opencode/story-execution.md
  - .agents/rules/testing.md
  - .agents/rules/techstack.md
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

Execute chapter 8: after affected local verification and review, queue full E2E against an immutable
commit on Ubuntu while development of the next story proceeds. QA pending is not done. QA failure
requires repair and a new verified commit. Full complete-matrix E2E must pass on macOS before epic
completion or any GitHub push; Ubuntu results cannot substitute for it.

## Boundaries & Constraints

**Always:** Preserve synthetic fixtures, provider isolation and all application assertions. Run complete
presentation matrices remotely. Keep actual browser zoom and extension behavior. One remote suite at a
time initially. Record exact revision, environment, check selection, status, duration and logs. Retain
local execution. A push is not a passing job. MacOS evidence covers the exact outgoing revision.

**Never:** Push to GitHub, skip or weaken Linux-incompatible tests to claim a full pass, run production
providers, overwrite existing server hooks or install a general CI platform. No nightly scheduling.
The owner authorizes private-remote setup and dispatch and root SSH for system dependency installation.
Run QA jobs as `git`, not root. Preserve existing repository contents and unrelated server services.

## I/O & Edge-Case Matrix

| Situation | Required behavior |
| --- | --- |
| Review passes | Commit, enqueue exact SHA, QA pending; next story may start |
| Two pushes | Isolated FIFO jobs, one suite, correctly attributed results |
| Failed enqueue or missing receipt | Visible failure, never imply QA started/passed |
| Test failure or interrupted job | Failed/canceled status, useful logs, owned cleanup |
| Older QA success | Cannot complete a newer revision |
| GitHub push without matching macOS pass | Local push guard refuses |
| Private QA push | Allowed before macOS verification |

</frozen-after-approval>

## Code Map

- `scripts/owned-preview.mjs`, `playwright.config.ts`, zoom helpers in `e2e/routeFixtures.ts`,
  `e2e/scaffold.spec.ts`, `e2e/sessionLifecycle.spec.ts`: reusable full-Chromium headless extension path.
- `AGENTS.md`, testing/techstack rules, `.opencode/story-execution.md`, `.opencode/agents/epic-*.md`:
  current synchronous/macOS-only policy and orchestration. Solver owns tracking writes.
- `_bmad/custom/bmad-{build,build-auto,code-review}.toml`: customization owners; use customization
  workflow rather than edit generated skills. Preserve source-of-truth execution-policy references.
- Planning UX contracts: `ACCESSIBILITY-ACCEPTANCE.md`, `FRONTEND-PRD-FOUNDATION.md`, `EXPERIENCE.md`:
  reconcile platform policy, preserving actual Safari/manual release evidence.
- `run-all-tests.sh`, `scripts/check-browser-gate.sh`, `package.json`, `.github/workflows/checks.yml`:
  preserve complete default gate; explicitly expose affected-browser verification where necessary.

## Tasks & Acceptance

**Execution:**

- [ ] `.localgit/post-receive`, `.localgit/qa-worker.sh`, `.localgit/post-receive-run.sh`: implement
  small private queue at `~/.local/share/mia-qa`, existing bare `~/mia-frontend.git`, SHA-named QA refs,
  atomic receipts, background `at` dispatch and blocking `flock` FIFO drain. Isolated checkout per commit,
  lockfile install, one Playwright worker, full matrix. Retain private results; clean owned workspaces.
- [ ] `scripts/remote-qa.sh`: enqueue/status/logs and bounded wait. Add private `qa` remote only if
  absent or matching. Validate immutable receipt after push; a failing post-receive cannot undo acceptance.
- [x] Provision and smoke-test full bundled Chromium plus Linux libraries as authorized. Existing fixtures
  are headless; do not introduce Xvfb unless evidence requires headed execution. Test real zoom first.
- [ ] `.opencode/agents/epic-qa.md` and existing orchestration: QA agent only dispatches/retrieves results,
  no application edits; solver records QA pending/failed/completed and exact revision. Reconcile reviewer
  focused-check permission and local non-browser obligations. Update sprint status vocabulary and BMAD
  customizations without prematurely marking a real story done.
- [ ] `scripts/verify-macos-e2e.sh`, `.localgit/pre-push`: exact-commit isolated macOS full E2E verification,
  untracked evidence receipt and normal-workflow push enforcement for GitHub destinations, including tags
  and direct URLs. Preserve existing hooks if discovered; exempt the actual private QA destination.
- [x] Reconcile platform/cadence rules and planning contracts; keep macOS CI, use full matrices there.
  README documents install, dispatch, result retrieval, failure handling and manual release obligations.
- [ ] Test queue race/failure/cleanup and push guard meaningfully; deploy private runner; run actual Ubuntu
  full E2E and revised local checks sequentially. Record timings and failures, not theoretical speedups.

**Acceptance Criteria:**

- Given two accepted commits, when dispatched remotely, then jobs run against those exact commits after
  SSH disconnect, one at a time; results identify each SHA and failures remain visible.
- Given review approval, when next-story work starts, then previous QA remains independently tracked;
  missing, canceled or failed jobs never count as done.
- Given complete Ubuntu execution, when reported passed, then all full-matrix tests ran including zoom
  and lifecycle; unprovided non-E2E inputs are explicitly outside its result, never silently passed.
- Given epic completion or GitHub push, when macOS full-matrix evidence is absent/stale, then workflow
  refuses completion/push. Matching successful evidence is reusable for unchanged commits.

## Implementation Notes

- Root SSH verified with non-interactive authentication; UID 0, apt-get, Node and npm available.
  No packages installed yet. Owner authorized root for provisioning; QA execution remains under `git`.

## Spec Change Log

- Implementation block 1: added private SHA-ref queue hook, serial `at`/`flock` worker, isolated checkout runner and
  receipt/status/log CLI. Installed owned hooks in previously hook-free private bare repository; no GitHub push.
- Implementation block 2: added exact-commit macOS verifier and GitHub pre-push guard, installed local hook only after
  confirming no existing active pre-push hook. Reconciled local/remote cadence in rules, planning, CI, agents and README.
  Sprint tracker **values** and execution checkpoint remain solver-owned; vocabulary update remains for solver.
- Implementation block 3: root-authorized Chromium Linux dependencies installed; bundled Chromium installed as `git`.
  Actual Ubuntu 200% browser zoom smoke passed (one test, headless extension, no Xvfb execution). A complete-matrix
  Ubuntu test on the baseline snapshot was launched independently of the private queue; it does not prove the
  post-commit dispatch until an immutable commit containing the tracked runner exists. Preliminary archive-only build
  lacked a Git HEAD, so build identification correctly rejected it; a baseline Git bundle supplied the exact HEAD.
- Implementation block 4: extracted an owned-session `qa-job.sh` for bounded fetch/install/E2E and signal cleanup,
  retained serial queue attribution and added queue/execution durations. Added a synthetic, private controlled queue
  harness under `tmp/agent-execution/spec-remote-story-qa/` for the two-ref, failed-dispatch and interruption checks;
  execution is deferred until the one currently running complete-matrix Ubuntu suite exits (no overlapping tests).
  Shell syntax, ShellCheck, Markdown lint and formatting checks passed; final local gate is a separate verify phase.
- Implementation block 5: added a private `update` hook so SHA-named QA refs cannot be rewritten or deleted, and
  deployed it only after confirming the server had no existing update hook. The enqueue CLI now validates both fetch
  and push URLs before reusing `qa`. Added a push-guard dry-run harness for missing/stale/matching receipts and the
  actual private exemption. These smoke harnesses remain to be executed after the remote full suite completes.
- Implementation block 6: added explicit `--affected-e2e` local mode to the existing gate: complete non-browser stages,
  an explicit spec/optional grep, positive selected-test count and browser forwarding against the one build. Bare
  invocation remains complete. Reconciled rules/agents/README and solver-authorized sprint **vocabulary only**, not
  real story status. Reviewer remains read-only and requests worker reproductions.
- Implementation block 7: added explicit dispatch-only recovery without ref rewrite, macOS verifier-owned process
  cancellation, and a bounded Ubuntu worker TERM grace period before owned group escalation. Expanded smoke harness
  for SSH-disconnected FIFO, ref immutability, failed dispatch and recovery, failed test, descendants and cleanup.
  These runtime checks remain pending until the already running baseline Ubuntu full suite exits.
- Focused local input checks: invalid affected spec exits 2, zero-match affected grep exits nonzero before build; Bash
  syntax, ShellCheck, lint of the macOS ownership runner and formatting passed. Positive `--list` registration selects
  one browser test; both singular and plural Playwright totals are parsed. The real affected gate and full local
  verification remain solver-side; an explicit browser selection/count is required, not inferred from these checks.
- Review repair block: the Ubuntu worker checks cancellation both before launch and immediately after PID assignment;
  timeout now awaits its direct preview owner plus a bounded process-group drain before cleanup and next job. The
  committed runner execs owned-preview as timeout's direct child. The macOS verifier loads its ownership helper only
  from the isolated requested commit and fails closed if absent. Tracked targeted harnesses under `.localgit/` and
  `scripts/` replace the ignored-only smoke scripts and generate synthetic preview/port fixtures themselves. Runtime
  regressions still await the existing Ubuntu full baseline exit; no second suite was started.
- Timeout escalation cannot prove detached cleanup after forced SIGKILL; that path now records
  `reason=cleanup-unconfirmed`, retains the owned workspace and halts subsequent jobs behind a private marker rather
  than risking an inherited listener. The owner must inspect before clearing that marker. The deterministic
  pre-assignment FIFO regression and delayed detached-listener timeout regression are tracked in `.localgit/qa-smoke.sh`.
- Review repair follow-up: first remote smoke attempt exposed inherited `GIT_DIR` from the bare push hook; worker/job
  now unset only Git's repository-local environment before isolated checkout. A later smoke attempt exposed a
  non-executable synthetic `at` stub, so the tracked harness now makes that stub executable. The final two-phase
  SSH-disconnected queue run passed FIFO, attribution, failed dispatch/recovery, pre-assignment TERM, delayed detached
  teardown/port handoff, failure logs and cleanup. A separate forced-kill regression passed the quarantine boundary.
  Local push-guard and exact-commit helper absence/macOS cancellation smoke tests passed. Ubuntu baseline full matrix
  exited 0 with 352 tests in 38.6 minutes; it is baseline smoke evidence, **not** a post-commit QA pass.
- Review repair follow-up, pre-session handoff: TERM can arrive after `$!` but before `setsid` establishes the owned
  session. The worker now checks the direct child's parent/start identity and only signals a group while that same
  child is its session leader; otherwise it stops the exact direct PID. An interrupted wait is followed by bounded
  owned-child/group drain and reaping before checkout removal; unconfirmed cleanup quarantines the queue. The tracked
  synthetic `setsid` shim holds the direct child before session establishment and ignores TERM: focused Ubuntu queue,
  pre-spawn, held pre-session TERM/no-late-listener, delayed timeout and forced-kill quarantine regressions passed
  against the final candidate, without running the browser suite or creating a commit.
- Post-commit Ubuntu QA diagnosis/repair: actual queued revision `48d9333ae94336b819fa3627ef4620bedec58938`
  failed (258 passed, 94 failed, 22.6 minutes); many browser exits contained Chromium
  `FATAL:dbus/bus.cc:1245` while direct-SSH baseline had passed. The host has `dbus-run-session` and `dbus-daemon`;
  an SSH login exports `DBUS_SESSION_BUS_ADDRESS` and `XDG_RUNTIME_DIR`, but its user bus service is inactive.
  The runner now starts the browser owner inside a private D-Bus session with a job-owned XDG runtime directory,
  isolating it from the transient login bus. The D-Bus wrapper stays inside the timeout-owned process group and waits
  for the browser owner, so detached-preview cleanup still precedes worker release. Worker preserves Playwright
  `test-results` from failed jobs under private SHA-attributed results before removing the checkout; a retention
  failure quarantines its workspace. A two-phase at/SSH-disconnect smoke and a synthetic failure-artifact regression
  were added. The first queue fixture failed because it did not stage the new helper, and the first at fixture did
  not run because `at -f` invokes `/bin/sh` regardless of the file's Bash shebang; both harness defects were fixed.
  After correction, synthetic queue/FIFO/recovery/timeout and failure-artifact retention passed. An `at` job inherited
  deliberately invalid session bus/runtime values, ran after SSH disconnect, verified its private bus after 25 seconds,
  and passed one real Chromium actual-200%-zoom browser test. TERM of the job-owned D-Bus/preview group also cleaned
  the owned worker and port. This is focused evidence only, not a re-run or pass of the failed committed full matrix.
  No assertions were weakened; the original failed receipt/log remain unchanged.

## Review Triage Log

- Pre-assignment TERM could spawn after cancellation: fixed with pre/post-PID guards and deterministic FIFO signal
  test; no child launched, canceled status/log and workspace cleanup verified.
- Timeout could release the queue before detached preview teardown: the committed runner now execs preview ownership
  directly under `timeout`; worker waits boundedly for its owned group. Delayed detached listener teardown passed before
  the next job's port assertion. Hard-kill cleanup remains explicitly unconfirmed, quarantines subsequent work and
  preserves the workspace; its focused regression passed.
- macOS helper came from mutable worktree: now read only from exact checked-out revision. Prior commit lacking it fails
  before execution even when current worktree has it; synthetic helper-commit cancellation has no port leak or receipt.
- Ignored smoke harness depended on an undeclared prior checkout: replaced with tracked, self-contained synthetic
  fixtures; two SSH sessions prove background completion after disconnect. Failed initial Git-environment and stub
  permission cases were root-caused and repaired without weakening tests.
- Post-PID/pre-`setsid` TERM could miss the not-yet-existent group and release the workspace while the child later
  launched. Fixed by signaling only the owned direct PID before the isolated session exists and confirming termination
  (or quarantining uncertain cleanup) before advancing. The paused shim regression passed with no late job, listener,
  lock release or checkout removal while the shim still ran; prior pre-spawn and timeout regressions still passed.
- Queued QA crash: inherited transient SSH session-bus environment was allowed into asynchronous Chromium.
  The private job-scoped D-Bus and runtime boundary replaces that inheritance. Focused disconnected-at Chromium
  zoom and canceled-group cleanup passed. The failed commit remains failed; only a later new commit and full queued
  QA job can close it. The original missing `test-results` cannot be reconstructed; the runner now retains them for
  any subsequent failed job without reading or scanning fixture bodies.

## Verification

- Final local affected verification passed: `./run-all-tests.sh --affected-e2e e2e/scaffold.spec.ts
  e2e/sessionLifecycle.spec.ts e2e/routeNavigation.spec.ts`; 110 selected E2E tests and 940 unit tests
  passed, all non-browser gate stages executed, 786 seconds total. Evidence: `local-gate.log` and
  `local-gate.exit` under this spec's evidence directory.
- Independent broad review passed. Lifecycle review findings were repaired and exercised with deterministic
  pre-spawn/pre-setsid cancellation, delayed teardown and exact-commit helper isolation checks.
- Baseline Ubuntu complete matrix passed 352 tests in 38.6 minutes at the preceding commit; this is
  compatibility evidence, not the final runner's post-commit QA. Actual queued committed revision and
  exact-commit macOS evidence remain pending. Commit is authorized to enable those immutable checks.

Implementation/fix focused evidence (not the final local gate): Ubuntu baseline SHA
`d83855b967118aaf0c2e8ba7713354bf37e87d21` complete-matrix E2E passed 352/352 in 38.6 minutes, exit 0,
`tmp/remote-qa-full-e2e.log` and `.exit`. Actual 200% zoom passed before the complete run. The baseline run used an
isolated snapshot; it is not commit-scoped QA for this uncommitted runner.

Tracked controlled regressions: `.localgit/qa-smoke.sh` two-phase SSH-disconnected enqueue/inspect passed after fixing
an inherited Git bare-environment failure and an unexecutable synthetic `at` stub. The final run covered two FIFO
commits, immutable refs, dispatch failure and explicit recovery, pre-assignment TERM, timeout with two-second delayed
detached-listener teardown before the next job, and useful failed-job logs; private results remain under
`~/.local/share/mia-qa/smoke-queue.J8noBD` on the Ubuntu host. Separate forced SIGKILL test passed the
cleanup-unconfirmed quarantine with the owned workspace retained. Local `scripts/qa-push-guard-smoke.sh` passed
missing/stale/alias/tag/private destinations; `scripts/qa-macos-cancel-smoke.sh` passed helper absence at an older
revision and TERM cleanup without a port leak or success receipt. Logs and exit summaries are in
`tmp/agent-execution/spec-remote-story-qa/`.

ShellCheck, Bash syntax, README Markdown lint and whitespace checks passed for touched files. The complete local gate
and an exact committed revision macOS full-matrix run are solver-side follow-up; no story commit or GitHub push was made.

Final post-handoff repair evidence: focused ShellCheck, Bash syntax and diff whitespace passed; the Ubuntu synthetic
queue's enqueue/inspect, held pre-session `setsid` handoff and hard-timeout quarantine phases each passed on the final
worker. Content-free check summary and individual results are under `tmp/agent-execution/spec-remote-story-qa/`;
no full application gate was run in this fix phase.

Post-commit D-Bus repair focused checks (no full suite): remote `dbus-run-session` and `dbus-daemon` already installed;
after setup-harness fixes, `.localgit/qa-smoke.sh` passed FIFO, dispatch recovery, pre-spawn cancellation, timeout
teardown and synthetic error-context retention. `.localgit/qa-browser-smoke.sh` prepared an isolated checkout from
the failed SHA and queued a job through `at` that inherited a deliberately dead session bus, after SSH disconnect.
The helper replaced it with a job-owned bus/runtime, checked its bus after 25 seconds, and a selected actual 200%
Chromium zoom spec passed (one test). The focused D-Bus/preview TERM smoke passed group, worker and port cleanup.
The worker's synthetic failed job retained `test-results/error-context.md` under its SHA result path (private directory
mode 700, file mode 600), with status `artifacts=` and workspace removed; the prior failed committed receipt/status/log
remain failed and unchanged. The tested browser-smoke harness accepts an exact SHA argument rather than pinning one
revision. Its command/result logs are in `tmp/agent-execution/spec-remote-story-qa/dbus-*-final.log` and the focused
queue evidence under `dbus-queue-*.log`.
No installed package was needed, no full suite was run, no commit or GitHub push was made in this repair phase.

Inspect server setup before modifying it. Verify enqueue failure, two-job serialization, interrupted-worker
cleanup and result attribution with bounded controlled jobs; avoid expensive repeated full suites.
Run actual full Ubuntu E2E after zoom smoke tests, then the applicable local gate and exact-commit macOS
full matrix sequentially. No GitHub push is required to test its hook. Keep evidence under
`tmp/agent-execution/spec-remote-story-qa/`. Report queue time separately from execution time.
