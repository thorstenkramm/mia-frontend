---
id: SPEC-mia-frontend
companions:
  - ../../planning-artifacts/architecture/architecture-mia-frontend-2026-09-15/ARCHITECTURE-SPINE.md
  - ../../planning-artifacts/ux-designs/ux-mia-frontend-2026-09-12/FRONTEND-PRD-FOUNDATION.md
  - ../../planning-artifacts/ux-designs/ux-mia-frontend-2026-09-12/EXPERIENCE.md
  - ../../planning-artifacts/ux-designs/ux-mia-frontend-2026-09-12/ROUTE-INVENTORY.md
  - ../../planning-artifacts/ux-designs/ux-mia-frontend-2026-09-12/DESIGN.md
  - ../../planning-artifacts/ux-designs/ux-mia-frontend-2026-09-12/FRONTEND-STATE-MACHINES.md
  - ../../planning-artifacts/ux-designs/ux-mia-frontend-2026-09-12/SURFACE-STATE-MATRIX.md
  - ../../planning-artifacts/ux-designs/ux-mia-frontend-2026-09-12/ACCESSIBILITY-ACCEPTANCE.md
  - ../../planning-artifacts/ux-designs/ux-mia-frontend-2026-09-12/SECURITY-PRIVACY-ACCEPTANCE.md
  - ../../planning-artifacts/ux-designs/ux-mia-frontend-2026-09-12/BACKEND-CONTRACT-GAPS.md
sources: []
---

> **Canonical contract.** This SPEC and the files in `companions:` are the complete, preservation-validated contract
> for what to build, test, and validate. Source documents listed in frontmatter are for traceability — consult them
> only if you need narrative rationale or prose color this contract intentionally omits.

# MIA Frontend — Release One

## Why

A vision to realize with a mandate's rigor: MIA's self-hosted, curriculum-aligned AI tutoring platform has a complete
backend and no frontend. Students (often minors), mentors, supervisors, and administrators need one desktop-browser SPA
that makes backend truth legible — never implying processing, delivery, authorization, or saving before the backend
confirms it. The planning package is complete; this spec binds it to the architecture spine so stories can cite stable
`FFR`, `AD`, `UXS`, and `AC` IDs.

## Capabilities

- **CAP-1** Identity, authentication, and recovery (`FFR-101..118`)
  - **intent:** Users sign in with MFA and recovery paths, complete forced password replacement, accept invitations,
    and manage profile security; restricted stages show only their focused flow plus logout.
  - **success:** Every authentication process is completable keyboard-only with password managers and manual TOTP;
    restricted stages leak no application navigation or protected data (`UXS-14`, `UXS-03`).

- **CAP-2** Home and unified navigation (`FFR-201..208`)
  - **intent:** One capability-driven shell with a continuation-first Home (max five items) and stable URLs; a build
    identifier readable without authentication.
  - **success:** Multi-role accounts get one union Home with no role switcher; Back/Forward/Reload always work.

- **CAP-3** Course administration and preparation (`FFR-301..305`)
  - **intent:** Administrators create courses; supervisors prepare and activate them through a non-linear hub exposing
    every prerequisite.
  - **success:** A supervisor activates a course without external documentation (`UXS-04`); drafts show no completion
    percentage.

- **CAP-4** Material and files (`FFR-401..405`)
  - **intent:** Course-wide and student-private materials move through draft, upload, finalize, processing, brief
    correction, approval, authorized download, and deletion.
  - **success:** Readiness and approval are never rendered as one state (`UXS-05`); formats and limits are declared
    before upload; Finalize is explicit and irreversible.

- **CAP-5** Students and oversight (`FFR-501..506`)
  - **intent:** Supervisors provision and support students (roster, recovery, MFA reset, ban), inspect private
    material, see session status, and review completed transcripts with summary correction.
  - **success:** Exact-username enrollment returns one uniform ineligible result; active chats stay hidden until
    completion with the visibility statement present (`UXS-17`).

- **CAP-6** Tutoring and learning history (`FFR-601..613`)
  - **intent:** A student runs one active session — start, streamed responses, queue, stop, explicit retry,
    reconnection, finish — and reviews completed transcripts, summaries, and follow-ups.
  - **success:** A second session completes independently (`UXS-01`); recovery never duplicates work (`UXS-02`);
    tutor Markdown cannot execute anything (`UXS-11`); Finish enables only from backend eligibility.

- **CAP-7** Mentoring (`FFR-701..705`)
  - **intent:** The full request → triage → assignment → response → scheduling → external meeting → completion
    lifecycle, plus permanent mentor-role grant by exact user ID.
  - **success:** Mentors see only the compact authorized briefing; completion is gated on the server-evaluated allowed
    action, never a local clock (`UXS-07`).

- **CAP-8** Administration and operations (`FFR-801..804`)
  - **intent:** Paginated list and detail surfaces for accounts, invitations, courses, durable jobs, and audit.
  - **success:** Only OpenAPI-supported filters, sorts, and actions appear; consequential actions live off list rows;
    no bulk destructive actions exist (`UXS-08`).

- **CAP-9** Localization
  - **intent:** The full interface ships in `en-US`, `de-DE`, `fr-FR`, `pt-PT`, `pt-BR`, `es-ES`, `es-AR` with
    negotiation, fallback, and atomic locale change; backend, authored, and tutor text stay untranslated.
  - **success:** Catalogs are complete and labels fit at all three text sizes in every locale (`UXS-10`).

## Constraints

- The implemented OpenAPI contract owns all transport; a missing operation or field blocks the story — no client-side
  assumption, probing, or enumeration.
- Backend truth only: no optimistic updates; destructive mutations update the UI only after definitive success; no
  automatic replay of any unsafe request, ever.
- The ordered access gate (session stage → capability + scope → route resource → dependent data), one fixed
  existence-hiding presentation, 30-minute idle / 12-hour absolute per-tab expiry, and the privacy shield are
  non-negotiable; lifecycle events never act as keepalive.
- No browser persistence of protected content or secrets; no analytics, telemetry, remote fonts, or remote scripts;
  light theme only; model output is untrusted text rendered solely through the locked boundary.
- Logout follows the 2026-09-27 owner decision in `FRONTEND-PRD-FOUNDATION.md` and the security companion's
  §Logout and Privacy Screen: the backend's reduced stateless guarantee is accepted, including possible restoration by
  delayed authentication transitions. Local shielding is not cookie revocation; confirmation and explicit reconciliation
  follow those companions. BCG-001 remains open for its remaining obligations.
- Release-blocking gates: full WCAG 2.2 AA matrix, 320 px reflow and 400 % zoom in all three text modes, performance
  budgets `FFR-951..956` on the constrained profile, keyboard-only authentication, manual Safari evidence.
- The stack is fixed by `.agents/rules/techstack.md`; the architecture is fixed by `ARCHITECTURE-SPINE.md`
  (`AD-1..AD-15`) — stories cite `AD-n` IDs. Tailwind Plus blueprint binding is a pre-implementation gate per
  `DESIGN.md`.
- Open `BACKEND-CONTRACT-GAPS.md` entries block the stories that need them; `BCG-001` gates the authentication journey
  and must close before release.
- Owner-approved partial-entry decision, 2026-09-27: Story 1-2 may wire only the documented cold-entry sequence of
  `GET /api/v1/auth/session`, followed only for `authenticated` by `GET /api/v1/users/me/capabilities`, and dispatch
  `/login`, `/`, `/auth/mfa`, and `/auth/password-change`. The same approval includes restricted-stage logout at
  `/auth/logout`: one explicit CSRF-protected `POST /api/v1/auth/logout`, safe CSRF recovery for an explicit retry, and
  independent anonymous confirmation or reconciliation behind the privacy shield. That Story 1-2 approval does not close BCG-001 or
  BCG-003, authorize credentials, restricted forms, broader logout/lifecycle behavior, Home features, BFCache behavior,
  or waive their remaining release evidence.
- Owner-approved login alignment, 2026-09-30: Story 1-3 follows the existing backend authentication flow, with the exact
  conditional slice recorded in `BACKEND-CONTRACT-GAPS.md` §BCG-001 Story 1-3 login-slice decision. Login has no
  server-side request-ID/idempotency requirement; any attempt correlation is client-local only, with nothing added to
  the wire and no replay guarantee. A definitive current login response supplies the authoritative stage directly;
  `authenticated` then passes the capability/scope gate, while restricted stages remain isolated. Discovery serves
  entry, reload, and permitted reconciliation, not a redundant mandatory check after definitive login success.
  Existing CSRF rotation, transition serialization, response fencing, and approved logout ordering still apply.
  The operation-level login internal-error response correction was rechecked at `mia/api-doc/paths/auth.yaml:30`, so
  this slice may proceed. The approval preserves the Story 1-2 exception and leaves unrelated gaps and release evidence
  open.
- Owner-approved MFA alignment, 2026-10-01: Story 1-4 may implement only the two documented login-challenge completion
  mutations and `/auth/mfa` plus `/auth/mfa/recovery` under `Restricted(mfa)`, as recorded in
  `BACKEND-CONTRACT-GAPS.md` §BCG-001 Story 1-4 MFA-slice decision. The challenge is method-neutral and has no Resend;
  recovery input is normalized to the exact wire pattern before dispatch. Returned `password-change` and
  `authenticated` stages continue through the existing restricted placeholder or capability gate respectively. This
  approval does not authorize password replacement, recovery, invitations, broader lifecycle work, or close BCG-001 or
  BCG-003.

## Non-goals

- No public sign-up, guardian accounts, age verification, consent flows, data export, or in-product privacy/terms
  surfaces.
- No dark theme, phone workflows, native app, offline mode, or service worker for authenticated content.
- No gamification, rankings, streaks, analytics dashboards, activity feeds, or notification center.
- No model-defined controls, dynamic tutor answer buttons, hidden reasoning, or fabricated generation progress.
- No live mentoring chat, audio, video, recording, or attendance tracking.
- No session Discard/Cancel/Delete, staff force-completion, or tutoring inactivity expiry.
- No global student directory, bulk destructive actions, generic job retry, or ready-material source editing.
- No remote session list or revocation, browser keepalive, or live sign-in-expiry countdown.
- No usability gate, pilot cohort, telemetry, session replay, or third-party error reporting.

## Success signal

Release one ships when the `UXS-01..17` scenarios pass — each covering success, validation failure, backend failure,
stale authorization, offline return, keyboard completion, and AT announcements — under the automated model (component,
integration against protocol fakes, Playwright Chromium, accessibility and security suites, performance budgets) plus
the mandatory manual Safari, assistive-technology, and content evidence. The two flagship demonstrations: a supervisor
activates a course without a manual, and a student completes a second tutoring session independently.

## Open Questions

- `BCG-001`, `BCG-007`, `BCG-012`, `BCG-014`, `BCG-015`, `BCG-016`, `BCG-017` are open backend dependencies
  (authoritative status in `BACKEND-CONTRACT-GAPS.md`); work needing them is blocked, not assumed.
- BCG-001 and BCG-003 remain open after the owner-approved Story 1-2 entry slice; the exact partial exception is recorded
  under Constraints and in `BACKEND-CONTRACT-GAPS.md` and must not be generalized to their deferred obligations.
- Story 1-3's request-ID interpretation, direct-success stage dispatch, and login internal-error response are resolved;
  Story 1-4's method-neutral challenge, no-Resend decision, and recovery normalization are resolved. The broader
  BCG-001 obligations remain open and are not part of either narrow approval.
- The exact Tailwind Plus component-to-blueprint binding is pending — a pre-implementation gate before UI stories.
