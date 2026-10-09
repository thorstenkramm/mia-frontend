# Story 4.4 — Process material and approve its brief

## Preparation identity and authority

- Current phase: scoped navigation repair verified by fresh authoritative gate; uncommitted, solver handoff pending.
- Frontend baseline: `025a5b0a30cd8fe68cfe33a876a3551345aba6c7` (Story 4.3 at HEAD).
- Backend inspected: `63c99925e5995fe2e2467f4f894976dfd4c0d297`.
- Actual worker model: `openai/gpt-6.1-sol`; variant is not exposed by the worker runtime metadata.
- Owner's 2026-10-09 unattended authorization and fallback order are in the story execution checkpoint; they override
  the older protocol fallback defaults for this batch. No owner questions, staging, commits or checkpoint writes here.
- Binding sources: current `epics.md` Story 4.4; UX companions under
  `_bmad-output/planning-artifacts/ux-designs/ux-mia-frontend-2026-09-12/`; architecture spine AD-6/AD-13/AD-15;
  backend `api-doc/openapi.yaml` and its referenced materials/requests/resources documents; backend product requirements
  §Course-wide material, §Material processing, §Corrections and §Loss of approved material.
- References, not this spec, own transport schemas and canonical state tables. In particular use machines 10, 11, 12,
  17, 18, 22, 23, 25, 28 and 31, surface profiles G/F/D/W/U/X/P, and CP-03/AC-001..004/007..009/012/015..017/019.

## Baseline preservation and prerequisites

All dirty files are bookkeeping/workflow, not overlapping application edits. Preserve the exact paths in the prepare
report. The observed 4.2/4.3 checkpoints are additional bookkeeping within the same known category; neither overlaps
this new spec or the implementation manifest. The backend has unrelated brainstorming CSV and untracked auth guide
work; preserve both. Do not modify either repository's existing tracking files in this phase.

Node 24.21.0, npm 11.19.0, installed direct dependencies (`npm ls --depth=0` succeeds), Playwright 1.63.0 and its
Chromium executable are available. No install is needed. Licensed library version `2026-09-13-083323` is present.
The skill's historical stack version prose is stale; the scoped stack rule and package pins are authoritative.
No application tests/build or full gate ran during preparation. The spec is Markdown-lint exempt under `_bmad-output`.

## Acceptance and bounded scope

1. From reviewed, current draft attachments, explicit **Finalize and process** dispatches exactly once. Only a validated,
   definitive `200` installs processing/ready truth and permits transition to processing. A lost response, Stop waiting,
   malformed success or server failure never claims processing started or completion. Explicit Refresh reads current state.
2. Processing displays material state, authoritative per-file state/failure and supervisor-safe job states, last checked,
   and explicit Refresh status. No polling, timer request, SSE, percentage, provider diagnostics or invented retry time.
3. Ready course-wide material has distinct **Technical readiness** and **Educational approval** labels. Its complete
   structured version-1 brief is inspectable and correctable. Untrusted narrative Markdown crosses only the AD-6 boundary;
   identity/labels remain escaped and Unicode-isolated. No model text supplies UI controls.
4. Approval is a separate deliberate action after saved brief review. Only returned material truth changes approval.
   A meaningful approved-brief edit warns beforehand, then installs the backend's revoked approval. A validated no-op
   that stays approved produces no revocation claim. There is no client reviewed flag and no automatic reapproval.
5. Explicit revoke uses the contracted approval DELETE, states its student/retrieval and possible new-session impact,
   and reconciles current course readiness. It does not deactivate the course or claim that every revocation blocks starts.
6. The hub links to choosing material for brief review, and list/detail expose actual per-material brief destinations.
   FFR-401/403/405 are covered only for this supervisor/file-backed slice; existing other FFR work remains separate.
7. Local protocol/provider fakes cover success, rejection, ambiguity, non-fetch, teardown and renderer attack fixtures;
   automated tests never call OpenAI, Mistral, or any paid/production provider.

### Exclusions

No new link-material creation, private-material actions, downloads, material deletion, source reopening/regeneration on
ready material, generic job retry, admin operations, provider configuration discovery, course activation (Story 4.5),
student session start, MFA expansion, transcript/SSE implementation, or whole-epic preparation. Existing link material
may be inspected/approved via its authoritative ready brief, but must explicitly remain non-qualifying file material.
No drag/drop expansion or global state/cache redesign. No new runtime dependencies or CSP relaxation.

## Verified operation map

All listed successes are JSON:API `application/vnd.api+json`, with `Cache-Control: no-store`. Reads require authenticated
session; every mutation also requires fresh `X-CSRF-Token`. Use the established API/session owners, not feature fetch.

- `listMaterials`: `GET /api/v1/courses/{course_id}/materials`, `200 MaterialCollectionDocument`, only page limit/offset.
  Retain 4.3's generic authorized collection and truthful scope labels. Never add an unsupported scope filter.
- `getMaterial`: `GET /api/v1/materials/{id}`, `200 MaterialDocument`. The authoritative attributes include state, nullable
  structured brief, brief_source, brief_updated_at, approved, approved_at, failure_code, created_at and updated_at.
  Validate addressed ID and course relationship. Keep null distinct from absence, failure and generated provenance.
- `listMaterialFiles`: `GET /api/v1/materials/{id}/files`, unpaginated bounded `200 MaterialFileListDocument`, no query.
  Files expose draft/processing/processed/failed and nullable failure_code. Do not fetch source/content bytes to inspect status.
- `finalizeMaterial`: `POST /api/v1/materials/{id}/finalizations`, **no body**, `200 MaterialDocument`.
  `409 material_invalid_state`, `422 material_invalid`; never invent a finalization resource, payload or request ID.
- `updateMaterialBrief`: `PATCH /api/v1/materials/{id}`, `MaterialBriefUpdateRequestDocument`, `200 MaterialDocument`.
  Send only `data.type=materials`, matching nonempty `data.id`, and `attributes.brief` as a complete replacement object.
  `409 material_invalid_state`; `422 material_invalid`; 400/413/415 are declared. No separate `/brief` API exists.
- `approveMaterial`: `POST /api/v1/materials/{id}/approvals`, **no body**, `200 MaterialDocument`.
- `revokeMaterialApproval`: `DELETE /api/v1/materials/{id}/approvals`, **no body**, `200 MaterialDocument`, not `204`.
  Both approval operations define `409 material_invalid_state` for ineligible scope/state/brief.
- `listMaterialJobs`: `GET /api/v1/materials/{id}/jobs`, page limit/offset, `200 SafeJobCollectionDocument`.
  `SafeJob` has ID, job_type, subject_type/id, queued/running/succeeded/failed/cancelled, attempt_count and
  created_at/started_at/finished_at. It deliberately omits available_at, failure code, usage and provider relationships.
  `422 job_invalid`; use pagination links, no invented total or aggregate progress.
- Reuse `getCoursePreparation` through `GET /api/v1/courses/{id}` for authoritative course readiness after changes.
- Failed source correction reuses existing `deleteMaterialFile` (`DELETE /api/v1/material-files/{id}`, definitive `204`)
  and draft upload. Product §Material processing explicitly allows removing/replacing a failed source to return to draft;
  upload itself stays draft-only. Never mark material draft locally after deletion; install a subsequent material read.

All subject reads/mutations also declare 401, restricted 403, hidden 404 and 406. Mutations' 403 includes csrf_invalid.
Undeclared 5xx/transport failures remain defensive unknown outcomes, not proof of rejection. Existing exact, collapsed,
escaped error disclosure remains the only backend-body disclosure; renderer must never receive error bodies.

## BCG reconciliation and settled interim decisions

- BCG-018 and BCG-019 are explicitly non-blocking milestone follow-ups. Reuse the dated exceptions verbatim by reference:
  documented advisory defaults/caps, generic authorized rows with scope labels, and no private-row actions. Do not reopen them.
- BCG-001/003: reuse already implemented authenticated lifecycle/capability/assigned-course admission. Their broader
  release evidence and SSE/header topics remain open; this story neither closes them nor adds discovery probing.
- BCG-005: these operations declare no-store; retain protected teardown and browser acceptance tests. No new cache workaround.
- BCG-007: retain existing neutral error transport/disclosure owner; never expose provider payloads in explanations or logs.
- BCG-011: current course GET provides readiness, as reconciled for 4.2. Reuse its hub read-only slice and link only
  implemented material destinations. No activation/start controls and no readiness counts from material rows.
- BCG-014 expressly excludes fixed-effect material approval/revocation. There is no If-Match or atomic approval-version
  precondition in these operations; do not invent one. Fresh review reduces stale display, not a promise of an atomic
  content-version bind. Present the returned approval truth, never claim the exact earlier brief version was frozen.
- Safe supervisor jobs intentionally cannot distinguish delayed retry from first queued work. Machine 17 **Safe queued**
  is the complete permitted treatment, not a blocker or new gap: say Queued, not Retry scheduled, and no retry time.
- Narrow follow-up: material has no named approval version/revision although AC-012 requires revocation dedupe by version.
  Interim uses authoritative transition observations plus existing updated_at/brief_updated_at/approved_at to dedupe the
  same observed revoked state across mutation and Refresh within one route owner. This is an announcement ledger only,
  not authorization, concurrency control, persistence or invented server revision. Initial unapproved state stays silent.
  Draft request: `mia/tmp/frontend-request-material-approval-revision-2026-10-09.md`. No slice is blocked by this follow-up.
- Hub has no material ID. **Choose material to review its brief** links to the existing material list; list/detail then
  link to `/brief` for the deliberately selected course-wide record. Do not enumerate material to guess the first ID,
  invent a brief collection route, or label a chooser as a specific brief.
- Response nullable arrays differ deliberately from `BriefRequest`: serialize null collections by omitting optional
  request collections; send non-null arrays exactly, with nullable label/educational_level permitted. Never send null
  learning_goals/sections/warnings/search_terms to a request schema that accepts arrays only. This is mapping, not a gap.

## Routes, gates and reuse

Extend the existing `Prepare(materials)` route family and path builder, not a second router:

- `/prepare/courses/:courseId/materials/:materialId/files`: existing review surface also owns finalization confirmation.
  There is no canonical course-wide `/review` route; do not create one.
- `/processing`: title/H1 Course material processing, parent material detail.
- `/brief`: title/H1 Review material brief, parent detail; dirty-form decision on ordinary exit.
- `/approval`: title/H1 Material approval, parent detail.
- `/approval/revoke`: title/H1 Revoke material approval, parent approval; cancel/unknown stay, definitive success to detail.

Canonical prefixes and parents are those in ROUTE-INVENTORY §Course Material. On detail offer files for draft/failed,
processing for in-progress/failed status, brief review when available and approval when ready. Ineligible direct entries
show honest state with authorized next actions, not fake success or a mutation probe. Private material direct entry in
these new routes has the same fixed unavailable presentation and no dependent files/jobs/brief/action UI.

Ordered admission: current session stage → capability/scope (`courses.supervise`, available and assigned course ID) →
course GET → addressed material GET/ID/course/scope check → dependent files/jobs. Keep the neutral checking surface and
no protected title/shell until all applicable steps are admitted in the same epoch. Resource-ID knowledge is not authority.
403/404 or scope/security loss purges values and exposes fixed safe parent/Home recovery; don't retain a cached name.

`PrepareMaterialRoute` owns route admission and minimized resources. Add discriminated resource variants there and in
`MaterialRouteProps`. `entryRoutes.tsx` owns route records, parser, lazy components, canonical paths. Existing App route
dispatch already accepts the material family; change it only if adding the family members actually requires it.
`MaterialUploadQueue` owns machine 10 sequence/handles/unknown rows and `destroy()` fences late work; reuse it rather
than copying a queue. The session data owner already supplies `readAuthenticated`, `runAuthenticatedMutation`, current
CSRF/security checks and teardown. `useRouteActivity`, departure guard, `DiscardChangesDialog`, announcer and technical
disclosure are established owners; do not build replacement session/dirty-form/announcement infrastructure.

## Finalization and failure recovery block

Add finalization state to the queue owner: idle/reviewed, prevalidating, confirming, submitting, rejected/not-sent,
outcome unknown and reconciliation; these are operation states beside machine 10 and machine 11, not new domain states.
Use React form Actions/useActionState and pending feedback; never duplicate submissions through click and form handlers.

Finalize is unavailable with selected/queued/uploading/verifying/unknown rows, pending deletion/read, read error,
unaccepted latest sequence, empty file set, non-file material, or authoritative state other than draft/failed.
Rejected local rows must be removed or explicitly dismissed before final review. Acceptance is page-local only.
Before opening confirmation, perform ordered read of material and complete file list; compare exact identities and
relevant metadata/state to the accepted sequence. A changed list/state invalidates acceptance and requires another
explicit review; an unchanged re-read may carry the accepted review forward to that checked sequence. Compare IDs,
never correlate uploaded/unknown attempts by metadata. Freeze picker/queue/delete while confirmation/submission is active.
Confirmation names the material/file set, freeze/irreversibility and external processing disclosure; Cancel has initial
focus. The review itself is not a server lock and copy must not promise otherwise.

On successful finalization install returned material, release file handles/unused local rows and navigate to processing.
On rejection preserve applicable reviewed content, invalidate stale confirmation and show localized correction.
On unknown freeze further finalize/edit dispatches until explicit Refresh; a later read may show current processing,
ready, failed or draft but never attributes that state to the unconfirmed attempt. No automatic replay. Stop waiting
fences late results but does not suppress a current resource's later denial. A new finalize requires refreshed eligibility,
new file-list acceptance and another deliberate confirmation, not an exact-attempt retry or idempotency claim.

Failed material allows deliberate re-finalization from fresh state/files per product §Material processing. Draft/failed
file removal is permitted by that product contract; keep upload draft-only and reread the material after definitive
removal. Processing/ready stay frozen. Recovering failed sources does not reopen ready material. No job-count inference
of eligibility, exhaustion, provider availability or terminal material state. The mutation is final authority.

## Processing/readiness block

Display material state/failure explanation and a bounded file list, plus paginated safe jobs. Interpret known domain
failure codes with localized static messages; unknown codes get a generic failure (not provider details). Do not derive
material readiness from job success/file counts, or claim partial material is usable. Last checked is successful local
receipt time, not job completion or a provider ETA. Read failure retains last observed state clearly marked stale and
offers Refresh; unavailable clears everything. Entry, mutation completion and explicit user reads are allowed. Focus,
online, pageshow, visibility or timers themselves never request/retry; existing session lifecycle shielding wins.

After brief correction/approval/revocation, install material mutation truth first, then read current course readiness
through the existing owner. Show read-only readiness impact/return to hub, or a readiness-check failure if that read fails.
A failing dependent read cannot undo a definitive material mutation or falsely report it unconfirmed. Hub always rereads
on entry/Refresh. Separate material readiness/approval from course activation/new-session eligibility. Qualifying-material
blockers may now link to the implemented materials list; assignment/activation links remain out of scope.

## Brief review, correction and approval block

The brief is an object, not one Markdown string and not raw HTML. Implement an accessible structured editor, not a JSON
blob textarea or a summary-only PATCH that drops sections. Expose summary, subjects, supported learning goals, sections
(label/title/description/search terms), warnings and optional educational level. Version is fixed at 1; section sequence
is derived from ordered rows and never entered as arbitrary identity. Use local stable row keys for add/remove, correct
focus restoration and deliberate reordering if provided. Native disclosures may bound 500 sections without hiding data
or changing cell/section order. Do not claim OCR positions are printed pages or fabricate educational content.

One `materialBrief` API-boundary module owns response validation, complete request mapping and bounds: code points,
per-field UTF-8 caps, item caps, positive contiguous section sequence, known fields and 256 KiB encoded brief cap. Backend
normalization/rejection is final; don't normalize displayed drafts silently. Compare returned normalized brief for no-op
semantics, not raw draft equality. Preserve nullable absent state, never invent educational_level/learning goals.
Use field error associations and a linked summary for multiple errors; no dispatch on local failure.

Structured preview displays every persisted field. Render narrative summary/section descriptions through `ModelMarkdown`;
other strings use `UserText`/escaped controls. Provide a labelled heading context beneath native route/brief section
headings, and preview dirty input separately from saved state. Preview is not saved approval truth. Brief source labels
Generated/Supervisor corrected come only from brief_source, with returned timestamps in the viewer's time zone.

Machine 18 owns the editable memory-only draft versus applied backend baseline and immutable submitted object. Freeze
editing while submitting/unknown/reconciling. Known rejection preserves draft; unknown preserves unconfirmed submission
without success or revocation copy. Explicit Refresh reads current material; matches means current values observed, not
proof of this PATCH's execution; differs keeps input distinct and offers Review current/Discard. Newer reads must not
silently overwrite dirty input. Security/scope loss overrides Stay and drops draft/submitted/error references.

Approval route shows saved brief preview, separate state labels, deliberate review acknowledgement/confirmation and
Approve only for current course-wide ready material with a validated non-null brief. No approve while dirty/unknown save.
Before final activation revalidate material and course; changed brief/state invalidates acknowledgement and requires
review again. Send exactly one bodyless approval request. No-op/unchanged returned material remains unchanged truth.
Revoke route names reduced student access/retrieval and possible readiness loss, confirms deliberately, and returns only
after definitive response. Pending/rejected/unknown states have no optimistic approval flag. Do not generate a reviewed
state, regenerate edited ready briefs, copy provider data, or auto-approve after correction.

## Required platform/markdown infrastructure — AD-6

Existing `README.md` and `<bdi>` `UserText` are not a locked Markdown implementation. Keep/strengthen UserText's escaped
inline isolation and add a single exported `ModelMarkdown` boundary. All configuration/plugins/components live only in
`src/platform/markdown`. Consumers supply text and trusted content-context labels only, never parser options/plugins,
arbitrary props, HTML or sanitizer overrides. No `dangerouslySetInnerHTML` anywhere.

Use installed react-markdown 10.1.0 to React elements, a local table-only remark plugin with installed
micromark-extension-gfm-table/mdast-util-gfm-table, remark-math 6.0.0 and rehype-katex 7.0.1/KaTeX 0.18.7. No
rehype-raw, full remark-gfm, autolink extension, syntax-highlighting package, HTML-string stage or new dependency.
Enforce the ownership in `check-architecture.mjs` (reject renderer/plugin imports outside platform/markdown) with tests.

### Locked AST and property policy

- Parse raw HTML as inert text (local AST transform converts raw/html nodes to text); never enable HTML parsing.
  An image node becomes inert alternative/source text, never img; HTML/SVG/MathML input does not enter a generated tree.
- Only paragraphs, safe demoted headings, strong/emphasis, complete ordered/unordered lists/list items, blockquote,
  line breaks, code/pre, simple semantic tables and validated explicit HTTPS anchors render as ordinary content elements.
  Every renderer builds fresh controlled props; never spread node properties. Ordinary content has no input IDs, names,
  class/style/event attributes, form/control/media/embed/frame/SVG/MathML tags or arbitrary attributes.
- Sanitize/reconstruct the AST within this owner with an explicit tag/property allowlist and controlled component map.
  Default/unknown nodes render their escaped text. No reliance on react-markdown defaults alone after plugins.
- Demote shallowest content heading to h4, preserve relative ordered depth without skipped levels, deeper than h6 to
  strong paragraph; malformed/empty/unstable heading is text. No generated heading IDs. Brief preview supplies stable
  native h2/h3 context outside renderer; untrusted heading text never owns IDs or live-region names.
- Explicit link parsing rejects non-absolute HTTPS, credentials, controls/whitespace obfuscation, unsafe/encoded schemes,
  protocol-relative and malformed URLs. No arbitrary-text autolinking. Allowed anchors expose normalized ASCII host and
  full inspectable destination, localized visible/programmatic new-tab disclosure, target=_blank, rel=noopener noreferrer,
  referrerPolicy=no-referrer. No preview, fetch, preconnect, DNS-prefetch or copy-link helper. Same-origin app navigation
  is outside this renderer and constructed by trusted route owners.
- Table validation happens before semantic rendering: determinate nonempty headers, consistent dimensions, no spans,
  linear order. Give a localized context/table-sequence caption, th scope=col, native cells; ambiguous/malformed input
  becomes labelled linear text. A labelled keyboard overflow region exists only when genuinely overflowing.
- Code remains selectable plain text, wraps by default, labels recognized language without importing syntax classes;
  Copy code is explicit, exact plain source with concise success/denial feedback through the single announcer. Optional
  nonwrap view has labelled focusable contained overflow, not page scrolling. No copy of adjacent hidden metadata.

### Local math and safety

Use the installed locked math pipeline with KaTeX **output=mathml**, trust=false, strict=error, bounded maxExpand=1000,
maxSize=20, no persistent shared macros and no user extension configuration. Prefer native semantic generated MathML
over the HTML-and-SVG layout to avoid needing generator CSS/style/SVG exceptions or extra fonts. It still uses AD-6's
approved parsed-TeX provenance, not input MathML. Generated-only tag/property allowlist supports native mathematical
semantics; strip generator class/style, arbitrary IDs/names/links and any embedded resource/control. Stamp provenance
from actual parsed math nodes inside the owner, never from input classes resembling KaTeX. No blanket allowance of MathML
or class/style based on tag names or input text. Reject resource/HTML-producing TeX commands and macro-abuse fixtures.

Render visual notation and semantic accessible math, with selectable source text and localized parse-failure fallback.
Failed/unsupported/oversized expressions (over 4096 code points) render full escaped source, not truncated output or
an exception containing protected text. Treat expected parse failure explicitly; never forward vfile/error bodies to
console, telemetry or reports. Complex/nested/malformed/oversized and every-chunk attack fixtures gate this pipeline.
Math speech must be meaningful native semantic output, not raw TeX as its only accessible representation. Manual AT
acceptance remains a release obligation, not a prepare claim. No external math engine/service or auto-render DOM sink.

Partial input updates reparse the entire accumulated string through this same policy or show escaped text until a
complete structure is safe; never append chunks. Provide a bounded `partial` mode so incomplete table/list/code/math
does not turn into a fabricated complete structure. Terminal input reconciles through the identical locked policy.
Test this reusable boundary now, but do not implement tutoring stream machinery in this story. No live regions inside
Markdown and no announcements of protected bodies/reparses.

Import the renderer only through lazy brief/approval feature surfaces so its installed parser/math packages do not enter
the initial-route bundle. Preserve FFR-955's 256000 gzip-byte gate and all seven languages; no gate or CSP weakening.
Native MathML requires no KaTeX remote assets. If CSS/fonts are subsequently needed, they must remain self-hosted and
the same security fixtures must pass; do not silently switch to an HTML-string implementation.

## Exact licensed blueprints

Version `2026-09-13-083323`, all `v4/react-light.jsx`, retrieved/resolved and inspected during prepare:

- `Application UI/Forms/Form Layouts/Stacked`: brief form, grouped rows and finalization review actions.
- `Application UI/Forms/Textareas/Simple`: multiline brief fields. MIA deltas: controlled state, descriptions/bounds,
  validation/error associations, min-width/wrapping, and no browser restoration.
- `Application UI/Data Display/Description Lists/Left-aligned with inline actions`: status/detail, brief field preview,
  processing file/job list anatomy and hub links. Reuse 4.3's bindings; no new imitation component.
- `Application UI/Overlays/Modal Dialogs/Simple alert`: finalization/revoke confirmations; use existing Headless UI
  accessible mechanics, Cancel focus, target description, immediate reduced-motion behavior, wrapping and focus outlines.
- `Application UI/Feedback/Alerts/With description`: processing failure/unknown/revocation warning; no independent live
  region. Announcement ownership stays platform/announcer.

Application shell/page heading/dirty dialog/technical disclosure retain existing exact bindings. Rich paragraphs,
semantic tables, code and MathML use DESIGN's explicitly native primitives, not a fabricated Tailwind Plus blueprint.
Record library identity/variant and material accessibility/security deltas in every new/adapted presentation file.

## Accessibility, i18n and privacy

Complete all seven launch-locale catalogs en-US/de-DE/fr-FR/pt-PT/pt-BR/es-ES/es-AR and messages.ts for new field labels,
instructions, state/failure copy,
confirmation consequences, no-notification/last-checked wording, link disclosure, table/code/math context and copy feedback.
Do not translate protected brief bodies/raw error disclosure. Unicode-isolate names and mixed-direction field content;
update document language via established locale owner. Format timestamps in viewer preferences with zone where ambiguous.

One main/h1, title before route focus, parent exit, bypass link, current-route semantics. In-place Refresh/job pagination
does not reset route focus: changed pagination moves to collection heading, routine states leave focus unchanged.
Dialog containment/restoration and error-summary targets remain usable at 320 effective pixels in all three text modes,
200%/400% zoom, text spacing, forced colors/reduced motion; no page horizontal scrolling or hidden actions.

Initial state is silent. Material processing/ready are polite; failure/unknown are urgent; unchanged Refresh only updates
last checked silently. Exactly one approval-revocation announcement per observed revision; priority auth/scope loss,
urgent failure, latest polite state. Urgent revocation blocking an in-flight invalid action focuses visible blocking status.
Use the single announcer, no raw backend/body/Markdown live regions. Dialog open is focus/name, not a duplicate announcement.

All protected bodies/drafts/submitted payloads live only in page memory, no URLs/history/storage/exports/cache prefetch.
On pagehide/security/scope/unmount drop references, unmount fields, fence callbacks and clear confirmation/announcement
state; existing privacy shield is synchronous. No claiming strings or OS/browser caches have been securely erased.
Provider disclosure is truthful: PDF/image OCR may go to Mistral; text/Markdown/DOCX extraction is local, brief generation
uses OpenAI. No claim all processing is local, files are malware-free or copyrights verified. Never send provider calls
from tests or retain protected bodies in reports, screenshots, traces, snapshots, request assertion failures or logs.

## Explicit implementation manifest and ownership

Existing files authorized for scoped edits:

- `src/platform/api/materials.ts`: install needed material metadata, bodyless mutations and safe job reader; existing
  schemas/projectors remain the owner. Do not make unrelated list views retain extra brief bodies merely for convenience.
- `src/app/routes/entryRoutes.tsx`: four canonical route records/parser/path builder and lazy imports.
- `src/app/routes/PrepareMaterialRoute.tsx`: ordered gate, dependent resources, new links and denial teardown.
- `src/features/materials/MaterialRouteProps.ts`: admitted resource/link variants and status descriptors.
- `src/features/materials/MaterialDetailRoute.tsx`: actual continuation links, saved state and last checked.
- `src/features/materials/MaterialListRoute.tsx`: course-wide brief continuation only; preserve private-row non-actions.
- `src/features/materials/MaterialFilesRoute.tsx`: finalization review/confirmation/feedback and failed-file recovery.
- `src/features/materials/useMaterialUploadQueue.ts`: finalization accepted-sequence owner, failed deletion eligibility,
  mutation fencing/teardown; upload remains draft-only.
- `src/features/materials/materialUploadQueue.test.ts`: acceptance invalidation, finalize gating and source recovery.
- `src/platform/api/materials.test.ts`, `src/app/routes/materialPreparation.test.tsx`: update old partial material
  protocol fixtures to current response schema and retain 4.3 admission/non-fetch regressions.
- `src/features/courses/CoursePreparationRoute.tsx`: chooser link for brief review and material-blocker resolution.
- `src/platform/markdown/README.md`: describe actual locked boundary and consumer contract, not placeholder ownership.
- `src/platform/markdown/UserText.tsx`: strengthen only if required for tested bidi isolation; preserve escaped output.
- `src/platform/i18n/messages.ts` and explicit catalogs `en-US.json`, `de-DE.json`, `fr-FR.json`, `pt-PT.json`,
  `pt-BR.json`, `es-ES.json`, `es-AR.json` under `src/platform/i18n/catalogs/`: complete new messages. Preserve all
  seven existing launch locales; do not add Italian/Dutch or treat regional variants as missing languages.
- `scripts/check-architecture.mjs`: enforce sole renderer/plugin owner without weakening existing checks.
- `e2e/materialFixtures.ts`: contract-complete attributes and optional controlled processing/brief/approval fake support.
  Preserve default 4.3 regression behavior and don't simply remove forbidden-request assertions from unrelated journeys.
- `e2e/secret-hygiene.failure.ts`, `scripts/secret-hygiene-evidence.ts`: applicable new protected-flow checkpoints.
- `_bmad-output/implementation-artifacts/spec-4-4-process-material-and-approve-its-brief.md`: block progress/evidence.

New files planned (no application files created in prepare):

- `src/platform/api/materialBrief.ts`: structured Brief validation/request serialization/bounds.
- `src/platform/api/materialBrief.test.ts`, `src/platform/api/materialLifecycle.test.ts`: transport/identity/null/bounds.
- `src/platform/markdown/ModelMarkdown.tsx`: single public locked rendering boundary.
- `src/platform/markdown/markdownPolicy.ts`: local table-only plugin, AST sanitization/provenance/heading policy.
- `src/platform/markdown/MarkdownTable.tsx`, `MarkdownCode.tsx`, `MarkdownMath.tsx` in that directory: controlled native
  renderers; configuration remains internal to the boundary.
- `src/platform/markdown/ModelMarkdown.test.tsx`: semantic and adversarial/every-chunk fixtures.
- `src/features/materials/MaterialProcessingRoute.tsx`: read-only processing and safe job pagination.
- `src/features/materials/MaterialBriefRoute.tsx`, `MaterialBriefFields.tsx`, `MaterialBriefPreview.tsx` in that directory:
  structured correction and shared saved preview (same feature, not cross-feature imports).
- `src/features/materials/MaterialApprovalRoute.tsx`, `MaterialRevokeRoute.tsx` in that directory: deliberate approvals.
- `src/features/materials/useMaterialLifecycle.ts`: operation-specific lifecycle/confirmation/reconciliation and ledger.
- `src/features/materials/materialLifecycle.test.tsx`: mutation/state/dirty/teardown component integration.
- `e2e/materialLifecycle.spec.ts`, `e2e/markdownBoundary.spec.ts`: protected CP-03/browser/renderer regressions.
- `_bmad-output/implementation-artifacts/manual-evidence-4-4.md`: reproducible manual scripts, actual evidence only if run.

Prepare-owned outputs (not commit candidates): `tmp/agent-execution/4-4-process-material-and-approve-its-brief/prepare-report.json`,
`prepare-checks.log`, and the backend request in `mia/tmp/`. No package.json/lockfile/generated API changes are planned:
all operations and required renderer packages already exist. App.tsx or CourseRouteProps need no new router abstraction;
ask solver for a manifest adjustment only if inspection proves an additional file is concretely needed. Tracking/checkpoint
changes belong to solver. Never stage tmp, backend requests, credentials, licensed source or baseline user changes.

## Targeted checks and final verification plan

Implement focused blocks sequentially; record progress here after each completed block. Run no overlapping checks.

1. Boundary tests: complete request identity/body/media/CSRF/status, no unsafe retry, response course/ID mismatch,
   complete brief round-trip incl. null omitted request collections, normalized no-op, Unicode/UTF-8/encoded caps,
   contiguous sequence and unknown fields; malformed success is unknown, safe jobs do not expose diagnostics.
2. Queue/finalize tests: every acceptance invalidator, queue selected/unknown/deletion/read blockers, empty files,
   failed-source deletion returns draft only after read, changed preflight clears review, definitive response freeze,
   lost-after-commit/Stop waiting/late success/late denial, exactly one dispatch, failed re-finalize and scope loss.
3. Component integration: all technical/approval states, saved-vs-draft preview, correction/no-op/revocation, explicit
   approve/revoke, dirty departure/Back/Refresh, ineligible/denied, wrong-course/private-scope dependent non-fetch,
   readiness read failure separate from confirmed material mutation, reconciliation matches/differs/newer results.
4. Renderer tests: allowed semantic subset, normalized/demoted headings, raw HTML/SVG/MathML/CSS/control/media/image
   exclusion, mutation-XSS/DOM-clobbering, no autolink, dangerous/credential/obfuscated URLs and non-fetch, valid link
   destination/opener/referrer/disclosure, malformed/ambiguous table fallback, exact code copy/denial, local math simple/
   complex/nested/oversized/malformed and trust/macro/resource attacks. Split each adversarial input at every character
   boundary, render partial prefixes and terminal full content through same boundary; assert no forbidden DOM/request.
5. Playwright local fakes: full upload/review/finalize → explicit status Refresh → brief correct → approve → changed
   brief revoked → deliberately reapprove/revoke; reload/direct entry/Back/Forward/offline/tab return/BFCache and
   delayed mutation results. Assert ordered admission and no lifecycle/polling/provider traffic. Safe job pagination
   follows links, never infers complete aggregate. Retain existing 4.3 unknown-row/delete regressions.
6. Automated accessibility: representative stable states scanned with installed axe; heading/title/main/labels/errors,
   keyboard confirm/dirty dialogs/fallback focus/24px targets, announcement ledger unchanged/changed/urgent outcomes,
   direct 320px all three text modes and seven locales, 200% browser zoom, 1280/400% effective-width lane, spacing,
   forced colors and reduced motion. Tables/code/math have only contained labelled overflow. No blanket axe suppression.
7. Hygiene: protected brief marker generated per test (not committed fixture body), artifact capture off, assertions
   print booleans/content-free IDs only; deliberate-failure checkpoints and output/artifact scan for processing/preview/
   pending/unknown/rejected/teardown. Extend established harness rather than writing protected logs.
8. Focused commands: `npm run typecheck`; `npm run lint`; `npm test -- <affected test paths>`; sequential local build
   plus `npm run test:e2e:built -- e2e/materialLifecycle.spec.ts e2e/markdownBoundary.spec.ts` as supported by script;
   catalog completeness/architecture/bundle checks as affected. Do not call full gate in implement/fix.
9. Verify phase only: inspect final scoped diff, run `./run-all-tests.sh` once for final application/config state,
   record baseline, full content fingerprint (including new files), commands/results/content-free logs/skips. No
   app-change completion claim from fast checks alone; docs-only preparation does not run the application gate.

Manual scripts cover Chrome/Edge/Safari, Safari native generated-MathML and screen-reader comprehension, zoom/focus/
forced colors, meaningful math speech and real browser link isolation. Automated Chromium does not replace that evidence;
unrun release matrix cells remain Not run, not Pass. Record scanner/version/fixture/result and test artifact paths only.

## Risks and open decisions

Settled: no new dependency; AST-only local sanitizer, table-only GFM; native generated MathML configuration; chooser hub
link; no automatic status/retry; existing fixed-effect approval transport; timestamp/transition announcement ledger;
null-response-to-optional-request mapping; current documented failed-material correction; exact blueprints.
No owner decision remains open for this bounded slice. Risks: large structured briefs/500 sections and math reflow;
post-Stop late result handling; bundle eagerness; missing approval revision; unsupported native math/AT behavior must
be reported rather than claiming release conformance. Full BCG/release obligations outside this story remain open.

## Completed blocks and resume notes

- Prepare block 1 complete: baseline/full diff and known dirty-file ownership inspected; checkpoint/companions/rules read.
- Prepare block 2 complete: OpenAPI operations, full Brief/BriefRequest differences and product revocation/processing checked.
- Prepare block 3 complete: 4.3 queue/admission/session/dirty-form reuse mapped; no existing locked renderer found.
- Prepare block 4 complete: dependencies/Chromium/model catalog/license/exact blueprints checked; no installs required.
- Prepare block 5 complete: bounded spec and non-blocking approval-revision backend request drafted; prepare report supplied.
- Next: solver records ready decisions/manifest, then dispatches implement only. No implementation or completion claim here.

### Implementation resume record

- Implement block 1 code installed: version-1 brief boundary, complete nullable request mapping, scoped material mutations
  and safe jobs; existing contract fixtures updated. Typecheck iteration 2 passed. Focused boundary tests pending.
- Implement block 2 code installed: locked AD-6 AST reconstruction, table-only parser, generated-only native MathML,
  explicit isolated HTTPS links, selectable code/copy and escaped partial mode. Security/browser fixtures pending.
- Implement block 3 code installed: queue finalization preflight/confirmation/ambiguity fences and failed-source removal;
  four canonical gated lazy routes, structured brief editor, approval/revoke and status/readiness reconciliation.
- All seven catalog translations installed. Existing user bookkeeping remains untouched; no staging, commit or full gate.
- Remaining: focused adversarial/lifecycle/unit/Chromium tests, teardown/focus refinements from evidence, static/format/
  i18n/duplication/hygiene/bundle checks, manual evidence script and scoped diff/report/manifest.

### Implementation completed blocks — 2026-10-09

1. API block complete: addressed complete version-1 brief validation and minimized collection projection, nullable
   request mapping, bounds and identity checks, exact bodyless finalization/approval/revoke operations, safe scoped jobs.
   API fixtures stay local, use current CSRF and never replay unsafe requests.
2. AD-6 block complete: sole AST reconstruction policy with table-only GFM, inert raw input, generated-only bounded
   native MathML, heading demotion, isolated explicit HTTPS links, source-selectable code/copy, escaped partial updates.
   Every-character-boundary attacks, URL variants, malformed tables/math and unauthorized parser imports have focused tests.
3. Lifecycle block complete: reviewed file preflight/confirmation, mutation fences, failed-source recovery/re-finalization,
   four lazy canonical routes and ordered admission, structured saved/draft preview, deliberate approval/revoke and
   readiness reconciliation. No activation, private actions, downloads, polling, runtime dependency or CSP changes.
4. Catalog/navigation block complete: all seven catalogs, truthful state labels, unconditional meaningful-edit warning,
   hub chooser and per-material continuations. The prepared timestamp/transition revocation ledger is unchanged in intent;
   no version-lock claim or additional backend request was introduced.
5. Focused evidence block complete: 57 approved-scope unit/component tests and 13 new Chromium tests passed; direct 320
   all locale/text-mode routes, 200%/400% zoom in all three modes, representative axe preview/approval/dialog states,
   no external fetch/opener/referrer, explicit Refresh, dirty Back/Stay, scope/pagehide teardown and ambiguity exercised.
   Static typecheck/lint/architecture/typecheck-coverage, seven-catalog ICU checks and marker-balance/zero-clone scan pass.
   Two duplicate ranges are licensed presentational anatomy only; approval and finalization contracts remain separate.
6. Hygiene evidence block complete: established scanner/checkpoint identity logic reused in an ignored scoped runner;
   three actual lifecycle unit tests/six checkpoints and six browser deliberate-failure states, with early-failure canaries,
   passed original output/artifact marker scans. Initial iteration emitted a synthetic brief through Testing Library
   diagnostics; that raw log was replaced with content-free evidence and guarded diagnostic errors were added. Do not
   claim there was no historical exposure. The focused-runner initial anchored Playwright grep selected no tests;
   corrected selection then passed. Temporary runner lint imports were repaired without changing ESLint configuration.
7. Build/budget block complete: final local build passed with the existing >500 kB chunk advisory; FFR-955 initial JS is
   **255829 gzip bytes**, within unchanged **256000** limit (171 bytes headroom), with all seven languages retained.
8. Manual script/evidence handoff complete: `manual-evidence-4-4.md` has reproducible numbered scripts and all supported
   browser/AT cells explicitly Not run. A manual local fixture server must be provisioned; Safari/native-MathML/AT speech
   acceptance is not established by bundled Chromium. No full gate, installs, paid calls, staging or commit occurred.

### Known related-test regression / requested solver manifest adjustment

The wider affected-owner regression run found four stale test expectations in three **unmodified**, currently
out-of-manifest files. The approved hub chooser and newly resolved qualifying-material blocker create multiple legitimate
links to the same material-list destination. Do not remove those required links merely to satisfy old unique-link tests.

- `src/app/routes/coursePreparation.test.tsx:277`: `preparation validates Unicode bounds then installs persisted distinct
  teaching values` assumes exactly one list link; related unit run was 68 passed / 1 failed.
- `e2e/coursePreparation.spec.ts:109` and `:243`: connected-fields and readiness/blocker journeys retain old unique-link
  or unresolved-destination expectations.
- `e2e/materialPreparation.spec.ts:518`: connected native-picker journey uses a strict destination-only locator, now
  ambiguous between list navigation, qualifying-material recovery and the clearly labelled brief chooser.
- Combined related Chromium run: 41 passed / 3 failed, including all 13 new tests passing. No required product boundary
  was weakened; these files were left untouched because this spec expressly requires solver approval for extra paths.

Next action: solver authorizes adding these three regression-test paths to the story manifest, dispatches their bounded
expectation/semantic-locator update and reruns those affected cases **before** independent review/final gate. This is a
solver scope adjustment, not an owner product/contract question. Full verification must not be reported while these
known related regressions remain. No owner-intervention notification was required.

### Final handoff artifacts

`tmp/agent-execution/4-4-process-material-and-approve-its-brief/implement-report.json`, `manifest.json` and `story.diff`
contain the explicit story scope, checks/limitations and complete tracked/new-file diff, excluding baseline workflow/
tracking changes and the solver checkpoint. Content-free check logs are enumerated in the report. Review and final
authoritative gate remain separate phases; this record does not set sprint status or claim story completion.

### Authorized navigation-regression extension — 2026-10-09

Solver explicitly authorized the three previously out-of-manifest test paths listed above for this implement resume.
This is the same bounded test extension as 4.3, following the epic's staged upload/brief-resolution links and acceptance
6/§BCG reconciliation here, not new product behavior. The earlier requested-adjustment notes describe historical evidence.

- `src/app/routes/coursePreparation.test.tsx`: replace unique-destination count with separately named navigation and brief
  chooser checks plus the qualifying-material recovery destination. Existing forbidden destinations stay forbidden.
- `e2e/coursePreparation.spec.ts`: assert both clearly named hub navigation links, and exactly the qualifying-material
  blocker resolution when present. Hostile backend links, supervisor assignment, activation and guessed brief destinations
  remain inert/absent. No denied/restricted-stage cases changed.
- `e2e/materialPreparation.spec.ts`: use the Course preparation navigation's exact Course materials link instead of an
  ambiguous destination-only locator. All private-row, denial, restricted-stage and forbidden-request negatives remain.
- Extension block complete: the four failing regressions now pass (one unit, three bundled-Chromium). No production code,
  tracking, index or commit changes in this resume. Remaining: affected suites and focused static/hygiene/budget rechecks,
  final diff/manifest/report generation, then independent review and separate final verification.

### Final focused rechecks after extension

- Eight affected unit/component suites: **69 passed, zero failed**. Four affected Chromium suites: **44 passed, zero failed**,
  including all four original regressions. Existing denial, restricted-stage and private-row negatives remain intact.
- Typecheck, lint/architecture, typecheck-coverage canaries, explicit 48 non-exempt-file format, all seven ICU catalogs,
  Markdown README lint and diff whitespace pass. An initial typecheck caught two unsupported Testing Library `exact`
  options; removed them (string accessible-name matching remains exact) and reran the affected unit checks successfully.
- Duplication: **108 logic source files, zero clones**, balanced markers. Protected hygiene: **four actual unit tests/eight
  checkpoints**, **six browser state probes**, and **three actual authorized browser journeys/nine checkpoints**; all
  original output/artifact marker scans pass and all three early-failure canaries are rejected correctly.
- Production build passes, unchanged chunk advisory; initial JS remains **255829/256000 gzip bytes**, **171 bytes headroom**,
  retaining all seven languages. No dependencies, CSP, budget, installed tooling or application source changed on resume.
- Final manifest contains **50 story files**, including the three authorized regression extensions. Reporting artifacts
  contain hashes, commands and results; no protected bodies. Tracking files remain untouched and nothing is staged or
  committed. Next: independent review, then the separate authoritative verify phase. Manual supported-browser/AT cells
   remain Not run; no release-conformance or story-completion claim.

### Review repair batch — 2026-10-09

- R1 block installed: boundary errors retain field identity, corrective reason and bounds; shared localized formatter
  `src/features/materials/materialBriefFeedback.ts` serves actual editor descriptions and named summary links. Required
  instructions remain controlled (no native validation bypass). Mounted editor/feedback test covers multiple empty fields,
  an empty subjects collection, over-limit warning, zero invalid PATCH, focus/link disclosure and corrected submission.
- R2 block installed: material-truth changes invalidate readiness; explicit Refresh installs the course read and clears
  prior readiness failure. A distinct readiness-attempt fence blocks dependent reads superseded by Refresh or teardown;
  confirmed mutation truth is not undone by readiness failure. Successive-save/failure/Refresh/late-read unit case passes.
- R3 block installed: queue publishes deduplicated current finalization transitions, not eventual action completions.
  Definitive material transition commits through the existing announcer before its navigation callback; no history,
  storage or static direct-entry announcement. Existing job IDs/states are observed in route memory; changed jobs announce
  via the same owner, while newly encountered pagination rows are initial observations. Teardown clears observations.
- Focused iteration: 25 unit tests in three files pass. Initial mounted-focus assertion raced the existing row-removal
  animation-frame focus restoration; the test now waits for that user-action completion before submitting. No protected
  diagnostics were printed. Browser occurrence-ledger tests are installed and pending execution.
- Authorized bounded FFR-955 mitigation was necessary: first repaired build measured 256629/256000 gzip bytes.
  `scripts/message-catalogs.ts` packs public message descriptors into build-time triples and reconstructs the same typed
  public descriptor map at runtime. `scripts/message-catalogs.test.ts` proves full identity/default/catalog parity. These
  two existing build/test files are the only mitigation scope extension; the seven locale catalogs remain complete,
  synchronous switching, dependencies, CSP and the 256000-byte budget stay unchanged. Measured repaired build with the
  mitigation: 255874 gzip bytes (126 bytes headroom). New shared feedback file is required by R1, not an abstraction rewrite.
- Review provenance: dispatch supplied all R1-R3 wording, but no additional evidence-assessment positives/limitations or
  tracker/spec-consistency prose. `review-report.json` preserves supplied finding wording and explicitly records that
  missing prose was not fabricated. No owner question or notification was required.
- Remaining: affected unit/Chromium suites sequentially; static/format/i18n/duplication/hygiene; final bundle recheck,
  fix report and complete scoped diff/manifest. No authoritative full gate, staging, commit or tracker/checkpoint edit.

### Repair batch final focused evidence

- R1-R3 dispositions: fixed, pending independent re-review. **92 tests pass in 10 affected unit/component/build-catalog
  suites; 47 pass in four Chromium suites**. New browser occurrence assertions prove definitive processing announces once
  before navigation, stopped late success does not repeat unknown, static processing entry is silent, changed observed
  queued/running/failed jobs announce once, unchanged Refresh and newly encountered pagination rows do not replay job
  transitions, and late finalization/read completions after teardown remain silent.
- Same-route readiness case covers accepting readiness, meaningful save/revocation, dependent failure (no prior accepting
  claim), successful blocked-readiness Refresh, older delayed dependent response, and dependent-read teardown. Confirmed
  material mutation truth remains intact on readiness failure. Real editor/feedback case covers named required/maximum/
  minimum descriptions and summary links, field associations, error-summary focus, disclosure opening, and valid recovery.
- Typecheck, lint/architecture, typecheck-coverage canaries, 51 non-exempt story-file format, seven-catalog ICU completeness,
  README Markdown lint and tracked diff whitespace pass. Duplication: 113 selected source paths, 109 analyzed files,
  balanced markers, zero clones. No suppressions, threshold changes or warnings hidden.
- Original-output/artifact hygiene passes: six actual unit tests/12 checkpoints (including new validation and readiness
  cases), six browser state probes, three actual existing authorized browser journeys/nine checkpoints; all three
  early-failure canaries rejected. Original probe artifacts are removed by the established scanners. New announcement
  browser cases are not individually deliberate-failure probed; assertions/ledgers contain counts and static intents only.
- Final production build passes with existing chunk-size advisory. FFR-955: **255876/256000 gzip bytes**, **124 bytes
  headroom**, all seven locales retained. Mitigation mechanism and exact two-file scope are recorded above. One browser
  iteration failed because its observer stored singular `job` while the assertion read plural `jobs`; corrected only the
  test ledger key, then all affected suites passed. No product boundary was weakened.
- Final artifacts: `tmp/agent-execution/4-4-process-material-and-approve-its-brief/fix-report.json`, `manifest.json`,
  `story.diff`, `review-report.json` and content-free `fix-*.log`. All baseline tracking/workflow files and the index remain
  unchanged by this worker. Full gate deliberately not run in fix; manual supported-browser/AT evidence remains Not run.
- Next: independent re-review of R1-R3 using refreshed diff/evidence, then separate authoritative verify phase.

### Re-review repair batch 2 — 2026-10-09

- Supplied re-review findings persisted as `tmp/agent-execution/4-4-process-material-and-approve-its-brief/rereview-report.json`
  because no persisted rereview report was present. R3 is cleared; preserve its correct batch-1 work.
- R1 block installed: collection fieldsets derive `aria-invalid` from their exact matching BriefError, retaining their
  corrective description. Mounted-fields test activates empty Subjects summary link, checks fieldset focus/invalid state/
  corrective description and clears invalid state after a valid subject is added.
- R2 block installed: dependent readiness results run applicable hidden denial handling before the ordinary attempt fence.
  The existing denial owner still checks mounted/active state; Stop cannot suppress a current course denial, while late
  ordinary success and post-teardown results remain fenced. No changes to session ownership or security epochs.
- Regression matrix installed: held dependent GET after definitive save, Stop or teardown, then success/404/403
  course_unauthorized. Checks unavailable invocation, cleared material/draft/readiness, no replay and definitive truth
  retained for stopped late success. Six content-free deliberate-failure checkpoint pairs registered with the existing
  hygiene owner. Initial red run reproduced R1 and both stopped-denial regressions; teardown pending assertion was a test
  assumption (the form is unmounted), corrected to wait for controlled read completion rather than mounted-form pending.
- Remaining: sequential focused unit/Chromium, static/format/i18n/duplication/hygiene and bundle checks, then refreshed
  fix report, scoped diff and manifest. Tracking untouched; no staging, commit, full gate or owner question.

### Batch-2 final focused evidence

- R1 residual and R2 security regression fixed, pending independent re-review; R3 remains cleared. Six batch-2 paths:
  `MaterialBriefFields.tsx`, `useMaterialLifecycle.ts`, `materialLifecycle.test.tsx` under `src/features/materials`,
  `e2e/materialLifecycle.spec.ts`, `scripts/secret-hygiene-evidence.ts` and this spec. Only two application files changed;
  no further bundle-mitigation scope extension or source re-derivation was necessary.
- Required sequential lifecycle/queue unit commands pass **22 + 15 tests**. Final ten affected unit/component/catalog
  suites pass **98 tests**; final four Chromium suites pass **51 tests**. Mounted editor checks focus, corrective description,
  collection invalid state and clearing; browser checks the same. Held dependent-course GET tests cover 404 and 403 after
  Stop through the real session owner and fixed unavailable host, with no material/draft left mounted; stopped late success
  cannot install readiness. Unit matrix additionally covers success and both denials after teardown with no unavailable
  callback. Existing readiness invalidation, failure clearing, reconciliation and delayed-success tests stay intact.
- Typecheck, lint/architecture, typecheck-coverage canaries, all 51 non-exempt story-file formatting checks, seven-catalog
  ICU completeness, README Markdown lint and tracked diff whitespace pass. Duplication: 113 selected source paths,
  109 analyzed files, balanced markers, zero clones; no suppressions or gate changes.
- Original-output/artifact hygiene passes: **12 actual unit tests / 24 checkpoints**, six material browser state probes,
  three existing browser journeys / nine checkpoints, and all three early-failure canaries. Six new readiness matrix
  tests are deliberately failure-probed. Four new browser cases use content-free assertions and disabled capture, but
  are not individually deliberate-failure-probed; existing browser-state probes cover the related protected states.
- Chromium test-only iterations resolved: pending readiness intentionally masks generic save feedback, so the test now
  asserts returned Supervisor corrected provenance; the fixture counts the initial `/brief` document request, so the
  test asserts exactly that one count and no new forbidden requests. No production behavior or unrelated negative changed.
  The collection test's corrective description expectation was aligned with the existing named Subjects message.
- Production build passes with the unchanged chunk advisory. FFR-955 initial JS is **255860/256000 gzip bytes**,
  **140 bytes headroom**, all seven locales retained. Batch-1's descriptor-packing mechanism/files stay unchanged.
- Refreshed `fix-report.json`, `manifest.json` and complete `story.diff` live under
  `tmp/agent-execution/4-4-process-material-and-approve-its-brief/`, with batch-2 logs and input fingerprint. No full gate,
  staging, commit, dependency install, tracking/checkpoint edit or owner question. Manual supported-browser/AT evidence
  remains Not run. Next: independent batch-2 re-review, then the separate authoritative verification phase.

### Authorized stale-navigation repair and fresh gate — 2026-10-09

- Solver authorized only the stale navigation expectations for now-implemented 4.3/4.4 material routes, followed by
  affected navigation suites, a sequential material smoke and one fresh authoritative gate. No staging or commit.
- Repair installed in `src/app/routes/routeNavigation.test.tsx`: move `/brief` from unsupported suffixes to the existing
  admitted material-path matrix. Its opaque identity, exact assigned-course scope and `courses.supervise` denial checks
  now match §Routes, gates and reuse and ROUTE-INVENTORY §Material Brief Review. Every other expectation is unchanged.
  This parser assertion does not bypass the existing mounted ordered gate or change anonymous/restricted behavior.
- Inspected nearby unit and Chromium navigation/recovery, course preparation and material preparation tests. No sibling
  stale negative for materials/new, material detail/files or brief remains. Guessed hub `/brief`, `/review`, `/finalize`,
  `/activate`, malformed paths and unimplemented destinations retain their negative expectations.
- Prior authoritative gate failed only this stale suffix assertion (771 passed / one failed); preserve its report/logs
  and fingerprint history. Focused regressions and the single fresh gate are pending; record final results in
  `tmp/agent-execution/4-4-process-material-and-approve-its-brief/verify-report.json`.
- Focused block complete: navigation/recovery/course unit suites **27 passed**; navigation/recovery Chromium suites
  **24 passed**; material preparation/lifecycle unit smoke **35 passed**; complete material lifecycle Chromium smoke
  **one passed**. All sequential, no build or source/config change. The first smoke grep matched no tests because it
  anchored the full Playwright title; corrected only selection, then the intended journey passed. This failed selection
  is retained as history, not counted as a passing test. Fresh full gate pending.
- Fresh verification block complete: one synchronous `./run-all-tests.sh` exited **0**; **772 unit tests in 37 files**,
  **214 Chromium tests**, all static/config/format/i18n/API regeneration/hygiene/duplication/audit/catalog/Markdown stages
  passed their gate policies. **One build** was reused within the invocation; initial JS **255860/256000 gzip bytes**,
  **140 bytes headroom**. **No gate components skipped**. Input fingerprints before/after are identical (482 inputs).
- Existing advisories remain visible: >500 kB chunk warning, jsdom document-navigation diagnostic, four low npm-audit
  entries (transitive KaTeX; Trivy reports one low vulnerability). Trivy's SendGrid match is a verified false positive:
  compiled public ISO country-code list matches `src/features/auth/countryCodes.ts`, not a credential. No suppression,
  dependency change or additional repair. Manual supported-browser/AT evidence remains Not run.
- `verify-report.json` preserves failed-run history and fresh gate results/fingerprints/log paths; `fix-report.json` and
  `manifest.json` record the authorized extension. Complete `story.diff` excludes baseline bookkeeping. Index unchanged;
  no staging or commit. Next: solver handles scoped re-review/checkpoint/authorized commit decisions, not this dispatch.
