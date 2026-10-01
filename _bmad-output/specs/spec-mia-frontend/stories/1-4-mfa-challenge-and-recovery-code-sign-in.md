---
title: 'MFA challenge and recovery-code sign-in'
type: 'feature'
created: '2026-10-01'
status: 'in-review'
baseline_revision: 'c1adcec76162381f3237292b0f7cc7572283dde2'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '_bmad-output/planning-artifacts/ux-designs/ux-mia-frontend-2026-09-12/ACCESSIBILITY-ACCEPTANCE.md'
  - '_bmad-output/planning-artifacts/ux-designs/ux-mia-frontend-2026-09-12/SECURITY-PRIVACY-ACCEPTANCE.md'
warnings: [oversized]
deferred: []
---

<intent-contract>

## Intent

**Problem:** The authoritative `mfa` entry stage currently stops at a placeholder, so users cannot complete its
six-digit challenge or use an unused recovery code to continue sign-in.

**Approach:** Add method-neutral challenge and recovery-code routes over the two documented MFA mutations, reusing the
existing serialized authentication transition, ambiguity reconciliation, restricted isolation, stage dispatch, and
capability gate. Align the binding planning artifacts with the owner-approved Story 1-4 slice before implementation.

## Boundaries & Constraints

**Always:** Bind each request to the challenge ID in the current authoritative `MFA required` state; read fresh CSRF at
dispatch; hold the origin-wide exclusive transition lease; send at most once; validate the returned session and chain
`password-change` or authenticated capability discovery directly. Use one native text input per code, preserve six-digit
leading zeroes, permit paste, use `autocomplete="one-time-code"` only for the six-digit field, and normalize recovery
input by removing hyphens/whitespace and ASCII-uppercasing before local pattern validation. Retain correctable input and
focus; treat expiry/invalidation as one terminal fresh-sign-in result; use static valid-integer `Retry-After` copy.

**Never:** Reveal or probe factor method, expose SMS destination, add Resend, map Crockford aliases, dispatch malformed
recovery input, reuse a stale challenge ID, replay an unsafe request, persist/log/cache/URL/history-store secrets, mount
application navigation or protected identity in a restricted stage, implement password replacement, recovery,
invitations, broader lifecycle/SSE/BFCache, or close BCG-001/BCG-003.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
| --- | --- | --- | --- |
| Challenge success | Current challenge + six digits | One exact verification POST; returned stage chains | Malformed success reconciles by discovery |
| Recovery success | Grouped/lowercase valid code | Normalize once; one exact consumption POST | Invalid local shape shows error, sends nothing |
| Correctable rejection | Used TOTP step or invalid code | Retain safe input and focus | Localized code-specific result plus raw disclosure |
| Terminal challenge | `auth_mfa_challenge_expired` | Clear challenge/input and require fresh sign-in | No retry or distinction between causes |
| Throttle | `429` with optional integer header | Static wait when valid | No countdown or automatic submission |
| Ambiguous outcome | Timeout, loss, `5xx`, malformed success, CSRF invalid | Disable mutation and perform safe discovery | Explicit safe recheck if discovery fails |

</intent-contract>

## Code Map

- `BACKEND-CONTRACT-GAPS.md`, `SURFACE-STATE-MATRIX.md`, `ROUTE-INVENTORY.md`, and
  `FRONTEND-STATE-MACHINES.md` -- record D1-D3 and remove method-specific/resend behavior from login MFA.
- `mia/api-doc/paths/auth.yaml:229-287` and request/resource schemas -- read-only authority for the two POSTs, exact
  errors, code shapes, and returned `AuthSession`; the backend guide supplies sequencing only.
- `src/platform/api/entry.ts` -- reuse the validated session boundary and unsafe JSON:API primitive for exact MFA wire
  documents; generated types already expose both operations.
- `src/platform/session/sessionController.ts` -- retain the documented Authentication Bootstrap state names while adding
  the bound challenge to `MFA required`, serialized MFA actions, direct stage application, terminal teardown, and shared
  ambiguity reconciliation.
- `src/features/auth/MfaEntryRoute.tsx` and new focused form component -- adapt licensed **Application UI > Forms >
  Sign-in and Registration > Simple card**, v4 React light, library `2026-09-13-083323`; provide challenge/recovery paths
  and existing restricted logout without application navigation.
- `src/app/routes/entryRoutes.tsx` and `src/app/App.tsx` -- add canonical `/auth/mfa/recovery`, preserve route focus/title,
  and keep rotating MFA on its restricted presentation rather than the password form.
- `src/platform/i18n/messages.ts` and seven catalogs -- add complete localized method-neutral labels and all outcomes.
- API, controller, component, Playwright, and deliberate-failure hygiene tests -- cover exact wire protocol, transitions,
  error codes, normalization, no replay, reconciliation, isolation, accessibility, and secret non-leakage.

## Tasks & Acceptance

**Execution:**
- `BACKEND-CONTRACT-GAPS.md`, `SURFACE-STATE-MATRIX.md`, `ROUTE-INVENTORY.md`, and `FRONTEND-STATE-MACHINES.md` --
  record the owner decisions and explicit resend deferral so implementation and binding contracts agree.
- `src/platform/api/entry.ts` and `src/platform/session/` -- extend API and session owners for exact MFA transport,
  authoritative challenge binding, exhaustive states, serialized transitions, teardown, discovery, and logout precedence.
- `src/features/auth/`, `src/app/`, and `src/platform/i18n/` -- implement the two localized restricted routes from the
  recorded blueprint with native controls, local recovery validation, deterministic focus, disclosure, and no Resend.
- `src/**/*.test.ts(x)`, `e2e/`, and the secret-hygiene gate -- add protocol-fake, state-transition, rendered-flow,
  browser, accessibility, isolation, and deliberate-failure regressions.

**Acceptance Criteria:**
- Given authoritative `MFA required`, when a valid six-digit code or normalized recovery code is submitted, then one
  CSRF-current request uses only the bound challenge and the returned stage reaches password-change or the authenticated
  capability gate without redundant discovery.
- Given every documented MFA error, when it renders, then code-specific localized copy, safe focus/input retention or
  terminal teardown, valid static throttle metadata, and collapsed escaped raw disclosure appear without replay.
- Given an ambiguous MFA outcome or logout race, when recovery runs, then only serialized discovery guides the stage,
  stale callbacks cannot mount restricted/protected content, and a failed discovery permits only explicit safe recheck.
- Given the restricted routes, when inspected across keyboard, 320 px, text modes, storage/cache/history/network, and
  deliberate-failure artifacts, then only focused MFA plus logout appears and no secret or protected value leaks.

## Spec Change Log

## Review Triage Log

### 2026-10-01 — Review round 1 fixes

- Bound the secret-bearing form lifetime to the authoritative account and challenge IDs. Same-context reconciliation
  preserves the mounted form; replacement account or challenge discovery remounts it and destroys the prior input.
- Replaced expired-challenge input with a terminal restart presentation on both MFA routes. The document title and
  heading change, focus moves to the restart heading, the expiry is announced assertively, and explicit restricted
  logout remains keyboard reachable without replay or automatic logout.
- Expanded browser evidence across both routes, seven locales, three text modes, direct 320 CSS pixels with text
  spacing, keyboard paste/submit, target and focus geometry, reconciliation failure, terminal expiry, and actual 200%
  and 400% bundled-Chromium zoom.
- Outstanding manual release evidence: the `CP-01` `CV-C` scripts remain **Not run** for current Chrome and Edge on each
  available Product Owner environment, Safari browser zoom/native controls/locale/text-spacing/focus behavior, and
  VoiceOver reading and control operation. The required record must pin tester, date, OS/browser/assistive-technology
  versions, numbered actions, expected and actual results, and evidence links. It must contain no passwords, MFA values,
  recovery codes, tokens, private content, or real student data. Automated Chromium evidence is not a substitute.

### 2026-10-01 — Review round 2 fix

- Replaced independent persistent polite/assertive messages with one owner-scoped announcement candidate. The mounted
  provider arbitrates same-turn events in contract order: authentication or scope loss, urgent failure, then the latest
  polite transition. Suppressed events are discarded rather than replayed.
- Each caller receives a private owner token. Unmount cleanup synchronously removes that owner's current and pending
  messages without clearing a newer owner's announcement, so MFA expiry text is removed during logout teardown.
- Added component, rendered-flow, and Chromium regressions for priority competition, owner-scoped cleanup, expiry to
  anonymous logout, copy feedback, and a subsequent localized announcement.

### 2026-10-01 — Review round 3 fix

- Announcement owners now register only while mounted and retire synchronously during layout cleanup. The provider
  rejects every announcement from a retired owner, including callbacks retained by an unresolved asynchronous action,
  while leaving newer owners' current and pending messages untouched.
- Added a retained-callback ownership regression plus rendered deferred clipboard success and failure regressions that
  resolve only after MFA logout, anonymous discovery, and a newer localized announcement.

## Design Notes

The challenge route stays method-neutral because `AuthSession` exposes no factor method. The route switch is ordinary
restricted navigation and keeps the same authoritative controller-held challenge binding; neither route places the ID
or code in router state. Recovery normalization is a pre-dispatch presentation-to-wire conversion, not backend aliasing.

## Verification

**Commands:**
- `npm run typecheck` -- strict unions and generated operation usage pass.
- `npm run lint` -- architecture, secret, and ownership fences pass.
- `npm test` -- protocol, transition, rendering, normalization, and no-replay coverage passes.
- `npm run build` -- routes and complete catalogs build.
- `npm run test:e2e` -- critical user-facing MFA flow, isolation, reflow, and hygiene coverage passes.

## Auto Run Result

Status: implemented; ready for supervisor review.

Summary: implemented method-neutral six-digit MFA verification and recovery-code sign-in on the two approved restricted
routes. Both mutations use the current authoritative challenge and dispatch-time CSRF under the origin-wide transition
coordinator, chain definitive returned stages directly, and reconcile ambiguity without unsafe replay. Recovery input is
normalized only as approved, terminal challenge expiry clears entered secret text, and restricted-stage isolation,
logout ordering, localization, accessibility, and secret hygiene remain enforced.

Workflow note: the mandatory implementation-subagent step was performed inline under the supervisor's explicit fallback
authorization because this session exposes no subagent tool. Independent review remains assigned to the supervisor's
separate epic reviewer.

Verification performed:

- `npm run typecheck` passed.
- `npm run lint` passed with architecture checks.
- `npm test` passed: 159 tests.
- `npm run build` passed; initial-route JavaScript remained within the enforced gzip budget.
- `npm run test:e2e` passed: 22 bundled-Chromium tests.
- `npm run check:secret-hygiene` passed the controlled MFA/recovery-code failure scan.
- `./run-all-tests.sh` passed all gates with no skipped components, vulnerabilities, secrets, or duplication.
