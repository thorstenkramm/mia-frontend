# Techstack of the MIA frontend

The stack is fixed by `FRONTEND-PRD-FOUNDATION.md` and the architecture spine
(`_bmad-output/planning-artifacts/architecture/architecture-mia-frontend-2026-09-15/ARCHITECTURE-SPINE.md`). Do not
substitute a framework, router, build tool, or test runner without an explicit product decision.

| Concern      | Choice                                                  |
| ------------ | ------------------------------------------------------- |
| Language     | TypeScript, strict                                      |
| UI           | React 19.3, client-rendered SPA                         |
| Build        | Vite 8                                                  |
| Styling      | Tailwind CSS 4.3 with licensed Tailwind Plus components |
| E2E tests    | Playwright, bundled Chromium                            |
| Package tool | npm                                                     |
| Runtime      | Node.js on a current LTS line (22, 24, or 26)           |
| VCS          | git and GitHub                                          |

Pin compatible stable patch versions at implementation time. The major and minor versions above are binding.

## Deliberately excluded

- No SSR, React Server Components, Next.js server, or any second application backend. The Go backend serves the built
  static assets with SPA fallback outside `/api`.
- No Cypress, no Electron, and no required Playwright Firefox or WebKit project.
- No dark mode, offline mode, or service worker for authenticated content.
- No analytics, telemetry, session replay, third-party error reporting, remote fonts, or remote scripts.
- No CSS-in-JS runtime, no styled-components, no CSS modules as a primary styling mechanism. Tailwind owns styling.

Adding a dependency that reaches the browser at runtime is a product decision, not an implementation detail. Prefer the
platform and the existing stack over a new package.

## Required runtime dependencies

Tailwind Plus React components import from `@headlessui/react` and `@heroicons/react`. Both are ordinary npm packages
and are not part of the Tailwind Plus download.

## npm

- Commit `package-lock.json`. Never delete it to resolve a conflict; regenerate it deliberately.
- Install with `npm ci` for any reproducible run. Use `npm install` only when intentionally changing dependencies.
- Pin exact versions in `package.json`. Do not use `^` or `~` ranges for runtime dependencies.
- Never run `npm install --force` or `--legacy-peer-deps` to silence a peer conflict. Resolve the conflict.
- Record why a dependency was added when its purpose is not obvious from its name.
- Keep `devDependencies` and `dependencies` honest. Anything that ships to the browser belongs in `dependencies`.

## Supported browsers

Release one supports current stable Chrome and Edge, and current stable Safari on macOS. Firefox is unsupported and is
not proactively blocked.

Automated E2E runs use only Playwright's bundled Chromium on developer macOS. Chrome, Edge, and Safari coverage is
Product Owner manual evidence. Safari evidence is mandatory for release. See `.agents/rules/testing.md`.

## Platforms

Developer instructions target macOS and Linux. The production artifact is a static asset bundle served by the backend.
Containerized frontend deployment is not planned.
