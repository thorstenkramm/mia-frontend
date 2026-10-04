---
title: 'Invitation preview and acceptance'
type: 'feature'
created: '2026-10-03'
status: 'done'
baseline_revision: 'c8f714b8aef68bc3a4c40ec32e4f13db168bcb20'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '_bmad-output/planning-artifacts/ux-designs/ux-mia-frontend-2026-09-12/BACKEND-CONTRACT-GAPS.md'
  - '_bmad-output/planning-artifacts/ux-designs/ux-mia-frontend-2026-09-12/FRONTEND-STATE-MACHINES.md'
warnings: [oversized]
deferred:
  - summary: >-
      The existing npm typecheck script does not traverse project references; direct application checking has existing errors.
    evidence: |-
      npm run typecheck succeeds with the solution config, but npx tsc -p tsconfig.app.json --noEmit fails in existing
      test queries, API typing, session code, and MFA code. A clean baseline worktree confirms 19 identical app errors.
      The final full gate therefore does not establish a clean application typecheck.
    location: >-
      package.json scripts.typecheck
    severity: high
  - summary: >-
      Browser and backend time-zone database versions may differ.
    evidence: |-
      No concrete rejected supported browser zone was demonstrated. Backend rejection is handled without a replay.
      Establishing a defect requires a supported browser/server pair with a browser-offered zone rejected by that server.
    location: >-
      src/features/auth/InvitationEntryRoute.tsx timeZoneOptions
    severity: medium (unverified)
---

## Auto Run Result

Status: done (2026-10-04). Reviewer access was restored and all four independent layers completed.

Implemented fragment-safe invitation preview and acceptance, the signed-in interstitial, correctable rejection,
explicit retry, Stop waiting, and terminal outcomes in seven locales. Code Map below identifies the changed owners.
Additional files: `LinkFlowParts.test.tsx` covers bounded Retry-After timers; `countryCodes.ts` supplies country choices.

Review patches: removed unsupported username blame, bounded long retry timers, added nonzero wait and restricted-stage
tests, added late-fragment browser and acceptance-password hygiene evidence, and made the browser journey keyboard-only.
Final self-check additionally canonicalized every invalid result to `/invitation` and added actual 200%/400% zoom checks.
The per-finding verdicts and rejections are recorded below. Deferred items are in frontmatter.

Final verification: `./run-all-tests.sh` exited 0: 373 unit tests, 55 Playwright tests, lint, formatting, build,
bundle budget, catalog checks, API type generation comparison, secret-hygiene scan, zero duplication, npm audit, and
Markdown checks passed. Trivy was skipped (not installed). Direct application typechecking still fails as recorded
above; the passing solution-level typecheck must not be mistaken for application type safety.

Follow-up review recommendation: false. The patched findings have direct regression evidence; no additional specific
unverified regression risk was identified. Manual Safari, assistive-technology, and password-manager release evidence
is not claimed by this automated run. Earlier DNS and credential failures made no implementation changes.

<intent-contract>

## Intent

**Problem:** An invited administrator, supervisor, or mentor cannot join MIA. The backend emails
`/invitation#token=<uuid>`, and the frontend currently sends that path to its unknown-route fallback.

**Approach:** Add `/invitation` over `previewInvitation` and `/invitation/accept` over `acceptInvitation`. This follows
the owner-approved slice in `BACKEND-CONTRACT-GAPS.md` §BCG-001 Story 1-7 invitation-slice decision and
`FRONTEND-STATE-MACHINES.md` §27 with its Story 1-7 amendment. Reuse the Story 1-6 bootstrap capture, public-mutation
runner, signed-in interstitial, and new-password fields.

## Boundaries & Constraints

**Always:** Capture the token from exactly `#token=<canonical lowercase UUID v4>` once, before React mounts. Strip any
fragment on `/invitation` and `/invitation/accept`. Keep the token only in one in-memory flow object, which is shared
across both paths and dropped when the user leaves them. Opening the link runs one preview. Every other request is
sent at most once per deliberate activation, reading a fresh CSRF cookie at dispatch under the origin coordinator.
Render the one uniform invalid result for `invitation_invalid`, a malformed or missing token, and
`/invitation/accept` without a flow token. Expose only the invited role from the preview. A `201` claims account
creation, never a session.

**Never:** Store, log, URL, `history.state`, title, or announce the token or passwords. Replay any request, or resend
after outcome unknown or Stop waiting. Distinguish unknown, accepted, revoked, and faulty invitations. Claim sign-in or
session creation. Redirect automatically. Mount application navigation or protected identity on these routes. Send an
email or a role in acceptance. Implement invitation administration.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
| --- | --- | --- | --- |
| Preview valid | Anonymous, `200` with role | Invitation heading, localized role, Accept invitation to `/invitation/accept` | Only role shown |
| Preview invalid | `422 invitation_invalid`, malformed, or no fragment | Uniform invalid result; Sign in | Token dropped; nothing sent for malformed or missing |
| Preview retryable | `429` (`Retry-After`), `403 csrf_invalid`, not sent | Message; Try again once the wait has passed | Token kept; CSRF rediscovered once |
| Preview lost | `400/406/413/415`, `5xx`, transport loss, malformed `200` | Couldn't-check result; Sign in; reopen email link | Token dropped |
| Accept success | Valid fields, `201` | Account created, no session claim; Sign in link to `/login` | Token and fields dropped |
| Accept correctable | `409 username_taken`, `422 auth_invalid_password`, `422 auth_invalid_request`, `429`, `403 csrf_invalid` | Form kept with a specific status; deliberate resubmit | Token kept; passwords cleared |
| Accept terminal | `409 invitation_email_registered`, `422 invitation_invalid`, `400/406/413/415` | Email-registered result, uniform invalid result, or rejected result; Sign in | Token and fields dropped |
| Accept unknown | `5xx`, transport loss, malformed `201`, Stop waiting | No creation claim; Sign in; reopen email link; neither proves the outcome | Token dropped; no resubmit |
| Local check fails | Password rules or no country | Field errors; nothing sent | Token and form kept |
| Signed-in link | Stage `mfa`, `password-change`, `authenticated` | Story 1-6 interstitial, no capability read; Sign out and continue previews after confirmed logout | Go back runs the capability gate; Go back or failed logout drops the token |

</intent-contract>

## Code Map

- `mia/api-doc/paths/invitations.yaml:143-208`, `requests.yaml:209-250` (`Username`, `Language`, `Country`,
  `TimeZone`), `resources.yaml:255-268,541-556` -- read-only transport; generated `previewInvitation` and
  `acceptInvitation` in `src/platform/api/generated.ts`. `mia/internal/invitation/handler.go:249-314` shows the error
  order: rate limit, then pending check, then password, then conflicts.
- `src/platform/session/passwordResetLink.ts` -- Story 1-6 pattern. Extract the fragment capture and late-fragment
  reload into a path-parameterized helper shared with the invitation flow; reset behavior stays unchanged.
- `src/platform/session/invitationLink.ts` -- new: `InvitationLink` flow store, state union, `observeSession`, and the
  pure `invitationSurface(session, flow, pathname)` derivation.
- `src/main.tsx` -- capture both links first; one late-fragment listener covers both paths.
- `src/platform/api/client.ts` -- `parseJsonApiResponse` takes the expected success status (default `200`).
- `src/platform/api/entry.ts` -- `previewInvitation` (returns the role) and `acceptInvitation` (`201` `users` only).
- `src/platform/session/sessionController.ts:128,253,474` -- make `PublicMutationResult` and `runPublicMutation`
  generic over a completed value; add `previewInvitation` and `acceptInvitation`. Rename `beginResetLinkLogout` and
  the `reset-link` scope so both links use them. `SessionProvider.tsx` exposes the actions.
- `src/app/App.tsx`, `src/app/routes/entryRoutes.tsx` -- `invitation` and `invitationAccept` routes, gate
  `Public + Token(invitation)`. The capability gate is deferred while either link awaits its stage. Leaving both
  invitation paths drops the token.
- `src/features/auth/PasswordResetEntryRoute.tsx` -- move the shared interstitial, warning result, focus-on-mount,
  and Retry-After pieces into `src/features/auth/LinkFlowParts.tsx`.
- `src/features/auth/NewPasswordFields.tsx` -- `NewPasswordForm` gains leading fields and an extra local pre-check.
- `src/features/auth/InvitationEntryRoute.tsx` -- new: preview and acceptance surfaces. It adapts **Forms >
  Sign-in and Registration > Simple card**, **Forms > Input Groups > Input with label and help text**, **Forms > Select
  Menus > Simple native**, **Feedback > Alerts > With description** and **With actions**, and **Elements > Buttons**,
  v4 React light, library `2026-09-13-083323`.
- `src/platform/i18n/messages.ts` and seven catalogs -- localized copy, including role names.
- Tests: `entry.test.ts`, `invitationLink.test.ts`, `passwordResetLink.test.ts`, `sessionController.test.ts`,
  `App.test.tsx`, `e2e/scaffold.spec.ts`, `test/secret-hygiene.failure.ts`, `e2e/secret-hygiene.failure.ts`, and
  `scripts/check-secret-hygiene.mjs` (an invitation-token marker).

## Tasks & Acceptance

**Execution:**
- `src/platform/session/` -- shared capture, `invitationLink.ts`, generic public mutations, link logout rename.
- `src/platform/api/` -- exact preview and acceptance transport.
- `src/main.tsx`, `src/app/` -- bootstrap, routes, deferral, departure.
- `src/features/auth/` -- shared link parts, the extended password form, and the invitation route.
- `src/platform/i18n/` -- copy in all seven locales.
- Tests -- every matrix row, fragment hygiene, no replay, uniform invalid presentation, keyboard and 320 px reflow,
  and the secret-hygiene marker.

**Acceptance Criteria:**
- Given any fragment on `/invitation`, when the first application code runs, then `location.hash` is empty and no
  render or request has observed it.
- Given each invalid cause, a malformed or missing token, or a bare `/invitation/accept`, when the result renders,
  then copy, heading, actions, focus target, title, and announcement are identical.
- Given any preview or acceptance outcome, when it is inspected, then exactly one POST per activation was sent, and the
  token never appears in storage, URL, history state, title, or the announcement region.
- Given the invitation routes, when they are used keyboard-only at 320 px in every text mode, then they stay operable
  with no page overflow and no application navigation.

## Spec Change Log

## Review Triage Log

### 2026-10-04 — Independent review and verification

- Blind hunter: 15 findings — medium 5, low 2, false 7, maybe-false 1.
  - [false] [reject] Session change displays invalid during acceptance — `shown` suppresses invitation views while
    non-anonymous; session dispatch owns the screen. Token teardown and late-response fencing do not claim failure or success.
  - [medium] [patch] Generic profile rejection blames username — removed `request invalid` from username invalidity;
    the general status remains and a rendered assertion covers it.
  - [maybe-false] [defer] Browser/server zone mismatch — no concrete unsupported zone shown; see frontmatter.
  - [false] [reject] Superseded acceptance silently restores form — controller returns superseded after owner/session
    invalidation; flow attempt identity and stage guards prevent the claimed live anonymous form restoration.
  - [medium] [patch] Nonzero invitation Retry-After coverage missing — added preview and acceptance wait tests.
  - [false] [reject] Acceptance-path hash reload should preserve ambiguity — deliberate document reload loses ephemeral
    flow by contract; missing token is explicitly uniform invalid, never proof of failed account creation. No persistence added.
  - [false] [reject] Near-miss paths should ingest invitation tokens — canonical token-entry paths are exact; no supported
    invitation route was demonstrated to retain a fragment. General unknown-path fragment hardening is not a new regression.
  - [false] [reject] Back/Forward should restore entered fields — approved flow retains only its token across the two paths;
    no contract authorizes form restoration of credentials. Remounting clears rather than persists input.
  - [low] [reject] Shared interstitial uses reset-named message keys — strings already have identical meaning; renaming
    seven catalogs adds churn without a demonstrated caller divergence.
  - [false] [reject] Username help duplicates transport authority — localized help is required user-facing explanation,
    not a competing validation contract. Server remains authoritative; no failed local username rule is claimed.
  - [false] [reject] Duplicate invalid announcements — announcement owner retirement clears the first StrictMode effect;
    arbitration emits one live-region update. A later Back/Forward appearance legitimately announces the result again.
  - [medium] [patch] Sprint remains in-progress — finalization synchronizes it to done. Oversized is the required warning,
    not a demand to split this cohesive story; triage was intentionally empty before reviewer completion.
  - [medium] [patch] Vitest invitation password marker missing — added controlled acceptance failure and sixth expected failure.
  - [medium] [patch] Keyboard journey uses click and restricted-stage entry lacks coverage — keyboard-activate logout;
    add mfa/password-change flow and rendered tests.
  - [low] [reject] Country option allocation — no measured performance issue; React rules prohibit speculative memoization.
- Edge-case hunter: 2 findings — medium 1, false 1.
  - [false] [reject] Late hash reload destroys submission — same reload/ephemeral-token reasoning as blind finding 6;
    invalid copy does not assert acceptance failure.
  - [medium] [patch] Large Retry-After overflows browser timer — bounded successive chunks now honor the full duration;
    regression tests cover the boundary, final millisecond, and cleanup. Mere clamping would have released too early.
- Verification-gap reviewer: 3 findings — medium 3.
  - [medium] [patch] Nonzero wait unverified — same wait test patch as blind finding 5; verifies blocked activation and expiry.
  - [medium] [patch] Late fragment not tested through main — added real browser bootstrap test for an already open invitation page.
  - [medium] [patch] Restricted stages unverified — same stage-coverage patch as blind finding 14.
- Intent alignment: 9 descriptive divergence/addition claims — medium 1, low 1, false 7.
  - [false] [reject] No live backend proof — repository testing contract expressly allows protocol fakes; live backend
    acceptance and production-role creation are not claimed.
  - [false] [reject] Does not sign in afterward — owner decision explicitly ends at account creation and explicit Sign in.
  - [false] [reject] Some statuses lack route-level tests — transport and flow tests cover all matrix statuses; every status
    need not have a duplicate browser test. Full rendered tests cover the shared observable branches.
  - [low] [reject] Logout failure only unit-tested for invitation — unit flow cases cover token teardown and existing logout
    integration tests cover its screen; no missing behavior demonstrated requiring a second full browser matrix.
  - [medium] [patch] Acceptance nonzero wait unverified — same patch as blind finding 5.
  - [false] [reject] Signed-in missing-token paths dispatch ordinary stage — matches reused Story 1-6 interstitial's
    captured-token precondition; restricted stages cannot mount arbitrary anonymous surfaces without a live flow.
  - [false] [reject] Preview-phase routing does not navigate — `App.tsx` compares `route.path` to location and returns
    `Navigate replace`; reviewer inspected the content component rather than its routing caller.
  - [false] [reject] Preview pre-dispatch retry is unauthorized addition — no request was sent; the matrix explicitly
    distinguishes not-sent from ambiguous dispatch. It does not replay an admitted mutation.
  - [false] [reject] Acceptance pre-dispatch state is unauthorized addition — original story and state machine §27 require it.

Totals: 29 findings — high 0, medium 10, low 3, false 15, maybe-false 1. Duplicate wait and restricted-stage reports
were grouped for fixing but retained individually here. Seven independent reviewer patch groups were resolved.
Additional parent verification fixed canonical invalid URLs and supplied zoom evidence. No unresolved intent changes
were introduced: both enforce existing security/accessibility requirements rather than adding a new surface.

Final direct-typecheck audit found three introduced test errors missed by the solution script. The invitation response
helper now uses `JsonBodyType`/`HttpResponse<T>` and the abort assertion uses a typed holder. Targeted tests passed;
the complete gate passed again afterwards. A clean baseline comparison confirms the remaining 19 app errors are
pre-existing (the node project also has the same 59 dependency-declaration errors at baseline and after this story).

## Design Notes

- Opening the link is the activation for its single preview. A failed preview never retries itself. Try again appears
  only for states that keep the token.
- The surface derivation depends on the path. Preview-phase states render on `/invitation`, and `/invitation/accept`
  redirects there. Ready and acceptance-attempt states render the preview on `/invitation` and the form on
  `/invitation/accept`. Terminal results render on either path. Browser Back and Forward between the two paths keep the
  token; leaving both drops it. The uniform invalid result always canonicalizes to `/invitation` before rendering,
  including rejection or missing-token entry on the acceptance path; other terminal results keep their current path.
- Language options are the seven interface locales, prefilled from the active locale. The time zone comes from
  `Intl.supportedValuesOf("timeZone")` plus `UTC` and the browser's zone, prefilled from the browser. Country is a
  required ISO 3166-1 alpha-2 select with an empty first option and localized region names. The username is checked
  only by the server (`auth_invalid_request`), with help text giving the OpenAPI rules.
- Stop waiting is available while acceptance is submitting. It enters Outcome unknown and drops the token; a late
  response is ignored.

## Verification

**Commands:**
- `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` -- expected: pass.
- `npm run test:e2e` -- expected: invitation browser flows pass.
- `./run-all-tests.sh` -- expected: the complete gate passes; any skipped component is named.
