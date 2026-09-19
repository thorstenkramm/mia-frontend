# Validation Report — MIA Frontend PRD Foundation

- **PRD:** `_bmad-output/planning-artifacts/ux-designs/ux-mia-frontend-2026-09-12/FRONTEND-PRD-FOUNDATION.md`
- **Rubric:** `.agents/skills/bmad-prd/assets/prd-validation-checklist.md`
- **Run at:** 2026-09-13T16:41:01Z
- **Grade:** Poor
- **Intent:** Validate only. No file under review was modified.
- **Scope:** the foundation document alone. Its seven companion contracts were opened only to verify that a pointer
  resolves and that ownership is unambiguous, not audited for quality.

## Overall verdict

This document is unusually honest about what it excludes and unusually rigorous about security, session lifecycle,
localization, and accessibility bounds — those sections are genuinely buildable, and all seven delegated companion
contracts resolve. It fails as a PRD spine on three load-bearing axes: it carries no requirement identifiers, no
success metrics, and no performance requirements, so neither "done for this requirement" nor "successful at release"
can be answered from it. The core defect is an inversion: the implementation policy it delegates elsewhere is dense and
precise, while the product commitments only a PRD can own — measurable outcomes, a cut line, bounds on the surfaces the
thesis bets on — are the thinnest content in the file.

The three extra reviewers materially widen the picture rather than confirming it. The **adversarial** reviewer found
that both flagship outcomes are not merely unmeasured but structurally unobservable — telemetry is excluded (L301) and
the only instrument is one developer's Playwright run on macOS (L436) — and surfaced two product-level silences the
rubric does not reach: safeguarding for minors is a disclaimer (L299) composed with supervisors blinded to active chat
(L184), and guardian consent, age verification, and data export are excluded in a single unreasoned bullet (L85) while
four EU locales ship at launch (L362). It also found a genuine internal contradiction: the raw-error-body mandate
(L262) cannot be satisfied without breaching the document's own L289/L293/L296 rules, and L272 forbids the frontend
from mitigating. The **source-fidelity** reviewer confirmed every declared source and cross-reference resolves and that
the document does not invent transport — its defects there are omission, chiefly that SSE establishment resets the
*server* idle timer while the idle model here is built purely on user-initiated requests. The **downstream** reviewer
confirmed `bmad-architecture` can proceed but `bmad-create-epics-and-stories` cannot cut a value epic.

**On the grade.** No dimension is *broken*; four of seven are strong or adequate. The *Poor* grade is produced
mechanically by the presence of critical findings, and should be read as "critical gaps block use as a PRD spine", not
as "low-quality document".

## Dimension verdicts

- Decision-readiness — adequate
- Substance over theater — strong
- Strategic coherence — thin
- Done-ness clarity — adequate
- Scope honesty — strong
- Downstream usability — thin
- Shape fit — adequate

## Findings by severity

Counts are after de-duplication across the four reviewers. Raw totals were 79 findings (21 rubric, 32 adversarial,
11 source-fidelity, 15 downstream).

### Critical (9)

**[Strategic coherence · Adversarial · Downstream]** — No Success Metrics, and both flagship outcomes are structurally
unobservable (§ absent entirely; cf. L50–54, L57, L88, L113–115, L301, L432–456)
The PRD bets on a behavioral outcome — "a student can complete a second tutoring session independently" — while
excluding analytics, telemetry, and session replay, and never states the alternative evidence path. There is no success
rate, sample, task-completion criterion, time bound, definition of "second session", pilot, or post-release signal. The
only instrument named anywhere is Playwright's bundled Chromium on developer macOS. If both flagship outcomes failed in
every school that installs MIA, no mechanism in this document would reveal it.
Fix: add a Success Metrics section stating how each Prioritized Experience Outcome is evidenced without telemetry —
moderated usability gate with named population, task, assisted/unassisted criterion, and pass threshold; or one
privacy-preserving, operator-visible, locally-stored signal — or record an explicit Product Owner decision that release
one ships unmeasured, with a named owner accountable for discovering failure.

**[Done-ness clarity · Adversarial]** — No performance requirements anywhere (§ 399–428; § 430–459)
Despite "weak connections" (L61) and an SSE-streaming core, there is no latency, render, bundle, or throughput bound in
538 lines, and the verification model has no performance test category alongside accessibility, localization, security,
and resilience. A self-hosted product also states no deployment envelope it was designed against.
Fix: add a performance section with product-specific bounds — authenticated shell first render on a throttled
school-network profile, streamed-token render latency, transcript render cost at a stated turn count — the observable
states for exceeding them, and the matching automated test category.

**[Downstream usability · Downstream]** — No requirement identifiers (§ Functional Requirement Families, 123–219;
document-wide)
Nine prose subsections with no `FR-*` or equivalent. A whole-file scan returns seven ID tokens, every one a pointer
into another document. `REQUIREMENT-FLOW-MATRIX.md` maps *backend* `FR-1`..`FR-84` (`REQUIREMENT-FLOW-MATRIX.md:21-22`),
so frontend requirement identity does not exist in this folder at all. Nothing here can be referenced, versioned,
diffed, or marked done, and the traceability promise at line 484 is one-directional.
Fix: assign a stable frontend namespace across 123–219, one ID per discrete testable obligation, and bind each to its
source requirement in the matrix; or state explicitly that this document is narrative only.

**[Adversarial]** — The raw-error-body mandate contradicts three of the document's own security rules
(§ Error Response Bodies L262–272 vs § Security L288–296)
L262 requires "the exact HTTP status and complete raw backend response body". L289 forbids exposing provider payloads
and unnecessary personal data; L293 forbids forbidden fields entering DOM, memory, or the accessibility tree; L296
forbids revealing whether an out-of-scope resource exists. A backend body embedding a provider payload, another
student's name, or a distinguishing not-found detail satisfies L262 and violates all three. L268 regulates only what the
frontend *adds*, and L272 closes the last door: "failure never authorizes frontend redaction".
Fix: state the precedence explicitly — until the error-body blocker lands, the disclosure renders a contract-bounded
safe body and verbatim mode is dark. If verbatim-always is genuinely accepted, record the acceptance, its
data-protection rationale, and its approver next to L270.

**[Adversarial]** — Safeguarding for minors is a disclaimer, not a design, and the only adults present are blinded
(§ Security L299–300; § Students and Oversight L184; § Users and Context L69–70)
"MIA is not an emergency service, sends no safeguarding alert, and never implies human monitoring" composed with
"Active chat content remains hidden from supervisors until completion" and "MIA treats a student as working alone"
means: a minor discloses self-harm or abuse to an AI tutor, in a product sold to schools, and by design no adult can
see it while it is happening and the system will not tell anyone. That may be the correct release-one call, but the
document does not acknowledge the question exists, names no risk acceptor, specifies no student-facing
expectation-setting copy, and offers no "here is who to talk to" affordance.
Fix: add an explicit safeguarding posture section: what the student is told and when, what static help affordance
exists, what the supervisor is told about their blindness to active chats, and the named person who accepted the
no-alert decision.

**[Adversarial]** — No data-protection posture for minors' data across four EU launch locales
(§ Exclusions L85; § Localization L362; § Users and Context L61–62)
L85 excludes guardian account, age verification, guardian consent, and data export in one unreasoned bullet; L62 states
no age differentiation; L362 launches `de-DE`, `fr-FR`, `pt-PT`, `es-ES`. GDPR Art. 8 and Arts. 15/20 are not features
you scope out of a frontend with a dash — the excluded items are the named legal instruments. No privacy-notice
surface, terms surface, retention statement, consent record, DPIA reference, or student-visible "what MIA stores about
me".
Fix: add a data-protection section stating which obligations the operator owns, which the product owns, which frontend
surfaces exist in release one, and who accepted the exclusions.

**[Adversarial]** — Priority 0 is hostage to another repository with no authority, escalation, date, or descope plan
(§ Release Priorities L463–467; § Backend and OpenAPI Dependencies L507–525)
P0 is gated by seventeen named blockers. L281 asserts `BACKEND-CONTRACT-GAPS.md` "is the authoritative inventory and
release gate", but a frontend planning artifact cannot bind a separate team's roadmap, and the document names no
backend counterpart, agreed date, negotiated priority order, escalation route, or what ships if a blocker is declined.
Fix: add a dependency section with, per blocker, the backend owner, the target date, the frontend slices it holds, and
the explicit descope decision if it slips past a stated cutoff.

**[Source-fidelity]** — SSE establishment resets the server idle timer, and the idle-warning model never says so
(frontend 250–254, 318–322; `mia/docs/product-requirements.md:530-532`, `mia/docs/api.md:122`)
Backend, verbatim: "Each successful authenticated HTTP request, including establishment of an SSE connection, resets
the inactivity timer." Frontend: the tab's baseline is "its own last successful user-initiated authenticated request".
The client model is internally sound but never states the consequence: opening or reopening the stream extends the
**server** deadline while the client baseline does not move, so the local warning can fire against a deadline the
server already pushed out — and a long-lived stream plus one explicit *Try now* is a keepalive the backend honors.
`BACKEND-CONTRACT-GAPS.md:70-72` already records this fact, so the foundation under-claims what its own ledger holds,
on the invariant `AGENTS.md` states most emphatically.
Fix: state in § Tutoring Transport that SSE establishment refreshes the server-side idle deadline today, that the client
baseline is deliberately more conservative, and that reconciling the two is part of the `BCG-001` deadline contract.

**[Downstream]** — Ownership is asserted for concerns the named owner does not contain (§ Tutoring Transport, 256–258)
Line 256 lists seventeen concerns owned by `FRONTEND-STATE-MACHINES.md`. Two do not resolve: reading-position
preservation (owner is `ACCESSIBILITY-ACCEPTANCE.md` AC-013, lines 538–689) and dialogs (owner is AC-007, lines
295–348). The document contradicts itself 60 lines apart — line 195 assigns stable-reading behavior to the
accessibility contract, line 256 reassigns it. An engineer who follows line 256 finds nothing and invents.
Fix: remove both from the line-256 list and point them at AC-013 and AC-007. Audit the remaining fifteen the same way.

### High (26)

- **[Decision-readiness · Adversarial]** No cut line, no de-scope lever, and everything is release-blocking
  (§ Release Priorities 461–479; L135, L381, L395, L404, L421, L272, L316). P0/P1/P2 are declared then neutralized by
  line 479. When every constraint is a veto and no arbiter is named, the real cut list gets improvised under deadline
  pressure. *Fix:* name the release-decision owner; state which gates are non-negotiable versus severity-triaged with a
  documented waiver process.
- **[Decision-readiness]** Release-gating blockers carry no contingency decision (212–214, 270–272, 315–316). Gates are
  stated without fallbacks. *Fix:* per blocker, state the decision if it does not close by the date, and the owner.
- **[Strategic coherence]** Prioritized Experience Outcomes have no pass/fail definition (113–121). The document's
  stated top two priorities cannot be adjudicated, and the unfalsifiability propagates into every derived story.
- **[Done-ness clarity · Adversarial]** Refinement tiering is unfalsifiable (80–81, 121). "Highest UX refinement" versus
  "merely functional" is the main scope-shaping device and the *only* quality bar for the entire mentoring and
  administration surface, so any implementation passes. *Fix:* define each tier by observable obligations.
- **[Done-ness clarity]** The Home surface carries no testable consequence (150–151), for a surface every user sees on
  every login.
- **[Downstream usability · Downstream]** Acceptance-scenario numbering collides with backend `AS-*` and uses positional
  ordinals (483–502; also 113–121). Inserting one renumbers every reference, and the matrix does not map them at all
  despite line 484 designating it the traceability source.
- **[Downstream usability · Downstream]** No Glossary for load-bearing invented terms — "privacy shield", "security
  epoch", "revalidation needed", "restricted stage", "stable-reading mode", "static starters", "existence-hiding", plus
  the readiness/approval and brief/briefing pairs. A misread of "privacy shield" as a visual overlay rather than a
  content-free pre-paint barrier produces a security defect.
- **[Shape fit]** Shape inversion between policy and product (221–283 and 285–358 versus 111–121 and 461–479). Roughly a
  third of the document specifies mechanics it delegates elsewhere anyway; the product commitments with no other owner
  occupy about twenty lines.
- **[Shape fit · Adversarial]** No precedence rule between this document and the seven contracts it delegates to
  (22–29, 33–42). The document forbids duplicating delegated contracts and then duplicates them at length, creating two
  sources of truth that can drift. The master ownership sentence is seven-to-five with no pairing and omits security and
  accessibility.
- **[Source-fidelity]** Login throttling is confirmed backend behavior and appears nowhere (frontend 125–146, 83–92;
  `product-requirements.md:1609-1617`, `paths/auth.yaml:26-28`). Five username failures, 30 per IP, 1/2/4-second delays,
  `429` with `Retry-After`. Absent from the requirement family, from § Excluded, and from the scenarios, so a reader
  cannot tell whether it was scoped out or overlooked. *Fix:* add throttled/blocked states; surface a wait derived only
  from `Retry-After`, never a client-computed countdown.
- **[Source-fidelity]** Four confirmed tutoring-session lifecycle rules are absent (frontend 186–200;
  `product-requirements.md:1107-1113`, `1186`): no inactivity expiry; students cannot abandon or discard; only the owner
  can finish; finish is rejected while generating or queued. Nothing prevents a designer adding *Discard session*,
  supervisor *Force complete*, or a Finish button enabled mid-stream. `AGENTS.md` names all four as invariants.
- **[Adversarial]** The document disclaims authorship while authoring (L19 vs L41, L199–200, L251, L324). Its source for
  novel decisions is a log of the decisions made while writing it — a closed loop with a contract's force and a draft's
  deniability.
- **[Adversarial]** The verification model runs on one laptop with no CI and one person's eyes (L424–425, L450,
  L419–422). Safari is supported with one human as its only regression protection, at no stated cadence against no
  enumerated checklist, while a Playwright WebKit project is excluded.
- **[Adversarial]** The stated user context defeats the stated transport rule (L61 vs L251–252). On "weak connections",
  the no-automatic-reconnect rule turns every blip into a manual task for a child mid-explanation, while the flagship
  outcome is that the same child completes a session unaided. The cost is never acknowledged or traded off.
- **[Adversarial]** SSE is mandated while the network it says it runs on is assumed away (L249, L86). No deployment
  assumption, no diagnostic for a buffering proxy, no fallback transport, offline excluded.
- **[Adversarial]** The provisioning flow is described as impossible (L180). If temporary credentials are "never
  returned", the supervisor never learns them and cannot communicate them anywhere. This sits inside a flagship
  supervisor journey.
- **[Adversarial]** "Second session unaided" presupposes a guided first session the document forbids representing
  (L115 vs L69–70). No first-run experience, onboarding, empty-state tutorial, or supervisor-facing introduction is in
  scope. Session one is undefined and unowned.
- **[Adversarial]** The inline manual is the highest-priority feature and has no author, quality bar, or translation
  plan (L113, L161, L370). Verification checks completeness and *fit* only; a catalogue can be complete, fitted, and
  incomprehensible in German.
- **[Adversarial]** Model-output safety is verified by an unspecified manual skim of a stochastic system, for minors
  (L456). No sampling protocol, corpus, adversarial prompt set, pass threshold, reviewer qualification, locale coverage,
  or re-run trigger on provider or model change.
- **[Adversarial]** Nothing can be diagnosed in the field (L301 and absent). No version display, diagnostics page,
  report-a-problem affordance, operator-readable client error log, or support handoff.
- **[Adversarial · Downstream]** The Tailwind Plus binding gate has no failure branch, owner, artifact, or definition of
  done (L415–417). Thirty canonical components, zero verified availability, inheritance mandatory, imitation markup
  forbidden — and Priority 0 depends on it, so every UI story is gated on a task with no acceptance criteria.
- **[Adversarial · Downstream]** "The four named journeys" is a dangling referent that defines the entire E2E scope
  (L436). They are `KF-1`..`KF-4`, but the same matrix defines six `UJ-*` and eleven `SF-*` flows, so "four" is
  ambiguous across three candidate sets. "Critical auth and recovery paths" is undefined.
- **[Adversarial]** No schedule, effort, sequencing, or resourcing for an enormous surface (absent throughout). 128
  surfaces, 31 state machines, seven locales, three text modes, release-blocking WCAG on every surface, manual AT and
  per-browser evidence, seventeen external blockers — and no date, phase boundary, or team-size assumption.
- **[Downstream]** Dangling referent "the ledger" (315). Used once, never defined, resolvable only via a third file, and
  no `BCG` entry carries a matching title.
- **[Downstream]** Blockers cited by prose description instead of ID (272, 328, 510). The error-body blocker is
  `BCG-007`, never named; the convention is proven at line 241 and applied to only 5 of 17 blockers.
- **[Downstream · Adversarial]** The document contradicts its own authority (frontmatter 3, 17–19, vs `AGENTS.md`).
  `status: draft` and "not a final PRD" against `AGENTS.md` listing it as a binding contract owning frontend
  requirements, scope, and exclusions. Architecture and story creation both need this resolved before they can act.

### Medium (18)

- Seven launch locales committed with no cost acknowledged (§ Localization 362), the only major commitment presented
  without a trade-off, against the largest verification multiplier in the document.
- Open Questions are tooling-only (537–538); real product tensions in the body never surface there.
- Adjective-bound preparation requirements (162–163) sit beside genuinely testable siblings in the same sentence.
- No `[ASSUMPTION]` tags and no Assumptions Index (document-wide). Frontend-authored choices — locale variant fallbacks,
  the five static starters, the five-minute threshold, the 1/2/4-second reconnect schedule — read as equally confirmed.
- Undefined protagonists Pablo, Elena, Rosa, Diego (486–494) appear only in the scenario list.
- The master ownership sentence is many-to-many and omits security and accessibility (25–29).
- § Security asserts a Continue-working response shape (319–321) no named source establishes; the OpenAPI path map has
  no `/api/v1/auth/session` operation and `AuthSession` carries only `stage` and `mfa_challenge_id`. The one passage
  that fails the document's own line-19 claim.
- CSRF shape never surfaced (241, 331, 465, 511). It is required on *unauthenticated* endpoints, and `__Host-mia_csrf`
  is deliberately script-readable — an unstated exception to the document's own "never expose cookies" rule at 288–289.
- JSON:API 1.1 and the 65,536-byte safe-registry-field error bound are never named (260–272), in the one section that
  most depends on them.
- Vocabulary: "sign-in expiry" appears zero times; line 92's bare "session-expiry" is genuinely ambiguous given that
  tutoring sessions have no inactivity timeout.
- The 1/2/4-second reconnect schedule (250) is presented as transport contract but is unsourced, and collides
  numerically with the sourced login-throttle delays that are missing.
- The idle warning contradicts its own no-prediction claim, and the "no countdown" exclusion is cosmetic (L92 vs
  L320–324).
- Two different answers for a missing backend contract (L242 shielded runtime degradation vs L278–279 build-blocking).
- Multi-role self-scope collision unaddressed (L66, L96–98 vs L184): may a user hold learner and oversight capability
  over the same course?
- Content language unresolved across UI locale, course language, and tutor output (L362–369, L158, L190). A `pt-BR`
  student in an `es-ES` course is undefined.
- "Firefox is unsupported but not proactively blocked" (L422) defines no experience for a browser common in managed
  school fleets.
- Positional numbering where stable IDs are needed, and the sixteen UX scenarios are unmapped in the traceability
  source.
- Both `ROUTE-INVENTORY.md` and `SURFACE-STATE-MATRIX.md` are declared binding while defining no route or surface IDs,
  so stories must cite headings that break silently when reworded.

### Low (9)

- The central thesis is asserted but never motivated — why the *second* session? (51–52, 115).
- The Capability Model table is decorative relative to its real owner (100–106).
- Priority and scope are conflated in one sentence (479).
- Prioritized Experience Outcomes are uncitable (113–121).
- Speech requires a supervisor-set voice the student cannot set; "optional-provider absence" (246) is not the only gate.
- The frontmatter `sources:` list omits the OpenAPI files it ranks third in its own authority order.
- The noun "AI tutor" is never established; every use is adjectival.
- Acceptance scenarios derive from the source the document itself ranks lower (L36 vs L483).
- Line-wrap artifact mid-sentence at 170–172, in the section a story-cutting subagent reads first.

## Mechanical notes

- **Cross-references are in good shape.** All seven companion contracts exist in the same folder; `BCG-001`, `BCG-014`,
  `BCG-015`, `BCG-016`, `BCG-017` resolve; `AC-001`..`AC-019` and `CP-01`..`CP-14` are contiguous; backend `AS-1`..
  `AS-32` resolves; every frontmatter source path resolves through the `mia` symlink. The only unresolved pointers are
  the unnamed ones and the two misdirected ownership claims at 256–257.
- **Vocabulary.** Roles (administrator, supervisor, mentor, student, operator) are used correctly and consistently, with
  no "admin" abbreviation. The forbidden phrase "tutoring-session expiry" does not appear. The mandated phrase "sign-in
  expiry" also does not appear.
- **Identifier formatting is inconsistent.** `BCG-*` is code-formatted at 208, 213, 216 but bare at 241, 341–342, 355.
- **No Assumptions Index to round-trip,** because there are no inline assumption tags.
- **Required-section audit against launch stakes.** Present and substantive: Purpose, scope and exclusions, users,
  requirements, dependencies, deferred backlog. Missing: Success Metrics, Glossary, requirement identifiers, any
  performance section, an Assumptions Index, a delivery/sequencing section, and a data-protection section.

## Orientation notes (memlog and original inputs)

Gathered separately from the reviewers, against `.memlog.md`, `imports/frontend-brainstorming-1.md`,
`reconcile-frontend-brainstorming-1.md`, and `.working/`.

- **Logged decisions absent from the document but in its scope:** the speed/friction asymmetry for routine user
  administration (`memlog:13`); the combined administrator-supervisor continue-from-creation affordance (`memlog:23`);
  the prototype-validation obligation for the minimum viewport (`memlog:26`), which was dropped rather than closed and
  is not in Open Questions.
- **Legitimately delegated** to `EXPERIENCE.md` or the companions: recovery-code presentation, AI transparency,
  navigation interception, degraded active-course state. The document points at none of them explicitly.
- **Qualitative intent the requirement structure dropped:** "formal but warm, not colloquial, simple language for
  students"; "all errors are allowed, errors are good for learning"; "never left alone"; "never feel controlled, never
  feel overwhelmed". The document contains zero matches for `warm`, `tone`, `voice`, `mistake`, or `forgiv`. Voice is
  owned by `EXPERIENCE.md` § Voice and Tone, but the delegation paragraph routes voice nowhere explicitly.
- **Statements with no traceable origin** in memlog, imports, or working files: the no-saved-or-unsaved-claim doctrine
  (repeated four times), stable-reading mode, the `pagehide` privacy shield, the cross-tab security epoch and logout
  quiescence, the 1/2/4-second reconnect delays, the five-minute warning threshold, the manual browser-evidence schema,
  the mentor-role-grant-by-exact-ID flow, and the mobile verification throttling states.
- **Stale artifact:** `reconcile-frontend-brainstorming-1.md:68-69` cites a backlog item `Session Expiry Warning` that
  does not exist in `.working/backlog.md`. The underlying decision was later made (`memlog:76`) and implemented at
  318–324, so the reconciliation file is simply out of date.

## Reviewer files

- `review-rubric.md` — seven-dimension PRD quality rubric (21 findings: 3 critical, 8 high, 6 medium, 4 low)
- `review-adversarial.md` — adversarial critique (32 findings: 5 critical, 15 high, 9 medium, 3 low)
- `review-source-fidelity.md` — against declared sources and `AGENTS.md` invariants (11 findings: 1 critical, 2 high,
  5 medium, 3 low)
- `review-downstream.md` — downstream implementability (15 findings: 2 critical, 5 high, 6 medium, 2 low)
