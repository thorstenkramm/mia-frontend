---
title: Basic capability-driven navigation (Story 2.1)
type: story
story: 2-1-basic-capability-driven-navigation
created: 2026-10-06
status: done
baseline_commit: b8909dbaacd7eb3e6eb2c85a650a0f3fc9ba4a7e
prepare_session: ses_eee90c265ffeVIAWyc2DlyrnYF
context:
  - _bmad-output/planning-artifacts/epics.md (Story 2.1, lines 100-116; planning conventions 29-50)
  - _bmad-output/implementation-artifacts/epic-1-retro-2026-10-06.md (C1, C3 and the deferred nonce/CSRF note only)
  - .opencode/story-execution.md
---

# Story 2.1 — Basic capability-driven navigation

## Intent

Signed-in users get one shared application shell exposing only authorized, implemented destinations, Home, and Sign
out. Home becomes a neutral entry surface. The same story repairs exactly two Epic 1 retrospective defects in the shared
session controller: C1 (hidden-during-recovery fencing) and C3 (logout retry after `204 → confirmation unavailable →
anonymous`). Nothing else from the retrospective backlog (C2, C4–C7, P-items) is in scope; those actions stay open.

## Baseline and worktree

- Baseline: `b8909dbaacd7eb3e6eb2c85a650a0f3fc9ba4a7e` (HEAD, clean worktree at prepare time; no pre-existing changes).
- The sibling backend checkout `./mia` (revision `63c99925e5995fe2e2467f4f894976dfd4c0d297`) has its own unrelated
  dirty files. It is outside this repository's scope and must not be touched.
- Baseline `npm run typecheck` passes (log: `tmp/agent-execution/2-1-basic-capability-driven-navigation/`).

## Authoritative contracts (referenced, not copied)

- Shell behavior: `EXPERIENCE.md` §Navigation Model, §Current delivery slice, component row `application-shell`;
  `DESIGN.md` §Components `application-shell` (groups explicit; no remote branding); `ROUTE-INVENTORY.md` §Contract,
  §Home, §MFA Settings, §Navigation Binding.
- Neutral Home: `FRONTEND-PRD-FOUNDATION.md` §Owner-approved tutoring-first milestone — 2026-10-06 (may be a neutral
  navigation entry; must not claim no pending work; no fabricated dashboard or unimplemented links).
- Mount gate and restricted stages: `SECURITY-PRIVACY-ACCEPTANCE.md` §Protected Mount Gate; `ACCESSIBILITY-ACCEPTANCE.md`
  AC-003, AC-004, AC-001/002 reflow and text modes.
- C1: `FRONTEND-STATE-MACHINES.md` machine 9 (lifecycle signals only mark revalidation; only explicit Refresh reveals)
  and machine 24.
- C3: `SECURITY-PRIVACY-ACCEPTANCE.md` §Logout and Privacy Screen (confirmation = recorded `204` for the applicable
  attempt + subsequent anonymous discovery with fresh anonymous CSRF; "without a `204`, anonymous discovery alone does
  not confirm"); `FRONTEND-STATE-MACHINES.md` machine 1 logout rows.
- Transport (implemented, unchanged): `GET /api/v1/auth/session`, `GET /api/v1/users/me/capabilities`
  (`mia/api-doc/paths/users.yaml#/capabilities`: successful discovery permits basic Home for every authenticated
  account; sections gated by their action + scope), `POST /api/v1/auth/logout` (requires session cookie + CSRF; `204`,
  `401`, `403 csrf_invalid`, `406`).

## BCG check

- `BCG-001` (open): only the already-approved session discovery, Continue/lifecycle, and logout operations are used.
  No new transport. C3 stays within the approved 2026-10-05 logout slice.
- `BCG-003` (open): the existing capability read is used exactly as today. The only section exposed is Profile and
  security → MFA overview, already owner-approved (2026-10-05, own-scope `profile.view`). No other capability family is
  parsed or shown. Story 2.1 is explicitly authorized by the 2026-10-06 replan. No BCG is closed.
- No dependent slice is blocked.

## Settled decisions

These are selections within the binding contracts, recorded once here. The solver may override before implementation.

- **D1 Blueprint.** `application-shell` binds to Tailwind Plus `Application UI > Application Shells > Sidebar Layouts >
  Simple sidebar`, `v4/react-light.jsx`, library `2026-09-13-083323`. Rationale: labelled navigation sections make the
  capability groups (Learn, Prepare, Mentor, Administer, Profile and security) explicit and scale to later stories
  without a shell rewrite; the stacked `With bottom border` alternative has only flat links and was rejected. Required
  MIA deltas, recorded in the file comment: no remote logo image (plain product name text), no avatar/profile link or
  cached name, no notification control, the bottom profile entry becomes the Sign out button, the mobile top bar loses
  `sticky` (prevents obscuring focus at 200/400% zoom, AC-004) and shows the product name instead of a duplicated page
  title, the "Your teams" pattern becomes one labelled group per authorized capability group (no initials badge),
  links are router `Link`s, and the current link gets a non-colour indicator that survives forced colors (AC-002
  forced-colors clause; use Tailwind's `forced-colors:` variant, no custom CSS).
- **D2 Shell scope.** The shell renders only after the complete gate for the route has passed: Home after stage +
  capabilities; MFA routes after their route-resource read is `Ready`. Cold, checking, access-checking (loading or
  failed), deferred, privacy-shield, restricted, logout, public, and the MFA route's `Checking`/`Check failed` states
  keep the existing neutral `SimpleEntrySurface` with no navigation (Protected Mount Gate: "render only a neutral
  Checking access shell" until every step succeeds).
- **D3 Destinations.** Navigation = Home (always, once in the shell) + group "Profile and security" containing the link
  "Multi-factor authentication" → `/profile/security/mfa`, present only when `AuthenticatedAccess.ownProfileView` is
  true. No other group or link exists in this story, whatever other capabilities are available. No role switcher.
  `aria-current="page"` only on an exact path match (MFA child routes mark nothing current).
- **D4 Sign out.** Visible Sign out in the desktop sidebar footer and the mobile top bar (only one is displayed at a
  time by the blueprint's breakpoint classes). It calls the existing `beginAuthenticatedLogout`. Home's body no longer
  carries its own Sign out button or MFA link.
- **D5 Neutral Home.** `/` keeps title/h1 "Home" and replaces the body copy ("Access checks are complete.") with one
  localized sentence directing the user to the navigation. No list, metric, empty-work claim, last-checked time, or
  extra request. All seven catalogs updated.
- **D6 C1 repair.** A lifecycle signal (`focus`, `online`, `visibilitychange`, network change; `pagehide` already does)
  arriving while `Privacy shield` is in phase `checking` fences that recovery: the controller treats it like the
  authenticated case and calls `shield()` (sequence++, abort active read, `Privacy shield` / `pending` / reason
  `lifecycle`, `anonymousOrigin` preserved, mask-only teardown). No request is issued; only a later explicit Refresh
  may reveal content. Implement in `SessionController.observeLifecycle`; do not add listeners or a new state.
- **D7 C3 repair.** Retry logout keeps the previous attempt's recorded `204` until its own CSRF-recovery discovery
  resolves. If that discovery returns `anonymous`, a `204` is recorded for this logout flow, no reconciliation marker is
  set, and a single readable anonymous CSRF cookie exists, the attempt finishes `confirmed` (no second POST, broadcast
  `logout-confirmed`). Without a recorded `204` it stays `Logout unconfirmed` and sends nothing. If discovery returns a
  signed-in stage permitted for the scope, clear the stale recorded `204` and dispatch exactly one new logout. Do not
  POST logout while anonymous (OpenAPI requires the session cookie, so it would `401`).
- **D8 Anonymous-CSRF predicate (retro deferred note).** Every logout confirmation path (initial confirming read,
  retry recovery, explicit reconciliation) requires anonymous discovery plus a readable single CSRF cookie
  (`readCurrentCsrfCookie() !== null`) read immediately after that discovery. The value is never retained. Missing
  CSRF ends `unconfirmed` (keeping a recorded `204` so an explicit Retry can confirm).
- **D9 Nonce association (retro deferred note).** No change. Requiring receiving tabs to match a `logout-confirmed`
  nonce would strand tabs that never saw `logout-start` (fresh documents) in an unconfirmable state, and every
  confirmation still requires the tab's own anonymous discovery. Record this disposition in the story result; the
  retro action item stays open.

## Acceptance mapping

| Story criterion | Implementation | Evidence |
| --- | --- | --- |
| AC1 authenticated → one shell with only authorized implemented destinations, Home, Sign out, no role switcher | D1–D4; shell composed in `App.tsx` / `ProfileMfaRoute.tsx` | Component tests T1–T4; E2E E1 |
| AC2 anonymous/restricted at protected path → focused flow only, no shell/identity | D2; existing `routeKey` dispatch unchanged | Component test T5 (anonymous, `mfa`, `password-change`, access-check failure, privacy shield at `/` and `/profile/security/mfa`) |
| AC3 keyboard, sign-out, delayed Refresh then hiding keep focus usable and content protected; C1 and C3 repaired | Bypass link + h1 focus reused; D6; D7; D8 | Controller tests U1–U7; component tests T6–T8; E2E E1–E3 |
| AC4 Home neutral entry, not fabricated empty-work/dashboard | D5 | Component test T9 (copy, no extra requests) |

Coverage IDs carried from `epics.md`: FFR-201/206, NFR-3/16..19, AD-4/5/7, UX-DR12/45.

## File and symbol map

Modify:

- `src/platform/session/sessionController.ts` — `observeLifecycle` (D6); `retryRestrictedLogout`, `runLogoutAttempt`,
  `runLogoutReconciliation` (D7, D8). Keep the existing phases, coordinator, and broadcast vocabulary.
- `src/platform/session/sessionController.test.ts` — U1–U7.
- `src/app/App.tsx` — `CanonicalEntry`: the `home` route renders inside `ApplicationShell` instead of
  `SimpleEntrySurface`; everything else unchanged.
- `src/app/routes/ProfileMfaRoute.tsx` — the ready branch renders inside `ApplicationShell`; checking/failed branches
  unchanged (D2).
- `src/app/routes/SimpleEntrySurface.tsx` — consume the extracted bypass-link/heading-focus owner (no behavior change).
- `src/features/home/HomeEntryRoute.tsx` — neutral body only (D5); drop the MFA link, Sign out button, and stale
  comment about Home standing in for the profile.
- `src/platform/i18n/messages.ts` and `src/platform/i18n/catalogs/{de-DE,en-US,es-AR,es-ES,fr-FR,pt-BR,pt-PT}.json` —
  new shell messages (navigation landmark name, "Profile and security" group label, open/close navigation control names
  and dialog name, MFA nav label), revised `entry.home.introduction`; remove `homeMfaLink` if it becomes unused.
- `src/app/App.test.tsx` — only adapt existing assertions that the shell legitimately changes (two Sign out controls in
  jsdom, moved MFA link, Home copy). New shell coverage goes in the new test file (retro P5: stop growing this file).
- `e2e/scaffold.spec.ts`, `e2e/mfaEnrollment.spec.ts`, `e2e/sessionLifecycle.spec.ts` — only where Home copy or the
  moved controls change an existing locator.

New:

- `src/app/ApplicationShell.tsx` — the blueprint-bound shell (title, bypass link, desktop sidebar, mobile Headless UI
  `Dialog` drawer, top bar, `main` with the single `h1`, `SessionWarning` slot, build identifier). Render the navigation
  list from one internal component used by both the desktop sidebar and the drawer so the blueprint's duplicated markup
  is not copied (jscpd scans `src/app/**` outside `components/`). Navigation items derive from
  `useAuthenticatedAccess()` and take paths from `entryRoutes` (typed paths from the route table, AD-3/AD-4).
- `src/app/routes/<route-focus owner>.tsx` — one extracted owner for the bypass link and route-heading focus effect
  shared by `SimpleEntrySurface` and `ApplicationShell` (name by responsibility; no `util`).
- `src/app/ApplicationShell.test.tsx` — T1–T9.
- `e2e/applicationShell.spec.ts` — E1–E3 (own minimal local fake backend; trace/screenshot/video off).

Not touched: `src/platform/api/**` (capability parsing stays `ownProfileView` only), `entryRoutes` gate data unless a
typed nav lookup needs an export, `mfaEnrollment.ts`, `SessionProvider.tsx` listeners, `run-all-tests.sh`, packages.

## Test plan

Controller (`sessionController.test.ts`, msw + test origin locks, fixtures generated per test):

- U1 Lifecycle shield → `refreshSession` with delayed discovery → `observeLifecycle()` → release → state stays
  `Privacy shield`/`pending`/`lifecycle`; no capability request; `getAuthenticatedAccess()` is null; a second explicit
  `refreshSession` reaches `Authenticated`.
- U2 Same with discovery `authenticated` and the capability read delayed: fence aborts/ignores it; no `Authenticated`.
- U3 Fencing preserves `anonymousOrigin` and sends no request.
- U4 `204` → confirming discovery fails → `Logout unconfirmed` → Retry → discovery anonymous with CSRF →
  `Logout confirmed`; exactly one logout POST overall; `logout-confirmed` broadcast observed.
- U5 Logout POST fails (no `204`) → Retry → anonymous → stays `Logout unconfirmed`; zero further POSTs.
- U6 Recorded `204`, Retry discovery returns `mfa` → exactly one new POST; if it fails, a later Retry with anonymous
  discovery does not confirm (stale `204` cleared).
- U7 Anonymous confirmation with no readable CSRF cookie → `Logout unconfirmed`; explicit Retry after CSRF is readable
  confirms (recorded `204` retained).

Component (`ApplicationShell.test.tsx`, render `App` with msw):

- T1 Capabilities with own `profile.view` → one navigation landmark (named), Home link `aria-current="page"` at `/`,
  labelled group "Profile and security" with the MFA link, Sign out; no other group.
- T2 Administrator/multi-role fixture with every action available → still only Home, Profile and security, Sign out;
  no Learn/Prepare/Mentor/Administer link and no role switcher.
- T3 `profile.view` unavailable → no group, Home + Sign out only.
- T4 Home entry issues exactly session discovery + capabilities; no MFA read until the MFA link is activated; during
  the MFA route-resource read no navigation landmark exists; after it the shell shows with the MFA link current.
- T5 Anonymous, `mfa`, `password-change`, capability failure, and privacy shield at `/` and `/profile/security/mfa` →
  no navigation landmark, no Sign out from the shell, neutral title/h1 of the focused flow.
- T6 Skip link is the first focusable control and moves focus to `main`; title is set before the h1 receives focus on
  route change.
- T7 Shell Sign out → one fresh-CSRF logout POST, navigation removed, logout surface heading focused.
- T8 C1 at DOM level: delayed Refresh, `visibilitychange`, release → Home heading and navigation never mount; Stop
  waiting focus falls back to Refresh.
- T9 Home body shows the neutral sentence and no list, metric, or empty-work claim.

Browser (`e2e/applicationShell.spec.ts`, bundled Chromium):

- E1 Desktop keyboard: Tab order bypass → nav links → Sign out; keyboard MFA navigation focuses the new h1; axe scan of
  Home with recorded rules and no suppression.
- E2 Direct 320 CSS px in Standard, Large, Extra large: no page-level horizontal scroll; open the drawer by keyboard,
  Escape returns focus to the toggle; selecting a link closes the drawer and focus lands on the destination h1 (not the
  restored toggle); axe scan with the drawer open.
- E3 Sign out from the 320 px top bar reaches the confirmed signed-out surface.

Existing suites that must stay green: `sessionController.test.ts`, `App.test.tsx`, `e2e/sessionLifecycle.spec.ts`,
`e2e/mfaEnrollment.spec.ts`, `e2e/scaffold.spec.ts`, secret hygiene.

Targeted iteration: `npx vitest run src/platform/session/sessionController.test.ts src/app`, then `npm run typecheck`,
`npm run lint`, `npm run check:i18n`, then the touched Playwright files. The final authoritative gate is
`./run-all-tests.sh` (verify phase), including Trivy at `/opt/homebrew/bin/trivy`.

## Risks

- Headless UI `Dialog` restores focus to its trigger on close; that can race the route h1 focus after a drawer link is
  chosen. E2 must prove the h1 wins.
- jsdom applies no CSS, so both Sign out controls exist in component tests; locate within the named landmark/top bar
  rather than weakening assertions.
- The blueprint's current-state colours vanish under forced colors; the current link needs a non-colour cue.
- D6 fences any lifecycle signal during an explicit recovery, including a focus event that arrives just after a Refresh
  click from another window; the lifecycle E2E suite must stay green.
- D8 depends on fakes issuing a readable CSRF cookie with anonymous discovery; adjust fixtures, never the predicate.
- Home → MFA briefly shows the neutral checking surface (D2); this is intended.

## Exclusions

- Learn, Prepare, Mentor, Administer sections; `/profile`; profile editing; Home aggregation, last-checked time, empty
  state; route error boundaries, chunk failure, parent-route work beyond the Home link (Story 2.2); the MFA
  `Check failed` exit (Story 2.2 recovery surface).
- Retro C2, C4–C7, P-items; logout nonce association changes (D9); the residual case where a receiving tab is
  `Logout unconfirmed` with no recorded `204` while the browser is already anonymous (recovers on the initiator's
  `logout-confirmed` broadcast or a fresh document; report, do not fix).
- Fencing cold bootstrap in a hidden tab (not C1).
- New dependencies, capability parsing changes, dark mode, avatars, notification controls.

## Open decisions

None blocking. D1–D5 are UX selections within the contracts above; D6–D9 apply the retro dispositions to the accepted
logout contract.

## Deviations

1. The desktop sidebar and mobile top bar sit in one `<header>` (banner landmark). Axe's `region` rule flagged their
   content outside landmarks; the blueprint has no landmark there. Recorded beside the markup.
2. The group label uses `text-gray-500` instead of the blueprint's `text-gray-400`, which fails 4.5:1 for small text.
   The page `h1` follows `Application UI > Headings > Page Headings > With actions` without actions or `sm:truncate`,
   so long translations wrap; route content sits in a `max-w-lg` column below it.
3. D7's rule ("a signed-in observation makes an earlier `204` inapplicable") is also applied when the confirming read
   or an explicit reconciliation Refresh returns a signed-in stage, not only in Retry's recovery read. Otherwise a later
   anonymous check could confirm on a stale `204`.
4. The message key `entry.home.mfaLink` became `shell.navigation.mfa` (translations kept) because the link moved from
   Home into the shell.
5. Repair batch 1 (R1): intentional shell departure asks the mounted route through
   `src/platform/ui/routeDeparture.tsx`. The recovery-code route refuses while codes are masked (focus Reveal) or
   unacknowledged (the same refusal as Done: announcement and acknowledgement focus), and otherwise leaves with a
   replaced history entry and `finishCodes()`. A refusal from the drawer runs after the drawer has unmounted so the
   dialog's focus restoration cannot take focus back. `PrimaryButton` accepts a `ref`. Browser Back and the deferred
   C7 codes→verify retention are unchanged.
7. Repair batch 2 (R1 lazy interval): the departure provider takes a host `fallback` used while no route guard is
   registered. `ProfileMfaRoute` (above the lazy boundary) supplies a refusing fallback on the codes path whenever
   codes are held, announcing the same acknowledgement message, so shell links cannot leave while the codes route
   module is still loading. No chunk-error recovery was added (Story 2.2).
6. Repair batch 1 (R2): the shared bypass link adds `focus:not-sr-only` and `focus:z-60`, which also fixes the same
   latent invisibility on every `SimpleEntrySurface` route.

## Progress

- 2026-10-06 prepare: contracts, OpenAPI operations, BCG status, blueprint, tooling, and model catalog checked; spec
  written. No application code changed.
- 2026-10-06 implement block 1 (controller): D6 in `observeLifecycle`; D7/D8 in `retryRestrictedLogout`,
  `runLogoutAttempt`, `runLogoutReconciliation` via `hasAnonymousCsrf()`. A non-anonymous confirming or reconciliation
  result also clears the recorded `204` (same rule as D7). U1–U7 added; the five positive ones fail against baseline,
  the stale-`204` test fails when the clearing line is removed.
- 2026-10-06 implement block 2 (shell): `src/app/ApplicationShell.tsx` and `src/app/routes/routeFrame.tsx`
  (`useRouteHeadingFocus`, `BypassLink`, `BuildIdentifier`, shared with `SimpleEntrySurface`); Home and the MFA ready
  branch render inside the shell; neutral Home; seven catalogs (`entry.home.mfaLink` became `shell.navigation.mfa`).
  `src/app/ApplicationShell.test.tsx` covers T1–T9 plus the drawer; one `App.test.tsx` locator scoped to the named
  navigation. Unit suite, typecheck, lint, i18n, format, and jscpd pass.
- 2026-10-06 implement block 3 (browser): `e2e/applicationShell.spec.ts` E1–E3 (desktop keyboard order + axe; 320 px
  in three text modes with drawer open/Escape/link selection, focus stays on the route h1 after the drawer closes, axe
  with the drawer open; top-bar Sign out). Axe's `region` rule required a landmark around the sidebar and top bar, so
  both sit in one `<header>` (recorded blueprint delta). Shell content sits in a `max-w-lg` column under the h1. One
  `e2e/scaffold.spec.ts` locator follows the new Home copy. Existing scaffold, MFA, and lifecycle suites: 97 passed.
- 2026-10-06 fix batch 1: R1 and R2 repaired (Deviations 5–6). Tests: `App.test.tsx` codes departure (masked and
  revealed, both shell links, desktop and drawer, then acknowledged departure with unchanged history length, teardown,
  and Back); `e2e/mfaEnrollment.spec.ts` 320 px drawer refusal and departure; `e2e/applicationShell.spec.ts` bypass
  visibility, size, and hit-testing on the shell and sign-in at 1280 and 320 px. The unit test fails with the guard
  disabled; the bypass tests fail with the old classes.
- 2026-10-06 fix batch 2: R1 lazy-load interval closed (Deviation 7). `src/app/recoveryCodesDeparture.test.tsx` holds
  the lazy codes module via `vi.mock`, completes verification, activates both desktop links and the drawer Home link
  before release, and asserts pathname, history length, the announcement, Sign out availability, and that codes are
  still held (Reveal offered) after release. It fails with the fallback removed (`/` instead of the codes path).
- 2026-10-06 verify: `./run-all-tests.sh` exit 0, no skipped component (fingerprint and counts in the checkpoint and
  `tmp/agent-execution/2-1-basic-capability-driven-navigation/final-gate.log`). Trivy reported two pre-existing
  findings (katex LOW; SendGrid-pattern hit on the bundled country-code list) for solver disposition.
- 2026-10-06 commit resume: history still at baseline; final input fingerprint recomputed exactly and review clear.
  SendGrid-pattern finding proven to be the unchanged static country-code list; baseline LOW KaTeX advisory precisely
  recorded in the checkpoint. Both nonblocking under the authorized solver disposition; no dependency change or
  suppression. Gate evidence reused without rerun. Tracker/spec remain done; execution stays commit-pending until SHA
  confirmation. Anthropic 429/stopped-state assurance and OpenAI fallback recorded in the checkpoint.
