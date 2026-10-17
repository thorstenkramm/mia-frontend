# Story 7.3 — Move the build identifier into the sidebar footer

## Authority, baseline and boundary

Prepare-only spec. Baseline `06578ca5763e229c2d0b9fc88e24e5e2241e8512`; worktree clean at preparation.
Story authority: `epics.md:447-456`, `epic-7-context.md`, and the owner ruling in
`sprint-change-proposal-2026-10-14.md` §3 (the ruling supersedes the redesign package's original
application-shell exclusion). `tmp/course-preparation-redesign/01-change-brief.md` identifies the problem;
`02-ux-specification.md` preserves the implemented narrow shell; `06-planning-impact.md` identifies the
sidebar-footer destination. The screenshots illustrate placement, not new shell behavior. The canonical
`DESIGN.md`, `EXPERIENCE.md`, `ROUTE-INVENTORY.md`, `ACCESSIBILITY-ACCEPTANCE.md` (AC-001..004),
`FRONTEND-PRD-FOUNDATION.md` (FFR-208), and security/privacy gate remain binding. No transport is added:
BCG-003 is open globally but its existing authenticated capability-discovery slice already owns the shell
mount; this presentation-only move does not depend on closing it or change that gate.

Story 7.3 is independent of the course-state work in 7.1/7.2, both committed; no backend revision or
course activation prerequisite is needed. Move only the authenticated application shell's existing public,
localized build identifier. Do not change the version/revision generation, label, catalogs or page content
other than removing that identifier. `SimpleEntrySurface` continues to display the identifier without
authentication (FFR-208), below its entry card; anonymous, restricted MFA/password-change, and other
non-shell focused surfaces keep their existing layout. Neutral checking/privacy gates never gain a shell.
Owner clarification during implementation: the temporary `CheckingAccess` page hides the public label
while waiting; the anonymous sign-in page retains it. This is a narrow exception to the original
"non-shell unchanged" boundary, authorized after discovering the existing checking surface inherited
the public identifier from `SimpleEntrySurface`. Other non-shell uses, including the privacy shield,
remain unchanged.

## Acceptance blocks

1. **A — desktop shell.** On each admitted authenticated shell surface, the same `BuildIdentifier` text
   from `routeFrame.tsx` appears in the static sidebar's bottom footer slot, after the existing navigation
   and Sign out in document/reading order. Remove it from `<main>` entirely. Keep the product name, Home,
   capability-derived groups, logout, single page-level `h1`, single `main`, skip link and heading-focus
   behavior unchanged. At constrained sidebar heights, allow the existing sidebar's vertical scrolling:
   neither Sign out nor the identifier may be clipped, and the identifier must not obscure focus.
2. **B — narrow shell.** Below `lg`, the existing top bar retains its Open navigation and Sign out controls;
   the off-canvas `Dialog` retains close, focus trap/restoration, and its authorized links. The identifier
   belongs at the bottom of that drawer's scrollable sidebar, not in page content or the top bar. A user
   can open the drawer and read it at 320 CSS px, all three text modes, 200%/400% zoom and long localized
   labels; closed drawer content is not exposed to the accessibility tree. Only one identifier is visible
   at a time (desktop sidebar versus open mobile drawer). The responsive breakpoint does not change.
3. **C — boundaries and diagnostics.** The existing public `SimpleEntrySurface` identifier remains
   readable without sign-in, including restricted/focused entry stages; the temporary checking page
   omits it by owner decision, while the privacy shield and other non-shell gates remain unchanged.
   Its existing `Build {buildId}` localization and
   content-free revision continue to identify the exact deployed build. No new network reads, routes,
   capability rules, content strings, footer links, logging or browser storage. Keep current landmark
   topology: the static sidebar remains under the existing banner/header, the mobile drawer remains
   a named dialog, and the identifier is noninteractive paragraph text (not a new `contentinfo`,
   navigation or page heading).

## Exact blueprint and implementation map

Binding: licensed Tailwind Plus `Application UI > Application Shells > Sidebar Layouts > Simple sidebar`,
`v4/react-light.jsx`, library version `2026-09-13-083323` (`tailwindplus/metadata.json`). The shell
already records this binding and MIA deltas at `src/app/ApplicationShell.tsx:144-153`. The source provides
both the mobile Dialog sidebar (`:48-140`, scrollable sidebar and flex-growing nav) and desktop fixed
sidebar (`:142-232`, scrollable sidebar, flex-growing nav and bottom profile row); there is no separate
footer component to import. Bind the footer placement to these **existing** sidebar flex containers,
not a fabricated second shell. Preserve the MIA Sign out replacement for the blueprint desktop profile
row, and the existing mobile top-bar Sign out. Add the `BuildIdentifier` after `ShellNavigation` in both
containers as a small noninteractive footer text slot; the nav's `flex-1` pushes the slot down when there
is room. Preserve long-revision wrapping, adequate contrast, bottom breathing room, scrolling and
visible text at zoom. Update the shell binding comment to record this delta. Do not copy or commit the
licensed JSX. A neutral grouping element, if needed for spacing, must not create a new landmark.

Current owners: `ApplicationShell.tsx:221-225` mobile drawer, `:233-238` desktop sidebar,
`:258-287` main with trailing build paragraph, `:338-411` shared navigation and desktop Sign out;
`src/app/routes/routeFrame.tsx:108-117` owns the one localized `BuildIdentifier` component;
`src/app/routes/SimpleEntrySurface.tsx:51` owns the unchanged public entry rendering. Both sidebar
DOM branches may contain a paragraph while CSS/closed Dialog ensure only the responsive one is
visible; tests should scope the locator to the visible sidebar rather than assume one matching DOM
node. No new infrastructure, dependency, state machine, API operation or i18n key is required.

## Explicit story file manifest

- `_bmad-output/implementation-artifacts/spec-7-3-move-the-build-identifier-into-the-sidebar-footer.md`:
  this spec and later scoped progress notes (worker-owned).
- `src/app/ApplicationShell.tsx`: relocate the existing component from main into both sidebar variants,
  retain narrow behavior and update the exact-blueprint delta comment (worker-owned).
- `src/app/routes/SimpleEntrySurface.tsx`: accept an explicit presentation option to omit the identifier
  on the temporary checking page only; default keeps existing public display (owner-authorized expansion).
- `src/app/routes/CheckingAccess.tsx`: opt out of the inherited identifier while the gate is pending
  (owner-authorized expansion).
- `src/app/App.test.tsx`: targeted integration assertions for admitted shell placement and unchanged
  anonymous/restricted placement/gating; extend the existing test home (worker-owned).
- `e2e/applicationShell.spec.ts`: desktop and drawer visible-placement, hidden/main exclusion, keyboard,
  zoom/text/reflow and authenticated-route regression at the shell owner (worker-owned).
- `_bmad-output/implementation-artifacts/sprint-status.yaml`: story phase and QA tracking (solver-owned;
  included for eventual solver-approved commit only, not modified during worker preparation).
- `_bmad-output/implementation-artifacts/execution/7-3-move-the-build-identifier-into-the-sidebar-footer.yaml`:
  phase checkpoint, if created by solver (solver-owned; not a worker implementation input or automatic
  commit file).

`src/app/routes/routeFrame.tsx`, `e2e/scaffold.spec.ts`, and
`e2e/coursePreparation.spec.ts` are **regression owners, not planned edits**. No new code files.
Report any demonstrated need to enlarge this manifest to the solver before editing it. The scoped
diff generated after implementation excludes unrelated user/solver changes.

## Focused regressions and affected verification

Unit/integration: in `src/app/App.test.tsx`, assert admitted Home has build text in both sidebar
containers (responsive DOM may duplicate hidden nodes), none in `main`, and no build identifier
on the neutral checking gate; verify anonymous login and restricted routes keep their existing
readable public identifier and no shell navigation. Preserve session/capability admission order.
Browser: extend `e2e/applicationShell.spec.ts` to assert desktop identifier after Sign out in the
sidebar (and not inside `main`), no duplicate visible text; at 320px the closed drawer does not
expose it and the open drawer does, after links without clipping at standard/large/extra-large;
check Escape/route-link focus restoration, skip-link and top-bar logout, long localized text,
200%/400% zoom and forced colors/axe on stable states. Exercise another admitted route (the
existing MFA destination) without altering heading or current link. `e2e/scaffold.spec.ts` covers
public anonymous identifier and restricted-stage isolation; `e2e/coursePreparation.spec.ts`
covers a representative scoped course route and the existing narrow/zoom behavior. No protected
fixture data or credential content in operational logs.

Final affected gate selection (explicit, nonzero browser suite):

```sh
./run-all-tests.sh --affected-e2e e2e/applicationShell.spec.ts e2e/scaffold.spec.ts e2e/coursePreparation.spec.ts --grep 'desktop shell|320px shell|320px top-bar|bypass link|shell build identifier|renders localized anonymous entry|dispatches MFA without requesting capabilities|dispatches password replacement|hub remains operable at real 400 percent zoom|preparation mobile departure'
```

New shell browser test names should contain `shell build identifier` so they are selected. Before
verification list selected Playwright tests and check the count is nonzero (including the new cases);
if the names change, update this explicit grep, not the acceptance scope. The gate runs all
non-browser stages, including typecheck, lint, Vitest, build, bundle budget, architecture,
duplication, i18n and hygiene; report any skipped stage as skipped. During implementation run
focused checks sequentially, not concurrently. Do not run the complete gate or commit in implement.
Moving the paragraph between presentational containers should not add JS/CSS dependencies or
logic clones; verify bundle size and zero-clone gate rather than claiming an exemption. No new
secret-hygiene journey is needed: the revision is public and no protected data is introduced.

## Exclusions, risks and decisions

Out of scope: course-state panels, route or title changes, role/scope/navigation policy, auth stage
or session transitions, API and BCG closure, build-id format and generated revision, new translation
copy, other non-shell entry redesign, breakpoint adjustment, new responsive navigation behavior, and
tracking/checkpoint writes owned by the solver. Main risk is confusing an off-canvas hidden
desktop/mobile duplicate with an actually visible duplicate; assert both responsive visibility
and DOM location. A short viewport or long translated revision could push the footer below the
scrollport; the scrollable sidebar must retain access without overlapping other controls.

Decisions settled by the story and existing shell: the sidebar means the fixed sidebar on desktop
and the existing off-canvas sidebar on narrow viewports; the mobile top bar stays as implemented,
so no new toggle or footer placement on the page. The anonymous public identifier stays as required
by FFR-208; the owner chose to hide it only during neutral checking. The inherited blueprint plus
established shell structure supplies the footer slot;
no open owner question or backend contract blocker for this presentation-only change.

## Preparation evidence and implementation progress

- Baseline clean: `git status --porcelain=v1 -uall` empty; HEAD above includes prior committed 7.2.
- Local tooling available: Node 26.12.0, npm 11.20.0, `node_modules` and Playwright 1.63.0;
  `chromium.executablePath()` resolves to an existing bundled Chromium binary; licensed blueprint
  and library metadata are present. No installation required.
- Runtime catalog: worker/reviewer `openai/gpt-6-sol#high` active; approved fallback
  `mistral/mistral-medium-2604#high` active. Catalog availability does not establish quota.
- No implementation performed in prepare. Next block: solver marks in progress and dispatches
  implement against this bounded manifest.
- Block A/B markup: `ApplicationShell` now places the existing localized paragraph after the
  flex-growing navigation in both scrollable blueprint sidebar containers, with bottom spacing
  and token wrapping. The main-content copy is removed. Existing top-bar Sign out, drawer
  closure and capability navigation are untouched. Remaining: assertions and focused checks.
- Block C clarification: informed the owner that checking inherited the public label from
  `SimpleEntrySurface` (contrary to the initial spec's absence claim). Owner chose to hide the
  label temporarily on `CheckingAccess` only. Manifest expanded to that wrapper and the shared
  presentational entry component before editing either. Privacy shield remains unchanged.
- Block C implemented: the entry layout keeps the public label by default; only the neutral
  checking wrapper opts out. Integration coverage now asserts checking suppression, admitted
  sidebar placement and unchanged anonymous/restricted placement. Browser coverage exercises
  short desktop scrollport and MFA route, narrow en-US/pt-BR across three text sizes, and
  200%/400% browser zoom. Remaining: focused checks and scoped review diff.
- Focused implementation checks passed sequentially: typecheck, lint/architecture, 144/144
  App integration tests, build, explicit browser selection 23/23 across three specs, duplication
  0 clones, all seven bundle budgets (largest pt-BR 221,269/260,000 gzip bytes), and targeted
  Prettier. No full local gate or review was run in implement; verify phase retains the final
  affected gate. The owner-approved checking exception expands only the two recorded files.
- Independent reviewer approved the actual scoped diff with zero findings. Verify phase inspected
  the current diff and listed the exact selection: 23 Chromium tests in three specs, nine new
  `shell build identifier` cases. One final affected-local gate (the command above) passed on the
  unchanged application/test/config/dependency input tree: SHA-256
  `4e1ec36dc950e5bc57fe4beef2b02a6a3af7c4db50fb03f8e3c4089870339793`
  (293 tracked or new nonignored files under `src`, `e2e`, `test`, `scripts`, plus root
  package/lockfile, run-all-tests, Vite/Vitest/Playwright/TS/ESLint config and index). Scoped
  baseline-to-working application/test diff SHA-256:
  `f86c9d0668971e941103de12318e86ddadabf0d897b7c146e07c22988acb7124`.
  All non-browser stages and selected browser 23/23 passed; no skips. Content-free per-stage
  log: `tmp/agent-execution/7-3/affected-gate.log`. Complete browser QA remains post-commit.
  This progress-note change is reporting-only; it does not alter verified inputs.
