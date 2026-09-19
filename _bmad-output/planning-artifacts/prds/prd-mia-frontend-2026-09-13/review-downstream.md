# Downstream-Implementability Review — MIA Frontend PRD Foundation

Reviewed: `_bmad-output/planning-artifacts/ux-designs/ux-mia-frontend-2026-09-12/FRONTEND-PRD-FOUNDATION.md` (538 lines)
Date: 2026-09-13
Scope: downstream implementability only. Companion documents were opened to verify that a pointer resolves and that
ownership is unambiguous, not to audit their quality.

## Verdict

`bmad-architecture` can proceed: the stack is pinned (line 411), the integration model is decided (OpenAPI-owned
transport, SSE tutoring, no SSR), and the two genuinely open architecture questions are correctly stated as open.
`bmad-create-epics-and-stories` cannot proceed to a feature epic. The document contains **zero requirement
identifiers** — the "Functional Requirement Families" section is 97 lines of uncited prose — so no acceptance criterion
written downstream can name the requirement it satisfies, and the traceability the document promises has no anchor on
this side. Compounding it, the entire authentication spine is blocked by an open `BCG-001`, which sits under the first
story of any sensible epic ordering. A P0 infrastructure epic is cuttable today; a value epic is not.

## Extractability test

Five sections were tested by asking whether a subagent could load only that section and emit an actionable,
self-contained extract.

| # | Section | Lines | Result |
| --- | --- | --- | --- |
| 1 | Localization | 360–377 | **Pass** |
| 2 | Error Response Bodies | 260–272 | **Pass (one gap)** |
| 3 | Functional Requirement Families → Material and Files | 166–174 | **Fail** |
| 4 | Security, Privacy, and Safety | 285–358 | **Fail** |
| 5 | Desktop and Platform Scope | 399–428 | **Partial** |

**1. Localization — pass.** The best-constructed section in the document. Seven catalogs are enumerated, negotiation
order is stated, and fallback is specified per language family rather than left to inference: "`pt-BR` remains
Brazilian; other Portuguese variants use `pt-PT`. `es-AR` remains Argentinian; other Spanish variants use `es-ES`"
(lines 364–366). The localize/do-not-localize boundary is explicit (lines 368–369). Its single external pointer,
"Exact transitions are in `FRONTEND-STATE-MACHINES.md`" (line 377), resolves to `FRONTEND-STATE-MACHINES.md` §21
"Atomic Locale and Time-Zone Update". An engineer could build the i18n module from this extract alone.

**2. Error Response Bodies — pass with one gap.** Behaviorally complete and unusually testable: collapsed by default,
"selectable, and never live-announced" (line 264), escaped inert text for malformed bodies, pre-wrap without altering
copied text, copy-with-warning, and an explicit exclusion list (lines 267–268). It even pre-empts the obvious
engineering "improvement": "must not be silently replaced with a validated-field subset" (lines 270–271). The gap is
the release gate itself — "The backend error-body safety blocker in `BACKEND-CONTRACT-GAPS.md`" (line 272) — which is
`BCG-007`, never named. The extract tells you the feature is gated but not what closes the gate.

**3. Material and Files — fail.** Eight lines naming capabilities with no identifier, no field list, no state
enumeration, and no bounds, because bounds are delegated: "OpenAPI supplies exact limits and formats" (line 174). It
is a table of contents. To write one story a subagent must additionally load `FRONTEND-STATE-MACHINES.md` §10 and §11,
`SURFACE-STATE-MATRIX.md`, `ROUTE-INVENTORY.md` § Course Material, `ACCESSIBILITY-ACCEPTANCE.md` AC-014, and the
OpenAPI file. The section carries no information that survives extraction. This generalizes to the whole "Functional
Requirement Families" block (lines 123–219) — the section a story-cutting workflow will reach for first.

**4. Security, Privacy, and Safety — fail on extractability, not on content.** Seventy-four lines under a single H2
with no subheadings, mixing sixteen one-line invariants (lines 287–301) with dense paragraphs covering ten unrelated
subsystems: shared-device clearing, the cross-tab security epoch, logout quiescence, the idle warning, the deadline
shield, logout failure, TOTP route-locality, mobile verification, protected downloads, and `BCG-014` scope. A subagent
asked for "the protected-download rules" must read all 74 lines and guess where the topic starts and stops; the rules
happen to be lines 345–353, but nothing marks that. This is also where the document's one dangling referent hides
(finding 3). The content is strong; the packaging defeats extraction.

**5. Desktop and Platform Scope — partial.** The reflow contract extracts cleanly and is directly testable: "320
effective CSS pixels and at 1280 CSS pixels with 400% zoom, in Standard, Large, and Extra large text modes" (lines
402–403), with explicit failure conditions (lines 404–405). The stack line extracts cleanly and matches
`.agents/rules/techstack.md` exactly. Against that, the section fuses four concerns — platform scope, tech stack,
browser support, and E2E tooling — under one heading, and embeds the unowned Tailwind Plus gate (finding 5).

## Story-cuttability test

I attempted the first three stories of a Priority 0 epic, using the document's own Priority 0 list (lines 465–467) as
the ordering.

**Story 1 — "Anonymous bootstrap: cold load reaches a neutral access-checking state and acquires CSRF."**
Sourceable: the neutral-state requirement (lines 230–234), the non-refreshing check rule, "Explicit Refresh and Try now
use only BCG-001 non-refreshing checks" (line 241), `FRONTEND-STATE-MACHINES.md` §1, `ROUTE-INVENTORY.md` § Public
Entry. **Not cuttable to done.** `BCG-001` is open and states "The complete authentication journey is blocked"
(`BACKEND-CONTRACT-GAPS.md:37`), with the concrete cause that "The root OpenAPI path map starts with login and proceeds
directly through auth mutations; it has no `/api/v1/auth/session` path" (`BACKEND-CONTRACT-GAPS.md:63-64`). There is no
route around this: it is the application entry point. Nothing invented — the block is clean and well-documented.

**Story 2 — "Login form supports password managers, paste, autocomplete purposes, and accessible reveal."**
Sourceable: lines 132–135, `ACCESSIBILITY-ACCEPTANCE.md` § "Input Purpose and Accessible Authentication (AC-010)",
`CP-01`, `ROUTE-INVENTORY.md` § Restricted Login. AC-010 supplies real, gradeable acceptance criteria — this is the
companion set working as intended. **Invented if attempted:** the field set, all error copy, and the submit-state
machine, because the stage transition depends on `BCG-001`. Cuttable only as an unwired presentational component,
which defers every interesting risk.

**Story 3 — "Locale negotiation, selector, and catalog loading."**
Sourceable end to end: § Localization (lines 362–377) for the seven catalogs and fallback rules,
`FRONTEND-STATE-MACHINES.md` §21 for atomic-update transitions, `ACCESSIBILITY-ACCEPTANCE.md` AC-016 for
language/direction acceptance, line 370 for the verification bar. **Depends on no open `BCG`. Nothing invented.**
This is the one genuinely cuttable story of the three.

Result: one of the first three stories is implementable to done, and it is infrastructure. The two that deliver user
value are blocked at the transport layer. That is a defensible state for a greenfield repo waiting on a backend
contract — but it must be said out loud in the PRD, and currently the Priority 0 list (line 465) buries it as the
phrase "Accepted backend-gap closure" with no indication that it gates everything after it.

## Findings

- **[critical]** No requirement identifiers exist anywhere in this document (§ Functional Requirement Families, lines
  123–219) — The section downstream story-cutting depends on most is 97 lines of unnumbered prose. `rg -o '\b[A-Z]{2,4}-[0-9]{1,3}\b'`
  over the whole file returns seven hits total: `BCG-014` ×3, `BCG-015`, `BCG-016`, `BCG-017`, `BCG-001`, `AS-1`,
  `AS-32` — every one of them a pointer into another document. There is no `FR-*`, `NFR-*`, or equivalent frontend
  namespace here or in any companion. The `FR-1`..`FR-84` in `REQUIREMENT-FLOW-MATRIX.md` are explicitly *backend* IDs:
  "The source PRD provides no separate names for FR, NFR, or AS entries, so their stable identifiers are used verbatim"
  (`REQUIREMENT-FLOW-MATRIX.md:21-22`). Consequence: a story's acceptance criteria can cite a backend FR, an `AC-*`, a
  `CP-*`, or a `BCG-*`, but can never cite a *frontend requirement*, because none has a name. The document's own
  traceability promise — "`REQUIREMENT-FLOW-MATRIX.md` is the release traceability source and must leave no source
  requirement unmapped" (line 484) — is one-directional: source requirements map inward, but nothing maps back out to
  the frontend behavior this document specifies. *Fix:* assign a stable `FFR-*` (frontend functional requirement)
  namespace across lines 123–219, one ID per discrete testable obligation, and add a column to
  `REQUIREMENT-FLOW-MATRIX.md` binding each `FFR-*` to its source `FR-*`/`NFR-*`/`AS-*`.

- **[critical]** Ownership is asserted for concerns the named owner does not contain (§ Tutoring Transport, lines
  256–258) — The sentence "`FRONTEND-STATE-MACHINES.md` owns connection epochs, event ordering, announcement
  deduplication, reading-position preservation, request-ID and immutable-payload lifecycles, queue concurrency, finish
  races, upload ambiguity, provider states, speech, summaries, forms, dialogs, navigation, locale, time-zone, and
  stale-resource transitions" lists seventeen concerns. Two do not resolve. **Reading-position preservation:**
  `FRONTEND-STATE-MACHINES.md` has no section on it; a case-insensitive search for "reading" returns one incidental hit
  ("reading anchor", `FRONTEND-STATE-MACHINES.md:135`). The normative owner is `ACCESSIBILITY-ACCEPTANCE.md` §
  "Streaming and Stable Reading (AC-013)", lines 538–689, which is explicit: "Appending streamed content MUST NOT move
  DOM focus, reset the screen-reader reading position, or replace stable earlier" (`ACCESSIBILITY-ACCEPTANCE.md:643`).
  **Dialogs:** `FRONTEND-STATE-MACHINES.md` has no dialog section either — only incidental table cells — while
  `ACCESSIBILITY-ACCEPTANCE.md` § "Dialogs and Idle Warning (AC-007)" (lines 295–348) owns it normatively. Worse, this
  document contradicts itself 60 lines apart: line 195 correctly says of stable-reading behavior "Detailed behavior
  belongs to the accessibility contract," then line 256 reassigns it. An engineer who follows line 256 opens
  `FRONTEND-STATE-MACHINES.md`, finds nothing, and invents. *Fix:* remove `reading-position preservation` and `dialogs`
  from the line-256 list and point both at `ACCESSIBILITY-ACCEPTANCE.md` AC-013 and AC-007. Audit the remaining fifteen
  the same way.

- **[high]** Dangling referent: "the ledger" (§ Security, Privacy, and Safety, line 315) — "The ledger's logout
  request-quiescence blocker must close before release." The noun *ledger* appears exactly once in this document and is
  never defined; this document never calls `BACKEND-CONTRACT-GAPS.md` "the ledger". The pointer is resolvable only by
  reading a third file: "`BCG-001` owns logout rotation, request quiescence, the atomic anti-resurrection guarantee"
  (`SECURITY-PRIVACY-ACCEPTANCE.md:298`). Note also that no `BCG` entry is *titled* for logout quiescence — the
  seventeen titles make `BCG-001` "Anonymous CSRF and authentication-session discovery" — so a reader scanning blocker
  titles will conclude the pointer is broken. *Fix:* replace with "`BCG-001` covers logout request quiescence".

- **[high]** Blockers cited by prose description instead of ID (§ Error Response Bodies line 272; § Security line 328;
  § Backend and OpenAPI Dependencies line 510) — Line 272: "The backend error-body safety blocker in
  `BACKEND-CONTRACT-GAPS.md` is a release prerequisite"; line 510 repeats "including the backend error-body safety
  blocker". Both mean `BCG-007: Bounded and safe complete error-body disclosure`, never named. Line 328:
  "`BACKEND-CONTRACT-GAPS.md` owns the deadline contract" names no ID at all. The document proves it knows the
  convention — "Explicit Refresh and Try now use only BCG-001 non-refreshing checks" (line 241) — and then applies it
  to only 5 of 17 blockers. Every un-IDed citation costs a downstream reader a full-text search across a 72 KB file.
  *Fix:* replace every descriptive blocker reference with its `BCG-NNN`.

- **[high]** The Tailwind Plus binding gate has no owner, no artifact, and no definition of done (§ Desktop and
  Platform Scope, lines 415–417) — "The licensed Tailwind Plus inventory is not yet bound. Before implementation, the
  frontend team selects and records one exact available blueprint and variant for every inherited canonical component
  and verifies paired behavior. This is a pre-implementation gate." Records *where*? Verified *how*? And "every
  inherited canonical component" is an undefined set — this document contains no component list. `DESIGN.md` confirms
  the gate is real and unresolved, repeating "exact selection is a pre-implementation gate" across ten-plus frontmatter
  entries (`DESIGN.md:16-42`), but it binds nothing either. Since Priority 0 (line 465) lists "exact Tailwind Plus
  blueprint binding" as a release-foundation item, **every UI story in the project is gated on a task with no
  acceptance criteria.** *Fix:* name the output artifact, name the owner, and enumerate the canonical component set
  (or state that `DESIGN.md` § Components is that set) so the gate can be written as a story.

- **[high]** No success metrics anywhere in the document (§ Prioritized Experience Outcomes, lines 111–121) — The six
  "outcomes" are unmeasurable prose with no IDs: "A student can start, conduct, recover, and finish a second tutoring
  session without human interface guidance" (line 115). No threshold, no instrument, no baseline. There is no metrics
  or KPI section in the document at all. This interacts badly with line 301, "Release one has no analytics, telemetry,
  session replay, third-party error SDK, remote font, or remote script" — the measurement channel is forbidden by the
  same document, so these can only ever be assessed by manual observation, which is nowhere scheduled. Architecture is
  unaffected; epic prioritization and "is this done?" are directly affected. *Fix:* either give each outcome an ID plus
  a manual-evaluation protocol and pass bar, or restate them as design principles and say plainly that release one
  ships no quantitative success metric.

- **[high]** The document contradicts its own authority (frontmatter line 3, § Purpose lines 17–19, vs `AGENTS.md`) —
  Self-description: `status: draft`, and "This draft is a handoff companion for a future frontend PRD... It is not a
  final PRD and does not authorize behavior absent from its sources." The repository instructions say the opposite:
  planning artifacts in this folder "are the frontend's binding contracts", listing "`FRONTEND-PRD-FOUNDATION.md` —
  frontend requirements, scope, and exclusions". So is this the binding PRD, or an input to a PRD that does not exist?
  `bmad-architecture` needs the answer to know whether it may treat line 411's stack as decided, and
  `bmad-create-epics-and-stories` needs it to know whether it is cutting stories or first writing the PRD. The
  existence of this review's own output directory, `prds/prd-mia-frontend-2026-09-13/`, implies a PRD is about to be
  written — which would make this document an input, contradicting `AGENTS.md`. *Fix:* resolve explicitly. Either
  promote to `status: approved` and drop lines 17–19, or keep it a draft and correct the `AGENTS.md` description.

- **[medium]** "The four named journeys" are never named here (§ Test and Verification Model, line 436) — "Playwright's
  bundled Chromium on developer macOS covers the four named journeys and critical auth and recovery paths." The
  document that sets Playwright's scope does not say which four. They resolve to `KF-1`..`KF-4` in
  `REQUIREMENT-FLOW-MATRIX.md:30-33` and to `EXPERIENCE.md` § Key Flows (line 551) — but note the near-miss: the same
  matrix also defines six `UJ-*` user journeys (`REQUIREMENT-FLOW-MATRIX.md:113-118`) and eleven `SF-*` supporting
  flows, so "four" is ambiguous on first read between three candidate sets. *Fix:* write "the four key flows `KF-1`
  through `KF-4`".

- **[medium]** Positional numbering used where stable IDs are needed (§ Acceptance-Scenario Foundation, lines 486–502;
  § Prioritized Experience Outcomes, lines 113–121; § Open Questions, lines 537–538) — Sixteen UX acceptance scenarios
  are numbered 1–16 with no prefix. They are the closest thing this document has to frontend-owned acceptance criteria,
  and they are addressable only by ordinal, so inserting one renumbers every reference. Confirmed unreferenced:
  `REQUIREMENT-FLOW-MATRIX.md` maps the backend `AS-1`..`AS-32` and does not map these sixteen at all, despite line
  484 designating it the release traceability source. *Fix:* prefix them (`UXS-01`..`UXS-16`) and add them to the
  matrix, or state that they are illustrative and not traceable.

- **[medium]** The master ownership sentence is many-to-many and omits two concerns (§ Purpose, lines 25–29) — Seven
  documents are named, then five concerns: "They own detailed traceability, per-surface states, client route identity,
  observable transitions, and release evidence." Seven-to-five with no pairing, so the sentence establishes that
  ownership exists somewhere without saying where. Security and accessibility — two of the highest-stakes concerns,
  each with a dedicated companion — are not among the five listed concerns. Ownership is recoverable by reading each
  companion's own Purpose section, which is exactly the re-derivation this review exists to prevent. *Fix:* replace
  with a seven-row table, one document per row, one owned concern set per row.

- **[medium]** No glossary, and the document uses undefined coined terms (whole document) — There is no glossary here
  or in any companion; the nearest thing is `REQUIREMENT-FLOW-MATRIX.md` § "Coverage Vocabulary" (line 26), which
  defines flow IDs, not domain nouns. Terms coined and used without definition include "privacy shield" (3 uses, first
  at line 236), "security epoch" (line 309), "stable-reading mode" (line 194), "static starters" (line 190),
  "existence-hiding" (line 212), and "readiness" (5 uses) which must be distinguished from "approval" — a distinction
  the document itself flags as load-bearing: "Technical material readiness and educational approval never appear as one
  state" (line 491). Separately, "brief" (a material artifact, lines 168 and 492) and "briefing" (a mentoring packet,
  lines 104 and 206) denote unrelated things one morpheme apart, and neither is defined. The role vocabulary is stable
  and correct throughout — that part is fine, and `AGENTS.md` carries it. *Fix:* add a glossary covering the coined
  UI-state nouns and the readiness/approval and brief/briefing pairs.

- **[medium]** Both route and per-surface state contracts are addressable only by heading (§ Home and Unified
  Navigation line 152; § Backend Truth) — Line 152 makes `ROUTE-INVENTORY.md` "binding for canonical client paths,
  opaque parameters, route parents, localized titles, h1 purpose, protected-mount capability and scope gates, and
  terminal or safe fallback behavior" — but `ROUTE-INVENTORY.md` defines no route IDs (its only ID-shaped tokens are
  three `BCG-*` references), and `SURFACE-STATE-MATRIX.md` defines no surface IDs (it borrows `BCG`/`CP`/`XC`/`SF`/`KF`
  exclusively). Stories must therefore cite "`ROUTE-INVENTORY.md` § Tutoring Workspace", which breaks silently if a
  heading is reworded. *Fix:* out of scope for this document to fix, but it should require an ID scheme from both when
  it declares them binding.

- **[medium]** Priority 0 depends on two unresolved library decisions (§ Open Questions lines 537–538 vs § Release
  Priorities line 467) — "Which safe Markdown, sanitizer, and local math libraries satisfy the accepted semantics,
  security tests, and CSP?" is open, while "safe Markdown" is listed in Priority 0 and UX scenario 11 (line 497) makes
  it release-blocking: "Raw or partial tutor Markdown cannot execute HTML, scripts, forms, media, remote images, or
  model-defined controls." Posing these as architecture questions is correct. The risk is elsewhere: `AGENTS.md`
  already refers to "the locked sanitizer" as an existing thing, so the two documents disagree about whether this is
  decided. *Fix:* none needed in this document beyond confirming the `AGENTS.md` phrasing is aspirational.

- **[low]** Blocked-scope indeterminacy is confined and well-handled, with one exception (§ Mentoring, lines 210–213) —
  Worth recording as a positive: the mentoring blockers are scoped precisely enough to route around. "`BCG-017` blocks
  target resolution and grant availability until a bounded, existence-hiding, non-enumerable minimal contract exists.
  `BCG-014` separately binds the reviewed target state to dispatch. Neither blocker disables existing mentoring or
  account work" (lines 212–213) names the blocker, the blocked slice, and the explicitly *un*blocked remainder. Lines
  355–358 do the same for `BCG-014`'s seven-mutation scope. The exception is `BCG-001` (see the story-cuttability
  test), whose blast radius — the entire authentication spine, and transitively every protected surface — is never
  characterized in this document at all. *Fix:* state in § Release Priorities that `BCG-001` gates all protected
  surfaces, so epic sequencing accounts for it.

- **[low]** Line-wrap artifact mid-sentence (§ Material and Files, lines 170–172) — "Provide picker and drag-and-drop
  and per-file / progress, / mixed-format prevention, recoverable drafts" — line 171 contains only the word
  "progress,". Cosmetic, but it is in the section a story-cutting subagent reads first. *Fix:* rewrap.

### Counts by severity

| Severity | Count |
| --- | --- |
| Critical | 2 |
| High | 5 |
| Medium | 6 |
| Low | 2 |
| **Total** | **15** |

## Unresolved cross-references

Every *named* companion-document reference resolves. `BCG-001` (line 241), `BCG-014` (lines 208, 213, 355), `BCG-015`
(line 342), `BCG-016` (line 208), and `BCG-017` (line 212) all resolve to real entries — the blocker ledger is complete
and contiguous at `BCG-001`..`BCG-017`, matching its own "Release Blockers (17)" heading. `AS-1` through `AS-32` (line
483) resolve to `REQUIREMENT-FLOW-MATRIX.md` § Acceptance Scenarios. `AC-*` and `CP-*` (line 394) resolve to
`ACCESSIBILITY-ACCEPTANCE.md`, contiguous at `AC-001`..`AC-019` and `CP-01`..`CP-14`. All nine companion filenames
exist on disk.

The unresolved pointers are the unnamed and the misdirected ones:

1. **Line 315** — "The ledger's logout request-quiescence blocker". Referent *the ledger* undefined in this document;
   target is `BCG-001` per `SECURITY-PRIVACY-ACCEPTANCE.md:298`, and no blocker carries a matching title.
2. **Line 272** — "The backend error-body safety blocker in `BACKEND-CONTRACT-GAPS.md`". Unnamed; is `BCG-007`.
3. **Line 510** — "including the backend error-body safety blocker". Same, unnamed; is `BCG-007`.
4. **Line 328** — "`BACKEND-CONTRACT-GAPS.md` owns the deadline contract". No ID given.
5. **Line 256** — "`FRONTEND-STATE-MACHINES.md` owns ... reading-position preservation". **Misdirected.** Target
   document has no such content; owner is `ACCESSIBILITY-ACCEPTANCE.md` AC-013 (lines 538–689).
6. **Line 257** — "`FRONTEND-STATE-MACHINES.md` owns ... dialogs". **Misdirected.** Owner is
   `ACCESSIBILITY-ACCEPTANCE.md` AC-007 (lines 295–348).
7. **Line 436** — "the four named journeys". Unnamed; are `KF-1`..`KF-4`.
8. **Line 76** — "`EXPERIENCE.md` Information Architecture" resolves (`EXPERIENCE.md:52`), but is cited as the
   authoritative surface list for release-one scope while carrying no surface IDs; the inclusion scope is therefore
   defined by a section that cannot be cited item-by-item.
