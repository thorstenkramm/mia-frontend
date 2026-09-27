---
title: 'Localized anonymous entry'
type: 'feature'
created: '2026-09-19'
status: 'done'
baseline_revision: '5679af564b825e797c2f57724e4713330210efad'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - AGENTS.md
  - _bmad-output/specs/spec-mia-frontend/SPEC.md
warnings:
  - oversized
deferred: []
---

<intent-contract>

## Intent

**Problem:** Anonymous MIA currently renders an English-only scaffold, so a visitor on a shared device cannot establish
their interface language or accessible text size before authentication.

**Approach:** Replace the scaffold with the localized anonymous entry surface and add the architecture-owned locale,
announcement, and device-preference boundaries. Negotiate one of the seven launch locales before first render, provide
visible language and text-size controls, and persist only these non-protected device preferences.
The owner-approved 2026-09-27 continuation adds the documented cold-entry gate: session discovery first, authenticated-
only capability discovery second, then canonical dispatch among `/login`, `/`, `/auth/mfa`, and
`/auth/password-change` without mounting protected content early. The approved continuation also provides the focused
restricted-stage logout route at `/auth/logout`, retaining the privacy shield until independent anonymous confirmation.

## Boundaries & Constraints

**Always:** Use FormatJS/react-intl with explicit stable message IDs and complete catalogs for `en-US`, `de-DE`, `fr-FR`,
`pt-PT`, `pt-BR`, `es-ES`, and `es-AR`. Apply exact `lang` and explicit `dir="ltr"` before localized content renders.
Use exact-match and documented language fallback negotiation, with a valid stored anonymous preference taking priority on
later visits. Locale changes update all frontend copy, title, and document language in one render, announce once through
`platform/announcer`, and retain focus. Text size uses Tailwind's inherited root scale for Standard, Large, and Extra
large and persists through `platform/prefs` only. Bind each rendered control/surface to its exact licensed Tailwind Plus
v4 React light blueprint and preserve the public content-free build identifier.

**Never:** Add sign-in fields, MFA or password-change forms, broader logout, Home features, lifecycle or BFCache behavior, public
registration, dark mode, remote assets, telemetry, protected persistence, custom theme values, or a guessed auth stage.
Never translate backend, authored, material, tutor, or raw technical-error text. Backend traffic in this slice is the
ordered session and authenticated-only capability discovery pair plus the restricted logout request and its explicitly
permitted CSRF recovery, anonymous confirmation, or reconciliation reads.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
| --- | --- | --- | --- |
| Exact locale | Browser or valid stored `pt-BR` | Use `pt-BR` and set exact document language | No error expected |
| Regional fallback | `pt-AO`, `es-MX`, `de-AT`, `fr-CA`, or another English variant | Resolve to `pt-PT`, `es-ES`, `de-DE`, `fr-FR`, or `en-US` | No error expected |
| Unsupported locale | Unsupported or malformed language list | Resolve safely to `en-US` | Ignore invalid entries |
| Stored preference unavailable | Storage read or write throws | Keep the negotiated/current in-memory preference | Do not block or expose diagnostics |
| Locale selection | Visitor chooses another launch locale | Copy, title, and `lang` update together; focus stays on selector; one localized announcement | Invalid values are ignored |
| Text-size selection | Visitor chooses Standard, Large, or Extra large | Root scale, controls, and spacing reflow; current value remains exposed and persists | Invalid stored values fall back to Standard |

</intent-contract>

## Code Map

- `src/main.tsx` and `index.html` -- synchronous pre-render preference application and exact default document metadata.
- `src/platform/i18n/` -- replace the ownership note with locale types, negotiation/fallback, catalogs, provider, and the
  single atomic locale-switch entry point required by AD-9.
- `src/platform/prefs/` -- replace the ownership note with validated, exception-safe storage of only anonymous locale and
  text size, plus root text-size application.
- `src/platform/announcer/` -- replace the ownership note with the sole mounted polite live region used by locale change.
- `src/app/App.tsx` -- replace the empty-state scaffold with the anonymous entry composed from Tailwind Plus “Simple
  card”, “Simple native” select, and “Simple inline list” radio blueprints (library `2026-09-13-083323`).
- `src/platform/api/`, `src/platform/data/EntryDataProvider.tsx`, and `src/app/routes/` -- validate generated OpenAPI entry
  documents with Zod, own the non-retrying ordered reads and account-keyed cache identity, and dispatch through the lazy
  declarative entry route table.
- `src/platform/session/` and `src/features/auth/RestrictedLogoutControl.tsx` -- keep session/challenge data out of the
  shared query cache and own restricted logout coordination, shielding, explicit recovery, and cross-tab notification.
- `src/app/app.css` -- retain Tailwind CSS-first and print ownership; no custom palette or breakpoint.
- `package.json`, `scripts/check-i18n-catalogs.mjs`, `run-all-tests.sh` -- make catalog completeness and ICU compilation a
  required gate without adding runtime dependencies.
- `src/**/*.test.ts(x)` and `e2e/scaffold.spec.ts` -- replace scaffold assertions with negotiation, persistence, atomic
  switching, focus, semantics, 320-pixel reflow, and all-locale/all-size coverage.
- `_bmad-output/implementation-artifacts/sprint-status.yaml` -- supervisor bookkeeping; stage only when the supervisor
  explicitly instructs it.

## Tasks & Acceptance

**Execution:**
- [x] `src/platform/prefs/` and `src/platform/i18n/` -- implement validated preference ownership, negotiation, seven
  complete catalogs, and the atomic locale entry point so no feature duplicates policy.
- [x] `src/platform/announcer/`, `src/main.tsx`, and `index.html` -- apply language and text scale before render and emit
  exactly one post-change polite announcement from the fenced owner.
- [x] `src/app/App.tsx` -- build the accessible localized anonymous entry from the three recorded blueprints with one
  main landmark, one h1, skip link, persistent labels/current values, retained focus, and public build ID.
- [x] `scripts/check-i18n-catalogs.mjs`, `package.json`, and `run-all-tests.sh` -- fail on missing, extra, empty, or invalid
  ICU messages in any launch catalog.
- [x] `src/**/*.test.ts(x)` and `e2e/scaffold.spec.ts` -- cover every I/O row plus keyboard focus, document metadata,
  reload persistence, translated controls, direct 320 CSS pixels, and each text mode.
- [x] `src/platform/api/`, `src/platform/data/`, and `src/app/App.tsx` -- implement the owner-approved session-first,
  authenticated-only capability gate with canonical entry dispatch, exhaustive state rendering, and protected suppression.
- [x] protocol-fake unit/integration tests and `e2e/scaffold.spec.ts` -- prove request ordering, canonical routes,
  restricted-stage isolation, capability-failure suppression, boundary rejection, and localized raw-error treatment.
- [x] `src/platform/session/`, restricted auth routes, and logout tests -- shield before one unsafe dispatch, confirm only
  after an independent anonymous read, retain ambiguous outcomes, and permit retry or reconciliation only explicitly.

**Acceptance Criteria:**
- [x] Given browser language preferences with no valid stored locale, when anonymous entry mounts, then the documented
  exact and regional fallback rules select one launch locale and exact `<html lang>`/`dir="ltr"` exist before copy.
- [x] Given the visible language selector, when a visitor changes locale, then all frontend-owned copy and title change
  atomically, selector focus remains, and the announcer emits one target-locale message after document language changes.
- [x] Given any of the three visible text-size choices, when selected, then the Tailwind root scale updates type,
  controls, and spacing together, exposes the current value, survives reload through `platform/prefs`, and does not
  create page-level horizontal scrolling at 320 CSS pixels.
- [x] Given all seven launch catalogs, when the localization gate runs, then missing, extra, empty, and invalid ICU
  messages fail; every catalog renders the anonymous entry at Standard, Large, and Extra large.
- [x] Given storage is unavailable or contains invalid values, when entry loads or a preference changes, then MIA stays
  operable with safe in-memory/default values, makes no preference-triggered request, and performs no protected-data write.
- [x] Given any authoritative entry stage, when cold entry resolves, then session discovery runs first; capability
  discovery runs only for `authenticated`; the canonical route is selected; and Home mounts only after both reads succeed.
- [x] Given either entry read fails or violates its documented schema, when the error renders, then protected content
  remains absent and the localized explanation is honest; HTTP errors retain collapsed exact status and raw body text.
- [x] Given a restricted stage, when logout is activated, then the canonical privacy route replaces restricted content
  before dispatch; backend `204` plus a later anonymous discovery is required for truthful confirmation; failure remains
  shielded with explicit recovery and no automatic unsafe replay.

## Spec Change Log

## Review Triage Log

### 2026-09-19 — Review pass

- verdicts: 26 findings — high 0, medium 14, low 6, false 6, maybe-false 0
- findings:
  - `[false]` `[reject]` Document language changes before React commits the selected catalog — both mutations complete
    synchronously in the same user-event task before paint, while the required ordering keeps `lang` ahead of the
    localized announcement.
  - `[false]` `[reject]` Announcement arbitration is outside `platform/announcer` — the sole live region is exported by
    that fenced owner; no competing announcement producer exists in this story.
  - `[false]` `[reject]` Bootstrap can bypass catalog switching through `applyDocumentLocale` — bootstrap resolves the
    same locale passed to `MiaIntlProvider`, and the shared helper is the single platform-owned document mutation path.
  - `[low]` `[reject]` Future message declarations outside the registry could evade extraction — current declarations
    have one explicit registry, and a broader source scanner would add complexity for a hypothetical convention breach.
  - `[medium]` `[patch]` Catalog validation did not preserve ICU argument parity — the gate now parses source and target
    messages and rejects renamed or missing arguments.
  - `[medium]` `[patch]` Supported regional tags with BCP 47 extensions fell to the wrong regional default — negotiation
    now checks the canonical base name before language fallback and has regression coverage.
  - `[medium]` `[patch]` Reflow coverage checked only page overflow — the locale/size matrix now also verifies translated
    headings and visible controls for every combination.
  - `[medium]` `[defer]` The anonymous flow lacks 200% and 400% browser-zoom evidence — recorded one deferred item because
    the existing Playwright substrate has no browser-zoom harness.
  - `[medium]` `[patch]` Persisted text size was not exercised across reload — Playwright now reloads Extra large and
    verifies both the selected radio and root class.
  - `[medium]` `[patch]` The no-backend-request boundary had no browser assertion — the primary anonymous flow now records
    and rejects every `/api` request through load, changes, and reload.
  - `[medium]` `[patch]` Storage failure was covered only at helper level — an integrated component test now negotiates,
    renders, changes locale, and changes text size while storage throws.
  - `[low]` `[patch]` Live-region semantics were not asserted — the locale test now verifies the sole region remains
    polite and atomic; the implementation emits one keyed message from one state update.
  - `[low]` `[patch]` Argentine Spanish used informal voseo despite the formal voice contract — the two affected strings
    now use consistent formal phrasing.
  - `[false]` `[reject]` The in-review story had unchecked tasks and expected-only verification text — finalization now
    records completed tasks and actual outcomes; this was workflow state rather than an implementation defect.
  - `[medium]` `[patch]` Two locale requests before a commit could compare against a stale render — a synchronous active
    locale ref now guards and records each request before scheduling state.
  - `[medium]` `[patch]` Regional BCP 47 extensions could lose Brazilian or Argentine selection — resolved by the shared
    base-name negotiation patch above.
  - `[false]` `[reject]` `Intl.DisplayNames` could be absent — every release-one supported evergreen desktop browser
    provides the required API, so the cited failure state is outside the supported runtime.
  - `[low]` `[patch]` Zero extracted IDs could let an empty catalog set pass — the catalog gate now fails explicitly when
    extraction returns no frontend messages.
  - `[false]` `[reject]` `storeLocale` accepts arbitrary runtime strings — its only caller passes the closed `Locale`
    union after validation, and stored reads are validated again before use.
  - `[medium]` `[patch]` Runtime catalog and reload coverage was incomplete — translated headings now run for all seven
    locales and text-size persistence is asserted across reload.
  - `[medium]` `[patch]` Browser negotiation was not verified at the application entry point — Playwright now starts with
    `pt-BR` browser locale and verifies initial metadata, title, and copy.
  - `[medium]` `[patch]` Persisted text size could regress at bootstrap without failing tests — covered by the reload
    assertion described above.
  - `[medium]` `[patch]` Catalog-to-locale bindings could display the wrong language unnoticed — every locale now asserts
    representative translated runtime copy.
  - `[medium]` `[patch]` Live-region accessibility attributes could regress unnoticed — the component test now locates
    the emitting region and asserts `polite` and `atomic` semantics.
  - `[low]` `[reject]` The catalog gate itself lacks mutation-style negative fixtures — its direct missing, extra, empty,
    ICU compilation, and argument checks run in the authoritative gate; a configurable fixture harness is disproportionate.
  - `[low]` `[patch]` Standard text-size mapping was not asserted — the component test now returns from a larger mode and
    verifies `text-base` with both larger classes removed.

### 2026-09-27 — Supervisor review round 3 fixes

- `[critical]` `[patch]` The technical-details disclosure target was below 24 CSS pixels. It now adapts the exact
  Tailwind Plus “Marketing > Page Sections > FAQs > Centered accordion” v4 React light blueprint, preserves its 28-pixel
  icon row, adds a full-width minimum-height disclosure button and visible focus styling, and has browser geometry
  assertions on logout and entry-error surfaces.
- `[critical]` `[patch]` Required accessibility regression evidence was absent. Playwright now applies all WCAG 1.4.12
  text-spacing values at 320 CSS pixels across every locale and text mode; emulates forced colors and reduced motion on
  failed logout; verifies focus, operability, no running animation, native forced-color adjustment, target geometry, and
  no page overflow; and runs `@axe-core/playwright` 4.13.0 scans on stable anonymous, restricted, logout-error, and
  entry-error states. Scans use WCAG 2/2.1/2.2 A and AA tags with no exclusions or rule suppressions. Error fixtures are
  synthetic inert text, and scanner failure summaries contain only rule ID, impact, and node count.

### 2026-09-27 — Supervisor completion decision

The supervisor marked the story done after the round-3 critical findings were fixed and the applicable verification
chain passed. No subsequent independent reviewer pass occurred.

## Design Notes

Text-size classes use inherited Tailwind defaults (`text-base`, `text-lg`, `text-xl`) on the root, avoiding an invented
scale. Story 1.3 owns credentials and restricted-stage mutations other than the approved restricted logout. This story
implements the approved cold session/capability reads, entry dispatch, restricted logout, localized frame, and global
anonymous preferences while BCG-001 remains open.

## Verification

**Commands:**
- `npm run typecheck` -- expected: strict locale, message, and preference types compile without suppression.
- `npm run lint` -- expected: architecture fences confirm storage and live-region ownership.
- `npm test` -- expected: negotiation, storage failure, switching, catalog, and component behavior pass.
- `npm run build` -- expected: localization catalogs and Tailwind classes build within the bundle budget.
- `npm run test:e2e` -- expected: bundled Chromium passes the anonymous localization/text-size flow and 320px checks.
- `./run-all-tests.sh` -- expected: the authoritative gate, including catalog completeness, passes with skips reported.

## Auto Run Result

### Summary

Replaced the English-only scaffold with a seven-locale anonymous entry and the approved cold-entry gate. Locale and root
text-size preferences are applied before React mounts; session-first discovery dispatches the canonical entry paths;
restricted stages provide privacy-shielded logout; Home remains suppressed until authenticated-only capability discovery
succeeds; and localized inert error disclosure supports exact response-body copy without exposing protected content.

### Files changed

- `src/app/` and `src/main.tsx` — localized anonymous entry, pre-render preference bootstrap, and component coverage.
- `src/platform/i18n/` — launch-locale policy, FormatJS provider/catalogs, document metadata, and negotiation tests.
- `src/platform/prefs/` and `src/platform/announcer/` — safe device preference and sole live-region boundaries.
- `scripts/check-i18n-catalogs.mjs`, `package*.json`, and `run-all-tests.sh` — catalog validation and authoritative-gate wiring.
- `e2e/scaffold.spec.ts` — browser negotiation, focus, persistence, network-boundary, translation, target geometry,
  direct 320-pixel reflow with WCAG text spacing, forced-colors/reduced-motion emulation, accessibility scans, and actual
  200%/400% Chromium browser-zoom coverage.
- `index.html` and `tsconfig.app.json` — neutral bootstrap metadata and typed JSON catalog support.
- `src/platform/api/`, `src/platform/data/`, `src/app/routes/`, and `src/features/` — generated wire types, validated
  minimized entry view models, account-keyed ordered discovery, lazy canonical route content, and neutral gate states.
- `src/platform/session/` — non-persistent session orchestration and restricted logout coordination outside React Query.

### Review findings

The review reported 26 findings. Nine medium and four low root-cause entries were patched, and six false plus two low
findings were rejected for the reasons in the triage log. The subsequent fix pass resolved the deferred browser-zoom
evidence with a local test-only extension that invokes Chromium's browser-owned tab zoom.

### Follow-up review recommendation

True. Patched entry counts were high 0, medium 9, and low 4. A follow-up should re-check locale negotiation, browser
bootstrap/persistence, catalog argument validation, and the expanded runtime locale matrix.

### Verification performed

- `npm run typecheck` — passed.
- `npm run lint` — passed with architecture checks.
- `npm test` — passed, 57 tests, including query-cache isolation, logout ordering, ambiguity, explicit retry, and
  late-transition reconciliation.
- `npm run build` — passed.
- `npm run test:e2e` — passed, 11 bundled-Chromium tests including canonical entry routing, restricted logout privacy
  shielding and confirmation, target geometry, WCAG text spacing, forced colors, reduced motion, accessibility scans,
  and actual 200% and 400% browser zoom.
- `npm run check:i18n` — passed for 7 complete ICU catalogs.
- `npm run check:api-types` — passed against the implemented OpenAPI contract.
- `./run-all-tests.sh` — passed after the restricted logout and cache-isolation fixes, including formatting, duplication,
  audit, Trivy, catalog, API drift, and E2E gates.

### Residual risks

Canonical `/login` and protected `/` routing remains blocked on the user-confirmed BCG-001/003 dependency and scope
reconciliation. A follow-up review is recommended because nine medium entries changed.

The 2026-09-27 owner-approved partial-entry decision supersedes that routing residual only for the documented entry reads,
canonical entry paths, and restricted-stage logout implemented here. BCG-001 and BCG-003 remain open for lifecycle,
broader logout and protected routing, bounded-scope retrieval, and release evidence; credentials, restricted forms other
than logout, and Home features remain deferred.
