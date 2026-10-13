# Story 6.5 — Finish and show the completed transcript

Phase: **implement**. Status: **implementation complete; review and final gate pending**. Baseline
`61df24ef7361981c8ee16ee86eb7d97e320e3c24` (Story 6.4). The solver owns
the pre-existing, untracked `execution/6-5-finish-and-show-the-completed-transcript.yaml`
and sprint tracker; neither was edited here.

## Preparation progress

- Block 1 complete (2026-10-13): inspected HEAD, staged/unstaged diff and all
  untracked paths. HEAD is the 6.4 commit; staged diff empty. Existing workflow,
  rules, tracking, scripts and checkpoint edits are user/solver work, with no
  overlap in the proposed application/spec manifest. Preserve them untouched.
- Block 2 complete: runtime catalog confirms active `openai/gpt-6-sol#high`
  and active `mistral/mistral-medium-2604#high`. Catalog presence is not quota
  or a paid execution test; no benchmark call made.
- Block 3 complete: `npm ls --depth=0` succeeded; Node 26.8.2/npm 11.19.1,
  installed Vite and Playwright's executable bundled Chromium 1243 are present;
  licensed Tailwind Plus library version `2026-09-13-083323` is present. No
  install required. Existing built manifest measures **257,818 / 258,000**
  initial-route JavaScript gzip bytes, leaving **182**.
- Block 4 complete: checked Story 6.5, 6.1–6.4 specs, current OpenAPI,
  tutoring schemas and backend service/handler, BCG-012, UX machines §8
  and settled §3/§4/§7 notes, route inventory, accessibility AC-013/CP-05,
  security, Flow 1, surface matrix and PRD. The finish operation and atomic
  current-work eligibility exist; no missing 6.5 transport field is found.
  The historical BCG-012 “blocked” heading is not global closure: add a dated
  finish-slice evidence note only after the consumer/browser proof exists.
- Block 5 complete: mapped the existing owners below and measured a **synthetic
  estimate**, without changing source: appending a representative short
  seven-locale Finish key to the existing entry chunk adds 93 gzip bytes;
  four representative Finish/confirm/checking/unknown keys add **307** bytes
  (125 beyond the former 182), **before** route/API/shared descriptor code.
  This is not a production-build result for future code. Existing first-paint
  catalogs cannot simply be deferred in this story.
- Block 6 complete: identified two blocking decisions: budget headroom and
  completed-history destination. Pushover owner alert sent once, exit 0.
- Block 7 complete (2026-10-13): owner raised FFR-955 to **260,000 gzip bytes**
  and approved completed transcript in the existing workspace route. Updated
  only the bundle limit and appended its dated rationale at the enforcement
  point; added the dated scoped exception at the Completed-Session History /
  Completed Session inventory entries. The prior built input now has **2,182
  bytes** headroom (257,818/260,000); the 307-byte synthetic copy sample
  would leave about 1,875 before any additional initial-route code. Actual
  headroom for final source still requires a new production build. No history
  route is introduced here; full history/deep links are Story 8.4.
- Block 8 complete: aligned acceptance, route/API manifest, exclusions and
  targeted checks with both owner rulings; checked baseline and scoped diffs,
  including new spec, for whitespace and contradictions. No application
  source/test implementation has begun. The new bundle-script input is not
  final-gate verified in prepare; verify owns the authoritative gate once
  final story code is available.

## Authority and verified contract

Binding: `_bmad-output/planning-artifacts/epics.md` Story 6.5 and
`_bmad-output/planning-artifacts/ux-designs/ux-mia-frontend-2026-09-12/`:
`FRONTEND-STATE-MACHINES.md` §§5–9/13 (including 6.4's dated §3/§4/§7
exceptions), `ROUTE-INVENTORY.md` Finish Session and the 2026-10-13 scoped
Completed-Session History / Completed Session exception,
`EXPERIENCE.md` Flow 1 steps 9–10, `SURFACE-STATE-MATRIX.md` Tutoring workspace
and Learning history, `FRONTEND-PRD-FOUNDATION.md` FFR-601/603–605,
`SECURITY-PRIVACY-ACCEPTANCE.md` least-data/lifecycle/teardown,
`ACCESSIBILITY-ACCEPTANCE.md` AC-013 and CP-05/A05, and
`BACKEND-CONTRACT-GAPS.md` BCG-012. Reuse the 6.1–6.4 specs; do not
duplicate their send, stream, stop, retry or retention lifecycle.

`mia/api-doc/openapi.yaml` references `mia/api-doc/paths/tutoring.yaml`:

- Owner-only, non-refreshing, no-store
  `GET /api/v1/tutoring-sessions/{id}/current-work` gives atomic
  `TutoringWorkDocument` (`resources.yaml#/TutoringWorkActions.finish`,
  `session_state`, `state`, generating and queued identities). `finish` is
  server-authored; `state=idle` and no queued/generating work are necessary,
  not a substitute for its action. The implemented projector currently strips
  `finish`. `200` success; `401`, `403`, hidden `404`, `406`, malformed-query
  `422`. Do not derive eligibility from paginated turns, SSE or a trial POST.
- `POST /api/v1/tutoring-sessions/{id}/completion` requires authenticated
  cookie + fresh CSRF header; **no request body**. Definitive **200** is
  `TutoringSessionCompletionDocument`: completed session `data` and an
  authoritative `links.current_work` (no query). `401`/`403`/`404`/`406`;
  **409** `tutoring_invalid_state` (already completed) or `tutoring_busy`
  (queued/generating work). Backend `mia/internal/tutoring/service.go`
  `Complete` checks owner/state and persisted queued/generating responses,
  then transactionally marks completed and enqueues summary generation.
  `handler.go` responds 200 with the completion resource and current-work
  link. Never replay POST automatically or imply a lost response succeeded.
- `GET /api/v1/tutoring-sessions/{id}` returns authoritative `active` or
  `completed` plus nullable summary/follow-up and separate
  `summary_lifecycle` (queued/generating/automatic-retry-scheduled/generated/
  supervisor-corrected/terminal-failure/unavailable). If summary metadata
  is displayed in this slice, project that lifecycle minimally and label it
  separately from session completion; never infer failure from null summary.
  This slice does not show summary metadata or text. Regeneration is
  supervisor-only and excluded.
- `GET /api/v1/tutoring-sessions/{id}/messages` returns paginated
  `TutoringTurnCollectionDocument`; owner may read persisted turns after
  completion. Reuse existing `listSessionTurns` and locked `ModelMarkdown`.
  Do not display partial local stream data as a finished transcript. Backend
  `Messages` returns persisted message/response attempt pairs ordered by
  sequence/attempt; `createStudentMessage` rejects completed sessions.

## Acceptance mapped to story bullets

1. **Finish only when permitted:** show Finish on admitted owner active
   workspace; enable only for fresh work with `actions.finish=true`, idle,
   no generating response and no queued message, and no unresolved send,
   Stop or retry operation. The canonical `/learn/sessions/:sessionId/finish`
   review/confirmation route does not itself authorize dispatch.
   Prevalidate session stage → account/capability/scope → addressed session →
   current work immediately before enabling Confirm (§8), clearing any prior
   typed confirmation on changed truth. On busy, denied or unknown work,
   leave Finish disabled and explain the action-specific state. No
   force-finish, abandonment, discard or delete-session substitute.
2. **Definitive transition:** one explicit completion POST; only the validated
   original 200 completed resource can attribute success to this attempt.
   On 409 refresh session/current work and show new work or completed truth
   without claiming the rejected POST succeeded. On transport loss/abort,
   Stop waiting enters outcome unknown; explicit non-refreshing ordered
   reconciliation of session plus current work may establish the resource's
   completed state, not whether this attempt caused it. Never auto-replay.
   Return to the **same** `/learn/sessions/:sessionId` workspace after the
   definitive completion result. A completed state and the read-only,
   paginated **persisted** transcript appear only after a definitive 200 or an authoritative completed session
   read with successful transcript admission; never from a local timer,
   missing active session or an unconfirmed local stream.
3. **Return/next session:** direct return to the same workspace from the course,
   reload and Back/Forward use the same ordered protected gate and read-only
   transcript, never mount composer/SSE/Stop/retry/Finish. Provide an entry to the existing eligible
   new-session course choice, which re-runs active-session discovery and
   course readiness; do not promise that every course permits starting.
   Summary lifecycle, **only if shown**, distinguishes pending/failure from
   the completed session and never offers student regeneration. This bounded
   slice omits summary metadata, content and action entirely.

## Bounded file/symbol manifest for implement

### Implementation progress — 2026-10-13

- Block 1: current-work boundary now projects and validates server-authored
  `actions.finish`, and the one-dispatch completion parser validates the
  addressed 200 completed resource and fixed current-work link. Synthetic
  current-work fixtures supply authoritative eligibility instead of the old
  forbidden-marker placeholder. Focused regressions still pending.
- Block 2: registered the canonical Finish confirmation route and its existing
  protected host admission; completed workspace admission now reads only
  persisted turns after an authoritative completed session. Active workspace
  has an action-interlocked Finish link; completed workspace reuses the
  existing stacked-list turn treatment without composer/stream and links
  through existing start discovery. Targeted checks pending.
- Block 3: route-local machine-8 owner performs explicit non-refreshing
  session/capability/resource/work prevalidation, single definitive completion
  POST, explicit unknown reconciliation and 409 changed-state treatment;
  exact licensed dialog anatomy gates Confirm. Ten finish-state messages are
  present in all seven catalogs. Unit/browser coverage and formatting pending.
- Block 4: updated API/route fakes and read-only return expectations; added
  definitive, denied/busy and lost-finish browser journeys, API parser/unit
  cases, and matching content-free unit/browser deliberate-failure inventory
  checkpoints. Focused execution and formatting pending.
- Block 5: focused typecheck/i18n/lint and 57 tutoring unit cases passed;
  actual production build passed FFR-955 at 259,070/260,000 bytes before
  the final retention/409 handling edits (must remeasure). The initial six
  completion-browser cases and full 37-case tutoring browser file passed,
  including 320px dialog axe. Added definitive-conflict current-work read,
  terminal retention teardown, 200%-zoom/forced-colors and late Stop-waiting
  regressions afterward; rerun affected checks and remeasure final input.
- Block 6: detected a premature finished announcement on a send 409, which
  lacked an addressed completed-session read; replaced that claim with neutral
  changed-work feedback until explicit re-admission. Added its completed-read
  unit regression. A late completion response after Stop waiting cannot install
  success; the targeted browser regression passes. The Finish modal retains
  the licensed alert's destructive/safe button anatomy, and an unresolved
  outcome remains visible with an explicit Refresh after closing the modal.
  The new 200% zoom/forced-colors case passed in Chromium; final-source build,
  complete focused browser file and hygiene canaries still pending.
- Block 7: final-source focused typecheck/lint/i18n, 57 targeted units, built
  Chromium's 39 tutoring journeys, 52 unit hygiene cases (56 checkpoints),
  and 39 browser hygiene cases (69 checkpoints) passed. The real production
  build measures **259,055 / 260,000 gzip bytes**, 945 bytes headroom. Unit
  and browser hygiene canaries rejected deliberately early failures and found
  no fixture-marker leaks. Added dated bounded evidence notes for BCG-012,
  the surface matrix and CP-05/A05; manual assistive technology and supported
  browsers remain unverified. A new dedicated `useTutoringFinish.test.ts` was
  unnecessary: the Finish hook is exercised through existing protected-route
  integration units and new browser journeys, rather than a duplicate mocked
  hook harness. `useStudentMessageSend.ts` was touched solely to remove the
  evidenced premature finished announcement on a 409; no send behavior was
  expanded. Final formatting/scoped diff export still pending.
- Block 8: the scoped browser hygiene inventory independently exercised all
  39 tutoring journeys and 69 checkpoints, rejected its early-failure canary
  and found no fixture-marker leaks. The protected route regression remains
  stable with delayed lazy loading under isolated hygiene runs. Formatting and
  explicit scoped diff/log handoff are the only remaining implement tasks;
  authoritative `./run-all-tests.sh`, independent review and commit are
  deliberately deferred to their own phases.
- Block 9: Prettier check passed over every story-owned source, test, script,
  catalog, spec and scoped contract note after the last change; API generated
  types and Markdown lint passed. The last isolated ineligible-route unit
  passed (the lazy-content check now waits for its disabled button under
  hygiene). Remaining implement handoff is the unstaged scoped diff and
  content-free logs in
  `tmp/agent-execution/6-5-finish-and-show-the-completed-transcript/`.

### Fix progress — 2026-10-13

- F1 root cause: the shared session projector discarded OpenAPI `student_id`
  before the learner route could distinguish its owner from a supervisor who
  can read a completed session. The projection now retains only this opaque
  owner identity; the workspace and Finish host reject non-owners immediately
  after the addressed session read, before work or transcript requests, and
  Finish's revalidation repeats that check. Protocol fixtures now identify the
  admitted account; a dual-capability non-owner/unknown comparison test checks
  the fixed hidden surface and zero dependent requests. Execution pending.
- F2 root cause: the Finish attempt's unknown state lived only in the mounted
  confirmation hook, while the workspace's authorized `actions.finish` was
  oblivious to it. The existing tab-local tutoring retention owner now keeps
  one account/epoch/session-keyed unresolved-Finish interlock across in-tab
  navigation, consumed only by that session's workspace and Finish paths.
  It clears on definitive completed truth or destroying security/scope teardown
  and requires the explicit Finish outcome read before another confirmation.
  Workspace disables Finish while the marker survives; no request-ID replay or
  new store was added.
- F1 and F2 reproductions now pass: the dual-capability non-owner completed
  route matches the unknown hidden surface with **zero** transcript/work/Finish
  dependent requests; the held first Finish POST remains at **one** dispatch
  after Stop waiting, workspace return, and explicit active-session outcome
  read, with Finish and Review disabled. The owner marker remains tab-local
  across other in-app navigation too; only the draft and stream are destroyed
  on route departure. This closes the Home/Back variation without persisting
  any protected content or changing the current-work contract. Focused
  regression, hygiene and final formatting/bundle checks still pending.
- The F2 browser reproduction now checks the held first POST through Stop
  waiting, workspace return, Home/Back and explicit active-session outcome
  read. It asserts `finishPosts === 1` at each step and disabled Finish/Review;
  a later lost response still cannot unlock it. The initial Back assertion
  used a full-route heading-focus helper not guaranteed on browser history
  restoration; the scenario now asserts the returned heading and interlock
  directly. Focused units, typecheck, lint and i18n passed; the measured build
  after the fix is **259,250 / 260,000** initial-route gzip bytes. Remaining
  checks are the final focused browser run and scoped hygiene/format canaries.
- Affected deliberate-failure hygiene passed: 53 tutoring units and 57
  checkpoints, 41 tutoring browser journeys and 73 checkpoints, both
  early-failure canaries rejected, no marker leaks. The dual-capability
  non-owner fixture is registered in both inventories, and the held Finish
  workspace-return/Home-Back scenario in the browser inventory. The latest
  measured application source is unchanged since the 259,250-byte build;
  final Prettier and focused browser checks still pending.
- Final fix-input checks passed: focused 58 tutoring units (three files),
  eight affected Chromium scenarios including both reviewer reproductions,
  typecheck, lint, seven-catalog parity, Prettier write/check over every
  story-owned file and whitespace check. The post-format production build
  measures **259,250 / 260,000 gzip bytes**. No full gate, independent
  re-review or commit was run in this phase. Current limitations: the
  unresolved-Finish marker is page memory only and cannot survive a full
  reload or a destroying security change; neither browser storage nor a
  client-side inference from active work may reconstruct it. Manual supported
  browser and assistive-technology evidence remains outstanding.

### Fix round 2 progress — 2026-10-13

- The reviewer confirmed F1 and isolated a second F2 transition defect:
  `Outcome unknown → failed Refresh → Check failed → active eligible Refresh`
  dropped the local unknown state while the retention marker remained set.
  The Finish owner now derives failed, changed-work and eligible-read states
  from that marker, and both the UI and dispatch-time Confirm gate it. The
  marker is set when the shared mutation lease actually invokes the one send,
  not inferred from current-work state. Late definitive 200/4xx/not-sent
  settlement clears the matching marker even after Stop waiting or route
  departure; a pre-dispatch supersession can clear it only when no send was
  invoked. A lost or ambiguous result never clears it. No new store or
  automatic unsafe replay was added. Targeted reproductions and checks pending.
- The new Chromium F2 regression passed sequentially: a lost uncommitted
  Finish, explicit session-read 503 and restored active/idle/finish-eligible
  read left Confirm disabled and `finishPosts === 1`. A separate late
  definitive 409 after Stop waiting cleared the interlock; an explicit fresh
  eligible read enabled one newly confirmed POST, establishing that a proven
  non-commit does not strand the student. Both scenarios have registered
  browser deliberate-failure checkpoints. A bounded late-denial guard keeps
  a departed route's hidden failure from updating its old host; affected
  regressions, hygiene and final formatting/measurement remain pending.
- The focused 58 tutoring units and eight Chromium Finish regressions passed
  after the late-denial guard. Scoped browser hygiene exercised all 43
  tutoring journeys and 77 deliberate-failure checkpoints, including both
  new tests; its early-failure canary was rejected and no fixture marker
  leaked. Typecheck, lint and seven-catalog parity passed. Final Prettier,
  post-format bundle measurement and scoped-diff/log refresh remain pending.
- Final post-format source remains within FFR-955 at **259,270 / 260,000**
  gzip bytes. Prettier write/check succeeded over every story-owned file,
  including the new browser inventory; whitespace check passed. No full gate,
  self-review or commit was run. The scope for the next handoff is a complete
  unstaged story diff plus content-free `fix2-*` logs under the existing
  `tmp/agent-execution/6-5-finish-and-show-the-completed-transcript/` folder.
- The failed-Refresh transition retains its `Outcome unknown` state while
  preserving an authorized 503's collapsed technical disclosure; a later
  successful read clears the stale error but not the unresolved Finish
  marker. The sequential reproduction and definitive-rejection resolution
  cases both passed again after that change, alongside 58 affected units,
  seven Finish browser regressions, lint and typecheck. Re-run scoped browser
  hygiene passed all 43 tutoring journeys/77 checkpoints with no leaked
  marker. Current real build is **259,258 / 260,000 gzip bytes**; final
  all-story-file Prettier and diff export remain.

### Gate duplication repair — 2026-10-13

- The single final gate passed formatting, 919 units, 335 Chromium tests,
  200 unit-hygiene cases/266 checkpoints, 208 route-hygiene cases/429
  checkpoints and the 259,258/260,000 gzip budget, then exited 1 at
  duplication before audit, Trivy, catalog and Markdown. Evidence is in
  `tmp/agent-execution/6-5-finish-and-show-the-completed-transcript/verify-report.json`.
- Intra-workspace repeated transcript heading/last-checked/feedback/turns/
  pagination is one persisted collection rendering responsibility. Both
  completed and active paths now use a local `TranscriptCollection` with their
  own authorized page loader and visible turn set; no fetch or state owner
  moves into the component. The cross-feature MaterialFiles/Finish match is
  *only* the inherited Tailwind Plus Simple alert visual anatomy. Materials'
  removal/finalization and tutoring's Finish have different domain decisions;
  a shared wrapper would violate the exact-blueprint binding. The smallest
  visual range is marked in `TutoringFinishRoute`, with a counterpart note in
  `MaterialFilesRoute` alongside its existing MaterialApprovalRoute note.
  Focused checks passed: Prettier, typecheck, lint, the gate's own duplication
  script (0 clones at the unchanged zero threshold), 95 affected unit tests
  across five files, and eight sequential Chromium material/tutoring browser
  regressions including completed transcript, paging/focus, Finish outcomes,
  modal reflow, and material removal. A focused build measured
  **259,261/260,000 gzip bytes**. The single final gate for these changed
  inputs is pending; the prior failed-gate report and log remain preserved.

- `src/platform/api/tutoringSessions.ts` and `.test.ts`: project
  `TutoringWork.actions.finish`; add `completeTutoringSession` with one
  no-body POST, 200-only completion-document/session identity validation;
   retain current read and turn-list projectors; strip summary metadata as
   in the existing minimized projector. No new dependency.
- `src/features/tutoring/TutoringWorkspaceRoute.tsx` and
  `TutoringRouteProps.ts`: Finish affordance/work-action interlock, completed
  branch replacing `SessionFinished` with the **persisted** paginated
  transcript in the existing workspace path, reusing stable response-ID
  articles, locked Markdown and `TutoringPagination`; read-only, no composer
  or stream. `TutoringCurrentWork.tsx` only if the existing UI owner needs a
  focused enablement change. Preserve `useStudentMessageSend.ts` and
  `useTutorResponseActions.ts` unknown-state interlocks; destroy feature
  `tutoringRetention.ts` on definitive completion/route departure, without
  repurposing it for history. Change `tutorStreamController.ts`/
  `useTutorStream.ts` only if an evidenced terminal fence defect requires it.
- `src/app/routes/LearnSessionRoute.tsx`: ordered admission of a completed
  addressed session followed by its persisted transcript; preserve active
  work-before-page ordering and hidden-denial teardown. Add admission for the
  Finish confirmation route with fresh account/scope/session/work checks.
  `src/app/routes/entryRoutes.tsx`: register only the canonical
  `/learn/sessions/:sessionId/finish` descriptor, typed path builder, parent
  workspace and safe fallback; **no** `/learn/history/*` route or link.
- New bounded feature owner `src/features/tutoring/useTutoringFinish.ts`
  with `.test.ts`, for machine §8 prevalidation, one-dispatch completion,
  race/unknown-state reconciliation; a route-local
  `src/features/tutoring/TutoringFinishRoute.tsx` review UI if needed for
  the canonical Finish path. Reuse existing session/route gate and action
  interlocks, not a new global state owner. Confirmation
  uses the exact Tailwind Plus `Application UI > Overlays > Modal Dialogs >
  Simple alert` `v4/react-light.jsx` (library `2026-09-13-083323`), already
  bound in `src/platform/ui/DiscardChangesDialog.tsx`; keep Cancel as safe
  initial focus. Existing `Application UI > Lists > Stacked Lists > Simple`
  and `Application UI > Elements > Buttons > Secondary buttons` bindings
  remain the transcript/action anatomy. No library source staged.
- `src/platform/i18n/messages.ts` plus all seven
  `src/platform/i18n/catalogs/{en-US,de-DE,fr-FR,pt-PT,pt-BR,es-ES,es-AR}.json`:
  genuine translated confirmation, checking, race and unknown labels.
  Preserve first paint for all seven locales, budget 260,000.
- `scripts/check-bundle-size.mjs`: **already changed in prepare** — sole
  enforcement constant 258_000 → 260_000 with appended dated rationale;
  preserve existing 2026-10-12 comment and algorithm. Do not alter its
  cap again in implement.
- `_bmad-output/planning-artifacts/ux-designs/ux-mia-frontend-2026-09-12/ROUTE-INVENTORY.md`:
  **already changed in prepare** — dated completion-in-workspace exception,
  full history/deep links deferred to 8.4; do not rewrite inventory structure.
- `_bmad-output/implementation-artifacts/spec-6-5-finish-and-show-the-completed-transcript.md`:
  this owned implementation/progress record; add completed block notes after
  each implemented block without editing solver-owned checkpoint/tracker.
- Focused `src/features/tutoring/tutoringSession.test.tsx` and new
  `src/features/tutoring/useTutoringFinish.test.ts`, existing
  `test/tutoringFixtures.ts`, `e2e/tutoringFixtures.ts`,
  `e2e/tutoringSessions.spec.ts`, `e2e/routeSecretHygiene.ts`,
  `scripts/route-secret-hygiene-cases.ts`: controlled 200/409/loss,
  read-only return, next eligibility, two-tab race, secret/content-free
  artifact assertions and deliberate-failure hygiene registrations.
  Record only evidenced BCG-012, `SURFACE-STATE-MATRIX.md`, and CP-05/A05
  slice notes; never claim global release Pass or manual AT evidence.

## Exclusions, risks, checks and decisions

No `/learn/history/*` or full completed-session history browsing, summary
regeneration, full summary/follow-up presentation, used-material/speech, supervisor summary
correction, supervisor transcript UI, backend change, generic mutation
retry, telemetry, MFA or global session refactor. The OpenAPI summary
lifecycle is available; **omit** summary metadata in this bounded
completed-transcript slice, satisfying the story's conditional distinction
without an unsupported partial summary surface.

**Bundle decision and residual risk (owner, 2026-10-13):** FFR-955 is
**260,000 gzip bytes**. The former 257,818/258,000 left only 182 bytes;
representative necessary finish copy alone estimated +307 bytes. The
structural locale-on-demand fix (~66 KB) remains in
`_bmad-output/implementation-artifacts/deferred-work.md`, not this story.
Current measured input leaves 2,182 bytes under the authorized limit,
but **no final-source fit is asserted**: build/check the actual implementation
and report any exceedance; do not relax cap or drop translations.

**Route decision (owner, 2026-10-13):** the 6.5 completed transcript renders
in the **existing tutoring workspace**, reachable via the course; direct
completed history and `/learn/history/*` parent/browsing ship in 8.4. Keep
the canonical Finish confirmation path and return to the workspace on
definitive completion; do not navigate to an unbuilt history URL. These
decisions are settled; no open product question remains for this slice.

In implement, run sequential focused typecheck, lint, i18n/catalog parity,
API/hook/route unit cases, production build + FFR-955 bundle check, bundled
Chromium tutoring E2E (idle/queued/generating/denied, stale two-tab work,
changed prevalidation, 200/409/network loss, explicit reconciliation,
completed direct read, next permitted session), and scoped negative/hygiene
canaries. Check AC-013 ledger and stable reading anchors, dialog keyboard
focus/Cancel, 320px in three text modes, 200% zoom, forced-colors and no
protected data in URL/storage/logs/snapshots. Final authoritative
`./run-all-tests.sh` is reserved for **verify**, not prepare. Manual
Chrome/Edge/Safari/assistive-technology CP-05 evidence remains outstanding.
