# Story 5.2 — Student first sign-in and joined-course entry

## Current Learn-slice authorization — 2026-10-10

Phase: implement. Baseline: `3737013c4f36fd830fbff45874d0068e5288eb4b`. The handoff slice below is committed at that baseline and stays intact as historical evidence. G1 is no longer blocking this Learn dispatch; the backend RFC remains open. No checkpoint/tracker edits, staging or commit are authorized in this phase.

Verbatim binding checkpoint decision (`owner_decisions.g1_exception.scope`, including warning acknowledgment):

> Owner chose Option 2 (explicit least-data exception) after being warned the material variant lets generated brief content reach the browser unrendered. Learn discovery may use the capability catalog's joined-course IDs + getCourse (declared student-safe) with active-only presentation, and listMaterials with client-side filtering to approved/ready/course-wide rows. Mitigation mandate: brief fields are discarded at the API boundary and never enter state, DOM, accessibility tree, logs, or announcements; only metadata fields are carried. RFC mia/tmp/5-2-student-learn-projection-rfc.md stays open for the real transport; a new BCG entry records the exception and follow-up.

Binding dispatch scope and mitigation (verbatim):

> Course discovery: use the capability catalog's joined-course IDs + getCourse (declared student-safe output) with active-only presentation. Each read independently authorizes. Never present supervised/staff courses in Learn.
>
> Material metadata: listMaterials with client-side filtering to approved/ready/course-wide rows for the joined course. MITIGATION MANDATE (owner-approved, mandatory): discard brief and all non-metadata fields at the API boundary immediately upon receipt — they must never enter application state, the DOM, the accessibility tree, logs, announcements, or test artifacts. Carry only the metadata fields the surface renders. This is the only sanctioned relaxation; the network-level overfetch is the accepted exception, in-browser exposure is NOT.
>
> A changed/denied membership gets the fixed existence-hiding presentation; returning/reloading rediscovers membership from backend state without implying a second account; course detail exposes only authorized active-course actions and the material metadata.
>
> No tutoring session start (6.1), no downloads, no private material handling.

### Settled Learn acceptance and concrete map

- AC3/4/5 discovery is authorized under BCG-020. Three canonical routes: `/learn/courses`, `/learn/courses/:courseId`, `/learn/courses/:courseId/materials`. The detail offers only the implemented metadata destination, Refresh and parent navigation, with authoritative acceptance status; no tutoring action.
- `src/platform/api/learnCourses.ts` adds a distinct student-safe course projection (empty supervisor arrays valid) and metadata-only material schema. Zod strips all unused fields before return; no broad Material parser or cache. Check course identity, ready/approved/course-wide membership, duplicate IDs, 25-row pages and existing link validator. Only name/kind/format plus opaque row identity leave the material boundary; scope/state/approval/course binding are admission checks, not retained fields.
- Joined discovery batches at most 25 capability IDs sequentially, active-only; no generic course list, staff-scope union or automatic page exhaustion. Consumption advances by IDs checked, not rows retained, so inactive rows cannot cause repeat reads or false completion.
- `entry.ts` and `sessionController.ts` propagate and compare learning action/joined IDs, fencing removal; `entryRoutes.tsx`, `App.tsx`, `ApplicationShell.tsx` add only the lazy Learn host and canonical destinations. Addressed Learn routes remain neutral on missing scope rather than rendering a stale course or probing denial. Existing ordered read/security/epoch owner is reused.
- `LearnCourseRoute.tsx` owns scoped loaders and shared course admission settlement/frame. `features/courses/LearnCourseRouteProps.ts` and `LearnCourseSurface.tsx` own a closed read-only list/detail/materials union and bounded foreground collection reads. Existing CourseEmpty/Pagination/CheckedAt/actions are reused; no auth refactor, dependency, theme/CSP change or generic infrastructure.
- Exact blueprints remain Tables/Simple and Description Lists/Left-aligned, library `2026-09-13-083323`, light v4. All seven catalogs receive complete Learn labels. Learn local/HTTP hidden causes share neutral heading/title/focus/actions and no cached name. Exact collapsed backend disclosure remains governed by the canonical raw-error exception and neutral-body obligation; never synthesize a local HTTP body.
- Focused tests: `learnCourses.test.ts`, `learnCourseEntry.test.tsx`, entry/session/shell regressions and `e2e/learnCourses.spec.ts`. Test boundary projection with generated forbidden brief/nonmetadata markers, mixed-role non-fetch, gate order, changed membership, late response/lifecycle shield, reload and metadata pagination with filtered-empty pages. Extend existing actual-case hygiene inventories/config only as required for these cases.
- Checks run sequentially: static/typecheck/format/i18n, focused Vitest, one build/bundle (fixed 256000 gzip budget), bundled Chromium, existing deliberate-failure route hygiene and zero-threshold duplication/secret scan. Full gate/review/commit are deferred, not passed. Manual supported-browser/AT/backend evidence remains a release lane.
- Risks: accepted network overfetch remains a backend follow-up, not a claim of least-data transport; multi-role getCourse may contain richer fields, all stripped by distinct learner schema. Capability catalog is unpaginated; course reads are user-bounded. No open product decision for this dispatch. Stop/report on observed provider 429. Preserve all baseline bookkeeping.

The earlier conditional Learn plan below is historical preparation, superseded by this settled operation/map. Its blocked disposition does not apply to this dispatch. Handoff execution records remain unchanged.

### Learn execution progress

- L1 complete: BCG-020 records the dated exception without altering Release Blockers. Distinct minimal learner course/material adapters, joined scope propagation/fencing, three canonical lazy routes, admitted Learn navigation and read-only surfaces are implemented. Detail includes the first metadata page after course admission, plus its canonical metadata destination; both course and metadata remain neutral until the ordered initial reads settle. Batch consumption uses checked IDs, not filtered row counts. All seven catalogs are extended; no dependency/config-budget/theme/CSP changes.
- L2 in progress: eleven new boundary/route unit cases are installed in the existing deliberate-failure course-unit inventory. Concrete shared protocol documents in `test/learnFixtures.ts` and bounded browser controls in `e2e/learnFixtures.ts` support actual new `e2e/learnCourses.spec.ts` cases and one connected provisioning/replacement/Learn/later-sign-in case in the existing scaffold. Existing Home expectations now allow the landed Learn link (no dependent request). Hygiene inventories/checkers and the existing hygiene config are extended only to cover these actual cases, not a parallel runner. Initial unit runs exposed harness-only provider prop, lazy-content settlement and pagination label assumptions; six route cases now pass, static typing corrections are in progress. No auth production owner was reimplemented.
- L2 complete: final focused unit run passes 379 tests across nine affected files, including the eleven new API/route cases, joined-scope fencing, shell and staff collection regressions. The first shell regression exposed a missing Learn field in ShellNavigation's minimized projection; it is repaired at that established owner. Thirteen bundled-Chromium cases pass: six Learn cases, one connected provision/replacement/Learn/reload/later-sign-in journey and all six committed handoff cases. Seven locales × three text modes cover all three Learn surfaces at direct 320px; actual 200% zoom, spacing, forced colors/reduced motion and axe cover all three modes. New coarse hidden-result tests compare primary semantics/focus/URL/title/actions, with exact collapsed raw technical disclosure remaining the canonical exception (no fabricated local HTTP body).
- L3 in progress: static/typecheck coverage/lint/format/i18n pass; build passes at 246175 initial-JS gzip bytes within unchanged 256000. Duplication is zero with balanced markers. The concrete presentation clones were resolved by sharing `CourseCollectionFeedback` in the existing `CourseListRoute.tsx` owner; staff and Learn retain separate loaders/authorization. Only the matching host JSX has a bounded documented marker in `LearnCourseRoute.tsx`, with counterpart note in `AdminCourseRoute.tsx`. Actual-case unit/browser deliberate-failure hygiene and final evidence packaging follow. Full gate/review/commit have not run in this phase.

- L3 complete: final focused unit run is 379/379 (nine files); final Chromium run is 13/13, including all committed handoff cases. Computed root sizes explicitly confirm every tested text mode; all seven locales × three modes pass direct 320px across the three Learn surfaces. Actual-case hygiene passes eleven unit cases/eleven checkpoints and seven browser cases/eighteen checkpoints, both with rejected early-failure canaries and zero marker leaks after scanning full original output/artifacts. Two unit-only hygiene runs initially failed before their checkpoint because isolated lazy-content/focus settlement was not awaited; tests now await actual content and heading focus, and the complete selected unit hygiene passes. These were harness repairs, not waived checks. Secret-only Trivy reports no findings; no audit/vulnerability/full-gate/manual claim is made.
- Implementation disposition: **implemented Learn slice, not verified/reviewed/committed and not story done**. Spec/BCG-020, code, tests and actual-case hygiene infrastructure are story-owned. Current baseline remains `3737013c4f36fd830fbff45874d0068e5288eb4b`; no tracker/checkpoint/staging/commit or unrelated worktree edits. Model: `openai/gpt-6.1-sol` (runtime variant not exposed), no observed provider 429, tooling install or unavailable component. Final evidence is appended as `learn_slice` in `implement-report.json`, with scoped `manifest.json`, tracked-plus-new `story.diff`, `learn-inputs.json` and content-free `logs/learn-*` under `tmp/agent-execution/5-2-student-first-sign-in-and-joined-course-entry/`. Historical handoff report/evidence remain distinguishable. Next action: independent review of this Learn diff, then separately dispatched authoritative final verification and authorized commit. RFC/manual release lanes remain open; no new owner intervention or duplicate Pushover alert is needed.

Final scoped consistency repair: machine 23's receipt time now belongs to each Learn collection and advances after an explicit successful page/batch read. Course readiness retains its separate entry receipt time; a material page cannot make old course readiness look freshly checked. The existing pagination regression now advances the test clock and asserts the collection receipt changes. This localized source/test repair invalidates the previous packaged fingerprint; affected checks and evidence are regenerated before handoff.

Final repair evidence: static/typecheck/lint/format, 379 focused units, thirteen Chromium cases, eleven unit-hygiene checkpoints and eighteen browser-hygiene checkpoints all pass again on the repaired state. Both early canaries are rejected, no marker leaks or duplication clones are present. Rebuilt initial JavaScript is **246187 gzip bytes**, still within **256000** with seven complete languages. The current report/diff/manifest/input fingerprint supersede the earlier packaging; no source/config/dependency edit follows these checks. This is implementation evidence only, not an authoritative final-gate claim.

- F1 complete (solver-authorized verify repair, 2026-10-10): the failed full-gate e2e expectation `e2e/applicationShell.spec.ts:137` was a stale test list, not a gating defect. The Learn navigation link renders only when the `learning.participate` capability is available (`entry.ts` → `learningParticipation`; `ApplicationShell.tsx` Learn group), and that spec's all-capabilities fixture legitimately carries it with `available: true`; the shell unit contract already expects Joined courses between Home and Courses. The e2e expected list and Tab-order walk now include Joined courses in that position; negatives, unauthorized destinations and restricted-stage isolation are untouched. Targeted shell/Learn Chromium suites pass (9/9 and 6/6) and one fresh full gate passes end to end with exit 0, including the secret-hygiene, duplication, audit, Trivy, catalog and Markdown stages the failed run never reached. Model: `kimi-code/k3` (approved fallback after the OpenAI usage limit). Evidence: `fix-report.json`, refreshed `manifest.json`/`story.diff`, `fix-learn-inputs-after.json` and content-free `logs/fix-*.log` plus `logs/verify-learn-full-gate-rerun.log` under the story tmp directory.

## Historical preparation identity and disposition

- Current phase: **verified — authorized handoff slice only**, solver decision 2026-10-10. The partial slice is verified;
  the whole story remains **blocked on G1** and must not be marked done. No Learn surface is authorized.
- Current scope: real 5.1 provisioning fixture → 1.3 temporary-password sign-in → 1.5 restricted replacement → existing
  capability-admitted Home shell, no fresh-account MFA enrollment → later sign-in with the replaced password.
  Reuse existing production owners; repair only a demonstrated integration defect, including shared-control relocation.
- Current exclusions additionally include every Learn list/detail/material-metadata adapter, route, navigation item,
  capability propagation change and translation. Sections explicitly labelled “after G1 resolution” remain future
  blocked-slice design, not authorization for this dispatch. The RFC stays `mia/tmp/5-2-student-learn-projection-rfc.md`.
- Current acceptance: AC1/2, AC5's later-sign-in/no-replay subset, AC6's existing Home gate and AC7's handoff subset below.
  AC3/4 and all membership/course/material discovery parts of AC5/6/7 remain blocked, not waived or fulfilled by Home.
- Current concrete manifest: this spec; `e2e/scaffold.spec.ts` (bounded student describe plus local fixture reuse);
  `e2e/routeSecretHygiene.ts` (live credential checkpoint assertions); `scripts/route-secret-hygiene-cases.ts` (actual
  case inventory); `scripts/check-route-secret-hygiene.mjs` (student-entry scope/inventory). No new production
  infrastructure, source UI, dependencies, translations or config is planned. Existing `studentBackend`/`fillStudent`
  provisioning truth is reused directly; no fixture engine or auth refactor. Any production repair needs recorded proof.
- Current blocks: H1 bound spec; H2 connected provisioning/auth/Home integration; H3 focused static/unit/Chromium,
  actual-case deliberate-failure hygiene, i18n/duplication and fixed 256000-byte bundle check, then scoped diff/report.
  Final full gate, independent review and any commit remain separate solver phases. Never stage or commit here.
- Current risks/open decisions: no open decision for the handoff slice; G1 remains unresolved for Learn. Protocol fakes
  prove frontend integration, not backend execution or manual supported-browser/AT/password-manager release acceptance.
  Preserve all pre-existing bookkeeping; observed provider 429 stops this phase for solver fallback.

- Phase: prepare, 2026-10-10. Status: **blocked on the Learn collection/projection contract**, not on authentication.
- Frontend baseline: `1d6354f70ac96fb4569cb47f20c14fe528e26685`; backend: `63c99925e5995fe2e2467f4f894976dfd4c0d297`.
- Actual worker: `openai/gpt-6.1-sol` (GPT-6.1 Sol). Configured variant `high`; actual variant is not exposed.
- Story authority: `epics.md:270–281`; coverage is FFR-101..103 and only the joined-course discovery subset of FFR-601.
- Read-first authorization: `execution/5-2-student-first-sign-in-and-joined-course-entry.yaml`. Unattended Epic-5 scope,
  interim RFC pattern, fixed 256000 gzip-byte budget, seven languages and OpenAI → `kimi-code/k3` → Anthropic rotation
   override older protocol defaults. Preparation did not implement, stage, write checkpoint/tracker, review or commit.
- This is an integration of completed 1.3/1.5/5.1, like 3.2. Auth is reused unchanged unless a focused joined test proves
   a defect. Required Learn surfaces are absent and remain blocked; they are not part of the current handoff dispatch.

All 18 pre-existing frontend dirty paths are approved workflow/bookkeeping categories: `.opencode/` agent/config/protocol,
execution checkpoints 2.1/2.2/3.1/3.2/4.1–4.5/5.1/5.2, sprint tracking and Epic-2 retrospective. Index is empty.
Two backend dirty paths are unrelated (brainstorming CSV and authentication guide). Exact paths/content-free hashes:
`tmp/agent-execution/5-2-student-first-sign-in-and-joined-course-entry/prepare-baseline.json`.
No unknown application overlap. Preserve every baseline file; never stash, revert or stage it.

## Binding references

Companions below are relative to `../planning-artifacts/ux-designs/ux-mia-frontend-2026-09-12/`:

- `FRONTEND-PRD-FOUNDATION.md` FFR-101..103, FFR-106/107/110, FFR-601 discovery subset and FFR-955.
- `EXPERIENCE.md` Information Architecture/current delivery slice, Flow 1 steps 1–3, shared-device sessions and localization.
- `ROUTE-INVENTORY.md` Protected gates/safe fallback and Learn Courses (169–205).
- `SURFACE-STATE-MATRIX.md` profiles G/L/D/T; Public entry, Restricted login, Home, Learn courses (206–213).
- `FRONTEND-STATE-MACHINES.md` machines 1, 9, 12 (read-only student readiness), 23, 24, 28, 29, 31;
  machine 11 only for approved material read vocabulary. No new numbered discovery machine exists.
- `SECURITY-PRIVACY-ACCEPTANCE.md` Protected Mount, CSRF, Lifecycle, Shared-Device Teardown, Scope-Aware Cache,
  Least-Data Fetching (495–539), Credential Lifecycle, Raw Error, Existence Hiding and Secret Hygiene.
- `ACCESSIBILITY-ACCEPTANCE.md` CP-01/02 entry subset; applicable AC-001..005/008..012/016/019. This does not close CP-05
  tutoring, CP-13 provisioning, all FFR-101 features or manual browser/AT release acceptance.
- `DESIGN.md` exact pre-implementation blueprint gate, inherited light theme and reflow.
- `BACKEND-CONTRACT-GAPS.md` BCG-001 login/password/lifecycle slices, BCG-003 complete scope, BCG-005/007 and BCG-011.

Backend OpenAPI owns transport; `mia/docs/product-requirements.md` owns provisioning/first replacement (507–524), optional
MFA, course membership/state, role union and material visibility (897–926). Backend source inspection below is corroboration,
not permission to invent transport or replace the frontend companions.

## Prerequisites and existing implementation

Tooling checked once, without installs: Node 24.21.0, npm 11.19.0, `npm ls --depth=0` passes with all declared dependencies.
Installed TypeScript 5.9.3, ESLint 9.39.5, Vitest 5.0.1, Vite 8.3.0, Playwright 1.63.0, axe 4.13.0 and Trivy 0.75.0.
Bundled Chromium executable exists; headless launch/close passes, version 153.0.8010.12. No tooling/network failure.
Licensed Tailwind Plus version `2026-09-13-083323` is present; selected exact light sources were read.
Current package/stack rules override stale greenfield/version prose in AGENTS/retrieval skill.

Catalog availability (not quota/paid-execution evidence): active `openai/gpt-6.1-sol#high` worker and
`openai/gpt-6-astra#high` solver/reviewer; active `kimi-code/k3#high`; active Anthropic Opus/Sonnet/Haiku 5.5 with `high`.
The batch does not pin the final Anthropic model; solver must select explicitly if reached. Protocol fallback
`mistral/mistral-medium-2604#high` is available but superseded by the batch rotation. No provider 429 observed; stop/report
immediately if one is observed. No paid availability probe or child agent.

Implemented owners to preserve:

- `features/auth/PasswordSignInForm.tsx`, `PasswordChangeEntryRoute.tsx`, `PasswordChangeForm.tsx` and restricted logout.
- `platform/api/entry.ts`: `loginWithPassword`, `changeTemporaryPassword`, `discoverSession`, complete capability parser.
- `platform/session/sessionController.ts`: serialized transitions, `applySession`, access cycle, deadlines, shields,
  `readAuthenticated`, security/scope fencing. Do not duplicate this owner in Learn.
- `platform/ui/NewPasswordFields.tsx`, `PasswordRevealButton.tsx`, `passwordRules.ts`, `countryCodes.ts`,
  `accountProfileOptions.ts`: shared controls/options moved by 5.1. Never import their old auth feature paths.
- `app/routes/RouteAdmission.tsx`, `routeFrame.tsx`, `RouteRecoveryBoundary.tsx`, `CheckingAccess.tsx` and
  `AdminCourseRoute.tsx` admission hook/frame; `ApplicationShell.tsx`, announcer, raw error and route activity owners.
- `features/home/HomeEntryRoute.tsx` is intentionally neutral, not an active-session discovery/resume feature.
- `entryRoutes.tsx` has no Learn descriptor/parser; `ApplicationShell.tsx` has no Learn group. 2.x laid the shell/navigation
  infrastructure, **not** a student Learn implementation. `entry.ts` validates `learning.participate` but drops it from
  its minimized access view; the session controller does not propagate/compare its scope.
- `courses.ts` is a staff projection: `courseSchema.relationships.supervisors.data.min(1)` rejects legitimate student
  course responses with an empty supervisor array. Add a distinct learner parser; do not weaken staff invariants.
- No existing approved learner material surface/parser exists. Do not reuse the richer Prepare material view model.

## Acceptance and exclusions

1. A provisioned account without MFA signs in once using its temporary password. The authoritative `password-change`
   stage displays the existing focused replacement plus logout, no shell/metadata/capability/dependent request or
   enrollment request. Password managers, reveal and exact-byte paste work through existing controls.
2. One deliberate replacement uses fresh CSRF and the existing mutation owner. Definitive authenticated success starts
   complete capability discovery; nothing protected mounts while it is pending/failed. No re-provisioning or second-account
   copy. Existing MFA-before-password ordering remains intact but this story adds no MFA flow or enrollment work.
3. Entering Learn shows only current joined active courses and their authorized learner detail. Course readiness is
   server-authored; active does not imply accepting new sessions. Only implemented active-course read actions appear.
4. Approved course material metadata is a separately admitted bounded collection: ready, approved, course-wide,
    file-backed or link-only. Under BCG-020 the generic network response is the accepted exception; only eligible
    rendered metadata leaves the API boundary. Brief and all other fields are discarded there immediately, and no
    private/draft/unapproved row enters the application view model or surface.
5. Reload, later sign-in and explicit Refresh discover saved membership from backend state. No create/provision/login/
   replacement replay. Changed membership/access clears old identities and uses the fixed safe presentation.
6. Current security/scope epoch owns all reads. Older responses cannot reveal names or replace newer truth. Lifecycle
   events shield/mark stale without network work; explicit Refresh alone may reauthorize. Read failures are not empty.
7. All seven locales, text modes, structure/keyboard/focus/status, least-data non-fetch and secret teardown have scoped
   evidence, without claiming manual release conformance or historical auth evidence as current story verification.

Excluded: tutoring start/resume/discovery/current work, intent/starters/chat/SSE/history/summary/speech (Epic 6), material
downloads/file/content reads/external-link activation, private-material creation or reads, profile/self-edit, account or
global student directory, provisioning/support/MFA/recovery expansion, roster/removal, role changes, auto-routing Home
based on presumed absent active work, dependencies/CSP/theme/bundle-budget changes, generic workflow engines and auth refactors.
No Start/Continue tutoring link to an unimplemented route, disabled aspirational control or fabricated eligibility.
Normal course detail may state current acceptance status; `active_tutoring_session` never supplies a resumable identity.

## Verified operations and historical projection prerequisite

These exact operations are present in `mia/api-doc/openapi.yaml` and generated types:

- `discoverSession`: `GET /api/v1/auth/session`, auth.yaml 32–104. Sole stage authority, no GET CSRF/body, non-refreshing,
  `200 SessionDiscoveryDocument`, no-store, authored deadlines. Anonymous/restricted failure behavior stays with auth.
- `login`: `POST /api/v1/auth/login`, auth.yaml 1–30. JSON:API `LoginRequestDocument`, fresh CSRF,
  `200 AuthSession` including `password-change`; contracted credentials/validation/throttle rejections reused unchanged.
- `changePassword`: `POST /api/v1/auth/password-changes`, auth.yaml 145–168. Cookie+CSRF,
  `PasswordChangeRequestDocument` (`password`, `password_confirmation`), `200 AuthSession`; existing 1.5 rejection,
  rotation/reconciliation and no-replay behavior is binding.
- `getCurrentAccountCapabilities`: `GET /api/v1/users/me/capabilities`, users.yaml 50–79 and student example 81–135.
  Authenticated only, non-refreshing/no-store, complete unpaginated catalog. `learning.participate.available` plus
  `scope.course_ids` describes joined courses, not active-only visibility or start eligibility; no staff-role inference.
- `listCourses`: `GET /api/v1/courses`, courses.yaml 1–24. `200 CourseCollectionDocument`, no-store,
  page limit/offset only. It is a **visible permission-union collection, not an authoritative joined-active collection**.
- `getCourse`: `GET /api/v1/courses/{id}`, courses.yaml 59–87. `200 CourseDocument`, no-store/ETag; 401, restricted 403,
  hidden 404 `course_not_found`, 406, readiness 503. Declares joined-student-safe fields. CourseReadiness (resources.yaml
  711–738,796–817) exposes current state and `new_session` eligibility/blockers/consequences. No readiness POST/probe.
- `listMaterials`: `GET /api/v1/courses/{course_id}/materials`, materials.yaml 1–28. `200 MaterialCollectionDocument`,
  no-store, page limit/offset only; 401, restricted 403, hidden 404 `material_not_found`, 406, pagination 422.
  It is **all material visible to the caller**, not an approved-course-wide-only collection or minimal metadata projection.
- `getMaterial`: `GET /api/v1/materials/{id}`, materials.yaml 65–86, is present but unnecessary for this metadata-only
  story. Do not call it, source/file/download endpoints, or generic user detail to compensate for missing collection scope.
- Existing 5.1 `addCourseStudent` is fixture setup evidence only; student production journey never invokes it.

Transport across these operations uses exact `application/vnd.api+json`, cookie session and no-store. Unsafe dispatches
use current readable CSRF cookie only in `X-CSRF-Token`, under existing serialization. Reads never renew idle expiry.
Collections have `meta.has_more`, optional relative navigation links, no total. Current defaults are 25/0, caps 100/10000;
use page 25 and the established link validator once an operation's actual scoped contract is settled. Do not invent filters.

### G1 — Original Learn prerequisite, now unblocked by BCG-020

The evidence below explains the missing backend projections, not a current Learn implementation blocker. The explicit
2026-10-10 exception and mandatory boundary mitigation at the top of this spec supersede the original no-workaround
disposition. The missing real learner projections remain an open non-blocking backend follow-up.

There is no OpenAPI joined-active-only list or learner representation selector. `listCourses` returns visible union:
backend `internal/course/course.go:384–403` includes supervised courses and active joined courses, or all for administrators.
Capabilities' joined scope includes inactive memberships (`course.go:121–122`). Reading each scope ID is not a clean
active-only discovery workaround: hidden/inactive results would require denial filtering, and same-course staff/member
union reads return preparation fields. `handler.go:690–700` minimizes fields only for student-only viewers.

`listMaterials` has no scope/approval/representation parameter. Backend `internal/material/material.go:130–166` returns
assigned-supervisor material OR own private material OR ready approved joined-course material. `handler.go:349–359`
returns full Material fields, including brief, not a dedicated learner metadata representation. Fresh student-only
fixtures with no private material make a happy path look scoped but do not establish the real API contract.

SECURITY-PRIVACY Least-Data Fetching expressly forbids post-response filtering. A local `scope === course-wide && approved`
filter, guessed query, generic list renamed Joined courses, role inference, member-by-member denial probing, or client
metadata stripping is not a safe resolution. The approved generic-list/scope-label interim precedent cannot make this
specific joined-active/approved-only surface truthful. Hardcoded limits and approval-observation ledger do not solve it.

RFC drafted under the authorized interim pattern: `mia/tmp/5-2-student-learn-projection-rfc.md`. It requests server-owned
joined-active collection and Learn course/approved material projections (or equivalent documented existing operations),
with actual selectors/paths/schema/links supplied by backend OpenAPI, not chosen here. No backend implementation.
The draft is ignored and never staged. Its Markdown is applicable backend tmp documentation; no blanket lint exemption.

**Settled transition:** the owner accepted the specific interim transport and network-level exception on 2026-10-10,
including the warning and mandatory immediate boundary discard. The settled Learn map above replaces the original
conditional map; the backend RFC remains open, and no general privacy waiver or broader feature scope follows.

## BCG reconciliation / settled interim decisions

- BCG-001: reuse approved 1.3/1.5/current lifecycle slices; no new authentication transport. Globally open evidence stays open.
- BCG-003: `learning.participate` is the exact existing Learn action; only its own complete course scope is navigation
  guidance. Never union it with supervision/administrator scope. BCG-020 governs the interim learner projection; no new
  capability family or assumed role is introduced. Current unpaginated scope bounds remain a release obligation.
- BCG-011: course readiness transport exists. The bounded read-only learner acceptance-status consumption is now recorded
  in BCG-020 alongside the owner exception. No Start action/BCG-002 expansion or global BCG-011 closure; 503 remains
  unavailable truth, not accepting.
- BCG-005/007: current API success contracts carry no-store; existing exact collapsed escaped error disclosure is reused.
  Neutral body safety is a backend obligation; client redaction/synthesis is forbidden. Proxy/cache/release work stays open.
- BCG-002/012 (active tutoring/work), 004 (summary), 008/010 (account/support), material mutations and BCG-014 are excluded.
- Preparation created no new BCG number. This Learn dispatch records BCG-020 as the non-blocking exception/follow-up,
  without altering the Release Blockers total. RFC is a request, not a replacement transport contract.

## Historical conditional route/infrastructure map — superseded by settled Learn map

Add only `/learn/courses` (parent Home), `/learn/courses/:courseId` (parent joined courses), and
`/learn/courses/:courseId/materials` (parent course). Canonical title/H1 purposes and fallbacks stay in ROUTE-INVENTORY.
Opaque branded IDs only; no names/query/hash/history-state content, prefetch, hover fetch or speculative child mounts.
Do not register the material download or session/private child routes. Reserve future `new`/action segments.

Extend the existing minimized `AccountCapabilities` with `learningParticipation` and `joinedCourseIds`; propagate and
compare both in session access so removal fences/clears the old scope just like existing supervision scope. Shell Learn
group links only to the implemented joined-course destination when current capability/scope permits it. Basic empty
Home remains admitted by successful complete capability discovery, never by membership inference.

Use a dedicated lazy `LearnCourseRoute` host and learner view models in `features/courses`. Reuse
`useCourseResourceAdmission`, `CourseAdmissionSurface`, `readAuthenticated`, route/activity/recovery/announcement owners;
generalize only the frame's title/heading descriptor type if needed, not its authorization or staff resource union.
Exact order: stage → capabilities/matching learning scope → addressed learner course → dependent approved metadata
collection → feature/shell/title. List admission uses the backend-scoped joined collection, not arbitrary course scans.
No learner data mixes with normalized staff `Course`/`Material` objects or is retained in generic auth state.

Hidden/ineligible/removed/unknown addressed resources clear before one localized neutral result; never name the cached
course. Apply the same copy/H1/focus/title/actions/announcement/wait treatment within current capability context, with
freshly authorized parent/Home exit. Missing scope sends zero dependent requests; raw disclosure exists only for actual
backend errors, exact/inert/collapsed per canonical owner exception. Do not fabricate an HTTP body for local denial.
503/protocol/transport failures remain check failure with explicit read recovery, not absence or hidden cause inference.
All lifecycle/late-response/security-loss behavior stays with existing machine 9/24 owners.

## Blueprint, i18n and accessibility map

Exact licensed version `2026-09-13-083323`, all `v4/react-light.jsx`, read in prepare:

- Joined-course and material metadata collections: `Application UI/Lists/Tables/Simple`. Remove sample people/email/role,
  create/edit controls and nowrap; course name is a canonical detail link, metadata rows have no unimplemented download.
  Separate course/metadata labels, h2 under host h1, `bdi` authored text, wrapping cells and labelled bounded overflow.
- Learner course detail: `Application UI/Data Display/Description Lists/Left-aligned`. Name, persisted Active and
  server acceptance status only; no supervisor identity, preparation instructions, attachment/download samples or Start.
- Empty state: `Application UI/Feedback/Empty States/Simple`, reuse `CourseEmpty`; no create-course action for students.
- Pagination: `Application UI/Navigation/Pagination/Simple card footer`, reuse `CoursePagination` with validated actual
  scoped links; no fictional total/range. Do not fetch all pages or equate a page's emptiness with total absence.
- Reuse shell Simple sidebar/header With actions, CheckingAccess, neutral recovery/raw-disclosure and button bindings.
  Read their exact source again if changing anatomy; record exact identity/version and MIA deltas in each new component.

Keep seven complete ICU catalogs: de-DE, en-US, es-AR, es-ES, fr-FR, pt-BR, pt-PT. New Learn headings/titles/empty/readiness/
metadata/help/status/failure labels are localized, with no fallback/concatenation. Authored names are escaped untranslated
isolated text. No external material URL interaction/preview in this slice. Locale/text-size changes preserve route/focus.

One main/h1, title-before-focus, direct parent, current navigation, bypass, keyboard-only actions, >=24px targets and
unobscured focus. Pagination focuses collection heading/status, not page h1. Pending/page/error transitions use one
announcer; no repeated render/unchanged-refresh announcement or raw body in live regions. Concise indeterminate loading.
Exercise 320px all text modes, actual 200% browser zoom, spacing/forced-colors/reduced-motion, long translations/mixed
direction and axe stable states. 1280px/400% and supported Chrome/Edge/Safari/AT/password-manager manual evidence remain
explicit release lanes, not automatic Pass. No new CSS/animation/color/runtime dependency.

## Historical proposed implementation manifest — superseded by settled Learn manifest

This is the retained blocked Learn-slice map, superseded for the current dispatch by the handoff manifest above.

Existing files, bounded changes only:

- `src/platform/api/entry.ts`, `src/platform/api/entry.test.ts`: minimize/expose learning scope and parser regression.
- `src/platform/session/sessionController.ts`, `src/platform/session/sessionController.test.ts`: propagate/compare/purge
  joined scope; no replacement/login changes except independently reproduced integration defect approved by solver.
- `src/app/routes/entryRoutes.tsx`: three typed Learn descriptors, trusted builders/parser/access fields.
- `src/app/App.tsx`: lazy learner host and existing ordered admission/recovery dispatch.
- `src/app/ApplicationShell.tsx`, `src/app/ApplicationShell.test.tsx`: admitted Learn group/current destination only.
- `src/app/routes/AdminCourseRoute.tsx`: optional narrow admission-frame descriptor typing for reuse; staff behavior unchanged.
- `src/platform/i18n/messages.ts` and `src/platform/i18n/catalogs/{de-DE,en-US,es-AR,es-ES,fr-FR,pt-BR,pt-PT}.json`.
- `e2e/scaffold.spec.ts`: one bounded `student first-sign-in handoff` describe, reusing its local 1.3/1.5/3.2 helpers.
- `e2e/studentFixtures.ts`: only minimal handoff hook needed to connect actual 5.1 provisioning truth to recipient fake;
  historical defaults preserved; no generic fake engine or secret-bearing response extension.
- `e2e/routeSecretHygiene.ts`, `scripts/route-secret-hygiene-cases.ts`, `scripts/check-route-secret-hygiene.mjs`,
  `playwright.route-secret-hygiene.config.ts`: actual-case inventory/checkpoints and bounded `student-entry` scope.
  Inspect registered cases/config exclusions first; do not silently convert missing probes into passes.
- `_bmad-output/implementation-artifacts/spec-5-2-student-first-sign-in-and-joined-course-entry.md`: progress/evidence notes.

New files:

- `src/platform/api/learnCourses.ts`: `listJoinedActiveCourses`, `getLearnCourse`, `listApprovedCourseMaterialMetadata`;
  exact transport remains unimplemented/unpinned until G1. Separate minimal parsers/view models, wrong-identity/page checks.
- `src/platform/api/learnCourses.test.ts`: protocol/identity/scoped link/minimal projection tests, synthetic boolean assertions.
- `src/app/routes/LearnCourseRoute.tsx`: route-owned ordered loaders, safe results and canonical link props.
- `src/app/routes/learnCourseEntry.test.tsx`: capability/route/data order and no-fetch/loss/stale regressions.
- `src/features/courses/LearnCourseRouteProps.ts`: closed admitted list/detail/materials resource union and trusted links.
- `src/features/courses/JoinedCourseListRoute.tsx`, `LearnCourseDetailRoute.tsx`, `LearnCourseMaterialListRoute.tsx`:
  three bounded read-only surfaces, reuse same-feature collection presentation/logic where valid.
- `e2e/studentEntryFixtures.ts`: only joined protocol fake/persistence controls for these actual cases, using existing
  fixture/hygiene envelope; no generated fixture bytes committed.

Conditional only if backend OpenAPI changes: `src/platform/api/generated.ts` regenerated through existing command and
type comparison; this is not permission to invent generated paths. Any additional auth/harness/source file needs
evidence-backed solver manifest amendment before editing. Solver alone owns tracker/checkpoint writes/approved hunks.
RFC/report/evidence are operational, never part of a commit manifest. No package/lock/config/gate change planned.

## Implementation blocks and focused test plan after readiness

### B1 — Learn admission and contract adapters

Implement only settled learner transport/parsers, scope propagation, canonical lazy route host and read-only surfaces.
Test legitimate student response with empty supervisor array, complete learner scope, empty joined list, active accepting
and active not accepting, inactive/removed resource safe result, wrong identity, failures and rejected scoped pagination
links. Mixed-role fixture must prove no extra supervision/administrator courses or broad material representation is
requested. Hold stage/capability/course/material steps independently; assert neutral DOM/title and zero later requests.
Complete this block's symbols/tests/progress in spec; do not attempt B1 while G1 is unresolved.

### B2 — Connected first-sign-in integration, no auth reimplementation

The current H2 implements only provisioning → restricted replacement → authorized Home → later password-only sign-in.
All Learn/dependent course/material portions below are retained future requirements, blocked on G1.

Use isolated supervisor/student contexts and real 5.1 provisioning UI/one successful POST in the main joined case;
communicate credentials only via synthetic out-of-band fixture, never a UI response/card/copy. Recipient login eligibility
must depend on persisted provisioning and exact credentials, not unconditional fake success. Same student relationship
ID persists across temporary login → replacement → capabilities → joined-course entry → reload/later sign-in.
Reuse 1.3/1.5 scaffold `mockSession`, replacement/paste/keyboard/zoom helpers, 3.2 gate/chunk counters, and
`studentBackend`/`fillStudent`/`routeSecretFixture` where applicable. No unrelated fixture extraction/refactoring.

Prove restricted stage has no shell/metadata/MFA-enrollment/dependent requests, fresh CSRF after transition, one
replacement, passwords unmounted on success and no secret in URL/history/storage/cache/title/log. Hold capabilities,
then course/data response, and prove no early mount/protected chunk fetch. Enter Learn deliberately from current shell;
Home never claims no active tutoring work. Reload/later chosen-password login discovers same backend membership with
zero provisioning/replacement replay. Static inspection showed no auth defect, so tests are the default auth change.

Additional bounded cases: denied/failed capabilities; delayed response after hide/security/scope change; removal after
formerly visible course; same fixed unavailable treatment for hidden causes; approved material empty/link/file-backed;
explicit paginated read only; readiness failure blocks only dependent truth; committed-but-lost replacement remains
existing Rotating/reconciliation with one dispatch, never repeated login/replacement/provisioning on return/history.
Inherited 1.4/1.5 suites own deeper MFA/validation matrices; no new MFA enrollment case/feature is needed.

### B3 — Accessibility, actual-case secret hygiene and evidence

Main handoff at direct 320px in all three text modes; seven-locale/text-mode smoke and actual 200% zoom using existing
helpers. Keyboard/title/H1/parent/current-nav, representative axe, spacing, forced colors, reduced motion and mixed text.
No blanket scanner suppression or claims of complete manual/release conformance.

Inventory every actual new case exactly once, with checkpoints while supervisor temporary password, recipient login
password, replacement+confirmation, protected Learn course/material text, revealed raw error and final teardown are live.
All fixture markers come from the established per-run hygiene envelope; couple both contexts to scanned markers or
checkpoint the actual owner. Disable trace/video/screenshot/HAR/auto aria error context; assertions/logs contain only
booleans/counters/fingerprints. Close every owned context and drop references in finally, including deliberate failures.
Deliberately fail the actual test at each registered point; scan full original stdout/stderr/artifacts before
summarization/deletion, require exact checkpoint/failure identity and rejected early canary. Missing/skipped probe is not Pass.
Extend the existing checker, not a parallel diagnostic runner. Historical 3.2 evidence informs reuse, not this story's result.

Sequential implement checks: typecheck, lint/architecture, format check; focused Vitest on entry/session/learner route/API;
one targeted build then `npx playwright test e2e/scaffold.spec.ts --grep 'student first-sign-in handoff'`; affected inherited
`required password replacement`/sign-in and shell tests; targeted `MIA_ROUTE_HYGIENE_SCOPE=student-entry` existing checker.
Never overlap tests/builds or kill unknown preview servers. Final verify is separate: inspect final diff, run
`./run-all-tests.sh` once and record baseline/input fingerprint (including new source/tests/scripts/config/deps/OpenAPI),
commands/results/pass/fail/skip/content-free logs. Any executable input change invalidates final evidence.

After implement/fix, write actual tracked-plus-new story-only `story.diff` without staging, excluding baseline bookkeeping;
`manifest.json`, input fingerprints and content-free logs under this story's `tmp/agent-execution` directory.
Independent review/verify/authorized commit are solver-dispatched later phases; never declare done from prepare.

## Execution progress and historical preparation

- V1 complete (2026-10-10): persisted the supplied independent slice-only pass review in `review-report.json`.
  Accepted R1 is repaired in test code only: connected zoom spacing now applies after actual login navigation,
  restricted replacement mount and Home mount. Computed line/letter/word/paragraph spacing is asserted after credential
  entry, password reveal and Home checks in every text mode. No production, checkpoint, tracker or baseline edits.
  Focused affected Chromium suites precede one final full gate; final evidence remains pending until that gate finishes.
- V1 targeted regression: full scaffold/provisioning Chromium run completed with 97 passed / one zoom assertion failed.
  The new computed-style assertion exposed reveal-control remount dropping inline styles, not a production defect.
  The connected zoom case now installs a document-local user-spacing stylesheet after navigation, covering remounted
  controls while retaining per-surface application and post-interaction computed assertions. R1 repair only; gate not run yet.
- V1 stylesheet adjustment: the second affected run again passed 97 cases; inline stylesheet injection was correctly
  rejected by the unchanged CSP. The fixture now serves its fixed CSS at one mocked same-origin URL and loads it as a
  stylesheet link (Playwright 1.63 documentation checked), without CSP bypass or production/config changes.
- V2 complete: corrected connected zoom case passes in all text modes (`logs/verify-r1-zoom.log`), then both complete
  affected Chromium suites pass 98/98 on the final test state (`logs/verify-affected-chromium-passed.log`). No builds
  were run for these test-only checks; they used the existing implementation build. One authoritative gate follows,
  with its own single build, pre/post input fingerprint and separate gate log. No overlapping checks.
- V3 complete: one `./run-all-tests.sh` invocation finished with exit 0; all gate components ran, none skipped.
  841 unit tests in 41 files and 285 bundled-Chromium tests pass; the gate built once and measured 244881 initial-JS
  gzip bytes against 256000. All hygiene passed (158 route cases / 334 checkpoints, including 6 student-entry cases /
  28 points; course-unit hygiene 136 cases / 198 points; early-failure canaries rejected). Zero duplication clones.
  Baseline `1d6354f70ac96fb4569cb47f20c14fe528e26685`; 267 input hashes, including backend OpenAPI, captured before/after.
  Evidence: `verify-report.json`, `verify-inputs-before.json`, `verify-inputs-after.json`, `logs/verify-full-gate.log`.
  Existing findings remain explicit: npm audit reports four low dependency findings; Trivy reports one low transitive
  KaTeX vulnerability and a SendGrid-shaped false positive in bundled public ISO country codes (exact 249-code sequence
  corroborated), not a credential. Inherited >500kB chunk warning remains. No dependency/gate/config suppression or repair.
  Actual worker `openai/gpt-6.1-sol`; runtime variant not exposed. Reporting-only spec updates do not invalidate evidence.
  Partial slice verified/uncommitted; solver may separately dispatch an authorized slice commit. Whole story remains
  in-progress and G1-blocked for Learn; real backend/manual supported-browser/AT/password-manager lanes are not passed.
- H1 complete (2026-10-10): solver's partial-scope decision applied above. Auth/Home slice has no unresolved decision;
  Learn AC3/4 and associated reads/routes remain blocked on G1. Baseline `1d6354f70ac96fb4569cb47f20c14fe528e26685`,
  unchanged index; no production overlap found. All earlier preparation evidence below remains historical.
- H2 complete: six actual connected Chromium cases reuse 5.1 `studentBackend`/`fillStudent`, existing sign-in/replacement,
  paste/zoom helpers, minimized complete capability fixture and 3.2 held-admission pattern. Provisioning persistence and
  exact request bytes gate login; replacement requires the rotated CSRF. Restricted stage requests no capabilities,
  dependent resources or MFA and loads no Home chunk. Held/failed/lifecycle-fenced capability admission stays neutral.
  All three 320px text modes reach Home, Reload without replay, reject obsolete temporary credentials and later accept
  the replaced password; actual 200% zoom covers all text modes. One representative Home axe scan passes.
  No production defect or relocation fallout was demonstrated, so production code is unchanged. Two initial test runs
  corrected only harness assumptions: existing sign-in rejection uses its local alert, and rejected input is retained,
  so a later paste must first clear that input. Final handoff run: 6/6 pass, `logs/student-handoff-passed.log`.
- H3 complete: final typecheck, typecheck-coverage canaries, lint/architecture, formatting and seven-catalog i18n pass;
  377 focused unit tests in seven files pass. Chromium: six new handoff cases, 19 inherited 1.3/1.5/3.2 cases and three
  focused 5.1 regressions pass (28 ordinary cases). Inherited locale/reflow runs cover all seven languages and text modes;
  new connected handoff reflow covers the three text modes in English. No new translated UI was added.
  Final actual-case hygiene passes all six cases / 28 live-secret or completion points, with the extra early-failure
  canary rejected, original stdout/stderr/artifacts scanned and no marker leak. Both contexts close in finally.
  Duplication's unchanged source scope passes balanced markers and zero clones (122 files); Trivy secret-only scan reports
  no findings. Build passes with inherited >500kB lazy-chunk warning; initial JavaScript is 244881 gzip bytes against
  unchanged 256000. Initial formatting failure was fixed only in the story test; final checks pass.
- Historical implementation disposition: **implemented partial slice, not yet verified/done at that phase**. No production or Learn changes, no
  source/config/dependency mitigation, no staging/commit/tracker/checkpoint writes. Known baseline bookkeeping is
  preserved; the solver's prepare-to-implement 5.2 checkpoint amendment predates this dispatch. Backend dirt is unchanged.
  No provider 429, install or tooling skip occurred. Markdown lint is exempt for this spec; scoped planning/diff/manifest
  consistency is checked. Full gate and manual release lanes are skipped/deferred, not passed.
- Historical implementation next action: independent review of the scoped `story.diff` and `implement-report.json`, then separately dispatch
  final verification for this partial slice. Whole-story completion remains blocked on G1; retain the RFC and future
  Learn requirements above. G1 notification already delivered in prepare; no new owner action or duplicate alert.
- Final implement evidence: `tmp/agent-execution/5-2-student-first-sign-in-and-joined-course-entry/` contains
  `implement-report.json`, `manifest.json`, complete story-only `story.diff` (including this new spec), and content-free
  `logs/` including `student-handoff-final-state.log`, `student-entry-hygiene-final.json/.log`, `focused-unit.log`,
  `inherited-auth-chromium.log`, `provisioning-regressions.log`, static/format/i18n/build/bundle/duplication/secret results.
  Source/test/config/dependency content fingerprint is implementation evidence only, not an authoritative-gate claim.

- P1 complete: checkpoint/AGENTS/all scoped rules/protocol read; baseline/index/worktree and backend dirt inspected/captured.
- P2 complete: story/binding companions, current auth/shell/features/fixtures and exact OpenAPI operations inspected.
  Auth reuse is viable; no Learn implementation exists. G1 is demonstrated by declared parameters and actual union reads.
- P3 complete: installed tooling/Chromium/licensed sources and runtime model catalog checked once; no install needed.
- P4 complete: bounded conditional manifest/acceptance/test plan and ignored backend RFC drafted. No production/test edits.
- Pushover: required `interaction needed:` notification sent successfully (exit 0), covering solver reconciliation of the
  scoped Learn transport prerequisite. Do not duplicate that pending alert.
- Open decision: G1 safe collection/projection transport or explicit story-scope revision; exact future selectors/schema
  cannot be settled by client assumptions. No ready claim. Solver next action: resolve RFC, record bounded BCG-003/011
  learner-read reconciliation, then request this spec's affected operation-map amendment before dispatching implement.
- Preparation-only consistency checks/report parsing are applicable. Spec lives in Markdown-exempt `_bmad-output`;
  app tests/build/full gate intentionally not run. Manual release evidence remains not run, not passed.
- P5 complete: report JSON parsed; proposed existing/new manifest paths and actual seven locale files checked; all
  baseline file hashes, HEAD and empty index preserved. RFC lint passed with `markdownlint-cli@0.49.1 --fix` after the
  initial bare `markdownlint` npm invocation could not resolve an executable. This was command resolution, not a network
  failure. Evidence: `prepare-report.json`, `prepare-baseline.json`, `logs/prepare-checks.json` under the story tmp directory.
