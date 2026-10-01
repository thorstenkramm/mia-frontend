---
title: 'Forced password replacement'
type: 'feature'
created: '2026-10-01'
status: 'in-review'
baseline_revision: '152ee0c9c61841c6e2028e08b46bc1a1d7331500'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '_bmad-output/planning-artifacts/ux-designs/ux-mia-frontend-2026-09-12/ACCESSIBILITY-ACCEPTANCE.md'
  - '_bmad-output/planning-artifacts/ux-designs/ux-mia-frontend-2026-09-12/SECURITY-PRIVACY-ACCEPTANCE.md'
warnings: [oversized]
deferred:
  - summary: >-
      npm run typecheck checks no files, and the baseline tree has latent strict-mode errors.
    evidence: |-
      tsconfig.json is a solution file (files: [] plus references); tsc --noEmit without -b checks nothing.
      tsc --noEmit -p tsconfig.app.json reports 18 errors at 152ee0c9c61841c6e2028e08b46bc1a1d7331500 and 17 after this story.
    location: >-
      package.json scripts.typecheck
    severity: high
  - summary: >-
      Sign-in and MFA forms render their own role=alert status regions, and MFA focuses its input on every backend
      outcome, bypassing the shared announcement owner and AC-008 focus preservation.
    evidence: |-
      src/features/auth/MfaVerificationForm.tsx layout effect focuses inputRef for any outcome; both forms render
      role alert/status paragraphs. Same defect class fixed for password replacement in review round 1.
    location: >-
      src/features/auth/MfaVerificationForm.tsx, src/features/auth/PasswordSignInForm.tsx
    severity: high
  - summary: >-
      Ordinary Playwright failures write error-context.md page snapshots that can contain synthetic secret input values.
    evidence: |-
      Observed test-results/**/error-context.md containing a textbox value during a local failing run; the folder is
      gitignored and was deleted, but the artifact policy in testing.md forbids secret-bearing artifacts.
    location: >-
      playwright.config.ts
    severity: medium
---

<intent-contract>

## Intent

**Problem:** The authoritative `password-change` stage stops at a placeholder. A user who holds a temporary or
invalidated password cannot replace it, so they cannot reach the capability gate or Home.

**Approach:** Add the focused replacement form on `/auth/password-change` over the single documented
`POST /api/v1/auth/password-changes` operation. Reuse the serialized authentication transition, ambiguity
reconciliation, restricted isolation, direct stage dispatch, and capability gate from Stories 1-3 and 1-4, under the
owner-approved Story 1-5 slice in `BACKEND-CONTRACT-GAPS.md` §BCG-001 Story 1-5 password-replacement-slice decision.

## Boundaries & Constraints

**Always:** Read fresh CSRF at dispatch; hold the origin-wide exclusive transition lease; send at most once; send only
the new password and the confirmation; validate the returned session; chain a definitive authenticated `200` directly
to capability discovery. Check 12–128 code points, at most 512 UTF-8 bytes, and an exact confirmation match before
dispatch, without trimming or normalizing. Name the failed rule accessibly (field error, or an error summary when more
than one field fails) and send nothing. Use native `new-password` controls with paste, autofill, and pressed reveal.
Retain native values and focus after a definitive rejection. Bind the form lifetime to the authoritative account.

**Never:** Add a current-password field; replay the POST; infer the failed server rule; show a fixed terminal message
for `403 auth_password_change_required`; persist, log, cache, or URL/history-store passwords; mount application
navigation or protected identity in the restricted stage; implement voluntary change, recovery, reset, invitations,
broader lifecycle/SSE/BFCache, or close BCG-001/BCG-003.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
| --- | --- | --- | --- |
| Replacement success | Valid matching password | One exact POST; `Access checking` then Home, no session read | Malformed success reconciles by discovery |
| Local rule failure | Too short, too long, or mismatch | Named rule on the field or summary; focus moves | Sends nothing |
| Server rejection | `422 auth_invalid_password` | One general "not accepted" result; values and form retained | Collapsed raw disclosure; no replay |
| Throttle | `429` with optional integer header | Static wait when valid | No countdown or automatic submission |
| Stage mismatch | `403 auth_password_change_required` | Rediscover; follow returned stage (anonymous → sign-in) | No fixed terminal copy; no replay |
| Ambiguous outcome | `5xx`, transport loss, malformed success, `csrf_invalid` | Outcome-unknown state; discovery follows the stage | Explicit safe recheck if discovery fails |

</intent-contract>

## Code Map

- `mia/api-doc/paths/auth.yaml:145-168`, `mia/api-doc/schemas/requests/requests.yaml:21-39,654-660` -- read-only
  operation, response set, and `PasswordChangeRequestDocument`; generated types expose `changePassword`.
- `mia/docs/api-authentication-and-user-invitation.md:288-315,633-647` -- sequencing and error-handling guidance.
- `src/platform/api/entry.ts` -- add `changeTemporaryPassword` over `sendUnsafeRequest` plus the shared session
  validator; carry the account ID on `password-change` sessions.
- `src/platform/session/sessionController.ts` -- extend `Password change` with `accountId` and outcome, add
  `Rotating` origin `password-change`, serialized submission, reconciliation, and an explicit recheck; restricted logout
  covers the new rotating variant.
- `src/platform/session/SessionProvider.tsx` -- expose `submitPasswordChange` and `recheckPasswordChange`.
- `src/features/auth/passwordRules.ts` -- pure local rule check (code points, UTF-8 bytes, exact match).
- `src/features/auth/PasswordChangeForm.tsx` and `PasswordChangeEntryRoute.tsx` -- adapt **Application UI > Forms >
  Sign-in and Registration > Simple card** with **Forms > Input Groups > Input with validation error** and **Feedback >
  Alerts > With list** for the error summary, v4 React light, library `2026-09-13-083323`.
- `src/features/auth/PasswordRevealButton.tsx` and `AuthSubmitButton.tsx` -- one pressed reveal control and one
  guarded submit button shared by sign-in, MFA, and replacement (the duplication gate found the submit clone).
- `src/app/App.tsx` -- route `Rotating` password-change to the restricted form.
- `src/platform/i18n/messages.ts` and seven catalogs -- complete localized labels, rules, and outcomes.
- API, controller, rendered-flow, and Playwright tests -- exact wire shape, transitions, no replay, isolation,
  accessibility, and secret non-leakage.

## Tasks & Acceptance

**Execution:**
- `src/platform/api/entry.ts` and `src/platform/session/` -- exact transport, account-bound state, serialized
  transition, discovery-only recovery, logout precedence.
- `src/features/auth/`, `src/app/App.tsx`, `src/platform/i18n/` -- localized focused form with local rule checks,
  accessible errors, reveal, retained values, and no application navigation.
- `src/**/*.test.ts(x)` and `e2e/` -- protocol, transition, rendered, browser, isolation, reflow, and hygiene coverage.

**Acceptance Criteria:**
- Given authoritative `password-change`, when a valid matching password is submitted, then one CSRF-current POST sends
  exactly `password` and `password_confirmation`, and an authenticated response reaches Home only after capabilities.
- Given a local rule failure, when submitted, then no request is sent, every invalid field exposes `aria-invalid` with
  its named rule, and focus moves to the field or the error summary.
- Given an ambiguous outcome, a stage mismatch, or a logout race, when recovery runs, then only serialized discovery
  guides the stage, and no stale callback mounts protected or restricted content.
- Given the restricted route, when inspected across keyboard, 320 px, text modes, storage, cache, history, and network,
  then only focused replacement plus logout appears and no password leaks.

## Spec Change Log

## Review Triage Log

### 2026-10-01 — Inline self-review (no independent reviewer available in this session)

- The `runMfa`/`reconcileMfa` pair was generalized into `runRestrictedTransition`/`reconcileRestricted` driven by a
  per-stage `RestrictedContext`. MFA behavior is unchanged; every existing MFA controller, rendered, and browser test
  passes without modification.
- The duplication gate reported one clone (submit button in sign-in and replacement); the existing MFA submit button
  became the shared `AuthSubmitButton` owner instead of adding a marker.
- `[defer]` Pre-existing: `npm run typecheck` runs `tsc --noEmit` against a solution-style `tsconfig.json`
  (`files: []` plus references), so it type-checks nothing. `tsc --noEmit -p tsconfig.app.json` reports 18 errors at
  the baseline revision. This story removes one (the restricted-state type predicate it touched) and adds none; the
  remaining 17 are outside this story.
- `[defer]` Pre-existing: on a failing ordinary Playwright test, `test-results/**/error-context.md` records an
  accessibility snapshot that includes synthetic input values. The dedicated secret-hygiene gate avoids this by closing
  the page before its deliberate failure; the ordinary config has no equivalent safeguard.

### 2026-10-01 — Supervisor review round 1 fixes

- `[high]` `[patch]` Browser assertion handed the generated password to Playwright's failure formatter -- the shared
  `e2e/secretAssertions.ts` helper now compares values as a labelled boolean. A second controlled hygiene test fails
  through that helper with marker-bearing values; the scan requires both controlled failures. A negative control that
  swapped in `expect(actual).toBe(expected)` was caught by the scan (process output and `error-context.md`).
- `[high]` `[patch]` Every backend outcome moved focus to the new-password field -- backend transitions now preserve
  any surviving focus owner. Focus moves only when the explicit recheck that held it is removed by the recovered state.
  That recheck stays mounted and disabled while its read runs. Local validation keeps its field or summary focus.
  Delayed `422`, `429`, and `400` tests move focus to Sign out before release and assert that it stays there.
- `[high]` `[patch]` Validation was silent and outcomes used a form-owned live region -- the form-owned region was
  removed in favor of plain visible status text. Every invalid submission announces its corrective summary
  assertively. Submitting and reconciling are announced politely, and backend failures and failed reconciliation
  urgently. All of these go through the shared announcement owner, once per authoritative transition. Tests cover
  repeated invalid attempts, backend outcomes, copy feedback replacing an outcome, retirement on logout, and a
  same-turn authentication-loss announcement winning arbitration. No credential or raw body is announced.
- Not changed: the shared `AuthSubmitButton` and `PasswordRevealButton` carry no focus or announcement logic. The MFA
  form still focuses its input on every outcome and, like sign-in, renders its own `role=alert` status region. These
  are pre-existing Story 1-3 and 1-4 behaviors of the same class, not introduced by this story.

## Design Notes

Native uncontrolled controls keep exact password bytes across definitive rejection. React's form reset is cancelled,
as on sign-in. The 512-byte bound is implied by 128 code points, at most 4 bytes each. It is still checked and reported
under the "too long" rule, so no unreachable message exists.

## Verification

**Commands:**
- `npm run typecheck` -- expected: zero errors.
- `npm run lint` -- expected: ESLint and architecture checks pass.
- `npm test` -- expected: all unit and integration tests pass.
- `npm run build` -- expected: routes and catalogs build within budget.
- `npm run test:e2e` -- expected: the password-replacement browser flow passes.
- `./run-all-tests.sh` -- expected: complete gate passes with no skipped component.

## Auto Run Result

Status: implemented; ready for supervisor review.

Summary: implemented required password replacement on `/auth/password-change` under the owner-approved Story 1-5
slice. One CSRF-current `POST /api/v1/auth/password-changes` sends only the new password and its confirmation under
the origin-wide exclusive transition lease. A definitive authenticated response chains directly to the capability
gate. Local length, byte, and exact-match checks send nothing and name the failed rule through field errors or a
linked error summary. `422 auth_invalid_password` shows one general rejection and keeps the form. Stage mismatch,
CSRF, `5xx`, transport loss, and malformed success reconcile only through session discovery, never replaying the POST.

Workflow note: this session exposes no subagent tool, so implementation and self-review ran inline, as in Story 1-4.
Independent review remains assigned to the supervisor's epic reviewer.

Files changed:

- `BACKEND-CONTRACT-GAPS.md`, `FRONTEND-STATE-MACHINES.md`, `SPEC.md` -- recorded the owner decision and its
  observable state behavior.
- `src/platform/api/entry.ts` (+ test) -- `changeTemporaryPassword`, one shared validated auth-transition sender, and
  the account ID on `password-change` sessions.
- `src/platform/session/sessionController.ts`, `SessionProvider.tsx` (+ test) -- account-bound `Password change` with
  outcomes, `Rotating` origin `password-change`, the shared restricted transition and reconciliation, and explicit
  recheck.
- `src/features/auth/PasswordChangeForm.tsx`, `PasswordChangeEntryRoute.tsx`, `passwordRules.ts` (+ test),
  `PasswordRevealButton.tsx`, `AuthSubmitButton.tsx`, `PasswordSignInForm.tsx`, `MfaVerificationForm.tsx` -- the
  licensed form, local rules, and shared reveal and submit controls.
- `src/app/App.tsx` (+ test) -- exhaustive restricted routing for the new rotating origin and rendered-flow coverage.
- `src/platform/i18n/messages.ts` and seven catalogs -- 22 complete localized messages.
- `e2e/scaffold.spec.ts`, `e2e/secret-hygiene.failure.ts`, `scripts/check-secret-hygiene.mjs` -- browser flow,
  320 px, locales, text modes, 200%/400% zoom, and a replacement-password hygiene marker.

Residual release evidence: manual password-manager success for required replacement (AC-010), Safari, VoiceOver, and
Chrome/Edge product-owner evidence were not performed; no AC is claimed Pass from automated evidence alone.
