---
title: Supervisor creates material and uploads files
story: 4-3-supervisor-creates-material-and-uploads-files
created: 2026-10-08
phase: fix
status: fixed-pending-gate-regression-verification
baseline_commit: 3c04d84976f6c0bc5d53228d2cc8d15683155e55
backend_commit: 63c99925e5995fe2e2467f4f894976dfd4c0d297
prepare_model: openai/gpt-6.1-sol#high
---

# Story 4.3 — Course-wide material drafts and native-picker upload

## Disposition and boundary

This is a bounded preparation specification, not implementation authorization. Current `epics.md` Story 4.3 owns scope.
Preparation is **ready for implementation**: the owner reversed B1's whole-story deferral later on 2026-10-08 and approved
hardcoded documented-contract limits/formats with advisory client checks and authoritative server validation. BCG-018 is
now a non-blocking discovery follow-up; BCG-019's generic authorized list/detail exception remains settled. The existing
create/upload/file operations are real; missing upload correlation remains explicitly non-blocking. No open owner decision
or story prerequisite remains. This dispatch records decisions only: no application code, checkpoint, tracker, Foundation,
dependency or git index changes. It updates this spec, the gap ledger, tmp report and the requested backend RFC; application
implementation follows separately. Neither backend discovery nor a Foundation amendment is a prerequisite for that phase.

In scope for the separately dispatched implementation: assigned-supervisor course-wide **file-backed** draft creation; scoped material
list/detail using the accepted generic contract with authoritative scope labels and no private-material actions;
native multi-file selection; one-file serialized upload queue; real progress and file-specific failure;
mixed-format correction without destroying the saved draft; authoritative persisted-file review on the files surface;
interruption reconciliation and deliberate new attempts; draft-file removal by exact server ID; preparation-hub material/upload
entry. Coverage is the course-wide upload/draft portion of FFR-401..404 and AD-14, not the entirety of those requirements.

Excluded: student-private workflows, drag/drop (8.2), link-only creation, external-link activation/preview, source downloads,
inline previews/object URLs, whole-material deletion, finalization, processing/jobs views, brief rendering/editing and approval
(4.4), activation (4.5), generic job retry, provider calls, local document parsing/OCR, MFA expansion, new runtime packages,
global stores/router/controller rewrites, speculative backend changes. List/detail can truthfully display existing processing,
ready, failed and separate approval labels without exposing the later story's actions or rendering its brief.

## Baseline, tooling and preserved work

Frontend HEAD exactly matches the supplied full baseline; Stories 4.1/4.2 are committed prerequisites. The index was empty.
All observed dirty paths are bookkeeping/workflow changes, with no application/spec overlap. The checkpoint abbreviates prior
checkpoint dirt and omits the now-dirty 4.2 checkpoint; it is recognized solver bookkeeping, preserved without intervention.
The exhaustive baseline paths are in `tmp/agent-execution/4-3-supervisor-creates-material-and-uploads-files/prepare-report.json`.
No stash, revert, stage or commit occurred. Backend was inspected read-only at the SHA in frontmatter.

Node 24.21.0/npm 11.19.0; `node_modules` exists. `npm ls --depth=0 --json` succeeds: all 45 declared packages match exact
pins, no problems. Playwright 1.63.0 bundled Chromium exists and launches/closes headlessly; browser version 153.0.8010.12.
Licensed Tailwind Plus version `2026-09-13-083323` exists; exact light v4 sources below were read using its skill. No installs
were necessary. The skill's historical stack sentence does not supersede React 19.3/Tailwind 4.3 repository requirements.

Actual supplied runtime model: `openai/gpt-6.1-sol#high`. Catalog confirms active Sol/Astra and `high` variants, configured
Mistral Medium 2604 `high`, and owner-selected fallback `kimi-code/k3` with `low/high/max`. For this batch Kimi supersedes the
protocol's default Mistral fallback on observed 429; stop/report immediately rather than retrying. Catalog availability is not
quota evidence. No paid model probe, orchestration skill or nested agent was used.

## Binding sources

UX root: `_bmad-output/planning-artifacts/ux-designs/ux-mia-frontend-2026-09-12/`.

- `FRONTEND-PRD-FOUNDATION.md` Material and Files, FFR-401..405, FFR-956; read with BCG-018's dated documented-limit exception
  for this milestone's pre-picker disclosure. Foundation itself is unchanged.
- `EXPERIENCE.md` Flow 2 and technical-readiness/educational-approval separation.
- `ROUTE-INVENTORY.md` Course Material (`601–684`); `SURFACE-STATE-MATRIX.md` course-material rows (`322–338`), G/L/F/D/U/W.
- `FRONTEND-STATE-MACHINES.md` machines listed below; `ACCESSIBILITY-ACCEPTANCE.md` AC-014 in full and CP-03 subset.
- `DESIGN.md` exact licensed binding/default inheritance and accessibility deltas; no new theme or dark mode.
- `SECURITY-PRIVACY-ACCEPTANCE.md` Ambiguous Mutation Reconciliation, protected mount, shared-device teardown, scope caches,
  Existence-Hiding, No-Unsafe-Replay, Ambiguous-Mutation, Teardown, Cache and Secret-Hygiene negative tests.
- `BACKEND-CONTRACT-GAPS.md` BCG-001/003/005/007/011/014/018 and non-blocking BCG-019 owner exception/follow-up.
- Architecture spine AD-14, AD-7 and AD-1; backend product `mia/docs/product-requirements.md` Material, Upload limits,
  Malware boundary, Accepted upload formats, Copyright responsibility and External links.

These sources retain authority; this spec maps implementation obligations, not a second maintained product/schema contract.

## Exact transport verified

Path references are from `mia/api-doc/openapi.yaml:135–152`; operations are in `paths/materials.yaml`. JSON successes/errors use
exact `application/vnd.api+json`; global OpenAPI policy promises no-store for every response, including bodyless and errors.
All reads require `sessionCookie`; all mutations require `sessionCookie` plus `csrfToken` (`X-CSRF-Token`). No upload request
ID, correlation header, resumable/chunk transport, or conditional upload validator exists.

### Required operations

- `listMaterials`: GET `/api/v1/courses/{course_id}/materials`, 200 `MaterialCollectionDocument`; only CourseID/PageLimit/
  PageOffset parameters. Defaults 25/0, maximum 100/10,000, `meta.has_more` and optional prev/next links; no total. Errors
  401/403/404/406/422; missing/out-of-scope course is `material_not_found`, invalid pagination `material_invalid`.
  Owner accepts the generic all-visible authorized representation under BCG-019: label scope on every returned row,
  keep private rows visible without private-material actions, and do not claim a server-filtered course-wide collection.
- `createMaterial`: POST same collection, `MaterialCreateRequestDocument`, 201 `MaterialDocument` draft. Send
  `data.type=materials`, no client ID, file branch `FileMaterialAttributes`: name, `scope=course-wide`, kind one of
  `text-book/exam/worksheet`, format one of `pdf/jpeg/png/text/markdown/docx`; omit optional external_url/brief.
  Name bounds are `MaterialName` (200 code points, 800 UTF-8 bytes after trimming); server normalization remains authoritative.
  Errors 400/401/403/404/406/409/413/415/422. Codes include `material_name_taken`, `material_invalid`, `material_not_found`,
  `csrf_invalid`, `auth_password_change_required`. Definitive validated 201 alone grants created identity/navigation.
- `getMaterial`: GET `/api/v1/materials/{id}`, 200 `MaterialDocument`; 401/403/404/406. Validate opaque material identity,
  `relationships.course.data` against route course before rendering. Generic authorized read is accepted under BCG-019;
  show authoritative scope, and require `scope=course-wide` before dependent upload/file-management actions. Private material
  receives no private-material actions or dependent private-file/brief requests; cross-course route identity still fails closed.
- `listMaterialFiles`: GET `/api/v1/materials/{id}/files`, 200 `MaterialFileListDocument`; complete unpaginated bounded list,
  **no query parameters**, no pagination metadata. 400 rejects any query (`malformed_request`); 401/403/404/406 otherwise.
- `uploadMaterialFile`: POST same files path, **multipart/form-data**, `MaterialFileUploadRequest` containing exactly one
  binary part named `file`, no additional fields. Browser owns multipart boundary; never set JSON Content-Type or a manual
  multipart boundary. 201 `MaterialFileDocument` with server ID and material relationship is the only uploaded confirmation.
  Errors 401/403/404/409/422; `material_invalid_state` covers state/format conflicts; `material_invalid` covers shape,
  filename/content/configured-limit rejection. Do not remap these to guessed 413/415 operation outcomes.
- `deleteMaterialFile`: DELETE `/api/v1/material-files/{id}`, bodyless definitive 204 only; 401/403/404/406/409, including
  `material_invalid_state`. This is the exact-ID draft-file removal needed by machine 10; no whole-material deletion.
  No If-Match/ETag precondition is declared for this fixed-effect operation.
- Existing `getCourse`: GET `/api/v1/courses/{id}`, `CourseDocument` with viewer-safe `CourseReadiness`; use existing
  `getCoursePreparation` for course admission/hub reads, not a new `/readiness` endpoint. It is not a material count formula.

### Schemas and media

Request references: `schemas/requests/requests.yaml#/MaterialCreateRequestDocument`, `#/FileMaterialAttributes`, `#/MaterialName`,
`#/MaterialFileUploadRequest`. Resources: `schemas/resources/resources.yaml#/Material`, `#/MaterialDocument`,
`#/MaterialCollectionDocument`, `#/MaterialFile`, `#/MaterialFileDocument`, `#/MaterialFileListDocument`, `#/ToOneCourse`,
`#/ToOneMaterial`; pagination/error documents are in `schemas/json-api/documents.yaml`. `Material` has independent
`state=draft/processing/ready/failed` and `approved`; `MaterialFile` has original_filename, media_type, size_bytes, page_count,
state, failure_code and its material relationship. Preserve nulls; validate once at API boundary and minimize inward props.

Product accepted extensions: `.pdf`, `.jpg/.jpeg`, `.png`, `.txt`, `.md`, `.docx`; OpenAPI file-format enum and source-download
media enumerate PDF/JPEG/PNG/plain text/Markdown/OOXML DOCX. Browser `File.type`/extension are advisory, never signature
authority. An empty browser media type is not by itself proof of an invalid supported file. Macro/encrypted/active-content
validation belongs to the backend. Format is chosen at draft creation and immutable; every incompatible selected file has
its own removable rejection row. Source-download operations were checked only as media evidence; do not dispatch them here.

### Checked but deferred operations

`finalizeMaterial` POST `/api/v1/materials/{id}/finalizations` (200 MaterialDocument, no body), `listMaterialJobs`,
`updateMaterialBrief`, `approveMaterial`, `revokeMaterialApproval`, `deleteMaterial`, `getMaterialFile`,
`downloadMaterialFile` and `downloadMaterialContent` exist but are not implemented by 4.3. Finalization handoff in 4.4 must
honor accepted-current-list and state eligibility; no disabled fake Finalize button or dead processing/brief link is needed.

## Blocking questions and BCG reconciliation

### B1 / BCG-018 — Reversed deferral; documented-limit exception unblocks implementation

OpenAPI's only upload-limit clause (`MaterialFileUploadRequest.file.description`) says limits are operator-configured within
hard caps. No operation/schema provides current file/material bytes, file count, material pages or decoded-image limits.
The product defaults/hard caps (`product-requirements.md:1050–1081`) are not discovered operator configuration: operators
may lower them or raise configurable defaults within caps. The discovery request remains valid, but is now non-blocking.

Decision history, **2026-10-08**: the owner first deferred the whole story, then **reversed that decision** and directed
implementation now using hardcoded supported formats and documented defaults/hard caps. The later decision supersedes the
deferral. BCG-018 now records a bounded milestone exception: disclose documented-contract limits before the native picker,
keep client checks advisory, and let definitive server rejection drive Rejected state. This matches machine 10's documented
contract clause; it is not a claim that the frontend knows current operator settings. No FFR-402/Foundation edit is made.

Backend RFC written: `mia/tmp/frontend-request-upload-limits-discovery-2026-10-08.md`. It requests authoritative current
formats/effective numeric limits with scope/security/media/no-store/errors/freshness and evidence. Adopt that transport
when delivered; do not invent its path/fields, probe limits or delay this approved milestone waiting for it.

### Exact pre-picker declaration and advisory checks

Declare these hardcoded **documented defaults and hard maxima**, visibly labelled as such, before selection. Explain that
operator settings may differ and the server validates each upload; never label these numbers “current server settings”.
All interface labels/unit/caveat copy is localized. One API contract owner in planned `materials.ts` exports the documented
limit/format metadata and advisory feedback; the UI and tests consume that owner, not duplicated catalog numeric policies.

- **File bytes:** 100 MiB documented default (104,857,600 bytes), 512 MiB hard maximum (536,870,912 bytes).
- **Combined material bytes:** 200 MiB documented default (209,715,200 bytes), 512 MiB hard maximum (536,870,912 bytes).
- **Material pages:** 1,000 documented default, 2,000 hard maximum. Each PDF page and each JPEG/PNG file counts as one page;
  DOCX, UTF-8 text and Markdown are non-paged and still subject to byte/expansion bounds.
- **Source-file count:** 200 documented default and fixed hard maximum; operators may lower the effective count.
- **JPEG/PNG decoded images:** 40 megapixels documented default, 100 megapixels hard maximum per image; width and height
  each at most 20,000 pixels.
- **DOCX archive bounds:** at most 10,000 entries, 512 MiB total expanded bytes, 100 MiB per expanded entry, and maximum
  100:1 expansion ratio per entry. These are archive-inspection constraints enforced by the backend, not frontend parsing.
- **Filename contract:** normalized NFC UTF-8 basename at most 255 Unicode code points and 1 KiB; backend strips path
  components/trims whitespace and rejects empty names, NUL/controls/bidi controls and separators. Display advisory guidance,
  but do not rewrite the user's file or invent trusted names.
- **Accepted formats and picker mapping:** PDF `.pdf` / `application/pdf`; JPEG `.jpg,.jpeg` / `image/jpeg`; PNG `.png` /
  `image/png`; UTF-8 plain text `.txt` / `text/plain`; UTF-8 Markdown `.md` / `text/markdown`; macro-free Office Open XML
  `.docx` / `application/vnd.openxmlformats-officedocument.wordprocessingml.document`. Draft format is exactly one of
  `pdf/jpeg/png/text/markdown/docx`; picker `accept` narrows to that format, with multiple selection supported.

No archives other than supported DOCX packaging, executable/HTML/SVG/macro-enabled Office/encrypted or password-protected
PDF/DOCX are accepted. State the need for an unprotected copy; do not request a document password. Extension/File.type
checks are advisory content indicators, never signature validation. Existing known mixed-format queue prevention remains.

Numeric default comparisons produce associated advisory warnings, **not** definitive upload rejection or a silent cap at
defaults: a file above 100 MiB may be permitted by a raised backend setting. Hard-cap/count guidance is also advisory;
server rejection determines the actual dispatched row's Rejected state. Client feedback can use selected File.size and
current persisted file metadata for known byte/count aggregates but cannot prove effective limits or upload acceptance.
Do not read/decode source bodies to estimate PDF pages, image pixels or DOCX expansion; display those documented constraints
and rely on server validation. Preserve once-only dispatch/no-unsafe-replay behavior for every definitive rejection.

### B2 / BCG-019 — Settled for eventual resume by owner exception; backend follow-up

`listMaterials` permits only pagination, returns all materials visible to the caller, and uses full `Material` (including
brief). The read-only backend corroboration `internal/material/material.go:130–166` confirms an assigned supervisor's SQL
branch returns both scopes; `store.go:24–38` likewise permits generic detail for private material. There is no course-wide
filter or requested-course/scope parameter on detail. This is not a missing collection endpoint, nor permission to guess a
`filter[scope]`, enumerate IDs or filter private responses into a supposedly server-filtered course-wide view.

Owner decision, **2026-10-08: accept generic listMaterials/getMaterial and record follow-up**. The assigned supervisor is
authorized for both scopes. Render every returned row with its authoritative scope label; private rows receive no row
actions, including detail links/private-material controls (deferred to 8.2). No client-side hiding of unauthorized data or
private-row filtering occurs.
This explicitly accepts the broader authorized network representation for this milestone against the least-data/privacy
contract; it is not a general privacy-policy waiver or a broader authorization grant. Route course/assignment gates remain.
Request server-enforced course-wide filtering/minimized list/detail projection as backend follow-up **BCG-019**, outside
the counted Release Blockers. B2 remains settled; the later same-day B1 exception unblocks the whole story without waiting
for either backend follow-up. This documentation dispatch still does not implement application code.

### Existing ledger entries

- BCG-001: current auth/session plus explicit Continue-only renewal substrate is already implemented. Reuse its ordered,
  non-refreshing read and single-dispatch mutation owners; ordinary XHR must not become keepalive. Broader lifecycle/logout
  release evidence stays open; no authentication policy re-derivation or new denial probing.
- BCG-003: current full capability catalog has `courses.supervise` and complete course_ids; existing 4.1/4.2 assignment gate
  is reusable. Product grants assigned supervisors management of course-wide material. Role/admin flags or student membership
  do not authorize this action; backend reauthorizes every request. BCG-019 accepts the broader authorized representation
  with truthful scope labels/no private actions, not inferred scope or new privileges.
- BCG-005: historical “no no-store header” claim is superseded for inspected material/course successes, bodyless deletion and
  errors by current operation headers and OpenAPI global policy. Reuse existing no-store/teardown owners; full shared-device,
  image/download/proxy release evidence remains open, with downloads excluded here.
- BCG-007: current global/ErrorDocument contracts promise complete valid UTF-8 safe-registry errors bounded to 65,536 bytes;
  existing exact inert TechnicalErrorDisclosure remains the owner. XHR must feed original response bytes through the same
  decoding boundary, not stringify a parsed error. Broad intermediary/release evidence remains open; no ledger-wide closure.
- BCG-011: retain the canonical 4.2 hub/read/edit decision. Add an ordinary implemented material/upload entry, not an
  activation/start action or client readiness computation. Existing hub entry/return reads remain authoritative; no material
  response includes course readiness, so never synthesize it from file counts. Qualifying-material blocker-link expansion
  beyond an ordinary hub entry is not required here; keep existing safe field-only blocker mapping until explicitly approved.
- BCG-014: fixed-effect exact-ID file deletion is outside its state-dependent effect-binding requirement; transport declares
  no If-Match. Still confirm the exact persisted row, allow removal only in draft, never delete an unknown local attempt.
- BCG-018: discovery still absent, but its later 2026-10-08 documented-contract/advisory-check exception settles B1 and removes
  it from counted release blockers. Hardcoded declarations are not effective operator discovery; adopt the requested transport later.
- Ledger Non-Blocking OpenAPI Details expressly accepts uncorrelated upload ambiguity and page-memory-only queues. Missing
  correlation is **not** B1/B2, no new request-ID or resumable API is required.

The original grouped Pushover notification was delivered via the mandated helper (exit 0), with exact `interaction needed:`
prefix. Both dispositions and the later B1 reversal on 2026-10-08 are recorded in BCG-018/019. No unanswered owner decision
remains and no duplicate notification was sent. No unknown overlapping edit was found. Next action is the separately
dispatched implementation of this ready spec; backend BCG-018 delivery is a follow-up, not a dependency.

## Routes, resource gates and surface composition

Register only canonical inventory paths, with opaque backend IDs, no trailing slash/aliases/content-bearing URL state:

- `/prepare/courses/:courseId/materials`: Course materials; parent preparation hub, fallback hub.
- `/prepare/courses/:courseId/materials/new`: Create course material; parent/list fallback; confirmed file-backed 201 goes
  to its canonical files path, never a client-generated ID.
- `/prepare/courses/:courseId/materials/:materialId`: Course material; parent/list fallback; course loss falls back through
  fresh authorized preparation scope/Home. Render separate technical/approval state and persisted draft continuation.
- `/prepare/courses/:courseId/materials/:materialId/files`: Course material files; parent detail; list/detail safe fallback
  after clearing upload-local state. **Review is an in-page section of this files route**. Inventory has no course-material
  `/review` route; do not invent one from the private-material route family.

Gate order: authoritative authenticated stage → current available course supervision + exact assigned course ID → admitted
course resource → admitted material identity/course/scope for addressed routes → dependent complete files. Until all
required gates pass render neutral Checking access, neutral MIA title, no protected shell/name/prefetch. New/list resource
admission uses the authorized course. No generic all-course course list or roles-as-authorization. On eventual resumption,
use BCG-019's accepted generic authorized material representation, label scope and expose no private-material actions.
Pre-picker limits are the BCG-018 hardcoded documented defaults/caps, not an API read/loading gate; do not issue a guessed
limits request or disable the picker waiting for missing discovery transport. Server upload validation remains authoritative.

Use existing route admission, resource-host pattern, ApplicationShell, parent links and route recovery owners; add a concrete
material resource host rather than generalizing every route. All dependent current-resource 403/404 hidden denials destroy
the entire admitted feature tree before a fixed localized unavailable result, including after Stop waiting. Do not let a
local wait-sequence check suppress a still-current resource denial. Late success/read/progress cannot reveal old data.
401/restricted-stage loss follows the existing shield/session owner. Raw technical body stays collapsed, inert and outside
announcements; no cached course/material/file identity in hidden-denial copy/title/focus/actions.

Hub entry links to material list and/or Create course material, only when working canonical surfaces exist. No future brief,
approval/activation links. Saved drafts are server records, discoverable on permitted list entry/reload/return; no browser
draft restoration. List pagination follows validated same-course operation links through existing collectionNavigation,
never fabricates totals or accepts arbitrary hrefs. Material files are complete, not paginated at transport.

## State-machine and transport design

### Ownership

AD-14 requires **XHR** in `platform/transfer`, not feature-owned fetch/upload code. Introduce a small session-bound upload
transfer owner, constructed beside existing MFA owner in `SessionProvider`; it receives the existing controller, uses
`runAuthenticatedMutation`, and registers the existing security teardown callback. No new coordinator/cookie parser/security
epoch owner. Registration order must abort transfer work before protected cache purge/UI notification (AD-7/AD-1).
Transfer scope includes only this upload transport, not speculative download/image/media infrastructure.

Immediately before the only XHR dispatch, the session owner acquires its existing shared request lease, rechecks current
authentication/scope/route/local attempt and reads fresh CSRF. The transfer sets same-origin POST, Accept JSON:API and
X-CSRF-Token, appends one File as `file` to FormData, and calls send once. Credentials stay same-origin; never follow an
untrusted URL or send to a foreign origin. Session settlement/lease tracking stays active until transport settles; Stop
waiting/abort is not proof of a cancelled server commit. Definitive sub-500 errors are rejected according to existing owner;
transport loss, timeout, stopped wait, malformed 201 or 5xx after dispatch are outcome unknown. Missing predispatch CSRF is
not-sent, never uploaded. No mutation retry library or queued work surviving token/security changes.

Use original XHR response bytes (`responseType=blob`) in a Response adapter carrying original numeric status and declared
media metadata into existing `parseJsonApiResponse`, which consumes text exactly once. This is one decoding adapter, **not**
another GET or a JSON parse/stringify transformation. Shared ApiHttpError/ApiProtocolError/ApiTransportError identity and
TechnicalErrorDisclosure remain unchanged; drop transient response blob/header references after handling. No object URL.
Callbacks are fenced by security epoch + route/material admission + local attempt generation, with explicit cancellation of
handlers/timers and one settlement on load/error/timeout/abort. Track local attempt identity separately from server file ID.

Progress is byte progress from XHR upload events, named/known only when lengthComputable. Refresh visible values promptly
and at least once per second while observed bytes move (FFR-956); do not fabricate values between events or claim success at
100%. Upload completion moves to Verifying; only validated 201 with exact relationship/identity becomes Uploaded. Unknown
progress uses static indeterminate text, not a fake percent/spinner pretending to know work. No progress polling/network timer.

On destroying security teardown, route departure, unmount, material denial/scope loss: stop admissions, abort owned XHR,
fence callbacks, drop File/FormData/request/response/error/queue/review references, clear input, retire announcements and
unregister subscriptions. Lifecycle shield/pagehide must stop new dispatch and hide/drop upload-local controls/handles before
BFCache; it does not issue reconciliation or restart work. Do not extend MFA's special masked-secret retention to file queues.
Provider teardown must dispose transfers even if React cleanup is delayed. No physical-memory-erasure/cancellation claims.

### Observable machines

- **1 and 9:** existing auth/ordered admission/security and lifecycle coalescing; covered return requires explicit Refresh.
- **10:** implement its exact Selected/Queued/Uploading/Verifying/Uploaded/Rejected/Outcome unknown/Queue paused/User review/
  Unknown abandonable/Unknown abandoned/List reviewable/List accepted/Upload as a new file/Remove chosen row/Frozen elsewhere
  states/transitions as discriminated unions. Only one upload in flight per material in this tab, in selection order.
- **11:** persisted Draft and read-only Processing/Failed/Ready unapproved/Ready approved/Approved link/Unavailable presentation;
  no processing/approval mutations. Only authoritative draft permits source upload/removal. Conflict freezes queue and rereads.
- **12:** reuse hub's approved authoritative-read subset only; no material-derived activation/new-session eligibility.
- **18:** dirty create form/local selected handles, guarded navigation, definitive create success and frozen unknown submission.
  Create has no request-ID/correlation contract: an uncertain create cannot be matched by name or guessed enumeration.
  Show unconfirmed state, explicit return to scoped list after deliberate abandonment; no automatic second create.
- **22:** exact persisted file deletion submitting/unknown/terminal handling; only original definitive 204 removes/confirms.
  Later reconciliation can display current list without attributing disappearance to that mutation; never replay/delete guessed row.
- **23/24:** entry/completion reads and explicit Refresh, last checked; no background polling, notifications or renewal.
- **28/29:** one existing announcement owner, upload per-file/state ledger and exact raw-error disclosure.
- **31:** native browser picker/memory/BFCache/print boundaries, no promise that browser/OS retained bytes can be erased.

No tutor request-ID, SSE, generic job-retry or full material-processing machine is implemented. Passing this story's subset
does not mark all these machines, CP-03, supported-browser accessibility or any BCG globally Pass.

### Queue, recovery and persisted review

Native labelled picker supports multiple files of the chosen supported material format, preceded by B1's exact documented
defaults/hard caps and operator-variation/advisory caveat above, same-format rule, and static malware/no-external-fetch caveats.
Queue rows have stable page-local IDs, selection order,
complete escaped filename, format, size, state, associated error and valid row actions. Distinguish duplicate filenames by
position and size, not as deduplication keys. File content is never read by frontend parsers or cached. No drag/drop handlers.

Before dispatch Cancel/Remove destroys only a local queued row. After dispatch action is Stop waiting, which enters unknown
without claiming cancellation. Unknown pauses all later dispatches. Transport loss only marks reconciliation needed: it must
not cause an authenticated read on its own, in accordance with the cross-cutting lifecycle rule. Explicit Reconcile activates
material then complete file-list reads in the current authorized epoch. Ordinary definitive mutation completion may perform
required reads. Do not conflate byte-send completion, response success, server file list and local queue state.

Keep a separate authoritative persisted-file region. Never match unknown attempt to a server row by name, size, media type,
ordering/timestamp or absence. After successful reconciliation offer Abandon unknown attempt and warned Upload as a new file;
the latter requires deliberate duplicate-risk acceptance, destroys/abandons the old local attempt and creates a new queued
attempt, never labelled Retry/Resume. Definitive rejection may offer correction/reselection or Retry only with valid current
draft/action state. Later queued handles may be cancelled; no implicit dispatch on focus/online/token rotation/read return.

Review includes only server-returned file IDs/metadata, not Selected/Queued/Uploading/Verifying/Rejected/Unknown rows.
After all unknowns are explicitly abandoned and no queue work is pending, Accept authoritative file list records the latest
successful material+complete-files read sequence. New list, selection edit, upload or removal invalidates acceptance. This
review stays within `/files`; 4.4 must consume/reestablish the current accepted sequence before offering explicit finalization.
Acceptance is page-memory only; reload loses it and every File/unknown row, renders only permitted server records, and requires
new review. Never invent a persistent “reviewed” field or claim old attempt outcome after reload.

Persisted draft removal uses an exact server file ID selected from the current complete list, with a scoped confirmation.
Keep row until definitive 204; on unknown retain unconfirmed presentation and permit explicit reconciliation. Never correlate
that removal to an unknown upload. Processing/ready conflict is frozen, not a retry loop. Whole material deletion is excluded.

## Presentation, localization and accessibility

Exact library bindings, all `v4/react-light.jsx`, version `2026-09-13-083323`, read in preparation:

- Draft form and native upload region: `Application UI > Forms > Form Layouts > Stacked`. Retain form/section/action anatomy;
  remove unrelated profile/photo/notification content. Replace Cover photo copy with visible pre-picker limits, same-format
  instructions and labelled native multi-file input. Remove drag/drop language/handlers; do not copy GIF/10MB placeholders.
- Name field: `Forms > Input Groups > Input with label and help text`; invalid state `Input with validation error`.
  Kind/format use the Stacked blueprint's native select anatomy with authoritative enum choices, not custom combobox behavior.
- Materials and local queue rows: `Lists > Stacked Lists > Narrow with actions`; remove avatars/email and truncation; wrap
  full filenames, position/size/status and accessible row actions, stack at narrow widths. No remote image placeholders.
- Persisted detail/review and file attachments: `Data Display > Description Lists > Left-aligned with inline actions`;
  remove unrelated applicant fields, replace Update/Remove with only valid actions, complete filenames instead of truncation.
- Known byte progress: `Navigation > Progress Bars > Progress bar`; omit fake workflow steps and blueprint's static percentage.
  Adapt to named native progress semantics and adjacent real-byte/status text; avoid dynamic style attributes/new CSP changes.
- Pagination reuse existing bound navigation treatment; selected source `Navigation > Pagination > Card footer with page buttons`
  must omit fabricated total/page-number links, use only authoritative prev/next controls. Existing shell/page headings,
  AuthSubmitButton, RouteRecoveryPanel, TechnicalErrorDisclosure and DiscardChangesDialog retain their settled bindings.
  Native details/summary may disclose static guidance. File removal confirmation reuses the licensed Simple alert dialog owner.

Record identity/version/MIA anatomy deltas in each presentation file. Use inherited gray-500 normal/red-600 invalid control
boundaries where required for contrast, not copied low-contrast gray/red-300; verify inside/outside, forced colors and focus.
No bespoke theme/CSS framework, dark utility or licensed-source commit. If native-progress adaptation demonstrably cannot
satisfy anatomy/a11y/CSP, report before changing the binding; do not weaken policy or introduce fake progress.

All interface copy belongs to `messages.ts` and seven catalogs: en-US, de-DE, fr-FR, es-ES, es-AR, pt-PT, pt-BR. Localize
formats/kind/state/size/unit/control/error/duplicate-risk guidance; never translate authored names, filenames or raw errors.
Use bdi for untrusted names, preserve complete bytes and wrap safely. Locale/text-mode changes preserve current page-local
queue/form/focus, never dispatch/revalidate. Clear input on departure; no form restoration of file handles.

AC-001..005/007..009/012..014/016/019 apply to this CP-03 subset: one main/h1, unique localized title before focus, named
parent/skip/current-route navigation, keyboard picker and every row action, 24px targets, complete 200-file keyboard review,
320 effective CSS pixels in all text modes, real 200% zoom, spacing overrides, forced colors/reduced motion and no focus
obscuration. Native file input is the real control, not inaccessible decoration. Full hidden error details must wrap at 320.

AC-014 announcements follow its exact ledger: queued/uploading/verifying/uploaded/cancelled polite; rejected/unknown
assertive, with auth/scope loss taking priority. Never announce percentages, raw errors or protected document contents.
Coalesce polite progress transitions but retain every rejected/unknown per-file/state key in aggregate; do not rely on the
generic newest-message arbitration to silently drop multiple upload failures. No duplicate read/render announcement.
Automatic upload state changes never move focus; explicit Remove focuses next row, prior row, then input. Retry retains row
focus. Confirmation/dirty dialogs contain focus and restore safe targets; security override offers no Stay.

Visible limitations: MIA does not scan files for malware; accepted files are not certified safe. External material links are
not fetched by MIA. Do not imply local-only processing, licensing validation or require a copyright attestation. Protected
print suppression remains; no source preview/download/remote fetch, telemetry or storage.

## Concrete proposed file and symbol manifest

This is the **implementation-ready manifest** under BCG-018's revised documented-contract exception and BCG-019's settled
generic authorized representation. Exact path arrays are also in prepare-report.json. This documentation phase does not edit
those application paths; implementation follows separately without a discovery prerequisite. Backend/API-contract amendment
paths are intentionally not invented or included; adopt delivered discovery through a later scoped manifest adjustment.
No silent manifest expansion. Solver owns checkpoint/tracker writes. Prepare owns only this spec and tmp report/evidence.

### Create

- `src/platform/api/materials.ts`: branded MaterialId/MaterialFileId; runtime documents/minimized projections; exact
  material/files paths, create/list/detail/files/delete operations and hidden-failure classification. Generic list/detail
  follow BCG-019 scope labels/no private actions. Export one documented upload-limit/format declaration and advisory byte/count
  feedback consumed by the picker/queue; no current-limit API guess. Reuse generated operation types and collectionNavigation.
- `src/platform/api/materials.test.ts`: protocol payload/status/media, null/identity/scope errors, paging, single dispatch,
  advisory default/hard-cap byte/count feedback without guessed effective limits or default-based rejection.
- `src/platform/transfer/materialUpload.ts`: session-bound XHR transport, FormData, response adapter, byte progress,
  security teardown, local stop/abort and settlement; not UI queue policy.
- `src/platform/transfer/materialUpload.test.ts`: controlled XHR/events/bytes/settlement, CSRF/coordinator/security fencing.
- `src/app/routes/PrepareMaterialRoute.tsx`: material-specific course/resource admission, safe failure and dependent teardown.
- `src/app/routes/materialPreparation.test.tsx`: connected scoped routes/forms/queue/review/departure/security behavior.
- `src/features/materials/MaterialRouteProps.ts`: admitted minimized resource/links, feature-to-app dependency remains forbidden.
- `src/features/materials/MaterialListRoute.tsx`: authoritative scoped rows/pagination and persisted draft continuation.
- `src/features/materials/MaterialCreateRoute.tsx`: React Action form, name/kind/format, dirty/unknown boundary.
- `src/features/materials/MaterialDetailRoute.tsx`: persisted metadata/state/approval and draft-files continuation only.
- `src/features/materials/MaterialFilesRoute.tsx`: picker, queue and distinct authoritative persisted review/removal surface.
- `src/features/materials/MaterialUploadQueue.tsx`: licensed stable-row presentation/row focus, no XHR construction.
- `src/features/materials/useMaterialUploadQueue.ts`: machine-10 sequence/serialization/recovery/list acceptance/actions,
  local handles and aggregated per-file announcement ledger. No global store, persistence or transport duplication.
- `src/features/materials/materialUploadQueue.test.ts`: transitions/200 rows/duplicate names/mixed formats/current-review invalidation.
- `e2e/materialFixtures.ts`: isolated protocol fake with durable synthetic material/files and controllable upload response loss.
- `e2e/materialPreparation.spec.ts`: connected native-picker draft/upload/review/return/a11y/security journey.

### Modify

- `src/platform/session/SessionProvider.tsx`: construct/expose/dispose transfer owner and register teardown before cache purge;
  preserve existing controller, MFA policy, public auth and lifecycle ordering.
- `src/platform/session/sessionController.test.ts`: transfer lease/security/logout/Continue-only regressions using existing owner.
- `src/platform/data/EntryDataProvider.tsx`: expose existing session-bound transfer access through established context exports.
- `src/platform/transfer/README.md`: document implemented upload owner and deferred downloads/images; ordinary Markdown rules apply.
- `src/app/routes/entryRoutes.tsx`: four exact material routes and typed path builders/parser, current assigned-scope admission.
- `src/app/routes/routeNavigation.test.tsx`: canonical material direct-entry/parent/current-scope/fallback regressions.
- `src/app/App.tsx`: dispatch admitted material route with branded course/material IDs, preserve entry/auth/checking owners.
- `src/features/courses/CoursePreparationRoute.tsx`: working material/upload entry, no readiness formula or dead links.
- `src/features/courses/CourseRouteProps.ts`: passed-down material list/create links, no upward feature imports.
- `src/app/routes/AdminCourseRoute.tsx`: supply only new canonical hub links in existing CourseResourceHost; no admin material access.
- `src/app/routes/coursePreparation.test.tsx`: hub entry regression, retained current field-only blocker mapping/readiness behavior.
- `e2e/coursePreparation.spec.ts`: authorized manifest extension, solver 2026-10-08. Replace the superseded zero-material-link
  hub assertion with exactly one canonical material entry; retain no brief-resolution, activation, supervisor/assignment or
  other unimplemented destinations and existing denial cases. Current authorized manifest: 42 paths (16 create, 26 modify).
- `src/platform/i18n/messages.ts`: localized draft/files/review/unknown/limits/row error/caveat descriptors.
- `src/platform/i18n/catalogs/en-US.json`, `de-DE.json`, `fr-FR.json`, `es-ES.json`, `es-AR.json`, `pt-PT.json`, `pt-BR.json`:
  complete localized new messages, preserve settled English defaults parity.
- `scripts/secret-hygiene-evidence.ts`, `scripts/check-secret-hygiene.mjs`: actual protected unit cases/checkpoints and scans.
- `scripts/route-secret-hygiene-cases.ts`, `scripts/check-route-secret-hygiene.mjs`, `e2e/routeSecretHygiene.ts`:
  actual browser cases with names/filenames/file bytes/errors/CSRF markers and content-free request/failure output.
- `playwright.route-secret-hygiene.config.ts`: include new actual material browser cases in isolated deliberate-failure probes.

No client.ts change is needed if the raw-Blob Response adapter reuses its existing parser/error identities. No package,
lockfile, tsconfig/build configuration, generated API, broad architecture rules or new announcement-region owner is planned.
Later BCG-018 discovery adoption may require an actual new API projection/read and generated API update after backend delivery;
enumerate exact paths in that later change. The present 41-path implementation manifest needs no discovery infrastructure.

## Acceptance and focused checks for implementation

1. Assigned supervision and exact course/resource gates precede dependent requests, shell/title/identity. Admin-only,
   unrelated/multi-role/student-membership, changed assignment and wrong-course material never authorize dependent actions.
   BCG-019's generic list/detail render authoritative scope labels for authorized returned material, including private rows;
   private rows expose no private-material actions or dependent private-file/brief requests. No client-side unauthorized-data
   hiding or claim of a server-filtered response. Saved course-wide drafts persist on return.
2. Exact B1 documented defaults/hard maxima/formats and operator-variation/advisory caveats precede selection, with no guessed
   discovery request or API-loading gate. Advisory size/count feedback preserves queue/draft and permits dispatch above a
   documented default without pretending to know effective settings; server rejection drives actual Rejected state.
   Mixed-format prevention identifies every incompatible file with removable rows. Backend still validates signatures,
   content, aggregate/page/image/archive limits. No unsupported formats, falsely labelled effective operator values,
   file-body parsing, prefetch/download or invented scope filter.
3. Native multiple picker creates stable ordered rows; exactly one POST/one `file` multipart part per dispatched attempt,
   fresh CSRF/security lease and no manually set multipart Content-Type. Local Cancel makes zero request. Progress real/
   indeterminate; byte completion is Verifying, definitive valid 201 alone Uploaded; earlier uploaded rows survive later failures.
4. Lose response after server bytes/commit; duplicate names/sizes remain uncorrelated, queue pauses, no retry on network,
   focus/online/visibility/pageshow/Refresh/token change. Explicit material+files reconciliation, warned abandonment/new-file
   decision and exactly one deliberate new attempt; no guessed delete/finalize/success. Reload loses handles/unknown rows.
5. Persisted review uses complete server file list only. Acceptance invalidates on newer list/queue edit/mutation. 200 rows
   stay keyboard accessible. Exact-ID removal confirms only original 204; conflict/denial/timeout preserve truthful unknown/
   frozen state and never optimistically remove. No Finalize/processing/brief/approval action is dispatched.
6. Stale XHR/read/progress/denial callbacks, scope/security teardown, account change, restricted stage, expiry, logout,
   pagehide/BFCache and departure destroy/hide correct owners without resurrecting/announcing protected state. Dirty Stay/
   Discard applies to local handles/creation, overridden by security loss. No storage/cache/history/form-restoration/print leaks.
7. Accessible route/name/description/error/progress/row/control semantics, title-before-h1 focus, stable upload focus,
   explicit-removal fallback, correct duplicate row names, failure-first announcement ledger, no repeated percent/read speech.
   Test all seven locales/three text modes at direct 320px, real 200% zoom, text spacing, forced colors, reduced motion,
   measured boundaries/targets and representative stable-state axe scans. Manual Safari/Chrome/Edge/AT/400% remains release evidence.
8. Deliberately fail actual secret/protected tests at input, queued/sent/unconfirmed, persisted/reconciled, raw-error and
   teardown checkpoints. Require intended checkpoint/failure identity and reject early failures; scan complete stdout/stderr/
   artifacts for runtime markers, zero leaks. No fixture bodies, filenames tied to people, tokens/CSRF or raw response logs.

Use synthetic local protocol/XHR fakes only. Test API/transfer unit boundaries early; component/route tests and Chromium native
picker journeys exercise actual owner/network dispatch counts and durable fake state, not mirrored constants. Extend actual
test-hygiene inventory with the first tests, not after UI work. Automation artifact capture remains disabled for protected
cases; retain only content-free summaries/hashes/checkpoint IDs. Mixed-format and no unsafe replay are required negatives.

Sequential focused commands in implement: typecheck; lint/architecture; targeted Vitest materials/API/transfer/route/controller/
locale/departure tests; i18n catalogs and formatting; affected bundled-Chromium journeys/hygiene; threshold-zero duplication
and marker balance. Measure FFR-955 bundle risk: 4.2 was close to 256,000 gzip bytes; do not relax budget/remove locales or
invent an unapproved lazy-loading mitigation. Builds/tests must not overlap. Final separate verify runs `./run-all-tests.sh`
once against final application/test/script/config/dependency content fingerprint, records every component/log/result/skip;
never claim skipped manual environments or unavailable tools passed. Implement does not self-review/full-gate/commit.

## Preparation progress and next action

Completed block P1: inspected HEAD/index/diff/checkpoint and all applicable rules; preserved known baseline dirt.
Completed block P2: inspected binding clauses, material/course/capability/OpenAPI schemas and relevant backend corroboration;
identified B1/B2, separated valid operations from dependent gaps, reconciled existing BCG transport without blanket closure.
Completed block P3: checked tooling/model catalog and read exact licensed source; no installs/application tests/builds.
Completed block P4: wrote this bounded conditional file/symbol/transport/test spec and content-free prepare JSON evidence.

Historical owner-disposition block P5 completed, 2026-10-08 (B1 deferral superseded by P6): added release blocker BCG-018
and non-blocking follow-up BCG-019; counted
Release Blockers at that point contained 18 entries. Recorded whole-story B1 deferral and bounded B2 generic-list/detail exception
without changing FFR-402, source code or solver tracking. Conditional manifest retained; no partial implementation approved.

Owner-reversal block P6 completed, 2026-10-08: BCG-018 moved to non-blocking follow-ups; counted Release Blockers restored to
17. Recorded later same-day approval to implement with the exact documented defaults/caps/formats and advisory checks;
B2 remains settled with labels/no private-row actions. Wrote backend discovery RFC at the requested path. Spec/report now
ready-for-implementation, explicit 41-path application manifest ready, no waiting for discovery. All other exclusions unchanged.

Preparation documentation lives in exempt `_bmad-output`: Markdown lint skipped by rule, not passed. Backend RFC is under
`mia/tmp`; no backend lint/gate is run per dispatch. No application tests/build/full gate apply to this documentation update.
Next action: solver dispatches implementation of this ready spec. No new owner question/notification, story completion,
review/verification pass, checkpoint ownership, application implementation, staging or commit is claimed here.

## Implementation handoff — 2026-10-08

### Resumed implementation progress and approved performance scope

Completed regression/accessibility block: 171 tests in nine focused Vitest files pass; 19 Chromium tests in the material and
preparation suites pass (seven new material journeys plus twelve hub/field regressions). New journeys cover native duplicate
sources/serialization, persisted reload/review/exact-ID removal, unconfirmed create/upload/delete with no replay, private-file
non-fetch, security/pagehide clearing, dirty Stay, 200 rows/mixed-format aggregate alerts and explicit removal fallback.
All four material surfaces were exercised across seven locales/three text modes at direct 320px; files also use spacing,
forced-colors/reduced-motion. The four surfaces pass real 200% Chromium zoom and representative axe 4.13 stable-state scans
with no rule suppression. Manual Safari/Chrome/Edge/AT and 400% zoom remain release evidence, not claimed passed here.
Synchronous transfer route teardown now clears queue references before protected purge even if React cleanup is delayed.
Byte-completion progress cannot regress from Verifying; stopped local waits preserve current hidden-denial handling.
Persisted-file confirmation retains the licensed Simple alert anatomy and moves focus to next/prior row or picker on success.
Unit hygiene passed 18 actual protected tests/23 checkpoints and one rejected early-failure canary with zero marker leaks.
Latest application build passes at 246048 gzip bytes versus the unchanged 256000-byte budget. Typecheck, targeted browser
TypeScript, lint/architecture, seven ICU catalogs, formatting, applicable transfer README Markdown lint and threshold-zero
duplication/marker balance pass. Browser hygiene and final artifacts remain the next block. Full gate/review/commit not run.

Owner approved bounded bundle mitigation on 2026-10-08, preserving seven locales, behavior and the fixed 256000-byte budget.
Exact additional paths: `scripts/message-catalogs.ts`, `scripts/message-catalogs.test.ts`, `vite.config.ts`,
`src/platform/api/entry.ts`. The build-only Vite transform compacts non-English catalogs into sorted value tables sharing
descriptor IDs and regional override tables, while canonical JSON files remain complete and switching remains synchronous.
The material resource host is lazy-loaded under the existing neutral Checking access fallback; transfer parsing loads only
on deliberate upload, before the shared session mutation lease. Primitive branded route IDs remain in the eager API entry
owner, so route parsing does not import material parsers. No new dependencies, language pruning or budget relaxation.
Observed mitigation build: 245986 gzip bytes versus 256000; interim result, not final verification.

Completed implementation blocks so far: exact material API projections/operations and documented advisory declarations;
canonical routes and ordered admission; create/list/detail/files presentations; serialized page-memory queue, explicit
unknown reconciliation/abandonment and persisted review/removal; seven catalogs. Core API/transfer/queue/catalog tests pass
(33 tests), connected route tests pass (3). Browser, hygiene, controller/navigation regressions and final static checks remain.
Transfer fixtures exercise single multipart dispatch/current CSRF, real progress, unknown stop/network/malformed/5xx/byte
bounds/UTF-8 errors and teardown. Queue regressions cover duplicates/200 rows, mixed-format rejection, frozen conflict,
review invalidation and exact-ID deletion without replay. Reports/diff will be refreshed after all focused checks.

Implementation stopped at an evidence-backed announcement conflict; B1 and B2 remain settled as above.
Machine 10 at `FRONTEND-STATE-MACHINES.md:399–401` explicitly requires the localized per-file announcement to state
the filename and state. The implementation dispatch explicitly forbids protected content in announcements. Source
filenames are protected source-file metadata under the security/privacy rules. These cannot both hold without an owner
disposition: may upload announcements include the filename, or should they instead identify the row without protected
content (for example selection position plus state)? No announcement policy was implemented or silently relaxed.

Partial block I1: drafted the minimized material API boundary and documented upload metadata/advisory checks, two API
tests, session-bound XHR/raw-byte response adapter, and provider transfer construction/teardown ordering/context access.
Added transfer ownership documentation. No route, queue, UI, catalog or browser/hygiene implementation yet. These drafts
are not accepted or verified. The first focused typecheck failed on optional link typing at `materials.ts`'s call to
`collectionNavigation` (incorrect argument shape under exact optional properties); repair remains pending alongside tests
after the announcement decision. No full gate, test/build, staging or commit was run.

The mandated grouped `interaction needed:` Pushover notification was delivered with helper exit 0. Scoped draft diff,
actual changed-path manifest, typecheck log and implement report are under
`tmp/agent-execution/4-3-supervisor-creates-material-and-uploads-files/`. Baseline remains
`3c04d84976f6c0bc5d53228d2cc8d15683155e55`; original solver tracking, gap-ledger and other bookkeeping edits are preserved.
Next action: obtain the announcement disposition, then resume I1 correction/checks and the remaining approved manifest.

Resumed 2026-10-08: solver resolved the announcement conflict in favor of machine 10. Localized live announcements include
the escaped filename and state, without technical response content. This is accessibility parity with the visible file row,
not permission to put source metadata in logs, URLs, history, storage or test artifacts. The prior blocker is settled; B1/B2
remain unchanged. Corrected optional navigation-link typing. Continuing the API/transport checks and remaining manifest.

Second implementation interruption, 2026-10-08: a genuine manifest extension is required. The existing Chromium regression
`e2e/coursePreparation.spec.ts:171–177` asserts zero hub links whose href contains `materials`, `activate` or `supervisors`.
Story 4.3 explicitly requires an ordinary canonical material/upload hub entry, making the material portion of that assertion
obsolete. This existing browser test file is not in the approved 41-path manifest. Do not evade its selector, omit the hub
entry, or leave a known contradictory regression. Requested authorization: add only `e2e/coursePreparation.spec.ts` to the
modify manifest, updating the material expectation while retaining the activation/supervisor negatives. The file has not
been changed. The mandated `interaction needed:` Pushover notification was delivered with helper exit 0.

Partial blocks I2/I3: drafted four canonical route registrations/parser and ordered course/material host, App dispatch,
passed-down hub material link, route-local machine-10 queue/reconciliation/accepted-list/deletion owner, localized message
descriptors and licensed list/create/detail/files/queue presentations. These are incomplete drafts, not implementation
acceptance. Catalog translations, API/transfer/queue/route/controller/browser/hygiene tests and final focused checks remain.
The latest typecheck has eight errors in draft route/form/hook integrations; they are recorded in `typecheck-routes.log`.
No tests, build/bundle measurement, full gate, staging or commit occurred. Scoped diff/report/manifest have been refreshed
to include every drafted story path, excluding pre-existing user bookkeeping. Next action: approve the single browser-test
manifest extension, then resume type corrections, ownership/transition completion, catalogs and focused checks.

Resumed 2026-10-08: solver authorized `e2e/coursePreparation.spec.ts` as the 42nd application/test/script/config manifest path.
Updated the obsolete hub material-link negative to assert one canonical entry; retained activation/supervisor negatives and
added explicit brief/assignment negatives. Existing denial cases are unchanged. Recorded the extension in the implementation
report/manifest, not in solver tracking or the historical prepare report.

Completed block I4: resolved all eight draft integration type errors; focused `npm run typecheck` passed before catalog edits.
Completed block I5: added all 80 material message keys to seven catalogs, including complete localized documented limits,
advisory/operator variation and duplicate-risk guidance. Catalog lint/parity and locale/browser coverage are still pending.
Continued I1/I3 ownership work: pending transfer handles participate in teardown; dropped source references after dispatch,
raw error bytes have fatal UTF-8 validation and the 65,536-byte bound; route queue teardown clears its protected snapshot and
handles; private-scope reconciliation withdraws the feature; local admission does not fabricate an HTTP error. These changes
still need focused regressions and remaining queue/form lifecycle completion.

Third implementation interruption, 2026-10-08: interim `npm run build` passed, but `npm run check:bundle-size` failed FFR-955.
The current initial-route JavaScript is **271,353 gzip bytes**, against the **256,000-byte** budget: **15,353 bytes over**.
No budget relaxation, locale removal or unapproved lazy-loading mitigation is permitted by this spec. Existing
`src/platform/i18n/locales.ts` synchronously imports all six non-English catalogs; English uses descriptor defaults, and
`MiaIntlProvider.tsx` assumes synchronous switching. Those loading owners are outside the current manifest. This is evidence
for requesting an approved bounded loading/performance change, not authorization to alter them. No workaround was applied.
The required `interaction needed:` Pushover notification was delivered with helper exit 0. Source/catalog drafts remain
unstaged; no unit/browser/hygiene/full-gate checks were run after discovering this budget conflict. Logs and complete scoped
diff/manifest/report are refreshed under the story's tmp directory. Next action: owner approves a bounded mitigation and
its exact manifest/test boundary; resume remaining implementation and focused checks without weakening FFR-955 or locales.

### Final implementation handoff — 2026-10-08

The historical interruptions above are resolved. I1/API-transfer, I2/routes/admission, I3/queue-review-removal-lifecycle,
I4/type integration, I5/localization and I6/hub regressions are complete within the approved slice. Final I7/performance
uses the four additional paths recorded above: 18 creates + 28 modifications = 46 application/test/script/config paths,
plus this worker-owned spec. No new dependency or backend contract change; original bookkeeping remains untouched.
Final I8/focused verification: **179 tests in 11 Vitest files**, **20 bundled-Chromium tests** (8 material + 12 preparation)
pass. Final added loading-failure regression proves the lazy route stays neutral, localized and safely escapable without a
dependent request. The latest application build and fixed budget check pass: **246097 gzip bytes / 256000** (9903 headroom).
All seven complete ICU catalogs, typecheck (including explicit browser-source typecheck), lint/architecture, format, compiler
coverage canaries, transfer README Markdown lint, duplication balance and JSCPD threshold zero pass.
Protected-test hygiene: **18 actual unit tests / 23 intended checkpoints** and **8 actual browser tests / 18 checkpoints**
pass; both early-failure canaries are rejected, complete original process streams/artifacts scanned, **zero marker leaks**.
Hygiene children/artifacts are removed by their owners; retained logs contain only public test/checkpoint identities/results.
Existing jsdom cross-document-navigation diagnostic occurs in the unchanged departure regression; Chromium covers actual
navigation. It is not suppressed. Manual environments/AT/400% zoom and the full release accessibility/security matrices
remain unverified release evidence. The full authoritative gate, independent review, staging, commit and push were not run.
No blocker or unresolved product decision remains for this implementation slice. Actual model `openai/gpt-6.1-sol`, current
variant not exposed; no 429 or model fallback observed. Prior interaction-needed alerts delivered successfully; this resumed
completion requires no new owner intervention or duplicate alert. Final diff/manifest/report and content-free check logs:
`tmp/agent-execution/4-3-supervisor-creates-material-and-uploads-files/`. Next: solver-owned independent review, then the
separate authorized verification phase; no story-done or committed status is implied.

### Review repair batch — R1–R4

The independent reviewer returned four blocking findings; its envelope and dispatch details are saved in
`tmp/agent-execution/4-3-supervisor-creates-material-and-uploads-files/review-report.json` before repair.
R1 root-cause repair extends the bounded manifest by `src/platform/session/sessionController.ts` (47 paths total),
explicitly identified/authorized by the repair dispatch. Authenticated `403 csrf_invalid` now enters the existing destroying
privacy-shield boundary, fencing pending work and requiring explicit ordered Refresh. Public login/MFA recovery is unchanged.
R2 feedback selects rejection wording only outside the explicit unknown state, retaining collapsed technical disclosure.
R3 creation events and deletion transitions use the existing announcement owner, with deduplication by transition and
owner retirement/clear on departure/security teardown; technical bodies are never speech. R4 replaces the name-validation
boolean with required/too-long reasons, required semantics, associated localized corrective text, focus retention and
correction clearing. Three new public descriptors are supplied in all seven catalogs. Targeted regressions/checks are next;
no full gate, tracking edit, staging, commit or push has occurred.

Completed repair source/test block: R1's real-session/XHR browser reproduction passes with two selected files, exactly one
POST after `403 csrf_invalid`, synchronous queue teardown, zero background recovery or lifecycle dispatch, and an explicit
Refresh ledger of session → capabilities → course → material → files before deliberate new work. The session-owner regression
also proves destroying teardown and fenced subsequent mutations without automatic reads. R2/R3 connected create/delete
committed-response-loss and rejection tests prove truthful exclusive feedback, one localized urgent announcement (including
German creation feedback), no raw-body speech, no repeat on rerender/disclosure changes and no stale message after departure
or security loss. State-conflict reconciliation retains the applicable original rejection disclosure after a successful safe
read, rather than discarding it. R4 tests cover empty/whitespace/over-limit input with zero POSTs, required/invalid semantics,
reason-specific associated text, input focus and corrected-error removal. Six new targeted browser scenarios pass; 123 tests
in the three immediately affected unit files pass. Intermediate build: 246379 / 256000 gzip bytes. Broader focused checks and
expanded deliberate-failure hygiene remain before the repair handoff; all seven languages and earlier settled scope persist.

Completed broader repair regression block: 185 tests in 11 focused Vitest files and 26 bundled-Chromium tests pass (14 material
journeys and 12 preparation regressions). This is six added unit regressions and six added browser scenarios. The all-locale
reflow journey now also renders/associates the required-name corrective message at 320 CSS pixels in each of the seven locales
and three text modes, without dispatching a create. Strict application/node typecheck, explicit browser-source typecheck,
ESLint/architecture, all seven complete ICU catalogs, threshold-zero duplication and marker balance pass. No application input
changed after the successful build at 246379 gzip bytes; budget remains 256000 with 9621 bytes headroom. Final format/compiler
coverage and deliberate-failure hygiene were launched sequentially, never overlapping tests/builds. Refreshed complete scoped
diff/manifest/fix report currently cover 47 application/test/script/config paths (18 create, 29 modify) plus the implementation-
only spec delta, excluding pre-existing bookkeeping. Hygiene completion and the final content-free handoff remain next.

Completed final repair evidence/artifact block: compiler-coverage canaries, whole-workspace formatting and applicable transfer
README Markdown lint pass. Expanded deliberate-failure unit hygiene passes 24 actual tests / 34 checkpoints; browser hygiene
passes 14 actual material journeys / 36 checkpoints. Both early-failure canaries are rejected; full original child streams and
generated artifacts are marker-free and purged, retaining only content-free evidence. All R1–R4 findings are repaired in this
single root-cause batch. `fix-report.json` is the current handoff; `implement-report.json` remains historical pre-review evidence.
Complete `story.diff` and actual-path `manifest.json` include every current story source/test/script/config path and scoped spec
progress, excluding preparation/user/solver bookkeeping. Scoped content SHA256 is
`57f6048dfa05177ad6d0d4459a055c6a2f76c11d97310bc6253dc99a7fe4f04c`; no application inputs changed during reporting.
Baseline HEAD remains `3c04d84976f6c0bc5d53228d2cc8d15683155e55`, index empty, no commit or push. There are no repair blockers
or new owner-interaction notifications. Next action is independent re-review of R1–R4, then the separately authorized final
authoritative gate. Focused evidence does not declare the story done, establish manual release acceptance or replace that gate.

### R2 residual — repair batch 2

Re-review cleared R1, R3 and R4, but found that R2 still inferred definitive mutation rejection from a shared error plus
`deletion !== Outcome unknown`. A confirmed `204` deletion followed by a failed reconciliation read therefore contradicted
the authoritative deletion success. The complete supplied re-review dispatch was persisted first in `rereview-report.json`;
no separate reviewer JSON/tracking note/limitations were supplied or invented.

Completed source/regression block: the page-memory queue now carries the error source (`rejected`, `unknown`, or `read`)
alongside the unchanged typed failure. Reconciliation failures always use the read tag; mutation failures use their definitive
or unknown tag. Feedback selects by this source rather than the deletion state. Confirmed removal and its success announcement
remain intact; failed reads show a separate localized explanation, collapsed technical disclosure and the existing explicit
`Reconcile material and complete file list` refresh/recovery action. This also covers upload-success and conflict follow-up
reads sharing this error owner. Creation after a definitive `201` has no local reconciliation path: it navigates to the files
route, whose ordered resource host owns entry read failures without rendering creation rejection. No creation change needed.
One new read-failure descriptor is present in all seven catalogs. No infrastructure or manifest extension is needed.

Four connected unit and four Chromium regressions cover initially readable persisted files, definitive `204`, material/files
GET failures from both HTTP 500 and transport loss, exactly one DELETE, authoritative row removal, retained success speech,
no rejection/unknown wording, and deliberate read recovery without mutation replay. Targeted checks pass: 17 tests in two
unit files and all four new Chromium scenarios; strict typecheck passes. Build passes at 246849 / 256000 gzip bytes, preserving
all seven languages with 9151 bytes headroom. Earlier unknown/rejected create/delete regressions remain unchanged. Broader
focused regression/static/hygiene checks and current artifacts are next; no full gate, bookkeeping edit, staging or commit.

Completed batch-2 final-check/handoff block: the original sequential check process finished successfully without duplicate
or overlapping test/build runs. Focused Vitest passes 189 tests in 11 files; Chromium passes 30 tests (18 material journeys and
12 preparation regressions). Application/node and explicit browser-source typecheck, both compiler-coverage canaries,
ESLint/architecture, whole-workspace formatting, all seven complete ICU catalogs, applicable transfer README Markdown lint,
threshold-zero duplication and marker balance pass. Expanded deliberate-failure hygiene passes 28 actual unit tests / 42
checkpoints and 18 material browser tests / 48 checkpoints. Both early-failure canaries are rejected; full original child
streams/artifacts are marker-free and purged. Final bundle measurement on unchanged built inputs is 246849 / 256000 gzip
bytes, with seven languages and 9151 bytes headroom. Vite's minified-chunk-size advisory and the existing jsdom navigation
diagnostic remain visible, unsuppressed; neither changes the passed enforced initial-route budget or Chromium navigation.

`fix-report.json` appends the complete batch-2 R2 disposition, current results/counts/logs/model and exact changed paths;
`fix-report-batch-1.json` preserves earlier evidence. `rereview-report.json` retains the complete supplied re-review dispatch
verbatim, with explicit provenance that no separate reviewer JSON/tracking note/limitations were provided. Refreshed complete
`story.diff` and `manifest.json` cover the unchanged 47-path story manifest (18 create, 29 modify) plus scoped spec progress,
excluding all pre-existing bookkeeping. Current scoped source/test/script/config content SHA256 is
`5b06152f705f02458f7a8712d6da7d4046a9f953adff065ea62db9caeb038633`.
No application inputs changed during final reporting. Baseline HEAD remains
`3c04d84976f6c0bc5d53228d2cc8d15683155e55`; index empty, no bookkeeping/Foundation/backend edits, commit or push.
No repair blockers or owner intervention remain. Next action is independent R2 batch-2 re-review, then the separately
authorized authoritative verification gate. Full gate and manual supported-browser/AT/400%-zoom release evidence were not
run or claimed passed in this phase; this is a fixed scoped repair, not story completion.

### Owner-approved final repair batch 3 — stale prior-attempt deletion feedback

Completed batch-3 source/regression block, 2026-10-09: preserved historical re-review-2 evidence in
`tmp/agent-execution/4-3-supervisor-creates-material-and-uploads-files/rereview2-report.json` using the exact supplied
finding/remedy/reproduction text. The supplied owner approval permits this third and final bounded repair only.
Choosing and dispatching a new deletion now retire previous-attempt mutation feedback; Stop waiting also retires it.
Read-tagged failures remain independently classified and retained. Current definitive rejections still render normally;
no rendering suppression, create/upload behavior, transport, denial ordering or attempt fence changed.
Added a connected route unit test and Chromium journey for initial 406, deliberate held second DELETE, Stop waiting,
unconfirmed-only copy/speech, exactly two dispatches/no replay, and a late 204 that cannot resolve the stopped attempt.
The unit queue regressions pin feedback retirement at choosing and submitting, unknown state with no stale error, no
success callback/read after late 204, and still-current hidden-denial teardown after late 404. Added actual protected-test
hygiene checkpoints for all new cases. Targeted Vitest: 20/20 tests in two files passed; all existing read-failure and
unknown/rejected regressions remain intact. Test-authoring iterations corrected an exact-copy assertion and duplicate
visible/live text selector; no application repair changed as a result. Broader sequential focused checks remain next.
No checkpoint/bookkeeping edits, staging, commit, new dependency, backend change, full gate or new owner alert.

Completed batch-3 targeted-browser block: the exact reviewer journey passed in bundled Chromium (1/1). An initial test
iteration injected focus/online lifecycle events, correctly invoking the existing privacy shield and destroying the
route before the late response. Removed that unrelated teardown transition from this bounded regression; retained
existing lifecycle/no-replay tests unchanged. Current static checks, 192 focused unit tests, balanced zero-clone duplication,
and build/budget already passed; initial bundle is 246857 / 256000 gzip bytes. A single sequential final focused-check
process is now running broader Chromium and the expanded deliberate-failure hygiene after static/unit checks. No
concurrent check/build or new source repair was started. Completion evidence and scoped artifact refresh remain next.

Completed batch-3 final evidence/handoff block: the single sequential process completed successfully. Focused Vitest
passes 192 tests in 11 files; bundled Chromium passes 31 tests (19 material journeys plus 12 preparation regressions).
Application/node and browser-source typechecks, two compiler-coverage canaries, ESLint/architecture, formatting, seven
complete ICU catalogs, marker balance and threshold-zero duplication pass (96 logic files, zero clones). Expanded
deliberate-failure hygiene passes 31 actual unit tests / 50 checkpoints and 19 actual browser tests / 53 checkpoints;
both early-failure canaries were rejected, full original process streams/artifacts scanned, zero fixture marker leaks.
The build and final unchanged-input budget check pass at 246857 / 256000 gzip bytes (9143 headroom), with all seven
languages retained. Existing jsdom cross-document navigation diagnostic and Vite chunk-size advisory remain unsuppressed.
Updated batch-3 `fix-report.json`, complete scoped `story.diff` and `manifest.json`; previous batch-2 report/diff retained.
The supplied re-review-2 finding/remedy/reproduction text remains unchanged in `rereview2-report.json`; its historical
blocked verdict is not a current batch-3 review decision. Baseline remains `3c04d84976f6c0bc5d53228d2cc8d15683155e55`,
index empty, original bookkeeping/checkpoint/Foundation/backend untouched. Actual model: `openai/gpt-6.1-sol`; variant
not exposed, no observed 429 or fallback. No blocker/new owner alert; next is independent re-review of this boundary,
then separately authorized final verification. Full gate/manual browser/AT/400%-zoom release checks are skipped, not
passed. No staging, commit, push, checkpoint update or story-done declaration occurred.

Recovery evidence closure, 2026-10-09: observed the prior sequential check process still running, awaited its macOS
process-exit event without polling or overlapping checks, then inspected all completed logs. The prior worker also finalized
its handoff before recovery edits; it is absent from the active-session inventory. Reused those successful focused results
without duplicating the unit/Chromium/hygiene suites. The current 47-path content fingerprint matches the pre-check input
fingerprint `d30e1cdbcbc90207a8935d17230a1995db638106dc9df9167c30b3b59283b25b`. Recovery makes reporting-only edits,
preserves historical re-review-2 verbatim, refreshes scoped artifacts, and repeats only the final unchanged-build bundle
measurement. Actual recovery model: `openai/gpt-6.1-sol`, variant not exposed. No application code or solver tracking changed.

### Authoritative unit-gate failure — R1 regression coverage repair

Completed diagnosis block, 2026-10-09: the unchanged MFA enrollment CSRF test fails deterministically in three isolated
runs (49 passed / 1 failed per run). R1's `sessionController.ts:isAccessLoss` adds authenticated `403 csrf_invalid` to
destroying admission invalidation. `dispatchAuthenticatedMutation` returns `superseded` after `loseAuthenticatedAccess`;
the existing registered MFA teardown destroys setup/codes and the existing superseded handler settles activity to Idle.
The old Settled/verify-rejected assertion expected pre-R1 local rejection with stale admission. This is attributable to
the 4.3 R1 change, not a timer/environment flake. `SessionProvider` is not mounted by this test; material, catalog, route
and other test modules do not execute this path. Baseline behavior was derived read-only from the diff: without R1's
predicate addition the same 403 returns rejected and invokes `#verifyRejected`. No baseline checkout, stash or tree
mutation was used to test that counterfactual. The binding CSRF Checks in `SECURITY-PRIVACY-ACCEPTANCE.md` remain authority.

Completed bounded regression repair block: dispatch authorization extends the manifest by
`src/platform/session/mfaEnrollment.test.ts` solely to align the stale test with R1's approved fence. Production code
and R1 fencing are unchanged. The regression now asserts destroying privacy shield, absent admission, dropped secrets,
one unsafe dispatch, no automatic session/capability/MFA read or lifecycle recovery, and explicit ordered Refresh followed
by the MFA read without replay or restoration of destroyed setup. The touched test generates its MFA value per run and
uses try/finally cleanup. Focused session/lifecycle and material regression checks are next; no full gate, checkpoint,
tracking edit, stage or commit. Content-free diagnosis logs are under the story's `tmp/agent-execution` directory.

Completed gate-regression evidence block: final targeted MFA file passes 50/50; the broader affected session, public
invitation/reset, MFA API, App lifecycle, recovery-code departure, route recovery, material transfer/queue/route suites
pass 429/429 in 11 files (the 50 MFA tests overlap that count). Strict typecheck, touched-file ESLint and formatting pass.
The initial regression repair also passed those checks; assertions were then narrowed to public state tags so a future
secret-teardown failure cannot print the complete held-secret snapshot, and all focused checks were rerun sequentially
on that final test. Raw runner output is not retained; new logs record only command/result/counts/timing/output hashes.
The complete scoped diff and 48-path manifest include this authorized regression extension and spec progress only,
excluding original bookkeeping. `fix-report.json` records the gate-failure disposition and invalidated prior gate inputs;
`verify-report.json` remains historical failed-gate evidence. No production source was changed in this dispatch. The
authoritative full gate/build/browser stages were intentionally not run: next is the solver's separate fresh verification
dispatch. Baseline unchanged, index empty, no checkpoint/tracker changes or new owner intervention/notification.
