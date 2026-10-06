---
title: 'TOTP enrollment and recovery codes'
type: 'feature'
created: '2026-10-05'
status: 'done'
route: 'dispatch'
story_key: '1-9-totp-enrollment-and-recovery-codes'
baseline_commit: 'e7123e6398f5961a9dc0c54cab0a7b25b5f3fc6e'
review_loop_iteration: 0
context:
  - '_bmad-output/implementation-artifacts/epic-1-context.md'
  - 'mia/docs/api-authentication-and-user-invitation.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Authenticated users cannot set up MFA. No route renders the backend's provisioning URI as a local QR code
with manual setup values, verifies the authenticator, or shows the one-time recovery codes.

**Approach:** Add the TOTP slice of the MFA settings routes. The slice covers the overview, start, verify, cancel
pending, and the one-time recovery-code page. It uses the implemented OpenAPI operations under the existing ordered
gate and authenticated-mutation discipline. Secrets stay in one non-persistent owner. They are masked behind the
lifecycle shield and destroyed on terminal events.

## Boundaries & Constraints

**Always:**

- Use the OpenAPI MFA operations exactly: `GET /api/v1/users/me/mfa`, `POST /users/me/mfa-enrollments`,
  `POST .../{id}/verifications`, and `DELETE .../{id}`. Mutations send fresh CSRF, are dispatched once, and are
  never replayed.
- Any lost or ambiguous outcome reconciles only through an explicit MFA-state read.
- Render the QR code locally as an inline SVG from the returned URI. Never use an external service or a
  `data:`/`blob:` image.
- Show the selectable issuer, account, and secret values from the parsed URI.
- Recovery codes:
  - Reveal them once, grouped `XXXX-XXXX-XXXX-XXXX`.
  - Provide explicit copy and a print view that contains only the codes.
  - Show an accurate warning.
  - Require acknowledgement before Done.
  - Tear them down on departure.
- All seven locales.

**Never:**

- Persist a URI, secret, code, or recovery code anywhere, including history state.
- Put any of those values in a URL, title, log, announcement, or test artifact.
- Construct or adjust the issuer or label yourself.
- Offer an `otpauth:` link.
- Auto-cancel, auto-resubmit, show a countdown, or run a local expiry timer.
- Offer replace, disable, SMS, or lost-factor flows. They are out of scope.

**Owner decisions, 2026-10-05** (pre-approved recommendations; the backend guide is authoritative):

1. Validate the URI the backend actually emits:
   - `otpauth://totp/MIA (<host[:port]>):<username>?secret=<32 uppercase base32>&issuer=MIA`.
   - Optional `algorithm`, `digits`, and `period` are accepted only as `SHA1`, `6`, and `30`.
   - The limit is 1,024 bytes. Reject anything else as a protocol failure.
   - The label/issuer disagreement with the product requirements is a non-blocking backend note.
2. The gate runs in this order: authenticated stage → `profile.view` with own scope → `GET /users/me/mfa` as the
   route resource. This is a BCG-001/003/009 Story 1-9 slice; broader closure stays open.
3. Home `/` stands in for the `/profile` parent and fallback until Epic 2. Home shows one secondary link to the MFA
   overview.
4. Mask or destroy secrets according to the shield reason:
   - A `lifecycle` shield, including a persisted pagehide, masks the secret and keeps it in memory.
   - Every other shield reason destroys it: deadline, continuation, logout, signed-out, and account or epoch
     change. So do a non-persisted pagehide, route departure, and Reload.
   - Reveal requires explicit Refresh through the full gate and a fresh MFA read that confirms the same unexpired
     pending ID. For codes, it must confirm the same account and an active factor.
5. A pending enrollment without a held URI (after Reload, another tab, a lost response, or a `409`) offers code entry
   plus explicit Cancel. Starting over requires a cancel first.
6. After an unknown verify outcome or an invalid code, re-read the state:
   - The factor is active: the codes are unrecoverable, and only a future replacement issues new ones.
   - The enrollment is still pending: allow an explicit resubmit.
   - The enrollment is gone: destroy the setup and say so.
   - A `422` on DELETE for an enrollment that is already gone means reconcile.
7. Show `expires_at` as a localized absolute time.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected behavior | Failure handling |
| --- | --- | --- | --- |
| Start | `actions.enroll`; Start activated | One POST; QR, manual values | Invalid URI → protocol failure, no QR |
| Verify | Six-digit code | One POST; ten codes shown once | Invalid code → re-read, retry or gone |
| Unknown verify | Lost response or `5xx` | Re-read; active → codes lost copy | No resubmit without user action |
| Pending, no URI | Reload or `409` | Code entry plus Cancel | Cancel unknown → explicit re-read |
| Lifecycle shield | Focus, visibility, BFCache | Secrets masked, retained | Reveal only after full gate + re-read |
| Terminal | Logout, deadline, departure | Secrets destroyed | Return shows overview, no secret |
| Codes done | Acknowledge, Done | History replaced, codes destroyed | Print/copy failure announced |

</frozen-after-approval>

## Code Map

- `src/app/routes/entryRoutes.tsx`, `src/app/App.tsx`: add the four `/profile/security/mfa[...]` routes, lazy-loaded
  from `src/features/profile/`. Add path-aware authenticated dispatch with gate logic in `app/routes`, and keep
  `SessionWarning` mounted.
- `src/platform/api/entry.ts` (or a sibling `platform/api` MFA module): the four operations with zod schemas,
  type-checked against `generated.ts`. The capability read exposes `profile.view` with own scope.
- `src/platform/api/client.ts`: `sendUnsafeRequest` only POSTs. Add an explicit method parameter for DELETE.
- `src/platform/session/sessionController.ts`: an authenticated-mutation path that mirrors `runPublicMutation`'s
  lock, fresh-CSRF, single-dispatch, and outcome classification, plus a fenced authenticated read. Split `setState`
  teardown into mask (`lifecycle`) and destroy (every other reason). Do not change logout, continuation, or
  restricted flows.
- Secret owner: follow the `passwordResetLink.ts` / `invitationLink.ts` precedent, as one in-memory owner keyed by
  account, enrollment ID, and security epoch.
- Reuse `MfaVerificationForm`/`mfaCodes` by moving them to `platform/ui` on second use, plus `AuthSubmitButton`,
  `TechnicalErrorDisclosure`, and `AnnouncementRegion`.
- `qrcode` 1.5.4 is already pinned. Add local typings rather than a new runtime dependency. Render
  `QRCode.create()` modules as React SVG.
- `src/app/app.css` hides `#root` in print. The codes-only print view opts in through a portal outside `#root`.
- Blueprints:
  - `Simple card` frame.
  - `Description Lists > Left-aligned in card` for the manual values.
  - `Cards > Card with header and footer` for the codes.
  - `Checkboxes > List with description` for the acknowledgement.
  - `Alerts > With description/With actions`.
  - Primary and Secondary buttons.
  - `Action Panels > Simple` for the overview.
  - Bind each exactly through the `tailwind-plus` skill.
- Tests: `App.test.tsx`, a new `e2e/mfaEnrollment.spec.ts` following the `sessionLifecycle.spec.ts` patterns, and
  `scripts/check-secret-hygiene.mjs` plus `e2e/secret-hygiene.failure.ts` markers for the URI, the secret, and the
  code set.

## Tasks & Acceptance

**Execution:**

- [x] Planning docs: record the owner decisions in `BACKEND-CONTRACT-GAPS.md` (BCG-009 is stale against OpenAPI),
  the URI grammar in `SECURITY-PRIVACY-ACCEPTANCE.md` and `ACCESSIBILITY-ACCEPTANCE.md` AC-011, and the §30 mask
  semantics in `FRONTEND-STATE-MACHINES.md`.
- [x] Transport, client method, and schema tests.
- [x] Controller authenticated mutation and read, mask/destroy teardown, and the secret owner, with tests.
- [x] Routes, gate, features, Home link, print view, and catalogs.
- [x] Unit, browser, and secret-hygiene coverage of the matrix.

**Acceptance Criteria:**

- Given the enrollment surface, when a valid URI arrives, then a local SVG QR code and selectable manual values
  render. An invalid URI renders no QR code.
- Given a lifecycle shield, when protected UI is covered, then the secrets are masked, they are revealed only after
  an explicit full gate and re-read, and terminal events destroy them.
- Given activation, when the codes render, then the ten grouped codes appear once, with working copy, a codes-only
  print view, a warning, an acknowledgement-gated Done, and teardown.
- Given each surface, when it is used keyboard-only across locales, text sizes, and zoom, then it is accessible and
  no secret reaches the DOM after teardown, storage, URLs, or test artifacts.

## Spec Change Log

## Review Triage Log

### 2026-10-06 — Block 3 repair notes

- V1: covered both mixed capability cases (`available=true/own_resource=false` and the inverse). The controller denies
  `ownProfileView`, the route falls back to Home, Home omits the MFA link, and no MFA resource read is dispatched.
- V2: covered MFA-state `401` with held setup and held recovery codes, plus verify `403 auth_password_change_required`.
  Access loss destroys the secrets, installs the shield, never replays verification, and cannot restore secrets after Refresh.
- V3: rendered both failure paths and asserted the access-lost explanation, Refresh action, hidden setup, and deliberate recovery.
- V4: a non-auth route-resource failure suppresses the protected heading/body and setup link; only Check again reads and recovers.
- B12: removed the conditional reveal/recovery helper. MFA browser fixtures now freeze wall and monotonic time while task and
  animation timers run; each journey asserts its expected surface. Synthetic lifecycle masking and real BFCache tests remain.
- Existing block 1/2 regressions already cover late start/verify races, mismatched identity/epoch, initial and guarded Reveal,
  warning-and-codes print output, print announcement, verification feedback/focus, and history replacement. No duplicate tests added.
- The initial Block 3 verification was blocked by a high-severity dependency advisory. The owner approved the minimal
  dependency repair recorded below; agent rules are unchanged. Story remains in review.

## Implementation Notes

### What was built

- Transport: `src/platform/api/mfa.ts` (state read, TOTP start, verify, cancel; strict zod schemas checked against
  `generated.ts`), `src/platform/api/totpProvisioning.ts` (owner-decision-1 grammar), `sendUnsafeRequest` now takes an
  explicit `method` (`POST` or `DELETE`), and the capability read exposes `ownProfileView`.
- Controller: `readAuthenticated` (shared lease, fenced by sequence and security epoch, aborted on any teardown),
  `runAuthenticatedMutation` (shared lease, CSRF read at dispatch, single dispatch, no abort, no replay; only a new
  security epoch drops a value), `getAuthenticatedAccess`, a `security epoch`, and teardown split into `mask` (privacy
  shield `lifecycle` and its Refresh check) and `destroy` (everything else, plus an account change on Refresh). A `401`
  or `403 auth_password_change_required` on an authenticated operation installs a new `access lost` shield. Logout,
  continuation, and restricted flows are unchanged.
- Secret owner: `src/platform/session/mfaEnrollment.ts`, one in-memory owner per `SessionProvider`, keyed by account,
  enrollment ID, and epoch. It also holds the per-surface MFA read and mutation outcomes so a response that settles
  behind a lifecycle shield is kept masked. A non-persisted `pagehide` destroys before the shield is installed.
- Routes: four `/profile/security/mfa[...]` entries in `entryRoutes.tsx` with gate `Profile(own MFA)`;
  `authenticatedRouteKey` does path-aware dispatch (Home fallback without own-scope `profile.view`);
  `app/routes/ProfileMfaRoute.tsx` performs the route-resource read and keeps `SessionWarning` mounted.
  `CheckingAccess` moved to `app/routes/CheckingAccess.tsx`.
- Features: `src/features/profile/` (overview, start, verify, recovery codes, inline-SVG QR from `QRCode.create()` with
  local `qrcode.d.ts`, outcome mapping). Home shows one secondary link when `ownProfileView`. The codes-only print view
  is a portal outside `#root` (`hidden print:block`), so no new CSS was needed. 91 messages added to all seven
  catalogs. `mfaCodes.ts` (plus `formatRecoveryCode`) and `AuthSubmitButton` moved to `platform/ui`.
- Planning docs: owner decisions recorded in `BACKEND-CONTRACT-GAPS.md` BCG-009 (marked stale against OpenAPI, slice
  approved, entry still open); URI grammar notes in `SECURITY-PRIVACY-ACCEPTANCE.md` and `ACCESSIBILITY-ACCEPTANCE.md`
  AC-011; §30 mask semantics in `FRONTEND-STATE-MACHINES.md`.
- Tests: transport and grammar tests, owner/controller tests (`mfaEnrollment.test.ts`), 12 `App.test.tsx` cases (with
  a DOM-free `getElementError` so secret-bearing DOM never reaches a failure message), `e2e/mfaEnrollment.spec.ts`
  (keyboard journey, print emulation, persisted and non-persisted pagehide, 320px/axe/target checks in seven locales
  and three text sizes), and secret-hygiene markers for the secret, the URI, and the code set (wire and grouped) in a
  new Playwright and a new Vitest controlled failure.

### Decisions and deviations

- Recovery codes require an initial explicit "Show recovery codes" after the route's confirming read. Lifecycle-masked
  setup and codes require Refresh, a confirming read, and explicit Reveal; the secret owner retains the access fences.
- `actions.verify` from the fresh read is the "unexpired pending" signal; no local expiry comparison is made.
- The manual setup list shows the decoded label (`MIA (<host>):<username>`) as Account and `MIA` as Issuer, exactly as
  the QR code carries them, plus SHA-1, 6 digits, and 30 seconds (AC-011).
- After start, verify, or cancel the owner re-reads automatically once (an explicit MFA-state read); a failed re-read
  offers "Check again". No mutation is ever resent.
- Codes from a verification that settles after the user already left `/verify` are dropped (departure rule); the
  overview then shows the active factor.
- `MfaVerificationForm` was not reused: it is bound to the login challenge state machine. Only `mfaCodes` and
  `AuthSubmitButton` moved to `platform/ui`.
- Both Playwright configs set `PLAYWRIGHT_NO_COPY_PROMPT=1`, which stops Playwright writing a failure aria snapshot
  (`error-context.md`) that would contain on-screen secrets. It is an undocumented Playwright switch; secret-bearing
  e2e tests also close their page before reporting.
- Block 3 replaced conditional reflow-test recovery with controlled wall/monotonic clock fixtures. Production lifecycle
  behavior remains intact; lifecycle and real BFCache coverage runs separately with its own clocks.
- The recovery-code warning alert repeats the App.tsx alert blueprint; a `jscpd` marker with its reason is in
  `MfaRecoveryCodesRoute.tsx` and a pointer note in `App.tsx`.

### Deferred: agent-rule conflicts (rules not edited)

- `.agents/rules/security-privacy.md` §Secrets in the UI still describes the older TOTP grammar (label equals the
  username, issuer `MIA (<hostname>)`, mandatory ordered `algorithm`/`digits`/`period`). The implementation follows
  owner decision 1; the rule needs updating by its owner.
- Initial Reveal and print-warning ambiguities were resolved by the owner clarification in Pass 1 below. Both are
  implemented: explicit initial Reveal and print output containing only the codes and essential storage warning.
- TOTP secret/URI copy (with the clipboard warning in SECURITY-PRIVACY-ACCEPTANCE) was not added; the spec asks only for
  selectable values.

## Design Notes

The work is one cohesive self-service MFA goal. It requires no irreversible repository operation, deployment, or live
account mutation. Story 1-8's lifecycle and logout behavior must keep its tests.

## Verification

### Results, 2026-10-05

- `./run-all-tests.sh`: exit 0. Every component passed except Trivy, which was skipped (not installed); npm audit,
  jscpd (0 clones, markers balanced), Tailwind Plus catalog, and Markdown lint passed.
- `npx tsc -p tsconfig.app.json --noEmit`: 15 errors, all pre-existing (baseline 16; the `client.ts` fetch-signal
  error was fixed by the method change). `npm run typecheck` checks no files (`tsconfig.json` has `files: []`), a
  pre-existing gap.
- Vitest: 495 passed. Playwright: 97 passed, including the 9 new MFA tests. Secret-hygiene scan passed with the new
  markers. Bundle-size, i18n (seven catalogs), API types, and lint/architecture passed.
- Not run: manual Safari, assistive-technology, and print-dialog evidence (release obligation).

### Required checks

- `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, and `./run-all-tests.sh`.
- `npx tsc -p tsconfig.app.json --noEmit` must stay at or below the 16 existing errors.
- Manual Safari, assistive-technology, and print-dialog evidence remains a release obligation.

### 2026-10-06 — Block 2 targeted verification

- Recovery codes remain masked before initial Reveal; lifecycle Refresh still requires a separate guarded re-reveal.
  Print contains only the existing storage warning and codes; invocation is announced without claiming printing succeeded.
- Verification uncertainty and throttling focus feedback, reconciliation failure focuses Check again, and actual code
  rejection focuses the input with linked feedback. The storage legend has a distinct localized name in all seven locales.
- Enrollment-to-verification replaces history; intentional Back departure still destroys setup.
- Owner tests: 45 passed. App tests: 134 passed initially with one new test synchronization failure; after correction,
  all 16 targeted TOTP cases passed. Chromium keyboard enrollment/print journey: 1 passed. Build, targeted ESLint,
  seven-catalog i18n validation, and duplication scan passed (0 clones; existing deleted-file marker-scan notices).
- Application TypeScript check: the same 15 documented existing errors. Full-suite verification remains block 3.

### 2026-10-06 — Block 3 verification

- Targeted Vitest: 190 passed (50 MFA-owner/controller integration cases and 140 App cases, including 21 TOTP cases).
  Targeted Chromium: all 9 MFA cases passed. Targeted ESLint passed.
- `./run-all-tests.sh` with no timeout: 529 Vitest tests across 15 files and all 97 Chromium journeys passed, including real
  BFCache coverage. Typecheck script, lint/architecture, formatting, build, bundle size (192917 bytes gzip), seven-locale
  catalogs, API-type drift, secret-hygiene deliberate-failure scan, and duplication (0 clones) passed.
- Full gate exits 1 at npm audit: 5 vulnerabilities (4 low, 1 high). The high issue is `source-map-js` <=1.2.1,
  GHSA-68fv-2mgg-jv7q; the low findings concern transitive KaTeX, GHSA-238p-pmpm-9mq7. `package.json` and `package-lock.json`
  have no changes against HEAD. Dependency repair is outside this review-test block; the full gate is not green.
- Post-audit checks were run separately: Tailwind Plus catalog and repository Markdown lint passed. Trivy was skipped
  (not installed). Existing deleted-file notices from duplication marker scanning remain for the moved auth helper files.
- `npx tsc -p tsconfig.app.json --noEmit` exits 2 with the exact same diagnostic text as the pre-block snapshot (empty
  `diff -u`, not merely matching counts). The 15 existing diagnostics are:
  - `App.test.tsx`: TS2769 at 658, 674, 728, 768, 818, 896, 920 (`exact` option); TS2345 at 1135 (table callback arity).
  - `MfaVerificationForm.tsx`: TS2367 at 197 (unreachable `expired` comparison).
  - `api/client.ts`: TS2532 at 36 (possibly undefined value); TS2769 at 93 (optional fetch signal).
  - `passwordResetLink.test.ts`: TS2339 at 285 (`never.aborted`).
  - `sessionController.test.ts`: TS2554 at 2450 (missing fifth argument).
  - `sessionController.ts`: TS2322 at 226 (optional string); TS2375 at 1951 (failure-kind narrowing).
  `npm run typecheck` still checks no application files because root `tsconfig.json` has `files: []`.
- Manual Safari, assistive-technology, and native print-dialog evidence was not run and remains a release obligation.
- Logs are in `/private/var/folders/cv/26sb71t92_95v8hlq7jlqnb40000gn/T/opencode/`, prefixed `story-1-9-block3-`:
  `targeted.log`, `browser.log`, `typecheck-before.log`, `typecheck.log`, `dependencies.log`, `full-initial.log`, and
  `full-final.log` (the required repeat after recording these Markdown notes). Block 3 stays in progress while the audit
  gate is blocked; no story-completion claim is made.

### 2026-10-06 — Block 3 dependency remediation

- Owner-approved minimal repair: `npm update source-map-js --ignore-scripts` changes only `package-lock.json`,
  upgrading `source-map-js` 1.2.1 → 1.2.2 within all parent ranges. `package.json` is unchanged.
- `npm audit --audit-level=high` now exits 0: zero high/critical/moderate findings, four low findings remain for
  GHSA-238p-pmpm-9mq7 (KaTeX and its affected parents).
- Registry inspection confirms the latest `rehype-katex` 7.0.1 and `remark-math` 6.0.0 are already installed;
  latest `micromark-extension-math` 3.1.0 is also installed. Both KaTeX consumers require `^0.16.0` and resolve
  0.16.47, whereas direct KaTeX is already 0.18.7. There is no compatible parent update fixing the low advisory.
  Retained the lows rather than force incompatible KaTeX overrides or the audit-suggested rehype-katex downgrade.
- No math dependencies changed; no separate math-dependency regression run was required.
- Direct `npx tsc -p tsconfig.app.json --noEmit` exits 2 with the same 15 baseline diagnostics: comparison to
  `story-1-9-block3-typecheck-before.log` is empty. New output is `story-1-9-block3-audit-typecheck.log` in the same
  temporary log directory above. The pre-existing root typecheck coverage gap remains.
- `./run-all-tests.sh` with no timeout exited 0: 529 Vitest tests (15 files), 97 Chromium journeys, secret hygiene,
  lint/architecture, formatting, build, bundle size, seven-locale catalogs, API types, duplication (0 clones),
  high-severity audit threshold, Tailwind Plus catalog, and Markdown lint passed. Trivy was skipped (not installed).
  Existing deleted-file notices for the moved auth helpers remain in the marker scan. Full-gate log:
  `/private/var/folders/cv/26sb71t92_95v8hlq7jlqnb40000gn/T/opencode/story-1-9-block3-audit-full.log`.
  The repeat after these verification notes is recorded as `story-1-9-block3-audit-final.log` in the same directory.
- Block 3 is fixed after the successful authoritative gate. This supersedes the initial audit-blocked result above;
  the story stays in review. Manual release evidence remains outstanding as recorded above.

### 2026-10-05 — Pass 1 triage

All survivors are localized corrections, so they route to patch. Clarification under the owner's pre-approval: the
binding `SECURITY-PRIVACY-ACCEPTANCE.md` (lines 618 and 901) and `ACCESSIBILITY-ACCEPTANCE.md` (line 843) govern the
recovery codes:

- The codes need an explicit Reveal before they are first shown.
- The print output contains the codes and the essential storage warning only.

"Codes-only print view" in the intent means no application content or account identity.

**Patch: setup and codes state**

- B1 [medium] [patch] The mask flag sticks after a shield that held nothing, so a new setup or new codes open masked.
- B3 [low] [patch] `#project` treats a missing access record as current.
- B4 [medium] [patch] A verify that succeeds after the user leaves the page drops the codes silently and leaves
  pending state stale. Explain the loss and re-read.
- B5 [medium] [patch] A start that succeeds after the user leaves the page creates a pending enrollment silently.
  Re-read.
- B11 [medium] [patch] The enroll-to-verify navigation pushes a history entry, so Back lands on `/enroll` and
  destroys the setup.
- E2 [medium] [patch] Refresh after a mask that discovers a restricted stage keeps the masked secrets. Destroy them.
- E6 [medium] [patch] An MFA read for a different account keeps the held secrets. Destroy them.

**Patch: recovery-code requirements**

- B7 [medium] [patch] The codes are shown without an explicit initial Reveal, and the print output lacks the storage
  warning. Both deviate from the binding documents above.

**Patch: accessibility**

- B8 [medium] [patch] The verify input has three problems:
  - `aria-invalid` is set on an unknown outcome.
  - Server rejections are not linked to the input with `aria-describedby`.
  - Focus moves to the input after a throttled or failed check.
- B9 [low] [patch] The acknowledgement legend reuses the codes list's name, and printing is never announced.

**Patch: tests**

- B12 [low] [patch] The e2e reveal helper tolerates a shield nondeterministically. Make it deterministic.
- V1 [medium] [patch] No test checks that own scope is required for the MFA routes.
- V2 [medium] [patch] No test covers losing access on the MFA read or a `403 auth_password_change_required`.
- V3 [medium] [patch] No test renders the access-lost shield's copy.
- V4 [low] [patch] No test renders the overview's "Check failed" retry.

**Patch: other**

- B13 [low] [patch] The QR code is re-encoded on every render. Memoize it on its value.

**Rejected**

- B2 [false] [reject] Sharing the `#confirmed` flag is safe. `#applyState` prunes each secret by its own binding
  before confirming.
- B6 [low] [reject] Leaving the codes page without acknowledging (browser exit, logout) destroys the codes. A
  security exit must never be blocked, and there is no `beforeunload` prompt by design.
- B10 [low] [reject] Cancel is not tied to the current path. A user-requested cancel may complete after the user
  leaves.
- E4 [low] [reject] An undeclared 404 or 409 on verify keeps the setup until the next read.
- E5 [false] [reject] OpenAPI declares no 429 for DELETE.
- E7 [low] [reject] A pending replacement started outside this UI fails safely with a proof-required error.
- E8 [low] [reject] An outcome can be announced again after a remount.
- E9 [false] [reject] Ordinary requests must not extend the idle deadline (Story 1-8).
- E10 [false] [reject] Own scope is the owner-approved gate.
- E11 [low] [reject] Host grammar laxness. The URI is generated by the backend.

### 2026-10-06 — Final review closure

Independent final inspection of the repaired diff and regression evidence closes blocks 1–3. Secret lifetime and
late-response repairs are covered in `mfaEnrollment.test.ts`; reveal, print, focus, and navigation repairs in
`App.test.tsx`; authorization/failure recovery and deterministic browser coverage are complete.

B13 disposition supersedes the earlier patch assignment: [low] [reject for MVP]. `TotpQrCode` recomputes a bounded
local QR during render, but no user-visible performance defect was demonstrated. Memoization is optional optimization,
not an acceptance or security requirement. No production change is needed for this finding.

All other accepted repairs are complete. The authoritative gate passed with 529 unit/component tests and 97 Chromium
journeys. Outstanding items remain explicit: four low transitive KaTeX audit findings, 15 unchanged baseline application
TypeScript diagnostics and the root typecheck coverage gap, unavailable Trivy, broader BCG closure, agent-rule conflicts
recorded above, and manual Safari/assistive-technology/print-dialog release evidence. This story's completion does not
claim those release obligations are satisfied.
