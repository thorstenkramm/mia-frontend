---
name: MIA frontend backend contract gaps
status: draft
updated: 2026-10-01
sources:
  - .memlog.md
  - mia/docs/product-requirements.md
  - mia/docs/api.md
  - mia/api-doc/openapi.yaml
  - mia/api-doc/paths/*.yaml
  - mia/api-doc/schemas/**/*.yaml
  - mia/_bmad-output/planning-artifacts/architecture/architecture-mia-2026-08-29/ARCHITECTURE-SPINE.md
  - mia/docs/architecture.md
---

# Backend Contract Gaps

## Purpose

This is a decision-grade dependency handoff from frontend planning to the MIA backend contract owners. It contains only
confirmed release blockers that prevent the frontend from implementing required behavior without guessing, probing, or
weakening a security boundary.

The backend product requirements remain authoritative. OpenAPI remains authoritative for concrete HTTP transport. This
document proposes no silent behavior change. Where the observable contract below is not already confirmed product
behavior, the backend must make and document an explicit product decision before changing OpenAPI or implementation.

The contract owner may choose endpoint names and schema composition. Acceptance depends on observable behavior, not the
illustrative vocabulary in this handoff.

## Release Blockers (17)

### BCG-001: Anonymous CSRF and authentication-session discovery

Status: **OPEN — cold-entry, Story 1-3 login, Story 1-4 MFA, Story 1-5 password-replacement, Story 1-6
recovery/reset, and Story 1-7 invitation slices approved; broader obligations remain.**

Reconciled on 2026-09-27 against backend revision `b83102114802b981a022c237c0746023c0aa6b79`, whose entry correction
followed baseline `0626b751558c8baa7e4645708ef588b309446ed8`. Backend paths and line references in this BCG-001 assessment
refer to the maintained contract at the correction revision. The backend handoff records a passing full backend suite;
the frontend did not rerun backend checks. Other BCG entries have not been broadly re-audited by this update.

#### BCG-001 frontend capability blocked

The complete authentication journey remains blocked outside the approved entry, login, MFA, password-replacement,
recovery/reset, and invitation slices for lifecycle/BFCache handling and safe logout recovery. The owner-approved 2026-09-27 partial exception permits only cold
`GET /api/v1/auth/session`, authenticated-only `GET /api/v1/users/me/capabilities`, and canonical dispatch among
`/login`, `/`, `/auth/mfa`, and `/auth/password-change`. It does not close this composite blocker.
The separate 2026-09-30 Story 1-3 decision below resolves credential-slice authorization and sequencing after the
login error-response correction was rechecked; it does not expand the earlier Story 1-2 decision.
The separate 2026-10-01 Story 1-4 decision resolves only MFA challenge verification and recovery-code consumption;
it does not authorize resend, password replacement, or any broader authentication lifecycle.
The separate 2026-10-01 Story 1-5 decision resolves only required password replacement through the restricted
`password-change` stage; it does not authorize voluntary password change, recovery, reset, or invitations.
The separate 2026-10-01 Story 1-6 decision resolves only staff password recovery on `/login/recovery` and the
fragment-token reset on `/password-reset`; it does not authorize invitations or any broader lifecycle work.
The separate 2026-10-03 Story 1-7 decision resolves only public invitation preview on `/invitation` and acceptance on
`/invitation/accept`; it does not authorize invitation administration or any broader lifecycle work.

#### BCG-001 authoritative product requirement

Owner decision, 2026-10-05: Story 1-8 may implement lifecycle warning, continuation, shielding, explicit recovery,
and logout for existing auth/Home surfaces. `FRONTEND-PRD-FOUNDATION.md` records the approved semantics aligned with
`mia/docs/api-authentication-and-user-invitation.md` §Session lifecycle and §Error handling. This does not close BCG-001:
missing SSE/header obligations and composite release evidence remain open.

- Browser authentication uses expiring stateless cookies. Observed expiry requires shielding and explicit discovery;
  the discovered stage determines whether fresh credentials are needed after a shared-session renewal
  (`mia/docs/product-requirements.md:583-607`).
- Restricted `mfa` and `password-change` stages permit only their named actions and logout, expire after 30 minutes, and
  rotate on successful transitions (`mia/docs/product-requirements.md:627-642`).
- The concrete cross-route transport requires `GET /api/v1/auth/session` to issue or refresh anonymous CSRF state and
  requires the token on every unsafe public operation (`mia/docs/api.md:133-147`). Discovery's public rate limit and
  uniform invalid-authentication result are documented in `mia/api-doc/paths/auth.yaml#/sessionDiscovery` and
  `mia/api-doc/responses/errors.yaml#/RateLimited`.
- Only explicit Continue working advances authenticated idle expiry; ordinary requests, polling, SSE establishment,
  reconnection, heartbeats, and background work do not. The absolute lifetime begins at completion of the final login
  stage and remains fixed (`mia/docs/product-requirements.md:583-598`).
- The maintained backend deliberately provides a reduced stateless logout guarantee: delayed ordinary and Continue
  working responses cannot restore usable authentication, but delayed authentication transitions may restore it
   (`mia/docs/product-requirements.md:599-607`). The frontend owner accepted this limitation on 2026-09-27, as recorded
   in `FRONTEND-PRD-FOUNDATION.md` §Security, Privacy, and Safety; only the former logout product conflict is closed.

#### BCG-001 transport and implementation progress

These are requirement-level findings, not partial closure or permission to bypass the open-gap rule.

- **Stage discovery:** OpenAPI 3.2 now maps `GET /api/v1/auth/session` and `POST /api/v1/auth/session-continuations`
  (`mia/api-doc/openapi.yaml:42-47`). Discovery permits anonymous or cookie-authenticated access, needs no body or CSRF
  header, and defines `200`, `406`, `429`, and `500` responses. `SessionDiscoveryDocument` selects `data: null` with
  `meta.stage: anonymous`, or an `AuthSession` with `data.attributes.stage`. The implementation returns the bound MFA
  challenge ID, and the schema conditionally requires that non-empty opaque identity only for `stage: mfa`.
  Invalid/stale/banned/deleted/generation-invalid authentication collapses to anonymous. References:
  `mia/api-doc/paths/auth.yaml:31-61`, `mia/api-doc/schemas/resources/resources.yaml:269-320`,
  `mia/internal/auth/auth.go:474-518`, and `mia/internal/httpserver/httpserver.go:312-331,450-503`.
- **Minimal disclosure and entry order:** the discovery implementation returns stage, deadlines, account resource
  identity, and the stage-applicable opaque challenge, not roles, profile, factor secrets, or destinations. Restricted flows remain
  focused; MFA precedes password replacement. Authenticated discovery proceeds to capabilities, not directly to Home.
  The maintained Home contract permits an empty Home after successful capability discovery and gates each dependent
  section by its action and scope (`mia/docs/product-requirements.md:235-255`,
  `mia/api-doc/paths/users.yaml:50-82`). This is relevant entry evidence, not closure of BCG-003.
- **Anonymous CSRF:** anonymous discovery rotates the readable public cookie, including after invalid session clearing.
  Unsafe operations declare `csrfToken`; cookie/header names and same-origin handling are maintained in
  `mia/api-doc/openapi.yaml:217-233` and `mia/docs/api.md:133-147`. Login-stage transitions and logout rotate CSRF;
  bootstrap and middleware are implemented in `mia/internal/auth/auth.go:474-486` and
  `mia/internal/httpserver/httpserver.go:770-804`. The all-stage issuance and stale-token evidence qualifications below
  remain open.
- **Restricted and authenticated deadlines:** `AuthSession` requires `idle_expires_at` and `absolute_expires_at`;
  discovery and shared `Session` responses also declare both deadline headers. Restricted stages have a non-refreshing
  30-minute lifetime; a full session starts a 30-minute idle and 12-hour absolute lifetime. Implementation serializes UTC
  instants and rejects either expired deadline (`mia/api-doc/paths/auth.yaml:485-493`,
  `mia/api-doc/schemas/resources/resources.yaml:269-299`, `mia/internal/httpserver/httpserver.go:402-503`,
  `mia/internal/auth/auth.go:507-518`). Deadline availability is implemented; complete expiry evidence remains open.
- **Non-refreshing reads and SSE:** ordinary access is non-refreshing by default; no invented request flag is needed.
  This is maintained product behavior (`mia/docs/product-requirements.md:589-598`) and API narrative
  (`mia/docs/api.md:122-131`), with explicit capability and current-work read descriptions in
  `mia/api-doc/paths/users.yaml#/capabilities` and `mia/api-doc/paths/tutoring.yaml#/tutoringSessionCurrentWork`.
  The SSE operation is `mia/api-doc/paths/tutoring.yaml#/tutorResponseEvents`. Operation-level OpenAPI coverage and
  browser reconnect evidence still need reconciliation as listed below.
- **Continue working:** `sessionContinuations` requires a full session plus CSRF and returns shared `Session` on `200`;
  `401`, restricted-stage/CSRF `403`, and `406` are defined. `ExtendSession` advances idle to at most the existing
  absolute deadline, and the same response contains both deadlines; no second deadline read is necessary
  (`mia/api-doc/paths/auth.yaml:63-78,485-493`, `mia/internal/httpserver/httpserver.go:334-353`,
  `mia/internal/auth/auth.go:489-518`). The operation itself does not open/reconnect SSE.
- **Representations and caching:** discovery's JSON:API success/error media types, optional authentication, public
  rate-limit response, and `Cache-Control: no-store` are declared. The root contract applies no-store to every API
  response, including streaming and errors (`mia/api-doc/openapi.yaml:9-15`,
  `mia/api-doc/responses/errors.yaml:19-30,43-48`). This does not close BCG-005's separate acceptance evidence.

#### BCG-001 remaining conflicts and transport questions

1. **Resolved product conflict — reduced stateless logout accepted, 2026-09-27.** Source owner instruction:
   "frontend’s logout requirements shall be revised", choosing the documented backend limitation. The decision in
   `FRONTEND-PRD-FOUNDATION.md` accepts that delayed login, MFA-completion, or password-change responses admitted before
   logout may restore authentication, and no server-side per-browser revocation or durable guarantee across suspended
   or terminated contexts exists. Backend authorities remain `mia/docs/product-requirements.md:599-607`,
   `mia/api-doc/paths/auth.yaml:80-99`, and `mia/api-doc/openapi.yaml:217-228`. The reduced guarantee protects usable
   authentication against ordinary/Continue responses, not physical absence of every late cookie. Frontend requirements
   retain shielding, known-transition quiescence, `204` plus subsequent anonymous discovery, independent tab checks,
   explicit late-transition reconciliation, and no automatic unsafe replay. Unrelated-device logout scope is unchanged.
   This closes only the product-conflict portion; logout browser evidence and the composite BCG-001 remain open.
2. **Non-refreshing transport completeness.** Maintained product behavior covers ordinary reads, mutations, and SSE,
   and the implementation exposes deadline headers centrally. OpenAPI declares these headers on discovery/auth-session
   responses, but not capability, current-work, or SSE success responses. The SSE operation does not explicitly describe
   the non-refreshing reconnect or the client sequence after Continue working. “The continuation POST does not reconnect”
   does not settle whether the frontend may subsequently open one replacement after the non-refreshing ordered checks
   required by `FRONTEND-STATE-MACHINES.md:176-185`. Publish that transport guarantee and sequence rather than infer it
   from implementation. Lifecycle no-request behavior remains a frontend evidence obligation.
3. **Historical frontend lifetime wording resolved, 2026-10-05.** The owner approved correcting the affected frontend
   contracts: only Continue working refreshes idle expiry; ordinary requests and SSE never do. Warnings follow returned
   deadlines, unknown continuation outcomes shield immediately, and expiry permits explicit discovery/full-gate recovery.
   This resolves the wording conflict only, not the remaining transport or release-evidence gaps.
The 2026-09-27 backend correction at `b83102114802b981a022c237c0746023c0aa6b79` aligned CSRF replacement wording,
declared duplicate-cookie `403` responses, conditionally requires the MFA challenge identity, and supplies all four
session examples. Those corrections authorize only the partial cold-entry slice above.

#### BCG-001 acceptance evidence assessment

- **Inspected backend coverage:** `mia/internal/auth/auth_test.go` contains
  `TestSessionDiscoveryReturnsAnonymousAndAuthoritativeStages` (349-389),
  `TestMFADiscoveryReturnsOnlyOpaqueChallenge` (391-406),
  `TestOnlyContinueWorkingExtendsAuthenticatedSession` (252-315),
  `TestBrowserRestartRetainsBoundAuthenticatedSession` (317-347), and
  `TestBanDeletionAndSecurityGenerationInvalidateCookies` (444-475). These cover selected stage reloads, deadlines,
  non-refresh, invalidation, and restart behavior. `TestRestrictedRoutesRequireValidUnexpiredSession` (131-155) forces an
  expired idle value; it is not a complete clock-controlled restricted/absolute-expiry matrix.
- **Reduced logout evidence:** `TestLogoutReorderingUsesReducedStatelessGuarantee` (408-442) deliberately asserts that a
  delayed login pair is authenticated after logout, while a delayed Continue cookie with the new marker is anonymous and
  another browser stays authenticated. This is backend cookie-pair simulation, not multi-tab browser evidence, and
  supports the accepted limitation rather than proving frontend shielding, transition quiescence, or reconciliation.
- **CSRF coverage is incomplete for the specified journey:** no-cookie discovery asserts CSRF issuance, and
  `mia/internal/httpserver/httpserver_test.go:17-214` covers cookie attributes and missing/mismatched/duplicate/cross-site
  rejection. Auth and invitation tests obtain their public CSRF through `/api/v1/missing`
  (`mia/internal/auth/auth_test.go:1775-1786`, `mia/internal/invitation/invitation_test.go:574-585`). Those tests do not prove
  the required no-cookie **documented discovery → login/recovery/reset/preview/acceptance** integration sequences.
  Rotation and stale-token rejection across all transitions still need a requirement-mapped evidence record.
- **Capability evidence relevant to entry:** `mia/internal/capability/capability_test.go:59-80` checks non-refreshing
  access; tests beginning at lines 82, 105, 130, and 185 cover unassigned accounts, restricted-stage denial, exact mentor
  pair/removal behavior, and failure without partial scope. These do not supply browser mounting or lifecycle evidence.
- **Recorded backend verification, not a new run:**
  `mia/_bmad-output/implementation-artifacts/spec-2-2-discover-and-extend-browser-sessions-safely.md:94-122` records the
  reduced-guarantee decision and full-check result.
  `mia/_bmad-output/implementation-artifacts/spec-frontend-entry-contracts.md:111-132` records the later full check,
  including race, lint, duplication, Trivy, OpenAPI, and Markdown; optional `govulncheck` was unavailable/skipped. It
  explicitly says frontend mounting was not browser-tested. Neither record closes this frontend blocker.
- **Still required after the entry correction:** complete documented-bootstrap/CSRF and restricted/idle/absolute boundary
  tests; clock-controlled browser tests for lifecycle silence, explicit Refresh/Try now, same-response continuation
  deadlines, and bounded SSE reopening; multi-tab delayed response/logout tests including authentication transitions and
  unrelated-device preservation; and BFCache no-protected-paint evidence. Backend recorder tests and cookie simulation
  cannot stand in for these browser results. Story 1-2 supplies only cold-entry browser evidence.

#### BCG-001 Story 1-2 partial resumption decision

Owner decision, 2026-09-27: Story 1-2 may resume for the documented cold-entry pair and four canonical entry paths named
above. A successful session response alone never mounts Home; successful capability discovery is also required. Failed
or malformed reads retain a neutral localized error with no protected content. The same decision authorizes only the
restricted-stage logout path at `/auth/logout`: one explicit CSRF-protected logout request, phase-specific safe CSRF
recovery after explicit Retry, independent anonymous confirmation, and explicit reconciliation behind the privacy
shield. Protocol-fake and Playwright evidence is required. This exception does not authorize credentials,
MFA/password forms, broader logout or lifecycle/BFCache behavior, Home features, broader protected routing, or
automatic revalidation, and does not close BCG-001 or BCG-003.

#### BCG-001 Story 1-3 login-slice decision

Owner decision, 2026-09-30: align Story 1-3 with the existing flow in
`mia/docs/api-authentication-and-user-invitation.md` §Password sign-in and restricted-stage isolation. The guide is
sequencing guidance, not a second transport contract. This focused reconciliation inspected backend revision
`b83102114802b981a022c237c0746023c0aa6b79`; product requirements and the implemented OpenAPI remain authoritative.

The approved slice is username/password submission through `POST /api/v1/auth/login`, authoritative stage dispatch,
restricted-stage isolation, and the authenticated capability/scope gate before the basic Home shell. It has no
server-side request-ID or idempotency requirement. Any internal attempt correlation is page-local only, adds nothing
to the wire, and grants no replay guarantee. Request/response schemas, media types, security, and errors are referenced
from `mia/api-doc/paths/auth.yaml#/login`, `#/Session`, and their referenced schemas rather than copied here.

A definitive successful login response in the current security epoch supplies the authoritative stage directly; no
redundant discovery is inherently required. Its `authenticated` stage proceeds to the non-refreshing capability/scope
gate; its restricted stages expose only the focused entry flow plus approved logout. Discovery remains the authority
for cold entry, reload, and permitted reconciliation. This is the owner-approved login-specific clarification of
generic post-transition rediscovery wording, not an exception to CSRF freshness or the ordered protected-mount gate.
Serialize transitions, invalidate work queued under the old token, and read the current CSRF cookie immediately before
the next unsafe dispatch. Timeout, abort, response loss, or an internal failure must not be treated as proof that no
transition occurred; reconcile current state without automatic unsafe replay or an invented login-attempt lookup.

The existing reduced stateless logout decision and `SECURITY-PRIVACY-ACCEPTANCE.md` §Logout and Privacy Screen still own
late-transition handling: known-transition quiescence, response fencing, retained shielding, and phase-specific explicit
reconciliation. A late login cannot bypass a retained logout flow or restore protected UI automatically. Logout
confirmation still requires settled known transitions, `204`, and subsequent independent anonymous discovery; neither
local correlation nor abort proves server cancellation or cookie revocation.

**Transport correction rechecked for this narrow login alignment:** the maintained backend checkout at revision
`b83102114802b981a022c237c0746023c0aa6b79` now declares login's `500` response at
`mia/api-doc/paths/auth.yaml:30` through `../responses/errors.yaml#/InternalError`. This matches the existing shared
handler behavior and clears the sole operation-level transport finding recorded for Story 1-3. It does not close
BCG-001's broader lifecycle, logout, continuation, SSE, BFCache, or release-evidence obligations.

Inspected evidence, not a new test run: `mia/docs/entry-contract-evidence.md` maps schema/stage, CSRF, non-refreshing
capability, and reduced-logout tests. `mia/internal/auth/auth_test.go` additionally covers login validation and password
gating (`TestLoginPasswordGateStrictInputAndAuditEvents`), throttling (`TestLoginFailuresDelayThenThrottleAndAudit`),
and rejection of client IDs (`TestAuthCreateResourcesRejectClientGeneratedIDsAsDomainErrors`). Backend evidence is not
frontend browser acceptance; direct-success dispatch, no redundant read, restricted non-fetch, ambiguity, and late-login
logout ordering still need implementation evidence. This decision preserves Story 1-2 and its approved restricted
logout. It does not authorize MFA/password-replacement forms, recovery/invitations, Home features, broader lifecycle,
SSE or BFCache work, or close BCG-001, BCG-003, or other gaps. Their remaining evidence obligations are unchanged.

#### BCG-001 Story 1-4 MFA-slice decision

Owner decision, 2026-10-01: Story 1-4 may implement only
`POST /api/v1/auth/mfa-challenges/{id}/verifications` and
`POST /api/v1/auth/mfa-challenges/{id}/recovery-code-consumptions` on `/auth/mfa` and `/auth/mfa/recovery` under
`Restricted(mfa)`, plus the already approved restricted-stage logout. A definitive response chains to its returned
stage: `password-change` continues to the existing Story 1-2 restricted placeholder/flow, while `authenticated`
continues through the existing capability/scope gate. The sequencing guidance is
`mia/docs/api-authentication-and-user-invitation.md` §Complete an MFA login challenge, §MFA recovery codes, §Error
handling and ambiguous outcomes, and §Known integration gaps and disagreements; OpenAPI remains transport authority.

The challenge UI is method-neutral because `AuthSession` exposes neither factor method nor destination. It provides one
six-digit code field and a recovery-code path. Story 1-4 does not call the resend operation. Method disclosure and safe
login-challenge resend observability remain unresolved; the frontend must not infer the method from an ID, probe resend,
or show method-specific instructions. An SMS user whose message is lost must restart sign-in in release one.

Recovery-code entry accepts display hyphens, whitespace, and ASCII lowercase. Immediately before dispatch the frontend
removes hyphens and whitespace and applies ASCII uppercase, then sends only a value matching the OpenAPI pattern
`^[0-9A-HJKMNP-TV-Z]{16}$`. Invalid local input sends no request. It performs no Crockford alias mapping. This resolves
the frontend normalization question recorded in the backend guide's §Recovery-code normalization (lines 667-672)
without changing the wire contract.

This decision does not authorize password-replacement forms, resend, password recovery, invitations, broader logout or
lifecycle/SSE/BFCache behavior, and does not close BCG-001 or BCG-003. Existing fresh-CSRF, transition serialization,
response fencing, no-replay, ambiguity discovery, restricted isolation, and logout ordering requirements still apply.

#### BCG-001 Story 1-5 password-replacement-slice decision

Owner decision, 2026-10-01: Story 1-5 may implement only `POST /api/v1/auth/password-changes` (`changePassword`) on
`/auth/password-change` under `Restricted(password-change)`, plus the already approved restricted-stage logout. The
sequencing guidance is `mia/docs/api-authentication-and-user-invitation.md` §First password change and later forced
replacement (lines 288-315) and §Error handling and ambiguous outcomes; OpenAPI remains transport authority. The request
carries only the new password and its confirmation; there is no current-password field.

A definitive `200` with stage `authenticated` carries rotated cookies and CSRF. The frontend reads the current CSRF
cookie again immediately before any later unsafe dispatch and proceeds directly to the existing non-refreshing
capability/scope gate (`GET /api/v1/users/me/capabilities`) before Home, with no additional session discovery.

`403 auth_password_change_required` from this operation, including the expired or invalid restricted cookie the backend
clears, follows guide lines 259 and 641: the frontend shows no fixed terminal message and infers nothing from the code
name. It rediscovers the actual stage through `GET /api/v1/auth/session` and follows it; `anonymous` returns to sign-in.
The POST is never replayed.

An undeclared `5xx`, timeout, abort, network loss, or malformed success is an unclear outcome, handled as in Story 1-4:
an outcome-unknown presentation, no automatic resend, and reconciliation through session discovery (guide line 646).
The operation's missing `500` declaration is accepted for this slice on the Story 1-4 precedent.

Before dispatch, the frontend checks 12-128 Unicode code points, at most 512 UTF-8 bytes, and an exact confirmation
match, never trimming or normalizing input. A failed check names the failed rule through the established accessible
form-error pattern and sends nothing. The server remains final authority: `422 auth_invalid_password` shows one general
"password not accepted" result that also covers the server-only common-password check, keeps the user in the form
(guide line 643), and infers no specific failed rule.

This decision does not authorize voluntary password change, password recovery or token reset, invitations, broader
logout or lifecycle/SSE/BFCache behavior, or anything else in BCG-001, and does not close BCG-001 or BCG-003. Existing
fresh-CSRF, transition serialization, response fencing, no-replay, ambiguity discovery, restricted isolation, and logout
ordering requirements still apply.

#### BCG-001 Story 1-6 recovery-and-reset-slice decision

Owner decision, 2026-10-01: Story 1-6 may implement only `POST /api/v1/auth/password-recovery-requests`
(`requestPasswordRecovery`) on `/login/recovery` and `POST /api/v1/auth/password-resets` (`resetPassword`) on
`/password-reset`, plus the existing logout where the signed-in interstitial below calls it. The sequencing guidance
is `mia/docs/api-authentication-and-user-invitation.md` §Password recovery and token reset (lines 317-356); OpenAPI
remains transport authority.

- **Path:** the frontend adopts `/password-reset`, the path the backend already emails
  (`mia/docs/product-requirements.md:559-561`). The backend does not change.
- **Token handling:** synchronous bootstrap captures the fragment token before the application runs, removes the
  complete fragment with `history.replaceState`, and keeps the token in memory only, never stored. Each request reads a
  fresh CSRF cookie. Nothing is resent automatically, and ambiguous outcomes are modeled explicitly.
- **Reset states:** the backend has no token pre-check and returns one uniform `422 auth_invalid_reset_token`. The
  states are form ready (token captured, nothing checked); one uniform "link invalid or no longer usable" result for
  `auth_invalid_reset_token`, which drops the token and offers Request a new link (`/login/recovery`) and Back to
  sign-in; password rejected for `422 auth_invalid_password`, which keeps the token and form; no token (no fragment or
  token lost on the route), rendered exactly like the uniform invalid result; and outcome unknown. A client-side
  canonical lowercase UUID v4 check is allowed only as a pre-dispatch rule and renders identically to the uniform
  invalid result. Invalid, expired, consumed, and throttled tokens are never distinguished in copy, focus, actions, URL,
  title, announcement, or timing.
- **Recovery request outcomes:** the operation declares `204/400/403/406/413/415/422`, and throttling returns `204`,
  so no `429` path exists. `204` shows the uniform "If an eligible account exists, we've sent an email" result and
  never confirms account existence or delivery. `403 csrf_invalid` refreshes CSRF through session discovery, keeps the
  username, and allows a deliberate resubmit. `400/406/413/415/422` show a generic "request couldn't be processed"
  error with no automatic retry. An undeclared `5xx`, timeout, or network loss shows "We couldn't confirm your
  request", says an email may still arrive, and offers an explicit Send again that sends a new request only on a click.
- **Reset outcomes:** the operation declares `204/400/403/406/413/415/422/429`; `429` is the global public limit. `429`
  shows "Too many attempts, try again later", honors a valid `Retry-After`, keeps the token, clears the password
  fields, and allows a deliberate resubmit. `403 csrf_invalid` refreshes CSRF through session discovery, keeps the
  token, clears the passwords, and allows a deliberate resubmit. `400/406/413/415` follow Decision 7 below. An
  undeclared `5xx`, timeout, or network loss is outcome unknown: drop the token, clear the
  passwords, offer Try signing in with your new password (`/login`) and Request a new link (`/login/recovery`), and
  offer no resubmit. The missing `500` declarations are accepted on the Story 1-4/1-5 precedent.
- **Reset success:** `204` stays on `/password-reset` with a focused success state whose heading receives focus and is
  announced: "Your password has been changed.", a note that MFA remains enabled, and a note that other signed-in
  browsers are not signed out automatically and expire on their own. It never says "signed out everywhere". A Sign in
  action goes to `/login`, where normal cold discovery runs; there is no automatic redirect. The token and password
  fields are dropped.
- **Link opened while signed in:** for stage `mfa`, `password-change`, or `authenticated`, token capture and stripping
  happen first, then discovery. A focused interstitial with no user name, protected title, breadcrumb, application
  navigation, or prefetch says "You're currently signed in. To reset a password with this link, sign out first." Sign
  out and continue calls the existing logout; after its confirmed anonymous result the reset form shows with the
  in-memory token. Go back drops the token and dispatches to the current stage. If logout fails or its outcome is
  unknown, the token is dropped and the existing logout handling owns recovery; logout is never retried automatically.
  The interstitial follows from session-stage discovery alone: for `authenticated`, the capability read is deferred
  and runs only if the user deliberately chooses Go back.
- **Decision 7 (2026-10-01), generic reset rejection:** after a reset `400`, `406`, `413`, or `415`, discard the token
  and clear the password fields. Show the generic "request couldn't be processed" error with Request a new link
  (`/login/recovery`) and Back to sign-in. Offer no resubmit.

This decision does not authorize invitation preview or acceptance (Story 1-7), lifecycle/SSE/BFCache behavior, safe
logout recovery beyond the existing handling, or anything else in BCG-001, and it does not close BCG-001 or BCG-003.
Existing fresh-CSRF, serialization, response fencing, no-replay, restricted isolation, and logout ordering requirements
still apply.

#### BCG-001 Story 1-7 invitation-slice decision

Owner decision, 2026-10-03: Story 1-7 may implement only `POST /api/v1/invitation-previews` (`previewInvitation`) on
`/invitation` and `POST /api/v1/invitation-acceptances` (`acceptInvitation`) on `/invitation/accept`, plus the existing
logout where the signed-in interstitial below calls it. The sequencing guidance is
`mia/docs/api-authentication-and-user-invitation.md` §Preview the bearer invitation, §Accept and create the account,
and §Error handling and ambiguous outcomes; OpenAPI remains transport authority.

- **Token handling:** the Story 1-6 bootstrap applies to `/invitation#token=<uuid>`. It captures a canonical lowercase
  UUID v4 token before the application runs, removes the complete fragment with `history.replaceState`, and keeps the
  token in memory only, handed from `/invitation` to `/invitation/accept` inside the active flow. Each request reads a
  fresh CSRF cookie and is sent at most once per deliberate activation. Nothing is resent automatically.
- **Preview:** `200` shows only the invited role. `422 invitation_invalid`, a malformed fragment, and a missing or lost
  token share one uniform invalid presentation with Sign in (`/login`). `429` (honoring a valid `Retry-After`) and
  `403 csrf_invalid` (CSRF refreshed through session discovery) keep the token and allow a deliberate retry.
  `400/406/413/415`, an undeclared `5xx`, timeout, network loss, or a malformed success drop the token and offer Sign
  in; the user reopens the email link to try again.
- **Acceptance fields:** username, password, password confirmation, language, country, and time zone are required
  visible fields. Language is prefilled from the negotiated interface locale and time zone from the browser's IANA time
  zone; the user can change both. The Story 1-5 local password rules apply before dispatch, and failed local checks
  send nothing.
- **Acceptance outcomes:** `201` shows account created with no session claim and a Sign in action to `/login`; the
  token and fields are dropped. `409 username_taken`, `422 auth_invalid_password`, `422 auth_invalid_request`, `429`,
  and `403 csrf_invalid` keep the token, clear the password fields, and allow a deliberate resubmit after correction.
  `409 invitation_email_registered`, `422 invitation_invalid`, `400/406/413/415`, and outcome unknown (undeclared
  `5xx`, timeout, network loss, Stop waiting, or a malformed success) drop the token and fields and offer no resubmit.
  Outcome unknown makes no creation claim and offers Sign in and reopening the original email link, stating that
  neither proves the prior outcome.
- **Reopened link after ambiguity:** an invalid reopened link always shows the one uniform invalid result with Sign
  in. The frontend keeps no record of an earlier attempt, so `FRONTEND-STATE-MACHINES.md` §27 Consumed-token ambiguity
  is that uniform result.
- **Link opened while signed in:** the Story 1-6 interstitial applies to both routes, from stage discovery alone, with
  the capability read deferred until a deliberate Go back. Sign out and continue calls the existing logout; after its
  confirmed anonymous result the preview runs with the in-memory token. Go back, a failed logout, or an unknown logout
  outcome drops the token.
- **Direct entry:** `/invitation/accept` opened or reloaded without an active flow token shows the uniform invalid
  result.

This decision does not authorize invitation administration, delivery reconciliation (BCG-006), Revoke or Delete
(BCG-014), lifecycle/SSE/BFCache behavior, or anything else in BCG-001, and does not close BCG-001 or BCG-003. Existing
fresh-CSRF, serialization, response fencing, no-replay, restricted isolation, and logout ordering requirements still
apply.

#### BCG-001 required observable contract

- Provide a documented, same-origin session-discovery operation usable with no existing cookies.
- Always issue or refresh the readable CSRF cookie needed by subsequent unsafe public requests.
- Authoritatively distinguish anonymous, MFA, password-change, and authenticated stages.
- In the MFA stage, return the bound challenge identity needed for the documented challenge routes.
- Return the relevant non-refreshing restricted-stage expiry and authenticated idle and absolute expiry as UTC
  instants sufficient for truthful warning and reauthentication behavior.
- Define CSRF rotation after every auth transition and the result when a stale or invalid session cookie is cleared.
- Define the reduced stateless logout guarantee and discovery reconciliation as maintained in the backend authorities
  above. Accept late authentication-transition restoration; do not require universal anti-restoration or physical
  cookie absence. Preserve logout scope without invalidating unrelated devices. The security companion owns frontend
  confirmation and shielding obligations under the 2026-09-27 decision.
- Provide a documented non-refreshing mode for the ordered session, capability, scope, resource, work-state, and SSE
  operations started only by explicit Refresh or reconnect actions. Browser lifecycle events themselves send no request.
- Provide one explicit Continue working operation whose success returns the refreshed authoritative idle deadline and
  unchanged absolute deadline in the same response. It must not require a second automatic deadline read.
- Define explicit SSE reconnect so Try now can reauthorize and open one replacement EventSource without extending idle
  expiry. State whether Continue working may open that replacement after its activity-refresh response.
- Return unchanged authoritative idle and absolute expiry after every non-refreshing check.
- Define JSON:API success and error representations, security declaration, unauthenticated rate limiting, and
  `Cache-Control: no-store`.
- Do not expose cookie contents, secrets, roles, profile data, or more account data than stage recovery requires.

#### BCG-001 forbidden frontend workaround

The frontend must not inspect cookies, decode implementation details, guess an undocumented route, or infer stage by
calling protected endpoints. It must not probe stage-specific mutations, omit CSRF, briefly render protected UI before
discovery, or preserve a previously authenticated state when discovery is unavailable. It must not rely on request
cancellation, tab timing, response order, or cookie inspection to prevent a late pre-logout response from restoring
authentication. Automatic lifecycle traffic must not be presented as user activity.

#### BCG-001 acceptance evidence needed

- The OpenAPI path, schema, security, headers, rate-limit errors, and four stage examples are implemented; retain their
  schema/example regression evidence while this composite entry remains open.
- Backend tests beginning with no cookies and obtaining valid CSRF before login, recovery, reset, invitation preview,
  and invitation acceptance.
- Backend tests for MFA and password-change reload, expiry, invalid security generation, CSRF rotation, stale-token
  rejection, logout, and authenticated idle/absolute expiry.
- Multi-tab browser tests distinguishing delayed ordinary/Continue responses from login, MFA-completion, and
  password-change responses. Prove known-transition quiescence, `204` plus independent subsequent anonymous checks,
  truthful confirmation, shielding and explicit reconciliation after a late transition, and no automatic unsafe replay.
  Include suspended/terminated contexts and preserve unrelated devices; do not assert universal cookie absence.
- Clock-controlled tests proving lifecycle events send no authenticated request; explicit Refresh and Try now do not
  move idle expiry; and Continue working returns a refreshed idle and unchanged absolute deadline in one response.
- Browser integration evidence that cold load and BFCache restoration reveal no protected content before discovery.

### BCG-002: Cross-course active tutoring-session discovery

#### BCG-002 frontend capability blocked

Home continuation, reload recovery, post-login recovery, device-change recovery, and reconciliation after an ambiguous
session-creation response or `tutoring_active_session` conflict are blocked.

#### BCG-002 authoritative product requirement

- A student may have only one active tutoring session across all courses
  (`mia/docs/product-requirements.md:1084-1096`).
- That session does not expire from inactivity and remains active until the owning student finishes it
  (`mia/docs/product-requirements.md:1107-1113`).
- After authentication, the student must be able to resume it after logout, browser closure, network interruption, or
  device change (`mia/docs/product-requirements.md:1114-1116`).
- Cross-device continuation is an explicit acceptance scenario (`mia/docs/product-requirements.md:1717-1720`).

#### BCG-002 current docs/OpenAPI mismatch

- OpenAPI exposes only course-scoped collection access and ID-addressed session access
  (`mia/api-doc/openapi.yaml:138-155`).
- The collection requires a known `course_id` and offers only pagination. It has no active-state filter or
  current-active alias (`mia/api-doc/paths/tutoring.yaml:1-23`).
- Creation can return `409 tutoring_active_session` but supplies no contract for locating that session
  (`mia/api-doc/paths/tutoring.yaml:24-62`).
- `GET /api/v1/tutoring-sessions/{id}` helps only when the frontend already knows the session ID
  (`mia/api-doc/paths/tutoring.yaml:64-80`).

#### BCG-002 required observable contract

- Provide one authoritative operation that returns the current student's active tutoring session across all courses or
  an unambiguous no-active-session result.
- Make the lookup atomic with respect to the backend's one-active-session invariant; paginating courses is not an
  equivalent contract.
- Return enough existing session identity and course context to navigate to and retrieve the session through authorized
  resource operations.
- Define authenticated success, none, sign-in-expired, and existence-safe unavailable outcomes.
- Make this operation the documented reconciliation path after ambiguous creation and
  `409 tutoring_active_session`.
- Apply `Cache-Control: no-store`.

#### BCG-002 forbidden frontend workaround

The frontend must not enumerate courses to hunt for a session or cache a session ID as the source of truth. It must not
ask the student to remember a course or URL, probe arbitrary IDs, or offer another session before authoritative
discovery returns none.

#### BCG-002 acceptance evidence needed

- OpenAPI path and concrete success/none/error schemas with authorization and cache headers.
- Backend concurrency tests proving zero or one result while two devices create, finish, remove membership, or delete
  relevant data.
- Integration tests for login on a new device, reload, lost creation response, and active-session conflict. Each must
  resume the same retained session without duplicate creation.
- Existence-hiding tests for unknown, deleted, and out-of-scope state.

### BCG-003: Server-authored current-account capabilities and scope

Status: **OPEN — cold-entry capability discovery implemented; broader authorization evidence and bounds remain.**

#### BCG-003 frontend capability blocked

The unified Learn, Prepare, Mentor, Administer, and Profile/security shell cannot be rendered or updated safely for
single-role and multi-role accounts. Action visibility and course or student scope cannot be determined without
duplicating authorization policy or learning it through denials.

#### BCG-003 authoritative product requirement

- Authorization depends on action, role, course assignment, student assignment, ownership, and material scope; multiple
  roles grant only the union valid in the relevant scope (`mia/docs/product-requirements.md:107-119`).
- Administrator, supervisor, mentor, and student capabilities are distinct and scoped
  (`mia/docs/product-requirements.md:160-227`).
- Global roles do not broaden course or student scope, and profile visibility has explicit assignment boundaries
  (`mia/docs/product-requirements.md:233-250`).
- Every authenticated request reloads current roles and assignments rather than trusting the cookie
  (`mia/docs/api.md:100-113`).

#### BCG-003 transport progress

- OpenAPI now defines authenticated-only `GET /api/v1/users/me/capabilities` with the complete release-one action catalog,
  explicit unavailable actions, complete currently unpaginated assignment arrays, empty-scope examples, `no-store`, and
  non-refreshing semantics. The operation permits the basic empty Home shell after successful discovery; every section
  and target operation remains independently gated.
- The 2026-09-27 owner decision permits Story 1-2 to use this operation only after session discovery reports
  `authenticated`. It does not authorize broader shell sections or close BCG-003.
- Bounded retrieval for potentially large assignment scope and the broader mutation, cross-tab, and authorization
  evidence remain deferred release work.

#### BCG-003 required observable contract

- Provide a server-authored current-account representation of capabilities and the course, student, or global scopes in
  which each capability applies.
- Make it sufficient to decide shell section visibility and discover valid entry scopes without reimplementing policy.
- Represent no capabilities and empty scope explicitly.
- Ensure revalidation reflects role grants, assignment additions/removals, ban or account-state changes, and membership
  changes on the next request, consistent with backend authority.
- Provide a non-refreshing authorization mode for capability and scope checks started by explicit Refresh, Try now, or
  another documented user-initiated recovery action. Browser lifecycle events only mark revalidation needed.
- Keep each resource endpoint authoritative for the requested action; discovery is not an authorization grant or a
  substitute for operation-level checks.
- Define authenticated errors and `Cache-Control: no-store`.

#### BCG-003 forbidden frontend workaround

The frontend must not derive permissions from role labels alone, rebuild backend policy from collections, or probe
denied operations. It must not overfetch and hide data, treat an opaque ID as authority, or retain actions and protected
content after scope revalidation removes them.

#### BCG-003 acceptance evidence needed

- A reviewed capability vocabulary mapped to existing product actions, with scope semantics and no speculative future
  capability families.
- OpenAPI path or current-account schema, concrete examples for representative single-role and multi-role accounts, and
  explicit empty-scope behavior.
- Authorization matrix tests across role union, course assignment, student assignment, ownership, account state, and
  resource state.
- Mutation and cross-tab integration tests proving gained and lost capabilities appear on the next authoritative check
  while the underlying endpoint continues to enforce access independently.
- Clock-controlled tests proving lifecycle events send no request and explicit capability, scope, and route checks do
  not refresh idle expiry.

### BCG-004: Tutoring-summary lifecycle and regeneration eligibility

#### BCG-004 frontend capability blocked

Student summary status, supervisor completed-session review, truthful automatic-retry presentation, terminal failure,
supervisor correction attribution, and visibility of the Generate summary again action are blocked. A nullable summary
cannot support the required states.

#### BCG-004 authoritative product requirement

- Completing a session atomically queues summary generation; the result must remain separate from immutable chat
  (`mia/docs/product-requirements.md:1241-1252`).
- Regeneration is allowed only when the session is completed, has no summary, has no queued or running summary job, and
  has an earlier terminally failed summary job (`mia/docs/product-requirements.md:1253-1257`).
- Summary processing uses bounded retries and must fail visibly rather than sample or truncate input
  (`mia/docs/product-requirements.md:956-967`).
- Provider or processing failure must not create a successful-looking summary
  (`mia/docs/product-requirements.md:1680-1681`).

#### BCG-004 current docs/OpenAPI mismatch

- The API narrative lists `GET /api/v1/tutoring-sessions/{id}/jobs`
  (`mia/docs/api.md:736-754`).
- The OpenAPI root includes summary generation but no tutoring-session jobs path
  (`mia/api-doc/openapi.yaml:138-157`).
- The session schema exposes only nullable summary, follow-up, source, attribution, and update timestamps
  (`mia/api-doc/schemas/resources/resources.yaml:713-744`). Null cannot distinguish queued, running, retry scheduled,
  terminal failure, or unavailable.
- The regeneration operation returns bodyless `204` and documents only an ineligible conflict
  (`mia/api-doc/paths/tutoring.yaml:133-148`); it does not provide read-time eligibility.
- The generic administrator job schema contains retry timing, while the supervisor-safe job schema intentionally omits
  availability and failure details (`mia/api-doc/schemas/resources/resources.yaml:422-478,544-587`). Neither is wired as
  the required session-summary lifecycle for students and assigned supervisors.

#### BCG-004 required observable contract

- Expose an authoritative summary lifecycle sufficient to distinguish queued, generating, automatic retry scheduled,
  available generated summary, supervisor-corrected summary, terminal failure, and unavailable.
- Expose server-authored regeneration eligibility separately from lifecycle so the frontend never reconstructs the
  multi-condition authorization and state rule.
- Include only timestamps needed to show when state changed, when it was last checked, and a scheduled retry time when
  one exists and is authorized for that viewer.
- Preserve summary source and supervisor attribution already present in the session representation.
- Keep transcript availability independent of summary generation or failure.
- Define student and assigned-supervisor visibility, existence-safe errors, and `Cache-Control: no-store`.

#### BCG-004 forbidden frontend workaround

The frontend must not infer lifecycle or eligibility from null fields, elapsed time, generic job absence, attempt
counts, HTTP probing of the regeneration mutation, or local timers. It must not expose a generic Retry job action or
imply that a terminal failure will retry automatically.

#### BCG-004 acceptance evidence needed

- OpenAPI schema and operation coverage for every lifecycle state and viewer, including regeneration eligibility.
- Backend transition tests for completion, queueing, running, delayed retry, success, exhausted attempts, correction,
  eligible regeneration, ineligible regeneration, and deletion.
- Tests proving correction is never silently overwritten and chat remains available when summary work fails.
- Frontend integration fixtures for every state without deriving one state from another field's absence.

### BCG-005: Shared-device no-store response policy

#### BCG-005 frontend capability blocked

Safe use on shared school desktops is blocked for protected pages, JSON responses, transcripts, SSE snapshots, mentoring
data, private material, source and normalized-content downloads, generated speech, and one-time security responses. The
frontend cannot clear or reauthorize a response served directly from the browser HTTP cache.

#### BCG-005 authoritative product requirement

- Student records, chats, assessments, private uploads, and contact details are sensitive
  (`mia/docs/product-requirements.md:1543-1546`).
- Every sensitive resource, download, and material retrieval requires authorization
  (`mia/docs/product-requirements.md:1547-1554`).
- Account ban, deletion, and changed authorization take effect on a subsequent request
  (`mia/docs/product-requirements.md:542-558`), which a reusable cached response can bypass.
- Recovery codes are returned only once and cannot be recovered after response loss
  (`mia/docs/product-requirements.md:639-654`).

These requirements establish the privacy boundary, but they do not currently choose a complete HTTP cache policy. The
backend must explicitly confirm the no-store behavior below as product and transport policy; this handoff does not make
that decision silently.

#### BCG-005 current docs/OpenAPI mismatch

- OpenAPI declares no `Cache-Control` response header for protected JSON, tutoring transcript, SSE, mentoring, source
  download, or normalized-content operations. The only declaration is generated speech
  (`mia/api-doc/paths/speech.yaml:38-49`).
- Generated speech explicitly permits storage with `private, no-cache`, rather than forbidding storage
  (`mia/api-doc/paths/speech.yaml:41-43`).
- Source and normalized-content downloads define media and authorization but no cache policy
  (`mia/api-doc/paths/materials.yaml:311-356`).
- The API narrative specifies `private, no-cache` for avatars and course logos
  (`mia/docs/api.md:325-333,438-441`), and their OpenAPI operations promise private no-cache semantics
  (`mia/api-doc/paths/users.yaml:154-173`; `mia/api-doc/paths/courses.yaml:268-288`).
- The architecture defines static-file security headers but no protected API response cache policy
  (`mia/docs/architecture.md:90-106`).

#### BCG-005 required observable contract

- Adopt and document `Cache-Control: no-store` for sensitive authenticated JSON, transcripts, tutoring SSE responses,
  mentoring data, private-material metadata and content, authorized source and normalized-content downloads, generated
  speech, MFA provisioning and proof responses, recovery-code responses, and auth-session discovery.
- State whether narrowly non-sensitive authenticated images such as course logos may retain a different policy. If so,
  define that exception explicitly from product sensitivity and revocation requirements rather than by file type alone.
- Define avatar and course-logo policy separately for inline authorized rendering and intentional file download. State
  whether avatars, course logos, and mentor-scoped student avatars are sensitive or approved cache exceptions.
- For each approved inline-image exception, define private-cache scope, mandatory revalidation, validator and `304`
  behavior, proxy restrictions, authorization-loss behavior, and protection from cross-account cache reuse.
- Ensure errors on sensitive routes receive equivalent no-store protection.
- Preserve operation-level authorization on every request; cache directives are defense in depth, not authorization.
- Document proxy behavior so a reverse proxy does not store protected API or SSE responses.

#### BCG-005 forbidden frontend workaround

The frontend must not rely on query-string cache busting, request headers alone, Cache API deletion, or service-worker
purging. Local logout cleanup, hidden protected prefetch, and BFCache handling are not substitutes for server response
policy. The frontend must not persist authenticated responses in a service worker or Cache API, or treat an inline
avatar or logo as public merely because ordinary identity UI loads it automatically.

#### BCG-005 acceptance evidence needed

- Explicit backend product decision and updated HTTP/OpenAPI policy, including any reviewed exceptions.
- Header tests for every response class above, including success, errors, binary bodies, NDJSON, SSE, and one-time
  secret responses.
- Browser-cache tests for inline avatars, mentor-scoped student avatars, and course logos across reload, conditional
  requests, logout, account switch, assignment loss, replacement, deletion, and absent-image responses.
- Reverse-proxy integration evidence that protected responses are not stored or replayed.
- Shared-device browser tests covering logout, expiry, ban, assignment loss, deletion, Back/Forward, BFCache
  restoration, reload, audio, blobs, and downloads without protected data reappearing before fresh authorization.

### BCG-006: Pending invitation SMTP ambiguity

#### BCG-006 frontend capability blocked

Authorized invitation administration cannot truthfully distinguish definite delivery failure from an SMTP timeout
that leaves the invitation pending and usable. Create and resend outcomes can otherwise be mislabeled as sent, failed,
or safe to retry automatically.

#### BCG-006 authoritative product requirement

- Definite initial delivery failure makes an invitation terminally faulty and invalidates its token
  (`mia/docs/product-requirements.md:355-361`).
- SMTP timeout is ambiguous operational success: the invitation remains pending and usable, is not retried
  automatically, and authorized views expose its state and sanitized failure code
  (`mia/docs/product-requirements.md:362-365`).
- Resend rotates the token; a resend timeout leaves the new token pending and usable under the same rule
  (`mia/docs/product-requirements.md:371-373,386-388`).
- A definite resend delivery failure makes the invitation faulty and the new token unusable
  (`mia/docs/product-requirements.md:371-373`).

#### BCG-006 current docs/OpenAPI mismatch

- The API narrative repeats that timeout remains pending while authorized reads expose state and sanitized failure code
  (`mia/docs/api.md:269-288`).
- The invitation schema permits `pending` but describes `failure_code` as present only for `faulty`
  (`mia/api-doc/schemas/resources/resources.yaml:166-194`). This directly contradicts the pending-timeout requirement.
- Create returns an invitation resource but does not define how ambiguous delivery is represented
  (`mia/api-doc/paths/invitations.yaml:26-57`).
- Resend returns bodyless `204` described as delivery admitted, with no direct indication that delivery may be
  unconfirmed (`mia/api-doc/paths/invitations.yaml:100-119`).

#### BCG-006 required observable contract

- Represent a pending, usable invitation whose latest delivery outcome is ambiguous without changing it to `faulty`.
- Expose the sanitized failure code required by product requirements for that pending state.
- Expose enough authoritative timing to identify the relevant delivery attempt without requiring a speculative delivery
  history schema; an existing timestamp may serve if its meaning is made explicit.
- Define create and resend outcomes so an authorized client can tell confirmed admission from ambiguous timeout, either
  in the mutation response or through a documented immediate read reconciliation path.
- Define definite resend failure as a faulty invitation with an unusable token and expose that state on reconciliation.
- Preserve the rule that timeout does not automatically retry and that resend invalidates the previous token.

#### BCG-006 forbidden frontend workaround

The frontend must not equate `pending` with confirmed delivery, map every failure code to `faulty`, infer delivery from
HTTP latency or `updated_at`, automatically resend after timeout, or claim the previous link remains valid after resend.

#### BCG-006 acceptance evidence needed

- Corrected OpenAPI invitation schema and create/resend response contract with examples for confirmed pending,
  ambiguous pending, and faulty.
- Backend tests for definite initial failure, initial timeout, definite resend failure, resend timeout, token rotation,
  no automatic retry, acceptance of the pending-timeout token, and rejection of faulty tokens.
- Frontend integration fixtures showing neutral delivery-unconfirmed wording and an explicit user-initiated resend
  action.

### BCG-007: Bounded and safe complete error-body disclosure

#### BCG-007 frontend capability blocked

The Product Owner-approved technical-details treatment is blocked. It requires the complete backend response body for
every error, but the frontend cannot both preserve that body exactly and independently guarantee that it is bounded,
valid UTF-8, neutral, existence-hiding, and free of sensitive or internal content.

#### BCG-007 authoritative product requirement

- The approved frontend treatment shows a localized explanation plus the exact status and complete untranslated backend
  response body, while excluding headers, cookies, and tokens (`.memlog.md:18-21`).
- Sensitive resources require explicit authorization, and responses must never expose MFA secrets, session tokens,
  provider credentials, private prompts, or unrestricted provider payloads
  (`mia/docs/product-requirements.md:1543-1554`).
- Authentication-sensitive and rate-limited public responses must not reveal whether a protected identifier exists
  (`mia/docs/product-requirements.md:1587-1625`).

These requirements establish the disclosure and privacy boundary, but they do not choose an aggregate response bound,
decoding contract, or reverse-proxy error policy. The backend must explicitly confirm those observable policies.

#### BCG-007 current docs/OpenAPI mismatch

- `ErrorDocument` requires error fields but defines no per-field, item-count, or aggregate byte bound
  (`mia/api-doc/schemas/json-api/documents.yaml:1-23`).
- Shared responses describe application JSON:API errors only. They do not define response encoding, a body-size ceiling,
  forbidden content, or reverse-proxy and server-generated non-JSON errors (`mia/api-doc/responses/errors.yaml:1-37`).
- Error responses declare no `Cache-Control: no-store`; the broader cache-policy gap remains owned by BCG-005.
- The current transport does not make complete raw disclosure safe or testable for malformed and intermediary errors.

#### BCG-007 required observable contract

- Publish one fixed aggregate byte ceiling covering every API error body before it reaches the browser, including
  routing, middleware, panic, timeout, body-limit, and deployment-managed reverse-proxy errors.
- Require valid UTF-8 and an explicit media type for every error body. Define exact browser-visible text as the complete
  decoded response under that encoding contract, without claiming JavaScript preserves arbitrary source bytes.
- Require neutral, existence-hiding content that excludes secrets, personal data, internal paths or traces, private
  prompts, message or material bodies, authorization data, and provider payloads.
- Define intermediary behavior when the upstream is unavailable or sends an invalid response; it must not substitute an
  unbounded HTML page or expose infrastructure details.
- Apply the BCG-005 `no-store` policy to every error response.

#### BCG-007 forbidden frontend workaround

The frontend must not truncate, redact, reinterpret, or silently discard a body while labeling it complete. It must not
assume JSON, trust a declared length without enforcing the backend contract, expose headers, or accept unbounded input
into the DOM, accessibility tree, clipboard, logs, analytics, or diagnostics.

#### BCG-007 acceptance evidence needed

- Documented response and deployment-proxy contract covering bounds, UTF-8 decoding, media types, content exclusions,
  existence hiding, and no-store behavior.
- Boundary tests for every application and proxy error class, including the exact maximum, an over-limit upstream,
  malformed bytes, wrong media types, panic recovery, timeout, and unavailable upstream.
- Automated forbidden-data tests using representative secrets, personal data, internal errors, and provider payloads.
- Browser evidence that the maximum complete body remains usable, selectable, copyable, and contained at required reflow
  and assistive-technology settings.

### BCG-008: Account-administration collection and detail reads

#### BCG-008 frontend capability blocked

Release-one account administration is blocked. Administrators cannot discover accounts or open an authoritative account
detail before using ID-addressed role and deletion mutations.

#### BCG-008 authoritative product requirement

- Administrators manage global account and relationship metadata and may grant roles or delete accounts subject to
  lifecycle rules (`mia/docs/product-requirements.md:160-176,233-243`).
- Release one requires conventional paginated account lists and detail pages (`.memlog.md:55`).
- The API narrative confirms that administrators can list account and relationship metadata needed for administration
  (`mia/docs/api.md:340-365`).

#### BCG-008 current docs/OpenAPI mismatch

- OpenAPI maps only `GET /api/v1/users/me`, user mutations, and `DELETE /api/v1/users/{id}`. It has no users collection
  read or ID-addressed user detail read (`mia/api-doc/openapi.yaml:75-97`).
- `users.yaml` defines self-profile reads and target mutations but no administration read operation
  (`mia/api-doc/paths/users.yaml:1-271`).
- Existing course rosters are scoped relationship reads and cannot serve as a global account directory.

#### BCG-008 required observable contract

- Provide an administrator-authorized, paginated account collection with explicitly supported filters, sorting, and
  deterministic navigation.
- Provide an administrator-authorized account detail read for the opaque user ID used by target mutations.
- Return only account and relationship metadata authorized for global administration, never private course content.
- Expose current target state and server-authored eligibility needed to present supported target actions without
  deriving staff status, last-administrator protection, or sole-supervisor protection from partial collections.
- Define empty, stale, deleted, sign-in-expired, and existence-safe unavailable outcomes and apply `no-store`.

#### BCG-008 forbidden frontend workaround

The frontend must not build a global directory by merging course rosters, invitations, audit records, or opaque IDs. It
must not guess target state from email presence or role labels, probe mutations to discover eligibility, or retain
account details after access loss.

#### BCG-008 acceptance evidence needed

- OpenAPI collection and detail operations with bounded schemas, pagination, supported filters and sorts, authorization,
  errors, and cache headers.
- Authorization tests for administrators, non-administrators, multi-role accounts, and private course-content exclusion.
- Lifecycle and concurrency tests for role grants, deletion protections, relationship changes, deleted targets, and
  account or scope loss between list, detail, and mutation.

### BCG-009: Current and pending MFA-factor discovery

Status: **OPEN — Story 1-9 TOTP enrollment slice approved; replace, disable, SMS, and lost-factor flows remain
blocked.**

#### BCG-009 Story 1-9 TOTP-enrollment-slice decision

The mismatch assessment below is stale: OpenAPI now defines `GET /api/v1/users/me/mfa` (`getCurrentMFAState`) with
active-factor and pending-enrollment metadata and server-authored action flags, without secrets or codes.
`mia/docs/api-authentication-and-user-invitation.md` §MFA enrollment owns the sequencing.

Owner decisions, 2026-10-05 (BCG-001/003/009 Story 1-9 slice; broader closure of all three stays open):

1. Validate the provisioning URI the backend emits:
   `otpauth://totp/MIA%20(<host[:port]>):<username>?secret=<32 uppercase unpadded Base32>&issuer=MIA`, optionally
   followed by `algorithm=SHA1`, `digits=6`, and `period=30` in that order. The limit is 1,024 UTF-8 bytes. Anything
   else is a protocol failure: no QR code or manual value renders. The label/issuer disagreement with the product
   requirements is a non-blocking backend note; the frontend never constructs or adjusts either value.
2. The gate for `/profile/security/mfa[...]` is the authenticated stage, then `profile.view` with own scope from
   `GET /api/v1/users/me/capabilities`, then `GET /api/v1/users/me/mfa` as the route resource, read freshly for each
   surface.
3. Home `/` stands in for the `/profile` parent and fallback until Epic 2 and shows one secondary link to the overview.
4. A `lifecycle` shield, including a persisted pagehide, masks setup data and recovery codes and keeps them in memory.
   Every other shield reason, a non-persisted pagehide, route departure, Reload, and an account or epoch change destroy
   them. Reveal requires explicit Refresh through the full gate, then a fresh MFA read confirming the same pending
   enrollment ID (for codes: the same account and an active factor), then an explicit Reveal.
5. A pending enrollment without a held URI (Reload, another tab, a lost response, or `409`) offers code entry plus
   explicit Cancel. Starting over requires a cancel first.
6. After an unknown verify outcome or an invalid code, one MFA read reconciles: an active factor means the codes are
   unrecoverable and only a future replacement issues new ones; a still-pending enrollment permits an explicit resubmit;
   a missing enrollment destroys the setup and says so. A `422` on DELETE reconciles the same way.
7. `expires_at` renders as a localized absolute time; there is no countdown or local expiry timer.

Owner decision, 2026-10-07 (Story 2.2 O1): Home `/` remains the MFA overview's parent and safe fallback until
`/profile` is implemented. This extends decision 3's original until-Epic-2 bridge; Story 2.2 does not implement
`/profile`. The dated 2026-10-05 decisions above remain historical, and BCG-001/003/009 remain open globally.

The slice uses only `getCurrentMFAState`, TOTP `startMFAEnrollment`, `verifyMFAEnrollment`, and pending-enrollment
`cancelOrDisableMFA`. Mutations read fresh CSRF, dispatch once, and are never replayed.

#### BCG-009 frontend capability blocked

The profile/security MFA overview, disable flow, replacement flow, pending-enrollment continuation, and reload recovery
are blocked. The frontend cannot discover the current active or pending factor or obtain the ID required by existing
factor mutations.

#### BCG-009 authoritative product requirement

- An account has at most one active factor and one pending enrollment or replacement; the active factor remains active
  until replacement succeeds (`mia/docs/product-requirements.md:607-621`).
- Pending enrollment expires, and disable or replacement requires current-factor verification and a single-use proof
  (`mia/docs/product-requirements.md:607-637`).
- SMS challenge delivery remains bound to the active factor's immutable destination snapshot
  (`mia/docs/product-requirements.md:592-605,622-623`).

#### BCG-009 current docs/OpenAPI mismatch

- OpenAPI exposes only MFA proof and enrollment mutations; no GET operation returns active or pending factor state
  (`mia/api-doc/openapi.yaml:49-64`; `mia/api-doc/paths/auth.yaml:206-340`).
- `DELETE /api/v1/users/me/mfa-enrollments/{id}` requires a factor or enrollment ID that no reload-time read supplies
  (`mia/api-doc/paths/auth.yaml:322-340`).
- `MFAEnrollment` describes only a mutation response with method and optional TOTP provisioning URI. It does not model
  an active factor, expiry, replacement state, or action eligibility
  (`mia/api-doc/schemas/resources/resources.yaml:110-129`).

#### BCG-009 required observable contract

- Provide an authenticated read that explicitly represents no factor, the active factor, and any pending enrollment or
  replacement, with the opaque IDs required by documented mutations.
- Return method, pending expiry, replacement relationship, and server-authored eligibility for enroll, continue, cancel,
  disable, replace, verify, and SMS resend actions.
- Expose only a reviewed masked SMS destination if destination recognition is required; never return TOTP secrets,
  provisioning data after setup, MFA codes, recovery codes, proof values, or stored secret material.
- Define expiry, invalidation, replacement success, account-security change, sign-in loss, and unavailable outcomes.
- Apply `Cache-Control: no-store` and make each mutation response or immediate reconciliation read authoritative.

#### BCG-009 forbidden frontend workaround

The frontend must not retain provisioning responses as durable factor state, guess an active ID from a former
enrollment, infer configuration from login challenges, enumerate IDs, or probe DELETE, proof, verification, or resend
operations.

#### BCG-009 acceptance evidence needed

- OpenAPI read schema and examples for absent, active TOTP, active SMS, pending first enrollment, and pending
  replacement.
- Transition tests for enrollment, reload, expiry, cancellation, disable, replacement, failed verification, mobile
  change, password or ban-state change, and security-generation invalidation.
- Security tests proving no secret, code, full destination, recovery code, or management proof is recoverable from
  reads.

### BCG-010: Authorized student and staff MFA-reset operations

#### BCG-010 frontend capability blocked

Student lost-factor recovery by an assigned supervisor and staff lost-factor recovery by a different administrator are
blocked because the required authenticated mutations are absent from OpenAPI.

#### BCG-010 authoritative product requirement

- Any supervisor sharing an assigned course with a student-only account may reset that student's MFA, invalidate all
  cookies, and require password replacement after fresh login (`mia/docs/product-requirements.md:656-665`).
- Staff MFA reset requires a different administrator, restricts existing cookies to password replacement, and forbids
  self-reset (`mia/docs/product-requirements.md:667-677`).
- Sole-administrator recovery is a local server-only operation and must have no public route
  (`mia/docs/product-requirements.md:678-682`).

#### BCG-010 current docs/OpenAPI mismatch

- The API narrative explicitly defers `POST /api/v1/users/{id}/mfa-resets`
  (`mia/docs/api.md:340-348`).
- The OpenAPI user path map has no MFA-reset operation (`mia/api-doc/openapi.yaml:75-97`).
- Current user operations end with role grant, temporary-password, ban, profile, and deletion mutations
  (`mia/api-doc/paths/users.yaml`; `mia/api-doc/paths/courses.yaml:419-477`).

#### BCG-010 required observable contract

- Provide one documented authenticated reset operation, or separate operations if transport ownership requires them, for
  the confirmed student-only and staff authorization paths.
- Enforce shared-course supervisor scope for student-only targets and a different-administrator rule for every staff
  target. Never expose the local sole-administrator recovery through HTTP.
- Atomically remove active and pending factors, invalidate recovery codes and security artifacts, apply the correct
  cookie and password-change effects, and write only content-free audit data.
- Return a definitive success or an existence-safe authorization, stale-state, or unavailable error. Define the read
  reconciliation path for an ambiguous mutation response without allowing automatic replay.
- Apply `Cache-Control: no-store` and never return factor, recovery-code, proof, or password values.

#### BCG-010 forbidden frontend workaround

The frontend must not substitute password reset, factor deletion, role checks, course-roster inference, or operator
instructions for the authorized reset. It must not expose self-reset, imply that cookies were invalidated before
confirmed success, automatically retry an ambiguous reset, or reveal why an out-of-scope target is ineligible.

#### BCG-010 acceptance evidence needed

- OpenAPI request, response, errors, security, CSRF, cache headers, and stable-code examples for both authorization
  paths.
- Authorization tests across student-only, every staff-role union, shared and unrelated courses, self-targeting,
  different administrators, banned or deleted accounts, and the sole-administrator case.
- Atomicity and browser-session tests for factor removal, recovery-code invalidation, challenge/proof invalidation,
  security generation, required password replacement, audit redaction, and ambiguous response reconciliation.

### BCG-011: Course readiness and session-start eligibility

#### BCG-011 frontend capability blocked

The course preparation hub, readiness review, truthful activation action, and student new-session action are blocked.
Course state alone cannot distinguish incomplete preparation, activation eligibility, or an active course that currently
accepts no new sessions.

#### BCG-011 authoritative product requirement

- Activation requires learning goals, AI tutor instructions, valid language, a supervisor, and approved, ready,
  file-backed course-wide material (`mia/docs/product-requirements.md:729-744`).
- An active course without qualifying material remains active but rejects new sessions; approval permits them again
  without reactivation (`mia/docs/product-requirements.md:746-753`).
- Deactivation immediately prevents new tutoring sessions, while existing sessions may finish
  (`mia/docs/product-requirements.md:755-766`).

#### BCG-011 current docs/OpenAPI mismatch

- `Course` exposes descriptive fields, supervisor relationships, and `inactive` or `active`, but no readiness,
  prerequisite, activation-eligibility, or session-start-eligibility state
  (`mia/api-doc/schemas/resources/resources.yaml:212-277`).
- Course reads and mutations return that same representation. Activation reports unmet requirements only after POST as
  `409 course_activation_unavailable` (`mia/api-doc/paths/courses.yaml:57-184`).
- Material collections do not provide an atomic server-authored evaluation of the cross-resource activation rule.

#### BCG-011 required observable contract

- Expose one authoritative course readiness representation that distinguishes inactive and incomplete, inactive and
  activatable, active and accepting new sessions, and active but not accepting new sessions.
- Return viewer-appropriate prerequisite results and stable blocker identifiers with authorized links to resolvable
  preparation work for assigned supervisors.
- Return server-authored activation and new-session eligibility separately; neither may be inferred from course state or
  material counts.
- Recompute atomically after course edits, supervisor changes, material processing, approval changes, activation, and
  deactivation, and include the current representation in relevant mutation outcomes or reconciliation reads.
- Define access-lost and unavailable outcomes and apply `Cache-Control: no-store`.

#### BCG-011 forbidden frontend workaround

The frontend must not count material rows, infer readiness from nullable course fields, reproduce approval and
processing rules, or probe activation or session creation. It must not equate `active` with accepting new sessions or
expose supervisor-only blocker details to an unauthorized viewer.

#### BCG-011 acceptance evidence needed

- Reviewed readiness vocabulary and OpenAPI schemas for every state, prerequisite, eligibility result, viewer, and link.
- Transition and concurrency tests across each activation prerequisite, material processing and approval, loss and
  regain of the last qualifying material, activation, deactivation, and simultaneous changes.
- Student and supervisor integration evidence that actions appear only from authoritative eligibility and that existing
  sessions remain resumable when new sessions are blocked.

### BCG-012: Authoritative tutoring work and action eligibility

#### BCG-012 frontend capability blocked

Reload, reconnect, cross-tab recovery, composer enablement, queue presentation, response handoff, retry visibility, and
Finish prevalidation are blocked. Existing reads cannot prove that a session is idle or identify all current work.

#### BCG-012 authoritative product requirement

- A session has at most one generating response and one queued message; queued work starts automatically when current
  generation becomes terminal (`mia/docs/product-requirements.md:1174-1186`).
- Completion is rejected while work is generating or queued, and response retry requires an active session with no
  generating or queued work (`mia/docs/product-requirements.md:1186,1224-1239`).
- A disconnected student resumes preserved work without starting duplicate provider activity
  (`mia/docs/product-requirements.md:1192-1202`).

#### BCG-012 current docs/OpenAPI mismatch

- `TutoringSession` exposes only active or completed state and summary fields; it has no aggregate current-work or
  action eligibility (`mia/api-doc/schemas/resources/resources.yaml:713-760`).
- Transcript reads paginate immutable turn pairs. Absence from a loaded page cannot prove that no generating or queued
  response exists (`mia/api-doc/paths/tutoring.yaml:150-209`; `mia/api-doc/schemas/resources/resources.yaml:761-849`).
- Message, retry, interrupt, and completion mutations report conflicts after attempted action but provide no read-time
  source for queue capacity or completion eligibility (`mia/api-doc/paths/tutoring.yaml:112-131,173-209,235-271`).

#### BCG-012 required observable contract

- Expose one authoritative per-session work representation with idle state, generating response identity and state,
  queued message and response identity and state, and remaining queue capacity.
- Expose server-authored eligibility for submitting or queueing a message, interrupting current work, retrying an
  eligible response, and finishing the session.
- Make the representation atomic with the one-generating and one-queued invariants and sufficient to hand off from a
  terminal response to automatically started queued work.
- Return equivalent current work after relevant mutations or define an immediate reconciliation read for definitive,
  conflict, disconnected, and ambiguous outcomes.
- Stop reconciliation must resolve both the targeted response by its immutable response ID and the session's current
  work. If queued work starts meanwhile, return or bind an authoritative terminal read for the targeted response before
  presenting it as interrupted, completed, or failed.
- Define completed, access-lost, deleted, and unavailable outcomes and apply `Cache-Control: no-store`.

#### BCG-012 forbidden frontend workaround

The frontend must not scan transcript pages, treat a missing response as idle, reconstruct capacity from locally
observed events, use elapsed time, or probe POST operations. It must not enable Send, Queue, Retry, Stop, or Finish from
stale single-tab state when authoritative work state is unknown. It must not attribute the next queued response's state
to the response targeted by Stop or infer the targeted outcome from current-work handoff alone.

#### BCG-012 acceptance evidence needed

- OpenAPI read or embedded representation with schemas and examples for idle, generating, queued, generating plus
  queued, terminal handoff, completed, and unavailable states.
- Concurrency tests across two tabs for send, queue, interrupt, retry, automatic handoff, completion, disconnect,
  startup recovery, and deletion or scope loss.
- Stop tests where the targeted response becomes terminal and queued work starts before, during, and after
  reconciliation; each result must preserve both response identities and the targeted terminal outcome.
- Browser integration fixtures proving reload and reconnect recover one current state without duplicate messages,
  responses, provider requests, or false Finish availability.

### BCG-013: Student mentoring-request eligibility

#### BCG-013 frontend capability blocked

The student-facing new mentoring-request action is blocked. The frontend cannot authoritatively determine whether the
combined course, student setting, and mentor-assignment rules currently permit creation.

#### BCG-013 authoritative product requirement

- New mentoring requests require at least one mentor assigned to the student in the active course
  (`mia/docs/product-requirements.md:1262-1274`).
- `mentoring_requests_allowed` independently disables creation without removing assignments or existing records
  (`mia/docs/product-requirements.md:1275-1278`).
- Course deactivation blocks new requests while existing mentoring work continues
  (`mia/docs/product-requirements.md:1296-1309`).

#### BCG-013 current docs/OpenAPI mismatch

- `User` does not expose `mentoring_requests_allowed` or combined mentoring eligibility
  (`mia/api-doc/schemas/resources/resources.yaml:4-52`).
- The mentoring collection supports list and create but has no student-facing eligibility read
  (`mia/api-doc/paths/mentoring.yaml:146-185`).
- Current mentor-assignment reads do not authoritatively combine course activity, student setting, and assignment state
  for this action.

#### BCG-013 required observable contract

- Expose server-authored new-request eligibility for the current student in a course, with explicit checking, allowed,
  disabled, access-lost, and unavailable outcomes.
- Evaluate course activity, `mentoring_requests_allowed`, and qualifying mentor assignment atomically.
- Keep existing mentoring records readable and actionable when new creation becomes disabled.
- Use viewer-safe reason semantics: disclose only causes the student is authorized to know and otherwise return one
  neutral disabled result.
- Update after settings, assignment, course-state, or membership changes and apply `Cache-Control: no-store`.

#### BCG-013 forbidden frontend workaround

The frontend must not expose the setting, enumerate mentors, infer eligibility from profile or collection absence, cache
an earlier allowed result as authority, or probe POST. A failed creation remains a race outcome, not discovery.

#### BCG-013 acceptance evidence needed

- OpenAPI schema and examples for allowed, neutrally disabled, existing-work-only, access-lost, and unavailable states.
- Authorization and transition tests for course activation, deactivation, setting changes, first and last mentor
  assignment, membership loss, and concurrent creation.
- Integration evidence that creation disappears or disables from authoritative state while retained mentoring work stays
  available and no hidden assignment or account information is disclosed.

### BCG-014: Atomic intent binding for consequential state-dependent mutations

#### BCG-014 frontend capability blocked

Truthful confirmation of a consequential mutation is blocked when the server may execute a materially different effect
from the state and consequences the user reviewed. The release-one inventory is limited to:

- invitation Revoke and Delete faulty, because one DELETE changes meaning with invitation state;
- permanent role grant, because ban/staff state and the supervisor-to-student coupled grant affect the committed result;
- course-supervisor removal, because the sole-supervisor blocker may change;
- student membership removal, because active-session eligibility and the course-data cascade may change;
- mentor removal, because affected open-work triage and future-schedule clearing may change;
- student or staff account deletion, because account class, last-administrator or sole-supervisor blockers, assignment
  removal, and work triage may change; and
- course deletion, because activity, active-session blockers, and the course-scoped cascade may change.

Direct reassignment, ban/unban, profile or course edits, material approval/revocation, and fixed-effect material
deletion
are not blocked by BCG-014. Their own authorization, stale-state, eligibility, and domain blockers still apply.

#### BCG-014 authoritative product requirement

- Invitation DELETE revokes and retains a pending invitation, physically deletes a faulty invitation, and rejects an
  accepted or revoked invitation (`mia/docs/product-requirements.md:355-385`).
- The API narrative confirms that the same method and resource URL select revocation or deletion from state at mutation
  time (`mia/docs/api.md:269-297`).
- Destructive UX must state the exact scope, preservation, blockers, and irreversibility before the user confirms
  (`.memlog.md:37`).
- FR-13, FR-38, FR-42, FR-43, FR-70, FR-76, and FR-77 define the other inventoried coupled effects, blockers, and
  cascades. BCG-014 does not broaden beyond those named operations.

These requirements define the effects but do not authorize a frontend timing assumption. The backend must choose an
atomic precondition contract or distinct operation semantics before the reviewed intent can be guaranteed.

#### BCG-014 current docs/OpenAPI mismatch

- `DELETE /api/v1/invitations/{id}` returns the same `204` whether it revoked a pending invitation or physically deleted
  a faulty one (`mia/api-doc/paths/invitations.yaml:59-98`).
- The operation accepts only the resource ID and declares no version, expected state, `If-Match`, or equivalent atomic
  precondition (`mia/api-doc/paths/invitations.yaml:80-98`).
- An immediate GET before DELETE is a separate transaction. A concurrent SMTP result or other state transition can
  change the server-selected effect between those requests.
- Current OpenAPI paths expose no atomic mutation-precondition contract for the other inventoried role-grant,
  supervisor-removal, membership-removal, mentor-removal, account-deletion, or course-deletion operations.

#### BCG-014 required observable contract

- For each inventoried mutation, either atomically compare a documented expected state or version with the mutation,
  or expose distinct operations whose meanings cannot switch when target state changes.
- For invitation management, make a confirmed Revoke action incapable of becoming physical deletion and a confirmed
  Delete faulty invitation action incapable of becoming revocation.
- Return a distinct stale-precondition outcome without changing the target. Require a fresh authoritative read and new
  confirmation before another attempt.
- Return enough definitive success semantics to identify the effect that committed without exposing hidden state.
- Preserve operation-level authorization, existence hiding, CSRF protection, audit behavior, and
  `Cache-Control: no-store` independently of the precondition.

#### BCG-014 forbidden frontend workaround

The frontend must not treat a final GET, disabled button, short delay, local `updated_at`, or request serialization as
an atomic precondition. It must not submit a generic DELETE after the user confirmed only one possible effect, infer
which effect committed from a later `404`, or automatically replay a stale or ambiguous mutation.

#### BCG-014 acceptance evidence needed

- Reviewed inventory of affected release-one operations and an OpenAPI precondition or distinct-operation contract for
  each, including request, success, stale, authorization, and existence-safe error semantics.
- Invitation concurrency tests that move pending to faulty, accepted, or revoked between read and mutation and prove the
  server never executes an effect different from the confirmed intent.
- Equivalent race tests for every other inventoried operation, including unchanged-target success and stale-target
  no-op behavior.
- Browser integration evidence that stale state clears confirmation, rereads consequences, and requires explicit new
  confirmation without claiming success from an existence-hiding result.

### BCG-015: Mobile-verification lifecycle and resend observability

#### BCG-015 frontend capability blocked

Accessible mobile-verification continuation after reload, delayed timers, concurrent tabs, and resend races is blocked.
The frontend cannot authoritatively show challenge expiry or when resend becomes available.

#### BCG-015 authoritative product requirement

- A mobile-verification code expires 30 minutes after issuance and is single-use
  (`mia/docs/product-requirements.md:288-304`).
- The implemented resend sends the existing code without extending the challenge expiry
  (`mia/api-doc/paths/users.yaml:114-136`).
- Resend requires a 60-second cooldown plus hourly and daily limits, and every provider attempt counts toward them
  (`mia/docs/product-requirements.md:294-303`).
- Product requirements do not define whether resend preserves or resets the prior code's failure count. Closure must
  define this without frontend inference.
- Incorrect submissions, successful change, profile-mobile removal, and related security changes can invalidate pending
  state (`mia/docs/product-requirements.md:302-319`).

#### BCG-015 current docs/OpenAPI mismatch

- `MobileChangeChallenge` is intentionally identity-only and has no issuance, expiry, lifecycle, or resend-availability
  attributes (`mia/api-doc/schemas/resources/resources.yaml:153-165`).
- Challenge creation returns that empty representation, verification returns bodyless `204`, and resend returns bodyless
  `204` (`mia/api-doc/paths/users.yaml:48-136`).
- OpenAPI has no GET for a mobile challenge and no authenticated read that recovers its authoritative state after
  reload.
- `429 Retry-After` can report a denied resend after probing, but it does not provide read-time cooldown or challenge
  expiry observability.

#### BCG-015 required observable contract

- Provide an authorized read of the relevant mobile-verification challenge after reload, or an equivalent current-user
  representation, with explicit active, expired, invalidated, completed, absent, and unavailable outcomes.
- Return authoritative `expires_at`, resend eligibility, and the next resend instant when a cooldown currently applies.
- On resend, return the unchanged authoritative expiry of the existing code. Define whether its failure count resets or
  carries forward; do not expose that count to the frontend.
- Return equivalent current lifecycle state after create, resend, verification, and concurrent invalidation outcomes.
- Define how hourly or daily throttling differs from the 60-second cooldown without exposing internal abuse thresholds
  or destination-based limiter state.
- Never return the destination mobile number, verification code, failure count, limiter keys, or another secret or
  personal-data field. Apply `Cache-Control: no-store`.

#### BCG-015 forbidden frontend workaround

The frontend must not derive expiry or cooldown from local receipt time, persist the destination or code, probe resend
to discover availability, reset timers after reload, or assume its tab's successful response survived a concurrent
change. It must not expose account- or destination-based limiter state.

#### BCG-015 acceptance evidence needed

- OpenAPI read and mutation schemas with UTC expiry and next-resend instants, lifecycle states, authorization, errors,
  rate-limit semantics, and cache headers.
- Clock-controlled tests for creation, cooldown boundaries, unchanged expiry after resend, the defined failure-count
  behavior, hourly and daily limits, five incorrect submissions, successful verification, removal,
  replacement, and provider failure.
- Multi-tab and reload tests proving concurrent resend, verification, replacement, and invalidation converge on one
  authoritative state without timer guessing or duplicate provider calls.
- Security tests proving reads reveal no destination, code, failure count, cross-account challenge, or limiter identity.

### BCG-016: Authoritative mentor-completion eligibility

#### BCG-016 frontend capability blocked

Truthful mentor-session completion is blocked. The frontend cannot authoritatively know when the assigned mentor may
complete a scheduled session or when eligibility should next be checked after a clock disagreement, browser sleep, or
schedule change.

#### BCG-016 authoritative product requirement

- Only the assigned mentor may mark a mentoring session completed, and only after its scheduled time has begun
  (`mia/docs/product-requirements.md:1304-1309`).
- Existing mentoring work remains actionable after course deactivation
  (`mia/docs/product-requirements.md:1308-1309`).
- The API narrative repeats that only the assigned mentor may complete after the scheduled time
  (`mia/docs/api.md:694-709`).

#### BCG-016 current docs/OpenAPI mismatch

- `PATCH /api/v1/mentoring-sessions/{id}` combines response, scheduling, reassignment, cancellation, and completion in
  one operation and exposes no read-time completion eligibility
  (`mia/api-doc/paths/mentoring.yaml:168-185`).
- `MentoringSession` returns `scheduled_for` and lifecycle state, but no server-evaluated allowed action or instant at
  which completion eligibility should be rechecked
  (`mia/api-doc/schemas/resources/resources.yaml:1004-1046`).
- The update schema permits `closure_reason=completed`, but defines no completion-specific prevalidation contract or
  stable denial semantics (`mia/api-doc/schemas/requests/requests.yaml:895-925`).

#### BCG-016 required observable contract

- Return a server-evaluated completion action state for the current viewer: allowed, not allowed, access lost, terminal,
  or unavailable.
- When completion is not yet allowed because of schedule time, return an authoritative UTC instant at which the client
  may offer an explicit eligibility recheck. Do not require a countdown.
- Recompute eligibility after assignment, schedule, course, account, scope, and lifecycle changes and immediately before
  enabling final completion confirmation.
- Define definitive success, stale or ineligible denial, and ambiguous-response reconciliation through the current
  mentoring-session representation. Apply `Cache-Control: no-store`.

#### BCG-016 forbidden frontend workaround

The frontend must not enable completion from its local clock, compare `scheduled_for` with `Date.now()` as authority,
probe PATCH to discover eligibility, or treat a timer, browser wake, stale schedule, denial, or missing action as proof.
It must not replay an ambiguous completion automatically.

#### BCG-016 acceptance evidence needed

- OpenAPI schema and examples for allowed, not-yet-allowed with recheck instant, denied, terminal, and unavailable
  states.
- Clock-controlled backend tests at either side of the scheduled instant, including clock disagreement, schedule change,
  browser sleep/wake, assignment loss, course deactivation, and concurrent completion.
- Browser integration evidence that only an authoritative allowed result enables confirmation; timer wake merely permits
  a user-initiated recheck; denial and ambiguity never display success or dispatch automatically.
- Reconciliation tests proving an unknown PATCH outcome converges to current requested, scheduled, cancelled, completed,
  access-lost, or unavailable state without a completion claim until backend state establishes it.

### BCG-017: Supervisor-safe registered-staff targeting for direct mentor-role grants

#### BCG-017 frontend capability blocked

The supervisor direct mentor-role grant flow is blocked. A supervisor can submit a known user ID to the existing grant
mutation, but the frontend has no authoritative, privacy-safe way to resolve and review whether that ID identifies an
eligible registered staff account without using administrator-only account reads or mutation probing.

#### BCG-017 authoritative product requirement

- Additional permanent roles are granted only to registered staff accounts identified by user ID. Student-only
  accounts cannot receive a first staff role by direct assignment (`mia/docs/product-requirements.md:397-403`).
- Any supervisor may grant the mentor role. The grant is immediate, requires verified email, rejects banned targets,
  and is idempotent (`mia/docs/product-requirements.md:402-410`).
- Direct role assignment uses user ID, while administrator account reads and global account metadata remain
  administrator capabilities (`mia/docs/api.md:340-364`).

#### BCG-017 current docs/OpenAPI mismatch

- `POST /api/v1/users/{id}/roles` accepts the target ID and hides missing or ineligible targets, but exposes no
  supervisor-safe target-resolution or review representation (`mia/api-doc/paths/users.yaml:213-242`).
- OpenAPI has no user collection or ID-addressed detail read. BCG-008 requires those reads for administrators and does
  not authorize supervisors to use the future global account directory.
- Course rosters and mentor assignments are scoped relationship reads. They cannot prove that an arbitrary user ID is a
  registered staff target eligible for a permanent mentor-role grant.

#### BCG-017 required observable contract

- Provide an explicit authoritative way for a supervisor to submit one exact user ID and resolve whether it is an
  eligible registered-staff target for mentor-role grant. The backend may choose a focused read, a mutation-specific
  preflight representation, or another documented transport; this ledger does not invent an endpoint.
- Bound the user ID and request size, rate, retained state, and response. Accept exact matching only and provide no
  substring, prefix, fuzzy, batch, browse, autocomplete, suggestion, pagination, or result-count behavior.
- For an eligible target, return only the minimum identity needed to prevent a wrong-person grant and the
  server-authored mentor-role action state. Do not return unrelated profile, contact, role, assignment, course,
  security, ban, or account-administration metadata.
- Map unknown, student-only, unverified, banned, deleted, out-of-scope, unauthorized, and throttled targets to one fixed
  existence-hiding unavailable contract. Do not expose which eligibility condition failed or an identifier-specific
  `Retry-After` distinction.
- Keep the grant mutation authoritative and idempotent. Immediately before dispatch, recompute target eligibility and
  satisfy BCG-014's atomic binding so the reviewed target and action cannot change between confirmation and grant.
- Define definitive success, stale target, denial, sign-in loss, and ambiguous-response reconciliation without
  automatic replay. Apply `Cache-Control: no-store` to target resolution, grant outcomes, and their errors.
- Keep blocking action scoped. Existing mentoring collections, detail, response, scheduling, assignment, reassignment,
  removal, triage, and unrelated administrator-authorized account reads remain usable.

#### BCG-017 forbidden frontend workaround

The frontend must not expose or call the administrator account collection or detail for a supervisor, merge course
rosters into a directory, enumerate opaque IDs, search by name, username, or email, infer staff eligibility from course
or invitation relationships, or probe the grant mutation to discover a target. It must not reveal why resolution failed,
cache rejected identities, automatically replay an ambiguous grant, or disable unrelated mentoring or account work.

#### BCG-017 acceptance evidence needed

- An explicit product and OpenAPI contract for the chosen exact-ID resolution mechanism, minimal eligible-target
  representation, action state, bounds, rate limits, security, CSRF where applicable, errors, and no-store headers.
- Authorization and indistinguishability tests across supervisors, administrators, mentors, students, multi-role actors,
  eligible staff, student-only, unverified, banned, deleted, unknown, and out-of-scope targets.
- Enumeration-resistance tests covering sequential IDs, repeated misses, partial and oversized input, throttling,
  timing, pagination attempts, and response-body equality across hidden causes.
- Concurrency tests for target role, email-verification, ban, deletion, and account-state changes between resolution and
  grant, including BCG-014 stale-precondition behavior and idempotent existing-role success.
- Browser integration evidence proving no administrator directory request, no suggestion traffic, no rejected target in
  retained state, no automatic replay after ambiguity, and no disruption to existing mentoring or account reads.

## Non-Blocking OpenAPI Details

The following reviewer findings are important but are not additional backend release blockers for this handoff. They are
either already observable in the current backend contract, are frontend implementation responsibilities, or require
detail only when the owning feature is implemented.

- Exact endpoint names, resource type names, relationship layout, and whether the blocker contracts extend an existing
  resource or add a focused read model remain backend API design details. The observable outcomes above are mandatory.
- SSE snapshot replacement, delta deduplication, connection epochs, focus, scroll, and announcements are frontend state
  machine work. Existing backend snapshot-first and terminal-event behavior is documented in
  `mia/docs/api.md:590-649` and `mia/api-doc/schemas/resources/resources.yaml:874-957`.
- Cross-tab logout-start and outcome signaling, request quiescing, a pre-BFCache privacy shield, local locking at
  authoritative expiry, and lifecycle-event coalescing are frontend responsibilities. They do not replace BCG-001's
  late-cookie ordering or non-refreshing-check contract.
- SSE protocol-error fencing, reconnect-attempt accounting, user-paused reconciliation, and focus-only revalidation are
  frontend state-machine details. BCG-012 owns only the missing authoritative work and targeted-response state.
- Tutoring request-ID creation and ambiguous-response UX need frontend acceptance criteria, but backend replay and
  conflict behavior is already concrete in `mia/docs/product-requirements.md:1084-1093,1213-1223` and
  `mia/api-doc/paths/tutoring.yaml:24-62,173-209`. After Reload, an unretained ambiguous attempt remains unknown: the
  frontend does not claim success or automatically replay it. Exact cross-reload correlation is not a release-one
  requirement and no browser persistence of message content or request IDs is permitted.
- One-file upload queueing, browser progress, and cancellation are frontend concerns. After an ambiguous upload
  response, list results cannot identify the attempted file by filename, size, or media type. The frontend must keep
  that attempt outcome unknown, make no row-level success or deletion claim, never re-upload automatically, and offer
  only explicit safe user decisions. Exact upload correlation and automatic safe retry are not release-one requirements
  (`mia/api-doc/paths/materials.yaml:214-309`).
- Generated-speech UI must branch on HTTP status and media type. The current operation already distinguishes JSON state,
  MP3, expiry or hiding, missing voice, and provider unavailability (`mia/api-doc/paths/speech.yaml:31-68`). Its cache
  header remains covered by BCG-005.
- Inline-image gating, rendering mechanism, denial teardown, and object-URL lifecycle are frontend work after BCG-005
  makes avatar and course-logo cache behavior authoritative.
- Optional-provider UX matrices, no-notification copy, last-checked presentation, BFCache gating, protected cache-key
  design, and blob teardown remain frontend or cross-layer acceptance details. They must not weaken backend authority.
- Accessible authentication controls, rich-text safety, dialogs, reflow, localization, telemetry policy, sensitive copy
  and print handling, and shared-device download warnings remain release work but do not require new backend schemas,
  except for the response policy in BCG-005.

## Release Gate

Frontend implementation dependent on a blocker remains blocked until its observable contract is authoritative in
OpenAPI, consistent with product requirements, and backed by the listed evidence. A passing OpenAPI linter alone is not
acceptance evidence.

Resolution requires every entry under Release Blockers to be closed or an explicit product decision to remove or defer
its affected frontend capability. The counted Release Blockers heading is the single maintained blocker total. The
frontend must not ship a workaround that transfers backend authorization, lifecycle, session, or privacy authority into
client inference.
