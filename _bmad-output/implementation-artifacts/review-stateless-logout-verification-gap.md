# Supervisor handoff — 2026-09-27

Run the child prompt below in an independent, context-free session at the same model capability.
No independent review has run yet. Return findings for author triage; do not edit or commit.

The full baseline diff includes pre-existing Story 1-2 application work, sprint bookkeeping, and BCG-001
reconciliation. Those are preserved user work, not this logout revision. The current task is documentation-only:
the owner explicitly instructed "frontend’s logout requirements shall be revised", accepting the backend's reduced
stateless logout guarantee. Evaluate that revision without globally unblocking Story 1-2 or BCG-001. The existing
reconciliation spec/review are historical records, not new claims. Backend is read-only. The new task record is
spec-stateless-logout-revision.md; the touched documentation appears in its Code Map. Full check passed (30 unit and
3 Chromium tests; no skipped components), but that is not logout browser evidence. No runtime behavior was changed.

Authoritative backend excerpts follow for this standalone review; do not infer additional transport or product decisions.

## mia/docs/product-requirements.md:583-607

```text
### Authentication session lifetime

- The MVP uses a signed and encrypted stateless browser cookie. MIA keeps no
  server-side session records.
- An authenticated browser session expires after 30 minutes without an
  authenticated user action.
- Ordinary authenticated requests, automatic polling, SSE establishment and
  reconnection, server-sent heartbeats, and background provider work do not
  reset the inactivity timer. Only the explicit authenticated Continue working
  operation resets it, capped by the original 12-hour maximum.
- A session expires no later than 12 hours after authentication, regardless of
  activity. The 12-hour maximum anchors at completion of the final login stage —
  the moment the full authenticated cookie is created — not at the initial
  password verification.
- After either timeout, the user must authenticate again.
- The 12-hour maximum is not extended by session activity.
- Logout clears the authentication cookie and rotates the signed browser marker
  in the current browser. A delayed ordinary authenticated or Continue working
  response cannot restore usable authentication because it does not issue a
  matching marker.
- A delayed login, MFA-completion, or password-change response admitted before
  logout may restore authentication because it reissues a matching cookie and
  marker pair. Clients reconcile this outcome through session discovery.
- MIA has no server-side browser-session or per-browser revocation records and
  does not provide session listing or remote-session revocation in the MVP.
```

## mia/api-doc/paths/auth.yaml:31-99

```text
sessionDiscovery:
  get:
    tags: [Authentication]
    operationId: discoverSession
    summary: Discover current browser session
    description: >-
      Returns anonymous state for absent, stale, malformed, banned, deleted, or generation-invalid authentication.
      Discovery never extends a session. Anonymous discovery refreshes the public CSRF cookie. Clients use this route
      to reconcile a delayed authentication-transition response that arrives after an attempted logout.
      This GET requires no CSRF header or request body and returns application/vnd.api+json with Cache-Control: no-store.
      Use this response as the sole authority for choosing exactly one entry flow, without cookie inspection or
      denial probing. Anonymous state is data: null with meta.stage; all other stages are in data.attributes.stage.
      Anonymous enters sign-in. The mfa and password-change stages render only their focused flow and logout,
      without application navigation, protected titles or names, breadcrumbs, prefetch, or dependent protected requests.
      MFA precedes password replacement when both apply. The authenticated stage proceeds to
      GET /api/v1/users/me/capabilities; session discovery alone does not permit Home to mount.
      A failed discovery read leaves a neutral loading/error or sign-in state, never protected content.
    security: [{}, { sessionCookie: [] }]
    responses:
      '200':
        headers:
          Cache-Control: { $ref: ../openapi.yaml#/components/headers/CacheControlNoStore }
          Mia-Session-Idle-Expires-At: { $ref: ../openapi.yaml#/components/headers/SessionIdleExpiresAt }
          Mia-Session-Absolute-Expires-At: { $ref: ../openapi.yaml#/components/headers/SessionAbsoluteExpiresAt }
        description: Authoritative anonymous or current staged session state.
        content:
          application/vnd.api+json:
            schema: { $ref: ../schemas/resources/resources.yaml#/SessionDiscoveryDocument }
      '406': { $ref: ../responses/errors.yaml#/NotAcceptable }
      '429': { $ref: ../responses/errors.yaml#/RateLimited }
      '500': { $ref: ../responses/errors.yaml#/InternalError }

sessionContinuations:
  post:
    tags: [Authentication]
    operationId: continueSession
    summary: Continue working
    description: >-
      Deliberately advances only the idle deadline of a full authenticated session. It does not open or reconnect an
      SSE stream.
    security: [{ sessionCookie: [], csrfToken: [] }]
    responses:
      '200': { $ref: '#/Session' }
      '401': { $ref: ../responses/errors.yaml#/Unauthorized }
      '403':
        $ref: ../responses/errors.yaml#/Forbidden
        description: CSRF or restricted-stage validation failed (`csrf_invalid` or `auth_password_change_required`).
      '406': { $ref: ../responses/errors.yaml#/NotAcceptable }

logout:
  post:
    tags: [Authentication]
    operationId: logout
    summary: Logout
    description: >-
      Clears authentication and rotates the signed marker in the current browser. Delayed ordinary authenticated and
      Continue working responses cannot restore a matching cookie pair. A login, MFA-completion, or password-change
      response admitted before logout may reissue a matching pair and restore authentication; clients must wait for
      outstanding authentication transitions or reconcile their later responses through session discovery. The MVP
      has no server-side per-browser revocation or remote session revocation.
    security: [{ sessionCookie: [], csrfToken: [] }]
    responses:
      '204':
        $ref: ../responses/success.yaml#/NoContent
        description: Session cleared.
      '401': { $ref: ../responses/errors.yaml#/Unauthorized }
      '403':
        $ref: ../responses/errors.yaml#/Forbidden
        description: CSRF validation failed (`csrf_invalid`).
```

## mia/api-doc/openapi.yaml:217-233

```text
  securitySchemes:
    sessionCookie:
      type: apiKey
      in: cookie
      name: __Host-mia_session
      description: >-
        Signed and encrypted HttpOnly browser session cookie for HTTPS. It is valid only with the independently signed
        __Host-mia_browser generation cookie. Loopback HTTP uses mia_session and mia_browser. Logout rotates the marker
        so delayed ordinary authenticated and Continue working responses cannot restore usable authentication.
        Authentication transitions persist and reissue the marker for the bound session's absolute lifetime; a delayed
        transition admitted before logout may therefore restore authentication and requires session discovery
        reconciliation. The stateless MVP has no server-side per-browser revocation or remote revocation.
    csrfToken:
      type: apiKey
      in: header
      name: X-CSRF-Token
      description: Required with the matching CSRF cookie on every unsafe API request. HTTPS uses __Host-mia_csrf; loopback HTTP uses mia_csrf.
```

## mia/internal/auth/auth_test.go:425-442 (assertions only; credential setup omitted)

```text
	newMarker := responseCookie(logout, server.BrowserCookieName())
	if newMarker == nil {
		t.Fatal("logout omitted rotated browser generation")
	}
	staleCookies := []*http.Cookie{lateSession, newMarker}
	stale := serve(t, server, http.MethodGet, "/api/v1/auth/session", "", staleCookies, "")
	if !strings.Contains(stale.Body.String(), `"stage":"anonymous"`) {
		t.Fatalf("late session survived logout: %s", stale.Body.String())
	}
	reconciled := serve(t, server, http.MethodGet, "/api/v1/auth/session", "", delayedTransitionCookies, "")
	if stage(t, reconciled.Body.Bytes()) != "authenticated" {
		t.Fatalf("delayed authentication transition was not reconciled: %s", reconciled.Body.String())
	}
	otherBrowser := serve(t, server, http.MethodGet, "/api/v1/auth/session", "", secondCookies, "")
	if stage(t, otherBrowser.Body.Bytes()) != "authenticated" {
		t.Fatalf("other browser invalidated: %s", otherBrowser.Body.String())
	}
}
```

# Child prompt

Read 

<reviewer-instructions>
# Verification Gap Review

**Goal:** Find changed behavior that could break without reliable verification catching it. Ask one question — "if the behavior this change is supposed to produce broke where it's actually used, would verification fail?" Do not hunt for correctness bugs, but report genuine problems you notice while tracing verification.

The main verification gap shapes are:

1. **Regression gap:** the changed code regresses where it's used, and no test covering that use would fail.
2. **Missing-adoption gap:** a place that should now use the new behavior doesn't; it handles the same case its own way, or not at all, and no test would flag the omission.
3. **Broken-verification gap:** a test appears to cover the changed behavior, but would not actually protect it because it is skipped, flaky, not run in the normal verification path, or too weak to observe the regression.

## Evidence Rules

- Read a test before claiming what it covers, runs, asserts, or misses.
- Before claiming no test exists, search the whole repo by the symbol under test and by import references; expected file locations are not enough.
- Never assert what you did not verify. If a finding cannot be grounded, drop it.
- In a finding, say what you actually checked — "none of the tests I read cover this" — and show how far you looked. Say a test doesn't exist anywhere only when the symbol/import-reference search actually shows that.
- Do not assign severity, confidence, priority, or ranking.

## Review Sequence

### Step 1: Screen for behavioral change

Screen each part of the change separately. If a part is non-behavioral, skip it. Call a part non-behavioral only when the changed code does not alter return values, thrown errors, caller-visible side effects, or observable state (including iteration order and emitted messages). Once a part meets that test, move on; do not inspect callers or tests for extra confirmation.

Common non-behavioral examples: formatting, comments, whitespace; pure renames; trivial getters/setters and pass-throughs; type-only or compiler-enforced changes with no runtime effect; etc.

Only outcomes produced by deterministic code are worth automatically testing; tests are useless on static source text and brittle on LLM output. Skip those parts.

If every part is skipped, output the clean result (see Output Format).

### Step 2: Find the behavior that changed

Identify what behavior changed compared to the previous version: output, side effect, branch, error path, schema/event shape, config default, validation/authorization rule, external contract, etc. If the change affects more than one behavior, handle each separately.

Treat broad-impact changes as behavioral even when no single changed line looks important: dependency, toolchain, build/config, data-file, etc.

### Step 3: Trace where that behavior is used

Trace the changed behavior to the places that observe it. Start with direct callers and registered entry points (routes, commands, DI), contract consumers (schemas, events, APIs, database readers), and reverse-dependency info if already available.

Follow a path only while the changed behavior is reachable and unverified. Stop when a test at that boundary would fail, the consumer does not observe the changed behavior, or the next hop is guesswork (dynamic dispatch, reflection, outside-repo consumers, etc.). Prefer the nearest observable boundary, often one to three hops away, especially across contract, integration, or service edges. If there are more than five similar consumers, group obvious repeats and check representative paths; expand only when a consumer observes the behavior differently.

### Step 4: Qualify the consumer, then check its test

For each consumer, name the smallest realistic regression this consumer would observe: invert the branch, drop the default, omit the field, return the old error code, skip the integration call, etc. This is the Demonstration. If no such regression exists, drop the path; untested downstream code is not a finding.

A `Missing-adoption gap` qualifies not by the adoption failure alone but by a supersession signal: the change gives clear evidence the new behavior is meant to replace the local one — PR intent, naming or docs, a replaced sibling site, deleted duplicate logic, or a test defining the new rule — and the local site shares the same observable contract. Without a supersession signal and a shared observable contract, it is a refactor suggestion, not a verification-gap finding. Once both hold, check whether any test for that site would flag the non-adoption; missing coverage of the non-adoption is the gap itself, not a disqualifier.

Find and read the relevant test. Ask whether the Demonstration would make an assertion fail.

- If yes, the behavior is verified. No finding.
- For a regression-style Demonstration: if no test runs the path, the test is skipped/flaky/not run normally, or the test runs the code without checking the changed result, report a `Regression gap` or `Broken-verification gap`.
- For a qualifying Missing-adoption case: if none of the site tests you found assert it adopts the new behavior, report a `Missing-adoption gap`.

A test counts only if it runs normally and an assertion observes the changed output, branch, or contract. These do not count: no execution; source-text assertions that match a file's wording instead of running it; success/no-throw/snapshot-only checks; mock/log-call checks; human-only checks; tests that mock away the integration; e2e tests that pass through without checking the changed output; stale assertions or fixtures.

For example, `expect(x ?? DEFAULT).toBe(DEFAULT)` passes when `x` is missing.

Common patterns:

- **Caller-path gap** — helper test covers the branch, but caller values skip it.
- **Contract drift** — payload/schema/event changes must be verified at the consumer.
- **Migration compatibility** — tests only create new-format rows or fresh schemas.
- **Phantom exception** — handled partial-failure path has no test.
- **Missing-adoption gap** — sibling site should use the new rule/helper and does not.
- **Removed verification** — deleted test or weakened assertion leaves behavior unpinned; removing a source-text assertion is not this, since it never counted.

### Step 5: Confirm each finding is real

Before writing a finding, re-open the specific tests or search results the finding relies on. Verify the Demonstration would not make any test you checked fail, or that the absence claim is backed by the symbol/import-reference search. Do not claim more than you verified; drop any finding you cannot ground.

Explain why the test misses the bug using what the test sets up and checks.

Do not report: compiler/type-checker-enforced cases; behavior already verified by an integration, contract, or e2e test; implementation-detail or mock-only tests; low coverage or a missing test file by itself; legacy untested code the change did not affect.

Report genuine problems you noticed while tracing verification, even if they are not verification gaps. Put them under `Other findings` in the output. This permits reporting what you already reached, not extra hunting. A claim that code misbehaves is a defect, not a gap — it goes under `Other findings` for standard triage, however you found it.

## OUTPUT FORMAT

Emit each verification-gap finding as one block. No general advice, no severity or confidence. Triage trusts a gap finding as filed and does not re-verify it, so each block must stand on its own evidence.

```markdown
### <one-line title naming the gap>

- **Changed surface:** the exact behavior or contract that changed — `file:line`.
- **Impacted consumer or site:** named concretely with `file:line` (e.g. "the `createInvoice` mutation used by the billing dashboard at `billing/dashboard.ts:88`," not "callers of this function").
- **Existing test evidence:**
  - `Regression gap`: what the relevant test actually asserts, with `file:line`; or, if none, the symbol/import-reference searches run and their result.
  - `Missing-adoption gap`: tests for the impacted site, and whether any assert it adopts the new behavior.
  - `Broken-verification gap`: the apparent test or verification path, and why it does not count.
- **Missing verification:** the precise assertion or check that's absent.
- **Demonstration:**
  - `Regression gap` / `Broken-verification gap`: the concrete regression that would ship undetected, and why the tests you checked would not fail.
  - `Missing-adoption gap`: the case the site mishandles by not adopting the new behavior, and that none of the tests you read assert adoption.
- **Consequence:** the concrete thing that ships wrong — a regression the checked evidence would not catch, or a site that should use the new behavior and doesn't.
- **Disposition:** `patch` — name the test to add, fit to the repo's own way of verifying (don't impose a generic test pyramid) — or `defer` when the gap is real but not worth closing as part of this change, with one sentence of why.
```

If you noticed genuine non-gap problems while tracing verification, append:

```markdown
## Other findings

- <description only; no severity, confidence, priority, or ranking>
```

When you find no verification gaps and no other findings, output exactly this single line, not an empty response:

`No verification gaps found.`

## CONTENT SOURCE

"Review content:" in the message that launched you gives the content itself or a path to read it from. Read the file when it is a path; either way that is the content under review, and this instruction file never is. If no content is supplied, or the file it points to is missing, empty, or unreadable, say exactly that and stop — never report a clean review for content you could not read.

</reviewer-instructions>
 completely and follow it as your review instructions.

Review content: the unified diff at 

```diff
diff --git a/.agents/rules/security-privacy.md b/.agents/rules/security-privacy.md
index 2e706bd..1cb4a79 100644
--- a/.agents/rules/security-privacy.md
+++ b/.agents/rules/security-privacy.md
@@ -133,12 +133,20 @@ interactive external link.
 
 ## Logout
 
-Logout has explicit start, quiescing, dispatch, confirming, confirmed, and unconfirmed phases. It reaches confirmed
-only after in-flight work settles, the backend returns `204`, and subsequent session discovery establishes an anonymous
-state with fresh anonymous CSRF.
+Logout has explicit start, quiescing, dispatch, confirming, confirmed, unconfirmed, and reconciliation-needed phases.
+Quiesce known in-flight work, including login, MFA completion, and password replacement; abort alone does not prove a
+transition settled. Confirmation requires settled known transitions, backend `204`, and subsequent anonymous discovery
+with fresh anonymous CSRF.
 
 Every tab stays shielded until it independently establishes anonymous state. Only then may its neutral login surface
-say logout completed.
+confirm the observed signed-out state, not permanent revocation. Follow the detailed phase-specific discovery rules in
+`SECURITY-PRIVACY-ACCEPTANCE.md` §Logout and Privacy Screen; a broadcast is never authority.
+
+The 2026-09-27 owner decision in `FRONTEND-PRD-FOUNDATION.md` accepts the backend's reduced stateless guarantee:
+delayed login, MFA-completion, or password-change responses admitted before logout may restore authentication. There
+is no server-side per-browser revocation or guarantee across suspended or terminated contexts. Local shielding does
+not revoke cookies. An observed late transition withdraws current confirmation, shields content, and requires explicit
+session reconciliation; never reveal protected content or replay an unsafe request automatically.
 
 If logout, CSRF refresh, or anonymous confirmation fails, **keep the privacy screen**. State that logout is not
 confirmed, that the browser may still hold a valid sign-in cookie, and that protected content has been hidden locally.
diff --git a/_bmad-output/implementation-artifacts/sprint-status.yaml b/_bmad-output/implementation-artifacts/sprint-status.yaml
index 4889194..d757832 100644
--- a/_bmad-output/implementation-artifacts/sprint-status.yaml
+++ b/_bmad-output/implementation-artifacts/sprint-status.yaml
@@ -38,7 +38,7 @@ story_location:
 development_status:
   epic-1: in-progress
   1-1-project-scaffold-with-enforced-architecture: done
-  1-2-localized-anonymous-entry: backlog
+  1-2-localized-anonymous-entry: review
   1-3-password-sign-in-with-restricted-stage-isolation: backlog
   1-4-mfa-challenge-and-recovery-code-sign-in: backlog
   1-5-forced-password-replacement: backlog
diff --git a/_bmad-output/planning-artifacts/architecture/architecture-mia-frontend-2026-09-15/ARCHITECTURE-SPINE.md b/_bmad-output/planning-artifacts/architecture/architecture-mia-frontend-2026-09-15/ARCHITECTURE-SPINE.md
index ee5cddf..23420a7 100644
--- a/_bmad-output/planning-artifacts/architecture/architecture-mia-frontend-2026-09-15/ARCHITECTURE-SPINE.md
+++ b/_bmad-output/planning-artifacts/architecture/architecture-mia-frontend-2026-09-15/ARCHITECTURE-SPINE.md
@@ -137,7 +137,10 @@ graph TD
   data-layer revalidation is hard-wired `'background'`. The controller is also the single security-epoch fan-out
   point: on epoch loss it invokes, in fixed order, transfer aborts (AD-14), the cache purge funnel (AD-1), then UI
   notification — subscribers never wire each other. Deadline shapes that depend on BCG-001 remain blocked, not
-  guessed.
+  guessed. Logout coordination covers known live work, including authentication transitions; it is not server-side
+  per-browser revocation. Follow the 2026-09-27 owner decision in `FRONTEND-PRD-FOUNDATION.md` and the security
+  companion's logout phases: confirmation is `204` plus subsequent anonymous discovery, independently checked per tab;
+  late transitions require shielding and explicit reconciliation. No all-context atomic logout guarantee is assumed.
 
 ### AD-8 — The tutoring stream is a feature-owned controller outside the data layer
 
diff --git a/_bmad-output/planning-artifacts/epics.md b/_bmad-output/planning-artifacts/epics.md
index f46befb..c5c7306 100644
--- a/_bmad-output/planning-artifacts/epics.md
+++ b/_bmad-output/planning-artifacts/epics.md
@@ -152,7 +152,7 @@ Security, privacy, and safety (PRD, unnumbered):
 - NFR-16: Shared-device containment: on logout, expiry, authorization loss, or cookie rejection clear sensitive memory, protected trees, scoped caches, streams, media, object URLs, titles, and history state before neutral UI; never persist unsent drafts or sensitive content in browser storage (L493-498).
 - NFR-17: A content-free cross-tab security epoch signals auth transitions; every tab immediately privacy-shields, aborts protected work, and marks the gate for explicit revalidation; logout quiesces authenticated requests until terminal outcome (L500-507).
 - NFR-18: Per-tab idle warning appears five minutes before the earlier backend-authored deadline, moves no focus, states no remaining time; Continue working makes one explicit auth-session request; the privacy shield replaces protected content at the deadline; clock manipulation locks rather than extends (L509-524).
-- NFR-19: Logout is complete only after backend success and authoritative anonymous discovery; on failure a blocking privacy screen states logout unconfirmed with safe retry and guidance (L526-528).
+- NFR-19: Logout confirmation requires settled known transitions, backend `204`, and subsequent anonymous discovery independently per tab; failure remains shielded with safe explicit recovery. The 2026-09-27 owner decision in `FRONTEND-PRD-FOUNDATION.md` accepts delayed authentication-transition restoration and no server-side per-browser revocation. Late transitions require shielding and explicit reconciliation, not unsafe replay. See `SECURITY-PRIVACY-ACCEPTANCE.md` §Logout and Privacy Screen.
 - NFR-20: TOTP provisioning data stays route-local, masks on page hide, requires fresh authorization on return, and is removed on terminal events (L530-533).
 - NFR-21: Mobile verification renders only backend-derived states; resend returns neither code nor destination; no local receipt-time inference (`BCG-015` open) (L535-540).
 - NFR-22: Protected downloads only after explicit activation and fresh scope authorization, never prefetched or cache-reused; object URLs revoked; protected printing suppressed except the codes-only recovery-code print view; transfers abort on epoch loss (L542-551).
@@ -532,7 +532,7 @@ So that my data is protected when my session ends.
 
 **Given** logout
 **When** it starts
-**Then** every tab shields via the content-free `BroadcastChannel` epoch, authenticated requests quiesce, and success is claimed only after backend confirmation plus anonymous discovery; on failure the blocking screen states logout unconfirmed with safe retry (NFR-17, NFR-19)
+**Then** initiating and live receiving tabs shield via the content-free `BroadcastChannel` epoch, known requests including authentication transitions quiesce, and confirmation is claimed only after `204` plus each tab's subsequent anonymous discovery; failure remains unconfirmed with safe explicit retry. Delayed authentication transitions may restore authentication under the accepted stateless limitation; observing one withdraws current confirmation and requires shielding and explicit reconciliation without unsafe replay (NFR-17, NFR-19). Suspended or terminated contexts have no server-side per-browser revocation guarantee.
 **And** all BCG-001-dependent shapes are implemented against protocol fakes and marked blocked for closure until BCG-001 lands (AR-17).
 
 ### Story 1.9: TOTP enrollment and recovery codes
diff --git a/_bmad-output/planning-artifacts/ux-designs/ux-mia-frontend-2026-09-12/ACCESSIBILITY-ACCEPTANCE.md b/_bmad-output/planning-artifacts/ux-designs/ux-mia-frontend-2026-09-12/ACCESSIBILITY-ACCEPTANCE.md
index 8487a48..eec8662 100644
--- a/_bmad-output/planning-artifacts/ux-designs/ux-mia-frontend-2026-09-12/ACCESSIBILITY-ACCEPTANCE.md
+++ b/_bmad-output/planning-artifacts/ux-designs/ux-mia-frontend-2026-09-12/ACCESSIBILITY-ACCEPTANCE.md
@@ -332,11 +332,17 @@ expiry, the tab replaces the warning with a local privacy lock and requires fres
 reveal.
 Clock rollback, sleep or wake, suspended timers, and delayed callbacks lock rather than extend the deadline.
 
-A content-free logout-start signal immediately privacy-shields every tab, moves focus into that shield, and prevents new
-authenticated discovery or protected requests. Tabs remain shielded until the initiating tab broadcasts definitive
-logout success or failure. Responses from the pre-logout epoch cannot render, announce, or unlock content. `CP-02`
-remains Blocked on `BCG-001` until the backend contract prevents an old in-flight request from reinstalling an
-authenticated cookie after confirmed logout; frontend timing cannot prove that property.
+A content-free logout-start signal immediately privacy-shields each live receiving tab, moves focus into that shield,
+and prevents unrelated authenticated discovery or protected requests. A terminal signal alone never removes a shield:
+each tab independently establishes anonymous state before confirmation, following the phase-specific checks in
+`SECURITY-PRIVACY-ACCEPTANCE.md` §Logout and Privacy Screen. Responses from the pre-logout epoch cannot render,
+announce, or unlock content. The 2026-09-27 owner decision in `FRONTEND-PRD-FOUNDATION.md` accepts that a delayed
+authentication transition may restore authentication, including from suspended or terminated contexts, without a
+server-side per-browser revocation guarantee. A detected late transition withdraws current confirmation, returns focus
+to the shield heading, and announces a concise need to check sign-in status. Explicit Refresh and Retry logout remain
+keyboard reachable; visible and spoken copy distinguish local hiding from server logout and never promise permanent
+revocation. `CP-02` remains Blocked on BCG-001's remaining transport and evidence obligations, not the withdrawn atomic
+guarantee. Its evidence must cover late-transition reconciliation, per-tab checks, and failure without success speech.
 
 BCG-014 applies only to invitation Revoke/Delete faulty, permanent role grant, course-supervisor removal, membership
 removal, mentor removal, account deletion, and course deletion. Their final submission requires a backend-enforced
diff --git a/_bmad-output/planning-artifacts/ux-designs/ux-mia-frontend-2026-09-12/BACKEND-CONTRACT-GAPS.md b/_bmad-output/planning-artifacts/ux-designs/ux-mia-frontend-2026-09-12/BACKEND-CONTRACT-GAPS.md
index eae8957..045aec2 100644
--- a/_bmad-output/planning-artifacts/ux-designs/ux-mia-frontend-2026-09-12/BACKEND-CONTRACT-GAPS.md
+++ b/_bmad-output/planning-artifacts/ux-designs/ux-mia-frontend-2026-09-12/BACKEND-CONTRACT-GAPS.md
@@ -1,7 +1,7 @@
 ---
 name: MIA frontend backend contract gaps
 status: draft
-updated: 2026-09-13
+updated: 2026-09-27
 sources:
   - .memlog.md
   - mia/docs/product-requirements.md
@@ -32,44 +32,181 @@ illustrative vocabulary in this handoff.
 
 ### BCG-001: Anonymous CSRF and authentication-session discovery
 
+Status: **OPEN — logout product conflict resolved by owner decision; remaining transport and acceptance evidence gaps.**
+
+Reconciled on 2026-09-27 against the clean backend checkout at
+`0626b751558c8baa7e4645708ef588b309446ed8`. Backend paths and line references in this BCG-001 assessment refer to that
+revision. `tmp/backend-contract-entry-response.md` supplied discovery pointers, not authority; its statement that the
+backend changes are uncommitted is no longer current. No backend tests were rerun for this documentation reconciliation.
+Other BCG entries have not been re-audited by this update.
+
 #### BCG-001 frontend capability blocked
 
 The complete authentication journey is blocked: cold start, login, invitation preview and acceptance, password recovery,
 password reset, MFA continuation, required password replacement, reload, history restoration, and safe logout recovery.
-The SPA cannot safely choose between signed out, MFA required, password replacement required, and authenticated.
+The backend can now authoritatively distinguish signed out, MFA required, password replacement required, and
+authenticated. That resolves the original missing-discovery transport, but does not close this composite blocker or
+authorize wiring the authentication journey while it remains open.
 
 #### BCG-001 authoritative product requirement
 
 - Browser authentication uses expiring stateless cookies and must require reauthentication after idle or absolute expiry
-  (`mia/docs/product-requirements.md:524-540`).
+  (`mia/docs/product-requirements.md:583-607`).
 - Restricted `mfa` and `password-change` stages permit only their named actions and logout, expire after 30 minutes, and
-  rotate on successful transitions (`mia/docs/product-requirements.md:560-575`).
-- Public invitation, reset, and other unauthenticated security operations are rate limited. They must not disclose
-  sensitive identifier existence (`mia/docs/product-requirements.md:1587-1625`).
+  rotate on successful transitions (`mia/docs/product-requirements.md:627-642`).
 - The concrete cross-route transport requires `GET /api/v1/auth/session` to issue or refresh anonymous CSRF state and
-  requires the token on every unsafe public operation (`mia/docs/api.md:100-128`).
-- An authenticated browser session expires after 30 minutes without an authenticated user action, while successful
-  authenticated requests currently reset idle expiry (`mia/docs/product-requirements.md:524-538`).
-
-#### BCG-001 current docs/OpenAPI mismatch
-
-- The API narrative lists `GET /api/v1/auth/session` as an authentication operation
-  (`mia/docs/api.md:176-195`).
-- The root OpenAPI path map starts with login and proceeds directly through auth mutations; it has no
-  `/api/v1/auth/session` path (`mia/api-doc/openapi.yaml:38-64`).
-- Login and all public unsafe auth operations require `csrfToken` (`mia/api-doc/paths/auth.yaml:1-123`), but OpenAPI
-  defines no operation that can obtain the matching CSRF cookie from a no-cookie state.
-- The existing `AuthSession` schema represents only `authenticated`, `mfa`, and `password-change`. It cannot represent
-  an anonymous result and exposes no stage or session expiry
-  (`mia/api-doc/schemas/resources/resources.yaml:67-89`).
-- The architecture confirms that cookie policy is server-owned and shared by session and CSRF middleware
-  (`mia/docs/architecture.md:126-135`); the frontend cannot reconstruct it.
-- Current session semantics reissue the sliding cookie after every successful authenticated request, while logout clears
-  only the browser cookie (`mia/docs/api.md:100-113`; `mia/docs/product-requirements.md:524-540`). A response started in
-  another tab before logout can therefore arrive later and reinstall authenticated cookie state.
-- Neither docs nor OpenAPI provide the non-refreshing ordered reads needed after explicit Refresh, Try now, or Continue
-  working. Opening an authenticated SSE connection and every current successful authenticated request reset idle expiry
-  under the current request-wide rule.
+  requires the token on every unsafe public operation (`mia/docs/api.md:133-147`). Discovery's public rate limit and
+  uniform invalid-authentication result are documented in `mia/api-doc/paths/auth.yaml#/sessionDiscovery` and
+  `mia/api-doc/responses/errors.yaml#/RateLimited`.
+- Only explicit Continue working advances authenticated idle expiry; ordinary requests, polling, SSE establishment,
+  reconnection, heartbeats, and background work do not. The absolute lifetime begins at completion of the final login
+  stage and remains fixed (`mia/docs/product-requirements.md:583-598`).
+- The maintained backend deliberately provides a reduced stateless logout guarantee: delayed ordinary and Continue
+  working responses cannot restore usable authentication, but delayed authentication transitions may restore it
+   (`mia/docs/product-requirements.md:599-607`). The frontend owner accepted this limitation on 2026-09-27, as recorded
+   in `FRONTEND-PRD-FOUNDATION.md` §Security, Privacy, and Safety; only the former logout product conflict is closed.
+
+#### BCG-001 transport and implementation progress
+
+These are requirement-level findings, not partial closure or permission to bypass the open-gap rule.
+
+- **Stage discovery:** OpenAPI 3.2 now maps `GET /api/v1/auth/session` and `POST /api/v1/auth/session-continuations`
+  (`mia/api-doc/openapi.yaml:42-47`). Discovery permits anonymous or cookie-authenticated access, needs no body or CSRF
+  header, and defines `200`, `406`, `429`, and `500` responses. `SessionDiscoveryDocument` selects `data: null` with
+  `meta.stage: anonymous`, or an `AuthSession` with `data.attributes.stage`. The implementation returns the bound MFA
+  challenge ID, but the schema does not require it for `stage: mfa`; that transport requirement remains unsatisfied
+  (see MFA schema completeness below). Invalid/stale/banned/deleted/generation-invalid authentication collapses to
+  anonymous. References:
+  `mia/api-doc/paths/auth.yaml:31-61`, `mia/api-doc/schemas/resources/resources.yaml:269-320`,
+  `mia/internal/auth/auth.go:474-518`, and `mia/internal/httpserver/httpserver.go:312-331,450-503`.
+- **Minimal disclosure and entry order:** the discovery implementation returns stage, deadlines, account resource
+  identity, and the stage-applicable opaque challenge, not roles, profile, factor secrets, or destinations. Restricted flows remain
+  focused; MFA precedes password replacement. Authenticated discovery proceeds to capabilities, not directly to Home.
+  The maintained Home contract permits an empty Home after successful capability discovery and gates each dependent
+  section by its action and scope (`mia/docs/product-requirements.md:235-255`,
+  `mia/api-doc/paths/users.yaml:50-82`). This is relevant entry evidence, not closure of BCG-003.
+- **Anonymous CSRF:** anonymous discovery rotates the readable public cookie, including after invalid session clearing.
+  Unsafe operations declare `csrfToken`; cookie/header names and same-origin handling are maintained in
+  `mia/api-doc/openapi.yaml:217-233` and `mia/docs/api.md:133-147`. Login-stage transitions and logout rotate CSRF;
+  bootstrap and middleware are implemented in `mia/internal/auth/auth.go:474-486` and
+  `mia/internal/httpserver/httpserver.go:770-804`. The all-stage issuance and stale-token evidence qualifications below
+  remain open.
+- **Restricted and authenticated deadlines:** `AuthSession` requires `idle_expires_at` and `absolute_expires_at`;
+  discovery and shared `Session` responses also declare both deadline headers. Restricted stages have a non-refreshing
+  30-minute lifetime; a full session starts a 30-minute idle and 12-hour absolute lifetime. Implementation serializes UTC
+  instants and rejects either expired deadline (`mia/api-doc/paths/auth.yaml:485-493`,
+  `mia/api-doc/schemas/resources/resources.yaml:269-299`, `mia/internal/httpserver/httpserver.go:402-503`,
+  `mia/internal/auth/auth.go:507-518`). Deadline availability is implemented; complete expiry evidence remains open.
+- **Non-refreshing reads and SSE:** ordinary access is non-refreshing by default; no invented request flag is needed.
+  This is maintained product behavior (`mia/docs/product-requirements.md:589-598`) and API narrative
+  (`mia/docs/api.md:122-131`), with explicit capability and current-work read descriptions in
+  `mia/api-doc/paths/users.yaml#/capabilities` and `mia/api-doc/paths/tutoring.yaml#/tutoringSessionCurrentWork`.
+  The SSE operation is `mia/api-doc/paths/tutoring.yaml#/tutorResponseEvents`. Operation-level OpenAPI coverage and
+  browser reconnect evidence still need reconciliation as listed below.
+- **Continue working:** `sessionContinuations` requires a full session plus CSRF and returns shared `Session` on `200`;
+  `401`, restricted-stage/CSRF `403`, and `406` are defined. `ExtendSession` advances idle to at most the existing
+  absolute deadline, and the same response contains both deadlines; no second deadline read is necessary
+  (`mia/api-doc/paths/auth.yaml:63-78,485-493`, `mia/internal/httpserver/httpserver.go:334-353`,
+  `mia/internal/auth/auth.go:489-518`). The operation itself does not open/reconnect SSE.
+- **Representations and caching:** discovery's JSON:API success/error media types, optional authentication, public
+  rate-limit response, and `Cache-Control: no-store` are declared. The root contract applies no-store to every API
+  response, including streaming and errors (`mia/api-doc/openapi.yaml:9-15`,
+  `mia/api-doc/responses/errors.yaml:19-30,43-48`). This does not close BCG-005's separate acceptance evidence.
+
+#### BCG-001 remaining conflicts and transport questions
+
+1. **Resolved product conflict — reduced stateless logout accepted, 2026-09-27.** Source owner instruction:
+   "frontend’s logout requirements shall be revised", choosing the documented backend limitation. The decision in
+   `FRONTEND-PRD-FOUNDATION.md` accepts that delayed login, MFA-completion, or password-change responses admitted before
+   logout may restore authentication, and no server-side per-browser revocation or durable guarantee across suspended
+   or terminated contexts exists. Backend authorities remain `mia/docs/product-requirements.md:599-607`,
+   `mia/api-doc/paths/auth.yaml:80-99`, and `mia/api-doc/openapi.yaml:217-228`. The reduced guarantee protects usable
+   authentication against ordinary/Continue responses, not physical absence of every late cookie. Frontend requirements
+   retain shielding, known-transition quiescence, `204` plus subsequent anonymous discovery, independent tab checks,
+   explicit late-transition reconciliation, and no automatic unsafe replay. Unrelated-device logout scope is unchanged.
+   This closes only the product-conflict portion; logout browser evidence and the composite BCG-001 remain open.
+2. **CSRF completeness.** The required contract says always issue/refresh the readable cookie. Current OpenAPI promises
+   refresh for anonymous discovery; with a valid stage and existing CSRF cookie, implementation retains that cookie
+   rather than reissuing it (`mia/internal/auth/auth.go:474-486`,
+   `mia/internal/httpserver/httpserver.go:770-804`). The API narrative's broader “always” wording
+   (`mia/docs/api.md:142-147`) needs precise alignment with that behavior. It also claims immediate invalidation of the
+   old value, while middleware compares the submitted cookie/header pair without a server-side token generation check.
+   Rejection of an old header against the current rotated browser cookie must not be represented as proof that every
+   previously matching pair is revoked. Establish the intended scope and corresponding stale-token tests. Discovery can
+   also reject duplicate CSRF cookies as `403 csrf_invalid` before handling the GET, but that response is not declared
+   in `sessionDiscovery`; no-cookie success does not settle this error-contract mismatch.
+3. **Non-refreshing transport completeness.** Maintained product behavior covers ordinary reads, mutations, and SSE,
+   and the implementation exposes deadline headers centrally. OpenAPI declares these headers on discovery/auth-session
+   responses, but not capability, current-work, or SSE success responses. The SSE operation does not explicitly describe
+   the non-refreshing reconnect or the client sequence after Continue working. “The continuation POST does not reconnect”
+   does not settle whether the frontend may subsequently open one replacement after the non-refreshing ordered checks
+   required by `FRONTEND-STATE-MACHINES.md:176-185`. Publish that transport guarantee and sequence rather than infer it
+   from implementation. Lifecycle no-request behavior remains a frontend evidence obligation.
+4. **Historical frontend lifetime wording.** `FRONTEND-PRD-FOUNDATION.md:387-394` still describes SSE opening as refreshing
+   under the former backend rule; that factual premise no longer matches maintained backend behavior. The frontend's
+   local baseline wording (`EXPERIENCE.md:279-295`, `SECURITY-PRIVACY-ACCEPTANCE.md:184-209`) must not be used to extend a
+   server deadline after an ordinary user request: backend policy permits refresh only through Continue working.
+   `.memlog.md:77` already names Continue working as the sole activity-refresh operation. This assessment records the
+   stale wording without silently rewriting the binding artifacts or inventing automatic continuation requests.
+5. **MFA schema completeness.** `mia/api-doc/schemas/resources/resources.yaml:282-291` requires only `stage`,
+   `idle_expires_at`, and `absolute_expires_at` in `AuthSession.attributes`. `mfa_challenge_id` is optional; “Present only
+   in the mfa stage” does not conditionally require its presence. A document declaring `stage: mfa` without a challenge
+   identity therefore satisfies the published schema. The MFA variant must require its bound challenge identity before
+   this required observable transport contract can be considered satisfied. The implementation returns it
+   (`mia/internal/auth/auth.go:514-518`) and `TestMFADiscoveryReturnsOnlyOpaqueChallenge` asserts its presence
+   (`mia/internal/auth/auth_test.go:391-405`), but neither repairs the authoritative OpenAPI schema.
+
+#### BCG-001 acceptance evidence assessment
+
+- **Inspected backend coverage:** `mia/internal/auth/auth_test.go` contains
+  `TestSessionDiscoveryReturnsAnonymousAndAuthoritativeStages` (349-389),
+  `TestMFADiscoveryReturnsOnlyOpaqueChallenge` (391-406),
+  `TestOnlyContinueWorkingExtendsAuthenticatedSession` (252-315),
+  `TestBrowserRestartRetainsBoundAuthenticatedSession` (317-347), and
+  `TestBanDeletionAndSecurityGenerationInvalidateCookies` (444-475). These cover selected stage reloads, deadlines,
+  non-refresh, invalidation, and restart behavior. `TestRestrictedRoutesRequireValidUnexpiredSession` (131-155) forces an
+  expired idle value; it is not a complete clock-controlled restricted/absolute-expiry matrix.
+- **Reduced logout evidence:** `TestLogoutReorderingUsesReducedStatelessGuarantee` (408-442) deliberately asserts that a
+  delayed login pair is authenticated after logout, while a delayed Continue cookie with the new marker is anonymous and
+  another browser stays authenticated. This is backend cookie-pair simulation, not multi-tab browser evidence, and
+  supports the accepted limitation rather than proving frontend shielding, transition quiescence, or reconciliation.
+- **CSRF coverage is incomplete for the specified journey:** no-cookie discovery asserts CSRF issuance, and
+  `mia/internal/httpserver/httpserver_test.go:17-214` covers cookie attributes and missing/mismatched/duplicate/cross-site
+  rejection. Auth and invitation tests obtain their public CSRF through `/api/v1/missing`
+  (`mia/internal/auth/auth_test.go:1775-1786`, `mia/internal/invitation/invitation_test.go:574-585`). Those tests do not prove
+  the required no-cookie **documented discovery → login/recovery/reset/preview/acceptance** integration sequences.
+  Rotation and stale-token rejection across all transitions still need a requirement-mapped evidence record.
+- **Capability evidence relevant to entry:** `mia/internal/capability/capability_test.go:59-80` checks non-refreshing
+  access; tests beginning at lines 82, 105, 130, and 185 cover unassigned accounts, restricted-stage denial, exact mentor
+  pair/removal behavior, and failure without partial scope. These do not supply browser mounting or lifecycle evidence.
+- **Recorded backend verification, not a new run:**
+  `mia/_bmad-output/implementation-artifacts/spec-2-2-discover-and-extend-browser-sessions-safely.md:94-122` records the
+  reduced-guarantee decision and full-check result.
+  `mia/_bmad-output/implementation-artifacts/spec-frontend-entry-contracts.md:111-132` records the later full check,
+  including race, lint, duplication, Trivy, OpenAPI, and Markdown; optional `govulncheck` was unavailable/skipped. It
+  explicitly says frontend mounting was not browser-tested. Neither record closes this frontend blocker.
+- **Still required:** an OpenAPI MFA variant requiring its bound challenge identity, plus examples for all four discovery
+  stages (examples were not found); complete documented-bootstrap/CSRF and restricted/idle/absolute boundary tests;
+  clock-controlled browser tests for lifecycle
+  silence, explicit Refresh/Try now, same-response continuation deadlines, and bounded SSE reopening; multi-tab delayed
+  response/logout tests including authentication transitions and unrelated-device preservation; and cold-load/BFCache
+  no-protected-paint evidence. Backend recorder tests and cookie simulation cannot stand in for these browser results.
+
+#### BCG-001 Story 1-2 resumption decision
+
+The canonical entry correction **may not resume as wired application work under the current rules**. `/login` dispatches
+authenticated and restricted stages, and `/` is Home behind current capability and complete-scope discovery
+(`ROUTE-INVENTORY.md:58-65,141-150`). Implementing that dispatch needs BCG-001; Home also needs BCG-003, which remains
+open and was not fully reconciled here. `AGENTS.md` and `.agents/rules/api-client.md` say an open entry blocks work that
+needs it; there is no documented partial-closure exemption to infer from the transport findings above.
+
+`FRONTEND-PRD-FOUNDATION.md:700-711` already permits localization, preferences/text-size/reflow, accessible chrome,
+blueprint binding, and component-level protocol-fake or unwired presentation work while BCG-001 is open. That existing
+allowance does not authorize guessed stage dispatch, a root-to-login redirect that assumes anonymity, or a protected
+Home mount. The existing Story 1-2 artifact's no-backend-traffic scope and `done` status are not closure evidence for
+canonical entry. This assessment changes neither that artifact nor sprint status. The logout product conflict is now
+resolved, but resume still requires satisfying the remaining closure criteria or an explicit authoritative
+dependency/scope decision. The logout decision creates no global unblocking or partial-closure exemption.
 
 #### BCG-001 required observable contract
 
@@ -80,8 +217,10 @@ The SPA cannot safely choose between signed out, MFA required, password replacem
 - Return the relevant non-refreshing restricted-stage expiry and authenticated idle and absolute expiry as UTC
   instants sufficient for truthful warning and reauthentication behavior.
 - Define CSRF rotation after every auth transition and the result when a stale or invalid session cookie is cleared.
-- Define atomic logout ordering so no response authorized with pre-logout cookie state can reinstall authenticated state
-  after logout is confirmed. Preserve the intended scope of logout rather than silently invalidating other devices.
+- Define the reduced stateless logout guarantee and discovery reconciliation as maintained in the backend authorities
+  above. Accept late authentication-transition restoration; do not require universal anti-restoration or physical
+  cookie absence. Preserve logout scope without invalidating unrelated devices. The security companion owns frontend
+  confirmation and shielding obligations under the 2026-09-27 decision.
 - Provide a documented non-refreshing mode for the ordered session, capability, scope, resource, work-state, and SSE
   operations started only by explicit Refresh or reconnect actions. Browser lifecycle events themselves send no request.
 - Provide one explicit Continue working operation whose success returns the refreshed authoritative idle deadline and
@@ -108,8 +247,10 @@ authentication. Automatic lifecycle traffic must not be presented as user activi
   and invitation acceptance.
 - Backend tests for MFA and password-change reload, expiry, invalid security generation, CSRF rotation, stale-token
   rejection, logout, and authenticated idle/absolute expiry.
-- Multi-tab browser tests in which a pre-logout session or protected response arrives after logout; authenticated cookie
-  state must remain absent after confirmed logout without signing out unrelated devices.
+- Multi-tab browser tests distinguishing delayed ordinary/Continue responses from login, MFA-completion, and
+  password-change responses. Prove known-transition quiescence, `204` plus independent subsequent anonymous checks,
+  truthful confirmation, shielding and explicit reconciliation after a late transition, and no automatic unsafe replay.
+  Include suspended/terminated contexts and preserve unrelated devices; do not assert universal cookie absence.
 - Clock-controlled tests proving lifecycle events send no authenticated request; explicit Refresh and Try now do not
   move idle expiry; and Continue working returns a refreshed idle and unchanged absolute deadline in one response.
 - Browser integration evidence that cold load and BFCache restoration reveal no protected content before discovery.
diff --git a/_bmad-output/planning-artifacts/ux-designs/ux-mia-frontend-2026-09-12/EXPERIENCE.md b/_bmad-output/planning-artifacts/ux-designs/ux-mia-frontend-2026-09-12/EXPERIENCE.md
index 1ccd0fe..bd70d79 100644
--- a/_bmad-output/planning-artifacts/ux-designs/ux-mia-frontend-2026-09-12/EXPERIENCE.md
+++ b/_bmad-output/planning-artifacts/ux-designs/ux-mia-frontend-2026-09-12/EXPERIENCE.md
@@ -301,9 +301,12 @@ the neutral privacy shield, aborts protected work, and marks the protected-rende
 exposing content or allowing mutation. `SECURITY-PRIVACY-ACCEPTANCE.md` owns transport, ordering, deduplication, and
 teardown detail.
 
-Logout start shields every tab and quiesces authenticated requests until the initiating logout reaches a terminal
-outcome. No pre-logout response may restore authentication after confirmed logout. The ledger's logout request-
-quiescence blocker must close before this behavior ships; timing assumptions are not a substitute.
+Logout start shields the initiating and live receiving tabs and quiesces known in-flight work, including authentication
+transitions, until the initiating logout reaches a terminal outcome. The 2026-09-27 owner decision in
+`FRONTEND-PRD-FOUNDATION.md` accepts that delayed login, MFA-completion, or password-change responses admitted before
+logout may restore authentication. There is no server-side per-browser revocation or guarantee across suspended or
+terminated contexts. Local shielding hides content; it does not revoke cookies. `BCG-001` remains open for remaining
+transport and evidence obligations.
 
 On logout, expiry, authorization loss, or security-generation rejection, synchronously clear protected trees,
 sensitive memory, scoped caches, titles, breadcrumbs, history state, streams, media, partial downloads, and object URLs
@@ -311,10 +314,13 @@ before showing neutral UI. Never persist unsent chat drafts, passwords, MFA valu
 tokens, private content, or authenticated API bodies in browser storage. A chat draft may survive only page-local
 reconnection while that page remains open and authorization remains confirmed.
 
-Logout is complete only after backend success and authoritative anonymous-session discovery. Failure replaces the
-protected application with `privacy-screen`, states that logout is not confirmed, retries only through the safe CSRF
-path, and provides close-browser or operator guidance. It never displays a successful neutral login while a valid
-HttpOnly session cookie may remain.
+Logout confirmation requires known transitions to settle, backend `204`, and subsequent authoritative anonymous-session
+discovery. Each tab independently checks before showing neutral login with confirmation of that observed state, not
+permanent revocation. A late transition retains or reinstalls `privacy-screen`, withdraws current confirmation, and
+offers explicit session reconciliation; it never automatically reveals protected content or replays an unsafe request.
+Failure states that logout is unconfirmed and content is hidden locally, retries only through explicit safe CSRF
+recovery, and provides close-browser or operator guidance without promising cookie revocation. Detailed recovery and
+truthful copy are owned by `SECURITY-PRIVACY-ACCEPTANCE.md` §Logout and Privacy Screen.
 
 Device-local locale and Standard, Large, or Extra large text size may persist because they are not account content.
 After reauthentication, route the student to any still-active tutoring session and restore authoritative saved work
diff --git a/_bmad-output/planning-artifacts/ux-designs/ux-mia-frontend-2026-09-12/FRONTEND-PRD-FOUNDATION.md b/_bmad-output/planning-artifacts/ux-designs/ux-mia-frontend-2026-09-12/FRONTEND-PRD-FOUNDATION.md
index 5747b41..0891bee 100644
--- a/_bmad-output/planning-artifacts/ux-designs/ux-mia-frontend-2026-09-12/FRONTEND-PRD-FOUNDATION.md
+++ b/_bmad-output/planning-artifacts/ux-designs/ux-mia-frontend-2026-09-12/FRONTEND-PRD-FOUNDATION.md
@@ -502,9 +502,18 @@ detected account change without carrying account, route, resource, or scope data
 aborts protected work, and marks the conjunctive protected-render gate for explicit revalidation. The security companion
 owns exact mechanics.
 
-Logout start shields every tab and quiesces authenticated requests until terminal outcome. No pre-logout response may
-restore authentication after confirmed logout. `BCG-001` owns logout request quiescence and the atomic ordering that
-prevents a late pre-logout response from reinstalling authenticated state; it must close before release.
+Logout start shields the initiating and live receiving tabs and quiesces known in-flight requests, including login,
+MFA completion, and password replacement, until terminal outcome. Local shielding does not revoke cookies.
+
+Product Owner decision, 2026-09-27: the source user instruction was "frontend’s logout requirements shall be revised",
+choosing acceptance of the backend's reduced stateless logout guarantee rather than strengthening the backend.
+As defined in `mia/docs/product-requirements.md` §Authentication session lifetime and
+`mia/api-doc/paths/auth.yaml#/logout`, delayed ordinary and Continue working responses cannot restore usable
+authentication, but delayed login, MFA-completion, or password-change responses admitted before logout may restore it.
+The owner accepts that there is no server-side per-browser revocation or durable logout guarantee across suspended or
+terminated contexts. The former universal no-pre-logout-response guarantee is withdrawn. The security companion owns
+quiescence, independent tab confirmation, and explicit reconciliation after a late transition; `BCG-001` remains open
+for its remaining transport and evidence gaps and must close before dependent behavior ships.
 
 Each tab's idle-warning baseline is its own last successful user-initiated authenticated request. Other-tab activity
 does not reset it. The non-modal warning says local inactivity was detected, sign-in status must be checked, and unsaved
@@ -523,9 +532,12 @@ sleep, wake, suspended timers, or delayed callbacks lock rather than extend it.
 discovery are required to reveal content; `BCG-001` owns the deadline contract, including the authenticated idle and
 absolute expiry instants and the non-refreshing restricted-stage expiry.
 
-Logout is complete only after backend success and authoritative anonymous discovery. On failure, a blocking privacy
-screen removes protected content, says logout is unconfirmed, offers safe CSRF refresh and retry, and gives
-close-browser or operator guidance. It never presents a successful logout while the HttpOnly cookie may remain valid.
+Logout confirmation requires known transitions to settle, backend `204`, and subsequent authoritative anonymous
+discovery. It confirms the observed state, not permanent cookie revocation or immunity to later transitions. Every tab
+checks independently before claiming confirmation. A late transition withdraws current confirmation, retains or
+reinstalls the shield, and requires explicit reconciliation. On failure or ambiguity, a blocking privacy screen says
+logout is unconfirmed, offers safe explicit CSRF recovery and retry, and gives close-browser or operator guidance
+without claiming browser closure revokes authentication. No unsafe request is automatically replayed.
 
 TOTP provisioning data remains route-local after a correctable verification failure while the same authorized pending
 enrollment remains valid. Page hide masks setup and suspends copy; return requires fresh authorization before reveal. It
diff --git a/_bmad-output/planning-artifacts/ux-designs/ux-mia-frontend-2026-09-12/FRONTEND-STATE-MACHINES.md b/_bmad-output/planning-artifacts/ux-designs/ux-mia-frontend-2026-09-12/FRONTEND-STATE-MACHINES.md
index 3361fe3..0bcddd9 100644
--- a/_bmad-output/planning-artifacts/ux-designs/ux-mia-frontend-2026-09-12/FRONTEND-STATE-MACHINES.md
+++ b/_bmad-output/planning-artifacts/ux-designs/ux-mia-frontend-2026-09-12/FRONTEND-STATE-MACHINES.md
@@ -51,11 +51,12 @@ session check alone never authorizes a route: capability/scope, route resource,
 | Rotating | Auth transition | Controls disabled | No queued mutation | Reread CSRF cookie |
 | Restricted expired | Auth loss | Neutral login | Sign in | Clear protected memory |
 | Logout start | User activates logout | Local privacy shield | Broadcast start; abort work | Origin request barrier |
-| Logout quiescing | Start received | Every tab shielded | No authenticated request | Shared leases settle |
+| Logout quiescing | Start received | Initiating/live receiving tabs shielded | No new authenticated request | Known shared leases settle |
 | Logout dispatch | Exclusive barrier acquired | Logout in progress | One logout request | `204` or failure |
 | Logout confirming | `204` received | Still shielded | Anonymous non-refreshing check | Anonymous session result |
 | Logout confirmed | Anonymous confirmed | Neutral login | Broadcast confirmed | Release barrier signed out |
 | Logout unconfirmed | Phase fails | Privacy screen | `Retry logout` or close browser | New barrier cycle |
+| Logout reconciliation needed | Late auth transition observed | Privacy screen; withdraw confirmation | Explicit Refresh; no unsafe replay | Current session discovery |
 
 The session-discovery operation, anonymous CSRF issuance, stages, expiries, and safe logout recovery are `BLOCKED` on
 `BCG-001: Anonymous CSRF and authentication-session discovery`. Protected responses also depend on
@@ -64,14 +65,21 @@ The session-discovery operation, anonymous CSRF issuance, stages, expiries, and
 Auth transitions are serialized per tab. Every unsafe request reads CSRF immediately before dispatch. Rotation cancels
 older queued mutations. No unsafe request is automatically replayed after `csrf_invalid` or an ambiguous result.
 
-Every same-origin request that can carry or reissue an authenticated cookie must hold a shared lease from one
-origin-wide request coordinator. Logout start closes admission, shields every tab, aborts abortable work, waits for all
-pre-logout leases to settle, and holds an exclusive barrier through logout and anonymous confirmation. Content-free
+Every same-origin request that can carry or reissue an authenticated cookie, including login, MFA completion, and
+password replacement, must hold a shared lease from one origin-wide request coordinator. Logout start closes admission,
+shields initiating and live receiving tabs, aborts abortable work, waits for known pre-logout leases to settle, and holds
+an exclusive barrier through logout and anonymous confirmation. Abort alone does not prove transition settlement;
+unknown outcomes remain shielded and unconfirmed. Content-free
 `logout-start`, `logout-confirmed`, and `logout-unconfirmed` phases coordinate tabs; no outcome phase reveals content.
-The browser mechanism is required, but its cookie-ordering guarantee remains `BLOCKED` on
-`BCG-001: Anonymous CSRF and authentication-session discovery` until that topic owns an observable server generation or
-equivalent atomic logout contract.
-An unconfirmed outcome keeps admission closed and every tab shielded; only `Retry logout` starts a new barrier cycle.
+The browser mechanism coordinates known live work, not suspended or terminated contexts. The 2026-09-27 owner decision
+in `FRONTEND-PRD-FOUNDATION.md` accepts the backend's reduced stateless guarantee: delayed authentication transitions
+may restore authentication; there is no server-side per-browser revocation. `BCG-001` remains open for remaining
+transport and evidence obligations. Confirmation requires `204` and subsequent anonymous discovery, independently
+checked per tab; it is an observation, not permanent revocation. A late transition enters Logout reconciliation needed.
+Explicit Refresh returning anonymous restores confirmation only with a prior `204` and settled known transitions;
+any other stage or failed check keeps logout unconfirmed. `SECURITY-PRIVACY-ACCEPTANCE.md` owns detailed recovery.
+An unconfirmed outcome keeps ordinary request admission closed and participating tabs shielded; only `Retry logout`
+starts a new barrier cycle. Explicit reconciliation uses the phase-specific discovery exception above.
 
 ## 2. Session and Message Request-ID Lifecycle
 
diff --git a/_bmad-output/planning-artifacts/ux-designs/ux-mia-frontend-2026-09-12/ROUTE-INVENTORY.md b/_bmad-output/planning-artifacts/ux-designs/ux-mia-frontend-2026-09-12/ROUTE-INVENTORY.md
index 05bb1aa..21b89fa 100644
--- a/_bmad-output/planning-artifacts/ux-designs/ux-mia-frontend-2026-09-12/ROUTE-INVENTORY.md
+++ b/_bmad-output/planning-artifacts/ux-designs/ux-mia-frontend-2026-09-12/ROUTE-INVENTORY.md
@@ -136,7 +136,9 @@ unknown mutation outcome remains on its owning route without success copy until
 - Title: `Sign out`
 - H1 purpose: confirm or safely recover restricted-stage logout.
 - Gate: `Restricted(mfa or password-change)`.
-- Fallback: `/login` only after confirmed anonymous discovery; otherwise remain on the privacy screen.
+- Fallback: `/login` only after logout confirmation under `SECURITY-PRIVACY-ACCEPTANCE.md` §Logout and Privacy Screen
+  (`204` plus subsequent independent anonymous discovery); otherwise remain on the privacy screen. A detected late
+  authentication transition returns to that shield for explicit reconciliation, not protected navigation.
 
 ## Home
 
diff --git a/_bmad-output/planning-artifacts/ux-designs/ux-mia-frontend-2026-09-12/SECURITY-PRIVACY-ACCEPTANCE.md b/_bmad-output/planning-artifacts/ux-designs/ux-mia-frontend-2026-09-12/SECURITY-PRIVACY-ACCEPTANCE.md
index ecc7d2b..e627d80 100644
--- a/_bmad-output/planning-artifacts/ux-designs/ux-mia-frontend-2026-09-12/SECURITY-PRIVACY-ACCEPTANCE.md
+++ b/_bmad-output/planning-artifacts/ux-designs/ux-mia-frontend-2026-09-12/SECURITY-PRIVACY-ACCEPTANCE.md
@@ -266,27 +266,42 @@ blockers and never reasons to persist request bodies, request IDs, or file handl
 
 ## Logout and Privacy Screen
 
-Logout has explicit `logout-start`, `logout-quiescing`, `logout-requesting`, `logout-confirmed`, and
-`logout-unconfirmed` phases. `logout-start` first replaces protected UI in the initiating tab with a blocking neutral
+Logout has explicit `logout-start`, `logout-quiescing`, `logout-requesting`, `logout-confirming`, `logout-confirmed`,
+`logout-unconfirmed`, and `logout-reconciliation-needed` phases. `logout-start` first replaces protected UI in the initiating tab with a blocking neutral
 privacy screen, tears down local protected state, closes admission to the origin-wide authenticated-request coordinator,
-and broadcasts the content-free start phase. Every authenticated request and SSE connection holds a shared coordinator
-lease from before dispatch through final response and cookie processing. Every live receiving tab applies the same
+and broadcasts the content-free start phase. Every authenticated request, login/MFA-completion/password-change
+transition, and SSE connection holds a shared coordinator lease from before dispatch through settlement. Every live receiving tab applies the same
 shield and admission block, aborts authenticated fetches, closes SSE, fences late callbacks, and releases settled
-leases. It returns a content-free quiescence acknowledgement for that logout nonce. No tab starts session discovery,
-reads, reconnects, or mutations while that logout remains in progress.
+leases. Abort or a rejected local wait alone does not prove that a transition cannot still deliver cookies; known
+unsettled transitions keep logout unconfirmed. A tab returns a content-free quiescence acknowledgement for that logout
+nonce. No tab starts unrelated discovery, reads, reconnects, or mutations while that logout remains in progress;
+the initiator's permitted CSRF recovery and post-`204` anonymous confirmation are the phase-specific exceptions.
 
 The initiator waits for an exclusive coordinator lease before sending one explicit CSRF-protected logout request and
 holds it through anonymous confirmation. Quiescence acknowledgements aid observability but never substitute for the
-exclusive lease. Frontend coordination cannot cover suspended or terminated contexts or prevent every already accepted
-pre-logout response from reissuing the stateless cookie. Therefore confirmed logout is release-blocked until `BCG-001`
-provides a backend-observable generation or equivalent atomic guarantee that no request carrying the pre-logout session
-can install an authenticated cookie after logout confirmation. Timeouts, grace periods, tab counts, and response-order
-guesses are forbidden substitutes.
-
-Logout reaches `logout-confirmed` only after that guarantee, backend `204`, and subsequent session discovery establish
-an anonymous state with fresh anonymous CSRF. The initiator then broadcasts a content-free confirmed outcome. Every tab
-stays shielded until it independently establishes anonymous state; only then may its neutral login surface say logout
-completed.
+exclusive lease. This coordinates known live work; it cannot cover suspended or terminated contexts or prevent every
+already admitted authentication-transition response from restoring authentication. The owner accepted this limitation
+on 2026-09-27 in `FRONTEND-PRD-FOUNDATION.md`. The authoritative backend contract is
+`mia/docs/product-requirements.md` §Authentication session lifetime and `mia/api-doc/paths/auth.yaml#/logout`:
+delayed ordinary and Continue working responses cannot restore usable authentication, but delayed login,
+MFA-completion, or password-change responses may. There is no server-side per-browser revocation guarantee.
+Timeouts, grace periods, tab counts, aborts, and response-order guesses do not prove revocation or settlement.
+
+Logout reaches `logout-confirmed` only after known transitions settle, backend `204`, and subsequent session discovery
+establish an anonymous state with fresh anonymous CSRF. The initiator then broadcasts a content-free confirmed outcome.
+Each tab stays shielded until its own permitted non-refreshing discovery establishes anonymous state; receiving the
+signal alone never confirms logout. Other tabs use explicit Refresh for that check, not lifecycle-triggered traffic.
+Confirmation means anonymous at that check, not immunity to a later transition. Neutral login copy may say
+"Signed out at the last check. A sign-in already in progress in another tab may sign this browser in again."
+
+If a late authentication transition is observed after dispatch or confirmation, fence its UI result, retain or
+reinstate the shield, withdraw current confirmation, and enter `logout-reconciliation-needed`. Offer explicit Refresh
+using documented session discovery. If it returns anonymous after a prior `204` and known transitions are settled,
+confirmation may be restored; without a `204`, anonymous discovery alone does not confirm the logout attempt.
+An MFA, password-change, or authenticated result keeps logout unconfirmed and offers explicit Retry logout through
+safe CSRF recovery, never automatic protected reveal or replay. Failed or ambiguous reconciliation keeps the shield.
+Suspended/restored tabs apply the existing lifecycle shield and explicit-check rules; no durable all-context logout
+record is implied. Local shielding, response fencing, and browser closure do not revoke cookies.
 
 If logout, CSRF refresh, or anonymous confirmation fails, keep the privacy screen. It must state that logout is not
 confirmed, that the browser may still hold a valid sign-in cookie, and that protected content has been hidden locally.
@@ -295,8 +310,9 @@ Broadcast a content-free unconfirmed outcome so every tab remains shielded. Do n
 success, restore protected UI, run authenticated discovery automatically, or retry automatically. `Retry logout` starts
 a new phased attempt only after explicit activation and safe CSRF recovery.
 
-Backend dependency: `BCG-001` owns logout rotation, request quiescence, the atomic anti-resurrection guarantee,
-non-refreshing lifecycle checks, and post-logout anonymous discovery. This flow cannot ship while that blocker is open.
+Backend dependency: `BCG-001` tracks logout rotation, the reduced guarantee and reconciliation evidence,
+non-refreshing lifecycle checks, and post-logout anonymous discovery. Only its logout product conflict is resolved;
+this flow cannot ship while the composite blocker remains open.
 
 ### Logout Checks
 
@@ -307,16 +323,21 @@ non-refreshing lifecycle checks, and post-logout anonymous discovery. This flow
 3. Given explicit Retry logout, when fresh CSRF can be obtained, then exactly one new logout request is sent.
 4. Given a logout-start phase in one tab, when another tab receives it, then that tab shields and aborts authenticated
    work, acknowledges quiescence, and sends no authenticated request until a terminal outcome and permitted next action.
-5. Given a pre-logout request resolves after backend logout, when its response attempts to reissue a cookie, then the
-   backend atomic contract prevents that response from restoring authentication after confirmed logout.
+5. Given a delayed ordinary or Continue working response, when it arrives after logout, then subsequent discovery
+   remains anonymous under the backend's reduced guarantee; no physical cookie-absence assertion is required.
+6. Given a delayed login, MFA-completion, or password-change response admitted before logout, when it arrives late,
+   then authentication may be restored; the frontend shields, withdraws current confirmation, and requires explicit
+   reconciliation without automatic unsafe replay or protected reveal.
 
 ### Logout Negative Tests
 
 - Fail logout at every transport phase and assert neither a success announcement nor the normal login screen appears.
 - Press Back, Forward, and Reload from both logout outcomes and assert protected content does not reappear.
 - Verify screen-reader focus enters the privacy-screen heading and that Retry and close-browser guidance are reachable.
-- Delay an authenticated response in each tab across logout and assert no response can restore authentication or content
-  after confirmation; run the same case with one tab suspended and unable to acknowledge.
+- Delay ordinary, Continue working, login, MFA-completion, and password-change responses separately across logout.
+  Assert the distinct outcomes above, known-transition quiescence, independent tab checks, and no stale UI reveal.
+  Include a suspended tab unable to acknowledge and a terminated context; prove achievable shielding/recovery on return,
+  not universal revocation. Preserve unrelated-device authentication. Backend cookie-pair simulation alone is insufficient.
 
 ## Cross-Tab Security Epoch
 
diff --git a/_bmad-output/planning-artifacts/ux-designs/ux-mia-frontend-2026-09-12/SURFACE-STATE-MATRIX.md b/_bmad-output/planning-artifacts/ux-designs/ux-mia-frontend-2026-09-12/SURFACE-STATE-MATRIX.md
index a228ded..5b20b86 100644
--- a/_bmad-output/planning-artifacts/ux-designs/ux-mia-frontend-2026-09-12/SURFACE-STATE-MATRIX.md
+++ b/_bmad-output/planning-artifacts/ux-designs/ux-mia-frontend-2026-09-12/SURFACE-STATE-MATRIX.md
@@ -184,7 +184,7 @@ neither proves acceptance, token consumption, authentication, or session creatio
 | MFA challenge | `G,F,T,P` | TOTP/SMS; cooldown; five-failure invalid; expired | next stage or logout | `AUTH` |
 | MFA recovery code | `G,F,T` | unused; consumed; invalid; challenge expired | next stage or logout | `AUTH` |
 | Required password replacement | `G,F,T` | required; policy error; complete | Home or logout | `AUTH,INPUT` |
-| Restricted logout | `G,T,P` | submitting; confirmed; unconfirmed failure | Login/privacy screen | `AUTH` |
+| Restricted logout | `G,T,P` | quiescing; submitting; confirming; confirmed observation; unconfirmed; late-transition reconciliation needed | Login/privacy screen; explicit reconciliation per security companion | `AUTH` |
 
 ### Home
 
diff --git a/_bmad-output/specs/spec-mia-frontend/SPEC.md b/_bmad-output/specs/spec-mia-frontend/SPEC.md
index 4a53b3a..8fe316f 100644
--- a/_bmad-output/specs/spec-mia-frontend/SPEC.md
+++ b/_bmad-output/specs/spec-mia-frontend/SPEC.md
@@ -92,6 +92,10 @@ confirms it. The planning package is complete; this spec binds it to the archite
   non-negotiable; lifecycle events never act as keepalive.
 - No browser persistence of protected content or secrets; no analytics, telemetry, remote fonts, or remote scripts;
   light theme only; model output is untrusted text rendered solely through the locked boundary.
+- Logout follows the 2026-09-27 owner decision in `FRONTEND-PRD-FOUNDATION.md` and the security companion's
+  §Logout and Privacy Screen: the backend's reduced stateless guarantee is accepted, including possible restoration by
+  delayed authentication transitions. Local shielding is not cookie revocation; confirmation and explicit reconciliation
+  follow those companions. BCG-001 remains open for its remaining obligations.
 - Release-blocking gates: full WCAG 2.2 AA matrix, 320 px reflow and 400 % zoom in all three text modes, performance
   budgets `FFR-951..956` on the constrained profile, keyboard-only authentication, manual Safari evidence.
 - The stack is fixed by `.agents/rules/techstack.md`; the architecture is fixed by `ARCHITECTURE-SPINE.md`
diff --git a/_bmad-output/specs/spec-mia-frontend/stories/1-2-localized-anonymous-entry.md b/_bmad-output/specs/spec-mia-frontend/stories/1-2-localized-anonymous-entry.md
new file mode 100644
index 0000000..60b4c79
--- /dev/null
+++ b/_bmad-output/specs/spec-mia-frontend/stories/1-2-localized-anonymous-entry.md
@@ -0,0 +1,225 @@
+---
+title: 'Localized anonymous entry'
+type: 'feature'
+created: '2026-09-19'
+status: 'done'
+baseline_revision: '5679af564b825e797c2f57724e4713330210efad'
+review_loop_iteration: 0
+followup_review_recommended: true
+context:
+  - AGENTS.md
+  - _bmad-output/specs/spec-mia-frontend/SPEC.md
+warnings:
+  - oversized
+deferred:
+  - summary: >-
+      Add automated 200% and 1280-pixel-window-at-400% browser zoom coverage for the anonymous entry in every text mode.
+    evidence: |-
+      The binding accessibility matrix requires both zoom configurations, but the current Playwright substrate has only direct 320 CSS-pixel coverage and no browser-zoom harness.
+    location: >-
+      e2e/scaffold.spec.ts
+    severity: medium
+---
+
+<intent-contract>
+
+## Intent
+
+**Problem:** Anonymous MIA currently renders an English-only scaffold, so a visitor on a shared device cannot establish
+their interface language or accessible text size before authentication.
+
+**Approach:** Replace the scaffold with the localized anonymous entry surface and add the architecture-owned locale,
+announcement, and device-preference boundaries. Negotiate one of the seven launch locales before first render, provide
+visible language and text-size controls, and persist only these non-protected device preferences.
+
+## Boundaries & Constraints
+
+**Always:** Use FormatJS/react-intl with explicit stable message IDs and complete catalogs for `en-US`, `de-DE`, `fr-FR`,
+`pt-PT`, `pt-BR`, `es-ES`, and `es-AR`. Apply exact `lang` and explicit `dir="ltr"` before localized content renders.
+Use exact-match and documented language fallback negotiation, with a valid stored anonymous preference taking priority on
+later visits. Locale changes update all frontend copy, title, and document language in one render, announce once through
+`platform/announcer`, and retain focus. Text size uses Tailwind's inherited root scale for Standard, Large, and Extra
+large and persists through `platform/prefs` only. Bind each rendered control/surface to its exact licensed Tailwind Plus
+v4 React light blueprint and preserve the public content-free build identifier.
+
+**Never:** Add sign-in fields, session discovery, protected routing, backend traffic, public registration, dark mode,
+remote assets, telemetry, protected persistence, custom theme values, or a guessed auth stage. Never translate backend,
+authored, material, or tutor text; this story contains only frontend-owned anonymous copy.
+
+## I/O & Edge-Case Matrix
+
+| Scenario | Input / State | Expected Output / Behavior | Error Handling |
+| --- | --- | --- | --- |
+| Exact locale | Browser or valid stored `pt-BR` | Use `pt-BR` and set exact document language | No error expected |
+| Regional fallback | `pt-AO`, `es-MX`, `de-AT`, `fr-CA`, or another English variant | Resolve to `pt-PT`, `es-ES`, `de-DE`, `fr-FR`, or `en-US` | No error expected |
+| Unsupported locale | Unsupported or malformed language list | Resolve safely to `en-US` | Ignore invalid entries |
+| Stored preference unavailable | Storage read or write throws | Keep the negotiated/current in-memory preference | Do not block or expose diagnostics |
+| Locale selection | Visitor chooses another launch locale | Copy, title, and `lang` update together; focus stays on selector; one localized announcement | Invalid values are ignored |
+| Text-size selection | Visitor chooses Standard, Large, or Extra large | Root scale, controls, and spacing reflow; current value remains exposed and persists | Invalid stored values fall back to Standard |
+
+</intent-contract>
+
+## Code Map
+
+- `src/main.tsx` and `index.html` -- synchronous pre-render preference application and exact default document metadata.
+- `src/platform/i18n/` -- replace the ownership note with locale types, negotiation/fallback, catalogs, provider, and the
+  single atomic locale-switch entry point required by AD-9.
+- `src/platform/prefs/` -- replace the ownership note with validated, exception-safe storage of only anonymous locale and
+  text size, plus root text-size application.
+- `src/platform/announcer/` -- replace the ownership note with the sole mounted polite live region used by locale change.
+- `src/app/App.tsx` -- replace the empty-state scaffold with the anonymous entry composed from Tailwind Plus “Simple
+  card”, “Simple native” select, and “Simple inline list” radio blueprints (library `2026-09-13-083323`).
+- `src/app/app.css` -- retain Tailwind CSS-first and print ownership; no custom palette or breakpoint.
+- `package.json`, `scripts/check-i18n-catalogs.mjs`, `run-all-tests.sh` -- make catalog completeness and ICU compilation a
+  required gate without adding runtime dependencies.
+- `src/**/*.test.ts(x)` and `e2e/scaffold.spec.ts` -- replace scaffold assertions with negotiation, persistence, atomic
+  switching, focus, semantics, 320-pixel reflow, and all-locale/all-size coverage.
+- `_bmad-output/implementation-artifacts/sprint-status.yaml` -- supervisor bookkeeping; preserve and never stage/revert.
+
+## Tasks & Acceptance
+
+**Execution:**
+- [x] `src/platform/prefs/` and `src/platform/i18n/` -- implement validated preference ownership, negotiation, seven
+  complete catalogs, and the atomic locale entry point so no feature duplicates policy.
+- [x] `src/platform/announcer/`, `src/main.tsx`, and `index.html` -- apply language and text scale before render and emit
+  exactly one post-change polite announcement from the fenced owner.
+- [x] `src/app/App.tsx` -- build the accessible localized anonymous entry from the three recorded blueprints with one
+  main landmark, one h1, skip link, persistent labels/current values, retained focus, and public build ID.
+- [x] `scripts/check-i18n-catalogs.mjs`, `package.json`, and `run-all-tests.sh` -- fail on missing, extra, empty, or invalid
+  ICU messages in any launch catalog.
+- [x] `src/**/*.test.ts(x)` and `e2e/scaffold.spec.ts` -- cover every I/O row plus keyboard focus, document metadata,
+  reload persistence, translated controls, direct 320 CSS pixels, and each text mode.
+
+**Acceptance Criteria:**
+- [x] Given browser language preferences with no valid stored locale, when anonymous entry mounts, then the documented
+  exact and regional fallback rules select one launch locale and exact `<html lang>`/`dir="ltr"` exist before copy.
+- [x] Given the visible language selector, when a visitor changes locale, then all frontend-owned copy and title change
+  atomically, selector focus remains, and the announcer emits one target-locale message after document language changes.
+- [x] Given any of the three visible text-size choices, when selected, then the Tailwind root scale updates type,
+  controls, and spacing together, exposes the current value, survives reload through `platform/prefs`, and does not
+  create page-level horizontal scrolling at 320 CSS pixels.
+- [x] Given all seven launch catalogs, when the localization gate runs, then missing, extra, empty, and invalid ICU
+  messages fail; every catalog renders the anonymous entry at Standard, Large, and Extra large.
+- [x] Given storage is unavailable or contains invalid values, when entry loads or a preference changes, then MIA stays
+  operable with safe in-memory/default values and makes no network request or protected-data write.
+
+## Spec Change Log
+
+## Review Triage Log
+
+### 2026-09-19 — Review pass
+
+- verdicts: 26 findings — high 0, medium 14, low 6, false 6, maybe-false 0
+- findings:
+  - `[false]` `[reject]` Document language changes before React commits the selected catalog — both mutations complete
+    synchronously in the same user-event task before paint, while the required ordering keeps `lang` ahead of the
+    localized announcement.
+  - `[false]` `[reject]` Announcement arbitration is outside `platform/announcer` — the sole live region is exported by
+    that fenced owner; no competing announcement producer exists in this story.
+  - `[false]` `[reject]` Bootstrap can bypass catalog switching through `applyDocumentLocale` — bootstrap resolves the
+    same locale passed to `MiaIntlProvider`, and the shared helper is the single platform-owned document mutation path.
+  - `[low]` `[reject]` Future message declarations outside the registry could evade extraction — current declarations
+    have one explicit registry, and a broader source scanner would add complexity for a hypothetical convention breach.
+  - `[medium]` `[patch]` Catalog validation did not preserve ICU argument parity — the gate now parses source and target
+    messages and rejects renamed or missing arguments.
+  - `[medium]` `[patch]` Supported regional tags with BCP 47 extensions fell to the wrong regional default — negotiation
+    now checks the canonical base name before language fallback and has regression coverage.
+  - `[medium]` `[patch]` Reflow coverage checked only page overflow — the locale/size matrix now also verifies translated
+    headings and visible controls for every combination.
+  - `[medium]` `[defer]` The anonymous flow lacks 200% and 400% browser-zoom evidence — recorded one deferred item because
+    the existing Playwright substrate has no browser-zoom harness.
+  - `[medium]` `[patch]` Persisted text size was not exercised across reload — Playwright now reloads Extra large and
+    verifies both the selected radio and root class.
+  - `[medium]` `[patch]` The no-backend-request boundary had no browser assertion — the primary anonymous flow now records
+    and rejects every `/api` request through load, changes, and reload.
+  - `[medium]` `[patch]` Storage failure was covered only at helper level — an integrated component test now negotiates,
+    renders, changes locale, and changes text size while storage throws.
+  - `[low]` `[patch]` Live-region semantics were not asserted — the locale test now verifies the sole region remains
+    polite and atomic; the implementation emits one keyed message from one state update.
+  - `[low]` `[patch]` Argentine Spanish used informal voseo despite the formal voice contract — the two affected strings
+    now use consistent formal phrasing.
+  - `[false]` `[reject]` The in-review story had unchecked tasks and expected-only verification text — finalization now
+    records completed tasks and actual outcomes; this was workflow state rather than an implementation defect.
+  - `[medium]` `[patch]` Two locale requests before a commit could compare against a stale render — a synchronous active
+    locale ref now guards and records each request before scheduling state.
+  - `[medium]` `[patch]` Regional BCP 47 extensions could lose Brazilian or Argentine selection — resolved by the shared
+    base-name negotiation patch above.
+  - `[false]` `[reject]` `Intl.DisplayNames` could be absent — every release-one supported evergreen desktop browser
+    provides the required API, so the cited failure state is outside the supported runtime.
+  - `[low]` `[patch]` Zero extracted IDs could let an empty catalog set pass — the catalog gate now fails explicitly when
+    extraction returns no frontend messages.
+  - `[false]` `[reject]` `storeLocale` accepts arbitrary runtime strings — its only caller passes the closed `Locale`
+    union after validation, and stored reads are validated again before use.
+  - `[medium]` `[patch]` Runtime catalog and reload coverage was incomplete — translated headings now run for all seven
+    locales and text-size persistence is asserted across reload.
+  - `[medium]` `[patch]` Browser negotiation was not verified at the application entry point — Playwright now starts with
+    `pt-BR` browser locale and verifies initial metadata, title, and copy.
+  - `[medium]` `[patch]` Persisted text size could regress at bootstrap without failing tests — covered by the reload
+    assertion described above.
+  - `[medium]` `[patch]` Catalog-to-locale bindings could display the wrong language unnoticed — every locale now asserts
+    representative translated runtime copy.
+  - `[medium]` `[patch]` Live-region accessibility attributes could regress unnoticed — the component test now locates
+    the emitting region and asserts `polite` and `atomic` semantics.
+  - `[low]` `[reject]` The catalog gate itself lacks mutation-style negative fixtures — its direct missing, extra, empty,
+    ICU compilation, and argument checks run in the authoritative gate; a configurable fixture harness is disproportionate.
+  - `[low]` `[patch]` Standard text-size mapping was not asserted — the component test now returns from a larger mode and
+    verifies `text-base` with both larger classes removed.
+
+## Design Notes
+
+Text-size classes use inherited Tailwind defaults (`text-base`, `text-lg`, `text-xl`) on the root, avoiding an invented
+scale. Story 1.3 owns actual credentials and auth-stage transport; this story intentionally provides only the localized
+entry frame and global anonymous preferences, which remain independently buildable while `BCG-001` is open.
+
+## Verification
+
+**Commands:**
+- `npm run typecheck` -- expected: strict locale, message, and preference types compile without suppression.
+- `npm run lint` -- expected: architecture fences confirm storage and live-region ownership.
+- `npm test` -- expected: negotiation, storage failure, switching, catalog, and component behavior pass.
+- `npm run build` -- expected: localization catalogs and Tailwind classes build within the bundle budget.
+- `npm run test:e2e` -- expected: bundled Chromium passes the anonymous localization/text-size flow and 320px checks.
+- `./run-all-tests.sh` -- expected: the authoritative gate, including catalog completeness, passes with skips reported.
+
+## Auto Run Result
+
+### Summary
+
+Replaced the English-only scaffold with a seven-locale anonymous entry. Locale and root text-size preferences are
+validated and applied before React mounts, visible controls update and persist them without backend traffic, locale
+changes retain focus and emit one localized polite announcement, and the catalog gate enforces complete compilable ICU
+messages with matching arguments.
+
+### Files changed
+
+- `src/app/` and `src/main.tsx` — localized anonymous entry, pre-render preference bootstrap, and component coverage.
+- `src/platform/i18n/` — launch-locale policy, FormatJS provider/catalogs, document metadata, and negotiation tests.
+- `src/platform/prefs/` and `src/platform/announcer/` — safe device preference and sole live-region boundaries.
+- `scripts/check-i18n-catalogs.mjs`, `package*.json`, and `run-all-tests.sh` — catalog validation and authoritative-gate wiring.
+- `e2e/scaffold.spec.ts` — browser negotiation, focus, persistence, network-boundary, translation, and 320-pixel coverage.
+- `index.html` and `tsconfig.app.json` — neutral bootstrap metadata and typed JSON catalog support.
+
+### Review findings
+
+The review reported 26 findings. Nine medium and four low root-cause entries were patched, one medium browser-zoom
+coverage item was deferred, and six false plus two low findings were rejected for the reasons in the triage log.
+
+### Follow-up review recommendation
+
+True. Patched entry counts were high 0, medium 9, and low 4. A follow-up should re-check locale negotiation, browser
+bootstrap/persistence, catalog argument validation, and the expanded runtime locale matrix.
+
+### Verification performed
+
+- `npm run typecheck` — passed.
+- `npm run lint` — passed with architecture checks.
+- `npm test` — passed, 30 tests.
+- `npm run build` — passed.
+- `npm run test:e2e` — passed, 3 bundled-Chromium tests.
+- `npm run check:i18n` — passed for 7 complete ICU catalogs.
+- `./run-all-tests.sh` — passed after review patches, including formatting, duplication, audit, Trivy, catalog, and E2E gates.
+
+### Residual risks
+
+Automated 200% and 400% browser-zoom coverage remains deferred until the browser test substrate can authoritatively
+exercise browser zoom rather than CSS scaling. A follow-up review is recommended because nine medium entries changed.
diff --git a/e2e/scaffold.spec.ts b/e2e/scaffold.spec.ts
index a7a836e..68dd44d 100644
--- a/e2e/scaffold.spec.ts
+++ b/e2e/scaffold.spec.ts
@@ -1,25 +1,108 @@
 import { expect, test } from "@playwright/test";
 
-test("renders the public scaffold and build identifier", async ({ page }) => {
+const locales = [
+  "en-US",
+  "de-DE",
+  "fr-FR",
+  "pt-PT",
+  "pt-BR",
+  "es-ES",
+  "es-AR",
+] as const;
+const textSizes = ["standard", "large", "extra-large"] as const;
+const headings = {
+  "en-US": "Sign in to MIA",
+  "de-DE": "Bei MIA anmelden",
+  "fr-FR": "Se connecter à MIA",
+  "pt-PT": "Iniciar sessão no MIA",
+  "pt-BR": "Entrar no MIA",
+  "es-ES": "Iniciar sesión en MIA",
+  "es-AR": "Iniciar sesión en MIA",
+} satisfies Record<(typeof locales)[number], string>;
+
+test.describe("browser locale negotiation", () => {
+  test.use({ locale: "pt-BR" });
+
+  test("applies a supported browser locale before anonymous entry renders", async ({
+    page,
+  }) => {
+    await page.goto("/");
+    await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
+    await expect(page).toHaveTitle("Entrar | MIA");
+    await expect(
+      page.getByRole("heading", { level: 1, name: headings["pt-BR"] }),
+    ).toBeVisible();
+  });
+});
+
+test("renders localized anonymous entry and preserves keyboard focus", async ({
+  page,
+}) => {
+  const apiRequests: string[] = [];
+  page.on("request", (request) => {
+    if (new URL(request.url()).pathname.startsWith("/api")) {
+      apiRequests.push(request.url());
+    }
+  });
   await page.goto("/");
 
-  await expect(page).toHaveTitle("MIA scaffold | MIA");
+  await expect(page).toHaveTitle("Sign in | MIA");
   await expect(
-    page.getByRole("heading", { level: 1, name: "MIA scaffold" }),
+    page.getByRole("heading", { level: 1, name: "Sign in to MIA" }),
   ).toBeVisible();
   await expect(page.getByTestId("build-identifier")).toHaveText(
     /Build \d+\.\d+\.\d+\+/,
   );
-});
-
-test("moves focus to main content from the skip link", async ({ page }) => {
-  await page.goto("/");
 
   await page.keyboard.press("Tab");
   await expect(
     page.getByRole("link", { name: "Skip to main content" }),
   ).toBeFocused();
-
   await page.keyboard.press("Enter");
   await expect(page.locator("#main-content")).toBeFocused();
+
+  const selector = page.locator("#interface-language");
+  await selector.focus();
+  await selector.selectOption("de-DE");
+  await expect(selector).toBeFocused();
+  await expect(page.locator("html")).toHaveAttribute("lang", "de-DE");
+  await expect(page).toHaveTitle("Anmelden | MIA");
+
+  await page.locator("#text-size-extra-large").check();
+  await expect(page.locator("#text-size-extra-large")).toBeFocused();
+  await expect(page.locator("html")).toHaveClass(/text-xl/);
+
+  await page.reload();
+  await expect(page.locator("html")).toHaveAttribute("lang", "de-DE");
+  await expect(page.locator("#interface-language")).toHaveValue("de-DE");
+  await expect(page.locator("#text-size-extra-large")).toBeChecked();
+  await expect(page.locator("html")).toHaveClass(/text-xl/);
+  expect(apiRequests).toEqual([]);
+});
+
+test("all locales and text sizes reflow at 320 CSS pixels", async ({
+  page,
+}) => {
+  await page.setViewportSize({ width: 320, height: 900 });
+  await page.goto("/");
+
+  for (const locale of locales) {
+    await page.locator("#interface-language").selectOption(locale);
+    await expect(page.locator("html")).toHaveAttribute("lang", locale);
+    await expect(
+      page.getByRole("heading", { level: 1, name: headings[locale] }),
+    ).toBeVisible();
+
+    for (const textSize of textSizes) {
+      await page.locator(`#text-size-${textSize}`).check();
+      const hasPageOverflow = await page.evaluate(
+        () =>
+          document.documentElement.scrollWidth >
+          document.documentElement.clientWidth,
+      );
+      expect(hasPageOverflow).toBe(false);
+      await expect(page.locator("#interface-language")).toBeVisible();
+      await expect(page.locator(`#text-size-${textSize}`)).toBeVisible();
+    }
+  }
 });
diff --git a/index.html b/index.html
index a2fba68..dd5b7c7 100644
--- a/index.html
+++ b/index.html
@@ -1,5 +1,5 @@
 <!doctype html>
-<html lang="en">
+<html lang="en-US" dir="ltr" class="text-base">
   <head>
     <meta charset="UTF-8" />
     <meta name="viewport" content="width=device-width, initial-scale=1.0" />
@@ -7,7 +7,7 @@
       http-equiv="Content-Security-Policy"
       content="default-src 'self'; script-src 'self'; style-src 'self'; style-src-attr 'unsafe-inline'; font-src 'self'; img-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'"
     />
-    <title>MIA scaffold | MIA</title>
+    <title>Sign in | MIA</title>
   </head>
   <body>
     <div id="root"></div>
diff --git a/package-lock.json b/package-lock.json
index f15aefe..745af02 100644
--- a/package-lock.json
+++ b/package-lock.json
@@ -29,6 +29,7 @@
       "devDependencies": {
         "@eslint/js": "9.39.5",
         "@formatjs/cli": "6.16.29",
+        "@formatjs/icu-messageformat-parser": "3.5.19",
         "@playwright/test": "1.63.0",
         "@tailwindcss/vite": "4.3.3",
         "@testing-library/jest-dom": "7.0.1",
diff --git a/package.json b/package.json
index 47b4842..d971987 100644
--- a/package.json
+++ b/package.json
@@ -18,7 +18,8 @@
     "build": "BUILD_REVISION=$(git rev-parse HEAD) vite build",
     "test:e2e": "npm run build && playwright install chromium && playwright test",
     "check:architecture": "node scripts/check-architecture.mjs",
-    "check:bundle-size": "node scripts/check-bundle-size.mjs"
+    "check:bundle-size": "node scripts/check-bundle-size.mjs",
+    "check:i18n": "node scripts/check-i18n-catalogs.mjs"
   },
   "dependencies": {
     "@headlessui/react": "2.2.10",
@@ -42,15 +43,16 @@
   "devDependencies": {
     "@eslint/js": "9.39.5",
     "@formatjs/cli": "6.16.29",
+    "@formatjs/icu-messageformat-parser": "3.5.19",
     "@playwright/test": "1.63.0",
     "@tailwindcss/vite": "4.3.3",
     "@testing-library/jest-dom": "7.0.1",
     "@testing-library/react": "16.3.3",
     "@testing-library/user-event": "14.6.7",
-    "@vitejs/plugin-react": "6.1.1",
     "@types/node": "24.10.1",
     "@types/react": "19.3.0",
     "@types/react-dom": "19.3.0",
+    "@vitejs/plugin-react": "6.1.1",
     "eslint": "9.39.5",
     "eslint-plugin-import": "2.32.0",
     "eslint-plugin-react": "7.37.5",
diff --git a/run-all-tests.sh b/run-all-tests.sh
index e709d0d..e821a45 100755
--- a/run-all-tests.sh
+++ b/run-all-tests.sh
@@ -34,7 +34,7 @@ else
     npm ci
   fi
 
-  for target in typecheck lint format:check test build check:bundle-size; do
+  for target in typecheck lint format:check test build check:bundle-size check:i18n; do
     if has_script "$target"; then
       echo "Running npm run $target ..."
       npm run "$target"
diff --git a/scripts/check-i18n-catalogs.mjs b/scripts/check-i18n-catalogs.mjs
new file mode 100644
index 0000000..8092603
--- /dev/null
+++ b/scripts/check-i18n-catalogs.mjs
@@ -0,0 +1,115 @@
+import { execFileSync } from "node:child_process";
+import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
+import { tmpdir } from "node:os";
+import { join, resolve } from "node:path";
+import { parse } from "@formatjs/icu-messageformat-parser";
+
+const expectedLocales = [
+  "en-US",
+  "de-DE",
+  "fr-FR",
+  "pt-PT",
+  "pt-BR",
+  "es-ES",
+  "es-AR",
+];
+const catalogDirectory = resolve("src/platform/i18n/catalogs");
+const cli = resolve("node_modules/@formatjs/cli/bin/formatjs");
+const temporaryDirectory = mkdtempSync(join(tmpdir(), "mia-i18n-"));
+
+function argumentNames(message) {
+  const names = new Set();
+
+  function visit(value) {
+    if (Array.isArray(value)) {
+      value.forEach(visit);
+      return;
+    }
+    if (value === null || typeof value !== "object") {
+      return;
+    }
+
+    if (
+      typeof value.type === "number" &&
+      value.type >= 1 &&
+      value.type <= 6 &&
+      typeof value.value === "string"
+    ) {
+      names.add(value.value);
+    }
+    Object.values(value).forEach(visit);
+  }
+
+  visit(parse(message));
+  return [...names].sort();
+}
+
+try {
+  const extractedPath = join(temporaryDirectory, "extracted.json");
+  execFileSync(
+    cli,
+    ["extract", "src/platform/i18n/messages.ts", "--out-file", extractedPath],
+    { stdio: "pipe" },
+  );
+
+  const extracted = JSON.parse(readFileSync(extractedPath, "utf8"));
+  const expectedIds = Object.keys(extracted).sort();
+  if (expectedIds.length === 0) {
+    throw new Error("No frontend messages were extracted.");
+  }
+  const catalogFiles = readdirSync(catalogDirectory).sort();
+  const expectedFiles = expectedLocales
+    .map((locale) => `${locale}.json`)
+    .sort();
+
+  if (JSON.stringify(catalogFiles) !== JSON.stringify(expectedFiles)) {
+    throw new Error(
+      `Launch catalog files differ. Expected ${expectedFiles.join(", ")}; received ${catalogFiles.join(", ")}.`,
+    );
+  }
+
+  for (const locale of expectedLocales) {
+    const catalogPath = join(catalogDirectory, `${locale}.json`);
+    const catalog = JSON.parse(readFileSync(catalogPath, "utf8"));
+    const catalogIds = Object.keys(catalog).sort();
+
+    if (JSON.stringify(catalogIds) !== JSON.stringify(expectedIds)) {
+      throw new Error(
+        `${locale} does not contain exactly the extracted message IDs.`,
+      );
+    }
+    for (const id of expectedIds) {
+      if (typeof catalog[id] !== "string" || catalog[id].trim().length === 0) {
+        throw new Error(
+          `${locale} has an empty or non-string message for ${id}.`,
+        );
+      }
+      const expectedArguments = argumentNames(extracted[id].defaultMessage);
+      const catalogArguments = argumentNames(catalog[id]);
+      if (
+        JSON.stringify(catalogArguments) !== JSON.stringify(expectedArguments)
+      ) {
+        throw new Error(
+          `${locale} does not preserve the ICU arguments for ${id}.`,
+        );
+      }
+    }
+
+    execFileSync(
+      cli,
+      [
+        "compile",
+        catalogPath,
+        "--out-file",
+        join(temporaryDirectory, `${locale}.json`),
+      ],
+      { stdio: "pipe" },
+    );
+  }
+
+  process.stdout.write(
+    `Checked ${expectedLocales.length} complete ICU catalogs.\n`,
+  );
+} finally {
+  rmSync(temporaryDirectory, { force: true, recursive: true });
+}
diff --git a/src/app/App.test.tsx b/src/app/App.test.tsx
index 7953c32..52dab41 100644
--- a/src/app/App.test.tsx
+++ b/src/app/App.test.tsx
@@ -1,17 +1,117 @@
 import { render, screen } from "@testing-library/react";
-import { describe, expect, it } from "vitest";
+import userEvent from "@testing-library/user-event";
+import { afterEach, describe, expect, it, vi } from "vitest";
 import { App } from "./App";
+import { applyDocumentLocale } from "../platform/i18n/locales";
+import {
+  MiaIntlProvider,
+  resolveInitialLocale,
+} from "../platform/i18n/MiaIntlProvider";
+import {
+  applyTextSize,
+  readStoredLocale,
+  readTextSize,
+} from "../platform/prefs/preferences";
 
-describe("App", () => {
-  it("renders the public scaffold and build identifier", () => {
-    render(<App />);
+function renderEntry() {
+  applyDocumentLocale("en-US");
+  applyTextSize("standard");
+  return render(
+    <MiaIntlProvider initialLocale="en-US">
+      <App initialTextSize="standard" />
+    </MiaIntlProvider>,
+  );
+}
+
+afterEach(() => {
+  vi.restoreAllMocks();
+  document.documentElement.className = "";
+});
+
+describe("localized anonymous entry", () => {
+  it("renders the accessible entry and public build identifier", () => {
+    renderEntry();
 
     expect(
-      screen.getByRole("heading", { level: 1, name: "MIA scaffold" }),
+      screen.getByRole("heading", { level: 1, name: "Sign in to MIA" }),
     ).toBeInTheDocument();
-    expect(document.title).toBe("MIA scaffold | MIA");
+    expect(document.title).toBe("Sign in | MIA");
+    expect(document.documentElement).toHaveAttribute("lang", "en-US");
+    expect(document.documentElement).toHaveAttribute("dir", "ltr");
     expect(screen.getByTestId("build-identifier")).toHaveTextContent(
       /^Build \d+\.\d+\.\d+\+/,
     );
   });
+
+  it("changes locale atomically, announces once, and retains selector focus", async () => {
+    const user = userEvent.setup();
+    renderEntry();
+    const language = screen.getByLabelText("Language");
+
+    language.focus();
+    await user.selectOptions(language, "de-DE");
+
+    expect(language).toHaveFocus();
+    expect(document.documentElement).toHaveAttribute("lang", "de-DE");
+    expect(document.title).toBe("Anmelden | MIA");
+    expect(
+      screen.getByRole("heading", { level: 1, name: "Bei MIA anmelden" }),
+    ).toBeInTheDocument();
+    const announcement = screen.getByText(
+      "Die Oberflächensprache wurde geändert.",
+    );
+    const liveRegion = announcement.closest("[aria-live]");
+    expect(liveRegion).toHaveAttribute("aria-live", "polite");
+    expect(liveRegion).toHaveAttribute("aria-atomic", "true");
+    expect(readStoredLocale()).toBe("de-DE");
+  });
+
+  it("applies and persists each text size with an exposed current value", async () => {
+    const user = userEvent.setup();
+    renderEntry();
+
+    const extraLarge = screen.getByRole("radio", { name: "Extra large" });
+    await user.click(extraLarge);
+    expect(extraLarge).toBeChecked();
+    expect(document.documentElement).toHaveClass("text-xl");
+    expect(readTextSize()).toBe("extra-large");
+
+    const large = screen.getByRole("radio", { name: "Large" });
+    await user.click(large);
+    expect(large).toBeChecked();
+    expect(document.documentElement).toHaveClass("text-lg");
+
+    const standard = screen.getByRole("radio", { name: "Standard" });
+    await user.click(standard);
+    expect(standard).toBeChecked();
+    expect(document.documentElement).toHaveClass("text-base");
+    expect(document.documentElement).not.toHaveClass("text-lg");
+    expect(document.documentElement).not.toHaveClass("text-xl");
+  });
+
+  it("stays operable when browser preference storage is unavailable", async () => {
+    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
+      throw new Error("storage unavailable");
+    });
+    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
+      throw new Error("storage unavailable");
+    });
+    const initialLocale = resolveInitialLocale(["fr-CA"]);
+    const user = userEvent.setup();
+
+    applyDocumentLocale(initialLocale);
+    applyTextSize("standard");
+    render(
+      <MiaIntlProvider initialLocale={initialLocale}>
+        <App initialTextSize="standard" />
+      </MiaIntlProvider>,
+    );
+
+    expect(
+      screen.getByRole("heading", { name: "Se connecter à MIA" }),
+    ).toBeInTheDocument();
+    await user.selectOptions(screen.getByLabelText("Langue"), "de-DE");
+    await user.click(screen.getByRole("radio", { name: "Sehr groß" }));
+    expect(document.documentElement).toHaveClass("text-xl");
+  });
 });
diff --git a/src/app/App.tsx b/src/app/App.tsx
index 5ed4482..7d82310 100644
--- a/src/app/App.tsx
+++ b/src/app/App.tsx
@@ -1,56 +1,150 @@
-// Tailwind Plus: Application UI > Feedback > Empty States > Simple
-// Library version: 2026-09-13-083323. The product-action button is removed because this is a public scaffold only.
-export function App() {
+import { ChevronDownIcon } from "@heroicons/react/16/solid";
+import { useState } from "react";
+import { useIntl } from "react-intl";
+import { isLocale, localeDisplayName, locales } from "../platform/i18n/locales";
+import { messages } from "../platform/i18n/messages";
+import { useMiaI18n } from "../platform/i18n/MiaIntlProvider";
+import {
+  setTextSize,
+  textSizes,
+  type TextSize,
+} from "../platform/prefs/preferences";
+
+const textSizeMessage = {
+  standard: messages.textSizeStandard,
+  large: messages.textSizeLarge,
+  "extra-large": messages.textSizeExtraLarge,
+} satisfies Record<TextSize, (typeof messages)[keyof typeof messages]>;
+
+type AppProps = {
+  initialTextSize: TextSize;
+};
+
+// Tailwind Plus: Application UI > Forms > Sign-in and Registration > Simple card
+// Library version: 2026-09-13-083323. MIA removes remote branding and credentials, which Story 1.3 owns.
+export function App({ initialTextSize }: AppProps) {
+  const intl = useIntl();
+  const { locale, changeLocale } = useMiaI18n();
+  const [textSize, setCurrentTextSize] = useState(initialTextSize);
+
+  function changeTextSize(nextTextSize: TextSize): void {
+    setTextSize(nextTextSize);
+    setCurrentTextSize(nextTextSize);
+  }
+
   return (
     <>
-      <title>MIA scaffold | MIA</title>
+      <title>{intl.formatMessage(messages.pageTitle)}</title>
       <a
-        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-10 focus:rounded-md focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-gray-900 focus:shadow-xs"
+        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-10 focus:rounded-md focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-gray-900 focus:shadow-xs focus:outline-2 focus:outline-offset-2 focus:outline-indigo-600"
         href="#main-content"
       >
-        Skip to main content
+        {intl.formatMessage(messages.skipLink)}
       </a>
-      <main
-        id="main-content"
-        className="mx-auto flex min-h-screen max-w-3xl items-center px-6 py-12"
-        tabIndex={-1}
-      >
-        <section
-          className="w-full text-center"
-          aria-labelledby="scaffold-title"
-        >
-          <svg
-            fill="none"
-            stroke="currentColor"
-            viewBox="0 0 24 24"
-            aria-hidden="true"
-            className="mx-auto size-12 text-gray-400"
-          >
-            <path
-              d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
-              strokeWidth={2}
-              vectorEffect="non-scaling-stroke"
-              strokeLinecap="round"
-              strokeLinejoin="round"
-            />
-          </svg>
-          <h1
-            id="scaffold-title"
-            className="mt-2 text-sm font-semibold text-gray-900"
-            tabIndex={-1}
-          >
-            MIA scaffold
-          </h1>
-          <p className="mt-1 text-sm text-gray-500">
-            The application shell is being prepared.
-          </p>
-          <p
-            className="mt-6 text-sm text-gray-500"
-            data-testid="build-identifier"
-          >
-            Build {__MIA_BUILD_ID__}
-          </p>
-        </section>
+      <main id="main-content" className="min-h-screen bg-gray-50" tabIndex={-1}>
+        <div className="flex min-h-screen flex-col justify-center px-4 py-12 sm:px-6 lg:px-8">
+          <div className="sm:mx-auto sm:w-full sm:max-w-md">
+            <h1
+              className="text-center text-2xl/9 font-bold tracking-tight text-gray-900"
+              tabIndex={-1}
+            >
+              {intl.formatMessage(messages.heading)}
+            </h1>
+            <p className="mt-3 text-center text-sm/6 text-gray-600">
+              {intl.formatMessage(messages.introduction)}
+            </p>
+          </div>
+
+          <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-[480px]">
+            <div className="bg-white px-6 py-12 shadow-sm sm:rounded-lg sm:px-12">
+              <div className="space-y-8">
+                <div>
+                  {/* Tailwind Plus: Application UI > Forms > Select Menus > Simple native */}
+                  {/* Library version: 2026-09-13-083323. Options are the seven launch locales. */}
+                  <label
+                    htmlFor="interface-language"
+                    className="block text-sm/6 font-medium text-gray-900"
+                  >
+                    {intl.formatMessage(messages.languageLabel)}
+                  </label>
+                  <div className="mt-2 grid grid-cols-1">
+                    <select
+                      id="interface-language"
+                      name="interface-language"
+                      value={locale}
+                      onChange={(event) => {
+                        if (isLocale(event.target.value)) {
+                          changeLocale(event.target.value);
+                        }
+                      }}
+                      className="col-start-1 row-start-1 w-full appearance-none rounded-md bg-white py-1.5 pr-8 pl-3 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-indigo-600 sm:text-sm/6"
+                    >
+                      {locales.map((availableLocale) => (
+                        <option key={availableLocale} value={availableLocale}>
+                          {localeDisplayName(availableLocale, locale)}
+                        </option>
+                      ))}
+                    </select>
+                    <ChevronDownIcon
+                      aria-hidden="true"
+                      className="pointer-events-none col-start-1 row-start-1 mr-2 size-5 self-center justify-self-end text-gray-500 sm:size-4"
+                    />
+                  </div>
+                </div>
+
+                {/* Tailwind Plus: Application UI > Forms > Radio Groups > Simple inline list */}
+                {/* Library version: 2026-09-13-083323. Values apply MIA's three root text modes. */}
+                <fieldset>
+                  <legend className="text-sm/6 font-semibold text-gray-900">
+                    {intl.formatMessage(messages.textSizeLegend)}
+                  </legend>
+                  <p
+                    id="text-size-help"
+                    className="mt-1 text-sm/6 text-gray-600"
+                  >
+                    {intl.formatMessage(messages.textSizeHelp)}
+                  </p>
+                  <div className="mt-6 space-y-4 sm:flex sm:items-center sm:space-y-0 sm:space-x-8">
+                    {textSizes.map((availableTextSize) => (
+                      <div
+                        key={availableTextSize}
+                        className="flex items-center"
+                      >
+                        <input
+                          checked={textSize === availableTextSize}
+                          id={`text-size-${availableTextSize}`}
+                          name="text-size"
+                          type="radio"
+                          value={availableTextSize}
+                          aria-describedby="text-size-help"
+                          onChange={() => changeTextSize(availableTextSize)}
+                          className="relative size-4 appearance-none rounded-full border border-gray-300 bg-white before:absolute before:inset-1 before:rounded-full before:bg-white not-checked:before:hidden checked:border-indigo-600 checked:bg-indigo-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 forced-colors:appearance-auto forced-colors:before:hidden"
+                        />
+                        <label
+                          htmlFor={`text-size-${availableTextSize}`}
+                          className="ml-3 block text-sm/6 font-medium text-gray-900"
+                        >
+                          {intl.formatMessage(
+                            textSizeMessage[availableTextSize],
+                          )}
+                        </label>
+                      </div>
+                    ))}
+                  </div>
+                </fieldset>
+              </div>
+            </div>
+
+            <p
+              className="mt-8 break-all text-center text-sm/6 text-gray-500"
+              data-testid="build-identifier"
+            >
+              {intl.formatMessage(messages.buildIdentifier, {
+                buildId: __MIA_BUILD_ID__,
+              })}
+            </p>
+          </div>
+        </div>
       </main>
     </>
   );
diff --git a/src/main.tsx b/src/main.tsx
index 602fb92..9e08fe3 100644
--- a/src/main.tsx
+++ b/src/main.tsx
@@ -2,6 +2,16 @@ import { StrictMode } from "react";
 import { createRoot } from "react-dom/client";
 import { App } from "./app/App";
 import "./app/app.css";
+import { applyDocumentLocale, type Locale } from "./platform/i18n/locales";
+import {
+  MiaIntlProvider,
+  resolveInitialLocale,
+} from "./platform/i18n/MiaIntlProvider";
+import {
+  applyTextSize,
+  readTextSize,
+  type TextSize,
+} from "./platform/prefs/preferences";
 
 const rootElement = document.getElementById("root");
 
@@ -9,8 +19,15 @@ if (rootElement === null) {
   throw new Error("MIA could not find its application root.");
 }
 
+const initialLocale: Locale = resolveInitialLocale(navigator.languages);
+const initialTextSize: TextSize = readTextSize();
+applyDocumentLocale(initialLocale);
+applyTextSize(initialTextSize);
+
 createRoot(rootElement).render(
   <StrictMode>
-    <App />
+    <MiaIntlProvider initialLocale={initialLocale}>
+      <App initialTextSize={initialTextSize} />
+    </MiaIntlProvider>
   </StrictMode>,
 );
diff --git a/src/platform/announcer/AnnouncementRegion.tsx b/src/platform/announcer/AnnouncementRegion.tsx
new file mode 100644
index 0000000..025d609
--- /dev/null
+++ b/src/platform/announcer/AnnouncementRegion.tsx
@@ -0,0 +1,13 @@
+type AnnouncementRegionProps = {
+  announcement: { readonly sequence: number; readonly message: string } | null;
+};
+
+export function AnnouncementRegion({ announcement }: AnnouncementRegionProps) {
+  return (
+    <div aria-live="polite" aria-atomic="true" className="sr-only">
+      {announcement === null ? null : (
+        <span key={announcement.sequence}>{announcement.message}</span>
+      )}
+    </div>
+  );
+}
diff --git a/src/platform/announcer/README.md b/src/platform/announcer/README.md
deleted file mode 100644
index bd66e52..0000000
--- a/src/platform/announcer/README.md
+++ /dev/null
@@ -1,3 +0,0 @@
-# Announcement Ownership
-
-The sole aria-live owner and announcement arbitration API belong here.
diff --git a/src/platform/i18n/MiaIntlProvider.tsx b/src/platform/i18n/MiaIntlProvider.tsx
new file mode 100644
index 0000000..ba36ac7
--- /dev/null
+++ b/src/platform/i18n/MiaIntlProvider.tsx
@@ -0,0 +1,82 @@
+import { createContext, use, useRef, useState, type ReactNode } from "react";
+import { IntlProvider } from "react-intl";
+import { AnnouncementRegion } from "../announcer/AnnouncementRegion";
+import { readStoredLocale, storeLocale } from "../prefs/preferences";
+import {
+  applyDocumentLocale,
+  catalogs,
+  isLocale,
+  negotiateLocale,
+  type Locale,
+} from "./locales";
+
+type I18nContextValue = {
+  locale: Locale;
+  changeLocale: (locale: Locale) => void;
+};
+
+type LocaleSnapshot = {
+  locale: Locale;
+  announcement: { readonly sequence: number; readonly message: string } | null;
+};
+
+const I18nContext = createContext<I18nContextValue | null>(null);
+
+export function resolveInitialLocale(
+  browserLanguages: readonly string[],
+): Locale {
+  const storedLocale = readStoredLocale();
+  return storedLocale !== null && isLocale(storedLocale)
+    ? storedLocale
+    : negotiateLocale(browserLanguages);
+}
+
+type MiaIntlProviderProps = {
+  initialLocale: Locale;
+  children: ReactNode;
+};
+
+export function MiaIntlProvider({
+  initialLocale,
+  children,
+}: MiaIntlProviderProps) {
+  const [state, setState] = useState<LocaleSnapshot>({
+    locale: initialLocale,
+    announcement: null,
+  });
+  const activeLocale = useRef(initialLocale);
+
+  function changeLocale(locale: Locale): void {
+    if (locale === activeLocale.current) {
+      return;
+    }
+
+    activeLocale.current = locale;
+    applyDocumentLocale(locale);
+    storeLocale(locale);
+    setState((current) => ({
+      locale,
+      announcement: {
+        sequence: (current.announcement?.sequence ?? 0) + 1,
+        message: catalogs[locale]["entry.language.changed"],
+      },
+    }));
+  }
+
+  return (
+    <I18nContext value={{ locale: state.locale, changeLocale }}>
+      <IntlProvider locale={state.locale} messages={catalogs[state.locale]}>
+        {children}
+        <AnnouncementRegion announcement={state.announcement} />
+      </IntlProvider>
+    </I18nContext>
+  );
+}
+
+export function useMiaI18n(): I18nContextValue {
+  const context = use(I18nContext);
+  if (context === null) {
+    throw new Error("MIA localization must be used within MiaIntlProvider.");
+  }
+  return context;
+}
diff --git a/src/platform/i18n/README.md b/src/platform/i18n/README.md
deleted file mode 100644
index eb42d09..0000000
--- a/src/platform/i18n/README.md
+++ /dev/null
@@ -1,3 +0,0 @@
-# Localization Ownership
-
-The provider, catalogs, and locale-switch entry point belong here.
diff --git a/src/platform/i18n/catalogs/de-DE.json b/src/platform/i18n/catalogs/de-DE.json
new file mode 100644
index 0000000..828d82f
--- /dev/null
+++ b/src/platform/i18n/catalogs/de-DE.json
@@ -0,0 +1,14 @@
+{
+  "entry.buildIdentifier": "Build {buildId}",
+  "entry.heading": "Bei MIA anmelden",
+  "entry.introduction": "Wählen Sie vor der Anmeldung Ihre Sprache und Textgröße.",
+  "entry.language.changed": "Die Oberflächensprache wurde geändert.",
+  "entry.language.label": "Sprache",
+  "entry.pageTitle": "Anmelden | MIA",
+  "entry.skipLink": "Zum Hauptinhalt springen",
+  "entry.textSize.extraLarge": "Sehr groß",
+  "entry.textSize.help": "Wählen Sie die Größe, die für Sie am besten lesbar ist.",
+  "entry.textSize.large": "Groß",
+  "entry.textSize.legend": "Textgröße",
+  "entry.textSize.standard": "Standard"
+}
diff --git a/src/platform/i18n/catalogs/en-US.json b/src/platform/i18n/catalogs/en-US.json
new file mode 100644
index 0000000..369fb9f
--- /dev/null
+++ b/src/platform/i18n/catalogs/en-US.json
@@ -0,0 +1,14 @@
+{
+  "entry.buildIdentifier": "Build {buildId}",
+  "entry.heading": "Sign in to MIA",
+  "entry.introduction": "Choose your language and text size before signing in.",
+  "entry.language.changed": "Interface language changed.",
+  "entry.language.label": "Language",
+  "entry.pageTitle": "Sign in | MIA",
+  "entry.skipLink": "Skip to main content",
+  "entry.textSize.extraLarge": "Extra large",
+  "entry.textSize.help": "Choose the size that is easiest for you to read.",
+  "entry.textSize.large": "Large",
+  "entry.textSize.legend": "Text size",
+  "entry.textSize.standard": "Standard"
+}
diff --git a/src/platform/i18n/catalogs/es-AR.json b/src/platform/i18n/catalogs/es-AR.json
new file mode 100644
index 0000000..05e1f36
--- /dev/null
+++ b/src/platform/i18n/catalogs/es-AR.json
@@ -0,0 +1,14 @@
+{
+  "entry.buildIdentifier": "Compilación {buildId}",
+  "entry.heading": "Iniciar sesión en MIA",
+  "entry.introduction": "Elija el idioma y el tamaño del texto antes de iniciar sesión.",
+  "entry.language.changed": "Se cambió el idioma de la interfaz.",
+  "entry.language.label": "Idioma",
+  "entry.pageTitle": "Iniciar sesión | MIA",
+  "entry.skipLink": "Ir al contenido principal",
+  "entry.textSize.extraLarge": "Muy grande",
+  "entry.textSize.help": "Elija el tamaño que le resulte más fácil de leer.",
+  "entry.textSize.large": "Grande",
+  "entry.textSize.legend": "Tamaño del texto",
+  "entry.textSize.standard": "Estándar"
+}
diff --git a/src/platform/i18n/catalogs/es-ES.json b/src/platform/i18n/catalogs/es-ES.json
new file mode 100644
index 0000000..164f7c6
--- /dev/null
+++ b/src/platform/i18n/catalogs/es-ES.json
@@ -0,0 +1,14 @@
+{
+  "entry.buildIdentifier": "Compilación {buildId}",
+  "entry.heading": "Iniciar sesión en MIA",
+  "entry.introduction": "Elija el idioma y el tamaño del texto antes de iniciar sesión.",
+  "entry.language.changed": "Se ha cambiado el idioma de la interfaz.",
+  "entry.language.label": "Idioma",
+  "entry.pageTitle": "Iniciar sesión | MIA",
+  "entry.skipLink": "Saltar al contenido principal",
+  "entry.textSize.extraLarge": "Muy grande",
+  "entry.textSize.help": "Elija el tamaño que le resulte más fácil de leer.",
+  "entry.textSize.large": "Grande",
+  "entry.textSize.legend": "Tamaño del texto",
+  "entry.textSize.standard": "Estándar"
+}
diff --git a/src/platform/i18n/catalogs/fr-FR.json b/src/platform/i18n/catalogs/fr-FR.json
new file mode 100644
index 0000000..caadb92
--- /dev/null
+++ b/src/platform/i18n/catalogs/fr-FR.json
@@ -0,0 +1,14 @@
+{
+  "entry.buildIdentifier": "Version {buildId}",
+  "entry.heading": "Se connecter à MIA",
+  "entry.introduction": "Choisissez votre langue et la taille du texte avant de vous connecter.",
+  "entry.language.changed": "La langue de l’interface a été modifiée.",
+  "entry.language.label": "Langue",
+  "entry.pageTitle": "Se connecter | MIA",
+  "entry.skipLink": "Aller au contenu principal",
+  "entry.textSize.extraLarge": "Très grande",
+  "entry.textSize.help": "Choisissez la taille la plus facile à lire pour vous.",
+  "entry.textSize.large": "Grande",
+  "entry.textSize.legend": "Taille du texte",
+  "entry.textSize.standard": "Standard"
+}
diff --git a/src/platform/i18n/catalogs/pt-BR.json b/src/platform/i18n/catalogs/pt-BR.json
new file mode 100644
index 0000000..0dc891e
--- /dev/null
+++ b/src/platform/i18n/catalogs/pt-BR.json
@@ -0,0 +1,14 @@
+{
+  "entry.buildIdentifier": "Compilação {buildId}",
+  "entry.heading": "Entrar no MIA",
+  "entry.introduction": "Escolha o idioma e o tamanho do texto antes de entrar.",
+  "entry.language.changed": "O idioma da interface foi alterado.",
+  "entry.language.label": "Idioma",
+  "entry.pageTitle": "Entrar | MIA",
+  "entry.skipLink": "Pular para o conteúdo principal",
+  "entry.textSize.extraLarge": "Muito grande",
+  "entry.textSize.help": "Escolha o tamanho mais fácil para você ler.",
+  "entry.textSize.large": "Grande",
+  "entry.textSize.legend": "Tamanho do texto",
+  "entry.textSize.standard": "Padrão"
+}
diff --git a/src/platform/i18n/catalogs/pt-PT.json b/src/platform/i18n/catalogs/pt-PT.json
new file mode 100644
index 0000000..52857f3
--- /dev/null
+++ b/src/platform/i18n/catalogs/pt-PT.json
@@ -0,0 +1,14 @@
+{
+  "entry.buildIdentifier": "Compilação {buildId}",
+  "entry.heading": "Iniciar sessão no MIA",
+  "entry.introduction": "Escolha o idioma e o tamanho do texto antes de iniciar sessão.",
+  "entry.language.changed": "O idioma da interface foi alterado.",
+  "entry.language.label": "Idioma",
+  "entry.pageTitle": "Iniciar sessão | MIA",
+  "entry.skipLink": "Saltar para o conteúdo principal",
+  "entry.textSize.extraLarge": "Muito grande",
+  "entry.textSize.help": "Escolha o tamanho que lhe for mais fácil de ler.",
+  "entry.textSize.large": "Grande",
+  "entry.textSize.legend": "Tamanho do texto",
+  "entry.textSize.standard": "Padrão"
+}
diff --git a/src/platform/i18n/locales.test.ts b/src/platform/i18n/locales.test.ts
new file mode 100644
index 0000000..d172534
--- /dev/null
+++ b/src/platform/i18n/locales.test.ts
@@ -0,0 +1,21 @@
+import { describe, expect, it } from "vitest";
+import { negotiateLocale } from "./locales";
+
+describe("anonymous locale negotiation", () => {
+  it.each([
+    [["pt-BR"], "pt-BR"],
+    [["es-AR"], "es-AR"],
+    [["pt-BR-u-nu-latn"], "pt-BR"],
+    [["es-AR-x-private"], "es-AR"],
+    [["pt-AO"], "pt-PT"],
+    [["es-MX"], "es-ES"],
+    [["de-AT"], "de-DE"],
+    [["fr-CA"], "fr-FR"],
+    [["en-GB"], "en-US"],
+    [["xx-YY", "fr-BE"], "fr-FR"],
+    [["not_a_locale"], "en-US"],
+    [[], "en-US"],
+  ] as const)("negotiates %j to %s", (languages, expected) => {
+    expect(negotiateLocale(languages)).toBe(expected);
+  });
+});
diff --git a/src/platform/i18n/locales.ts b/src/platform/i18n/locales.ts
new file mode 100644
index 0000000..d25d8db
--- /dev/null
+++ b/src/platform/i18n/locales.ts
@@ -0,0 +1,100 @@
+import deDE from "./catalogs/de-DE.json";
+import enUS from "./catalogs/en-US.json";
+import esAR from "./catalogs/es-AR.json";
+import esES from "./catalogs/es-ES.json";
+import frFR from "./catalogs/fr-FR.json";
+import ptBR from "./catalogs/pt-BR.json";
+import ptPT from "./catalogs/pt-PT.json";
+import type { MessageId } from "./messages";
+
+export const locales = [
+  "en-US",
+  "de-DE",
+  "fr-FR",
+  "pt-PT",
+  "pt-BR",
+  "es-ES",
+  "es-AR",
+] as const;
+
+export type Locale = (typeof locales)[number];
+
+type Catalog = Record<MessageId, string>;
+
+export const catalogs = {
+  "en-US": enUS,
+  "de-DE": deDE,
+  "fr-FR": frFR,
+  "pt-PT": ptPT,
+  "pt-BR": ptBR,
+  "es-ES": esES,
+  "es-AR": esAR,
+} satisfies Record<Locale, Catalog>;
+
+export function isLocale(value: string): value is Locale {
+  return locales.some((locale) => locale === value);
+}
+
+function negotiateOne(language: string): Locale | null {
+  let canonicalLanguage: string;
+
+  try {
+    const [canonical] = Intl.getCanonicalLocales(language);
+    if (canonical === undefined) {
+      return null;
+    }
+    canonicalLanguage = canonical;
+  } catch {
+    return null;
+  }
+
+  if (isLocale(canonicalLanguage)) {
+    return canonicalLanguage;
+  }
+
+  const baseName = new Intl.Locale(canonicalLanguage).baseName;
+  if (isLocale(baseName)) {
+    return baseName;
+  }
+
+  const languageCode = baseName.split("-")[0];
+  switch (languageCode) {
+    case "en":
+      return "en-US";
+    case "de":
+      return "de-DE";
+    case "fr":
+      return "fr-FR";
+    case "pt":
+      return "pt-PT";
+    case "es":
+      return "es-ES";
+    default:
+      return null;
+  }
+}
+
+export function negotiateLocale(languages: readonly string[]): Locale {
+  for (const language of languages) {
+    const locale = negotiateOne(language);
+    if (locale !== null) {
+      return locale;
+    }
+  }
+  return "en-US";
+}
+
+export function applyDocumentLocale(locale: Locale): void {
+  document.documentElement.lang = locale;
+  document.documentElement.dir = "ltr";
+}
+
+export function localeDisplayName(
+  locale: Locale,
+  displayLocale: Locale,
+): string {
+  return (
+    new Intl.DisplayNames([displayLocale], { type: "language" }).of(locale) ??
+    locale
+  );
+}
diff --git a/src/platform/i18n/messages.ts b/src/platform/i18n/messages.ts
new file mode 100644
index 0000000..0923a84
--- /dev/null
+++ b/src/platform/i18n/messages.ts
@@ -0,0 +1,54 @@
+import { defineMessages } from "react-intl";
+
+export const messages = defineMessages({
+  pageTitle: {
+    id: "entry.pageTitle",
+    defaultMessage: "Sign in | MIA",
+  },
+  skipLink: {
+    id: "entry.skipLink",
+    defaultMessage: "Skip to main content",
+  },
+  heading: {
+    id: "entry.heading",
+    defaultMessage: "Sign in to MIA",
+  },
+  introduction: {
+    id: "entry.introduction",
+    defaultMessage: "Choose your language and text size before signing in.",
+  },
+  languageLabel: {
+    id: "entry.language.label",
+    defaultMessage: "Language",
+  },
+  localeChanged: {
+    id: "entry.language.changed",
+    defaultMessage: "Interface language changed.",
+  },
+  textSizeLegend: {
+    id: "entry.textSize.legend",
+    defaultMessage: "Text size",
+  },
+  textSizeHelp: {
+    id: "entry.textSize.help",
+    defaultMessage: "Choose the size that is easiest for you to read.",
+  },
+  textSizeStandard: {
+    id: "entry.textSize.standard",
+    defaultMessage: "Standard",
+  },
+  textSizeLarge: {
+    id: "entry.textSize.large",
+    defaultMessage: "Large",
+  },
+  textSizeExtraLarge: {
+    id: "entry.textSize.extraLarge",
+    defaultMessage: "Extra large",
+  },
+  buildIdentifier: {
+    id: "entry.buildIdentifier",
+    defaultMessage: "Build {buildId}",
+  },
+});
+
+export type MessageId = (typeof messages)[keyof typeof messages]["id"];
diff --git a/src/platform/prefs/README.md b/src/platform/prefs/README.md
deleted file mode 100644
index 64e8cdb..0000000
--- a/src/platform/prefs/README.md
+++ /dev/null
@@ -1,3 +0,0 @@
-# Preferences Ownership
-
-The sole browser-storage reader and writer for device-local UI preferences belongs here.
diff --git a/src/platform/prefs/preferences.test.ts b/src/platform/prefs/preferences.test.ts
new file mode 100644
index 0000000..15dd491
--- /dev/null
+++ b/src/platform/prefs/preferences.test.ts
@@ -0,0 +1,43 @@
+import { afterEach, describe, expect, it, vi } from "vitest";
+import {
+  applyTextSize,
+  readStoredLocale,
+  readTextSize,
+  setTextSize,
+  storeLocale,
+} from "./preferences";
+
+afterEach(() => {
+  vi.restoreAllMocks();
+  localStorage.clear();
+  document.documentElement.className = "";
+});
+
+describe("device-local preferences", () => {
+  it("rejects an invalid stored text size", () => {
+    localStorage.setItem("mia.interface.text-size", "huge");
+    expect(readTextSize()).toBe("standard");
+  });
+
+  it("keeps preferences operable when storage reads and writes fail", () => {
+    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
+      throw new Error("storage unavailable");
+    });
+    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
+      throw new Error("storage unavailable");
+    });
+
+    expect(readStoredLocale()).toBeNull();
+    expect(readTextSize()).toBe("standard");
+    expect(() => storeLocale("fr-FR")).not.toThrow();
+    expect(() => setTextSize("large")).not.toThrow();
+    expect(document.documentElement).toHaveClass("text-lg");
+  });
+
+  it("replaces, rather than accumulates, root text-size classes", () => {
+    applyTextSize("large");
+    applyTextSize("extra-large");
+    expect(document.documentElement).toHaveClass("text-xl");
+    expect(document.documentElement).not.toHaveClass("text-lg");
+  });
+});
diff --git a/src/platform/prefs/preferences.ts b/src/platform/prefs/preferences.ts
new file mode 100644
index 0000000..54906f0
--- /dev/null
+++ b/src/platform/prefs/preferences.ts
@@ -0,0 +1,52 @@
+const LOCALE_KEY = "mia.interface.locale";
+const TEXT_SIZE_KEY = "mia.interface.text-size";
+
+export const textSizes = ["standard", "large", "extra-large"] as const;
+
+export type TextSize = (typeof textSizes)[number];
+
+const textSizeClasses = {
+  standard: "text-base",
+  large: "text-lg",
+  "extra-large": "text-xl",
+} satisfies Record<TextSize, string>;
+
+function readPreference(key: string): string | null {
+  try {
+    return localStorage.getItem(key);
+  } catch {
+    return null;
+  }
+}
+
+function writePreference(key: string, value: string): void {
+  try {
+    localStorage.setItem(key, value);
+  } catch {
+    // Device preferences remain active in memory when browser storage is unavailable.
+  }
+}
+
+export function readStoredLocale(): string | null {
+  return readPreference(LOCALE_KEY);
+}
+
+export function storeLocale(locale: string): void {
+  writePreference(LOCALE_KEY, locale);
+}
+
+export function readTextSize(): TextSize {
+  const storedValue = readPreference(TEXT_SIZE_KEY);
+  return textSizes.find((textSize) => textSize === storedValue) ?? "standard";
+}
+
+export function applyTextSize(textSize: TextSize): void {
+  const root = document.documentElement;
+  root.classList.remove(...Object.values(textSizeClasses));
+  root.classList.add(textSizeClasses[textSize]);
+}
+
+export function setTextSize(textSize: TextSize): void {
+  applyTextSize(textSize);
+  writePreference(TEXT_SIZE_KEY, textSize);
+}
diff --git a/tsconfig.app.json b/tsconfig.app.json
index 2acd143..a90b0af 100644
--- a/tsconfig.app.json
+++ b/tsconfig.app.json
@@ -10,6 +10,7 @@
     "allowSyntheticDefaultImports": true,
     "module": "ESNext",
     "moduleResolution": "bundler",
+    "resolveJsonModule": true,
     "allowImportingTsExtensions": false,
     "verbatimModuleSyntax": true,
     "moduleDetection": "force",
diff --git a/_bmad-output/implementation-artifacts/review-bcg-001-contract-reconciliation.md b/_bmad-output/implementation-artifacts/review-bcg-001-contract-reconciliation.md
new file mode 100644
index 0000000..6241fed
--- /dev/null
+++ b/_bmad-output/implementation-artifacts/review-bcg-001-contract-reconciliation.md
@@ -0,0 +1,39 @@
+# BCG-001 reconciliation — independent Blind Hunter review
+
+Run this prompt in a separate, context-free session at the same model level as the authoring session. Return findings
+as text; do not edit files or commit. The backend is read-only. Existing application, sprint-status, and Story 1-2 edits
+belong to other work and are outside this review's change scope.
+
+## Prompt
+
+Conduct a review of CONTENT.
+Look for what's missing, not only what's wrong.
+Compute your finding floor N from the size of the changes: N = min(floor(sqrt(kB) + 1), 10), where kB is the changed
+content's size in kilobytes. State the arithmetic in one line, then find at least N issues to fix or improve.
+Output a Markdown list of findings only — no severity, priority, or ranking.
+If the content is empty, stop and say so.
+If you have zero findings, re-check and keep thinking; do not stop with an empty list.
+
+CONTENT:
+The documentation changes for BCG-001 reconciliation in the current worktree at
+`/Users/thorsten/projects/thorsten/mia-frontend`. Inspect them directly before reviewing:
+
+- `_bmad-output/planning-artifacts/ux-designs/ux-mia-frontend-2026-09-12/BACKEND-CONTRACT-GAPS.md`
+  (the diff for BCG-001 and the update date).
+- `_bmad-output/implementation-artifacts/spec-bcg-001-contract-reconciliation.md`
+  (the new execution record).
+
+Use the maintained contracts and referenced evidence in `mia/` to verify claims; the handoff
+`tmp/backend-contract-entry-response.md` is not authoritative. Inspect relevant binding frontend artifacts and rules.
+Check stage discovery, CSRF, restricted/authenticated deadlines, non-refreshing reads/SSE, Continue working, late-response
+logout ordering, and the sufficiency of evidence. Verify that product conflicts remain explicit, no whole-gap closure
+or partial-closure permission is invented, and the Story 1-2 canonical entry resumption decision follows existing rules.
+Do not review unrelated staged application/story changes as changes made by this task.
+
+Generated-cache repair is supporting context: source/configuration/renderer hashes and expected rendered hashes matched
+the existing manifest; eight generated Markdown files had formatting differences. Only the corrupt generation directory
+`_bmad/render/bmad-build/mia-frontend-73443eb46a23/6cd94fe1833de1db8700/` was regenerated using the unchanged renderer.
+Its output integrity was checked after the frontend full check. Do not edit source skill instructions or integrity checks.
+
+Do not invoke any skill, and do not spawn subagents of your own — you are the reviewer. Return your findings as text in
+your final message; do not route them through any findings-reporting tool the host may offer.
diff --git a/_bmad-output/implementation-artifacts/spec-bcg-001-contract-reconciliation.md b/_bmad-output/implementation-artifacts/spec-bcg-001-contract-reconciliation.md
new file mode 100644
index 0000000..c546fa1
--- /dev/null
+++ b/_bmad-output/implementation-artifacts/spec-bcg-001-contract-reconciliation.md
@@ -0,0 +1,66 @@
+---
+title: 'Reconcile BCG-001 against maintained backend contracts'
+type: 'chore'
+created: '2026-09-27'
+status: 'done'
+route: 'oneshot'
+review_loop_iteration: 0
+---
+
+<frozen-after-approval reason="human-owned documentation-only scope; proceed checkpoints preapproved">
+
+## Intent
+
+Reconcile BCG-001 in the frontend backend-gap ledger against current maintained backend product requirements,
+OpenAPI, implementation, and evidence. Record satisfied requirements, remaining blockers, exact contract conflicts,
+and whether Story 1-2's canonical entry correction may resume under the existing open-gap rule. The backend handoff
+is discovery guidance, not authority. Do not invent partial-closure permission or close the gap without all evidence.
+
+Repair the confirmed generated workflow cache corruption without changing source skill instructions or weakening
+integrity verification. Preserve existing frontend story work, application code, sprint status, and the read-only
+backend. Run the frontend full check, report skips and failures, and identify any snapshot-mutating check without
+broadening source changes. Do not commit.
+
+</frozen-after-approval>
+
+## Implementation Notes
+
+- Scope has no unresolved intent decisions or irreversible effects: update the gap ledger and this execution record;
+  report product conflicts without deciding them. This is not an Epic 1 implementation or story-status transition.
+- Verified the generated manifest against every source, renderer, resolved configuration, and expected output hash.
+  Eight rendered Markdown files had formatting-only differences, with no extra or missing files. Removed only the
+  confirmed corrupt generation directory and regenerated it successfully through the unchanged renderer.
+- Backend inspected at clean revision `0626b751558c8baa7e4645708ef588b309446ed8`; the handoff's uncommitted-state
+  description no longer matches the checkout. Backend tests are inspected evidence, not tests rerun in this task.
+- Updated only BCG-001 and the ledger's update date. Preserved its required observable contract, forbidden workarounds,
+  and acceptance criteria; recorded requirement-level progress without closing the composite blocker. The ledger owns
+  the evidence, unresolved product/transport questions, and Story 1-2 resumption decision.
+- `./run-all-tests.sh` passed on 2026-09-27 with no skipped components: typecheck, lint/architecture, formatting,
+  30 unit/component tests, build, bundle size, seven ICU catalogs, three Chromium E2E tests, duplication marker balance
+  and scan, npm audit, Trivy, Tailwind Plus catalog, and Markdown lint. Planning/implementation artifacts are exempt
+  from Markdown lint by repository policy; the existing E2E suite is not BCG-001 browser acceptance evidence.
+- After the full check, the unchanged renderer's `_verify_existing` verified every regenerated output against its
+  manifest. No check mutated the regenerated snapshot. The current full script uses `prettier --check`, and
+  `.prettierignore` excludes `_bmad/`; the historical writer responsible for the formatting drift was not established.
+- `git diff --check` passed. Existing staged Story 1-2 work and the pre-existing unstaged sprint-status change were
+  preserved. The backend remained clean at the inspected revision. No commit was made. The full check regenerated
+  normal ignored build/test outputs.
+- Independent Blind Hunter review is pending: this runtime has no subagent tool. Per the rendered workflow fallback,
+  the full scoped review prompt is in `review-bcg-001-contract-reconciliation.md` beside this file. Documentation edits
+  and verification are complete; workflow finalization awaits that independent review, not permission to implement
+  application code or to change the product contracts.
+- Independent review subsequently completed via the supervisor on 2026-09-27, superseding the pending-review note above.
+  The reviewer substantiated one finding and reported no other defects. Accepted the evidence-based result rather than
+  inventing findings to meet the prompt's numerical floor. Triaged and patched the documentation as recorded below;
+  independent review and documentation workflow finalization are complete. BCG-001 remains open and Story 1-2's wired
+  canonical entry correction remains blocked. The final post-edit full-gate outcome is reported in the accompanying
+  completion response; this record's earlier gate result refers to the pre-review run.
+
+## Review Triage Log
+
+- **Medium — patch — MFA discovery schema requirement overstated.** Verified
+  `mia/api-doc/schemas/resources/resources.yaml:282-291`: `mfa_challenge_id` is optional, with no conditional requirement
+  for `stage: mfa`. Implementation and test coverage do not make that field mandatory in the authoritative schema.
+  Corrected BCG-001's progress assessment, added the remaining OpenAPI completeness issue, and included the required
+  MFA variant in outstanding acceptance work. The backend schema needs correction by its owner; this task patches
+  only the frontend ledger's claim. No backend, application, story, or sprint-status change was made.
diff --git a/_bmad-output/implementation-artifacts/spec-stateless-logout-revision.md b/_bmad-output/implementation-artifacts/spec-stateless-logout-revision.md
new file mode 100644
index 0000000..7e738a3
--- /dev/null
+++ b/_bmad-output/implementation-artifacts/spec-stateless-logout-revision.md
@@ -0,0 +1,116 @@
+---
+title: 'Accept the reduced stateless logout guarantee'
+type: 'chore'
+created: '2026-09-27'
+status: 'in-review'
+baseline_commit: '5679af564b825e797c2f57724e4713330210efad'
+route: 'dispatch'
+review_loop_iteration: 0
+---
+
+<frozen-after-approval reason="owner-directed documentation revision; proceed checkpoints preapproved">
+
+## Intent
+
+On 2026-09-27 the owner instructed: "frontend’s logout requirements shall be revised", choosing the backend's
+documented reduced stateless guarantee over strengthening the backend. Revise directly affected frontend contracts
+so implementers do not promise universal prevention of authentication restoration after logout.
+
+Accept that delayed login, MFA-completion, and password-change responses admitted before logout may restore
+authentication. There is no server-side per-browser revocation or durable guarantee across suspended or terminated
+contexts. Keep local shielding, quiescence of known transitions, backend `204` plus subsequent anonymous discovery,
+independent tab checks, explicit reconciliation after late transitions, truthful copy, and no automatic unsafe replay.
+
+## Boundaries & Constraints
+
+Always reference maintained backend product requirements and OpenAPI for behavior and transport. Record the dated
+owner decision in the frontend product contract and reconcile its dependants. Close only the logout product conflict
+inside BCG-001; retain its MFA, CSRF, deadline-header, SSE, lifetime-wording, and evidence questions. Story 1-2's wired
+canonical entry remains blocked. Preserve existing reconciliation records, story/application work, and sprint tracking.
+
+Never edit the backend, implement application behavior, duplicate transport schemas, commit, claim shielding revokes
+cookies, or infer resolution of unspecified product questions. Historical reviews remain evidence of their date,
+not current requirements. If independent review is unavailable, provide a complete supervisor-dispatch prompt and
+leave review pending.
+
+</frozen-after-approval>
+
+## Code Map
+
+- `mia/docs/product-requirements.md` §Authentication session lifetime and `mia/api-doc/paths/auth.yaml`
+  (`sessionDiscovery`, `logout`), plus root OpenAPI `sessionCookie`: read-only authorities. Clean backend revision
+  `0626b751558c8baa7e4645708ef588b309446ed8`.
+- `mia/internal/auth/auth_test.go` `TestLogoutReorderingUsesReducedStatelessGuarantee`: cookie-pair simulation
+  confirms the accepted limitation, not browser lifecycle evidence.
+- UX contract directory: `_bmad-output/planning-artifacts/ux-designs/ux-mia-frontend-2026-09-12/`.
+  `FRONTEND-PRD-FOUNDATION.md` owns the decision; `SECURITY-PRIVACY-ACCEPTANCE.md` owns detailed logout acceptance.
+  `EXPERIENCE.md`, `FRONTEND-STATE-MACHINES.md`, `ACCESSIBILITY-ACCEPTANCE.md`, and `BACKEND-CONTRACT-GAPS.md`
+  contain the obsolete universal anti-restoration requirement. Inspect route/surface companions for consistency.
+- `.agents/rules/security-privacy.md` summarizes logout mechanics and needs the same limited confirmation semantics.
+- `_bmad-output/planning-artifacts/epics.md`, architecture `ARCHITECTURE-SPINE.md`, and
+  `_bmad-output/specs/spec-mia-frontend/SPEC.md`: propagate the binding decision through references where needed.
+- Existing `spec-bcg-001-contract-reconciliation.md`, its review record, Story 1-2, sprint bookkeeping, and staged
+  application files are prior work. Preserve them; do not reinterpret their recorded checks as this task's evidence.
+
+## Tasks & Acceptance
+
+### Execution
+
+- [x] Update `FRONTEND-PRD-FOUNDATION.md` with dated source instruction and replace impossible logout guarantees.
+- [x] Reconcile `SECURITY-PRIVACY-ACCEPTANCE.md`, `EXPERIENCE.md`, `FRONTEND-STATE-MACHINES.md`, and
+  `ACCESSIBILITY-ACCEPTANCE.md` so confirmation, late-transition recovery, focus, copy, and negative tests agree.
+- [x] Update only BCG-001's logout-conflict assessment and acceptance expectations in `BACKEND-CONTRACT-GAPS.md`.
+- [x] Align `.agents/rules/security-privacy.md` and directly affected architecture/spec/epic references; search all
+  frontend planning and instructions for surviving stronger claims without rewriting historical evidence.
+- [x] Run `./run-all-tests.sh`, inspect diff integrity and backend cleanliness, and arrange independent review or
+  record the full fallback prompt.
+
+### Acceptance Criteria
+
+- Given the owner's instruction, when a frontend implementer reads the contracts, then late authentication transitions
+  are explicitly allowed to restore authentication and no universal revocation guarantee is required.
+- Given known in-flight transitions, when logout begins, then admission closes and confirmation waits for their
+  settlement, backend `204`, and subsequent anonymous discovery; abort alone is not proof of settlement.
+- Given a late transition after confirmation, when it is observed, then the UI shields, withdraws current confirmation,
+  and requires explicit session reconciliation without unsafe replay or automatic protected reveal.
+- Given another tab or a suspended context, when it resumes or receives a logout notification, then it cannot treat
+  the notification as authority; each tab needs its own permitted discovery before confirmation.
+- Given a logout failure or ambiguous result, when the privacy screen renders, then it states that content is hidden
+  locally and logout is unconfirmed, with explicit safe recovery and no cookie-revocation claim.
+- Given this documentation revision, when BCG-001 is assessed, then only the product conflict is closed and the
+  composite blocker and Story 1-2 wired-entry restriction remain open.
+
+## Implementation Notes
+
+Investigation found no missing owner choice or irreversible operation. The footprint spans linked binding documents,
+so use the full dispatch spec rather than a small-change oneshot. The renderer succeeded without cache repair.
+
+- Implemented the linked contracts and added a reconciliation-needed state plus matching restricted logout surface and
+  route references. The security companion owns detailed recovery; backend schemas remain referenced, not duplicated.
+- Searched frontend planning, canonical specs, agent rules, and OpenCode instructions for logout, pre-logout,
+  anti-resurrection, atomic ordering, cookie absence, and authentication-restoration claims. Remaining stronger wording
+  in historical PRD review reports (especially `review-downstream.md` and its HTML validation report) is a quotation of
+  the superseded contract, not a current requirement. Preserved those reports and the prior reconciliation records.
+- `npx markdownlint --fix .agents/rules/security-privacy.md` and `./run-all-tests.sh` passed on 2026-09-27. No suite
+  components skipped: typecheck, lint/architecture, formatting, 30 unit/component tests, build, bundle size, seven ICU
+  catalogs, three Chromium E2E tests, duplication markers/scan, npm audit, Trivy, Tailwind Plus catalog, Markdown lint.
+  Planning/implementation artifacts are exempt from Markdown lint by policy. These scaffold tests do not establish
+  logout browser acceptance. Backend evidence was inspected, not rerun.
+- `git diff --check` passed. No application, Story 1-2, sprint bookkeeping, prior reconciliation record, or backend
+  edits were made by this task; no commit or staging was performed. Normal ignored build/test outputs were regenerated.
+- Independent Blind Hunter, Edge Case Hunter, and Verification Gap reviews remain pending because no subagent tool is
+  available. The standalone prompts are `review-stateless-logout-blind-hunter.md`,
+  `review-stateless-logout-edge-case-hunter.md`, and `review-stateless-logout-verification-gap.md` beside this record.
+  Author checks are not independent review. The workflow stops at this gate for supervisor dispatch and returned findings.
+
+## Spec Change Log
+
+## Review Triage Log
+
+## Verification
+
+- `./run-all-tests.sh`: report each failure or skip; its application tests are not logout implementation evidence.
+- `git diff --check`: no whitespace defects.
+- Search active frontend contracts and instructions for universal anti-restoration, atomic logout, cookie-absence,
+  and all-context guarantees. Classify historical review quotations separately.
+- Confirm unchanged backend revision and clean status; preserve pre-existing staged and unstaged work.
diff --git a/tmp/backend-contract-account-scope-request.md b/tmp/backend-contract-account-scope-request.md
new file mode 100644
index 0000000..fc021c0
--- /dev/null
+++ b/tmp/backend-contract-account-scope-request.md
@@ -0,0 +1,33 @@
+# Backend Contract Request: Authenticated Home Gate
+
+## Context
+
+An authenticated session alone does not authorize the frontend to mount Home
+at `/`. Before mounting protected content, the frontend must establish current
+account capability and complete scope, then route-resource authorization.
+
+## Request
+
+Document authoritative OpenAPI operations and schemas for:
+
+- Current authenticated account capabilities.
+- The complete scope and assignment discriminators those capabilities require.
+- Authorization context required to access the Home route.
+
+For every operation, document its path, method, media type, response schema,
+status codes, existence-hiding behavior, and CSRF requirements in OpenAPI.
+
+## Required Semantics
+
+- A valid authenticated session must not by itself authorize protected Home.
+- The response must provide only fields the current account may access.
+- Capability and scope results must be sufficient for the frontend to decide
+  whether Home may mount, without probing denials or enumerating resources.
+- If Home cannot be authorized, the contract must define the safe outcome
+  without revealing whether a protected resource exists.
+
+## Acceptance
+
+The frontend can apply the ordered protected-mount gate: authenticated session,
+current-account capability and scope, Home route authorization, then dependent
+data.
diff --git a/tmp/backend-contract-entry-response.md b/tmp/backend-contract-entry-response.md
new file mode 100644
index 0000000..c1fa84b
--- /dev/null
+++ b/tmp/backend-contract-entry-response.md
@@ -0,0 +1,81 @@
+# Backend response: Session discovery and Home entry
+
+Both requests have been addressed in the backend checkout at `/Users/thorsten/projects/thorsten/mia`.
+The changes are implemented and reviewed but are currently uncommitted.
+
+This message answers:
+
+- `backend-contract-session-stage-request.md`
+- `backend-contract-account-scope-request.md`
+
+## Agreed entry flow
+
+1. Call `GET /api/v1/auth/session` to determine the current entry stage.
+   - If `data` is `null`, read `meta.stage`, which is `anonymous`.
+   - Otherwise, read `data.attributes.stage`: `mfa`, `password-change`, or `authenticated`.
+   - MFA responses include `mfa_challenge_id`. MFA precedes password replacement when both are required.
+2. Anonymous users enter sign-in. Restricted stages show only their focused flow and logout, without application
+   navigation, protected titles or names, breadcrumbs, prefetch, or dependent protected requests.
+3. Only `authenticated` proceeds to `GET /api/v1/users/me/capabilities`.
+4. Successful current-account capability discovery permits the basic Home shell at `/`.
+   Accounts without assignments may mount an empty Home. Session discovery alone is insufficient.
+5. Gate each protected section and dependent request by its relevant available capability and scope.
+   Every backend operation still independently authorizes its target against current state.
+
+There is no additional Home permission, `home.view` capability, or Home authorization endpoint.
+This interpretation was explicitly approved by the product owner.
+
+## Capability scope
+
+The existing capability response contains the complete 14-action catalog, including unavailable actions.
+Each action includes `available` and explicit scope fields:
+
+- `global`: platform-wide scope for that action only.
+- `course_ids`: action-specific supervised or joined courses.
+- `student_ids`: eligible student-only accounts for the relevant student-management action.
+- `course_students`: exact mentor course/student pairs; never combine IDs across pairs.
+- `own_resource`: the current account's own resource.
+
+Empty assignment arrays are explicit. Membership alone does not establish tutoring-start eligibility.
+Removed assignments disappear on subsequent capability reads; prior results are not authorization grants.
+
+## Transport and failures
+
+Both operations are GET requests, require no CSRF header or request body, return `application/vnd.api+json`, and use
+`Cache-Control: no-store`. Neither extends the session.
+
+- Session discovery returns the same anonymous state for missing, malformed, stale, banned, deleted, or
+  generation-invalid authentication. Anonymous discovery refreshes the public CSRF cookie.
+- Capability discovery requires a full authenticated session. Both restricted stages return the existing
+  `403 auth_password_change_required`; that code does not distinguish MFA from password replacement.
+  Use session discovery, not the error code, to choose the entry flow.
+- Failed discovery must not be treated as empty successful scope or permission to mount protected Home content.
+  Use a neutral loading/error or sign-in state without revealing protected resource existence.
+- OpenAPI now explicitly documents the existing `500 internal_error` response for both operations.
+
+Do not inspect cookies, probe protected-route denials, or enumerate resources to determine entry eligibility.
+
+## Authoritative references
+
+Paths below are relative to the backend checkout. Use these as the maintained contract rather than this handoff message:
+
+- `api-doc/openapi.yaml`: operation paths and references.
+- `api-doc/paths/auth.yaml`, `sessionDiscovery`: session operation, statuses, and entry-stage semantics.
+- `api-doc/paths/users.yaml`, `capabilities`: capability operation, statuses, and Home eligibility.
+- `api-doc/schemas/resources/resources.yaml`: `SessionDiscoveryDocument`, `AccountCapabilities`, and scope schemas.
+- `docs/product-requirements.md`, User and roster visibility: approved product behavior.
+- `docs/api.md`, Current user and MFA: entry-flow narrative.
+- `_bmad-output/implementation-artifacts/spec-frontend-entry-contracts.md`: completed implementation and review record.
+
+## Verification and known limitation
+
+The existing endpoints already supported the agreed behavior; this task clarified contracts and added regression tests.
+Coverage includes unassigned accounts in all four roles, restricted stages, mentor pair isolation, assignment removal,
+duplicate catalog detection, and failure without partial scope disclosure.
+
+The backend `./run-all-tests.sh` passed after review fixes, including race tests, lint, duplication, Trivy, OpenAPI,
+and Markdown checks. Optional `govulncheck` was unavailable and skipped. Frontend rendering was not browser-tested.
+
+Scope arrays remain complete and unpaginated. The product owner explicitly deferred bounded scope retrieval for this
+task; it is recorded in backend `_bmad-output/implementation-artifacts/deferred-work.md`. This is a known limitation,
+not a permanent pagination exemption or a promise of bounded response size.
diff --git a/tmp/backend-contract-session-stage-request.md b/tmp/backend-contract-session-stage-request.md
new file mode 100644
index 0000000..2fba556
--- /dev/null
+++ b/tmp/backend-contract-session-stage-request.md
@@ -0,0 +1,35 @@
+# Backend Contract Request: Session Stage Discovery
+
+## Context
+
+The frontend must select an allowed entry surface without inspecting cookies,
+probing protected routes, or guessing from account data. This is required for
+the restricted MFA and password-change stages.
+
+## Request
+
+Add an authoritative session-discovery operation to the implemented OpenAPI
+contract. Its response must identify exactly one current session stage:
+
+- `anonymous`
+- `mfa`
+- `password-change`
+- `authenticated`
+
+Document the operation's path, method, media type, response schema, status
+codes, and CSRF requirements in OpenAPI.
+
+## Required Semantics
+
+- The stage is the sole frontend authority for choosing the entry flow.
+- `mfa` and `password-change` are restricted stages. They must not expose an
+  application shell, protected title, protected name, breadcrumb, prefetch, or
+  dependent protected request.
+- MFA precedes password replacement when both requirements apply.
+- The response must not require the frontend to inspect a cookie or infer the
+  stage from a failed request.
+
+## Acceptance
+
+The frontend can use only this documented operation to distinguish anonymous,
+MFA, password-change, and authenticated entry states.

```
. Read that file — it is the content under review.

Do not invoke any skill, and do not spawn subagents of your own — you are the reviewer. If the instruction file is unreadable, report that exact failure and stop. Return your findings as text in your final message; do not route them through any findings-reporting tool the host may offer.
