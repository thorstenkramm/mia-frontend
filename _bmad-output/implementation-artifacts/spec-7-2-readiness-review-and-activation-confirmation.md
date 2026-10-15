# Story 7.2 — Readiness review and activation confirmation

## Authority, baseline and boundary

Prepare-only spec. Baseline `afaa2fa` (sprint-change integration commit on top of landed Story 7.1
`869c99d`). Backend `63c99925e5995fe2e2467f4f894976dfd4c0d297` (unchanged; verify before implement).
Story authority: `epics.md` Story 7.2 (eight criteria), sprint change proposal 2026-10-14, and
`tmp/course-preparation-redesign/` files 01–06; `03-state-model.md` overrides screenshots, and
`05-copy-deck.md` owns strings. Canonical behavior stays in `EXPERIENCE.md` §Course Preparation,
`SURFACE-STATE-MATRIX.md` §Prepare courses, `FRONTEND-STATE-MACHINES.md` machine 12 and the Story 4.5
operation states (both unchanged), `ROUTE-INVENTORY.md` (unchanged: no route, parent or title change),
`DESIGN.md`, `ACCESSIBILITY-ACCEPTANCE.md` (CP-03), `SECURITY-PRIVACY-ACCEPTANCE.md`, and BCG-011's
approved 4.5 slice. This spec references rather than duplicates those contracts. The package covers
three surfaces; **only RDY-1/2 and ACT-1..7** are implemented here; HUB-1..6 are done (7.1).

Presentation-only refinement of the implemented readiness review and activation confirmation. No route,
API operation, domain state, new authenticated read, or new activation mutation. `getCourse` remains the
only read (route admission, activation pre-dispatch check, explicit reconciliation); `activateCourse`
remains the only mutation. Machine-12/4.5 semantics — attempt fencing, security-epoch loss, no replay,
departure guard, announcement politeness, `canFirstActivate` gating, `toPreparation` integrity
validation — are preserved unchanged; this story re-presents the same states. Backend
`04-backend-contract.md` evidence stands: five blocker IDs, ID-mapped trusted destinations, never a
client href from a returned link.

## Acceptance blocks and RDY/ACT presentation states

1. **A — readiness header and RDY-1, AC 1.** Shell course header: breadcrumb Prepare courses ›
   `<bdi>` course name › Course readiness (current page `aria-current`, name links to the hub); h1
   Course readiness; meta row leading with the `<bdi>` course name, then the existing state pill,
   Last checked and explicit Refresh (ordered re-admission). Wide content column as the hub. RDY-1
   (inactive, `activation.eligible = false`): amber status panel, heading Activation unavailable, body
   with `{count}` = server display-blocker length; no status icons or checkmarks beyond the panel's
   tone icon; no panel action.
2. **B — unmet prerequisites and the static explanation, AC 1.** While server display blockers exist,
   the readiness review lists them as the 7.1 blocker cards (same component, server order, safe
   ID-mapped destinations, no action for `supervisor_presence`), under section heading Unmet
   prerequisites when inactive and Blocking new tutoring sessions when active. The 4.5 defense stays:
   `activation.blockers` IDs absent from the display list render as name+body cards without an action
   and are never counted in the panel. Every state with course data then shows How course readiness
   works: intro, the five static requirement items as a plain list (product knowledge — no icons,
   badges or checkmarks), and the Technical readiness / Educational approval cards side by side. A
   Back to course preparation link closes the page.
3. **C — RDY-2 and remaining states, AC 2.** Eligible first activation (`canFirstActivate`): indigo
   panel Ready for activation with primary Continue to activation to the activation route and a Back
   to course preparation link in the panel. Previously activated and eligible: gray panel with the
   HUB-3 heading/body, no activation entry. Active: green HUB-4 or amber HUB-5 panel text (HUB-5 keeps
   its blocker section). No state on this page links to itself; no state offers activation for a
   previously activated course.
4. **D — readiness 503, AC 1 and CPR-FR-07 pattern.** `503 course_readiness_unavailable` on the
   readiness route receives the 7.1 HUB-6 treatment with readiness identity: generic h1 Course
   readiness, breadcrumb ending in Course readiness, no course name, meta, blockers or explainer; red
   panel with the existing unavailable copy, Check again in the current admission epoch, Back to
   Prepare courses, collapsed `TechnicalErrorDisclosure`. Other failures keep the existing host
   recovery; hidden 404/429/denial/stale handling is unchanged. The activation route keeps the
   existing generic recovery — the state model assigns the 503 pattern to the readiness review only.
5. **E — ACT-1 form, AC 3.** Narrower content column (`max-w-3xl`, the Tailwind step nearest the
   package's ~720px). Breadcrumb extends readiness with Activate course; h1 Activate course; no meta
   row. The confirmation is the existing action panel containing: h2 Activate {courseName} (`<bdi>`)
   with Check that this is the course you mean; a reviewed-facts description list — Course (name),
   Current state (Inactive — ready for activation), Unmet prerequisites (None reported); h3 What
   changes with the three fixed items; the pre-dispatch note; a footer bar with status text left and
   Cancel (to the readiness review) plus primary Confirm activation right. The form renders only while
   `canFirstActivate` holds for the applied course.
6. **F — ACT-2/3 pending, AC 4.** Pre-dispatch check (ACT-2): footer status Checking current course
   before activation…, Confirm native `disabled`, Cancel stays. In flight (ACT-3): status Waiting for
   activation…, Confirm native `disabled` and labeled Activating…, Stop waiting replaces Cancel. Stop
   waiting and the departure guard keep their 4.5 semantics; Cancel during checking follows the same
   guarded departure as today (no machine change).
7. **G — ACT-4 changed facts, AC 5.** Pre-dispatch read with unchanged eligibility but changed reviewed
   facts: amber alert Course facts changed above the form, form shows the newest facts, each
   *displayed* row whose value changed carries the Changed badge (a change in a non-displayed reviewed
   fact still raises the alert without a badge), Confirm enabled for a new deliberate confirmation, no
   request sent. Alert heading receives focus and one urgent announcement, as 4.5 specifies.
8. **H — ACT-5/6/7 outcomes, AC 6–7.** ACT-5 (definitive `409` rejection): red alert Activation was
   not accepted with Review current readiness (readiness route) and collapsed technical details with
   status and error code; no form. A definitive pre-dispatch read failure or not-sent uses the same
   ACT-5 layout with the existing check-failed body instead of the rejected heading/body — no
   activation was attempted, and the copy must not claim one. ACT-6 (lost response, undeclared 5xx,
   Stop waiting): amber alert Activation outcome unknown with Refresh course (explicit reconciliation
   read, never automatic), Abandon unknown attempt only once reconciliation confirms an inactive
   course (existing `canAbandon` gate), and the note that abandoning or leaving does not cancel server
   work; no form. ACT-7 (not eligible or not first activation, on entry or discovered by the
   pre-dispatch read): gray alert Activation is unavailable with Go to course readiness; a previously
   activated or now-active course uses the reactivation-unavailable body instead of the
   unmet-prerequisites body; no form. Mid-flow ACT-7 transitions focus the alert heading and announce
   once; initial-entry ACT-7 keeps ordinary route focus. After Abandon, the page returns to the
   reviewing form with the existing abandoned notice (gray, focused, announced once) while the applied
   course remains first-activation eligible; otherwise ACT-7 replaces the form.
9. **I — success and integration, AC 8 and CPR-NFR-01..07.** Validated `200` navigates to the hub,
   which re-reads and shows HUB-4/HUB-5; success announced once (existing behavior). Only `getCourse`
   (admission, pre-dispatch, explicit reconcile) and one `activateCourse` dispatch occur; no
   collections, polling or retry. All new copy lands in `messages.ts` and seven catalogs in lockstep;
   course names render in `<bdi>`; status pairs text with shape; 390px/320px reflow and 200%/400% zoom
   hold; every new element binds an exact Tailwind Plus blueprint recorded at its owner.

Truth table (state model definitive): RDY-1 = inactive + `eligible=false`; RDY-2 =
`canFirstActivate`; previously activated + eligible = gray HUB-3 text; active = HUB-4/HUB-5 text;
readiness 503 = HUB-6 pattern with readiness identity. ACT-1 reviewing form; ACT-2 checking; ACT-3 in
flight; ACT-4 changed facts (still eligible); ACT-5 definitive rejection / pre-dispatch not-sent;
ACT-6 outcome unknown; ACT-7 not eligible or not first activation. Inconsistent state/eligibility
representations remain a protocol failure via existing `toPreparation` validation — no fallback panel.

## Exact existing owners and proposed story manifest

- `src/features/courses/CourseReadinessRoute.tsx`: replace the legacy status/checklist/action-row body
  with blocks A–C: status panel, conditional unmet-prerequisites section, How course readiness works,
  back link. Retain admitted `resource.kind === "readiness"` validation.
- `src/features/courses/CourseActivationRoute.tsx`: replace the status/checklist/availability header
  stack and button row with blocks E–H: outcome alerts (ACT-4..7, abandoned notice) and the action
  panel with facts list, What changes, precheck note and footer bar. Confirm is a new primary button
  with native `disabled` while pending and the pending label; `AuthSubmitButton` (focusable-disabled,
  sign-in card binding) is no longer used here and stays unchanged for its existing owners. Retain
  `DiscardChangesDialog` (title now from the split unknown heading), `TechnicalErrorDisclosure`, and
  the hook contract.
- `src/features/courses/useCourseActivation.ts`: presentation mapping only. Replace the single
  feedback message with a settled outcome kind (`changed | rejected | checkFailed | unknown |
  abandoned | unavailable`) plus error, keeping identical machine transitions, fencing, departure
  guard, announcement triggers and focus hand-off. Add `changedRows` (subset of course/state/
  prerequisites whose displayed value differed at the last pre-dispatch read) for ACT-4 badges.
  Abandon keeps its gate and now lands on the review-with-notice presentation above.
- `src/features/courses/CourseReadinessChecklist.tsx` (shared presentation owner): parameterize
  `CourseHubBlockers` with its section heading (hub passes the existing inactive/active headings;
  readiness passes Unmet prerequisites for inactive courses) while keeping the card markup, safe
  destination resolution and `aria-labelledby` pattern. Delete the legacy `CourseReadinessChecklist`
  and `CourseActivationAvailability` once both routes stop using them. `CourseReadinessRefresh` stays.
- `src/features/courses/CoursePreparationRoute.tsx`: extract the status-panel presentation from the
  private `CourseHubStatus` into an exported tone/icon/heading/body/actions component reused by hub
  and readiness; the hub's rendered output must not change. Extend `CourseHubHeader`: breadcrumb mode
  accepts the child-route chain (readiness, activation) including each generic unavailable variant,
  and meta mode gains an optional leading `<bdi>` course name. `CoursePreparationStatus` and
  `readinessMessages` **remain** for `CourseTeachingFieldRoute.tsx` and `useMaterialLifecycle.ts`,
  which are out of scope.
- `src/app/routes/AdminCourseRoute.tsx`: supply the admitted course header to the readiness (wide) and
  activation (narrow, no meta) surfaces, and extend the keyed 503 branch to the readiness route with
  readiness identity. Activation 503 and all other admission handling stay on the existing generic
  recovery. Ordered admission, epoch fencing and hidden-failure classification are untouched.
- `src/app/ApplicationShell.tsx`: extend the 7.1 `courseHeader` slot with an optional narrow content
  column (`max-w-3xl` instead of `max-w-5xl`); default and hub behavior unchanged.
- `src/platform/ui/RouteRecoveryPanel.tsx`: add the gray tone for ACT-7 and the abandoned notice,
  keeping one Alerts blueprint owner; yellow/red unchanged.
- `src/platform/i18n/messages.ts`, `src/platform/i18n/catalogs/{en-US,de-DE,es-ES,es-AR,fr-FR,pt-PT,pt-BR}.json`:
  add the copy-deck readiness/activation keys and remove retired keys, all seven catalogs in lockstep,
  no English fallback.
- `src/app/routes/courseActivation.test.tsx` (both surfaces' unit home), `e2e/courseActivation.spec.ts`:
  replace readiness/activation presentation assertions with the new structure; preserve every
  operation-semantics case (fencing, no-replay, preflight, conflict/lose/malformed/server-error,
  teardown, scope gating). `src/app/routes/coursePreparation.test.tsx` and
  `e2e/coursePreparation.spec.ts`: keep hub assertions green; update only readiness cross-references.
- `scripts/secret-hygiene-evidence.ts` and `scripts/route-secret-hygiene-cases.ts`: register the new
  readiness-503 deliberate-failure journey and any renamed selectors; existing registrations intact.

If a smaller owner exists for any line above, the implementation owner reports the manifest change to
the solver before writing it. No API, routing, teaching-field, material, student or shell-navigation
change is authorized.

## Blueprint bindings (retrieved licensed source)

Tailwind Plus library `2026-09-13-083323`, all `Application UI/v4/react-light.jsx`:

- Status panel (readiness): Feedback › Alerts › **With actions** — the 7.1 hub binding, extracted and
  shared; amber/indigo/gray/green tones, `h2`, one primary action or one text link or none.
- Outcome alerts ACT-4/5/6/7 and the abandoned notice: same **With actions** family through
  `RouteRecoveryPanel` (yellow, red, new gray), outcome heading focusable, collapsed
  `TechnicalErrorDisclosure` inside ACT-5.
- Unmet-prerequisite cards: Layout › Cards › **Card with header** via `CourseHubBlockers` (7.1
  binding, heading parameterized).
- Explainer cards (Technical readiness / Educational approval): Layout › Cards simple card; record
  the exact variant and deltas at the owner during implementation.
- Reviewed-facts list: Data Display › Description Lists › **Left-aligned with inline actions** (4.2
  binding family) without inline actions; Changed badge from Elements › Badges › **Small pill with
  border** (7.1 binding).
- Confirmation panel: Forms › Action Panels › **Simple** (existing 4.5 binding), footer bar with
  left status and right actions; Confirm uses the established primary-button visual language
  (indigo solid) with native `disabled` while pending per the package accessibility note.
- Breadcrumb/header/meta: the 7.1 Page Headings › **With meta and actions** shell integration, extended
  for child chains. Do not commit licensed sources or reproduce screenshot markup. Measure contrast
  for every new tone/text combination (WCAG 2.2 AA).

## Message inventory and retirement

Reuse unchanged: `activation.readiness`, `activation.title`, `activation.heading`,
`activation.confirm`, `activation.checking`, `activation.sending`, `activation.abandon`,
`activation.abandoned`, `activation.success`, `activation.leave`, `activation.supervisor` (supervisor
blocker body), `preparation.activatable` (Current state value), `preparation.panel.previous.*`,
`preparation.panel.accepting.*`, `preparation.panel.notAccepting.*`, `preparation.panel.unavailable.*`,
the 7.1 hub keys, `preparation.checkFailed`, the shared Refresh/Stop waiting/Technical details
messages, and the existing route title/heading descriptors.

New (copy deck, flat descriptor naming as established):

- `preparation.backToHub`: Back to course preparation.
- `readiness.panel.blocked.{heading,body}` ({count} plural); `readiness.panel.eligible.{heading,body,action}`.
- `readiness.unmet.heading`: Unmet prerequisites.
- `readiness.how.{heading,intro}`; five requirement items
  `readiness.how.requirement.{goals,instructions,language,supervisor,material}`;
  `readiness.how.technical.{heading,body}`; `readiness.how.approval.{heading,body}`.
- `activation.form.{heading,intro}` ({courseName}); fact labels `activation.form.{course,state,prerequisites}`;
  `activation.form.noneReported`; `activation.form.changesHeading`; `activation.form.change{1,2,3}`;
  `activation.form.precheck`; `activation.cancel`; `activation.confirmPending`.
- `activation.changed.{heading,body}` (splits `activation.changed`); `activation.badge.changed`.
- `activation.rejected.{heading,body,action}` (splits `activation.rejected`).
- `activation.unknown.{heading,body,refresh,note}` (splits `activation.unknown`).
- `activation.unavailable.{heading,body,action}` (splits `activation.unavailable`; body carries
  {courseName}).

Retirement, all seven catalogs plus `messages.ts` together, only after the last use-site dies in this
story: `preparation.readiness`, `preparation.unmet`, `preparation.noBlockers`, `preparation.material`,
`activation.effect`, `activation.material`, `activation.previous`, `activation.changed`,
`activation.rejected`, `activation.unknown`, `activation.unavailable`; also `preparation.supervisor`
and `activation.assigned`, whose only consumer is the deleted legacy checklist (verify by grep before
removal). **Kept despite the copy deck's retired list** (its "unless planning decides otherwise"
clause): `preparation.incomplete`, `preparation.accepting`, `preparation.blocked` —
`CourseTeachingFieldRoute.tsx` (via `CoursePreparationStatus`) and `useMaterialLifecycle.ts` remain
their owners and are out of scope. No dangling descriptors, no renames of surviving keys.

## Focused regressions, hygiene and verification

Unit/integration: RDY-1/2 and the three reused panel states; blocker-card reuse with heading variants
and unchanged hub rendering; extras defense (activation blocker absent from the display list renders
without action and is not counted); ACT-1 facts/None reported; ACT-2/3 disable and label switching with
native `disabled`; ACT-4 alert, per-row Changed badges (including a non-displayed-fact change raising
the alert without a badge) and re-enabled Confirm without dispatch; ACT-5 rejected versus
pre-dispatch-failure copy separation with technical details; ACT-6 reconcile/abandon gating and Stop
waiting; mid-flow eligibility loss to ACT-7 with the reactivation body for previously activated;
abandoned notice returning to the eligible form; success navigating to a re-admitted hub. Network
assertions: admission, pre-dispatch and explicit reconcile reads only; one POST; no collections, no
automatic retry. Browser: fixtures for RDY-1/2 and ACT-1..7 against screenshot structure and copy (not
pixels); announce-once and outcome-heading focus; keyboard order; 390px/320px reflow, 200%/400% zoom,
seven locales × three text modes for both surfaces; forced colors; escaped `<bdi>` name. Readiness-503
journey registered at both hygiene registries and scanned before success is asserted. No protected
fixture content in names, snapshots, traces or logs. Run sequential focused typecheck, lint, relevant
Vitest, i18n validation, targeted Playwright against one build, bundle check and hygiene while
iterating; the full `./run-all-tests.sh` runs once on final inputs in the verify phase.

Negative expectations: no activation entry for previously activated courses; no enabled Confirm for a
non-eligible course, including mid-flow eligibility loss; no href from returned blocker links; no met
indicators, counts from extra reads or optimistic state; no automatic retry after any outcome; no
collection reads; rejected copy never claims an attempt that was not sent.

## Bundle forecast, risks and decision notes

7.1 evidence: largest initial paint pt-BR 219,352 of 260,000 gzip bytes (40,648 headroom) with catalogs
loading on demand. Both surfaces are lazy route chunks; the delta is roughly forty new descriptors per
locale minus roughly a dozen retired ones, a gray tone, and the panel extraction. No budget risk is
projected; the final gate's measured build decides. Risks: shared `CourseHubBlockers`/`CourseHubStatus`
extraction must leave 7.1 hub evidence green (focused hub suites rerun); the hook's presentation split
must not alter machine-12 semantics (existing operation tests guard); locale/reflow browser journeys
were flaky under 7.1 — do not weaken tests to pass.

Decisions recorded within binding contracts (no open questions): narrow column = `max-w-3xl`; ACT-2
Cancel follows the existing guarded departure; mid-flow eligibility loss presents ACT-7 rather than a
disabled form; ACT-4 badges appear only on visibly changed rows; pre-dispatch failure reuses the ACT-5
layout with check-failed copy; activation keeps generic recovery on 503; key retirement keeps the three
readiness-sentence keys for their out-of-scope owners.

## Review Triage Log

| Finding | Verdict | Evidence |
| --- | --- | --- |
| blind-hunter 1: `CourseHubBlockers` renders activation-only extras to every consumer, so the hub can show a card its panel does not count | medium → patch | Verified: baseline `CourseHubBlockers` rendered server display blockers only; the extras spread was added to the shared component in this story. Baseline hub never rendered extras. Spec boundary "hub rendering must not change" is breached whenever the server reports an activation-only blocker absent from the display list. Fix: extras opt-in, readiness review only. |
| blind-hunter 2: `manifest.txt` omits the checkpoint yaml and sprint-status.yaml present in `full.diff` | false | The manifest is worker-scoped per `.opencode/story-execution.md` ("the solver owns sprint status and checkpoint writes"); the two omitted files are solver-owned and the worker's report states the exclusion. manifest.txt plus those two solver-owned artifacts reconciles exactly with `full.diff`. No evidence gap remains. |
| edge-case-hunter 1: departure-guard Stay fallback ref (`operation.status`) is attached only to outcome alerts; during Checking/Submitting with no outcome it is null, and a guarded Cancel whose invoker unmounts on the Checking→Submitting transition drops focus to the document body | medium → patch | Verified: baseline attached `ref={status} tabIndex={-1}` to the always-rendered form h2, and baseline rendered no Cancel during pending, so the hole could not arise. New code renders Cancel during Checking (spec ACT-2) and no longer mounts the ref during pending. Focus hand-off was required to stay identical. Fix: keep a mounted focusable status target (the form h2) whenever no outcome alert carries the ref. |

## Implementation progress

- Block A/B infrastructure: shell narrow column and child breadcrumb/meta extension, extracted shared
  status panel, parameterized blocker cards with actionless activation-only extras. Backend revision
  confirmed unchanged. Remaining: route presentation, operation presentation mapping, copy, tests.
- Blocks A–D: readiness route now uses the shared status panel, server blocker cards, static
  explanation and trusted back path. Admission host supplies route-specific child headers and
  readiness-only 503 treatment. Hub keeps its existing header and status semantics.
- Blocks E–H: confirmation form and outcome alerts wired to the existing operation hook;
  settled outcomes are typed presentation kinds and displayed-fact deltas are tracked.
  Gray recovery tone and native pending-disabled button added. Remaining: localized catalogs,
  regression updates, hygiene registration and focused checks.
- Block I: all seven catalogs have localized new readiness/activation descriptors; retired keys
  were removed together. Updated route/unit/browser selectors and added readiness-503 hygiene
  journey in both registries. Targeted Chromium surface suite found breadcrumb pointer targets
  below 24 CSS pixels under text-spacing overrides; shared child breadcrumb links now have a
  minimum 24-pixel target. Browser suite then passed 35/39, with all six zoom cases passing
  after that correction; remaining four original browser failures were repaired and need rerun.
- Focused implementation checks: 51 route/unit regressions passed, including added readiness
  count/503/first-activation and pending-button tests; all 39 targeted Chromium activation
  journeys passed (seven locales, three text sizes, both zoom factors); typecheck,
  architecture lint, i18n and build passed. Bundle remains below 260,000 bytes across
  locales. Activation unit deliberate-failure hygiene passed 34 cases/39 checkpoints,
  including an early-failure canary. Full route-hygiene scanner and authoritative gate
  remain for the verify phase. Hub unit regressions passed; browser hub regression is
  scheduled as a final focused check.
- Final focused iteration: 15 hub Chromium regressions passed. Activation route hygiene
  passed 38 tests, 50 deliberately failed secret checkpoints and its early-failure
  canary. The new readiness-503 journey is registered in the global/preparation
  inventory; its deliberate-failure probe is deferred to the authoritative verify
  gate because the focused activation scope excludes readiness-only journeys.
  Final source/catalog inputs passed typecheck, lint/architecture, seven-catalog ICU
  validation, build and bundle budget. Full gate and independent review are not run
  in the implement phase.
- Tailwind 4 palette contrast measured after browser conversion of the library's
  OKLCH tokens: gray-900/50 16.98:1, gray-700/50 9.86:1, yellow-900/50
  8.38:1, yellow-700/50 4.77:1, green-800/50 6.81:1, indigo-900/50
  10.26:1, red-800/50 7.64:1. All text pairs meet 4.5:1; automated axe
  passed on the targeted Chromium surfaces.
