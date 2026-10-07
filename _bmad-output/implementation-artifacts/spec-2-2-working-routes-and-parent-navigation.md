---
title: Working routes and parent navigation (Story 2.2)
type: story
story: 2-2-working-routes-and-parent-navigation
created: 2026-10-06
status: done
baseline_commit: d1be39a5a4c041f7a26dfef30e6d1e605b21f8ab
prepare_session: ses_eee90c265ffeVIAWyc2DlyrnYF
---

# Story 2.2 — Working routes and parent navigation

## Identity and boundary

Exact identity and acceptance: `_bmad-output/planning-artifacts/epics.md:118-131`; sprint `next_story` agrees.
Epic 2 only. Story 2.1 is closed at the baseline above; do not reopen its implementation or review.
This is a bounded shared-routing integration of the 14 entries already in `src/app/routes/entryRoutes.tsx`:
Home, login, recovery, reset, invitation preview/acceptance, restricted MFA challenge/recovery/password change/logout,
and authenticated MFA overview/enroll/verify/recovery codes. No new canonical product surface is added.

Preparation decisions are settled. Owner YES dated 2026-10-07 is recorded authoritatively in
`BACKEND-CONTRACT-GAPS.md` §BCG-009 Story 1-9 TOTP-enrollment-slice decision. Checkpoint phase `implement`, story and
Epic 2 in-progress. The historical prepare/blocking notes below are retained as progress history.

## Baseline, dirty work, tooling

- HEAD: `d1be39a5a4c041f7a26dfef30e6d1e605b21f8ab`.
- Three approved pre-existing dirty files, preserved and excluded from the 2.2 manifest:
  `.opencode/agents/epic-solver.md`, `.opencode/story-execution.md`, and
  `_bmad-output/implementation-artifacts/execution/2-1-basic-capability-driven-navigation.yaml`.
  The index was empty. No unknown overlaps found; no stash or revert.
- Backend checkout `mia`: `63c99925e5995fe2e2467f4f894976dfd4c0d297`, unrelated dirty skill CSV and untracked auth guide.
  Read implemented OpenAPI only; no backend changes or verification.
- Reuse batch tooling evidence from 2.1: npm tooling, installed bundled Chromium, licensed library and Trivy present.
  Dependency manifests, Playwright configuration and gate script unchanged. No install or repeat tooling probe needed.
  The prior gate had 551 unit and 107 browser tests, no skipped components; that is baseline evidence, not 2.2 verification.
- Runtime catalog: OpenAI Sol/Astra active with `high`; configured Sonnet 5.5 `medium` and Opus 5.5 `high` are catalogued,
  but Anthropic remains bypassed for this batch after the reported 429. Actual prepare worker: `openai/gpt-6.1-sol#high`.
  Current solver: `openai/gpt-6-astra`; approved reviewer fallback: fresh `openai/gpt-6-astra#high` session.

## Binding references

References below own behavior; this spec does not replace or copy their contracts.

- `epics.md:29-49,118-131`: existing-surface shared routing, affected-feature integration only, retrospective exclusions.
- `FRONTEND-PRD-FOUNDATION.md` FFR-207; `EXPERIENCE.md:108-111,278,343-349`: stable URLs, visible exits,
  authoritative reconstruction, route focus and complete admission.
- `ROUTE-INVENTORY.md:13-54,56-158,1037-1073`: canonical entry and existing MFA paths, parents, focused restrictions,
  neutral gate presentation, safe fallback; no protected return destination through restricted stages.
- `SECURITY-PRIVACY-ACCEPTANCE.md:58-104,106-149,151-170,588-625`: ordered admission including history/reload,
  fragment ownership, no unsafe replay, secret teardown, recovery-code departure restrictions.
- `SURFACE-STATE-MATRIX.md` G and existing Public/Restricted/MFA rows: entry revalidation, failed reads and exits.
- `ACCESSIBILITY-ACCEPTANCE.md` AC-001..005, AC-003:215-241, AC-012/013: route sequence, reflow, landmarks,
  restricted logout exception, and distinction between full-route focus and retained in-place focus.
- `FRONTEND-STATE-MACHINES.md` machines 1, 9, 24, 27, 28 and 30: existing auth/revalidation, link retention,
  quiet initial state, announcement arbitration, same-enrollment setup and recovery-code lifecycle.
- Architecture spine AD-3/4/5/7/13: declarative Router only; one route table/gate/sequencer; existing session owner;
  lazy imports after the gate, no preloading.
- `DESIGN.md`: exact licensed blueprints and localized error/control anatomy.

## Actual API / dependency assessment

Use the existing client operations only, unchanged:

- `mia/api-doc/paths/auth.yaml#/sessionDiscovery` (`discoverSession`, lines 32-63), mapped by root OpenAPI to
  `GET /api/v1/auth/session`: the authoritative non-refreshing staged session read, with declared JSON:API errors.
- `mia/api-doc/paths/users.yaml#/capabilities` (lines 50-79), `GET /api/v1/users/me/capabilities`: authenticated-only,
  own-scope `profile.view` and basic Home authority; non-refreshing, no empty-scope inference on failure.
- `mia/api-doc/paths/auth.yaml#/mfaState` (lines 458-479), `GET /api/v1/users/me/mfa`: secret-free MFA metadata/action
  read, non-refreshing; route resource after the preceding two steps. No guessed factor or enrollment retrieval.

BCG-001/003/009 remain open globally. Their previously approved entry/lifecycle/TOTP slices already cover these reads.
The 2026-10-06 existing-surface replan authorizes common routing, not future operations or broader BCG closure.
No missing transport needed for this story. O1 concerns the BCG-009 interim parent wording, not an API gap.
No new endpoint, CSRF mode, data schema, dependency, persistent state, cookie inspection, or denial probe.

## Observed integration gaps

- `App.tsx` selects an authenticated route using the existing session/capability snapshot; its wildcard router has no
  location-key admission cycle for client history traversal. MFA reads freshly by path, but the two earlier steps are
  not repeated for that entry. Same-path history entries also need a current admission binding.
- `routeFrame.tsx` owns heading focus but not route announcements; its dependency uses pathname, not history-entry
  identity. React `<title>` is present, but title → committed announcement → heading focus is not sequenced centrally.
- Both `App.tsx` and `ProfileMfaRoute.tsx` use lazy imports with a null Suspense fallback and no route error boundary.
  Rejection can remove the usable application; no safe chunk recovery exists.
- `EntryFailure` provides no explicit recovery action. The MFA route-read failure has Check again but no parent/Home
  exit. It correctly mounts no application navigation before its resource gate passes.
- Invitation checking/preview/form states have no explicit parent exit. Existing form keying already clears field
  values between invitation paths, and the link owner intentionally retains the token inside that two-path flow.
- Existing MFA parent links, shell departure guard and setup/link owners are useful and must be reused, not rewritten.

## Proposed bounded decisions

These implementation selections follow the contracts and the dated authoritative O1 decision.

### D1 — One route-admission binding, not a second session controller

Bind protected entry to the current Router location key and canonical path in the shared app route layer. Direct load
and Reload use the existing bootstrap. On deliberate protected navigation or non-BFCache client history traversal,
withhold the destination immediately, then establish session → capabilities/scope → existing route resource → content
in order. A prior location's decision never mounts the new location while effects or reads are pending.

Add only the needed route-admission/read-retry entry points to `SessionController` and its adapter. Keep discovery,
locks, deadline checks, supersession, access-loss handling and settlement tracking there. Shared app logic consumes
that authority; it never performs fetch itself. Cancel/supersede the old admission on another navigation or lifecycle
shield, including a delayed discovery/capability/resource response. Nothing extends idle or absolute expiry.
Do not restart bootstrap on every render, duplicate a cold gate, or loop on canonical replacement navigation.
Mutation success remains authoritative: preserve initial enroll→verify and verify→codes handoffs without replaying their
mutations or destroying the handoff payload just because the neutral gate unmounted the source component.
An actual account/scope/security loss destroys according to the established owners.

BFCache/focus/visibility/reconnect remain the settled lifecycle behavior: shield/mark only, no new request; explicit
Refresh starts recovery. A route entry must not auto-release a lifecycle/logout/deadline shield.

### D2 — Existing parents and guard-aware exits

Put parent/safe-exit metadata for existing entries in `entryRoutes`, not a fabricated profile surface or `navigate(-1)`.
Normal public recovery/reset exits use login. Invitation preview exits to login; acceptance's parent is preview while
the active two-path token flow permits it. Terminal/unknown invitation states keep their existing sign-in recovery.
Restricted MFA recovery may return to its challenge; restricted MFA/password-change use logout, never Home.
Logout/unconfirmed states retain only their settled retry/reconciliation/close-browser actions, not a new parent bypass.
Authenticated MFA overview's Home bridge follows the **2026-10-07 BCG-009 owner decision**; other MFA children retain their permitted parent
or safe overview fallback. Do not mount protected parent controls before admission; failed resource-read recovery is
neutral and any safe Home departure must be freshly admitted.

New parent/recovery links share the existing `routeDeparture` decision with shell links, including default-deny during
the lazy recovery-codes interval. No backdoor link bypasses Reveal/acknowledgement, replacing departure, or code release.
Invoke route-local departure owners at the navigation boundary; keep acceptance/preview token retention only where
the canonical flow permits it. Unmount sensitive form controls on departure; never restore them from history/storage.
Sign out remains independent and usable. Baseline C7 is outside 2.2 under the explicit user scope and `epics.md:47-49`;
it remains a known defect, with no compliance claim, repair or silent closure. Every new control must satisfy the
settled guard/teardown contracts. This exclusion is settled (O2); do not ask the user again.

### D3 — Narrow lazy-route recovery; no unsafe retry

Add an eager, localized boundary around each existing lazy route subtree, keyed to the admitted route entry so a failed
child cannot take down the shell/neutral frame, or poison a different destination. A visible, plain localized loading
label inside the admitted frame replaces the empty lazy fallback; do not invent a skeleton blueprint.
Keep the existing title/bypass/main/h1 and applicable safe controls available. Do not display, log or persist the raw
JavaScript exception, stack, URL, import rejection, or protected props. API failures continue to use the existing
collapsed exact-response disclosure; chunk/runtime failure has no pretend HTTP disclosure.

Ordinary chunk recovery is an explicit full-document Reload of the current clean canonical URL, not automatic reload,
cache busting, import retry loops, dynamic guessed asset paths, or mutation re-execution. The user can also activate
a permitted parent/safe exit. A failed `React.lazy` promise is not repaired merely by resetting its boundary.
While recovery codes are held but their module is unavailable, ordinary departure stays refused; do not introduce an
in-app Reload bypass of their acknowledgement contract. Explain that a browser Reload loses unretrievable codes;
keep eager Sign out available. Route-read failure offers explicit Check again and a guard-aware safe exit, not stale
mutations. Preserve existing reconciliation behavior; do not remediate retrospective C6 in this story.

### D4 — Shared route-change sequencing, existing announcement arbitration

Extend `routeFrame` into the one route-change sequencer used by both layouts. The localized DOM title must be committed
before submitting a route announcement, and announcement arbitration/commit must precede the authorized heading focus.
Use the one platform announcer, adding only the minimal completion coordination that this concrete sequencing needs.
Do not add another live region or replace priority/retirement handling. Auth/urgent events still beat polite route events;
a stale/cancelled route must not focus or announce when a newer gate/route/shield wins.
One polite localized route-subject announcement for a full client-side admitted change, including Back/Forward. Cold
initial static state remains quiet under machine 28; it still sets title and focuses the heading. Checking/error/recovery
presentations expose only their neutral subject. No duplicate announcement on chunk resolution, unchanged read, ordinary
render, locale/text-size change, or in-place validation. Existing action/error announcements remain feature-owned.
Same-path history entries are recognized by entry identity; use `preventScroll` and existing offscreen-heading handling.

### D5 — Reuse exact licensed blueprints

Library `2026-09-13-083323`, v4 `react-light.jsx`. Retrieved the two exact local sources during prepare:

- `Application UI > Feedback > Alerts > With actions`: localized route/read recovery panel; same justified MIA warning
  palette, h2, wrapping actions and inert disclosure adaptation already used by `ProfileMfaRoute`.
- `Application UI > Elements > Buttons > Secondary buttons`, `px-3 py-2` size: parent/Reload/Sign out where outside
  an alert. Router links substitute for navigation buttons; retain visible focus and wrap translations.

Reuse 2.1's Simple sidebar and route headings/frame unchanged in visual identity. No breadcrumbs, new shell, custom
palette, skeleton imitation, dark mode, or remote assets. The stale skill stack preamble does not supersede current
techstack (React 19.3/Tailwind 4.3).

## Concrete file / symbol map and proposed commit manifest

This manifest is approved with O1 settled. Actual changes/deviations are recorded before expanding it.

Documentation/tracking:

- `_bmad-output/implementation-artifacts/spec-2-2-working-routes-and-parent-navigation.md`
- `_bmad-output/implementation-artifacts/execution/2-2-working-routes-and-parent-navigation.yaml`
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — solver-owned transitions only, not changed in prepare.
- `_bmad-output/planning-artifacts/ux-designs/ux-mia-frontend-2026-09-12/BACKEND-CONTRACT-GAPS.md` — dated O1 decision.
- `_bmad-output/planning-artifacts/ux-designs/ux-mia-frontend-2026-09-12/ROUTE-INVENTORY.md` — MFA overview reference to O1.

Existing owners to modify:

- `src/app/App.tsx` — `CanonicalEntry`, `EntryFailure`: admission binding, safe exits, lazy boundary and failed-read action.
- `src/main.tsx` — necessary root error callbacks: React 19 otherwise logs caught errors/stack by default; use fixed
  content-free diagnostics, no raw exception retained or logged. Manifest addition recorded before edit.
- `src/app/routes/entryRoutes.tsx` — existing entries' parent/recovery metadata; retain exact paths, gates and imports.
- `src/app/routes/ProfileMfaRoute.tsx` — fresh admitted route resource, failed-read exit, eager lazy boundary/held-code guard.
- `src/app/routes/routeFrame.tsx` — shared title/announcement/heading sequencing and history identity.
- `src/app/routes/SimpleEntrySurface.tsx` — unchanged: its established hook consumes the shared sequencer.
- `src/app/ApplicationShell.tsx` — consume the sequencer and shared guarded-link owner; preserve drawer restore/refusal.
- `src/platform/ui/routeDeparture.tsx` — unchanged: preserve its settled decision vocabulary and default-deny fallback.
- `src/platform/session/sessionController.ts` — bounded route-admission/retry entry points using existing discovery and
  `applySession`, sequence fencing, locks, deadlines and access-loss handling; no auth rewrite.
- `src/platform/session/sessionController.test.ts` — controller-level order/race/no-replay regressions only.
- `src/platform/session/SessionProvider.tsx` — expose new bounded session action through the existing adapter.
- `src/platform/announcer/AnnouncementRegion.tsx` — minimal completion coordination for the shared route sequencer.
- `src/platform/announcer/AnnouncementRegion.test.tsx` — arbitration/retirement/completion regressions, if needed by D4.
- `src/app/ApplicationShell.test.tsx` — approved count adaptation for the fresh admission cycle.
- `src/app/App.test.tsx` — approved lazy child readiness waits; existing observable assertions retained.
- `e2e/scaffold.spec.ts` — approved form-readiness wait before its existing Tab-order assertion; no new suite.
- `src/platform/i18n/messages.ts` and the seven explicit catalogs:
  `src/platform/i18n/catalogs/de-DE.json`, `src/platform/i18n/catalogs/en-US.json`,
  `src/platform/i18n/catalogs/es-AR.json`, `src/platform/i18n/catalogs/es-ES.json`,
  `src/platform/i18n/catalogs/fr-FR.json`, `src/platform/i18n/catalogs/pt-BR.json`,
  `src/platform/i18n/catalogs/pt-PT.json` — only route-loading/recovery/parent copy required by the approved slice.

New, concrete shared infrastructure and focused tests:

- `src/app/routes/RouteAdmission.tsx` — one location-bound orchestrator, not another authorization owner.
- `src/app/routes/RouteRecoveryBoundary.tsx` — eager lazy-subtree boundary/fallback composition, clean recovery actions.
- `src/platform/ui/RouteRecoveryPanel.tsx` — shared exact-blueprint presentational panel accepting minimized copy/actions.
- `src/platform/ui/RouteDepartureLink.tsx` — one guard-aware ordinary link used by the shell and new parent/recovery exits.
- `src/app/routes/routeNavigation.test.tsx` — component/integration tests through App with existing controlled fixtures.
- `src/app/routes/routeRecovery.test.tsx` — held/rejected lazy imports and failed-read recovery, no DOM/exception dumps.
- `e2e/routeNavigation.spec.ts` — built Chromium direct/history/reload/parent coverage for existing surfaces only.
- `e2e/routeRecovery.spec.ts` — built chunk intercept/read failures plus keyboard/reflow/axe on new recovery states.
- `e2e/routeFixtures.ts` — necessary shared controlled protocol fake for the two new browser suites; reuses existing
  response builders, fixed clocks and content-free operation ledgers. Addition recorded before creation.

No application files changed in prepare. Do not grow `App.test.tsx`/`e2e/scaffold.spec.ts` with new suites; use new files.
No changes planned to API/generated schemas, dependencies, gate/build scripts, backend, or MFA mutation/secret owner.
If implementation proves an existing test assertion needs adaptation, report the exact extra path before changing it.

## Acceptance and targeted evidence

AC1 (`epics.md:122-123`): D1, D3; controller U1-U4, integration I1-I4, browser E1-E3.
AC2 (`:124-125`): D2, D4; I5-I8, E4-E6; MFA overview bridge follows the dated BCG-009 O1 decision. Baseline C7 stays
outside 2.2; acceptance for new controls requires guard/teardown compliance without claiming baseline C7 compliance.
AC3 (`:126-127`): D3-D5; I9-I12, E7-E9. Requirement IDs remain FFR-207, AD-3/4/13, UX-DR44..46.

- U1: each new protected admission reads session, then capabilities; no resource or protected chunk before both pass.
- U2: removed own `profile.view`, account change, anonymous/restricted result and failed capability never mount MFA.
- U3: rapid A→B→A, same-path history identity, late session/capability/resource completion and a lifecycle signal fence
  old admission; no paint/focus/announcement from superseded routes; explicit Refresh alone releases a lifecycle shield.
- U4: retry failed discovery/capability uses reads only; no ordinary read advances deadlines, no mutation replay.
- I1: direct/reload protected MFA path gates in order; pending enrollment without held setup offers only existing safe
  code-entry/Cancel behavior; codes never reconstructed from history, Reload, address, or backend read.
- I2: Home↔MFA Back/Forward uses fresh admission even if old capabilities previously allowed it; removed scope stays hidden.
- I3: canonical fallback replacement cannot loop or leak a protected return path; restricted public link interstitials
  keep their established stage dispatch and no application navigation.
- I4: initial enroll→verify and verify→codes transfers preserve the same route-local handoff and one unsafe dispatch.
- I5: existing public/child states expose the correct parent/safe exit; invitation accept→preview keeps only its allowed
  token, clears password/profile fields, and eventual departure drops the link reference before the destination mounts.
- I6: new parent/recovery links use 2.1's guard (held lazy codes, masked, unacknowledged, acknowledged departure);
  permitted departure releases codes and replaces history. Sign out unaffected; no standalone regeneration.
- I7: title observed before route announcement commit, then heading focus, across both layouts; exactly one announcement
  on a full route change, not one per checking/chunk render; initial state quiet, unchanged/in-place reads quiet.
- I8: route retirement/auth arbitration prevents stale focus/announcements; drawer restore still loses to the correct
  destination/refusal target. No new browser-history interception or retrospective repair for the deferred C7 case.
- I9: held lazy import shows accessible loading content; rejected import yields usable recovery rather than blank page;
  navigating away or Sign out while pending cannot mount/announce the eventual child.
- I10: explicit Reload recovery is a document load of a clean canonical URL, never a resend; existing mutations/token
  dispatch counts stay unchanged after Back/Forward, Reload, failure and repeated recovery activation.
- I11: session/capability/MFA read failures retain neutral identity and explicit valid recovery; technical details are
  exact escaped API text only. No raw chunk exception/stack/URL is rendered or logged by application code.
- I12: codes held during chunk/read failure do not gain an unguarded parent/Reload control; eager Sign out remains usable.
- E1-E3: direct/reload/Home↔MFA browser history with ordered network ledger, delayed gate and scope loss; no forbidden
  chunk request or stale protected DOM/title. Cover pending verify Reload without URI and code-route Reload without codes.
- E4-E6: public invitation parents/token-free live URLs, new safe parent departure teardown, route sequence via DOM
  title/live-region/focus observation. Include repeated same-path history and delayed drawer focus interaction.
- E7-E9: intercept `/assets/<existing-route>-*.js` on production build before load, reject it and assert recovery;
  fail each read layer, use explicit recovery, and count unsafe requests. Keyboard/bypass/main/h1, axe, direct 320px
  in all text modes, 200% zoom-equivalent coverage, long translations/all catalogs, reduced motion and forced colors.

Use per-test synthetic secret fixtures, content-free ledgers/fingerprints, no automatic traces/videos/screenshots or
DOM/error dumps on secret routes. Do not assert or print credential values. Demonstrate that regressions discriminate
the observed pre-change integration gaps without mutating the workspace permanently.

After approval, focused checks run sequentially: targeted new Vitest suites plus affected controller/announcer suites;
typecheck, lint/architecture, i18n, formatting and scoped duplication; build then affected built Chromium suites.
Do not overlap builds/tests. Final verify later runs `./run-all-tests.sh` once for final input state with Trivy required.
Preparation documentation is Markdown-exempt under `_bmad-output`; run YAML/planning consistency only.

## Exclusions / risks

- No `/profile`, future Learn/Prepare/Mentor/Administer routes, Epic 3 invitations management, MFA replace/disable/SMS,
  auth-stage rewrite, retrospective C2/C5/C6/C7 repairs, rich renderer, generic workflow/retry/gate framework, or telemetry.
- No navigation interception retrofit for ordinary browser Back or unsaved-form dialogs beyond established contracts.
- Existing 2.1 LOW KaTeX dependency issue and static country-code scanner disposition remain baseline release work.
  Do not update dependencies or suppress scanners. Full release manual Safari/AT/print evidence remains separately owned.
- Risk: route-check supersession must not break initial secret handoffs or lose an in-flight mutation outcome.
  Race tests must distinguish content withholding from destroying security teardown; no new “successful” ambiguity.
- Risk: React title/effect order alone is not announcement-commit ordering; platform coordination needs direct assertions.
- Risk: failed lazy imports are cached; simple boundary reset is not a retry strategy. Recovery must remain truthful.

## Open decisions / blockers

None. O1 was settled by Owner YES dated 2026-10-07, recorded in `BACKEND-CONTRACT-GAPS.md` §BCG-009 Story 1-9 slice.
`ROUTE-INVENTORY.md` MFA overview references that decision. Original 2026-10-05 history and broader open BCG status
are preserved; `/profile` stays unimplemented.

O2 — settled exclusion, not a blocker: explicit user scope prohibits auth/MFA backlog beyond Story 2.1 C1/C3, and
`epics.md:47-49` keeps retrospective actions open and outside navigation prerequisites. Baseline C7 (programmatic
codes→verify retains codes and redirects back; `mfaEnrollment.ts:149-155`, `MfaVerifyRoute.tsx:33-35`, retrospective
C7:188-196) therefore remains outside 2.2. Do not repair, claim compliance, silently close it, or ask for this settled
exclusion again. All new parent/recovery controls must satisfy the existing guard and teardown contracts.

No missing tooling or transport blocker; no application overlap.

## Scoped execution progress

- 2026-10-06: reconciled baseline/status/dirty manifest; current protocol and scoped rules read; exact story identity,
  relevant companions and actual OpenAPI clauses inspected; existing source/owners/tests mapped.
- 2026-10-06: reused unchanged batch tooling checks, resolved actual session and catalog models, retrieved exact existing
  licensed recovery/action blueprints; no application edits, installs, tests/builds or backend writes.
- 2026-10-06: wrote bounded blocked spec, explicit provisional manifest, delegated phase-prepare checkpoint and
  content-free preparation log. The subsequent solver clarification below narrows the open decision.
- 2026-10-06 solver bookkeeping: O2 was already settled by explicit user scope and `epics.md:47-49`; retained C7 as an
  out-of-scope known baseline defect, without compliance claim or closure. Checkpoint moved to `blocked` with O1 only,
  scoped to MFA overview parent/fallback. Unrelated routing slices are not product-blocked; dispatch awaits O1's answer.
  No implementation, tests/build, commit, notification resend or pre-existing-file changes.
- 2026-10-07 implement block 0: recorded authoritative O1 decision and only its directly affected route-inventory
  reference; manifests updated for those two contract paths. Ready decisions recorded, actual model OpenAI Sol high,
  checkpoint implement and selected story/epic in-progress. No application suite run for decision-recording alone.
- Implement block 1: shared admission binding/session adapter, parent metadata/guarded links, eager lazy recovery and
  announcement completion sequencing added. Typecheck/lint passed after local corrections. Existing shell targeted
  regression exposed one obsolete request-count expectation: `src/app/ApplicationShell.test.tsx` added to manifest
  before adaptation; fresh admission now requires session/capability count 2. No gate assertion removed.
- Implement block 2: new integration/controller/announcer/recovery tests pass (186 targeted tests). First built-browser
  run exposed fixture selectors/preference-key mismatches, corrected without product changes; affected MFA/shell browser
  suites pass. Existing `src/app/App.test.tsx` now needs readiness waits because the eager h1 precedes lazy form loading;
  manifest addition recorded before edits. Invalid-invitation focus exposed a real arbitration-completion gap: a current
  route whose polite event loses to urgent copy must still focus after arbitration when the urgent owner has not focused
  a meaningful target. Stale owners remain retired; suppressed copy must never be announced or replayed.
- Implement block 3: 331 targeted unit tests, typecheck/lint/architecture, ICU and zero-clone scan pass. New browser
  evidence includes native 200% zoom; 400% harness returned floating-point 3.9999999999999996 and requires exact
  semantic tolerance (existing harness uses `toBeCloseTo(..., 10)`). A long sequential browser regression command hit
  its 300s tool timeout: runner stopped, only its known orphan preview was stopped, no competing writer. Results from
  that interrupted invocation are partial, not passed. Narrow keyboard recovery reproduction failed because eager h1
  focus precedes lazy input readiness; `e2e/scaffold.spec.ts` added before an explicit input-visibility wait, preserving
  Tab/focus and one-dispatch assertions. No new scaffold suite.
- Implement block 4: D1-D5 integration and mapped focused regressions complete. Final targeted unit run passes 331
  tests across 8 suites. Final built Chromium runs pass 42 tests (23 new routing/recovery, 19 affected MFA/shell) and
  35 scoped auth/canonical/parent regressions. The interrupted earlier run remains failed/partial, not credited.
  Native bundled-Chromium 200%/400% zoom, direct 320px in all modes, all seven locales in all modes, text-spacing,
  reduced-motion/forced-colors emulation and representative default axe checks pass. No blanket exclusions.
  Application source is unchanged since passing build-2; final verify/full gate, independent review and commit remain
  separate phases. No backend or preserved baseline dirty paths edited.

## Implementation handoff and coverage residuals (before fix batch 1)

Actual story manifest, full tracked-plus-new diff, content-free check logs and acceptance-level report are under
`tmp/agent-execution/2-2-working-routes-and-parent-navigation/`: `implement-manifest.txt`, `implement.diff`, and
`implement-report.md`. These are review evidence, not authoritative final-gate verification.

AC1: location-key binding and fresh session/capability/resource admission, direct/Reload/history/same-path identity,
scope loss, supersession, lifecycle fencing and read-only recovery are covered by new integration/controller/browser
tests and affected existing tests. Initial mutation handoffs and one-dispatch behavior pass the existing MFA journey.

AC2: parent metadata and new guarded invitation/read/chunk exits, normal parent controls, title→announcement-commit→h1
ordering, initial quiet state, arbitration retirement, token/form teardown and default-deny held-code exits pass scoped
coverage. The existing masked/unacknowledged/acknowledged code guard and replacing shell departure remain covered by
the unchanged existing code-departure/MFA suites. Baseline C7 stays known/open/outside this story.

AC3: admitted loading, rejected built chunks, explicit document Reload with no mutation replay, neutral read failures,
eager Sign out and truthful unavailable-code recovery pass. UI inherits the exact retrieved blueprints. No API,
dependency, script, configuration or new product-surface changes.

Residuals, not passes: no dedicated new-suite deliberate-failure marker scan was added or run; the existing final-gate
secret-hygiene harness is pending the verify phase. New tests use per-test synthetic fixtures, boolean secret assertions,
content-free network ledgers and disabled trace/video/screenshot, but these measures alone are not that required scan.
Baseline-discrimination evidence is structural (absent admission method/boundary and old read counts), not a separately
executed baseline worktree. Manual Safari/actual screen-reader evidence remains release-owned, not inferred from axe.

The executor's higher-priority ownership contract reserves checkpoint/tracker writes to the solver. Their earlier
implementation bookkeeping is preserved; solver must reconcile the actual manifest and set checkpoint/tracker to
review using this handoff. Spec status is review; this is not story completion. No review launched, full gate run or commit.

## Fix batch 1 — independent review

Reviewer `ses_eeb0334cbffe6XF3R8nJuKGhdL`, 2026-10-07. Same baseline and approved scope; no contract re-derivation.

- R1 (P2 blocking): generic failed logout-chunk recovery loses the retained logout state's guidance and offers Reload.
  Extract the existing logout content into one eager owner, used by the lazy entry and its state-specific boundary
  fallback. Preserve existing Retry/reconciliation/close-browser guidance and disclosure. No in-app Reload, no new
  fresh-document denial policy. Built Chromium rejection plus definitive logout failure must reproduce this boundary.
- R2 (P2 blocking evidence): deliberately fail the actual new secret-bearing tests at identifiable checkpoints and scan
  original stdout/stderr plus every generated artifact before any sanitization. Inventory includes the repair test,
  cookie-only cases, raw-error cases and both setup-input/held-code checkpoints. Fixed baseline canaries are insufficient.
- Optional finding accepted: observe actual invitation acceptance unsafe dispatches rather than an unwritten counter.

Necessary additional manifest paths, recorded before editing:

- `src/features/auth/LogoutRecovery.tsx` — single eager logout content owner, same licensed Secondary buttons source.
- `src/features/auth/LogoutEntryRoute.tsx` — lazy route wrapper consumes that owner; no duplicated guidance/transition.
- `e2e/routeSecretHygiene.ts` — per-test synthetic fixture selection and content-free checkpoint/failure injection.
- `scripts/route-secret-hygiene-cases.ts` — explicit actual-test/checkpoint inventory, no fixture secrets.
- `scripts/check-route-secret-hygiene.mjs` — bounded subprocess runner, original-output/artifact scan, per-case evidence.
- `playwright.route-secret-hygiene.config.ts` — isolated expected-failure execution of the actual new browser suites.
- `scripts/check-secret-hygiene.mjs` — invoke the new scoped scan after existing fixed canaries so the final gate covers it.

No dependencies, package scripts or full-gate-script changes. Existing actual manifest has 36 paths; the seven additions
above yield 43 if all are required. Checkpoint/tracker remain solver-owned under the higher-priority executor contract:
requested fix/reviewer/repair-queue and review-tracker writes cannot be delegated to this worker. Record their intended
values in the fix report; preserve both unchanged during this phase. Actual worker remains `openai/gpt-6.1-sol#high`.

Fix block R1: existing logout content now has one eager owner shared by normal lazy rendering and its failure fallback.
The rejected production logout chunk plus definitive 503 reproduction passes: valid-cookie/local-hiding and entire
browser guidance remain, no Reload/parent bypass appears, no automatic unsafe replay/discovery occurs, and explicit
Retry completes its existing phases. Typecheck and rebuilt application pass. Next block is R2 actual-case evidence.

Fix block R2: the explicit runtime-validated inventory covers all 24 actual new browser tests, including the repair,
cookie-only and raw-error cases. Two code journeys have both live TOTP-input and held-code checkpoints (26 total).
Each controlled subprocess uses fresh known markers in fixture data, fails the actual test at its checkpoint exactly
once, and scans full original stdout/stderr and all artifact files before parsing, summarizing or deleting raw data.
Retained evidence contains only public IDs, checkpoint/failure/scan status, artifact counts and original-stream hashes.
An early-failure canary is rejected rather than credited. No marker leak was found across all 26 probes or the canary.
First run correctly rejected a missing checkpoint caused by a test-harness disclosure selector mismatch; original data
was scanned before removal and was marker-free. Corrected to the existing Technical details button; complete rerun passes.
Evidence: `fix-hygiene-evidence-2.json`, `fix-hygiene-2.log` under the scoped tmp directory. Normal new browser suite also
passes all 24 tests. The final-gate existing hygiene entry now calls this same actual-case scan after fixed canaries;
the full gate has not run in fix. The original pre-fix hygiene residual above is superseded, not silently accepted.

Optional finding: `routeFixtures` now counts invitation acceptance POSTs from the actual request event, without reading
or logging payloads/headers. The parent-flow zero-dispatch assertion is no longer an unassigned constant. R1's logout
counter uses the same actual-dispatch observation to prove exactly one failed attempt and one explicit Retry.

Fix block final targeted regressions: 251 tests across affected App/logout, lazy recovery and controller suites pass;
typecheck, lint/architecture, typecheck-coverage canaries and zero-clone scan pass. All 24 new browser tests pass normally;
the R1 focused built reproduction passes separately. No further source changes after successful hygiene rerun.
Current cumulative manifest is 43 paths; full scoped diff and fix disposition/checkpoint-write request are refreshed
under the same tmp directory in `implement.diff`, `fix-report.md`, `fix-manifest.txt`, and `test-hygiene-report.md`.
Final verify/full gate, fixed-canary-plus-new-scan combined invocation and independent recheck remain pending. No commit.

## Final verification — 2026-10-07

Independent reviewer `ses_eeb0334cbffe6XF3R8nJuKGhdL` cleared R1/R2 and the optional dispatch observer after batch 1,
as carried by the user's verify-only dispatch. Full 43-file tracked-plus-new diff inspected and matched to the worktree
before execution. Baseline/HEAD remains `d1be39a5a4c041f7a26dfef30e6d1e605b21f8ab`.

Exactly one sequential `./run-all-tests.sh` invocation completed with exit 0 in 630.889 seconds. All required components
ran, zero skips: 572 unit tests in 19 suites; 131 bundled-Chromium tests; fixed browser/unit deliberate-failure canaries
and the actual-case scan (24 new browser tests, 26 matching checkpoints, one rejected early-failure canary, zero marker
leaks); typecheck/coverage canaries, lint/architecture, formatting, build, bundle/i18n/API checks, balanced duplication
markers and zero clones, npm audit, `/opt/homebrew/bin/trivy`, licensed catalog and applicable Markdown lint.

Verified content fingerprint: `e9c94753f95ff6e22c277eb05d468518913a08606afca5347706be21974b40c3`, computed from
150 tracked/new application/test/script/root-executable/config/dependency input hashes. Backend API and applicable
Markdown input hashes are separately recorded. All pre/post hashes matched; no source/config/dependency changes.
Evidence under `tmp/agent-execution/2-2-working-routes-and-parent-navigation/`: `final-gate.log`,
`verification-inputs.sha256`, `verification-metadata.json`, `final-hygiene-evidence.json`, `verification-report.md`,
`verification-advisories.log`, `verification-planning.log`, and `verification-preservation.log`.

Only authorized baseline scanner findings remain: nested KaTeX 0.16.47 LOW (`CVE-2026-103923` /
`GHSA-238p-pmpm-9mq7`, fixed 0.18.2), plus the static country-code SendGrid-pattern false positive. Dependency
manifests/source/consumer are byte-identical to baseline; the new chunk's exact static-list range contains the reported
offset. No suppression/update; LOW remains unresolved. Vite's >500 kB minified-chunk warning is reported; the binding
initial-route gzip budget passes at 209377 / 256000 bytes. Full release manual Safari/AT and separate baseline-worktree
execution remain unperformed, not passed or inferred from automated checks.

Planning identity, YAML/frontmatter and dated O1/open BCG/C7 boundaries are consistent. Operational checkpoint/tracker
remain stale (`implement` / story `in-progress`), explicitly unsynchronized because solver writes are permission-denied
and worker instructions reserve their ownership. Exact proposed synchronization/closure metadata is retained under tmp,
not applied. Supplementary planning attempts first found an unavailable `yaml` parser and an incorrect-case title
selector in the ad-hoc checker; existing `js-yaml` plus the read canonical title completed the check. Attempt logs are
retained, not credited as passes. No install or application repair. These reporting-only notes do not invalidate the gate.

Phase result: verified/uncommitted. Spec remains review pending solver tracking synchronization and later authorized
commit; no story-completion claim, commit, push, backend change, or Epic 3 work.

## Authorized commit intent — 2026-10-07

User explicitly reconfirmed the per-story commit authorization; no push. Solver repaired its normalized-path permissions
and synchronized the checkpoint to `commit-pending` with the actual 43-file manifest, cleared independent review and
current verification evidence. The selected tracker is `done` with its commit-pending comment; Epic 2 remains
in-progress until the solver receives the confirmed SHA. This supersedes the historical stale-tracking limitation above.

Spec status `done` is the authorized commit-intent state, not proof of closure. Completion remains conditional on the
confirmed full commit SHA and exact parent/manifest reconciliation. The worker does not edit either tracking file.
History remains at baseline with no prior 2.2 commit, the index was empty, and all 150 verified application/test/script/
config/dependency input hashes plus the backend API fingerprint match. All 38 reviewed executable/test/config diff
sections remain byte-identical. The only parent change since the gate is the approved Markdown permission repair,
preserved/excluded; applicable documentation is unchanged or exempt. No tests/build/gate rerun for these notes.

Intended message: `feat: add working routes and parent navigation (story 2.2)`. Stage only the checkpoint's explicit
43 paths, excluding parent bookkeeping, the 2.1 operational checkpoint, backend dirt, `tmp/`, and `tailwindplus/`.
Record the confirmed SHA, parent, exact manifest and remaining status in the scoped tmp commit evidence; the solver
owns postcommit checkpoint/Epic 2 closure. No retrospective or Epic 3 work is authorized in this phase.
