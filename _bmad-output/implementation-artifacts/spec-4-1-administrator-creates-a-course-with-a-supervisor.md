---
title: Administrator creates a course with a supervisor (Story 4.1)
type: story
story: 4-1-administrator-creates-a-course-with-a-supervisor
created: 2026-10-08
status: done
phase: commit
baseline_commit: d2d079023f3935aeee1dba7b0add98ff6c4425ca
backend_commit: 63c99925e5995fe2e2467f4f894976dfd4c0d297
prepare_model: openai/gpt-6.1-sol
---

# Story 4.1 — Administrator creates a course with a supervisor

## Exact boundary and preparation result

Identity and acceptance are owned by `planning-artifacts/epics.md:165-188`, not by the historical backlog.
The selected batch is Epic 4 (4.1–4.5), stopping before Epic 5. This specification prepares **only 4.1**.
Sprint `next_story` agrees. The historical next-story sentence at `epics.md:20` is not the current queue.

In scope: one atomic inactive-course creation with a name and one or more existing supervisor identifiers;
the minimal bounded supervisor selector; persisted administrator course list/detail and assigned-supervisor
discovery in Prepare. At prepare finalization no application files had been changed or application checks run;
the implementation progress and current targeted evidence are recorded below.

Preparation is **ready**. Owner decisions O1/O2 were approved on 2026-10-08 and recorded narrowly in canonical
companions below; neither is an outstanding blocker. The actual create, account collection, course list/detail,
and capability operations exist. Do not misreport the reconciled BCG-008 historical finding as an absent users endpoint.
The owner authorized separate reviewed, verified commits for Stories 4.1–4.5, no push, stop before Epic 5;
the solver's 4.1 checkpoint records this authorization. No commit or application implementation occurs in prepare.
Implementation starts only after the solver's in-progress transition and explicit implement dispatch.

Excluded: account-directory UX, account detail/role/deletion controls, manual opaque-ID supervisor entry,
later assignment additions/removals, course deletion, logos, teaching-field editing, readiness presentation,
preparation hub, materials/upload/brief/activation, provisioning, tutoring, MFA expansion, Home aggregation,
new dependencies, backend edits, generic routing/session refactors, tracker/checkpoint writes.
In particular, `/admin/courses/:courseId/supervisors`, `/delete`, and every 4.2+ action remain unregistered.

## Baseline and preserved work

Actual HEAD equals expected `d2d079023f3935aeee1dba7b0add98ff6c4425ca`; index is empty.
The following pre-existing changes were inspected and are excluded from story ownership:

- `.opencode/agents/epic-solver.md`
- `.opencode/agents/epic-worker.md`
- `.opencode/opencode.json`
- `.opencode/story-execution.md`
- `.opencode/agents/epic-reviewer.md` (observed parent-owned protocol edit during implementation; excluded)
- `_bmad-output/implementation-artifacts/execution/2-1-basic-capability-driven-navigation.yaml`
- `_bmad-output/implementation-artifacts/execution/2-2-working-routes-and-parent-navigation.yaml`
- `_bmad-output/implementation-artifacts/execution/3-1-administrator-invites-a-supervisor.yaml`
- `_bmad-output/implementation-artifacts/execution/3-2-supervisor-account-setup-and-password-only-entry.yaml`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- Untracked `_bmad-output/implementation-artifacts/epic-2-retro-2026-10-07.md`

All match the parent's known dirt: provider/protocol configuration, postcommit notes, retrospective/actions,
and next-story tracking. No unknown overlapping source or contract edits were found. Do not stash, revert,
stage, or commit these changes. Solver owns any later tracking hunks, even if supplied for an authorized commit.

Backend HEAD is `63c99925e5995fe2e2467f4f894976dfd4c0d297`. Preserve its modified
`.agents/skills/bmad-brainstorming/assets/brain-methods.csv` and untracked
`docs/api-authentication-and-user-invitation.md`. The latter is advisory, not transport authority.
Full content fingerprints and status are in this story's `tmp/agent-execution/.../prepare-context.json`.

On prepare finalization the solver had additionally created
`_bmad-output/implementation-artifacts/execution/4-1-administrator-creates-a-course-with-a-supervisor.yaml`.
It was read for authorization and preserved without editing. Its recorded blocked phase is solver bookkeeping to
reconcile after this ready report, not a still-open product decision. The worker never changes it or the sprint tracker.

Prerequisite 3.2 is committed at baseline; 3.1 is committed at `9469ea34b58115c20bbafbec5b6d903cddddd1a0`.
The existing 3.2 checkpoint records one passing authoritative gate: 645 unit tests, 153 browser tests,
46 hygiene cases/94 checkpoints, zero marker leaks, 17 stages, no skips. This is inspected prior evidence,
not a new run or evidence that 4.1 is implemented. Joined-supervisor fixtures are reusable.

## Tool and model availability

Node 24.21.0 and npm 11.19.0 are present. Installed local versions match declarations: TypeScript 5.9.3,
ESLint 9.39.5, Vitest 5.0.1, Vite 8.3.0, Prettier 3.9.8, Headless UI 2.2.10, Heroicons 2.2.0,
Playwright 1.63.0. Bundled Chromium revision 1243 executable exists. Trivy is on PATH.
JSCPD and markdownlint-cli are available in the npm tool cache. No install or network probe was needed.
A package-metadata probe initially hit Headless UI's non-exported package.json subpath; direct on-disk metadata
confirmed installation. That is a resolved inspection limitation, not a missing dependency.

Licensed library version `2026-09-13-083323` exists; the exact light React sources below were resolved and read.
The skill's old stack sentence does not override the current 19.3/4.3 repository contracts.

One runtime catalog batch confirmed active models with `high` available:
solver/reviewer `openai/gpt-6-astra#high`, worker `openai/gpt-6.1-sol#high`, approved fallback
`mistral/mistral-medium-2604#high`. No paid calls, benchmarks, quota claims, or Anthropic fallback.
This prepare ran on `openai/gpt-6.1-sol`; the runtime did not separately expose its actual variant.

## Binding references

Paths below are relative to the repository unless a filename is identified as a UX companion.
UX companions live under `planning-artifacts/ux-designs/ux-mia-frontend-2026-09-12/` in `_bmad-output`.

- `FRONTEND-PRD-FOUNDATION.md:104-128`, FFR-301 at 276 and FFR-801 at 368: milestone boundary and requirements.
- `EXPERIENCE.md:667-687`: atomic inactive-course creation, unified assigned-supervisor scope, truthful failure.
- `ROUTE-INVENTORY.md` §Assigned-Course List (O2 decision), §Courses List/Create Course/Course Admin Detail:
  paths, parents, titles, gates, success destination; no preparation hub implementation in 4.1.
- `SURFACE-STATE-MATRIX.md` profiles G/L/F/D/X and §Prepare courses/Account administration/Course administration:
  dated O1/O2 subset notes, with broader states and scoped blockers unchanged.
- `FRONTEND-STATE-MACHINES.md` §1/9/18/23/24/26/28/29: ordered admission, dirty input, last checked,
  security override, account reads, announcement arbitration and raw disclosure. §12 belongs to 4.2/4.5, not this discovery slice.
- `SECURITY-PRIVACY-ACCEPTANCE.md`: Protected Mount; Teardown Negative Tests (463-471), Cache Negative Tests
  (488-493), Least-Data Fetching (495 onward), Existence-Hiding (874-892), Secret Hygiene (922-941).
- `ACCESSIBILITY-ACCEPTANCE.md`: AC-001..005, AC-007..009, AC-012, AC-016, AC-019; CP-12 creation/list/detail
  and CP-03 assigned-course discovery only. Full CP-03/12 and supported-browser release certification are not claimed.
- `DESIGN.md:85-100,163-200`: exact blueprint binding and MIA deltas; architecture spine AD-1..5/7/9.
- `BACKEND-CONTRACT-GAPS.md` BCG-003, §BCG-008 Story 4.1 supervisor-selector slice decision (O1, 2026-10-08),
  BCG-011, BCG-007 existing disclosure boundary. Open entries remain open outside the approved slice.
- Backend product: `mia/docs/product-requirements.md:160-176,233-268,770-784,838-853`.
  Narrative: `mia/docs/api.md:439-455,535-562`. Implemented OpenAPI owns transport, not this spec.

## Current transport and applicable BCG-008 evidence

`mia/api-doc/openapi.yaml` maps `/api/v1/users` to `paths/users.yaml#/accounts` at 90-91,
and maps the existing course family. All required operations already appear in `src/platform/api/generated.ts`.
Do not regenerate it or change backend schemas merely to start this story.

### Account selector only

`mia/api-doc/paths/users.yaml:272-308` contracts `listAdministrationAccounts`:
administrator-authorized GET, no CSRF, JSON:API, no-store, deterministic normalized-username/opaque-ID order,
empty `data: []`, standard bounded pagination, and exact supported role/state filters.
Use `filter[role]=supervisor` and `filter[state]=active`, fixed `page[limit]=25`, initially offset zero.
The other supported filters are not needed; there is no substring search, sort control, or invitation merge.
The client must not claim selected candidates are authoritatively assignment-eligible.

`resources.yaml:203-219,1974-1982` returns only ID, username, account class, account state, permanent roles,
PageMeta and PageLinks. No email, profile, MFA or private content is returned or required.
The collection carries **no course-assignment eligibility field**. Account detail's actions (220-237)
concern role grants and deletion, not initial assignment. Do not call account detail as a fake eligibility preflight.
Registered accounts, not pending invitations, are candidates. State/role filters shortlist them; the server's
atomic create validates the complete assignment set. This is the distinction explicitly required by `epics.md:176-178`.

Errors: 401 sign-in loss; 403 restricted/non-administrator; 406 media rejection;
422 `user_account_query_invalid` for unsupported/duplicate/empty/malformed/excessive query.
The published 403 description names `user_administration_unauthorized`; existing session-stage reconciliation
handles restricted access without interpreting that response as a stage detector.

BCG-008's original claims at baseline lines 871-874 that collection/detail reads do not exist were stale against this checkout.
The needed collection/filter/state/paging/least-data/no-store slice is implemented in transport;
full account-directory lifecycle, target-action eligibility, deletion and release evidence are not this story.
O1 now reconciles the ledger and machine 26 for this collection-only selector; broader account reads remain blocked.
It is not blanket closure or account-directory authorization.

Inspected backend evidence, never re-executed: `internal/user/administration_test.go`
`TestAdministrationReadsAreMinimalFilteredAndDeterministic` (21-66) covers unauthenticated/nonadmin/expired denial,
minimal fields, exact username filter, empty page, unsupported query, and filter-preserving page links.
It does not prove the entire supervisor+active combination or frontend lifecycle/teardown; new protocol-fake checks must.

### Course creation and persisted administration

`paths/courses.yaml:1-57`: `listCourses` is paginated visible courses (GET; 200/401/403/406/422);
`createCourse` is POST with session+CSRF, 201 inactive CourseDocument, 400/401/403/406/409/413/415/422.
Stable create errors are `course_name_taken`, `course_invalid`, `course_supervisor_invalid`,
`course_unauthorized`, `auth_password_change_required`, and `csrf_invalid` as declared.

`requests.yaml:378-405,544-557,636-642` requires `data.type=courses`, attributes.name, and
`relationships.supervisors.data` with at least one `{type: users, id}`. No client course ID.
Only name and the distinct selected IDs are sent; optional teaching fields are deferred.
Name validation uses the documented trimmed/NFC result, 1–200 Unicode code points and at most 800 UTF-8 bytes;
the server owns globally unique folded identity. Keep the user's original input for correction and show persisted
normalized display only after a definitive response. Never implement a local uniqueness check or guessed fold policy.

`paths/courses.yaml:59-87` contracts `getCourse`, including 404 `course_not_found` for unknown/out-of-scope,
and 503 `course_readiness_unavailable`. `resources.yaml:577-648,2031-2048` defines the course and its
supervisor user-identifier relationships. Render persisted name/state and assignment IDs on administration detail;
do not resolve them through a full directory, infer names from a lost selector, or invent assignment usernames.
No later assignment mutation is required: initial relationships are in the atomic POST.
`listCourseSupervisors` exists (212-239) if future paginated relationship UX is needed, but is not required here.

Backend product at 780-784 requires existing supervisor role and atomic rollback on any invalid assignee/write.
Inspected implementation `internal/course/course.go:289-337` validates nonempty/distinct assignments and all existing
supervisor roles inside the transaction. `TestCreateIsAtomicAndUsesNormalizedGlobalName` and
`TestSupervisorInvariantAndLifecycleDeletionTransaction` are corroborating backend tests, not permission to copy policy.
No extra client eligibility rules, bans/verification inference, staff-role granting, or mutation probes are allowed.

### Capabilities and Prepare discovery

The catalog already names `courses.create`, `course_records.manage`, `course_supervisors.manage`,
`accounts.administer`, and `courses.supervise` (`resources.yaml:53-143`). Available/global applies **per action**;
`courses.supervise` course_ids is the current complete assigned-course scope. Roles are not navigation authority.

Administrator list/detail uses available globally scoped `course_records.manage`; creation uses available global
`courses.create` and `course_supervisors.manage`. Only an available global `accounts.administer` permits the selector.
If collection authority is absent, withhold the selector/request and creation action with a prerequisite explanation;
do not replace it with manual IDs. Gate the invitation link independently through the existing invitation authority.

Prepare must use available `courses.supervise` plus its course_ids. Course collection GET supports **only pagination**
(`courses.yaml:1-10`), not a supervision/assignment filter. Its "visible courses" description does not contract an
assigned-only representation for a multi-role supervisor or administrator+supervisor. Do not invent a query filter or
fetch that union and hide unrelated rows. Approved O2 uses reads addressed only to authoritative assigned IDs instead.
No readiness/activation/start claims are needed for 4.1; never treat state=inactive/active as readiness.

## Settled owner decisions — 2026-10-08

### O1 — Narrow BCG-008 account-selector resumption: approved

Owner approved the existing account-list transport for the **collection-only supervisor selector**. The canonical
decision is recorded in `BACKEND-CONTRACT-GAPS.md` §BCG-008 Story 4.1 supervisor-selector slice decision, with pointers
in machine 26, the surface matrix and CP-12 notes. Broader BCG-008 obligations stay open. Selection is candidate discovery;
atomic POST is final assignment validation. Account detail/role/deletion work and full account-directory UX are excluded.
The reconciled historical conflict was baseline BCG-008:871-874/machine 26:830 versus `openapi.yaml:90-91`,
`users.yaml:272-308`, `resources.yaml:203-219,1974-1982`, and product requirements:260-264.

### O2 — Bounded assigned-course discovery: approved

Owner approved minimal `/prepare/courses` discovery using only current `courses.supervise.scope.course_ids`
and contracted `getCourse` for those exact IDs, in user-visible batches of at most 25, without the hub or readiness UI.
These are known-scope resource reads, not enumeration to discover scope. Batch advance is an explicit local
"Show more assigned courses" action, **not** fabricated OpenAPI Previous/Next links or a claimed server total.
Fence every read to the same admission/security epoch, avoid unbounded fan-out, and clear a denied scope batch before
the fixed unavailable result. Initially empty scope makes no course requests. Refresh rediscovers current scope first.
The canonical O2 decision is recorded in `ROUTE-INVENTORY.md` §Assigned-Course List, with discovery-only pointers in
the surface matrix and CP-03 notes, and a BCG-008 cross-reference that grants no account access to supervisors.

Do not revisit this settled choice or build a server-paginated assigned-only collection. Evidence supporting the choice:
assigned-only route intent `ROUTE-INVENTORY.md` §Assigned-Course List; scope `resources.yaml:66-70`; available GET by ID
`courses.yaml:59-87`; missing collection scope filter `courses.yaml:1-10`; least-data rule at security acceptance:495-498.

### Commit authorization: approved, later phase only

User approved separate reviewed, verified commits for Stories 4.1–4.5, no push, stop before Epic 5. Authorization is
carried by the solver checkpoint; review and current successful final verification are still prerequisites to commit.
There are no open product/transport decisions for this bounded 4.1 spec. Broader release obligations are not waived.

## Approved implementation design

### Block 1 — API boundaries and minimized capability projection

Add `platform/api/administrationAccounts.ts` only for `listSupervisorCandidates(offset, signal)` and
`platform/api/courses.ts` for `listCourses`, `getCourse`, `createCourse`, course view models and schemas checked
against existing generated operations. Reuse `AccountId`; add a branded `CourseId` alongside scope identities
in `entry.ts` so capability projection and course requests share one identity without a runtime import cycle.
Parse the contracted course response once; hand features only name, state, ID, persisted supervisor IDs and
necessary timestamps. Do not add readiness UI, logos, private records or account detail fetches.

Promote the existing invitation navigation-link validation into `platform/api/collectionNavigation.ts` only because
three current collections now need it. Validate relative same-origin collection path, exact expected filter+limit keys,
one canonical integer offset within 0–10,000, direction, and `meta.has_more`. Reject removed/changed/duplicate filters,
external URLs, fragments, unexpected path/keys and malformed links. Preserve invitation semantics and regressions.
No total, free search, arbitrary sort, guessed next offset or background page traversal. Server page state is memory-only.

Extend `AccountCapabilities` and `AuthenticatedAccess` only with the minimized per-action decisions and assigned IDs
needed here. Propagate through the existing controller/adapter and use fresh stage → capability/scope → route resource
→ dependent-data order. No new global store, controller, retry defaults, cache or session policy.

### Block 2 — Resource hosts and persisted navigation

Register only `/admin/courses`, `/admin/courses/new`, `/admin/courses/:courseId`, `/prepare/courses` in `entryRoutes.tsx`.
Match `new` before opaque course IDs, reject extra/trailing segments like existing routes, build paths from that table.
Keep parent/title ordering and route admission with the existing composition owners. Add Courses under authorized
Administer and Prepare courses under authorized Prepare; empty unauthorized groups stay absent. No future hub links.

`AdminCourseRoute` owns fresh list/detail admission via `readAuthenticated`, lazy features only after admission.
The new-course route admits candidate collection only after its independent authority. `PrepareCourseRoute` owns
O2's bounded exact-ID admission. Reuse neutral checking and eager recovery; hosts key by location/security generation.
Collection/detail 401/restricted failures use the existing privacy shield; course unknown/out-of-scope/authorization
causes use one fixed unavailable result. Every dependent denial callback transitions the **host**, unmounting the
entire previous feature subtree, its form/dialog, selector labels and selected IDs before rendering neutral recovery.
Keep only the current numeric status/raw body in collapsed `TechnicalErrorDisclosure`, per its existing contract.
Do not hide stale content behind a recovery overlay or render raw body in a live region.

Persisted admin detail re-reads by ID on direct entry/reload; list pages re-read on entry and explicit paging/Refresh.
Course relationship IDs on detail come from this response, not selected UI labels. Admin rows have only a detail link.
Assigned-supervisor discovery re-reads current scope then its addressed records, including a newly assigned course after
explicit entry/Refresh; no assignment polling or realtime notification is promised. No hub destination until 4.2.

### Block 3 — Form, selector and outcomes

Use native labelled name input and a visible required supervisor fieldset containing paginated native checkboxes.
Select one or more distinct candidate IDs; selected IDs/labels may survive page changes only in this mounted form.
An unloaded page's absence never proves deletion/ineligibility. Keep selected records distinct from current page rows.
Read errors explain a failed check, not "no supervisor". An authoritative empty first page with no continuation offers
the independently authorized existing invitation route, explains that the invitee must join first, and disables Create.
An empty later page or bounded-window exhaustion must not claim globally no eligible accounts.

Submit with React form Action/useActionState/useFormStatus through `runAuthenticatedMutation`, fresh CSRF immediately
before dispatch, one atomic `createCourse` call, no separate assignment POST, no optimistic row or navigation.
Disable duplicate submission while pending. Name+supervisor local errors send no request, preserve valid input and use
the established accessible summary/field targets. Backend name conflict allows correction; invalid supervisor set shows
general corrective assignment feedback without identifying a hidden assignee. Definitive generic rejection keeps safe
local input and exact collapsed disclosure; authorization loss invokes host teardown, not form-local error-only state.

Only a validated definitive 201 permits navigation to `/admin/courses/:courseId` (route inventory's success destination).
Drop draft/selector state before navigation; detail has its own fresh resource admission. A later detail failure does not
erase the fact that the original create succeeded, but does not mount the persisted view without current access.
Lost response, timeout, abort/Stop waiting, 5xx or malformed success is "Save outcome unknown"; no success copy,
automatic replay, exact retry, invented request ID or name-based correlation. Freeze the submitted form, offer deliberate
Review courses with fresh admission; the list displays persisted rows only and never attributes one to this attempt.
A new create journey is a new explicit action after leaving/reviewing, not a replay of the unknown POST.

Reuse `useUnsavedInputGuard`, `DiscardChangesDialog` and `RouteDepartureLink`: dirty before dispatch means nonempty
name or selected IDs versus empty baseline. Stay/Discard covers shell, mobile drawer, parent links and same-document
Back/Forward; native unload prompt covers Reload/document departure. Security/scope override unmounts even an open
dialog without Stay. Dispatch/outcome state is not a restored editable dirty draft. No history/storage/form restoration.

### Block 4 — Meaningful checks, hygiene and review handoff

Add behavior-oriented API/route/browser cases for the criteria below, with actual request observers counting every GET
and POST. Counter initialization alone is not negative evidence. Use the current joined supervisor fixtures without
reimplementing invitation acceptance or password-only sign-in; normal 4.1 setup may start with a joined account.
Add failure-inventory entries/checkpoints alongside the actual tests, not later fixed canaries that never run them.
No test failure can print course names, selected usernames, raw body, request JSON, passwords/tokens or CSRF.

Run focused typecheck/lint, relevant unit/API/session/route tests, then affected Chromium cases sequentially during
implementation. Run formatting, architecture/i18n and JSCPD marker-balance/threshold-zero checks before review handoff,
not after reviewer discovery. No full gate or commit in implement. Final verify phase runs `./run-all-tests.sh` once for
the final content fingerprint; build once inside it, with no overlapping tests/builds. Manual browser/AT release evidence
and backend transaction execution are limitations, not implied passes.
Write actual scoped tracked+new-file diff and content-free focused logs under this story's tmp directory, excluding
the pre-existing parent dirt, without staging to generate the diff. Update this spec after each completed block.

## Exact licensed blueprint bindings

Library `2026-09-13-083323`, always `v4/react-light.jsx`; all newly selected sources resolved and read during prepare.

- Admin list and minimal Prepare discovery: `Application UI > Lists > Tables > Simple`. MIA deltas: own route h1,
  reduced name/state columns, detail link only for admin; neutral discovery rows for Prepare; wrap long data; labelled
  contained table overflow only where intrinsically necessary; no hidden columns or invented counts.
- Selector: `Application UI > Forms > Checkboxes > List with description`. Visible fieldset legend, username label,
  current candidate state/instructions; controlled checkbox values; at least 24px clickable target/label; decorative SVG
  aria-hidden; no staff directory chrome or uncontracted autocomplete.
- Name field: `Forms > Input Groups > Input with label and help text` and `Input with validation error`.
- Persisted detail: `Data Display > Description Lists > Left-aligned in card`. Name, state, supervisor IDs; no attachment,
  account-link, delete/removal or unimplemented preparation actions.
- Selector/admin collection pagination: `Navigation > Pagination > Simple card footer`. Previous/Next follow links;
  remove fabricated result total; expose current page context at every width. O2 Show more is not server pagination.
- Empty prerequisite/list: `Feedback > Empty States > Simple`. At most one authorized next action, truthful empty copy.
- Pending, failed, unknown and unavailable: reuse existing `RouteRecoveryPanel` bound to `Feedback > Alerts > With actions`;
  raw disclosure remains `TechnicalErrorDisclosure`; form summary follows the existing `Alerts > With list` binding.
- Departure: existing `DiscardChangesDialog` (`Overlays > Modal Dialogs > Simple alert`); submit: existing
  `AuthSubmitButton` (`Forms > Sign-in and Registration > Simple card`). Application shell/page heading reuse their owners.

Record full binding/version and behavioral/accessibility deltas in each new presentation file. Preserve defaults and
forced-colors/reduced-motion behavior; no dark utilities, imitation markup, custom design system, or licensed source commits.

## Acceptance and targeted regression inventory

1. Distinct current capability scopes gate course list/detail/create/selector/Prepare independently; unavailable or
   non-global admin capabilities produce no corresponding API call, link, title or protected mount. Restricted sessions
   never mount shell or dependent course/account requests. Multi-role permission does not broaden supervision scope.
2. Selector sends only role=supervisor/state=active and bounded paging; accepts only filter-preserving navigation links.
   Empty, failed, malformed and denied pages differ appropriately. No email/profile/private fields, rosters, invitation
   merges, directory/account detail calls, unsupported search, autofetch next page or guessed totals.
3. Selection across pages remains distinct/deduplicated; no initial assignee auto-selection or arbitrary-ID entry.
   Required name+at least one selection errors focus correctly and dispatch nothing. Failed role/state candidacy never
   becomes proof of assignment eligibility. Deleted/stale selection is safely rejected by create, not a probing mutation.
4. One POST uses the generated shape, no course ID, current CSRF, exactly the selected user identifiers. Rejected response,
   response-loss-after-server-commit, malformed success and generic 5xx create no optimistic course, success copy or replay.
   Verify one actual dispatch through lifecycle events, navigation, explicit reconciliation and token changes.
5. Definitive 201 redirects to gated admin detail; persisted list/detail/reload show backend-normalized name, inactive
   state and persisted supervisor identifiers, without a second assignment mutation. A different session for the assigned
   supervisor discovers the course via the settled O2 strategy; unassigned supervisor/multi-role student membership
   cannot request it through Prepare. No 4.2+ links/actions appear.
6. Unknown/out-of-scope/denied after a previously visible list, detail or selector actually unmounts the old subtree:
   neither form/checkboxes/selected labels nor open discard dialog survives. Late success/paging/read callbacks cannot
   restore it. Fixed neutral result's title, focus, actions and announcement contain no old identity; exact raw error
   disclosure remains collapsed/inert and outside the live summary. Repeat hidden causes in all launch locales.
7. Dirty name/selection departure covers parent, shell, mobile drawer, Back/Forward and native Reload. Stay retains input
   without admission requests; Discard clears and navigates once. Sign-out, expiry, lifecycle shield, account/scope loss
   while dialog is open override dirty state, erase draft/labels and remove listeners without a preservation prompt.
8. Explicit Refresh updates current state and last-checked time; unchanged reads remain silent. Focus/online/visibility/
   pageshow do not fetch or renew idle expiry. Account/security/scope epochs fence pending course and selector responses.
9. One main/h1, title-before-route-focus, correct current link, parent exit, keyboard order/targets, valid labels/errors,
   selector paging collection focus, complete seven-locale catalogs, mixed direction, all three text modes at direct 320px
   and real 200% zoom. Include spacing overrides, forced colors, reduced motion and representative axe stable states.
   Manual Safari/Chrome/Edge/AT and 400% release matrices remain explicit manual obligations, not automated claims.
10. Synthetic course/name/username/raw-body/CSRF markers and inherited joined-flow secrets have a complete actual-test
    failure inventory. Generate secrets per test, disable artifacts, redact request assertions, inject failures at every
    secret-bearing checkpoint and scan original stdout/stderr/artifacts before summarizing. Include an early-failure
    rejection canary. DOM/title/URL/history/storage/cache/print assertions use booleans or fingerprints, never literal
    protected values in assertion failures, test titles, snapshots, reports or logs.

## Explicit planned file and symbol manifest

Prepare changed only this spec and the five canonical companions listed below. The exhaustive path-only manifest is
`tmp/agent-execution/4-1-administrator-creates-a-course-with-a-supervisor/manifest.json`; it distinguishes actual prepare
changes from planned application/test/hygiene work and solver-owned tracking. Nothing is staged. Do not widen this
bounded implementation manifest silently; report any newly necessary file to the solver first.

New source/test files:

- `src/platform/api/administrationAccounts.ts` — candidate collection schema/minimized page/listSupervisorCandidates.
- `src/platform/api/administrationAccounts.test.ts` — filters, state, minimized fields, errors and link negatives.
- `src/platform/api/courses.ts` — course schema/minimized models/listCourses/getCourse/createCourse.
- `src/platform/api/courses.test.ts` — payload, normalized names, persisted assignments, failures, no replay.
- `src/platform/api/collectionNavigation.ts` — shared strict collection-link validation promoted at concrete reuse.
- `src/platform/api/collectionNavigation.test.ts` — exact-filter/paging/path/origin/direction boundaries.
- `src/app/routes/AdminCourseRoute.tsx` — ordered resource admission and subtree teardown for course admin routes.
- `src/app/routes/PrepareCourseRoute.tsx` — only O2's bounded scope-addressed discovery admission.
- `src/app/routes/courseAdministration.test.tsx` — API-fake gate/form/navigation/denial/security/departure cases.
- `src/features/courses/CourseRouteProps.ts` — minimized route-resource/links host boundary.
- `src/features/courses/CourseListRoute.tsx` — persisted admin list only.
- `src/features/courses/CourseCreateRoute.tsx` — name+supervisors, form action, outcome machine, departure.
- `src/features/courses/CourseDetailRoute.tsx` — persisted metadata/assignment identifiers only.
- `src/features/courses/PrepareCourseListRoute.tsx` — no hub, editing or readiness; bounded assigned discovery.
- `src/features/courses/SupervisorSelector.tsx` — blueprint-bound native checkbox page and selected summary.
- `e2e/courseAdministration.spec.ts` — connected creation, persisted navigation, Prepare discovery and boundaries.
- `e2e/courseFixtures.ts` — local protocol fakes and actual-dispatch observation; no paid/production backend.

Existing source/test files with exact responsibilities:

- `src/platform/api/entry.ts` — CourseId and minimized per-action/supervised-scope projection.
- `src/platform/api/entry.test.ts` — capability projection/scope negatives.
- `src/platform/api/invitations.ts` — use promoted navigation validator only, behavior unchanged.
- `src/platform/api/invitations.test.ts` — preserve filter-free invitation paging regressions.
- `src/platform/session/sessionController.ts` — propagate scope decisions through the existing fence.
- `src/platform/session/sessionController.test.ts` — scope propagation/fencing regression.
- `src/app/routes/entryRoutes.tsx` — four canonical route declarations/path dispatch; no future action routes.
- `src/app/App.tsx` — compose the two admitted course hosts, preserve existing owners.
- `src/app/ApplicationShell.tsx` — authorized Courses/Prepare navigation.
- `src/app/ApplicationShell.test.tsx` — per-action visibility/departure regression.
- `src/app/routes/routeNavigation.test.tsx` — direct/reload/canonical opaque-ID/parent regressions.
- `src/platform/i18n/messages.ts` — course and selector message descriptors.
- `src/platform/i18n/catalogs/en-US.json`
- `src/platform/i18n/catalogs/de-DE.json`
- `src/platform/i18n/catalogs/es-ES.json`
- `src/platform/i18n/catalogs/es-AR.json`
- `src/platform/i18n/catalogs/fr-FR.json`
- `src/platform/i18n/catalogs/pt-PT.json`
- `src/platform/i18n/catalogs/pt-BR.json`
- `scripts/route-secret-hygiene-cases.ts` — actual course browser-test/checkpoint inventory.
- `scripts/check-route-secret-hygiene.mjs` — actual course-test marker/failure scanning.
- `e2e/routeSecretHygiene.ts` — course marker/checkpoint adapter, existing failure harness.
- `scripts/secret-hygiene-evidence.ts` — actual unit-test marker/checkpoint inventory.
- `scripts/check-secret-hygiene.mjs` — extend actual unit-test marker failure scans.

Reporting and approved narrow contract paths (actual prepare changes):

- `_bmad-output/implementation-artifacts/spec-4-1-administrator-creates-a-course-with-a-supervisor.md` — this spec/progress.
- `_bmad-output/planning-artifacts/ux-designs/ux-mia-frontend-2026-09-12/BACKEND-CONTRACT-GAPS.md`
- `_bmad-output/planning-artifacts/ux-designs/ux-mia-frontend-2026-09-12/FRONTEND-STATE-MACHINES.md`
- `_bmad-output/planning-artifacts/ux-designs/ux-mia-frontend-2026-09-12/SURFACE-STATE-MATRIX.md`
- `_bmad-output/planning-artifacts/ux-designs/ux-mia-frontend-2026-09-12/ACCESSIBILITY-ACCEPTANCE.md`
- `_bmad-output/planning-artifacts/ux-designs/ux-mia-frontend-2026-09-12/ROUTE-INVENTORY.md`

The five contract companions record only approved dated O1/O2 slice decisions/pointers, never broad closure.
`sprint-status.yaml` and this story's execution YAML are solver-owned and not worker edit targets; an eventual commit
requires explicit approved paths/hunks. Exclude all baseline dirty files and all `tmp/`/`tailwindplus/` content from staging.
No package/lockfile/config/generated API changes are presently required. No new transfer/Markdown/readiness infrastructure.

## Progress and next action

### Scoped commit authorization and closure (2026-10-08)

- Solver supplied commit-pending checkpoint and done tracker status, with explicit authorization for the exact
  verified 54-path story manifest, current 4.1 checkpoint, and only tracker epic-4 backlog→in-progress / 4.1 backlog→done
  hunks. User authorized the separate story commit, message `feat: create courses with assigned supervisors`, no push.
- HEAD/index reconciled against the full baseline; all 199 verified input hashes remain current. Independent production
  review and attempt-3 authoritative verification permit this closure. Status alignment here is reporting-only; no
  application/test/config changes or unnecessary test/build rerun. Prior protocol/tracking/checkpoint/retro/backend dirt
  is excluded. Tracker staging uses an index-only patch from HEAD and preserves its entire working-file content.
- Exact staged/committed manifest, parent and full commit SHA are recorded in the story tmp directory's `commit/`
  evidence after the authorized commit. Solver alone updates the operational checkpoint SHA/next story after confirming
  that commit; this worker does not write those fields or start 4.2.

### Authoritative verification attempt 3 — passed (2026-10-08)

- Solver authorized a fresh gate after the exact isolated hygiene probe passed, without claiming the historical
  attempt-2 cause was fixed. Ran `./run-all-tests.sh` exactly once for attempt 3 in foreground: exit 0 after 1165.445
  seconds. All 17 gate components completed; no skipped tool/component and no overlapping checks. Attempts 1/2 and
  isolated diagnosis evidence are preserved. No third-attempt loop, extra post-gate test/build, or executable edit.
- Passed: typecheck and coverage canaries, lint/architecture, formatting, 671 unit tests / 26 files, one build,
  initial gzip budget 251228/256000 bytes, seven complete ICU catalogs, generated OpenAPI drift, all 163 Chromium
  journeys, all-case hygiene, marker balance/threshold-zero duplication, npm audit, installed Trivy, licensed catalog
  and applicable Markdown lint. Duplication analyzed 81 files from 84 existing logic paths and found zero clones.
- All-case hygiene evidence verifies 56 actual route tests / 116 intended secret checkpoints plus rejection of the
  early-failure canary; zero marker leaks. Every complete original stdout/stderr/artifact set was scanned before
  content-free record retention. The formerly failed supervisor-acceptance-unknown/invitation-detail probe reached its
  exact checkpoint and intentional failure identity in the full scan. Course unit hygiene passed 13 tests / 21
  checkpoints and its canary; synthetic Playwright/Vitest checkpoint suites and canaries also passed. The original
  attempt-2 cause remains UNKNOWN; absent checkpoints were not accepted and identity checks were not waived.
- All 199 executable/test/script/config/dependency/backend-contract input paths and byte hashes match before/after
  `2578812d42795831d660e93cd3a3b0849abd5cfb9f5734fdbe13f38ee4ec2d3c`, including all new story inputs. Current production
  review clearance is the solver-supplied PASS from `ses_ee563bbd2ffecJS5ysP3GYkoYV`, explicitly preserved for the
  reviewed test-only keyboard maintenance and unchanged diagnostic inputs.
- Current audit/Trivy findings match the authorized prior dispositions: four npm LOW dependency-chain entries and
  one Trivy KaTeX LOW (CVE-2026-103923 / GHSA-238p-pmpm-9mq7, nested 0.16.47); unresolved but nonblocking under that
  disposition, not upgraded/suppressed. The one SendGrid-pattern MEDIUM is again inside the exactly reconstructed
  compiled 249-code static ISO list; source/dependency hashes, finding identity and byte-range containment proved.
  No additional security finding was observed. Detailed current proofs are in `verify-attempt3/advisory-dispositions.json`.
- Reported advisories are not hidden: Vite large chunk (budget passes), jsdom document navigation, runner performance/
  slow scaffold file, and two marker-balance grep messages for the intentionally deleted tracked old invitation hook.
  The deleted path remains in git's unstaged tracked listing until commit; its new shared owner is among the 84
  existing logic paths supplied to the scan. This is not a skipped installed tool or suppression; no gate/config/source
  changes were made.
- Final evidence: `verify-attempt3/full-gate.log`, before/after fingerprints, safe full route-hygiene records,
  stage counts/exit, preservation proofs, final `verify-report.json`, proposed checkpoint closure and commit-ready
  manifest under the story tmp directory. Current exhaustive manifest/full diff have 54 paths; only spec reporting
  notes changed after the gate. No tracker/checkpoint/staging/commit/push in this phase.
- Next: solver may transition to commit-pending and approve exact tracking paths/hunks before dispatching scoped
  commit. Any executable/test/config/dependency change invalidates this final evidence. Automated verification is
  complete; manual cross-browser/AT/400% release matrices and backend transaction execution are still not claimed.

### Exact attempt-2 hygiene diagnosis — isolated probe passed (2026-10-08)

- Solver authorized only the exact `supervisor-acceptance-unknown/invitation-detail` probe, not a third gate or broader
  suite. Ran it once in foreground with the deployed scanner's unchanged `makeFixture()` (all original live-secret
  fields and 30 marker variants), the unchanged Playwright hygiene config and existing attempt-2 build. No application,
  test, scanner, configuration, dependency, checkpoint or tracker edit was made for this diagnosis.
- Diagnostic wrapper scanned complete original stdout, stderr and all four generated artifact/checkpoint buffers
  before parsing or retaining any summary. Zero marker leaks; originals removed after scanning. Retained only hashes,
  counts, public source locations and safe classification booleans, never assertion bodies or fixture values.
- Exact probe passed: child exit 1 was the required intentional failure, with exactly one selected test/attempt/error,
  exact registered title, checkpoint file equal to the selected case/checkpoint, and exact ControlledRouteHygieneFailure
  identity. The live email presence check passed before the checkpoint file and deliberate assertion. No timeout,
  invalid fixture envelope or invalid checkpoint selection was observed. Evidence: `hygiene-diagnosis/probe-evidence.json`.
- Inspected inherited handoff setup and 4.1 interaction: the selected checkpoint occurs on administrator invitation
  detail before supervisor acceptance/login. Its invitation-only capability fixture does not grant course-records or
  supervision destinations. The inherited handoff and invitation fixture files are unchanged from baseline. The 4.1
  invitation-create caller changes only the shared activity-hook owner/name, and the helper keeps the same bookkeeping;
  invitation mutation/detail flow is not replaced by the new course collection pagination. No concrete local production
  discrepancy was reproduced, so no speculative fix or change to checkpoint identity/canary checks was made.
- Attempt-2 rejection remains real, but its original missing-checkpoint/wrong-identity distinction and child failure
  cause were not retained. One successful isolated probe cannot establish the historical root cause, rule out
  sequence-dependent behavior, or prove all-case hygiene. Disposition is non-reproduced in the exact isolated run,
  not a proven harmless flake and not a passing full verification.
- All 199 executable/test/config/dependency/backend-contract input paths/hashes remain the attempt-2 fingerprint.
  Dedicated report/log/fingerprints and a spec-only pre→post delta live under `hygiene-diagnosis/`; full manifest remains
  54 paths. Attempts 1/2 remain untouched. No reviewer changed-boundary recheck is needed because no executable
  boundary changed; existing production clearance remains applicable. Solver must disposition whether/when to run
  the next authoritative gate. No third gate, commit or owner interaction notification in this call.

### Authorized verification regression repair / attempt 2 (2026-10-08)

- Solver authorized a bounded test-only repair of attempt 1's stale desktop-shell expectations and one-path manifest
  addition: `e2e/applicationShell.spec.ts`. The fixture grants course-records and supervision capabilities; the actual
  Home, Courses, Invitations, Prepare courses, MFA order matches the approved shell/navigation contract. No production
  discrepancy or change was found. Expected full link order and explicit Tab focus checks now include both course
  destinations. Current-route, bypass, axe, MFA, Sign out, Shift+Tab and navigation assertions remain intact.
- Focused shell regression passed all nine Chromium cases using the existing gate build; formatting of the touched
  test passed. This test has no protected fixture bodies/new secret checkpoints. Actual small diff and separate repair
  logs live in the story tmp directory's `gate-repair/`. Story manifest increases from 53 to 54 paths with this rationale.
- Solver disposition: existing independent production review clearance from `ses_ee563bbd2ffecJS5ysP3GYkoYV` remains
  valid for this strictly test-maintenance change; no new broad review was requested or performed.
- Attempt 1 log/fingerprints/reports remain preserved in `verify/`. Attempt 2 runs exactly once in foreground, with a
  separate `verify-attempt2/` directory, full all-case hygiene scope and installed scanner stages enabled.
- Attempt 2 completed in foreground: exit 1 after 1024.315 seconds at all-case hygiene. All 671 unit tests / 26 files
  and all 163 Chromium journeys passed, including the repaired keyboard sequence. One build; initial-route gzip
  251228/256000 bytes; seven catalogs and OpenAPI drift passed. The 199 before/after executable/test/config/dependency/
  backend-contract input paths and byte hashes match `2578812d42795831d660e93cd3a3b0849abd5cfb9f5734fdbe13f38ee4ec2d3c`.
- Hygiene is partial, not passed: course unit 13 actual tests / 21 checkpoints and its early-failure canary passed;
  the synthetic Playwright/Vitest checkpoint suites and canaries passed. Actual route probes progressed through course
  and several supervisor handoffs, then failed at `supervisor-acceptance-unknown/invitation-detail` with
  `Missing intended checkpoint/failure identity` (`scripts/check-route-secret-hygiene.mjs:263`). This guard rejects
  the wrong failure rather than allowing it to masquerade as deliberate-failure evidence. No fixture marker leak was
  reported; source order confirms marker scanning precedes this identity rejection. The all-case route scan and its
  early-failure canary did not complete, and no entire-suite hygiene pass is claimed.
- Existing content-free log does not distinguish missing checkpoint from wrong failure identity, nor identify the
  original child assertion. Child protected output/artifacts are intentionally not forwarded and are removed by the
  scanner. Diagnosis must retain only safe failure classification/checkpoint booleans, not fixture bodies, before a
  narrowly scoped probe. Do not guess a timeout/production repair, weaken identity checks, or label this a harmless flake.
- Duplication marker balance/search, audit, installed Trivy, licensed catalog and Markdown were not reached because
  the gate exits on hygiene failure; no tool was reported skipped. KaTeX/country-code prior source/dependency identity
  remains substantiated, but current advisory disposition cannot be reused without current scanner results.
- Reports/fingerprints/counts and commit-ready manifest (false) updated; attempt 1 evidence untouched. No extra
  check/build or third gate was started. Only reporting notes changed after attempt 2; parent/backend/tracker work was
  not edited. Next: solver dispatches content-free diagnosis of this exact existing supervisor hygiene probe, then any
  evidence-backed bounded fix and separately authorized verification. No owner interaction decision is needed now.

### Authoritative verification attempt 1 — failed E2E (2026-10-08)

- Solver supplied independent reviewer PASS for R1–R3 from `ses_ee563bbd2ffecJS5ysP3GYkoYV`, with no remaining
  blocker/reproduction request. Ran `./run-all-tests.sh` exactly once via owned shell `sh_11ab1dfe5001XKAKcEuTsyjUjO`;
  exit 1 after 678.077 seconds. No overlapping check or duplicate invocation.
- Before/after membership and hashes of all 199 executable/test/config/dependency/backend-contract inputs match
  `9c69aca6b064c57338c21c3c8acf9e8747077a53c8674548d818ffb202b8261d`, including new story files.
- Nine gate stages passed: typecheck/coverage, lint/architecture, formatting, 671 unit tests in 26 files, one build,
  initial gzip budget 251228/256000 bytes, seven catalogs and API drift. E2E ran 163 cases: 162 passed, one failed.
  Build chunk-size, jsdom document-navigation and runner performance/slow-file advisories are not suppressed.
- Exact failure: `e2e/applicationShell.spec.ts:137` desktop shell keyboard order test expects only Home, Invitations
  and Multi-factor authentication despite its all-capabilities fixture now also authorizing Courses and Prepare courses.
  Failure at line 150 precedes its stale Tab assertions. Product navigation agrees with the reviewed 4.1 capability contract.
- Minimal proposed fix: add that existing test file to the story manifest with solver approval; update expected navigation
  and explicit keyboard focus order for both new destinations, preserving current-route, bypass, MFA and Sign out checks.
  No application change, capability weakening, deletion of assertions, retries, or broader refactor is proposed.
- All-case hygiene, marker balance/duplication, npm audit, installed Trivy, licensed catalog and Markdown stages were
  not reached due to E2E failure; none is passed or counted as an unavailable-tool skip. Known KaTeX/country-code
  source/dependency identity was substantiated before the gate, but current scanner results/disposition are still pending.
- Failed verification evidence: `verify/full-gate.log`, `verify/gate-exit.json`, `verify/inputs-before.json`,
  `verify/inputs-after.json`, `verify-report.json`, `proposed-checkpoint-closure.json` and `verify-commit-ready-manifest.json`
  in the story tmp directory. Commit readiness is false. Only reporting notes changed after the failed gate.
- Next action: solver dispatches the bounded legacy keyboard-test repair and manifest adjustment, independent recheck,
  then a separately authorized gate on the new final test fingerprint. No extra test/build, tracker/checkpoint edit or
  commit in this verification call. This ordinary regression repair needs no owner decision or interaction-needed alert.

### Fix batch 1 — reviewer R1–R3 (2026-10-08)

- R1 repaired: checkbox enabled unchecked border and normal name outline use inherited gray-500; error name
  outline uses red-600. Exact licensed bindings remain unchanged; these WCAG 1.4.11 / DESIGN color deltas are recorded
  beside the bindings. Browser regression measures computed boundary/background sRGB contrast with enabled,
  unfocused, empty/unchecked controls in normal light colors, separately from axe and forced-colors checks.
- R2 repaired: invalid supervisor selection exposes aria-invalid on the fieldset and native checkboxes, with the same
  corrective description associated to both. Local missing-selection and backend course_supervisor_invalid bind to
  the rejected selection; editing that set clears its invalid state/stale corrective summary without claiming eligibility.
  Focused tests cover valid-name/no-supervisor rejection, backend rejection, and local/backend selection correction.
- R3 repaired: shared course/candidate pagination uses the localized generic Collection pages in all seven catalogs;
  invitation pagination remains unchanged. Browser checks assert the accessible landmark names on selector, courses
  and invitations, with no Invitation pages landmark on the two course surfaces.
- Fix batch 1 focused checks passed: 2 unit/integration files / 57 tests; 4 selected Chromium journeys. The new normal-color
  test measured both the empty name outline and unchecked checkbox border at 4.836:1 against inner and outer white
  backgrounds while enabled and unfocused. Shared pagination names are exercised on course selector/list and existing
  invitation pagination; no invitation copy was changed. Unit tests verify local/backend invalid group/control state,
  corrective associations and selection correction without automatic mutation.
- Actual-test hygiene passed on the final repair state: unit 13 tests / 21 checkpoints; browser 10 tests / 22 checkpoints;
  each rejects its early-failure canary with zero marker leaks in original stdout/stderr/generated artifacts. These
  counts are per scan, not additive with earlier evidence. Typecheck, lint/architecture, formatting, seven complete ICU
  catalogs and marker-balanced threshold-zero duplication passed. One local browser build passed with its chunk advisory.
- Initial repair check failures were evidence/setup issues, not waived passes: saved pre-repair .mjs copies under tmp
  were scanned as script inputs by ESLint, so snapshots now use .before extensions without changing lint configuration;
  the invitation fake's default terminal page has no pagination, so the landmark regression supplies a contracted
  continuation link. Both final reruns pass. No application behavior was weakened for these repairs.
- Pre→post `repair.diff` and final full `story.diff` include new/untracked story files; actual manifest remains exactly
  53 story paths. Updated fingerprint and `fix-report.json` record the final checks/commands/logs. All repair evidence
  lives under the story tmp directory, with check logs in `fix-batch1/`. No tracker/checkpoint, full gate, commit or 4.2 work.

- Prepare block A complete: exact identity/baseline/index/dirt/prerequisite evidence inspected; no unknown overlap.
- Prepare block B complete: all rules, relevant UX/backend contracts, existing API/session/route/departure owners inspected.
- Prepare block C complete: model catalog/tool/library availability and exact new licensed blueprint anatomy checked.
- Prepare block D complete: bounded spec, explicit proposed manifest, negative-test/hygiene inventory and O1/O2 evidence written.
- Prepare block E complete: owner-approved O1/O2 and batch commit authorization recorded; five canonical companions
  reconciled narrowly, exhaustive manifest finalized, prior parent/backend dirt and solver checkpoint preserved.
- Implement block 1 complete: strict shared filter-preserving navigation, minimized account/course APIs, independent
  action/supervised-ID capability projection and controller propagation/security scope comparison. Focused API run:
  4 files / 33 tests passed (not additive with subsequent runs). Actual API hygiene: 3 tests / 5 checkpoints,
  early-failure rejection and zero marker leaks. Evidence: `api-tests.log`, `unit-hygiene-early.log` in the story tmp directory.
- Implement block 4 complete: final focused run passed 10 files / 292 unit/integration tests; final bundled Chromium
  run passed 9 journeys. These counts describe individual final runs, not totals added to overlapping earlier runs.
  Actual-test deliberate-failure scans passed: unit 13 tests / 19 checkpoints; browser 9 tests / 21 checkpoints;
  each rejected its early-failure canary and found zero marker leaks in original process output/generated artifacts.
  Real 200% browser zoom covers create/detail/list/Prepare at Standard, Large and Extra large; direct 320px creation
  covers all seven locales and text modes with spacing overrides. Mixed-direction protected fixture text is isolated.
  Hidden-before/after detail checks compare neutral presentation in all seven locales; browser Back/Forward, mobile
  drawer Stay/Discard, native Reload prompt and pagehide security override are exercised. Raw body/selected labels
  remain outside announcements/URL/history/storage; protected print content is suppressed. No release certification claimed.
  Typecheck, ESLint/architecture, formatting, seven ICU catalogs, generated OpenAPI drift, typecheck-coverage canaries,
  bundle budget and marker-balanced threshold-zero JSCPD passed. Build passed with the existing chunk-size advisory.
  Logs and exact commands: `tmp/agent-execution/4-1-administrator-creates-a-course-with-a-supervisor/implement-report.json`.
  Full gate and commit deliberately not run in implement; final verification is a later authorized phase.
- Implement blocks 2–3 complete: four registered routes with fresh resource admission, independent capability navigation,
  host-level protected-subtree teardown and collapsed raw disclosure, native paginated supervisor selection, Action-based
  atomic create with corrective/unknown/Stop waiting outcomes, persisted detail and explicit exact-ID Prepare batches.
  Seven localized catalogs added. Focused shared/API/session/navigation/form run: 5 files / 209 tests passed.
  Actual unit hygiene expanded to 11 tests / 16 checkpoints with early-failure rejection and zero marker leaks.
- Concrete manifest adjustments: `src/platform/ui/RouteRecoveryPanel.tsx` adds an optional focusable heading ref for
  outcome focus; `playwright.route-secret-hygiene.config.ts` registers actual course tests in the existing failure harness.
  The existing mounted-state bookkeeping now has current cross-feature reuse: move
  `src/features/invitations/useInvitationActivity.ts` to `src/platform/ui/useRouteActivity.ts`, updating only its
  three invitation callers (`InvitationCreateRoute.tsx`, `InvitationResendRoute.tsx`, `InvitationRevokeRoute.tsx`)
  and the new course callers. No domain state/authorization was merged and no forwarding compatibility wrapper remains.
- Browser first-pass evidence found a copied primitive-counter/control object in the protocol fake (not product behavior),
  premature lazy-feature/batch assertions, and the zero-height Dialog container assertion. Repairs keep actual observers,
  return the same fake control, wait for completed data, and assert the visible Stay control. Protected artifact scan found
  one unexpected locator-failure context carried a fixture name; that ephemeral artifact was removed by the subsequent
  isolated run. Protected-state assertions now use content-free booleans, and protected fill operands receive a
  content-free test-boundary diagnostic. The final actual-test deliberate-failure scan passed on the final test state.
  Native Node cannot import the browser catalog module's bundler-only JSON imports; browser tests read and validate
  public localized labels directly instead. No production import/behavior changed to satisfy the test runner.
  The clone scan identified duplicate access-projection shapes: AuthenticatedAccess now extends the existing
  AccountCapabilities projection with epoch, leaving the API and controller with one shape owner, not a copied list.
- Spec Markdown lint: exempt under `.agents/rules/markdown.md` (`_bmad-output/`); do not run autofix against exempt files.
- Documentation checks: planning/manifest/decision consistency and scoped diff whitespace checked; Markdown lint is
  exempt for all six story-owned paths. Check results and the actual six-file diff are in the story's tmp report directory.
- Handoff artifacts: complete tracked-plus-new story diff `story.diff`, exhaustive actual `manifest.json`,
  `implementation-fingerprint.json`, and `implement-report.json` in the story tmp directory. Baseline user/solver
  changes, backend work and licensed sources are excluded. The original planned manifest is retained separately.
- Limits: protocol fakes exercise the frontend, not a rerun of backend transaction tests; manual Safari/Chrome/Edge/AT
  and 400% release matrices are not run here. The broader BCG-008/full CP-03/CP-12 dependencies remain open.
- Next action: independent review of the actual scoped diff and focused evidence. Retain this worker for any supplied
  evidence-backed fixes, then a separately dispatched authoritative verify/commit. No worker tracking edits,
  full gate, staging, commit, child orchestration or next-story preparation in this phase.
