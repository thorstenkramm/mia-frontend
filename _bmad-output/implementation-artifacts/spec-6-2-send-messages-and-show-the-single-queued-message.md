# Story 6.2 — Send messages and show the single queued message

Phase: prepare. Status: **ready** (bounded slices only; see BCG reconciliation). Baseline:
`958188b3e0b4f89b57e9d458cf90c1804ca6ef8c` (frontend, 6.1 at HEAD), backend checkout `63c9992`. Actual prepare worker:
`kimi-code/k3` (Kimi K3), the approved batch fallback after the OpenAI usage limit; runtime variant not exposed by
this session. Story authority: `epics.md` Story 6.2; read-first checkpoint:
`execution/6-2-send-messages-and-show-the-single-queued-message.yaml` (batch rules preserved; no staging or commit in
this phase).

## Binding references

Companions below are relative to `../planning-artifacts/ux-designs/ux-mia-frontend-2026-09-12/`:

- `FRONTEND-PRD-FOUNDATION.md` FFR-601 (composer/queue subset), FFR-602 (no session-expiry framing), FFR-603 (no
  abandon/discard), FFR-610 (no dynamic answer buttons; unstructured text only), FFR-611 (five frontend-owned static
  starters; insert editable text or guide the next step; never auto-submit), FFR-612 (free text available at all
  times), FFR-613 (workspace notice, already mounted by 6.1).
- `EXPERIENCE.md` Flow 1 steps 4–5 and 7 (starter inserts editable text or guides selection, never submits; Pablo
  sends through the composer; an unretained ambiguous attempt receives no saved/unsaved claim); component contract
  rows `message-composer` (preserve bytes; Enter inserts a newline; visible Send or Queue is the baseline action) and
  `static-session-starter` (insert editable text or guide the next step; never submit); State Patterns (the five
  starters; no continuous global polling).
- `ROUTE-INVENTORY.md` Session Start §Static Starters and §Free-Form Intent (both at `/learn/start/:courseId/intent`),
  Tutoring Workspace §Composer and §Queue (same workspace path).
- `SURFACE-STATE-MATRIX.md` Session start rows Static starters (`G,D`) and Free-form intent (`G,F`, submission outcome
  unknown); Tutoring workspace rows Composer (`checking; idle; slot free/full; outcome unknown`) and Queue
  (`checking; absent; queued; handoff; generating` — handoff/live states stay 6.3+).
- `FRONTEND-STATE-MACHINES.md` machines 1 (bootstrap/gates), 2 (request-ID lifecycle — the message-send and
  session-create attempt owner), 5 (Composer Send, Queue, and Authoritative Work State — primary new machine), 6
  (read-side queued presentation only; epoch handoff is 6.3+), 13 (stable attempt article subset: queued/generating
  articles keyed by response ID with speaker/attempt/state heading), 28 (announcements), 29 (raw error), 31
  (browser-owned privacy). Machines 3/4 (SSE) and 7/8 (Stop/Finish) are explicitly not this story.
- `SECURITY-PRIVACY-ACCEPTANCE.md` Ambiguous Mutation Reconciliation (message send is a named request-ID operation),
  CSRF Rotation and Unsafe Requests, Session Expiry, Existence Hiding, Least-Data Fetching, Raw Error, Shared-Device
  Teardown (drafts and request IDs never persist; content-bearing history state is cleared — 6.2 puts no content in
  `history.state`, D2).
- `ACCESSIBILITY-ACCEPTANCE.md` AC-013 streaming-transition row "Message accepted to queued → Message queued, polite,
  dedupe response ID + queued" (the only AC-013 row this story seeds; SSE-driven rows are 6.3), CP-05 partial evidence
  only; applicable AC-001..005/008..012/016/019.
- `DESIGN.md` blueprint gate (exact licensed blueprint per component, version `2026-09-13-083323`);
  `message-composer` = "Tailwind form controls with a persistent explicit send action"; `static-session-starter` =
  "Tailwind Plus secondary action blueprint; frontend-owned only".
- `BACKEND-CONTRACT-GAPS.md` BCG-012 (primary; this story owns the first consumer slice), BCG-002 and BCG-011
  (existing 6.1 slices reused unchanged).
- `ARCHITECTURE-SPINE.md` AD-2 (generated wire types + hand-written client core + per-operation zod boundaries) and
  AD-12 (errors cross the client boundary as one discriminated union).

Backend authorities (read-only corroboration): `mia/api-doc/paths/tutoring.yaml` (tutoringSessionMessages POST,
tutoringSessionCurrentWork), `mia/api-doc/schemas/requests/requests.yaml` (`StudentMessageCreateRequestDocument`,
`StudentMessageContent`), `mia/api-doc/schemas/resources/resources.yaml` (`StudentMessage`, `TutorResponse`,
`StudentMessageMutationDocument`, `TutoringWork`, `TutoringWorkActions`, `TutoringWorkDocument`,
`MessageCurrentWorkLinks`), `mia/docs/product-requirements.md` §Tutoring sessions (at most one generating response and
one queued message; queued work starts automatically; message bounds; request-ID reconciliation; no automatic retry).

## Verified operations (current transport, backend `63c9992`)

All present in `mia/api-doc/openapi.yaml`, generated types (`src/platform/api/generated.ts`:1075,1132,5923,6048), and
backend `internal/tutoring`:

- `createStudentMessage`: `POST /api/v1/tutoring-sessions/{id}/messages`, cookie + `X-CSRF-Token`. Request
  `StudentMessageCreateRequestDocument`: `data.type: "student-messages"`, no `id`, `attributes.client_request_id`
  (canonical lowercase UUID v4) and `attributes.content` (`StudentMessageContent`: 1–8,000 Unicode code points and at
  most 32 KiB UTF-8). Success: `201` new message with queued tutor response, or `200` identical-request replay of the
  existing message and initial response; both `StudentMessageMutationDocument` = `data: StudentMessage`
  (`session_id`, `sequence`, `content`, `created_at`, nested `response: TutorResponse`) plus
  `links.current_work` — a fixed-pattern URI
  `/api/v1/tutoring-sessions/{id}/current-work?message_request_id={canonical-uuid}` whose read identifies the
  committed message and initial response for the retained request. Errors: `400`, `401`, `403`, `404`, `406`, `409`
  (`tutoring_request_conflict` | `tutoring_invalid_state` | `tutoring_work_busy`), `413`, `415`, `422`
  `tutoring_invalid` (invalid request ID or content). No `429`/`500` declared; those and transport loss are outcome
  unknown.
- `getTutoringSessionCurrentWork`: `GET /api/v1/tutoring-sessions/{id}/current-work`, cookie, non-refreshing,
  no-store. Optional query `message_request_id` (CanonicalUUIDv4; null result means no matching committed message) and
  `response_id` (6.4's Stop reconciliation; unused here). `200 TutoringWorkDocument`: `data.type:
  "tutoring-work-states"`, `id` = session ID, attributes `session_state` (`active|completed`), `state`
  (`idle|generating|queued|generating_and_queued|completed`), `remaining_queue_capacity` (0..1), `generating_response`
  (`TutorResponse` | null), `queued_work` (`StudentMessage` | null), `latest_response` (`TutorResponse` | null),
  `reconciled_message` (`StudentMessage` | null), `reconciled_response` (`TutorResponse` | null), and server-authored
  `actions` (`submit`, `queue`, `stop`, `stop_response_ids`, `retry`, `retry_response_id`, `reconnect`,
  `reconnect_response_id`, `finish`). Errors: `401`, `403`, `404 tutoring_not_found` (hidden), `406`, `422`
  `tutoring_invalid` (malformed/duplicate/empty reconciliation parameter — a protocol-level rejection, never a "not
  committed" answer; a well-formed unknown request ID is `200` with `reconciled_message: null`).
- Backend corroboration: `internal/tutoring/types.go` `CurrentWork` struct (state, generating, queued, reconciled
  projections, remaining capacity, actions), `handler.go`/`service.go` owner-only atomic snapshot; generation
  persists partial content (`manager.go:289` updates `content` while `generating`), so a generating response's
  persisted content is authoritative escaped-renderable text.
- Reused unchanged from 6.1: `createTutoringSession`, `getCurrentActiveTutoringSession` (BCG-002 slice),
  `getTutoringSession`, `listSessionTurns`, `getCourse` `readiness.new_session` (BCG-011 slice). Transport rules
  unchanged: exact `application/vnd.api+json`, `credentials: "same-origin"`, `cache: "no-store"`, fresh readable CSRF
  cookie read immediately before the single dispatch; reads never act as keepalive.

## BCG reconciliation (recorded decisions; no RFC needed)

- **BCG-012 — Story 6.2 slice delivered, no workaround.** The gap's "current docs/OpenAPI mismatch" no longer
  describes current transport: `GET /api/v1/tutoring-sessions/{id}/current-work` with `TutoringWorkDocument` is the
  one authoritative per-session work representation — idle/generating/queued states, generating and queued
  identities, remaining queue capacity, server-authored submit/queue eligibility, and request-ID reconciliation via
  `reconciled_message` — atomic with the one-generating/one-queued invariants, owner-only, no-store; the message
  mutation document carries the immediate `links.current_work` reconciliation read. **Implementation records a dated
  Story 6.2 slice reconciliation in BCG-012** (frontend consumes current work for composer enablement, the single
  queued presentation, and ambiguous-send reconciliation from the first send). BCG-012 is **not** globally closed:
  machine 6 live handoff, machine 7 Stop reconciliation, machine 8 Finish prevalidation, two-tab concurrency browser
  evidence, and release obligations remain for 6.3/6.4/6.5. No `mia/tmp` RFC — the needed slice exists in current
  transport.
- **BCG-002/BCG-011:** existing dated 6.1 slices reused unchanged (discovery before start affordances; server-authored
  `new_session` eligibility).
- **BCG-001/003/005/007:** existing approved slices reused unchanged. No new BCG number.

## Acceptance

1. `/learn/start/:courseId/intent` is registered per ROUTE-INVENTORY (one route hosting the Static Starters and
   Free-Form Intent presentations). Ordered gate: learning participation → course re-read → BCG-002 discovery. Found
   active session → the 6.1 resume presentation (no starter affordance). Ineligible course → the truthful fixed
   not-accepting copy. The optional material selection arrives only as one opaque `MaterialId` (or explicit none) via
   the material-choice Continue navigation (D2); absent handoff state means an intent-only start (the documented
   product path) with a visible parent link to the material choice — a selection is never fabricated and never
   silently dropped.
2. `/learn/start/:courseId/material` keeps its 6.1 admission, selection UI, and resume presentation; its primary
   action becomes Continue to the intent route carrying the selection (D1/D2). Session creation no longer happens on
   this route.
3. The intent route offers the five localized static starters (homework help, topic practice, explanation, exam
   preparation, free-form question) as secondary actions subordinate to free text. A starter inserts editable
   localized text into the textarea or guides the next step (the free-form starter focuses the textarea); it never
   submits, and inserted text remains fully editable. Free text is available at all times (FFR-611/612).
4. The intent route's one visibly labelled primary action runs the machine-2 begin chain (D3): fresh
   session/capability/course/discovery checks → `createTutoringSession` (new canonical UUID v4 minted after the
   checks, immutable payload = course + carried optional material, page memory only) → only after definitive create
   success, `createStudentMessage` (second minted UUID, exact composed bytes) → navigate to
   `/learn/sessions/:sessionId` only after definitive send success or definitive reconciled-committed. Create
   ambiguity/conflicts reconcile exactly as 6.1 (discovery). Send ambiguity/conflicts reconcile through the current
   work read with the retained `message_request_id` (criterion 9). Once the create is definitive, an exact retry
   re-sends only the message — the session is never re-created.
5. The workspace admission for an active session additionally reads `getTutoringSessionCurrentWork` (no reconciliation
   parameters) together with the transcript page before the composer is enabled (machine 5 Work checking). The
   composer's enabled state and label come only from server-authored `actions.submit`/`actions.queue`: submit →
   visible `Send`; queue only → visible `Queue message`; neither (queue full or completed) → draft retained,
   submission disabled, explicit Refresh offered. Idle, capacity, and eligibility are never inferred from transcript
   pagination, locally observed events, or elapsed time (BCG-012 forbidden workarounds).
6. Composer behavior: Enter inserts a newline; IME composition never submits; the visible button is the only
   submission action. Content is validated client-side against the documented contract bounds (1–8,000 Unicode code
   points, ≤ 32 KiB UTF-8) with bytes preserved exactly; `422 tutoring_invalid` remains the definitive server arbiter
   (D8). The draft lives in page memory only under the existing unsaved-input guard; nothing enters storage, URL text,
   title, or `history.state`.
7. A workspace send is one machine-2 attempt against the known session (one UUID-bound immutable payload, dispatched
   at most once per attempt, no automatic replay). After a definitive `200`/`201` (D9), exactly one immediate
   current-work follow-up read — the mutation document's documented `links.current_work` purpose, constructed locally
   from the branded session ID and retained request ID — refreshes authoritative work state and composer enablement
   (D4). `Message queued` is announced politely exactly once per response ID (AC-013 ledger seed). If the follow-up
   read fails, the committed message still renders from the definitive mutation document while the work state is
   unknown: composer covered, explicit Refresh only.
8. The single queued message is visibly distinct: a current-work region renders `queued_work` (escaped student text +
   queued state) and `generating_response` (state + escaped authoritative persisted partial content) as articles keyed
   by response ID with the machine-13 speaker/attempt/state heading. Transcript-page turns whose response IDs appear
   in current work are suppressed from the paginated list, so each attempt has exactly one stable rendered identity
   (D5). At most one queued article ever renders; no second generation or additional queued message is invented.
9. Outcome handling for sends (machine 2 + machine 5): network/timeout/abort/undeclared status → outcome unknown with
   the bound text locked; explicit Reconcile = current-work read with the retained request ID (`reconciled_message`
   present → committed presentation; null → not committed) then explicit `Retry exact attempt` (same ID and content,
   only after fresh session/capability/scope/resource/work checks) or `Abandon unknown attempt` (only after
   inconclusive reconciliation; destroys the retained ID/payload, never resends). `Stop waiting` aborts the local wait
   into outcome unknown without claiming cancellation. `409 tutoring_work_busy` → slot lost: draft retained, explicit
   Refresh of current work. `409 tutoring_request_conflict` → locked conflict: discard the attempt, reconcile via
   current work. `409 tutoring_invalid_state` → the session is completed: fixed read-only truth. `422
   tutoring_invalid` → definitive rejection; any later submit mints a new ID. `401`/scope loss → existing teardown.
   Hidden `403`/`404`/`429` → the one fixed hidden presentation. After reload, attempt memory is absent: no outcome
   claim, no replay, no restored draft (machine 2 Reloaded unknown).
10. No unsafe request is ever replayed automatically; request-ID idempotency creates no exception. Seven locales,
    three text modes, 320px, 200% zoom, keyboard/focus/announcement evidence for every new surface; CP-05 partial
    evidence only, no release Pass claim.

## Bounded decisions (settled for this dispatch; reviewer may challenge)

- **D1 Start moves to the intent route.** The start flow becomes course choice → material choice (Continue) → intent
  (compose + begin chain) → workspace. 6.1's D1 explicitly assigned the intent/starter routes and the composer to this
  story; ROUTE-INVENTORY's paths, parents, and fallbacks are registered as documented, and no later story covers them
  (6.3 streams, 6.4 recovers/stops/retries, 6.5 finishes).
- **D2 Material handoff via `location.state`.** The material choice's Continue navigation carries exactly one opaque
  `MaterialId` or an explicit none marker in React Router location state. Opaque resource IDs are outside the
  security rule's content list (name, topic, message, filename, email, mobile) and already appear in paths; message
  text never travels. History state survives reload, so no silent selection loss; absent state is the documented
  intent-only start (criterion 1). The route host remounts per `location.key`, so component-local memory cannot carry
  the selection.
- **D3 One deliberate action, two request-ID attempts.** The begin chain sequences create then first send; each is its
  own machine-2 attempt with its own reconciliation authority (discovery for create, current work for send). Neither
  is an automatic replay of the other, and the workspace is entered only on definitive success (or definitive
  reconciled-committed) of the send.
- **D4 Post-send enablement comes from one current-work read.** Capacity and labels are never reconstructed from the
  mutation result or transcript (BCG-012 forbidden workaround); the single follow-up read is the mutation document's
  documented reconciliation link, constructed locally from trusted branded IDs. It is user-initiated, non-refreshing,
  and never a keepalive or poll.
- **D5 One rendered identity per attempt.** Current-work articles and the paginated transcript are deduplicated by
  response ID (identity, never capacity inference); on explicit Refresh both re-read together. In-place SSE
  reconciliation and DOM-anchor preservation are 6.3.
- **D6 Starters live on the intent route only** (SURFACE-STATE-MATRIX session-start rows; DESIGN.md "Secondary actions
  before a session"). The workspace composer is free text at all times (FFR-612).
- **D7 No SSE, reconnect timers, or polling.** Authoritative changes surface through explicit user Refresh re-reading
  current work and the transcript page (machines 3/4/6 live behavior: 6.3/6.4).
- **D8 Client-side content bounds mirror the documented contract** (8,000 code points; 32 KiB UTF-8) per the approved
  hardcoded-documented-limits interim precedent; the server remains the arbiter.
- **D9 200-vs-201 on send is one definitive success** (mirrors 6.1 D7); a 200 replay renders the returned existing
  message and initial response without surfacing the distinction.

## File/symbol map (explicit manifest)

Existing files, bounded changes only:

- `src/platform/api/tutoringSessions.ts` (+ `tutoringSessions.test.ts`): add `createStudentMessage(session, content,
  clientRequestId, csrf)` (accepts exactly 200/201; parses `StudentMessageMutationDocument` minimally: message id,
  sequence, content, created_at, nested response id/attempt/state/content; strips `links` — the follow-up read URL is
  constructed locally from trusted branded IDs) and `getTutoringSessionCurrentWork(session, { messageRequestId? },
  signal)` (minimal `TutoringWork` slice: `sessionState`, `state`, `remainingQueueCapacity`, `generating`
  (id/attempt/state/content/messageId) | null, `queued` (message id/sequence/content/createdAt + nested response
  id/attempt/state) | null, `actions.submit`/`actions.queue`, `reconciledMessage` | null; zod strips
  `latest_response`, `reconciled_response`, and the stop/retry/reconnect/finish action fields — 6.3–6.5 extend this
  schema, so structure it for extension). Addressed-read identity checks (`data.id` = session) per the existing
  pattern.
- `src/app/routes/entryRoutes.tsx`: add `learnStartPaths.intent = "/learn/start/:courseId/intent"` + typed builder and
  route descriptor (gate `Learn(start session)`, parent = material choice) with `authenticatedRoute` parsing.
- `src/app/routes/LearnSessionRoute.tsx`: add the `intent` resource admission (course read, discovery, handoff-state
  extraction with explicit none/absent distinction); extend the `workspace` admission with the current-work read for
  active sessions (alongside the transcript page; ordered after the session read).
- `src/features/tutoring/TutoringRouteProps.ts`: add the admitted `intent` resource variants (resume presentation vs
  compose, with the carried optional material) and an `intent(course)` link builder; extend the `workspace` resource
  with the admitted `TutoringWork`.
- `src/features/tutoring/SessionStartMaterialRoute.tsx` (+ tests): primary action becomes Continue to intent carrying
  the selection (D1/D2); the create attempt machinery leaves this route.
- `src/features/tutoring/useTutoringSessionStart.ts`: removed; its machine-2 create ownership is absorbed by the new
  begin-chain owner (D1/D3).
- `src/features/tutoring/TutoringWorkspaceRoute.tsx` (+ tests): mount the current-work region and composer for an
  active session below the transcript; explicit Refresh re-reads current work plus the current transcript page;
  completed sessions keep the fixed finished notice (no composer).
- `src/platform/i18n/messages.ts` + all seven catalogs: intent/starter/composer/queue/current-work copy, including the
  five starter texts per locale; no fallback or concatenation.
- `e2e/routeSecretHygiene.ts`, `scripts/route-secret-hygiene-cases.ts`: register the new actual hygiene cases (message
  content, request IDs, and response content never reach URL, title, storage, announcements, snapshots, or logs).
- Planning docs (implementation-time edits, same change): `BACKEND-CONTRACT-GAPS.md` dated BCG-012 Story 6.2 slice
  note; `FRONTEND-STATE-MACHINES.md` dated slice notes on machines 2 (message-send slice) and 5 (its `BLOCKED` line
  gets the dated slice; machines 6/7/8 stay blocked); `SURFACE-STATE-MATRIX.md` session-start rows (starters,
  free-form intent) and workspace Composer/Queue rows (slice states only); `ACCESSIBILITY-ACCEPTANCE.md` CP-05 partial
  evidence notes (rows stay Blocked/Not run overall).

New files:

- `src/features/tutoring/SessionStartIntentRoute.tsx`: starters + free-form intent + the begin action.
- `src/features/tutoring/useTutoringSessionBegin.ts`: machine-2 route-local owner of the create→send chain, mirroring
  the 6.1 owner pattern (`useActionState`, `runAuthenticatedMutation`, attempt symbols, `useRouteActivity`,
  unsaved-input guard, announcer, explicit Reconcile/Retry exact attempt/Abandon/Stop waiting). Separate state-machine
  ownership; rhyming sections carry the same justified `jscpd:ignore` markers as 6.1.
- `src/features/tutoring/TutoringComposer.tsx`: the blueprint-bound composer (textarea, labelled Send/Queue action,
  machine-5 states).
- `src/features/tutoring/useStudentMessageSend.ts`: machine-2/5 send owner for the workspace against the known
  session, including the D4 follow-up read and criterion-9 outcome handling.
- `src/features/tutoring/TutoringCurrentWork.tsx`: the queued/generating article region with response-ID dedup against
  the loaded transcript page (D5).
- `src/features/tutoring/tutoringComposer.test.tsx` (+ focused companions as needed).
- `test/tutoringFixtures.ts`: extend with synthetic mutation documents (201/200/409 variants) and current-work
  documents (idle, generating, queued, generating_and_queued, completed, reconciled null/present) with per-run
  protected markers; no fixture secrets.
- `e2e/tutoringFixtures.ts`, `e2e/tutoringSessions.spec.ts` (or a focused sibling spec): bounded Playwright cases on
  the existing route-fake envelope.

No dependency, CSP, theme, bundle-budget (256000 gzip unchanged), auth-owner, or `App.tsx` changes; `generated.ts`
already contains both operations (no regeneration).

## Blueprints (library `2026-09-13-083323`, all `v4/react-light.jsx`, located in prepare)

- Composer: `Application UI/Forms/Textareas/With underline and actions` (read in prepare). Deltas: drop the avatar
  image, attach action, and mood Listbox; keep the underline textarea with an sr-only localized label and the
  trailing submit button carrying the visible localized `Send`/`Queue message` label; disabled per machine-5 state;
  Enter keeps native newline behavior.
- Starters: `Application UI/Elements/Buttons/Secondary buttons`. Deltas: five localized `type="button"` actions,
  visually subordinate to the primary begin action.
- Begin action: existing `AuthSubmitButton` binding (Simple card button), `24px` targets, visible focus.
- Queued/generating articles: the 6.1 transcript article treatment (`Lists/Stacked Lists/Simple` delta) extended with
  the machine-13 speaker/attempt/state heading.
- Checking/unavailable/failure frames: existing `CourseAdmissionSurface`/`CheckingAccess`/raw-disclosure owners;
  empty/resume/finished presentations reuse the 6.1 owners.

## Test plan (local fakes only; never a paid/production provider)

- Unit (`tutoringSessions.test.ts`): parser acceptance/rejection for mutation documents (201/200/409 code variants;
  wrong session/message identity → protocol error) and current-work documents (all five states; reconciled null vs
  present; malformed reconciliation parameter rejection treated as check failure, never as "not committed"); boundary
  discard proof (stripped fields such as `latest_response`/`reconciled_response`/stop-retry-finish actions and
  protected markers never leave the boundary).
- Unit route/hook: begin-chain transitions (fresh checks before minting; send dispatched only after definitive create;
  retry after create success re-sends only the message; no automatic replay anywhere; Abandon only after inconclusive
  reconciliation; Stop waiting semantics); workspace send machine-2/5 transitions (criterion 9); composer label and
  enablement driven only by server-authored actions (idle → Send; slot free → Queue message; full/completed →
  disabled; no transcript inference); starter insertion never submits and stays editable; Enter inserts a newline; IME
  composition never submits; current-work region dedup by response ID; hidden-cause presentation equality
  (copy/focus/actions/URL/title); FFR-611 starter copy present in every locale; no storage writes.
- e2e (bundled Chromium): begin happy path free text and via starter (create 201 + send 201 → workspace shows the
  committed work); queue during an ongoing answer (slot free → `Queue message` → one distinct queued article; queue
  full → disabled with draft retained); lost send response → outcome unknown → reconcile committed and not-committed
  paths → explicit retry exact attempt and abandon; `tutoring_work_busy` slot-loss → explicit Refresh; reload during
  an unsettled attempt → no outcome claim, no draft, no replay; accessibility passes (axe stable states, 320px all
  text modes, 200% zoom, forced colors, reduced motion, seven-locale smoke).
- Secret hygiene: registered actual cases prove message content, request IDs, and response content never reach URL,
  title, storage, `history.state`, announcements, snapshots, or logs; deliberate-failure canaries per the existing
  checker.
- Focused checks while iterating (sequential, never overlapping): `npm run typecheck`, `npm run lint`,
  `npm run format:check`, `npm run check:i18n`, focused `npm test -- <files>`, one build + bundle check, focused
  Playwright specs, hygiene scope. Authoritative final `./run-all-tests.sh` is the separate verify phase.

## Exclusions

SSE streaming, stream epochs, reconnection, and live queue handoff (6.3/6.4); rich Markdown transcript rendering
(6.3); Stop, response retry, Finish, and completed-session review (6.4/6.5); history, summary, speech, and
used-material surfaces; multi-material selection and private material; Home active-session probing; any backend
change, RFC, dependency/config/budget change; global closure of BCG-012 or CP-05 Pass; announcement ledger rows beyond
the seeded "Message queued" transition.

## Risks

- The two-mutation begin chain is this story's core complexity; each mutation keeps an independent machine-2
  reconciliation authority (discovery vs current work) so no composite outcome is ever claimed.
- The `location.state` handoff is a new pattern; it is bounded to one opaque ID with explicit absent/none semantics
  (D2). The reviewer may prefer re-selection on the intent route instead — that would duplicate the material choice.
- The D4 follow-up read adds one GET per send; it is the mutation document's documented reconciliation purpose,
  non-refreshing, and never polled.
- Response-ID dedup between the paginated transcript and the current-work region is identity-based only; it must never
  become capacity or idleness inference (BCG-012 forbidden workaround).
- Bundle headroom: last verified 246187/256000 gzip bytes; the new surfaces join the lazy tutoring chunk; the budget
  is unchanged and enforced in the final gate.
- Backend evidence quoted is inspection, not a new backend test run; frontend fakes prove frontend behavior only.
  Manual supported-browser/AT release lanes remain open.

## Implementation progress

- 2026-10-11 implement (kimi-code/k3): Block 1 done — API boundary
  (`createStudentMessage`, `getTutoringSessionCurrentWork` in
  `src/platform/api/tutoringSessions.ts`), fixtures in
  `test/tutoringFixtures.ts`, 12 API tests pass; all 35 i18n keys in
  `messages.ts` and the 7 catalogs (`check:i18n` passes).
- 2026-10-11 implement (kimi-code/k3): Block 2 done — routes/hooks/components:
  `entryRoutes.tsx` intent path, `TutoringRouteProps.ts` intent variants +
  workspace `work`, `LearnSessionRoute.tsx` intent admission with
  `location.state` handoff and workspace ordered session→current-work→turns,
  `SessionStartMaterialRoute.tsx` Continue handoff, new
  `useTutoringSessionBegin.ts` (machine-2 create→send chain),
  `SessionStartIntentRoute.tsx`, `TutoringComposer.tsx`,
  `useStudentMessageSend.ts` (D4 follow-up read, AC-013 polite announce),
  `TutoringCurrentWork.tsx` (D5 response-ID dedup), `TutoringWorkspaceRoute.tsx`
  rewritten; `useTutoringSessionStart.ts` deleted. Unit suite
  `learnSessionEntry.test.tsx` rewritten: 35/35 pass. Composer hides the submit
  action in outcome-unknown (bound text locked; only Reconcile/Retry/Abandon).

- 2026-10-11 implement (kimi-code/k3): Block 3 done — e2e layer:
  `e2e/tutoringFixtures.ts` (send + current-work fakes, forbidden-request
  watch), `e2e/tutoringSessions.spec.ts` rewritten for the course → material →
  intent flow plus four new workspace send/queue/unknown/reload cases;
  `scripts/route-secret-hygiene-cases.ts` inventory extended (4 new cases);
  `scripts/secret-hygiene-evidence.ts` course-unit inventory reconciled with
  the 35-test suite. Planning-doc slice notes: BCG-012 dated Story 6.2 slice,
  FSM machines 2/5 slice notes, SURFACE-STATE-MATRIX session-start +
  Composer/Queue rows, ACCESSIBILITY-ACCEPTANCE CP-05 partial evidence notes.
- 2026-10-11 implement (kimi-code/k3): review fixes during checks — composer
  hides the submit action in outcome-unknown; the resume presentation keeps
  the departure dialog mounted (a trapped guard was found by e2e); the
  `TutoringSessionId` brand moved to `platform/api/entry.ts` so the eager
  route parser no longer pulls the tutoring API module into the initial chunk
  (FFR-955: 255436/256000); machine-2/machine-5 rhyme regions carry justified
  jscpd markers (0 clones); the reconcile failure tail is one
  `reconcileFailed` helper. Focused checks all pass: typecheck, lint,
  format:check, check:i18n, 901/901 unit, 12/12 tutoring e2e, tutoring-unit
  hygiene (43 tests, 47 checkpoints), route hygiene tutoring scope (12 tests,
  22 checkpoints), jscpd clean, bundle budget pass.

_(Filled by the implement phase.)_
