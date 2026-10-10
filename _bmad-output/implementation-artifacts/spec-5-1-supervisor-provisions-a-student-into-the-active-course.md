# Story 5.1 — Supervisor provisions a student into the active course

## Preparation identity and authority

- Phase: fix; R1–R3 repairs and focused checks completed. Independent re-review, authoritative verification and authorized commit remain separate phases; no claim of story completion or release conformance.
- Frontend baseline: `a7b01a399864f1dfbf27315d63045cfbf3b2d31d` (HEAD matches).
- Backend inspected: `63c99925e5995fe2e2467f4f894976dfd4c0d297`.
- Actual worker: `openai/gpt-6.1-sol` (GPT-6.1 Sol). Runtime variant is not exposed; configured worker default is `#high`, not evidence of the actual variant.
- Identity/scope: `epics.md`, Epic 5, Story 5.1; FFR-503 and roster/minimal membership subset of FFR-504 in `FRONTEND-PRD-FOUNDATION.md`.
- Execution authority: `execution/5-1-supervisor-provisions-a-student-into-the-active-course.yaml`, read first. Preserve solver-owned checkpoint, sprint and other bookkeeping. Current unattended batch authorization, interim policy, fixed 256000-byte gzip budget with seven languages and OpenAI → `kimi-code/k3` → Anthropic rotation override older protocol defaults. Do not launch orchestration, child agents, review or commits in implementation.
- Binding companions: `../planning-artifacts/ux-designs/ux-mia-frontend-2026-09-12/`. This spec references rather than replaces their behavior. Relevant sections: ROUTE-INVENTORY §Course Students; SURFACE-STATE-MATRIX §G/L/F/D/T and roster/create/membership rows; SECURITY-PRIVACY §Temporary Passwords, protected gate, lifecycle, existence hiding, raw errors and named negative suites; ACCESSIBILITY CP-13 and applicable AC-001..005/007..014/016/019; state machines listed below.
- Backend transport authority: `mia/api-doc/openapi.yaml` → `paths/courses.yaml#/students` and `#/student`, request/resource/JSON:API schemas, shared security and pagination parameters. Backend product authority: `mia/docs/product-requirements.md` §User and roster visibility, §Student account provisioning, §Password policy, course membership/state and browser authorization contracts.

## Baseline and prerequisites

Epic 4 is committed: assigned-course preparation hub, course detail/readiness, material processing/approval and first activation exist. The hub has authoritative active state and intentionally no student entry. Story 5.1 adds it, without changing activation or material behavior.

All existing dirty paths are known workflow/bookkeeping categories, not overlapping application work. Additional 4.2–4.5 checkpoint edits fall in the approved bookkeeping category. Exact paths are in the ignored prepare report. Preserve them without staging, stashing or reverting. Backend dirty brainstorming CSV and untracked authentication guide are unrelated and preserved. No unknown overlapping change was found.

Tooling checked once: Node 24.21.0; npm 11.19.0; `npm ls --depth=0` passes with all declared direct dependencies installed; Playwright 1.63.0; bundled Chromium exists and headless launch/close passes (153.0.8010.12); Tailwind Plus metadata version `2026-09-13-083323`. Selected licensed files are present and read. No installation or network retry needed. Current stack pins override stale AGENTS/skill greenfield/version prose.

Prepare creates only this spec and ignored content-free evidence/report files. Application checks and the full gate are deliberately not run for prepare. `_bmad-output` Markdown is lint-exempt. Manual browser/AT/password-manager/release evidence remains later work, not a passed prerequisite.

## Acceptance and bounded scope

1. An authenticated assigned supervisor can enter the canonical course roster from the preparation hub. Exact current `courses.supervise` course scope and an authorized course read precede every roster/membership read and protected mount. Role flags, known IDs and `students.manage` student-account scope are not substitutes for course supervision.
2. The authorized roster shows only the contracted membership representation: username, joined instant and opaque course/student/membership identities used for trusted navigation. It pages in batches of 25 using server links, with no total, global directory, username search, unsupported filter or background sweep. No profile, contact, password, transcript, summary, private-material or active-chat request occurs.
3. Create student is a separate canonical form, available only for an assigned course whose authoritative persisted `state` is `active`. Active-but-not-accepting-new-tutoring-sessions does not disable membership creation: readiness for tutoring is a different contract. An authorized inactive course may still show its existing roster; it offers no creation control.
4. Collect exactly the contracted username, temporary password, preferred language, country and IANA time zone, plus a local-only password confirmation. Explain before submission that the supervisor must communicate the chosen credentials outside MIA and that the student must replace the temporary password before other authenticated use. Do not ask for email, name, nickname, mobile, voice, role or student AI instructions.
5. One deliberate form action sends one `mode: provision` POST. The server creates student-only account and membership atomically. Only an original validated definitive `201` response confirms creation; no optimistic row/account, guessed success or automatic replay. Definitive success drops every form value/secret reference and navigates to canonical minimal membership detail using the response's **student relationship ID**, not its membership resource ID.
6. Success, Cancel/Discard, departure, pagehide, restoration, logout, expiry, scope loss and ambiguity destroy credentials. They never enter action result state, generic caches/stores, URLs/history, diagnostics, clipboard helpers, reports, snapshots or restoration. A correctable definitive rejection may retain native values only in the same mounted authorized form. Nothing restores them after leaving.
7. Username conflict and validation have corrective localized feedback; inactive-course rejection is a course-state outcome without student facts. Hidden course/membership causes share one fixed neutral presentation with stale protected identity cleared first. Sign-in/stage/CSRF loss belongs to the session owner.
8. Returning, reloading, Back/Forward and explicit Refresh read current authorized state through the ordered gate. A lost POST response has a distinct unconfirmed state and destroys the credentials; a bounded roster read cannot attribute success to this attempt or prove absence. No lookup/probing/enumeration or new POST occurs automatically.
9. All seven catalogs, accessible credential input/reveal/paste, title/focus/announcements, 320px/all text modes, zoom, forced colors, reduced motion and content-free test diagnostics are covered by scoped tests. Preserve the bundle ceiling and existing exclusions.

### Exclusions

No Add existing student route/action or `mode: existing` dispatch (later work); removal/DELETE, profile editing, password recovery, MFA reset/enrollment/management, ban/unban, account deletion, mentor assignment, tutoring/status/transcript/history, summaries, private material, global search/directory, avatar/download, roles, invitation workflow, SSE, polling, notifications, new runtime dependency, CSP/theme change, build-budget change or whole-epic preparation. Minimal membership detail is included only because it is the canonical definitive-success destination and lets the supervisor inspect the created relationship; it adds no future support/security action links or placeholders.

## Verified operation map

### Admission and course state

Reuse existing non-refreshing `discoverSession`, `getCurrentAccountCapabilities`, route admission and `readAuthenticated`. Course resource is `getCourse`: `GET /api/v1/courses/{id}`. Reuse its existing minimized `getCourse` projection for the student host/preflight: identity, course name, state and supervisor relationship. No new readiness endpoint or material inspection is needed. The committed preparation hub continues using its own richer projection.

Course GET is session-protected, returns `200 CourseDocument` with no-store; errors include 401, restricted 403, hidden 404 `course_not_found`, 406 and 503 `course_readiness_unavailable`. Never interpret a failed course read as inactive/empty scope or permission to mount.

### Provision student

`addCourseStudent`: `POST /api/v1/courses/{id}/students`, `paths/courses.yaml:425–459`.

- Request: exact `Accept`/`Content-Type: application/vnd.api+json`, cookie session, fresh current `X-CSRF-Token`. `CourseStudentRequestDocument` has `data.type: course-students`, **no client id**, and the `ProvisionedStudentAttributes` branch with required `mode: provision`, `username`, `temporary_password`, `preferred_language`, `country`, `time_zone`. No request ID, idempotency key, If-Match, username lookup or separate account POST is contracted. Local confirmation is never sent.
- Field grammar/bounds remain owned by `requests.yaml#/Username`, `#/NewPassword`, `#/Language`, `#/Country`, `#/TimeZone`. Apply current username grammar and password code-point/UTF-8 bounds; passwords are never trimmed/normalized. Common-password rejection remains server-authoritative (backend local check), with no remote password service. Profile controls use existing country/IANA options and seven launch locales; present these as choices, not a claim that OpenAPI permits only seven BCP 47 tags.
- Definitive success: exactly `201`, JSON:API, `CourseStudentDocument`, `Cache-Control: no-store`. Resource has `type: course-students`, opaque membership id, `attributes.username`, `attributes.joined_at`, course/users relationship IDs. There are no returned password/profile/email/transcript fields. Validate nonempty identities, UTC instant, matching addressed course, correct relationship types and response status/media type. Never reconstruct a credential card from chosen input.
- Declared errors: 400; 401; 403 `csrf_invalid` or `auth_password_change_required`; hidden 404 `course_not_found` or `course_student_not_found`; 406; 409 `course_invalid_state` or `username_taken`; 413; 415; 422 `course_student_invalid`.
- `username_taken` is an explicitly permitted provisioning conflict, not an invitation to disclose account details or convert to Add existing automatically. Show choose-another-username guidance only. `course_student_invalid` does not identify one field: use a general corrective summary unless local validation independently identifies it.
- Undeclared 5xx, malformed/wrong-course/wrong-status success, timeout/loss, or post-dispatch Stop waiting are outcome unknown. Defensive unknown 429 causes no replay or existence/timing inference. These are not observed provider 429s; the separate worker-provider stop rule still applies.

Source inspection, not executed backend tests: `Service.ProvisionStudent` (`mia/internal/course/course.go:465–505`) validates input, checks assigned active course inside the write transaction, creates `Roles: [student]` with `MustChangePassword: true`, inserts membership and writes only content-free audit metadata. `membershipResource`/`membershipResourceWithAction` exposes no credential. `requireAssignedSupervisor` returns neutral course-not-found for unknown/out-of-scope and course-invalid-state only for assigned inactive course. No atomic-intent precondition is required for this fixed-effect create.

### Roster

`listCourseStudents`: `GET /api/v1/courses/{id}/students`, `paths/courses.yaml:397–424`.

- Session security; no CSRF on GET; exact JSON:API Accept; non-refreshing read.
- `200 CourseStudentCollectionDocument`, no-store, `data: []` for empty, required `meta.has_more`, optional omitted (not null) relative `links.prev`/`links.next`. No total or filters/sorts are declared.
- `page[limit]`: default 25, max 100; `page[offset]`: default 0, max 10000. Client fixes 25 and validates at most 25 rows. Reuse `collectionQuery`/`collectionNavigation` to reject external, cross-course, unexpected-query, malformed and out-of-bound links. Never synthesize next from page fullness/has_more or fetch all pages.
- Errors: 401; restricted 403; missing/out-of-scope 404 `course_not_found`; 406; invalid pagination 422 `course_student_invalid`.
- Backend list checks actual course assignment, then orders memberships by username key/user ID and limits the read. It has no active-course guard: authorized existing memberships remain readable on inactive courses. This does not authorize creating there or guessing student eligibility.

### Minimal membership detail

`getCourseStudentMembership`: `GET /api/v1/courses/{id}/students/{user_id}`, `paths/courses.yaml:461–487`.

- The frontend `:studentId` maps to the **users relationship id** (`user_id`), not `CourseStudent.id`.
- Session security, JSON:API; `200 CourseStudentReviewDocument`, no-store and strong ETag. Errors: 401, 403, neutral missing/out-of-scope 404 `course_student_not_found`, 406, 503 `course_readiness_unavailable`.
- Return schema extends membership with server-authored `remove` eligibility/consequences. Those are authorized membership-review metadata, not active transcript content. This story requests only this contracted representation, validates/retains its minimal membership projection, and neither retains removal state/ETag nor offers removal. Do not add a DELETE because the current backend happens to support it.
- Verify returned course and student relationships match the addressed pair; mismatches fail closed. Refresh/reload reauthorizes the pair. Do not use roster-page absence, a generic user detail or a POST denial as the membership read.

## BCG reconciliation and settled decisions

- **BCG-014:** Still OPEN globally. Provisioning is not in the consequential-mutation inventory; no If-Match or other atomic precondition is needed or invented. Membership review transport now exists, but removal remains excluded. Do not close its old membership-removal clause or implement it opportunistically.
- **BCG-011:** Reuse the committed 4.5 readiness/activation slice, without expanding or closing it. Membership creation requires persisted active state, not activation or tutoring-start eligibility. Course GET supplies that state; no new blocker/workaround is needed.
- **BCG-001/003:** Reuse implemented session/capability discovery, Continue-only renewal and exact `courses.supervise.scope.course_ids`. Existing `students.manage` scope names shared-course student-only accounts for later account management, not permission to provision into an empty roster. No new capability family, role inference, account-field null inference, denial probing or union of independent scope IDs. Wider unpaginated capability-scope bounds/release obligations remain open.
- **BCG-005/007:** Current success operations explicitly carry no-store; central error contract is bounded neutral UTF-8 JSON:API with no secret echo. Preserve existing exact collapsed raw disclosure. No client redaction, withholding or synthesized backend body; unsafe/distinguishing body is a backend defect at source. Wider proxy/cache/release conformance stays open.
- No provisioning/roster-specific BCG entry or absent required operation/field found. BCG-008 global account detail and BCG-010 student support/MFA reset are unnecessary and out of scope. The authorized membership-review read is not a global account directory.
- No new interim workaround or `mia/tmp` backend request is needed. Existing hardcoded documented-limit, material-list and approval-ledger precedents are unchanged, not used as authority for this operation. Do not draft requests for already-present transport.
- Canonical minimal membership detail is part of this story, not postponed: otherwise the required success destination would be a dead link or unauthorized route approximation.
- Current model catalog: active OpenAI worker/solver/reviewer IDs with `high`; active `kimi-code/k3` with `low/high/max`; active Mistral `mistral-medium-2604` with `none/high` (configured protocol fallback, superseded by batch rotation); active Anthropic `claude-opus-5-5`/`claude-sonnet-5-5`/`claude-haiku-5-5`, each with `high` (and other listed variants). Anthropic fallback exact model is not pinned by the batch: solver explicitly chooses an available ID if reached. Catalog availability is not quota evidence. No observed provider 429; stop immediately and return on one.

No unsettled product/transport decision or owner input is required for the bounded slice. Ready means preparation ready, not story complete or release conformant.

## Routes, gates and existing owners

Register only these canonical routes in `entryRoutes.tsx`, lazy feature descriptors and a typed student route/path parser:

- `/prepare/courses/:courseId/students`: Course students; parent/fallback course preparation hub.
- `/prepare/courses/:courseId/students/new`: Create student; parent/fallback roster; definitive success → minimal membership detail.
- `/prepare/courses/:courseId/students/:studentId`: Student membership; parent/fallback roster; lost course scope → assigned-course list or Home through current authorization.

Reserve `new` and future `add`/action segments; do not parse them as user IDs. Do not register `/add`, `/remove`, `/profile`, `/security` or any unimplemented child destination. Routes contain only opaque IDs; no chosen username/password/profile/query/hash/history-state data. Offset remains page-local, not a username-bearing URL.

Use a dedicated `Prepare(students)` descriptor/host rather than pretending student paths are teaching-field/material resources. `App.tsx` dispatches the host under existing route admission/security-epoch keys. Exact sequence: authenticated session → complete current capabilities and matching supervised course ID → course GET → if roster, bounded membership list; if create, active-state check; if detail, pair-specific membership GET → only then shell/title/feature. Pre-access renders neutral Checking access, never cached course/student names. Scope denial before course access sends zero course/student requests.

The preparation hub gains an admitted roster link (valid for active or inactive assigned course) and active-only Create student entry. The roster adds active-only Create student. All links use canonical builders passed by app hosts; features cannot import app routes. No role-based admin entry or capability redesign.

Reuse session `readAuthenticated`/`runAuthenticatedMutation`, `useRouteActivity`, route-departure/dirty-input guard, `DiscardChangesDialog`, announcer, `TechnicalErrorDisclosure`, recovery shell and existing course pagination/checked-at/empty presentation (student feature lives within `features/courses`, so those imports are permitted). Scope/security loss purges host/page/form state and fences older callbacks; no independent auth owner or generic mutation framework.

### Shared controls required now

`check-architecture.mjs` forbids one feature importing another. Provisioning must not import credential controls or profile option logic directly from `features/auth`, nor duplicate their logic to evade the boundary.

Move the existing `NewPasswordFields.tsx`, `PasswordRevealButton.tsx`, `passwordRules.ts` and its unit test to `platform/ui`, updating current auth imports. Preserve replacement/reset/invitation/sign-in behavior. Extend only presentation labels/reveal names as needed to name the temporary password and local confirmation; no MFA/password policy expansion. Existing native-ref password handling, byte-preserving local bounds and local confirmation logic remain one owner.

Move the country-code catalog to `platform/ui/countryCodes.ts`; extract existing invitation `countryOptions`/`timeZoneOptions` into `platform/ui/accountProfileOptions.ts` and use it from invitation and student form. This is reuse for a current second consumer, not a speculative profile framework. Keep invitation's self-entry autocomplete/defaults unchanged. Student fields may adapt their own blueprint JSX (presentation duplication is allowed); they use shared logic, explicit managed-person autocomplete and student-specific labels. No form store or broad account resource enters these controls.

## States, credential lifecycle and ambiguity

There is **no dedicated numbered provisioning/roster machine** in the 31-machine companion. Do not invent a number or claim complete CP-13 coverage. Apply machines 1 (auth/CSRF), 9/24 (route/lifecycle/security), 18 (dirty and post-save input), 23 (foreground freshness), 28 (announcements), 29 (raw error dependency) and 31 (browser privacy). Machine 12 supplies existing course state context, not membership eligibility. Machine 22's access-loss/teardown discipline applies; its destructive precondition inventory does not apply to provisioning. The Temporary Passwords section overrides generic dirty-input retention after ambiguity.

Keep closed discriminated operation states, never persisted account/membership booleans: Clean/Dirty sensitive (same mounted form), pre-dispatch checking, submitting, definitive rejected/not-sent, Save accepted, Save outcome unknown, Reconciling form, current roster reviewed, Security/Scope override. Pre-dispatch/submitting are local operation phases, not new backend domain states. Roster states are Checking/Current/empty/Check failed/Access lost with explicit page loading; membership has the same authorized detail/read-failure distinction.

### Submission

Local validation sends nothing, preserves exact native input and exposes field corrections/error summary. Submit via React Action/useActionState and useFormStatus; synchronously fence duplicate native submissions before any asynchronous read. Action results contain only status/error/minimal returned membership, never FormData or chosen credentials.

Username/password/confirmation and student profile choices start blank. Language choices are the seven launch locales; country uses the full existing ISO list; time zone uses browser-supported IANA zones plus UTC. A browser zone or supervisor locale is an available choice, not an inferred student preference. The supervisor explicitly selects all required profile values; blank values never dispatch. Existing invitation self-entry defaults are preserved by the extraction.

Before POST, re-read the course in the current admitted session/scope/security epoch. Inactive/changed target, failed read, lost scope or departed form sends no POST. This is defensive current-state checking, not an atomic lock; backend transaction remains final authority. If course identity/state changes, show current course state and require deliberate fresh review rather than silently continuing. Do not require tutor readiness or an ETag.

Secrets remain only in native password controls until the one send. Delete password/confirmation entries from React-supplied FormData synchronously before awaits; do not hold copied secret strings in an async preflight frame. Once current preflight succeeds, the current session's one-shot send callback reads controls and constructs the one POST body synchronously. Its mutable dispatch slot is cleared by the existing mutation owner and teardown; no retryable payload/request closure is retained. No password value enters hook/ref/action state other than native input refs; no cleanup callback closes over its value. Local confirmation is discarded, not serialized. Preserve paste, Unicode and whitespace exactly.

Lock fields during preflight/dispatch, with native readOnly where appropriate and disabled native selects. Pending status is concise; no fabricated progress. Cancel is a pre-dispatch exit, not a claim to undo a sent request. Post-dispatch Stop waiting retires local completion, drops controls/values and enters unknown; it does not abort server creation or bypass session settlement tracking for logout. Late ordinary success/rejection cannot navigate, reveal or settle that retired attempt. Late security/scope loss still tears down.

Definitive `201` installs only returned relationship truth, drops all chosen username/profile/password/confirmation references, unmounts controls before navigation and announces success once. Navigate to membership detail, reauthorize and read it; no secret or success payload in history. A subsequent failed/removed membership read is check failure/unavailable, not a reversal or reinterpretation of the original confirmed response. Success guidance is visible before dispatch; do not retain a username/password pair for handoff.

Definitive correctable validation/conflict may keep controls in the same living authorized form; general HTTP rejection never returns a secret in state. Hidden denial/stage/CSRF/sign-in loss clears immediately. `course_invalid_state` clears credentials and requires an explicit current course check before another form. Pre-dispatch failure permits deliberate correction/recheck only, not an implicit queued send.

### Unknown and reconciliation

Drop passwords, confirmation and chosen credential/profile payload immediately for network loss, timeout, malformed success, 5xx or Stop waiting. No exact retry exists: this operation has no correlation contract and the temporary password may not be retained for it. Show unconfirmed creation, not failure/success, and communicate that an account/membership may have been created.

Explicit Refresh re-establishes current admission, course state and **one bounded roster page**. It shows current membership facts with an explicit still-unconfirmed-attempt warning; do not match by username/timestamp, enumerate pages to locate a target, infer success from a row, or infer absence from a page. Page navigation is ordinary deliberate roster pagination only, not reconciliation search. A user may open any returned membership normally without attributing it to this attempt.

Only after that current check may the user explicitly abandon the unconfirmed attempt and start a **new** blank authorized form, with a warning that prior creation may already have occurred. No old password, request body or chosen username/profile values are restored. A read failure keeps new submission unavailable; a now-inactive course offers roster/hub exit only. Reload/departure discards attempt metadata; the next visit displays current authorized state without a remembered success claim. No backend request for a new request-ID mechanism is necessary to provide this truthful bounded recovery.

### Teardown and existence hiding

Register synchronous pagehide/visibility credential cleanup and destroying session/route cleanup; existing session shield stays installed before BFCache. Hidden/return/online/focus/pageshow signals make no authenticated read and cannot refill/reveal credentials. Explicit Refresh reauthorizes and returns a blank form only when appropriate. Dirty departure uses Stay/Discard with focus restoration; security/denial/expiry overrides it, with no Stay option. Clear native values, unmount password controls and drop references/callbacks/dirty state on success, discard, cancel, actual departure, logout, expiry, scope loss and ambiguity. Never promise physical JS-memory, password-manager, browser or OS erasure.

Unknown/out-of-scope/removed course or membership uses the same neutral unavailable copy/title/H1/focus/actions/announcement/breadcrumb treatment within the operation and locale; no cached username/course interpolation, distinguishing retry-after or reason-specific action. Same route/pair remains content-free until safe parent navigation; navigation never varies by hidden cause. Keep raw error disclosure exact/collapsed/inert, relying on backend identical neutral body for each hidden group. Do not merge the authorized username conflict with hidden denials or expose an unknown target's profile. Inactive course explanation names only authorized course state, never any entered student's existence.

## Exact blueprint bindings

Licensed version `2026-09-13-083323`, all `v4/react-light.jsx`, read during prepare:

- Roster: `Application UI/Lists/Tables/Simple`. Adapt to username and joined-at columns, username links to membership; no email/avatar/role/Edit samples, no hidden columns. Host owns h1; use collection h2. Wrap cell text, remove nowrap and bound any genuinely two-dimensional horizontal scroll to a labelled keyboard region. Skeleton, if used, inherits this final row anatomy, with adjacent concise loading text.
- Pagination: `Application UI/Navigation/Pagination/Simple card footer`, via existing `CoursePagination`. Remove fictional total/range, use validated previous/next offsets and page-local controls; keep actions available at every width.
- Create form and native selects: `Application UI/Forms/Form Layouts/Stacked`. Retain stacked label/control/help/action anatomy; remove sample uploads/address/notifications/public-profile content; use only required student fields and native selects.
- Ordinary username/profile inputs: `Application UI/Forms/Input Groups/Input with label and help text`; invalid fields/password pair: `Application UI/Forms/Input Groups/Input with validation error`. Reuse existing password pair's exact binding, error-summary `Feedback/Alerts/With list`, and pressed reveal button. Change semantic context/labels only, with contrast-correct inherited outlines (gray-500/red-600 where needed), not custom styling.
- Minimal membership: `Application UI/Data Display/Description Lists/Left-aligned`. Replace applicant/attachment samples with username, joined-at and authorized course context; no profile/security/removal metadata/actions. Use h2 beneath route h1 and wrap mixed-direction text.
- Existing shell/header, buttons, empty/recovery/error/dirty-dialog/checked-at owners retain their established licensed bindings. No new styled banner/modal/badge/tooltip abstraction is needed.

Record exact identity/version and MIA anatomy/accessibility deltas in adapted presentation files. Selected tables are preferred over inspected `Stacked Lists/Narrow`, whose sample avatar/email anatomy is unnecessary. Never commit licensed originals or copy them into reports.

## Localization, accessibility and security tests

New titles/H1s, field labels/help, external credential handoff/first-login instruction, inactive state, conflict/validation, pending/Stop waiting, unknown/reconcile/abandon, roster empty/page/freshness and membership labels must be in `messages.ts` and all seven catalogs. No English fallback, concatenated translated clauses or removal of languages for bundle size. Authored usernames/course names remain escaped untranslated text isolated by `bdi`; UTC instants display in the viewer's existing IANA zone with zone context. Raw errors remain untranslated inert text.

Autocomplete: managed username and country `off`, temporary and confirmation passwords `new-password`; language/time-zone omit unsupported purpose. Do not block paste/autofill/password managers. Reveal buttons have object-specific temporary-password names and aria-pressed; preserve value, focus and selection. Password confirmation is local assistance, not an extra API field. Keep full password rules before entry and announce corrective summaries without values.

One main/h1, localized title before heading focus, direct parent exit, current route semantics, 24px targets and visible unobscured focus. Pagination focuses collection heading/status, not route h1; failure/unknown focus a concise corrective target. Initial state/unchanged Refresh remain silent; pending/page/success announce once politely, actionable rejection/unknown once urgently through the one announcement owner. No raw error, username/password pair or repeated render/status in live announcements.

Cover representative stable scanner states with current axe, not a scanner-only conformance claim; no blanket exclusions. Exercise keyboard, dirty dialog, reveal/paste, 320px in three text modes, 200% zoom, text spacing, forced colors, reduced motion, all seven locales/long labels and mixed direction. Actual 1280px at 400% browser zoom, Chrome/Edge/Safari and AT/password-manager interoperability need repeatable owner manual evidence; do not substitute CSS scaling or Chromium emulation for it. These remain release obligations, not a prepare blocker or automatic Pass.

Security checks must inspect network non-fetch/dispatch counts, DOM/accessibility, query/action/native state after teardown, URL/history/title/breadcrumbs, storage, clipboard inactivity and delayed callbacks. Fixtures are generated per test; assertions use content-free booleans/fingerprints, never values. Trace/video/screenshot/HAR and auto aria error context remain disabled for credential/protected tests. Extend the existing deliberate-failure harness for every new secret-bearing unit/browser path, including pending, validation, denial, unknown and teardown; no new diagnostic runner or retained raw request body.

## Explicit implementation manifest and symbol map

Prepare changes only this spec plus ignored report/log. Below is the bounded implementation allowlist; relocation source and destination are both explicit. Existing dirty files/checkpoints/sprint are not application work and must not enter the diff. Additional files require solver reconciliation, not silent scope growth.

### Existing owners

- `src/app/routes/entryRoutes.tsx`: three student descriptors, closed route type, reserved-segment parser, branded pair identity and trusted paths; exact existing supervision scope only.
- `src/app/App.tsx`: lazy Prepare student host dispatch and identity/epoch props under existing admission/recovery.
- `src/app/routes/AdminCourseRoute.tsx`: trusted roster/create link props only; no administrator student access.
- `src/features/courses/CourseRouteProps.ts`: roster/create link builders; no student data in the hub resource.
- `src/features/courses/CoursePreparationRoute.tsx`: admitted roster and active-only create entry; preserve activation/teaching/material behavior.
- `src/features/auth/InvitationEntryRoute.tsx`: relocated shared imports and extracted profile-option functions only; self-entry behavior unchanged.
- `src/features/auth/PasswordChangeForm.tsx`, `src/features/auth/PasswordResetEntryRoute.tsx`, `src/features/auth/PasswordSignInForm.tsx`: relocated credential-control imports only.
- `src/platform/i18n/messages.ts`.
- `src/platform/i18n/catalogs/en-US.json`, `de-DE.json`, `es-ES.json`, `es-AR.json`, `fr-FR.json`, `pt-PT.json`, `pt-BR.json` (all in that catalogs directory).

### New scoped application owners

- `src/platform/api/courseStudents.ts`: generated-operation-shaped provision request, minimal validated membership/page projection, course/student/membership identity validation, `provisionCourseStudent`, `listCourseStudents`, `getCourseStudentMembership`, hidden-failure classification. Reuse `client`, `entry` IDs/UTC schema and `collectionNavigation`; no transport changes or aliases solely renaming generated types.
- `src/app/routes/PrepareStudentRoute.tsx`: ordered course/pair/dependent resource admission, neutral checking/unavailable host, shell/title and trusted link props. No additional auth owner.
- `src/features/courses/CourseStudentRouteProps.ts`: minimized roster/create/detail admitted resources, typed links and unavailable callback.
- `src/features/courses/CourseStudentListRoute.tsx`: bounded roster/table/page freshness, membership links, active-only creation; existing course presentation helpers may be reused within the feature.
- `src/features/courses/CourseStudentCreateRoute.tsx`: native credential form/Action, temporary-password labels, dirty/secret teardown, definitive navigation, no retained payload.
- `src/features/courses/CourseStudentFields.tsx`: contract-limited username/profile controls and validation presentation; shared option logic, managed-person autocomplete.
- `src/features/courses/CourseStudentMembershipRoute.tsx`: minimal membership read-only display and explicit Refresh/parent exits, no future actions.
- `src/features/courses/useStudentProvisioning.ts`: local attempt/preflight/send/rejection/unknown/bounded-reconcile/abandon owner, synchronous fencing/announcements. It stores no credential payload, and callbacks accept native control access only while current.
- `src/platform/ui/accountProfileOptions.ts`: extracted country display/sort and browser IANA/UTC option logic for two existing concrete consumers.

### Concrete shared-owner relocations

- `src/features/auth/NewPasswordFields.tsx` → `src/platform/ui/NewPasswordFields.tsx`: same native pair/form validation; explicit temporary context labels; no secrets in result state.
- `src/features/auth/PasswordRevealButton.tsx` → `src/platform/ui/PasswordRevealButton.tsx`: same pressed/preserve-focus/value semantics.
- `src/features/auth/passwordRules.ts` → `src/platform/ui/passwordRules.ts`: byte-preserving local bounds/confirmation, backend final policy.
- `src/features/auth/passwordRules.test.ts` → `src/platform/ui/passwordRules.test.ts`: preserve existing cases; scoped input edge coverage as needed.
- `src/features/auth/countryCodes.ts` → `src/platform/ui/countryCodes.ts`: same static ISO catalog; no duplicate source/fallback barrel.

### Tests and evidence inputs

- `src/platform/api/courseStudents.test.ts` (new): exact method/path/media/CSRF/provision branch and exclusion of confirmation/client id; definitive success validation, minimal projection, defensive failure, no replay, page/link bounds and pair mismatch.
- `src/platform/ui/accountProfileOptions.test.ts` (new): extracted observable country/zone choice behavior, not copied constants.
- `src/app/routes/studentProvisioning.test.tsx` (new): connected gates/form/membership/roster/state transitions, lifecycle/credential cleanup/unknown/no-overfetch and hidden-cause equivalence.
- `src/app/routes/routeNavigation.test.tsx`: three routes/parents/reserved IDs/admission/focus; no unrelated navigation expansion.
- `src/app/routes/coursePreparation.test.tsx`, `src/app/routes/courseActivation.test.tsx`: hub student entries and replace only obsolete story-4.5 no-student-link scope assertion; activation contract remains unchanged.
- `e2e/studentFixtures.ts` (new): bounded server membership pages and independent course/POST outcomes, no providers, generated per-test secret markers and redacted counters/flags.
- `e2e/studentProvisioning.spec.ts` (new): active-hub → create → original 201 → canonical membership → refreshed roster; conflicts/inactive/denial/unknown/lifecycle; a11y/locales/reflow.
- `e2e/coursePreparation.spec.ts`, `e2e/courseActivation.spec.ts`: only affected hub-link/obsolete scope checks.
- `scripts/secret-hygiene-evidence.ts`: enumerate every actual new secret-bearing unit/browser case and content-free checkpoint; existing runner reused.
- This spec: implementation block progress/check evidence after each completed block.

No dependency, package lock, generated API, session controller, session provider, capability parser, global cache, architecture-gate, CSP, bundle-budget, test-runner configuration or canonical-companion change is expected. Existing generated operations already contain the needed paths. If current backend inputs change before implementation, recheck them and regenerate only with an explicit manifest reconciliation; do not work around drift.

## Implementation blocks and targeted checks

1. **API and route admission:** add minimal student transport and three canonical routes/host; tests for exact scope/non-fetch/order/status/media/relationship IDs/pagination. No UI before gate. Focused API/route tests, typecheck and lint, sequentially.
2. **Roster and minimal membership:** blueprint table/detail, hub entries, active-only creation and foreground pagination/Refresh; scoped roster/member route/navigation tests and no transcript/profile requests. Persist progress here.
3. **Credential controls and provisioning:** concrete relocations/extractions, temporary form, preflight, one POST/duplicate lock, original-response success navigation, teardown, definitive failures, Stop waiting/unknown/reconcile/new-blank-attempt. Run connected provisioning tests and existing auth/password replacement/reset/invitation/sign-in regressions touched by imports; record content-free evidence.
4. **Localization, browser/a11y and secret hygiene:** seven catalogs, protocol fakes and Chromium journey/adversarial/lifecycle coverage, applicable geometry and deliberate-failure cases. Keep all seven languages within 256000 gzip bytes; use existing lazy-route boundary, not speculative bundler/dependency changes. Run focused browser checks only after a build, never overlapping checks.
5. **Final verification in verify phase only:** inspect final diff, run `./run-all-tests.sh` once for final input fingerprint; preserve full metadata/command logs, name failed/skipped components, and manual evidence limits. Implementation does not run full gate, self-review, commit or declare done. Reporting-only spec updates do not invalidate gate evidence.

Required negative cases: empty roster; previous/next and offset cap; malicious/cross-course links; no unsupported search; no global/user/transcript/status/material fetch; anonymous/MFA/password-change, student, mentor, administrator-only and unrelated-supervisor denial; direct/reload/Back/Forward; assigned inactive versus active-not-accepting; simultaneous deactivation/assignment loss; valid spaced Unicode password and boundary bytes/code points; mismatch; username conflict and generic 422; 400/401/403/404/409/413/415/422 and unknown 5xx/malformed/lost response; bytes-reached-server loss with exactly one POST; duplicate native submit; before/after-dispatch Stop waiting and late success/security-loss; pagehide/BFCache/visibility/focus/online with zero automatic requests and blank credentials on return; success/cancel/discard/teardown absence; raw disclosure inert exact body; no clipboard calls; untouched auth flows after shared-owner relocation.

After implement/fix, worker writes tracked plus new story-file scoped diff and content-free logs under `tmp/agent-execution/5-1-supervisor-provisions-a-student-into-the-active-course/`, excluding baseline user edits, without staging. Solver owns review, checkpoint, sprint and authorized commit scheduling.

## Progress and prepare evidence

### Repair batch R1–R3 — 2026-10-10

- R1 implementation block: shared native password validation now accepts field-specific corrections, orders all linked errors by the owning form's native control order, and owns one start-of-form summary for provisioning. Individual username/language/country/time-zone errors have localized corrections and associations in all seven catalogs. Multiple errors focus the summary; a single error focuses that control. Legacy invitation extra-check behavior remains unchanged. New regressions cover all blank profile choices, language only, invalid username plus blank profiles, and mixed password-pair/profile errors with corrected resubmission.
- R2 implementation block: the shared password inputs retain the licensed validation-input anatomy with gray-500/red-600 unfocused outlines. A provisioning-only Chromium regression measures computed-color contrast against both input and adjacent backgrounds for both enabled, unfocused inputs in normal and invalid states.
- R3 implementation block: every provisioning lifecycle setup acquires a fresh symbol owner; cleanup retires that owner and clears native controls/attempts. Preflight, dispatch completion, hidden denial and reconciliation compare their captured owner, so StrictMode replay is reversible without reactivating genuinely retired callbacks. Connected StrictMode success and delayed preflight/post teardown regressions are added.
- Both applicable deliberate-failure inventories include the new cases/checkpoints. Focused validation is pending; no authoritative gate, review, tracker change, staging or commit is performed in this fix phase.
- Repair regression block completed: 30 connected student tests and 27 provisioning Chromium tests pass, including localized validation rendering in every locale/text-mode cell. Initial checks exposed 20px summary links; the licensed summary adaptation now gives links a minimum 24px target. One existing Escape focus assertion raced the dialog's restoration and now polls the actual focus target without retaining protected diagnostics. StrictMode admission legitimately repeats safe reads, so its regression asserts exactly one POST rather than a fabricated single-read guarantee.
- Affected regressions: 352 tests in 18 focused unit files pass. Shared-control auth Chromium subset passes all 28 sign-in/replacement/reset/supervisor-handoff cases. Its first invocation exceeded the tool's 240-second bound after 23 passes; no test failure was observed. Confirmed the test runner/Chromium were stopped, terminated only that invocation's orphaned preview, and made one bounded resumed invocation with a sufficient limit; it completed in 5.8 minutes. Original and resumed content-free logs are retained.
- Static/coverage/lint/architecture, explicit-manifest formatting, seven ICU catalogs and bundle checks pass. Latest build inputs fit the unchanged 256000-byte gzip ceiling. Duplication and deliberate-failure hygiene remain pending; final verification/review still belong to later phases.
- Repair evidence block completed: duplication marker balance and unchanged-threshold JSCPD pass with zero clones. Course-unit deliberate-failure hygiene covers 136 actual tests/198 checkpoints; provisioning browser hygiene covers all 27 actual tests/57 checkpoints. Both reject the early-failure canary and report zero fixture-marker leaks. The application bundle is 244879 bytes gzip with all seven languages, below the unchanged 256000 limit.
- Repair disposition: R1, R2 and R3 fixed with targeted evidence; no product/transport decision or owner action was needed. No bookkeeping file was written, nothing staged or committed. The solver's Story 5.1 checkpoint differs from the earlier implementation snapshot and is deliberately preserved/excluded, not treated as worker-owned input. Current HEAD remains the baseline SHA.
- Handoff artifacts: `tmp/agent-execution/5-1-supervisor-provisions-a-student-into-the-active-course/{review-report.json,fix-report.json,story.diff,manifest.json}` and `fix-*.log`/`fix-browser-hygiene.json`. Next: independent reviewer checks the repaired boundaries, then solver dispatches the authoritative final verify phase. Full gate/manual supported-browser and AT evidence remain explicitly unperformed in this fix phase.

- Completed P1: checkpoint/rules, full HEAD, git status/staged status and existing-owner inspection; no unknown overlap.
- Completed P2: operation/schema/backend-product/source inspection; roster/provision/membership transport present; BCG inventory reconciled without global closure or new workaround.
- Completed P3: installed npm/runtime/Chromium launch and licensed blueprint checks; runtime primary/fallback IDs/variants checked without paid benchmarks or installs.
- Completed P4: bounded routes/gates/credential/ambiguity/a11y/i18n/tests/manifest settled and written. No code implemented or staged.
- Prepare consistency check passed: JSON/report parses, existing manifest owners and relocation sources present, planned new application paths unimplemented, HEAD unchanged/no staged files and original dirty path set preserved. Initial checker had a porcelain-whitespace parsing false failure; corrected check passed without workspace repairs.
- Prepare report: `tmp/agent-execution/5-1-supervisor-provisions-a-student-into-the-active-course/prepare-report.json`.
- Content-free checks log: `tmp/agent-execution/5-1-supervisor-provisions-a-student-into-the-active-course/prepare-checks.log`.
- Next: solver approves this ready spec and dispatches implementation for this story only.

## Implementation pause — 2026-10-10

- Actual worker: `openai/gpt-6.1-sol`; runtime variant unavailable. Baseline remains `a7b01a399864f1dfbf27315d63045cfbf3b2d31d`. No provider 429 observed.
- Partial application infrastructure written within the approved manifest: minimal student API projection/transport, three canonical route descriptors and dedicated admission host, hub entries, roster/detail presentation, native provisioning form/attempt owner, concrete password/catalog relocations and shared profile-option extraction. These are **not completed acceptance blocks**: new behavior tests and adversarial validation are not yet written or run. Treat the partial application code as unverified, not ready for review or completion.
- All seven catalogs contain the new copy. Current typecheck, lint/architecture and ICU catalog check pass; explicit-path Prettier formatting completed. No full gate, Chromium story tests or deliberate-failure hygiene run occurred.
- Early budget check: existing built input was 255413 gzip bytes. First student build was 259361 bytes (FAIL). Pre-authorized bounded mitigation in `App.tsx` defers existing protected shell and profile host modules using neutral Suspense fallbacks, without changing their behavior, gate or catalog ownership. Subsequent build: 244402 bytes (PASS against 256000). No dependency/config/budget/language change. This build preceded formatting; final-state verification remains later work.
- **Manifest reconciliation required before continuation:** `scripts/check-route-secret-hygiene.mjs` hardcodes the actual browser test file list (lines 90–96) and imports its checkpoint inventory from `scripts/route-secret-hygiene-cases.ts` (line 14). New `e2e/studentProvisioning.spec.ts` cases cannot participate in that existing browser deliberate-failure runner solely through the allowlisted `scripts/secret-hygiene-evidence.ts`, whose `courseUnitCases` inventories unit cases. Extending the existing runner as required by this spec needs those two additional script paths. Neither has been edited. This is a frontend evidence-manifest omission, not missing backend transport; no new interim contract or backend RFC is justified.
- Per the dispatch's stop-on-deviation instruction, implementation paused at this discovery. Solver must reconcile these two script owners, then resume this same partial implementation. No owner question is requested; current batch authorization remains intact.
- Remaining: complete focused API/connected-route/browser/a11y/lifecycle/secret tests and hygiene inventory, fix any observed implementation findings, update affected existing hub assertions, run focused regressions/static/duplication/hygiene/build checks, then hand off for independent review. Unknown-attempt admission/reconciliation and credential destruction need particular test scrutiny; no current coverage claim is made.
- Evidence/diff/report paths: `tmp/agent-execution/5-1-supervisor-provisions-a-student-into-the-active-course/{implement-report.json,manifest.json,story.diff,implement-checks.log}`. Existing workflow/checkpoint/sprint changes remain untouched; no staging or commit.
- Pause-state checks after explicit-path formatting: typecheck PASS, lint/architecture PASS, explicit-path format check PASS, seven ICU catalogs PASS, build PASS, current gzip budget PASS (244402). Duplication marker balance PASS, but JSCPD FAIL: seven new TSX clones (119 lines/640 tokens) involving the student admission/recovery host and roster action JSX. They remain unresolved at this mandated pause; assess shared responsibility versus the rules' smallest justified marker on resume, without changing thresholds. Logs are content-free and contain no fixture values. No story/unit/browser/hygiene behavior test has passed merely because static checks passed.

## Resumed implementation — 2026-10-10

- Solver authorized both hygiene-script paths and root-cause duplication repairs. The course host's admission settlement/generation fence and identical neutral shell/recovery frame are shared with the student host; student authorization/order/projection remain separately owned. Existing `AdminCourseRoute.tsx` owns this abstraction. A foreground Refresh control is shared in existing `CourseListRoute.tsx` (additional path required by the authorized duplication repair). No new ignore marker or threshold change. Material host is untouched.
- API/route/credential blocks now have five transport tests, two shared option tests and 22 connected story tests. Initial focused units: four failures exposed pending-action rendering that retained cleared controls after Stop waiting/cancel, plus incorrect test expectations. Repaired the form mount predicate to depend on actual operation phase, not React Action pending; final 29 focused tests pass. Shared admission uses a generation fence rather than the partial host's live boolean.
- Browser journey, failure/unknown/dirty/lifecycle/roster/localization/zoom cases and exact hygiene inventories are written. Initial Chromium run: 12/15 pass; empty status heading, lazy-render timing and CSP-incompatible test spacing injection found. Replaced the form's empty h2 with a focusable paragraph and separate recovery heading reference, await actual stable surface, use existing per-element test spacing technique. Subsequent evidence pending.
- Hygiene browser runner uses the public Playwright config for exact selected student tests (same no-capture spec settings, one worker/no retries and dedicated artifacts); historical hygiene config remains unchanged. This avoids an unauthorized config-path extension while keeping the existing runner and complete original-output scan.
- An initial resolved-promise API assertion printed a synthetic minimal username on failure. Its raw log was discarded and replaced with a content-free classification; the assertion now classifies errors before comparing booleans. No temporary password was printed. All final deliberate-failure evidence must pass before handoff.

### Completed blocks and final focused-check dispatch

- Completed I1: minimal JSON:API provisioning/roster/pair transport, exact course supervision gates and canonical route identity/parent/reserved-segment behavior. Five new transport tests and the added route-navigation case cover one-shot wire shape, original 201, wrong status/media/course/pair/instant, no retry, bounded/malicious pagination and minimal projection.
- Completed I2: hub/roster/membership surfaces and active-only creation. Roster pagination now installs the freshly read course state as well as the returned page, so a newer inactive course cannot leave a stale creation entry. Updated obsolete Story 4.5 assertions to positively require canonical roster/create links after activation and continue excluding unimplemented destructive actions. No teaching/material/activation transport changed.
- Completed I3: concrete shared controls/options relocations, native credential form, preflight/dispatch fencing, definitive/unknown recovery and lifecycle/dirty teardown. 23 connected provisioning tests cover gate denial, exact credentials, rejection retention, security/hidden overrides, unknown bounded read/new blank form, duplicate submit, Stop waiting with late success/hidden denial, cancelled/inactive preflight, lifecycle and Stay/Discard. The corrected form mount predicate destroys both credential controls even while a retired React Action is still pending. Initial empty status h2 is now a focusable paragraph; recovery has its own heading ref.
- Browser functional subset: 22/22 story Chromium tests pass, including all seven locales × all three text modes × form/roster/membership at direct 320px, spacing, forced colors/reduced motion, representative axe states, exact Unicode/spaced clipboard paste and real 200% zoom complete process in each text mode. These are bounded automated claims, not manual supported-browser/AT conformance.
- Final focused units PASS: 345 tests in 18 files, including connected App/auth flows, shared controls and affected course/route hosts. Final typecheck, lint/architecture, seven-locale ICU check, build and bundle PASS; initial-route JavaScript remains 244402 gzip bytes against 256000 with seven languages.
- Final browser regression and deliberate-failure sequence dispatched serially, never overlapping tests/builds. Inventory: 22 actual new browser tests/46 checkpoints plus early canary; 28 actual secret-bearing student unit tests/34 checkpoints, incorporated in the existing course-unit harness (129 tests/185 checkpoints plus early canary). First scoped browser-hygiene attempt exposed an over-anchored CLI grep selecting zero tests, not a marker leak; corrected to the established suffix match. Final evidence pending at this progress write.
- No source/config/dependency/gate expansion beyond the approved story and duplication/evidence reconciliation. `./run-all-tests.sh`, independent review, tracking/status changes, staging and commits remain deferred to their owners/phases.

### Completed I4 and implementation handoff

- Final serial browser regression PASS: 106 Chromium tests across student provisioning, course administration/preparation/activation and route navigation/recovery. The 22 new story browser cases all pass in the final built application. Final focused units PASS: 345 tests/18 files; new observable cases total 31 (23 connected provisioning, five transport, two option tests and one route-identity test). Twelve relocated password-rule cases are preserved, not counted as new.
- Browser deliberate-failure hygiene PASS: 22 actual student tests, 46 named checkpoints and one rejected early-failure canary. Original stdout/stderr and every original generated artifact were scanned before cleanup; zero marker leaks. Unit deliberate-failure hygiene PASS: existing course-unit runner executed 129 actual tests, 185 checkpoints and one rejected early-failure canary, including all 28 secret-bearing new student tests/34 checkpoints; zero marker leaks. Inventories and result metadata are retained content-free under the story's `tmp/agent-execution` directory.
- Final static/format checks PASS: typecheck, typecheck coverage, lint/architecture, explicit-manifest Prettier check, seven ICU catalogs, API type drift, diff whitespace, duplication marker balance and JSCPD threshold-zero scan. Seven prior clones are resolved with the shared admission settlement/frame and foreground Refresh control; final clones: zero, no new markers/suppressions or changed thresholds. Build and gzip budget PASS: 244402/256000 bytes, all seven languages intact.
- Bookkeeping preservation inventory: 17 pre-existing workflow/checkpoint/sprint/retro files, unchanged against the resume inventory; no staged paths and HEAD unchanged at the full baseline SHA. New/modified/deleted story paths are explicit in `manifest.json`; tracked plus new source/spec/test changes are in `story.diff`. No backend edit/request, dependency/config alteration, staging, commit, full gate or self-launched review.
- Manual supported Chrome/Edge/Safari, AT/password-manager interoperability and student-process 1280px/400% manual release evidence are **not performed**, not passed. Named whole-release acceptance matrices/negative suites are not claimed complete. The final focused-input content fingerprint is evidence for this implementation handoff, not a substitute for `./run-all-tests.sh` in the verify phase.
- Next action: solver dispatches independent review using this spec, the actual scoped diff and focused-check evidence, then schedules authoritative verification for the accepted final inputs. No implementation blocker remains.
