---
name: MIA Frontend PRD Foundation
status: approved
sources:
  - mia/docs/product-requirements.md
  - mia/api-doc/openapi.yaml
  - mia/docs/api.md
  - mia/_bmad-output/planning-artifacts/prds/prd-mia-2026-08-29/prd.md
  - mia/_bmad-output/planning-artifacts/prds/prd-mia-2026-08-29/addendum.md
  - mia/_bmad-output/planning-artifacts/architecture/architecture-mia-2026-08-29/ARCHITECTURE-SPINE.md
updated: 2026-10-06
---

# MIA Frontend PRD Foundation

## Purpose

This is the MIA frontend PRD. It organizes confirmed product, UX, integration, and verification decisions into
implementable requirement families without replacing the backend product contract or the OpenAPI description. No
separate frontend PRD supersedes it. It does not authorize behavior absent from its sources.

The architecture selections formerly listed under Open Questions were resolved on 2026-09-15 by
`_bmad-output/planning-artifacts/architecture/architecture-mia-frontend-2026-09-15/ARCHITECTURE-SPINE.md`; see
Resolved Questions. Every requirement stated here is binding on implementation.

Use `DESIGN.md` for visual identity and visual component deltas. Use `EXPERIENCE.md` for information architecture,
behavior, state, interaction, accessibility, responsive rules, and named journeys. Do not duplicate those contracts in
stories; reference them and add only story-specific acceptance detail.

This PRD binds the companion contracts listed under Companion Precedence. They own detailed traceability, per-surface
states, client route identity, observable transitions, and release evidence that would otherwise bloat this document.

## Authority and Sources

The authority order is:

1. `mia/docs/product-requirements.md` for confirmed product behavior, authorization, security, and data lifecycle.
2. The backend PRD for consolidated planning requirements and acceptance scenarios, subordinate to product requirements.
3. Implemented OpenAPI 3.2 files for paths, methods, media types, schemas, statuses, stable errors, security,
   and bounds.
4. `mia/docs/api.md` for cross-route rationale and route-family narrative, subordinate to product behavior and OpenAPI.
5. The backend architecture spine and PRD addendum for delivery and integration constraints.
6. `.memlog.md` for captured frontend decisions, distilled into `DESIGN.md`, `EXPERIENCE.md`, and this companion.
7. Imports and `.working/` files as discovery evidence only. The three handoff documents win on conflict.

Sources are preserved by reference rather than copied. Backend requirement details remain in the backend repository
through the `mia` symlink. Where this PRD states a backend-derived rule, it states the frontend obligation that follows
and cites the source; it does not restate the backend contract. Review and validation reports are non-normative
historical provenance. Silence is unresolved, not permission to assume.

### Companion Precedence

Each companion owns exactly one concern set. This PRD owns the decision, the scope, and the release priority; the
companion owns the mechanism and the evidence. On a mechanism conflict the companion wins. On a scope, priority, or
release-inclusion conflict this PRD wins. Backend sources outrank both. Where this PRD restates a companion's mechanism
for readability, that restatement is non-normative.

- `DESIGN.md` owns visual identity, palette, typography, licensed blueprint inheritance, and visual component deltas.
- `EXPERIENCE.md` owns information architecture, behavior, interaction, responsive rules, named journeys, and voice and
  tone.
- `ROUTE-INVENTORY.md` owns canonical client paths, opaque parameters, route parents, localized titles, h1 purpose,
  protected-mount capability and scope gates, and terminal or safe fallback behavior.
- `FRONTEND-STATE-MACHINES.md` owns observable state transitions: connection epochs, event ordering, announcement
  deduplication, request-ID and immutable-payload lifecycles, queue concurrency, finish races, upload ambiguity,
  provider states, speech, summaries, forms, navigation, locale, time zone, and stale resources.
- `ACCESSIBILITY-ACCEPTANCE.md` owns `AC-*` acceptance IDs, `CP-*` complete-process coverage, WCAG 2.2 A/AA mapping,
  dialogs and the idle warning under `AC-007`, streaming and stable reading under `AC-013`, and the
  assistive-technology evidence matrix.
- `SECURITY-PRIVACY-ACCEPTANCE.md` owns security and privacy acceptance, disclosure and containment mechanics, and the
  named negative-test suites.
- `SURFACE-STATE-MATRIX.md` owns per-surface state coverage.
- `REQUIREMENT-FLOW-MATRIX.md` owns release traceability and the `KF-*`, `SF-*`, `UJ-*`, and `XC-*` flow identifiers.
- `BACKEND-CONTRACT-GAPS.md` owns the `BCG-*` blocker inventory, status, unblock criteria, and release gate.

## Product Objective

The frontend enables safe, patient, guided use of MIA's curriculum-aligned AI tutoring platform. It must make the two
highest-priority experiences excellent: supervisors can prepare and activate a course without a separate manual, and a
student can complete a second tutoring session independently. Resilient recovery must make an active session and saved
work immediately understandable after stream loss, browser closure, sign-in expiry, or device change. It makes
no saved or unsaved claim for an ambiguous local attempt that was not retained.

The interface must make backend truth legible. It cannot imply successful processing, delivery, authorization, saving,
or provider work before the backend confirms it. Improved marks remain an intended benefit, not a guarantee.

## Users and Context

- Students use school desktop browsers, sometimes on shared devices and weak connections, for tutoring and private
  material. Release one uses no age differentiation.
- Supervisors are education professionals preparing courses, material, students, and oversight in desktop browsers.
- Mentors may be older or less technically confident volunteers working internationally from desktop browsers.
- Administrators are technically confident users managing accounts, courses, invitations, jobs, and audit records.
- Multi-role accounts use one unified, capability-driven interface with visible scope and no role switcher.
- The operator is not an application user role and has no frontend surface for local bootstrap or sole-admin MFA reset.

MIA treats a student as working alone. Any human guidance is an external arrangement and is neither required nor
represented by the interface.

## Frontend Scope and Exclusions

### Owner-approved tutoring-first milestone — 2026-10-06

The immediate MVP acceptance target is a working student tutoring journey, not completion of the entire release-one
surface inventory. This scope/priority amendment takes precedence over the broader inclusion list below for delivery
sequencing. The full inventory remains later backlog, not deleted requirements.

The owner requested replanning in `tmp/epic-re-planning.md` and explicitly selected the existing backend provisioning
flow: basic navigation → administrator invites supervisor → supervisor account setup → administrator creates course
with supervisor → supervisor prepares material/brief and activates course → supervisor provisions student → student
replaces temporary password → student conducts, resumes, finishes, and starts a second tutoring session.

New supervisors and students need no MFA enrollment for this milestone. Existing required MFA challenges still apply;
this decision does not disable factors or bypass authentication stages. Student provisioning remains course-scoped and
supervisor-authorized; no administrator student invitation or public student registration is introduced.

`../../epics.md` owns the current story boundaries and execution order; `../../sprint-change-proposal-2026-10-06.md`
records the migration from the earlier backlog. These define the deliverable subsets of the requirement families below.

For this milestone, Home may be a neutral navigation entry until real tutoring continuation is implemented. It must not
claim no pending work without authority. The full cross-role attention aggregator, profile editing, logos, drag-and-drop
enhancement, private student uploads, destructive administration, oversight/history expansion, speech, mentors, and further
MFA management come later. Native file selection, validated teaching fields, brief review/approval, safe transcript reading,
and essential recovery remain in the tutoring chain. Rich examples/templates beyond existing guided-field patterns do not
precede a working course. No fabricated dashboard, unauthorized data, or unimplemented navigation links substitute for work.

Retain the current stack, canonical routes, blueprint inheritance, seven-locale infrastructure, and authorization,
privacy, no-replay, truthful-state, and keyboard-access requirements for implemented paths. Resolve only the BCG dependencies
actually needed for a slice; do not guess missing transport or require unrelated mentoring/MFA gaps to close first.
No BCG is closed by this amendment. Full release evidence remains mandatory before claiming a complete release; the
functional tutoring demonstration is a distinct milestone. Existing test rules are not changed by this scope decision.

### Included

Release one includes every frontend surface in `EXPERIENCE.md` Information Architecture: public and restricted
authentication, Home, Learn, private material, tutoring and history, complete mentoring lifecycle, Prepare, course and
student oversight, profile and MFA, account and invitation administration, course administration, jobs, and audit.

Mentoring and administration may be visually conventional and merely functional. Course preparation, tutoring, and
session recovery receive the highest UX refinement.

### Excluded

- No public sign-up, operator command UI, guardian account, age verification, guardian consent, or data export. These
  are backend product decisions, not frontend omissions: the operator handles consent, age verification, and guardian
  access outside MIA (`mia/docs/product-requirements.md:96-105`), and MIA provides no user data-export feature
  (`mia/docs/product-requirements.md:1594`).
- No privacy notice, terms, retention statement, or any other in-product data-handling surface. The operating
  institution supplies that documentation. Release one therefore offers no in-product way to learn what MIA stores or
  for how long, which is a recorded decision rather than an oversight.
- No dark theme, phone-specific workflow, physical-resolution gate, native desktop application, or offline mode.
- No Cypress or Electron dependency and no required Playwright Firefox or WebKit project.
- No gamification, ranking, streak, reward, analytics dashboard, activity feed, or notification center.
- No dynamic tutor answer buttons, model-defined controls, hidden reasoning, or fabricated generation progress.
- No live mentoring chat, audio, video, recording, attendance, no-show tracking, or emergency channel.
- No Discard, Abandon, Cancel session, or Delete session control, no staff force-completion of a student session, and
  no tutoring-session inactivity or expiry presentation.
- No global supervisor student directory, bulk destructive actions, generic job retry, or ready-material source editor.
- No remote session list, remote revocation, automatic browser keepalive, or live sign-in-expiry countdown.

## Capability Model

Navigation and route access derive from current authorized capabilities, not role labels alone. The frontend presents
the union of actions permitted by roles within current course, student, ownership, and resource state scope. It never
uses possession of an ID or a visible stale control as authorization.

| Capability group | Primary capability families |
| --- | --- |
| Learn | Courses, approved material, private material, tutoring, summaries, speech, student mentoring |
| Prepare | Course content, material and approval, readiness, activation, students, oversight, mentor assignment |
| Mentor | Authorized request briefing, response, scheduling, external meeting, cancellation, completion |
| Administer | Accounts, roles, invitations, courses, supervisors, jobs, audit, destructive lifecycle actions |
| Profile and security | Student self-view; staff profile editing; MFA and recovery codes |

The backend remains authoritative on every request. Authorization denial removes stale protected content immediately
and must not reveal whether an out-of-scope sensitive resource exists.

## Prioritized Experience Outcomes

- `PEO-1` A supervisor can understand every course activation prerequisite, resolve it, and activate confidently
  without a separate manual.
- `PEO-2` A student can start, conduct, recover, and finish a second tutoring session without human interface guidance.
  The bar is the second session because the first carries mandatory temporary-password replacement
  (`mia/docs/product-requirements.md:496`) and is therefore not representative of steady-state use. It is not a
  concession that the first session is scaffolded: MIA ships no onboarding session, assumes every student works alone,
  and carries first-run entirely through ordinary empty states, each of which explains authoritative absence and offers
  at most one currently authorized next action (`EXPERIENCE.md`, `SURFACE-STATE-MATRIX.md`).
- `PEO-3` Session recovery restores authoritative saved work without duplication; an unretained ambiguous local attempt
  remains explicitly unknowable and receives no saved or unsaved claim.
- `PEO-4` Every user can distinguish waiting, failure, partial output, processing, approval, and completion from
  backend truth.
- `PEO-5` Shared-device use leaves logout obvious and sensitive frontend state cleared without ending an active
  tutoring session on the server.
- `PEO-6` Mentors and administrators can complete their lower-priority work with conventional, consistent, unambiguous
  flows.

`PEO-1` and `PEO-2` are the two highest-priority experiences named in the Product Objective.

Release one ships no success measurement. There is no usability gate, no pilot cohort, no pass threshold, and no
post-release signal, and the exclusion of analytics, telemetry, and session replay is deliberate rather than
incidental. These outcomes are therefore design targets that shape scope and priority; they are not measured results,
and nothing in this release will demonstrate that any of them was achieved. The Product Owner accepts that decision and
is accountable for discovering failure through direct contact with operating institutions.

Two consequences follow and are accepted rather than mitigated. No mechanism would reveal that `PEO-1` or `PEO-2` is
missed in every deployment. And no counter-metric guards the obvious failure mode in which a student completes a
session faster by disengaging from it, so a shorter session must never be read anywhere in the product as a better one.

## Functional Requirement Families

Each family carries stable `FFR-*` identifiers, one per discrete testable obligation, numbered in a block reserved for
that family. Identifiers are stable across edits: a withdrawn obligation retires its number rather than releasing it for
reuse. `FFR-*` is the frontend namespace and never collides with backend `FR-*`.

### Identity, Authentication, and Recovery

- `FFR-101` Provide username and password login, MFA challenge and recovery-code paths, required password replacement,
  logout, uniform staff password recovery, token-based reset, invitation preview and acceptance, and profile and
  security management.
- `FFR-102` Present authentication as one focused sequence in which MFA precedes temporary-password replacement when
  both apply.
- `FFR-103` Render a restricted stage as only its focused flow plus logout, with no application navigation, protected
  page title, breadcrumb, cached account name, or protected prefetch.
- `FFR-104` Treat throttled and temporarily blocked as first-class authentication states rather than generic failures,
  and derive any displayed wait only from `Retry-After`.
- `FFR-105` Never compute, extrapolate, or count down a throttle locally, and never disclose which limit was reached or
  how many attempts remain.
- `FFR-106` Support password managers, autofill, and paste with correct autocomplete purposes at every stage.
- `FFR-107` Give password reveal an accessible name and state.
- `FFR-108` Accept MFA codes in one native text input holding the full pasteable value.
- `FFR-109` Provide TOTP enrollment with a QR image and selectable issuer, account, and manual setup information derived
  locally from the provisioning URI.
- `FFR-110` Complete every authentication process by keyboard alone. This is release-blocking.
- `FFR-111` Serve canonical `/profile` to every authenticated account through the complete capability and scope gate.
- `FFR-112` Give student-only accounts a read-only self-profile with no edit control, writable form state, or profile
  mutation.
- `FFR-113` Allow staff accounts to edit only the product-authorized staff subset, and keep staff-only child routes
  capability-gated.
- `FFR-114` Before application rendering or optional scripts, synchronously read an invitation or reset fragment once
  and remove every known, unknown, malformed, or duplicate fragment with `history.replaceState`.
- `FFR-115` Keep a canonical valid token only in one ephemeral flow object.
- `FFR-116` Use invitation-specific language on invitation acceptance, expose only the invited role, and distinguish
  submitting, pre-dispatch failure, definitive rejection, outcome unknown, and consumed-token ambiguity.
- `FFR-117` Never replay invitation acceptance automatically and never claim account or session creation.
- `FFR-118` After invitation ambiguity, offer explicit sign-in and reopening the original email link as safe next
  actions while stating that neither proves the prior outcome.

Login throttling is backend behavior: attempts are limited per username and per source IP and a throttled attempt
returns `429` with `Retry-After` (`mia/docs/product-requirements.md:1609-1617`;
`mia/api-doc/paths/auth.yaml:26-28`). Shared school networks make this an ordinary classroom condition
(`mia/docs/product-requirements.md:1639`), not an edge case. `ACCESSIBILITY-ACCEPTANCE.md` owns the full authentication
matrix.

### Home and Unified Navigation

- `FFR-201` Provide one capability-driven shell and a single Home continuation surface.
- `FFR-202` Order Home as continuation first, then blocked work, and nothing else. A single resumable item leads: an
  active tutoring session, or otherwise the in-progress draft or upload the backend reports as current. Items blocked on
  this user follow, in the order backend state supplies, never in an order the frontend computes.
- `FFR-203` Show at most five Home items in total. Each links to the list that owns it, and overflow is reached only
  through that list. Home has no show-more control, no pagination, and no infinite scroll.
- `FFR-204` Duplicate no list onto Home, invent no metric, and render no counter, streak, score, or activity feed.
- `FFR-205` When the user has no resumable and no blocked work, show an empty Home that explains the authoritative
  absence and offers at most one currently authorized next action, consistent with every other empty surface.
- `FFR-206` Resolve a multi-role account to one ordered Home across the union of its capabilities. Never split Home by
  role and never present a role switcher.
- `FFR-207` Support stable URLs, parent routes, Back, Forward, and Reload.
- `FFR-208` Display a build identifier that is readable without authentication and identifies the exact deployed
  frontend build, so an operator can state which version they are running and confirm whether a fix has landed. It
  carries no account, route, resource, or environment data.

`ROUTE-INVENTORY.md` is binding for canonical client paths, opaque parameters, route parents, localized titles, h1
purpose, protected-mount capability and scope gates, and terminal or safe fallback behavior.

### Course Administration and Preparation

- `FFR-301` Support administrator course creation with at least one supervisor.
- `FFR-302` Support supervisor preparation through a non-linear hub that exposes and links every activation
  prerequisite without reference to external documentation.
- `FFR-303` Provide course details, curriculum, learning goals, AI instructions, language, logo, readiness, activation,
  deactivation, supervisor relationships, and deletion where authorized.
- `FFR-304` Give every preparation field a persistent label, helper text wherever the field carries a bound, revealable
  examples, supplemental tooltips, colocated validation, exact preview, and confirmed code-point and byte feedback.
- `FFR-305` Render no completion percentage, progress score, or other evaluation of incomplete draft work.

### Material and Files

- `FFR-401` Support course-wide and student-private material creation, file drafts, upload review, finalization,
  processing, failure recovery, brief display and correction, approval where applicable, authorized download, and
  deletion.
- `FFR-402` Declare supported formats and current operator limits before upload.
- `FFR-403` Provide picker and drag-and-drop, per-file progress, mixed-format prevention, recoverable drafts, file-list
  review, and an irreversible Finalize and process action.
- `FFR-404` State that MIA does not scan for malware and does not fetch external material links.
- `FFR-405` Never render technical readiness and educational approval as one state.

OpenAPI supplies exact limits and formats.

### Students and Oversight

- `FFR-501` Separate Create new student from Add existing student.
- `FFR-502` Accept one exact username for existing enrollment, with no global search or autocomplete, and return a
  uniform ineligible result.
- `FFR-503` Let the supervisor choose the temporary password, which the backend therefore never returns
  (`mia/docs/product-requirements.md:475`). Never retain it, never restore it from storage or form restoration, and
  never copy it automatically; state that it must be communicated outside MIA.
- `FFR-504` Provide scoped roster, profile, membership, recovery, MFA reset, ban, private-material inspection, session
  status, completed transcript, used material, and summary-correction surfaces according to backend authorization.
- `FFR-505` Keep active chat content hidden from supervisors until completion.
- `FFR-506` State on every supervisor surface that exposes session status that active chat content is not visible until
  the student finishes, so that absent content is never read as an absent, idle, or failed session.

### Tutoring and Learning History

The AI tutor is the model-driven tutoring behavior, not a user role.

- `FFR-601` Support joined-course choice, optional material choice, localized static starters, free-form intent, one
  active session, safe rich transcript, composer, queue, streaming, stop, explicit retry, reconnection, finish,
  completed transcript, summary and follow-up, used material, and optional generated speech.
- `FFR-602` Never present a tutoring session as expired, stale, or lost, and never offer to restart or clean up an idle
  session, because a tutoring session does not expire from inactivity.
- `FFR-603` Provide no Discard, Abandon, Cancel session, or Delete session control, because finishing is the student's
  only way to end a session.
- `FFR-604` Offer no force-completion on any supervisor, mentor, or administrator surface, because only the owning
  student may finish.
- `FFR-605` Derive the Finish control's enabled state from backend eligibility and never enable it optimistically while
  a response is generating or queued.
- `FFR-606` Present the speech-unavailable state without implying a self-service fix, because speech requires both
  provider availability and a supervisor-set voice the student cannot set.
- `FFR-607` Retain stable DOM identity for transcript turns and response attempts.
- `FFR-608` Preserve focus and reading position through streaming and terminal reconciliation, scrolling automatically
  only while the user is already at the end, and otherwise surfacing a visible, keyboard-reachable control that leads to
  unseen content.
- `FFR-609` Provide stable-reading mode, which pauses visual updates while tutor work continues, buffers content, and
  reconciles on explicit resume.
- `FFR-610` Provide no dynamic tutor answer buttons in release one; the API streams unstructured text.
- `FFR-611` Provide frontend-owned static starters covering homework help, topic practice, explanation, exam
  preparation, and a free-form question, each of which inserts editable text or guides the next step and never submits
  automatically.
- `FFR-612` Keep free text available at all times.
- `FFR-613` State persistently in the tutoring workspace that MIA is AI-powered, that no person is watching the
  conversation as it happens, and that an assigned supervisor can read the session once it is finished. This is fixed
  product copy in every launch locale, never operator-configured, never phrased as a warning against speaking freely,
  and never implying that anyone has been alerted or will respond.

The lifecycle constraints behind `FFR-602` through `FFR-606` are backend behavior
(`mia/docs/product-requirements.md:1107-1113`, `1186`, `276`, `1407`, `1424`). `FRONTEND-STATE-MACHINES.md` owns finish
races and queue concurrency; `BCG-012` owns authoritative action eligibility; `ACCESSIBILITY-ACCEPTANCE.md` `AC-013`
owns the detailed stable-reading behavior.

### Mentoring

- `FFR-701` Provide the complete request, triage, assignment, response, scheduling, rescheduling, cancellation,
  reassignment, mentor-removal, external-meeting, and completion lifecycle.
- `FFR-702` Hide new-request actions when unavailable while retaining authorized existing work.
- `FFR-703` Give mentors only the compact authorized briefing defined in `EXPERIENCE.md`.
- `FFR-704` Gate mentor completion on a server-evaluated allowed action, any server-provided recheck instant, fresh
  prevalidation, and explicit unknown-outcome reconciliation under `BCG-016`; never enable it from a local clock or
  mutation probing.
- `FFR-705` Provide a separate supervisor flow for granting the permanent mentor role to a registered staff account by
  exact user ID, without depending on or exposing the administrator account collection or detail.

`BCG-017` blocks target resolution and grant availability for `FFR-705` until a bounded, existence-hiding,
non-enumerable minimal contract exists. `BCG-014` separately binds the reviewed target state to dispatch. Neither
blocker disables existing mentoring or account work.

### Administration and Operations

- `FFR-801` Provide conventional paginated lists and detail pages for accounts, invitations, courses, durable jobs, and
  audit records.
- `FFR-802` Use only OpenAPI-supported filters, sorts, actions, and retry paths.
- `FFR-803` Distinguish permanent roles from scoped assignments.
- `FFR-804` Keep consequential actions off list rows and provide no bulk destructive action.

## State and Integration Contract

### Backend Truth

Render only authoritative persisted or streamed states. Do not infer success from request completion ambiguity, invent
totals, expose unsupported filters, or map distinct domain states into one label. Surface entry and mutation completion
may start required reads. Tab return, online, focus, visibility, `pageshow`, and transport loss only mark revalidation
needed and send no authenticated request. Explicit Continue working, Refresh, or Try now starts the applicable ordered
cycle. Do not run continuous global polling or background activity that keeps the backend idle timer alive.

Cold load, reload, history traversal, tab return, BFCache restoration, reconnection, and cross-tab security-epoch change
enter a neutral access-checking state. Protected rendering and mutation require the conjunction of authenticated
session, current capabilities and complete scope, route authorization context, and dependent resource authorization.
Reads are sequenced so stale responses cannot replace newer state; scope loss purges dependent protected state first.

`pagehide` installs a content-free privacy shield before a protected document can enter BFCache. Persisted `pageshow`
marks revalidation needed behind that retained shield; post-restore script timing alone is not accepted as pre-paint
protection.

Lifecycle events and transport loss never open an authenticated request or replacement EventSource. Explicit Refresh
and Try now use only `BCG-001` non-refreshing checks; Continue working uses one activity-refresh response followed by
non-refreshing dependent reads. If that contract is unavailable at runtime, protected UI remains shielded; if the
contract is absent from OpenAPI, the story is blocked rather than approximated. Automatic freshness must never become a
keepalive.

No unsafe request is ever replayed automatically. This holds after timeout, network loss, abort, `401`, `403`,
`csrf_invalid`, tab return, and token rotation, and request-ID idempotency creates no exception. Retry is always an
explicit user action on a control whose state came from backend truth.

Long-running work includes truthful state, last-checked time, and a statement that work continues after leaving when
the backend contract supports that behavior. Optional-provider absence disables only dependent features.

### Tutoring Transport

Tutoring uses SSE. Transport loss schedules 1, 2, and 4 second reconnect-availability delays but never opens a
replacement authenticated EventSource automatically. Those delays are a frontend-owned pacing choice, not a backend
contract; the backend owns the 15-second heartbeat interval and the 30-second stream write deadline
(`mia/api-doc/schemas/resources/resources.yaml:874-890`), and stream-health UI derives from those values rather than
from local timing. Explicit Try now or Continue working may open at most one replacement after the required access
cycle. Reconnection consumes an authoritative snapshot before new events and never creates a duplicate provider
request. Partial and queued content remain distinct. A terminal event causes an authoritative content render.
Client-generated request IDs remain stable across transport retries exactly as OpenAPI defines, and a stable request ID
never authorizes an automatic replay.

Ordinary requests and SSE never refresh server idle expiry. Only explicit Continue working may do so;
the frontend never infers a deadline from activity. `BCG-001` still owns the missing SSE transport obligations:
it must define an explicit SSE reconnect that reauthorizes and
opens one replacement EventSource without extending idle expiry, and state whether Continue working may open that
replacement.

`FRONTEND-STATE-MACHINES.md` owns connection epochs, event ordering, announcement deduplication, request-ID and
immutable-payload lifecycles, queue concurrency, finish races, upload ambiguity, provider states, speech, summaries,
forms, navigation, locale, time-zone, and stale-resource transitions. `ACCESSIBILITY-ACCEPTANCE.md` owns
reading-position preservation under `AC-013` and dialogs under `AC-007`.

### Error Response Bodies

Every backend error uses a localized plain-language explanation plus expandable technical details containing the exact
HTTP status and complete raw backend response body. Backend response text is untranslated and displayed verbatim through
safe escaped text. Technical details are collapsed by default, selectable, and never live-announced. Malformed,
non-JSON, HTML-looking, or otherwise unexpected bodies remain escaped inert text and are never parsed or executed. The
region visually pre-wraps and breaks long tokens without changing selected or copied text or causing page-level scroll.
Provide copy with a warning to review details before sharing. Never add headers, cookies, tokens, credentials, private
frontend state, or provider payloads to the disclosure.

Exact raw body disclosure is an approved Product Owner decision and must not be silently replaced with a validated-field
subset. It exists for diagnosability: release one ships no telemetry, no error SDK, and no session replay, so the raw
body is the only channel through which a self-hosted operator can diagnose a failure in the field.

Displaying the body verbatim is not an exception to the containment rules in Security, Privacy, and Safety, and needs no
override. Those rules govern what the frontend requests, stores, logs, or adds. The browser already holds the complete
response before anything is rendered, so withholding it in the interface would change only whether a reader must open
developer tools, not what the client received. A validated-field subset would therefore reduce diagnosability without
reducing exposure.

`BCG-007` remains a backend dependency for the parts that genuinely require backend behavior: a fixed aggregate size
bound so an unbounded body is never painted, valid UTF-8 with an explicit media type on every API and reverse-proxy
error path so the body is decoded rather than guessed, and neutral existence-hiding content in the body itself. That
last one matters because an error body that differs between an absent resource and a forbidden one leaks existence when
the backend sends it, which no interface behavior can cause or cure. `BCG-007` is a release goal rather than a gate on
this feature.

One residual exposure is accepted rather than mitigated: a managed browser fleet may disable developer tools by policy,
so in that deployment the rendered disclosure is reachable where the raw response is not. The underlying risk is a
backend defect that places another user's data in an error body, and `BCG-007` addresses it at source.

`SECURITY-PRIVACY-ACCEPTANCE.md` owns disclosure and containment tests.

### OpenAPI Dependency Rule

The implemented OpenAPI 3.2 contract owns paths, methods, request and response schemas, relationships, media types,
pagination links, status codes, stable errors, security, CSRF requirements, and request bounds. Frontend work must not
guess unresolved transport. If a required operation or field is absent, the story remains blocked on OpenAPI rather
than adding a client-side assumption or compatibility layer.

`BACKEND-CONTRACT-GAPS.md` is the authoritative inventory and release gate for accepted blockers. No copied count or
subset in this foundation supersedes it. No cookie inspection, guessed route, denial probing, course enumeration,
null-state inference, protected prefetch, or trial-request workaround may substitute for those contracts.

## Security, Privacy, and Safety

- Treat profiles, chats, private material, assessments, contact data, and authenticated responses as sensitive.
- Never log, persist, or expose passwords, MFA values, recovery codes, bearer tokens, cookies, private prompts, message
  bodies, provider payloads, authorization headers, or unnecessary personal data. The `__Host-mia_csrf` cookie is the
  one named exception: the backend makes it script-readable by design so the frontend can send its value in
  `X-CSRF-Token` (`mia/docs/api.md:124-137`). Reading that one cookie is required; reading any other is forbidden.
- Unsafe requests carry `X-CSRF-Token`, including on unauthenticated endpoints such as login, invitation preview and
  acceptance, and recovery, so the first surface a signed-out user reaches already has a token dependency. The value
  rotates on login, logout, and every login-stage transition, and the frontend never caches it across a rotation.
- Render uploads, authored text, external links, user messages, and model output as untrusted input.
- Model output cannot create controls or authorize platform actions.
- Authorize each download through the backend; never derive file access or scope from an ID or URL shape.
- Never overfetch and hide. A field the user may not see must not be requested and then concealed, and must not enter
  network traffic, memory, caches, accessibility trees, or DOM. This governs what the frontend asks for; it does not
  apply to a backend-authored error body returned for the user's own failed request, whose safety is a backend
  obligation under `BCG-007`.
- Never prefetch protected resources, downloads, transcripts, used material, mentor-excluded fields, or private files.
- Do not reveal whether an out-of-scope sensitive account, invitation, session, upload, or other resource exists.
  Existence-hiding is a single fixed presentation: unknown, out-of-scope, ineligible, revoked, and throttled causes
  must be indistinguishable in copy, focus, available actions, URL, page title, announcement, and response timing.
  This binds the frontend's own presentation. Neutrality of the backend response itself, including the error body, is a
  backend obligation under `BCG-007`, because a distinguishing response leaks existence when it is sent rather than
  when it is displayed.
- Do not claim that self-hosting keeps all processing local or that local deletion removes provider copies and backups.
- The operating institution is the controller for the data MIA processes and carries lawful operation, consent, age
  verification, and guardian access outside the product (`mia/docs/product-requirements.md:96-105`). The frontend never
  implies that MIA obtained consent, verified an age, or carries a data-protection obligation on the operator's behalf.
  Self-reported `year_of_birth` is profile data and is never presented as age verification
  (`mia/docs/product-requirements.md:147`).
- Data is retained until an authorized deletion and nothing expires automatically except generated speech
  (`mia/docs/product-requirements.md:1589-1593`). The frontend never implies automatic expiry, scheduled cleanup, or a
  retention window. Erasure is real and reachable: administrator account deletion removes the student's profile,
  memberships, private material, sessions, chat history, summaries, mentoring records, and speech across all courses
  (`mia/docs/product-requirements.md:1598-1604`).
- Do not claim that accepted material is malware-free or that MIA validates copyright or licensing.
- MIA is not an emergency service, sends no safeguarding alert, and never implies human monitoring or notification.
  The AI tutor's supportive response, the absence of notification, and the placement of local safeguarding guidance
  outside MIA are backend-owned (`mia/docs/product-requirements.md:1690-1707`, `AS-19`). The Product Owner is the
  recorded acceptor of this posture for a product that may serve minors. The frontend's own obligation is expectation
  setting, not alerting: see `FFR-613` and `FFR-506`.
- Mentoring is not an emergency channel. External meeting links are metadata and are never fetched or embedded.
- Release one has no analytics, telemetry, session replay, third-party error SDK, remote font, or remote script.
- Field diagnosis relies on the build identifier (`FFR-208`), the verbatim error disclosure, and backend job and audit
  records. Release one ships no error-boundary failure reference, no operator health view, and no in-product
  support-report path. A client-side failure that produces no backend error therefore leaves nothing to report beyond
  the build identifier, which is an accepted consequence rather than an oversight.

Shared-device handling is mandatory. Logout remains visible. On logout, sign-in expiry, authorization loss, or cookie
rejection,
clear sensitive memory, protected trees, scoped caches, streams, media, object URLs, titles, and history state before
neutral UI. Never persist unsent chat drafts or sensitive account content in browser storage. After reauthentication,
resume authoritative saved session work without duplication. Make no saved or unsaved claim for an unretained ambiguous
local attempt.

A content-free cross-tab security epoch signals logout start, login completion, restricted-stage transition, and
detected account change without carrying account, route, resource, or scope data. Every tab immediately privacy-shields,
aborts protected work, and marks the conjunctive protected-render gate for explicit revalidation. The security companion
owns exact mechanics.

Logout start shields the initiating and live receiving tabs and quiesces known in-flight requests, including login,
MFA completion, and password replacement, until terminal outcome. Local shielding does not revoke cookies.

Product Owner decision, 2026-09-27: the source user instruction was "frontend’s logout requirements shall be revised",
choosing acceptance of the backend's reduced stateless logout guarantee rather than strengthening the backend.
As defined in `mia/docs/product-requirements.md` §Authentication session lifetime and
`mia/api-doc/paths/auth.yaml#/logout`, delayed ordinary and Continue working responses cannot restore usable
authentication, but delayed login, MFA-completion, or password-change responses admitted before logout may restore it.
The owner accepts that there is no server-side per-browser revocation or durable logout guarantee across suspended or
terminated contexts. The former universal no-pre-logout-response guarantee is withdrawn. The security companion owns
quiescence, independent tab confirmation, and explicit reconciliation after a late transition; `BCG-001` remains open
for its remaining transport and evidence gaps and must close before dependent behavior ships.

Owner decision, 2026-10-05 (Story 1-8): lifecycle work for existing auth/Home surfaces is approved under
`mia/docs/api-authentication-and-user-invitation.md` §Session lifecycle and §Error handling. Broader BCG-001 closure,
SSE transport/header obligations, and composite release evidence remain open. Each tab warns from the server-authored
deadlines it last observed; ordinary activity never extends them. The persistent non-modal warning neither moves focus
nor displays a countdown. Only deliberate Continue working sends one bodyless continuation POST. Its response supplies
the renewed idle and unchanged absolute deadline, with no second automatic deadline read. Any unknown outcome,
including undeclared `5xx`, shields immediately and allows only explicit recovery without replay. On observed expiry,
explicit Refresh discovers the current stage and runs the complete ordered gate before protected reveal; renewal in
another tab does not inherently require fresh credentials. Denial clears protected state. Passive activity never makes a
keepalive request. The ordinary warning appears five minutes before the earlier authoritative deadline, or immediately
when a new deadline is already inside that threshold, and uses polite status semantics. The five-minute threshold is a
frontend-owned choice; the deadlines it is measured against are backend-authored and are never computed locally.

At the earlier authoritative idle or absolute deadline, a local privacy shield hides protected content. Clock rollback,
sleep, wake, suspended timers, or delayed callbacks lock rather than extend it. Fresh session and complete access
discovery are required to reveal content; `BCG-001` owns the deadline contract, including the authenticated idle and
absolute expiry instants and the non-refreshing restricted-stage expiry.

Logout confirmation requires known transitions to settle, backend `204`, and subsequent authoritative anonymous
discovery. It confirms the observed state, not permanent cookie revocation or immunity to later transitions. Every tab
checks independently before claiming confirmation. A late transition withdraws current confirmation, retains or
reinstalls the shield, and requires explicit reconciliation. On failure or ambiguity, a blocking privacy screen says
logout is unconfirmed, offers safe explicit CSRF recovery and retry, and gives close-browser or operator guidance
without claiming browser closure revokes authentication. No unsafe request is automatically replayed.

TOTP provisioning data remains route-local after a correctable verification failure while the same authorized pending
enrollment remains valid. Page hide masks setup and suspends copy; return requires fresh authorization before reveal. It
is removed after activation, cancellation, expiry, Reload, departure, authentication change, or unreconcilable
ambiguity.

Mobile verification distinguishes initial create, pre-dispatch failure, ambiguity, provider failure, cooldown, hourly
and daily throttling, verification, five-failure invalidation, expiry, and concurrent invalidation from backend state.
Resend sends the existing code without extending its original expiry and returns neither code nor destination.
`BCG-015` must define whether resend resets or preserves the failure count; the UI never infers or exposes
it. Local receipt-time
inference and stale controls remain blocked.

Protected downloads occur only after explicit activation and fresh scope authorization. They are never prefetched or
reused from authenticated caches. Partial bodies are discarded and object URLs are revoked after use or any boundary
change. Shared-device users are warned that browser-saved files remain outside MIA. Protected printing is suppressed by
default; recovery codes are the only currently approved print view and use codes-only print output.

App-managed fetch/blob transfers abort and discard on security-epoch loss. Explicit browser-managed downloads transfer
control to the browser and cannot be reliably cancelled or erased by MIA; warn before handoff. Inline avatars and course
logos are separately gated authorized images, not downloads. They follow the backend cache-policy dependency and vanish
on denial or epoch change; the security companion owns retrieval detail.

`BCG-014` atomic intent binding applies only to invitation Revoke/Delete faulty, permanent role grant,
course-supervisor removal, membership removal, mentor removal, account deletion, and course deletion. A final reread
alone is not a precondition. Changed or failed preconditions require fresh review and confirmation. Other mutations use
their own blockers and are not blocked by `BCG-014`.

## Localization

Launch catalogs are `en-US`, `de-DE`, `fr-FR`, `pt-PT`, `pt-BR`, `es-ES`, and `es-AR`. Browser negotiation applies
before login, with a visible locale selector. Preferred language applies immediately after login. Unsupported languages
fall back to `en-US`. Other English, German, and French variants use the supported locale for that language. `pt-BR`
remains Brazilian; other Portuguese variants use `pt-PT`. `es-AR` remains Argentinian; other Spanish variants use
`es-ES`.

Localize interface strings, validation, dates, numbers, and frontend explanations. Do not translate backend technical
errors, authored content, course material, or tutor output. Display instants in the viewer's preferred IANA time zone.
Release verification checks catalog completeness and translated-label fit at all three text sizes.

Locale changes atomically update the exact BCP 47 document language and all frontend-owned copy and formatting before
one announcement and deterministic focus restoration. Preserve entered bytes and leave authored, tutor, material, and
raw backend text unchanged. Mark known-language parts, use automatic direction and Unicode isolation around untrusted
text, and keep identifiers, codes, usernames, URLs, and technical details directionally stable. Local-time forms expose
the IANA zone and offset, reject DST gaps, require an offset choice for overlaps, and reconfirm after an authoritative
zone change. Exact transitions are in `FRONTEND-STATE-MACHINES.md`.

## Accessibility

WCAG 2.2 AA is release-blocking. `EXPERIENCE.md` defines keyboard, focus, announcement, reduced-motion, rich-content,
target-size, and text-enlargement behavior; `DESIGN.md` defines visual contrast and inheritance. Standard, Large, and
Extra large built-in text settings are always discoverable and work alongside browser zoom.

Accessibility verification covers every surface, locale, text size, state, dialog, safe-Markdown construct, stream
transition, and destructive confirmation. No action or meaning depends on hidden shortcuts, hover, color, icon, motion,
sound, generated audio, or mascot imagery.

Reduced motion removes smooth scrolling, route and dialog animation, skeleton shimmer, and nonessential status motion
while preserving immediate state and focus changes. MIA does not use flashing content. Avatars and course logos have
empty alternatives when adjacent names provide the same information; otherwise localized functional alternatives come
from authoritative context, never filenames. Any future mascot follows the same rule.

`ACCESSIBILITY-ACCEPTANCE.md` assigns stable `AC-*` requirement IDs and `CP-*` complete-process coverage. Every
applicable WCAG 2.2 A/AA criterion maps to IDs, process states, and evidence; a blocked cell blocks release and never
passes. Coverage includes every release surface, provisioning and membership, supervisor private-material access, and
each complete process at 200% zoom, 320 effective CSS pixels, and 400% zoom.

## Desktop and Platform Scope

Tailwind's default `lg` breakpoint and 1024 CSS pixels are optimization contexts only. Every complete process must
reflow and remain functional at 320 effective CSS pixels and at 1280 CSS pixels with 400% zoom, in Standard, Large, and
Extra large text modes. A larger-window advisory is supplemental and never blocks or reduces functionality. Page-level
horizontal scrolling, clipping, overlap, obscured focus, and hidden actions fail release. Only individually labeled,
intrinsically two-dimensional tables, code, or math may use contained horizontal scrolling.

Phones may receive SMS codes or run an authenticator app while the MIA browser interface remains desktop-oriented.
Release one has no supported or optimized phone-browser workflow. Full-process 320-pixel reflow is an accessibility
requirement, not a phone-support claim.

The client-rendered application uses React 19.3, strict TypeScript, Vite 8, Tailwind CSS 4.3, licensed Tailwind Plus
React components, and Playwright. It inherits Tailwind defaults first. Calm Notebook and Open Desk are selection
criteria, not custom palettes. Release one is light-theme only.

The licensed Tailwind Plus inventory is not yet bound. Before implementation, the frontend team selects and records one
exact available blueprint and variant for every inherited canonical component and verifies paired behavior. This is a
pre-implementation gate; the handoff does not claim exact references already exist.

Release one supports current stable Chrome and Edge and current stable Safari on macOS. A browser/OS pairing is
supported only when manual release evidence records browser and OS versions, date, tester, critical workflows,
accessibility checks, and result. Product Owner Safari evidence is mandatory. Firefox is unsupported but not
proactively blocked.

Playwright E2E uses bundled Chromium on developer macOS. It does not replace required manual evidence for other
supported browser/OS pairings. The accessibility companion owns the evidence matrix.

Intrinsic sizing, reflow, and system-font tolerance are required, but cross-platform rendering remains a documented
residual risk rather than an automated guarantee.

## Performance

Students use school desktop browsers on weak connections, and tutoring streams over SSE, so perceived speed is a
product requirement rather than an optimization concern. The budgets below are release-blocking in the same sense as
the reflow and accessibility bars: a measured regression past a budget fails release.

All budgets are measured against the constrained profile unless stated otherwise. The constrained profile is 1.6
Mbit/s downstream, 750 kbit/s upstream, 150 ms round-trip latency, and a 4× CPU slowdown, applied to a cold cache. It
stands in for a loaded school network and modest school hardware; it is not a claim about any specific deployment.

- `FFR-951` Paint anonymous first contentful content within 2.0 seconds on the constrained profile.
- `FFR-952` Paint authenticated protected content within 4.0 seconds on the constrained profile, measured from
  navigation start through the complete access cycle.
- `FFR-953` Paint a streamed token within 100 milliseconds of its arrival, batching visual updates to at most ten per
  second so that streaming never fights stable reading.
- `FFR-954` Keep interaction latency at or below 200 milliseconds on a transcript of 200 turns.
- `FFR-955` Keep initial route JavaScript at or below 250 kilobytes compressed.
- `FFR-956` Update upload progress at least once per second while bytes are moving, so a healthy transfer never appears
  stalled.

The 250-kilobyte ceiling in `FFR-955` and the 4.0-second target in `FFR-952` are chosen rather than derived. Revise
them against measured evidence once the licensed component inventory is bound and a representative deployment exists;
`FFR-951`, `FFR-953`, `FFR-954`, and `FFR-956` follow from perception thresholds and from contracts stated elsewhere in
this document.

Exceeding a budget is a state, not a silent degradation. Long-running work already carries truthful state and a
last-checked time; a stream that has not begun within the `FFR-953` envelope shows waiting rather than implying
progress, and never fabricates a percentage.

## Test and Verification Model

### Automated

- Component tests cover authorization-driven visibility, field preservation, state rendering, and destructive friction.
- Integration tests exercise implemented OpenAPI contracts with local backend or protocol fakes, never paid providers.
- Playwright's bundled Chromium on developer macOS covers the four key flows `KF-1` through `KF-4` defined in
  `REQUIREMENT-FLOW-MATRIX.md`, plus the `CP-01` and `CP-02` authentication and shared-device recovery processes.
- Playwright uses isolated contexts and reusable fixtures for multi-role and cross-device scenarios.
- Accessibility automation and manual evidence follow the complete `ACCESSIBILITY-ACCEPTANCE.md` matrix.
- Localization checks require complete catalogs and render each launch locale at Standard, Large, and Extra large.
- Reflow tests exercise every complete process at 320 effective CSS pixels and 1280 pixels with 400% zoom across all
  three built-in text modes.
- Authentication tests cover password managers, paste, autocomplete, reveal state, one native full-code MFA input, and
  manual TOTP setup.
- Security tests follow `SECURITY-PRIVACY-ACCEPTANCE.md`, including network non-fetch assertions and secret teardown.
- Resilience tests cover reload, Back and Forward, SSE reconnect, duplicate transport retry, offline return, stale
  sign-in state, tab return, BFCache restore, logout failure, and explicit revalidation through
  `FRONTEND-STATE-MACHINES.md`.
- Performance tests assert every budget in the Performance section against the constrained profile, including cold
  anonymous paint, authenticated paint through the access cycle, streamed-token paint latency and update batching,
  interaction latency at 200 transcript turns, and initial route bundle size.

### Manual

- Product Owner manually tests current stable Safari and records findings as bugs or change requests.
- Manual assistive-technology and keyboard checks produce the evidence required by the accessibility contract.
- Manual visual checks cover zoom, 320-pixel reflow, text sizes, translations, and system-font variation.
- Manual browser evidence records the browser/OS version, date, tester, critical workflows, accessibility checks, and
  result for every supported pairing.
- Manual security review confirms raw backend body display excludes headers, cookies, tokens, and sensitive data.
- Manual content review covers stochastic tutor praise, safeguarding language, and no false monitoring claims.

Automated frontend checks do not call production or paid providers. Backend acceptance scenarios remain the
product-level gate; frontend scenarios demonstrate that the browser exposes them safely and accurately.

## Release Priorities

### Priority 0: Contract and Safety Foundations

Accepted backend-gap closure, exact Tailwind Plus blueprint binding, OpenAPI integration, session and CSRF handling,
authorization-safe routing, localization, accessible shell, shared-device containment, error disclosure, safe Markdown,
explicit revalidation, and test harnesses.

`BCG-001` is the widest blocker in the ledger and gates more of this priority than its one-line mention suggests. It
blocks the complete authentication journey — cold start, login, invitation preview and acceptance, password recovery,
password reset, MFA continuation, required password replacement, reload, history restoration, and safe logout recovery
— and therefore transitively gates every protected surface, because no protected mount can complete its access cycle
without authoritative session discovery. No route exists around it: it sits at the application entry point.

Work that remains fully buildable while `BCG-001` is open: localization and locale negotiation, the accessible shell
and navigation chrome, exact Tailwind Plus blueprint binding, safe Markdown and sanitizer selection, reflow and
text-size behavior, the error-disclosure region, and component-level work against protocol fakes. Authentication and
every protected surface may be built as unwired presentation only, which defers the authorization and state risk rather
than retiring it. Epic sequencing should assume that a value-delivering epic is not completable until `BCG-001`
closes.

### Priority 1: Core Value

Authentication, course preparation, material processing and approval, course readiness, tutoring start and workspace,
SSE recovery, finish, completed transcript, and summary states.

### Priority 2: Required Supporting Scope

Student provisioning and oversight, profile and MFA, private material, speech, mentoring lifecycle, invitations,
role and course administration, jobs, audit, and destructive lifecycle operations.

Priority expresses UX refinement and delivery sequence, not permission to omit confirmed release-one behavior.

Release scheduling and the decision to cut a release happen outside this repository and belong to the repository owner.
This document defines what release one contains and in what order the work lands; it does not define when a release
ships, who approves it, or what is traded if a date is at risk.

## Acceptance-Scenario Foundation

Feature stories should derive frontend scenarios from backend `AS-1` through `AS-32` and the UX scenarios below.
Backend `AS-*` identifiers belong to the backend PRD, which is subordinate to `mia/docs/product-requirements.md` on
conflict. `REQUIREMENT-FLOW-MATRIX.md` is the release traceability source and must leave no source requirement unmapped.

The protagonists below are the key-flow actors defined in `REQUIREMENT-FLOW-MATRIX.md`: Pablo is the student of `KF-1`,
Elena the supervisor of `KF-2`, Rosa the mentor of `KF-3`, and Diego the administrator of `KF-4`.

- `UXS-01` Pablo completes a second tutoring session without human interface guidance using free text or static
  starters.
- `UXS-02` Pablo loses SSE, reloads, closes the browser, or changes device and resumes authoritative saved work without
  duplication; an unretained ambiguous attempt receives no saved or unsaved claim.
- `UXS-03` Shared-device logout or sign-in expiry clears sensitive frontend state while server-side tutoring work
  remains recoverable.
- `UXS-04` Elena prepares and activates English from a hub that exposes and links every prerequisite without a
  separate manual.
- `UXS-05` Technical material readiness and educational approval never appear as one state.
- `UXS-06` Editing a validated approved brief meaningfully revokes approval; unchanged content does not appear changed.
- `UXS-07` Rosa schedules an external meeting with clear time-zone context and only authorized briefing data.
- `UXS-08` Diego completes or is safely blocked from consequential administration with state unchanged on failure.
- `UXS-09` Every backend error can show localized explanation, exact HTTP status, and complete escaped response body
  safely.
- `UXS-10` Every launch locale and text size preserves all actions, focus, labels, dialogs, and state distinctions.
- `UXS-11` Raw or partial tutor Markdown cannot execute HTML, scripts, forms, media, remote images, or model-defined
  controls.
- `UXS-12` Tab return, reconnection, mutation, surface entry, and Refresh status revalidate without continuous global
  polling.
- `UXS-13` Every complete process remains functional at 320 effective CSS pixels in every built-in text mode.
- `UXS-14` Authentication remains completable with password managers, paste, correct autocomplete, and manual TOTP
  setup.
- `UXS-15` BFCache restore, scope loss, and failed logout expose no protected content before authoritative resolution.
- `UXS-16` Forbidden supervisor and mentor data is not fetched, prefetched, cached, logged, or hidden in the DOM.
- `UXS-17` A student sees who can read the session and when, and a supervisor sees why active chat is not shown,
  without either statement implying monitoring, alerting, or a human response.

Each scenario must include authorized success, validation failure, backend failure, stale authorization, offline or
reconnection behavior where applicable, keyboard completion, and relevant assistive-technology announcements.

## Backend and OpenAPI Dependencies

- Every accepted blocker, affected frontend slice, forbidden workaround, and unblock criterion in
  `BACKEND-CONTRACT-GAPS.md`, including `BCG-007` for bounded and safe complete error-body disclosure.
- Concrete operations, schemas, relationships, security stages, CSRF rotation, pagination, filters, sorts, and bounds.
- Stable error codes and safe mapping to localized explanations without changing raw response-body disclosure.
- Post-invitation-acceptance state and navigation.
- Authoritative current-session discovery and all request-ID replay contracts.
- SSE queued snapshots, event schema, reconnect behavior, and terminal authoritative content.
- Long-running material, summary, speech, invitation, and job states plus retry eligibility.
- Capability and resource representations needed to build navigation without role-only authorization guesses.
- Optional-provider availability and the exact operation-level state exposed to the frontend.
- Course readiness and activation-blocker representation without client-side reconstruction of backend rules.
- Time input and output schemas for mentoring and all supported IANA time-zone values.
- Authoritative mentor-completion eligibility and any server-provided eligibility recheck instant.
- Supervisor-safe exact-ID registered-staff resolution for direct mentor-role grant without an account directory.

`BACKEND-CONTRACT-GAPS.md` owns evidence and unblock criteria for accepted blockers. Remaining bullets are ordinary
dependencies, not permission to invent transport. The implemented OpenAPI contract resolves them.

## Deferred Backlog

- Age-adaptive student presentation based on optional `year_of_birth`; release one has no age differentiation.
- Structured tutor-supplied answer choices using a future bounded trusted backend schema; release one has none.
- Dark theme, phone-browser workflows, custom breakpoints, and automated non-macOS browser execution.
- Mascot implementation unless an age-inclusive, cross-locale concept is validated and approved.
- UX refinement beyond functional consistency for administration and mentoring.

## Glossary

Role vocabulary (administrator, supervisor, mentor, student, operator) follows the backend exactly and is defined in
`mia/docs/product-requirements.md`. The terms below are coined by the frontend contracts and carry precise meaning.

- AI tutor — the model-driven tutoring behavior. Not a user role and never an authorizing party.
- Privacy shield — a content-free barrier installed before protected content can be painted or restored. Not a visual
  overlay on rendered content: the protected content must not exist behind it.
- Security epoch — a content-free cross-tab signal marking logout start, login completion, restricted-stage
  transition, or detected account change. It carries no account, route, resource, or scope data.
- Revalidation needed — a local mark that the protected-render gate must be re-satisfied before content is shown.
  Marking it sends no request.
- Restricted stage — the `mfa` or `password-change` login stage. Renders only its focused flow plus logout.
- Non-refreshing check — a read that returns authoritative state without resetting the server-side idle deadline.
  Owned by `BCG-001`.
- Access cycle — the ordered protected-mount gate: session stage, then account capability and scope, then route
  resource, then dependent data.
- Stable-reading mode — a student-controlled mode that pauses visual transcript updates while tutor work continues,
  buffers content, and reconciles on explicit resume. Owned by `ACCESSIBILITY-ACCEPTANCE.md` `AC-013`.
- Static starter — frontend-owned localized prompt text that inserts editable text or guides the next step. Never
  model-supplied and never auto-submitting.
- Existence-hiding — one fixed presentation for unknown, out-of-scope, ineligible, revoked, and throttled causes,
  indistinguishable in copy, focus, actions, URL, title, announcement, and timing.
- Readiness — technical material processing state. Never merged with approval.
- Approval — educational sign-off on a processed brief by an authorized supervisor. Never merged with readiness.
- Brief — the generated, correctable summary of a processed material file.
- Briefing — the compact authorized data packet a mentor receives for one request. Unrelated to a brief.
- Sign-in expiry — authentication session expiry, idle or absolute. Never used for tutoring sessions, which do not
  expire.

## Resolved Questions

Both former Open Questions were resolved by
`_bmad-output/planning-artifacts/architecture/architecture-mia-frontend-2026-09-15/ARCHITECTURE-SPINE.md`.

1. OpenAPI client generation and runtime validation — resolved by `AD-2`: dev-time wire types generated with
   `openapi-typescript`, one hand-written client core, and per-operation zod boundary schemas compile-checked against
   the generated types.
2. Safe Markdown, sanitizer, and local math libraries versus CSP — resolved by `AD-6` and `AD-15`: `react-markdown`
   AST pipeline rendering directly to React elements (no HTML string stage), table-only GFM extension, `remark-math` +
   `rehype-katex` with self-hosted KaTeX, and a product-owner-approved `style-src-attr 'unsafe-inline'` CSP relaxation
   for KaTeX output.
