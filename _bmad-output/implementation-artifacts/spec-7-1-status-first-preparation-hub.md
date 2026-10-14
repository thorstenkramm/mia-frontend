# Story 7.1 — Status-first preparation hub

## Authority, baseline and boundary

Prepare-only spec. Baseline `0f5ed193db3d07c312573e3ef27d9d8381868f77`; backend
`63c99925e5995fe2e2467f4f894976dfd4c0d297` (unchanged from package verification).
Story authority: `epics.md` Story 7.1 (11 criteria), 2026-10-14 owner rulings, and
`tmp/course-preparation-redesign/README.md`, numbered files 01–06; `03-state-model.md` overrides
illustrative screenshots. Canonical behavior remains in `EXPERIENCE.md` §Course Preparation,
`SURFACE-STATE-MATRIX.md` §Prepare courses, `FRONTEND-STATE-MACHINES.md` machine 12 and its dated notes,
`ROUTE-INVENTORY.md` §Preparation Hub, `DESIGN.md`, `ACCESSIBILITY-ACCEPTANCE.md` (CP-03;
AC-001–006, 009, 012, 015–016, 019 as applicable), `SECURITY-PRIVACY-ACCEPTANCE.md`, and BCG-011's
approved 4.2/4.5 slices. This spec references rather than duplicates those contracts. The exact
presentation/copy package covers all three surfaces; **only HUB-1..6** are implemented here.

Implementation rebaseline: `e41c2b80a480b885d5abc79e776178f2ca6fbed5` landed the
separately authorized locale on-demand follow-up; earlier baseline/forecast below is historical
prepare evidence. Existing owner bookkeeping remains excluded from this story.

No route, API operation, domain state, dependency, new authenticated read, or new activation mutation.
Stories 4.2 and 4.5 already implement the admission, readiness projection, and activation.
Backend current `api-doc/paths/courses.yaml#/course` declares GET `200 CourseDocument` or
`503 course_readiness_unavailable` (error document, no course data), plus existing 401/403/404/406.
`schemas/resources/resources.yaml#/CourseReadiness` supplies state, activation eligibility and ordered
blockers with ID/link; `Course` supplies saved text, nullable lifecycle instants, and supervisor relationship.
Backend `internal/course/readiness.go::evaluateReadiness/readinessLink`,
`internal/course/handler.go::courseResource/mutationOutcome`, and
`internal/material/material.go` confirm the package's five blocker IDs, same-course API links and
separate technical/educational material readiness. `POST /students` on inactive returns declared 409.
No backend drift or new BCG gap was found. Existing API links are **never** client hrefs: use 4.5's
validated same-course ID-to-trusted-destination mapping.

## Acceptance blocks and HUB presentation states

1. **A — header/status, AC 1, 3–7.** Exactly one status panel immediately after the admitted header,
   status heading `h2`; preserve one shell `main` and one page `h1`. The header has Prepare courses ›
   admitted course name, `<bdi>` course name as h1, an Inactive/Active text-and-shape pill, Last checked
   and user-triggered Refresh. The panel gives one dominant action: HUB-2 Review and activate goes to
   **readiness**, never directly to activation; all other data-bearing states offer Open readiness review.
   Preserve existing ordered admission and one GET/explicit Refresh behavior.
2. **B — server blockers, AC 1–2, 6.** Render *only* `readiness.blockers`, in returned order, with a
   localized ID-mapped name and explanation, accessible named Unmet icon, and at most one trusted action.
   Inactive uses Blocking activation; active_not_accepting uses Blocking new tutoring sessions.
   `supervisor_presence`: administrator guidance, no action. Invalid/null/cross-course API link: no
   resolver, no guessed href. Do not synthesize action-eligibility-only rows on the hub or met indicators.
3. **C — course setup, AC 8–9.** Description list in order: language display name in current interface
   language **plus stored BCP 47 tag** (e.g. English (en)); learning goals and AI instructions saved
   two-line escaped plain-text excerpts or Not written yet; curriculum saved two-line excerpt or Not
   added, marked Optional; name and description or no description; supervisor count from existing
   `relationships.supervisors.data.length`, no identities or assignment action. One inline contextual
   action per editable row to the existing teaching route; action names identify the field. Server
   blocker IDs alone cause Blocks activation/Blocks new sessions badges, even when fields are nonempty;
   emptiness alone never causes a badge. Preserve the BCP 47 tag even if display-name support is
   unavailable; never substitute a UI locale for course language.
4. **D — materials/students, AC 5, 8.** Exactly two single-link cards to existing scoped routes;
   one material blocker badge only for `qualifying_material`. Student copy is course-state-specific:
   inactive says addition requires an active course; active says create or add. Remove duplicate
   materials/brief and sidebar Prepare links and the standalone student-create action from the hub,
   without changing actual roster routes or authorization.
5. **E — unavailable/privacy, AC 7 and AC 10.** Specific GET 503 code
   `course_readiness_unavailable` receives HUB-6: generic Course preparation h1/breadcrumb,
   no course identity, meta, setup or cards; red status panel, explicit Check again through current
   ordered admission epoch, Prepare courses exit, collapsed `TechnicalErrorDisclosure`.
   Unrelated protocol/network failure retains safe generic host recovery; hidden 404/429/out-of-scope,
   restricted session, stale response and teardown retain existing fixed privacy treatments. Never
   expose cached name/title during failure or turn 503 into an empty readiness list.
6. **F — integration/a11y, AC 10–11 and CPR-NFR-01..07.** No collections or blocker-link fetch;
   validate all six states in seven locales, keyboard and headings, 390px layout plus direct 320px
   and 1280px/400%-zoom all text modes, 200% process, forced colors, spacing and axe stable states.

Truth table, with `03-state-model.md` definitive on combinations:

- HUB-1: `readiness.state=inactive_incomplete`; blocker-count panel, server blocker section and
  setup/entries; no activation action even when previously activated.
- HUB-2: `inactive_activatable`, `activation.eligible=true`, `activated_at=deactivated_at=null`;
  ready panel, Review and activate to readiness, no blockers section.
- HUB-3: `inactive_activatable`, at least one lifecycle instant set; gray nothing-blocks panel with
  reactivation-unavailable explanation, only readiness link, no activation entry.
- HUB-4: `active_accepting`; green accepting panel with authoritative `activated_at` and readiness
  link; active students description. No blocker section.
- HUB-5: `active_not_accepting`; amber not-accepting panel, existing sessions continue,
  server blockers under Blocking new tutoring sessions, readiness link.
- HUB-6: GET `503 course_readiness_unavailable`; no course representation, generic header/red panel
  and safe retry/exit/disclosure only. Other errors do not claim HUB-6.

Already implemented `toPreparation` integrity validation rejects inconsistent state/eligibility;
do not add a fallback panel or derive eligibility from text/material count. `canFirstActivate` remains
the existing first-activation gate. Reconciliation: the package's HUB-1 two-blocker action example
assumes those two have resolvable, validated links; if one is supervisor_presence or invalid link,
the more specific no-action contract wins.

## Exact existing owners and proposed story manifest

- `src/features/courses/CoursePreparationRoute.tsx`: replace flat destination nav, old status and
  all-equal buttons with HUB header/panel/sections/setup/entry cards; retain explicit Refresh and
  admitted `CoursePreparation`. Keep presentational branching local and named; do not rewrite editors.
- `src/features/courses/CourseReadinessChecklist.tsx`: extract/reuse only server blocker-card
  presentation and safe destination resolution for future 7.2 readiness. The *existing* checklist,
  action-blocker extras and availability copy remain on the readiness route until 7.2; avoid
  altering readiness/activation behavior now. If sharing materially increases the bundle, keep
  the new card owner hub-only and schedule reuse in 7.2 rather than forcing eager import.
- `src/app/routes/AdminCourseRoute.tsx`: narrowly customize CourseResourceHost's **hub-only** 503
  branch after failure classification; retain `useCourseResourceAdmission`, hidden-denial classification,
  epoch fence, checking, generic recovery and all unrelated admin/prepare consumers.
- `src/app/ApplicationShell.tsx`: narrowly supply an admitted-hub-only header slot/heading override
  and wider content column for breadcrumb/name/meta and panel. Default shell routes, navigation,
  mobile behavior and BuildIdentifier remain unchanged. Preserve title-before-focus ordering and
  protected identity teardown. Existing route descriptor title stays generic Course preparation
  unless a scoped admitted-title integration is necessary for the protected course name; never
  prefill it from a cached resource.
- `src/platform/i18n/messages.ts`, `src/platform/i18n/catalogs/{en-US,de-DE,es-ES,es-AR,fr-FR,pt-PT,pt-BR}.json`:
  complete hub strings only, all seven in lockstep; no English fallback.
- `src/app/routes/coursePreparation.test.tsx`, `e2e/coursePreparation.spec.ts`: replace old hub
  text/nav/checklist assertions (connected persisted-fields test; authoritative readiness/safe
  blocker-link journey; 503/denial; all-locale reflow and 200% zoom). Preserve teaching-field,
  dirty-form, delayed-denial, epoch and hygiene assertions. `src/app/routes/courseActivation.test.tsx`
  and `e2e/courseActivation.spec.ts` assert old hub after definitive success; update just those
  success/hub-copy/heading assertions without changing activation operation semantics.
- `scripts/secret-hygiene-evidence.ts` and `scripts/route-secret-hygiene-cases.ts`: register
  *any new* protected-name/unavailable deliberate-failure unit/browser journeys using the existing
  content-free checkpoint scanner. Existing test registration must remain intact.
- This spec is the sole new tracked path in prepare. No API schema/adapter/routing rewrite, config,
  dependency, shell build-ID relocation or general i18n loading change is authorized.

If a bounded 503 branch can be owned by `PrepareCourseRoute.tsx` rather than the shared host without
violating ordered admission, prefer that smaller owner; do not catch a 503 as a successful resource.
The implementation owner must report any manifest expansion to the solver before writing it.

## Blueprint bindings (retrieved licensed source)

Tailwind Plus library `2026-09-13-083323`, all `Application UI/v4/react-light.jsx`:

- Header: Headings › Page Headings › **With meta and actions** (replace h2 with shell-owned h1,
  omit sample menu, use admitted breadcrumb/meta/Refresh, wrap rather than truncate).
- Status panel: Feedback › Alerts › **With actions** (tone variants using default palette and
  shape-different icon, `h2`, conditional action; HUB-6 scoped red variant). Existing
  `RouteRecoveryPanel` uses this exact blueprint and supplies collapsed disclosure in recovery.
- Blocker card: Layout › Cards › **Card with header** (name/status/body and one trailing
  trusted action in responsive header/body, no sample placeholders).
- Setup: Data Display › Description Lists › **Left-aligned with inline actions** (existing
  4.2 binding; stack label/value/action at small widths, wrap long untrusted text).
- Entry cards: Lists › Grid Lists › **Horizontal link cards** (replace example people/avatar/
  remote images with local icon and title/body; exactly one trusted full-card link).
- State/badges: Elements › Badges › **Small pill with border** (default colors plus text/icon
  shape; not color-only). Existing canonical button, technical disclosure, breadcrumb and shell
  bindings remain in their owners. Record identity/version/deltas at adapted presentation owners;
  do not commit licensed sources or reproduce screenshot markup. Contrast must be measured.

## Message inventory and split with Story 7.2

Reuse existing descriptors: `preparation.hub`/`preparation.hubTitle` (generic failure identity),
`preparation.language`, `activation.supervisor`, `activation.readiness` (child only),
`preparation.activatable` where currently consumed by child, existing Last checked, Refresh,
Technical details, and existing safe exit message. New for 7.1: all `preparation.statePill.*`,
`preparation.badge.*`, `preparation.openReadiness`, hub `preparation.panel.*`,
`preparation.blockers.heading.*`, `preparation.blocker.*`, `preparation.setup.*`,
`preparation.entries.*` from `05-copy-deck.md`; supply separate contextual labels and ICU
plural/count, and localized language name via standard display-name API, with raw stored tag.
`preparation.backToHub` belongs to 7.2 and is not needed for this hub. Carry over the copy deck's
course-name `<bdi>` requirement.

Retirement split: remove `preparation.incomplete`, `.readiness`, `.unmet`, `.noBlockers`,
`.material`, `.accepting`, `.blocked` from `messages.ts` and all seven catalogs **only after**
all actual uses disappear; 7.1 replaces the hub uses but `CourseReadinessChecklist`,
`CourseReadinessRoute` and `materialLifecycle.test.tsx` still use several of these. Defer their
physical removal to 7.2 unless 7.1 fully eliminates all actual consumers without changing 7.2
presentation. `activation.effect`, `.material`, `.previous`, `.changed`, `.rejected`, `.unknown`,
`.unavailable` are owned by activation/readiness and must remain through 7.1; 7.2 replaces/removes
them together in all catalogs. Do not change existing meanings merely to avoid adding a key.
`preparation.supervisor` and `.activatable` are **not** listed as retired; preserve them if used.
No catalog deletions in advance of use-site replacement, and no dangling descriptors.

## Focused regressions, hygiene and verification

Unit/integration: all HUB conditions, blocker order/count/no href from link text, action count,
first-activation suppression after lifecycle instant, saved/whitespace field rendering without
locally inferred badge, language name/tag across locales and unknown valid tags, supervisor count
without identities, action naming, no duplicate destinations, 503 versus hidden 404/429 and
generic failures, no stale protected name/title/breadcrumb on denial/teardown, refresh once in
current admission epoch. Network assertions: only current course GET after established ordered
session/capability/scope reads; no materials/students/supervisors collection, no additional request
on display/locale switch. Blocker action absent for supervisor_presence and invalid/null link.

Browser: controlled local synthetic data, HUB-1..6 and returning from successful 4.5 activation,
responsive 390/320, 200%/400% process, seven locales × three text modes, spacing overrides,
forced colors, reduced motion, keyboard/focus/title ordering, headings/landmarks/accessible names,
axe stable states, collapsed disclosure, escaped untrusted excerpts and BDI name. No screenshots,
traces, logs or test names containing protected fixture bodies. New deliberate-failure hygiene
cases must be registered at both applicable registries and scanned before asserting success.
After implementation run sequential focused typecheck, lint, relevant Vitest, i18n, targeted
Playwright against one build, bundle check and hygiene; full `./run-all-tests.sh` only in verify
phase, once on final inputs. Spec-only prepare has no application gate.

Negative expectations: never an activation entry for previously activated; never `href` built
from blocker.link; never collection reads/overfetch; never met/checkmark/progress indicators
for unreported prerequisites; no optimistic status or success from ambiguous mutations.

## Bundle forecast, risks and decision gate

Initial-route JS limit 260,000 gzip bytes. Supplied measure 259,271 (729 bytes free); locally
inspected existing `dist` computes 259,274 (726 bytes free), a stale build artifact, not a new
build or a final gate. New 7-locale ICU status/section/card/setup strings plus shell/host logic
likely exceed 726 bytes even though the hub route JSX itself is code-split. Conservative
projection **+5–15 KB gzip initial** (order-of-magnitude, not a measured build), or
~264–274 KB total, ~4–14 KB over budget; exact result requires a final build. Removing old
keys in 7.1 cannot be assumed because shared readiness/activation still consume them.
`deferred-work.md` records on-demand catalog loading (~66 KB potential savings) but that is
outside 7.1 and must not be implemented without separate owner authorization. Do not raise
the budget or omit locales/copy. Other risks: existing shell max-w-lg/static h1 and generic
error host require *scoped* presentation accommodation; same checklist is shared with 7.2;
39+ browser navigations and localization/reflow can be flaky. Do not weaken tests to pass.

**Open decision (owner/solver):** authorize a separately scoped, independently verified locale
on-demand follow-up *before* 7.1, or approve a bounded measured in-scope bundling mitigation
with explicit paths/behavior and no missing strings, or explicitly revise the FFR-955 budget
through the product owner. This is a blocker to a `ready` handoff while projected overflow is
unresolved. No mitigation is implemented in prepare. Shell accommodation is already necessary
to meet the approved AC and does **not** include Story 7.3 build identifier relocation.

## Preparation progress

1. Baseline, intentional dirty files, tooling, models and backend SHA inspected; no known
   application overlap or install needed.
2. Read entire package and applicable UX/security/accessibility/API contracts; verified current
   hub, shared checklist, API projection and backend implementation; inspected screenshot anatomy.
3. Mapped all 11 ACs, exact licensed bindings, copy retirement and test owners in this spec.
4. Bundle decision outstanding. No implementation, build, test, staging, sprint/checkpoint edit
   or commit performed.

## Implementation progress (2026-10-14)

1. Rebased against committed locale on-demand follow-up; bundle blocker cleared by owner.
   No unrelated application overlap found. Prior prepare decision gate above is historical.
2. Completed presentation blocks A–E: admitted-only breadcrumb/h1/meta, server-fact status,
   server-only blocker cards and trusted resolution routes, saved setup excerpts and badges,
   single-link material/student cards, and 503-specific generic red recovery. The shared
   host still owns its admission/epoch/denial handling and existing review stays unchanged.
   Existing `src/platform/ui/RouteRecoveryPanel.tsx` is an additional necessary manifest
   owner for the red 503 variant; its default yellow state is untouched.
3. Added all 57 hub-specific descriptors across seven translated catalogs. Retained old
   readiness/activation keys for Story 7.2 as planned. Typecheck passes. Tests/evidence pending.
4. Added HUB state/blocked-link/503 unit tests and two browser reflow/zoom journeys; updated
   only existing hub-presentation assertions on preparation and post-activation journeys.
   Registered new deliberate-failure checkpoints. The scoped hygiene selectors must include
   `hub-` test IDs and `hub ` unit titles; consequently the bounded inventory runners
   `scripts/check-secret-hygiene.mjs` and `scripts/check-route-secret-hygiene.mjs` join the
   manifest without changing their full-gate/default scan or failure semantics.
   First focused unit run found obsolete test selectors, repaired; 46 affected tests now pass.
   Initial Chromium run passed 47/52, then the five actual test mismatches (old inline-nav
   selectors, changed hub copy and new locale test pre-navigation) were corrected; affected
   5/5 targeted rerun passed. Final focused browser and hygiene evidence pending.
5. Final focused source/tests now pass: sequential typecheck, lint/architecture, 46 connected
   preparation/activation unit cases, complete seven-catalog ICU validation, Prettier on explicit
   manifest, whitespace, zero duplication clones, and a production build followed by FFR-955.
   Initial entry/static JS 194,203 gzip bytes; largest initial paint is pt-BR 219,352/260,000
   (40,648 bytes headroom), all seven locales under the fixed limit. All 52 existing and new
   preparation/activation Chromium cases pass on the same built artifact, including HUB-1..6,
   role/heading/denial and seven-locale/three-mode 320px, 390px, 200% journey and 400% hub.
6. Deliberate-failure hygiene complete: preparation-unit selected 23 tests/30 checkpoints;
   preparation-route selected 52 tests/84 checkpoints; both early-failure canaries rejected,
   no protected marker reached original outputs or artifacts. First bounded browser-hygiene
   command exceeded a five-minute tool timeout while individual probes were passing; confirmed
   the original scanner had exited and terminated its own orphan preview server before running
   the same scope to completion with a longer allowance. No overlap, weakened scan or claim
   that the interrupted partial scan passed. Focused browser suite then passed 52/52.
    Reviewable scoped diff and content-free logs are in `tmp/agent-execution/7-1-status-first-preparation-hub/`.
    No full gate, independent review, commit, supported-browser/AT manual certification or
    release-wide accessibility Pass was attempted in implement.

## Review repair progress (2026-10-14)

1. F1: `toPreparation` now rejects `inactive_activatable` with `activation.eligible=false`
   before mounting any course UI. Added an admitted-route negative test with no lifecycle instants
   asserting generic Story 4.5 protocol failure, no course identity and no false previous-activation
   or activation action. Existing valid previously-activated/eligible state remains unchanged.
2. F2: setup values now clamp only goals, instructions and curriculum; language tag and
   name/description have no line cap. Added a 320px browser regression in all three text modes
   using long synthetic saved values and last-glyph geometry/overflow assertions. Registered
   both new test checkpoints in the existing hygiene inventories. Focused checks pending.
3. Focused unit run exposed a stale Story 4.5 test fixture simulating an eligibility change
   while keeping the old `inactive_activatable` readiness state. Updated that fixture to
   supply a coherent `inactive_incomplete` response so its unchanged no-dispatch assertion
   still exercises actual changed eligibility, not malformed transport.
4. First browser run passed 52/53; new geometry probe selected a badge alongside the
   language value, so its selector was narrowed to the value span. Failed browser artifact
   removed; targeted rerun and hygiene pending.
5. Final focused checks pass: 55/55 unit tests (including the negative protocol case and
    coherent activation change), 53/53 Chromium cases (including all three narrow-width
    text modes), typecheck, lint/architecture, production build, Prettier on changed files,
    zero duplication clones and whitespace. Scoped deliberate-failure hygiene passes
    24 unit tests/31 checkpoints and 53 route tests/86 checkpoints, with early-failure
    canaries rejected and no marker leak. No full gate or commit in this fix phase;
    solver should send the refreshed scoped diff to the independent reviewer next.

## Gate repair progress (2026-10-15)

1. GATE-1 root cause: the affected-browser inventory omitted three existing journeys
   traversing the hub. Updated complete tutoring, material preparation and student
   provisioning waypoints to assert the admitted course-name h1 and new sections/status,
   then use the single-link materials/students entry cards. The complete journey now
   enters material and student creation through their collection routes; its fake graph,
   downstream mutations and assertions remain intact. The student journey retains its
   original title/main/h1 checks while using the new h1. No new deliberate-failure
   checkpoints were introduced. Swept every e2e hub-route reference: other direct
   hub consumers are already in the 7.1 preparation/activation suites; direct child
   routes and Prepare courses collection are not traversals of this hub.
2. After the traversal edits, focused Chromium, formatting and review evidence
   were the remaining work. Full gate and commit remain exclusively for the
   subsequent authorized phases.
3. Initial full affected-file Chromium run: 46/47 passed. The added roster-card
   waypoint performs one authorized empty roster read, so the existing later
   exact-one-roster-read expectation needed to be relative to that pre-creation
   read. Asserted initial empty read is exactly one and post-creation adds
   exactly one; the unchanged downstream membership/single POST/no-forbidden-read
   assertions remain. The repaired single journey passed before the full
   affected-file rerun.
4. Final repair checks: 47/47 Chromium cases across all three affected files
   passed; the three new waypoints are covered. Sequential typecheck and lint
   passed; Prettier reports the three journey files unchanged after formatting.
    No additional deliberate-failure checkpoints were added, and the existing
    checkpoint registry entries/titles are unchanged. No full gate or commit was
    run; the solver must submit the refreshed scoped diff to review, then authorize
    a new gate for these changed test inputs.

## Review repair progress (2026-10-15, third batch)

1. The failed-hub-read activation regression now checks absence of the current
   accepting-status heading and Active state pill, rather than the retired copy.
   Its existing single-activation assertions and post-retry authoritative state
   checks remain in place. Focused Chromium case passed (1/1); Prettier write
   and check passed. No full gate or commit; next action is independent repair
   review, followed by a newly authorized gate for changed test inputs.
