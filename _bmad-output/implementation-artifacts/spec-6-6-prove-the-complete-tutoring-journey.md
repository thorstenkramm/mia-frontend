# Story 6.6 — Prove the complete tutoring journey

Phase: prepare. Status: ready under the scoped 2026-10-13 owner decision. Baseline:
`872d44e706738965313751e00fb2068e4c45c99c`.

## Preparation progress

1. Worktree inspected: no staged changes. Existing workflow/AGENTS/README/gate, sprint tracker, older execution
   checkpoints and untracked workflow/scripts/checkpoints belong to the solver/owner. No overlap with this new spec;
   `execution/6-6-prove-the-complete-tutoring-journey.yaml` is already untracked and remains solver-owned. Preserve all.
2. Catalog checked without a paid benchmark: active `openai/gpt-6-sol#high` and active
   `mistral/mistral-medium-2604#high`; availability is not quota evidence.
3. Local prerequisites inspected: `npm ls --depth=0` passed; Node 26.8.2, npm 11.19.1, Go 1.27.1,
   `node_modules`, Playwright bundled Chromium 1243 executable and licensed `tailwindplus/` are present. No install
    needed. `mia/build.sh` invokes `go build -o mia ./cmd/mia`; backend executable and embedded SQLite migrations exist.
    No backend was started or provider contacted; backend setup is not required by the revised milestone.
4. Read Story 6.6, the accumulated 6.1–6.5 specs, browser fixtures and gate, Flow 1, Foundation milestone/exclusions,
   security/no-replay/existence-hiding, backend config/server/provider/test seams, BCG-011/012/020 slice notes and
   implemented OpenAPI entry points. Current Chromium tests exercise the built Vite preview with `page.route` API
   fulfillments, not a Go server. The backend gate's `go test ./...` uses local Go fakes/handler fixtures but is not a
   cross-repository browser journey. No existing externally runnable SMTP/provider fake chain was found.
 5. Scoped manifest below keeps application entry JS unchanged: last measured 6.5 bundle 259,261/260,000 gzip bytes
   (739-byte margin). Adding runtime code or raising this budget is outside this story without escalation.
 6. Initially documented the real-backend fake-provider blocker; on 2026-10-13 the owner explicitly removed the
    real-backend requirement for this milestone and declined the operator-run demo. Added a dated override to
    `epics.md` without changing its historical bullets. Replaced the blocked harness plan with the fake-browser
    chain, retained real integration as an explicit evidence gap, and confirmed no application/test implementation
    was performed in prepare.

## Canonical authority and prior evidence

Story: `_bmad-output/planning-artifacts/epics.md` Story 6.6, including its dated 2026-10-13 owner override. Binding
frontend companions live in
`_bmad-output/planning-artifacts/ux-designs/ux-mia-frontend-2026-09-12/`: `EXPERIENCE.md` Flow 1 and course
preparation Flow 2; `FRONTEND-PRD-FOUNDATION.md` milestone amendment and exclusions; `FRONTEND-STATE-MACHINES.md`
ordered gate, request-ID, tutoring work, finish and existence-hiding machines; `SECURITY-PRIVACY-ACCEPTANCE.md`
no-replay, privacy shield, least-data, secret hygiene and named negative suites; `BACKEND-CONTRACT-GAPS.md` BCG-011,
BCG-012 and BCG-020's bounded exceptions (not global closure). The backend owns transport and lifecycle:
`mia/api-doc/openapi.yaml` with referenced `paths/` and `mia/docs/product-requirements.md`. Follow existing 6.1–6.5
specs for individual outcomes rather than copying their state machines into this proof.

Existing `e2e/invitationAdministration.spec.ts`, `coursePreparation.spec.ts`, `courseActivation.spec.ts`,
`studentProvisioning.spec.ts`, `learnCourses.spec.ts` and `tutoringSessions.spec.ts` demonstrate isolated browser
flows with interceptors in `e2e/routeFixtures.ts`, `invitationFixtures.ts`, `courseFixtures.ts`,
`studentFixtures.ts` and `tutoringFixtures.ts`. `playwright.config.ts` launches Vite preview on 127.0.0.1:4173.
The gate (`run-all-tests.sh`) builds and runs `test:e2e:built` and deliberate-failure secret hygiene against preview,
plus the other frontend checks, not against the real backend. Story 6.5's spec records 919 units, 335 Chromium cases
 and a focused 259,261-byte bundle measurement, but these are previous evidence, not a backend-connected result. Reuse those checks;
 do not recast them as integration proof or rerun each auth suite as new story coverage. The owner has accepted the
 missing cross-repository proof as a *known gap*, not as passing evidence.

## Acceptance and consolidated browser proof

1. First story bullet under the dated override: one **continuous** Playwright UI journey on the existing built Vite
   preview and local in-memory OpenAPI protocol fakes. Administrator signs in and invites a supervisor; the fake
   invitation delivery records a synthetic token in memory (no real email/SMTP); supervisor opens the invitation link,
   accepts and signs in. Administrator creates a course and assigns that supervisor through the UI; supervisor edits
   teaching fields, creates/uploads synthetic course-wide material, receives a
   deterministic fake processing/brief outcome, reviews/approves and activates the course, and provisions the student.
   Student signs in using provisioned temporary credentials, completes required password change, enters joined Learn,
   starts and sends a message, observes deterministic fake SSE and persisted-result representations, finishes after
   authoritative fake current-work eligibility, sees a read-only persisted transcript, and starts a **distinct** second
   session. Assert the same fake data graph reflects the full sequence (invite accepted, course assignment/material
   approval/activation, joined student, first completed session, second active session with different ID). UI actions
   must drive every transition; no test-side mutation substitutes for the tested click. Fixture state changes at a
   server-equivalent boundary only in response to a verified UI request or to deterministic asynchronous processing.
   No database edits, curl, backend process or paid provider. These are **fake-backed frontend behaviors**, not proof
   of an actual usable deployed session or frontend/backend integration.
2. Second bullet under the override: reuse existing browser `page.route` response fixtures as the local SMTP/provider
   substitutes, with preinstalled fail-closed `**/api/**` and forbidden-external-request handling; never make a paid or
   production provider call. Invitation delivery, material OCR/brief and tutor stream are deterministic synthetic
   outcomes represented by in-memory fixture state, not real SMTP/provider services. Run `npm run build` then
   `npm run test:e2e:built -- e2e/completeTutoringJourney.spec.ts` for focused development; the unchanged full
   `./run-all-tests.sh` gate also picks up this spec through `playwright test`. Built preview is at 127.0.0.1:4173
   according to `playwright.config.ts`; no separate Playwright project/port or Go command is required. The
   operator-run real deployment is **not authorized and not performed**; explicitly record Not run.
3. Third bullet: add focused fake-backed recovery and scope-denial cases in that spec, sharing the same fixture graph.
   Drop a sent message response after the local fake records its request ID; assert one dispatch, outcome unknown,
   no automatic retry, then explicit Refresh reconciles current work without duplicate message/answer or protected
   leak. In an isolated second-user browser context set scope to another student, request the first student's opaque
   session route and assert fixed unavailable presentation, no transcript/current-work dependent fetch, and no
   educational content in DOM, accessibility tree, client storage or captured network responses. Compare the neutral
   surface with unknown-resource denial as existing tests do, without exposing cause. Keep negative permutations in
   6.1–6.5 evidence; do not duplicate full auth or Epic 9 suites.

The runner must assert settled first-session work and persisted fake response before Finish and the second distinct
start; a screen-only or partial chain fails this local-fake acceptance. Evidence must label its scope precisely:
*proven* = frontend UI chain on a shared synthetic OpenAPI fixture plus recovery/denial and existing unit/mock-browser
regressions; *not proven* = real backend wiring, SMTP/provider integration, migrations and actual deployment. The
real-backend integration gap remains open; do not describe these tests as backend-connected or as actual deployed
student usability. Report failed core steps as failures, not nonblocking defects. Other nonblocking defects may be
recorded with reproduction, environment and owner. Operator demonstration is Not authorized / Not run; broader
manual Safari/Chrome/Edge/AT and release matrix remain Epic 9, not passed by this story.

## Fake-state composition and concrete infrastructure

Use one shared in-memory scenario state for one Playwright test's isolated browser contexts and page visits. Reuse
`e2e/routeFixtures.ts` for stage discovery, CSRF and restricted gates; `invitationFixtures.ts` plus the existing
invitation-acceptance/password-flow mocks in `e2e/scaffold.spec.ts` for invitation handoff;
`courseFixtures.ts`, `materialFixtures.ts` and `studentFixtures.ts` for course/material/roster mutations;
`learnFixtures.ts` and `tutoringFixtures.ts` for joined-course discovery, work/SSE, completion and transcript.
Do **not** independently call `invitationBackend`, `materialBackend`, `studentBackend` and `tutoringBackend` on the same
page: each registers overlapping capabilities/course handlers and default state, so that would fabricate a sequence.
Compose their existing response builders/route logic under a single narrowly scoped `e2e/completeTutoringFixtures.ts`
owner: register shared session/capability/account identity once, derive each role's bounded authorization from shared
state, and register each API path once. Extract only reusable route-only installers where necessary; retain old
fixture callers and semantics. New state is test infrastructure, not app state. Implement the student-second-session
fake as a distinct ID and ensure discovery/turn routes refer to the correct session, rather than resetting a single
`session_1` fixture.

Use separate browser contexts for administrator, supervisor and student; keep the same fake-state owner across them.
Only login/acceptance/temporary-password replacement transitions change session stage; logout or new context must not
inherit protected data. Keep synthetic invitation/credential values in memory and use `routeSecretFixture` hygiene
helpers. Explicit request counters/operation labels and response metadata alone may enter failure output; assertions
on protected values must be boolean or one-way fingerprints. Stub processing/stream/summary only as needed to make
material ready and tutor response terminal; do not turn model output into actions or infer Finish eligibility. A
catch-all unhandled API route must fail the test locally, and requests to external origins must fail without following
them. As this is browser-level API mocking, never label it backend-connected integration.

## File and symbol map / boundaries

Story-owned implementation manifest: `e2e/completeTutoringJourney.spec.ts` (one chain with two focused recovery/denial
subcases in the same scenario, avoiding repeated setup),
`e2e/completeTutoringFixtures.ts` (shared fake-state scenario/route registration), narrowly necessary route-only
extractions in existing `e2e/routeFixtures.ts`, `e2e/invitationFixtures.ts`, `e2e/courseFixtures.ts`,
`e2e/materialFixtures.ts`, `e2e/studentFixtures.ts`, `e2e/learnFixtures.ts` and `e2e/tutoringFixtures.ts` **only where
composition demonstrably requires them**; `scripts/route-secret-hygiene-cases.ts` for the exact new browser
test/checkpoint inventory. If new secret-bearing cases fall outside the route-hygiene runner, extend
`scripts/secret-hygiene-evidence.ts`/`e2e/secret-hygiene.failure.ts` with deliberate-failure registration; do not
leave a new case unregistered or copy test bodies. `playwright.config.ts` already discovers `e2e/*.spec.ts`; the
existing npm `test:e2e:built` and gate run it automatically. No script, gate, workflow, Playwright config, backend,
dependency, application `src/`, or budget changes are planned. The sole prepare manifest is this spec and the scoped
dated note in `_bmad-output/planning-artifacts/epics.md`; solver alone owns sprint status and execution YAML.

Store content-free results under `tmp/agent-execution/6-6-prove-the-complete-tutoring-journey/`: scoped tracked/new
story diff after implement, commands, tool/browser versions, input fingerprint, pass/fail/skip, checkpoints and an
evidence matrix with separate rows for local-fake chain, recovery/denial, reused 6.1–6.5 evidence, real-backend gap
and skipped operator demonstration. No fixture bodies/secrets, provider payloads, credentials or protected text in
logs/reports. Never enable screenshot, video, trace, network archive or default error-context copies for these cases.
Register deliberate failures and early-failure canaries through the existing secret-hygiene inventory; inspect
process output and artifacts for synthetic marker absence. No extra MFA, whole-auth rewrite or Epic 9 release matrix.

## Checks and risks

Prepare: unchanged baseline and pre-existing changes checked, catalog/tooling checked previously, and revised story
note/spec planning consistency and whitespace checked. No application tests or backend run in prepare. During
implementation run sequential focused `npm run typecheck`, `npm run lint`, `npm run build`,
`npm run test:e2e:built -- e2e/completeTutoringJourney.spec.ts`, targeted route/secret hygiene, then the final
authoritative `./run-all-tests.sh` once in verify for the final executable inputs. Do not overlap checks; report
skipped tooling. `epics.md` and this spec are under `_bmad-output/` and exempt from Markdown lint conventions.

Risks: overlapping `page.route` interceptors and hardcoded one-account/one-session fake identities; a false link
between independently preset fixture states; asynchronous material/tutor outcomes; invitation token leakage;
default Playwright failure artifacts; accidentally permitting external provider traffic; pending work delaying Finish;
first-paint headroom only 739 gzip bytes. Use one scenario state and one route owner per path, bounded waits and
explicit request/identity counters, hygiene checks, and no runtime code. A fake-generated persisted representation
is not server-authoritative production evidence. The last 6.5 measured budget remains **259,261/260,000** gzip
bytes; no meaningful entry-bundle code in 6.6 and no relaxation. If a discovered defect requires application code,
report it for a scoped authorization and remeasure; do not silently broaden this proof story.

## Open decisions

None for this bounded fake-backed story. Owner decision 2026-10-13 removes real-backend automation here and expressly
declines the operator demo; those are recorded limitations, not tasks silently deferred into this story. Next action:
solver dispatches implement on this spec without touching the backend or claiming integrated deployment proof.

## Implementation progress — 2026-10-13

- Block 1: confirmed baseline unchanged and solver's in-progress tracker is pre-existing; reread current route
  fixtures and auth handoffs. The independent fixture installers overlap on capabilities/course paths. Compose
  role-specific routes with one shared scenario ledger and install only needed route-only ownership per page; never
  pretend the previous independent fixture happy paths are one continuous test.
- Block 2: added `e2e/completeTutoringFixtures.ts` shared multi-context fake graph, composing existing invitation,
  course, material, roster and tutoring fixtures with route-only roster extraction; added a single Playwright journey
  including interruption, scoped denial and second-session identity checks. No `src/` or backend edit. Registered its
  deliberate-failure checkpoints in the route inventory/runner. Typecheck passed, but browser behavior and hygiene
  have not yet been demonstrated; no success claim until those targeted tests pass.
- Block 3: built the unchanged application, ran the full synthetic browser chain end to end (including a second,
  distinct session) and nine affected historical browser regressions. Added the authoritative fake 404 before the
  second user receives any session document; an initial test-only variant improperly returned protected data to the
  unauthorized browser and was discarded, not passed. The finished scope-denial check asserts no dependent data
  request, no protected content in DOM/accessibility tree/storage/API responses, and unchanged safe presentation on
  reload. Existing 6.5 non-owner-versus-unknown case remains the separate cross-cause comparison.
- Block 4: scoped deliberate-failure scan passed one actual journey, eight secret checkpoints plus one early-failure
  canary; output and artifacts were marker-free. Typechecked the new browser files directly because the standard
  `tsconfig.node.json` excludes `e2e/`. Recorded that the new journey, recovery and denial are all one continuous
  Playwright test; they do not establish the real backend, SMTP/provider wiring or the operator demo.
- Block 5: final focused run passed the complete Playwright journey (one test), nine affected historical browser
  regressions, direct E2E TypeScript compilation, npm typecheck and lint, and scoped deliberate-failure hygiene
  (eight checkpoints and the early canary). Build and FFR-955 bundle check passed on unchanged application source:
  **259,271 / 260,000 gzip bytes** at current HEAD, 10 bytes above the earlier 6.5 measurement; do not claim the
  earlier 259,261 figure is this build result. All story-owned code, test, script and Markdown paths were formatted.
  Content-free logs/report and complete unstaged scoped diff are under
  `tmp/agent-execution/6-6-prove-the-complete-tutoring-journey/`. No backend process, provider, full frontend gate,
  independent review or commit was run in implement. The authoritative gate and independent review remain next.
- Block 6: tightened the fake's transcript: the first and interrupted second sends now each require a dispatched UI
  message before a deterministic terminal answer is made readable, carry separate turn identity/sequence, and are
  asserted as two persisted articles after Finish. Moved invitation and assigned-course shared-state transitions from
  test helper calls to successful API response events; reran the changed journey, E2E strict TypeScript, lint and all
  eight deliberate-failure hygiene checkpoints (plus early canary), all passing. Rebuilt the final scoped diff and
  content-free evidence manifest after those input changes. No full gate or independent review in implement.
- Block 7: exercised the first answer's deterministic fake SSE read before the terminal transcript. A development
  matcher initially used a protected fixture body and failed; removed its generated local failure artifacts, replaced
  it with a content-free public status assertion, and reran the browser chain, strict E2E types, lint and all scoped
  deliberate-failure probes successfully. No protected matcher or failure output remains in the story diff/logs.

## Fix progress — 2026-10-13

- F1 (invalid upload accepted): the journey now uploads a synthetic PDF whose filename matches the course material
  fixture, asserts valid creation/multipart/finalization/approval before processing and activation, and enables
  journey-only strict rejection of invalid create/upload/lifecycle requests. The fake's `makeReady` refuses to advance
  without valid persisted material, an uploaded file and processing state. Existing isolated material fixture callers
  retain their prior semantics.
- F2 (Refresh read count could be stale): the recovery test snapshots reads and query/reconciliation counts before
  Refresh, then requires a new current-work read using the exact interrupted attempt ID, a committed reconciled
  message result, public queued UI and no second POST. The existing tutoring fixture records only a boolean outcome,
  not protected response content.
- F3 (second session accepted malformed requests): the second-session fake now validates exact course/session paths,
  POST method, JSON:API media headers, CSRF, canonical and distinct request IDs, selected material relationship and
  exact start/message document shape; it rejects invalid input before any start/send state transition. The journey
  asserts both validity flags and single valid attempts. The original session's pre-completion start still falls
  through to its established fake; the second-session validator owns only the post-Finish start. Both starts now
  select the course material in the UI rather than relying on the default no-material radio. The student password
  replacement rotates CSRF, so second-session validation uses that rotated cookie value.
- Fix checks: the focused continuous Chromium journey passed, affected material/tutoring regressions passed, and the
  same eight scoped deliberate-failure hygiene probes and early-failure canary passed. No additional checkpoint is
  needed: the existing `complete` checkpoint executes the new final request-validity assertions. No full gate or
  commit was run in fix; final formatting/diff/log refresh follows.
- Final repair refinement: the first session also selects the approved course material rather than the default
  no-material choice. The recovery ledger is now indexed alongside every current-work query; the post-Refresh
  assertion pairs the exact interrupted request ID with a committed reconciliation result from **that same new read**,
  not two independent observations. The focused journey (one case), four affected regressions and eight secret-hygiene
  probes plus the early-failure canary passed again after this refinement.
- Final fix evidence: all story-owned files were formatted; strict standalone E2E TypeScript and npm lint passed on the
  final code. The new scoped diff and content-free checks/report are at
  `tmp/agent-execution/6-6-prove-the-complete-tutoring-journey/fix-story.diff`, `fix-report.json`, and `logs/fix-*`.
  The operator demonstration remains not authorized/not run and no real backend or paid provider was contacted. The
  full authoritative gate belongs to verify, not this repair phase.
