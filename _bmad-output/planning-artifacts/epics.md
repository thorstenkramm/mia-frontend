---
stepsCompleted: ['step-01', 'step-02', 'step-03']
inputDocuments:
  - _bmad-output/planning-artifacts/ux-designs/ux-mia-frontend-2026-09-12/FRONTEND-PRD-FOUNDATION.md
  - _bmad-output/planning-artifacts/architecture/architecture-mia-frontend-2026-09-15/ARCHITECTURE-SPINE.md
  - _bmad-output/planning-artifacts/ux-designs/ux-mia-frontend-2026-09-12/DESIGN.md
  - _bmad-output/planning-artifacts/ux-designs/ux-mia-frontend-2026-09-12/EXPERIENCE.md
  - _bmad-output/planning-artifacts/ux-designs/ux-mia-frontend-2026-09-12/ROUTE-INVENTORY.md
  - _bmad-output/planning-artifacts/ux-designs/ux-mia-frontend-2026-09-12/FRONTEND-STATE-MACHINES.md
  - _bmad-output/planning-artifacts/ux-designs/ux-mia-frontend-2026-09-12/SURFACE-STATE-MATRIX.md
  - _bmad-output/planning-artifacts/ux-designs/ux-mia-frontend-2026-09-12/ACCESSIBILITY-ACCEPTANCE.md
  - _bmad-output/planning-artifacts/ux-designs/ux-mia-frontend-2026-09-12/SECURITY-PRIVACY-ACCEPTANCE.md
  - _bmad-output/planning-artifacts/ux-designs/ux-mia-frontend-2026-09-12/BACKEND-CONTRACT-GAPS.md
  - _bmad-output/planning-artifacts/ux-designs/ux-mia-frontend-2026-09-12/REQUIREMENT-FLOW-MATRIX.md
  - _bmad-output/specs/spec-mia-frontend/SPEC.md
---

# mia-frontend - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for mia-frontend, decomposing the requirements from the
PRD, UX Design if it exists, and Architecture requirements into implementable stories.

Requirement IDs are preserved from their owning documents (`FFR-nnn` from the PRD, `AD-n` from the architecture spine,
`UX-DRn` extracted from DESIGN.md/EXPERIENCE.md, `CAP-n` from SPEC.md, `AC-*`/`CP-*` from ACCESSIBILITY-ACCEPTANCE.md,
`BCG-*` from BACKEND-CONTRACT-GAPS.md). Stories cite these IDs; this document never renumbers them.

## Requirements Inventory

### Functional Requirements

Identity, Authentication, and Recovery:

- FFR-101: Username/password login, MFA challenge and recovery-code paths, required password replacement, logout, uniform staff password recovery, token-based reset, invitation preview and acceptance, profile and security management.
- FFR-102: Authentication is one focused sequence; MFA precedes temporary-password replacement when both apply.
- FFR-103: A restricted stage renders only its focused flow plus logout — no application navigation, protected title, breadcrumb, cached account name, or protected prefetch.
- FFR-104: Throttled and temporarily blocked are first-class authentication states; displayed wait derives only from `Retry-After`.
- FFR-105: Never compute, extrapolate, or count down a throttle locally; never disclose which limit was reached or attempts remaining.
- FFR-106: Support password managers, autofill, and paste with correct autocomplete purposes at every stage.
- FFR-107: Password reveal has an accessible name and state.
- FFR-108: MFA codes enter one native text input holding the full pasteable value.
- FFR-109: TOTP enrollment provides a QR image and selectable issuer, account, and manual setup information derived locally from the provisioning URI.
- FFR-110: Every authentication process is completable by keyboard alone (release-blocking).
- FFR-111: Canonical `/profile` serves every authenticated account through the complete capability and scope gate.
- FFR-112: Student-only accounts get a read-only self-profile with no edit control, writable form state, or profile mutation.
- FFR-113: Staff accounts edit only the product-authorized staff subset; staff-only child routes are capability-gated.
- FFR-114: Before application rendering or optional scripts, synchronously read an invitation or reset fragment once and remove every known, unknown, malformed, or duplicate fragment with `history.replaceState`.
- FFR-115: A canonical valid token lives only in one ephemeral flow object.
- FFR-116: Invitation acceptance uses invitation-specific language, exposes only the invited role, and distinguishes submitting, pre-dispatch failure, definitive rejection, outcome unknown, and consumed-token ambiguity.
- FFR-117: Never replay invitation acceptance automatically; never claim account or session creation.
- FFR-118: After invitation ambiguity, offer explicit sign-in and reopening the original email link as safe next actions while stating neither proves the prior outcome.

Home and Unified Navigation:

- FFR-201: One capability-driven shell and a single Home continuation surface.
- FFR-202: Home orders continuation first (one resumable item leads: active tutoring session, else backend-reported current draft/upload), then blocked-on-this-user items in backend-supplied order, and nothing else.
- FFR-203: At most five Home items, each linking to its owning list; overflow only through that list; no show-more, pagination, or infinite scroll.
- FFR-204: Duplicate no list onto Home, invent no metric, render no counter, streak, score, or activity feed.
- FFR-205: With no resumable and no blocked work, an empty Home explains authoritative absence with at most one currently authorized next action.
- FFR-206: A multi-role account resolves to one ordered Home across the union of its capabilities; never split by role or present a role switcher.
- FFR-207: Stable URLs, parent routes, Back, Forward, and Reload are supported.
- FFR-208: A build identifier readable without authentication identifies the exact deployed frontend build, carrying no account, route, resource, or environment data.

Course Administration and Preparation:

- FFR-301: Administrator course creation with at least one supervisor.
- FFR-302: Supervisor preparation through a non-linear hub exposing and linking every activation prerequisite without external documentation.
- FFR-303: Course details, curriculum, learning goals, AI instructions, language, logo, readiness, activation, deactivation, supervisor relationships, and deletion where authorized.
- FFR-304: Every preparation field has a persistent label, helper text wherever a bound applies, revealable examples, supplemental tooltips, colocated validation, exact preview, and confirmed code-point and byte feedback.
- FFR-305: No completion percentage, progress score, or other evaluation of incomplete draft work.

Material and Files:

- FFR-401: Course-wide and student-private material creation, file drafts, upload review, finalization, processing, failure recovery, brief display and correction, approval where applicable, authorized download, and deletion.
- FFR-402: Supported formats and current operator limits are declared before upload.
- FFR-403: Picker and drag-and-drop, per-file progress, mixed-format prevention, recoverable drafts, file-list review, and an irreversible Finalize and process action.
- FFR-404: State that MIA does not scan for malware and does not fetch external material links.
- FFR-405: Never render technical readiness and educational approval as one state.

Students and Oversight:

- FFR-501: Separate Create new student from Add existing student.
- FFR-502: Existing enrollment accepts one exact username, with no global search or autocomplete, and returns a uniform ineligible result.
- FFR-503: The supervisor chooses the temporary password (backend never returns it); never retain, restore, or auto-copy it; state it must be communicated outside MIA.
- FFR-504: Scoped roster, profile, membership, recovery, MFA reset, ban, private-material inspection, session status, completed transcript, used material, and summary-correction surfaces per backend authorization.
- FFR-505: Active chat content stays hidden from supervisors until completion.
- FFR-506: Every supervisor surface exposing session status states that active chat content is not visible until the student finishes.

Tutoring and Learning History:

- FFR-601: Joined-course choice, optional material choice, localized static starters, free-form intent, one active session, safe rich transcript, composer, queue, streaming, stop, explicit retry, reconnection, finish, completed transcript, summary and follow-up, used material, and optional generated speech.
- FFR-602: Never present a tutoring session as expired, stale, or lost; never offer to restart or clean up an idle session.
- FFR-603: No Discard, Abandon, Cancel session, or Delete session control; finishing is the student's only way to end a session.
- FFR-604: No force-completion on any supervisor, mentor, or administrator surface; only the owning student may finish.
- FFR-605: The Finish control's enabled state derives from backend eligibility; never enabled optimistically while a response is generating or queued.
- FFR-606: The speech-unavailable state never implies a self-service fix.
- FFR-607: Transcript turns and response attempts retain stable DOM identity.
- FFR-608: Focus and reading position are preserved through streaming and terminal reconciliation; auto-scroll only when already at the end, otherwise a visible keyboard-reachable control leads to unseen content.
- FFR-609: Stable-reading mode pauses visual updates while tutor work continues, buffers content, and reconciles on explicit resume.
- FFR-610: No dynamic tutor answer buttons in release one; the API streams unstructured text.
- FFR-611: Frontend-owned static starters cover homework help, topic practice, explanation, exam preparation, and a free-form question; each inserts editable text or guides the next step and never submits automatically.
- FFR-612: Free text stays available at all times.
- FFR-613: The tutoring workspace persistently states that MIA is AI-powered, no person is watching live, and an assigned supervisor can read the session once finished — fixed product copy in every launch locale.

Mentoring:

- FFR-701: The complete request, triage, assignment, response, scheduling, rescheduling, cancellation, reassignment, mentor-removal, external-meeting, and completion lifecycle.
- FFR-702: New-request actions hide when unavailable while authorized existing work is retained.
- FFR-703: Mentors receive only the compact authorized briefing defined in `EXPERIENCE.md`.
- FFR-704: Mentor completion is gated on a server-evaluated allowed action, any server-provided recheck instant, fresh prevalidation, and explicit unknown-outcome reconciliation under `BCG-016`; never a local clock or mutation probing.
- FFR-705: A separate supervisor flow grants the permanent mentor role to a registered staff account by exact user ID, without the administrator account collection (blocked by `BCG-017`; `BCG-014` binds the reviewed target state).

Administration and Operations:

- FFR-801: Conventional paginated lists and detail pages for accounts, invitations, courses, durable jobs, and audit records.
- FFR-802: Only OpenAPI-supported filters, sorts, actions, and retry paths.
- FFR-803: Permanent roles are distinguished from scoped assignments.
- FFR-804: Consequential actions stay off list rows; no bulk destructive action.

### NonFunctional Requirements

Performance (constrained profile: 1.6 Mbit/s down, 750 kbit/s up, 150 ms RTT, 4× CPU slowdown, cold cache; all release-blocking):

- FFR-951: Anonymous first contentful paint within 2.0 s.
- FFR-952: Authenticated protected content painted within 4.0 s from navigation start through the complete access cycle.
- FFR-953: A streamed token painted within 100 ms of arrival, batching visual updates to at most ten per second.
- FFR-954: Interaction latency at or below 200 ms on a 200-turn transcript.
- FFR-955: Initial route JavaScript at or below 250 KB compressed.
- FFR-956: Upload progress updates at least once per second while bytes move.

State and integration contract (PRD, unnumbered — line references preserved):

- NFR-1: Render only authoritative persisted or streamed states — no inferred success, invented totals, unsupported filters, or merged domain states (L347-349).
- NFR-2: Lifecycle events (tab return, online, focus, visibility, `pageshow`, transport loss) only mark revalidation needed; no authenticated request, polling, or keepalive (L349-351).
- NFR-3: Every protected entry path passes the neutral access-checking state and the conjunctive ordered gate; stale reads never replace newer state; scope loss purges dependent protected state first (L353-356).
- NFR-4: `pagehide` installs a content-free privacy shield before a protected document can enter BFCache; persisted `pageshow` revalidates behind the retained shield (L358-360).
- NFR-5: No automatic unsafe replay — after timeout, network loss, abort, 401, 403, `csrf_invalid`, tab return, or token rotation; request-ID idempotency creates no exception (L368-371).
- NFR-6: SSE: 1/2/4 s reconnect-availability delays but never an auto-opened replacement EventSource; snapshot before events; no duplicated provider request; stream health derives from the backend heartbeat contract, not local timing (L377-386).
- NFR-7: Per-tab idle baseline counts only user-initiated authenticated requests; never infer a server deadline from stream activity (L388-394).
- NFR-8: Every backend error shows a localized explanation plus collapsed, selectable, never-live-announced technical details with exact HTTP status and complete verbatim escaped raw body; copy carries a review-before-sharing warning (L401-413).
- NFR-9: OpenAPI owns all transport; absent operations block the story; no cookie inspection, guessed route, denial probing, enumeration, null-state inference, protected prefetch, or trial request (L434-443).

Security, privacy, and safety (PRD, unnumbered):

- NFR-10: Never log, persist, or expose passwords, MFA values, recovery codes, tokens, cookies, prompts, message bodies, provider payloads, or authorization headers; `__Host-mia_csrf` is the sole readable-cookie exception (L447-451).
- NFR-11: Unsafe requests carry `X-CSRF-Token` including unauthenticated endpoints; the value rotates on login, logout, and stage transitions and is never cached across rotation (L452-454).
- NFR-12: Never overfetch-and-hide; a forbidden field must not enter network traffic, memory, caches, accessibility trees, or the DOM; never prefetch protected resources (L457-462).
- NFR-13: Existence-hiding is one fixed presentation — unknown, out-of-scope, ineligible, revoked, and throttled indistinguishable in copy, focus, actions, URL, title, announcement, and timing (L463-468).
- NFR-14: Never claim local-only processing, malware scanning, copyright validation, consent, age verification, retention windows, human monitoring, alerting, or an emergency channel (L469-486).
- NFR-15: No analytics, telemetry, session replay, third-party error SDK, remote font, or remote script (L487).
- NFR-16: Shared-device containment: on logout, expiry, authorization loss, or cookie rejection clear sensitive memory, protected trees, scoped caches, streams, media, object URLs, titles, and history state before neutral UI; never persist unsent drafts or sensitive content in browser storage (L493-498).
- NFR-17: A content-free cross-tab security epoch signals auth transitions; every tab immediately privacy-shields, aborts protected work, and marks the gate for explicit revalidation; logout quiesces authenticated requests until terminal outcome (L500-507).
- NFR-18: Per-tab idle warning appears five minutes before the earlier backend-authored deadline, moves no focus, states no remaining time; Continue working makes one explicit auth-session request; the privacy shield replaces protected content at the deadline; clock manipulation locks rather than extends (L509-524).
- NFR-19: Logout is complete only after backend success and authoritative anonymous discovery; on failure a blocking privacy screen states logout unconfirmed with safe retry and guidance (L526-528).
- NFR-20: TOTP provisioning data stays route-local, masks on page hide, requires fresh authorization on return, and is removed on terminal events (L530-533).
- NFR-21: Mobile verification renders only backend-derived states; resend returns neither code nor destination; no local receipt-time inference (`BCG-015` open) (L535-540).
- NFR-22: Protected downloads only after explicit activation and fresh scope authorization, never prefetched or cache-reused; object URLs revoked; protected printing suppressed except the codes-only recovery-code print view; transfers abort on epoch loss (L542-551).
- NFR-23: `BCG-014` atomic intent binding applies to the seven enumerated destructive actions; changed or failed preconditions require fresh review and confirmation (L553-555).

Localization:

- NFR-24: Seven launch catalogs (`en-US`, `de-DE`, `fr-FR`, `pt-PT`, `pt-BR`, `es-ES`, `es-AR`) with browser negotiation before login, a visible selector, defined fallback rules, and `en-US` default (L559-563).
- NFR-25: Localize interface strings, validation, dates, numbers, and explanations; never translate backend technical errors, authored content, course material, or tutor output; instants display in the viewer's IANA zone (L565-567).
- NFR-26: Locale changes atomically update the BCP 47 document language and all frontend-owned copy before one announcement and deterministic focus restoration; Unicode direction isolation around untrusted text; DST gaps rejected, overlaps require an offset choice (L569-574).

Accessibility:

- NFR-27: WCAG 2.2 AA is release-blocking; every applicable criterion maps to `AC-*`/`CP-*` IDs with evidence; a blocked cell blocks release (L578, L591-594).
- NFR-28: Standard, Large, and Extra large text settings are always discoverable and work alongside browser zoom (L579-581).
- NFR-29: No action or meaning depends on hidden shortcuts, hover, color, icon, motion, sound, generated audio, or mascot imagery; reduced motion removes nonessential animation; no flashing content (L583-589).

Desktop and platform scope:

- NFR-30: Every complete process reflows and remains functional at 320 effective CSS pixels and at 1280 px with 400 % zoom in all three text modes; page-level horizontal scrolling, clipping, overlap, obscured focus, or hidden actions fail release (L598-602).
- NFR-31: Stack: React 19.3, strict TypeScript, Vite 8, Tailwind CSS 4.3, licensed Tailwind Plus React, Playwright; Tailwind defaults inherited first; light theme only (L608-610).
- NFR-32: Pre-implementation gate: one exact Tailwind Plus blueprint and variant selected and recorded for every inherited canonical component (L612-614).
- NFR-33: Supported browsers: current stable Chrome/Edge and current stable Safari on macOS, each requiring recorded manual release evidence; PO Safari evidence mandatory (L616-619).

Test and verification model:

- NFR-34: Component tests cover authorization-driven visibility, field preservation, state rendering, and destructive friction; integration tests exercise implemented OpenAPI contracts against local backend or protocol fakes; automated checks never call paid providers (L660-661).
- NFR-35: Playwright (bundled Chromium, macOS) covers `KF-1`..`KF-4` plus `CP-01`/`CP-02`; it does not replace manual evidence for other pairings (L662-664).
- NFR-36: Required automated categories: accessibility matrix, complete-catalog localization at three text sizes, reflow, authentication ergonomics, security per `SECURITY-PRIVACY-ACCEPTANCE.md` (non-fetch assertions, secret teardown), resilience (reload, Back/Forward, SSE reconnect, offline return, BFCache restore, logout failure), and performance against every budget (L665-677).
- NFR-37: Required manual evidence: PO Safari testing, AT and keyboard checks, visual checks, per-pairing browser evidence, security review of raw-body display, and content review (L679-687).

### Additional Requirements

From `ARCHITECTURE-SPINE.md` (binding; stories cite `AD-n`):

- No starter template: greenfield scaffold per the spine's structural seed — Vite 8 + React 19.3 + strict TypeScript + Tailwind 4.3, three-tier layout `app/` `features/` `platform/`, root `test/`, meta CSP in `index.html`. This is Epic 1 Story 1 territory.
- AR-1 (AD-1): Server state lives in one fenced TanStack Query data layer — direct imports banned outside `platform/data`, key factory owns cache identity (account + scope), one purge funnel, no optimistic helpers, memory-only cache; secret-bearing responses bypass the layer via a no-store path.
- AR-2 (AD-2): API access = generated wire types (`openapi-typescript` from `mia/api-doc/openapi.yaml`) + one hand-written client core (fetch, CSRF, request-ID, non-inheritable read retry, JSON:API parsing, error mapping) + exactly one zod boundary schema per operation in `platform/api`, compile-checked via `satisfies`.
- AR-3 (AD-3): React Router v8 declarative mode only; no loaders, actions, fetchers, or router prefetch.
- AR-4 (AD-4): One declarative route table (`app/routes`) + one gate engine own protected mounting, the ordered gate, existence-hiding, the route-change sequencer (title → announcement → focus), and teardown neutralization; features declare requirements as data.
- AR-5 (AD-5): Three tiers, one-way dependencies (`app` → `features` → `platform`), features never import each other; promotion to `platform` is the only sharing path (`platform/ui` for shared blueprint-bound composites); ESLint import-boundary enforced.
- AR-6 (AD-6): All untrusted content renders through `platform/markdown` — react-markdown AST pipeline, component-map allowlist, table-only GFM extension, `remark-math` + `rehype-katex` self-hosted; `rehype-raw` banned; `dangerouslySetInnerHTML` banned repo-wide; KaTeX subtree is the single approved class/style exception.
- AR-7 (AD-7): `platform/session` singleton controller owns stage machine, per-tab idle baseline, deadlines, warning countdown, cross-tab protocol, logout phases, and the fixed-order epoch fan-out (transfer aborts → cache purge → UI); client core requires `initiator: 'user' | 'background'`; BCG-001-dependent shapes stay blocked.
- AR-8 (AD-8): The tutoring stream is a feature-owned controller over native `EventSource`, outside the data layer; snapshot atomic replacement, epoch fencing, user-activated reconnect bound.
- AR-9 (AD-9): i18n is FormatJS/react-intl with ICU messages, explicit stable IDs, one locale-switch entry point in `platform/i18n`, and CI failure on incomplete catalogs.
- AR-10 (AD-10): Platform `Intl` only — no date/number library; `platform/time` owns zone display, DST-gap rejection, overlap offset choice.
- AR-11 (AD-11): Vitest + React Testing Library + jsdom; MSW as the network-layer protocol fake; colocated tests; shared handlers redact by construction; secret-marker scan in the full check.
- AR-12 (AD-12): Errors cross the client boundary as one discriminated union with stable backend codes; outcome-unknown is its own variant.
- AR-13 (AD-13): Code splits at the route table via `React.lazy`, one chunk per surface, loaded after the gate passes; zero preloading; bundle-size assertion enforces FFR-955.
- AR-14 (AD-14): `platform/transfer` owns downloads, uploads (XHR for ≥ 1 Hz progress), object-URL lifecycle, and authorized inline images, wired to epoch and purge.
- AR-15 (AD-15): CSP ships as the `<meta http-equiv>` tag in `index.html`; `script-src 'self'`, no `unsafe-inline`/`unsafe-eval` for scripts; `style-src-attr 'unsafe-inline'` is the PO-approved KaTeX relaxation; full check asserts the tag.
- AR-16 (spine conventions): plain-TS controllers + `useSyncExternalStore` for long-lived machinery; `platform/prefs` is the sole browser-storage reader/writer; `platform/announcer` is the sole `aria-live` owner; one route-tree error boundary in `app/routes`; app-owned print-suppression stylesheet; fragment token captured pre-React in `main.tsx` into one route-local ephemeral object.
- AR-17 (sequencing): open `BCG` entries block dependent stories — `BCG-001` (session discovery, Continue working, logout ordering) gates the auth journey; `BCG-012` (tutoring eligibility), `BCG-016` (mentor completion), `BCG-017` (mentor-role grant target resolution), `BCG-014` (atomic intent binding), `BCG-015` (resend failure-count semantics) gate their features. Buildable while `BCG-001` is open: scaffold, localization, shell chrome, blueprint binding, sanitizer boundary, error disclosure, reflow/text modes, component work against protocol fakes.

### UX Design Requirements

Design tokens and theme:

- UX-DR1: Inherit Tailwind CSS defaults wholesale — zero custom tokens; adapt only where confirmed MIA behavior, accessibility, localization, authorization, or state communication requires it.
- UX-DR2: Light theme only; no dark mode, gradients, glass effects, custom fonts, custom palette, custom spacing/radius scales, or gamification visuals.
- UX-DR3: Verify every used inherited color combination against WCAG 2.2 AA (4.5:1 normal text, 3:1 large text, 3:1 focus indicators and meaningful boundaries) across all interactive states.
- UX-DR4: Color is supplementary — state always includes text, optionally icon or shape; never color alone.
- UX-DR5: Standard, Large, Extra large device-local text-size modes via root-relative scaling; browser zoom still works; every locale and surface usable in each mode.
- UX-DR6: Borders, spacing, and tonal separation over elevation; dialog elevation may follow the inherited blueprint.
- UX-DR7: Pill shapes only where the inherited blueprint uses them; text remains authoritative.
- UX-DR8: Calm Notebook / Open Desk direction is pattern-selection criteria only, never custom palettes or license to recreate exploratory HTML.

Blueprint binding:

- UX-DR9: Execute the pre-implementation blueprint-binding gate: one exact Tailwind Plus blueprint and variant per inherited component, recorded with a stable local reference, anatomy verified against the paired behavioral contract.
- UX-DR10: Bind the named blueprints from DESIGN.md frontmatter: application-shell, page-heading, action-card, guided-field (form-layout), data-list (stacked-list/table), status-indicator (badge), alert-banner, confirmation-dialog, file-upload, static-session-starter (secondary action), readiness-checklist (description-list), pagination, skeleton, tooltip, disclosure, idle-warning (status banner).
- UX-DR11: `.working/` direction files are non-binding exploratory evidence; DESIGN.md/EXPERIENCE.md win on conflict.

Canonical components (visual delta in DESIGN.md, behavior in EXPERIENCE.md):

- UX-DR12: `application-shell` — capability groups, persistent visible scope, Home link, skip link, logout; authorized groups only.
- UX-DR13: `page-header` — title, parent context, and scope before actions; consequential actions out of crowded rows.
- UX-DR14: `action-card` — one calm continuation/attention item with one direct resolution route; removed only after authoritative success.
- UX-DR15: `guided-field` — persistent label, essential helper text, separately revealed examples, supplemental tooltips only.
- UX-DR16: `data-list` — bounded pagination, visible row labels, no invented totals, only OpenAPI-supported filters/sorts.
- UX-DR17: `status-indicator` — full text plus optional icon/shape; never color-only; live-announces only defined transitions.
- UX-DR18: `alert-banner` — names impact, continuation, and next action; may show last-checked time; never announces repeated revalidation.
- UX-DR19: `confirmation-dialog` — exact scope, blockers, preservation, irreversibility; revalidates before submit; friction scales; exact-name typing for high-impact deletion.
- UX-DR20: `error-disclosure` — two-layer: localized explanation + collapsed technical details (exact status, complete verbatim escaped body, untranslated, token-breaking display that never alters copied text, never live-announced); copy warns to review before sharing.
- UX-DR21: `file-upload` — declared limits precede the native picker (primary) and optional drop area; per-file state, failure, and actions.
- UX-DR22: `rich-transcript` — stable turn nodes and anchors preserving focus/position; auto-scroll only at the end; controlled updates through reading mode.
- UX-DR23: `message-composer` — persistent text area with labeled visible Send/Queue; byte-preserving; Enter inserts a newline; queued state distinct.
- UX-DR24: `static-session-starter` — secondary to free text; inserts editable text or guides; never auto-submits.
- UX-DR25: `readiness-checklist` — separate rows for prerequisites, processing, and educational approval; every unmet item links to its resolution.
- UX-DR26: `pagination-controls` — previous/next with context, no fabricated totals; follows OpenAPI links; deterministic focus fallback.
- UX-DR27: `security-code-input` — one native text input holding the complete pasteable code, preserving leading zeroes; visual grouping adds no focus stops.
- UX-DR28: `recovery-code-panel` — dedicated surface, legible grouping, print styles, explicit copy/print, revealed once, torn down on departure.
- UX-DR29: `date-time-field` — local date/time with adjacent IANA zone and resolved offset; DST-gap rejection; explicit overlap offset choice; frozen reviewed instant.
- UX-DR30: `external-meeting-link` — inspectable HTTPS destination with normalized host; never fetched, previewed, or auto-opened.
- UX-DR31: `media-control` — native audio affordances with adjacent generation/failure/retention state; explicit request; stale object URLs revoked.
- UX-DR32: `loading-skeleton` — matches final geometry, never resembles real content, unfocusable, no announcement.
- UX-DR33: `help-tooltip` — never task-required information; hover and focus, hoverable, Escape dismisses, associated to trigger.
- UX-DR34: `content-disclosure` — visible label, exposed expanded state, content in reading order, focus preserved.
- UX-DR35: `form-error-summary` — high-visibility summary linking errors in DOM order; deterministic focus rules.
- UX-DR36: `copy-control` — visible object-specific label with adjacent resettable feedback.
- UX-DR37: `safe-markdown-table` — captioned semantic table with headers; labeled contained overflow only when unavoidable.
- UX-DR38: `safe-markdown-code` — plain-text-preserving block with wrap, copy, known-language label, contained overflow.
- UX-DR39: `safe-markdown-math` — accessible local math rendering with meaningful copy/speech fallback; raw MathML/SVG never inserted.
- UX-DR40: `idle-warning` — persistent non-modal tab-local banner with Continue working and Sign out; never moves or obscures focus; never predicts expiry.
- UX-DR41: `privacy-screen` — blocking neutral surface with no protected names, breadcrumbs, or scope identity; safe retry and guidance when logout is unconfirmed.

Navigation and shell composition:

- UX-DR42: One capability-driven shell for every role combination, grouped exactly as Learn, Prepare, Mentor, Administer, Profile and security; authorized capabilities only.
- UX-DR43: Home is a calm continuation surface prioritized by urgency and consequence; no rankings, streaks, feeds, metrics, or badges.
- UX-DR44: Stable URLs with visible scope; Reload reconstructs authoritative state without duplication; every detail surface has a parent route; navigation intercepted only for unsaved local input.
- UX-DR45: First focusable control skips repeated navigation; landmarks, localized titles, exactly one page heading, and current-navigation state exposed programmatically.

Accessibility interaction patterns:

- UX-DR46: Route changes move focus to the page title; in-place updates use component-specific focus targets; dialogs trap and restore focus deterministically.
- UX-DR47: Streaming announcements: never token-by-token; only concise transitions (generating, complete, failed, interrupted, reconnected, queued, summary available).
- UX-DR48: Reduced motion disables smooth scrolling, route/dialog animation, skeleton shimmer, and nonessential status motion; no flashing content.
- UX-DR49: Modal contract: one title and description, inert background, deterministic initial/return focus, contained Tab order, visible cancel, defined Escape behavior.
- UX-DR50: Validation: invalid fields expose state with associated correction; DOM-order summary focused only after submitted multi-field failure; valid input preserved.
- UX-DR51: Focus never obscured by persistent navigation, composer, banners, dialogs, or status surfaces.
- UX-DR52: Pointer targets and spacing meet WCAG 2.2 AA; autocomplete purposes supplied; password managers and paste work at every auth stage.
- UX-DR53: Password reveal exposes name and state; MFA entry is one pasteable value preserving leading zeroes.
- UX-DR54: TOTP setup pairs the QR with selectable issuer/account/manual info derived locally; route-local data masked on page hide, fresh authorization on return, removed on terminal events.
- UX-DR55: Avatar/logo alternatives: empty when adjacent programmatic names carry the information; otherwise localized functional alternatives from authoritative context, never filenames.
- UX-DR56: Generated audio is never the only representation of tutor content.
- UX-DR57: Release evidence includes text-spacing overrides, forced colors, reduced motion, target size, clipboard denial, and mixed directionality.

Responsive and reflow:

- UX-DR58: Every complete process reflows at 320 effective CSS px in all three text modes and at 1280 px with 400 % zoom; `lg`/1024 px are optimization contexts, never functionality floors.
- UX-DR59: Page-level horizontal scrolling, clipping, overlap, obscured focus, and hidden actions are release failures; horizontal scroll only inside labeled table/code/math regions.
- UX-DR60: At increased text sizes or narrow widths, stack secondary columns before compressing labels; tutoring keeps one bounded transcript column plus persistent composer.
- UX-DR61: Layouts tolerate OS font-metric variation via intrinsic sizing; never tuned to Playwright's bundled Chromium metrics.

Interaction and state presentation:

- UX-DR62: Implement the eleven global state treatments as a shared vocabulary: cold load, empty, focus, validation error, backend error, offline, permission denied, stale data, long-running, optional feature unavailable, sign-in expired.
- UX-DR63: Tutoring shows only persisted or currently streamed state — no percentages, invented stages, or fake progress; partial content persists on interruption; retry is explicit; terminal events trigger an authoritative re-render.
- UX-DR64: Stable reading contract: stable DOM identity through streaming/reconnection/reconciliation; earlier turns never remount; jump-to-first-unseen control; stable-reading mode buffers without cancelling work.
- UX-DR65: Interaction primitives: click, keyboard activation, Tab/Shift+Tab, Enter, Space, Escape, and browser navigation suffice; no required shortcut, hover-only, drag-only, or gesture path.
- UX-DR66: Explicit-refresh model: lifecycle events only mark staleness; only explicit Continue working, Refresh, or Try now start the ordered cycle; Try now opens at most one replacement EventSource after non-refreshing checks.
- UX-DR67: The five static session starters are fixed: homework help, topic practice, explanation, exam preparation, free-form question.
- UX-DR68: Finish session is explicit, visually secondary, enabled only when nothing is generating or queued.
- UX-DR69: Idle-warning timing: polite warning five minutes before the earlier deadline (immediately if within threshold); privacy shield replaces it at the deadline; assertive semantics only for urgent deadline correction.
- UX-DR70: Voice and tone: formal-but-warm, direct, calm; student copy short and familiar; implement the prefer/avoid pairs; praise specific and evidence-based; transparently AI-powered.
- UX-DR71: Readiness and approval never collapse into one badge; the prepare → finalize/process → review → approve chain stays visible.
- UX-DR72: Course preparation is a non-linear hub with preserved drafts; learning goals and AI instructions are separate guided fields with templates, examples, code-point/byte feedback, exact preview, and secrets warnings.
- UX-DR73: Sensitive-download and print copy: first sensitive download warns about browser-saved copies; protected printing suppressed except approved views; warnings state OS limits accurately.

Safe rich content:

- UX-DR74: Tutor output supports only the safe Markdown subset (paragraphs, headings, emphasis, lists, block quotes, tables, code) plus locally rendered accessible math; only static starters are interactive.
- UX-DR75: Streaming pipeline: escaped text or full-string reparse through one locked allowlist; incomplete structures stay plain; terminal reconciliation once; model headings nest beneath the message heading.
- UX-DR76: Markdown links are parsed HTTPS-only with inspectable destination and normalized ASCII host; explicit activation; no opener or referrer.

Localization and time presentation:

- UX-DR77: Seven launch locales with pre-login negotiation, defined fallbacks, and a visible pre-login selector.
- UX-DR78: Atomic locale change updates `<html lang>` and all frontend-owned copy before one announcement and focus restoration; untrusted text gets direction isolation; identifiers stay directionally stable.
- UX-DR79: Instants display in the viewer's IANA zone with visible zone context where ambiguity matters; appointments keep the same instant across zone changes; reconfirm after an authoritative zone change.
- UX-DR80: Catalog completeness across all locales and text-size modes is a release check.

### FR Coverage Map

- FFR-101..110: Epic 1 — authentication flows, MFA, recovery, keyboard completion
- FFR-111..113: Epic 2 — profile surfaces behind the capability gate
- FFR-114..115: Epic 1 — fragment-token bootstrap and ephemeral flow object
- FFR-116..118: Epic 1 — invitation preview, acceptance, and ambiguity handling
- FFR-201..207: Epic 2 — shell, Home composition, stable URLs and history
- FFR-208: Epic 1 — build identifier on the anonymous entry document
- FFR-301..305: Epic 3 — course creation and the preparation hub
- FFR-401..405: Epic 4 — material lifecycle, upload, readiness vs approval
- FFR-501..506: Epic 5 — provisioning, roster, oversight, transcript review
- FFR-601..613: Epic 6 — tutoring workspace, streaming, finish, history
- FFR-701..705: Epic 7 — mentoring lifecycle and mentor-role grant
- FFR-801..804: Epic 8 — administration lists and detail pages
- FFR-951..956: implemented continuously (AR-13 budget assertion from Epic 1 on); verified as release evidence in Epic 9

Cross-cutting: NFR-1..37, AR-1..17 (AD-1..AD-15), and UX-DR1..80 bind every epic as acceptance criteria and
conventions; Epic 1 Story 1 establishes their structural enforcement (tiers, fences, checks), and Epic 9 collects the
release evidence. UX-DR components are built on first use by the owning epic and promoted per AD-5.

## Epic List

### Epic 1: Enter MIA — localized sign-in and a safe session
Anyone can reach MIA, get a localized anonymous experience, sign in through MFA and password-replacement stages,
recover access, accept invitations, and have their session expire and log out safely.
**FRs covered:** FFR-101..110, FFR-114..118, FFR-208 (+ UX-DR77 negotiation; NFR-16..19 session lifecycle; BCG-001-gated closure for idle warning, Continue working, and logout ordering)

### Epic 2: One shell for every role — Home, navigation, profile
Authenticated users land in one capability-driven shell with a continuation-first Home, stable URLs, and their profile.
**FRs covered:** FFR-111..113, FFR-201..207

### Epic 3: Create and prepare courses
Administrators create courses; supervisors prepare and activate them through the non-linear hub without external
documentation (flagship experience 1).
**FRs covered:** FFR-301..305

### Epic 4: Materials and files
Supervisors and students manage the full material lifecycle from draft and upload through processing, approval,
authorized download, and deletion.
**FRs covered:** FFR-401..405

### Epic 5: Provision and oversee students
Supervisors provision students, manage the roster and recovery, and see session status and completed transcripts with
the correct visibility expectations.
**FRs covered:** FFR-501..506 (transcript-review stories run against protocol fakes until Epic 6 produces real sessions)

### Epic 6: AI tutoring — the core learning experience
A student runs one active session with streaming, queueing, stable reading, reconnection, and explicit finish, and
reviews completed transcripts, summaries, and follow-ups (flagship experience 2).
**FRs covered:** FFR-601..613 (BCG-012-gated eligibility wiring)

### Epic 7: Mentoring
Students request mentoring; supervisors triage and assign; mentors respond, schedule, and complete; supervisors grant
the permanent mentor role.
**FRs covered:** FFR-701..705 (FFR-704 BCG-016-gated; FFR-705 BCG-017-blocked)

### Epic 8: Administration and operations
Administrators work accounts, invitations, courses, durable jobs, and audit records through safe conventional lists
and detail pages.
**FRs covered:** FFR-801..804

### Epic 9: Release readiness
The product owner can certify release: performance budgets measured on the constrained profile, catalog completeness,
the full accessibility evidence matrix, browser-pairing evidence, and the manual review passes.
**FRs covered:** FFR-951..956 verification; NFR-27, NFR-33..37 evidence obligations

## Epic 1: Enter MIA — localized sign-in and a safe session

Anyone can reach MIA, get a localized anonymous experience, sign in through MFA and password-replacement stages,
recover access, accept invitations, and have their session expire and log out safely.

### Story 1.1: Project scaffold with enforced architecture

As the product owner,
I want the greenfield project scaffolded with the spine's structure and quality gates enforced from the first commit,
So that every later story lands inside fences that make the binding contracts mechanical.

**Acceptance Criteria:**

**Given** a clean checkout
**When** `npm ci && ./run-all-tests.sh` runs
**Then** typecheck, lint, unit tests, and build all execute (no skipped npm components remain)
**And** the tree matches the spine's structural seed (`app/`, `features/`, `platform/`, root `test/`) with ESLint import-boundary, data-layer, storage, `aria-live`, and `react/no-danger` fences active (AD-1, AD-5, AD-6 conventions)
**And** exact-pinned dependencies match the spine's Stack table.

**Given** the production build
**When** `index.html` is inspected
**Then** it carries the meta CSP (AD-15, asserted by the full check) and a build identifier readable without authentication containing no account, route, resource, or environment data (FFR-208)
**And** the bundle-size assertion enforces FFR-955.

### Story 1.2: Localized anonymous entry

As a visitor on a shared device,
I want MIA to greet me in my language with a visible locale and text-size choice,
So that I can use the entry surfaces before signing in.

**Acceptance Criteria:**

**Given** a browser with `Accept-Language` preferences
**When** the anonymous entry document loads
**Then** the locale resolves by negotiation with the defined fallbacks (`pt`→`pt-PT` except `pt-BR`, `es`→`es-ES` except `es-AR`, unsupported→`en-US`; UX-DR77, NFR-24) and `<html lang>` carries the exact BCP 47 tag
**And** a visible selector switches locale atomically — one announcement, deterministic focus restoration (NFR-26, AD-9).

**Given** any anonymous surface
**When** the text-size mode changes (Standard/Large/Extra large)
**Then** type, controls, and spacing reflow together via root-relative scaling, persisted device-locally through `platform/prefs` only (UX-DR5, AR-16)
**And** all seven catalogs pass the completeness check in CI (AD-9).

### Story 1.3: Password sign-in with restricted-stage isolation

As a user,
I want to sign in with username and password,
So that I can reach my authorized workspace.

**Acceptance Criteria:**

**Given** the login surface
**When** I submit credentials
**Then** the request flows through the client core (CSRF header from `__Host-mia_csrf` read fresh, request-ID bound, `initiator:'user'`; AD-2, AD-7) and the session stage renders from backend truth only
**And** password managers, autofill, paste, and correct autocomplete purposes work; the reveal control has an accessible name and state (FFR-106, FFR-107)
**And** the whole flow completes keyboard-only (FFR-110).

**Given** any restricted stage (`mfa`, `password-change`)
**When** it renders
**Then** only the focused flow plus logout appears — no application navigation, protected title, breadcrumb, cached name, or protected prefetch (FFR-103), and no protected route chunk has loaded (AD-13).

**Given** a throttled or blocked response
**When** it renders
**Then** throttled is a first-class state with any wait derived only from `Retry-After`, never counted down locally, never disclosing which limit was hit (FFR-104, FFR-105)
**And** backend failures render through `error-disclosure` — localized explanation plus collapsed verbatim escaped body (NFR-8, UX-DR20).

### Story 1.4: MFA challenge and recovery-code sign-in

As a user with MFA enabled,
I want to complete the MFA challenge or fall back to a recovery code,
So that I can sign in even without my authenticator.

**Acceptance Criteria:**

**Given** the MFA stage
**When** I enter my code
**Then** one native text input holds the full pasteable value, preserving leading zeroes, visual grouping adding no focus stops (FFR-108, UX-DR27)
**And** MFA precedes temporary-password replacement when both apply (FFR-102).

**Given** the recovery-code path
**When** I use a recovery code
**Then** the flow completes keyboard-only with paste support (FFR-110, FFR-106), and no MFA value or recovery code is ever logged, persisted, or exposed (NFR-10).

### Story 1.5: Forced password replacement

As a user with a temporary password,
I want to be guided through replacing it before anything else,
So that my account is secured before I reach protected content.

**Acceptance Criteria:**

**Given** a session in the `password-change` stage
**When** the stage renders
**Then** it is a restricted stage per FFR-103, ordered after MFA when both apply (FFR-102)
**And** submission succeeds only through the client core with fresh CSRF (post-rotation value, never cached across rotation; NFR-11)
**And** on success the session advances to `authenticated` and the gate re-evaluates (AD-4, AD-7).

### Story 1.6: Password recovery and token reset

As a user who lost their password,
I want a recovery path and a token-based reset,
So that I can regain access without staff seeing my new password.

**Acceptance Criteria:**

**Given** the staff-mediated recovery flow
**When** any username is submitted
**Then** the response presentation is uniform regardless of account existence (existence-hiding, NFR-13).

**Given** a reset link with a fragment token
**When** the document loads
**Then** the fragment is read synchronously pre-React and removed via `history.replaceState` — known, unknown, malformed, or duplicate alike (FFR-114), the canonical token living only in one ephemeral flow object (FFR-115, AR-16)
**And** an invalid or expired token yields the fixed safe presentation with explicit next actions, never an automatic retry (NFR-5).

### Story 1.7: Invitation preview and acceptance

As an invited user,
I want to preview and accept my invitation safely,
So that I can join MIA with the invited role.

**Acceptance Criteria:**

**Given** an invitation link
**When** the preview renders
**Then** invitation-specific language exposes only the invited role (FFR-116) after the fragment bootstrap of FFR-114/115.

**Given** acceptance submission
**When** the outcome is definitive or ambiguous
**Then** the UI distinguishes submitting, pre-dispatch failure, definitive rejection, outcome unknown, and consumed-token ambiguity as separate states (FFR-116, AD-12 outcome-unknown variant)
**And** acceptance is never replayed automatically and never claims account or session creation (FFR-117)
**And** after ambiguity, explicit sign-in and reopening the original email link are offered while stating neither proves the prior outcome (FFR-118).

### Story 1.8: Session lifecycle — idle warning, expiry shield, logout (BCG-001-gated closure)

As a signed-in user on a shared device,
I want warnings before expiry and a logout that never lies,
So that my data is protected when my session ends.

**Acceptance Criteria:**

**Given** an authenticated tab
**When** only background reads, SSE traffic, focus, or reconnects occur
**Then** the idle baseline never resets — only `initiator:'user'` requests reset it (AD-7, NFR-7)
**And** the `idle-warning` banner appears five minutes before the earlier backend-authored deadline, non-modal, moving no focus, stating no remaining time (NFR-18, UX-DR40, UX-DR69); Continue working issues exactly one explicit auth-session request.

**Given** the deadline passes (or clock rollback/sleep is detected)
**When** the shield engages
**Then** a content-free privacy screen hides protected content, locks rather than extends (NFR-18, UX-DR41), and `pagehide` installs the shield before BFCache entry (NFR-4).

**Given** logout
**When** it starts
**Then** every tab shields via the content-free `BroadcastChannel` epoch, authenticated requests quiesce, and success is claimed only after backend confirmation plus anonymous discovery; on failure the blocking screen states logout unconfirmed with safe retry (NFR-17, NFR-19)
**And** all BCG-001-dependent shapes are implemented against protocol fakes and marked blocked for closure until BCG-001 lands (AR-17).

### Story 1.9: TOTP enrollment and recovery codes

As a user setting up MFA,
I want QR-based TOTP enrollment and one-time recovery codes,
So that I can secure my account with my authenticator app.

**Acceptance Criteria:**

**Given** the enrollment surface
**When** the provisioning URI arrives
**Then** the QR image plus selectable issuer, account, and manual setup values are derived locally (FFR-109, `qrcode` per spine Stack), data staying route-local — masked on page hide, copy suspended, fresh authorization on return, removed on terminal events (NFR-20, UX-DR54).

**Given** recovery codes are issued
**When** the panel renders
**Then** it is revealed once with legible grouping, explicit copy/print (codes-only print view, the sole print exception), an accurate warning, and teardown on departure (UX-DR28, NFR-22).

## Epic 2: One shell for every role — Home, navigation, profile

Authenticated users land in one capability-driven shell with a continuation-first Home, stable URLs, and their profile.

### Story 2.1: Capability-driven application shell

As a signed-in user,
I want one shell showing exactly my authorized capability groups,
So that I see my whole workspace without role switching.

**Acceptance Criteria:**

**Given** an authenticated session
**When** the first protected surface mounts
**Then** the ordered gate runs (stage → capability + scope → route resource → dependent data) behind the neutral "Checking access" shell, with no protected render before completion (AD-4, NFR-3)
**And** the shell shows only authorized groups, grouped exactly as Learn, Prepare, Mentor, Administer, Profile and security (UX-DR12, UX-DR42), bound to the `application-shell` blueprint (UX-DR10).

**Given** a multi-role account
**When** the shell renders
**Then** one union workspace appears — no role switcher, no duplicated navigation (FFR-206).

**Given** keyboard navigation
**When** the page loads
**Then** a skip link is first-focusable; landmarks, localized title, exactly one page heading, and current-navigation state are programmatically exposed (UX-DR45).

### Story 2.2: Home — the continuation surface

As a signed-in user,
I want Home to show what I was doing and what's blocked on me,
So that I can continue without hunting.

**Acceptance Criteria:**

**Given** backend-reported resumable and blocked work
**When** Home renders
**Then** continuation leads (active tutoring session, else current draft/upload), then blocked-on-me items in backend-supplied order, and nothing else (FFR-202)
**And** at most five items render as `action-card`s, each linking to its owning list; no show-more, pagination, or infinite scroll (FFR-203, UX-DR14)
**And** no list duplication, invented metric, counter, streak, score, or feed appears (FFR-204, UX-DR43).

**Given** no resumable and no blocked work
**When** Home renders
**Then** the empty state explains authoritative absence with at most one currently authorized next action (FFR-205, UX-DR62).

### Story 2.3: Navigation contract — URLs, history, route changes

As a user,
I want URLs, Back/Forward/Reload, and route changes to behave predictably,
So that I can navigate, bookmark, and recover without surprises.

**Acceptance Criteria:**

**Given** any surface
**When** I reload or traverse history
**Then** stable URLs reconstruct authoritative state without duplicating sessions or messages, every detail surface offers a parent route, and Back/Forward work (FFR-207, UX-DR44).

**Given** a route change
**When** it completes
**Then** the single sequencer updates the localized title, then announces, then moves focus to the page heading (AD-4, UX-DR46); teardown restores the neutral title and clears content-bearing history state.

**Given** an unknown, out-of-scope, ineligible, revoked, or throttled route resource
**When** the gate resolves
**Then** the one fixed existence-hiding presentation renders — indistinguishable in copy, focus, actions, URL, title, announcement, and timing (NFR-13, AD-4).

### Story 2.4: Student self-profile (read-only)

As a student,
I want to see my profile,
So that I know what MIA stores about me — without being able to change it.

**Acceptance Criteria:**

**Given** a student-only account
**When** `/profile` mounts through the complete capability and scope gate (FFR-111)
**Then** the profile is read-only: no edit control, no writable form state, no profile mutation path exists in the DOM or network traffic (FFR-112, NFR-12).

### Story 2.5: Staff profile editing

As a staff member,
I want to edit my authorized profile fields and reach security settings,
So that I can keep my account current.

**Acceptance Criteria:**

**Given** a staff account
**When** editing the profile
**Then** only the product-authorized staff subset is editable, via React 19 form Actions (spine conventions), with validation per UX-DR50
**And** staff-only child routes are capability-gated rows in the route table (FFR-113, AD-4)
**And** saves render only after definitive backend success — no optimistic update (NFR-1).

## Epic 3: Create and prepare courses

Administrators create courses; supervisors prepare and activate them through the non-linear hub without external
documentation (flagship experience 1).

### Story 3.1: Administrator creates a course

As an administrator,
I want to create a course with at least one supervisor,
So that preparation can begin.

**Acceptance Criteria:**

**Given** the course-creation surface
**When** I submit a new course
**Then** creation requires at least one supervisor (FFR-301), fields follow the `guided-field` pattern (UX-DR15), and the course appears only after definitive backend success (NFR-1)
**And** creation is unreachable and invisible without the capability (NFR-12, AD-4).

### Story 3.2: The preparation hub

As a supervisor,
I want a non-linear hub showing every activation prerequisite,
So that I can prepare the course in any order without a manual.

**Acceptance Criteria:**

**Given** a draft course
**When** the hub renders
**Then** every activation prerequisite is exposed and linked to its resolution surface (FFR-302, UX-DR25 `readiness-checklist`), in non-linear order with preserved drafts and return-to-attention items (UX-DR72)
**And** no completion percentage, progress score, or draft evaluation appears (FFR-305)
**And** the flow satisfies UXS-04: activation reachable without external documentation.

### Story 3.3: Course fields — details, goals, AI instructions, logo

As a supervisor,
I want guided editing of course details, curriculum, learning goals, AI instructions, and language, plus a logo,
So that the course is correctly configured for tutoring.

**Acceptance Criteria:**

**Given** any preparation field
**When** I edit it
**Then** it has a persistent label, helper text where a bound applies, revealable examples, supplemental tooltips, colocated validation, exact read-only preview, and confirmed code-point and byte feedback (FFR-304, UX-DR15, UX-DR72)
**And** learning goals and AI instructions are separate guided plain-text fields with templates and secrets/personal-data warnings (UX-DR72).

**Given** a logo upload
**When** it completes
**Then** the logo is a separately gated authorized image via `platform/transfer` that vanishes on denial or epoch change (AD-14, NFR-22).

### Story 3.4: Readiness, activation, deactivation

As a supervisor,
I want to activate a ready course and deactivate it when needed,
So that students can join only when the course is fit for use.

**Acceptance Criteria:**

**Given** unmet prerequisites
**When** the readiness review renders
**Then** activation is unavailable with each unmet item linked (FFR-302/303), readiness states shown as `status-indicator`s with text, never color alone (UX-DR17)
**And** activation/deactivation render their new state only after definitive backend success (NFR-1)
**And** a deactivated-or-blocked course shows blocked-new-sessions as a distinct presented state (UX-DR71).

### Story 3.5: Supervisor relationships and course deletion

As an administrator or supervisor,
I want to manage supervisor assignments and delete a course where authorized,
So that responsibility stays correct over the course's life.

**Acceptance Criteria:**

**Given** supervisor add/remove
**When** removal or course deletion is confirmed
**Then** the `confirmation-dialog` states exact scope, blockers, preservation, and irreversibility, with exact-name typing for deletion (UX-DR19)
**And** course-supervisor removal and course deletion follow BCG-014 atomic intent binding — changed or failed preconditions force fresh review and confirmation (NFR-23)
**And** the UI updates only after definitive backend success; ambiguous outcomes render as their own state (NFR-1, AD-12).

## Epic 4: Materials and files

Supervisors and students manage the full material lifecycle from draft and upload through processing, approval,
authorized download, and deletion.

### Story 4.1: Create materials and file drafts

As a supervisor (course-wide) or student (private),
I want to create materials and assemble file drafts,
So that content is staged before committing to processing.

**Acceptance Criteria:**

**Given** the material-creation surface
**When** it renders
**Then** supported formats and current operator limits are declared before any upload control (FFR-402, UX-DR21)
**And** it states that MIA does not scan for malware and does not fetch external material links (FFR-404)
**And** drafts are recoverable and reviewable as a file list (FFR-403), course-wide vs student-private scope decided by backend authorization alone (FFR-401, NFR-12).

### Story 4.2: Upload files with live progress

As a material owner,
I want picker and drag-and-drop uploads with per-file progress,
So that I can see healthy transfers and fix failures per file.

**Acceptance Criteria:**

**Given** files selected via the native picker (primary) or drop area (supplement, UX-DR65)
**When** upload runs
**Then** each file shows its own state, failure, and actions (UX-DR21), progress updating at least once per second while bytes move (FFR-956) through `platform/transfer`'s XHR path (AD-14)
**And** mixed-format combinations are prevented before dispatch (FFR-403)
**And** an upload failure offers `Upload as a new file` per the fixed retry vocabulary — never an automatic replay (NFR-5, api-client rule).

### Story 4.3: Finalize and processing

As a material owner,
I want an explicit, irreversible Finalize that starts processing,
So that I control when drafts become committed work.

**Acceptance Criteria:**

**Given** a reviewed draft
**When** I finalize
**Then** the `confirmation-dialog` states irreversibility before dispatch (FFR-403, UX-DR19)
**And** processing renders as a truthful long-running state with last-checked time and explicit Refresh — no polling, no fabricated progress (UX-DR62, NFR-2)
**And** processing failure offers only contract-supported recovery actions (FFR-401, NFR-9).

### Story 4.4: Brief review, correction, and approval

As a supervisor,
I want to review the generated brief, correct it, and grant educational approval,
So that only vetted material reaches tutoring.

**Acceptance Criteria:**

**Given** a processed file
**When** its states render
**Then** technical readiness and educational approval are never one state — separate `status-indicator` rows, separately announced (FFR-405, UX-DR71, UXS-05)
**And** the brief renders through the locked `platform/markdown` boundary as untrusted text (AD-6) with correction editing per `guided-field` (FFR-401, UX-DR15)
**And** approval and revocation update only after definitive backend success (NFR-1).

### Story 4.5: Authorized download and deletion

As an authorized user,
I want to download material content and delete materials,
So that I can use content outside MIA and remove what's obsolete.

**Acceptance Criteria:**

**Given** a download control
**When** activated
**Then** the transfer happens only after explicit activation and fresh scope authorization — never prefetched or cache-reused — with object URLs revoked after use and aborts on epoch loss (NFR-22, AD-14)
**And** the first sensitive download in a shared-device session warns that browser-saved copies remain outside MIA (UX-DR73).

**Given** deletion
**When** confirmed through scaled friction (UX-DR19)
**Then** the material disappears only after definitive backend success (NFR-1).

## Epic 5: Provision and oversee students

Supervisors provision students, manage the roster and recovery, and see session status and completed transcripts with
the correct visibility expectations.

### Story 5.1: Create a new student

As a supervisor,
I want to create a student account with a temporary password I choose,
So that a student can join my course without email infrastructure.

**Acceptance Criteria:**

**Given** the create-student flow
**When** I set the temporary password
**Then** the backend never returns it, the UI never retains, restores (including form restoration), or auto-copies it, and the flow states it must be communicated outside MIA (FFR-503, NFR-10)
**And** Create new student and Add existing student are separate entry points (FFR-501)
**And** the account appears in the roster only after definitive backend success (NFR-1).

### Story 5.2: Add an existing student by exact username

As a supervisor,
I want to enroll an existing student by their exact username,
So that students can join additional courses without a directory.

**Acceptance Criteria:**

**Given** the add-existing flow
**When** I submit a username
**Then** exactly one exact-match username field exists — no global search, no autocomplete (FFR-502)
**And** every ineligible outcome (nonexistent, out-of-scope, already enrolled, banned) returns the one uniform ineligible presentation (FFR-502, NFR-13).

### Story 5.3: Roster and student support

As a supervisor,
I want the scoped roster with recovery, MFA reset, ban, and membership management,
So that I can support my students day to day.

**Acceptance Criteria:**

**Given** the course roster
**When** it renders
**Then** it is a scoped `data-list` (bounded pagination, no invented totals, only OpenAPI-supported filters/sorts; UX-DR16) showing only backend-authorized rows (FFR-504, NFR-12)
**And** consequential actions (recovery, MFA reset, ban, membership removal) live on detail surfaces, never list rows (UX-DR13)
**And** membership removal follows BCG-014 atomic intent binding with fresh review on changed preconditions (NFR-23)
**And** password recovery presents the same temporary-password rules as FFR-503.

### Story 5.4: Session status with honest visibility expectations

As a supervisor,
I want to see my students' session status without seeing active chats,
So that I can support students while their privacy expectations stay accurate.

**Acceptance Criteria:**

**Given** any surface exposing session status
**When** it renders
**Then** active chat content is absent (FFR-505) and the surface states that active chat content is not visible until the student finishes — so absence is never read as an absent, idle, or failed session (FFR-506, UXS-17)
**And** no session-status presentation implies live monitoring (NFR-14).

### Story 5.5: Completed transcripts, used material, summary correction

As a supervisor,
I want to review completed transcripts and correct summaries,
So that I can follow up on finished learning work.

**Acceptance Criteria:**

**Given** a completed session
**When** the transcript renders
**Then** all tutor and student content flows through the locked `platform/markdown` boundary as untrusted text (AD-6, UX-DR74), with used material listed from authoritative state (FFR-504)
**And** summary correction edits through `guided-field` and updates only after definitive backend success (NFR-1)
**And** an in-progress session's transcript remains unreachable — the existence-hiding presentation, not a teaser (FFR-505, NFR-13).

## Epic 6: AI tutoring — the core learning experience

A student runs one active session with streaming, queueing, stable reading, reconnection, and explicit finish, and
reviews completed transcripts, summaries, and follow-ups (flagship experience 2).

### Story 6.1: Start a tutoring session

As a student,
I want to start a session from my joined courses with optional material and guided starters,
So that I can begin learning with the right context.

**Acceptance Criteria:**

**Given** the session-start surface
**When** it renders
**Then** joined-course choice, optional material choice, the five fixed localized static starters (homework help, topic practice, explanation, exam preparation, free-form question), and free text are offered (FFR-601, FFR-611, UX-DR67)
**And** starters insert editable text or guide the next step — never auto-submit (FFR-611, UX-DR24); free text is always available (FFR-612)
**And** with an existing active session, start controls yield to continuation — one active session per student, from backend truth (FFR-601).

### Story 6.2: Send and queue messages

As a student,
I want to send messages and queue one while the tutor responds,
So that I never lose a thought waiting.

**Acceptance Criteria:**

**Given** the composer
**When** I type and send
**Then** it is a persistent byte-preserving text area with a labeled visible Send/Queue action; Enter inserts a newline (UX-DR23)
**And** at most one generating response and one queued message exist, rendered from authoritative state per state machine §2, the queued state visually distinct
**And** each dispatch binds one request-ID to one immutable payload with no automatic replay (NFR-5, AD-2).

### Story 6.3: Live streamed responses

As a student,
I want the tutor's answer to stream in as it's generated,
So that I can start reading immediately.

**Acceptance Criteria:**

**Given** a generating response
**When** SSE events arrive on `GET /api/v1/tutor-responses/{id}/events`
**Then** the feature-owned stream controller (AD-8) consumes snapshot-first with epoch fencing per state machines §3–4, painting tokens within 100 ms batched to ≤10 visual updates/s (FFR-953)
**And** rendering flows only through the locked markdown boundary — full-string reparse per update, incomplete structures stay plain text (AD-6, UX-DR75)
**And** announcements cover only concise transitions (generating, complete, failed, interrupted, reconnected, queued), never token-by-token (UX-DR47)
**And** no percentages, invented stages, or fabricated progress appear (UX-DR63).

### Story 6.4: Stable reading and transcript integrity

As a student,
I want to read earlier turns undisturbed while new content streams,
So that I can think at my own pace.

**Acceptance Criteria:**

**Given** a streaming transcript
**When** I scroll up or focus earlier turns
**Then** turns and attempts keep stable DOM identity (FFR-607), earlier turns never remount, and focus/reading position survive streaming and terminal reconciliation (FFR-608, UX-DR64)
**And** auto-scroll happens only when already at the end; otherwise a visible keyboard-reachable control leads to unseen content (FFR-608)
**And** stable-reading mode pauses visual updates while work continues, buffers, and reconciles on explicit resume (FFR-609)
**And** interaction latency stays ≤200 ms on a 200-turn transcript (FFR-954).

### Story 6.5: Stop, retry, and reconnection

As a student,
I want to stop a response, retry explicitly, and reconnect after transport loss,
So that hiccups never cost me my session.

**Acceptance Criteria:**

**Given** a generating response
**When** I stop it
**Then** partial content stays visible and linked history is preserved; retry is explicit (`Retry exact attempt`), never automatic (UX-DR63, NFR-5).

**Given** transport loss
**When** reconnect availability is scheduled (1/2/4 s)
**Then** no replacement EventSource opens automatically; `Try now` opens at most one after non-refreshing access checks; reconnection consumes an authoritative snapshot before new events and never duplicates a provider request (NFR-6, UX-DR66, machines §4)
**And** stream-health presentation derives from the backend heartbeat contract, not local timing (NFR-6)
**And** reconnection and reload never duplicate sessions or messages (UXS-02).

### Story 6.6: Finish a session (BCG-012-gated closure)

As a student,
I want to finish my session when my work is done,
So that my supervisor can see the completed transcript.

**Acceptance Criteria:**

**Given** the workspace
**When** Finish renders
**Then** it is explicit and visually secondary, enabled only from backend eligibility — never while a response generates or a message queues (FFR-605, UX-DR68), authoritative wiring gated on BCG-012 (AR-17)
**And** no Discard, Abandon, Cancel-session, or Delete-session control exists anywhere (FFR-603), and no staff surface offers force-completion (FFR-604)
**And** the session is never presented as expired, stale, or lost, with no restart or cleanup offer (FFR-602).

### Story 6.7: Workspace honesty — fixed copy and optional speech

As a student,
I want to know exactly what MIA is and who can see my work,
So that I can decide freely what to write.

**Acceptance Criteria:**

**Given** the tutoring workspace
**When** it renders
**Then** fixed product copy states MIA is AI-powered, no person watches live, and an assigned supervisor can read the session once finished — in every launch locale, never operator-configured, never phrased as a warning, never implying anyone was alerted (FFR-613, UXS-17).

**Given** generated speech
**When** available
**Then** playback uses `media-control` with native affordances, explicit request, adjacent generation/failure state, and revoked stale object URLs (UX-DR31, AD-14); audio is never the only representation (UX-DR56)
**And** the unavailable state never implies a self-service fix (FFR-606).

### Story 6.8: Learning history

As a student,
I want my completed sessions with summaries and follow-ups,
So that I can review what I learned.

**Acceptance Criteria:**

**Given** a completed session
**When** I open it
**Then** the completed transcript, summary, follow-up, and used material render from authoritative state through the locked boundary (FFR-601, AD-6)
**And** the terminal state shows reconciled authoritative content, not the incremental parse (UX-DR75)
**And** history lists paginate per `data-list` rules (UX-DR16).

## Epic 7: Mentoring

Students request mentoring; supervisors triage and assign; mentors respond, schedule, and complete; supervisors grant
the permanent mentor role.

### Story 7.1: Request mentoring

As a student,
I want to request mentoring help,
So that a person can support me where the AI tutor can't.

**Acceptance Criteria:**

**Given** the mentoring capability
**When** new requests are available
**Then** the request flow completes with authoritative state only (FFR-701, NFR-1)
**And** when unavailable, new-request actions are hidden entirely while authorized existing work stays visible (FFR-702)
**And** no copy implies alerting, monitoring, or an emergency channel (NFR-14).

### Story 7.2: Triage and assign requests

As a supervisor,
I want to triage mentoring requests and assign mentors,
So that students get matched with the right person.

**Acceptance Criteria:**

**Given** open requests
**When** I triage and assign
**Then** the lifecycle renders from backend state (FFR-701) with consequential actions on detail surfaces (UX-DR13)
**And** reassignment and mentor removal follow their contract paths, mentor removal under BCG-014 atomic intent binding (NFR-23).

### Story 7.3: Respond and schedule

As a mentor,
I want the authorized briefing and scheduling tools,
So that I can arrange a meeting that works across time zones.

**Acceptance Criteria:**

**Given** an assigned request
**When** I open it
**Then** I see only the compact authorized briefing defined in EXPERIENCE.md — nothing more enters traffic or DOM (FFR-703, NFR-12)
**And** scheduling uses `date-time-field`: local date/time with adjacent IANA zone and resolved offset, DST-gap rejection, explicit overlap offset choice, frozen reviewed instant (UX-DR29, UXS-07)
**And** a scheduled appointment keeps the same instant across profile zone changes, reconfirming after an authoritative zone change (UX-DR79)
**And** the external meeting link renders as an inspectable HTTPS destination — never fetched, previewed, or auto-opened (UX-DR30).

### Story 7.4: Reschedule, cancel, complete (BCG-016-gated closure)

As a mentor,
I want to manage my meeting through to completion,
So that the request closes truthfully.

**Acceptance Criteria:**

**Given** a scheduled meeting
**When** rescheduling or cancelling
**Then** each transition renders only after definitive backend success (FFR-701, NFR-1).

**Given** completion
**When** the control renders
**Then** it is gated on the server-evaluated allowed action, any server-provided recheck instant, and fresh prevalidation — never a local clock or mutation probing (FFR-704), with unknown outcomes reconciled explicitly (AD-12), closure gated on BCG-016 (AR-17).

### Story 7.5: Grant the mentor role (BCG-017-blocked)

As a supervisor,
I want to grant the permanent mentor role by exact user ID,
So that a trusted staff member can mentor my students.

**Acceptance Criteria:**

**Given** the grant flow
**When** I submit an exact user ID
**Then** resolution is bounded and existence-hiding — no account directory, search, or enumeration (FFR-705, NFR-13), the flow independent of the administrator account collection
**And** the grant follows BCG-014 atomic intent binding (NFR-23), permanent role clearly distinguished from scoped assignments (FFR-803 semantics)
**And** the story is **blocked on BCG-017** for target resolution; UI shell and states build against protocol fakes, closure waits for the contract (AR-17, NFR-9).

## Epic 8: Administration and operations

Administrators work accounts, invitations, courses, durable jobs, and audit records through safe conventional lists
and detail pages.

### Story 8.1: Account administration

As an administrator,
I want paginated account lists and detail pages with safe consequential actions,
So that I can manage the platform's users.

**Acceptance Criteria:**

**Given** the accounts list
**When** it renders
**Then** it is a conventional bounded `data-list` — visible row labels, no invented totals, only OpenAPI-supported filters and sorts (FFR-801, FFR-802, UX-DR16, UX-DR26)
**And** permanent roles are visibly distinguished from scoped assignments (FFR-803)
**And** consequential actions (role grant, account deletion) live only on the detail page with scaled confirmation friction — no bulk destructive action anywhere (FFR-804, UX-DR19), role grant and account deletion under BCG-014 atomic intent binding (NFR-23).

### Story 8.2: Invitation administration

As an administrator,
I want to manage outstanding invitations,
So that access stays correct before accounts exist.

**Acceptance Criteria:**

**Given** the invitations list and detail
**When** I revoke or delete a faulty invitation
**Then** the action follows BCG-014 atomic intent binding with fresh review on changed preconditions (NFR-23), off list rows (FFR-804)
**And** invitation state renders from backend truth only — never inferred from acceptance ambiguity (FFR-801, NFR-1).

### Story 8.3: Course administration

As an administrator,
I want course lists and detail pages,
So that I can oversee every course on the platform.

**Acceptance Criteria:**

**Given** the courses list
**When** it renders
**Then** it follows the same `data-list` contract (FFR-801, FFR-802, UX-DR16) with detail-page actions only (FFR-804)
**And** course deletion reuses the Story 3.5 flow (BCG-014) — one implementation, promoted per AD-5, not duplicated.

### Story 8.4: Durable jobs and audit records

As an administrator,
I want visibility into durable jobs and audit records,
So that I can diagnose and account for platform activity.

**Acceptance Criteria:**

**Given** the jobs and audit lists
**When** they render
**Then** they are bounded paginated lists with only OpenAPI-supported filters, sorts, and retry paths (FFR-801, FFR-802) — no generic job retry control exists (non-goal)
**And** job failures disclose through `error-disclosure` with the fixed retry-action vocabulary (UX-DR20, api-client rule)
**And** long-running jobs present truthful state with last-checked time and explicit Refresh (UX-DR62, NFR-2).

## Epic 9: Release readiness

The product owner can certify release: performance budgets measured on the constrained profile, catalog completeness,
the full accessibility evidence matrix, browser-pairing evidence, and the manual review passes.

### Story 9.1: Performance harness and budget evidence

As the product owner,
I want every performance budget measured on the constrained profile,
So that release cannot ship a regression past a budget.

**Acceptance Criteria:**

**Given** the constrained profile (1.6 Mbit/s down, 750 kbit/s up, 150 ms RTT, 4× CPU, cold cache)
**When** the performance suite runs
**Then** FFR-951 (anonymous FCP ≤ 2.0 s), FFR-952 (authenticated paint ≤ 4.0 s through the access cycle), FFR-953 (token paint ≤ 100 ms, ≤ 10 updates/s), FFR-954 (≤ 200 ms at 200 turns), FFR-955 (≤ 250 KB initial route JS), and FFR-956 (≥ 1 Hz upload progress) are each asserted with recorded measurements
**And** this story resolves the spine's deferred harness selection (tooling decision recorded)
**And** exceeding a budget renders as a failed check, never a silent degradation.

### Story 9.2: Accessibility evidence matrix

As the product owner,
I want the complete WCAG 2.2 AA evidence matrix filled,
So that no blocked cell can hide in the release.

**Acceptance Criteria:**

**Given** `ACCESSIBILITY-ACCEPTANCE.md`
**When** the matrix is compiled
**Then** every applicable criterion maps to its `AC-*`/`CP-*` ID with process state and evidence for every release surface at 200 % zoom, 320 px, and 400 % zoom (NFR-27)
**And** the automated categories run green: announcement arbitration, focus contracts, dialogs, safe-Markdown constructs, stream transitions, destructive confirmations (NFR-36)
**And** evidence includes text-spacing overrides, forced colors, reduced motion, target size, clipboard denial, and mixed directionality (UX-DR57)
**And** a blocked cell blocks release.

### Story 9.3: Localization and reflow release checks

As the product owner,
I want every locale and text mode verified at every breakpoint bar,
So that no language or text size ships broken.

**Acceptance Criteria:**

**Given** the seven catalogs
**When** the localization check runs
**Then** completeness holds for every locale, and labels fit at Standard, Large, and Extra large (NFR-24, UX-DR80)
**And** every complete process passes reflow at 320 effective CSS px in all three text modes and at 1280 px with 400 % zoom — page-level horizontal scroll, clipping, overlap, obscured focus, or hidden actions fail the check (NFR-30, UXS-13).

### Story 9.4: Security acceptance suites

As the product owner,
I want the named negative-test suites green,
So that the security posture is demonstrated, not asserted.

**Acceptance Criteria:**

**Given** `SECURITY-PRIVACY-ACCEPTANCE.md`
**When** its suites run
**Then** network non-fetch assertions prove forbidden data never enters traffic (NFR-12), secret teardown proves no credential or protected body survives logout/expiry (NFR-16), and mutation-XSS/DOM-clobbering/chunk-boundary fixtures pass against the locked markdown boundary including the math fixtures gating the KaTeX exception (AD-6)
**And** no fixture secret or protected body reaches a test name, snapshot, trace, or log (NFR-34, AD-11 redaction).

### Story 9.5: Manual release evidence

As the product owner,
I want the mandatory manual evidence collected and recorded,
So that supported browser pairings and content quality are certified.

**Acceptance Criteria:**

**Given** the release candidate
**When** manual verification completes
**Then** per-pairing browser evidence is recorded (browser/OS versions, date, tester, workflows, a11y checks, result) for current stable Chrome, Edge, and Safari on macOS — PO Safari evidence mandatory (NFR-33, NFR-37)
**And** assistive-technology and keyboard evidence, visual checks (zoom, 320 px, text sizes, translations, system fonts), the security review of raw-body display, and the content review (specific praise, safeguarding language, no false monitoring claims) are all recorded (NFR-37).
