# Epic 7 Context: Course preparation clarity

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Make the implemented course-preparation surfaces guide the supervisor: the preparation hub leads with where the course stands and what blocks activation, and the readiness review plus activation confirmation explain what is missing, what activation changes, and what happened to an attempt. This is a presentation-only refinement layered on top of the completed Stories 4.2 and 4.5 — no new routes, backend operations, domain states, or error codes. It was added by sprint change proposal 2026-10-14 (inserted ahead of mentoring; former Epics 7–9 renumbered to 8–10). The redesign package at `tmp/course-preparation-redesign/` is the binding input: its state model (HUB-1..6, RDY-1/2, ACT-1..7) is authoritative where screenshots disagree, and its UX specification, backend-contract evidence, and copy deck govern implementation.

## Stories

- Story 7.1: Status-first preparation hub (states HUB-1..6)
- Story 7.2: Readiness review and activation confirmation (states RDY-1/2, ACT-1..7)
- Story 7.3: Move the build identifier into the sidebar footer (application-shell presentation only)

## Requirements & Constraints

- Truthful by construction: show only server-authored readiness. The blocker count is the length of the server's blocker list, never derived from fields. No "met" rows, checkmarks, progress counts, or per-field change dates anywhere.
- The hub renders exactly one status panel whose tone and content follow the course readiness state, activation eligibility, lifecycle instants, and read outcome (HUB-1..6). Blockers render as cards in server order, mapped by blocker ID, one resolution action each; `supervisor_presence` shows administrator guidance with no action.
- First-activation-eligible courses offer "Review and activate"; all other states with course data offer only "Open readiness review". Previously activated courses get no activation entry anywhere — reactivation is deferred to Story 9.2 and the UI explains it is unavailable on this surface.
- On `503 course_readiness_unavailable`, show no course data at all (no name, pill, fields, or cards): generic H1, breadcrumb ending in "Course preparation", "Check again" retry in the current admission epoch, collapsed technical details.
- The hub performs exactly one read (the course read) — never material, student, or supervisor collections. The activation confirmation additionally sends the activation request.
- Course setup list shows persisted values or explicit empty text (two-line excerpts for learning goals, AI instructions, curriculum); blocker badges appear only for server-reported blocker IDs. Course language row shows display name in the interface language plus the stored BCP 47 tag, e.g. "English (en)".
- Activation outcomes: pre-dispatch re-read disables Confirm; changed facts show an alert and Changed badge and require a new deliberate confirmation; definitive rejection shows a red alert with technical details and no form; lost response/undeclared 5xx/Stop waiting is an unknown outcome with explicit Refresh/Abandon actions and zero automatic retry; validated success navigates to the hub, which re-reads and announces success once.
- All strings come from `messages.ts` and the seven locale catalogs (story specs record the copy-deck key changes: new/reuse/replace/retired). Course names render in `<bdi>`.
- Reflow at 390 CSS pixels: setup rows and cards stack, nothing scrolls horizontally. Story 7.3 must preserve the shell's existing narrow-width behavior.
- Accessibility: exactly one `h1` per page, status panel heading is `h2`; status never conveyed by color alone (icon shape plus text); inline actions get full accessible names ("Edit learning goals"); native `disabled` on pending Confirm; ACT-4/5/6 focus the outcome heading with the Story 4.5 announcement rules; technical details use a native `details` element; existing AC-001..019 apply.

## Technical Decisions

- Only two operations: `GET /api/v1/courses/{id}` (all three surfaces' sole read) and `POST /api/v1/courses/{id}/activations` (no body, CSRF required). `200` with a CourseDocument is the only definitive success; `409 course_invalid_state` / `course_activation_unavailable` are definitive rejections; activation has no idempotency key, so undeclared 5xx/lost response is an unknown outcome. Contract verified against backend `63c99925`; the 4.2/4.5 BCG-011 slice decisions cover everything — no new backend gap.
- Hub presentation state derives from `readiness.state`, `readiness.activation.eligible`, and `activated_at`/`deactivated_at`. HUB-2 requires `inactive_activatable` AND `eligible = true`; if they disagree, existing Story 4.5 integrity validation treats it as a protocol failure and activation stays unavailable.
- Known blocker IDs: `learning_goals`, `ai_tutor_instructions`, `language`, `supervisor_presence`, `qualifying_material`. Returned blocker links are API paths, not client routes: map by blocker ID after validating the same-course link; never use returned link text as an href or fetch target.
- Frontend state machine 12 is unchanged — this epic owns only the presentation mapping onto it. Loading, hidden denial (404), and restricted-session treatments keep their existing behavior.
- Presentation-only: no transport or domain-layer changes. Each presentation element binds an exact Tailwind Plus blueprint recorded at its presentation owner (per the DESIGN.md inheritance rule).
- Test expectations: Playwright fixtures for every HUB/RDY/ACT state (structure and copy, not pixels); negative tests for no activation entry on previously activated courses, no href from blocker link text, no extra collection reads, no "met" indicators; per-page accessibility checks. Bundle budget respected; full gate green.

## UX & Interaction Patterns

- Hub section order: header (breadcrumb Prepare courses › course name, `h1` course name, meta row with state pill/Last checked/Refresh) → status panel → "Blocking activation" / "Blocking new tutoring sessions" → "Course setup" list → "Materials and students" entry cards.
- Status panel tones: amber (blocked), indigo (ready to activate), gray (previously activated), green (active accepting), red (readiness unavailable). Verify each for WCAG 2.2 AA contrast.
- Blocker card: accessible-named "Unmet" icon, `h3` name, explanation, one secondary action that wraps below text at narrow widths. Entry cards are single whole-card links with icon tile, title, optional badge, one-line description. Badges: Inactive, Active, Optional, Blocks activation, Blocks new sessions, Changed.
- Readiness review: status panel (RDY-2 carries "Continue to activation"), unmet prerequisites reusing the hub blocker card, then a static "How course readiness works" explanation — product knowledge with no status icons or checkmarks. States without mockups reuse the matching hub panel without an activation entry.
- Activation confirmation: narrower (~720px) column; action panel with reviewed facts (Course, Current state, Unmet prerequisites), fixed three-item "What changes" list, pre-dispatch note, footer with status text/spinner plus Cancel-or-Stop-waiting and Confirm activation. Breadcrumb extends Prepare courses › course name › Course readiness › Activate course.

## Cross-Story Dependencies

- Story 7.2 depends on 7.1 for the shared status panel and blocker card components. Story 7.3 is independent (application shell footer).
- The epic sits on top of completed Stories 4.2 (hub) and 4.5 (readiness/activation): their authoritative-readiness, no-invented-scores, and hidden-denial behavior is preserved underneath the new presentation; repair only demonstrated defects.
- Reactivation/deactivation remain owned by Story 9.2; Epic 10's evidence matrices will cover the new presentation states when those stories land. Implementation order is 7.1 → 7.2 → 7.3, with 7.1 the sprint's next story.
