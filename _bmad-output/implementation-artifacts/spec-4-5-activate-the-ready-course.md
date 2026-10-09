# Story 4.5 — Activate the ready course

## Preparation identity and authority

- Phase: review passed (R1 cleared); final authoritative gate verified; uncommitted.
- Frontend baseline: `1c1e62d211816dd4eb34f705030502859b078ea4`.
- Backend inspected: `63c99925e5995fe2e2467f4f894976dfd4c0d297`.
- Actual worker: `openai/gpt-6.1-sol` (GPT-6.1 Sol). The runtime does not expose the selected variant; do not infer it from the configured `#high` default.
- Story authority: `epics.md`, Epic 4, Story 4.5; FFR-302/303 in `FRONTEND-PRD-FOUNDATION.md`.
- Binding behavior: UX companions in `../planning-artifacts/ux-designs/ux-mia-frontend-2026-09-12/`, especially machine 12; route inventory §Prepare Courses; Prepare surface rows; CP-03 and applicable AC-001..005/008/009/012/016/019; security protected-gate, CSRF, ambiguous-mutation, teardown, least-data, raw-error and existence-hiding contracts.
- Backend authority: `mia/api-doc/openapi.yaml` and its referenced course/resource schemas; `mia/docs/product-requirements.md` §Preparation, §Activation, §Loss of approved material and §Browser readiness and destructive confirmation. Those documents own the contract; this spec does not reproduce backend policy as client validation.
- Batch authorization, interim-workaround policy and rate-limit rotation are recorded in `execution/4-5-activate-the-ready-course.yaml`. That current batch decision overrides older protocol fallback defaults. Solver owns that checkpoint and sprint writes; worker must not change them during prepare/implement.

## Preserved baseline and prerequisites

The working HEAD matches the supplied baseline. Existing dirty files are workflow/agent configuration and execution/sprint bookkeeping, plus the existing untracked retrospective and this story's checkpoint. Exact paths are in the prepare report. Additional 4.2/4.3/4.4 checkpoint edits are the same known bookkeeping category; they do not overlap application code or this new spec. Preserve all of them, without staging, reverting or stashing. Backend dirty brainstorming CSV and untracked auth guide are also unrelated and preserved.

Committed prerequisites are present: 4.2 preparation hub/teaching fields, 4.3 material/upload routes, and 4.4 processing/brief/approval and safe Markdown. Reuse their owners, not their fixture shortcuts. In particular, `CoursePreparation` currently strips `readiness.activation` and `new_session`; extend the preparation projection before exposing activation. Existing fixtures that omit the contracted activation object must be corrected, not accommodated through defaults.

Tooling checked once: Node 24.21.0, npm 11.19.0, complete installed direct dependencies (`npm ls --depth=0` succeeds), Playwright 1.63.0 and its bundled Chromium executable, and licensed Tailwind Plus version `2026-09-13-083323`. No install needed. `rg` is not on PATH; dedicated grep/read tools work, so this is not a blocker. No application test/build or full gate ran in prepare. Spec is Markdown-lint exempt under `_bmad-output`.

## Acceptance and scope

1. The preparation hub links to a canonical readiness review. The review displays the persisted course state and server-authored readiness, with distinct explanations for technical material readiness and educational approval. It never reconstructs these from material rows or the local 4.4 approval ledger.
2. Only an admitted assigned supervisor, with current server `readiness.activation.eligible=true`, may proceed to first activation. Server false, checking, read failure, unavailable or unknown outcome makes activation unavailable. Nonempty local teaching values, material counts, a ready brief, approval observations, and `state=inactive` are not eligibility.
3. Every server prerequisite blocker is visible by stable localized name. Valid same-course field/material blocker links lead to implemented resolution destinations. Unsupported or null destinations remain truthful explanatory rows, not guessed or dead links. The bounded supervisor-presence exception below is explicit.
4. The canonical activation route reviews current course identity and fixed activation consequences. Deliberate confirmation dispatches one contracted POST after current admission and a fresh target review. Changed reviewed facts require review again, even if the latest representation remains eligible. No optimistic active state and no automatic retry.
5. Only a validated definitive `200 CourseDocument` with matching ID and persisted active state confirms this activation. Return to the preparation hub through its normal ordered admission/read, showing its authoritative active state. A newer `active_not_accepting` read remains active but clearly not accepting new sessions. Never equate course active state with this viewer's `new_session.eligible`.
6. Conflict, denial, sign-in loss, CSRF rejection, transport failure, malformed success, Stop waiting and late results have explicit truth-preserving handling. A reconciliation read may report a course is currently active but cannot claim this attempt activated it. No success announcement or success navigation from an ambiguous attempt.
7. Story ends at the authoritative hub. No roster/provisioning link, request, stub, redirect or entry action is added. Story 5.1 owns that surface.

### Exclusions

No deactivation, reactivation, deletion, supervisor assignment management, student session-start action, roster/provisioning, new material processing/approval behavior, approval revision workaround expansion, private-material or link-material creation, downloads, provider settings, MFA, SSE, polling, new runtime dependency, CSP change or global cache/session redesign. No whole-epic preparation.

First activation is deliberately narrower than backend `activateCourse`, which also supports reactivation. Retain authoritative nullable `activated_at`/`deactivated_at` in the preparation projection solely to recognize previously activated/deactivated courses and withhold this story's activation entry. Render their current readiness honestly with existing preparation exits; say reactivation is not available on this surface. This scope restriction never turns backend `eligible=false` into true and never invents a separate lifecycle state. Story 8.2 owns reactivation controls.

## Verified operation map

### Course readiness and persisted detail

`getCourse`: `GET /api/v1/courses/{id}`; path mapping is `mia/api-doc/openapi.yaml#/paths` → `paths/courses.yaml#/course`. There is **no separate readiness endpoint**. Authenticated session, exact `Accept: application/vnd.api+json`, `200 CourseDocument`, `Cache-Control: no-store`, strong ETag. Reuse `getCoursePreparation(id, signal)` for this assigned-supervisor representation and `getCourse` for existing minimized discovery.

`CourseReadiness` requires `state`, `activation`, `new_session`, `blockers`. The four readiness states and stable blocker vocabulary are owned by `schemas/resources/resources.yaml#/CourseReadiness`. `CourseActivationEligibility` requires boolean `eligible`, unique stable action `blockers` and fixed consequences `[activate_course]`. Preparation blockers have stable IDs plus nullable viewer-safe API-resource links. Course lifecycle fields are nullable authoritative instants. Retain only fields needed by preparation; unrelated deletion/logo/student data remain stripped.

GET errors: 401; restricted 403 `auth_password_change_required`; hidden 404 `course_not_found`; 406; 503 `course_readiness_unavailable`. A readiness read failure does not grant eligibility or imply empty blockers.

### Activation mutation

`activateCourse`: `POST /api/v1/courses/{id}/activations`, `paths/courses.yaml#/activations`.

- **No requestBody or request schema exists. Send no body.** Do not fabricate `data`, a state PATCH, empty JSON, client ID, request ID or activation resource.
- Security: session cookie and fresh `X-CSRF-Token` matched to the current readable CSRF cookie. Established `sendUnsafeRequest` sends Accept and adds Content-Type only when a body exists; reuse it.
- Definitive success: `200`, exact JSON:API media type, `CourseDocument`, no-store. Parse the response with the preparation schema; validate matching addressed course ID and `course.state=active`. It may truthfully be `active_not_accepting` following a concurrent material change; do not demand `new_session.eligible=true` or force an accepting label.
- Declared errors: 401; 403 `csrf_invalid` or `auth_password_change_required`; hidden 404 `course_not_found`; 406; 409 `course_invalid_state` (already active) or `course_activation_unavailable` (unmet prerequisites).
- No `If-Match`, ETag parameter, 412/428, version/request-ID precondition or idempotency key is declared for activation. Course GET's ETag belongs to other reviewed mutations, not this one. Do not send or invent one.
- Undeclared 5xx, lost response, abort/Stop waiting, wrong ID/state/media type/status or malformed success are defensive outcome-unknown, not proof of rejection or activation failure.

Concurrency evidence inspected, not executed: `mia/internal/course/course.go::Service.Activate` rechecks assigned scope, current inactive state, supervisors, teaching prerequisites and qualifying material within the write transaction before the active-state update/audit. Its response is a subsequent authorized course GET. Current readiness is computed from source records, not counters (`readiness.go::courseSnapshot/evaluateReadiness`). Thus read-time eligibility is permission to offer the action, never a lock or guaranteed success; concurrent prerequisite loss can reject the POST and post-commit state can differ. Existing backend course/material tests cover prerequisite rejection, readiness transitions, scoped activation and qualifying-material approval; no claim of exhaustive concurrent or release evidence.

## BCG reconciliation and settled decisions

- **BCG-011:** The historical missing-readiness finding no longer describes current GET or activation's returned CourseDocument. Current transport provides all fields needed for assigned-supervisor readiness review/first activation, operation-specific rejection and persisted reconciliation. This story authorizes only that slice under the supplied batch policy. During implementation add a dated Story 4.5 slice reconciliation to BCG-011 and matching machine 12, Prepare surface and CP-03 notes; retain the existing 4.2 decision and all wider student-start, deactivation/relationship, concurrency, supported-browser/manual and release obligations. Do not mark BCG-011 globally closed or CP-03 Pass.
- **BCG-014:** Activation is not one of its inventoried effect-changing mutations. Its only committed effect is activation and the backend rechecks prerequisites. No atomic content-version or ETag promise is made; a frontend reread is not represented as a transaction lock. No new backend precondition request is needed for this fixed-effect story.
- **BCG-001/003/005/007:** Reuse implemented session/capability/scope, non-refreshing reads, no-store/teardown and exact collapsed error disclosure. No stage probing, new discovery contract or privacy relaxation. Wider release evidence remains open.
- **4.4 interim decisions:** Approval observation ledger and generic authorized material collection remain unchanged. Neither is evidence of course activation eligibility. Route readiness points to material work, never counts the generic collection or invents an approved-material endpoint.
- **Actionable-link boundary:** learning goals, instructions and language map only an exact same-course API course link to the implemented canonical teaching route. Qualifying material maps only an exact same-course `/api/v1/courses/{id}/materials` link to its implemented material list. That list leads to existing processing/brief/approval routes for the deliberately chosen course-wide material. Arbitrary external, cross-course, query/hash, malformed or null link text never becomes an href or a fetch. Keep the separately authorized general Materials hub link; it is not a guessed resolution for an invalid blocker link.
- **Supervisor-presence exception:** Existing courses must keep a supervisor, and this surface requires an actual assigned supervisor. No supervisor-assignment resolution destination exists in the implemented client. If the backend reports this blocker, show it, disable activation, and explain that an administrator must resolve assignment; do not link to unimplemented `/supervisors`, label administration detail as a resolver, fetch names, or add assignment controls. This is the authorized implemented-destination boundary, not full FFR-302 closure for future assignment surfaces. No backend transport request is needed: the missing destination is frontend scope, not missing API.
- **Reactivation boundary:** Use the contracted lifecycle instants to exclude previously activated courses from these new controls; no guessed lifecycle or deletion/deactivation feature is added. Normal inactive first activation still requires server activation eligibility.
- **Provider policy:** Configured default worker/reviewer/solver `#high` models and protocol Mistral fallback are active in the runtime catalog. Current batch rotation is OpenAI → `kimi-code/k3` → Anthropic, sticky after switch. K3 has `high`; Anthropic active IDs are available but the checkpoint does not pin an exact model, so solver must select one explicitly if reached. No observed provider 429. On an observed 429 stop immediately; do not retry or launch a replacement worker from here.

No unsettled product/transport decision, backend request draft or owner question is required for this bounded slice. Catalog availability does not prove quota. Spec approval does not substitute for implementation review/verification.

## Routes, gates and existing owners

Add only the two canonical route records to `entryRoutes.tsx`, its preparation key/parser list and trusted path construction:

- `/prepare/courses/:courseId/readiness`: title/H1 Course readiness; parent preparation hub; fallback hub.
- `/prepare/courses/:courseId/activate`: title/H1 Activate course; parent readiness; cancel/ineligible recovery to readiness; definitive success to preparation hub.

Use existing `Prepare(courses)` dispatch and exact `courses.supervise.scope.course_ids`. Ordered admission is authoritative authenticated session → current capability/scope including exact course ID → course GET/readiness → protected title/shell/feature. An administrator role or known ID is insufficient. Do not read material lists, brief content, files, jobs, supervisors or students merely to admit readiness or activation.

Direct entry, Reload, Back/Forward and hub navigation use the same resource gate. The activation surface may render truthful unavailable/incomplete/already-active/previously-activated state with readiness/hub exits, but no actionable confirmation until server eligibility and this story's first-activation scope hold. Missing scope falls back safely without a course request. Hidden denial clears course identity, state, breadcrumbs and title before the fixed existing unavailable treatment; expired/restricted/CSRF-loss transitions belong to the session owner.

Reuse `CourseResourceHost`, `PrepareCourseRoute`, `CourseRouteProps`, `getCoursePreparation`, `readAuthenticated`, `runAuthenticatedMutation`, `useRouteActivity`, route-departure guard, announcer and `TechnicalErrorDisclosure`. Separate readiness and activation resource variants instead of treating their route names as teaching fields. Extend existing links with trusted readiness/activation builders. No new authentication/session owner or catch-all mutation framework. Final pre-dispatch target read and current account/capability/scope/security epoch check belong to the existing admitted session owner: route admission already rereads session/capabilities; a target read does not independently discover a stage or renew idle expiry. If admission changes, discard confirmation and require explicit current route review, not a remembered submission.

Extract the existing preparation checklist into one presentation owner because hub/review/confirmation need the same stable blocker and safe link semantics. Keep the course-state rendering owner reusable. Do not relocate unrelated teaching-field or material lifecycle code. Only first-activation feature state needs new infrastructure: a route-local activation hook plus these route/resource descriptors and a richer validated preparation projection.

## Readiness projection and presentation block

Extend `preparationSchema` and `CoursePreparation` to validate/retain activation's `eligible`, action blockers and consequences, and nullable lifecycle instants. Keep `new_session` separate and unused by activation; current server readiness vocabulary already supplies the course-wide accepting/not-accepting label. Do not use the viewer's membership-dependent `new_session.eligible` as the hub's course acceptance status. Do not add compatibility defaults for old fixtures.

Validate duplicates, unknown IDs, action consequence vocabulary and addressed ID. Reject internally inconsistent eligibility/action blockers or incompatible lifecycle/readiness/activation combinations as protocol failures with activation unavailable; this is integrity validation of server facts, not evaluating prerequisites from fields or material. An explicit `activation.eligible=false` must never be overridden by readiness state or an empty display blocker array.

The shared checklist shows stable prerequisite labels, concise unmet state and only trusted resolution targets. Never mark a specific material technically ready/approved based on aggregate course eligibility. Explain that qualifying material needs both technical readiness and separate educational approval, with the implemented material chooser for details. It need not enumerate materials or display five locally synthesized passed rows. Server empty blockers produce the existing no-blockers text, never substitute eligibility.

Hub preserves teaching/material entries and Last checked, adds readiness review, and exposes first-activation navigation only when authorized. Review exposes the same checklist plus clear availability/active acceptance text and a first-activation entry only when allowed. Refresh uses existing explicit admission/read discipline; no background requests, timers, polls, EventSource or push claims.

## Activation and ambiguity block

Implement a route-local discriminated operation state alongside machine 12, not new course domain states:

- Available/reviewing: admitted server facts; confirmation page with scope and fixed consequences.
- Pre-dispatch checking: one fresh course GET in the current session/security/scope epoch; confirm unavailable while checking. Compare reviewed course ID/name/lifecycle and server readiness/activation blockers/consequences. Changed facts install newest truth, clear review confirmation and require another deliberate review/submit; failed read sends no POST. Do not compare unrelated description/curriculum bytes or material-row counts.
- Destructive in flight (consequential operation state, not deletion): exactly one POST through the session owner; all duplicate confirmation paths locked. React form Action/useActionState owns submission and immediate pending state; no second click handler dispatch.
- Rejected/not-sent: localized operation error; no active/success claim. 409 eligibility or already-active conflict invalidates old eligibility and permits only fresh authoritative review/reconciliation before another attempt. Definitive rejection can trigger its foreground course reread; if that read fails keep activation unavailable and retain rejection truth.
- Outcome unknown: lost/5xx/malformed success or Stop waiting after dispatch; no success, no automatic navigation/retry. Explicit Refresh reads course truth, retains the unconfirmed-attempt distinction. A now-active read says only currently active, with hub exit; it never announces that this attempt succeeded. A now-inactive read cannot prove the operation was never committed/deactivated elsewhere: old attempt remains unknown until explicit **Abandon unknown attempt**, then full current review for a new activation.
- Definitive success: validated original response installs active truth, announces at most once through the existing owner, then navigates to the hub without protected history state. Hub ordered re-admission/GET determines its current display. If hub read fails, show check failure without retracting the definitive activation or falsely claiming current accepting state.
- Access lost/teardown: current-resource denial is terminal even after Stop waiting; drop course/action/error/review references and feature UI through host/session teardown. Other old/unmounted/obsolete results cannot mutate or navigate.

`Cancel` is an authorized parent exit before dispatch only. If a Stop waiting affordance is provided during checking it cancels only local pre-dispatch waiting and prevents any subsequent POST; after dispatch label it **Stop waiting**, enter unknown and fence ordinary late success/rejection so it cannot resolve the retired attempt. Never claim server cancellation. Session owner still tracks settlement for logout. Do not install a per-feature unsafe retry or abort mechanism that bypasses it.

Reconciliation and post-mutation reads are explicit foreground work in the current epoch. Ordinary lifecycle signals only mark revalidation needed/retain the privacy shield. Unknown attempts live only in page memory; Reload/departure destroys them and subsequent admission shows persisted course truth without restored attempt/success claims. Use established departure treatment for an in-flight/unknown attempt; security teardown overrides it. There is no exact-retry action: activation has no contracted request ID/payload replay identity.

## Exact blueprint bindings

Licensed source retrieved/read through the Tailwind Plus skill, version `2026-09-13-083323`, `v4/react-light.jsx` only:

- Shared checklist/hub/readiness rows: `Application UI/Data Display/Description Lists/Left-aligned with inline actions` (existing 4.2 binding). Adapt semantic prerequisite text, safe trusted links, stacking/wrapping and action targets; no pretend applicant fields, attachment samples or truncation.
- Activation confirmation action panel: `Application UI/Forms/Action Panels/Simple`. Adapt subscription copy to course identity, fixed activation effect, preparation/unknown feedback, a native form Action and wrap-safe submit/parent controls. Use h2 beneath route h1 instead of sample h3. This is a full canonical confirmation route, not an invented modal.
- Existing shell, route heading, parent links, course status and error disclosure retain their established blueprint bindings. No new styled banner, badge, tooltip or dialog is required. If an existing departure dialog is used, retain its existing exact binding and focus contract.

Record identity, version and MIA deltas at each adapted presentation owner. Never copy the licensed library into artifacts or commit `tailwindplus/`. Skill's historical React/Tailwind version prose is stale; package pins and scoped stack rule govern.

## Localization, accessibility and security

All new labels, titles/H1s, activation consequences, unavailable/previously-activated explanations, pending/change/conflict/unknown/abandon feedback and announcements use `messages.ts` plus all seven catalogs. Reuse stable prerequisite/readiness messages. No English fallback or concatenated translated fragments. `<html lang>`/LTR root follow existing intl owner; course names use `<bdi>`, technical IDs stable LTR and raw backend text stays untranslated inert text.

Exactly one main/h1; title before focus/announcement; canonical parent exits; standard keyboard submit/links; 24px targets, visible non-obscured focus and no color-only readiness. Status heading gets focus for changed review, rejection or unknown corrective action, without live raw-body disclosure. Initial state is silent, pending/success polite once, actionable failure/unknown urgent once; Refresh unchanged only updates Last checked silently. Do not duplicate success between original response, navigation and hub mount.

Reflow direct 320px and 1280px/400% zoom in every text mode, every surface at 200%, spacing overrides, forced colors and reduced motion; long translations/untrusted mixed direction cannot introduce page-level horizontal scroll. No progress percentages, visually hidden duplicate labels or live checklist rerender noise. Native confirmation form is sufficient; no typed-name friction, acknowledgement checkbox or new modal is imposed by this non-deleting operation.

Use no-store and same-origin credentialed API owner. No protected storage/URLs/history.state, no prefetch, telemetry, raw response logs or provider calls. Route-local attempt symbols and announcement ledgers contain no retained protected bodies. Exact technical disclosure is collapsed by default, escaped/selectable/wrapped and excluded from announcements; do not invent enriched errors. Current security/scope epoch fences all reads, POST callbacks, future navigation and stale names. Do not request roster, personal identity, material source, generic users or protected fields outside this projection.

## Explicit implementation manifest and symbol map

This is the bounded allowlist for implementation; prepare itself writes only this spec and its ignored report. Existing bookkeeping is never part of the application diff. Solver-approved sprint/checkpoint files, if later authorized for commit, are a separate manifest.

### Existing application owners to update

- `src/platform/api/courses.ts`: preparation schemas/projection, safe blocker resolution metadata, lifecycle scope and bodyless `activateCourse` adapter; preserve minimized `getCourse` and teaching PATCH behavior.
- `src/app/routes/entryRoutes.tsx`: canonical readiness/activation records, preparation keys/resource union/parser and trusted path construction.
- `src/app/routes/PrepareCourseRoute.tsx`: discriminate hub/teaching/readiness/activation admitted resources, never pass action names as teaching fields.
- `src/app/routes/AdminCourseRoute.tsx`: exhaustive admin resource exclusion and new trusted link props only; no admin activation authority.
- `src/features/courses/CourseRouteProps.ts`: explicit preparation/readiness/activation resource and link types.
- `src/features/courses/CoursePreparationRoute.tsx`: share checklist/status presentation; readiness navigation and eligible first-activation entry; preserve existing destinations.
- `src/platform/i18n/messages.ts`.
- `src/platform/i18n/catalogs/en-US.json`.
- `src/platform/i18n/catalogs/de-DE.json`.
- `src/platform/i18n/catalogs/es-ES.json`.
- `src/platform/i18n/catalogs/es-AR.json`.
- `src/platform/i18n/catalogs/fr-FR.json`.
- `src/platform/i18n/catalogs/pt-PT.json`.
- `src/platform/i18n/catalogs/pt-BR.json`.

### New scoped application files

- `src/features/courses/CourseReadinessChecklist.tsx`: presentation-only stable blocker labels/trusted destinations, exact description-list binding shared by three surfaces.
- `src/features/courses/CourseReadinessRoute.tsx`: admitted review/checklist/state/navigation, explicit Refresh.
- `src/features/courses/CourseActivationRoute.tsx`: canonical first-activation confirmation panel and operation-state presentation.
- `src/features/courses/useCourseActivation.ts`: one route-local preflight/POST/reconcile/abandon owner with discriminated states, epoch/attempt fencing and announcements; not generic mutation infrastructure.

### Tests and evidence inputs

- `src/platform/api/courses.test.ts`: exact activation wire contract, richer readiness validation and safe link fixtures.
- `src/app/routes/coursePreparation.test.tsx`: prerequisite fixture shape and hub links; preserve existing teaching-field tests.
- `src/app/routes/courseActivation.test.tsx` (new): connected review/admission/action/recovery/negative tests.
- `src/app/routes/routeNavigation.test.tsx`: only applicable route registration/parent/focus regressions.
- `src/app/routes/materialPreparation.test.tsx` and `src/features/materials/materialLifecycle.test.tsx`: update shared course fixture to current contracted activation/lifecycle shape only; no material behavior expansion.
- `e2e/courseFixtures.ts`: independent server course state/readiness/action eligibility/lifecycle controls, bodyless activation dispatch counts/outcomes/delayed races; never derive the client behavior fixture from local fields.
- `e2e/coursePreparation.spec.ts`: replace prior no-activation scope assertion as applicable, keep teaching coverage.
- `e2e/courseActivation.spec.ts` (new): first-activation journey, conflict/unknown/lifecycle/focus/a11y/localization.
- `scripts/secret-hygiene-evidence.ts`: register activation unit/browser checkpoints for existing deliberate-failure scan. Reuse `routeSecretHygiene`/boolean assertions and no-capture test setup; no new runner or raw report output.

### Reporting and slice consistency

- `_bmad-output/implementation-artifacts/spec-4-5-activate-the-ready-course.md`: scoped implementation progress and evidence references after each completed block.
- `_bmad-output/planning-artifacts/ux-designs/ux-mia-frontend-2026-09-12/BACKEND-CONTRACT-GAPS.md`: dated BCG-011 slice decision, not global closure.
- `_bmad-output/planning-artifacts/ux-designs/ux-mia-frontend-2026-09-12/FRONTEND-STATE-MACHINES.md`: machine 12 slice note consistent with BCG-011, no new domain states.
- `_bmad-output/planning-artifacts/ux-designs/ux-mia-frontend-2026-09-12/SURFACE-STATE-MATRIX.md`: Prepare slice note only.
- `_bmad-output/planning-artifacts/ux-designs/ux-mia-frontend-2026-09-12/ACCESSIBILITY-ACCEPTANCE.md`: CP-03/activation slice evidence disposition (Not run until executed, bounded automated result afterwards), preserve manual/release obligations.

No generated API/dependency/config/script changes are needed: generated types already include activateCourse and readiness. If implementation reveals a genuinely required additional file, report the concrete reason and reconcile the manifest with solver before broadening; do not edit App/session/platform infrastructure speculatively.

## Targeted checks and evidence plan

### API/protocol and state tests

- GET readiness uses existing course endpoint and no-store. True/false activation eligibility is independent of empty display blockers; missing/malformed activation or lifecycle shape is unavailable, not permissive. Validate server-fact contradictions without calculating prerequisites.
- POST exact path/method, no body/Content-Type/If-Match/request ID, current CSRF, exact 200/media type/matching ID/active state; no retry after loss/5xx/incorrect success.
- All stable prerequisite IDs render; only exact same-course field/material links navigate. Null, external, cross-course, hash/query and hostile links cause no href/request. Supervisor-presence has truthful no-link administrator guidance. No material list read merely for eligibility.
- Fresh scope before dependent course request; no requests/UI for anonymous/restricted, unavailable capability, unrelated scope or administrator-only authority. Direct/Reload/Back entries and previously-activated scope exclusion send no activation POST.
- Preflight unchanged permits one explicit dispatch; teaching/material/approval/identity/readiness/lifecycle changes reported by course GET invalidate confirmation; preflight denied/unavailable sends none. Post-preflight concurrent prerequisite loss produces 409, current review and zero optimistic success.
- Definitive 200 active_accepting and active_not_accepting both retain correct persisted active state; hub GET can return newer not-accepting or fail without invented accepting state or replay.
- Duplicate clicks/form submissions count one POST. Lost response while server persists active, 5xx, malformed success and Stop waiting remain unknown; explicit read reports current state without attempt attribution. Inactive reconciliation requires explicit abandonment before new review. Old stopped/unmounted results cannot show success/navigate; current hidden denial still tears down.
- Logout/expiry/CSRF/scope loss while preflight/POST/reconciliation pending destroys feature identity and future dispatch, including late callbacks. Lifecycle return sends no automatic GET/POST and privacy shield remains until explicit recovery. Reload does not restore attempt state from storage/history.
- One feedback announcement per attempt/state; old success/failure retired at new attempt, unchanged Refresh silent, raw backend body absent from announcement and process artifacts.

### Connected browser and accessibility tests

Use controlled protocol fakes, synthetic protected fixtures and bundled Chromium only. Connect material approval→hub/readiness→activation→fresh hub as the supervisor journey, with 4.4 fixture server readiness changing independently; no paid provider or full material redesign. Exercise each blocker resolution destination and incomplete action unavailability.

New readiness/activation and active hub states get axe scans and semantic/title/main/h1/parent/keyboard/focus checks; first activation succeeds using keyboard only. Cover all seven locales × three text modes at direct 320px, both new surfaces at 200% and 1280px/400% × text modes, spacing/forced-colors/reduced-motion and mixed-direction long course/error text. Scanner findings have no blanket suppression. Test stable unknown/rejection and safe unavailable states, disabled action geometry and technical disclosure wrapping.

Use boolean/redacted assertions, no snapshot of protected content, trace/video/screenshot off and existing hygiene fixture helpers. Add activation checkpoints to the deliberate-failure artifact scan; assert no protected names/raw body/CSRF fixture leaks. Record content-free command/version/results, not test bodies or payloads. Manual Chrome/Edge/Safari/AT evidence remains owner release work, not automated Pass.

### Execution order

During implement run sequential focused checks: `npm run typecheck`, `npm run lint`, targeted Vitest files (API, preparation, new activation, fixture-affected material regressions), `npm run check:i18n`, and targeted bundled-Chromium browser cases with one shared prepared build as applicable. No overlapping checks and no full gate or commit in implement. After implement/fix, write complete scoped tracked+new-file diff excluding baseline bookkeeping and content-free logs to `tmp/agent-execution/4-5-activate-the-ready-course/`; reviewer depends on that actual diff.

Verify phase inspects final diff and runs `./run-all-tests.sh` once for final executable inputs, records full baseline plus input fingerprint including new files, commands/results/logs/skips, and preserves manual limitations. Do not independently run build/tests concurrently with the gate or imply missing components passed. Preparing only these reporting files requires planning consistency, not application tests; exempt Markdown needs no lint invocation.

## Risks and open decisions

Main risks: stripped action eligibility in existing preparation parser; old incomplete fixture schemas; mistaking viewer new-session eligibility for course acceptance; incorrectly mapping arbitrary blocker links; stale confirmation races; success claims after unknown reads; global parent refresh destroying route-local ambiguity; accidental previously-deactivated reactivation; and adding a future roster link at story completion. The blocks and tests above address them explicitly.

Open decisions: none for this bounded slice. Unsupported supervisor-assignment resolution, broader BCG-011/action/manual evidence and Story 8.2 reactivation remain explicit exclusions, not passed requirements. Existing bundle limit `256000` gzip bytes and seven-language precedent stay unchanged; no new dependencies or budget relaxation.

## Completed preparation blocks

1. Read checkpoint first; baseline/status and pre-existing work reconciled, no application overlap.
2. Read rules/binding companions and committed prerequisites; verified current GET/POST schemas, authorization, CSRF, errors, absence of activation precondition and transaction behavior.
3. Reconciled bounded BCG-011/014 slice and implemented-destination/first-activation boundaries without backend invention; no request draft or owner intervention needed.
4. Checked tooling/Chromium/blueprints and runtime model catalog once; no install/network retry or provider 429 observed.
5. Wrote this bounded spec and prepare report. No implementation, tests/build, staging, commit, checkpoint or sprint modification.

## Implementation progress

1. Transport/projection and routing block implemented: bodyless activation adapter, validated server activation/lifecycle facts, exact safe blocker destinations, canonical readiness/activation routes through existing ordered admission owners. Existing fixtures updated without permissive defaults.
2. Presentation/operation block implemented: shared licensed checklist, readiness review, hub entries, first-activation-only confirmation and route-local preflight/dispatch/reconciliation/abandonment. Session owner retains unsafe settlement; local Stop fences ordinary late results, not applicable denial. No roster/reactivation/deletion entry added.

Early bundle measurement: existing production artifact is 255860/256000 gzip bytes (140 bytes headroom). New seven-language copy cannot fit this margin. The owner-authorized bounded mitigation extends existing build-time descriptor/catalog packing into separate lossless string columns (including regional override indices/values), preserving public identities/defaults, all seven complete catalogs and synchronous switching. The English catalog already derives from descriptors in the existing owner; an initially attempted redundant build-time English transform was removed. Explicit mitigation manifest additions: `scripts/message-catalogs.ts` and `src/app/App.tsx`. The latter lazily loads existing course/invitation resource hosts under the same ordered admission and existing neutral recovery/Suspense pattern; no request or protected prefetch occurs on module load. Existing packing/catalog/admission/invitation regression owners verify these changes without new dependencies, CSP changes or session-owner redesign. Latest measured production input: 255414/256000 gzip bytes.

3. Focused regression block implemented: API validation/wire checks and 27 connected activation tests plus new bundled-Chromium journey, lifecycle/unknown/rejection, locale/reflow/zoom/axe cases. Updated prerequisite fixtures and exact-scope route regression; deliberate-failure activation checkpoints reuse the existing hygiene runner. Concrete inventory correction: browser checkpoints actually belong to `scripts/route-secret-hygiene-cases.ts`, not the spec's unit inventory owner alone, so that existing registry is an additional scoped manifest path. No new runner. These three necessary manifest additions follow the owner's bounded mitigation authorization and actual hygiene-owner correction; solver/reviewer must reconcile them before commit.
4. Added dated bounded BCG-011, machine 12, Prepare surface and CP-03 notes, preserving wider blockers and manual/release obligations. Initial typecheck/lint/i18n and focused units pass. Initial Chromium harness errors were corrected without changing CSP: existing material fake for implemented resolution, inline style-attribute spacing overrides, and a bounded 120-second allowance for the existing 105-navigation locale regression (its previous 60-second deadline expired). No application invariant was relaxed. Final focused check evidence is pending below.

5. Focused Chromium block passed: 50 tests (38 activation, 12 prerequisite preparation), including all seven locales × three text modes on both new surfaces at direct 320px, real 200%/400% zoom × text modes, spacing, forced colors, reduced motion, keyboard activation and axe without exclusions. Success announcement is counted once; active-not-accepting and failed authoritative hub read are tested. Existing 105-navigation locale regression passes with its bounded timeout.
6. Focused deliberate-failure hygiene passed: 9 actual unit tests / 10 checkpoints and 38 actual activation browser tests / 50 checkpoints; both early-failure canaries rejected, original full output/artifacts scanned with zero marker leaks. Existing runners needed the new activation scope and actual-test inventory/config registration. Additional necessary manifest paths: `scripts/check-secret-hygiene.mjs`, `scripts/check-route-secret-hygiene.mjs`, `playwright.route-secret-hygiene.config.ts`. Along with the three paths recorded above, these bring the implementation manifest to 39 files. There is no new runner or captured protected test body.
7. Duplication root causes resolved by reuse, not threshold/marker suppression: existing submit semantics remain in AuthSubmitButton; hub/readiness explicit admission refresh has one shared presentation owner. JSCPD reports zero clones with unchanged thresholds and balanced existing markers. Server action-only prerequisite blockers remain visible with stable labels and no guessed resolver, even when the separate display-blocker list is empty.

Final focused results and commands: `tmp/agent-execution/4-5-activate-the-ready-course/implement-report.json`; scoped files: `manifest.json`; complete tracked-plus-new review patch: `story.diff`. The production build used for the final 50-test Chromium and hygiene runs measures **255413/256000 gzip bytes**, retaining all seven languages (587 bytes headroom). No new backend gap/RFC, dependency, CSP, optimistic state, automatic unsafe replay, roster entry, reactivation control or protected persistence was introduced. Batch bookkeeping remains untouched. Actual model is OpenAI GPT-6.1 Sol; selected variant is not exposed by runtime metadata. No observed provider 429.

Final static/unit block: typecheck, typecheck-coverage canaries, lint/architecture, scoped Prettier, seven complete ICU catalogs, diff whitespace and balanced duplication markers pass. Focused units pass **172 tests in 10 files**, including the existing invitation regression owner for the lazy-host mitigation and lossless production packing/catalog parity. Trivy secret-only offline scans of source, scripts and the affected hygiene configuration report zero secrets; vulnerability/audit/full-gate components are deferred to verify, not claimed passed. Static privacy review found only public locale/text preferences in the browser harness and existing content-free check output. Content-free evidence lives beside the implementation report; no raw scan bodies were retained.

Next: solver reconciles the six concrete mitigation/hygiene manifest additions and dispatches independent review, then a separate final authoritative-gate phase. No full gate, tracking edits, staging or commit ran here; manual supported-browser/AT and wider release evidence remain outstanding.

## Review repair progress — R1

Registered all 27 connected secret-bearing activation unit cases (including every parameterized outcome and denied admission case) plus the existing three API cases in the established deliberate-failure inventory. Added end-of-behavior checkpoints to the five standalone tests that lacked them; existing checkpoints cover the other omitted cases. The existing runner, original-output/artifact scan, and early-failure rejection remain unchanged. This repairs a verification coverage gap, not a demonstrated leak or application defect. Expanded scope: 30 actual tests and 35 test/checkpoint probes, plus the existing early-failure canary. No full gate or bookkeeping changes authorized in fix.

Sequential focused repair checks passed: `MIA_SECRET_HYGIENE_SCOPE=activation-unit node scripts/check-secret-hygiene.mjs` verified all 30 tests / 35 checkpoint probes with zero marker leaks and early-failure rejection. This supersedes the incomplete 9-test / 10-checkpoint implementation evidence above. Existing activation browser hygiene also passed 38 tests / 50 checkpoints and rejected its early-failure canary using the unchanged implementation build. Unit smoke passed 35 tests in the connected activation and course API files; typecheck, lint/architecture, scoped Prettier, whitespace, and offline Trivy secret scans of scripts/source passed. No application, runner, dependency, config, or product behavior changed. Focused input evidence and the complete actual-test-to-checkpoint inventory are in `tmp/agent-execution/4-5-activate-the-ready-course/fix-report.json` and `fix-activation-unit-inventory.json`; raw failure streams/artifacts were scanned by the existing runners and removed, not retained in reports. Actual worker remains `openai/gpt-6.1-sol`; variant is not exposed. R1 disposition: repaired, ready for re-review. Final authoritative verification is still a separate phase.

## Final verification

Supplied re-review persisted verbatim in `tmp/agent-execution/4-5-activate-the-ready-course/rereview-report.json`: verdict pass, R1 cleared. Ran `./run-all-tests.sh` exactly once from the repository root, sequentially to completion, with one production build reused within that gate. Exit code 0; all 17 stages completed; no skipped components. Passed 803 unit tests in 38 files and 252 bundled-Chromium tests. Full hygiene verified 101 actual course unit tests / 151 checkpoints and 125 actual route browser tests / 249 checkpoints, zero marker leaks and rejected early-failure canaries. Initial-route JavaScript: 255413/256000 gzip bytes; seven complete ICU catalogs; zero duplication clones.

Pre/post application, test, script, configuration and dependency inputs (238 tracked and new files) have the identical SHA-256 fingerprint `2bbbc574a3ae390a4e2e184c4e32a51c60cbf0905159c14f5bfab3fd3040d89e`; baseline/HEAD remains `1c1e62d211816dd4eb34f705030502859b078ea4`. Evidence, stage results, timestamps, fingerprints and logs are recorded in `tmp/agent-execution/4-5-activate-the-ready-course/verify-report.json`, with the full gate log at `verify-full-gate.log` beside it. Only reporting notes changed after verification; no executable input changed.

Non-blocking findings are retained, not suppressed or claimed clean: npm audit reports four low-severity KaTeX-chain vulnerabilities (high-severity threshold passed); Trivy reports one LOW KaTeX vulnerability and one MEDIUM SendGrid-pattern detection on a dotted country-code sequence in the generated invitation chunk, with scan exit 0. Vite's large-chunk warning and jsdom's unsupported document-navigation diagnostic are recorded. No fixes or dependency changes were made in verify. Automated checks are not release certification; supported-browser/assistive-technology manual evidence and wider release obligations remain outstanding. Actual worker: `openai/gpt-6.1-sol`; selected variant is not exposed. Bookkeeping preserved, nothing staged or committed. Next action belongs to solver: prepare commit-pending from passed review and current verification evidence.
