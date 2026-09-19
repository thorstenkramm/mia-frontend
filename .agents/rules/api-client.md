# Calling the backend

The frontend is a **client** of the MIA API. The backend's own rule, `mia/.agents/rules/json-api.md`, states what the
server must emit; this rule states what the client must send, may rely on, and must handle. When the two disagree, the
implemented OpenAPI description in `mia/api-doc/openapi.yaml` wins.

## The contract owns the transport

The implemented OpenAPI 3.2 contract owns paths, methods, request and response schemas, relationships, media types,
pagination links, status codes, stable error codes, security, CSRF requirements, and request bounds.

- Never guess unresolved transport. If a required operation or field is absent, the work is **blocked on OpenAPI**, not
  on a client-side assumption or compatibility layer.
- Silence is unresolved, not permission to assume.
- Never substitute cookie inspection, a guessed route, denial probing, collection enumeration, nullable-field
  inference, mutation probing, stale client state, or a trial request for the contract.
- Check `BACKEND-CONTRACT-GAPS.md` before building against an operation. An open entry blocks the work that needs it.

## Documents and media types

- JSON resources use JSON:API (`application/vnd.api+json`) for both success and error documents. Send it exactly, with
  no media-type parameters — a `charset` parameter earns a `415`.
- A success document has top-level `data`; an error document has top-level `errors`. Never both.
- Resource types are plural kebab-case. Attribute names are snake_case. Map to frontend naming at the boundary, once.
- An empty collection is `data: []`, never `null`.
- Tutoring streams over SSE. Generated speech is retrieved as `audio/mpeg`.
- **Branch on HTTP status and `Content-Type` before parsing.** An operation that can return either JSON state or binary
  must not assume which it got.
- Download media type and filename come from OpenAPI and the backend's attachment disposition. Never infer a trusted
  type or filename from route data.

## Identity in requests

- Never send a client-generated resource ID on create. The server assigns every ID.
- Every PATCH document includes `type` and a non-empty `id` exactly matching the path resource. For the `users/me`
  singleton alias, the request ID is the authenticated account ID, not the literal string `me`.
- Canonical routes have no trailing slash. A trailing-slash variant returns `404`; do not generate one.

## CSRF and unsafe requests

- Read the current readable CSRF cookie **immediately before every unsafe dispatch** and send it only in
  `X-CSRF-Token`. Never retain a copied CSRF value in normalized state.
- Serialize login-stage mutations. After login, logout, MFA completion, password replacement, or another rotating
  transition, invalidate queued work created under the old token and rediscover session and CSRF state before
  permitting another mutation.
- Never read an HttpOnly cookie. It is not possible and attempting it is a review failure.

## Retries — the absolute rule

**No unsafe request is ever replayed automatically.** Not after timeout, network loss, abort, `401`, `403`,
`csrf_invalid`, tab return, or token rotation. Request-ID idempotency creates no exception.

- A generic retry policy for `GET` must not be inheritable by `POST`, `PATCH`, or `DELETE` through an API-client
  default. Structure the client so this is impossible, not merely discouraged.
- Do not install a retry library that retries by method class.
- After an ambiguous outcome, first reconcile authoritative state. An exact retry is permitted only after explicit user
  activation, while the same page still holds the immutable request ID and payload, and session, account, capability,
  scope, route, and security epochs all still match.
- Label it `Retry exact attempt`. Never Resume, Continue, or automatic recovery. Editing stays disabled while the
  outcome is unknown.

Naming discipline for retry-shaped actions:

- `Cancel` exists only before dispatch and destroys the unused request ID. At or after dispatch the action is
  `Stop waiting`, which aborts the local wait and enters outcome-unknown without claiming anything was cancelled.
- `Retry` is only for a definitive pre-dispatch or rejected state. The duplicate-risk upload action is
  `Upload as a new file`, never `Retry`.
- There is no generic job retry. Material retry is `Finalize and process`; tutor, speech, and summary retries are
  explicit feature actions.

## Request IDs

- Session creation and message submission bind one canonical request ID to one immutable semantic payload immediately
  before first dispatch.
- A different payload gets a new ID only after the earlier outcome is definitive, or the user explicitly abandoned the
  unknown attempt after authoritative reconciliation.
- Uploads have **no** request-ID or correlation contract. A lost upload response becomes a local
  `Upload outcome unknown` row and triggers an authoritative file-list read. Never match that row to a server file by
  filename, size, media type, order, or timestamp, and never retry, delete, or finalize automatically.
- Request IDs and message bodies never enter browser storage, so they are absent after reload. That is correct
  behavior, not a bug to work around.

## Pagination

- Use `page[limit]` and `page[offset]`. Defaults are limit 25, offset 0; maximums are limit 100, offset 10,000.
- Follow the OpenAPI navigation links. **Never fabricate a total** and never render an invented count.
- Use only OpenAPI-supported filters, sorts, and actions.
- Pagination is never a source of truth for state. Idle status, queue capacity, active response identity, and finish
  eligibility cannot be proven from paginated transcript rows. Absence from a loaded page does not prove absence.

## Errors

- `401` means sign-in loss. `403` and `404` on an existence-hidden resource mean the fixed safe presentation — clear
  protected content first, then route safely.
- Map stable error codes to localized explanations. Known codes include `csrf_invalid`, `tutoring_work_busy`,
  `tutoring_busy`, `tutoring_active_session`, and `course_activation_unavailable`.
- `429` may carry `Retry-After`. Do **not** surface it for suppressed account or identifier throttling, where exposing
  it would reveal existence.

### The raw disclosure contract

A retained Product Owner decision requires every backend error to show a localized plain-language explanation plus a
collapsed technical disclosure containing the exact HTTP status and the complete raw response body.

- "Exact" means the untouched string from calling `Response.text()` **exactly once** on the original response. Do not
  parse, stringify, normalize, trim, redact, repair, re-encode, normalize line endings, or substitute text.
- Render it only as **escaped inert text** in a selectable region using `white-space: pre-wrap` and
  `overflow-wrap: anywhere`. Never `innerHTML`, Markdown, link detection, syntax highlighting, or DOM parsing.
- Visual wrapping must not change the string used for selection or copy, and must not cause page-level horizontal
  scrolling at 320 effective CSS pixels.
- The disclosure object may contain **only** the numeric status and the body text. Never headers, cookies,
  authorization or CSRF values, fragment tokens, MFA proofs, request bodies, URLs, client state, stack traces, provider
  names, or provider payloads. Do not enrich it from an exception, request, or SDK object.
- It is collapsed by default, excluded from live announcements, and left untranslated.

## Reads, polling, and SSE

- **There is no continuous global polling.** Background activity must never keep the backend idle session alive.
- Surface entry and mutation completion may start their required reads. Tab return, online, focus, visibility,
  `pageshow`, and transport loss only mark revalidation needed; they send no authenticated request.
- MIA sends no ordinary workflow notifications. No hidden polling, badge, timer request, or keepalive may simulate
  delivery. A state change is claimed only after a permitted read.
- SSE reconnect is bounded: exactly three user-activated opening attempts after the failed connection, gated by 1, 2,
  and 4 second availability delays with no jitter. Delay completion never opens an EventSource. Only one timer and one
  connection may exist. A valid snapshot resets the bound; socket open and heartbeat do not. `Try now` during a pending
  delay cancels that timer, consumes its scheduled attempt, and opens at most one replacement after non-refreshing access
  checks; it neither resets the bound nor opens a second `EventSource`.
- A snapshot atomically replaces the response data model. It never appends to old content. Heartbeats change no state.
- Fence the epoch without applying the event on malformed JSON, unknown event type, wrong response identity, a delta
  before a valid snapshot, conflicting duplicates, regressive state, or illegal ordering. Ignore events after terminal
  and exact duplicate event IDs.
- `online`, visibility, focus, and pageshow coalesce as revalidation-needed signals only. Explicit Refresh or Try now
  starts the order: non-refreshing auth session, account capability and scope, route resource, tutoring work state,
  page-local draft reveal, then at most one SSE epoch.
- Transport loss never opens a replacement authenticated `EventSource` until the user activates Try now or Continue
  working.
- Continue working is one user-initiated operation. Its success response returns the refreshed idle deadline and
  unchanged absolute deadline together; no second automatic deadline read follows. It may then continue through
  non-refreshing dependent reads. Outcome unknown retains the privacy shield and permits only explicit Refresh
  reconciliation or an explicit Retry Continue working.

## Optimistic updates are forbidden

Render only authoritative persisted or streamed state. A destructive mutation updates the interface only after a
definitive backend success. Only the original definitive success response removes an item or shows its cascade. A lost
response enters outcome-unknown; it never optimistically removes anything and never shows success copy.

Do not infer success from request-completion ambiguity, invent totals, expose unsupported filters, or map distinct
domain states into one label.

## Instants and time zones

- Every API instant is RFC 3339 UTC with a `Z` suffix and six fractional digits. Send UTC; never send a numeric offset.
- Display instants in the viewer's preferred IANA time zone, with visible zone context where ambiguity matters.
- Local-time entry shows the IANA zone and resolved offset, rejects daylight-saving gaps, requires an explicit choice
  between both numeric UTC offsets for overlaps, freezes the reviewed instant, and reconfirms if the authoritative zone
  changes before submission.
- A saved one-time appointment keeps the same instant when a profile time zone later changes. Existing appointments are
  reformatted, not moved.
- Absent optional instants arrive as `null`.

## Fetching the least data

- Never overfetch and hide. Visibility rules apply to requests and retained state, not only to pixels. A field the user
  may not see must not enter network traffic, memory, caches, the accessibility tree, or the DOM.
- Never speculatively prefetch a protected resource.
- A supervisor viewing an **active** tutoring session may request only the authorized status representation. Do not
  call transcript, used-material, private-content, or summary endpoints until authoritative state and OpenAPI permit
  that exact operation after completion.
- Mentor routes use only mentor-scoped minimal identity, avatar, and mentoring operations. They must not call generic
  user detail, transcript, summary, used-material, private-material, generated-brief, roster, or supervisor-only
  endpoints.
- Shared components accept already-minimized view models, not broad API resources.
