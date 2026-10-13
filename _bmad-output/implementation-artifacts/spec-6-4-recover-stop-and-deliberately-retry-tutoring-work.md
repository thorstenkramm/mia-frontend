# Story 6.4 — Recover, stop, and deliberately retry tutoring work

Phase: **implement**. Status: **implemented**, awaiting the solver's
independent review and verify phases; no full gate or commit in this phase.
The owner's 2026-10-13 bounded retention-owner extension is recorded below.
Baseline: `8e53651822f9b8955ee1406c23c820c073542cd8` (6.3 committed). The solver owns the
separate `execution/6-4-recover-stop-and-deliberately-retry-tutoring-work.yaml` checkpoint and sprint tracker.

## Preparation progress

- Block 1 complete (2026-10-13): inspected HEAD, staged and unstaged diffs and all untracked paths. The baseline
  equals the 6.3 commit. Existing changes are listed in the handoff; no proposed story source overlaps, and the
  untracked 6.4 checkpoint belongs to the solver. No stash, revert, staging, or commit.
- Block 2 complete: runtime catalog reports `openai/gpt-6-sol#high` and
  `mistral/mistral-medium-2604#high` both active with the exact `high` variant. The owner's
  2026-10-12 selection supersedes the defaults in `.opencode/story-execution.md` for this story.
  Availability is not quota or a paid execution test; no benchmark call.
- Block 3 complete: `npm ls --depth=0` passed, Playwright's bundled Chromium executable exists,
  and licensed Tailwind Plus metadata/version `2026-09-13-083323` exists. No install needed.
- Block 4 complete: compared Epic 6.4, 6.1–6.3 specs, current backend OpenAPI/schema/writer,
  UX machines §§1–9/13/24, BCG-001/012, accessibility AC-013/CP-05, lifecycle/privacy and
  architecture AD-8. Targeted Stop and retry identities exist; stream event IDs do not.
  The original 6.3 deferral required a scoped 6.4 decision; the owner settled it below.
- Block 5 complete: mapped the 6.3 stream owner, 6.2 current-work owner and route admission,
  1.8 session lifecycle shield and the existing exact licensed buttons/list anatomy.
  Baseline bundle headroom is **1,429 gzip bytes** below **258,000** initial-route JS bytes.
- Block 6 complete: this bounded spec documents acceptance, file map, prerequisites, risks and
  targeted checks. The four open decisions were settled by the owner on 2026-10-13,
  with minimal dated updates to `FRONTEND-STATE-MACHINES.md` §§3/4/7 and
  `BACKEND-CONTRACT-GAPS.md` BCG-001. Ready for the supplied story only.
  Documentation-only diff whitespace check passed; `_bmad-output` Markdown is lint-exempt.
  The earlier blocker alert was attempted once but undelivered (configured Pushover
  executable absent); this historical delivery failure needs no repeat now that
  the owner has provided the decisions.
- Block 7 complete (2026-10-13): applied the owner's four decisions to the
  canonical §3/§4/§7 and BCG-001 notes and aligned acceptance, lost-retry
  outcome-unknown path, manifest, risks and focused checks below. The global
  BCG-001/012 and manual CP-05 obligations remain open.
- Block 8 complete: checked spec/contract decision consistency, tracked and new
  Markdown whitespace, unchanged baseline SHA and three-path actual manifest.
  No application gate is applicable to documentation-only prepare changes.

## Binding authority and transport finding

`_bmad-output/planning-artifacts/epics.md` Story 6.4 owns the four bullets. Binding product detail
is in `_bmad-output/planning-artifacts/ux-designs/ux-mia-frontend-2026-09-12/`:
`FRONTEND-STATE-MACHINES.md` §§1–4, 6–9, 13, 24, 28;
`SECURITY-PRIVACY-ACCEPTANCE.md` §Session Expiry and Lifecycle Revalidation;
`ACCESSIBILITY-ACCEPTANCE.md` AC-013/CP-05; `EXPERIENCE.md` Flow 1 and interaction primitives;
`SURFACE-STATE-MATRIX.md` Tutoring workspace; `BACKEND-CONTRACT-GAPS.md` BCG-001/012;
and `FRONTEND-PRD-FOUNDATION.md` FFR-602/607/608. Architecture AD-8 is recorded in
`_bmad-output/planning-artifacts/architecture/architecture-mia-frontend-2026-09-15/.memlog.md`.
Reuse the 1.8 and 6.1–6.3 specs beside this file; do not fork their session, send or stream owners.

Current `mia/api-doc/openapi.yaml` routes to `mia/api-doc/paths/tutoring.yaml`:

- `GET /api/v1/tutoring-sessions/{id}/current-work?response_id={id}` is owner-only,
  non-refreshing, no-store and atomically returns `TutoringWorkDocument`: independent
  `reconciled_response` for that immutable ID (nullable when no match), current generating/
  queued work, and `actions.stop_response_ids`, `retry_response_id`, `reconnect_response_id`.
  `resources.yaml#/TutorResponse` carries session, message, retry lineage, attempt, state,
  partial content and terminal/failure fields. Do not mistake handoff to another response
  for the targeted Stop outcome. Validate session/response identities and contradictions.
- `POST /api/v1/tutor-responses/{id}/interruptions` has cookie + CSRF, **200** with
  `TutoringStopDocument` (targeted non-null **interrupted** reconciled response plus post-Stop
  work); 401/403/404/406/409. A lost response is outcome unknown, never cancellation.
  The stale `204` wording in UX machine 7 is corrected to 200 by the dated scoped
  note; this changes neither no-replay nor unknown-outcome handling.
- `POST /api/v1/student-messages/{id}/response-retries` has cookie + CSRF and required
  `TutorResponseRetryRequestDocument` with canonical UUID-v4 `client_request_id`;
  201 creates a linked queued attempt, 200 returns the linked existing response for the
  *identical* request, 409 covers request conflict, invalid state or work busy.
  `TutorResponseRetryDocument` includes its immutable-ID current-work reconciliation link.
  Retry is a new deliberate operation, not a replay of Stop or of the original message.
  **A lost 200/201 has no returned new response ID.** The current-work GET only accepts
  `message_request_id` (the original message submit ID) or a *known* `response_id`;
  it does not accept `retry_request_id`, and `TutorResponse` does not expose that ID.
  A later response for the same message/lineage is not proof that *this* unknown
  request committed (another tab could have retried). The owner chose a retained
  outcome-unknown presentation, an explicit current-work/lineage read with no
  committed/not-committed attribution, and only an explicit exact re-retry with
  the retained immutable payload and the **same** request ID. The backend's 201
  creates one linked attempt and 200 returns the existing linked response for
  an identical request ID; neither is evidence to replay a POST automatically.
- `GET /api/v1/tutor-responses/{id}/events` is `text/event-stream`; its documented six
  payloads have no `response_id`, no event `id`, no Last-Event-ID semantics. Backend
  `mia/internal/tutoring/handler.go` writes `event:` and `data:` only. A valid snapshot
  replaces content atomically; delta text alone has no intrinsic unique identity.
  `FRONTEND-STATE-MACHINES.md` §3's dated 6.4 exception now extends the 6.3 pattern:
  path-bound response identity, epoch fencing and an atomic **fresh** snapshot
  replacement govern each user-activated replacement connection. Never mid-stream
  resume or send `Last-Event-ID`. No server IDs means same-epoch repeated valid
  deltas and wrong-response payload identity cannot be observed or proven from
  event data; do not invent text deduplication or claim that relaxed guarantee.
  Observable malformed/illegal events still fence, and targeted persisted reads
  still validate immutable response and session identity.
- BCG-012's 6.2 slice is not global closure. Current-work targeted Stop truth and retry/
  reconnect eligibility appear sufficient for this slice, conditional on implementation
  validation and two-tab tests; its Finish prevalidation and release evidence remain open.
  BCG-001 retains the backend publication and release-evidence obligations. Its
  dated 6.4 note approves the **client** sequence owned by state machine §4 on
  maintained non-refreshing ordinary-access behavior without claiming backend
  publication or global closure. Reuse 1.8's explicit recovery gate.

## Acceptance mapped to Story 6.4 bullets

1. **Transport loss and tab return:** immediately close/fence the old stream; lifecycle,
   BFCache `pagehide`/persisted `pageshow`, focus, visibility, `online` and transport loss
   only mark revalidation needed and retain the neutral privacy cover when required.
   They send no authenticated request, replacement SSE or sign-in renewal. Preserve a
   page-local draft only behind the cover while the tab remains alive; never restore it
   after reload, sign-in/scope loss, or account change. The tutoring session remains
   active across inactivity; only browser sign-in has idle/absolute deadlines.
2. **Deliberate recovery:** explicit Refresh/Try now runs one non-refreshing ordered
   session-stage → capability/scope → addressed resource → atomic current-work cycle,
   then reveals a still-authorized page-local draft and opens at most one SSE epoch for
   the `actions.reconnect_response_id` permitted by fresh work. Terminal targeted
   response truth and independent queued handoff precede any new opening. Reload and
   new sign-in use their existing entry gates and never reproduce messages, session
   creation or provider dispatch. Denial tears down protected UI; failed/unknown reads
   keep it covered. Each replacement stream starts only with a fresh valid snapshot
   that atomically replaces the prior model; fence old epochs and callbacks. No
   Last-Event-ID/mid-stream resume or same-epoch equal-text dedup. Do not expand
   1.8 lifecycle ownership without a demonstrated integration defect.
3. **Stop and deliberate retry:** show `Stop response` only for the fresh eligible
   immutable target in `actions.stop_response_ids`; dispatch one interruption POST.
   Accept only definitive 200 parsed target + post-Stop work to install interrupted
   partial content/history. For loss, `Stop waiting` means local wait aborted and
   outcome unknown; explicitly reconcile `response_id` and current work atomically,
   distinguishing still stoppable, completed, interrupted and failed even if the
   next queued response started. Never claim success or automatically repeat Stop.
   Offer response retry only from fresh `actions.retry` and `retry_response_id`
   for a terminal failed/interrupted latest attempt in an idle active session;
   submit a newly deliberate UUID-bound request, verify returned lineage and current
   work, retain earlier articles and partial content. Ambiguous retry retains its
   bound request ID/payload, shows outcome unknown and sends no automatic replay;
   a fresh current-work/lineage read may show work but cannot attribute that
   work to this unknown request. An explicit user re-retry of the **same** ID
   and immutable payload may yield 201 for a newly linked attempt or 200 for
   the already linked attempt, without duplicate provider work. No new ID for
   a still-unknown attempt and no claim of success before a definitive result.
   On 409 reconcile fresh work, without guessing which tab committed; after
   reload do not invent an attempt outcome. Terminal response and work remain
   separate identities. Never infer eligibility from transcript pagination.
4. **Bounded availability:** after a failed stream connection permit at most three
   *user-activated* openings gated by availability delays 1/2/4 seconds without jitter.
   One timer and one EventSource maximum; timer completion never sends a request.
   Try now during delay cancels it, consumes its scheduled attempt, and checks access
   before opening at most one replacement. Failure before a valid snapshot advances
   the bound; only a valid snapshot resets it. Stop waiting pauses without refund;
   exhaustion requires explicit Try again. Continue working, if present in the
   existing visible idle warning, first completes its single continuation response,
   then may use non-refreshing dependent checks; never infer renewal from any tutoring
   lifecycle signal. Conform to AC-013 one-owner announcement ledger and stable
   response-ID articles; unchanged snapshots/deltas never announce or move focus.

## Bounded file and symbol manifest (prepared before implementation)

Existing bounded owners:

- `src/features/tutoring/tutorStreamController.ts` and `.test.ts`: extend the one
  native-EventSource epoch/fence/store with explicit retry-bound state, delay timer,
  snapshot reset, pause/stop-waiting and disposal; fence late callbacks and cancel
  availability timers on auth/route teardown. Do not add generic SSE infrastructure.
- `src/features/tutoring/useTutorStream.ts`: coordinate access-cycle admission,
  confirmed targeted terminal read/handoff and reconnect attempts through the one
  existing `useSyncExternalStore` owner; retain 6.3 reading/announcement behavior.
- `src/features/tutoring/TutoringStreamControls.tsx`, `TutoringWorkspaceRoute.tsx`,
  `TutoringCurrentWork.tsx`: add bounded retry/reconnect/Stop controls and stable
  linked-attempt rendering without duplicating the composer Refresh/stream owners.
  Reuse exact licensed `Application UI/Elements/Buttons/Secondary buttons` and
  `Application UI/Lists/Stacked Lists/Simple`, `v4/react-light.jsx`, library
  `2026-09-13-083323`; already inspected. Any genuinely new anatomy requires
  exact blueprint selection before implementation; no Tailwind Plus source staged.
- `src/platform/api/tutoringSessions.ts` + `.test.ts`: extend the existing minimized
  current-work projector with validated stop/retry/reconnect actions and targeted
  response; add operation-specific 200 Stop and 200/201 retry parsers and identity/
  lineage checks. Use existing API-client CSRF, error and single-dispatch rules.
- `src/app/routes/LearnSessionRoute.tsx` / existing `useCourseResourceAdmission`,
  `src/platform/session/SessionProvider.tsx` and `sessionController.ts`: inspect
  current ordered route check, lifecycle shield, `readAuthenticated` and mutation
  admission integration; change only if a focused regression demonstrates a
  missing signal/fence. Do not introduce a second protected gate or automatic GET.
- Owner-approved 2026-10-13 extension: `src/features/tutoring/tutoringRetention.ts`
  owns only this tab's in-memory tutoring draft and reconnect bound, keyed by
  exact route, account, scope epoch and session; `src/app/App.tsx` observes the
  route and shield above the protected-route unmount boundary and destroys the
  feature owner on departure/sign-in/scope loss. No platform-level controller,
  storage, URL or history-state retention. Focused Chromium regression proved
  the prior route-local-only owner lost the draft across shield/Refresh. The
  implementation also retains a bound **unknown response-action** identity in
  that same feature owner: otherwise a shield could discard its request ID
  and create a different one for an unresolved attempt. It never retains
  response content or dispatches a POST on mount.
- `src/platform/i18n/messages.ts` and seven locale catalogs: required localized
  Stop/retry/reconnect/waiting/unknown/eligibility copy, without generated text.
- `test/tutoringFixtures.ts`, `e2e/tutoringFixtures.ts`,
  `e2e/tutoringSessions.spec.ts`, `e2e/routeSecretHygiene.ts`,
  `scripts/route-secret-hygiene-cases.ts`, and applicable unit-test inventory:
  new local synthetic outcomes, lifecycle/two-tab/reconnect/Stop/retry coverage
  and exact deliberate-failure hygiene registration.
- **Prepared in this phase:**
  `_bmad-output/planning-artifacts/ux-designs/ux-mia-frontend-2026-09-12/FRONTEND-STATE-MACHINES.md`
  §§3/4/7 and sibling `BACKEND-CONTRACT-GAPS.md` BCG-001 scoped dated notes.
  During implementation, add scoped evidence notes in the latter's BCG-012,
  `SURFACE-STATE-MATRIX.md` workspace and `ACCESSIBILITY-ACCEPTANCE.md` CP-05
  only when supported by actual implementation/evidence; do not falsely close
  global blockers or mark manual cells Pass.

Possible new file (only if the existing hook cannot keep the mutation machine
coherent): `src/features/tutoring/useTutorResponseActions.ts` plus focused tests
for single-dispatch Stop/retry, targeted reconciliation and unknown outcome.
Do not add a new platform-level session/stream controller.

## Exclusions, risks and targeted checks

No Finish/completed-transcript flow (6.5), summary/speech, generic retry,
automatic timer-based reconnection, heartbeat-silence timeout, polling,
sign-in extension from tutoring activity, MFA work, backend implementation,
provider calls or speculative 1.8 refactor. Never invent a server event ID,
capability, response identity, lost-retry success claim or retryable `204` Stop.

- **Scoped identity limitation:** no same-epoch valid-delta replay detection
  or per-event response-ID checking is possible without server IDs. Snapshot
  re-baseline/epoch fences must not be presented as proof of either. BCG-001's
  backend publication and global release evidence remain open. Unknown retry
  work/lineage cannot prove this tab's original attempt committed; user-driven
  exact re-retry, not automatic replay or inferred success, resolves the wait.
- **Headroom:** 6.3 gate leaves only **1,429 gzip bytes** under the 258,000
  initial-route JS budget; measure a production build. Do not relax the cap
  or drop seven-locale first-paint coverage to fit.
- **Known hygiene flake:** 6.3's `activation-previously-active` and activation
  reflow deliberate-failure checkpoints intermittently failed before passing
  later runs; root cause remains unidentified. Report separately if encountered,
  do not amend unrelated course activation code or mask a new failure.
- **Accessibility/security:** stop and presentation pause are distinct;
  focus/selection/scroll and stable attempt article must survive snapshot,
  linked retry and terminal reconciliation. No content in logs, URL, history,
  storage, live announcements or test artifacts. Unknown mutations remain
  unknown until authoritative evidence; an ordinary GET never renews sign-in.

Focused checks in implement/fix (sequential): `npm run typecheck`, `npm run lint`,
`npm run check:i18n`, focused Vitest API/controller/hook/route cases, one build
with bundle check, local bundled-Chromium tutoring E2E and scoped secret-hygiene
inventory/canary. Protocol fakes test 1/2/4 timer availability and early Try now,
three-opening exhaustion, valid-snapshot-only reset and atomic fresh replacement,
no Last-Event-ID or mid-stream append, epoch fencing, notification-only lifecycle
with zero authenticated calls on return, Stop 200/409/loss, targeted terminal
ID under queued handoff, explicit retry 201/200/conflict/ambiguous, unknown
lineage read without claim, exact same-ID user re-retry, and two-tab concurrency
without duplicate provider work. AC-013 checks preserve the one mounted
announcement owner, no live tokens/heartbeat/unchanged snapshot, no replayed
terminal announcements, stable articles/focus/selection/scroll. Test 320px
in three text modes, 200% zoom and keyboard focus. After reviewed final inputs only, verify runs
`./run-all-tests.sh` once and records its fingerprint; manual Chrome/Edge/Safari
and assistive-technology CP-05 evidence remains Not run, not Pass.

## Settled owner decisions — 2026-10-13

1. **SSE identity:** scoped 6.4 exception extends 6.3's path-bound response
   identity + epoch fencing + atomic snapshot replacement. Reconnect always
   starts at a fresh snapshot, never Last-Event-ID or mid-stream resume.
   Same-epoch repeated valid deltas are undetectable. The dated §3 note owns
   this exception without changing the general event-ID rules.
2. **BCG-001:** §4 owns the client-only non-refreshing ordered recovery
   sequence and at most one user-triggered replacement stream. The dated
   BCG-001 note does not assert backend publication or close the global gap.
3. **Stop:** OpenAPI `200 TutoringStopDocument` replaces the stale §7 `204`
   reference, with no change to unknown/no-replay semantics.
4. **Lost retry:** remain outcome unknown after a lost 200/201. Read current
   work/lineage without attributing another tab's attempt to this request;
   only a deliberate exact re-retry of the retained same-ID immutable payload
   may receive 200 for an already linked response or 201 for a new linked
   response, without duplicated provider work. No automatic POST replay.
5. **Feature retention owner (2026-10-13):** approved after the focused
   Chromium regression. A feature-scoped owner may live above App's route
   unmount boundary, keyed to tutoring session/route identity, retaining draft
   and reconnect bound page-locally across lifecycle shield and explicit
   ordered Refresh. Teardown on route departure, account/sign-in loss and
   scope loss is mandatory. No platform session/stream controller is authorized.

No open 6.4 product decision remains. The historical prepare phase made no
application, backend, test, checkpoint or sprint-tracking edit. The solver
owns review, verification, tracking and commit after this implement phase.

## Implementation progress — 2026-10-13

- Block 1 complete: extended the existing tutoring API projector with validated
  Stop/retry/reconnect action identities and retry lineage; a 200 Stop document
  must name the targeted interrupted response independently of post-Stop work,
  and 201/200 retry must bind to the targeted message, parent and session.
  Synthetic fixtures and two registered hygiene checkpoints cover the new
  operation parsers. Sequential typecheck and focused tutoring API tests pass
  (15/15); no backend/provider call, full gate, staging or commit.
- Block 2 complete: existing stream controller now owns one availability timer,
  three user-consumed opening attempts (1/2/4 seconds), pause/resume, exhaustion
  and fresh-snapshot-only bound reset. Timer wake does not create EventSource;
  old epoch callbacks close/fence. Focused controller tests pass (7/7), including
  early Try now, exhaustion and paused opening. React access-cycle integration,
  controls and browser evidence remain pending.
- Integration blocker found before editing 1.8 or expanding the story manifest:
  a temporary, content-free Chromium regression filled a synthetic workspace
  draft, dispatched the existing focus lifecycle signal, explicitly activated
  Refresh and checked draft retention. The final boolean assertion **failed**;
  the existing privacy shield unmounts the tutoring route (`App.tsx` routeKey
  returns null), destroys its route-local draft and stream-controller attempt
  count, and the fresh gate remounts them. The temporary test was removed after
  the one bounded run; its error-context artifact was deleted. This is a
  demonstrated structural integration issue, not permission to refactor 1.8
  silently. Notification attempted, but configured Pushover executable absent.
  Need owner/solver approval to expand the explicit manifest for one
  page-local, nonpersistent tutoring-state retention owner above the shield
  (e.g. in App composition), with destruction on route/account/scope loss;
  alternatively settle a product change to the draft/retry-bound retention
  requirement. No protected data may enter storage, URL or history state.
  Blocked before the feature-hook/UI integration, browser journeys and hygiene
  inventory. Scoped typecheck, lint, 57 affected unit tests, production build
  and 256567/258000 gzip bundle check pass for the partial API/controller code;
  the known failed draft-retention probe is **not** a passing acceptance test.
- Block 3 resumed: the owner approved the bounded feature-retention manifest
  extension above; the 1.8 controller is not refactored. Work is underway to
  cover the retention owner, stream hook and controls with a new positive
  browser regression. Earlier blocked status above is historical, not an
  outstanding owner question.
- Block 3 implementation: feature-only memory owner retains the exact account,
  scope epoch, route, session, draft and stream retry bound across App's shield
  unmount; route/account/scope destruction and App teardown discard it. A
  bundled-Chromium lifecycle/explicit-Refresh/explicit-Try-now regression
  passed, including zero request/replacement stream on focus alone and atomic
  fresh-snapshot replacement. The stream hook reuses the one controller and
  orders reconnect through existing session/route admission; shielding clears
  unconfirmed streamed bytes. No platform controller was added.
- Block 4 implementation: a route-local mutation owner handles single Stop,
  definitive 200 target/work, independent targeted reconciliation, and
  immutable UUID-bound response retry. Its lost retry keeps unknown attribution
  and allows only user-activated exact re-retry. Current work carries validated
  latest response and linked attempt articles; all seven catalogs have localized
  control/unknown copy. Browser fakes have explicit Stop/retry outcomes and new
  deliberately-failing hygiene case IDs. Targeted typecheck/lint/i18n/build
  pass and the last measured initial JS is 257714/258000 gzip bytes.
- Block 5 implementation (browser and accessibility): the final affected
  bundled-Chromium file passed **30/30** journeys, including previously
  protected 6.1–6.3 flows, focus/lifecycle privacy silence, explicit fresh
  reconnect, Stop 200/409/loss, linked retry 201/200/conflict/ambiguous,
  explicit same-ID re-retry, two-tab stale Stop and earlier-article retention.
  Direct 320 CSS pixels across seven locales/three text modes, actual 200%
  zoom across three modes, keyboard focus on Stop, and the scoped axe scan
  passed. Source checks passed sequentially: typecheck, lint/architecture,
  complete seven-catalog validation, focused 57 unit tests and build/bundle
  **257731/258000 gzip bytes**. An in-progress scoped tutoring
  deliberate-failure hygiene run is not yet a pass; full gate, release manual
  browser/AT evidence and unrelated epic flows are not part of implement.
- Block 6 implementation: corrected the reconnect-opening Stop waiting and
  paused Resume retries controls from the binding §4 table. An interrupted
  explicit access check no longer turns into an automatic reopening: a new
  lifecycle signal fences the outstanding user intent, while the deliberate
  route check retains its consumed attempt until a fresh admitted work read.
  Local controller regression and explicit Stop-waiting/Resume-retries browser
  cycle passed. Latest sequential targeted source checks: typecheck, lint,
  i18n, **58/58** focused unit tests, build and **257811/258000** gzip bytes;
  **5/5** changed browser journeys passed. A new scoped hygiene scan is in
  progress for the final controls. Full browser file was **30/30** before this
  last control adjustment; do not present it as final-input evidence until
  rerun. Manual AT and global backend publication remain outstanding.
- Reviewer handoff artifacts (refreshed after the last source/check state):
  `tmp/agent-execution/6-4-recover-stop-and-deliberately-retry-tutoring-work/scoped.diff`
  includes only the 6.4 manifest's tracked and new files, with no staging;
  sibling `checks.log` and `hygiene-run.log` contain content-free outcomes.
  Pre-existing user changes outside that manifest remain untouched.
- Block 7 completed: the same feature-scoped keyed memory owner now retains
  the immutable **unknown Stop/retry** target and retry request ID through a
  lifecycle shield, so returning to the page cannot accidentally issue a
  *new* ID for a still-unknown retry. Pending unsafe dispatch on unmount is
  conservatively unknown; definitive retry success retains the known linked
  response while a failed follow-up work read keeps composer/actions covered
  until targeted work is explicitly reconciled. Hidden access destroys the
  owner immediately. Both authoritative Stop IDs (generating and queued)
  now receive distinct, labelled controls. The two-tab fake covers stale Stop
  and competing retry conflict, with no client replay or inferred winner.
  Targeted Chromium regressions for both lost mutations across focus/Refresh,
  work-follow-up failure, dual Stop targets, and two-tab recovery passed.
- The composer and response-action controls are covered while Stop/retry is
  pending, unknown or awaiting authoritative current work; old eligibility
  cannot dispatch another unsafe operation. Once reconciled, server-authored
  current work controls them again.
- Final implement checks after the source changes: sequential typecheck,
  lint/architecture, seven-catalog i18n validation, **58/58** affected unit
  cases, build and bundle **257813/258000 gzip bytes** passed. The full
  tutoring browser file passed **30/30** on the final application/test source;
  the affected Stop/retry subset independently passed **8/8**.
  Final scoped deliberate-failure hygiene passed **30** browser cases,
  **49** secret checkpoints and the rejected early-failure canary, with
  original process/artifact streams scanned marker-free. Full gate and
  independent review are intentionally deferred to the solver's next phases.
  Manual supported-browser/AT CP-05 evidence, global BCG-001/012 release
  obligations and unobservable same-epoch duplicate valid deltas remain open;
  two-tab browser tests use controlled independent backend fakes, not a
  production shared server or provider.

## Fix progress — 2026-10-13

- F1 repaired in the existing tutoring admission host: definitive addressed
  workspace Unavailable now destroys the feature retention owner after the
  hidden result, even if route/account/epoch did not change. Check failed
  retains it. Focused unit coverage checks the actual destroy call across
  503 recovery versus 404 denial; browser coverage verifies the ordered
  focus/Refresh denial path and unchanged neutral presentation. No lifecycle
  or platform gate was re-derived.
- F2 repaired in the existing response-action hook: an authoritative targeted
  retry response from the successful follow-up replaces the POST's queued
  linked projection before the work installation. The browser fake now models
  a response that completes before the follow-up GET; focused unit and
  Chromium regressions distinguish terminal content from queued text.
- F3 repaired in the existing stream/work owners: terminal GETs capture a
  local work revision; a later response-action work installation increments
  it, so a late GET may retain its confirmed targeted terminal article but
  cannot reinstall stale queue/actions. The paused deferred-result path uses
  the same fence. The controller keeps the terminal identity until the
  targeted read settles when Stop removed the last queued work. Focused unit
  and Chromium races hold a pre-Stop generating response read, confirm Stop
  of the queued response, then release the stale GET. No unsafe replay.
- Affected final checks passed sequentially: typecheck, lint/architecture,
  seven-catalog i18n, 61 targeted tutoring units, 32 Chromium tutoring
  journeys, build and bundle-size (257,818 / 258,000 gzip bytes; 182 bytes
  remaining). Tutoring-only deliberate-failure hygiene passed for 49 unit
  cases/53 checkpoints and 32 browser cases/54 checkpoints, with early-failure
  canaries rejected and no marker leaks. Three new unit checkpoints and three
  new browser checkpoints (including recoverable versus denied resource) are
  registered. `fix-` logs and the refreshed complete scoped diff live under
  `tmp/agent-execution/6-4-recover-stop-and-deliberately-retry-tutoring-work/`.
  The previous implement evidence is superseded; the final full gate, manual
  supported-browser/AT CP-05 and independent follow-up review are not part of
  this fix phase.

## F3b bounded test-strength continuation — 2026-10-13

- The repair reviewer confirmed F1/F2 and F3's implementation, but the F3
  race tests could pass on pre-GET snapshot content. Both the focused unit
  and bundled-Chromium journey now give the held terminal read a distinct
  synthetic persisted response. They assert that distinct content is absent
  while held, then wait for it to render **after release** before checking
  the stopped queued response stays interrupted with no Stop control. This
  demonstrates both legitimate targeted terminal reconciliation and the
  work-revision fence, without changing production code or fake contracts.
- The existing `tutoring-stale-terminal-work` unit and
  `tutoring-stop-terminal-race` browser hygiene checkpoints remain after the
  strengthened assertions; no checkpoint identity or inventory changed.
  Focused unit and browser races passed sequentially (one case each), then
  typecheck and lint passed sequentially. Playwright's initially attempted
  anchored title grep selected zero tests; an unanchored unique title grep
  selected and passed the intended browser case. The content-free `fix2-`
  logs and refreshed `fix-scoped.diff` are in the story execution directory.
  Full gate, commit, and story completion remain outside this fix phase.

## Bounded formatting repair — 2026-10-13

- The first final gate stopped at `format:check` after typecheck, typecheck
  coverage and lint passed; no later gate stage ran. Its input fingerprint
  and content-free failure record remain in the execution directory as
  `verify-failed-*` artifacts. The one gate invocation was not retried.
- The 17 reported paths were checked against the story-only diff manifest,
  then formatted with the declared Prettier tool; no other source was edited.
  One authorized test file required a second Prettier pass before the whole
  workspace check settled. Typecheck, lint and format then passed sequentially,
  and the focused tutoring unit suite remained **61/61**. This is a mechanical
  repair; no production behavior or contract was intentionally changed.
- Final verification of these newly formatted inputs is pending a fresh
  single authoritative gate. No source/config/test edit is authorized after
  that gate passes; reports and fingerprints live only under `tmp/`.
