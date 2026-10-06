---
name: MIA Frontend Security and Privacy Acceptance
status: draft
sources:
  - .memlog.md
  - DESIGN.md
  - EXPERIENCE.md
  - FRONTEND-PRD-FOUNDATION.md
  - FRONTEND-STATE-MACHINES.md
  - ACCESSIBILITY-ACCEPTANCE.md
  - SURFACE-STATE-MATRIX.md
  - REQUIREMENT-FLOW-MATRIX.md
  - BACKEND-CONTRACT-GAPS.md
  - mia/docs/product-requirements.md
  - mia/docs/api.md
  - mia/api-doc/openapi.yaml
  - mia/api-doc/paths/auth.yaml
  - mia/api-doc/paths/invitations.yaml
  - mia/api-doc/paths/materials.yaml
  - mia/api-doc/paths/mentoring.yaml
  - mia/api-doc/paths/tutoring.yaml
  - mia/api-doc/schemas/json-api/documents.yaml
  - mia/api-doc/schemas/resources/resources.yaml
updated: 2026-09-13
---

# MIA Frontend Security and Privacy Acceptance

## Purpose and Authority

This draft turns the canonical UX decisions and review findings into release-blocking frontend acceptance rules. It
does not replace backend product requirements or OpenAPI. `mia/docs/product-requirements.md` remains authoritative for
behavior, authorization, security, and data lifecycle. Implemented OpenAPI remains authoritative for HTTP transport.

This document owns frontend security and privacy acceptance. Its exact raw-error disclosure, protected mount gate,
unsafe-replay prohibition, secret lifecycle, and outcome-unknown rules take precedence over conflicting generic
shorthand in companion frontend matrices or state tables. This precedence does not create backend behavior or weaken a
backend blocker.

Every unmet backend API or response-cache requirement below is a release dependency tracked in
[`BACKEND-CONTRACT-GAPS.md`](BACKEND-CONTRACT-GAPS.md). A frontend story must cite the applicable gap and remain blocked
until that gap is resolved in authoritative OpenAPI or backend requirements. The frontend must not fill a gap by reading
HttpOnly cookies, reconstructing policy, probing denials, enumerating unrelated resources, or guessing a route or field.

The backend-gap ledger remains the source of truth for blocker inventory and status. This contract consumes its
authentication, access-discovery, protected-lifecycle, action-truth, atomic-intent, mobile-verification, mentor
completion, supervisor-safe mentor-role targeting, and privacy-safe transport entries without copying their total.

In this document, protected content includes authenticated API data, names tied to protected scope, chats, summaries,
private material, mentoring data, contact data, generated speech, source files, and unsaved sensitive input. A secret
includes passwords, temporary passwords, session and CSRF tokens, invitation and reset tokens, MFA values, TOTP
provisioning data, MFA-management proofs, and recovery codes.

Unless a check says otherwise, run it on cold load, Reload, Back, Forward, duplicate tab, tab return, logout, expiry,
authorization loss, account change, and the relevant success and failure paths. Security transitions override draft
preservation and ordinary navigation behavior.

## Protected Mount Gate

The application must pass one conjunctive gate before mounting a protected route tree. In order, it must establish an
authoritative `authenticated` browser session, current-account capabilities and complete scope, authorization context
for the requested route resource and action, and only then dependent data. A successful session check alone never
permits protected mount.

The gate applies before protected render after cold load, Reload, history traversal, `visibilitychange` to visible,
`pageshow` with `persisted=true`, a security-epoch change, and any cookie or security-generation rejection. On
`pagehide`, synchronously install the content-free privacy shield before the document can enter BFCache. A persisted
`pageshow` marks revalidation needed behind that retained shield and sends no authenticated request; it is not the first
shielding point. Until an explicit cycle completes every gate step in the same current security and scope epoch, render
only a neutral `Checking access` shell.

Anonymous, `mfa`, and `password-change` stages render only their permitted focused flow and logout. An authenticated
session with missing, stale, empty, or route-ineligible capability or scope remains behind the neutral gate and then
routes to a freshly authorized safe surface. Restricted and checking flows expose no application shell, protected
title, breadcrumb, cached name, dependent request, or speculative prefetch. Older responses cannot overwrite a newer
session, security, scope, or route-authorization result. Concurrent discovery is coalesced or sequenced.

Backend dependencies: session and anonymous CSRF discovery are tracked by `BCG-001`, and current capabilities and scope
are tracked by `BCG-003` in `BACKEND-CONTRACT-GAPS.md`. Each route resource operation remains the final authority for
that route. No protected implementation may ship by substituting client policy for either blocker.

### Session-Gate Checks

1. Given a protected URL and an unresolved gate, when the document starts, then only a neutral `Checking access`
   surface exists in the DOM and accessibility tree; requests occur only in the required gate order.
2. Given an `mfa` or `password-change` result, when discovery completes, then only that restricted flow and logout
   mount, and protected cache entries, titles, history state, blobs, streams, and route trees are absent.
3. Given a protected page entering BFCache, when `pagehide` runs, then the content-free privacy shield is installed and
   retained before caching. Persisted `pageshow` marks revalidation needed without a request, and no protected frame
   paints before explicit revalidation succeeds.
4. Given a late authenticated response after a newer anonymous result, when it resolves, then it is discarded and no
   protected content reappears.
5. Given an authenticated session but removed route scope, when capabilities or route authorization resolve, then no
   protected route tree mounts and the user reaches a freshly authorized safe surface.

### Session-Gate Negative Tests

- Seed every client cache with a transcript and protected names, return each non-authenticated stage, and assert zero
  protected text in screenshots, DOM, accessibility snapshots, document title, history state, and copy selection.
- Restore a protected page from BFCache after logout in another tab and use filmstrip or compositor-level evidence to
  assert that the shield was present before restore paint and protected content stayed absent throughout the gate.
- Return `authenticated` while withholding or removing the route capability, course, student, owner, or assignment
  scope; assert cached route data never mounts or enters the accessibility tree.
- Assert that using `GET /users/me`, cookie parsing, route probing, or denial probing as stage discovery fails review.

## Fragment Bearer Tokens

Invitation and password-reset entry points use a synchronous pre-application bootstrap. Before React mounts, router
startup, API work, diagnostics, or any optional script loads, bootstrap reads `location.hash` once into one route-local
ephemeral flow object and immediately removes the complete fragment with `history.replaceState`.

Only one exact `token=<canonical-lowercase-UUID-v4>` fragment is accepted. Empty, malformed, uppercase, duplicate,
additional, and unknown fragment parameters are invalid, but the complete fragment is still removed synchronously.
After capture, tokens never enter the live address, application-controlled current history entry, router state, query
caches, global state, browser storage, titles, referrers, errors, logs, clipboard helpers, or test reports. Departure,
cancel, first-byte dispatch, timeout after dispatch, and auth change drop the sole application-reachable reference. A
definitive pre-dispatch failure retains it only in the active route so the user may explicitly retry an acceptance that
made no server attempt. An unsafe request is never automatically replayed with the token. For password reset at
`/password-reset`, the 2026-10-01 Story 1-6 decision in `BACKEND-CONTRACT-GAPS.md` §BCG-001 also retains the token
after definitive `422 auth_invalid_password`, `429`, and `csrf_invalid` results so the user may deliberately resubmit.
It drops the token on success, `auth_invalid_reset_token`, a generic definitive `400`, `406`, `413`, or `415` rejection
(Decision 7, 2026-10-01), outcome unknown, departure, and auth change. Departure also ends any attempt still waiting
to dispatch, so it is never sent. A link opened
while signed in keeps the token in memory only through the explicit sign-out interstitial. The bootstrap minimizes
exposure but cannot erase pre-script browser history, sync, screenshots, crash metadata, or other browser-owned
artifacts that may already have observed the initial URL.

Invitation acceptance distinguishes submitting, definitive pre-dispatch failure, definitive success, definitive
rejection, outcome unknown, and consumed-token ambiguity. A definitive `201` confirms account creation but never
authentication or session creation. Ambiguous and rejected outcomes make no creation claim. Safe next actions after
ambiguity are explicit sign-in with the chosen credentials or reopening the original email link; neither is proof. A
uniform invalid result from the reopened link does not prove that the earlier acceptance succeeded.

### Fragment Checks

1. Given a valid invitation or reset URL, when the first application instruction runs, then `location.hash` and the
   current history entry are clean before any render, network call, optional import, or diagnostic callback.
2. Given any invalid or unexpected fragment, when bootstrap runs, then the fragment is removed and a uniform localized
   invalid-link surface appears without an API request that could reveal token state.
3. Given Back, Forward, Reload, or a copied live address after capture, then application-controlled live history and the
   current address do not restore the fragment token.

### Fragment Negative Tests

- Instrument the earliest render, fetch, module-load, error, and router hooks and fail if any observes the original URL.
- Exercise encoded separators, duplicate `token`, extra fields, uppercase UUIDs, non-v4 UUIDs, empty values, and very
  long fragments; assert identical removal and safe invalid-link behavior.
- Disable screenshots, traces, videos, and request logging for token-flow tests; assert failure output contains only a
  fixture label, never the fixture token.

## CSRF Rotation and Unsafe Requests

Read the current readable CSRF cookie immediately before every unsafe dispatch and send it only in `X-CSRF-Token`.
Never retain a copied CSRF value in normalized state. Serialize login-stage mutations. After login, logout, MFA
completion, password replacement, or another rotating transition, invalidate queued work created under the old token
and rediscover session and CSRF state before permitting another mutation.

No unsafe request is automatically replayed after timeout, network loss, abort, `401`, `403`, `csrf_invalid`, tab
return, or token rotation. Request-ID idempotency creates no exception. First reconcile authoritative state. An exact
retry is permitted only after an explicit user activation while the same page still holds the immutable request ID and
payload, and fresh session, account, capability, scope, route, and security epochs all match. Editing remains disabled
while outcome is unknown. The action is labelled `Retry exact attempt`, not Resume, Continue, or automatic recovery.

Stopping a local wait before dispatch returns to editable state without an attempt. Aborting at or after dispatch enters
outcome unknown, retains the immutable attempt only in page memory, and does not imply that the server cancelled it.

Backend dependencies: `BCG-001` owns anonymous bootstrap, session stages, CSRF rotation, and stale-token behavior.
`BCG-002` owns cross-course active-session reconciliation, and `BCG-012` owns authoritative tutoring work and action
eligibility. Request-ID replay and conflict behavior already defined by backend requirements remains usable only through
the explicit frontend retry rule above.

### CSRF Checks

1. Given two queued unsafe requests and a rotation after the first, when the first completes, then the second is
   cancelled before dispatch and cannot use the old token.
2. Given a lost response from any unsafe request, when connectivity returns, then the network log shows no second unsafe
   request until the user explicitly acts after authoritative reconciliation.
3. Given two tabs across a stage transition, when the stale tab submits, then it does not retry on `csrf_invalid`; it
   clears stale state, rediscovers the stage, and explains the safe next action.
4. Given an ambiguous request-ID operation, when reconciliation cannot prove an outcome, then Retry remains disabled
   until current access is established and the user explicitly activates `Retry exact attempt`.

### CSRF Negative Tests

- Force loss after request bytes reach the server for invitation acceptance, MFA replacement, deletion, upload,
  tutoring creation, and message submission; assert one dispatch and no generic retry-library replay.
- Rotate CSRF between request creation and dispatch; assert the dispatch uses the latest cookie or is cancelled.
- Assert that GET retry policy cannot be inherited by POST, PATCH, or DELETE through a generic API client default.

## Session Expiry and Lifecycle Revalidation

For the 2026-10-05 approved auth/Home lifecycle slice in `FRONTEND-PRD-FOUNDATION.md`, schedule a local privacy
shield at the earlier authoritative deadline. Each tab warns from its own last observed deadlines. Only deliberate
Continue working refreshes idle expiry; ordinary requests, other-tab activity, pointer movement, typing,
timer callbacks, SSE traffic, and automatic reads never extend a deadline locally. An idle warning is informational, never a
privacy boundary and never permission to leave protected content visible after either authoritative deadline. It is a
non-modal persistent banner that does not move focus or obscure the focused item; its Continue and Sign out actions are
included in reading and keyboard order.

At the deadline, and conservatively after clock rollback, sleep, wake, timer suspension, or a delayed callback that may
have crossed it, synchronously install the privacy shield, abort protected work, and block mutation. Protected content
returns only after fresh session and complete access discovery. A client clock must never extend a server-authored
deadline. The absolute deadline never moves; an authoritative idle deadline may move only after the backend accepts a
deliberate Continue working operation. After observed expiry, explicit Refresh discovers the actual stage and
reauthorizes through the complete ordered gate; another tab's renewal does not inherently require fresh credentials.

The ordinary polite warning threshold is five minutes before the earlier authoritative deadline. A deadline returned
inside that threshold shows the warning immediately; a reached deadline shields immediately. Continue working is one
user-initiated operation whose definitive success returns the refreshed authoritative idle deadline and unchanged
absolute deadline together. It requires no second automatic deadline read. Outcome unknown, including undeclared
`5xx`, immediately installs the shield and permits only explicit recovery without replay.

`online`, focus, visibility-return, persisted-`pageshow`, network-change, and SSE transport loss only coalesce and mark
revalidation needed. They send no authenticated request and never open a replacement EventSource. Explicit Refresh and
Try now use the BCG-001 non-refreshing contract; Continue working uses its one activity-refresh response before
non-refreshing dependent reads. Until that contract exists, the shield remains rather than silently extending a session.

### Session-Expiry Checks

1. Given authoritative idle and absolute deadlines, when the earlier deadline passes without another request, then the
   privacy shield replaces protected content without waiting for network traffic or user input.
2. Given clock rollback, sleep, suspended timers, or a delayed callback, when the page resumes at or beyond a deadline,
   then it locks immediately and never computes a later deadline from elapsed client time.
3. Given lifecycle or reconnect events without a deliberate MIA action, when they coalesce, then no authenticated
   request is sent, no EventSource opens, and protected content remains shielded.
4. Given activity in another tab, when this tab remains inactive, then this tab's warning baseline does not change.
5. Given Continue working, when the operation succeeds, then one response supplies refreshed idle and unchanged absolute
   deadlines; when its outcome is unknown, no automatic read or success claim occurs.

### Session-Expiry Negative Tests

- Leave a protected route and an SSE connection visible beyond both deadlines; assert content is shielded at the earlier
  instant even when no subsequent request occurs.
- Trigger every automatic lifecycle event and inspect network and server activity; assert no authenticated request is
  sent and none refreshes idle expiry.
- Move the clock backward and suspend then resume the page across each deadline; assert neither action extends access.

## Ambiguous Mutation Reconciliation

Session creation and message submission bind one canonical request ID to one immutable semantic payload immediately
before first dispatch. While that attempt remains reachable in the same page, reconcile before offering the explicit
exact retry defined above. A different payload always receives a new ID only after the earlier outcome is definitive or
the user has explicitly abandoned the local unknown attempt after authoritative reconciliation.

Reload and browser restoration drop the request ID and payload references because neither may enter browser storage.
After Reload, fetch the authoritative active session, current work, and transcript through documented operations. Show
only records the backend returns. Do not claim whether an absent local message was saved, recreate an ID, or offer exact
retry. Once current state permits, the user may compose and explicitly submit a new message with a new request ID.
Cross-course session-creation recovery remains governed by `BCG-002`; current tutoring work and action eligibility are
governed by `BCG-012` in `BACKEND-CONTRACT-GAPS.md`.

Uploads have no request-ID or correlation contract. A lost response enters a separate local `Upload outcome unknown`
row and triggers an authoritative file-list read. Never match that row to a server file by filename, size, media type,
order, or timestamp. Before dispatch, Cancel removes the local row and means no server attempt. At or after dispatch,
`Stop waiting` enters outcome unknown. Never retry, delete, or finalize automatically. After reconciliation, the user
may choose `Abandon unknown attempt`, review the complete authoritative list, and explicitly choose
`Upload as a new file` after a warning that an earlier upload may already exist. That action is a new upload, not a
retry. Finalize remains disabled until every local unknown attempt has been explicitly abandoned and the user has
reviewed the authoritative list.

After Reload, no local upload attempt survives. Render only authoritative server rows and make no correlation or
not-saved claim. Message and upload ambiguity are therefore frontend outcome-unknown states, not additional backend
blockers and never reasons to persist request bodies, request IDs, or file handles.

### Ambiguous-Mutation Negative Tests

- Lose a session or message response, retain the page, and assert no replay before reconciliation, current access, and
  one explicit `Retry exact attempt` activation with the unchanged ID and payload.
- Reload after the same loss and assert no exact-retry action, no restored ID or payload, and no saved or unsaved claim
  beyond authoritative session, work, and transcript records.
- Lose an upload response among duplicate filenames and assert no row matching, automatic retry, guessed deletion, or
  Finalize action. After Reload, assert only server rows remain and none is labelled as the prior attempt.

## Logout and Privacy Screen

Logout has explicit `logout-start`, `logout-quiescing`, `logout-requesting`, `logout-confirming`, `logout-confirmed`,
`logout-unconfirmed`, and `logout-reconciliation-needed` phases. `logout-start` first replaces protected UI in the initiating tab with a blocking neutral
privacy screen, tears down local protected state, closes admission to the origin-wide authenticated-request coordinator,
and broadcasts the content-free start phase. Every authenticated request, login/MFA-completion/password-change
transition, and SSE connection holds a shared coordinator lease from before dispatch through settlement. Every live receiving tab applies the same
shield and admission block, aborts authenticated fetches, closes SSE, fences late callbacks, and releases settled
leases. Abort or a rejected local wait alone does not prove that a transition cannot still deliver cookies; known
unsettled transitions keep logout unconfirmed. A tab returns a content-free quiescence acknowledgement for that logout
nonce. No tab starts unrelated discovery, reads, reconnects, or mutations while that logout remains in progress;
the initiator's permitted CSRF recovery and post-`204` anonymous confirmation are the phase-specific exceptions.

The initiator waits for an exclusive coordinator lease before sending one explicit CSRF-protected logout request and
holds it through anonymous confirmation. Quiescence acknowledgements aid observability but never substitute for the
exclusive lease. This coordinates known live work; it cannot cover suspended or terminated contexts or prevent every
already admitted authentication-transition response from restoring authentication. The owner accepted this limitation
on 2026-09-27 in `FRONTEND-PRD-FOUNDATION.md`. The authoritative backend contract is
`mia/docs/product-requirements.md` §Authentication session lifetime and `mia/api-doc/paths/auth.yaml#/logout`:
delayed ordinary and Continue working responses cannot restore usable authentication, but delayed login,
MFA-completion, or password-change responses may. There is no server-side per-browser revocation guarantee.
Timeouts, grace periods, tab counts, aborts, and response-order guesses do not prove revocation or settlement.

Logout reaches `logout-confirmed` only after known transitions settle, backend `204`, and subsequent session discovery
establish an anonymous state with fresh anonymous CSRF. The initiator then broadcasts a content-free confirmed outcome.
Each tab stays shielded until its own permitted non-refreshing discovery establishes anonymous state; receiving the
signal alone never confirms logout. Other tabs use explicit Refresh for that check, not lifecycle-triggered traffic.
Confirmation means anonymous at that check, not immunity to a later transition. Neutral login copy may say
"Signed out at the last check. A sign-in already in progress in another tab may sign this browser in again."

If a late authentication transition is observed after dispatch or confirmation, fence its UI result, retain or
reinstate the shield, and withdraw current confirmation. While the logout POST is pending, remain in
`logout-requesting` with reconciliation needed recorded locally: Refresh and Retry logout are unavailable, and no
discovery or second logout dispatch may overlap that POST. A transition during `logout-confirming` similarly fences
the outstanding discovery result and waits for that phase to terminate. Neither event releases the exclusive barrier
early or queues an action for automatic execution.

The still-active logout attempt accepts its own eventual POST result by attempt nonce solely for outcome bookkeeping,
even if the security epoch changed: `204` records backend success, never anonymous state or permission to reveal.
If reconciliation was marked, that result does not start the normal automatic confirmation check. A non-`204`, timeout,
network loss, or local abort records an unconfirmed outcome; it never manufactures backend success. End the active
phase and release its exclusive lease before enabling recovery, retaining the ordinary-request admission block and
shield. A callback from an attempt already ended or superseded cannot change its result or confirm logout; an observed
late transition still marks reconciliation needed. Local termination does not prove server cancellation or cookie
revocation, and known unsettled authentication transitions still prevent confirmation.

After the active phase ends, enter `logout-reconciliation-needed` and offer explicit Refresh using documented session
discovery, serialized through the coordinator. Retry logout cannot overlap this read; it starts a new attempt only
after the read ends and explicit activation with safe CSRF recovery. No disabled activation is remembered or replayed.
If discovery returns anonymous after a recorded `204` for the applicable logout attempt and known transitions are settled,
confirmation may be restored; without a `204`, anonymous discovery alone does not confirm the logout attempt.
An MFA, password-change, or authenticated result keeps logout unconfirmed and offers explicit Retry logout through
safe CSRF recovery, never automatic protected reveal or replay. Failed or ambiguous reconciliation keeps the shield.
Suspended/restored tabs apply the existing lifecycle shield and explicit-check rules; no durable all-context logout
record is implied. A retained document, including BFCache restoration, retains its local logout recovery state. A new
document after Reload or context termination has no such record and uses the ordinary ordered mount gate. If a late
transition restored authentication, fresh session, capability/scope, route, and dependent-data checks may authorize
newly fetched protected content; this is not restoration of pre-logout UI or confirmation of the prior logout attempt.
Local shielding, response fencing, and browser closure do not revoke cookies.

If logout, CSRF refresh, or anonymous confirmation fails, keep the privacy screen. It must state that logout is not
confirmed, that the browser may still hold a valid sign-in cookie, and that protected content has been hidden locally.
Offer explicit Retry logout and guidance to close the entire browser on a shared device or contact the local operator.
Broadcast a content-free unconfirmed outcome so every tab remains shielded. Do not show the ordinary login screen, claim
success, restore protected UI, run authenticated discovery automatically, or retry automatically. `Retry logout` starts
a new phased attempt only after explicit activation and safe CSRF recovery.

Backend dependency: `BCG-001` tracks logout rotation, the reduced guarantee and reconciliation evidence,
non-refreshing lifecycle checks, and post-logout anonymous discovery. Only its logout product conflict is resolved;
this flow cannot ship while the composite blocker remains open.

### Logout Checks

1. Given successful logout, when `204` and anonymous discovery complete, then the privacy screen changes to neutral
   login and no protected artifact remains client-side.
2. Given timeout, offline state, `csrf_invalid`, or non-`204` logout, when the request ends, then the blocking privacy
   screen remains, reports unconfirmed logout, and contains no protected names or content.
3. Given explicit Retry logout, when fresh CSRF can be obtained, then exactly one new logout request is sent.
4. Given a logout-start phase in one tab, when another tab receives it, then that tab shields and aborts authenticated
   work, acknowledges quiescence, and sends no authenticated request until a terminal outcome and permitted next action.
5. Given a delayed ordinary or Continue working response, when it arrives after logout, then subsequent discovery
   remains anonymous under the backend's reduced guarantee; no physical cookie-absence assertion is required.
6. Given a delayed login, MFA-completion, or password-change response admitted before logout, when it arrives late,
   then authentication may be restored; the frontend shields, withdraws current confirmation, and requires explicit
   reconciliation without automatic unsafe replay or protected reveal.
7. Given a pending logout POST, when a late authentication transition arrives and the user attempts Refresh or Retry,
   then neither action dispatches. When the original POST returns `204`, record only its outcome, end the active phase,
   release its exclusive lease, and keep the shield; only a new explicit Refresh starts reconciliation. Test non-`204`
   and ambiguous outcomes too: neither records success, and a callback after termination cannot upgrade the outcome.
8. Given a transition during anonymous confirmation or explicit reconciliation, when the old discovery resolves, then
   its fenced result cannot confirm logout or reveal content; another explicit check is required after the read ends.
9. Given a receiving tab retaining its logout flow, when a security-epoch notification arrives after confirmation, then
   it withdraws confirmation and follows logout reconciliation, not the ordinary protected mount gate. An authenticated
   reconciliation result retains the shield and offers explicit Retry logout, not protected navigation.

### Logout Negative Tests

- Fail logout at every transport phase and assert neither a success announcement nor the normal login screen appears.
- Press Back, Forward, and Reload from both logout outcomes and assert no stale pre-logout content reappears. Retained
  documents, including BFCache entries, keep their shield and local logout recovery rules. Fresh documents must pass
  the entire ordered mount gate before newly fetched protected content appears; exercise a restored authentication
  cookie from a late transition and allow freshly authorized entry without claiming the earlier logout was confirmed.
- Verify screen-reader focus enters the privacy-screen heading and that Retry and close-browser guidance are reachable.
- Delay ordinary, Continue working, login, MFA-completion, and password-change responses separately across logout.
  Assert the distinct outcomes above, known-transition quiescence, independent tab checks, and no stale UI reveal.
  Include a suspended tab unable to acknowledge and a terminated context; prove achievable shielding/recovery on return,
  not universal revocation. Preserve unrelated-device authentication. Backend cookie-pair simulation alone is insufficient.

## Cross-Tab Security Epoch

Every tab opens one same-origin `BroadcastChannel` with a fixed public channel name. Its accepted messages are versioned
and content-free: security-epoch, logout-start, logout-quiesced, logout-confirmed, and logout-unconfirmed. Each contains
only the fixed version and kind plus a fresh random event nonce and, for one logout attempt, its random logout nonce. No
message contains an account ID, username, stage, route, resource ID, scope, action, activity timestamp, or
protected data. Unknown, malformed, oversized, replayed, or differently versioned messages trigger the conservative
privacy shield and never cause authenticated discovery or appear in logs.

Completed login, every successful login-stage transition, and any detected account change create a fresh local epoch and
broadcast it. Logout uses the ordered start, quiescence, and outcome phases above. The sender always applies its local
transition before broadcasting. A receiving tab immediately enters the privacy shield, advances its security epoch,
aborts protected work, drops protected reachable references, and blocks mutation and protected render until the message
kind's permitted next gate completes. Logout-start never triggers the ordinary protected mount gate.

A receiving tab that still retains a local logout flow or its confirmed outcome treats a subsequent security-epoch
notification as possible late-transition reconciliation, not permission to enter the ordinary protected mount gate.
It withdraws current confirmation and follows the logout phase ordering above, including deferral while a known active
logout phase holds the barrier. It cannot infer the account, stage, or cause from the content-free signal. Only explicit
session reconciliation determines the current state; any non-anonymous result keeps this participant shielded with
explicit Retry logout. This precedence uses existing local flow state and existing messages, not a durable logout
record or a new channel payload.

The channel is notification only, never authority. It carries no session state and causes no automatic unsafe request.
A suspended tab retaining a logout flow resumes behind that flow's shield and explicit reconciliation; a newly created
document with no retained logout flow starts behind the ordinary mount gate. `localStorage` events are
not a substitute because they persist a cross-tab signal. If `BroadcastChannel` construction or delivery fails, the tab
must remain safe through its applicable gate on entry, visibility return, BFCache restoration, and before mutation:
retained logout recovery takes precedence over the ordinary mount gate. Lifecycle return only shields and marks
revalidation needed, without dispatch. The tab must not claim immediate cross-tab invalidation coverage.

### Security-Epoch Checks

1. Given account A in two visible windows, when one starts logout, then both show a privacy shield before either sends
   an authenticated request; each receiving window acknowledges quiescence without session discovery.
2. Given one window completes login, MFA, password replacement, or an account switch, when the signal arrives, then an
   older window drops account A state. A window retaining logout state follows logout reconciliation and cannot mount
   protected content from that signal or an authenticated reconciliation result. Other windows pass the ordinary
   session, capability, scope, and route checks before protected mount under the existing explicit-revalidation rules.
3. Given delayed reads and SSE callbacks from an older epoch, when they resolve, then they cannot render, announce,
   mutate cache, create a blob, or restore a form.

### Security-Epoch Negative Tests

- Inspect every sent message and assert its serialized form contains only the fixed version, kind, event nonce, and the
  random logout nonce where that phase requires it.
- Inject malformed and attacker-chosen channel messages and assert conservative gating with no reflected content or log.
- Run logout followed by login as another account while a second window stays visible; assert no stale form can dispatch
  with the new account's CSRF cookie.

## Shared-Device Teardown

On logout start, sign-in expiry, non-authenticated stage, cookie rejection, authorization or scope loss, account change,
security-epoch change, terminal resource loss, or security reset, synchronously perform all applicable teardown before
rendering the next surface. JavaScript cannot guarantee physical process-memory erasure. Teardown means dropping every
application-reachable reference, unmounting controls, cancelling callbacks, and overwriting a mutable buffer when the
implementation deliberately used one; acceptance never claims immutable strings or garbage-collected memory were zeroed.

- Unmount protected route trees and drop sensitive component, form, normalized-cache, derived-view, and global-state
  references.
- Abort protected app-managed fetches, close SSE, ignore callbacks from older epochs, stop media, release decoded media
  references, discard app-managed partial response bodies, and revoke every object URL. Do not claim control over a
  browser-managed download after handoff.
- Clear secret controls and drop reachable credential references. Remove protected focus targets, selections,
  live-region text, and accessible names.
- Replace protected document titles with neutral `MIA`; clear protected breadcrumbs and content-bearing history state.
- Keep protected URLs opaque and content-free. Never put names, topics, messages, filenames, email, or mobile data in
  path text, query text, hash, or `history.state`.
- Never persist protected bodies or drafts in local storage, session storage, IndexedDB, Cache API, service-worker
  caches, URL state, or form-restoration stores. Locale and text-size device defaults remain separate from account
  preferences.
- Suppress protected printing by default. Browser memory, HTTP cache, BFCache, Downloads, OS clipboard, print spooler,
  and recently closed-tab metadata are boundaries the frontend cannot reliably erase; UI copy must not claim otherwise.

Authenticated service-worker caching, Cache API writes, protected prefetch, and prerender are prohibited. If a service
worker exists for public assets, authenticated API requests and responses must bypass it.

Backend dependency: `BCG-005` owns `Cache-Control: no-store` for sensitive authenticated JSON, SSE snapshots,
transcripts, mentoring data, private material, source and content downloads, generated speech, one-time security
responses, and their sensitive-route errors. Frontend teardown does not substitute for server `no-store`.

### Teardown Negative Tests

- After every teardown trigger, inspect all application-reachable stores, Cache API, service workers, object URLs,
  active fetches, EventSource instances, media nodes, DOM, accessibility tree, title, URL, and history state for
  protected fixture data. Do not claim a process-memory scan or guaranteed garbage-collector erasure.
- Navigate Back/Forward and restore a closed or BFCache page after account A logs out and account B signs in; assert no
  account A data appears or is requested under account B.
- Simulate a late fetch, SSE, media, or image callback after teardown; assert it cannot repopulate state or announce.
- Verify no authenticated request is prefetched, prerendered, or served from a frontend-managed cache.

## Scope-Aware Cache Identity and Purge

Every protected cache identity includes the authenticated account ID, OpenAPI operation, complete path and query scope,
and every course, student, owner, assignment, capability, or representation discriminator used by that operation.
Resource ID or route alone is never a sufficient cache key. Do not merge differently authorized representations into
one normalized entity or reuse a role-shaped response for another capability path.

Purge affected details, collections, relationships, derived labels, forms, downloads, blobs, media, breadcrumbs, and
prefetch state on account or stage change, capability or assignment change, scope switch, mutation, denial, `404`,
logout, tab-return revalidation, or terminal deletion. A newer scope epoch fences all older responses.

Backend dependency: `BCG-003` owns current-account capability and complete scope discovery. Feature-specific reads and
eligibility remain governed by `BCG-008` through `BCG-013` where those ledger entries apply. Client role flags, partial
collections, or policy reconstruction are forbidden substitutes.

### Cache Negative Tests

- Reuse the same opaque resource ID across two accounts, courses, students, and capability combinations; assert no cache
  hit, normalized-entity merge, stale label, blob reuse, or cross-scope request association.
- Remove an assignment in tab A while tab B displays its detail; on tab return, assert atomic purge before safe routing.
- Resolve an old-scope response after switching scope and assert it is discarded without DOM or live-region output.

## Least-Data Fetching

Visibility rules apply to requests and retained state, not only pixels. Never overfetch and hide with CSS, component
conditions, accessibility attributes, or post-response filtering. Do not speculatively prefetch protected resources.

An assigned supervisor viewing an active tutoring session may request only the authorized status representation. The
route must not call transcript, used-material, private-content, or summary endpoints until authoritative session state
and OpenAPI permit that exact operation after completion. Administrators without a course-supervisor assignment receive
no implicit access.

Mentor routes use only mentor-scoped minimal-student identity, avatar, and mentoring operations. They must not call
generic user detail, tutoring transcript, summary, used-material, private-material, generated-brief, roster, or
supervisor-only endpoints. Shared components accept already-minimized view models, not broad API resources.

Backend dependencies: `BCG-008` owns bounded account-administration reads, and `BCG-013` owns student mentoring-request
eligibility. `BCG-016` owns mentor-completion eligibility, its recheck instant, and ambiguous-outcome reconciliation.
None permits broader collection reads, generic profile fetching, local-clock authorization, or mutation probing.

Canonical `/profile` uses only the current account's authorized self-profile representation. Student-only accounts
receive read-only fields and no edit affordance, writable form model, profile mutation, or speculative staff child-route
request. Staff accounts receive only their writable subset and separately authorized security operations. A shared
component must consume these minimized view models rather than a broad user resource with hidden fields.

Any supervisor may grant mentor role to registered staff by user ID, but that capability grants no administrator
account collection or detail access. `BCG-017` must provide a bounded, exact-ID, non-enumerable resolution path that
returns only the minimum confirmation required to review an eligible registered-staff target. Unknown, student-only,
banned, deleted, out-of-scope, unauthorized, and throttled cases use one existence-hiding result. The frontend sends no
partial-match, search, autocomplete, suggestion, pagination, or repeated-probe traffic and retains no rejected identity.
The grant remains unavailable until target confirmation and BCG-014 precondition binding both succeed.

Mentor completion remains unavailable until a fresh server result allows it. A server recheck instant permits only an
explicit eligibility read; local-clock comparison, timer wake, browser sleep recovery, and stale `scheduled_for` never
enable completion. Immediately before confirmation, reread detail and eligibility. After dispatch, `Stop waiting` or a
lost response enters outcome unknown and never replays PATCH. Reconciliation may show open, denied, cancelled,
completed, access-lost, or unavailable state; only authoritative completed state or the definitive success response may
show completion.

### Least-Data Negative Tests

- Record network and client state for active-session supervisor pages; fail on any transcript, used-material, or private
  material request even if its result is hidden.
- Record every mentor route request; fail if it leaves the mentor-specific identity and mentoring operation allowlist.
- Search DOM, accessibility snapshots, React state, query caches, errors, clipboard data, and test artifacts for
  forbidden fixture fields that the visible page does not need.
- Test multi-role users and prove role union adds actions only in authorized scope and never broadens fetched data.
- Render `/profile` for student-only and staff fixtures; assert student-only state has no edit control, form state,
  profile mutation, or staff-only child-route request, while staff receives only its authorized writable fields.
- Exercise mentor-role target resolution across eligible and hidden causes; assert one bounded exact-ID request, fixed
  copy and timing treatment, no account collection/detail request, no suggestions, and no retained rejected identity.
- Assert BCG-017 unavailability disables only direct mentor-role grant while existing mentoring work and unrelated
  administrator-authorized account reads remain usable.

## Credential and Secret Lifecycles

Secret-bearing responses bypass normalized caches, global stores, developer state tooling, generic error objects, and
instrumentation. Secret fields are route-local, non-serializable by convention, and never used as resource identity.

Backend dependencies: `BCG-005` owns no-store for one-time security responses, `BCG-009` owns active and pending
MFA-factor discovery without returning secrets, `BCG-010` owns authorized student and staff MFA-reset mutations, and
`BCG-015` owns mobile-verification lifecycle and resend observability. Frontend lifecycle rules below do not substitute
retained provisioning data, local timer guesses, or mutation probing for those contracts.

For mobile verification, authoritative state distinguishes initial create, pre-dispatch failure, outcome unknown,
provider failure, cooldown, hourly and daily throttling, verification, five-failure invalidation, expiry, and concurrent
invalidation. Resend sends the existing code without extending its original expiry and returns neither code nor
destination. BCG-015 must define whether resend resets or preserves the prior failure count. The frontend neither infers
nor exposes that count.

### TOTP Provisioning URI

> [!IMPORTANT]
> Owner decision, 2026-10-05 (`BACKEND-CONTRACT-GAPS.md` BCG-009 Story 1-9 slice) supersedes the label and issuer
> rules in this section. The accepted grammar is exactly
> `otpauth://totp/MIA%20(<host[:port]>):<username>?secret=<32 uppercase unpadded Base32>&issuer=MIA`, optionally followed
> by `&algorithm=SHA1`, `&digits=6`, and `&period=30` in that order, within 1,024 UTF-8 bytes. The host is validated as
> a hostname or bracketed IP literal with an optional port, the username as the backend username grammar. The frontend
> never derives or compares them; the label/issuer disagreement is a non-blocking backend note. Everything else in this
> section still applies.

Treat the complete `otpauth://` URI and its secret as credentials. Limit the URI to 1,024 UTF-8 bytes before parsing;
the decoded account label is the current 3-32-character ASCII username, and the normalized hostname is at most 253 ASCII
characters. Accept only the canonical base `otpauth://totp/<percent-encoded-label>` followed by these query parameters
in exact order: `secret=<base32>`, `issuer=<percent-encoded-issuer>`, `algorithm=SHA1`, `digits=6`, and `period=30`.
The decoded label must equal the current username, the decoded issuer must equal `MIA (<normalized hostname>)`, and the
secret must decode from exactly 32 uppercase unpadded Base32 characters to 20 bytes. Apply fixed bounds to the complete
URI and every decoded field before rendering. Require the exact scheme, `totp` host, path, and query shape. Empty or
extra path segments are invalid.

Reject user information, ports, fragments, duplicate, missing, reordered, conflicting, or unknown parameters;
non-canonical percent encoding; malformed UTF-8 or Base32; lowercase or padded secrets; and any issuer, account,
algorithm, digit, or period mismatch. Parse once locally into one validated value and derive the QR image and selectable
manual setup data from it without a remote image, service, or authenticator handoff. The QR, manual fields, and original
validated URI must represent identical semantics.

Keep provisioning data only in the active enrollment component. A verification submit does not by itself remove setup
data. Retain it through a definitive invalid-code or other correctable failure only while fresh authorization confirms
the same pending enrollment remains valid. A timeout before dispatch also leaves that correctable route-local state.

On temporary page hide, immediately mask the setup surface, disable reveal and copy controls, revoke rendered QR object
URLs, and retain the same still-valid route-local provisioning value only in the living page. On return, reveal nothing
until fresh authorization confirms the same pending enrollment; then derive a new local QR and allow an explicit reveal.
If reauthorization fails or cannot reconcile that exact enrollment, drop the retained value.

On successful activation, definitive cancel, enrollment expiry, route departure, Reload, unload, auth or scope change,
or teardown, unmount setup controls and drop every application-reachable URI, secret, QR payload, and copy-value
reference. An ambiguous outcome at or after dispatch does the same unless authoritative reconciliation proves the same
pending enrollment remains valid without exposing a new secret. A new authorized enrollment is the restart after
references are dropped; never recover provisioning data from history or cache.

Before copying a TOTP secret or complete provisioning value, warn that it grants factor setup and that MIA cannot clear
the OS clipboard or clipboard history on a shared device. Copy only the named visible value after explicit activation.
Never copy automatically or combine the secret with hidden issuer, account, URL, or profile metadata.

### MFA-Management Proof

Treat the five-minute, single-use proof as a bearer credential distinct from its non-secret resource ID. Keep it in one
active mutation flow only. Send it solely in the OpenAPI-defined header or field. Drop every application-reachable proof
reference before handling the mutation response, including timeout or ambiguous failure, because the frontend cannot
know whether it was consumed. Never retry the mutation automatically or reuse the proof for a different action.

### Recovery Codes

Intercept the activation response outside generic stores and show exactly ten codes once on a dedicated route. Require
an explicit reveal and safe-storage acknowledgement before intentional departure. Provide only user-initiated `Copy all`
and print. Do not auto-download. Mask codes on page hide and drop all application-reachable code references on confirmed
departure, logout, expiry, auth change, cancel, or factor replacement. Replace the history entry so Back cannot restore
the code surface.

Warn that MIA cannot clear the OS clipboard, screenshots, print preview, spooler, printer tray, or saved paper. If the
activation response is lost or code references are dropped before storage, explain that they cannot be retrieved and
complete factor replacement is the recovery path. Do not imply standalone regeneration exists.

### Temporary Passwords

Supervisor-chosen student temporary passwords exist only in local password controls and the one request body. Use
`autocomplete="new-password"`, permit password managers, reveal, paste, spaces, and Unicode, and preserve exact bytes.
Never put a temporary password in a response view, URL, generic form store, clipboard action, or browser storage.

After success or cancel, unmount both password controls and drop all application-reachable value references immediately.
Do the same on logout, expiry, scope loss, route departure, Reload, or browser restoration. A definitive validation
failure may retain values only while the same authorized component remains mounted; an ambiguous result drops them and
requires state revalidation before another explicit submission.

### Acceptance and Negative Tests

- For each secret, inspect all caches, stores, history, URL, DOM after departure, accessibility tree, console, errors,
  network logs, traces, screenshots, videos, and crash output; only the active intended control may contain it.
- Exercise Back, Forward, Reload, duplicate tab, page hide, timeout, logout, expiry, denial, ambiguous response, and
  successful completion for every lifecycle.
- Assert TOTP QR and manual values are equivalent and generated without any network request.
- Reject every non-canonical URI class above before QR, reveal, copy, or app-link output; assert zero network requests.
- Hide and return during same-device setup; assert the value stays masked until the same enrollment is freshly
  authorized, then can be revealed without starting a replacement enrollment.
- Submit one invalid TOTP code and assert setup data remains available after the same pending enrollment is revalidated;
  test timeout before dispatch separately from ambiguous timeout after dispatch, successful activation, and expiry.
- Assert TOTP copy requires the clipboard warning and explicit activation, copies only the named value, and never claims
  that departure or later account use cleared the OS clipboard.
- Assert a proof is absent before response handling and no second mutation occurs after a lost response.
- Assert recovery-code copy and print require activation, announce success or failure once, and never run automatically.
- Assert temporary-password fields cannot be restored after success, cancel, Reload, Back, or a new account session.

## Raw Error Response-Body Decision

Product Owner decision retained on 2026-09-12: every backend error has a localized plain-language explanation and a
collapsed technical disclosure containing the exact HTTP status and complete raw backend response-body text. This is an
explicit decision to retain full body disclosure. It is not an allowlist, truncation, JSON-only rendering, or
redacted-body design.

`Exact` means the untouched JavaScript string returned by calling Fetch `Response.text()` exactly once on the original
response. Fetch decodes that body as UTF-8. The frontend does not claim byte equality and does not parse, stringify,
normalize, trim, redact, repair, re-encode, normalize line endings, or substitute text. Invalid input bytes would appear
as the replacement characters produced by Fetch decoding; the expanded backend blocker requires valid UTF-8 instead of
making malformed decoding an accepted production path. Copy technical details uses that same untouched string.

Render the body only as escaped inert text in a selectable region with visual pre-wrapping and emergency word breaking.
Visual wrapping must not alter the underlying string used for selection or copy and must not cause page-level
horizontal scrolling at 320 effective CSS pixels. Never use `innerHTML`, Markdown, link detection, syntax plugins, DOM
parsing, or executable rendering. JSON remains raw text; malformed JSON, proxy HTML, and non-JSON remain escaped plain
text. Technical details are collapsed by default, excluded from live announcements, and left untranslated. Copy is
user-initiated, names its scope, and warns the user to review sensitive details before sharing.

The disclosure object may contain only the numeric HTTP status and response-body text. It must not include request or
response headers, cookies, authorization or CSRF values, fragment tokens, MFA proofs, request bodies, URLs, client
state, stack traces, provider names, or provider payloads. Do not enrich it from exception, request, or SDK objects.

Backend dependency: `BCG-007` owns the fixed aggregate response-size bound, valid UTF-8 and explicit media type for
every API and reverse-proxy error path, neutral existence-hiding content, forbidden-data exclusions, intermediary
behavior, and reverse-proxy conformance. It applies the `BCG-005` no-store policy to every error response. The frontend
cannot both preserve an arbitrary body exactly and redact a secret embedded inside it, so body safety is a backend
obligation and never a client heuristic. Neither blocker gates shipping the disclosure: the browser already holds the
complete response before rendering, so withholding it in the interface changes only whether a reader must open
developer tools. An unsafe or distinguishing body is a backend defect that `BCG-007` must close at source, and both
blockers remain release goals.

### Raw-Error Checks

1. Given an error body containing HTML, script text, event attributes, Markdown, and URLs, when details open, then the
   exact text is visible but no node, link, request, script, style, or event handler is created.
2. Given a JSON:API error, when locale changes, then the localized explanation changes while status and the untouched
   Fetch-decoded UTF-8 string remain unchanged and untranslated.
3. Given clipboard permission denial, when Copy technical details is activated, then focus remains, one localized
   failure is announced, and no fallback inserts data into another control.
4. Given long unbroken text, minified JSON, or proxy HTML at 400% zoom, when details open, then the region wraps without
   clipping or page-level horizontal scrolling and Copy still returns the untouched Fetch-decoded string.

### Raw-Error Negative Tests

- Construct errors whose SDK objects contain secret headers, request bodies, URLs, and provider metadata; assert the
  disclosure contains only status and the supplied response-body fixture.
- Supply valid UTF-8, a conflicting charset declaration, invalid bytes, and mixed line endings; assert the displayed and
  copied value equals the single `Response.text()` result, never the original bytes or a normalized reconstruction.
- Fail if snapshots, telemetry, console output, test reports, or error boundaries capture the raw body.
- Verify escaped rendering under mutation-XSS corpora and CSP; no test may use a real token or personal record.

## No Telemetry or Third-Party Diagnostics

Release one contains no analytics, behavioral telemetry, session replay, third-party error or crash reporting,
third-party performance monitoring, remote fonts, remote scripts, tracking pixels, or diagnostic export. No SDK may
capture DOM, accessibility trees, keystrokes, clipboard actions, URLs, route scope, requests, responses, console output,
or user behavior for remote delivery.

Local diagnostics must be content-free. Production console calls must not contain protected values, errors with bodies,
request or response objects, credentials, route parameters tied to people, or provider data. Any CSP relaxation or new
external origin is a separately approved and security-reviewed product change.

### Telemetry Negative Tests

- Assert the production dependency graph and built assets contain no telemetry, replay, remote-error, remote-font, or
  remote-script SDK and no unexpected external origin.
- Exercise all critical flows under network interception and assert no request leaves the MIA origin except a deliberate
  user-activated external link handled under the link rules below.
- Trigger global errors and unhandled rejections with protected fixtures; assert no remote request and no sensitive
  console entry, browser report, or persisted diagnostic record.

## Untrusted Rich Content and External Links

Treat model output, partial SSE text, user text, authored content, filenames, OCR text, and backend error bodies as
untrusted. Safe Markdown uses one locked parser and sanitizer configuration with an explicit element and attribute
allowlist. Raw HTML, SVG or MathML input, forms, frames, media, remote images, IDs, styles, classes, event attributes,
model-defined controls, and DOM clobbering names are forbidden.

Streaming content is escaped text or the entire accumulated string is reparsed through the same locked sanitizer on
every update. Never append unsanitized chunk HTML. Test every adversarial payload at every chunk boundary. Terminal
state discards the incremental parse result and reconciles authoritative content through the same policy. Retain the
stable attempt container and unchanged semantic descendants; never remount the transcript or earlier turns. If a
changed descendant cannot preserve the reading anchor, keep focus stable and expose a labelled final-response control.

Only a successfully parsed `https:` URL whose parsed `username` and `password` are both empty may become an interactive
external link. A credential-bearing HTTPS URL is rejected and rendered as inert text with no copy-link control or
network activity. Do not autolink arbitrary transcript text. Display the normalized ASCII host and a fully inspectable
destination, mark it external, and require deliberate activation. A localized visible indication and the programmatic
link purpose must state that activation opens a new tab; title-only and hover-only disclosure do not qualify. Open in a
new context with `noopener noreferrer`; set no opener and send no referrer. Never fetch, preview, preconnect,
DNS-prefetch, embed, or follow the URL on the user's behalf. MIA same-origin navigation uses trusted route construction,
not the external-link renderer.

### Rich-Content Negative Tests

- Test mixed-case, whitespace, control-character, percent-encoded, entity-encoded, nested, and Unicode-lookalike forms
  of `javascript:`, `data:`, `blob:`, `file:`, `http:`, and protocol-relative URLs; assert inert text and no request.
- Test credential-bearing HTTPS URLs across tutor, authored material, mentoring, and backend-provided text; assert inert
  rendering, no copy-link control, normalized actual-host handling, and zero network activity.
- Test mutation-XSS, DOM-clobbering, malformed tables, raw HTML, SVG, MathML input, CSS, event attributes, remote
  images, and payloads split at every character boundary; assert inert output and zero unexpected requests.
- Activate an allowed external link and assert visible and programmatic new-tab disclosure, normalized destination, a
  null opener, and no `Referer`.

## Authorized Downloads and Inline Images

Every protected source, normalized-content, or speech transfer starts only from an explicit user click after current
session and complete resource-scope revalidation. Never prefetch, preload, auto-download, or reuse a response or blob
URL. An app-managed fetch remains bound to the initiating account, operation, and scope epoch. Before browser handoff,
denial, abort, logout, scope change, or a partial response drops all application-reachable byte references.

For data that must stop on a security-epoch change, use a supported-browser-tested app-managed fetch/blob path. Read and
validate the complete successful response first, register one object URL in a central protected-blob registry,
synchronously activate the prepared download anchor, and revoke the URL in the next macrotask after the click handler
returns. Teardown, page hide, abort, or failure revokes it sooner. If next-task revocation cancels the supported-browser
download, that strategy fails acceptance rather than extending secret retention indefinitely.

A direct same-origin navigation or other browser-managed download transfers control to the browser on activation. From
that point MIA cannot reliably cancel, inspect, revoke, erase, or discard the transfer or resulting file after logout,
account change, scope loss, or abort. Use this path only where that boundary is accepted and disclosed before
activation; do not apply app-managed abort, partial-byte, blob-registry, or security-epoch guarantees after handoff.

Inline avatars and course logos are authorized images, not intentional downloads. Their release contract is conditional
on `BCG-005` defining whether each image class is sensitive and its cache policy. After that blocker closes, render them
only after the protected mount gate and exact image-resource authorization succeed. Make no speculative request. Use the
approved direct-source or app-managed object-URL path consistently with that cache policy, refetch when the policy
requires it, and remove the image and reachable bytes on denial, route-resource loss, or security-epoch change. Until
then, protected inline image rendering remains blocked rather than inheriting generic download behavior.

A media object URL remains registered only while its mounted player uses that exact source. Replacing or unmounting the
source, route departure, page hide, playback error, or any teardown trigger stops playback, removes `src`, calls
`load()`, revokes the URL, and removes the registry entry. Do not wait for a nonexistent browser `download accepted`
event. Do not expose storage paths. Respect the OpenAPI media type and backend safe attachment disposition; do not infer
a trusted type or filename from route data.

Before the first private or otherwise sensitive download in a browser session, warn that the browser may save a durable
copy outside MIA, logout and MIA deletion cannot remove it, and a shared device may expose it to later users. Require a
separate explicit continuation. Do not claim that MIA can delete the Downloads copy.

Backend dependency: `BCG-005` owns no-store for protected source, normalized-content, and generated-speech responses.
OpenAPI remains authoritative for per-request authorization, safe download headers, and exact media types.

### Download Negative Tests

- Revoke approval, assignment, membership, or account access after a download control renders but before click; assert a
  fresh request denies safely and no cached bytes or blob are used.
- Change accounts between creating and consuming a blob; assert the URL is revoked and unavailable to the new account.
- Abort an app-managed transfer at each pre-handoff phase and assert no partial file, media source, object URL, cache
  entry, or automatic retry.
- Instrument the blob registry and URL methods; after a download click, assert one URL was created and revoked by the
  next macrotask, the registry is empty, and the supported-browser download contains the complete expected fixture.
- For media, assert the URL remains reachable only while the mounted player uses it and every named exit leaves the
  player empty, stopped, and absent from the blob registry.
- Assert the shared-device warning precedes the first sensitive request and is keyboard and screen-reader operable.
- Start a browser-managed download, then change epoch; assert MIA makes no cancellation or erasure claim and the warning
  had disclosed that browser control continues beyond MIA's boundary.
- For each `BCG-005`-approved avatar and logo policy, test gate ordering, cache behavior, denial, refetch, and teardown
  without applying the intentional-download click requirement.

## Destructive Dialog Revalidation

Every destructive dialog names the target, current state, exact scope, preserved data, cascade, blockers,
irreversibility, and local-only deletion limits from a fresh authorized representation. Opening the dialog starts an
initial read. High-impact account and course deletion still require exact username or course-name entry.

Activating the final confirmation does not dispatch the mutation directly. It disables final controls and immediately
re-reads the target through its authoritative operation. Dispatch occurs only if that latest representation has the same
target identity, action meaning, state, cascade, preserved-data statement, blocker set, account, scope, route, and
security epoch as the reviewed confirmation. This reread detects known change but does not close the race before
mutation.

BCG-014 applies only to invitation Revoke/Delete faulty, permanent role grant, course-supervisor removal, membership
removal, mentor removal, account deletion, and course deletion. Each must carry a server-defined version or precondition
that atomically binds execution to the exact reviewed target state and action meaning, or use a distinct operation whose
meaning cannot change with target state. A precondition failure is changed state: do not mutate, clear confirmation
input, fetch a fresh representation, and require a new review and confirmation. No invitation Revoke may become
physical Delete between review and execution. Until `BCG-014` closes, only these controls remain release-blocked by it;
a second GET, short delay, disabled UI, or client comparison is not an atomic substitute.

If any compared value changes, clear the typed exact-name confirmation and other local confirmation input, replace the
dialog with the new review state when still authorized, and require the user to review and enter confirmation again. On
denial or `404`, close the dialog, drop protected copy, and route to a freshly authorized parent or Home. Never
reinterpret a Revoke confirmation as Delete, or retain confirmation across a new target version. Backend atomic
authorization and state checks remain authoritative. Only the original definitive success response removes the item or
shows its cascade.

Definitive role-grant success retains the account detail, and definitive invitation revocation retains the invitation
detail. Course-supervisor, membership, and mentor removals update their retained parent and relationship state in place.
Only definitive physical deletion of a target resource performs terminal teardown and automatic safe navigation.

If a destructive response is lost, show outcome unknown and never replay automatically. Re-read the target. If it is
still available, say the action was not confirmed and permit only a completely new revalidated confirmation. If it is
unavailable, perform terminal teardown and say only that the item is no longer available; an existence-hiding result
cannot prove this mutation succeeded and must not show deletion-success or cascade copy.

Backend dependencies: `BCG-006` owns state-dependent invitation delivery truth, `BCG-008` owns account target reads and
eligibility, `BCG-009` owns MFA-factor identity and action eligibility, `BCG-010` owns MFA-reset mutations and
reconciliation, `BCG-011` owns course readiness and activation eligibility, and `BCG-012` owns tutoring action
eligibility. A destructive control governed by one of these entries remains behind its blocker rather than discovering
target state through the mutation. `BCG-014` separately owns atomic binding between reviewed state and mutation
execution for its named inventory only. Other mutations remain governed by their own contracts and are not blocked by
BCG-014.

### Dialog Negative Tests

- Change target state, blockers, assignment, invitation status, or account in another tab while the dialog is open;
  activate final confirmation and assert an immediate target read occurs before any mutation. Changed data clears typed
  confirmation and requires a new review without dispatch.
- Change a pending invitation to faulty and assert a displayed Revoke action never becomes a physical Delete request.
- Return conflict, denial, `404`, timeout, and ambiguous failure; assert no optimistic removal or success copy.
- Lose a committed destructive response and return existence-hiding unavailable on reconciliation; assert terminal
  unavailable copy only, with no deletion-success, cascade, or automatic replay claim.
- Verify modal title and description, inert background, deterministic initial focus, Tab containment, visible Cancel,
  Escape policy, and focus fallback when the invoker disappears.

## Existence-Hiding Presentation

For each existence-hiding operation, map all unknown, out-of-scope, ineligible, revoked, faulty, accepted, banned, and
throttled causes grouped by the backend contract to one fixed localized presentation. Within a locale, rendered copy,
heading, status role, available actions, focus target, retained-input policy, URL, title, breadcrumb, announcement, and
coarse waiting treatment must be identical. Never interpolate a cached person, course, material, invitation, or session
name into this copy.

Clear stale protected identity before rendering the safe result. Raw technical error disclosure follows the explicit
Product Owner decision above and therefore depends on the backend returning the same neutral body for hidden causes.
Do not infer cause from timing, cache state, prior navigation, response size, or whether a resource was visible earlier.

### Existence-Hiding Negative Tests

- For every launch locale, compare semantic DOM, accessibility tree, focus, actions, retained fields, title, URL,
  breadcrumbs, announcements, and bounded loading presentation across every hidden cause.
- Test direct probing and authorization loss after cached access; assert the result contains no stale identity.
- Verify password recovery always uses the same completion surface and does not expose `Retry-After` for suppressed
  account or identifier throttling.

## Clipboard and Print Boundaries

Copy is always an explicit, visibly labelled user action. Copy only the visible object-specific value or meaningful
plain text; never include hidden metadata, IDs, markup, headers, URLs, or adjacent protected state. Announce one
concise success or failure without moving focus and reset feedback so later activations announce again. Never copy
automatically.

Protected application content is suppressed by the default print stylesheet. Only an explicitly approved print surface
may opt in. Recovery-code print output contains the codes and essential storage warning only: no account identity,
protected navigation, page URL, token, timestamp tied to a person, or unrelated content. The user must confirm printer
and shared-device risk before opening print. Printing never starts automatically. These guarantees cover only the
application-authored print DOM and CSS. Before print, use a neutral document title and a content-free cleaned live URL.
Warn that browser print settings may independently add the URL, title, date, page numbers, headers, or footers and that
MIA cannot suppress those browser-authored fields.

Warn before sensitive bulk copy and all recovery-code copy or print that MIA cannot clear the OS clipboard, clipboard
history, screenshots, browser print preview, spooler, printer memory, tray, or paper. Never claim teardown removed those
external copies.

### Clipboard and Print Negative Tests

- Inspect clipboard payloads for each copy control and assert exact visible scope with no hidden metadata or markup.
- Deny clipboard permission and assert one accessible failure, stable focus, and no alternate secret exposure.
- Print every protected route and assert blank or neutral protected content except approved recovery-code output.
- Inspect recovery-code application-authored print DOM and CSS for identity, URL, header, footer, and unrelated data.
- Test supported-browser native print defaults separately, verify the neutral title and cleaned live URL, and record any
  browser-added headers or footers without treating them as frontend-controlled output.

## Test and Diagnostic Secret Hygiene

Automated tests use synthetic, non-production fixtures only and never call paid or production providers. Secret-shaped
fixtures are generated per test, are not committed, and are referenced in assertions by labels or one-way test-only
fingerprints rather than literal values. Test names, snapshots, golden files, diffs, failure messages, console capture,
HAR files, traces, videos, screenshots, coverage artifacts, and CI output must contain no fixture secret or protected
body.

Disable automatic artifact capture for token, password, MFA, recovery-code, raw-error, private-content, and download
tests. If debugging requires a local artifact, use sanitized fixtures, keep it outside version control, and delete it
before completion. Network mocks and request assertions must redact headers and bodies before a failure can print them.

### Secret-Hygiene Negative Tests

- Deliberately fail each secret-bearing test and scan all process output and generated artifacts for its unique marker;
  the scan must find none.
- Assert repository fixtures, snapshots, and browser-storage seeds contain no real credential, production URL token,
  personal record, provider key, or provider payload.
- Assert global logging and test reporters receive redacted summaries rather than request, response, exception, or DOM
  objects from sensitive flows.

## Release Gate

Release fails if any rule above is untested, any negative test exposes protected data, any critical scenario can render
before authorization, or any referenced backend dependency remains open in `BACKEND-CONTRACT-GAPS.md`. Passing visual
checks is not evidence of request minimization, cache isolation, teardown, or secret containment; tests must inspect
network activity, retained client state, browser lifecycle behavior, and generated artifacts.

The final evidence set must identify the tested frontend revision, backend/OpenAPI revision, browser version, locale,
text-size mode, relevant account and scope fixtures, and result without recording secrets or protected content.
