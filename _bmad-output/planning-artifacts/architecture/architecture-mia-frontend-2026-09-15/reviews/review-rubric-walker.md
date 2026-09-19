# Rubric-walker review — ARCHITECTURE-SPINE.md (architecture-mia-frontend-2026-09-15)

Reviewed: `ARCHITECTURE-SPINE.md` (302 lines, status draft) against the seven-point good-spine checklist.
Reviewer scope note honored: behavioral contracts deliberately live in the planning artifacts and `.agents/rules/`;
only missing or weak **architecture** calls are flagged.

## Verdict

Strong spine, ready to build from after small fixes. The divergence surface for independently built features is
essentially closed: every heavyweight cross-cutting concern (server cache, API client, routing, gating, untrusted
content, session, streaming, i18n, time, transfer, errors, splitting, CSP, tests) has exactly one named owner with an
enforceable fence. Findings are gap-closing, not structural.

## Checklist walk

### 1. Fixes the real divergence points for the level below; misses none

Largely yes. The AD set maps cleanly onto the open questions recorded in the run memlog (all 13 question entries are
resolved by an AD or convention), and the reconcile pass demonstrably added the second-order divergence points
(transfer boundary, route-change sequencer, forms, fragment token, text size, print). Cross-checked against the PRD:
its Open Questions section contains exactly the two items (client generation, Markdown/math stack) the spine claims to
resolve via AD-2 and AD-6.

Two residual divergence points found:

- **Announcer has no AD and no fence.** `platform/announcer` appears only in the Structural Seed ("single announcement
  arbitration owner"). `accessibility.md:80` defines the arbitration *behavior* (one mounted owner, priority order),
  but the spine's own convention — "Every 'only inside X' rule in this spine is enforced by an ESLint rule" — has no
  "only inside `platform/announcer`" rule to attach to, because no AD or convention row states one. Every comparable
  single-owner boundary (data, api, session, markdown, time, transfer) got an AD; this one got a folder name. Nothing
  stops a feature from mounting its own `aria-live` region, which is precisely the multi-owner drift the
  accessibility rule exists to prevent. Fix: one line in AD-4's sequencer rule or a small AD/convention row —
  "announcements are emitted only through `platform/announcer`'s exported API; `aria-live`/`role="status|alert"`
  attributes appear only inside that module; ESLint-enforced."
- **Error-boundary component ownership is silent.** `react.md:68` mandates an error boundary around each route tree and
  around independently failing regions, and AD-12 fixes the error *union*, but no AD or convention says where the
  boundary *components* live (gate-engine/route layer for the route-tree boundary; a shared platform/app component
  for region boundaries vs. per-feature copies). Independent feature agents will each build one. AD-5's
  promotion-at-second-use softens this, but the route-tree boundary in particular belongs to the same layer that owns
  the checking shell and sequencer (AD-4) and should be named there.

### 2. Every AD's Rule is enforceable and prevents its stated divergence

Yes, with consistent quality. Each rule names a mechanism, not an intention: ESLint `no-restricted-imports` (AD-1),
ESLint import boundaries (AD-5), compile-checked `satisfies` against generated wire types (AD-2), `initiator:
'user' | 'background'` as a required client-core parameter (AD-7 — this structurally prevents keepalive drift rather
than asking for discipline), catalog-completeness failure in the full check (AD-9), secret-marker scan (AD-11),
bundle-size assertion (AD-13). The conventions table's closing row ("every 'only inside X' rule … enforced by an
ESLint rule") turns the fences into checks. Two soft spots, neither disqualifying:

- AD-6's "`dangerouslySetInnerHTML` appears nowhere in the codebase" and AD-16's meta-CSP content are asserted but no
  enforcement point is named (an ESLint ban for the former is trivial and presumably intended under the blanket
  fence row; worth one word — low).
- AD-8's promotion trigger ("if a second stream ever enters the OpenAPI contract") is a human judgment, but AD-5
  already owns the general promotion rule, so this is acceptable restatement.

### 3. Nothing under Deferred could let two units diverge

Confirmed. Each deferred item is either single-owner already (CSP text → one meta tag; zod organization and key
factory → inside one platform module; `manualChunks` → one Vite config), explicitly blocked with ownership fixed
(BCG-001 shapes → AD-7), intentionally code-owned *inside* a tier fence (feature-internal folders), owned by another
authoritative document (Tailwind Plus blueprint → DESIGN.md; budget numbers → PRD), or a tooling selection with the
enforcement point already decided (performance harness). No deferred item is a cross-feature contract.

### 4. Named tech plausibly verified-current, versions pinned-format

Yes. All 20 entries carry exact `major.minor.patch` versions, the header states "verified current on npm 2026-09-15,"
and the memlog contains per-decision verification entries (including `openapi-typescript 7.13.0` verified generating
cleanly against the real 6693-line OpenAPI 3.2.0 spec — verification by *use*, not just lookup). Inherited stack rows
match `techstack.md` exactly (React 19.2, Vite 8, Tailwind 4.2, Playwright, npm, Node LTS). "Pin exact patch at
implementation time" matches techstack.md's pinning rule. `qrcode 1.5.4` carries recorded PO approval as a runtime
dep, satisfying techstack.md's product-decision requirement.

### 5. Covers the sources' capabilities

Spot-checked, not re-audited (reconcile pass already ran; memlog records its 10 applied fixes). Frontmatter lists the
sources. The Capability → Architecture Map covers the PRD's surface areas (auth stages, tutoring stream, courses/
materials/uploads, mentoring/admin, profile/locale, shell, session expiry, errors). AD-1's secret-carve-out, AD-6's
autolink ban, AD-11's redaction-by-construction, and AD-15's ≥1 Hz XHR upload progress each trace to a specific rule
or FFR (`FFR-956`), which is evidence the reconcile pass genuinely walked the sources. One capability gap found in the
spot-check:

- **Device-local preference persistence is undecided.** `EXPERIENCE.md:319` explicitly *permits* persisting the
  device-local locale and text-size mode ("not account content"). The spine assigns application of text size to the
  `app` shell and locale to `platform/i18n`, but says nothing about whether/where these persist across reloads
  (localStorage vs. cookie vs. none). Under the security rules' blanket storage bans, an implementing agent cannot
  tell if persistence is allowed here, and two agents could answer differently. One convention row decides it (low).

### 6. Every owned dimension decided, deferred, or open

The operational/environmental envelope is present, minimal, and appropriate for the altitude: deployment (static
bundle served by Go backend, no server/container/service worker), dev workflow (Vite dev server, `/api` proxy),
environments/config (same-origin implied by the proxy statement and api-client rule; no runtime config surface exists,
which is itself a decision), build identifier readable without auth. Cross-cutting concerns all have owners: auth/
session (AD-4/AD-7), errors (AD-12 + finding 2 above), logging (release one ships no telemetry per PRD exclusions;
security-privacy.md owns the never-log list — nothing left for the spine), i18n (AD-9), a11y sequencing (AD-4),
security (AD-6/AD-16 + rules). No whole dimension is silent. The announcer and error-boundary items above are gaps
*inside* otherwise-owned dimensions, not silent dimensions.

### 7. Diagrams valid; dependency-direction rule present

The single mermaid `graph TD` block is syntactically valid (checked node/edge syntax, `<br/>` and `&lt;` escapes are
legal in labels). The dependency-direction rule is present twice and consistently: as arrows in the diagram and as
AD-5's normative text (`app → features → platform; never backward`), with the lazy-route-import exception explicitly
carved out.

## Findings

| # | Severity | Finding |
| --- | --- | --- |
| 1 | medium | `platform/announcer` is a named single-owner boundary with no AD, no rule text, and no fence — the only boundary in the seed a feature can bypass (own `aria-live` region) without tripping any stated ESLint rule. |
| 2 | medium | Error-boundary component ownership (route-tree boundary per `react.md:68`, shared region-boundary component) is neither decided nor deferred; AD-12 covers the union only, so independent agents will each invent boundary placement/presentation. |
| 3 | low | AD numbering gap: the sequence jumps AD-13 → AD-15 with no tombstone; a reader or downstream agent cannot tell whether AD-14 was deleted, renumbered, or lost. |
| 4 | low | Device-local preference persistence (text size, locale — explicitly permitted by `EXPERIENCE.md:319`) has no decided mechanism or owner statement; under the blanket storage bans, implementers can diverge or wrongly conclude persistence is forbidden. |
| 5 | low | AD-6's `dangerouslySetInnerHTML`-nowhere assertion and the meta-CSP presence (AD-16) name no enforcement point, unlike every other fence; one clause tying them to the ESLint ban / full check closes it. |

No critical or high findings. The spine's core job — preventing independently built features from diverging — is done.
