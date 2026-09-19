---
title: 'Project scaffold with enforced architecture'
type: 'chore'
created: '2026-09-19'
status: 'done'
baseline_revision: 'ab6bb34153efe69e2547a039690da90110a712c2'
baseline_commit: 'ab6bb34153efe69e2547a039690da90110a712c2'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - AGENTS.md
  - _bmad-output/planning-artifacts/architecture/architecture-mia-frontend-2026-09-15/ARCHITECTURE-SPINE.md
warnings:
  - oversized
deferred: []
---

<intent-contract>

## Intent

**Problem:** The repository has no application toolchain or source tree, so later frontend stories cannot rely on the
architecture boundaries, security defaults, or required quality gates.

**Approach:** Create the smallest buildable React SPA and test substrate matching the architecture structural seed,
then make dependency pins, tier ownership, CSP, browser-storage ownership, live-region ownership, unsafe rendering,
bundle size, and routine checks mechanically enforceable.

## Boundaries & Constraints

**Always:** Use the exact stack versions required by the architecture spine, strict TypeScript flags, Vite 8, Tailwind
CSS 4.3 CSS-first configuration, Vitest/jsdom, Testing Library, MSW, and bundled-Chromium Playwright. Keep the source
tiers `app -> features -> platform`, root `test/`, memory-only application state, same-origin-only production policy,
and a public content-free build identifier. Bind the one rendered scaffold component to an exact Tailwind Plus v4 React
light blueprint and record its library version.

**Never:** Implement authentication, protected routing, API transport, product state machines, a service worker,
telemetry, remote assets, dark mode, guessed backend behavior, route prefetch, browser persistence outside
`platform/prefs`, `aria-live` outside `platform/announcer`, or `dangerouslySetInnerHTML`. Do not commit the licensed
Tailwind Plus source.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
| --- | --- | --- | --- |
| Clean installation | Fresh checkout and supported Node LTS | `npm ci` installs exact pins and every npm gate executes | Dependency or engine mismatch fails the command |
| Production shell | Built root document | MIA scaffold and content-free exact build ID render under locked meta CSP | Invalid build-ID input fails configuration |
| Architecture violation | Forbidden import, storage, live-region, or HTML sink | ESLint rejects the violating source | No warning-only or suppression fallback |
| Oversized entry | Initial route JavaScript exceeds 250 kB compressed | Full check fails FFR-955 | Report measured bytes and limit |

</intent-contract>

## Code Map

- `package.json` / `package-lock.json` -- exact dependency pins and complete npm command surface.
- `tsconfig*.json`, `vite.config.ts`, `vitest.config.ts`, `playwright.config.ts` -- strict compiler and isolated build,
  unit, and bundled-Chromium E2E configuration.
- `eslint.config.js` -- mechanical AD-1/AD-5/AD-6 ownership fences plus storage, announcement, and HTML-sink rules.
- `index.html`, `src/main.tsx`, `src/app/App.tsx`, `src/app/app.css` -- minimal production mount, AD-15 CSP,
  Tailwind entry, and public build identifier; no feature behavior.
- `src/app/routes/`, `src/features/`, `src/platform/{api,data,session,transfer,markdown,i18n,time,ui,prefs,announcer}/`
  -- architecture structural seed, retained with ownership notes until feature stories add implementations.
- `test/`, `src/**/*.test.tsx`, `e2e/` -- Vitest/Testing Library/MSW substrate and observable scaffold smoke coverage.
- `scripts/check-architecture.mjs`, `scripts/check-bundle-size.mjs` -- checks not safely expressed as source lint:
  required directories/configuration, exact pins, locked CSP, and FFR-955 compressed entry budget.
- `run-all-tests.sh` -- authoritative gate; must invoke all npm checks and architecture/bundle assertions without
  skipped npm components. Existing Trivy skip behavior remains environment-dependent.
- `_bmad-output/implementation-artifacts/sprint-status.yaml` -- supervisor bookkeeping; preserve and never stage/revert.

## Tasks & Acceptance

**Execution:**
- [x] `package.json`, lockfile, and tool configs -- scaffold exact-pinned React/Vite/Tailwind/test dependencies and strict
  scripts so clean installs are reproducible.
- [x] `eslint.config.js` and `scripts/check-architecture.mjs` -- enforce one-way tiers and every architecture-owned import,
  storage, announcement, and unsafe-rendering fence named by AD-1, AD-5, AD-6, and spine conventions.
- [x] `index.html` and `src/` -- add the smallest accessible, light-only, blueprint-bound public scaffold with locked meta
  CSP and build identifier, while reserving every structural-seed owner directory.
- [x] `test/`, colocated unit test, and `e2e/` -- prove the scaffold mounts and the public identifier is readable without
  adding a product flow.
- [x] `scripts/check-bundle-size.mjs` and `run-all-tests.sh` -- enforce the 250 kB compressed initial-route JavaScript budget
  and ensure the authoritative full gate includes architecture checks.
- [x] `README.md` -- document reproducible setup and checks without duplicating product contracts.

**Acceptance Criteria:**
- Given a clean checkout on a supported Node LTS, when `npm ci && ./run-all-tests.sh` runs, then typecheck, lint,
  formatting, unit tests, production build, and bundled-Chromium E2E all execute successfully with no npm component
  reported skipped.
- Given source in any tier, when it violates the app-to-features-to-platform direction, imports TanStack Query outside
  `platform/data`, accesses browser storage outside `platform/prefs`, creates live regions outside
  `platform/announcer`, or uses `dangerouslySetInnerHTML`, then lint or the architecture check fails.
- Given the production `index.html`, when its security and public diagnostics are inspected, then the AD-15 meta CSP is
  present and the unauthenticated build identifier contains only version/revision data, never account, route, resource,
  or environment data.
- Given a production bundle above 250 kB compressed for initial-route JavaScript, when the full gate runs, then the
  FFR-955 assertion fails with the measured size.
- Given the repository tree, when structural ownership is inspected, then `app/`, `features/`, every named `platform/`
  owner, and root `test/` exist without feature behavior or unresolved backend assumptions.

## Spec Change Log

## Review Triage Log

### 2026-09-19 — Review pass

- verdicts: 8 findings — high 0, medium 7, low 1, false 0, maybe-false 0
- findings:
  - `[medium]` `[patch]` Build metadata accepted non-canonical revisions and had no invalid-input coverage — added a
    validated build-identifier owner, required the full lowercase Git revision, and covered valid and invalid input.
  - `[medium]` `[patch]` Native live-region roles could bypass announcement ownership — added ESLint and architecture
    fences for `alert`, `log`, and `status` roles with negative tests.
  - `[medium]` `[patch]` Dynamic and subpath TanStack Query imports could bypass data-layer ownership — expanded both
    enforcement paths and added a negative test.
  - `[medium]` `[patch]` Architecture version checks covered only part of the binding stack — expanded the required
    version map to every package selected by the architecture spine.
  - `[medium]` `[patch]` The bundle-limit negative test failed while arranging its fixture, before exercising the
    checker — created the manifest directory and verified an imported oversized chunk fails FFR-955.
  - `[medium]` `[patch]` Revision validation prevented the documented development and preview commands from loading
    Vite configuration — supplied the canonical revision in all Vite npm entry points.
  - `[low]` `[patch]` The lockfile's root engine declaration was stale — regenerated package-lock metadata from the
    final package manifest.
  - `[medium]` `[patch]` Tier-direction enforcement lacked a direct negative test — added coverage proving a platform
    import from app is rejected.

### 2026-09-19 — Follow-up review pass

- verdicts: 0 findings — high 0, medium 0, low 0, false 0, maybe-false 0
- findings: none; the patched enforcement and its negative-test coverage were re-inspected and the authoritative gate
  passed.

## Design Notes

The rendered placeholder is deliberately public and content-free. It establishes styling/build integration and the
build-ID diagnostic only; Story 1.2 owns localized anonymous entry and Story 1.3 owns router/session wiring. Empty owner
directories use short `README.md` files because Git cannot retain empty directories; these are architecture fences, not
placeholder behavior.

## Verification

**Commands:**
- `npm ci` -- expected: exact lockfile installation succeeds on Node 22, 24, or 26.
- `npm run typecheck` -- expected: strict TypeScript passes.
- `npm run lint` -- expected: ESLint and architecture assertions pass with zero warnings.
- `npm test` -- expected: Vitest unit/component suite passes once without watch mode.
- `npm run build` -- expected: Vite production output and build metadata are generated.
- `npm run test:e2e` -- expected: bundled Chromium renders the public scaffold and readable build identifier.
- `./run-all-tests.sh` -- expected: authoritative gate passes; any unavailable non-npm external scanner is explicitly
  reported as skipped.

## Auto Run Result

### Summary

Created the smallest buildable React SPA and test substrate required for later stories. The scaffold now mechanically
enforces exact stack pins, source-tier direction, platform ownership boundaries, the locked CSP, canonical public build
metadata, and the compressed initial-route JavaScript budget.

### Files changed

- `package.json` and `package-lock.json` — exact dependencies, supported engines, and complete npm command surface.
- `tsconfig*.json`, `vite.config.ts`, `vitest.config.ts`, `playwright.config.ts` — strict build and test configuration.
- `eslint.config.js` — tier, data, storage, announcement, and unsafe-rendering ownership fences.
- `index.html` and `src/` — locked CSP, Tailwind entry, public blueprint-bound scaffold, and architecture owner seed.
- `test/`, `e2e/`, and `scripts/*.test.ts` — MSW substrate plus scaffold and enforcement coverage.
- `scripts/build-identifier.ts`, `scripts/check-architecture.mjs`, and `scripts/check-bundle-size.mjs` — canonical build
  metadata and structural/bundle gates.
- `run-all-tests.sh`, `.prettierignore`, and `README.md` — authoritative gate integration and developer instructions.

### Review findings

The initial review patched seven medium findings and one low finding. They covered canonical build metadata, live-region
role ownership, TanStack Query import variants, complete stack pin enforcement, the broken oversized-bundle fixture,
development/preview revision injection, stale lock metadata, and direct tier-direction test coverage. No item was
deferred or rejected. The follow-up review found no residual issue.

### Follow-up review recommendation

False after the follow-up pass. Initial patched counts were high 0, medium 7, low 1; follow-up patched counts were all
zero.

### Verification performed

- `npm ci` passed with 621 packages installed and zero vulnerabilities.
- `npm run typecheck` passed.
- `npm run lint` passed with architecture checks.
- `npm test` passed with 12 tests after two fixture/enforcement defects discovered by earlier runs were corrected.
- `npm run build` passed without warnings; the production entry was 68,502 bytes gzip.
- `npm run test:e2e` passed in bundled Chromium after preview revision injection was corrected.
- `./run-all-tests.sh` passed every component, including formatting, bundle size, E2E, duplication, npm audit, Trivy,
  Tailwind Plus catalog validation, and Markdown linting, with no skipped component.

### Residual risks

None identified for this scaffold story. Later stories still own product routes, localization, session behavior, and
backend transport.
