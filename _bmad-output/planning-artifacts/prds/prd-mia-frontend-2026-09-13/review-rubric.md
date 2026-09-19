# PRD Quality Review — MIA Frontend PRD Foundation

## Overall verdict

This document is unusually honest about what it excludes and unusually rigorous about security, session lifecycle,
localization, and accessibility bounds — those sections are genuinely buildable and its seven delegated contracts all
resolve. It fails as a PRD spine on three load-bearing axes: it carries no requirement identifiers, no success metrics,
and no performance requirements, so neither "done for this requirement" nor "successful at release" can be answered
from it. The inversion is the core problem: the implementation policy it delegates elsewhere is dense and precise,
while the product commitments only a PRD can own — measurable outcomes, a cut line, bounds on the surfaces the thesis
bets on — are the thinnest content in the file.

## Decision-readiness — adequate

The document does state real decisions as decisions rather than burying them. "Exact raw body disclosure is an approved
Product Owner decision and must not be silently replaced with a validated-field subset" (§ Error Response Bodies, 270–
271) names the decision, its owner, and forecloses the tempting alternative in one sentence; the follow-on "failure
never authorizes frontend redaction" (272) pre-empts the obvious objection. Similar quality appears at "Product Owner
Safari evidence is mandatory" (421), "Firefox is unsupported but not proactively blocked" (422), and the refusal to
overclaim at "cross-platform rendering remains a documented residual risk rather than an automated guarantee" (428).
Trade-offs with something given up are named at "Mentoring and administration may be visually conventional and merely
functional" (§ Included, 80). None of this is smoothed-to-neutral writing.

What a decision-maker cannot do with this document is decide anything about *delivery*. Release Priorities (461–479)
looks like a prioritization but closes with "Priority expresses UX refinement and delivery sequence, not permission to
omit confirmed release-one behavior" (479) — which removes the only lever priorities exist to provide. Every included
surface (76–78) is release-one, WCAG 2.2 AA is release-blocking (381), seven locales ship at launch (362), and multiple
backend blockers are hard release gates (272, 316, 328). There is no stated cut line and no contingency, so a sponsor
facing a date slip finds no decision framework here at all.

The Open Questions section (535–538) reinforces this. Two questions, both tooling selection ("Which OpenAPI client
generation or runtime-validation approach…", "Which safe Markdown, sanitizer, and local math libraries…"). Not one open
*product* tension. Given launch stakes and seventeen-plus tracked backend blockers, an empty product-question list
reads as tensions offloaded to the blocker ledger rather than as tensions resolved.

### Findings

- **high** No cut line or de-scope lever (§ Release Priorities, 461–479) — P0/P1/P2 are declared, then neutralized by
  "not permission to omit confirmed release-one behavior" (479). The document therefore offers no way to trade scope
  for date, and no guidance on what a P2 slip means. *Fix:* state explicitly which P2 families may ship post-launch and
  which may not, or state plainly that release one is all-or-nothing and name who owns that risk.
- **high** Release-gating blockers carry no contingency decision (§ Mentoring 212–214; § Error Response Bodies 270–272;
  § Security 315–316) — "`BCG-017` blocks target resolution and grant availability" (213) and "The ledger's logout
  request-quiescence blocker must close before release" (316) both state a gate without stating the fallback. If
  BCG-017 never closes, does direct mentor-role grant ship deferred, or does release slip? The PRD says only "Neither
  blocker disables existing mentoring or account work" (214), which answers a different question. *Fix:* for each
  release-gating blocker, state the product decision if it does not close by the date — defer the feature, slip the
  release, or escalate — and name the decision owner.
- **medium** Seven launch locales committed with no cost acknowledged (§ Localization, 362) — the catalog list is
  asserted flat. Combined with "render each launch locale at Standard, Large, and Extra large" (439) and full
  accessibility coverage "every surface, locale, text size, state" (385), this is one of the largest verification
  commitments in the document and it is the only major commitment presented without a trade-off sentence. *Fix:* name
  what was given up to fund seven launch locales, or record it as an accepted cost with the verification multiplier
  stated.
- **medium** Open Questions are tooling-only (§ Open Questions, 537–538) — both items are architecture selections that
  belong in an architecture doc. Real unresolved product questions exist in the body but are never surfaced here, e.g.
  whether student-only accounts get any profile self-service at all (139–140) or whether the mentor-role grant flow is
  in release one. *Fix:* promote the genuinely undecided product items into Open Questions; keep tooling selection as a
  separate architecture-handoff list.

## Substance over theater — strong

Nothing in this document reads as furniture, which is rare at this length. The clearest test is Users and Context
(59–70): four role groups, each of which demonstrably drives a downstream requirement. "Mentors may be older or less
technically confident volunteers working internationally" (64) pays out in "conventional, consistent, unambiguous
flows" (121), the compact-briefing rule (206), and the time-zone emphasis at scenario 7 (493). "Students use school
desktop browsers, sometimes on shared devices and weak connections" (61) pays out across the entire shared-device
containment block (303–312) and the SSE recovery model (248–254). The section then removes a would-be persona rather
than padding: "The operator is not an application user role and has no frontend surface" (67). That is the opposite of
persona theater.

There is no differentiation or innovation section, and its absence is correct for a frontend foundation — the document
does not manufacture novelty it does not have. The security content is product-specific rather than boilerplate:
"Do not claim that self-hosting keeps all processing local or that local deletion removes provider copies and backups"
(297) and "MIA is not an emergency service, sends no safeguarding alert, and never implies human monitoring" (299) are
claims that could only have come from thinking about this product with minors in scope. The Product Objective largely
escapes vision theater too — "a student can complete a second tutoring session independently" (51–52) is a specific,
non-swappable bet.

### Findings

- **low** The central thesis is asserted but never motivated (§ Product Objective, 51–52; § Prioritized Experience
  Outcomes, 115) — "a student can complete a second tutoring session independently" is repeated as the bar without
  explaining why the *second* session is the meaningful threshold. A reader cannot tell whether the claim is about
  novelty wearing off, onboarding being complete, or habit formation, which matters because it determines what the
  frontend must optimize. *Fix:* one sentence of rationale for the second-session bar.
- **low** The Capability Model table is decorative relative to its real owner (§ Capability Model, 100–106) — the five
  groups ("Learn", "Prepare", "Mentor", "Administer", "Profile and security") are informal labels bound to no
  identifier, while the binding contract is delegated to `ROUTE-INVENTORY.md` for "protected-mount capability and scope
  gates" (153) and the actual representations are still pending backend work (517). The table conveys shape but
  authorizes nothing. *Fix:* either bind the groups to the capability identifiers `ROUTE-INVENTORY.md` uses, or label
  the table explicitly as an orienting sketch.

## Strategic coherence — thin

There is a real thesis and the priorities follow it, which is the half that works. The objective names "the two
highest-priority experiences" (50–51), the scope section then deliberately downgrades everything else — "Mentoring and
administration may be visually conventional and merely functional. Course preparation, tutoring, and session recovery
receive the highest UX refinement" (80–81) — and Priority 1 (469–473) contains exactly those thesis-serving items:
"course preparation, material processing and approval, course readiness, tutoring start and workspace, SSE recovery,
finish". Priority 0 (463–467) is contract and safety foundations, which is correct sequencing rather than
what-is-easy-first. That arc is coherent and the document is not a backlog with headings.

The half that fails is validation. There is no Success Metrics section anywhere — the word "metric" appears twice in
the document and both are incidental ("without duplicating every list or inventing metrics", 151). The closest thing to
an outcome claim is "Improved marks remain an intended benefit, not a guarantee" (57), which explicitly declines to be
measured. Meanwhile the document excludes the entire measurement apparatus: "no gamification, ranking, streak, reward,
analytics dashboard, activity feed" (88) and "Release one has no analytics, telemetry, session replay, third-party
error SDK" (301). Those exclusions are defensible for a platform handling minors' data, and I am not arguing the
document should ship telemetry. The failure is that it never connects the two facts: having chosen a thesis that is a
behavioral claim about students, and having forbidden every instrument that could observe student behavior, the PRD
owes the reader an explicit statement of how success will be judged instead — supervisor report, manual pilot, backend
aggregate, or an accepted decision that release one will not be measured. It says nothing, so the thesis is
unfalsifiable by accident rather than by decision.

Prioritized Experience Outcomes (111–121) is the structural substitute for metrics and cannot carry the load. Each item
is a capability assertion with an unmeasurable qualifier: "activate confidently without a separate manual" (113–114),
"without human interface guidance" (115), "lower-priority work with conventional, consistent, unambiguous flows" (121).
No counter-metrics exist anywhere, which matters here more than usual — the tutoring thesis has an obvious failure mode
(students completing sessions faster by disengaging) that nothing in the document guards against.

### Findings

- **critical** No Success Metrics and no measurement story (§ absent entirely; cf. 57, 88, 301) — the PRD bets on a
  behavioral outcome ("a student can complete a second tutoring session independently", 51–52) while excluding
  analytics, telemetry, and session replay, and never states the alternative evidence path. Downstream, nobody can
  judge whether release one succeeded. *Fix:* add a Success Metrics section that states how each Prioritized Experience
  Outcome will be evidenced without telemetry — named pilot cohort, supervisor-reported activation time, backend
  aggregate session counts — or record an explicit Product Owner decision that release one ships unmeasured.
- **high** Prioritized Experience Outcomes have no pass/fail definition (§ Prioritized Experience Outcomes, 113–121) —
  "resolve it, and activate confidently" (113–114) and "without human interface guidance" (115) cannot be adjudicated.
  These are the document's stated top two priorities, so their unfalsifiability propagates into every story derived
  from them. *Fix:* restate each outcome with an observable condition, e.g. activation completes with every unmet
  prerequisite reachable from the hub in one hop and no external documentation reference.

## Done-ness clarity — adequate

The density of genuinely testable bounds in the middle of this document is well above average, and it deserves credit
before the criticism. "Transport loss schedules 1, 2, and 4 second reconnect-availability delays" (250), "The ordinary
warning appears five minutes before the earlier authoritative deadline" (323–324), "five-failure invalidation" (340),
"MFA code entry uses one native text input holding the full pasteable value" (134), "320 effective CSS pixels and at
1280 CSS pixels with 400% zoom, in Standard, Large, and Extra large text modes" (401–403), and the explicit list of
seven locale catalogs (362) are all conditions an engineer can write a failing test against today. Several negative
requirements are equally sharp: "Lifecycle events and transport loss never open an authenticated request or replacement
EventSource" (240) is directly assertable in a network trace.

Two gaps undercut this. The first is total: there is not one performance requirement in 538 lines. No first-render
budget, no streaming token-to-paint bound, no bundle size ceiling, no time-to-interactive, no upload throughput
expectation. The document itself establishes the need — "sometimes on shared devices and weak connections" (61) — and
then converts it exclusively into resilience requirements. Every other quality family is given a release-blocking gate:
accessibility at 381, localization verification at 370, security via `SECURITY-PRIVACY-ACCEPTANCE.md` at 444. Frontend
performance has no gate, no budget, and no owner, on an SSE-streaming product whose primary user is on a school network.

The second gap is pointed. The surfaces the thesis stakes everything on are the least bounded prose in the file. "a
calm Home continuation surface. Home prioritizes current work by consequence without duplicating every list or
inventing metrics" (150–151) is the entire specification of the landing surface for every authenticated user — an
engineer cannot derive a single test from it. "receive the highest UX refinement" (81) versus "merely functional" (80)
is a tiering with no definition on either side, so no reviewer can reject work as insufficiently refined. Preparation
fields get "concise helper text, revealable examples, supplemental tooltips" and "Draft work may remain incomplete
without scoring or shaming the supervisor" (162–163) — the intent is clear and the acceptance condition is not.

### Findings

- **critical** No performance requirements anywhere (§ Desktop and Platform Scope, 399–428; § Test and Verification
  Model, 430–459) — despite "weak connections" (61) and an SSE-streaming core (248–254), no latency, render, bundle, or
  throughput bound exists, and the verification model contains no performance test category alongside its accessibility,
  localization, security, and resilience categories. *Fix:* add a performance section with product-specific bounds —
  authenticated shell first render on a throttled school-network profile, streamed-token render latency, transcript
  render cost at a stated turn count — and add the matching category to Automated tests.
- **high** Refinement tiering is unfalsifiable (§ Included, 80–81; § Prioritized Experience Outcomes, 121) — "highest
  UX refinement", "visually conventional and merely functional", and "conventional, consistent, unambiguous flows" give
  a reviewer no basis to accept or reject. Since this tiering is the document's main scope-shaping device, its vagueness
  is load-bearing. *Fix:* define each tier by observable obligations, e.g. refined tier requires an empty, loading,
  partial, error, and recovery state per surface plus a keyboard walkthrough; functional tier requires the standard
  states only.
- **high** The Home surface carries no testable consequence (§ Home and Unified Navigation, 150–151) — "calm",
  "prioritizes current work by consequence" and the negative constraints are the whole specification for a surface every
  user sees on every login. *Fix:* state what Home must show, the ordering rule, the maximum item count, and the
  behavior when a user has no current work; or delegate Home explicitly to `SURFACE-STATE-MATRIX.md` and say so.
- **medium** Adjective-bound preparation requirements (§ Course Administration and Preparation, 162–163) — "concise
  helper text", "supplemental tooltips", and "without scoring or shaming the supervisor" sit directly beside genuinely
  testable siblings in the same sentence ("exact preview, and confirmed code-point and byte feedback"), which makes the
  inconsistency avoidable. *Fix:* convert to conditions — helper text present for every field with a bound, no
  completion percentage or progress score rendered on draft state.

## Scope honesty — strong

This is the document's best dimension and it is strong by a clear margin. The Excluded section (83–92) does real work:
eight dense bullets that pre-empt exactly the omissions a reader would otherwise assume were oversights — "No dynamic
tutor answer buttons, model-defined controls, hidden reasoning, or fabricated generation progress" (89), "No remote
session list, remote revocation, automatic browser keepalive, or exact session-expiry countdown" (92). Deferred Backlog
(527–533) separately distinguishes *deferred* from *excluded*, including the conditional "Mascot implementation unless
an age-inclusive, cross-locale concept is validated and approved" (532).

The document is also honest about its own incompleteness in ways that are easy to omit. "The licensed Tailwind Plus
inventory is not yet bound… This is a pre-implementation gate; the handoff does not claim exact references already
exist" (415–417) volunteers a weakness rather than papering over it. "Silence is unresolved, not permission to assume"
(45–46) and "the story remains blocked on OpenAPI rather than adding a client-side assumption or compatibility layer"
(277–279) convert scope honesty into an enforceable working rule. Open-items density is appropriate: the unresolved
work is concentrated in a named, owned ledger (281–283) rather than scattered as hedges.

### Findings

- **medium** No `[ASSUMPTION]` tags and no Assumptions Index (§ document-wide; cf. § Authority and Sources, 41–42) —
  the document is "distilled into `DESIGN.md`, `EXPERIENCE.md`, and this companion" from `.memlog.md` and discovery
  evidence, yet everything reads as equally confirmed. Several items are clearly frontend-authored product choices
  rather than backend-sourced facts: the locale variant fallback rules (363–366), "Frontend-owned static starters cover
  homework help, topic practice, explanation, exam preparation, and a free-form question" (199–200), and the
  five-minute warning threshold (323–324). A downstream reader cannot tell which decisions are settled upstream and
  which are this document's own inference. *Fix:* tag frontend-originated inferences inline and index them, so the
  future PRD knows which need confirmation.
- **low** Priority and scope are conflated in one sentence (§ Release Priorities, 479) — "Priority expresses UX
  refinement and delivery sequence, not permission to omit confirmed release-one behavior" fuses two different axes
  that the document elsewhere keeps apart. *Fix:* separate refinement tier from delivery order explicitly.

## Downstream usability — thin

This dimension matters most here, because the document is explicitly chain-top: it exists to feed a future PRD,
architecture, and stories (17–19, 22–23). Delegation itself is handled well — all seven companion contracts exist in
the same folder, ownership is stated per companion (27–29, 152–153, 256–258, 272, 394–397), and every identifier I
checked resolves, including `BCG-001`, `BCG-014`, `BCG-015`, `BCG-016`, and `BCG-017`, the four named journeys implied
at 436, and backend `AS-1` through `AS-32` at 483. That is responsible delegation, not evasion.

What blocks extraction is that the document has no identifiers of its own. "Functional Requirement Families" (123–219)
is nine prose subsections; there is no `FR-*` anywhere in the file. `REQUIREMENT-FLOW-MATRIX.md` maps *backend* FR-1
through FR-84 onto frontend flow identifiers, so frontend requirement identity does not exist in this folder at all. A
story author who wants to cite "the requirement that invitation acceptance never replays automatically" (145) must
quote a sentence fragment from the middle of a paragraph. Nothing in this document can be referenced, versioned,
diffed, or marked done.

The numbering that does exist creates a collision. Line 483 instructs authors to "derive frontend scenarios from
backend AS-1 through AS-32 and the following UX scenarios", and the following list is numbered 1 through 16 (486–502).
"Scenario 9" is now ambiguous between backend `AS-9` and the raw-error-body scenario at line 495, in a document that
otherwise polices ambiguity carefully. The same issue affects Prioritized Experience Outcomes 1–6 (113–121), which are
referenced conceptually throughout but cannot be cited.

Two further extraction problems. Four protagonists appear without introduction: "Pablo" (486), "Elena" (490), "Rosa"
(493), and "Diego" (494) exist only inside the acceptance list, while Users and Context (59–70) names no individuals at
all — so a reader working from this document alone meets four undefined names in the final numbered list. And there is
no Glossary, in a document whose precision depends on invented terms of art. "privacy shield" is load-bearing at 236,
305, 311, 322, and 327 and is never defined; the same applies to "security epoch" (236, 311), "revalidation needed"
(227), "restricted stage" (130), and "scope" used as a technical noun throughout (98, 234, 345).

### Findings

- **critical** No requirement identifiers (§ Functional Requirement Families, 123–219; document-wide) — nine prose
  subsections with no `FR-*` or equivalent, and no frontend requirement IDs in the delegated matrix either, which maps
  backend `FR-1`..`FR-84` instead. Story creation, traceability, and done-tracking all lack an anchor. *Fix:* assign
  stable frontend identifiers to each requirement in the families section, or state explicitly that backend `FR-*` plus
  the matrix's flow identifiers are the sole citation scheme and that this document is narrative only.
- **high** Acceptance-scenario numbering collides with backend `AS-*` (§ Acceptance-Scenario Foundation, 483–502) —
  the instruction to use both schemes appears one line above a list numbered 1–16, making bare scenario numbers
  ambiguous. *Fix:* prefix the sixteen UX scenarios with a distinct namespace such as `FE-AS-1`..`FE-AS-16`.
- **high** No Glossary for load-bearing invented terms (§ absent; cf. 236, 305, 311, 227, 130) — "privacy shield",
  "security epoch", "revalidation needed", and "restricted stage" carry precise, safety-relevant meaning and are used as
  if already defined. A misread of "privacy shield" as a visual overlay rather than a content-free pre-paint barrier
  produces a security defect. *Fix:* add a Glossary defining each frontend-invented term once, and reference it instead
  of re-describing the mechanism inline.
- **medium** Undefined protagonists (§ Acceptance-Scenario Foundation, 486–494) — Pablo, Elena, Rosa, and Diego appear
  only in the scenario list with no role, context, or introduction anywhere in the document. *Fix:* bind each name to
  its role at first use, or map them in Users and Context.
- **low** Prioritized Experience Outcomes are uncitable (§ 113–121) — six numbered items with no stable identifier,
  referenced indirectly throughout. *Fix:* assign identifiers so scenarios and stories can trace back to an outcome.

## Shape fit — adequate

The chosen shape is defensible. For a capability-dense, multi-stakeholder platform whose journeys and per-surface
states already live in adjacent owned contracts, a requirement-family narrative plus explicit delegation is the right
call, and the document is disciplined about not duplicating journeys it does not own — "Do not duplicate those
contracts in stories; reference them and add only story-specific acceptance detail" (22–23). Declaring itself a
"handoff companion for a future frontend PRD" (17) and carrying `status: draft` is consistent with having no metrics
section on a first pass, and I weight that here rather than excusing it in Strategic coherence. The absence of inline
user journeys is correct, not under-formalization.

The shape problem is an inversion rather than a wrong template. The two longest sections — State and Integration
Contract (221–283) and Security, Privacy, and Safety (285–358) — are dense normative implementation policy at a
granularity no PRD needs: "`pagehide` installs a content-free privacy shield before a protected document can enter
BFCache. Persisted `pageshow` marks revalidation needed behind that retained shield" (236–237). Meanwhile the sections
only a PRD can own — objective, outcomes, priorities, metrics — are the thinnest in the file. The result reads closer to
an engineering policy manual with a PRD preamble than to a PRD foundation.

That inversion also produces a self-consistency problem. The document forbids duplicating delegated contracts (22–23),
then duplicates them at length: the deadline and revalidation mechanics at 240–243 restate material it assigns to
`FRONTEND-STATE-MACHINES.md` at 256–258; the error-disclosure rules at 261–268 restate material it assigns to
`SECURITY-PRIVACY-ACCEPTANCE.md` at 272. Two normative statements of the same rule in two owned documents is exactly
the divergence risk the delegation was meant to prevent, and the repository's own one-source-of-truth rule is the
standard being breached.

### Findings

- **high** Shape inversion between policy and product (§ State and Integration Contract 221–283 and § Security, Privacy,
  and Safety 285–358 versus § Prioritized Experience Outcomes 111–121 and § Release Priorities 461–479) — roughly a
  third of the document specifies transport and lifecycle mechanics it delegates elsewhere anyway, while the product
  commitments that have no other owner occupy about twenty lines. Downstream architecture gets more than it needs and
  downstream product work gets less. *Fix:* compress the mechanics sections to the decisions and their owners, moving
  the step-level rules into the state-machine and security companions, and reinvest the space in outcomes, metrics, and
  the release cut line.
- **medium** The document breaches its own no-duplication rule (§ Purpose 22–23 versus 240–243 and 261–268) —
  normative rules are stated both here and in the companion that is declared to own them, creating two sources of truth
  that can drift independently. *Fix:* for each duplicated rule, keep the decision and the pointer here and delete the
  mechanism, or explicitly mark this document as non-normative where a companion owns the rule.

## Mechanical notes

Cross-references are in good shape. All seven companion contracts named at 25–27 exist in the same folder; `BCG-001`,
`BCG-014`, `BCG-015`, `BCG-016`, and `BCG-017` all resolve to sections in `BACKEND-CONTRACT-GAPS.md`; "backend AS-1
through AS-32" (483) resolves to the backend PRD; "the four named journeys" (436) resolves to exactly four journey
sections in `EXPERIENCE.md`; and every frontmatter source path (4–9) resolves through the `mia` symlink. There is no
Assumptions Index to round-trip because there are no inline assumption tags.

Glossary drift against the repository's own vocabulary rule. `AGENTS.md` requires "Call authentication expiry **sign-in
expiry**, never tutoring-session expiry. The two are unrelated." The phrase "sign-in expiry" appears zero times in this
document. Instead it uses "authentication expiry" (53), the bare noun "expiry" in contexts where both meanings are live
— "On logout, expiry, authorization loss, or cookie rejection" (303) and "Shared-device logout or expiry clears
sensitive frontend state while server-side tutoring work remains recoverable" (489) — and, most directly against the
rule, "no… exact session-expiry countdown" (92), which reads naturally as tutoring-session expiry. Given that the
adjacent clause at 489 is specifically about tutoring work surviving sign-in expiry, this is the exact confusion the
vocabulary rule exists to prevent.

Identifier formatting is inconsistent. `BCG-*` references are code-formatted at 208, 213, and 216 but bare at 241
("use only BCG-001 non-refreshing checks"), 341–342 ("BCG-015 must define"), and 355 ("BCG-014 atomic intent binding").
Pick one and apply it throughout.

One formatting artifact: the Material and Files paragraph breaks mid-phrase at 170–172, splitting "per-file progress"
across lines and leaving "progress," alone on line 171, which reads as a list-item boundary that is not there.

Required-section audit against launch stakes: Purpose, scope and exclusions, users, requirements, dependencies, and
deferred backlog are present and substantive. Missing are Success Metrics, Glossary, requirement identifiers, any
performance section, and an Assumptions Index — the first four of which drive findings above.
