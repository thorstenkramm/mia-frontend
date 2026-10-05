---
title: 'Session lifecycle, idle warning, expiry shield, and logout'
type: 'feature'
created: '2026-10-05'
status: 'done'
baseline_commit: '5ac8fd78b0da2a9db27c6bf4d780a99a9cf43042'
route: 'dispatch'
story_key: '1-8-session-lifecycle-idle-warning-expiry-shield-logout-bcg-001'
review_loop_iteration: 1
context:
  - '_bmad-output/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The frontend validates but discards session deadlines. It has no idle warning, lifecycle shield,
Continue working, or ordinary Home sign-out action. Shared-device protection is incomplete.

**Approach:** Extend the existing session controller and ordered access gate with deadline-driven warning,
privacy shielding, explicit revalidation, continuation, and authenticated logout under the owner-approved scope below.

## Boundaries & Constraints

**Always:** Server-authored idle and absolute deadlines bound access. Restricted stages have a non-refreshing
lifetime. Warn five minutes before the earlier deadline without moving focus or displaying a countdown. Lifecycle
events shield and mark revalidation needed without network work. Shield synchronously before BFCache capture.
Protected reveal requires fresh ordered authorization. Preserve the accepted reduced stateless logout guarantee:
settle known transitions, observe logout `204`, and independently confirm anonymous state per tab.

**Never:** Replay unsafe requests, refresh idle through ordinary traffic, extend absolute expiry, infer server
cancellation from abort, expose protected identity behind the shield, persist secrets, or imply tutoring-session expiry.
Do not invent missing deadline headers or SSE transport. Broad backend-gap closure requires evidence, not endpoint existence.

**Owner decisions, 2026-10-05:** Approve lifecycle work for existing auth/Home surfaces while broader BCG-001 closure
remains blocked. Align with `mia/docs/api-authentication-and-user-invitation.md` §Session lifecycle and §Error handling.
Only deliberate Continue working refreshes idle expiry; ordinary requests and SSE never do. Warnings follow
server-authored deadlines, never a locally inferred extension. On expiry, shield and permit explicit Refresh to discover
the current stage and reauthorize through the complete gate; a shared session renewed by another tab does not inherently
require fresh credentials. An unknown continuation outcome, including an undeclared `5xx`, shields immediately and
permits only explicit recovery without replay. Correct conflicting frontend wording to these decisions. Missing SSE
transport/header obligations and composite release evidence remain open; this approval does not close BCG-001.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected behavior | Failure handling |
| --- | --- | --- | --- |
| Warning | Within five minutes of earlier deadline | Persistent non-modal warning; Continue and Sign out | Already expired shields |
| Continue | Explicit authenticated activation | One bodyless POST; returned deadlines authoritative | No automatic replay |
| Continue unknown | Lost response, timeout, or server error | Immediate privacy shield | Explicit recovery; no resend |
| Expiry recovery | Explicit Refresh after observed deadline | Discover actual stage; run full gate if authenticated | Failed check stays shielded |
| Tab return | Focus, online, or restored page | Shield, revalidation needed; no request | Explicit recovery only |
| BFCache | pagehide then persisted pageshow | Shield before capture and through restore | No protected first paint |
| Logout | Explicit sign-out | Existing quiescence and independent confirmation | Failure retains shield |
| Late transition | Auth transition arrives after logout | Fence result and withdraw confirmation | Explicit reconciliation |

</frozen-after-approval>

## Code Map

- `src/platform/api/entry.ts:13-185` — currently discards validated deadline strings; retain validated instants and
  add continuation using `mia/api-doc/paths/auth.yaml` session-continuation contract. Backend is read-only.
- `src/platform/session/sessionController.ts` — existing epoch fencing, shared/exclusive request coordination,
  fresh CSRF, capability ordering, and logout reconciliation; extend this owner rather than introduce a second controller.
- `src/platform/session/SessionProvider.tsx` — controller lifetime and actions; integrate lifecycle observation.
- `src/platform/data/EntryDataProvider.tsx` — automatic refetch already disabled; connect security teardown to cache purge.
- `src/app/App.tsx`, `src/app/routes/entryRoutes.tsx` — neutral gates, route dispatch, and focused entry surfaces.
- `src/features/auth/LogoutEntryRoute.tsx`, `src/features/home/HomeEntryRoute.tsx` — reuse logout phases; add Home sign-out.
- `src/platform/i18n/messages.ts`, `src/platform/i18n/catalogs/*.json` — all seven locales.
- `src/platform/api/entry.test.ts`, `src/platform/session/sessionController.test.ts`, `src/app/App.test.tsx`,
  `e2e/scaffold.spec.ts` — protocol, state, rendering, clock, cross-tab, and browser evidence.

## Tasks & Acceptance

**Execution:**
- [x] Reconcile approved answers in `BACKEND-CONTRACT-GAPS.md`, `FRONTEND-STATE-MACHINES.md`, `EXPERIENCE.md`,
  `FRONTEND-PRD-FOUNDATION.md`, `SECURITY-PRIVACY-ACCEPTANCE.md`, and affected architecture/epic activity wording.
- [x] `entry.ts` and transport tests — preserve deadlines and validate continuation without guessed metadata.
- [x] Session controller, providers, and tests — implement warning, shielding, explicit recovery, and authenticated logout.
- [x] App/routes/features and catalogs — bind exact Tailwind Plus warning/shield blueprints before writing UI.
- [x] Existing test suites — cover the matrix and approved decisions, including delayed responses and no replay.

**Acceptance Criteria:**
- Given an active session, when background/lifecycle activity occurs, then no continuation is sent and neither
  authoritative deadline is extended locally.
- Given a deadline or lifecycle shield, when protected UI would render, then content, title, caches, and focus remain
  neutral until the approved recovery and ordered gate succeed.
- Given logout races across tabs, when delayed authentication responses arrive, then no protected content is restored
  automatically and sign-out confirmation follows the reduced guarantee.
- Given each lifecycle surface, when used keyboard-only across locales, text sizes, and zoom, then actions and
  announcements remain accessible and no protected data leaks into browser artifacts.

## Implementation Notes

- Retained validated deadline instants at the transport boundary. Continuation is a single bodyless POST with
  dispatch-time CSRF; its response must retain the account and absolute deadline. Proven not-sent failures retain the
  warning and explicit Retry Continue; denied or ambiguous dispatched outcomes shield without replay or automatic discovery.
- The existing controller owns the local deadline watchdog, warning, continuation admission, privacy state, and explicit
  full-gate recovery. Providers synchronously flush lifecycle shielding on pagehide and purge the query cache before
  notifying UI subscribers. Home uses the existing quiescing/logout confirmation owner.
- Warning binding: Tailwind Plus `Application UI > Feedback > Alerts > With actions`, `v4/react-light.jsx`, library
  `2026-09-13-083323`; warning colors/icon, wrapped actions, and the existing announcement owner.
  Shield binding: the existing `SimpleEntrySurface` / `Simple card` blueprint plus `Secondary buttons`, same version.
- Added clock-controlled controller and rendering tests plus real-HTTP browser lifecycle coverage in
  `e2e/sessionLifecycle.spec.ts`. BFCache evidence uses bundled full Chromium with only its BFCache-disabling default
  argument removed; it asserts actual persisted restoration, neutral pagehide capture, and neutral first restored frame.
- Historical fixed-date fixtures now use an explicit clock baseline rather than the machine's calendar date.
- Review repair 1: added both Stop waiting paths, queued/late-result fencing without releasing a dispatched continuation's
  logout lease, cumulative monotonic elapsed time preserved through explicit recovery, and capability-detected network
  change observation with listener teardown. Recovery keeps its neutral checking shield through the capability gate.
- Anonymous pagehide now synchronously unmounts credential forms and drops reset/invitation tokens. Actual Chromium
  BFCache tests populate and reveal credentials on login/reset/invitation surfaces, then assert neutral capture and the
  first restored frame using only boolean evidence. Refresh never restores those secrets or re-previews a lost token.
- Added localized failure/success feedback, polite warning and urgent deadline announcements, focus-preserving pending
  actions, and conditional stable-heading focus after successful continuation removes a focused warning action.

## Spec Change Log

### 2026-10-05 — Review repair 1

The first derivation omitted applicable state-machine 24 transitions and anonymous credential teardown. Re-derive
the code with the implementation requirements below; the frozen owner-approved intent is unchanged.

KEEP: exact bodyless continuation with fresh CSRF and no unsafe replay; response account/absolute-deadline checks;
existing logout quiescence/late-response fencing; full-gate explicit recovery; non-modal warning; all seven locales;
real HTTP BFCache evidence, actual browser zoom, and deterministic boundary tests. The first implementation diff is
available for reference at the harness temp file `story-1-8-review.patch`; it is not an alternative contract.

Required refinements to Code Map and execution:
- `sessionController.ts`: distinguish pre-dispatch failure, dispatched unknown outcome, pending continuation, and
  explicit recovery; retain Retry Continue for a proven not-sent attempt while its original deadline permits it.
  Expose Stop waiting for pending continuation and recovery. Stopping fences late results and queued dispatch,
  never implies server cancellation, and does not bypass logout quiescence. Definitive denial hides protected state
  and follows authoritative stage reconciliation; do not infer an actual stage solely from a 403 name.
- `SessionProvider.tsx` and link/credential owners: pagehide must synchronously clear mounted anonymous credentials
  and ephemeral reset/invitation tokens as well as protected Home. A neutral shield is allowed without any automatic
  request; subsequent recovery follows current stage without restoring secrets. Preserve non-expiring tutoring semantics.
- `sessionController.ts`: measure cumulative elapsed time with a monotonic anchor as well as wall time. Incremental
  backward wall adjustments must never postpone the already observed deadline. Add aligned clock tests proving this.
- `SessionProvider.tsx`: subscribe to the browser's network-change signal when available; teardown listener on unmount.
  Network changes remain notification-only and cause no request. Do not fabricate support where the API is absent.
- `SessionLifecycle.tsx`: localized visible and announced error feedback for protocol/transport/HTTP failure, including
  distinct unknown continuation versus failed recovery. Keep escaped raw HTTP details supplemental and unannounced.
  Preserve pending-button keyboard focus; provide Stop waiting; when successful continuation removes a focused warning
  action, restore a stable existing heading/control and announce success. Never steal focus on ordinary warning arrival.
- `SessionLifecycle.tsx` and tests: assert polite warning text with an empty assertive region, and urgent announcement
  for corrected/reached deadlines. Test success and failure feedback, pre-dispatch retry, both Stop waiting paths,
  queued and late continuation fencing, supported network change, incremental rollback, and actual BFCache with
  populated/revealed anonymous credentials using secret-safe boolean evidence and no captured artifacts.
- Planning contracts: finish the state-machine Continue error wording reconciliation; keep unknown recovery explicit.
  Repository agent-rule mismatches are deferred, not silently edited by this product change.

## Review repair evidence

First derivation passed 390 unit/integration tests and 81 browser tests, but the review demonstrated missing transitions
and privacy coverage. Those counts are historical, not completion evidence for the revised implementation.

## Review Triage Log

### 2026-10-05 — Pass 1

14 findings: high 3, medium 9, false 1, defer-medium 1 (the latter is included among medium verdicts: medium total 10).
All implementation groups route to bad_spec for coherent re-derivation; positive KEEP instructions are above.

- B1 [medium] [bad_spec] Non-HTTP failure is invisible: `TechnicalErrorDisclosure` returns null for transport/protocol,
  and no localized failure paragraph exists. Add explicit status feedback.
- B2 [medium] [bad_spec] Pending continuation/recovery lacks Stop waiting required by machine 24; disabled primary
  actions alone cannot express cancellation of waiting or fence queued attempts.
- B3 [medium] [bad_spec] Proven not-sent continuation errors enter the same shield as ambiguous dispatch; track dispatch
  and preserve the specified retryable warning while deadlines remain valid.
- B4 [false] [reject] Definitive denial should directly route to sign-in: the backend guide requires stage discovery
  and says not to infer the stage from a restricted-error name. Explicit shielded reconciliation is intentional.
- B5 [medium] [bad_spec] Successful continuation removes the focused button without fallback; Home's stable h1 does
  not remount. Add conditional fallback focus and success announcement.
- B6 [high] [bad_spec] Incremental backward clock changes escape successive wall-sample checks; independent elapsed
  anchoring must prevent extending observed lifetime.
- B7 [medium] [bad_spec] Network-change listener absent; existing online/focus listeners cannot observe every
  supported network-change event. Add notification-only capability-detected subscription and test.
- B8 [high] [bad_spec] Anonymous pagehide returns before credential unmount; populated login/reset/invitation controls
  can remain in BFCache. Extend synchronous teardown to these existing surfaces.
- B9 [medium] [bad_spec] Deadline shield lacks urgent announcement; focus alone does not supply the required live status.
- B10 [medium] [defer] Existing agent rules retain older activity/retry wording. Defer agent-file changes per workflow;
  correct the directly affected product state-machine Continue error row during re-derivation.
- E1 [medium] [bad_spec] Transport/protocol recovery feedback absent — same root and fix as B1, retained as a separate finding.
- E2 [medium] [bad_spec] Successful keyboard continuation loses focus — same root and fix as B5.
- E3 [high] [bad_spec] Anonymous credential BFCache claim unsupported — same root and fix as B8.
- V1 [medium] [bad_spec] Warning announcement untested at rendered surface; add polite/assertive/focus assertions
  to the existing clock-driven browser test so deleting the announcer call fails the test.

### 2026-10-05 — Pass 2

Re-derived code reviewed with all three layers. No intent_gap or bad_spec entries; every survivor is a localized
correction within the approved contract and routes to patch. Product-owner blanket approval (2026-10-05) covers the
recommendations recorded below.

- B2-1 [medium] [defer] Client/server clock skew is unhandled. Real, but no contracted server-time source exists;
  correcting it would guess transport. Deferred to BCG-001.
- B2-2 [low] [reject] Forward-then-backward clock correction can keep the elapsed anchor ahead until reload. Rare,
  fails closed, and the fix would weaken the Pass 1 rollback guarantee.
- B2-3 [medium] [patch] When the absolute deadline governs, the warning offers Continue working, and success is then
  announced while the unchanged warning remains. Continue cannot move the absolute deadline. Show the warning
  with Sign out only and with copy saying the sign-in cannot be extended.
- B2-4 [medium] [patch] The anonymous pagehide shield renders Sign out. Activating it sends logout from a tab that was
  never signed in. Record anonymous origin and omit Sign out there.
- B2-5 [high] [patch] `focus`, `online`, `visibilitychange`, and network changes shield MFA, password-change,
  in-flight login, and link interstitials. Switching to an authenticator or password manager destroys typed input.
  Machine 9 covers protected content only. Non-pagehide signals now shield only authenticated protected content;
  other stages just recheck their deadline locally. Pagehide behavior is unchanged.
- B2-6 [false] [reject] "Restricted stages lack a warning." The Accessibility timer inventory lists the restricted
  30-minute timer as an essential, non-refreshing security timer that ends in a shield with explicit Refresh.
- B2-7 [medium] [patch] Machines 9 and 24 still list Continue working as an action on the shield. `EXPERIENCE.md` and
  machine 24 still describe a "local baseline". Recommendation: the shield offers Refresh and Sign out, and Continue
  working exists only while the warning is shown. Reconcile the wording to that.
- B2-8 [low] [patch] Undeclared 4xx responses to continuation are shown as "denied". Only the declared 401, 403, and
  406 responses are definitive denials. Treat every other status as an unknown outcome.
- B2-9 [low] [reject] The controller assigns `document.title` itself. This is an intentional pre-capture fallback
  before React's title effect runs. No divergence is demonstrated.
- B2-10 [medium] [patch] The lifecycle components call the shared announcer's `clear()` on unrelated mounts and
  transitions, wiping other flows' announcements. The warning is also re-announced on `Continue dispatching`. Clear
  only an announcement this component made, and announce the warning only when entering `Warning due`.
- B2-11 [low] [reject] A double notification in the `runContinuation` catch. The final state re-announces, so there is
  no observable harm.
- B2-12 [low] [patch] Locale meaning drifts from en-US in `unknown`, `succeeded`, and `denied` (es, fr, pt). Align the
  meaning.
- B2-13 [low] [reject] Unit tests use a frozen `Date` with a real `performance` clock. The flake risk needs a stall over
  2 s; it is not demonstrated.
- B2-14 [low] [reject] Fixture port duplication and a fixture catch-to-500. Playwright owns the port, and a 500 still
  surfaces as a failure.
- B2-15 [low] [reject] Ephemeral evidence identifiers and duplicated decision prose. The fix edits this spec or the
  planning docs only, with no named harm.
- B2-16 [medium] [defer] The direct application type check still reports 16 pre-existing errors in touched files.
  They are not introduced by this change.
- B2-17 [low] [reject] Assorted optional extra tests: initiator, non-persisted pageshow, long tasks.
- E2-1 [high] [patch] Lifecycle signals fence an in-flight login while it is Rotating. Same root cause and fix as B2-5.
- E2-2/E2-3/E2-4 [false/low/low] [reject] Duplicates of B2-1, B2-2, and B2-13.
- E2-5 [medium] [patch] When continuation settles while Stop waiting has focus, focus drops to the body. Move focus to
  Continue working if it still exists, otherwise to the Home h1.
- E2-6 [medium] [patch] When shield recovery settles while Stop waiting has focus, focus drops to the body. Move focus
  to Refresh.
- E2-7 [low] [reject] Stopping a queued, unsent continuation reports an unknown outcome. This fails safe, and fixing it
  needs extra state.
- E2-8 [medium] [patch] The warning is re-announced on `Continue dispatching`. Same root cause and fix as B2-10.
- E2-9 [low] [reject] Access deferred has no warning. It is a brief link interstitial, and its expiry fails closed.
- V2-1 [medium] [patch] Continuation responses with a different account id are not tested.
- V2-2 [medium] [patch] Clicking Home Sign out is not tested.
- V2-3 [medium] [patch] The logout scope of a receiving authenticated tab, and its retry, is not tested.
- V2-4 [medium] [patch] The shield guards for anonymous states and in-flight logout are not tested.
- V2-5 [medium] [patch] A capability failure during explicit recovery is not tested.

## Design Notes

One cohesive shared-device session goal spans transport, controller, UI, and browser tests. No irreversible repository
operation, deployment, or live account mutation is required. Runtime continuation/logout are deliberately activated
side effects. Existing Story 1-7 link flows and logout ordering must retain their tests and behavior.

## Verification

Pass 2 patch gate, 2026-10-05: `./run-all-tests.sh` passed. It ran 419 unit and integration tests and 88 Chromium
tests. Trivy was skipped because it is not installed. The direct application type check still reports the same 16
pre-existing errors.


Review-repair automated gate, 2026-10-05: `./run-all-tests.sh` completed successfully with **Trivy skipped (not installed)**.
It ran the prescribed npm typecheck, lint, format check, **402 passing unit/integration tests**, build, bundle-size,
seven-catalog validation, OpenAPI type consistency, **88 passing Chromium browser tests**, deliberate-failure secret
hygiene, duplication balance/detection (zero clones), npm audit (zero vulnerabilities), Tailwind catalog, and Markdown lint.
The full-gate output is retained in the harness shell result `sh_10b846d520010JwywhCQfXxuV0`.
An earlier full-gate attempt hit the tool's 240-second timeout during browser tests; the recorded completed run used no
command timeout. No components other than Trivy were skipped.

`npx tsc -p tsconfig.app.json --noEmit` still fails on **16 pre-existing errors**, compared with the specified 19-error
baseline; none were introduced. Remaining locations: `App.test.tsx`, `MfaVerificationForm.tsx`, `api/client.ts`,
`passwordResetLink.test.ts`, `sessionController.test.ts`, and the existing cookie/error-narrowing helpers in
`sessionController.ts`. The solution-level npm command does not expose these errors. The final direct app check is
retained in harness shell result `sh_10b8d0c4d001mnnicgmsxJAJz1`.

Matrix coverage is in the existing controller/App suites and `e2e/sessionLifecycle.spec.ts`:
warning/Continue/unknown outcome use the clock and single-dispatch tests; expiry recovery uses renewed authoritative
deadlines after local expiry; lifecycle return uses synchronous DOM/cache/title checks; BFCache uses an actual persisted
restoration; logout and late transition retain the existing cross-tab barrier tests and add delayed continuation fencing.
Browser accessibility coverage includes seven locales, three text modes, direct 320px reflow, real 200%/400% browser
zoom, text-spacing overrides, forced colors, reduced motion, keyboard order/focus, and axe scans.

Environment: Node 24.21.0, React 19.3.0, Vitest 5.0.1, Playwright 1.63.0, bundled Chromium 153.0.8010.12
(revision 1243), axe-core 4.13.0. Automatic trace/video/screenshot capture is disabled for these auth tests.
Manual Safari and assistive-technology evidence remains a release obligation; this implementation does not close BCG-001.

- `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, and `./run-all-tests.sh`.
- Also run `npx tsc -p tsconfig.app.json --noEmit`; baseline has 19 existing errors masked by the solution script.
  Require no introduced errors and report existing failures honestly.
- Clock-controlled protocol and browser tests must establish lifecycle silence, boundary shielding, continuation,
  cross-tab logout races, and actual BFCache pre-paint protection. Manual Safari/AT evidence remains a release obligation.
