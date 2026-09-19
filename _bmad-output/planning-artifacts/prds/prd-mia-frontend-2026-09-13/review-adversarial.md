# Adversarial Review — MIA Frontend PRD Foundation

## Verdict

This document is an extremely disciplined constraint catalogue wearing a PRD's clothes, and the disguise is the
problem: it names two "highest-priority experiences" and then builds a verification model that structurally cannot
observe either of them, before or after launch. Its one real product bet — that exposing backend truth and ambiguity
always beats resolving it for the user — is never stated as a bet, never defended, and never reconciled with its own
user context of children on weak school connections. Strip the prose and what remains is a 538-line promise that
somebody else (the backend repo, seven companion contracts, a future PRD, one Product Owner with a Mac) will make the
hard calls.

## Findings

- **critical** The two priority outcomes are unmeasurable, and nothing in the document would notice if both were
  missed (§ Product Objective L50–54; § Prioritized Experience Outcomes L113–115; § Test and Verification Model
  L432–456) — The entire product thesis is "supervisors can prepare and activate a course without a separate manual,
  and a student can complete a second tutoring session independently." Neither is a testable proposition. There is no
  success rate, no sample, no task-completion criterion, no time bound, no definition of "second session," no usability
  study, no pilot, no beta cohort, and no post-release signal. The only instrument offered is L436: "Playwright's
  bundled Chromium on developer macOS covers the four named journeys" — a script written by the team that knows the
  product, which proves that a robot with perfect knowledge can click through, and proves nothing about a 13-year-old
  or a teacher without a manual. L301 then removes the last possible feedback channel: "Release one has no analytics,
  telemetry, session replay, third-party error SDK, remote font, or remote script." Self-hosted, no telemetry, no
  usability testing, no support surface: if both flagship outcomes fail in every school that installs MIA, this
  document contains no mechanism by which anyone would ever find out. *Fix:* Convert each priority outcome into a
  pre-release moderated usability acceptance gate with a named population, task, assisted/unassisted criterion, and
  pass threshold (e.g. "5 of 6 supervisors activate a course unaided in under N minutes with zero facilitator hints"),
  and define one privacy-preserving, operator-visible, locally-stored success signal that a school can read back to
  you. If telemetry stays excluded, say explicitly who is accountable for discovering failure and how.

- **critical** The raw-error-body mandate contradicts three of the document's own security rules and forbids the
  frontend from defending itself (§ Error Response Bodies L262–272 vs § Security, Privacy, and Safety L288–296) —
  L262 requires "the exact HTTP status and complete raw backend response body." L289 forbids exposing "private
  prompts, message bodies, provider payloads, authorization headers, or unnecessary personal data." L293: "Never
  overfetch and hide. Forbidden fields must not enter network traffic, memory, caches, accessibility trees, or DOM."
  L296: "Do not reveal whether an out-of-scope sensitive account, invitation, session, upload, or other resource
  exists." A backend body that embeds a provider payload, another student's name, or a distinguishing not-found detail
  satisfies L262 and violates L289, L293, and L296 simultaneously. L268's escape hatch is a single verb — "Never *add*
  headers, cookies, tokens, credentials, private frontend state, or provider payloads to the disclosure" — which
  regulates only what the frontend appends, not what it is ordered to render. L272 then closes the last door:
  "failure never authorizes frontend redaction." So the client must display whatever arrives, is banned from
  mitigating, and the entire safety of the feature rests on an open blocker in another repository. Escaping stops
  script execution; it does not stop a shared school desktop from showing one child another child's data.
  *Fix:* State the precedence explicitly: until BCG-007 lands, the disclosure renders a contract-bounded safe body and
  the verbatim mode is dark. If the Product Owner truly accepts verbatim-always, record that acceptance, its data-
  protection rationale, and its approver next to L270, and delete L289/L293's claim to cover error bodies.

- **critical** Priority 0 is hostage to another repository, and the document has no authority, escalation path,
  date, or descope plan for it (§ Release Priorities L463–467; § Backend and OpenAPI Dependencies L507–525) — P0 is
  "Accepted backend-gap closure" plus OpenAPI integration. Seventeen named blockers gate it. L281 asserts
  "`BACKEND-CONTRACT-GAPS.md` is the authoritative inventory and release gate" — but a frontend planning artifact
  cannot bind a separate team's roadmap, and nowhere does this document name a backend counterpart, an agreed date, a
  negotiated priority order, an escalation route, or what ships if a blocker is declined. L278–279 says "the story
  remains blocked on OpenAPI," which is the correct engineering rule and a non-answer as a delivery plan: it converts
  an external dependency into indefinite local paralysis with no owner. *Fix:* Add a dependency section with, per
  blocker, the backend owner, the target date, the frontend slices it holds, and the explicit descope decision if it
  slips past a stated cutoff.

- **critical** Safeguarding for minors is handled by a disclaimer, not a design, and the document simultaneously
  blinds the only adults present (§ Security, Privacy, and Safety L299–300; § Students and Oversight L184; § Users and
  Context L69–70) — "MIA is not an emergency service, sends no safeguarding alert, and never implies human monitoring
  or notification" (L299) is a legal posture, not a product answer. L184: "Active chat content remains hidden from
  supervisors until completion." L69–70: "MIA treats a student as working alone. Any human guidance is an external
  arrangement and is neither required nor represented by the interface." Compose them: a minor discloses self-harm or
  abuse to an AI tutor, in a product sold to schools, and by design no adult can see it while it is happening and the
  system will not tell anyone. That may be the correct release-one call, but a school administrator will ask it in the
  first ten minutes and this document does not acknowledge the question exists, names no one who accepted the risk,
  specifies no copy that sets the expectation to the student, and offers no exit ("here is who to talk to") surface.
  L456's "Manual content review covers stochastic tutor praise, safeguarding language, and no false monitoring claims"
  is the only trace, and it has no criteria. *Fix:* Add an explicit safeguarding posture section: what the student is
  told and when, what static help affordance exists, what the supervisor is told about their blindness to active
  chats, and the named person who accepted the no-alert decision.

- **critical** No data-protection posture for minors' data across four EU launch locales (§ Frontend Scope and
  Exclusions L85; § Localization L362; § Users and Context L61–62) — L85 excludes, in one bullet, with no rationale:
  "No public sign-up, operator command UI, guardian account, age verification, guardian consent, or data export."
  L62: "Release one uses no age differentiation." L362 launches `de-DE`, `fr-FR`, `pt-PT`, `es-ES`. GDPR Art. 8
  (child's consent, age threshold 13–16 by member state) and Arts. 15/20 (access and portability) are not features you
  scope out of a frontend with a dash; the excluded items are the named legal instruments. The document also ships no
  privacy-notice surface, no terms surface, no retention statement, no consent record, no DPIA reference, and no
  student-visible "what MIA stores about me." Whether these live in the backend or in the operator's paperwork is
  exactly the answer that is missing. *Fix:* Add a data-protection section stating which obligations the operator
  owns, which the product owns, which frontend surfaces (notice, retention, subject access) exist in release one, and
  who accepted the exclusions. If the answer is "the self-hosting school is the controller and carries all of it,"
  write that sentence.

- **high** The document disclaims authorship while authoring, and launders its own novel decisions through a
  memlog (§ Purpose L19; § Authority and Sources L41) — "It is not a final PRD and does not authorize behavior absent
  from its sources" (L19). Yet it invents behavior throughout: "Transport loss schedules 1, 2, and 4 second
  reconnect-availability delays" (L251), "The ordinary warning appears five minutes before the earlier authoritative
  deadline" (L324), "Frontend-owned static starters cover homework help, topic practice, explanation, exam
  preparation, and a free-form question" (L199–200). The authority for these is L41: "`.memlog.md` for captured
  frontend decisions, distilled into `DESIGN.md`, `EXPERIENCE.md`, and this companion" — i.e. the document's source is
  a log of the decisions made while writing the document. This is a closed loop that gives the text a contract's force
  and a draft's deniability, and it is compounded by `status: draft` (L3) on a document that declares release gates.
  *Fix:* Split the content into "inherited from backend sources" and "decided here, by whom, on what date," and drop
  the L19 disclaimer for the second category.

- **high** Everything is release-blocking and nothing may be cut, so the priority scheme carries no information
  (§ Release Priorities L479; passim) — "Priority expresses UX refinement and delivery sequence, not permission to
  omit confirmed release-one behavior." Meanwhile: "Keyboard-only completion is release-blocking" (L135), "WCAG 2.2 AA
  is release-blocking" (L381), "a blocked cell blocks release and never passes" (L395), "Page-level horizontal
  scrolling, clipping, overlap, obscured focus, and hidden actions fail release" (L404), "Product Owner Safari
  evidence is mandatory" (L421), "The backend error-body safety blocker … is a release prerequisite" (L272), "The
  ledger's logout request-quiescence blocker must close before release" (L316). When every constraint is a veto and
  no arbiter is named, the real cut list will be improvised under deadline pressure by whoever is typing. *Fix:* Name
  the release-decision owner and state which gates are genuinely non-negotiable versus which are severity-triaged with
  a documented waiver process.

- **high** The verification model runs on one laptop with no CI and one person's eyes (§ Test and Verification Model
  L424–425, L450; § Desktop and Platform Scope L419–422) — "Playwright E2E uses bundled Chromium on developer macOS"
  (L424). "Product Owner manually tests current stable Safari and records findings as bugs or change requests"
  (L450). Safari is a *supported* platform (L419) whose only regression protection is one human, at no stated cadence,
  against no stated checklist ("critical workflows" is never enumerated), while L87 excludes "required Playwright
  Firefox or WebKit project." Combined with this repository having no CI at all, every release gate above is
  honour-system. *Fix:* State where automated checks run and who blocks a merge; define the Safari manual checklist as
  a concrete enumerated list with a per-release cadence, or add the WebKit project you excluded.

- **high** The stated user context defeats the stated transport rule, and the document never notices (§ Users and
  Context L61 vs § Tutoring Transport L251–252) — "Students use school desktop browsers, sometimes on shared devices
  and weak connections" (L61). "Transport loss schedules 1, 2, and 4 second reconnect-availability delays but never
  opens a replacement authenticated EventSource automatically. Explicit Try now or Continue working may open at most
  one after the required access cycle" (L251–252). On the exact network this document says students are on, every
  blip becomes a manual task for a child mid-explanation, several times per session — while the flagship outcome is
  that the same child completes a session unaided. The keepalive-avoidance rationale is sound; that it costs the
  primary journey its fluency is never acknowledged, quantified, or traded off. *Fix:* Acknowledge the tension
  explicitly and specify the recovery affordance's prominence, wording, focus behaviour, and an acceptable
  interruption budget; or negotiate a read-only reconnect that provably does not touch the idle timer.

- **high** The document mandates SSE while assuming away the network it says it runs on (§ Tutoring Transport L249;
  § Frontend Scope and Exclusions L86) — "Tutoring uses SSE." Self-hosted school networks are the canonical home of
  buffering proxies, TLS-inspecting filters, and idle-connection reapers that break long-lived event streams in ways
  indistinguishable from a hung tutor. There is no stated deployment assumption, no diagnostic for "your proxy is
  eating the stream," no fallback transport, and offline mode is excluded (L86). *Fix:* State the network assumptions
  as explicit deployment prerequisites for the operator, and define the observable state and operator-facing guidance
  when a stream never starts versus stalls.

- **high** The provisioning flow is described as impossible (§ Students and Oversight L180) — "Temporary credentials
  are never returned, retained, or copied automatically and must be communicated outside MIA." If credentials are
  never returned to the frontend, the supervisor never learns them and cannot communicate them anywhere. Either they
  are displayed once (and "never returned" is false), or the flow has no exit. This sits inside one of the two
  flagship supervisor journeys. *Fix:* Say precisely what the supervisor sees, once, under what masking, with what
  copy behaviour, and reserve "never retained" for storage and clipboard automation.

- **high** "Second session unaided" presupposes a guided first session that the document forbids representing
  (§ Prioritized Experience Outcomes L115 vs § Users and Context L69–70) — The priority is deliberately the *second*
  session, which concedes the first is scaffolded by a human. But L69–70 states "MIA treats a student as working
  alone. Any human guidance is an external arrangement and is neither required nor represented by the interface."
  There is consequently no first-run experience, no onboarding, no empty-state tutorial, and no supervisor-facing
  "how to introduce MIA to your class" anywhere in scope. The document optimises for session two and leaves session
  one undefined and unowned. *Fix:* Either define the release-one first-session experience as a scoped surface, or
  state plainly that the first session depends on out-of-product teacher onboarding and name who supplies it.

- **high** The inline manual is the product's highest-priority feature and has no author, no quality bar, and no
  translation plan (§ Prioritized Experience Outcomes L113; § Course Administration and Preparation L161;
  § Localization L370) — "activate confidently without a separate manual" is delivered by "persistent labels, concise
  helper text, revealable examples, supplemental tooltips, colocated validation, exact preview" (L161) across seven
  locales. The only verification is L370: "Release verification checks catalog completeness and translated-label fit
  at all three text sizes" — completeness and *fit*. A catalogue can be 100% complete, perfectly fitted, and
  incomprehensible in German. No content owner, no UX-writing standard, no reading level, no review by a native
  educator, no glossary. *Fix:* Name the content owner, set a reading-level and review standard, and add native-
  speaker educator review of the preparation and activation copy to release evidence.

- **high** Model-output safety is verified by an unspecified manual skim of a stochastic system, for minors
  (§ Test and Verification Model L456) — "Manual content review covers stochastic tutor praise, safeguarding language,
  and no false monitoring claims." No sampling protocol, no corpus, no adversarial prompt set, no pass threshold, no
  reviewer qualification, no locale coverage, no re-run trigger when the provider or model version changes. The
  structural safety controls (L290–291: untrusted input, no model-defined controls) are excellent and address
  injection; they do not address what the tutor *says* to a child. *Fix:* Define a red-team prompt suite with locale
  coverage, a sampling size, explicit fail conditions, and a re-run trigger on any model or prompt change; state who
  owns it.

- **high** No precedence rule between this document and the seven contracts it delegates to (§ Purpose L25–29;
  § Authority and Sources L33–42) — L42 ranks only "The three handoff documents win on conflict" — DESIGN, EXPERIENCE,
  and this foundation — over imports. The seven companions get ad-hoc per-topic ownership sentences ("`ROUTE-
  INVENTORY.md` is binding", L153; "`FRONTEND-STATE-MACHINES.md` owns…", L256) while this document restates large
  parts of state, security, and accessibility behaviour in compressed prose (L221–358). When § State and Integration
  Contract and `FRONTEND-STATE-MACHINES.md` drift — and at this density they will — nothing says which wins. L22–23
  tells stories not to duplicate contracts while this document duplicates them. *Fix:* Add one precedence table
  covering all companions, and either demote the restatements here to explicit non-normative summaries or delete them.

- **high** "The four named journeys" is a dangling referent that defines the entire E2E scope (§ Test and Verification
  Model L436) — "Playwright's bundled Chromium on developer macOS covers the four named journeys and critical auth and
  recovery paths." This document names six prioritized experience outcomes (L113–121) and sixteen acceptance scenarios
  (L486–502). It never names four journeys. The single sentence that bounds automated end-to-end coverage points at
  nothing inside the document, and "critical auth and recovery paths" is undefined. *Fix:* Enumerate the four
  journeys here or cite the exact companion section and identifiers.

- **high** No performance, latency, or payload requirements of any kind (absent throughout) — This is a streaming
  tutoring product for children on "weak connections" (L61), self-hosted on whatever hardware a school owns, shipping
  React 19.2 + Vite 8 + a licensed component library (L411–413). There is no bundle budget, no time-to-first-token
  expectation, no first-contentful-paint target, no acceptable latency for a stream to begin, no guidance on what the
  UI does when the provider takes 40 seconds, no minimum server spec implication. "Long-running work includes truthful
  state, last-checked time" (L245) describes honesty about slowness, not a limit on it. *Fix:* Add explicit
  performance budgets and the observable states for exceeding them; a self-hosted product must also state the
  deployment envelope it was designed against.

- **high** Nothing can be diagnosed in the field (absent; § Security, Privacy, and Safety L301) — No telemetry, no
  third-party error SDK, no session replay — all defensible for minors' data. But the document then provides no local
  substitute: no build/version display, no diagnostics page, no "report a problem" affordance, no operator-readable
  client error log, no support handoff. A school's install breaks and the only channel is a teacher's prose
  description to an unnamed recipient. *Fix:* Specify the minimum in-product diagnostics: version/build identifier,
  an operator-visible client health view, and a defined support-report path carrying no protected content.

- **high** The Tailwind Plus gate has no failure branch (§ Desktop and Platform Scope L415–417) — "The licensed
  Tailwind Plus inventory is not yet bound. Before implementation, the frontend team selects and records one exact
  available blueprint and variant for every inherited canonical component and verifies paired behavior. This is a
  pre-implementation gate; the handoff does not claim exact references already exist." Thirty canonical components,
  zero verified availability, inheritance mandatory, invented imitation markup forbidden by repository rule. If the
  library lacks a blueprint for a component the design assumes, this document specifies no fallback and the gate
  simply cannot be passed. *Fix:* Define the decision path for a missing blueprint — substitute, compose, or escalate
  a design change — and time-box the binding exercise before it blocks all component work.

- **high** No schedule, effort, sequencing, or resourcing for an enormous surface (absent throughout) — 128 surfaces,
  31 state machines, seven locales, three built-in text modes, WCAG 2.2 AA release-blocking on every surface at 320px
  and 400% zoom, manual assistive-technology evidence, manual per-browser/OS evidence, plus seventeen external
  blockers. The document contains no date, no phase boundary, no team-size assumption, and no statement of what one
  release actually costs. A PRD that cannot be planned from is a specification, not a product requirements document.
  *Fix:* Add a delivery section: assumed team, phase boundaries, the order P0 must land in, and the first date at
  which slippage forces a scope conversation.

- **medium** The idle warning contradicts its own no-prediction claim, and the "no countdown" exclusion is cosmetic
  (§ Frontend Scope and Exclusions L92 vs § Security, Privacy, and Safety L320–324) — L92 excludes "exact
  session-expiry countdown" and "automatic browser keepalive." L322: the warning "neither moves focus nor predicts
  expiry." L324: "The ordinary warning appears five minutes before the earlier authoritative deadline." A banner whose
  appearance is computed from the exact deadline *is* a prediction, delivered with five-minute resolution; and
  "Continue working makes one explicit auth-session request" (L320) is a keepalive with a click in front of it. The
  rules are implementable, but the exclusion list oversells restraint the design does not exercise. *Fix:* Rewrite
  L322 as "states no remaining time" and reword L92 to exclude a live countdown rather than prediction.

- **medium** Two different answers for a missing backend contract (§ Backend Truth L242 vs § OpenAPI Dependency Rule
  L278–279) — L242: "If that contract is unavailable, protected UI remains shielded." L278–279: "If a required
  operation or field is absent, the story remains blocked on OpenAPI rather than adding a client-side assumption."
  The first specifies shipped runtime behaviour for an unresolved contract; the second forbids building at all. Both
  are reasonable; only one can be the rule, and a team will pick whichever unblocks them that afternoon. *Fix:* State
  the distinction explicitly — permanent shielded-degradation for runtime unavailability, build-blocking for contract
  absence — or drop one.

- **medium** Blocker references by prose nickname instead of identifier (§ Security, Privacy, and Safety L316;
  § Error Response Bodies L272) — "The ledger's logout request-quiescence blocker must close before release" (L316)
  and "The backend error-body safety blocker in `BACKEND-CONTRACT-GAPS.md`" (L272). Neither carries a BCG identifier,
  and "the ledger" is never defined in this document, though BCG-016, BCG-017, BCG-015, BCG-014, and BCG-001 are cited
  by number elsewhere (L208, L212–213, L342, L355, L241). A reader must grep a 72KB companion to resolve a release
  prerequisite. *Fix:* Cite every blocker by identifier and define "ledger" on first use.

- **medium** A stratum of requirements that no test can fail (§ passim) — "safe, patient, guided use" (L50); "a calm
  Home continuation surface" that "prioritizes current work by consequence" (L150); "Draft work may remain incomplete
  without scoring or shaming the supervisor" (L163); "Mentoring and administration may be visually conventional and
  merely functional" (L82); "conventional, consistent, unambiguous flows" (L121); "The interface must make backend
  truth legible" (L57); "Intrinsic sizing, reflow, and system-font tolerance are required, but cross-platform
  rendering remains a documented residual risk rather than an automated guarantee" (L428 — a requirement that
  pre-announces its own exemption). These are not harmless mood-setting: L82 and L121 are the *only* quality bar for
  the entire mentoring and administration surface, so any implementation passes. *Fix:* Where an adjective carries a
  scope decision, replace it with a check — e.g. define "merely functional" as "meets the accessibility and state
  contracts, inherits unmodified blueprints, receives no bespoke layout work."

- **medium** Multi-role self-scope collision is unaddressed (§ Users and Context L66; § Capability Model L96–98) —
  "Multi-role accounts use one unified, capability-driven interface" presenting "the union of actions permitted by
  roles within current course, student, ownership, and resource state scope." A supervisor who is also a student, or
  a mentor assigned to a course where they also learn, receives a union that includes oversight of themselves — while
  L184 hides active chat from supervisors for privacy reasons that evaporate when the supervisor is the subject.
  Whether self-scope is allowed, denied, or merely improbable is never stated. *Fix:* State the self-scope rule
  explicitly, including whether a user may hold learner and oversight capability over the same course.

- **medium** Content language is unresolved across UI locale, course language, and tutor output (§ Localization
  L362–369; § Course Administration and Preparation L158; § Tutoring L190) — The UI negotiates seven locales; courses
  carry a "language" field; "Do not translate backend technical errors, authored content, course material, or tutor
  output" (L369). Nothing states which language the tutor answers in, what happens when course language differs from
  the viewer's locale, or whether generated speech (L190) exists for every launch locale. A `pt-BR` student in an
  `es-ES` course is undefined. *Fix:* State the language-resolution rule for tutor output and speech, and the
  fallback when a locale has no voice.

- **medium** "Firefox is unsupported but not proactively blocked" defines no experience (§ Desktop and Platform Scope
  L422) — Firefox and Firefox ESR are common in managed school fleets. The stated posture means an unsupported user
  gets silent partial breakage: no notice, no advisory, no documented degradation, nothing. The document defines a
  "larger-window advisory" (L403) for a cosmetic condition and nothing for an unsupported engine. *Fix:* Define the
  unsupported-browser notice and what remains functional, or state that the operator is responsible for fleet
  browser policy.

- **medium** Two library questions after 538 lines of absolutes, and a companion validation report claiming zero
  findings at every severity, signal false closure rather than maturity (§ Open Questions L535–538) — The only
  admitted unknowns are the OpenAPI client approach and the Markdown/sanitizer/math libraries. A document that has
  just excluded guardian consent, data export, safeguarding alerts, age differentiation, analytics, and Firefox, and
  that depends on seventeen unclosed external blockers, has more open questions than two. *Fix:* Move the real
  unknowns — safeguarding posture, legal basis, descope authority, first-session ownership, performance envelope —
  into Open Questions with named decision owners.

- **low** Acceptance scenarios derive from the source the document itself ranks lower (§ Authority and Sources L36 vs
  § Acceptance-Scenario Foundation L483) — "The backend PRD for consolidated planning requirements and acceptance
  scenarios, subordinate to product requirements" (L36), yet "Feature stories should derive frontend scenarios from
  backend AS-1 through AS-32" (L483), which live only in the subordinate PRD. Workable, but the authority order should
  say so rather than leave a reader to reconcile it. *Fix:* Note in L483 that AS identifiers are the subordinate
  planning artifact's and that product requirements win on conflict.

- **low** The only statement about whether MIA actually teaches anything is a disclaimer (§ Product Objective L57) —
  "Improved marks remain an intended benefit, not a guarantee." This is honest and legally sensible. It is also the
  full extent of the document's engagement with the product's reason to exist, in a document that elsewhere specifies
  reconnect delays to the second. *Fix:* If learning efficacy is out of scope for release one, say who owns
  evaluating it and when, so the omission is a decision rather than a silence.

- **low** `status: draft` on a document asserting release gates (front matter L3) — Every downstream reader is told to
  treat these as binding release prerequisites while the header says draft; combined with L19's "It is not a final
  PRD," the document's own force is ambiguous. *Fix:* Promote it, or mark which sections are already binding.

## What survived the attack

- **The OpenAPI dependency rule (L274–283).** It states a prohibition *and* a consequence — the story blocks — and
  enumerates the specific cheats it forecloses: "No cookie inspection, guessed route, denial probing, course
  enumeration, null-state inference, protected prefetch, or trial-request workaround." That is a real, enforceable
  constraint, not hedging.
- **"Silence is unresolved, not permission to assume" (L45–46)** earns its place as a load-bearing rule precisely
  because the OpenAPI section gives it teeth. It is hedging only where no consequence follows.
- **"No saved or unsaved claim" (L54, L117, L306–307)** is genuinely testable at the DOM level, even though its user
  cost to a child is never weighed.
- **The per-tab idle baseline and keepalive prohibition (L318–324)** is a precise, unusual, and correct constraint
  that most products get wrong.
- **Existence-hiding as a single fixed presentation (L109, L296)** and the no-automatic-replay posture are stated
  sharply enough to fail a test.
- **Reflow at 320 effective CSS pixels and 1280px at 400% zoom in three text modes (L401–405, L440–441)** is the one
  headline quality requirement in the document that is unambiguously falsifiable.
- **The exclusion list (L83–92)** is specific, enumerated, and mostly consequential — a rare thing, and the reason
  several attacks above had to be aimed at what the exclusions imply rather than at vagueness.
