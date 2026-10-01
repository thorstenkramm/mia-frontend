---
title: 'Password recovery and token reset'
type: 'feature'
created: '2026-10-01'
status: 'done'
baseline_revision: '6f472f4712be5a6f85bf2f0a6cf4601927bae79a'
review_loop_iteration: 1
followup_review_recommended: false
context:
  - '_bmad-output/planning-artifacts/ux-designs/ux-mia-frontend-2026-09-12/ACCESSIBILITY-ACCEPTANCE.md'
  - '_bmad-output/planning-artifacts/ux-designs/ux-mia-frontend-2026-09-12/SECURITY-PRIVACY-ACCEPTANCE.md'
warnings: [oversized]
deferred:
  - summary: >-
      npm run typecheck still checks no files (solution-style tsconfig); tsc -p tsconfig.app.json reports the same 17
      pre-existing errors before and after this story.
    evidence: |-
      Carried from Story 1-5. A missing ReactNode import in this story was caught only by tsc -p tsconfig.app.json.
    location: >-
      package.json scripts.typecheck
    severity: high
---

<intent-contract>

## Intent

**Problem:** A staff user who lost their password has no way to request the emailed link or use it. The backend emails
`/password-reset#token=<uuid>`, which the frontend currently sends to its unknown-route fallback.

**Approach:** Add `/login/recovery` over `requestPasswordRecovery` and `/password-reset` over `resetPassword`, under the
owner-approved Story 1-6 slice in `BACKEND-CONTRACT-GAPS.md` §BCG-001 Story 1-6 recovery-and-reset-slice decision.
A synchronous bootstrap captures and strips the fragment token before the app runs. The state tables are in
`FRONTEND-STATE-MACHINES.md` §1 (Story 1-6).

## Boundaries & Constraints

**Always:** Capture the token from exactly `#token=<canonical lowercase UUID v4>` once, before React mounts. Remove the
complete fragment with `history.replaceState` whatever its content, and keep the token only in one in-memory flow
object passed down as a prop. Read the CSRF cookie fresh at dispatch under the origin request coordinator, and send each
request at most once per deliberate activation. Render one uniform "link invalid or no longer usable" result for
`auth_invalid_reset_token`, a malformed fragment, and a missing or lost token. Drop the token on success, an unusable
token, outcome unknown, departure, and any session-stage change after the form appears. Reuse the Story 1-5 local
password rules and accessible error pattern. Run the signed-in interstitial's sign-out through the existing logout.

**Never:** Store, log, URL, `history.state`, title, or announce the token or passwords; replay any request; distinguish
invalid, expired, consumed, or throttled tokens; confirm account existence or email delivery; claim other browsers were
signed out; redirect automatically after success; mount application navigation or protected identity on these routes;
implement invitations or broader lifecycle work.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
| --- | --- | --- | --- |
| Recovery accepted | Username, `204` | One exact POST; uniform accepted result | Never claims existence or delivery |
| Recovery CSRF | `403 csrf_invalid` | Discovery refreshes CSRF; username kept | Resend only on a deliberate click |
| Recovery failed | `400/406/413/415/422` | Generic "couldn't be processed" | No automatic retry |
| Recovery unknown | `5xx`, transport loss | "Couldn't confirm"; email may arrive; Send again | One new POST per click only |
| Fragment capture | Valid, malformed, duplicate, or extra fragment | Fragment removed before render | Malformed renders as Link unusable, sends nothing |
| Reset success | Valid matching password, `204` | Success heading focused and announced; Sign in to `/login` | Token and fields dropped |
| Reset token unusable | `422 auth_invalid_reset_token` or no token | One uniform result; Request a new link; Back to sign-in | Token dropped |
| Reset password rejected | `422 auth_invalid_password` or local rule failure | Form and token kept | Local failure sends nothing |
| Reset throttled or CSRF | `429` (optional `Retry-After`), `403 csrf_invalid` | Token kept; passwords cleared; deliberate resubmit | CSRF rediscovered; no countdown |
| Reset unknown | `5xx`, transport loss, malformed success | Outcome unknown; Sign in; Request a new link | Token dropped; no resubmit |
| Reset generic rejection | `400/406/413/415` (Decision 7) | Generic error; Request a new link; Back to sign-in | Token and passwords dropped; no resubmit |
| Signed-in link | Stage `mfa`, `password-change`, `authenticated` | Interstitial from stage discovery alone, no capability read; Sign out and continue shows the form after confirmed logout | Go back runs the capability gate; Go back or failed logout drops the token |

</intent-contract>

## Code Map

- `mia/api-doc/paths/auth.yaml:170-226` and generated `requestPasswordRecovery`, `resetPassword` -- read-only
  transport; `mia/docs/api-authentication-and-user-invitation.md:317-356` -- sequencing guidance.
- `src/platform/session/passwordResetLink.ts` -- new: fragment capture, token holder, reset-flow state union, session
  observation, and the pure reset view derivation shared by the app and the route.
- `src/main.tsx` -- capture as the first statement, then pass the flow to `App`; `reloadOnLateResetFragment` hands
  a fragment added to a running reset page (same-document navigation) to a fresh bootstrap.
- `src/platform/api/entry.ts` -- `requestPasswordRecovery` and `resetPassword` over `sendUnsafeRequest`, which accept
  `204` only.
- `src/platform/session/sessionController.ts`, `SessionProvider.tsx` -- `runPublicMutation` (shared lease,
  CSRF-if-missing discovery, anonymous check, `csrf_invalid` rediscovery) and `beginResetLinkLogout` (existing logout
  phases; also accepts `authenticated`).
- `src/app/App.tsx`, `src/app/routes/entryRoutes.tsx` -- public `/login/recovery` and `/password-reset` routes; the
  reset view overrides stage dispatch only while the flow holds a token for the interstitial; token drop on departure.
- `src/features/auth/NewPasswordFields.tsx` -- shared new-password field pair and local-rule check, extracted from
  `PasswordChangeForm.tsx` (duplication gate).
- `src/features/auth/PasswordRecoveryEntryRoute.tsx`, `PasswordResetEntryRoute.tsx` -- adapt **Forms > Sign-in and
  Registration > Simple card**, **Feedback > Alerts > With description** and **With actions**, and **Elements >
  Buttons > Primary/Secondary buttons**, v4 React light, library `2026-09-13-083323`.
- `src/features/auth/PasswordSignInForm.tsx` -- Simple card "Forgot password?" link to `/login/recovery`.
- `src/platform/i18n/messages.ts` and seven catalogs -- localized copy.
- Tests: `entry.test.ts`, `passwordResetLink.test.ts`, `sessionController.test.ts`, `App.test.tsx`,
  `e2e/scaffold.spec.ts`, `e2e/secret-hygiene.failure.ts`, `scripts/check-secret-hygiene.mjs`.

## Tasks & Acceptance

**Execution:**
- `src/platform/session/passwordResetLink.ts`, `src/main.tsx` -- bootstrap capture and flow store.
- `src/platform/api/entry.ts`, `src/platform/session/` -- exact transport, public mutation runner, interstitial logout.
- `src/app/`, `src/features/auth/`, `src/platform/i18n/` -- routes, forms, localized states.
- Tests -- every matrix row, plus fragment hygiene, no replay, uniform presentation, 320 px reflow, and a reset-token
  marker in the deliberate-failure secret scan.

**Acceptance Criteria:**
- Given any fragment on `/password-reset`, when the first application code runs, then `location.hash` is empty and no
  render or request has observed it.
- Given each unusable-token cause or a missing token, when the result renders, then copy, heading, actions, focus
  target, title, and URL are identical.
- Given any reset or recovery outcome, when it is inspected, then exactly one POST per deliberate activation was sent,
  and the token is absent from storage, URL, history state, title, and the announcement region.
- Given the recovery and reset routes, when used keyboard-only at 320 px in every text mode, then they stay operable
  with no page overflow and show no application navigation.

## Spec Change Log

### 2026-10-01 — Review round 1 (supervisor-authorized)

- Decision 7 (product owner, 2026-10-01): after a reset `400/406/413/415`, discard the token, clear the passwords,
  and show the generic error with Request a new link and Back to sign-in; no resubmit. It replaces the earlier
  retention interpretation, which is reverted in `SECURITY-PRIVACY-ACCEPTANCE.md`. It is also recorded in
  `BACKEND-CONTRACT-GAPS.md` §BCG-001 Story 1-6, `SPEC.md`, and `FRONTEND-STATE-MACHINES.md` (`Request rejected`).
- The signed-in-link row now states the no-prefetch rule explicitly. `FRONTEND-STATE-MACHINES.md` §1 records the
  `Access deferred` state.
- KEEP: one uniform unusable-link presentation; the token only in the bootstrap-owned flow object.

## Review Triage Log

### 2026-10-01 — Inline self-review (no subagent tool in this session)

- `[patch]` Same-document fragment navigation (`/password-reset` then `/password-reset#token=…` in one tab) left the
  token in the live URL, because only a fresh document runs the bootstrap. A `hashchange` listener on the reset path
  now reloads, so the single synchronous capture strips and captures it. Covered by a unit test and a browser test.
- `[patch]` The duplication gate found two clones: the new-password form shell (replacement and reset) and the two
  yellow reset results. They became `NewPasswordForm` and `WarningResult`. Existing replacement tests pass unchanged.
- `[patch]` A lazily loaded result or form that focused itself on mount would have overridden route-entry heading
  focus. Only a surface that replaces the one shown at entry takes focus now. The unusable-token result and the
  missing-token result render identical `main` markup, title, and URL (asserted).
- `[patch]` Matrix audit: added rendered tests for the reset local-rule failure (nothing sent) and for `csrf_invalid`
  (one rediscovery, passwords cleared, deliberate resubmit with the same token).
- Not changed: recovery and reset backend errors keep the collapsed raw disclosure that the retained raw-error
  contract requires. The decision's "no backend detail" is applied to the visible explanation only.

### 2026-10-01 — Supervisor review round 1 fixes

- `[critical]` `[patch]` F1, the bypass link destroyed the flow. The skip link now moves focus without writing a
  fragment, and the late-fragment reload ignores fragments that name an element of the document. A rendered test and
  a browser check activate the bypass link by keyboard with a captured token and entered fields, then submit.
- `[critical]` `[patch]` F2, reset-token fixtures reached test titles and matcher output.
  - Unit titles now use only fixture labels.
  - Tokens are compared through the shared `test/secretAssertions.ts` boolean helpers.
  - `check-secret-hygiene.mjs` now also runs controlled Vitest failures (`test/secret-hygiene.failure.ts`) through
    those helpers and the real capture path, and scans their output for the markers.
- `[critical]` `[patch]` F3, the interstitial fetched capabilities. With a token captured at cold entry, `authenticated`
  discovery enters `Access deferred` and makes no capability read. Go back runs the ordinary gate. Rendered tests
  cover capability success and failure, with zero capability requests before Go back.
- `[critical]` `[patch]` F4, departure did not cancel a queued dispatch. Each public mutation takes an owner-lifetime
  check, which is rechecked inside the coordinator lease immediately before dispatch. The payload is held only in a
  nullable request slot, released when the attempt is abandoned or dispatched. The reset flow and the recovery route
  supply their lifetimes, and the form action no longer awaits while holding the passwords. A controller test holds the
  coordinator lock, submits, departs, releases, and sees zero POSTs; a mutation check confirmed the test fails without
  the fix.
- `[critical]` `[patch]` F5, the uniform result differed in focus and announcement. The page heading now names the
  unusable-link result, so route entry and a rejected submission focus the same `h1`. The result announces itself once
  whenever it appears. The test compares markup, title, URL, hash, focused element, both live regions, and the
  waiting status across invalid, expired, consumed, and throttled causes and a missing token.
- `[patch]` F6 (Decision 7): `Request rejected` drops the token and fields and offers only Request a new link and
  Back to sign-in. Covered by flow and rendered tests.
- `[critical]` `[patch]` F7, accessibility coverage was incomplete. A browser walk now covers every recovery state and
  every reset state, including the interstitial, local errors, each rejection, success, and the terminal results.
  - It runs at 320 px in every locale and text mode, and at actual 200 % and 400 % zoom in every text mode.
  - It checks reflow, target size, unobscured focus with a visible indicator after keyboard Tab, and the bypass link.
  - It expands every disclosure, and runs axe in the standard mode.
  - A focus defect found by the walk was fixed: a heading that changes in place now scrolls into view when it is above
    the viewport.
- Not changed (out of scope by supervisor resolution): the ineffective `npm run typecheck` and the 17 pre-existing
  `tsc -p tsconfig.app.json` errors stay deferred.

## Design Notes

- The reset view is derived purely from the session state, the flow state, and the path. The app and the route use the
  same view, so the first render after discovery never dispatches away and drops the token. The flow's
  `observeSession` effect only formalizes transitions such as Awaiting stage to Form ready.
- Interpretation recorded in `SECURITY-PRIVACY-ACCEPTANCE.md`: a generic definitive `400/406/413/415` reset rejection
  keeps the token and form without automatic retry, because the decision's "no automatic retry" implies that a
  deliberate retry is possible.
- The success and outcome-unknown Sign in actions are document links to `/login`, so normal cold discovery runs and
  in-memory state ends. The owner text calls this a "button"; a link is the correct semantics for navigation.
- `csrf_invalid` attempts one rediscovery. If that read fails, the CSRF-rejected state still allows a deliberate
  resubmit, which reads the cookie that is current at that time.

## Verification

**Commands:**
- `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` -- expected: pass.
- `npm run test:e2e` -- expected: the recovery and reset browser flows pass.
- `./run-all-tests.sh` -- expected: the complete gate passes; any skipped component is named.

## Auto Run Result

Status: done. Full suite passed after the review findings were resolved.

Summary: Story 1-6 implements staff recovery on `/login/recovery` and the fragment-token reset on `/password-reset`
under the BCG-001 Story 1-6 decision and Decision 7. The token is captured and stripped before the app runs, kept only
in one in-memory flow object, and sent at most once per deliberate activation. A queued attempt is never sent after its
route is left. A signed-in link shows a focused interstitial from stage discovery alone and defers the capability gate
to a deliberate Go back. Every unusable or missing token shares one presentation, focus target, and announcement.

Workflow note: this session exposes no subagent tool, so planning, implementation, and self-review ran inline, as in
Stories 1-4 and 1-5. Independent review remains with the supervisor.

Residual release evidence: per the Story 1-3 precedent, manual password-manager success for reset (AC-010) and
Safari, VoiceOver, and Chrome/Edge product-owner evidence remain residual release evidence and are not claimed. No AC is
claimed Pass from automated evidence alone.

### Review Findings

- [x] [Review][Patch] Token-bearing fragment assertions can leak in Vitest failure output [src/platform/session/passwordResetLink.test.ts:91]
- [x] [Review][Patch] Queued reset payload remains reachable after reset-route departure [src/platform/session/sessionController.ts:472]
- [x] [Review][Patch] Usable reset form has no direct parent-route exit [src/features/auth/PasswordResetEntryRoute.tsx:207]
- [x] [Review][Patch] Departed reset flow can leave authenticated bootstrap permanently access-deferred [src/app/App.tsx:41]
- [x] [Review][Patch] Reset throttling ignores HTTP-date Retry-After values [src/platform/api/client.ts:27]
- [x] [Review][Patch] Throttled reset form permits a resubmit before Retry-After expires [src/features/auth/PasswordResetEntryRoute.tsx:178]
- [x] [Review][Patch] Same-document late-fragment handling lacks end-to-end coverage [e2e/scaffold.spec.ts:1093]
- [x] [Review][Patch] Recovery generic-rejection statuses lack transport-path coverage [src/app/App.test.tsx:1190]

Rejected:
- false: the review diff omitted untracked files by construction; the working tree contains the imported implementation files.
- false: generic-error raw disclosures follow the explicit owner-approved retained disclosure contract; the uniform unusable-link result omits the disclosure.
- false: a superseded result cannot restore the form after departure or an authentication-stage change because those transitions first replace the attempt state and `#settle` returns without applying `resultState`.
