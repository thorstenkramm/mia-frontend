# Story 6.1 — Start or resume the student's tutoring session

Phase: prepare. Status: **ready** (bounded slices only; see BCG reconciliation). Baseline:
`94174e27ad0d6682f09591d5eee127895800f3e1` (frontend), backend checkout `63c9992` (`minor doc and process changes`).
Actual prepare worker: `kimi-code/k3` (Kimi K3), the approved batch fallback after the OpenAI usage limit; runtime
variant not exposed by this session. Story authority: `epics.md` Story 6.1; read-first checkpoint:
`execution/6-1-start-or-resume-the-students-tutoring-session.yaml` (batch rules preserved; no checkpoint/tracker
edits, staging or commit in this phase).

## Binding references

Companions below are relative to `../planning-artifacts/ux-designs/ux-mia-frontend-2026-09-12/`:

- `FRONTEND-PRD-FOUNDATION.md` FFR-601/602 entry subset, FFR-603 (no abandon/discard control), FFR-610..613
  (entry subset: no dynamic answer buttons; fixed FFR-613 workspace copy; free text/starters themselves are 6.2).
- `EXPERIENCE.md` Flow 1 steps 1–3 and failure path; Information Architecture; Shared-Device Sessions.
- `ROUTE-INVENTORY.md` Session Start (Course Choice, Optional Material Choice), Tutoring Workspace (Transcript
  gate), Session Recovery (`/learn/session`). Static Starters and Free-Form Intent routes are **not** registered
  by this story (6.2).
- `SURFACE-STATE-MATRIX.md` Session start and Tutoring workspace rows; Session recovery states `checking; found;
  none; sign-in expired; unavailable`.
- `FRONTEND-STATE-MACHINES.md` machines 1 (bootstrap/gates), 2 (request-ID lifecycle — the start mutation owner),
  9 (route/visibility/pageshow), 12 (readiness/new-session eligibility states: checking; not eligible; eligible),
  23 (last-checked), 24 (lifecycle), 28 (announcements), 29 (raw error), 31 (browser-owned privacy). Machines
  3–8 (SSE, composer, queue, stop, finish) are 6.2/6.3 and later; machine 12's Start action joins its approved
  slices here.
- `SECURITY-PRIVACY-ACCEPTANCE.md` CSRF Rotation and Unsafe Requests, Ambiguous Mutation Reconciliation (session
  creation is a named request-ID operation), Session Expiry, Existence Hiding, Least-Data Fetching, Raw Error,
  Shared-Device Teardown.
- `ACCESSIBILITY-ACCEPTANCE.md` CP-05 (partial: CHK/EMP/SUC/VAL/ERR/UNK/AUT/EXT for start, recovery and workspace
  entry only; no streaming AC-013 claim), applicable AC-001..005/008..012/016/019.
- `DESIGN.md` blueprint gate (exact licensed blueprint per component, version `2026-09-13-083323`).
- `BACKEND-CONTRACT-GAPS.md` BCG-001 (existing slices), BCG-002, BCG-003, BCG-005/007, BCG-011, BCG-012.

Backend authorities (read-only corroboration): `mia/api-doc/paths/tutoring.yaml`,
`mia/api-doc/schemas/{requests,resources}/*.yaml`, `mia/docs/product-requirements.md` §Tutoring sessions
(§Starting a session: request-ID replay while active, one active session across courses, no inactivity expiry,
resumption after logout/closure/interruption/device change, one non-refreshing cross-course discovery read with
explicit-null none result).

## Verified operations (current transport, backend `63c9992`)

All present in `mia/api-doc/openapi.yaml`, generated types (`src/platform/api/generated.ts`), and backend
`internal/tutoring`:

- `createTutoringSession`: `POST /api/v1/courses/{course_id}/tutoring-sessions`, cookie + `X-CSRF-Token`.
  Request `TutoringSessionCreateRequestDocument`: `data.type: "tutoring-sessions"`, `attributes.client_request_id`
  (canonical lowercase UUID v4), optional `relationships.materials.data[]` of `{type: "materials", id}`
  (uniqueItems). No intent/message content exists in the contract. Success: `201` new active session or `200`
  identical-request replay of the existing active session, both `TutoringSessionDocument`. Errors: `400`, `401`,
  `403`, `404 tutoring_not_found` (course or selected material missing/hidden), `406`, `409`
  (`tutoring_active_session` | `tutoring_request_conflict` | `tutoring_invalid_state`), `413`, `415`,
  `422 tutoring_invalid` (invalid request ID or selection). No `429`/`500` declared; those and transport loss are
  outcome unknown. Backend corroboration: `internal/tutoring/service.go` request-ID + digest replay,
  `tutoring_sessions_one_active_student_idx`; tests `TestConcurrentStartsKeepOneActiveSession`,
  `TestRetryRequestIDIsPayloadBoundAndReplaySurvivesCompletion`.
- `getCurrentActiveTutoringSession`: `GET /api/v1/users/me/active-tutoring-session`, cookie, non-refreshing,
  no-store. `200 ActiveTutoringSessionDocument`: `data` null (explicit none) or minimal projection
  (`id`, `course_id`, `course_name`, `state: "active"`, `started_at`, `last_activity_at`). `401`
  `auth_unauthenticated`, `403 tutoring_unauthorized`, `406`, `500 internal_error`. Backend: discovery handler and
  `TestDiscoverActiveSessionLifecycleAndScope`, `TestConcurrentCompletionAndDiscoveryReturnCommittedState`,
  `TestConcurrentDeletionAndDiscoveryHideRemovedSession`,
  `TestActiveSessionDiscoveryDependencyFailureReturnsInternalError`.
- `getTutoringSession`: `GET /api/v1/tutoring-sessions/{id}`, cookie, no-store. `200 TutoringSessionDocument`;
  `401/403/404` existence-hidden, `406`. 6.1 parses only `id`, `attributes.course_id`, `state`, `started_at`,
  `last_activity_at`; summary/follow-up/lifecycle fields are stripped at the boundary (later stories own them).
- `listTutoringSessionMessages`: `GET /api/v1/tutoring-sessions/{id}/messages?page[limit]&page[offset]`, cookie,
  no-store. `200 TutoringTurnCollectionDocument` (`meta.has_more`, optional `links.prev/next`); `401/403/404`,
  `406`, `422 tutoring_invalid` pagination. Turn = paired student message + response attempt; 6.1 renders persisted
  content as escaped plain text only.
- `getCourse` (existing 5.2 learner read): `readiness.new_session` is `CourseNewSessionEligibility`
  (`eligible`, student-safe `blockers` enum: `learning_goals | ai_tutor_instructions | language |
  supervisor_presence | qualifying_material | course_inactive | course_not_ready | course_membership_required |
  active_tutoring_session`, `consequences: [start_tutoring_session]`). Backend returns only generic blockers to
  non-supervisors (`internal/course/readiness.go`). This is the BCG-011 student-start slice transport.
- `listMaterials` learner metadata projection (5.2, BCG-020): unchanged; selection offers only the rows that
  surface already exposes (approved, ready, course-wide). Backend enforces selection rules (approved course-wide;
  link material needs a brief; private material must be own+same course). Private-material selection is excluded
  (no private material can exist yet; creation is a later story).
- `getTutoringSessionCurrentWork` exists in transport but is **not consumed** by 6.1 (BCG-012 consumers are 6.2+).

Transport rules: exact `application/vnd.api+json`, `credentials: "same-origin"`, `cache: "no-store"`, fresh
readable CSRF cookie in `X-CSRF-Token` read by the existing mutation owner immediately before the single dispatch.
Reads are non-refreshing and never act as keepalive.

## BCG reconciliation (recorded decisions; no RFC needed)

- **BCG-002 — slice delivered, no workaround.** The gap's "current docs/OpenAPI mismatch" no longer describes
  current transport: `GET /api/v1/users/me/active-tutoring-session` with `ActiveTutoringSessionDocument` is the one
  authoritative cross-course discovery operation, atomic against the one-active-session invariant, returning
  session identity + course ID/name or explicit null, existence-safe, no-store, and documented as the
  reconciliation path after ambiguous creation and `tutoring_active_session`. Backend concurrency/hiding tests
  exist (above). **Implementation records a dated Story 6.1 slice reconciliation in BCG-002** (frontend consumes
  discovery for `/learn/session` recovery, `/learn/start` pre-check, and post-conflict/ambiguous reconciliation).
  BCG-002 is **not** globally closed: broader release evidence remains open. No `mia/tmp` RFC — the interim
  workaround pattern is unnecessary because the needed slice exists in current transport.
- **BCG-011 — student-start slice delivered.** `CourseReadiness.new_session` supplies server-authored new-session
  eligibility separately from activation eligibility, viewer-safe blockers, recomputed atomically. **Implementation
  records a dated Story 6.1 student-start slice note** in BCG-011 alongside the 4.2/4.5 slices. Not globally
  closed; deactivation/relationship, concurrency and manual/release obligations remain.
- **BCG-012 — not consumed here.** Composer/queue/stop/retry/finish eligibility stay blocked for 6.2/6.3/6.4;
  6.1 renders no work-dependent control.
- **BCG-001/003/005/007:** existing approved slices reused unchanged (ordered gate, capability scope, no-store,
  collapsed raw disclosure). No new BCG number.

## Acceptance

1. `/learn/start` first runs one authoritative active-session discovery. Found → resume presentation naming the
   escaped course name with one explicit Continue action into `/learn/sessions/:sessionId`; no start affordance.
   None → course choice of joined active courses with server-authored `new_session` eligibility per course.
   Discovery failure/unavailable → neutral unavailable state with explicit Refresh only; start is never offered
   before authoritative discovery returns none (BCG-002 forbidden-workaround rule).
2. Course choice: eligible courses link to `/learn/start/:courseId/material`; ineligible courses show truthful
   fixed not-accepting copy (student-safe blockers only; `active_tutoring_session` presented as "you already have
   an active session" with a link to `/learn/session`). No eligibility is computed locally beyond the server's
   field; no material rows are counted.
3. Material choice re-admits the course (ordered gate) and lists the 5.2 approved-material metadata with an
   optional single selection (see D1/D6). The explicit Start action binds one `crypto.randomUUID()` canonical
   lowercase UUID v4 to the immutable payload (course + sorted material set) immediately before first dispatch,
   held in page memory only, never persisted (machine 2). Start sends no intent/message content and never
   implicitly sends a message.
4. `201` or `200` → navigate to `/learn/sessions/:id` (the returned identity; 200 replay is the same session).
   `409 tutoring_active_session` → one discovery read, then resume; never a second session.
   `409 tutoring_invalid_state` → attempt retired, course re-read on explicit Refresh, not-accepting truth.
   `409 tutoring_request_conflict` → locked conflict: discard attempt, reconcile via discovery.
   `404 tutoring_not_found` → fixed hidden presentation. `422 tutoring_invalid` → definitive rejection; any later
   submit uses a new ID. `401`/scope loss → existing teardown. Undeclared `5xx`/transport/timeout/malformed →
   outcome unknown: no replay, no fabrication; reconcile via discovery; only an explicit `Retry exact attempt`
   (same ID/payload) after fresh session/capability/course/discovery checks, or `Abandon unknown attempt` after
   inconclusive reconciliation. Stop waiting after dispatch enters outcome unknown without claiming cancellation.
5. `/learn/session` recovery: discovery read; found → replace with workspace path; none → fixed none state with
   Start (`/learn/start`) and Home exits; failure → neutral unavailable + explicit Refresh; `401` → sign-in
   recovery. No retained session identity is ever required or fabricated.
6. Workspace `/learn/sessions/:sessionId`: ordered gate (stage → capability/scope → session read). Active owned
   session renders: persistent fixed FFR-613 notice (MIA is AI-powered; no person watches live; assigned supervisor
   can read after finishing — informational, never a warning against speaking freely, localized in all seven
   catalogs, not operator-configured) and the persisted transcript as escaped plain text (bounded first page +
   existing pagination; neutral per-response state labels for non-completed responses; no streaming, no composer,
   no finish/stop/retry). Non-active addressed session → fixed finished notice + `/learn/courses` exit (D4);
   unknown/foreign → fixed hidden presentation.
7. Shell/Home: the Learn group gains "Start a tutoring session" (`/learn/start`) and "Resume tutoring"
   (`/learn/session`) links when `learning.participate` is available. No Home probing or auto-routing (D2).
8. No unsafe request is ever replayed automatically; request-ID idempotency creates no exception. No protected
   content, request ID, or session identity enters browser storage, URL text beyond opaque IDs, or logs.
9. Seven locales, three text modes, 320px, 200% zoom, keyboard/focus/announcement evidence for every new surface;
   CP-05 partial evidence only, no release Pass claim.

## Bounded decisions (settled for this dispatch; reviewer may challenge)

- **D1 Start placement:** the Start action lives at the end of the material-choice route. The ROUTE-INVENTORY
  intent/starter routes are unregistered in 6.1; 6.2 owns them and the composer. The created session enters the
  workspace with an empty-or-persisted transcript; first send is deliberate (Flow 1).
- **D2 Home:** only neutral shell links; Flow 1 step 3's "Home routes him" is satisfied by the reachable
  `/learn/session` recovery route, not by Home reads or redirects.
- **D3 Workspace identity:** fixed title `Tutoring session`; no course-name read in the workspace (avoids an
  extra dependent fetch; course context is visible on the resume presentation and start flow).
- **D4 Completed addressed session:** fixed finished notice without transcript; completed-session review is the
  later history story.
- **D5 Material offer:** exactly the 5.2 metadata rows (approved/ready/course-wide, any format incl. link);
  selection validity stays server-enforced (`404 tutoring_not_found`/`422 tutoring_invalid` hidden/definitive).
- **D6 Selection cardinality:** ROUTE-INVENTORY prose says "select one authorized ready material" while the PRD
  ("one or more primary materials") and schema (array) allow more. Bounded choice: **one optional selection**
  (radio group with an explicit default "No material" option), matching ROUTE-INVENTORY; expanding to
  multi-select is a later product decision, not invented here.
- **D7 200-vs-201:** both are definitive success; the UI navigates identically and does not surface the
  distinction (a 200 replay is the student's own same session).

## File/symbol map (explicit manifest)

Existing files, bounded changes only:

- `src/platform/api/learnCourses.ts` (+ `learnCourses.test.ts`): extend the learner course parser with
  `readiness.new_session` (`eligible`, student-safe blocker enum) on `LearnCourse`; strip everything else; protocol
  checks unchanged. BCG-020 mitigation untouched.
- `src/app/routes/entryRoutes.tsx`: add `learnStartPaths` (`/learn/start`, `/learn/start/:courseId/material`),
  `learnSessionPaths` (`/learn/session`, `/learn/sessions/:sessionId`), typed builders, route descriptors under
  gates `Learn(start session)` / `Learn(tutoring session)`, and `authenticatedRoute` parsing. Opaque branded IDs
  only (`CourseId`, new `TutoringSessionId`); no names/query/hash content.
- `src/app/App.tsx`: mount the new lazy host(s) in the existing ordered admission dispatch.
- `src/app/ApplicationShell.tsx` (+ `ApplicationShell.test.tsx`): two Learn links above, only when admitted.
- `src/platform/i18n/messages.ts` + `src/platform/i18n/catalogs/{de-DE,en-US,es-AR,es-ES,fr-FR,pt-BR,pt-PT}.json`:
  complete localized start/recovery/workspace/FFR-613 copy; no fallback or concatenation.
- `e2e/routeSecretHygiene.ts`, `scripts/route-secret-hygiene-cases.ts`: register the actual new hygiene cases
  (extend existing inventory; no parallel runner).
- Planning docs (implementation-time edits, same change): `BACKEND-CONTRACT-GAPS.md` dated BCG-002 + BCG-011 slice
  notes; `FRONTEND-STATE-MACHINES.md` machine 2 and 12 slice notes (machine 2's "Cross-course session recovery
  remains BLOCKED" line gets the dated slice); `SURFACE-STATE-MATRIX.md` session-start/recovery rows;
  `ACCESSIBILITY-ACCEPTANCE.md` CP-05 partial evidence notes (rows stay Blocked/Not run overall).

New files:

- `src/platform/api/tutoringSessions.ts` (+ `.test.ts`): `TutoringSessionId` brand; `getActiveTutoringSession`,
  `createTutoringSession` (accepts exactly 200/201, parses `TutoringSessionDocument` minimally),
  `getTutoringSession` (minimal learner projection), `listSessionTurns` (bounded page + existing
  `collectionNavigation` link validator), `isHiddenTutoringFailure` (403/404/429-style hidden set per surface).
  Zod strips all unused fields at the boundary; only rendered fields + opaque identities leave it.
- `src/app/routes/LearnSessionRoute.tsx` (+ `learnSessionEntry.test.tsx`): lazy host for the four routes reusing
  `useCourseResourceAdmission`, `CourseAdmissionSurface`, `CheckingAccess`, and the session owner's ordered reads.
- `src/features/tutoring/TutoringRouteProps.ts`: closed admitted resource union (start-choice | material-choice |
  recovery | workspace) and trusted link builders.
- `src/features/tutoring/SessionStartCourseChoiceRoute.tsx`, `SessionStartMaterialRoute.tsx`,
  `SessionRecoveryRoute.tsx`, `TutoringWorkspaceRoute.tsx`.
- `src/features/tutoring/useTutoringSessionStart.ts`: machine-2 route-local operation owner mirroring
  `useCourseActivation` (useActionState, `runAuthenticatedMutation`, attempt symbols, `useRouteActivity`,
  unsaved-input guard, announcer, explicit reconcile/Retry exact attempt/Abandon).
- `src/features/tutoring/TutoringEntryNotice.tsx`: persistent FFR-613 notice.
- `src/features/tutoring/tutoringSession.test.tsx` (+ focused companions as needed).
- `test/tutoringFixtures.ts`: synthetic protocol documents (discovery null/found, create 200/201/409 variants,
  session, turns page) with per-run protected markers; no fixture secrets.
- `e2e/tutoringFixtures.ts`, `e2e/tutoringSessions.spec.ts`: bounded Playwright cases on the existing
  route-fake envelope.

No dependency, CSP, theme, bundle-budget (256000 gzip unchanged), or auth-owner changes. `AdminCourseRoute.tsx`
frame is reused unmodified; `generated.ts` already contains every operation (no regeneration needed).

## Blueprints (library `2026-09-13-083323`, all `v4/react-light.jsx`, read in prepare)

- Course choice list: `Application UI/Lists/Stacked Lists/With links`. Deltas: course name as canonical link,
  eligibility status text instead of person metadata, no avatars/images, `<bdi>` authored names.
- Material choice: `Application UI/Forms/Radio Groups/Simple list`. Deltas: fieldset/legend localized, explicit
  default "No material" option, per-option name + kind/format description, opaque radio ids only.
- FFR-613 notice: `Application UI/Feedback/Alerts/With description`. Deltas: informational neutral palette (no
  warning yellow), `InformationCircleIcon`, persistent (no dismiss), fixed product copy.
- Empty/no-active/not-accepting states: reuse existing `CourseEmpty` (`Feedback/Empty States/Simple` binding).
- Checking/unavailable/failure frames: existing `CourseAdmissionSurface`/`CheckingAccess`/raw-disclosure owners.
- Persisted transcript turns: `Application UI/Lists/Stacked Lists/Simple`. Deltas: one labelled `<article>` per
  turn with escaped plain text in paragraphs, neutral response-state label, no links/actions; stable DOM keys by
  turn id (FFR-607 groundwork; rich reconciliation is 6.3).
- Start action: existing `AuthSubmitButton` binding (Simple card button), `24px` targets, visible focus.

## Test plan (local fakes only; never a paid/production provider)

- Unit (`tutoringSessions.test.ts`): parser acceptance/rejection for discovery null/found/malformed, create
  200/201/409 codes, hidden 404/403, turn-page bounds and wrong-identity/duplicate-ID protocol failures; BCG-020-
  style boundary discard proof (forbidden summary/brief markers never leave the boundary).
- Unit route/hook (`learnSessionEntry.test.tsx`, `tutoringSession.test.tsx`): ordered gate (no dependent request
  before capability/scope), discovery-before-start ordering, all machine-2 transitions (no automatic replay after
  5xx/timeout/abort/409/csrf; Retry exact attempt only after fresh checks; Abandon only after inconclusive
  reconcile; Stop waiting semantics), hidden-cause presentation equality (copy/focus/actions/URL/title), resumed
  workspace renders only escaped persisted text, FFR-613 copy present in every locale, no storage writes.
- e2e (`e2e/tutoringSessions.spec.ts`, bundled Chromium): start happy path with/without material; reload mid-flow
  resumes via `/learn/session`; 409 active-session → discovery → resume (no second POST); lost create response →
  outcome unknown → discovery reconcile → resume; later sign-in on "another device" discovers the same session;
  accessibility passes (axe stable states, 320px all text modes, 200% zoom, forced colors, reduced motion, seven
  locales smoke).
- Secret hygiene: registered actual cases prove request IDs/session content never reach URL, title, storage,
  announcements, snapshots, or logs; deliberate-failure canaries per the existing checker.
- Focused checks while iterating (sequential, never overlapping): `npm run typecheck`, `npm run lint`,
  `npm run format:check`, `npm run check:i18n`, focused `npm test -- <files>`, one build + bundle check, focused
  Playwright specs, hygiene scope. Authoritative final `./run-all-tests.sh` is the separate verify phase.

## Exclusions

Composer, free text, static starters and the intent route (6.2); message submission/queue/SSE/streaming/rich
Markdown transcript (6.2/6.3); finish, current-work consumption, retry/stop (BCG-012 stories); history/summary/
speech/used-material surfaces; private-material selection; Home active-session probing; any backend change, RFC,
dependency/config/budget change; global closure of BCG-002/011/012 or CP-05 Pass.

## Risks

- Discovery-unavailable blocking start is deliberate (BCG-002 forbidden-workaround rule), surfaced as neutral
  unavailable with explicit Refresh; reviewers must not read it as a dead end — `/learn/session` remains.
- A 200 replay indistinguishable in UI from 201 is intended (D7); tests pin both.
- Bundle headroom: last verified 246187/256000 gzip bytes; the new routes are lazy chunks; the budget is unchanged
  and enforced in the final gate.
- Backend evidence quoted is inspection, not a new backend test run; frontend fakes prove frontend behavior only.
  Manual supported-browser/AT release lanes remain open.

## Implementation progress (implement phase, 2026-10-10, worker `kimi-code/k3`)

- [x] Block 1: `platform/api/tutoringSessions.ts` (+test), `test/tutoringFixtures.ts`, `learnCourses.ts` `newSession` extension.
      Done 2026-10-10: 13/13 focused vitest pass, `tsc -p tsconfig.app.json --noEmit` clean.
- [x] Block 2: `entryRoutes.tsx`, `App.tsx`, `ApplicationShell.tsx` (+test), messages + seven catalogs.
      Done 2026-10-10: four route descriptors + parsing, lazy host wiring, two shell links, 45+1 tutoring.* keys in
      messages.ts and all seven catalogs (`tutoring.turn` added during Block 3 for the labelled transcript article);
      `npm run check:i18n` passes.
- [x] Block 3: `app/routes/LearnSessionRoute.tsx`, `features/tutoring/*` routes/hook/notice (+tests).
      Done 2026-10-10: host, hook, notice, all four feature routes, shared `useTutoringCollection`/`TutoringExits`;
      fixed a settle()-ordering bug (attempt retired before the 409-conflict discovery read, so resume never ran);
      `learnCourses.ts` null material id is now a protocol error; `collectionDocument` envelope helper.
      18/18 new tests pass (learnSessionEntry 17 + tutoringSession 1); 46/46 neighboring suites pass.
- [x] Block 4: e2e fixtures + `e2e/tutoringSessions.spec.ts`.
- [x] Block 5: hygiene inventory/runner registration (tutoring-unit, tutoring route scope).
- [x] Block 6: dated planning-doc slice notes (BCG-002/BCG-011, FSM 2/12, surface matrix, CP-05).
- [x] Block 7: sequential focused checks + `tmp/agent-execution` deliverables.

## Fix progress (fix phase, 2026-10-10, worker `kimi-code/k3`)

- F1 complete (solver-authorized repair of gate finding V1): the failed full-gate e2e expectation
  `e2e/applicationShell.spec.ts` (exact navigation link list + per-destination Tab sequence) was a stale test
  list, not a gating defect. Gating verified first: the two Learn-group links render only when
  `learning.participate` is available (`entry.ts` → `learningParticipation`; `ApplicationShell.tsx`
  `authorizedGroups` Learn group), and this spec's all-capabilities e2e fixture legitimately carries it with
  `available: true`, so the fixture must see them; visibility was not broadened. The unit shell contract
  (`ApplicationShell.test.tsx`, updated by Block 2) already expects them in the same order — Home, Joined
  courses, Start a tutoring session, Resume tutoring, Courses, Invitations, Prepare courses, Multi-factor
  authentication — and the e2e list and Tab walk now match; every other expectation and negative is untouched.
  Targeted Chromium suites pass (`e2e/applicationShell.spec.ts` 9/9, `e2e/tutoringSessions.spec.ts` 8/8,
  sequential, port 4173 free beforehand), and one fresh full gate passes end to end with exit 0, including the
  secret-hygiene, duplication, audit, Trivy, catalog and Markdown stages the aborted run never reached; no
  component reported skipped. Input fingerprint after the fix: 291 files, sha256
  `0665882ca8ee07aefa4f11f8d477f06d9b51553f56f16d9558c3bc9088b2ca8d`, recaptured unchanged after the gate.
  Evidence: `fix-report.json`, refreshed `verify-report.json` (failed-run history retained), refreshed
  `manifest.json`/`story.diff`, `fix-inputs.json`, and content-free `logs/fix-full-gate.{log,exit}` under the
  story tmp directory.
