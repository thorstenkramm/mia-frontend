# Sprint Change Proposal — Course preparation clarity

Date: 2026-10-14
Trigger: `tmp/course-preparation-redesign/` planning package (README + files 01–06 + screenshots)
Mode: Incremental; all six edit proposals individually approved by the product owner.

## 1. Issue Summary

The implemented course preparation hub (Story 4.2) and the readiness review / activation confirmation (Story 4.5)
work correctly but do not guide the supervisor: eleven equally weighted destinations on one page, no status-first
answer to "what blocks activation and what comes next", prerequisite explanation detached from its action, saved
teaching content invisible without drilling into each editor, and the build identifier inside the main content area.

This is a requirement refinement discovered by using the implemented surfaces — not a technical failure and not a
backend gap. The redesign package verifies every displayed fact against the OpenAPI contract and backend code at
`63c99925e5995fe2e2467f4f894976dfd4c0d297`; it adds no route, no backend operation and no new course domain state.

Evidence: `01-change-brief.md` (goals G1–G5, requirements CPR-FR-01..11, CPR-NFR-01..07), `02-ux-specification.md`,
`03-state-model.md` (HUB-1..6, RDY-1/2, ACT-1..7), `04-backend-contract.md`, `05-copy-deck.md`,
`06-planning-impact.md`, `screenshots/`.

## 2. Impact Analysis

### Epic impact

- Epic 4 (completed) is not invalidated: 4.2/4.5 behavior — authoritative readiness, no invented scores, hidden
  denial — is preserved underneath the new presentation.
- One new epic is added: **Epic 7 "Course preparation clarity"**, implemented next, before mentoring.
- Owner decision: **insert and renumber** rather than append. Mapping:

  | Before | After |
  | --- | --- |
  | Epic 7 Mentoring (7.1–7.5) | Epic 8 (8.1–8.5) |
  | Epic 8 Deferred supporting surfaces (8.1–8.6) | Epic 9 (9.1–9.6) |
  | Epic 9 Complete release evidence (9.1–9.5) | Epic 10 (10.1–10.5) |

- No planned epic becomes obsolete. Epic 9.2 (was 8.2) keeps reactivation/deactivation/logos; the redesign explicitly
  defers reactivation to it. Epic 10 evidence matrices will cover the new presentation states when those stories land.

### Story impact

- New stories 7.1 (status-first hub), 7.2 (readiness review + activation confirmation), 7.3 (build identifier moves
  into the sidebar footer — owner decision expanding the package's scope to the application shell).
- Completed stories unchanged. Historical completed-story specs and review documents keep their original numbering;
  they are dated records, interpretable through the mapping table above.

### Artifact conflicts

- PRD (`FRONTEND-PRD-FOUNDATION.md`): no conflict. FFR-302/FFR-305/UXS-04 align with the redesign. No MVP change.
- Architecture: no conflict; presentation only. Tailwind Plus blueprint bindings are recorded per story.
- UX documents updated: `EXPERIENCE.md` §Course Preparation; `SURFACE-STATE-MATRIX.md` Prepare rows + dated note;
  `FRONTEND-STATE-MACHINES.md` machine 12 dated note (no state change). Unchanged: `ROUTE-INVENTORY.md`, `DESIGN.md`,
  `ACCESSIBILITY-ACCEPTANCE.md`, `SECURITY-PRIVACY-ACCEPTANCE.md`.
- `BACKEND-CONTRACT-GAPS.md`: two living "Story 8.2" references renumber to 9.2; no content change.
- `sprint-status.yaml`: renumbered epic/story entries, new Epic 7 entries, `next_story` =
  `7-1-status-first-preparation-hub`.
- Implementation-time artifacts (owned by the new stories, not this proposal): `messages.ts` and the seven catalogs
  per the copy deck, including joint removal of the retired keys; the 4.2 hub and 4.5 readiness/activation
  presentation owners; the application shell footer (7.3).

### Technical impact

None at the transport or domain layer. Test expectations per the package: Playwright fixtures for every HUB/RDY/ACT
state, negative tests (no activation entry for previously activated courses, no href from blocker link text, no extra
collection reads on the hub, no "met" indicators), accessibility checks per page.

## 3. Recommended Approach

**Direct Adjustment** (Option 1): add Epic 7 with three stories and update the four living documents. Effort: Medium
(renumbering churn plus presentation implementation on verified contracts). Risk: Low (no backend change; machine 12
untouched; no new transport). Rollback is not applicable — completed behavior stays valid. MVP scope is unchanged.

Owner rulings recorded with this proposal:

1. Insert + renumber (not append as Epic 10).
2. Implement now, before mentoring (new Epic 8).
3. Course language row shows display name and stored tag, e.g. "English (en)".
4. Build identifier moves to the sidebar footer **in this epic** (Story 7.3), overriding the package's shell exclusion.
5. Two-line excerpts for learning goals / AI instructions / curriculum confirmed.

## 4. Detailed Change Proposals

All six approved incrementally:

1. **epics.md** — insert Epic 7 (stories 7.1 status-first hub covering CPR-FR-01..08/HUB-1..6; 7.2 readiness review +
   activation confirmation covering CPR-FR-08..11/RDY/ACT states, depends on 7.1; 7.3 build identifier to sidebar
   footer), with the acceptance criteria from `06-planning-impact.md` plus ruling 3. Renumber Epics 7→8, 8→9, 9→10 and
   all in-file forward references ("later 8.5" → 9.5; "deferred to 8.2" → 9.2 ×2; "Epic 9" → Epic 10 ×4). The
   historical provenance line "Original 8.1..8.4…" stays as a pre-replan citation.
2. **sprint-status.yaml** — renumbered tracker blocks, three new Epic 7 story entries, `next_story` =
   `7-1-status-first-preparation-hub`, header comment "Epics 7-9" → "Epics 8-10".
3. **EXPERIENCE.md** — §Course Preparation rewritten status-first (status panel → blockers → saved course setup →
   entry cards; explanatory readiness review; activation outcomes; truthful-by-construction; guided-field contract
   preserved verbatim).
4. **SURFACE-STATE-MATRIX.md** — Prepare rows carry the HUB-1..6 / RDY-1/2 / ACT-1..7 presentation-state references;
   dated note that Epic 7 owns the presentation mapping while domain states, routes and the 4.5 BCG-011 slice decision
   stay unchanged.
5. **FRONTEND-STATE-MACHINES.md** — dated note on machine 12: presentation mapping lives with Stories 7.1/7.2; states
   and transitions unchanged.
6. **BACKEND-CONTRACT-GAPS.md** — two "Story 8.2" references → 9.2.

## 5. Implementation Handoff

**Scope classification: Moderate** — backlog reorganization plus binding-document updates, then ordinary story
implementation.

1. **Planning application (this workflow, on approval):** apply the six approved edits to the living documents.
2. **Story implementation (epic-solver workflow):** stories 7.1 → 7.2 → 7.3 run through the standard
   prepare → implement → review → fix → verify → commit cycle. Inputs: the redesign package (state model is
   authoritative where screenshots disagree), the updated binding documents, Tailwind Plus blueprints per DESIGN.md.
   Story specs must record the copy-deck key changes (new/reuse/replace/retired across all seven catalogs) and the
   negative-test expectations.
3. **Success criteria:** every HUB/RDY/ACT state covered by fixtures; no extra collection reads on the hub; no "met"
   indicators; no activation entry for previously activated courses; bundle budget respected; full gate green.
4. The `tmp/course-preparation-redesign/` package stays uncommitted input; binding content now lives in the planning
   artifacts.

## Approval

Approved by the product owner 2026-10-14: all six proposals individually approved in incremental mode, and the
complete proposal approved for implementation. The six document edits were applied on approval; stories 7.1–7.3 route
to the epic-solver workflow with `7-1-status-first-preparation-hub` as `next_story`.
