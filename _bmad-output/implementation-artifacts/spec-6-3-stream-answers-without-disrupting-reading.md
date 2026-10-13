# Story 6.3 — Stream answers without disrupting reading

## Preparation progress

- Block 1 complete: baseline `7b65da2f4393e9cb174815a4cca8ee4f6159d3a2`; existing dirty files recorded in the handoff, none in the proposed tutoring/Markdown source manifest. The untracked solver-owned 6.3 execution checkpoint is not a story edit. No user changes were reset or staged.
- Block 2 complete: runtime catalog lists `openai/gpt-6-sol#high` and `mistral/mistral-medium-2604#high` active; `.opencode/story-execution.md` still names `gpt-6.1-sol` for worker and `gpt-6-astra` for reviewer, superseded for this story by the owner's supplied 2026-10-12 selection. Local `opencode models <provider> --verbose` rejects `--verbose`; catalog API supplied exact IDs/variants without benchmark calls.
- Block 3 complete: npm dependency tree (`npm ls --depth=0`) passes; bundled Chromium executable exists; licensed `tailwindplus/` and metadata present. No install required.
- Block 4 complete: compared the live OpenAPI event-stream schema, tutoring operations, generated types,
  backend SSE writer, BCG-001/012 and UX acceptance. Snapshot/heartbeat/write deadline are defined;
  event IDs and per-event response identity are not. BCG-012's current-work read already supplies
  targeted response reconciliation; its remaining Stop/Finish/concurrency obligations do not block
  the bounded stream display. BCG-001's documented initial non-refreshing behavior is usable, but
  its replacement/reconnect sequence remains outstanding and is excluded here.
- Block 5 complete: mapped 6.1/6.2's stable response-ID article, current-work/send/route gate,
  paginated turns and 4.4's locked Markdown renderer. Existing licensed library is version
  `2026-09-13-083323`; new controls bind `Application UI/Elements/Buttons/Secondary buttons`
  v4/react-light.jsx; transcript keeps `Application UI/Lists/Stacked Lists/Simple` v4/react-light.jsx.
- Block 6 complete: bounded implementation specification below; the initial event-identity
  question was held without inventing a server ID or guessing a duplicate-delta policy.
- Block 7 complete (2026-10-12): owner settled path-bound identity/snapshot replacement for
  this no-reconnect slice and transport-error-only stream health. Added a narrowly scoped
  clarification to `FRONTEND-STATE-MACHINES.md` §3; updated acceptance/checks and manifest.
  No remaining 6.3 product or contract decision blocks implementation.
- Block 8 complete (2026-10-12): owner ruled unobservable unknown named SSE events never apply
  under native EventSource and satisfy the no-reconnect slice by construction; every observable
  violation still fences. The §3 note and this spec now record that ruling; implement resumes.

## Authority and bounded objective

`_bmad-output/planning-artifacts/epics.md` Story 6.3 and Epic 6 own the four acceptance bullets.
Use `spec-6-1-start-or-resume-the-students-tutoring-session.md` for session entry and route gate,
`spec-6-2-send-messages-and-show-the-single-queued-message.md` for current-work, composer and
response-ID dedup, and `spec-4-4-process-material-and-approve-its-brief.md` for the locked Markdown
boundary. These files live beside this spec; do not fork their owners. The binding detail is in
`_bmad-output/planning-artifacts/ux-designs/ux-mia-frontend-2026-09-12/`:
`FRONTEND-STATE-MACHINES.md` §§3, 4, 6, 13, 28;
`ACCESSIBILITY-ACCEPTANCE.md` AC-013 and CP-05;
`SECURITY-PRIVACY-ACCEPTANCE.md` §Untrusted Rich Content;
`EXPERIENCE.md` §Safe Rich Content; `SURFACE-STATE-MATRIX.md` §Tutor workspace;
`FRONTEND-PRD-FOUNDATION.md` FFR-607–610, FFR-953 and exclusions;
`BACKEND-CONTRACT-GAPS.md` BCG-001/012. Architecture AD-8 is recorded in
`_bmad-output/planning-artifacts/architecture/architecture-mia-frontend-2026-09-15/.memlog.md`.

## Verified transport and prerequisites

- `mia/api-doc/openapi.yaml` → `paths/tutoring.yaml#/tutorResponseEvents` is cookie-secured owner-only
  `GET /api/v1/tutor-responses/{id}/events`, `200 text/event-stream`, no-store, plus 401/403/404;
  no CSRF mutation or provider-start request. `resources.yaml#/TutorResponseEventStream` promises UTF-8,
  one `event` and JSON `data` line, snapshot first, then started/delta, terminal completed/interrupted/failed;
  heartbeat comment after 15 idle seconds and 30-second write deadline. Snapshot carries state and
  optional content (failed requires code); delta carries nonempty text, bounded in aggregate by 64 KiB;
  terminal event supplies state, not final persisted content. `generated.ts` exposes this SSE media as
  `string`, not discriminated event payload types; validate per-event JSON with feature-owned Zod schemas
  against the OpenAPI components, never pretend generated typing validates runtime input.
- `getTutoringSessionCurrentWork` accepts `response_id` and returns `reconciled_response` in the same
  owner-only atomic work read. Extend the existing minimal projector to expose only the targeted
  persisted response after verifying its immutable identity/session, rather than scan transcript pages
  or infer terminal success from an SSE event. Read it after terminal (including terminal snapshot),
  reconcile in place, and only then consider authoritative handoff to queued work. Failed targeted
  read retains unconfirmed content/attempt and disabled dependent claims. The existing projector
  currently strips `reconciled_response` and reconnect identity; do not use a second work-state store.
- OpenAPI SSE payloads contain no `response_id` or event `id` line. Per the owner decision
  2026-10-12 and the narrow `FRONTEND-STATE-MACHINES.md` §3 clarification, Story 6.3 binds
  response identity to the authorized stream URL path and atomically replaces state on a valid
  snapshot. Server event IDs and the full wrong-response/exact-duplicate/conflicting-duplicate
  rules that presume them are deferred to Story 6.4. Consecutive equal deltas cannot be deduped
  by text: apply each valid delivered delta once within the current epoch, never invent an event
  ID or claim replay detection that the transport does not support. Unknown named event types
  are unobservable and never applied by native EventSource (owner ruling 2026-10-12);
  fence observable malformed JSON on the six contracted types, delta before snapshot,
  regressive/illegal state ordering; ignore
  events after terminal. A targeted persisted response read must still verify its response ID
  and session against the path-bound target before installing it.
- BCG-012 global release evidence, live handoff, Stop and Finish remain open; 6.2's atomic
  current-work slice is reusable. BCG-001's operation-level reconnect/deadline obligations remain
  open for 6.4, not a license for automatic reconnection now. Initial stream opening must be
  authorized by the current admitted route/session/work epoch; on error close immediately to
  prevent the browser's native retry. The owner decision 2026-10-12 makes EventSource transport
  errors/close the only stream-loss trigger in this slice; the documented 15s heartbeat and 30s
  write deadline remain informational. No heartbeat-silence timer or health timeout is permitted.

## Acceptance by story bullet

1. Given currently admitted generating/queued response identity, open at most one native
   `EventSource` for that opaque ID; framework-independent stream controller owns one connection,
   epoch fence, closed-state union, atomic snapshot replacement, enforceable event validation/ordering,
   bounded 64-KiB accumulated content and one `useSyncExternalStore` adapter. No stream state in
   TanStack Query. Apply events only in the current auth/scope/response epoch. Initial/terminal
   text and accumulated partials pass into 4.4's `ModelMarkdown` (`partial` for unfinished
   structures), never raw chunk HTML; at most ten visual updates/second and token paint within
   100 ms under FFR-953. Keep each turn/attempt's stable response-ID article/heading/anchor.
2. Earlier turns and their semantic descendants remain mounted while a response grows. Do not move
   focus, selection or reading anchor on arrival. Only auto-scroll if the reader was already at
   the end before the update; otherwise show keyboard-reachable `New tutor content` targeting
   the first unseen stable anchor. Provide `Pause transcript updates` and explicit resume: freeze
   transcript DOM/auto-scroll/non-urgent stream announcements but retain bounded current-epoch
   work; resume presents one current buffered value and at most one latest transition. Do not
   pause backend work or close SSE for presentation pause. Use the single announcement owner
   for concise queued→generating/completed/interrupted/failed/lost transitions, deduped per
   response and epoch; no token/heartbeat/unchanged-snapshot live region or generated text in
   announcements. Existing 6.2 queued announcement seeds the ledger; avoid replaying it.
3. Terminal event or terminal snapshot closes/fences SSE, marks content unconfirmed and obtains
   targeted authoritative persisted response via the existing current-work data path. Replace
   incremental data and re-render through the locked Markdown policy **in place**, preserving
   attempt article, heading, anchor, earlier turns, focus, selection and scroll. If an altered
   descendant cannot hold reading position, expose persistent `View final response` control.
   Unavailable/denied/protocol-error results follow machine 3 and ordered gate without fabricated
   completion or duplicate announcement. Handoff checks targeted terminal truth first, then
   current-work identity before the next epoch; never derive capacity/Finish from SSE.
4. EventSource transport error/close, malformed JSON on contracted events, delta before a valid
   snapshot, regressive/illegal state ordering and applicable security teardown close EventSource
   synchronously and fence the epoch before a callback can mutate view state. Ignore events
   after terminal; reject mismatched identity in targeted persisted reads. Valid snapshots
   atomically replace state rather than append it.
   Unknown named SSE events cannot be observed by native EventSource and are never applied.
   Keep last authoritative content visibly unconfirmed and show a concise failure. No native
   automatic reconnection, application retries, 1/2/4 timers, user Try now, Stop response or
   retry controls or heartbeat-silence timeout in 6.3. The 15s heartbeat and 30s write
   deadline are informational only. 6.4 will supply explicit recovery atop the closed-epoch state.

## File and symbol manifest (planned; no implementation in prepare)

Changed:

- `_bmad-output/planning-artifacts/ux-designs/ux-mia-frontend-2026-09-12/FRONTEND-STATE-MACHINES.md`
  (§3): scoped owner-approved no-reconnect event-identity and transport-loss clarification.
- `_bmad-output/implementation-artifacts/spec-6-3-stream-answers-without-disrupting-reading.md`:
  preparation and implementation handoff record.
- `_bmad-output/implementation-artifacts/deferred-work.md`: record the authorized
  post-6.3 locale delivery improvement, including active-locale first paint and tests.
- `scripts/check-bundle-size.mjs` (`limit`): owner-authorized FFR-955 budget constant
  and brief dated rationale; do not alter the checker or the unrelated gate scripts.
- `src/features/tutoring/TutoringWorkspaceRoute.tsx` (`Transcript`): mount stream owner only
  after admission, preserve stable article identity, reader scroll/anchor and target reconciliation;
  preserve send/draft and existing refresh semantics.
- `src/features/tutoring/TutoringCurrentWork.tsx` (`TutoringCurrentWork`): stable keyed
  queued/generating/persisted attempt presentation through `ModelMarkdown`, bound controls and
  response-state labels; never duplicate the transcript page/sent item.
- `src/platform/api/tutoringSessions.ts` (`getTutoringSessionCurrentWork`, `TutoringWork`,
  `TutorResponseProjection`, `listSessionTurns`): validate targeted `response_id` and return
  minimal persisted response; preserve current send projection and no-store/non-refreshing reads.
- `src/platform/api/tutoringSessions.test.ts`, `src/features/tutoring/tutoringSession.test.tsx`,
  `src/platform/markdown/ModelMarkdown.test.tsx`: targeted projection, route, semantic and
  adversarial chunk-boundary tests.
- `src/app/routes/learnSessionEntry.test.tsx`: the existing 6.2 queued-work send case needs
  a browser-like idle EventSource in jsdom after 6.3 starts streams for admitted queued work;
  retain its original queued-announcement assertion and restore the global after the test.
- `src/platform/i18n/messages.ts` and
  `src/platform/i18n/catalogs/en-US.json`, `de-DE.json`, `fr-FR.json`, `pt-PT.json`,
  `pt-BR.json`, `es-ES.json`, `es-AR.json` (same directory): new localized status/reader
  actions; keep content out of catalog IDs/announcement text.
- `test/tutoringFixtures.ts`, `e2e/tutoringFixtures.ts`, `e2e/tutoringSessions.spec.ts`:
  controlled owner-only SSE and terminal work fixtures, stream/browser regressions; no real provider.
- `scripts/secret-hygiene-evidence.ts`: register the new targeted-terminal
  unit checkpoint in the existing deliberate-failure inventory; no checker-policy relaxation.
- `scripts/route-secret-hygiene-cases.ts`: register nine new protected
  stream/reconciliation browser journeys with their existing final checkpoint;
  preserve exact titles and deliberate-failure/marker-leak checks.

New:

- `src/features/tutoring/tutorStreamController.ts` + `tutorStreamController.test.ts`:
  plain TypeScript current-epoch protocol state machine, EventSource factory injection for unit
  tests, bounded snapshots/updates/teardown and guarded notification ledger; no generic SSE layer.
- `src/features/tutoring/useTutorStream.ts`: single `useSyncExternalStore` React adapter,
  route lifecycle cleanup and targeted read handoff; no component-level competing stream store.
- `src/features/tutoring/TutoringStreamControls.tsx`: existing blueprint-derived paused/unseen/
  final-response and connection-status controls outside live content, with stable anchor target.

Exact presentation inheritance: `Application UI/Lists/Stacked Lists/Simple` and
`Application UI/Elements/Buttons/Secondary buttons`, library `2026-09-13-083323`, both
`v4/react-light.jsx`. Record identity and accessibility deltas in adapted files; use no
licensed source in the manifest. If implementation finds a genuinely new presentation anatomy,
resolve its exact blueprint before building, not by inventing lookalike markup. No dependency,
generated API, router, architecture-script or backend edit is authorized by this spec; the sole
later owner-authorized script change is the FFR-955 budget constant and its dated comment above.

## Targeted checks and evidence boundaries

- Vitest controller protocol fakes: path-bound response identity, atomic snapshot replacement,
  malformed JSON on contracted types, unknown named events never applied, delta before snapshot,
  regressive/illegal ordering, equal
  consecutive valid deltas (not text-deduped), events after terminal ignored, aggregate content
  bound, transport error/close with immediate fence, teardown, old epoch, one connection and
  zero retries or silence timers after loss. No fabricated event IDs or real network/provider.
- Vitest/RTL: response-ID-stable nodes across partial/terminal replacement, same Markdown boundary
  at **every character boundary** for XSS/link/table/math cases, render cap/cadence, focus and
  selection continuity, pause/resume and single-owner transition ledger; terminal targeted
  current-work mismatch/denial/failed fetch and no fabricated completion.
- Bundled Chromium Playwright: local controlled SSE, generation/queue handoff, transport
  loss/error with immediate close/fence and no native retry or heartbeat-silence timeout,
  transcript early-reader scroll, auto-scroll only at end, unseen/final controls,
  keyboard and status semantics, 320px all text modes/seven locales, 200%/400% zoom,
  forced-colors/reduced-motion/text-spacing, representative axe scan and lifecycle/pagehide.
  Assert no external resources, unauthorized calls, protected bytes in URL/storage/console,
  traces/videos/screenshots or failure output. Disable protected artifact capture and use existing
  deliberate-failure hygiene checkpoints.
- Iteration only: sequential `npm run typecheck`, `npm run lint`, focused `npm test -- ...`,
  and scoped `npm run test:e2e:built -- ...` after a single local build. Later verify phase
  alone runs `./run-all-tests.sh` once on final application inputs and fingerprints them.
  Manual Chrome/Edge/Safari + AT/reading continuity remain unrun release evidence, not Pass.

## Risks, exclusions and settled decisions

Risk: without server IDs the frontend cannot recognize a replayed valid delta, so this
no-reconnect slice applies each delivered valid delta once within the current connection;
Story 6.4 must revisit event identity before introducing reconnect. Markdown parsing can replace
unstable descendants; adding the parser to an eager route can
exceed FFR-955; long-lived EventSource must respect sign-in shielding and auth lease; a
terminal snapshot may race a queued handoff. Measure rather than relax budget or gate.
No reconnect controls/delays, heartbeat-silence timeout, Stop response, retry response, Finish, summary/speech/history,
new model controls, backend/provider calls, speculative polling, or global BCG closure.

Owner decisions, 2026-10-12: §3's server-ID-dependent duplicate/identity rules are deferred
for Story 6.3; path-bound response identity plus atomic snapshot replacement govern the
no-reconnect slice, with the general rules preserved for Story 6.4. Stream health is
transport-error/close-driven only; documented heartbeat/write-deadline values are informational,
not a client timeout policy. No open owner decision remains for this bounded implementation.
The additional owner ruling of 2026-10-12 treats unknown named events as never applied by
native EventSource (fenced by construction); all observable protocol violations still fence.
Owner decision, 2026-10-12: FFR-955 initial-route JS budget is **258000 gzip bytes**.
The structural cause is approximately 66 KB of non-active locale catalogs in the entry
bundle; the measured analysis in `tmp/agent-execution/6-3-stream-answers-without-disrupting-reading/analysis-*.log`
found no behavior-compatible bounded mitigation. On-demand loading that retains synchronous
first paint for the active locale across all seven choices is approved follow-up work, not 6.3;
record it in `deferred-work.md`. This decision supersedes earlier notes here ruling out
raising the threshold; the checker algorithm, copy, seven locales and other gates stay intact.

## Implementation interruption — 2026-10-12

- API block partially installed: the existing current-work reader accepts an optional targeted
  `response_id`, validates the returned persisted response/session, and rejects absent/nonterminal
  targeted reconciliation; the synthetic fixture now models nullable reconciled response.
- Stream-controller block partially installed: framework-independent Zod-validated snapshot/
  delta/terminal state, epoch fencing, bounded accumulated content, paint throttle and native
  EventSource close on error. **Not tested or integrated:** hook, React presentation, locales,
  browser fake and targeted tests remain undone. Do not treat this as implemented or reviewed.
- Historical interrupted blocker, now resolved by owner ruling: the native `EventSource` API delivers custom SSE
  events only to listeners registered for their exact event type. It exposes no wildcard listener
  or raw event frame. An unknown `event:` type is silently unobservable to the application, so
  `FRONTEND-STATE-MACHINES.md` §3's requirement to fence the epoch on an unknown event type
  cannot be directly observed with the mandated native EventSource architecture. `onmessage` catches
  unnamed default events but **not** arbitrary unknown named events. This is distinct from
  the owner-approved absence of server event IDs; neither path binding nor snapshot replacement
  resolves it. Owner now rules such events never applied, satisfying the no-reconnect fence
  by construction. Do not claim tests can prove native observation of an event the browser
  never delivers. The earlier prepare readiness applied to event IDs and stream-health timeout
  only; this separate question was escalated and resolved. Pushover was delivered via PATH.

### Resumed implement progress — 2026-10-12

- Protocol/data block installed: native route-local stream controller with path-bound epoch,
  strict six-event Zod schemas, bounded snapshot/deltas, observable-error closure, terminal
  callback and throttled published content; targeted current-work reconciliation uses the
  existing owner-only read with verified immutable response/session identity. Unknown named
  events remain unobservable and never applied, per the new owner ruling.
- Presentation/locale block installed: `useSyncExternalStore` adapter and route-local targeted
  terminal read handoff, current-work article rendered via the locked Markdown boundary, seven
  launch-locale strings for stream transitions and reader controls. Integration, tests and
  accessibility verification are still pending; no completion claim at this checkpoint.
- Presentation integration block installed: transcript and current-work articles use the
  locked Markdown boundary; reader controls use the licensed Secondary buttons blueprint,
  with pause/resume, unseen-content and final-response navigation, scoped scroll anchoring,
  seven locales and the single announcer. Current-work and route fake now admit targeted
  terminal work reads and native SSE; focused unit/controller and browser coverage pending.
- Focused evidence block: 25 tests in the four affected controller/API/component/Markdown
  Vitest files pass. Browser tutoring suite passes 14 cases including terminal-targeted
  reconciliation, connection loss without retry, representative axe on final state and
  existing seven-locale/three-mode 320px and 200% zoom/forced-colors coverage. Typecheck,
  lint/architecture, i18n completeness, catalog parity (7 tests), and production build pass.
  Pause buffers content and terminal events without replacing transcript DOM; existing 4.4
  Markdown fixtures already exercise every adversarial character boundary. No paid provider,
  staging, review, commit or full gate. Manual supported-browser/AT evidence remains Not run.
- **FFR-955 blocker (owner interaction delivered):** the unchanged 256000-byte initial JS
  ceiling is exceeded: final measured initial gzip is 256554 bytes, 554 bytes over. The new
  seven-locale stream/status/control messages are required; a bounded wording/key-reuse
  pass still leaves the check red. A trial build-time descriptor packing variation in
  `scripts/message-catalogs.ts` passed its parity test but increased bundle size, so it
  was removed completely; no script or dependency change remains. The worker must not
  weaken the gate, remove required localized behavior, or claim this implementation ready.
  Await owner direction for a bounded bundle mitigation extension or other approved path;
  no application test/build result converts this failing budget into Pass.

### Bounded bundle mitigation assessment — 2026-10-12

- Solver authorized a bounded mitigation, preserving all seven synchronous launch locales,
  every localized message, the exact behavior and the unchanged FFR-955 gate. Re-inspected
  the production `messageCatalogModule`/`messageDescriptorModule` owner, Vite entry graph,
  catalog parity tests and nine newly introduced message IDs. Initial-route JavaScript
  remains 256554/256000 gzip bytes, 554 bytes over; the messages chunk is an initial import.
- The earlier story-local wording/key-reuse pass preserved semantics but did not fit. The
  tried descriptor-ID derivation in `scripts/message-catalogs.ts` increased gzip to 257210
  despite passing parity, so it was removed; that script's final diff is empty. No locale
  can be deferred without changing first-paint and synchronous switching, and no copy,
  dependency, budget, test or check may be removed/relaxed. A regional/descriptor packaging
  redesign with measured size and parity evidence would require a new scoped mitigation
  decision; it is not appropriate to improvise one across the global i18n owner here.
- Final targeted mitigation recheck: catalog parity seven tests pass, all seven ICU catalog
  checks pass, production build passes, bundle check fails by 554 bytes. All source/test
  inputs are otherwise unchanged from the previous passing typecheck, lint, 25-unit and
  14-Chromium focused runs. Implement remains blocked; no full gate, review, staging, commit
  or tracker edit. Options for solver/owner: explicitly authorize a measured synchronous
  build-time i18n-packing extension with parity/budget checks, or approve another precise
  in-scope route-entry size mitigation. Lazy locale loading, dropping copy or raising the
  threshold violate the supplied constraints and are not options.

### Owner-authorized FFR-955 resolution — 2026-10-12

- Owner approved a 258000-gzip-byte initial-route JS budget after the analysis-only round
  found approximately 66 KB of non-active locales in the synchronous entry graph and no
  behavior-compatible bounded mitigation. Updated only the constant and dated explanation
  in `scripts/check-bundle-size.mjs`; the check algorithm and other gate scripts are unchanged.
  Added the separate seven-locale synchronous-first-paint delivery follow-up to
  `deferred-work.md`; no locale loading change was made to this story.
- Affected-check block passed: checker regression tests 11/11, script syntax and format,
  typecheck, lint/architecture and production build; FFR-955 now passes at **256554/258000**
  gzip bytes (1446 bytes below the approved threshold). Existing 25 focused unit and 14
  tutoring Chromium results cover the unchanged story inputs. No full gate, self-review,
  staging, commit or done-state claim in implement.

### Independent review repair progress — 2026-10-12

- F1–F3 root-cause block: terminal SSE state remains visibly unconfirmed until the targeted
  persisted response is validated, when its definitive state is presented and announced
  once. The active attempt heading uses the admitted nonterminal state during reconciliation.
  Paused stream failures still close/fence immediately but buffer their presentation until
  Resume; auth/scope teardown remains immediate. The generating ledger is seeded from
  admitted generating work, leaving unchanged initial snapshots silent and allowing a real
  queued-to-generating transition. Affected existing controller/API/route unit regressions
  passed (17) before adding F4 coverage.
- F4 evidence block: browser-local controllable EventSource now exercises initial static
  generating silence, an actual queued-to-generating announcement, reader-away earlier-node
  identity/focus/selection/scroll and keyboard unseen action, paused transport failure with
  no article/live-region change until Resume, pending terminal without success copy, failed
  targeted read without false completion, and disagreement resolved by persisted truth.
  A matching controller fake checks paused transport/protocol error fencing without publish.
  Focused four-file Vitest run passes 27/27; focused F4 Chromium cases pass 7/7 and the
  whole affected tutoring Chromium file passes 21/21 (including its existing representative
  axe/reflow checks). Typecheck, lint and build pass; FFR-955 remains green at
  256571/258000 gzip bytes. Tests use local fixtures only. No full gate, paid provider,
  manual supported-browser/AT evidence, review, commit or tracker completion in fix.

### Verify-gate failure diagnosis and bounded repair — 2026-10-12

- The one final gate stopped at `npm run test`: 906/907 unit tests passed; the original
  6.2 queued-work follow-up assertion in `learnSessionEntry.test.tsx` failed. It reproduces
  alone. Temporary content-free diagnostic predicates (fully removed; original test SHA
  restored before repair) showed draft cleared and forbidden marker absent, but the polite
  region was **Connection lost**, not **Message queued**. The jsdom environment lacks native
  `EventSource`; 6.3's new `useTutorStream` opens an admitted queued response, so its
  constructor throws and correctly publishes a transport-loss announcement after the send
  owner's queued announcement. The previous 6.2 test had no browser SSE fake.
- Production behavior is correct for transport failure; suppressing loss to satisfy the
  legacy test would violate AC-013. Added a case-local connected idle EventSource double
  and global cleanup in that test file; its existing assertion is unchanged. The file is
  now in the manifest above. Isolated case passes 1/1, affected five-file unit selection
  passes 62/62, typecheck, lint and touched-file format/diff checks pass. No full-gate retry
  here: changing a test input invalidates the prior gate fingerprint. Solver must request
  new final verification; no commit or tracking update was made.

### Secret-hygiene verify recovery — 2026-10-12

- The later gate passed 907/907 units, build/bundle 256571/258000, i18n, API types and
  313/313 Chromium tests, then stopped at the course-unit deliberate-failure probe
  `activation-previously-active` before its checkpoint. The checker, inventory, activation
  test, activation route, and route configuration match the baseline Git blobs byte-for-byte;
  this inventory entry references only `courseActivation.test.tsx`. A scoped activation
  deliberate-failure run passes 30 tests/35 checkpoints. The exact intermittent upstream
  assertion is not identifiable from protected reporter output, and no activation code is
  changed or attributed to 6.3.
- Separate story-owned hygiene coverage gaps were found: the new targeted-terminal unit
  test had an unregistered `courseUnitCheckpoint`, and nine new stream browser journeys
  were absent from the exact route-test inventory. Registered those titles/checkpoints in
  their established owners, without modifying the hygiene checker. Scoped tutoring unit
  hygiene passes 44 tests/48 checkpoints; scoped tutoring route hygiene passes 21 tests/31
  checkpoints with the early-failure canary rejected and no fixture-marker leaks. Targeted
  tutoring API unit tests pass 13/13; typecheck, lint, script formatting and diff checks pass.
- One standalone complete `check:secret-hygiene:built` rerun progressed through all 191
  course-unit cases/257 checkpoints and both historical runner canaries, then stopped on
  a **different**, baseline-identical course-activation browser checkpoint
  (`preparation-activation-reflow-en-US-extra-large/complete`, no checkpoint, category
  `other`). That case is earlier in the route inventory than all new tutoring cases. This
  unrelated activation failure remains unresolved; the owner was notified with a
  content-free `interaction needed:` Pushover. No full gate, unrelated activation edits,
  commit or tracker completion in this recovery.

### Owner-authorized activation-flake diagnosis — 2026-10-12

- Inspected the unchanged course-activation unit/browser tests, route fixtures, both
  deliberate-failure runners and their Playwright config. Route probes execute one at a
  time, in separate Playwright processes with one worker, zero retries and a strict-port
  preview server; the failing `complete` checkpoint is deliberately reached only after
  the actual browser journey's assertions and cleanup. A pre-checkpoint test or fixture
  failure can therefore produce the observed missing-checkpoint signature; the older
  summary did not retain the protected original error or a diagnostic source location.
- Bounded reproduction: three activation-route scopes passed (38 tests/50 checkpoints
  each); two activation-unit scopes passed (30 tests/35 checkpoints each). Two separate
  complete `check:secret-hygiene:built` stages passed, each with 191 course-unit tests/
  257 checkpoints and 186 browser tests/383 checkpoints plus the canaries. Both full
  route runs retained content-free evidence via the existing report hook. No failure
  occurred in this diagnosis, so timing, resource contention, fixture race and process
  leakage cannot be distinguished by evidence. No assertion, product behavior or harness
  was changed to mask the failure. The solver must decide whether to seek further
  instrumented reproduction or order the required final full gate; these standalone
  hygiene passes are not a verified full gate.
