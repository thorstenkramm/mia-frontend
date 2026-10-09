# Story 4.4 manual release evidence

## Identity and status

- Baseline: `025a5b0a30cd8fe68cfe33a876a3551345aba6c7`; implementation is uncommitted.
- Binding scope: `spec-4-4-process-material-and-approve-its-brief.md`; CP-03 and its referenced AC requirements.
- Fixture: local controlled `materialBackend(page, { lifecycle: true })` from `e2e/materialFixtures.ts`.
- Automated setup examples: `e2e/materialLifecycle.spec.ts` and `e2e/markdownBoundary.spec.ts`.
- No actual Chrome, Edge, Safari or assistive-technology manual run was performed by this worker.
- All manual results below are **Not run**, not Pass. Safari/native-MathML and meaningful math speech remain release obligations.
- Never use production/student data, real provider calls or actual credential values. Record content-free notes only.

## Reproducible local fixture preparation

Use a test-only local protocol server implementing the named fixture's session, complete capability/scope,
course, material, files, jobs, PATCH, finalization and approval representations. Keep the fixture's synthetic values
in memory only. Bind it to a same-origin local static build and open the browser manually; Playwright routing does
not create a persistent server for a separately launched Safari/Edge browser. A manual fixture server is not included
in this story; provision one before recording these cells. Do not point the scripts at a paid provider/backend.

The fixture state progression is `draft → processing → ready`, a generated complete version-1 brief, an approved
brief, a meaningful corrected brief with revoked approval, then deliberate reapproval and revocation. Supply a safe
two-page job collection. Configure rejection, a lost committed response and a delayed response independently.

For rich content use the static adversarial cases in `ModelMarkdown.test.tsx`, plus a semantic table, code block,
simple fraction/exponent and nested fraction/root. Give body markers random per-run identities; never copy them into
this document, evidence attachments, logs or defect titles.

## Result envelope for each execution

Record tester, date, exact OS/browser/AT versions, build input fingerprint, fixture revision, language/text mode,
viewport/zoom, action number, actual focus, actual concise speech/visual result, content-free timestamped notes or
recording link, and defect link. Do not capture protected DOM, source files, typed bodies, raw errors or clipboard values.
Screenshots alone are insufficient for dynamic reading/focus. No evidence or defect link exists yet.

## Script A — finalize, Refresh, correction and approval

1. Open the draft material's `/files` route using only opaque fixture IDs. Expected: one main/H1, localized title
   before H1 focus, a usable bypass link and parent navigation. Tab through native picker and queue controls.
2. Select and upload one synthetic PDF. Accept the authoritative complete file list and activate Finalize and process.
   Expected: Cancel receives initial dialog focus; material and source set plus freeze/provider consequences are available.
   Tab remains contained. Cancel restores the trigger; a second deliberate confirmation sends exactly one request.
3. Confirm and observe processing. Expected: separate technical/educational state, safe per-file/job states, last checked
   and explicit Refresh. Waiting, focus, tab return and online signals never send polling or renew sign-in deadlines.
4. Change fixture truth to ready without navigating. Expected: no readiness claim until explicit Refresh. Refresh preserves
   focus; job Next/Previous moves focus to the job heading, never claims aggregate completion or provider retry time.
5. Open the brief. Review every persisted structured field, section sequence and source/timestamp. Edit summary and a
   section. Expected: saved preview and unsaved preview stay distinct; an approval-revocation warning precedes editing.
   Empty a required field and submit: error summary links to the invalid field; no request is sent.
6. Correct and save. Expected: only returned material truth replaces persisted fields. An approved meaningful correction
   revokes approval; a normalized no-op does not. A failed readiness read reports recovery without undoing the saved brief.
7. Open approval, deliberately acknowledge review and confirm. Expected: Cancel initial focus, saved complete preview,
   one bodyless approval request. Change the fixture brief during review; confirmation must invalidate acknowledgement
   and require new review rather than approving silently. Approval is distinct from technical readiness/course activation.
8. Revoke after reading consequences. Expected: one bodyless DELETE, no optimistic removal, current readiness reread,
   and detail navigation only after definitive success; failed dependent readiness remains a visible confirmed-state recovery.

Actual result: **Not run**. Tester/date/environment/evidence/defect: **Not recorded**.

## Script B — ambiguity, rejection, departure and shielding

1. Lose the committed finalization response. Expected: outcome unknown on `/files`, no processing-start success and no
   automatic repeat. Explicit reconciliation may show current state but never attributes it to the unknown request.
2. Lose a corrected-brief response. Expected: locked input retains the immutable submission without saved/revoked claims.
   Refresh compares current values; matching values are observation only. Differing values stay separate until deliberate discard.
3. Delay a correction, activate Stop waiting and then release the response. Expected: late success stays fenced; a current
   hidden denial clears all protected content even after the stopped wait. No automatic mutation replay occurs.
4. Reject a correction/approval/revocation. Expected: localized correction and collapsed inert technical disclosure;
   current approval remains unchanged, draft is retained where permitted, no success copy or guessed outcome.
5. Edit and use Back/parent. Expected: Stay preserves input and focus; Discard drops it. While this dialog is open, cause
   pagehide/sign-in or scope loss. Expected: synchronous neutral shield, field/draft teardown and no authenticated read
   from pageshow/focus/online alone. Refresh admission is ordered and protected content never flashes first.
6. Open each new route as private/wrong-course/ineligible. Expected: private/wrong-course entries have one fixed safe
   presentation with no dependent files/jobs/brief controls or cached name; honest ineligible course-wide states do not probe mutations.

Actual result: **Not run**. Tester/date/environment/evidence/defect: **Not recorded**.

## Script C — rich content, links, code and native math

1. Read summary/section Markdown with the AT's heading commands. Expected: native H2/H3 context, demoted H4..H6 with
   no skipped levels, deeper headings as strong paragraphs; untrusted text never supplies anchors/controls/live regions.
2. Read a semantic table by row/column. Expected: context caption and column headers; malformed dimensions/empty headers
   become labelled linear text. Overflow, if present, is labelled, contained and keyboard reachable without page scrolling.
3. Copy code deliberately, then deny clipboard permission and repeat. Expected: exact plain source only, concise success
   or selectable manual-copy fallback with unchanged focus; no automatic copy or hidden metadata.
4. Inspect and activate one allowed explicit HTTPS link. Expected: full destination, ASCII host and visible/spoken
   new-tab warning. In the opened page, verify no opener/referrer. Unsafe/credential/obfuscated URLs and raw URL text are inert;
   images/raw HTML/SVG/MathML/TeX resource and macro attacks make no request or model-defined control.
5. Read simple and nested generated math in Safari with VoiceOver and supported Chrome/Edge AT environments.
   Expected: meaningful native semantic mathematical speech, not raw TeX as the only representation; selectable source is
   available separately. Unsupported/malformed/oversized notation shows the full escaped source and localized fallback.

Actual result: **Not run**. Tester/date/environment/evidence/defect: **Not recorded**.

## Script D — complete-process accessibility matrix

1. Repeat scripts A–C in current stable Chrome, Edge and Safari on their actual supported platforms; pin versions.
2. For every surface/dialog/error/pending/unknown state, use direct 320 CSS pixels in Standard, Large and Extra large,
   1280 at 400% browser zoom in each mode, and 200% zoom. Expected: all actions operable, no clipping/page horizontal scroll,
   no obscured focused control, equivalent visual/DOM order and at least 24×24 CSS-pixel control targets.
3. Apply WCAG text spacing simultaneously, forced colors and reduced motion. Expected: readable states/focus indicators,
   immediate dialog transitions and no meaning conveyed by color alone. Native two-dimensional regions alone may scroll.
4. Repeat in en-US, de-DE, fr-FR, pt-PT, pt-BR, es-ES and es-AR with mixed-direction synthetic labels. Expected: document
   language changes correctly, full labels remain available, bidi isolation preserves surrounding UI/navigation order.
5. Read transitions with AT. Expected: initial state silent, processing/ready polite, failure/unknown urgent, identical
   Refresh silent, one revocation observation announcement, auth/scope loss priority, no narration of protected body reparses.

Actual result: **Not run**. Tester/date/environment/evidence/defect: **Not recorded**.

## Automated evidence boundary

Worker logs live under `tmp/agent-execution/4-4-process-material-and-approve-its-brief/` and are enumerated by
`implement-report.json`. Bundled-Chromium automation and axe-core 4.13.0 (default rules, no exclusions) cover representative
stable preview/approval/dialog states, not manual speech or supported-browser conformance. No full gate or release claim
belongs to this implementation phase. Independent review and final authoritative verification remain required.
