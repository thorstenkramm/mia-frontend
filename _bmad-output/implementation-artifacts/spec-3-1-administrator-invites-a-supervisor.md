---
title: Administrator invites a supervisor (Story 3.1)
type: story
story: 3-1-administrator-invites-a-supervisor
created: 2026-10-07
status: done
baseline_commit: cc135de863a6e436c73ec484335c0d2def46cf89
prepare_model: anthropic/claude-opus-5-5#high
---

# Story 3.1 — Administrator invites a supervisor

## Identity and boundary

Exact identity and acceptance: `_bmad-output/planning-artifacts/epics.md:133-150` (Epic 3 outcome at 135, Story 3.1
at 137-150; Story 3.2 at 151-163 is the next story only after 3.1 closure). Sprint `next_story` agrees.

In scope: administrator-only creation of **supervisor** invitations, the scoped invitation list and detail, explicit
resend and explicit revoke of a pending invitation, and deliberate reconciliation of ambiguous outcomes without replay.
Existing public preview/acceptance (Story 1.7) is reused unchanged; FFR-116..118 coverage stays with 1.7 and 3.2.

Excluded: student/mentor/administrator invitation creation, role selector, Delete faulty (O3), supervisor-owned
mentor invitation management, account directory/BCG-008, jobs/audit, 3.2 handoff, MFA work, retrospective C2/C5/C6/C7
repairs, Epic 1 story restarts, generic refactors, extra review layers.

Preparation decisions are settled (2026-10-07); batch-2 and duplication-repair reviews passed; final gate verified.
Closure documentation is aligned for the authorized Story 3.1 commit. The solver records the confirmed commit SHA
in its operational checkpoint after the commit succeeds.
Owner decisions O1-O4 and commit authorization remain settled below; no product decision is reopened.

## Baseline, dirty work, tooling, models

- HEAD `cc135de863a6e436c73ec484335c0d2def46cf89`; index empty.
- Approved pre-existing changes, preserved and excluded from the 3.1 manifest (sha256 at prepare time):
  - `.opencode/agents/epic-solver.md` (`9c808da2…09afb`)
  - `.opencode/story-execution.md` (`d4cf943e…15cc1`)
  - `_bmad-output/implementation-artifacts/execution/2-1-basic-capability-driven-navigation.yaml` (`bec8d6c6…441d`)
  - `_bmad-output/implementation-artifacts/execution/2-2-working-routes-and-parent-navigation.yaml` (`7a78bd81…a8c0`)
  - `_bmad-output/implementation-artifacts/sprint-status.yaml` (`22cb2cbd…f307`) — solver-owned
  - untracked `_bmad-output/implementation-artifacts/epic-2-retro-2026-10-07.md` (`560b73eb…a05`)
- No unknown overlapping edits found.
- Backend `mia` at `63c99925e5995fe2e2467f4f894976dfd4c0d297`; pre-existing dirt (inspected, not touched): modified
  `.agents/skills/bmad-brainstorming/assets/brain-methods.csv`, untracked `docs/api-authentication-and-user-invitation.md`.
  The untracked guide is advisory only; committed OpenAPI/PRD/`docs/api.md` are the authorities used below.
- Tooling present, no install needed: Node 24.21.0, npm 11.19.0, `node_modules` (485 entries), Playwright 1.63.0 with
  bundled `chromium-1243` and headless shell, Trivy 0.75.0, licensed library `tailwindplus/` version
  `2026-09-13-083323`. `package.json`, lockfile, Playwright config and `run-all-tests.sh` unchanged since HEAD.
  `src/platform/api/generated.ts` already contains all five invitation-management operations.
- Runtime model catalog (status active): `anthropic/claude-sonnet-5-5`, `anthropic/claude-opus-5-5`,
  `openai/gpt-6.1-sol`, `openai/gpt-6-astra`; each offers `low|medium|high|xhigh|max`. Configured: solver Sonnet 5.5
  `medium`, worker Opus 5.5 `high`, reviewer Astra `high`. Fallbacks: worker `openai/gpt-6.1-sol#high`, reviewer fresh
  `openai/gpt-6-astra#high` (or `anthropic/claude-opus-5-5#high` per protocol). Catalog listing does not prove
  rate-limit availability; this prepare ran on Opus 5.5 without a 429.

## Binding references

These own behavior; this spec references rather than copies them.

- Backend: `mia/api-doc/paths/invitations.yaml` `listInvitations`/`createInvitation` (1-64), `getInvitation`/
  `deleteInvitation` (65-117), `resendInvitation` (118-142); schemas `resources.yaml` `Invitation` (488-540),
  `InvitationDeletion` (558-575), collection/document (2001-2024); `requests.yaml` `InvitationCreateRequestDocument`
  (185-207); `openapi.yaml` `StrongETag` (208-210), `IfMatch` (240-245), `PageLimit`/`PageOffset` (261-268);
  `json-api/documents.yaml` `PageMeta`/`PageLinks` (31-50). Product: `mia/docs/product-requirements.md:354-431`;
  narrative `mia/docs/api.md:326-371`. Introduced by backend `66e7035b407c9b656bb1f12e2ac680e5f5b8e058` (2026-09-14).
- Capabilities: `mia/api-doc/schemas/resources/resources.yaml:53-143`; `mia/api-doc/paths/users.yaml:50-79`.
- Frontend: `ROUTE-INVENTORY.md:1146-1200` (paths, parents, titles, gates, fallbacks) and `:13-54` (opaque IDs, no
  protected data in URL/title, neutral checking, fallback rules); `SURFACE-STATE-MATRIX.md:447-469` and profiles `G`,
  `L`, `D`, `F`, `X`; `FRONTEND-STATE-MACHINES.md` §18 (546-570), §22 (664-706), §23 (707-722), §27 (850-905), §28;
  `SECURITY-PRIVACY-ACCEPTANCE.md` Ambiguous Mutation (238-273), Least-Data (495-546), Destructive Dialog (817-872),
  Existence-Hiding (873-892), Secret Hygiene (921-941); `ACCESSIBILITY-ACCEPTANCE.md` `CP-10` rows (1099-1107), AC-001..004,
  AC-008, AC-012, AC-016; `DESIGN.md` component contracts (171-199); `EXPERIENCE.md:100,147,157,227,236,469`.
- Gaps: `BACKEND-CONTRACT-GAPS.md` §BCG-006 (708-795, Story 3.1 decision 713-741), §BCG-014 (1201-1292,
  Story 3.1 decision 1206-1220), §BCG-003 (507-576, O2 mapping 538-542), §BCG-007 (existing
  disclosure reuse). Epic 2 retrospective actions 6 and 7 (`epic-2-retro-2026-10-07.md` P2/P3).

## Actual API / BCG assessment

Operations used (all already generated; no hand-written transport outside `platform/api`):

| Operation | Use |
| --- | --- |
| `GET /api/v1/invitations` | list resource read; `page[limit]`/`page[offset]` |
| `POST /api/v1/invitations` | create, `role` fixed `supervisor`, CSRF |
| `GET /api/v1/invitations/{id}` | detail/resend/revoke resource read; strong `ETag` |
| `POST /api/v1/invitations/{id}/resends` | resend, no body, `204`, CSRF |
| `DELETE /api/v1/invitations/{id}` | revoke pending only, `If-Match`, CSRF, `200` effect |

BCG-006 reconciliation. The gap register entry is stale: it cites `resources.yaml:166-194` and
`invitations.yaml:26-57,100-119`, was not re-audited in the 2026-10-01 BCG-001 update, and current committed
OpenAPI exposes `delivery_state` (`queued|delivered|ambiguous|failed`), nullable sanitized `delivery_code`
(`invitation_delivery_timeout|invitation_delivery_ambiguous|invitation_delivery_rejected`), `delivery_attempted_at`,
and documents read-reconciliation after create (`201`, queued) and resend (`204`). PRD 414-417 states timeout/ambiguity
never claims delivery and never auto-retries. Each "required observable contract" bullet of BCG-006 maps to a field or
documented reconciliation read. Still missing from BCG-006's acceptance list: OpenAPI examples for the three states
(not needed to implement) and frontend integration fixtures (this story supplies them).

BCG-014 (invitation slice only). Current transport adds a strong resource-specific `ETag` on GET, required `If-Match`
on DELETE, `428 invitation_precondition_required`, `412 invitation_precondition_failed`, and an `effect`
(`revoked|deleted`) command result. Backend `internal/invitation/invitation.go:299-330,707-711` compares the ETag
inside the transaction and every invitation mutation increments `version`. This satisfies the invitation part of the
BCG-014 required contract (Revoke cannot silently become Delete; distinct stale outcome; definitive effect). The other
BCG-014 inventory (role grant, removals, deletions) remains open and untouched.

BCG-003: there is **no invitation action in the 14-action capability catalog** (see O2). BCG-005: list/get/create/
delete responses declare `Cache-Control: no-store`; the bodyless `204` and errors are unchanged existing territory.
BCG-007: reuse existing `TechnicalErrorDisclosure` exactly as prior approved slices; no new disclosure policy.

Neither BCG entry is closed (`epics.md:44-46`, AGENTS.md). The stale frontend blocks are reconciled for this slice only
by the dated 2026-10-07 decisions recorded below.

## Settled owner decisions (2026-10-07)

### O1 — BCG-006 and BCG-014 invitation slices: YES

Recorded authoritatively in `BACKEND-CONTRACT-GAPS.md` §BCG-006 "Story 3.1 invitation-administration slice decision"
and §BCG-014 "Story 3.1 invitation-revoke slice decision" (status lines updated, both entries stay open). Narrow
pointers: `SURFACE-STATE-MATRIX.md` §Invitations, `FRONTEND-STATE-MACHINES.md` §22 and §27,
`SECURITY-PRIVACY-ACCEPTANCE.md` §Destructive Dialog Revalidation, `REQUIREMENT-FLOW-MATRIX.md` SF-7 failure path,
and `ACCESSIBILITY-ACCEPTANCE.md` (`CP-10/UNK` and `CP-10/A01` now `Not run`; `CP-10/STA`, `CP-10/A03` and
`CP-10/SUC` stay `Blocked` for faulty deletion/BCG-005; dated note after the action matrix; BCG-006 alignment row).
Only the five operations in the table above are authorized, for administrators, on `/admin/invitations[...]` except
`/delete`. Unrelated gap entries stay open.

### O2 — Capability mapping: YES

Recorded in `BACKEND-CONTRACT-GAPS.md` §BCG-003 transport progress: `accounts.administer` with `available: true` and
`scope.global: true` is the navigation/route guidance for administrator invitation management only. Operations stay
server-authoritative; declared `403` codes render the fixed unavailable result without probing.

### O3 — Delete faulty invitation: excluded

Settled from the declared story (resend/revoke only) and the 2026-10-06 deferral of destructive administration
(`FRONTEND-PRD-FOUNDATION.md:119-123`). The backend permits a new invitation to a faulty invitation's email (only
pending/registered conflict), so the journey is not blocked. Faulty detail shows state and codes with no Delete
control; `/admin/invitations/:id/delete` is not registered and falls back like other unknown paths.

### O4 — Machine 18 Stay/Discard and native unload: implement (no deviation)

The existing binding contract (`FRONTEND-STATE-MACHINES.md` §18; `EXPERIENCE.md:108-111` "navigation is intercepted
only when unsaved local input would be lost") applies to the create form. Settled design in D7 below.

### Commit authorization

Owner approved per-story verified commits for Epic 3 (3.1, 3.2), no push, stop at Epic 3 end. Commit happens only in
the commit phase after review and final verification.

## Settled implementation decisions

### D1 — Ordered gate and route registration

New canonical entries in `src/app/routes/entryRoutes.tsx` with gate `"Administer(invitations)"`: list
`/admin/invitations` (parent `/`), create `/admin/invitations/new` (parent list), detail `/admin/invitations/:invitationId`
(parent list), resend `/admin/invitations/:invitationId/resend` and revoke `/admin/invitations/:invitationId/revoke`
(parent detail). Titles/H1 follow `ROUTE-INVENTORY.md`; create H1 says "Invite a supervisor" (same subject, slice).
`/admin/invitations/new` is matched before the `:invitationId` pattern, so `new` is never treated as an ID.

Order: stage → capabilities (O2 mapping) → route resource → content. Extend `AccountCapabilities`/
`AuthenticatedAccess` with one minimized boolean (e.g. `invitationAdministration`) beside `ownProfileView`; no broad
catalog retention. Path dispatch uses `matchPath` from `react-router` so the canonical-redirect check in `App.tsx`
compares against the concrete pathname, not the template (no redirect loop, no Home bounce for valid IDs). Without the
capability every admin path falls back to Home like other unauthorized paths. `invitationId` is opaque: accept only
a non-empty segment, `encodeURIComponent` it into API paths, and never derive it from email.

A new eager host `src/app/routes/AdminInvitationRoute.tsx` (pattern of `ProfileMfaRoute.tsx`) owns step 3: list page
read or invitation read via `readAuthenticated`, keyed to the router location entry; checking renders
`CheckingAccess`; only success mounts `ApplicationShell` with the lazily imported feature component. Create has no
resource read beyond the capability. Read failure: neutral `RouteRecoveryPanel` with Check again, guard-aware parent
link and Sign out (existing pattern). `404 invitation_not_found` and `403` invitation authorization codes: one fixed
localized "not available" presentation with list/Home exit, no cached email/ID in copy, title, or announcement.
`401`/`auth_password_change_required` follow the existing access-loss shield.

### D2 — API module

New `src/platform/api/invitations.ts`: strict-enough zod schemas satisfying the generated document types; branded
`InvitationId`; minimized view model (id, email, role, status, deliveryState, deliveryCode, deliveryAttemptedAt,
failureCode, createdAt, updatedAt). Functions: `listInvitations(offset, signal)`, `getInvitation(id, signal)` returning
the view and the validated strong ETag (`^"[0-9a-f]{64}"$`, missing/invalid → `ApiProtocolError`),
`createSupervisorInvitation(email, csrf)` (`201`), `resendInvitation(id, csrf)` (`204` via existing `sendNoContent`),
`revokeInvitation(id, etag, csrf)` returning `effect`. Minimal `client.ts` extensions only: a read variant exposing the
response `ETag` header, and optional `ifMatch` on `sendUnsafeRequest`. Instants reuse `utcInstant`; `null`
`delivery_attempted_at` stays null.

Pagination: `page[limit]=25`, offset kept in route-local state (no query string, history state or storage; Reload
returns to the first page). Next/Previous follow `links.next`/`links.prev`: parse each against the origin, accept only
pathname `/api/v1/invitations` with integer `page[limit]`/`page[offset]` inside declared bounds, else protocol error.
Next appears only with `meta.has_more` and a valid `next`. No totals, filters or sorts (none supported).

### D3 — Mutations and outcome states

All mutations use `runAuthenticatedMutation` (one dispatch, CSRF read immediately before send, no abort, no replay,
epoch fence), exposed through the existing `SessionProvider` adapter as a bounded action rather than a new store.

- Create: email input (`type="email"`, `autocomplete="email"`, required, max 254). Client validation mirrors only the
  schema bounds; server `422 auth_invalid_request` is field feedback. `409 invitation_email_registered` → definitive
  conflict copy (registered or already pending); `403 invitation_role_unauthorized` → fixed unavailable; `400/406/413/
  415` → generic rejection with disclosure. `201` → stay on the create route and replace the form with a result panel
  built from the `201` body: "Invitation created", status Pending, delivery Queued, explicit text that neither email
  receipt nor an account is claimed; actions View invitation (detail), Invite another, Back to invitations. Not-sent
  failure permits a deliberate resubmit. Unknown (transport loss after dispatch, `5xx`, malformed success): no success
  claim, no automatic retry; actions Review invitations (fresh list read) and an explicit new attempt stating that a
  prior invitation may exist and a duplicate is rejected by the server. No correlation by email.
- Resend (pending only): review page with explicit Resend button stating the previous link stops working. `204` →
  immediate invitation read, then detail-like result with current delivery state. `422 invitation_invalid` → "no
  longer pending" then fresh read. `404` → fixed unavailable. Unknown → "Delivery and link state unknown"; only
  Reconcile (fresh read) — machine 27 "Resend unknown".
- Revoke (pending only): review page shows the freshly read target (email, role, status) and the effect "revoked and
  retained; link stops working". Final confirmation disables controls and re-reads the target; dispatch only if status
  is still `pending` and the ETag equals the reviewed one, sending `If-Match` with that ETag. Changed → clear the
  confirmation, show the new state, require a new review. `200 effect: revoked` → definitive: show Revoked and retain
  the detail. `effect: deleted` is impossible for a reviewed pending invitation; treat as an invariant violation
  surfaced as outcome unknown plus reconciliation (never as revocation success). `412/428` → state changed path.
  `422 invitation_invalid` → current terminal state after fresh read. `404` → fixed unavailable. Unknown → machine 22
  Outcome unknown → fresh read; target remains → "not confirmed", full new review required; hidden → "no longer
  available" without success copy.
- Delivery/lifecycle labels (status-indicator: text plus shape, never colour only): Pending, Accepted, Revoked,
  Faulty; delivery Queued ("not yet attempted"), Delivered ("accepted by the mail server; not proof it was read"),
  Ambiguous ("delivery unconfirmed" + code label), Failed (+ code). Faulty also shows its sanitized `failure_code`.
  `delivery_attempted_at` and created time use `intl.formatDate` with `timeZoneName: "short"` (existing precedent).
- Machine 23: no polling or timers. Detail and list offer explicit Refresh with a "Last checked" receipt time; a changed
  read announces once, politely, without email.
- Actions follow status only: Resend/Revoke links appear on detail for `pending`; none for other states. Consequential
  actions never appear on list rows (FFR-804); rows link to detail only.

### D4 — Shell navigation

`ApplicationShell.tsx` `authorizedGroups` gains an "Administer" group with one "Invitations" link, present only with the
O2 capability decision; the empty group stays hidden. Reuse existing `RouteDepartureLink`, current-route cue and icons
from `@heroicons/react/24/outline` (e.g. `EnvelopeIcon`). Home stays neutral (no counts or tasks).

### D5 — Exact Tailwind Plus blueprints (library `2026-09-13-083323`, `v4/react-light.jsx`)

- List: `Application UI > Lists > Tables > Simple` (header + primary "Invite a supervisor" button, labelled table,
  each row has one link to its detail page; no row actions).
- Pagination: `Application UI > Navigation > Pagination > Simple card footer` (Previous/Next, no fabricated total).
- Detail: `Application UI > Data Display > Description Lists > Left-aligned in card` (already used in MIA).
- Status: `Application UI > Elements > Badges > Flat with dot` adapted with full text.
- Create form: `Application UI > Forms > Input Groups > Input with label and help text` and `Input with validation
  error`, plus existing primary/secondary button bindings; error summary per existing `Alerts > With list` binding.
- Results/outcomes/recovery: `Application UI > Feedback > Alerts > With actions` / `With description` (existing).
- Resend/revoke review: `Application UI > Forms > Action Panels > Simple` (existing binding) on its own route.
- Empty list: `Application UI > Feedback > Empty States > Simple` with the one authorized next action.
- Read `tailwindplus` sources at implementation; record binding comment and MIA deltas at the top of each new file.

### D6 — Least data and privacy

Email is protected personal data: render as escaped text only in list/detail/review; never in path, query, hash,
`history.state`, title, breadcrumb, announcement, console, error copy, test name or artifact. No invitation token is
ever requested or held. No cache or storage persistence; route components unmount under shields and teardown.

### D7 — Dirty create form: machine 18 Stay/Discard and native unload (O4)

Dirty means the email input differs from the empty baseline while no create request is in flight and no result is
shown. Submit dispatch, definitive result, outcome unknown, explicit Discard, and unmount make the form clean.

- Shared departure: extend `RouteDeparture` in `src/platform/ui/routeDeparture.tsx` with one decision
  `{ kind: "confirm"; ask: (proceed: () => void) => void }`. `RouteDepartureLink` handles it like `refuse`
  (prevent default; when the host supplies `onDepart`, pass the ask as its `after` callback so the mobile drawer closes
  and restores focus first), and `proceed` navigates to the link target with an ordinary push. Existing `refuse`/
  `leave` semantics, fallback precedence and the recovery-codes default-deny are unchanged. Modified clicks
  that open a new tab or window keep native behavior because this tab keeps the form; same-tab activation asks.
- Dialog: new shared composite `src/platform/ui/DiscardChangesDialog.tsx` bound to
  `Application UI > Overlays > Modal Dialogs > Simple alert` (Headless UI `Dialog`, `DialogTitle`, modal backdrop).
  Localized title/description name the loss only ("Your unsent invitation will be discarded"), never the email.
  Stay is the autofocused safe action and returns focus to the email field (machine 18 "Stay"); Discard clears the
  input in memory, then calls `proceed`. Escape/backdrop equal Stay. Reduced motion disables transitions.
  MIA deltas recorded in the binding comment.
- Native unload: while dirty, register a `beforeunload` listener calling `preventDefault()` (no custom text); remove it
  as soon as the form is clean, the route unmounts, or a shield/teardown unmounts the content. Never registered for
  other routes or after submit dispatch.
- Not departures through this channel (existing contract): Sign out, privacy/lifecycle shield, sign-in expiry, access
  loss and account change — machine 18 "Security override: clear; no Stay"; they unmount the form and any open dialog
   without navigation by the dialog. Applicable same-document browser Back/Forward is intercepted before the router
   observes it: the bootstrap history gate holds and reverses the traversal, asks Stay/Discard, and only Discard
   repeats that single traversal. Stay preserves URL and memory-only input and starts no admission request.
   Cross-document navigation uses the native unload prompt. This implements machine 18, not a history waiver.
- Lazy boundary: until the create chunk registers its guard the host fallback answers (nothing can be dirty yet). The
  guard registers before the input is interactive; a rejected chunk shows existing route recovery with no dialog.

Focused regressions: shell link, mobile drawer link and parent link each ask while dirty and leave freely when clean;
Stay keeps the value and focuses the field; Discard navigates once and clears the value; the recovery-codes route
still refuses (default-deny during lazy load and after) under the extended type; a lifecycle/privacy shield while
the dialog is open removes dialog and form and later Refresh restores neither; Sign out while dirty never shows Stay;
`beforeunload` is present only while dirty (Chromium `dialog` event of type `beforeunload` on Reload) and absent after
submit, Discard, and unmount.

## File / symbol map and proposed manifest

Documentation/tracking (prepare edits done for the planning documents; tracker and checkpoint are solver-owned):

- `_bmad-output/implementation-artifacts/spec-3-1-administrator-invites-a-supervisor.md`
- `_bmad-output/implementation-artifacts/execution/3-1-administrator-invites-a-supervisor.yaml` (solver-owned)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (solver-owned transitions only)
- `_bmad-output/planning-artifacts/ux-designs/ux-mia-frontend-2026-09-12/BACKEND-CONTRACT-GAPS.md` (O1/O2 decisions)
- `_bmad-output/planning-artifacts/ux-designs/ux-mia-frontend-2026-09-12/SURFACE-STATE-MATRIX.md` (pointer)
- `_bmad-output/planning-artifacts/ux-designs/ux-mia-frontend-2026-09-12/FRONTEND-STATE-MACHINES.md` (pointers)
- `_bmad-output/planning-artifacts/ux-designs/ux-mia-frontend-2026-09-12/SECURITY-PRIVACY-ACCEPTANCE.md` (pointer)
- `_bmad-output/planning-artifacts/ux-designs/ux-mia-frontend-2026-09-12/REQUIREMENT-FLOW-MATRIX.md` (pointer)
- `_bmad-output/planning-artifacts/ux-designs/ux-mia-frontend-2026-09-12/ACCESSIBILITY-ACCEPTANCE.md` (CP-10 rows)

Existing owners to modify:

- `src/platform/api/client.ts` — ETag-exposing read variant; optional `ifMatch` header.
- `src/platform/api/entry.ts` — `AccountCapabilities` + parse of the O2 capability.
- `src/platform/session/sessionController.ts` — carry the new access boolean in `AuthenticatedAccess`; no new flows.
- `src/platform/session/SessionProvider.tsx` — expose bounded `readAuthenticated`/`runAuthenticatedMutation` actions.
- `src/app/routes/entryRoutes.tsx` — five entries, gate label, param-aware `authenticatedRouteKey`.
- `src/app/App.tsx` — dispatch to the host; param-aware canonical check.
- `src/app/ApplicationShell.tsx` — Administer group.
- `src/platform/ui/routeDeparture.tsx` — `confirm` decision (D7); existing kinds unchanged.
- `src/platform/ui/RouteDepartureLink.tsx` — handle `confirm` through `onDepart` and proceed navigation (D7).
- `src/platform/i18n/messages.ts` and all seven catalogs under `src/platform/i18n/catalogs/`.
- Existing tests only where the access shape or nav assertions need adaptation (report exact paths before editing):
  likely `src/app/ApplicationShell.test.tsx`, `src/platform/api/entry.test.ts`, `src/app/App.test.tsx`,
  `src/platform/session/sessionController.test.ts`. Recovery-code departure regressions extend the existing
  `src/app/recoveryCodesDeparture.test.tsx`.
- `scripts/check-route-secret-hygiene.mjs` — add a per-run synthetic email marker; `scripts/route-secret-hygiene-cases.ts`
  — add the 3.1 cases; `e2e/routeSecretHygiene.ts` if the marker must be threaded to the fixture.

New:

- `src/platform/api/invitations.ts`, `src/platform/api/invitations.test.ts`
- `src/app/routes/AdminInvitationRoute.tsx`
- `src/platform/ui/DiscardChangesDialog.tsx` (D7, Simple alert blueprint)
- `src/platform/ui/routeDeparture.test.tsx` (confirm/refuse/leave precedence, drawer ordering, lazy fallback)
- `src/features/invitations/InvitationListRoute.tsx`, `InvitationCreateRoute.tsx`, `InvitationDetailRoute.tsx`,
  `InvitationResendRoute.tsx`, `InvitationRevokeRoute.tsx`, `InvitationStatus.tsx` (labels/badges/delivery text)
- `src/features/invitations/invitationAdministration.test.tsx` (component/integration through App with fakes)
- `e2e/invitationAdministration.spec.ts`, `e2e/invitationFixtures.ts` (protocol fake with actual-dispatch counters)

No dependency, generated-type, CSP, `run-all-tests.sh`, backend or Story 1.7 acceptance changes.
Any extra path is reported and recorded here before editing.

## Acceptance mapping

- AC1 (`epics.md:141-142`): D2/D3 create; one `POST` observed per submit; 201 result shows persisted Pending/Queued
  without account or receipt claim. Dirty-form departure follows D7.
- AC2 (`:143-144`): D1/D2/D3 list/detail; distinct Pending/Accepted/Faulty/Revoked plus delivery states; Resend and
  Revoke only for pending with fresh review, ETag binding and changed-state re-review.
- AC3 (`:145-146`): D3 unknown outcomes for create/resend/revoke reconcile by fresh read only; zero replays by actual
  dispatch count. Student/mentor/administrator creation absent (no role control; body role fixed).

## Boundary inventory (Epic 2 retro action 6)

Shared controls touched: shell nav link, route dispatcher/param matcher, route host resource gate, shared departure
link, announcer, mutation adapter. Each new control is traced through:

- Authorized: capability true → link and routes; first page read precedes content.
- Denied: capability false/removed → no link; direct URL → Home; operation 403 → fixed unavailable, no retry loop.
- Loading: delayed capability or resource → `CheckingAccess`, no shell, no chunk, no title subject.
- Hidden/expired: shield or epoch change during read/mutation → content unmounted, late result dropped, no announce.
- Departure: shell, drawer and parent links via `RouteDepartureLink`; dirty create form asks Stay/Discard (D7);
  recovery-codes default-deny still refuses; security exits never ask.
- Ambiguous: leaving during an in-flight create/resend/revoke → no replay on return, no success claim, Reload clean.
- Visible focus: new nav link, table row links, pagination and action buttons proven visible at 320px/200% zoom.

## Secret-bearing test inventory (Epic 2 retro action 7)

Synthetic per-run markers: CSRF value, invitation email, raw error body. Integrate checkpoints when writing tests:

- `invitation-create`: submit with fixture email; email absent from URL, title, history state, announcements, console.
- `invitation-detail`: detail/list render email only as page text; title/URL/announcement free of it.
- `invitation-error`: create `409`, resend `422`, revoke `412` with raw body; collapsed disclosure only.
- `invitation-unknown`: create/resend/revoke response loss; actual request listener counts exactly one dispatch each.
- `invitation-revoke-stale`: target changes between review and confirm; zero `DELETE` dispatched.
- `invitation-discard`: dirty form, Stay/Discard dialog and Reload prompt; email absent from dialog copy, title,
  announcements and output; Discard sends no `POST`.

Each case gets a deliberate-failure checkpoint in the existing route hygiene harness; counters increment from
`page.on("request")`/route handlers, never from constants.

## Targeted checks (implement phase, sequential)

1. `npx vitest run src/platform/api/invitations.test.ts src/features/invitations src/app`
   `src/platform/ui/routeDeparture.test.tsx` plus affected suites.
2. `npm run typecheck`, `npm run lint` (architecture), `npm run check:i18n`, `npm run format:check`.
3. `npm run build`, then `npx playwright test e2e/invitationAdministration.spec.ts` and affected shell/navigation
   specs, axe on stable states, 320px all text modes, 200% zoom, seven locales, keyboard order.
4. Route secret-hygiene harness for the new cases.

Final verify runs `./run-all-tests.sh` once on the final input state (Trivy required, no skips).

## Risks

- Param matching in the single wildcard route can loop canonical redirects; tests must cover valid, empty, encoded IDs.
- Adding a field to `AuthenticatedAccess` ripples through controller fixtures; keep it one boolean.
- Revoke reread-then-DELETE must never send without the latest ETag; the stale path must send nothing.
- Translation volume across seven catalogs; long strings must wrap in table/badges.
- Extending the shared departure decision touches every guarded link (Epic 2 retro P2); D7 regressions must cover
  the drawer, lazy fallback, recovery-code refusal and security exits before handoff.
- Asynchronous SMTP: queued results are normal; copy must not imply failure or success.

## Progress log

- 2026-10-07 prepare: baseline, contracts, OpenAPI/backend evidence, tooling, models and blueprints checked; spec
  written; awaiting O1-O4. No application files changed.
- 2026-10-07 prepare finalization: owner YES to O1/O2 recorded in `BACKEND-CONTRACT-GAPS.md` (§BCG-003, §BCG-006,
  §BCG-014) with pointers in the surface matrix, state machines §22/§27, security destructive-dialog section,
  requirement-flow SF-7 and accessibility `CP-10` rows. O3 excluded; O4 implemented as D7 (no deviation).
  Per-story Epic 3 commits authorized, no push. Spec status `ready`. No application files changed.
- 2026-10-07 implement handoff (historical): implementation and test inventory written. Prior `vitest.log` records
  622 passing tests; `e2e-all.log` records 140 pass / 1 fail, followed by a focused nine-shell-test pass. These runs
  overlap and are not a unique-test total or final gate. The initial narrative diff/report and batch-1 closure claims
  were inadequate; the current actual diffs, manifest and batch-2 fix report supersede them.
- 2026-10-07 fix batch 2, code block: batch 1 was not cleared. Its clean-scan and all-four-fixed claims were unsupported and are
   superseded by the batch-2 report. Restored hidden-denial classification at every invitation read/mutation site;
   `unavailable(failure)` now replaces the protected subtree with the host's fixed neutral result and collapsed
   disclosure. Correctable create rejection and resend/revoke reconciliation retain their original bounded errors.
   Request-contract test observes exact email/role/body equality and CSRF equality as booleans only (CSRF is a secret).
   Snapshot of all pre-batch files is retained under `tmp/agent-execution/3-1-administrator-invites-a-supervisor/batch2-before/`.
   Targeted regression and failure-scan evidence is pending execution; no final gate, commit, checkpoint or tracker write.
- 2026-10-07 fix batch 2, evidence block: sequential focused checks passed: 69 tests across invitation API, invitation
  integration, departure and inherited recovery-code suites; 12 invitation browser tests; three inherited recovery-code
  browser tests. The unit request-contract deliberate failure scanned complete original stdout/stderr and one JSON
  artifact for generated email/CSRF (zero leaks). Browser invitation hygiene executed 18 checkpoints over 12 tests,
  plus a rejected early-failure canary, scanning original streams/artifacts before summaries (zero leaks).
  Evidence: `tmp/agent-execution/3-1-administrator-invites-a-supervisor/logs/batch2-*.{log,json}`.
  This is targeted evidence only. Same reviewer recheck and final authoritative verification remain pending.
- 2026-10-07 verify: solver supplied PASS from reviewer `ses_ee88080fdffeSrD4J111haeayf` for batch 2, with no
  remaining reproduction requests. Compared current executable inputs against the cleared batch-2 hashes: unchanged.
  Ran `./run-all-tests.sh` exactly once, exit 1. Typecheck, typecheck-coverage canaries and lint/architecture passed;
  the gate stopped at `format:check` on `src/features/invitations/InvitationStatus.tsx` and
  `src/platform/ui/DiscardChangesDialog.tsx`. No unit/browser tests, build, hygiene, duplication, audit, Trivy,
  catalog or Markdown gate stage was reached. Trivy 0.75.0 is installed; not reached is not passed or unavailable.
  No executable input, checkpoint or tracker was edited. Required next step: authorized formatting-only repair of
  those two files, renewed review disposition for changed inputs, then a new final verification invocation.
  Evidence: `tmp/agent-execution/3-1-administrator-invites-a-supervisor/logs/final-gate.log`, `final-gate-exit.json`,
  `final-inputs-before.json` and `final-inputs-after.json` (identical input fingerprint). No commit.
- 2026-10-07 gate-triggered formatting correction: authorized Prettier output applied only to
  `src/features/invitations/InvitationStatus.tsx` and `src/platform/ui/DiscardChangesDialog.tsx`.
  Captured original contents and exact delta; deterministic TypeScript parser-tree and React-JSX-emitted JavaScript
  parser-tree comparisons both match for both files, with zero parse diagnostics. Solver disposition retains independent
  review clearance for this verified formatter-only output. Evidence: `attempt2-format-comparison.json` and
  `attempt2-formatting.diff` under the story's agent-execution directory. No third substantive repair batch.
- 2026-10-07 verify attempt 2: ran the authoritative gate once for the new input fingerprint
  `a0d7c41344495fc7c50015cc80f4fe7550555bd55f7c5e4a3ba6eed42f9fe1c0`; exit 1 at duplication detection.
  Typecheck/coverage, lint/architecture, format, 640 unit tests (22 files), one build, bundle budget (241947 bytes gzip
  versus 256000 limit), seven ICU catalogs, generated API types, 143 browser tests and actual-case hygiene passed.
  Hygiene scanned all 36 inventoried route tests / 44 checkpoints and rejected the early-failure canary, with zero leaks;
  both inherited Vitest/Playwright deliberate-failure suites also passed. JSCPD reported seven clones (77 lines / 411
  tokens); its zero threshold failed. Audit, installed Trivy, Tailwind Plus catalog and Markdown lint were not reached.
  No component emitted SKIPPED. Inputs were unchanged through the gate; attempt-1 evidence remains intact.
  Evidence: `logs/attempt2-gate.log`, `attempt2-gate-exit.json`, `attempt2-inputs-{before,after}.json`,
  `verify-attempt2-report.md`. Next: bounded clone classification/repair under the duplication rule, affected checks and
  changed-input review disposition before a new authoritative verification. No further code edit, tracker write or commit.

### Batch-2 manifest additions

- `scripts/check-invitation-unit-secret-hygiene.mjs` executes the actual unit request assertion with two generated markers
  and records content-free scan metadata. It never forwards original failures or persists fixture values.
- The existing route-hygiene checker accepts the explicit invitation-only scope for bounded repair checks; default
  behavior still inventories and scans all registered route tests. No dependency, backend or gate-script change.

### Gate duplication repair progress

- Code block: the seven attempt-2 clone reports are classified into route-local activity bookkeeping (two overlapping
  reports), fixed transport-type imports (three), fixed error-shell presentation (one), and detail-return presentation
  (one). The shared synchronous activity ref/update and mounted lifetime now have one feature-local owner,
  `src/features/invitations/useInvitationActivity.ts`. Create/resend/revoke retain all their own states, attempt checks,
  unsafe dispatch, reconciliation and outcome announcements; no generalized mutation engine is introduced.
  Narrow paired markers cover one fixed import declaration per marked side, the error-shell opening and detail-link
  opening only. Adjacent rationales and counterpart notes identify each; no state-machine branches are excluded.
  `ProfileMfaRoute.tsx` changes only by a counterpart comment, not behavior. Threshold/config/import order unchanged.
  Focused evidence and independent changed-boundary review remain pending; attempt-2 verification is historical.
- Evidence block: original gate duplication scope/threshold/marker-balance checks run in isolation now report zero
  clones over 70 logic files. Typecheck, coverage canaries, lint/architecture, full format check and 74 focused tests
  across four API/invitation/departure/recovery-code suites passed sequentially. Five new invitation regressions cover
  Stop waiting with late resend/revoke success, and departing/re-entering create/resend/revoke before late success:
  no obsolete outcome/announcement, automatic reconciliation or second mutation. Marker/comment-only host, detail and
  profile files have equal emitted-JavaScript parser structures before/after. Existing unrelated test-harness warnings
  are reported without suppression. Evidence: `logs/duplication-*.log`, `duplication-marker-only-comparison.json`,
  `duplication-repair.diff` and `duplication-fix-report.md` under the story agent-execution directory.
  No unrelated pre-existing clone remains in the focused full-scope scan. Reviewer
  `ses_ee88080fdffeSrD4J111haeayf` must inspect only the changed duplication boundaries; a new full gate then remains
  necessary for the new inputs. Prior 640-unit/143-browser/hygiene results apply only to attempt-2's old fingerprint.

### Gate duplication manifest additions

- `src/features/invitations/useInvitationActivity.ts`: feature-local synchronous activity state/lifetime owner.
- `src/app/routes/ProfileMfaRoute.tsx`: counterpart marker-location comment only; no MFA behavior expansion.

### Final verification — attempt 3

- Solver supplied PASS from reviewer `ses_ee88080fdffeSrD4J111haeayf` for the nine-path duplication repair, with no
  remaining blocker. Current executable membership/bytes matched the reviewed repair before verification.
- Ran `./run-all-tests.sh` exactly once for attempt 3, sequentially; exit 0. All stages passed: typecheck and coverage
  canaries, lint/architecture, format, 645 unit tests (22 files), one build, bundle budget (241967 bytes gzip versus
  256000 limit), seven catalogs, generated API types, 143 browser tests, actual-case hygiene, marker balance, zero
  JSCPD clones over 70 logic files, npm audit at high, installed Trivy 0.75.0, Tailwind Plus catalog and Markdown lint.
  No components or tests skipped. Hygiene: 36 actual route cases, 44 checkpoints, rejected early-failure canary and
  zero leaks; inherited five-browser/seven-unit controlled-failure suites also passed their canaries.
- Before/after 183-input fingerprint is identical:
  `435cb2aaebe02ea53ed009c749e56643c21d10a028cb1e2193ef09dbda19a8b1`. Exact per-file hashes include new files,
  application/tests/scripts/config/dependencies and read-only backend transport input. No executable input changed.
- Reused only substantiated prior scanner dispositions: package/lockfile and country-code source/consumer are byte
  identical to Story 2.1 and current baseline; nested KaTeX 0.16.47 LOW CVE-2026-103923 / GHSA-238p-pmpm-9mq7 remains
  unresolved. The sole MEDIUM SendGrid-pattern hit is offset 1123 inside the exact 249-country compiled list at byte
  range [532,1278), with the original source/consumer Git blobs unchanged. No suppression, upgrade or threshold change.
  Vite's >500kB warning remains; the binding initial gzip budget passed. Performance/jsdom diagnostics are reported.
- Evidence under `tmp/agent-execution/3-1-administrator-invites-a-supervisor/`: `logs/attempt3-gate.log`,
  `attempt3-gate-exit.json`, `attempt3-inputs-{before,after}.json`, `attempt3-advisory-dispositions.json`,
  `verify-attempt3-report.md` and `attempt3-commit-ready-manifest.json`. Earlier attempts remain intact.
  Only reporting notes were written after the gate; no redundant test/build, tracker/checkpoint edit, stage or commit.
  Next: solver prepares commit-pending and approves the precise story/tracker staging scope. No Story 3.2 work.
- Commit closure: solver supplied the commit-pending checkpoint and authorized the exact verified story files,
  six canonical planning updates, this spec, the Story 3.1 checkpoint and only tracker epic-3/backlog→in-progress
  plus Story 3.1/backlog→done. Executable inputs remain at the passed attempt-3 fingerprint; only closure notes changed.
  Pre-existing Epic 2/next-story/action-item tracker changes are excluded through an index-only patch, without changing
  the working tracker. No new gate/build, push or Story 3.2 work is authorized in this phase.
