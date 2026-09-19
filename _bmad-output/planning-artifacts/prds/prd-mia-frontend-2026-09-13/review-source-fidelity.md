# Source-Fidelity Review — MIA Frontend PRD Foundation

Reviewed: `_bmad-output/planning-artifacts/ux-designs/ux-mia-frontend-2026-09-12/FRONTEND-PRD-FOUNDATION.md`
(538 lines, `updated: 2026-09-13`).

## Verdict

Every declared source path and every in-document cross-reference resolves, and the document is unusually disciplined
about not inventing transport — its recurring "OpenAPI owns this" and `BCG-*` deferrals are real and correctly
targeted. The defects are almost entirely of omission rather than invention: confirmed backend behavior that directly
shapes the interface (SSE establishment refreshing the server idle timer, login throttling with `429`/`Retry-After`,
the tutoring-session lifecycle rules, JSON:API error-body bounds) never reaches this document, and its own AGENTS.md
vocabulary mandate for "sign-in expiry" is never honored. One passage — the Continue-working deadline response — states
a response shape that no named source establishes, though it is hedged by a `BACKEND-CONTRACT-GAPS.md` pointer three
lines later.

## Source reference check

| Declared source | Resolves? | Note |
| --- | --- | --- |
| `mia/docs/product-requirements.md` | Yes | 1,735 lines. Authority order rank 1. |
| `mia/docs/api.md` | Yes | 781 lines. Authority order rank 4. |
| `mia/_bmad-output/planning-artifacts/prds/prd-mia-2026-08-29/prd.md` | Yes | 63,841 bytes. `AS-1`..`AS-32` confirmed at `prd.md:728` and `prd.md:771`. |
| `mia/_bmad-output/planning-artifacts/prds/prd-mia-2026-08-29/addendum.md` | Yes | 8,212 bytes. |
| `mia/_bmad-output/.../architecture-mia-2026-08-29/ARCHITECTURE-SPINE.md` | Yes | 23,439 bytes. |
| `mia/api-doc/openapi.yaml` and siblings (authority rank 3) | Yes | `openapi.yaml` plus 11 `paths/`, `schemas/`, and `responses/` files. **Not listed in frontmatter `sources:` (lines 4–10)** despite being rank 3 in §Authority and Sources (line 37). |
| `.memlog.md` (authority rank 6) | Yes | Resolves relative to the UX folder (26,345 bytes). No repository-root `.memlog.md` exists; the relative reading is the only one that works. |
| `.working/` (authority rank 7) | Yes | Resolves relative to the UX folder. |

In-document cross-references, all resolving: `DESIGN.md`, `EXPERIENCE.md`, `BACKEND-CONTRACT-GAPS.md`,
`REQUIREMENT-FLOW-MATRIX.md`, `SURFACE-STATE-MATRIX.md`, `ROUTE-INVENTORY.md`, `ACCESSIBILITY-ACCEPTANCE.md`,
`SECURITY-PRIVACY-ACCEPTANCE.md`, `FRONTEND-STATE-MACHINES.md`. Identifier ranges verified: `BCG-001` (gaps:33),
`BCG-014` (gaps:789), `BCG-015` (gaps:863), `BCG-016` (gaps:924), `BCG-017` (gaps:980); `AC-001`..`AC-019` and
`CP-01`..`CP-14` all present in `ACCESSIBILITY-ACCEPTANCE.md`.

No broken reference found.

## Findings

- **critical** SSE establishment resets the server idle timer, and the idle-warning model never says so
  (frontend §Security/§Tutoring Transport, lines 250–254 and 318–322; `mia/docs/product-requirements.md:530-532`,
  `mia/docs/api.md:122`) — Backend, verbatim: "Each successful authenticated HTTP request, including establishment of
  an SSE connection, resets the inactivity timer. Server-sent heartbeats and background provider work do not."
  (`product-requirements.md:530-532`), and "An SSE connection refreshes the cookie when established; server-sent events
  do not." (`api.md:122`). Frontend, verbatim: "Each tab's idle-warning baseline is its own last successful
  user-initiated authenticated request." (line 318–319) and "Automatic freshness must never become a keepalive."
  (line 243). The document's client-side model is internally sound, but it never states the consequence: in the
  tutoring flow it designates highest priority, opening or explicitly reopening the stream extends the **server**
  deadline while the client baseline does not move, so the local idle warning can fire against a deadline the server
  has already pushed out — and, conversely, a long-lived stream plus one explicit `Try now` is a keepalive the backend
  honors. This is not an obscure inference: the project's own `BACKEND-CONTRACT-GAPS.md:70-72` already records it
  ("Opening an authenticated SSE connection and every current successful authenticated request reset idle expiry under
  the current request-wide rule"). The foundation document under-claims a fact its own ledger holds, on the single
  invariant AGENTS.md states most emphatically ("SSE traffic, and reconnects must never act as a keepalive").
  *Fix:* in §Tutoring Transport, state that SSE establishment is an authenticated request that refreshes the
  server-side idle deadline today, that the client baseline is deliberately more conservative, and that reconciling the
  two is part of the `BCG-001` deadline contract.

- **high** Login throttling is confirmed backend behavior with its own acceptance scenario and appears nowhere in the
  document (frontend §Identity, Authentication, and Recovery, lines 125–146; §Excluded, lines 83–92;
  `mia/docs/product-requirements.md:1609-1617`, `mia/api-doc/paths/auth.yaml:26-28`) — Backend, verbatim: "Login
  permits five failed attempts per normalized username and 30 failed attempts per source IP in a rolling 15-minute
  window. It applies retry delays of one, two, and four seconds after failures two, three, and four. MIA returns `429`
  with `Retry-After` during a delay instead of sleeping in the handler." (`product-requirements.md:1611-1614`), and
  "The fifth username failure blocks further attempts until fewer than five failures remain in the rolling window."
  (`product-requirements.md:1615-1617`). OpenAPI makes it a first-class login response: "'429': … Global or layered
  login limit (`rate_limited` or `auth_login_throttled`)" (`paths/auth.yaml:26-28`). The frontend document enumerates
  the authentication requirement family in detail across lines 125–146 — password managers, autofill, paste,
  autocomplete purposes, reveal state, MFA input shape, TOTP enrollment, keyboard completion — and never mentions a
  throttled state, `429`, `Retry-After`, or a temporary block. It is also absent from §Excluded and from the
  §Acceptance-Scenario Foundation list, so a reader cannot tell whether it was scoped out or overlooked. The backend
  flags this as a real classroom condition — "classroom-scale bursts can temporarily throttle logins"
  (`product-requirements.md:1639`) — against the exact population the document describes at line 61 ("Students use
  school desktop browsers, sometimes on shared devices and weak connections"). The backend PRD also carries it as an
  acceptance scenario: "Repeated login failures produce temporary throttling rather than a permanent"
  (`product-requirements.md:1690`). *Fix:* add throttled/blocked to the authentication state list in the Identity
  family, and state that the UI surfaces a wait derived only from `Retry-After` and never a client-computed countdown.

- **high** Four confirmed tutoring-session lifecycle rules that constrain interface affordances are absent
  (frontend §Tutoring and Learning History, lines 186–200; §Excluded, lines 83–92;
  `mia/docs/product-requirements.md:1107-1113` and `1186`) — Backend, verbatim: "Tutoring sessions have no inactivity
  timeout and do not expire automatically. An inactive session remains the student's one active session until it is
  explicitly finished. Students cannot abandon or discard an active session. Finishing is their only action for ending
  it. Only the student who owns the active session can finish it. Supervisors and administrators cannot force
  completion." (`product-requirements.md:1107-1113`); and "Session completion is rejected while a response is
  generating or queued." (`product-requirements.md:1186`). Frontend, verbatim, the whole of what it says on the
  subject: "Support joined-course choice, optional material choice, localized static starters, free-form intent, one
  active session, safe rich transcript, composer, queue, streaming, stop, explicit retry, reconnection, finish,
  completed transcript, summary and follow-up, used material, and optional generated speech." (lines 189–190). "Finish"
  appears as a feature name only. Nothing in the document prevents a designer adding a Discard session or Abandon
  control, a supervisor-side Force complete action, or a Finish button that is enabled while a response is streaming;
  §Excluded does not exclude them, and the only related pointer is "finish races" delegated to
  `FRONTEND-STATE-MACHINES.md` (line 258). AGENTS.md names all four as product invariants the UI must not violate.
  *Fix:* state the four rules in the Tutoring family — no inactivity expiry, finishing is the only student action for
  ending a session, only the owner can finish, finish is rejected while a response is generating or queued — and add
  the forbidden controls to §Excluded.

- **medium** §Security asserts a Continue-working response shape that no named source establishes
  (frontend §Security, Privacy, and Safety, lines 319–322; `mia/api-doc/openapi.yaml:40-177`,
  `mia/api-doc/schemas/resources/resources.yaml:67-89`, `mia/docs/api.md:132`) — Frontend, verbatim: "Continue working
  makes one explicit auth-session request whose success returns the refreshed authoritative idle deadline and unchanged
  absolute deadline together. No second automatic deadline read follows." (lines 319–321). No declared source
  establishes any of this. The implemented OpenAPI path map (`openapi.yaml:40-177`) contains no `/api/v1/auth/session`
  operation at all. The only `AuthSession` schema that exists carries two attributes — "stage: type: string, enum:
  [authenticated, mfa, password-change]" and "mfa_challenge_id" (`resources.yaml:80-89`) — and exposes no idle
  deadline, no absolute deadline, and no anonymous state. `docs/api.md:132` mentions the route but assigns it a
  different job entirely: "`GET /api/v1/auth/session` always issues or refreshes anonymous CSRF state." The document
  does point to the gap ledger three lines later ("`BACKEND-CONTRACT-GAPS.md` owns the deadline contract", line 328),
  and the ledger handles it correctly, but the sentences at 319–321 are written in the indicative and read as settled
  behavior. Against the document's own claim that it "does not authorize behavior absent from its sources" (line 19),
  this is the one passage that fails the test. The same applies, more mildly, to "Explicit Refresh and Try now use only
  BCG-001 non-refreshing checks" (line 241), which describes a request class the backend currently contradicts:
  "Each successful authenticated request reissues the cookie with a 30-minute idle expiry" (`api.md:120-121`).
  *Fix:* rewrite 319–321 in the required-contract voice ("`BCG-001` must supply a Continue-working response that
  returns …") so the deferral is visible in the sentence that makes the claim, not only in the paragraph after it.

- **medium** CSRF is named four times and its actual shape is never surfaced (frontend lines 241, 331, 465, 511;
  `mia/docs/api.md:124-137`, `mia/api-doc/openapi.yaml:189-193`) — Backend, verbatim: "The HTTPS `__Host-mia_csrf`
  cookie is `Secure`, `SameSite=Lax`, host-only, uses path `/`, and is readable by the frontend rather than
  `HttpOnly`. The frontend sends its value in `X-CSRF-Token` when token validation is required." (`api.md:125-128`);
  "Every unsafe public endpoint, including login, invitation preview and acceptance, and recovery, requires the
  matching cookie and header." (`api.md:132-134`); "MIA rotates CSRF state after completed login, logout, and every
  login-stage transition, invalidating the old value immediately." (`api.md:135-137`); "MIA supports same-origin
  browser access only in the MVP and does not enable CORS." (`api.md:129-130`). OpenAPI confirms the header name and
  cookie names (`openapi.yaml:189-193`). The frontend document reduces all of this to "session and CSRF handling" in a
  Priority 0 list (line 465) and "CSRF rotation" in a dependency bullet (line 511). Two consequences that shape
  release-one work go unstated: CSRF is required on **unauthenticated** endpoints, so the very first surface a signed-out
  user reaches has a token dependency; and the CSRF cookie is deliberately readable by script, which is an explicit
  exception to the document's own "Never log, persist, or expose … cookies" rule at line 288–289. A reader applying
  line 288–289 literally would treat reading `__Host-mia_csrf` as a violation. *Fix:* add a short transport note stating
  that unsafe requests including public ones carry `X-CSRF-Token` from the script-readable CSRF cookie, that the value
  rotates on login, logout, and every stage transition, and that this cookie is the named exception to the
  never-read-cookies rule.

- **medium** JSON:API and the error-body bound are never named, in the one section that most depends on them
  (frontend §Error Response Bodies, lines 260–272; `mia/api-doc/openapi.yaml:9-14`) — Backend, verbatim: "JSON
  documents use JSON:API 1.1. … JSON:API error bodies are complete valid UTF-8 documents no larger than 65,536 bytes
  and contain only safe registry fields." (`openapi.yaml:9-14`), and every error response is
  `application/vnd.api+json` with an `ErrorDocument` schema (`responses/errors.yaml`, all entries). Frontend, verbatim:
  "Every backend error uses a localized plain-language explanation plus expandable technical details containing the
  exact HTTP status and complete raw backend response body." (lines 262–263). The string "JSON:API" appears zero times
  in the frontend document. That bound is exactly what makes "complete raw backend response body" a safe, bounded,
  implementable requirement rather than an open-ended one — the 65,536-byte ceiling sizes the pre-wrap region
  (line 266), and "only safe registry fields" is the backend-side counterpart of the Product Owner decision the
  document defends at lines 270–272. Omitting both leaves the strongest argument for the approved design unstated.
  *Fix:* cite the JSON:API 1.1 media type and the 65,536-byte safe-registry-field bound in §Error Response Bodies as
  the backend-side precondition, still deferring the blocker itself to `BACKEND-CONTRACT-GAPS.md`.

- **medium** Vocabulary: AGENTS.md mandates "sign-in expiry"; the document never uses it and uses two ambiguous
  substitutes instead (frontend lines 53, 92, 303, 319, 489; AGENTS.md §Vocabulary) — AGENTS.md, verbatim: "Call
  authentication expiry **sign-in expiry**, never tutoring-session expiry. The two are unrelated." The frontend
  document uses "authentication expiry" (line 53), "session-expiry countdown" (line 92), bare "expiry" (lines 303,
  489), and "auth-session request" (line 319). Line 92 — "No remote session list, remote revocation, automatic browser
  keepalive, or exact session-expiry countdown" — is the sharpest case: in a product with both browser sessions and
  tutoring sessions, and given the backend rule "Tutoring sessions have no inactivity timeout"
  (`product-requirements.md:1107`), a bare "session-expiry" is precisely the collision AGENTS.md legislates against.
  *Fix:* replace every authentication-expiry reference with "sign-in expiry" and reserve "session" unqualified for
  tutoring sessions.

- **medium** The 1/2/4-second reconnect schedule is presented as transport contract but is unsourced, and collides
  numerically with an unrelated backend rule (frontend §Tutoring Transport, line 250;
  `mia/api-doc/schemas/resources/resources.yaml:874-890`, `mia/docs/product-requirements.md:1612-1613`) — Frontend,
  verbatim: "Tutoring uses SSE. Transport loss schedules 1, 2, and 4 second reconnect-availability delays but never
  opens a replacement authenticated EventSource automatically." (lines 250–251). The backend SSE contract defines a
  heartbeat and a write deadline and nothing else about reconnect pacing: "A heartbeat comment is sent after 15 seconds
  without an event. Each stream write has a 30-second deadline." (`resources.yaml:879-881`), with
  `x-heartbeat-seconds: 15` and `x-write-deadline-seconds: 30` and no `retry` field. The only "one, two, and four
  seconds" in the backend sources belongs to login throttling: "It applies retry delays of one, two, and four seconds
  after failures two, three, and four." (`product-requirements.md:1613`). The frontend numbers may well be an
  independent and reasonable client-pacing choice, but placed in a section framed as the transport contract with no
  "frontend-owned" marker, they read as sourced — while the genuinely sourced 1/2/4 schedule is missing from the
  authentication section (see the login-throttling finding). *Fix:* mark the reconnect delays as a frontend-owned
  pacing decision, and surface `x-heartbeat-seconds: 15` / the 30-second write deadline as the backend-owned values
  that stream-health UI must derive from.

- **low** Speech availability depends on a supervisor-set voice the student cannot set, which the document never
  surfaces (frontend line 190, line 246, line 518; `mia/docs/product-requirements.md:276`, `1407`, `1424`) — Backend,
  verbatim: "Speech generation is available only for a completed tutor response." (`product-requirements.md:1407`);
  "Speech generation requires an explicitly stored ElevenLabs voice ID" (`product-requirements.md:1424`); and the voice
  is a field "which only an assigned supervisor sharing a course with" the student may set
  (`product-requirements.md:276`). Frontend, verbatim: "Optional-provider absence disables only dependent features."
  (line 246). Provider absence is therefore not the only gate: a student in a fully provider-enabled deployment still
  has no speech until a supervisor sets their voice, and cannot fix it themselves. The document's §Excluded and
  §Deferred lists give no hint of this. *Fix:* note in the Tutoring family that speech requires both provider
  availability and a supervisor-set voice, and that the student-facing absence state must not imply a self-service fix.

- **low** The frontmatter `sources:` list omits the OpenAPI files it ranks third in its own authority order
  (frontend lines 4–10 vs line 37) — Frontend frontmatter lists five Markdown paths and no `api-doc/` entry, while
  §Authority and Sources line 37 reads "Implemented OpenAPI 3.2 files for paths, methods, media types, schemas,
  statuses, stable errors, security, and bounds." The OpenAPI description is the source the document defers to more
  often than any other (lines 174, 218, 254, 274–279, 511). A tool or reviewer trusting the frontmatter would not
  fetch it. *Fix:* add `mia/api-doc/openapi.yaml` to the frontmatter `sources:` list.

- **low** The noun "AI tutor" never appears (frontend lines 50, 89, 194, 198, 369, 373, 456, 497, 530;
  AGENTS.md §Vocabulary; `mia/docs/product-requirements.md:1105`, `1143`, `1153`) — AGENTS.md requires the exact term
  "AI tutor", and the backend uses it as a noun throughout ("the AI tutor can discover suitable authorized material",
  `product-requirements.md:1105`; "MIA authorizes every retrieval request. A model tool request never grants access by
  itself.", `product-requirements.md:1153`). The frontend document reaches it only once obliquely as
  "AI tutoring platform" (line 50); every other use is adjectival — "tutor answer buttons" (89), "tutor work" (194),
  "tutor output" (369), "tutor Markdown" (497). The adjectival forms match backend usage and are fine; the gap is that
  the document never establishes the noun, which matters because AGENTS.md separately warns "It is not a user role."
  *Fix:* use "AI tutor" at first mention in the Tutoring family.

**Counts:** 1 critical, 2 high, 5 medium, 3 low. 11 findings total.

## Invariant coverage

Against AGENTS.md §"Product invariants the UI must not violate", in document order:

1. **OpenAPI owns transport; silence is unresolved** — carried, and carried well. §OpenAPI Dependency Rule lines
   274–279, reinforced at line 45 ("Silence is unresolved, not permission to assume") and line 174.
2. **No cookie inspection, guessed route, denial probing, enumeration, null-state inference, or trial request** —
   carried, near-verbatim at line 283 and reinforced at line 98.
3. **Restricted `mfa` / `password-change` stages, MFA first, only the focused flow plus logout** — carried
   incompletely. Stage order and navigation suppression are at lines 129–130 ("MFA precedes temporary-password
   replacement when both apply. Restricted stages show no application navigation and always retain logout"), matching
   `product-requirements.md:560-575`. The invariant's further prohibitions — no protected title, breadcrumb, cached
   name, or prefetch during a restricted stage — are not stated here; only "localized titles" and "protected-mount
   capability and scope gates" are delegated to `ROUTE-INVENTORY.md` at lines 152–153.
4. **Session check alone never authorizes a mount; ordered gate** — carried, lines 232–234, with the ordering explicit
   ("the conjunction of authenticated session, current capabilities and complete scope, route authorization context,
   and dependent resource authorization") and the purge ordering at line 234.
5. **30-minute idle / 12-hour absolute; absolute never moves; client clock never extends** — carried incompletely.
   Lines 326–328 carry the shape ("At the earlier authoritative idle or absolute deadline …  Clock rollback, sleep,
   wake, suspended timers, or delayed callbacks lock rather than extend it"), and line 320 carries "unchanged absolute
   deadline". The concrete 30-minute and 12-hour figures from `product-requirements.md:528-538` never appear, yet the
   document states a derived figure — "The ordinary warning appears five minutes before the earlier authoritative
   deadline" (line 323) — without its basis.
6. **Each tab owns its idle baseline; SSE traffic and reconnects never act as a keepalive** — carried on the client
   side (lines 227–229, 240–243, 318–322) but materially incomplete on the server side. See the critical finding.
7. **No unsafe request ever replayed automatically** — carried only narrowly. The prohibition appears once, scoped to
   invitation acceptance: "It never replays automatically or claims account or session creation." (line 145). The
   general rule — no automatic replay after timeout, network loss, abort, `401`, `403`, `csrf_invalid`, tab return, or
   token rotation, with request-ID idempotency creating no exception — is nowhere stated, even though line 254
   introduces client-generated request IDs and line 514 lists "all request-ID replay contracts" as a dependency. This
   is the invariant most likely to be breached by a developer reading only this document.
8. **Render only authoritative state; no optimistic updates; destructive mutations only after definitive success** —
   carried incompletely. Line 225 carries the positive form ("Render only authoritative persisted or streamed states")
   and lines 56–57 the inference prohibition. The word "optimistic" appears nowhere, and the destructive-mutation rule
   surfaces only as a scenario at line 494 ("with state unchanged on failure"), not as a stated constraint.
9. **Existence-hiding is a single fixed presentation, indistinguishable across all named dimensions** — carried
   incompletely. Substance is present at lines 109, 179 ("uses a uniform ineligible result"), and 296. The invariant's
   enumerated dimensions — copy, focus, actions, URL, title, announcement, and **timing** — are not stated; timing in
   particular is the dimension most often missed and is unmentioned.
10. **Model output is untrusted text; creates no controls; authorizes no action** — carried, and the strongest coverage
    in the document: lines 290–291, plus line 89, line 497, and the deferral at line 530.
11. **Student profile immutability; one tutoring session; no inactivity expiry; one generating + one queued; finish
    only when idle** — split. The profile half is carried precisely at lines 138–139 and matches
    `product-requirements.md:229` and `1534`. The tutoring half is largely silent: "one active session" appears at
    line 189, but no inactivity expiry, at-most-one-generating-and-one-queued, and finish-only-when-idle do not appear
    at all. See the high finding.
12. **Release-one exclusions (light theme, no public sign-up, no dark mode, no offline, no analytics/telemetry, no
    notification center, no gamification)** — carried completely and explicitly, lines 85–92, line 301, and line 413.

## Vocabulary drift

| Term | Frontend usage (line) | Backend usage | Verdict |
| --- | --- | --- | --- |
| AI tutor | Never as a noun. "AI tutoring platform" (50); adjectival "tutor answer buttons" (89, 530), "tutor work" (194), "tutor output" (369, 373), "tutor praise" (456), "tutor Markdown" (497) | "the AI tutor" as a noun throughout — `product-requirements.md:1105`, `1143`, `1145`, `1153`, `1170`, `1262-1269` | Drift (low). Adjectival forms match the backend; the noun is simply never established. |
| Administrator | "Administrators are technically confident users managing accounts, courses, invitations, jobs, and audit records." (65); also 105, 157, 217 | "Only an administrator creates a course." (`product-requirements.md:710`) | Correct. No "admin" abbreviation anywhere. |
| Supervisor | 63, 78, 104, 113, 157, 163, 184, 211–213, 397, 455, 490, 502 | `product-requirements.md:229-230`, `266`, `710-714`, `1250` | Correct, and used consistently for course responsibility as AGENTS.md requires. |
| Mentor | 64, 104, 121, 202–213, 295, 300, 502, 521–522 | `product-requirements.md:238`, `1271-1290` | Correct. |
| Student | 61, 115–117, 138, 176–184, 486–489 | `product-requirements.md:229`, `1107-1116` | Correct, including the "student-only account" form at 138. |
| Operator | "The operator is not an application user role" (67); "current operator limits" (169); "operator guidance" (332) | Backend uses the identical sense — `product-requirements.md:1411`, backend AGENTS.md bootstrap rules | Correct. |
| **sign-in expiry** | **Zero occurrences.** Substitutes: "authentication expiry" (53), "session-expiry countdown" (92), bare "expiry" (303, 489), "auth-session request" (319), "stale auth" (445) | Backend heading is "Authentication session lifetime" (`product-requirements.md:524`); the frontend-repo AGENTS.md mandates the term "sign-in expiry" | **Drift (medium).** Line 92's bare "session-expiry" is genuinely ambiguous given `product-requirements.md:1107` ("Tutoring sessions have no inactivity timeout"). |
| Tutoring-session expiry | Not used | n/a | Correct — the forbidden phrase does not appear. |
