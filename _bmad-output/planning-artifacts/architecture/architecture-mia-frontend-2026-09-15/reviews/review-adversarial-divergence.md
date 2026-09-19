# Adversarial divergence review — ARCHITECTURE-SPINE.md

- Target: `_bmad-output/planning-artifacts/architecture/architecture-mia-frontend-2026-09-15/ARCHITECTURE-SPINE.md`
- Lens: construct pairs of units one level down (feature teams, app, platform modules) that each obey every AD to the
  letter yet still build incompatibly. Every constructible pair is a hole.
- Method: for each hole, both hypothetical builds are checked against the spine **and** the binding rules in
  `.agents/rules/` and the UX planning artifacts. A pair is reported only if that combined contract still permits both
  sides.

## Verdict

The spine's fences are strong on transport, sanitization, session, and streaming, but it leaves the *shared-read data
shape*, the *promotion destination*, and the *route-table authoring boundary* underdetermined — three places where two
teams can each be fully compliant and still ship incompatible code. Draft status is appropriate; these need tightening
before feature teams start in parallel.

---

## H1 — Two features reading the same operation can put incompatible view models under one cache key

**Severity: critical**

**The pair.** `features/courses` and `features/mentoring` both need `GET /courses/{id}` (mentors see course context on
mentoring surfaces; ROUTE-INVENTORY nests mentoring under `/learn/courses/:courseId/mentoring/…`).

**The divergence.** The spine distributes the pieces of a read across owners without saying who owns the *pairing*:

- The paradigm diagram places **boundary schemas in features** (`FEAT: components · hooks · boundary schemas · feature
  machines`).
- AD-2 says every response is validated "exactly once by a per-operation zod schema" that "emits the minimized
  camelCase view model" — but never says where that schema lives or who owns it when two features read the same
  operation.
- AD-1 says features "consume exported hooks only" from `platform/data`, and the key factory keys the cache by
  *account ID + operation + full scope discriminators* — the key carries no notion of "consumer" or "shape".

Nothing forbids `platform/data` from exporting a generic hook builder that a feature parametrizes with its own schema
(that is the natural reading of features owning "boundary schemas"). Then:

1. `features/courses` registers a schema for `GET /courses/{id}` emitting `{ id, name, description, logoRef, … }`.
2. `features/mentoring` registers its own schema for the same operation emitting `{ id, title, supervisorName }`
   (different field names, minimized differently — and per `api-client.md`'s never-overfetch rule, each team is
   *encouraged* to minimize to its own needs).
3. Both hooks resolve to the **same cache key** (same account, same operation, same scope discriminators). The cache
   stores whichever validated view model wrote last. Feature A now renders feature B's shape, or crashes, or —
   worse — silently reads fields that happen to overlap.

Both teams obeyed AD-1 (fence intact, one key factory, hooks consumed), AD-2 (one validation per response, schema
`satisfies` the wire type), AD-5 (no feature-to-feature import — the schemas are *independent code*, so the
"second use" promotion trigger never fires; nothing was shared). `api-client.md` ("Map to frontend naming at the
boundary, once") is per-response, not per-operation-per-codebase, so it does not close this either.

**Also latent here:** AD-2's "validated exactly once" is itself ambiguous between "once per response" (permits the
scenario) and "one schema per operation in the codebase" (forbids it). An adversary picks the first reading.

**Close with:** a new or tightened AD: *the per-operation boundary schema and its emitted view model are single-owner
artifacts; one exported hook (or hook family) per operation.* Feature-local schemas are permitted only for operations
consumed by exactly one feature, and the moment a second feature needs the operation, the schema and view-model type
move behind the `platform/data` export (this is the enforceable version of AD-5's promotion for data reads). Enforce
by requiring the key factory to accept only operations registered in a single per-operation schema registry — two
registrations for one operation fail the build, which converts the unenforceable "moment of second use" into a
mechanical gate for the data layer.

---

## H2 — AD-5's promotion destination is broken for anything features must consume; shared Tailwind Plus composites have no home

**Severity: high**

**The pair.** `features/materials` and `features/admin` both need the same Tailwind Plus table composite (blueprint-
bound per `tailwind.md`/`DESIGN.md`: sortable header, pagination footer, empty state). Same story for a shared
confirmation dialog, form-field row, or the raw-disclosure panel (see H6).

**The divergence.** AD-5: "Code needed by two features moves to `platform` (infrastructure) or `app` (composition) at
the moment of second use." Two failures hide in that sentence:

1. **`app` is an unreachable promotion target.** The tiers are one-way `app → features → platform`. Code promoted to
   `app` *cannot be imported by any feature* without breaking the ESLint fence. Team A promotes the table composite to
   `app/components` (reading "composition" as "UI composition" — a fully defensible reading); team B then either
   duplicates the composite into their feature (violating nothing — duplication inside one feature is legal) or
   promotes a *second copy* to `platform`. Result: two owners of one blueprint-bound composite, with drift in the exact
   blueprint variant — precisely what `tailwind.md`'s one-exact-blueprint gate exists to prevent, yet neither team
   broke a rule.
2. **The infrastructure/composition criterion is undefined.** Nothing in the spine or rules says which tier a shared
   UI composite, a shared formatting helper, or a shared view-model type belongs to. Two promotions of two artifacts by
   two teams land in two tiers; a later third consumer can reach one of them and not the other.

The structural seed has no `platform/ui` (or equivalent), so the *only* legal home for feature-shared UI is an
unnamed, convention-free spot inside `platform/` — or the illegal `app`.

**Close with:** tighten AD-5: *the only promotion destination for code that features consume is `platform`; `app`
receives only composition that features never import.* Name the home for shared blueprint-bound composites in the
structural seed (e.g. `platform/ui`, carrying the blueprint-binding comment obligation from `tailwind.md`), and state
the criterion: consumed-by-features ⇒ platform; wires-platform-to-features ⇒ app.

---

## H3 — "Features declare requirements" contradicts "lazy route-component imports only", and no map says which feature owns which route

**Severity: high**

**The pair (a) — requirement declaration.** AD-4 says the route table in `app/routes` holds gate requirements *as
data* and "Features declare requirements; they never implement gate or sequencing logic." AD-5 says "the route table
reaches features only through lazy route-component imports." Two compliant builds:

- Team-style A: gate requirements are authored directly in `app/routes` as literal data (reading "features declare"
  as "the feature's route-table *entry* declares").
- Team-style B: each feature exports a `routeRequirements` constant and `app/routes` imports it eagerly (reading
  "features declare" literally — the declaration lives in the feature).

Build B either violates the lazy-only clause or — if bundlers hoist the constant into the main chunk via a separate
module — creates the exact hazard AD-13 forbids: gate evaluation *needs* the requirements before loading the chunk,
so requirements imported from the feature module graph risk pulling protected-surface code before the gate passes
("protected surface code arriving during restricted stages" is what AD-13 exists to prevent). Both teams cite the same
two ADs at each other. The spine permits both; the combined contract only *implicitly* disfavors B.

**The pair (b) — route ownership.** ROUTE-INVENTORY interleaves surfaces under shared parents:
`/learn/courses/:courseId` (courses?) → `/learn/courses/:courseId/materials` (materials?) →
`/learn/courses/:courseId/mentoring/new` (mentoring?), and the whole `/prepare/courses/:courseId/materials/…` tree
sits between `features/courses` and `features/materials`. The capability map lists both features against "Courses,
materials, uploads" jointly. Nothing maps canonical path → owning feature. Two teams both build
`/learn/courses/:courseId/materials`, or each assumes the other owns the shared parent layout (the `Parent:` chains in
ROUTE-INVENTORY imply nested layouts with `Outlet`s — the parent's owner sets param typing and layout contract for the
child's chunk). Clashing param-type declarations for `:courseId` (branded ID vs string) in the "typed params" of two
entries are also possible, since typed params are per-entry data with no single declaration point named.

**Close with:** tighten AD-4: *gate requirements, typed params, and titles are authored in `app/routes` as data and are
never imported from a feature module*; add a route→owning-feature mapping (a column in the route table, or an appendix
to ROUTE-INVENTORY) and state that a nested route's parent layout is owned by the parent's feature, with the child
reached only via the router — plus one shared param-type declaration per param name in `app/routes`.

---

## H4 — Locale has one switch but no single authorized caller

**Severity: medium**

**The pair.** `features/auth` and `features/profile` (with `app` as a third contender).

**The divergence.** AD-9 gives `platform/i18n` the provider, negotiation, fallback table, and "the atomic locale
switch". The capability map assigns "Profile and locale" to `features/profile + platform/i18n`. No rule restricts who
may *invoke* the switch. Compliant divergent builds:

- `features/auth` applies the account's preferred locale the moment the session reaches `authenticated` (it owns the
  login flow, it sees the account payload first).
- `features/profile` applies the locale on locale-PATCH success (it owns the locale surface).
- `app` re-applies browser negotiation on logout/teardown — or doesn't, leaving the last account's locale visible on
  the login screen of a shared machine (a privacy-adjacent leak the rules don't currently name).
- Cross-tab: AD-7's `BroadcastChannel` protocol covers session stage only; a locale change in tab 1 leaves tab 2 on
  the old locale indefinitely — or a second, feature-invented broadcast channel appears, which AD-7 prevents only for
  *session* state.

All builds obey AD-9 to the letter; ordering (auth's post-login application racing profile's cached account read) and
teardown behavior are unowned. Two features both mutating locale through the same switch with different triggers is a
textbook conflicting-mutation-path hole.

**Close with:** name the single caller in AD-9 or the conventions table — e.g. *only `app` invokes the atomic switch,
driven by exactly two inputs: pre-auth negotiation and the authoritative account view model from the data layer;
features (including profile) never call it directly* — and state the logout/teardown locale behavior explicitly.

---

## H5 — Security-epoch fan-out (session → purge → transfer abort → UI) has no wiring owner or fixed order

**Severity: medium**

**The pair.** `platform/session` and `platform/data`/`platform/transfer` — or rather, two builds of their wiring.

**The divergence.** AD-1 owns the purge funnel, AD-7 owns the epoch, AD-15 "wires into AD-7's epoch and AD-1's purge
funnel", AD-4 wires gate re-evaluation "to AD-1's purge funnel". But the tier rule constrains only app/features/
platform; **intra-platform dependency direction is unspecified**, and no AD names the orchestrator. Two compliant
builds:

- Build A: `platform/session` imports and calls the purge funnel and transfer-abort directly on epoch change
  (synchronous, before any React render).
- Build B: `app` subscribes to the session controller via its `useSyncExternalStore` adapter and fans out purge, abort,
  and shield rendering from React (ordering now depends on React's render/effect timing; protected DOM content can
  survive a frame past the epoch change, and an in-flight authorized-image object URL can outlive the epoch until the
  effect runs).

`security-privacy.md`/`api-client.md` require "clear protected content first, then route safely" — build B can
violate the spirit under load while every named fence stays intact. Two platform modules built by different agents can
also each expect the *other* side to initiate the wiring, shipping a purge funnel nobody calls.

**Close with:** an AD fixing intra-platform layering (e.g. `session` is the lowest stateful layer; `data` and
`transfer` subscribe to it directly, synchronously, outside React) and the required order on epoch loss: abort
transfers and revoke object URLs → purge cache → then UI. Name the single wiring point.

---

## H6 — The raw-disclosure presentation is re-implementable per feature

**Severity: low**

**The pair.** Any two features that surface backend errors (all of them). The capability map assigns "Error surfaces,
raw disclosure" to "`platform/api` + features". `platform/api` owns producing the union (AD-12) with the raw payload,
but the *rendering* contract (`api-client.md`: exact `Response.text()` once, escaped inert text, `pre-wrap`,
`overflow-wrap: anywhere`, collapsed, untranslated, excluded from announcements, no page-level horizontal scroll at
320px) is left to each feature. Two features build two disclosure panels; one normalizes line endings or translates
the summary chrome differently; drift is invisible to every ESLint fence because it is behavior, not an import. This
is exactly the class of hole AD-6 closes for Markdown but nothing closes for disclosures.

**Close with:** one exported disclosure component (home per H2's resolution — feature-consumable, so `platform`), with
features forbidden from rendering `error.rawBody` outside it; enforceable with the same `no-restricted-*` style fence
by making the raw payload reachable only through that component's module.

---

## Notes on pairs probed and found closed

For completeness, divergence pairs that the spine **plus** rules already prevent (no finding):

- **Two retry policies** — AD-2's structurally non-inheritable read-retry plus `api-client.md`'s absolute rule close
  every variant tried.
- **A second Markdown/sanitizer path** — AD-6's module fence plus the `dangerouslySetInnerHTML` ban plus AD-16's CSP
  leave no compliant construction.
- **A second streaming consumer inventing generic infrastructure** — AD-8 explicitly pre-commits the promotion path.
- **Keepalive divergence** — AD-7's mandatory `initiator` flag with data-layer reads hard-wired `'background'` closes
  the "two features disagree on what resets idle" pair.
- **Per-feature time/number formatting** — AD-10 plus the no-library rule close it, provided the ESLint fence bans
  `Intl.DateTimeFormat` outside `platform/time` (worth confirming the fence list covers globals, not only imports — a
  minor enforcement note, not a hole in the decision).

## Summary table

| # | Hole | Severity | Fix shape |
| --- | --- | --- | --- |
| H1 | Same-operation reads: schema/view-model/cache-shape divergence under one key | critical | Single-owner per-operation schema + hook registry in `platform/data` |
| H2 | Promotion to `app` unreachable by features; no home/criterion for shared composites | high | Restrict promotion target to `platform`; add `platform/ui`; define criterion |
| H3 | Requirement declaration contradicts lazy-only imports; no route→feature ownership map | high | Requirements authored in `app/routes` only; ownership column; single param types |
| H4 | Locale switch has no single authorized caller or teardown/cross-tab behavior | medium | Name `app` as sole invoker; specify logout and cross-tab locale behavior |
| H5 | Epoch fan-out wiring owner and ordering unspecified intra-platform | medium | Fix intra-platform layering and epoch-loss order (abort → purge → UI) |
| H6 | Raw-disclosure rendering re-implementable per feature | low | One exported disclosure component; fence raw-body access |
