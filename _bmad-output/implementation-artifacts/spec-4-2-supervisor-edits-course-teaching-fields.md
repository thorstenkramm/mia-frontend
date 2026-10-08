---
title: Supervisor edits course teaching fields (Story 4.2)
type: story
story: 4-2-supervisor-edits-course-teaching-fields
created: 2026-10-08
status: done
phase: commit
baseline_commit: 821e57a47481b0ad912ee9a2b36bdf2599a84fa9
backend_commit: 63c99925e5995fe2e2467f4f894976dfd4c0d297
prepare_model: openai/gpt-6.1-sol
---

# Story 4.2 — Supervisor edits course teaching fields

## Boundary and preparation disposition

Current `epics.md:190-202` owns this story, not the archived backlog. Approved batch: Epic 4, Stories 4.1–4.5,
separate reviewed and verified commits, no push, stop before Epic 5. This spec prepares **only 4.2**. Solver owns
tracking/checkpoints and later dispatches. No implementation, application tests/builds, staging or commit in prepare.

In scope: assigned-supervisor preparation hub; server-authored readiness and unmet prerequisites; description/core
details, curriculum, learning goals, AI instructions and course-language editing; persisted confirmation and corrective
validation; focused plain-text guidance, revealable examples, exact previews and code-point/byte feedback. Course name
is persisted read-only context here: only administrators may rename (`mia/docs/api.md:548-555`, OpenAPI PATCH 403).
Learning goals and instructions are separate routes, values and PATCH fields, never a combined prompt field.

Excluded: logo/avatar, rich template polish/template management, course rename controls, assignments/removal, deletion,
activation/readiness-review action routes (4.5), upload/material links (4.3), brief links/locked Markdown work (4.4),
provisioning/roster (5.1), deactivation/reactivation, Home aggregation, MFA expansion, baseline authentication cleanup,
backend changes, new packages, generated-API regeneration, generic controller/router/store refactors.

Preparation is **ready**. O1 was initially pending, then owner approval arrived in the solver-owned 4.2 checkpoint during
this call. The required GET/PATCH transport **exists**; the historical frontend suspension is not a missing endpoint.
Record the approved narrow canonical slice notes before dependent application wiring in the next authorized phase;
do not declare blanket closure or invent an eligibility/progress calculation. No canonical edits are made in prepare.

## Baseline, prerequisite and preserved work

HEAD is `821e57a47481b0ad912ee9a2b36bdf2599a84fa9`, the committed 4.1 prerequisite; index is empty. Inspected solver-owned
4.1 checkpoint records reviewed PASS and final gate PASS: 671 unit, 163 bundled-Chromium browser tests, 17 components,
no skips, one build; this is prior evidence, not a new run for 4.2. Reuse its settled O1 account-selector and O2 assigned-ID
discovery decisions by canonical reference, without reopening them.

Known baseline dirt, all excluded from worker ownership:

- `.opencode/agents/epic-reviewer.md`
- `.opencode/agents/epic-solver.md`
- `.opencode/agents/epic-worker.md`
- `.opencode/opencode.json`
- `.opencode/story-execution.md`
- `_bmad-output/implementation-artifacts/execution/2-1-basic-capability-driven-navigation.yaml`
- `_bmad-output/implementation-artifacts/execution/2-2-working-routes-and-parent-navigation.yaml`
- `_bmad-output/implementation-artifacts/execution/3-1-administrator-invites-a-supervisor.yaml`
- `_bmad-output/implementation-artifacts/execution/3-2-supervisor-account-setup-and-password-only-entry.yaml`
- `_bmad-output/implementation-artifacts/execution/4-1-administrator-creates-a-course-with-a-supervisor.yaml`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- Untracked `_bmad-output/implementation-artifacts/epic-2-retro-2026-10-07.md`

Backend HEAD is `63c99925e5995fe2e2467f4f894976dfd4c0d297`. Preserve modified
`.agents/skills/bmad-brainstorming/assets/brain-methods.csv` and untracked `docs/api-authentication-and-user-invitation.md`.
No unknown overlap was observed. Do not stash/revert/stage baseline work. The manifest records explicit future story
paths separately from prepare changes; solver-owned tracking is never implicitly in that manifest.

During finalization the solver created untracked
`_bmad-output/implementation-artifacts/execution/4-2-supervisor-edits-course-teaching-fields.yaml`. It was read, recognized
as authorized solver bookkeeping and preserved without worker edits. Its `completed_blocks` and `owner_decisions` record
the newly approved narrow readiness resumption. This is not an unknown source overlap or a new worker-owned artifact.

## Tool/model availability

Inspected cached tooling only: Node 24.21.0, npm 11.19.0; every installed runtime/dev dependency matches its exact
`package.json` declaration. Playwright 1.63.0 bundled Chromium executable exists; Trivy is on PATH. JSCPD and
markdownlint-cli executables exist in npm's cache. No installs, network tooling probes or paid-provider calls occurred.
Licensed Tailwind Plus library `2026-09-13-083323` exists; exact light React blueprints below were resolved/read through
the Tailwind Plus skill. Its older stack sentence does not override repository React 19.3/Tailwind 4.3 contracts.

Runtime catalog confirms active worker `openai/gpt-6.1-sol#high`, solver/reviewer `openai/gpt-6-astra#high`, and approved
fallback `mistral/mistral-medium-2604#high`; all expose `high`. This call uses `openai/gpt-6.1-sol`; actual variant is
not separately exposed. Catalog availability does not prove quota. No orchestration skill or nested agent invoked.

## Binding contracts and actual BCG-011 slice

UX companions are under `_bmad-output/planning-artifacts/ux-designs/ux-mia-frontend-2026-09-12/`:

- `FRONTEND-PRD-FOUNDATION.md:274-283` (FFR-302..305); `EXPERIENCE.md:537-542,619-640` (non-linear preparation).
- `ROUTE-INVENTORY.md:488-599`: assigned-list O2, hub and five field routes, canonical parents and safe exits.
- `SURFACE-STATE-MATRIX.md:50-83,286-313`: G/F/D/W, persisted forms, stale input, checking/readiness and safe loss.
- `FRONTEND-STATE-MACHINES.md` §1/9/12/18/23/24/28/29: ordered admission, readiness, dirty/post-save reconciliation,
  explicit reads, security override, announcement owner and raw disclosure. Machine 12's full action matrix is not 4.2.
- `ACCESSIBILITY-ACCEPTANCE.md` AC-001..005/008/009/012/016/019 and CP-03 field/hub subset, including contrast,
  unfocused enabled control boundaries, errors, exact preview, locale/direction, route focus and reflow.
- `SECURITY-PRIVACY-ACCEPTANCE.md` Protected Mount; Teardown/Cache/Existence-Hiding/Secret-Hygiene Negative Tests
  (`463-493`, `874-892`, `922-941`); least-data fetching and print suppression.
- `DESIGN.md:85-100,110-115,163-200`: licensed binding, default inheritance, contrast and MIA component deltas.
- `BACKEND-CONTRACT-GAPS.md` BCG-011 `1069-1119`; existing accepted API/session/error slice decisions remain in force.
- Backend product: `mia/docs/product-requirements.md:799-823,838-843`; API narrative `mia/docs/api.md:548-562`.
  The implemented OpenAPI owns transport; this spec does not become a second schema/policy authority.

### Existing authoritative course read

`mia/api-doc/openapi.yaml` references the course path family; `paths/courses.yaml:59-87` contracts `getCourse`:
authenticated GET `/api/v1/courses/{id}`, JSON:API 200, no-store, strong ETag, viewer-safe authoritative readiness;
401 sign-in loss, restricted 403, missing/out-of-scope 404 `course_not_found`, 406, and 503
`course_readiness_unavailable`. No separate `/readiness` API is needed or to be invented.

`schemas/resources/resources.yaml:577-648,685-738,796-817` already defines nullable teaching fields and `CourseReadiness`:
four stable readiness states, separate activation/new-session eligibility, stable preparation blocker IDs with nullable
links, and blocker visibility only for assigned supervisors. Parse this assigned-preparation projection separately from
4.1's minimized `Course`; do not widen administrator/discovery models to retain all preparation/private fields.
Do not turn `new_session.eligible` into supervisor Start, or show activation controls before 4.5.

Inspected backend `internal/course/readiness.go:102-185` evaluates from source records and emits API-resource links:
the three field blockers address `/api/v1/courses/{id}`, supervisor presence addresses its `/supervisors`, qualifying
material addresses its `/materials`. These are **API links, not SPA hrefs**. Do not directly navigate/fetch arbitrary
returned link strings. Under proposed O1 map only stable field blocker IDs with verified same-course course-resource
links to the corresponding already-registered canonical client field route. Material and supervisor blockers stay
truthful text-only in 4.2; null, unsupported or noncanonical links never become interactive or trigger requests.
Details/curriculum routes are ordinary preparation links, not invented activation blockers. No material-list read is
needed to decide readiness, processing stage, approval status, or which specific file caused a material blocker.

Backend corroboration inspected, **not executed**: `TestCourseReadinessIsCurrentAndViewerSafe`
(`internal/course/course_test.go:98-156`) covers incomplete/activatable, activation, student minimization/eligibility,
active-session restriction and active-but-not-accepting. `TestCourseReadinessDependencyFailureIsUnavailable` at 323
covers dependency failure. This does not establish full frontend lifecycle or all broader BCG-011 concurrency evidence.

### Existing edit transport

`paths/courses.yaml:88-124` contracts `updateCourse`, PATCH same course path with session+CSRF; 200 CourseDocument;
400/401/403/404/406/409/413/415/422 as declared. 409 distinguishes `course_name_taken` from
`course_activation_unavailable`; 422 is `course_invalid`. 403 includes `csrf_invalid`, restricted stage and
`course_unauthorized`. Reuse existing identity-preserving `ApiFailure` and session handling, not guessed statuses.

`schemas/requests/requests.yaml:407-425,549-577,662-665` owns PATCH identity, present fields, bounds and Language.
Send `type=courses`, exact path ID, and only the current route's changed attribute. No relationships, name, logo,
activation, request ID or If-Match header: PATCH does not require a destructive-review ETag. Learning goals and
instructions remain distinct attributes. Optional absent text/language is `null`, not a fabricated empty stored string.
Preserve entered text for correction/preview; pre-normalization code-point and UTF-8 byte feedback checks the documented
description 4,000/16 KiB and longer text 16,000/64 KiB bounds. Backend persists its normalized/null result; install that
returned value only after validation of definitive success. Do not reject whitespace-only inactive optional text as a
guessed activation policy: readiness is the server's decision.

Language is valid non-private-use BCP 47, not limited to the seven interface locales. Use a labelled tag input with
inline examples and backend validation/canonical persisted confirmation; do not invent a languages enumeration or
silently negotiate it to an interface fallback. No guessed maximum or custom backend language-equivalence parser.

## Grouped owner decision O1 — approved 2026-10-08

Owner approved a **narrow Story 4.2 BCG-011 readiness resumption** in the solver checkpoint's `owner_decisions.readiness_reconciliation`
and `completed_blocks` (lines 12,20-25). Record it in canonical companions, using existing `getCourse`
and returned `updateCourse` readiness for the assigned-supervisor hub and field editing only, including safe mapping
of same-course API field blocker links to implemented client routes. Keep material/supervisor blockers noninteractive
until their destinations exist. Keep activation/session-start, full concurrency/release closure and other slices open.

Precise conflict: BCG-011 `1088-1092` says Course has no readiness/prerequisite/eligibility and readiness is discoverable
only by POST failure, whereas current OpenAPI `courses.yaml:71-87` and resources `633-636,685-738,796-817` explicitly
provide them on GET. Machine 12 `431-432` still suspends those states; surface matrix `291-293` suspends the hub/review;
CP-03/STA at accessibility `1042` still records BCG-011 Blocked. 4.1 O2 explicitly grants **discovery only** and says
broader hub/readiness remains unchanged. The worker cannot silently treat its prior approval as hub authorization.

Settled disposition: narrow reconciliation, not a new backend endpoint or global ledger closure. The decision settles
the prior suspension; do not ship an approximate hub or implement only fields as if the acceptance were complete.
Solver's next-phase dispatch must include the directly affected canonical paths before edits: BCG ledger,
machine 12 note, Prepare surface matrix and CP-03 slice note. Route inventory already owns all six client routes;
its 4.1 historical subset note need not be deleted or broadened. No other product decision presently identified.

Human-interaction alert sent once before blocked handoff via `$HOME/.local/bin/pushover`, exact prefix
`interaction needed:`; command exit 0 (local helper delivery reported successful; no independent device receipt claim).
Solver should not duplicate this alert; the owner decision is now received in its checkpoint.

## Approved bounded implementation blocks — next phase only

### Block 0 — approved narrow canonical reconciliation

Before application wiring, record dated O1 notes in the four companion paths declared in the manifest. Reconcile the stale
missing-readiness claim for this assigned-supervisor hub/read/edit slice only; machine 12/surface/CP-03 notes must not
mark unexecuted accessibility or full activation/student-session/release evidence Pass. Preserve broader obligations.
This prepare writes only the spec and tmp evidence as requested; next-phase authorization must include these notes.

### Block 1 — API projection and actual-test hygiene inventory

Extend existing `platform/api/courses.ts` with assigned-preparation parsing/read/update and typed readiness projection;
share only existing identity/core transport ownership. Keep existing discovery/admin schema narrow. Validate returned
identity, enumerated state/blockers and field shapes, and strict same-course safe links. Unknown/malformed required
readiness fails closed, never a synthetic empty blocker list. State is server-authored, not recomputed from fields.
Reuse generated operations; extend `courses.test.ts` for least projection, payload/status/media, persisted normalization,
links, denied read, malformed success and lost-response single-dispatch evidence.

Define the new actual-test failure inventory and runtime markers **with the first tests**, not after UI review: course
description/curriculum/goals/instructions/language, names, raw errors and CSRF, plus inherited handoff secrets actually
used. Extend current unit/browser hygiene owners rather than inventing another canary-only suite. Mark checkpoints for
entered input, submitted/unconfirmed state, persisted/reconciled state, denial raw body and teardown. Safe assertions
use booleans/fingerprints; screenshots/traces/videos/HAR/DOM dumps disabled for protected tests. Deliberately fail actual
cases, require exact checkpoint and controlled failure identity, scan full stdout/stderr/artifacts and reject early failure.

### Block 2 — scoped route-resource admission and hub

Register only hub and five field routes at the inventory's canonical paths. Extend existing `authenticatedRoute`
projection with current supervised IDs to reject unassigned paths **before course GET**, including multi-role admin or
student membership cases. App passes opaque course ID to `PrepareCourseRoute`; existing session/admission owners still
perform session → complete capabilities/scope → route resource → dependent data. No new global authorization owner.

Extend `CourseResourceHost`/`CourseRouteResource` for the admitted preparation resource; separate list batching from
detail admission. Key by location/security/scope epoch. Gate the whole feature tree, not individual protected children.
Known scope is not permanent access: GET/PATCH denial invokes host teardown immediately, dropping forms/drafts,
preview, prior course identity, readiness, open dirty dialog and callback references before the fixed safe result.
Retain only the current numeric status/raw body in collapsed `TechnicalErrorDisclosure`. Session/restricted failures
use the existing shield. Late reads/save successes cannot remount or announce old data.

Hub renders course scope/name, persisted lifecycle/readiness text, truthful named unmet blockers and Last checked.
All authoritative states remain distinguishable; no percent, completion score, row counting or field-null eligibility.
Do not infer per-material processing versus educational approval from `qualifying_material`. Link details, curriculum,
goals, instructions and language; link addressed assigned-list rows to hub. No future materials, brief, activation,
supervisor-management or Start destinations. Keep settled O2 exact-ID Show more batching, no union collection/filter.
Entry/explicit Refresh/mutation completion may read; lifecycle signals only shield/mark revalidation needed.

### Block 3 — field editing, unknown/stale outcomes and departures

Use one course-field form owner with route-specific typed descriptors, not five copied save/reconciliation machines.
React Action/useActionState/useFormStatus calls `runAuthenticatedMutation` once with fresh CSRF. No unsafe replay.
Separate applied baseline, page-local draft and frozen submitted values, using machine 18's discriminated states.
No optimistic readiness or saved copy. On definitive 200 install validated returned normalized values/readiness and
clear dirty state; confirm visibly/once through the announcement owner. Reload/return re-read persisted state.

Local bounds errors dispatch nothing and expose accurate invalid state/help/summary/focus. Definitive rejected
validation preserves safe exact draft for correction; corrected fields clear stale error state. Active-course prerequisite
loss reported as `course_activation_unavailable` is corrective backend feedback, not client activation logic. Only
backend-reported concurrency is called a conflict; PATCH has no optimistic version validator to promise overwrite safety.

Timeout, lost response, Stop waiting, malformed success or ambiguous server failure enter `Save outcome unknown`.
Freeze edits; retain prior applied view and submitted values separately, no Saved/no retry button/no invented request ID.
Explicit Reconcile uses `readAuthenticated` within the still-current admitted session/capability/scope epoch and rereads
the exact course resource: matching submission installs
confirmed current values without attributing a mutation outcome; differing values remain separately reviewable, local
submission unconfirmed, and allow deliberate discard/review. No silent dirty overwrite. A post-save newer read may replace
only the applied view with an explanation, never identify whose edit won. A new Save follows a definitive reviewed baseline
and explicit user action, not replay of the previous attempt. Stop waiting fences late results without claiming cancellation.

Do not call `checkRouteAdmission` to preserve a mounted draft: that owner deliberately bootstraps checking and unmounts
protected content. Full route/covered-lifecycle Refresh remains that owner's access cycle and security teardown; it does
not promise restoration of a draft or unknown attempt. Same-page reconciliation in a current authorized epoch uses the
existing fenced read owner, while loss of that epoch destroys the local values. No controller changes are needed for this.

Reuse `useUnsavedInputGuard`, `RouteDepartureLink`, `DiscardChangesDialog`: parent/hub, shell, mobile drawer, same-document
Back/Forward and native Reload/unload. Stay keeps draft/focus without reauthorization; Discard drops it and navigates once.
Security/scope/expiry/logout override open dialogs without Stay. Unknown-state departure clears unconfirmed page-local values,
never restores them from history/storage. No form-restoration/cache persistence. Fresh route entry is persisted truth only.

Minimal guided form: persistent field label; associated bound/count/byte helper; warning against secrets/unnecessary personal
data for authored tutoring instructions/goals; revealable static example (never auto-submit); exact escaped read-only preview,
preserving whitespace and wrapping. Existing auth forms are not a generic guided-preparation owner: add a small course-local
guided text component and course-field state hook for this concrete reuse only. No rich renderer/tooltip framework/template
engine. Language/control labels distinguish course language from interface language. Locale/text-mode changes preserve values.

### Block 4 — meaningful checks and review handoff

Targeted API/unit/component/route tests plus local-protocol-fake Chromium journeys cover the acceptance below. Reuse 4.1
joined supervisor/course fixtures; no reimplementation of onboarding, paid providers or live backend calls. Include actual
request observers for GET/PATCH zero/one counts, deferred responses and deliberate response loss after commit.

Run sequential focused typecheck/lint/tests, affected browser journeys, then formatting, architecture/i18n and threshold-zero
JSCPD/marker-balance **before review**, not after findings. Include shared ApplicationShell/route-navigation browser tests if
navigation behavior changes; update accurate label/order/current-route expectations, never waive them. Existing navigation
groups need no extra global destinations. No full gate or commit during implement. Final verify runs `./run-all-tests.sh`
once for the final application/test/script/config/dependency fingerprint, one build within gate, no overlap.

After each completed implementation/fix block update this spec. Supply complete tracked+new story diff and content-free
focused logs in this story's tmp directory without staging; exclude all baseline dirt. Verify and commit require solver
dispatch, independent review/current gate evidence and an explicit scoped manifest. Never stage tmp or licensed sources.

## Exact licensed blueprint bindings

Library `2026-09-13-083323`; all new sources resolved/read in prepare, exclusively `v4/react-light.jsx`:

- Hub/prerequisite rows: `Application UI > Data Display > Description Lists > Left-aligned with inline actions`.
  MIA deltas: h2 beneath route h1; named readiness/field links, inert unavailable blockers, no attachments/delete/avatar;
  wrap/stack long content and give each action an accurate visible accessible name and at least 24px target.
- Form frame/actions: `Application UI > Forms > Form Layouts > Stacked`. Remove profile/image/notification anatomy;
  one admitted field/description section, ordinary Save and guarded parent action, no wizard steps.
- Guided text: `Application UI > Forms > Textareas > Simple`; language: `Application UI > Forms > Input Groups >
  Input with label and help text` plus `Input with validation error`. Native disclosure for examples/preview is permitted
  by DESIGN. Retain exact preview text, associated counts/helpers/errors, no plaintext-to-HTML interpretation.
- Reuse existing shell/page heading, CourseTable/checked-at, `RouteRecoveryPanel` (Alerts > With actions), existing form
  summary (Alerts > With list), `TechnicalErrorDisclosure`, `AuthSubmitButton`, and `DiscardChangesDialog` (Simple alert).

Record full binding/version/deltas in presentation files. First pass must apply the existing 4.1 contrast correction:
enabled unfocused normal boundaries inherited gray-500 and invalid boundaries red-600 rather than low-contrast gray/red-300;
verify against both inside/outside backgrounds, hover/focus/invalid and forced colors. Do not copy inaccessible outlines or
wrong invitation labels. No arbitrary design tokens/dark utilities or licensed-library commits. The native select blueprint
was inspected but is not selected: it must not impose seven UI locales on the broader language transport.

## Acceptance and targeted regression inventory

1. Assigned-list rows reach hub; hub and each field support direct entry/reload/canonical opaque-ID paths and an authorized
   parent. Unassigned/denied/stale assignment and admin-only/multi-role union never authorize a protected preparation GET,
   PATCH, title, preview or form. Empty scope fetches nothing; changed epochs fence old responses.
2. All four authoritative readiness states and named unmet prerequisites render truthfully. Field blocker navigation is
   safe/same-course/implemented; unsupported/null/material/supervisor links are inert. No synthetic totals/percentages,
   local field-derived readiness, material fetch/probe, future controls, activation or tutoring-start dispatches.
3. Description/curriculum/goals/instructions/language forms prefill persisted values; separate fields/routes/PATCH attributes,
   no name/assignment fields. Code-point/UTF-8 boundaries including Unicode and byte limits, null absence, exact preview,
   safe text and canonical language returned by backend. Course language is not UI locale negotiation.
4. Invalid local submission dispatches zero; valid Save dispatches one PATCH with matching identity/current CSRF. Definitive
   success alone confirms/install returned values/readiness; returned normalization, reload and hub navigation prove persistence.
   Backend validation/rejection preserves draft, accurately associates errors and clears corrected invalid state.
5. Read failure/503 is failed readiness check, never empty/satisfied. Unknown/malformed save/lost committed response/Stop waiting
   show no success or replay across lifecycle/Refresh/Back/token rotation. Explicit read match confirms only current values;
   differing/current/newer data preserves unconfirmed input separately and never claims whose edit won.
6. Hidden GET or dependent PATCH denial while dirty/unknown/preview/discard dialog is open actually unmounts the entire tree.
   Fixed safe title/focus/actions/announcement have no prior course/body; only collapsed exact inert raw disclosure remains.
   Late read/PATCH callback cannot restore or announce protected data. 401/restricted states use existing focused flow/shield.
7. Dirty navigation through parent/hub/shell/mobile drawer/Back/Forward/Reload, Stay/Discard and scope/logout/expiry/security
   override are covered. No draft history/storage/cache/form restoration, print leak or prefetch. Explicit Refresh gates current
   access; online/focus/visibility/pageshow/timers send no request or keepalive. Include actual event observers, not idle counters.
8. Route title before h1 focus; one main/h1; correct current-link state and scope labels; keyboard order/targets; native disclosure
   expansion; summary/field invalid states and descriptions; no announcement of raw errors/authored body. Accurate readiness,
   course-language and navigation labels, not copied invitation wording. Unchanged read remains silent.
9. All seven complete locales, mixed direction and authored lang metadata; three text modes at direct 320px; real 200% zoom;
   spacing, forced colors, reduced motion, measured normal/error/focus contrast and representative axe states. Manual Safari,
   Chrome/Edge/AT and 400% release matrices remain limitations, not automated passes or full CP-03 certification.
10. Actual-secret-bearing test/checkpoint inventory covers every new fixture body/CSRF/error path with deliberate failures and
    complete output/artifact scanning, no marker leak and early-failure rejection. No protected fixture bodies in reports/diffs.

## Concrete planned file/symbol map and infrastructure

Exhaustive path-only manifest: `tmp/agent-execution/4-2-supervisor-edits-course-teaching-fields/manifest.json`.
No silent manifest expansion; report newly required paths to solver first. Prepare writes only this spec plus tmp evidence.

Existing owners to extend:

- `src/platform/api/courses.ts` / `.test.ts`: assigned-preparation projection, `getCoursePreparation`, `updateCourseTeachingField`,
  readiness schema/minimized mapping, safe blocker-link validation; existing create/discovery behavior unchanged.
- `src/app/routes/entryRoutes.tsx`: six route declarations, `prepareCoursePath`, exact nested parser/current-scope gate.
- `src/app/routes/PrepareCourseRoute.tsx`: addressed hub/field resource admission alongside unchanged O2 list batches.
- `src/app/routes/AdminCourseRoute.tsx`: existing `CourseResourceHost` resource/parent/link plumbing and teardown only.
- `src/app/App.tsx`: pass current course identity to admitted Prepare host; no auth cleanup.
- `src/features/courses/CourseRouteProps.ts`: minimal preparation resource and typed route/links, no broad entity normalization.
- `src/features/courses/PrepareCourseListRoute.tsx` and `CourseListRoute.tsx`: optional hub row link, unchanged admin detail/batching.
- `src/app/routes/routeNavigation.test.tsx`: canonical route/parent/direct/reload/capability/scope tests.
- `src/app/ApplicationShell.test.tsx`, `e2e/applicationShell.spec.ts`: affected shell current-route/focus/order/departure regression.
- `src/platform/i18n/messages.ts` and all seven existing catalogs: hub/field/help/validation/reconciliation labels.
- `e2e/courseFixtures.ts`: assigned preparation/readiness/PATCH fake persistence, denial/loss/deferred response observers.
- `scripts/secret-hygiene-evidence.ts`, `scripts/check-secret-hygiene.mjs`: actual unit-test markers/checkpoints and scans.
- `scripts/route-secret-hygiene-cases.ts`, `scripts/check-route-secret-hygiene.mjs`, `e2e/routeSecretHygiene.ts`:
  actual browser inventory, fresh teaching-text fixture markers and complete output/artifact scans.

New course-local files:

- `src/features/courses/CoursePreparationRoute.tsx`: exact-bound hub/readiness rows and preparation links.
- `src/features/courses/CourseTeachingFieldRoute.tsx`: admitted field form using shared local hook/guided field.
- `src/features/courses/GuidedCourseTextField.tsx`: bound text/helper/example/count/preview presentation.
- `src/features/courses/useCourseTeachingField.ts`: machine-18 form outcome, draft/baseline/reconciliation ownership.
- `src/features/courses/courseTeachingFields.ts`: typed field descriptors, bounds/count/transport preparation; no backend policy clone.
- `src/app/routes/coursePreparation.test.tsx`: observable preparation/field/lifecycle/dirty/hidden regressions.
- `e2e/coursePreparation.spec.ts`: connected persisted preparation, network negatives, unknown/stale, a11y/hygiene journeys.

Required infrastructure is only these concrete course-local owners and extensions to existing failure evidence. No new
platform service/controller, Markdown/transfer framework, global cache, storage, polling, dependency/config/generated change.
Canonical companion paths in manifest carry **approved O1**, but are not edit targets in this prepare phase. Solver tracking/checkpoint files
may be supplied separately only at authorized commit; all known baseline hunks stay excluded.

## Risks, checks, progress and next action

### Authorized commit packaging — 2026-10-08

Solver accepts the fully completed **restart-resumed** 17-stage evidence on unchanged inputs, with original script exit
unavailable and two continuation exits 0; there is **no uninterrupted full exit-zero claim**. Review PASS has no remaining
findings. Commit authorization is carried by the current dispatch: separate Story 4.2 commit, no push. Reconciled HEAD at
the full approved baseline, empty index and exact reviewed 41-path manifest. Both verified fingerprints remain unchanged.
`done` is the authorized reporting-only packaging status; actual commit success and full SHA are recorded in the scoped
commit report, not guessed here. No application/source/configuration change or redundant test/build is made.

Package exactly the 41 story paths, current solver-owned 4.2 commit-pending checkpoint and only the tracker line changing
4.2 from baseline backlog to done. Preserve complete working tracker bytes; exclude its next-story, prior Epic 2 retro,
action and other pending edits. Also exclude parent `.opencode`, earlier operational checkpoints, backend, tmp and licensed
library. Solver owns post-commit SHA/checkpoint/next-story writes. Intended message:
`feat: add course teaching fields and preparation readiness`. Final commit evidence is under the story tmp `commit/`
directory and `commit-report.json`; a commit failure remains commit-pending and does not authorize Story 4.3.

### Final verification — 2026-10-08; restart-resumed authoritative gate

Solver supplied reviewer `ses_ee487da74ffewqPVetwTB41IXH` PASS for focused R1–R3 recheck, zero blockers or reproduction
requests. Verified source matches that reviewed fingerprint; only this reporting note changes afterward. Full frontend
baseline remains `821e57a47481b0ad912ee9a2b36bdf2599a84fa9`, backend baseline remains
`63c99925e5995fe2e2467f4f894976dfd4c0d297`. Before/after/final snapshots cover 188 application/test/script/config/dependency
inputs including new files, root configuration, and 31 backend API/document contract files including existing backend dirt.
All executable and backend-contract inputs, installed KaTeX identities and protected baseline/solver/backend files are unchanged.
Frontend fingerprint: `47ba70d34bc4a1ac7476fefa661ab96938a2ce96657c0f1e12ef2bc5e573cc1b`.
Combined frontend/root-config/backend-contract fingerprint:
`bb40e28d9b63ff9a723a826161ea276b5aee86ec0c409b904db65d138d9f8afb`.

Ran `./run-all-tests.sh` once, foreground with 1,800,000ms timeout. The server restart interrupted its shell during route
hygiene; the original exit is **unavailable**, not fabricated as zero. That invocation had completed the first ten stages:
**688 unit tests / 28 files**, **175 bundled-Chromium browser tests**, one production build, static/type-coverage/format,
seven catalogs, generated API consistency and **253,224 / 256,000 gzip bytes**. The hygiene stage had completed 29 course-unit
cases / 44 checkpoints, seven synthetic unit and five synthetic browser cases with canaries, and 144 of 146 all-case route
checkpoints. Original log and restart artifact metadata were scanned before disclosure; no generated marker/UUID shapes
were observed. The interrupted next probe has no surviving original process/failure identity and is not counted as passed.

Owner instructed continuation **without repeating completed work**. Confirmed original gate/checker/test processes gone,
stopped only its recognized orphan preview, and confirmed unchanged inputs. A reporting-only transient executor reused
the canonical checker unchanged for inventory, fixtures, full-original scans, exact checkpoint/failure identities and early
rejection; it omitted only the 144 validated log-prefix probes. The two remaining invitation locale/zoom checkpoints and
the early-failure canary passed, exit 0. Full route inventory is **68 actual tests / 146 checkpoints**, all scoped cases,
zero marker leaks; detailed original stream hashes for the completed pre-restart prefix were lost with checker memory,
so that prefix uses its original validated public log lines and unchanged checker hash, not invented per-probe hashes.
Continuation then executed exact original gate lines 1–23 and 68–175, without rerunning npm tests/build/hygiene prefix.
Duplication/marker balance, npm audit, **installed Trivy**, licensed catalog and Markdown stages passed, exit 0.
All **17 authoritative components are passed**, zero skips/unreached stages, one build, no overlapping checks. This is
complete restart-resumed gate evidence, **not** an uninterrupted script exit-0 claim. Provenance, original logs/exit records,
stage ranges and snapshots are under `tmp/agent-execution/4-2-supervisor-edits-course-teaching-fields/verify/`.

Security scans are **not clean**: unchanged `GHSA-238p-pmpm-9mq7` / `CVE-2026-103923` KaTeX LOW (transitive 0.16.47,
four npm chain entries) retains its prior authorized unresolved nonblocking disposition. Current package/lock/source and
installed hashes match prior identity. Trivy's one MEDIUM `sendgrid-api-token` match is the unchanged static-country false
positive: all 249 unique ISO codes reconstruct exactly in current `InvitationEntryRoute-R4ml1cEu.js` bytes [532,1278),
and reported offset 1123 lies inside that literal list. No matched bytes are retained in the disposition report. No new
finding, upgrade, suppression or threshold change; Vite >500kB advisory remains visible. Trivy database was refreshed by
the authoritative scan; current advisory IDs/versions/bytes, not stale scanner results, substantiate both dispositions.

`verify-report.json`, `proposed-checkpoint-closure.json`, exact `commit-ready-manifest.json`, refreshed complete
`story.diff`/manifest/fingerprint are at the story tmp root. Only spec/reporting artifacts changed in verify. Solver still
owns actual tracker/checkpoint writes; this worker writes a proposal only. No commit/staging/push/4.3 work or owner alert.
Manual supported-browser/AT/400% and broader release/BCG-011 obligations remain unclaimed; automated story verification
does not certify those. Next: solver reconciles restart-resumed evidence and dispatches the separately authorized commit.

### Fix batch 1 — root repairs completed

Reviewer `ses_ee487da74ffewqPVetwTB41IXH` supplied R1–R3; no owner decision is needed. Baseline and prior 41-path story
scope are preserved. Pre-repair snapshots/fingerprint/diff/manifest/report are under `fix-batch-1/`; no tracker/checkpoint,
parent `.opencode`, prior operational/retro or backend edits. The existing source structure satisfies machine 18 without
rewriting the editor or session controller; repairs stay within existing declared paths.

R1 root cause: a local wait-attempt check ran before current-resource denial handling. Added a separate route-mounted
resource-admission validity retained after Stop waiting and same-page reads, cleared on deliberate discard/departure.
Current authenticated GET/PATCH hidden denials tear down via the established host before local success/result fencing;
late success still cannot apply, and the existing session owner fences destroyed epochs. Mutation predispatch still uses
the local wait identity, so Stop before dispatch cannot cause a new request. No unsafe replay or controller change.

R2 root cause: input locking was incorrectly used as the dirty-departure condition. A dirty editable draft remains guarded
while an explicit read is pending; unknown submitted values preserve their settled departure contract. Stay/Discard,
native unload/history and security override still use existing owners, not a new guard. R3 root cause: newer applied field
was installed but lacked a separate display. The existing current-value section now also renders `Post-save newer`,
preserving the edited control and escaped authoritative value distinctly; the unknown-discard button remains unknown-only.
No new blueprint, copy/catalog or locale-loader change is needed; the existing licensed Stacked binding was reread.

Red unit run: R1 stopped PATCH/GET denial and R2 beforeunload/R3 distinct-value checks failed on pre-repair sources with
zero marker leaks; a fourth new supersession test initially waited for an unlocked control while the original Action was
still pending (a test expectation error), corrected to wait for current-read confirmation. Repaired full preparation unit
file passes 12 tests, no marker leaks. Logs: `fix-batch-1/red-unit.json` and `fix-batch-1/repaired-unit-1.json`.
New/changed actual protected tests are included in the existing unit hygiene inventory; browser/regression/probe work is next.

### Fix batch 1 — scoped checks completed; pending same-reviewer recheck

R1 **fixed**: deferred PATCH → Stop waiting → `course_not_found` and deferred reconciliation GET → Stop waiting →
`course_not_found` both destroy course identity/draft/preview through the fixed neutral host. The GET test also has an open
dirty dialog and verifies its removal without confirmation. Technical disclosure starts collapsed and reveals only its
inert raw error on explicit activation. A newer same-resource read does not fabricate a new authorization epoch: a late
denial still tears down that mounted course. Departed-read-denial and security-epoch regressions prove destroyed admission
cannot be replaced by old results; existing delayed-save success/security-fence regressions still pass.
R2 **fixed**: actual pending-read hub/Home/Back Stay/Discard journeys preserve local values without another read; synthetic
beforeunload cancellation and a document-initiated native Reload/dismiss prove the unload listener remains installed.
Lifecycle security override destroys the pending read/draft/open dialog without Stay or implicit requests; explicit Refresh
with removed assignment fetches no course. R3 **fixed**: unit and browser checks assert both the exact dirty control value
and a distinct nonempty authoritative `pre` value under Current persisted value, not merely the newer-data message.

Current focused regressions pass: **55 unit tests** (preparation/API/client/locale/shell/navigation), **12 preparation
Chromium tests** including the new boundaries and all existing preparation flows, locale/text/320px/real-200% checks.
Actual-test hygiene passes: **16 unit cases / 23 checkpoints** and **12 browser cases / 30 checkpoints**; each requires the
intended failure/checkpoint identity, rejects early failure, and scans original stdout/stderr/artifacts with zero leaks.
These sets overlap and are not additive or global compliance certification. Current typecheck, ESLint/architecture,
seven complete ICU catalogs, formatting, threshold-zero duplication/marker balance and production build pass.
FFR-955 now measures **253,224 / 256,000 gzip bytes**; all seven languages, settled English-map mitigation and visible
Vite >500kB warning remain intact. No locale/provider/config dependency or security-bootstrap change was made in repair.

Honest intermediate results: `repaired-browser-1` had two passes and one timeout because protocol Reload bypassed the
native unload prompt and waited on the intentionally blocked read; changing only the test to document-initiated Reload
made `pending-browser-2` and the complete final browser file pass. The first lint run detected Node globals in temporary
pre-repair script snapshots/scoped-runner byproducts; those were archived as inert `.txt` evidence, not suppressed in
configuration, and lint/architecture then passed. Distinct failed/red and successful runs remain in `fix-batch-1/`.
Final inspection refined R1's route-current fence so a newer same-resource read cannot hide an applicable denial; the
named regression, focused unit/browser, hygiene and static/build evidence were rerun for that final source. The combined
browser/probe shell reached its 240-second tool limit after the browser regressions passed and before the probe scan
finished; its completed probe lines are retained as `browser-hygiene-interrupted.log`, not claimed as a passed scan.
Confirmed no checker/test worker remained, stopped only its recognized orphan preview, and ran one bounded standalone
scoped scan with no artificial timeout. `browser-hygiene-final.json` confirms all 30 probes and the early-failure rejection.
No owner intervention, repeated retry loop or overlapping tests/builds was needed.
The scoped runner is archived as `run-scoped.mjs.txt`; regression commands can be reproduced directly with installed
Vitest/Playwright and content-free fixture/stream scanning described there. Raw runtime outputs/artifacts were removed
only after full scans; retained logs/reports contain classifications, source coordinates, checkpoints and hashes only.

Repair paths (seven code/test/script files plus this spec, no new manifest paths): `useCourseTeachingField.ts`,
`CourseTeachingFieldRoute.tsx`, `coursePreparation.test.tsx`, `e2e/coursePreparation.spec.ts`, `e2e/courseFixtures.ts`,
`scripts/secret-hygiene-evidence.ts`, `scripts/route-secret-hygiene-cases.ts`. Complete pre→post repair diff includes the
already-untracked story sources; updated full `story.diff`, exhaustive **41-path** manifest, current fingerprint and
`fix-report.json` are at the story tmp root, with evidence under `fix-batch-1/`. Prior implement evidence retains its own
fingerprint; no final authoritative gate/review/commit is claimed. No blocker/owner question, no routine Pushover alert,
no checkpoint/tracker/backend/parent `.opencode` edits, staging, commit, push or next-story work. Next: same reviewer recheck.

### Approved bundle amendment — 2026-10-08

Owner approval is already recorded at solver checkpoint `owner_decisions.bundle_mitigation`; no new approval or alert
is needed. This bounded expansion retains all seven languages and the fixed 256,000-byte FFR-955 budget. Inspection found
four initial chunks totaling 262,677 gzip bytes; concatenation alone only saved 584 bytes, so arbitrary chunk regrouping
would not address the demonstrated cause. All 523 English catalog values exactly match the existing descriptor defaults.

Smallest selected mitigation: `src/platform/i18n/locales.ts` derives its runtime English catalog from those typed defaults,
instead of eagerly shipping a second identical English text table. `src/platform/i18n/locales.test.ts` asserts complete
English-catalog/default parity so drift fails instead of silently changing copy. All seven complete canonical JSON catalogs
remain untouched, and six non-English runtime catalogs remain eager. No new asynchronous loading, catalog negotiation,
provider/API/controller state, chunk preloading, dynamic-import recovery, build config or security bootstrap is introduced.
The English map is generated from already-typed local descriptors and checked with `satisfies Catalog`, not an unchecked
API shape or type assertion. Budget measurement and locale/bootstrap/chunk-recovery regressions will test this boundary.
Exact manifest additions: the two existing i18n files above. No prior correct story implementation is rewritten.

### Bundle amendment completed; current review handoff — 2026-10-08

The selected two-file mitigation passes FFR-955 at **253,213 bytes gzip**, a 9,464-byte reduction from 262,677; the limit
remains **256,000**. All 523 English entries match canonical JSON/defaults and all seven catalogs remain complete. No config,
provider, session, bootstrap, route/chunk boundary, source translation or new loader changes were necessary. Vite's >500kB
warning remains visible, not suppressed. Logs: `bundle-resume/build-final.log` and `bundle-resume/budget-final.log`.

Current bounded checks: 16 locale/preference unit tests; 19 chunk/access-recovery browser tests; five locale/bootstrap tests
(synchronous reset/invitation fragment scrubbing, early browser locale, locale/focus/persistence with request ledger, all-field
preparation reflow across seven locales/three text modes); one separate all-locale anonymous switching/reflow test. Browser
original streams/artifacts were scanned before content-free summaries and removed; no marker/UUID leaks. These counts are
separate overlapping evidence sets, not a new global test total. Typecheck, ESLint/architecture, seven-catalog ICU checks,
formatting and threshold-zero duplication/marker balance pass for current inputs. No new secret-bearing test is introduced;
the new unit test concerns public UI copy only. All failure recovery is still the established eager-frame owner, tested on
the rebuilt artifact; no blank screen, accidental API discovery or unsafe replay was introduced by an async loader.

Compared with the prior input fingerprint, exactly `src/platform/i18n/locales.ts` and `.test.ts` changed. Prior 46-unit/
34-browser and actual-test-hygiene evidence is retained under its original fingerprint for unchanged story behavior,
not relabelled as a current full gate. Current boundary logs are under `bundle-resume/`; original reports are archived there
as `prior-fingerprint.json` / `prior-implement-report.json`. Updated complete diff/manifest/current fingerprint/report are at
the story tmp root. Blocks 0–4 and this approved amendment are now **implemented**, ready for independent review.
No remaining owner decision or blocker, no new alert, no checkpoint/tracker edits, no full gate, staging, commit or push.

### Implementation block 0 completed — 2026-10-08

Recorded approved narrow O1 slice in BCG-011, machine 12, Prepare surface matrix and CP-03 notes before application wiring.
Historical missing-readiness evidence is identified as superseded for this slice only; activation/start/concurrency and
full accessibility release obligations remain open. Baseline still matches; only known solver checkpoint appeared since
prepare and is preserved. Concrete manifest addition: `playwright.route-secret-hygiene.config.ts` must include the new
actual browser spec for deliberate-failure probes. No dependency, backend, tracker/checkpoint or auth-controller edits.

### Implementation blocks 1–3 substantive progress — 2026-10-08

Added separate preparation API projection and one-field PATCH with same-course blocker-link mapping; 4.1 minimized models
are unchanged. Registered only hub/five fields with assigned-ID prefetch gate; reused course host teardown and dynamic parent
paths. Added exact-bound hub, course-local guided field/descriptors and shared machine-18 form hook: validation, persisted
success, frozen unknown, Stop waiting fences, current-resource reconciliation and dirty/security departure ownership.
All seven catalogs now include the localized new copy. No later action surfaces, polling, backend or auth-controller work.

Actual API-test secret inventory was executed early: first probe correctly rejected absent checkpoint (a source syntax
error; safe diagnostic reported failures=0), corrected at its root, then three actual tests/five deliberate-failure
checkpoints plus early-failure rejection passed with zero marker leaks. Logs: `implement/early-unit-hygiene*.log`.
Blocks 2/3 still need their focused behavioral/browser regressions and final targeted/static checks before handoff.

Concrete manifest adjustment (reported before edit): existing unsafe-request owner `client.ts` supported only POST/DELETE.
Add PATCH to its single-dispatch method union and `client.test.ts` regression rather than invent a parallel client/retry path.

### Implementation block 4 progress — 2026-10-08

Focused form/API actual-failure scans now pass: eleven actual tests, fifteen checkpoints, early-failure rejection and no
marker leaks (`implement/form-unit-hygiene-4.log`). Early probes exposed Action-transition pending rendering; immediate
pending locks inputs and exposes Stop waiting, with a late-success fence regression. Browser actual-failure probes ran
before handoff; content-free failure coordinates identified lazy-content waits, exact Stay/Discard labels, multi-preview
raw-disclosure selection and CSP-compatible spacing/absolute zoom test navigation. Each was corrected at its owner.
The final browser inventory/static/focused regression runs remain pending. Added exact-bound one-field validation summary.
Concrete manifest addition reported: `e2e/courseAdministration.spec.ts` must change the old 4.1 no-hub assertion to exactly
the now-implemented canonical hub link. No unrelated assertions or baseline auth owners are relaxed.

### Earlier blocked implementation handoff — 2026-10-08 (superseded by bundle amendment above)

Blocks 0–3 are implemented. Block 4's focused checks passed except the required initial-bundle budget; implementation
handoff is **blocked**, not reviewed, verified or done. Current source/tests have passing typecheck, ESLint/architecture,
seven-catalog ICU completeness, typecheck-coverage canaries, formatting, generated API consistency and threshold-zero
duplication/marker balance. Focused regression sets: **46 unit tests** and **34 bundled-Chromium tests**, including affected
shell/navigation and 4.1 course assertions. These are separate set sizes, not additive coverage totals. Original output and
artifacts were scanned before safe summaries; no marker leaks. Final actual-test deliberate failures: **12 unit tests / 16
checkpoints** and **10 browser tests / 19 checkpoints**, each with early-failure rejection. These overlap the regression sets.

Coverage includes distinct persisted PATCH fields/reload/normalization, four authoritative readiness states, safe blockers,
assignment prefetch denial, dirty history/mobile departures, lifecycle/pagehide teardown, fenced delayed successes, frozen
unknown responses and differing/matching reads, associated corrective errors/summary, exact previews and print suppression.
Reflow checks exercise all five fields in seven locales and three text modes at direct 320px with spacing overrides;
real 200% zoom exercises every field and hub in all three modes. Representative axe stable hub/error states have no violations;
measured normal/invalid/focused control outlines meet 3:1 against inside/outside backgrounds. Evidence is in scoped logs and
`implement/focused-browser-final.json`; no supported-browser/AT manual or 400% release Pass is claimed.

**New blocker:** `npm run check:bundle-size` reports FFR-955 initial-route JavaScript **262,677 bytes gzip**, fixed limit
**256,000 bytes** (`implement/bundle-size-final.log`). Default initial imports include all seven eagerly loaded catalogs;
the new complete localized teaching-field copy increases this footprint. This is not the pre-existing Vite >500kB chunk
warning (which remains visible). Do not raise the budget, remove required copy/locales, or call the full gate a pass.
AD-13 permits measured bundling tuning, but the approved story spec/manifest exclude build configuration and generic
locale-loading work. Solver/owner must authorize a bounded mitigation and its explicit paths before worker expansion.
No mitigation/configuration/i18n-provider edits were made without that authorization.

Pushover sent for this **new** intervention: exact `interaction needed:` prefix; local helper exited 0, device receipt not
independently verified. This does not duplicate the settled BCG-011 approval alert. Next action: authorize bounded budget
mitigation, resume affected checks, then dispatch independent review. Full gate is reserved for verify; no commit or push.
Backend execution and supported-browser/AT manual evidence are skipped/not claimed. All baseline/solver/backend dirt is
excluded from the actual scoped diff/manifest. Reporting-only notes do not change the application/test input fingerprint.

Main risks: stale explicit BCG gate; API links mistaken for client links; conflating broad visibility with supervised scope;
widening 4.1 projections; retaining old draft/dialog after denial; replaying uncertain PATCH; local readiness inference;
silent dirty overwrite; treating arbitrary language tags as seven UI locales; protected values in failed test output;
inherited low-contrast invalid boundaries and stale labels; broader shell tests omitted when navigation is touched.

Completed prepare blocks: baseline/prerequisite/preservation inspection; all repository rules; authoritative story/transport
and scoped conflict analysis; O1 approval received via solver checkpoint; existing-owner/file map; exact licensed blueprint read; cached tool/model availability;
bounded implementation/check inventory. These are historical prepare-only notes; current implementation progress is above.

Prepare checks: baseline matches expected PASS; known-dirt inspection PASS/no unknown overlap; tooling/model/blueprint
inspection PASS; contract decision consistency PASS O1 approved (canonical notes still to write before implementation). Documentation consistency
check and baseline-preservation results are in tmp `prepare-checks.log`; this spec is Markdown-lint exempt under the scoped
rule. Application tests/build/full gate intentionally not run in prepare. Backend tests inspected only, not passed here.

Current next action: complete the separately authorized scoped commit and return its full SHA; solver confirms it before
recording post-commit tracking or starting 4.3. Review, readiness and bundle decisions are settled. Keep the documented
restart-continuation qualification; no push, verification rerun or unrelated user-work changes.
