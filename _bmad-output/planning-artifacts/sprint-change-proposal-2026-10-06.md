---
status: applied
date: 2026-10-06
scope: moderate-backlog-reorganization
approval: user-requested-replanning-and-explicit-existing-backend-choice
---

# Tutoring-first MVP — applied sprint change

## Issue and decision

The owner reports that Epic 1 took too long and produced supporting authentication functionality rather than proof of
MIA's core student tutoring experience. Source: `tmp/epic-re-planning.md`; Epic 1 retrospective records the delivery
overhead and open corrective work. This is a priority/scope correction, not a request to restart implementation.

The user requested applying the replan and updating sprint status. One material backend conflict was resolved explicitly:
students are provisioned by an assigned supervisor into an active course; administrators cannot invite them before a
course exists. The user selected **Existing backend (Recommended)**. Authority:
`mia/docs/api-authentication-and-user-invitation.md:85–110`, with current backend product rules/OpenAPI owning behavior.

Mode: batch application of the owner's stated direction and confirmed dependency choice. No new framework, backend
authorization change, role-based MFA requirement, or production-code change is part of this task.

## Before → after

- **Before:** broad shell/Home/profiles → courses → full materials → provisioning/oversight → tutoring → mentoring →
  administration (including the supervisor invitations needed much earlier) → release evidence.
- **After:** basic navigation → supervisor invitation and password setup → create assigned course, upload/process/review
  and approve material, activate → provision student and replace temporary password → tutor/resume/finish/second session.
- **Before:** supporting feature families could consume entire epics before any student could learn.
- **After:** working backend-connected outcomes determine the story boundary; optional supporting slices remain explicit
  later backlog. A frontend mockup alone does not satisfy the tutoring milestone.

## Scope and impact

Epic 1 stays implemented. Its done stories, rejected retrospective verdict, and open action items remain intact. Only
concrete shared lifecycle/logout defects on reused paths are included with navigation; an all-MFA perfection project is
not a predecessor to basic navigation. Existing factors and challenges are not disabled.

Unstarted Epics 2–6 are reorganized into 17 outcome-oriented stories. Epics 7–9 remain later backlog. New story IDs
replace unstarted IDs; no implemented story is renamed. No future detailed story files were found to migrate. The
`spec-mia-frontend/stories.yaml` file is the completed Epic 1 bundle and stays historical.

The original epic document is preserved in `archive/epics-before-tutoring-mvp-2026-10-06.md`. Requirement identifiers,
backend contracts, route inventory, state machines, component bindings, and acceptance criteria for retained behavior
are not renumbered. The amended PRD controls which slices are built now; the archive retains deferred detail.

## Story migration map

Old identifiers below refer only to the archived pre-replan backlog. New identifiers refer to current `epics.md`.

- Old 1.1–1.9 → unchanged completed history.
- Old 2.1 → new 2.1 basic shell/navigation; old 2.3 → new 2.2 routing/recovery.
- Old 2.2/2.4/2.5 → later 8.1 full Home/profiles. Neutral Home and later student resume entry are in new 2.1/6.1.
- Old 8.2 supervisor invitation subset → new 3.1; existing 1.3/1.7 integration → new 3.2.
- Old 3.1 + minimum old 8.3 list/detail and old 8.1 supervisor selector → new 4.1 course creation and initial assignment.
- Old 3.2 + teaching fields from 3.3 → new 4.2; logos and extended management → later 8.2.
- Old 4.1/4.2 course-wide material draft/upload → new 4.3; student-private variants/enhancements → later 8.2.
- Old 4.3/4.4 → new 4.4 finalize/process/brief/approval.
- Old 3.4 activation/readiness → new 4.5; remaining deactivation/reactivation, old 3.5 and 4.5 destructive/download
  scope → later 8.2.
- Old 5.1 + minimum roster from 5.3 → new 5.1; existing 1.3/1.5 plus joined-course entry → new 5.2.
- Old 5.2 and remaining 5.3–5.5 → later 8.3 student support and oversight.
- Old 6.1 creation/discovery and fixed workspace disclosure from 6.7 → new 6.1 start/resume.
- Old 6.1 free-form intent/static starters + old 6.2 → new 6.2 composer/send/queue; old 6.3/6.4 → new 6.3 stream/stable reading.
- Old 6.5 → new 6.4 stop/retry/recovery; old 6.6 + completed transcript → new 6.5 finish.
- Old 6.7 optional speech and remaining 6.8 → later 8.4. New 6.6 proves the full tutoring chain.
- Old 7.1–7.5 → unchanged later mentoring scope.
- Old 8.1/8.3/8.4 and non-supervisor invitation scope → later 8.5, excluding subsets already moved earlier.
- New later 8.6 tracks remaining optional MFA management and MFA-specific follow-up; no completed code is removed.
- Old 9.1–9.5 → same later formal evidence work; mandatory checks on implemented paths still apply continuously.

## Artifact edits applied

- `epics.md`: execution order, concise Given/When/Then acceptance, retained/deferred boundaries, dependency notes,
  and requirement coverage. Previous full inventory moved to the archive.
- `FRONTEND-PRD-FOUNDATION.md`: tutoring-first milestone precedes the broader release-one inclusion list. Allows neutral
  initial Home, prioritizes native upload/teaching workflow, defers supporting families, retains essential boundaries.
- `EXPERIENCE.md`: points shell composition and surface delivery to that amendment; no canonical path changed.
- `ARCHITECTURE-SPINE.md`: points delivery sequencing to the amended scope; technology and ownership decisions unchanged.
- `SPEC.md`: distinguishes broad product capabilities and completed Epic 1 bundle from the current execution plan.
- `sprint-status.yaml`: preserves history/actions, replaces unstarted keys with the new backlog, identifies the milestone
  and next story. Later work remains valid `backlog` status, not a fabricated `deferred` lifecycle value.

## Dependencies and readiness

The fastest plan uses current backend boundaries, not a frontend approximation of unavailable operations. There is no
backend implementation task added by this replan. At story preparation, check current OpenAPI and reconcile any stale
gap record with specific evidence; do not infer closure from endpoint existence alone.

- Navigation: BCG-001/003 relevant session/capability operations and shared lifecycle fixes.
- Invitations: BCG-006 delivery/ambiguity; existing 1.7 acceptance is reused.
- Courses/materials: BCG-003/005/007 applicable authorization/no-store/error behavior, BCG-011 readiness/eligibility,
  exact upload/processing/approval transport. Initial assignment needs the relevant BCG-008 supervisor-selection slice
  checked against the current administrator account collection, not the full directory UX.
- Tutoring: BCG-002 active-session discovery, BCG-011 start eligibility, BCG-012 work/finish eligibility, and contracted
  streaming snapshots/heartbeat. BCG-004 only where summaries are actually exposed.
- BCG-008 broad account directory, BCG-009/010/015 extra MFA/mobile, BCG-013/016/017 mentoring, and BCG-014 deferred
  destructive operations do not block independent navigation or password-only onboarding. If an implemented operation
  does require one of them, it must be resolved for that operation; this is sequencing, not a waiver.

All future stories remain backlog until their own contract and implementation plan is ready. No blanket readiness or
release certification is claimed. No backend-gap statuses or existing tests were disabled.

## Approach and handoff

Chosen approach: direct backlog adjustment plus a narrower first functional milestone. Rollback of working authentication
is rejected: it would spend more effort and break already-used flows. Scope is moderate planning reorganization with
existing architecture; effort/risk concentrates in course/material integration and streamed tutoring, not new MFA.
No time estimates are asserted. The outcome is an earlier student demonstration, not a promised completion date.

Next developer task: **2-1-basic-capability-driven-navigation**, followed by the order in sprint status. Reuse existing
components, prepare only the next story, and report the working user outcome. Do not start all deferred families or
implement every retrospective recommendation before navigation. Workflow-rule optimizations remain separate proposed work.

Definition of the functional milestone: a backend-served UI enables administrator → supervisor → prepared active course
→ provisioned student → password replacement → actual tutoring → finish → second session. Automated providers remain
local fakes; any live-provider demonstration is an explicitly operator-authorized manual exercise. Nonblocking defects
can be recorded; authorization failures, unsafe replay, or absence of a working tutoring path cannot be called success.

## Checklist disposition

- [x] Trigger/evidence: owner feedback and explicit replan request.
- [x] Epic assessment: all remaining epic families mapped; implemented history preserved.
- [x] Artifact impact: PRD, epics, UX, architecture, spec, and sprint tracking aligned by references.
- [x] Options: direct adjustment and narrowed milestone chosen; rollback rejected.
- [x] Approval: explicit request to apply, plus confirmed existing-backend student onboarding order.
- [x] Handoff: next story and acceptance outcome named; future stories remain backlog.
- [N/A] Infrastructure/telemetry/backend changes: none required by the planning edit.
- [!] Implementation readiness: per-story OpenAPI/BCG reconciliation and detailed implementation specs still required.
- [!] Release readiness: original release evidence and unresolved defects remain tracked, not certified by replanning.

## Correction addendum — 2026-10-06

All 17 MVP outlines were checked against the approved PRD amendment, current implementation and relevant OpenAPI.
`epics.md` owns the corrected boundaries: bounded C1/C3 navigation remediation; feature-owned gates; minimal supervisor
selection; staged readiness links; upload and first rich-rendering implementation ownership; activation-only completion;
separate session start and deliberate composer send; current-work integration from first send; fenced stream loss and
explicit recovery; and a focused backend-connected milestone using accumulated evidence. No PRD conflict was found.

The migration map now explicitly retains the selector, deferred lifecycle and composer ownership splits.
Current resource schemas already define SSE snapshots/events and the 15-second idle heartbeat; only evidenced remaining
transport gaps need resolution. These clarify the map and dependency summary above, not backend-gap closure.

Stories 3.1, 5.1, 5.2 and 6.5 were checked with no independent changes needed. The 17-story queue, IDs, statuses,
next story 2.1, nine completed Epic 1 keys/specs/history, retrospective actions and archived baseline are preserved.
None of the 17 outlines is yet ready-for-dev; per-story prerequisite/contract verification remains necessary.
