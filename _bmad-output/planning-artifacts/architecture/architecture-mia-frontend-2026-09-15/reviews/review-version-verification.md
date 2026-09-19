# Review — Version and Reality-Check Verification

- **Lens:** Every committed decision must be web-researched or reality-checked, not asserted from training data:
  current versions, that each named technology exists and fits, and live behavior of anything the spine leans on.
- **Target:** `ARCHITECTURE-SPINE.md` (architecture-mia-frontend-2026-09-15)
- **Date:** 2026-09-15
- **Method:** Every Stack-table version checked against the live npm registry (`/latest` and `time` metadata). API-name
  claims checked against the actual published package contents (tarballs unpacked, `.d.ts`/readme/source inspected).
  The openapi-typescript claim checked empirically by running `openapi-typescript@7.13.0` against the real
  `mia/api-doc/openapi.yaml` (which declares `openapi: 3.2.0`).

## Verdict

The Stack table is genuinely verified — 21 of 22 pinned versions exactly match the registry `latest` at review time,
and the behavioral claims about React Router, TanStack Query, react-markdown, and zod all check out against the real
published packages. One asserted API does not exist (remark-gfm cannot disable autolink literals), and one dependency
(openapi-typescript) works against the 3.2 spec only through undocumented tolerance.

## Findings

### F1 — HIGH — AD-6 asserts a remark-gfm option that does not exist

AD-6 (line 111–112): "tables via `remark-gfm` with autolink literals disabled (`security-privacy.md` forbids
autolinking transcript text)".

Verified against the published `remark-gfm@4.0.1` tarball. Its complete option set is `firstLineBlank`,
`stringLength`, `singleTilde`, `tablePipeAlign`, `tableCellPadding` — there is **no option to disable autolink
literals**. The plugin is all-or-nothing over its five GFM extensions (autolink literals, footnotes, strikethrough,
tables, tasklists). This is not a version regression; no remark-gfm major has ever offered per-feature disabling.

Because the disabled-autolink behavior is a **security requirement** (transcript text must not be autolinked), the
gap is not cosmetic. The decision as written cannot be implemented. Real options:

- Compose a table-only remark plugin directly from `micromark-extension-gfm-table` +
  `mdast-util-gfm-table` (both exist on npm and are exactly what remark-gfm wires internally), skipping the
  autolink-literal extension entirely; or
- Keep remark-gfm and strip/downgrade the resulting `link` nodes in the AST before rendering — fragile, because
  autolink-literal links are not reliably distinguishable from author-written links in mdast.

The spine must name a mechanism that exists; the first option preserves AD-6's single-boundary intent.

### F2 — MEDIUM — openapi-typescript's OpenAPI 3.2 support is undocumented tolerance, not verified support

AD-2 commits to generating wire types from `mia/api-doc/openapi.yaml` with `openapi-typescript`. The spec's first line
is `openapi: 3.2.0`. The published `openapi-typescript@7.13.0` README states support for **OpenAPI 3.0 & 3.1 only**.

Reality check performed:

- Source inspection (`src/lib/redoc.ts:126–133`): the version gate accepts any `3 <= version < 4`, so a 3.2 document
  is not rejected.
- Empirical run: `npx openapi-typescript@7.13.0 mia/api-doc/openapi.yaml` completed cleanly and produced 6,693 lines
  including the full `paths` interface, 112 operation references, and the `text/event-stream` tutoring response.
- The spec currently uses no 3.2-only constructs (no `query` HTTP method, `additionalOperations`, `itemSchema`,
  `itemEncoding`, or `$self`), so nothing is being silently dropped today.

So the decision works, but it rests on the tool tolerating a spec version it does not claim to support. If the backend
ever adopts a 3.2-only construct (e.g. `itemSchema` for the SSE stream — plausible given
`schemas/resources/resources.yaml:1508` already uses `contentMediaType: text/event-stream`), openapi-typescript could
silently omit it, and AD-2's "operation absent from generated types is blocked work" rule only catches missing
operations, not missing fields. Record this limitation in AD-2 or Deferred, and keep the generation step in the full
check so regeneration failures/diffs surface immediately.

### F3 — MEDIUM — react-intl 11.0.1 was superseded by 12.0.0 the same day it was verified

Registry `time` metadata: `react-intl@11.0.1` published 2026-09-15T15:09Z, `react-intl@12.0.0` published
2026-09-15T17:56Z — and 12.0.0 is now `latest`. The spine's "verified current on npm 2026-09-15" claim was true at
verification time, but the pinned major was superseded within hours. AD-9's design (ICU messages, stable IDs,
`@formatjs/cli` extraction) is not version-sensitive, but the pin should be re-verified at implementation time and the
v12 breaking-change notes read before choosing 11 vs 12. `@formatjs/cli@6.16.29` remains `latest` and is decoupled
from the react-intl major.

### F4 — LOW — Inherited React 19.2 / Tailwind 4.2 minors now trail stable

Registry latest: `react@19.3.0`, `tailwindcss@4.3.3` (also `vite@8.3.0`, major consistent with "Vite 8"). The spine
inherits "React 19.2, Vite 8, Tailwind CSS 4.2" from `.agents/rules/techstack.md`, which declares major **and minor**
binding. The staleness therefore lives in the inherited rule, not in this spine's own selections — but anyone
implementing from the spine will pin minors that are no longer current stable. Surface to the techstack owner; the
spine itself should not silently diverge from its binding source.

### F5 — LOW — qrcode 1.5.4 is registry-latest but dormant

`qrcode@1.5.4` matches `latest`, but its publish date is 2024-08-05 — no release in over two years. For a small,
spec-stable QR encoder this is acceptable, but the spine's verification process (registry `latest` check) would not
distinguish "current" from "abandoned". Noting so the implementation-time pin is a conscious choice; alternatives
exist if maintenance ever matters (the package is used for the TOTP URI QR, a security-adjacent surface).

## Claims verified TRUE (evidence)

| Claim | Evidence |
| --- | --- |
| React Router v8 exists; declarative mode APIs available | `react-router@8.4.0` is registry latest; tarball `.d.ts` exports `BrowserRouter`, `Routes`, `Route`, `Link`, `NavLink`, `useNavigate`, `useParams`, etc. |
| Declarative mode has no (effective) prefetch | `usePrefetchBehavior` in `dist/.../ssr/components.js` returns `[false, ref, {}]` whenever `FrameworkContext` is absent — i.e. outside framework mode the `prefetch` prop is inert. Caveat: the prop still **exists in the types**, so AD-13's "no preloading" should get an ESLint fence banning `prefetch`/`PrefetchPageLinks` for defense in depth, consistent with the spine's "every fence is an ESLint rule" convention. |
| TanStack Query v5 option names | `@tanstack/query-core@5.102.8` build types contain `refetchOnWindowFocus`, `refetchOnReconnect`, and `retry?:` as query options. |
| react-markdown does not parse raw HTML by default | `react-markdown@10.1.0` readme: "react-markdown typically escapes HTML (or ignores it, with `skipHtml`)"; raw HTML requires explicitly adding `rehype-raw` — which AD-6 forbids. Consistent. |
| zod 4 | `zod@4.6.5` is registry latest; AD-2 makes no zod-3-only syntax claims. |
| Test stack compatibility | `vitest@5.0.1` peers allow `vite ^8` and `jsdom *`; `@testing-library/react@16.3.3` peers allow React 19; `@headlessui/react@2.2.10` peers allow React 19; `react-markdown` peers `react >=18`. |
| SSE endpoint really is SSE | Multi-file spec: `mia/api-doc/paths/tutoring.yaml:401` declares `text/event-stream`, so AD-8's native `EventSource` choice fits the contract. |

## Exact-match version table (registry `latest` at review time)

react-router 8.4.0 ✓ · @tanstack/react-query 5.102.8 ✓ · zod 4.6.5 ✓ · openapi-typescript 7.13.0 ✓ ·
react-markdown 10.1.0 ✓ · remark-gfm 4.0.1 ✓ · remark-math 6.0.0 ✓ · rehype-katex 7.0.1 ✓ · katex 0.18.7 ✓ ·
clsx 2.1.1 ✓ · tailwind-merge 3.7.0 ✓ · qrcode 1.5.4 ✓ · prettier-plugin-tailwindcss 0.8.1 ✓ ·
react-intl 11.0.1 ✗ (latest now 12.0.0, see F3) · @formatjs/cli 6.16.29 ✓ · @headlessui/react 2.2.10 ✓ ·
@heroicons/react 2.2.0 ✓ · vitest 5.0.1 ✓ · @testing-library/react 16.3.3 ✓ · @testing-library/user-event 14.6.7 ✓ ·
jsdom 30.0.1 ✓ · msw 2.15.0 ✓

## Summary

The spine's version diligence is real, not performative: 21/22 exact registry matches and every checked API-name claim
except one holds against the actual published packages. The one failure (F1) matters because it is load-bearing for a
security rule — AD-6 should be corrected to name an implementable mechanism before implementation begins. F2 should be
recorded as a known limitation with a regeneration gate; F3–F5 are pin-time hygiene.
