---
title: 'Password sign-in with restricted-stage isolation'
type: 'feature'
created: '2026-09-30'
status: 'done'
baseline_revision: '12751afedd1009e93129ea345553ce4ced107cbf'
review_loop_iteration: 3
followup_review_recommended: false
context:
  - '_bmad-output/planning-artifacts/ux-designs/ux-mia-frontend-2026-09-12/FRONTEND-STATE-MACHINES.md'
  - '_bmad-output/planning-artifacts/ux-designs/ux-mia-frontend-2026-09-12/ACCESSIBILITY-ACCEPTANCE.md'
  - '_bmad-output/planning-artifacts/ux-designs/ux-mia-frontend-2026-09-12/SECURITY-PRIVACY-ACCEPTANCE.md'
warnings: [oversized]
deferred: []
---

<intent-contract>

<frozen-after-approval reason="owner-approved documentation alignment, 2026-09-30">

## Intent

Align password sign-in with `mia/docs/api-authentication-and-user-invitation.md` §Password sign-in and restricted-stage
isolation. Backend product requirements own behavior and OpenAPI owns transport. Approval covers this documentation
reconciliation and the approved login slice; broader BCG-001 obligations remain outside this story.

Login has no server-side request-ID/idempotency requirement. Any internal attempt correlation remains page-local,
adds nothing to the request body or headers, and supplies no replay guarantee. A definitive validated login response
in the current security epoch supplies the stage directly: no redundant discovery is inherently required. Full
authentication proceeds to non-refreshing capability/scope discovery before Home; restricted stages remain isolated.
Session discovery serves entry, reload, and permitted reconciliation, without probing or cookie-based stage inference.

Preserve fresh CSRF at unsafe dispatch, serialized transitions, invalidation of old queued work, and no automatic unsafe
replay. Ambiguous outcomes make no success, failure-before-commit, or cancellation claim. Existing response fencing and
the approved logout phase ordering take precedence over normal login dispatch for a retained logout participant.
MFA/password-replacement forms, broader lifecycle/BFCache, and Home features remain outside this slice.

</frozen-after-approval>

## Boundaries & Constraints

**Always:** Model Authentication Bootstrap with the contract's state names and exhaustive unions; retain credentials only
in the mounted native form/request lifetime; read the deployment-specific CSRF cookie immediately before the one login
dispatch under the existing coordinator; validate success before using its stage; broadcast only a content-free security
epoch after applying a successful local transition; show every HTTP error through localized copy plus the existing
collapsed inert disclosure; derive a static throttle wait only from a valid integer `Retry-After` header.

**Never:** Add wire correlation/idempotency, replay login, infer stage from cookies or denials, countdown a throttle,
identify a limiter, prefetch protected code/data from a restricted stage, persist/log credentials, or implement MFA,
password replacement, recovery, lifecycle, or Home behavior.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
| --- | --- | --- | --- |
| Successful login | Valid `200` auth-session document | Direct stage dispatch; authenticated waits for matching capabilities | Malformed success is ambiguous and reconciles by discovery |
| Rejected/blocked | `401`, or documented `422` | Keep exact input and focus; localized fixed result | Show collapsed exact status/body; no replay |
| Throttled | `429` with optional integer `Retry-After` | First-class fixed throttle state; static wait only when valid | Do not reveal limiter or count down |
| Backend failure | Other documented non-success | Keep form and explain failure | Show collapsed exact status/body |
| Ambiguous result | Transport loss or uncertain success parsing | Disable login mutation and perform one safe discovery | Stage may recover; failed reconciliation needs explicit safe recheck |
| Logout race | Logout/security epoch supersedes login | Fence login UI result and retain logout shield/order | Never reveal protected UI or queue replay |

</intent-contract>

## Code Map

- `mia/api-doc/paths/auth.yaml:1` and `mia/api-doc/schemas/requests/requests.yaml:1` -- read-only login operation,
  response set, CSRF security, and exact `login-attempts` document; backend revision `b83102114802b981a022c237c0746023c0aa6b79`.
- `src/platform/api/generated.ts:3385` -- regenerate from maintained OpenAPI so login includes the corrected `500`.
- `src/platform/api/client.ts:104` -- unsafe POST primitive; add exact JSON:API body support without changing logout's
  bodyless request or raw disclosure shape.
- `src/platform/api/entry.ts:23` -- shared auth-session validator and stage mapper; reuse for validated login success and
  retain `Retry-After` separately from raw disclosure.
- `src/platform/session/sessionController.ts:10` -- exhaustive Authentication Bootstrap union, serialized coordinator,
  epoch fencing, direct success dispatch, capability gate, ambiguity reconciliation, and retained logout precedence.
- `src/platform/session/SessionProvider.tsx:50` and `src/platform/data/EntryDataProvider.tsx:50` -- expose login and explicit
  safe reconciliation actions without storing credentials.
- `src/features/auth/SignedOutEntryRoute.tsx:23` -- adapt the licensed **Application UI > Forms > Sign-in and Registration
  > Simple card** v4 React light blueprint, version `2026-09-13-083323`; preserve locale/text-size controls.
- `src/app/App.tsx:43` -- keep login mounted and disabled during login's `Rotating` variants; retain ordered route gate.
- `src/platform/i18n/messages.ts` and `src/platform/i18n/catalogs/*.json` -- complete localized labels, reveal state,
  corrective outcomes, throttle wait, and reconciliation action for all seven locales.
- `src/platform/api/entry.test.ts`, `src/platform/session/sessionController.test.ts`, `src/app/App.test.tsx`, and
  `e2e/scaffold.spec.ts` -- protocol, transition/race, observable flow, keyboard, isolation, and reflow coverage.

## Tasks & Acceptance

**Execution:**
- Regenerate `src/platform/api/generated.ts`; extend `client.ts` and `entry.ts` for one exact typed login POST, shared
  response validation, untouched HTTP disclosure, and validated `Retry-After` metadata.
- Extend the session controller/providers with exhaustive signed-out/rotating presentation variants, one-at-a-time login,
  direct authoritative stage dispatch, capability gating, safe ambiguity reconciliation, epoch fencing, and logout race
  precedence.
- Adapt `SignedOutEntryRoute.tsx`, `App.tsx`, messages, and all catalogs into an accessible username/password form with
  native semantics, `username`/`current-password`, paste/autofill, pressed reveal, preserved values/focus, disabled
  rotation, first-class outcomes, and no restricted/protected leakage.
- Add focused API, state-machine, integration, and Playwright tests, including single dispatch, exact wire shape, no
  request ID, no replay, direct stage routing, capability order, malformed success, throttle, disclosure, and logout race.

**Acceptance Criteria:**
- Given the signed-out route, when a keyboard or password-manager user enters and submits credentials, then the exact
  OpenAPI login document is sent once with fresh CSRF and no correlation field/header, and reveal preserves value,
  selection, focus, and `aria-pressed`.
- Given a definitive validated response, when its stage is applied in the current epoch, then no redundant session read
  occurs; restricted stages mount only focused content plus logout, while authenticated waits for matching capabilities.
- Given rejection, blocked login, throttling, backend failure, or ambiguity, when the result renders, then exact input and
  safe focus remain, no unsafe request replays, static wait copy uses only valid `Retry-After`, and every HTTP result has
  a collapsed escaped exact status/body disclosure excluded from announcements.
- Given an ambiguous outcome or superseding logout, when recovery runs, then only permitted session discovery can guide
  stage recovery, logout shielding/order wins, and no stale result mounts protected or restricted content.

## Spec Change Log

## Review Triage Log

### 2026-09-30 — Review pass

- verdicts: 15 findings — high 5, medium 8, low 0, false 2, maybe-false 0
- findings:
  - `[high]` `[patch]` Recheck can overlap an admitted login and apply state recovered before that login settles — the
    login transition now takes the exclusive origin coordinator lease, so safe reconciliation waits for settlement and
    remains fenced to its current sequence.
  - `[medium]` `[patch]` Non-anonymous ambiguity recovery does not broadcast a security epoch — `reconcileLogin` applies
    the recovered stage without the notification required to shield peers; fixed with one post-application content-free
    epoch broadcast for non-anonymous recovery only.
  - `[medium]` `[patch]` Security invalidation and anonymous recheck recovery can discard the focused control — the keyed
    credential teardown and disappearing recheck button had no replacement focus target; fixed with safe recheck focus,
    a stable disabled recheck control while pending, and username focus after anonymous recovery.
  - `[high]` `[patch]` Two tabs can dispatch login concurrently — both use a shared origin lock, so login-stage mutation
    serialization was not enforced across tabs; fixed by the exclusive origin transition lease and regression coverage.
  - `[medium]` `[patch]` Ambiguity recovery omits the peer epoch signal — independently confirms the missing broadcast
    at the non-anonymous recovery branch; fixed by the same single recovery epoch broadcast.
  - `[high]` `[patch]` A superseded admitted login can leave local state based on an earlier recovery read — local
    `observeLateLogin` did not invalidate a non-logout tab; fixed by making recovery queue behind the exclusive admitted
    transition and retaining sequence checks before the recovery read applies.
  - `[high]` `[patch]` Delayed `logout-confirmed` does not invalidate an in-flight new login — the handler changes the
    shield state without advancing `sequence`, allowing late login application to overwrite it; fixed by advancing the
    sequence and aborting the active read before entering logout reconciliation.
  - `[medium]` `[patch]` Recheck removal leaves focus without a meaningful destination — confirmed at the conditional
    button branch; fixed by retaining the disabled button while the read is pending and restoring username focus.
  - `[medium]` `[patch]` No rendered test covers ambiguous login, failed discovery, preserved credentials, disabled
    mutation, and one explicit safe recheck — added rendered transport and `csrf_invalid` recovery coverage.
  - `[medium]` `[patch]` No test uses a real successful login as the cross-tab epoch producer — existing browser coverage
    injected the broadcast manually; added a real successful producer and receiving-page teardown browser test.
  - `[medium]` `[patch]` No stable JSON:API `csrf_invalid` fixture covers the special ambiguous branch — generic `403`
    text exercised the definitive-failure branch instead; added a stable coded fixture with disclosure and no-replay
    assertions.
  - `[high]` `[patch]` The implementation's shared origin lease diverges from the intent's serialized login-stage
    mutation boundary — fixed by the exclusive transition lease and two-controller origin-lock test.
  - `[false]` `[reject]` A recovered non-anonymous stage allegedly must retain the earlier HTTP disclosure — rendering
    login error details after authoritative restricted/authenticated recovery would violate focused-stage isolation;
    when recovery remains on login, the implementation does retain the disclosure.
  - `[medium]` `[patch]` Restricted-stage isolation tests watch only `/users` requests and selected DOM controls — they
    did not detect other protected API traffic or protected route chunk/title leakage; broadened the browser assertions
    to all non-auth API paths, the Home chunk/title/content, navigation, Cache API, web storage, and resource entries.
  - `[false]` `[reject]` Credential references allegedly outlive the bounded request lifetime — code inspection shows
    credentials only in native controls, action-local values, call arguments, and the admitted request promise, with no
    controller field, cache, URL, or browser persistence; garbage-collection or physical erasure is not claimed.

### 2026-09-30 — Supervisor review round 1 fix

- `[high]` `[patch]` Authentication work fell back to uncoordinated execution when `navigator.locks` was unavailable —
  the coordinator now fails closed instead of dispatching a login mutation or recovery read without origin-wide
  ordering. A two-controller regression proves concurrent login attempts dispatch zero POSTs in that environment.
- Unit tests now install one deterministic origin-wide Web Locks shim with shared/exclusive semantics, so ordinary
  controller coverage exercises the production coordination boundary while the explicit missing-lock test removes it.

### 2026-09-30 — Supervisor review round 2 supplementary fixes

- `[high]` `[verified + regression]` Copy technical details could act as an implicit form submit — the shared disclosure
  already declares `type="button"`; rejection and throttling coverage now activates Copy and proves the retained
  credentials dispatch no second POST.
- `[high]` `[patch]` A received `logout-unconfirmed` outcome did not fence an in-flight login or capability read — the
  receiver now advances its sequence and aborts its active read before retaining the logout shield. Delayed login and
  capability-success regressions prove neither callback can replace it.
- `[high]` `[patch]` A queued login depended on a `BroadcastChannel` epoch arriving before its Web Lock callback — login
  now uses a non-waiting Web Locks admission attempt. Work that had to queue performs authoritative session discovery
  after acquiring the exclusive lease and cannot dispatch unless that current result is anonymous. A deliberately
  delayed-epoch two-tab success test proves the stale queued intent sends no POST without durable storage or secrets.
- `[medium]` `[patch]` Passive peer revalidation was indistinguishable from local ambiguous-login recovery and could
  rebroadcast a recovered stage — internal recovery origin now distinguishes those paths; only a local ambiguous
  transition broadcasts. Two-tab coverage proves passive recovery leaves both tabs stable.
- `[medium]` `[patch]` A user could focus the pending automatic-reconciliation control immediately before an anonymous
  result removed it — focus ownership is tracked, username receives focus only when that removed control held focus,
  and an independently focused locale control is not disturbed.
- `[high]` `[patch]` Required deliberate-failure secret-hygiene evidence was absent — a dedicated controlled Playwright
  failure now uses generated credential and raw-error markers, reveals credentials, expands the raw body, closes the
  page before scalar failure, and scans captured process output and temporary artifacts. The gate emits no markers and
  is part of `run-all-tests.sh`.
- `[medium]` `[patch]` Credential-purpose and paste evidence was incomplete — tests now assert native `username` and
  `current-password` purposes, paste both fields, and compare exact request bytes only through SHA-256 fingerprints.
- `[medium]` `[patch]` Actual 200% zoom exercised only preference controls — all text modes now cover rejected and failed
  reconciliation states, credential/reveal/submit/disclosure/recheck geometry and focus, and forced-colors adjustment.
  Existing actual 400% coverage remains unchanged.

### 2026-09-30 — Supervisor review round 3

- Verdict: **PASS**. No production defects remain in the story scope.
- Evidence scope clarification: supported-browser, VoiceOver, and password-manager manual evidence remains a release
  obligation rather than a condition for story implementation completion. That evidence was not performed in this
  story, remains explicitly open, and no accessibility acceptance criterion is claimed as Pass from automated evidence
  alone.

## Auto Run Result

Status: implemented and review fixes verified.

Summary: implemented exact typed JSON:API password sign-in with fresh dispatch-time CSRF, direct validated stage routing,
the authenticated capability gate, isolated restricted stages, first-class throttling/errors, safe ambiguity recovery,
origin-wide transition serialization, late-logout fencing, credential teardown, and deterministic recovery focus.

Files changed:

- `src/platform/api/client.ts`, `entry.ts`, `generated.ts`, and `entry.test.ts` — exact login transport, validation,
  corrected generated `500`, untouched disclosure, throttle metadata, and protocol tests.
- `src/platform/session/sessionController.ts`, `SessionProvider.tsx`, and `sessionController.test.ts` — serialized login,
  fail-closed coordination, direct/recovered stage application, epoch signaling, ambiguity handling, logout fencing,
  actions, and transition tests.
- `src/features/auth/PasswordSignInForm.tsx`, `SignedOutEntryRoute.tsx`, `src/app/App.tsx`, and `App.test.tsx` — licensed
  accessible form, preserved native credentials, reveal/focus/error behavior, route integration, and rendered recovery.
- `src/platform/i18n/messages.ts` and all seven `src/platform/i18n/catalogs/*.json` — complete localized login copy.
- `e2e/scaffold.spec.ts` — keyboard, reflow, isolation, real cross-tab epoch, and logout-race browser coverage.
- `test/setup.ts` and `test/originLocks.ts` — deterministic shared/exclusive origin-lock test environment.
- `e2e/secret-hygiene.failure.ts`, `playwright.secret-hygiene.config.ts`, `scripts/check-secret-hygiene.mjs`,
  `package.json`, and `run-all-tests.sh` — generated-marker deliberate-failure hygiene gate with no retained artifacts.
- Story planning/spec and review triage record — owner-approved login alignment and implementation traceability.
  Supervisor-owned `sprint-status.yaml` was not edited by this worker.

Review: round one fixed fail-closed origin coordination; all eight round-two supplementary findings were resolved (high
4, medium 4), including one already-correct button type pinned by a new no-resubmit regression; supervisor round three
passed after clarifying that outstanding manual release evidence does not block story completion. No production finding
was deferred.

Verification: `npm run typecheck`, `npm run lint`, `npm test` (108), `npm run build`, `npm run test:e2e` (15 Chromium),
and `./run-all-tests.sh` all passed with no skipped components. The build reports the existing 504.69 kB minified chunk
warning; FFR-955 remains below its 256,000-byte gzip limit.

Residual release evidence: required supported-browser, VoiceOver, and password-manager manual evidence was not
performed. It remains open for release, and this story makes no AC Pass claim from automated evidence alone. No commit
was created.

## Design Notes

The login form stays mounted for login-origin `Rotating` states so native controls retain exact entered bytes after a
definitive failure. Ambiguous requests remain mutation-disabled until authoritative discovery succeeds; if that safe read
fails, only an explicit safe status recheck is enabled. This avoids treating an unknown cookie outcome as signed out.

## Verification

**Commands:**
- `npm run typecheck` -- zero TypeScript errors.
- `npm run lint` -- ESLint and architecture checks pass without warnings.
- `npm test` -- all unit/integration tests pass.
- `npm run build` -- generated types, routing, catalogs, and production bundle build successfully.
- `npm run test:e2e` -- critical sign-in flow, keyboard/accessibility, isolation, and 320 px behavior pass.
- `./run-all-tests.sh` -- complete repository gate passes; report any explicit tool skip.
