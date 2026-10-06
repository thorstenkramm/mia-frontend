---
name: MIA Frontend Accessibility Acceptance Contract
status: draft
updated: 2026-09-13
sources:
  - .memlog.md
  - DESIGN.md
  - EXPERIENCE.md
  - FRONTEND-PRD-FOUNDATION.md
  - FRONTEND-STATE-MACHINES.md
  - SECURITY-PRIVACY-ACCEPTANCE.md
  - BACKEND-CONTRACT-GAPS.md
  - REQUIREMENT-FLOW-MATRIX.md
  - SURFACE-STATE-MATRIX.md
  - mia/docs/product-requirements.md
  - mia/docs/api.md
  - mia/docs/tutoring-sessions.md
  - mia/api-doc/openapi.yaml
  - mia/api-doc/paths/auth.yaml
  - mia/api-doc/paths/tutoring.yaml
  - mia/api-doc/paths/materials.yaml
  - mia/api-doc/paths/speech.yaml
  - mia/api-doc/schemas/resources/resources.yaml
---

# MIA Frontend Accessibility Acceptance Contract

## Purpose and Authority

This draft defines observable frontend acceptance requirements for WCAG 2.2 Level AA. It closes accessibility gaps
identified in the UX reviews without changing product behavior, authorization, data lifecycle, or API transport.

The source authority order in `FRONTEND-PRD-FOUNDATION.md` remains in force. Product behavior comes from
`mia/docs/product-requirements.md`. Implemented OpenAPI owns concrete transport. A missing API operation or field blocks
the affected frontend process; it does not permit the frontend to infer state or invent a workaround.

This contract owns accessibility acceptance. On an accessibility conflict, it takes precedence over shorthand in
`SURFACE-STATE-MATRIX.md` and `FRONTEND-STATE-MACHINES.md` but cannot override product or OpenAPI. In particular, the
approved complete escaped error-body rule here and in `SECURITY-PRIVACY-ACCEPTANCE.md` supersedes profile `G` error
shorthand. Terminal DOM reconciliation below defines what companion references to replacement or discard mean. The
browser matrix below owns accessibility evidence scope. `BACKEND-CONTRACT-GAPS.md` owns the complete backend-gap ledger,
including each blocker's action boundary and closure evidence. Companion topic-only or unowned labels are stale
shorthand and do not alter the alignment below. Review and validation reports are historical provenance, not normative
sources.

The keywords MUST, MUST NOT, REQUIRED, SHOULD, SHOULD NOT, and MAY are used as normative terms. Every MUST and MUST NOT
is release acceptance unless a WCAG criterion is recorded as not applicable with a reviewed rationale.

## Scope and Complete Processes (AC-001)

Conformance covers every release-one surface, state, launch locale, and complete process in `EXPERIENCE.md`, including:

- public, restricted-stage, recovery, invitation, profile, and MFA processes;
- Home, unified navigation, course preparation, material, upload, and student-administration processes;
- tutoring start, streaming, queueing, interruption, retry, finish, transcript, summary, and speech processes;
- mentoring, administration, pagination, destructive actions, errors, offline return, and authorization loss; and
- Standard, Large, and Extra large interface text modes.

Component-only success is insufficient when the complete process fails. Authentication, logout, save, confirmation,
error recovery, and every other action remain available at all accepted reflow and text configurations. A
larger-window advisory is supplemental and MUST NOT hide, disable, defer, or block functionality.

### Complete-Process Inventory

Stable process IDs define every required matrix row. Every process requires 200% browser-zoom coverage. `Critical`
requires additional 100% browser depth and the full supported-browser and assistive-technology manual lanes. Every
process also inherits applicable cross-cutting `XC-*` contracts and surface states from the companion matrices.

| ID | Critical | Flow mapping | Included process |
| --- | --- | --- | --- |
| `CP-01` | Yes | `SF-1`, `KF-1` | Login, recovery, reset, restricted stages, MFA |
| `CP-02` | Yes | `KF-1`, `XC-2` | Shared-device expiry, logout, sign-in, resume |
| `CP-03` | Yes | `KF-2` | Course preparation, material, readiness, activation |
| `CP-04` | No | `SF-2` | Private material create, upload, process, use, delete |
| `CP-05` | Yes | `KF-1`, `SF-10` | Tutoring start, stream, queue, recover, retry, finish |
| `CP-06` | No | `SF-4` | Completed-session review and summary correction |
| `CP-07` | No | `SF-6`, `SF-11`, `KF-3` | Mentoring request, role grant, triage, schedule, complete |
| `CP-08` | No | `SF-3`, `SF-9` | Student self-profile; staff and managed-student profile, mobile, locale, zone |
| `CP-09` | Yes | `SF-5` | Student password recovery, MFA reset, ban, unban |
| `CP-10` | No | `SF-7` | Invitation create, accept, resend, revoke, delete |
| `CP-11` | No | `SF-8` | Speech request, wait, play, expire, retry |
| `CP-12` | Yes | `KF-4` | Accounts, courses, roles, jobs, audit, deletion |
| `CP-13` | Yes | `KF-2`, `SF-5` | Roster, provision student, add existing, membership, remove |
| `CP-14` | Yes | `SF-4`, `XC-1` | Supervisor private material, denial, scope loss, managed-student return |

Each `CP-*` row covers checking, empty, success, validation, backend failure, offline or outcome unknown, stale or
concurrent state, authorization loss, and safe exit where applicable. It includes every surface named for its flow in
`REQUIREMENT-FLOW-MATRIX.md` and `SURFACE-STATE-MATRIX.md`. `CP-13` includes temporary-password entry,
privacy-preserving existing-student lookup, duplicate membership, active-session removal denial, confirmed removal, and
retained account and other-course data. `CP-14` includes bounded navigation, explicit authorized download,
active-session message exclusion, unrelated-role denial, scope loss, and return to the managed-student context.

Backend gaps block only dependent process, state, action, and evidence cells. Unaffected content and existing work
remain available. A Blocked cell is not Pass and prevents release, but it does not make unrelated cells or planning
incomplete.

### Stable Requirement Registry

An `AC-*` ID owns every normative clause in its named section until another `AC-*` section begins. Subheadings inherit
their nearest owning ID. IDs are stable and MUST NOT be renumbered when requirements are added.

| ID | Contract area | WCAG 2.2 | Process or state | Evidence method |
| --- | --- | --- | --- | --- |
| `AC-001` | Processes and release gate | 1.4.4, 1.4.10 | `CP-01` through `CP-14` | Process matrix |
| `AC-002` | Text, spacing, forced colors | 1.4.3, 1.4.11, 1.4.12 | `CP-01` through `CP-14` | Automated and manual |
| `AC-003` | Structure and navigation | 1.3.1, 2.4.1, 2.4.2, 2.4.3 | `CP-01` through `CP-14` | DOM and keyboard |
| `AC-004` | Keyboard, focus, targets | 2.1.1, 2.4.11, 2.5.7, 2.5.8 | `CP-01` through `CP-14` | Keyboard |
| `AC-005` | Motion and flashing | 2.2.2, 2.3.1, 2.3.3 | `CP-01` through `CP-14` | Media and manual |
| `AC-006` | Image alternatives | 1.1.1 | `CP-01`, `CP-03`, `CP-04`, `CP-08`, `CP-09`, `CP-12`-`14` | DOM and AT |
| `AC-007` | Dialogs and idle warning | 2.1.2, 2.4.3, 4.1.2 | Dialog/idle states in `CP-01` through `CP-14` | Keyboard |
| `AC-008` | Forms and errors | 1.3.1, 3.3.1 through 3.3.4, 4.1.3 | Form states in every `CP-*` | DOM and keyboard |
| `AC-009` | Tooltips and disclosures | 1.4.13, 2.1.1 | Help states in every `CP-*` | Pointer and keyboard |
| `AC-010` | Input purpose and auth | 1.3.5, 3.3.7, 3.3.8 | `CP-01`, `CP-02`, `CP-08`-`10`, `CP-12`, `CP-13` | Manual |
| `AC-011` | TOTP and security timers | 2.2.1, 3.3.8 | `CP-01`, `CP-02`, `CP-08`, `CP-09` | Timer and AT |
| `AC-012` | Status and announcements | 4.1.3 | Async states in every `CP-*` | Accessibility tree |
| `AC-013` | Streaming and stable reading | 2.2.2, 2.4.3, 4.1.3 | `CP-05` | Streaming and keyboard |
| `AC-014` | Upload queue | 2.1.1, 2.2.2, 4.1.3 | `CP-03`, `CP-04` | Queue fixtures |
| `AC-015` | Rich content and links | 1.3.1/2, 1.4.10, 2.4.4/6, 3.1.2, 4.1.2 | `CP-03`-`07`, `11`, `14` | DOM/AT |
| `AC-016` | Locale and direction | 1.3.2, 3.1.1, 3.1.2 | `CP-01` through `CP-14` | DOM and manual |
| `AC-017` | Copy, codes, downloads | 2.1.1, 2.4.6, 3.3.8, 4.1.3 | `CP-01` through `CP-14` | Copy/print |
| `AC-018` | Native audio | 2.1.1, 4.1.2 | `CP-11` | Browser and screen reader |
| `AC-019` | Evidence and traceability | All applicable A/AA | `CP-01` through `CP-14` | Release record |

## Release Criterion (AC-001)

Release requires all of the following:

1. The completed WCAG 2.2 A/AA traceability table contains one reviewed row for every A and AA success criterion.
2. Every applicable row identifies repeatable evidence and has status Pass.
3. Every not-applicable row contains a criterion-specific rationale accepted by the release owner.
4. There are zero unresolved WCAG 2.2 Level A or AA failures.
5. Every required complete-process matrix cell has status Pass.
6. Coverage residual risks are recorded separately and are not represented as conformance failures or passes.

During planning, evidence fields MAY remain `Not run`, and backend-dependent cells MUST be `Blocked`. Planning does not
require unavailable commands, implementation artifacts, browser results, defects, or reviewer signatures. These statuses
record future release work; neither status satisfies release. An unresolved backend dependency makes each affected cell
Blocked and therefore prevents release.

A tool reporting no violations is not a conformance decision. Automated checks cannot replace keyboard, zoom, content,
screen-reader, or supported-browser manual evaluation where those checks cannot establish the criterion.

## Reflow and Zoom (AC-001)

### Complete-Process Reflow

Every complete process MUST remain operable and understandable at an effective viewport width of 320 CSS pixels.
Acceptance MUST cover both of these configurations in each built-in text mode:

- a direct 320 CSS-pixel viewport; and
- a 1280 CSS-pixel browser window at 400% browser zoom, yielding 320 effective CSS pixels.

Every release process and surface MUST also preserve content and functionality at 200% browser zoom. Critical processes
MUST additionally be exercised at 100% with their full state depth. Browser zoom MUST remain enabled, and page code MUST
NOT reset, intercept, or counter-scale it.

At every tested configuration:

- content and controls MUST reflow without clipping, overlap, truncation that removes meaning, or hidden actions;
- the page MUST NOT require horizontal scrolling;
- labels, errors, statuses, dialogs, navigation, tables of actions, and the tutoring composer MUST remain available;
- visual and DOM reading order MUST remain logical and equivalent;
- fixed or sticky elements MUST NOT cover content or focused controls; and
- orientation, physical-resolution, user-agent, or phone detection MUST NOT gate access.

Horizontal scrolling MAY exist only within a separately labelled region whose content is intrinsically
two-dimensional, such as a data table, long code line, or mathematical layout. The region MUST be keyboard reachable
when scrolling is necessary, MUST expose its purpose, and MUST NOT make surrounding actions scroll horizontally.

## Text, Spacing, and Forced Colors (AC-002)

### Built-In Text Modes

Standard, Large, and Extra large MUST scale from the root with relative units. Text, controls, spacing, status content,
and error content MUST reflow together. All three modes MUST pass every 320 CSS-pixel and zoom requirement; testing a
mode only at the optimized desktop width is insufficient.

The text-size control MUST:

- have a persistent accessible name and current-value indication;
- be reachable before and after authentication without requiring browser knowledge;
- apply without losing route, focus, entered values, transcript position, or dialog state; and
- remain understandable in every launch locale at every mode.

### Text Spacing

Every complete process MUST remain usable when user styles apply all WCAG 1.4.12 values simultaneously:

- line height of at least 1.5 times the font size;
- paragraph spacing of at least 2 times the font size;
- letter spacing of at least 0.12 times the font size; and
- word spacing of at least 0.16 times the font size.

No content or functionality may be clipped, obscured, collapsed, or lost. Controls MUST grow or reflow rather than
fixing text into dimensions that cannot contain it. Two-dimensional exceptions remain limited to the labelled regions
defined above.

### Forced Colors and Non-Color Meaning

The interface MUST remain perceivable and operable when forced colors are active. It MUST use or preserve system color
behavior for text, backgrounds, borders, focus indicators, selected states, links, and controls. Authors MUST NOT use
`forced-color-adjust: none` unless a traceability row proves why native adjustment destroys essential meaning and the
replacement passes contrast and state tests.

When shadows, background images, CSS shapes, or authored colors disappear:

- focus, checked, selected, current, disabled, error, warning, success, and approval states MUST remain distinguishable;
- every state MUST retain visible text and native or visible structural boundaries;
- links MUST remain distinguishable without color alone; and
- icons and status shapes MUST remain supplementary.

Bundled Chromium forced-colors emulation on developer macOS supplies repeatable regression evidence. It is not evidence
of actual Windows accessibility APIs; that limitation is recorded as a coverage residual risk.

## Structure and Navigation (AC-003)

Every rendered route MUST provide:

- a first-focus, visible-on-focus bypass link that moves focus to the route's main content;
- exactly one `main` landmark;
- distinct accessible names for multiple navigation landmarks;
- exactly one page-level `h1` describing the current route;
- a unique localized document title that describes the route before the product name;
- `aria-current="page"` on the current route link and no false current state elsewhere; and
- a direct parent or Home route so browser history is never the only exit.

On `mfa` and `password-change` routes, restricted logout is the accepted direct safe exit. It exposes no application
navigation, protected parent, Home link, breadcrumb, cached identity, or protected prefetch. Its confirmed or
unconfirmed outcome follows the restricted logout and privacy-screen contract.

Repeated blocks MUST be bypassable. Landmark and heading order MUST remain valid in restricted login stages, dialogs,
empty states, errors, direct URL entry, reload, Back, Forward, and every authorized capability combination.

On a full client-side route change, focus MUST move without scrolling unexpectedly to the `h1`, or to an equivalent
focusable route-title target immediately before it. The target MUST have no redundant interactive role. The document
title MUST update before the route-change announcement or focus move.

In-place pagination is not a full route focus reset. After a page change, focus MUST move to the collection heading or
a concise collection status, and the new page context MUST be announced once. Back MUST restore the prior trigger and
scroll position when it still exists. If it does not, focus moves to the collection heading. Authorization loss clears
protected titles and scope before focus moves to a safe route.

## Keyboard, Focus, and Targets (AC-004)

Every action MUST be operable with ordinary keyboard commands and without a required shortcut, drag, hover, gesture,
hidden timer, or required rapid motor response. Confirmed essential security timeouts follow the timer inventory below.
Visible Send is the baseline tutoring submission action. Enter inserts a newline in multiline fields. Any optional send
shortcut MUST use a modifier, be documented, and never fire during IME composition.

Focus indicators MUST meet WCAG 2.2 contrast and area requirements in every state, text mode, zoom level, and forced
colors mode. Focus order MUST follow meaning and operation rather than CSS placement.

Persistent navigation, headers, banners, toasts, advisories, composers, and dialogs MUST NOT fully obscure a focused
component. On focus movement, at least part of the focus indicator MUST be visible without extra user scrolling, and
normal browser focus scrolling MUST make the entire component and indicator visible. Acceptance covers 100%, 200%, and
400% zoom with each persistent layer present.

Each pointer target MUST be at least 24 by 24 CSS pixels unless it satisfies a normative WCAG 2.5.8 spacing or exception
condition. Every exception MUST be recorded in the traceability evidence. Inline links in flowing text may use the
inline exception. Compact icon controls, upload-row actions, table actions, and disclosure controls do not receive an
automatic exception.

Every drag interaction MUST have equivalent non-drag pointer and keyboard operation. Drag-and-drop upload is an
enhancement to the native file input, never the only file-selection path.

## Motion and Flashing (AC-005)

When `prefers-reduced-motion: reduce` is active, route and dialog transitions are immediate, smooth scrolling becomes
instant, skeleton shimmer stops, and nonessential status, loading, hover, focus, and decorative animation is removed.
State changes, focus placement, progress text, and operation remain available without animation. Any essential animation
MUST have a reviewed traceability rationale and a user control that stops or suppresses it where WCAG requires one.

No auto-started moving, blinking, scrolling, or auto-updating presentation may continue for more than five seconds
unless a keyboard-operable Pause, Stop, or Hide control is available. Loading shimmer and animated status effects stop
within five seconds and become static status text. Pausing presentation MUST NOT imply that the underlying operation was
cancelled. Essential exceptions require a criterion-specific rationale accepted in the WCAG 2.2.2 row.

MIA MUST NOT introduce content that flashes more than three times in any one-second period. Provider content, uploads,
status effects, focus effects, and any future mascot treatment MUST be rendered so they cannot breach the WCAG general
flash and red-flash thresholds. Flashing and reduced-motion fixtures are required in automated and manual evidence.

## Image Alternatives (AC-006)

An avatar or course logo is decorative with `alt=""` when an adjacent programmatic person or course name communicates
the same identity. If the image is the only control or identity cue, its localized accessible name is derived from the
authoritative person or course context, never from the filename. Upload previews use the same rule. A future mascot has
an empty alternative unless approved information absent from adjacent text makes it informative; it is never required
for comprehension, status, emotion, monitoring, reward, or AI-tutor identity.

Protected avatars and course logos load only after session, capability, and resource scope gates pass. Their checking,
denied, failed, and removed states retain the adjacent text identity without broken-image filename speech. They are
purged on scope or account change. Fetch and cache behavior remains conditional on `BCG-005`; image type never creates
an authorization or cache exception by itself.

## Dialogs and Idle Warning (AC-007)

Use native `<dialog>` where it meets these requirements, or provide equivalent tested modal semantics. Every modal MUST:

- expose one programmatic dialog name and associated consequence or scope description;
- make background content inert and absent from sequential focus navigation;
- place initial focus deterministically without defaulting destructive actions;
- contain Tab and Shift+Tab within the dialog;
- provide a visible Cancel, Back, or Close control unless cancellation is prohibited by confirmed product behavior;
- define Escape behavior and retain a visible cancellation control when Escape cannot close it;
- keep focus visible and unobscured at every accepted reflow configuration; and
- restore focus to the invoker, or to a named surviving fallback when the invoker no longer exists.

For short confirmations, initial focus goes to the least destructive action. For long content or an error summary,
initial focus goes to the dialog heading or summary. A submit error retains the dialog, preserves valid input, and
follows the form-error rules below. Success, cancel, validation error, backend error, stale state, authorization loss,
and invoker removal MUST each have deterministic focus acceptance tests.

The advance inactivity warning is a persistent non-modal status region. It does not make the background inert,
move or trap focus, obscure the focused item, or predict exact expiry. Visible Continue working and Sign out actions
remain in reading and keyboard order, and Escape does not dismiss the warning. It appears five minutes before the
earlier authoritative idle or absolute deadline, or immediately when newly returned deadlines are already inside that
threshold. At or beyond the deadline, the privacy shield replaces it. One concise polite status announces ordinary
appearance without duplicating the visible warning. Alert/assertive semantics are reserved for a separate urgent
deadline correction that requires immediate shielding and focus on the blocking status.

Continue working deliberately starts one user-initiated activity-refresh operation. Definitive success returns the
refreshed authoritative idle deadline and unchanged absolute deadline in that same response; no second automatic
deadline read follows. Success removes the warning without moving focus when the prior target remains authorized. A
definitive pre-dispatch failure permits explicit retry. Outcome unknown installs or retains the shield and offers only
explicit Refresh reconciliation or Retry Continue working. Expiry or denial clears protected state and moves to the
safe login or route heading. Other errors retain the shield and deterministic explicit recovery actions.

Each tab owns its inactivity baseline. Only a deliberate MIA action in that tab updates it; another tab's activity and
content-free security signals do not. Background polling, lifecycle checks, focus, visibility, network restoration, and
SSE reconnect MUST NOT extend the baseline or backend idle timeout. At the earlier authoritative idle or absolute
expiry, the tab replaces the warning with a local privacy lock and requires fresh session and access discovery before
reveal.
Clock rollback, sleep or wake, suspended timers, and delayed callbacks lock rather than extend the deadline.

A content-free logout-start signal immediately privacy-shields each live receiving tab, moves focus into that shield,
and prevents unrelated authenticated discovery or protected requests. A terminal signal alone never removes a shield:
each tab independently establishes anonymous state before confirmation, following the phase-specific checks in
`SECURITY-PRIVACY-ACCEPTANCE.md` §Logout and Privacy Screen. Responses from the pre-logout epoch cannot render,
announce, or unlock content. The 2026-09-27 owner decision in `FRONTEND-PRD-FOUNDATION.md` accepts that a delayed
authentication transition may restore authentication, including from suspended or terminated contexts, without a
server-side per-browser revocation guarantee. A detected late transition withdraws current confirmation, returns focus
to the shield heading, and announces a concise need to check sign-in status. Explicit Refresh and Retry logout remain
keyboard reachable; visible and spoken copy distinguish local hiding from server logout and never promise permanent
revocation. `CP-02` remains Blocked on BCG-001's remaining transport and evidence obligations, not the withdrawn atomic
guarantee. Its evidence must cover late-transition reconciliation, per-tab checks, and failure without success speech.

BCG-014 applies only to invitation Revoke/Delete faulty, permanent role grant, course-supervisor removal, membership
removal, mentor removal, account deletion, and course deletion. Their final submission requires a backend-enforced
version, precondition, or operation whose meaning cannot change after review. A final reread alone is insufficient.
Precondition failure replaces the dialog with fresh review, clears exact-name input, and returns focus to its heading.
Until OpenAPI supplies that atomic contract, those cells remain Blocked. Unrelated mutations remain governed by their
own contracts and MUST NOT be blocked by BCG-014.

## Forms, Instructions, and Errors (AC-008)

Every form control MUST have a persistent programmatic name. Required state, format, units, limits, and essential
instructions MUST be available before entry and programmatically associated with the field. Placeholder text MUST NOT
serve as the label or sole instruction.

On validation failure:

- every invalid field MUST expose `aria-invalid="true"` and reference its localized corrective message;
- messages MUST state what is wrong and how to correct it without relying on color or iconography;
- a multi-field failure MUST create an error summary at the start of the form;
- summary entries MUST follow DOM order and link to the corresponding control or fieldset;
- focus MUST move to the summary after a multi-field submit failure;
- a single-field failure MAY focus that field directly when no summary is rendered;
- valid values and the user's exact password or message bytes MUST not be silently normalized or discarded; and
- resubmission MUST clear corrected invalid state and stale messages.

Backend, offline, and stale-state failures MUST preserve focus and safe valid input unless security or authorization
loss requires teardown. Technical details are collapsed by default, separately labelled, escaped, selectable, and
excluded from the error live announcement. Display and copy behavior MUST follow `SECURITY-PRIVACY-ACCEPTANCE.md`.

The technical body MUST be the complete, untouched string returned by one `Response.text()` decoding path. Exactness
means the decoded JavaScript string, not original response bytes. It remains untranslated and escaped as inert text.
The visible `<pre>` MUST use pre-wrapping and emergency breaking, including `white-space: pre-wrap` and
`overflow-wrap: anywhere`, without inserting characters or changing the underlying string. Copy technical details MUST
copy that original decoded string, preserving its characters and line endings rather than layout-generated wraps.
Long-token, minified-JSON, proxy-HTML, malformed-byte, charset, 320-pixel, and 400%-zoom fixtures are required.

Error summaries and live announcements MUST contain the localized corrective summary only. They MUST NOT announce the
complete backend body, headers, cookies, tokens, credentials, private content, or provider payloads.

## Tooltips and Disclosures (AC-009)

Essential information MUST be inline. Examples and longer supplemental help SHOULD use a native disclosure button.
Disclosure controls MUST expose expanded state, keep focus on the control when toggled, and preserve logical reading
order. Collapsing content MUST NOT discard entered values or move focus into hidden content.

If a tooltip remains necessary, it MUST:

- open on both pointer hover and keyboard focus;
- be programmatically associated with its trigger;
- remain visible while the pointer moves over the tooltip;
- remain present until dismissed, focus or hover leaves, or its information is no longer valid;
- close with Escape without moving focus; and
- contain no interactive content or information required to complete the process.

## Input Purpose and Accessible Authentication (AC-010)

Authentication MUST satisfy WCAG 2.2 accessible-authentication requirements without requiring memory, transcription,
puzzle solving, or recognition of internal stage names. Login, MFA, password replacement, recovery, reset, invitation
acceptance, MFA management, and temporary-password creation MUST permit password managers, autofill where applicable,
and paste. The frontend MUST NOT block clipboard events or alter pasted credential bytes.

### Field Purposes and Password Controls

The implementation MUST maintain this release-one field-purpose inventory. Tokens follow semantic ownership, not merely
the field's data type:

| Field and context | Autocomplete purpose or disposition |
| --- | --- |
| User's account name at authentication or acceptance | `username` |
| Existing account password | `current-password` |
| Created, replacement, confirmation, or temporary password | `new-password` |
| User's editable full name | `name` |
| User's editable nickname | `nickname` |
| User's editable email, if a future authorized field exists | `email` |
| User's editable mobile | `tel` |
| User's ISO country code | `country` |
| TOTP, SMS MFA, or mobile-verification code | `one-time-code` |
| Recovery code | No recognized purpose; omit token and permit paste |
| Preferred language or IANA time zone | No recognized purpose; omit token |
| Invitee email entered by staff | Not the current user's data; use `autocomplete="off"` |
| Managed student's name, nickname, mobile, country, or username | Other person's data; use `autocomplete="off"` |
| Exact-name destructive confirmation | Repeated confirmation; use `autocomplete="off"` and permit paste |
| Course, material, mentoring, or AI-instruction content | No recognized personal-data purpose; omit token |

Invitation acceptance applies `username`, `new-password`, and `country` to the accepting user's fields. Student
provisioning applies `autocomplete="off"` to the student's username and `new-password` to the new temporary password so
the supervisor's existing credentials are not filled. A field absent from release one needs no fabricated control.

Every security or recovery code MUST use one native text `<input>` for the complete code. It preserves leading zeroes
and ASCII letter case as entered and permits the entire value to be pasted. Visual character grouping is presentational
only and MUST NOT create multiple controls, values, selection models, or focus stops. Numeric spinner controls MUST NOT
be used.

Password reveal MUST be a keyboard-operable button with an object-specific accessible name, visible state, and
programmatic pressed state. Toggling reveal MUST retain the value, selection, and focus. Password rules MUST be
available before entry and MUST accurately state that spaces, Unicode, and password-manager-generated values are
allowed and are not trimmed or normalized.

Password-manager success MUST be manually verified for login, invitation acceptance, password reset, required password
replacement, and password confirmation. Success means fields can be identified, generated or filled, reviewed,
revealed, submitted, corrected after failure, and updated without inaccessible workarounds.

## TOTP and Security Timers (AC-011)

### TOTP and MFA

TOTP enrollment MUST provide both a QR image and a non-visual manual setup path derived locally from the returned
provisioning URI. The manual path MUST visibly expose selectable text for issuer, account, secret, algorithm, digit
count, and period. The QR image MUST have a concise purpose label; its alternative text MUST NOT be the encoded secret.

The local parser accepts only one bounded `otpauth://totp/` URI with no credentials or fragment, one path label, and
exactly one value for every required query field. Percent-decoding must succeed once. Duplicate, conflicting, unknown,
empty, malformed, oversized, or out-of-policy fields reject the enrollment before QR, manual, copy, or app-link output.
Issuer and account values in the label and query MUST agree. Secret, SHA-1, six digits, and 30 seconds MUST match
product policy. Rejected-grammar and QR/manual-equivalence fixtures make no network request.

Owner decision, 2026-10-05 (`BACKEND-CONTRACT-GAPS.md` BCG-009 Story 1-9 slice): the accepted grammar is the URI the
backend emits, `otpauth://totp/MIA%20(<host[:port]>):<username>?secret=<32 Base32>&issuer=MIA` with optional fixed
`algorithm`, `digits`, and `period`, bounded at 1,024 bytes. Its label prefix `MIA (<host>)` and issuer `MIA` do not
agree; that is a non-blocking backend note, and the manual path shows the decoded label as the account exactly as the
QR code carries it. Masking keeps the values for an explicit Reveal only after Refresh and a confirming
`BCG-009` read, as described below.

The manual secret and provisioning URI are credentials. They MUST not enter URLs, history state, generic query caches,
logs, analytics, diagnostics, error reports, or clipboard without an explicit copy action. Route-local setup data MUST
remain available after a definitive correctable code failure or timeout before dispatch while the same authorized
pending enrollment remains valid. It MUST be dropped on successful activation, cancellation, enrollment expiry, page
unload, non-persisted departure, route departure, authentication or scope change, terminal teardown, or an ambiguous
post-dispatch outcome that cannot be reconciled safely. After teardown, the page explains that setup must restart
through a new enrollment.

Temporary document hiding or a persisted page hide masks the QR and all manual setup values and suspends copy without
destroying the still-live route-local data. On visible return, the values remain masked until fresh session, scope, and
`BCG-009` pending-enrollment reconciliation confirms the same authorized enrollment is unexpired. Only then may an
explicit Reveal restore the same values. Failed, changed, unavailable, or expired reconciliation destroys them. The
privacy shield is installed before BFCache eligibility and remains present through restoration.

Copying a TOTP secret or provisioning value requires a visible warning that MIA cannot clear the OS clipboard or its
history. The explicit action copies only the named visible value and uses the general copy-feedback contract.

Six-digit MFA and recovery-code submission MUST:

- preserve leading zeroes and accept paste;
- retain focus and safe input after a correctable failure;
- expose applicable authoritative expiry, invalidation, and unavailable delivery as text;
- never reveal remaining hidden attempts unless the API explicitly provides that value; and
- retain a lost-factor or recovery-code route when active SMS delivery is unavailable.

Every restricted stage MUST be completable by keyboard and screen reader without application navigation appearing.
Authoritative auth-session discovery remains release-blocked by
[`BCG-001`](BACKEND-CONTRACT-GAPS.md#bcg-001-anonymous-csrf-and-authentication-session-discovery). Frontend tests MUST
NOT inspect HttpOnly cookies or guess the stage.

### Essential Security Timer Inventory

No timer requires a rapid motor response. The WCAG 2.2.1 row MUST inventory each confirmed timer, its security or
essential rationale, visible expiry result, safe value-retention rule, and keyboard-accessible restart path.

| Timer | Confirmed behavior | Accessible expiry or continuation |
| --- | --- | --- |
| Browser idle | 30 minutes; only Continue working refreshes | Server-deadline warning; explicit Refresh after observed expiry |
| Browser absolute | 12 hours; never extends | Shield; explicit Refresh discovers stage; no countdown |
| Restricted login stage | 30 minutes; non-refreshing | Shield; explicit Refresh discovers stage or restart |
| Password-reset link | 30 minutes; single use | Uniform invalid link; request recovery again |
| Login MFA challenge | 30 minutes; non-refreshing; method-neutral | Explain expiry or invalidation; restart login |
| Pending MFA enrollment | 30 minutes | Explain expiry; start a new enrollment |
| Mobile verification code | 30 minutes after each issuance | Explain expiry; restart mobile change |
| Mobile resend cooldown | 60 seconds | Visible availability; no rapid activation needed |
| MFA-management proof | 5 minutes; single use | Reverify current factor and password |
| TOTP step | 30 seconds with accepted skew | User may wait for and enter a later code |

Invitation links do not expire and MUST NOT be presented as timed. Five-failure invalidation is an attempt bound, not a
timer. The local idle warning is conservative, never predicts exact expiry, and makes no automatic keepalive request.
Expiry MUST not erase non-secret correctable values unless the security teardown contract requires it. Every expiry has
a visible message and reachable restart or reauthentication action.

Mobile expiry, cooldown, challenge identity, reload recovery, resend, and concurrent invalidation are `Blocked` on
`BCG-015`. Resend sends the existing code without extending its original expiry. The backend MUST expose that unchanged
authoritative expiry and resend-availability UTC instants plus a safe read or reconciliation outcome after reload or
invalidation. BCG-015 must define whether resend resets or preserves the failure count; the UI neither infers nor
exposes it. Local receipt time, countdown completion, and a rejected mutation MUST NOT be used as authority.

## Status and Announcement Semantics (AC-012)

Static persisted state is ordinary visible text, not a live region. A visually hidden duplicate MUST NOT repeat a
visible label. Skeletons are not progress indicators and MUST have adjacent concise loading text when a wait needs a
name.

Use these semantics:

| Situation | Required semantics |
| --- | --- |
| Static saved state | Ordinary text; no live role |
| Non-urgent transition | One atomic polite status message |
| Urgent actionable failure | One atomic alert message |
| Known byte progress | Named progressbar with current value |
| Unknown progress | Concise indeterminate text, not a fabricated percentage |
| Last-checked refresh | Visible text; announce only after user-requested refresh |

Repeated polling, SSE heartbeat, render, hydration, and unchanged snapshot MUST NOT trigger announcements. The live
region SHOULD remain mounted; its short message is cleared or changed between later activations so a repeated user
action can be announced again.

## Streaming and Stable Reading (AC-013)

### Streaming Transition Contract

Tutor tokens, deltas, Markdown reparses, heartbeat comments, and polling MUST NOT be live regions. One mounted status
owner outside the transcript announces state transitions. Announcements are localized frontend text and contain no
generated tutor content.

| Transition | Announcement intent | Priority | Dedupe key |
| --- | --- | --- | --- |
| Message accepted to queued | Message queued | Polite | response ID + queued |
| Queued to generating | AI tutor started a response | Polite | response ID + generating |
| Connected to transport lost | Connection lost; reconnect pending | Polite | response ID + connection epoch |
| Transport lost to retry ready | Reconnect available | Polite | response ID + attempt number |
| Transport lost to offline | Offline; waiting for connection | Polite | response ID + offline episode |
| Reconnecting to fresh snapshot | Reconnected; response state updated | Polite | response ID + connection epoch |
| Generating to completed | Tutor response complete | Polite | response ID + completed |
| Queued or generating to interrupted | Tutor response stopped | Polite | response ID + interrupted |
| Queued or generating to failed | Tutor response could not complete | Assertive | response ID + failed |
| Summary not available to available | Session summary available | Polite | session ID + summary version |

The implementation MUST keep a per-response announcement ledger for the page lifetime. A reconnect snapshot initializes
or replaces visual state and content atomically. It is silent when it confirms the current state. If it reveals a real
state transition, only the transition row is announced. Reconnection and a terminal state observed in the same snapshot
MUST not also replay queued, generating, or completion announcements already in the ledger.

Terminal SSE events and the required authoritative refetch share the same terminal dedupe key. Terminal rerender MUST
not announce completion, interruption, or failure twice. Older connection epochs, stale callbacks, duplicate terminal
events, and repeated snapshots MUST be ignored for announcement purposes.

Authentication expiry uses the global sign-in-expired treatment, not a tutor failure announcement. Existence-hiding
loss uses one safe unavailable message and clears protected transcript content before announcement.

### Cross-Domain Announcement Matrix

Initial static state is silent in every domain. A user-requested Refresh announces only a changed result or a concise
check failure; an unchanged result updates visible last-checked text silently. No row moves focus unless stated.

| Domain transition | Localized intent | Mode | Dedupe key | Focus |
| --- | --- | --- | --- | --- |
| Auth checking to stage | Sign-in state ready | Polite | auth epoch + stage | Stage heading |
| Authenticated to warning | Local inactivity warning | Polite | auth epoch + warning | Unchanged |
| Any auth state to expired | Sign-in expired | Assertive | auth epoch + expired | Login heading |
| Form submit to invalid | Review the named errors | Assertive | form ID + attempt | Error summary |
| Dialog closed to open | Dialog name and consequence | Silent | dialog ID + open | Initial target |
| MFA or mobile to cooldown ready | Another code can be sent | Polite | challenge ID + cooldown | Unchanged |
| MFA or mobile to expired | Verification expired | Assertive | challenge ID + expired | Restart heading |
| Upload file state changed | See upload matrix | See upload matrix | file ID + state | Unchanged |
| Material to processing | Material processing started | Polite | material ID + processing | Unchanged |
| Material to ready or failed | Material ready or failed | Polite or assertive | material ID + state | Unchanged |
| Approved to approval required | Approval is required again | Polite | material ID + approval version | Unchanged |
| Background job state changed | Named job state changed | Polite or assertive | job ID + state | Unchanged |
| Summary state changed | Summary available or failed | Polite or assertive | summary ID + state | Unchanged |
| Speech to available or failed | Audio available or failed | Polite or assertive | speech ID + state | Unchanged |
| Tutoring state changed | See streaming matrix | See streaming matrix | response ID + state | Unchanged |
| Copy attempt completed | Named copy succeeded or failed | Polite | control ID + attempt | Unchanged |
| Locale applied | Interface language changed | Polite | locale attempt + tag | Unchanged |
| Invitation delivery uncertain | Delivery could not be confirmed | Polite | invitation ID + attempt | Unchanged |
| Capability or scope lost | Access changed | Assertive | access epoch + safe route | Safe heading |
| Destructive action succeeded | Named action completed | Polite | mutation attempt ID + success | Safe heading |
| Destructive outcome unknown | Action was not confirmed | Assertive | mutation attempt ID + unknown | Dialog status |
| Provider-dependent failure | Named feature is unavailable | Assertive | operation ID + failure state | Unchanged |
| Pagination changed | New collection page loaded | Polite | collection ID + page | Collection heading |

`Polite or assertive` is resolved by outcome: success is polite; actionable failure is assertive. A static initial error
remains ordinary text. Upload, copy, locale, and tutoring use their more specific matrices in this contract. One mounted
announcement owner arbitrates simultaneous events: auth or scope loss wins, then urgent failure, then one latest polite
transition. Suppressed events remain visible and are not replayed later.

Approval revocation uses exactly one polite announcement with dedupe key material ID plus approval version for mutation,
Refresh, and concurrent-change paths. It becomes assertive only when the change requires an urgent focus action to stop
an invalid in-progress submission or prevent use of revoked content. That path moves focus to the visible blocking
status and uses the same dedupe key. Static initial approval-required state remains silent.

### Outcome-Unknown and Restoration Semantics

Session or message recovery shows authoritative retained work but makes no claim about an unretained local request whose
response was lost. A retained unknown request offers Abandon unknown attempt after reconciliation cannot prove outcome.
Abandonment destroys its local ID and payload, makes no server-outcome claim, and permits a new ID only after current
action eligibility is authoritative.

Online, focus, visibility, and BFCache return coalesce into one covered revalidation-needed state. They do not issue an
authenticated request. Transport failure preserves permitted local input behind an offline cover. Only authoritative
sign-in or scope loss clears it. Explicit Continue working or Refresh starts the ordered cycle; lifecycle events never
start it automatically.

The 1, 2, and 4 second reconnect delays only govern when each of three user-activated attempts becomes available; delay
completion never opens an EventSource. Try now during a delay cancels it, consumes that scheduled attempt, and opens at
most one replacement after explicit non-refreshing access checks. A valid snapshot or a new manual bound after
exhaustion is the only reset.
Reconciliation after Stop response resolves both the targeted response and current session work before naming the
target attempt interrupted, completed, or failed.

Transport loss never opens a replacement authenticated EventSource until the user activates Try now or Continue working.
Closing an existing stream at the local privacy deadline and waiting for deliberate reconnection cannot cancel backend
tutor work. The visible response remains marked in progress or unconfirmed until authoritative recovery.

Mentoring schedule, locale or time-zone save, speech creation, and summary regeneration each expose submitting, outcome
unknown, and authoritative reconciliation states. They preserve safe local values without claiming success, prohibit
automatic replay, and keep the initiating action disabled until the owning fresh representation resolves the outcome.
Locale remains at its prior applied value meanwhile. Speech and summary actions are labelled Retry only after the
backend reports a failed and eligible state.

### Transcript Stability and Presentation Pause

Appending streamed content MUST NOT move DOM focus, reset the screen-reader reading position, or replace stable earlier
turn nodes. Each student message and each tutor-response attempt MUST retain stable DOM identity across deltas,
reconnection, and terminal reconciliation.

Automatic scrolling occurs only when the viewport was already at the transcript end before the update. When the user
has moved away from the end:

- the scroll position remains stable;
- a keyboard-reachable New tutor content control appears outside the changing content;
- the control names the response or count without exposing generated text in a live region; and
- activation moves focus to a stable heading or anchor at the first unseen content and then dismisses the control.

While a response is queued or generating, a keyboard-reachable Pause transcript updates control remains available.
Activating it freezes transcript DOM changes, automatic scrolling, and non-urgent stream announcements while preserving
the current reading position. It does not interrupt, cancel, pause, or retry tutor or provider work and does not close
the existing SSE solely for presentation pause. `Stop response` remains a separate consequential server action.

While presentation is paused, incoming state is bounded by the fixed tutor-output limit and retained outside the
rendered transcript. Resume updates applies one reconciled current presentation, preserves focus and the prior stable
anchor, and announces at most the latest meaningful transition. Auth expiry, scope loss, and other urgent privacy events
still replace the page safely. A user who reads away from the end receives the same stable-reading behavior without
having to pause.

The attempt container, its heading, and its reading-anchor element MUST keep the same DOM nodes and IDs from first
render through terminal reconciliation. Earlier turns and unchanged semantic descendants MUST remain mounted. The
terminal fetch replaces the untrusted parse result and data model, not the transcript, attempt container, heading,
anchor, or unchanged descendants. Changed descendants are reconciled in place where possible.

Focus, selection, scroll position, and the nearest stable reading anchor MUST survive reconciliation. If malformed
partial structure makes exact changed-descendant preservation impossible, focus remains unchanged and a persistent,
labelled View final response control targets the stable attempt anchor. A terminal snapshot enters this same path. A
failed authoritative fetch keeps the stable container marked reconciliation pending; it never remounts or reopens SSE
solely because reconciliation failed.

Stopping the wait for terminal reconciliation leaves the attempt visibly unconfirmed, keeps SSE closed, and exposes a
Try final response again action. It does not cancel tutor work or claim terminal content. Retry branches explicitly to
success, offline, protocol failure, sign-in loss, scope loss, or continued unavailability.

Malformed payload, wrong response identity, unknown event type, illegal order, delta before baseline, regressive state,
and events after terminal fence the connection epoch. The page preserves only prior authoritative content, announces one
concise protocol failure, and offers a fresh authorized transcript or turn reconciliation read without automatic replay.

Failed and interrupted attempts remain immutable, separately headed blocks with attempt number and incomplete state.
Speech is unavailable for those attempts and that reason is visible. Empty failed attempts remain as status rows so the
conversation order is not lost.

## Upload Queue (AC-014)

The labelled native file input is the primary upload control. Drag-and-drop invokes the same validation and queue and is
an enhancement only. The input MUST expose accepted formats and multiple-file behavior that match the current OpenAPI
and operator limits.

Because OpenAPI uploads one file per request, the queue MUST expose one stable row per selected file in selection order.
Each row contains the complete filename, format, size, and one of these text states: queued, uploading, verifying,
uploaded, rejected, outcome unknown, or cancelled locally with server outcome unknown.

Each row MUST:

- have an accessible name that distinguishes duplicate filenames by position and size;
- associate its validation or backend error with that file;
- expose Retry only before dispatch or after a definitive rejection and Remove only when valid;
- use a named progressbar only when real byte progress is known;
- use concise indeterminate text when byte progress is unavailable; and
- preserve uploaded rows and their server identities when another file fails.

Upload transitions use this live-region contract:

| Transition | Localized intent | Mode | Dedupe key |
| --- | --- | --- | --- |
| Selected to queued | File queued | Polite status | file ID + queued |
| Queued to uploading | File upload started | Polite status | file ID + uploading |
| Uploading to verifying | File uploaded; checking | Polite status | file ID + verifying |
| Verifying to uploaded | File uploaded | Polite status | file ID + uploaded |
| Any definitive state to rejected | File rejected; review error | Assertive alert | file ID + rejected |
| Dispatched to outcome unknown | Upload not confirmed | Assertive alert | file ID + unknown |
| Queued to cancelled | Queued file removed | Polite status | file ID + cancelled |

Progress-value changes are not separately announced. Updates committed in one render cycle are coalesced into one
localized message by mode and state, with rejected or unknown outcomes announced before polite updates. An aggregate
records every underlying per-file/state key as announced, includes affected file positions or names, and never
suppresses a rejected or unknown outcome. Later duplicate snapshots remain silent. Focus never moves because upload
state changes. Explicit Remove returns focus to the next row, previous row, or file input in that order. Retry retains
focus on its row.

Only one polite upload message is active at a time. Later serialized polite transitions update one pending aggregate
rather than queueing file-by-file speech. Assertive rejected or unknown outcomes interrupt that pending aggregate; the
remaining polite count may be announced once afterward without replaying underlying keys.

Mixed-format recovery MUST identify every incompatible file and permit removal without restarting the draft. An unknown
dispatched upload pauses later queue dispatch. Later queued file handles remain only in the current page and may be
cancelled before dispatch. Fresh file-list reconciliation follows; filename, size, and media type cannot prove a commit.

When the unknown attempt cannot be correlated, the available actions are Abandon unknown attempt and Upload as a new
file. Both warn that the earlier upload outcome is unknown. Abandonment destroys the old local attempt without making a
server claim. Upload as a new file creates a new attempt and may duplicate prior bytes; it is never labelled Retry.

After all unknown rows are explicitly resolved, Accept authoritative file list records the current server list version
as reviewed. A newer list invalidates that acceptance. Finalize is enabled only from the accepted current version and
current eligibility. The complete 200-file fixture MUST remain keyboard reviewable; paging or virtualization preserves
row order, status, and reachable actions.

## Safe Rich Content and Links (AC-015)

Streaming input, completed tutor output, authored Markdown, code, and math are untrusted. Raw HTML, input SVG or MathML,
scripts, frames, forms, media, remote images, event attributes, IDs, inline style, and model-defined controls MUST NOT
reach the rendered DOM. Partial content is escaped text until a complete allowed structure can be parsed safely, or the
entire accumulated string is reparsed through the same locked allowlist on every update.

### Heading and Link Normalization

Each transcript page has one route `h1`; the transcript has an `h2`; each message or response-attempt block has a stable
`h3` naming speaker, sequence or attempt, and state. Model headings are nested beneath that message heading:

- the shallowest model heading maps to `h4`;
- relative depth is preserved without skipped output levels;
- output deeper than `h6` becomes a semantically strong paragraph; and
- an empty, malformed, or unstable heading is rendered as plain text.

Generated heading text never supplies an element ID or global anchor. Block quotes use `<blockquote>` without implying
a source unless source text is present. Lists remain semantic lists only after their structure is complete.

Only explicitly parsed, allowlisted links become interactive. Transcript text is never auto-linked. External links MUST
use parsed HTTPS destinations, visibly expose an inspectable destination and normalized ASCII host, require explicit
activation, and use a new isolated context with no opener or referrer. Link purpose MUST be understandable from its text
and message context. Before activation, every external link includes a localized visible and programmatically associated
"opens in a new tab" indication. It MUST NOT rely on `title`, hover, an icon, or visual styling alone.

### Tables

Only simple tables with determinable headers render as `<table>`. They MUST have:

- an adjacent visible label or caption naming the message and table sequence;
- correct column and, when present, row-header scope;
- a logical linearized cell order; and
- a labelled, focusable overflow container only when two-dimensional scrolling is required.

Tables with ambiguous headers, invalid spans, malformed structure, or unusable dimensions fall back to a labelled
linear list or escaped plain text. Responsive styling MUST NOT change semantic cell order or hide headers.

### Code

Code renders as selectable plain text in `<code>` and, for blocks, `<pre>`. Known language is exposed in adjacent text;
syntax color is never the only meaning. Lines wrap by default. A user may choose contained horizontal scrolling when
wrapping would alter comprehension. The overflow region is labelled and keyboard reachable only while scrolling is
needed. Copy code uses the copy-feedback contract and preserves meaningful plain text.

### Math

Math is parsed locally from the supported syntax and rendered as semantic MathML or an equivalently tested accessible
representation. User or model-supplied MathML is never inserted directly. Every expression MUST expose meaningful
spoken text, visual notation, selectable or copyable source text, and a plain-text fallback when parsing fails. Speech
and copy output MUST omit markup artifacts. Simple, complex, nested, malformed, and oversized fixtures are required.

## Locale, Language, and Direction (AC-016)

The exact active BCP 47 launch tag MUST be applied to `<html lang>` before localized content is revealed or the locale
change is announced. All launch UI locales use `dir="ltr"`; direction is still explicit at the page root.

Known-language authored, material, and tutor content MUST use the valid language metadata supplied by the authoritative
resource. Unknown-language blocks MUST not be assigned a guessed language. Backend technical text remains untranslated
and receives known language metadata only when authoritative metadata exists.

Untrusted block content uses `dir="auto"`. Untrusted inline values such as names, filenames, and interpolated authored
text use Unicode isolation through `<bdi>` or an equivalent isolation boundary. Usernames, UUIDs, recovery codes,
security codes, code blocks, URLs, and technical identifiers use stable left-to-right presentation without altering the
copied value.

Locale changes MUST atomically update frontend-owned labels, status text, validation, titles, number and date formats,
and document language while preserving authored bytes, form values, focus, and route. The interface-language change is
announced once after the document language changes. Acceptance covers all seven launch locales plus mixed English,
Arabic, and Hebrew content in forms, transcript, errors, tables, filenames, codes, and identifiers.

## Copy and Recovery Codes (AC-017)

### Copy Feedback

Every copy control MUST have a visible, object-specific label such as Copy code, Copy technical details, or Copy all
recovery codes. It copies only the named visible plain-text scope and no hidden metadata.

One mounted polite status region announces a short localized success or failure without moving focus. Its dedupe key is
the control identity plus activation sequence. Feedback resets between activations so a later copy is announced, but a
single activation cannot announce twice. Clipboard denial or unavailable clipboard access produces visible and
announced failure with a selectable manual-copy fallback.

### Recovery Codes

Recovery codes are shown once after successful MFA activation. The surface MUST:

- explain before reveal that the set cannot be retrieved again;
- require an explicit reveal and a safe-storage acknowledgement before departure;
- offer user-initiated Copy all and print, but no automatic copy or download;
- announce copy and print initiation or failure without reading the codes aloud;
- warn visibly that MIA cannot clear the OS clipboard, print preview, spooler, printer output, or screenshots;
- use application-authored print DOM and CSS containing only the warning and codes;
- use a neutral document title and content-free cleaned URL before print;
- warn that native browser print settings may add a URL, date, page number, header, or footer outside MIA's control;
- mask the codes on page hide and require an explicit reveal again while the one-time page remains valid;
- prevent authenticated response caching and generic application-state retention; and
- remove code values from application memory and replace the history entry after confirmed departure.

Back, Reload, duplicate tab, print preview, print cancellation, copy success, clipboard denial, logout, sign-in expiry,
page hide, and lost activation response require tests. The UI MUST explain that loss of the activation response or the
only code set requires complete factor replacement or an authorized reset; it MUST NOT imply codes can be retrieved.

Application teardown MUST NOT claim to erase data outside MIA's control.

### Protected Download Boundary

Before a protected download, visible associated text states that activation may create a durable browser-managed file
outside MIA. Once a direct browser transfer starts, MIA cannot reliably cancel, inspect, revoke, or erase it after
logout, scope change, or account change. The interface MUST NOT claim otherwise. An app-managed fetch may claim
cancellation only when supported-browser evidence proves that abort and object-URL teardown prevent app consumption.

The warning and explicit continuation precede the first sensitive download in a browser session, are keyboard and
screen-reader operable, and explain shared-device risk. This boundary does not weaken fresh authorization, safe download
headers, `BCG-005`, or teardown of application-owned bytes and object URLs.

## Native Audio (AC-018)

Generated speech supplements the visible completed tutor response and MUST never replace it. Audio MUST use the native
`<audio controls>` element, have an adjacent accessible label tied to the response attempt, and remain keyboard operable
in each supported browser. It MUST NOT autoplay.

Generating, available, failed, expired, voice required, and service unavailable are visible text states. Only completed
tutor responses may expose Request speech or audio controls. Playback failure or an existence-safe 404 removes the stale
player and retains the transcript. Object URLs and decoded media are revoked on route departure, logout, authorization
loss, expiry, replacement, and failure.

Native control names, focus, playback, pause, seeking, volume, current state, and error recovery require manual evidence
in current Chrome, Edge, and Safari within the confirmed platform matrix.

## Evidence Model (AC-019)

### Confirmed Browser and Platform Matrix

Release-one automated E2E runs use only Playwright bundled Chromium on developer macOS. The project MUST NOT add or
claim required non-macOS automation, Playwright Firefox, Playwright WebKit, Edge-channel automation, Cypress, or
Electron.

Current Chrome and Edge are supported and receive repeatable Product Owner manual testing on available actual
environments. Current Safari is supported through repeatable Product Owner manual testing on macOS. Firefox is
unsupported and is not proactively blocked. A Firefox report is a change request unless it demonstrates a general
standards, accessibility, or security defect.

Required evidence is:

| Evidence lane | Environment | Required coverage |
| --- | --- | --- |
| Automated E2E | Bundled Chromium, developer macOS | Semantics, flows, states, reflow, media emulation |
| PO manual | Current Chrome, available actual environment | Critical processes and native controls |
| PO manual | Current Edge, available actual environment | Critical processes and native controls |
| PO manual | Current Safari, macOS | Critical processes, VoiceOver, zoom, audio, forms |
| Manual AT | VoiceOver with current Safari, macOS | Names, roles, focus, forms, live regions, reading |

The release record MUST pin every actual OS, browser, Playwright, and assistive-technology version tested. Browser
support does not permit a browser-specific WCAG failure. A known applicable A/AA failure in any supported environment
blocks release. A criterion cannot be marked Pass merely by classifying missing evidence as residual risk. Untested
platform and assistive-technology combinations remain explicit coverage risks, not conformance exceptions or passes.

### Automated Evidence

Automated tests MUST be deterministic, run against local controlled data and provider fakes, and record the command,
commit, versions, fixture, result, and artifact location. They MUST cover:

- role, name, state, description, landmark, heading, title, current-route, and form associations;
- keyboard order, bypass, route focus, dialog containment, fallback focus, and focus-not-obscured geometry;
- direct 320 CSS pixels in all three text modes as automated reflow regression coverage;
- every release process and surface at 200% browser zoom;
- WCAG text-spacing overrides and bundled Chromium forced-colors and reduced-motion emulation;
- all seven locales, long translated labels, mixed-direction fixtures, and document-language changes;
- streaming transitions, duplicate snapshots, reconnect epochs, terminal reconciliation, and announcement ledgers;
- transcript scroll and stable-node behavior while focus and reading anchors remain in earlier content;
- form errors, tooltips, disclosures, target geometry, copy denial, and paste into every credential control;
- the one-file upload queue, duplicate names, mixed formats, 200 files, unknown outcomes, and row focus;
- safe Markdown, table, code, math, mutation-XSS, malformed partial, and every-chunk-boundary fixtures; and
- recovery-code lifecycle and native-audio state rendering without calling paid or production providers.

An automated accessibility scanner MUST run on representative stable states, but scanner output is only one evidence
artifact. The release record MUST identify its name, version, rules, exclusions, and reviewed false-positive decisions.
No blanket rule suppression is permitted.

### Manual Evidence

Manual scripts MUST be reproducible from a named fixture and contain numbered actions, expected focus, expected speech
or visual result, actual result, tester, date, exact environment, evidence link, and defect link. Critical scripts
cover:

- every authentication stage, password manager, paste, reveal, TOTP manual setup, recovery code, and expiry path;
- every complete process in a 1280 CSS-pixel window at 400% browser zoom in all three text modes;
- every complete process at 200% browser zoom and critical persistent-layout states at 100%;
- keyboard-only traversal, dialogs, forms, errors, tooltips, disclosures, upload review, and destructive actions;
- VoiceOver reading and control operation for landmarks, navigation, transcript, streaming, status, rich content, and
  audio;
- Safari browser zoom, text spacing, focus-not-obscured, native controls, locale changes, and printing; and
- current Chrome and Edge critical-flow scripts on each Product Owner environment actually available for the release.

Screenshots alone cannot prove keyboard order, accessible names, announcements, password-manager behavior, or screen-
reader reading. Screen recordings or timestamped notes MUST accompany dynamic behavior where a static artifact cannot
show the result. Evidence MUST contain no passwords, MFA values, recovery codes, tokens, private content, or real
student data.

### Complete-Process Matrix

The following profiles instantiate repeated matrix dimensions without sampling away a required state or action row.
The AC mapping for a row is the union of its lane profile and process profile.

| Profile | Instantiated coverage |
| --- | --- |
| `CV-C` | Seven locales; S/L/XL; 320 direct, 400%, 200%, 100%; Chromium, Chrome, Edge, Safari, VoiceOver |
| `CV-S` | Seven locales; S/L/XL; 320 direct, 400%, 200%; Chromium; native controls in Chrome, Edge, Safari |

`CV-C` applies to critical processes and includes full manual browser and AT depth. `CV-S` applies to non-critical
processes. Both retain the exact evidence obligations in the confirmed browser and platform matrix.

| Lane profile | Atomic state or action | AC IDs | Planned evidence profile |
| --- | --- | --- | --- |
| `LP-CHK` | Access and resource checking | `AC-001` through `AC-005`, `AC-012`, `AC-016`, `AC-019` | `EP-CHK` |
| `LP-EMP` | Empty or no eligible work | `AC-001` through `AC-005`, `AC-012`, `AC-016`, `AC-019` | `EP-EMP` |
| `LP-SUC` | Successful primary and secondary actions | `AC-001`-`005`, `007`, `009`, `012`, `016`, `019` | `EP-SUC` |
| `LP-VAL` | Client or backend validation correction | `AC-001`-`004`, `008`, `009`, `012`, `016`, `019` | `EP-VAL` |
| `LP-ERR` | Backend failure and retry | `AC-001`-`004`, `007`, `008`, `012`, `016`, `017`, `019` | `EP-ERR` |
| `LP-UNK` | Offline or dispatched outcome unknown | `AC-001`-`004`, `007`, `008`, `012`, `016`, `019` | `EP-UNK` |
| `LP-STA` | Stale or concurrent change reconciliation | `AC-001`-`004`, `007`, `008`, `012`, `016`, `019` | `EP-STA` |
| `LP-AUT` | Authorization loss | `AC-001`-`004`, `007`, `012`, `016`, `019` | `EP-AUT` |
| `LP-EXT` | Cancel, parent, logout, or terminal safe exit | `AC-001`-`004`, `007`, `012`, `016`, `019` | `EP-EXT` |

| Process profile | Additional AC IDs |
| --- | --- |
| `PS-01` | `AC-006`, `AC-010`, `AC-011`, `AC-017` |
| `PS-02` | `AC-010` |
| `PS-03` | `AC-006`, `AC-014`, `AC-015`, `AC-017` |
| `PS-04` | `AC-006`, `AC-014`, `AC-015`, `AC-017` |
| `PS-05` | `AC-013`, `AC-015`, `AC-017` |
| `PS-06` | `AC-015`, `AC-017` |
| `PS-07` | `AC-015` |
| `PS-08` | `AC-006`, `AC-010`, `AC-011` |
| `PS-09` | `AC-006`, `AC-010`, `AC-011` |
| `PS-10` | `AC-010` |
| `PS-11` | `AC-015`, `AC-017`, `AC-018` |
| `PS-12` | `AC-006`, `AC-010` |
| `PS-13` | `AC-006`, `AC-010` |
| `PS-14` | `AC-006`, `AC-015`, `AC-017` |

Evidence profiles are plans, not completed artifacts:

| Profile | Planned automated evidence | Planned manual evidence |
| --- | --- | --- |
| `EP-CHK` | Gate, skeleton, title, landmark, no-leak, reflow fixtures | Keyboard and VoiceOver access-check script |
| `EP-EMP` | Empty-state semantics, action, route, reflow fixtures | Empty-state reading and exit script |
| `EP-SUC` | Successful flow, focus, status, reflow, locale fixtures | Keyboard, zoom, browser, AT flow script |
| `EP-VAL` | Field, summary, value retention, locale, reflow fixtures | Error correction and password-manager script |
| `EP-ERR` | Escaped body, focus, retry, disclosure, reflow fixtures | Failure recovery and technical-detail script |
| `EP-UNK` | Offline cover, no replay, reconciliation, focus fixtures | Offline and ambiguous-outcome recovery script |
| `EP-STA` | Version conflict, fresh review, focus, dedupe fixtures | Concurrent-change reconciliation script |
| `EP-AUT` | Teardown, request fence, safe title, cache, focus fixtures | Sign-in and scope-loss privacy script |
| `EP-EXT` | Cancel, terminal teardown, parent route, focus fixtures | Safe cancellation, logout, and return script |

The owner for all planning rows is the Accessibility owner. The shared lane rows below are aggregate coverage indexes,
not action release cells. Their `Blocked` status means at least one indexed action depends on a listed BCG; it never
blocks an unrelated action. The action rows that follow are authoritative for action-scoped release status. Every
evidence cell is `Planned` and therefore is not release evidence.

| Atomic row | AC map | Coverage | Evidence | Dependency | Status |
| --- | --- | --- | --- | --- | --- |
| `CP-01/CHK` | `LP-CHK` + `PS-01` | `CV-C` | Planned: `EP-CHK` | `BCG-001`, `009` | Blocked |
| `CP-01/EMP` | `LP-EMP` + `PS-01` | `CV-C` | Planned: `EP-EMP` | None | Not run |
| `CP-01/SUC` | `LP-SUC` + `PS-01` | `CV-C` | Planned: `EP-SUC` | `BCG-001`, `005`, `009` | Blocked |
| `CP-01/VAL` | `LP-VAL` + `PS-01` | `CV-C` | Planned: `EP-VAL` | None | Not run |
| `CP-01/ERR` | `LP-ERR` + `PS-01` | `CV-C` | Planned: `EP-ERR` | `BCG-007` | Blocked |
| `CP-01/UNK` | `LP-UNK` + `PS-01` | `CV-C` | Planned: `EP-UNK` | `BCG-001`, `009` | Blocked |
| `CP-01/STA` | `LP-STA` + `PS-01` | `CV-C` | Planned: `EP-STA` | `BCG-001`, `009` | Blocked |
| `CP-01/AUT` | `LP-AUT` + `PS-01` | `CV-C` | Planned: `EP-AUT` | `BCG-001`, `003`, `005` | Blocked |
| `CP-01/EXT` | `LP-EXT` + `PS-01` | `CV-C` | Planned: `EP-EXT` | `BCG-001` | Blocked |
| `CP-02/CHK` | `LP-CHK` + `PS-02` | `CV-C` | Planned: `EP-CHK` | `BCG-001` through `003` | Blocked |
| `CP-02/EMP` | `LP-EMP` + `PS-02` | `CV-C` | Planned: `EP-EMP` | `BCG-002` | Blocked |
| `CP-02/SUC` | `LP-SUC` + `PS-02` | `CV-C` | Planned: `EP-SUC` | `BCG-001`, `002`, `003`, `005` | Blocked |
| `CP-02/VAL` | `LP-VAL` + `PS-02` | `CV-C` | Planned: `EP-VAL` | None | Not run |
| `CP-02/ERR` | `LP-ERR` + `PS-02` | `CV-C` | Planned: `EP-ERR` | `BCG-007` | Blocked |
| `CP-02/UNK` | `LP-UNK` + `PS-02` | `CV-C` | Planned: `EP-UNK` | `BCG-001`, `002` | Blocked |
| `CP-02/STA` | `LP-STA` + `PS-02` | `CV-C` | Planned: `EP-STA` | `BCG-001` through `003` | Blocked |
| `CP-02/AUT` | `LP-AUT` + `PS-02` | `CV-C` | Planned: `EP-AUT` | `BCG-001`, `003`, `005` | Blocked |
| `CP-02/EXT` | `LP-EXT` + `PS-02` | `CV-C` | Planned: `EP-EXT` | `BCG-001` | Blocked |
| `CP-03/CHK` | `LP-CHK` + `PS-03` | `CV-C` | Planned: `EP-CHK` | `BCG-001`, `003`, `011` | Blocked |
| `CP-03/EMP` | `LP-EMP` + `PS-03` | `CV-C` | Planned: `EP-EMP` | None | Not run |
| `CP-03/SUC` | `LP-SUC` + `PS-03` | `CV-C` | Planned: `EP-SUC` | `BCG-005`, `011` | Blocked |
| `CP-03/VAL` | `LP-VAL` + `PS-03` | `CV-C` | Planned: `EP-VAL` | None | Not run |
| `CP-03/ERR` | `LP-ERR` + `PS-03` | `CV-C` | Planned: `EP-ERR` | `BCG-007` | Blocked |
| `CP-03/UNK` | `LP-UNK` + `PS-03` | `CV-C` | Planned: `EP-UNK` | None | Not run |
| `CP-03/STA` | `LP-STA` + `PS-03` | `CV-C` | Planned: `EP-STA` | `BCG-011` | Blocked |
| `CP-03/AUT` | `LP-AUT` + `PS-03` | `CV-C` | Planned: `EP-AUT` | `BCG-003`, `005` | Blocked |
| `CP-03/EXT` | `LP-EXT` + `PS-03` | `CV-C` | Planned: `EP-EXT` | None | Not run |
| `CP-04/CHK` | `LP-CHK` + `PS-04` | `CV-S` | Planned: `EP-CHK` | `BCG-001`, `003` | Blocked |
| `CP-04/EMP` | `LP-EMP` + `PS-04` | `CV-S` | Planned: `EP-EMP` | None | Not run |
| `CP-04/SUC` | `LP-SUC` + `PS-04` | `CV-S` | Planned: `EP-SUC` | `BCG-005` | Blocked |
| `CP-04/VAL` | `LP-VAL` + `PS-04` | `CV-S` | Planned: `EP-VAL` | None | Not run |
| `CP-04/ERR` | `LP-ERR` + `PS-04` | `CV-S` | Planned: `EP-ERR` | `BCG-007` | Blocked |
| `CP-04/UNK` | `LP-UNK` + `PS-04` | `CV-S` | Planned: `EP-UNK` | None | Not run |
| `CP-04/STA` | `LP-STA` + `PS-04` | `CV-S` | Planned: `EP-STA` | None | Not run |
| `CP-04/AUT` | `LP-AUT` + `PS-04` | `CV-S` | Planned: `EP-AUT` | `BCG-003`, `005` | Blocked |
| `CP-04/EXT` | `LP-EXT` + `PS-04` | `CV-S` | Planned: `EP-EXT` | None | Not run |
| `CP-05/CHK` | `LP-CHK` + `PS-05` | `CV-C` | Planned: `EP-CHK` | `BCG-001` through `003`, `011`, `012` | Blocked |
| `CP-05/EMP` | `LP-EMP` + `PS-05` | `CV-C` | Planned: `EP-EMP` | `BCG-002`, `011`, `012` | Blocked |
| `CP-05/SUC` | `LP-SUC` + `PS-05` | `CV-C` | Planned: `EP-SUC` | `BCG-002`, `005`, `011`, `012` | Blocked |
| `CP-05/VAL` | `LP-VAL` + `PS-05` | `CV-C` | Planned: `EP-VAL` | None | Not run |
| `CP-05/ERR` | `LP-ERR` + `PS-05` | `CV-C` | Planned: `EP-ERR` | `BCG-007` | Blocked |
| `CP-05/UNK` | `LP-UNK` + `PS-05` | `CV-C` | Planned: `EP-UNK` | `BCG-002`, `012` | Blocked |
| `CP-05/STA` | `LP-STA` + `PS-05` | `CV-C` | Planned: `EP-STA` | `BCG-002`, `012` | Blocked |
| `CP-05/AUT` | `LP-AUT` + `PS-05` | `CV-C` | Planned: `EP-AUT` | `BCG-003`, `005` | Blocked |
| `CP-05/EXT` | `LP-EXT` + `PS-05` | `CV-C` | Planned: `EP-EXT` | `BCG-012` | Blocked |
| `CP-06/CHK` | `LP-CHK` + `PS-06` | `CV-S` | Planned: `EP-CHK` | `BCG-001`, `003`, `004` | Blocked |
| `CP-06/EMP` | `LP-EMP` + `PS-06` | `CV-S` | Planned: `EP-EMP` | None | Not run |
| `CP-06/SUC` | `LP-SUC` + `PS-06` | `CV-S` | Planned: `EP-SUC` | `BCG-004`, `005` | Blocked |
| `CP-06/VAL` | `LP-VAL` + `PS-06` | `CV-S` | Planned: `EP-VAL` | None | Not run |
| `CP-06/ERR` | `LP-ERR` + `PS-06` | `CV-S` | Planned: `EP-ERR` | `BCG-007` | Blocked |
| `CP-06/UNK` | `LP-UNK` + `PS-06` | `CV-S` | Planned: `EP-UNK` | `BCG-004` | Blocked |
| `CP-06/STA` | `LP-STA` + `PS-06` | `CV-S` | Planned: `EP-STA` | `BCG-004` | Blocked |
| `CP-06/AUT` | `LP-AUT` + `PS-06` | `CV-S` | Planned: `EP-AUT` | `BCG-003`, `005` | Blocked |
| `CP-06/EXT` | `LP-EXT` + `PS-06` | `CV-S` | Planned: `EP-EXT` | None | Not run |
| `CP-07/CHK` | `LP-CHK` + `PS-07` | `CV-S` | Planned: `EP-CHK` | `BCG-001`, `003` | Blocked |
| `CP-07/EMP` | `LP-EMP` + `PS-07` | `CV-S` | Planned: `EP-EMP` | None | Not run |
| `CP-07/SUC` | `LP-SUC` + `PS-07` | `CV-S` | Planned: `EP-SUC` | `BCG-005` | Blocked |
| `CP-07/VAL` | `LP-VAL` + `PS-07` | `CV-S` | Planned: `EP-VAL` | None | Not run |
| `CP-07/ERR` | `LP-ERR` + `PS-07` | `CV-S` | Planned: `EP-ERR` | `BCG-007` | Blocked |
| `CP-07/UNK` | `LP-UNK` + `PS-07` | `CV-S` | Planned: `EP-UNK` | None | Not run |
| `CP-07/STA` | `LP-STA` + `PS-07` | `CV-S` | Planned: `EP-STA` | None | Not run |
| `CP-07/AUT` | `LP-AUT` + `PS-07` | `CV-S` | Planned: `EP-AUT` | `BCG-003`, `005` | Blocked |
| `CP-07/EXT` | `LP-EXT` + `PS-07` | `CV-S` | Planned: `EP-EXT` | None | Not run |
| `CP-08/CHK` | `LP-CHK` + `PS-08` | `CV-S` | Planned: `EP-CHK` | `BCG-001`, `003` | Blocked |
| `CP-08/EMP` | `LP-EMP` + `PS-08` | `CV-S` | Planned: `EP-EMP` | None | Not run |
| `CP-08/SUC` | `LP-SUC` + `PS-08` | `CV-S` | Planned: `EP-SUC` | `BCG-005` | Blocked |
| `CP-08/VAL` | `LP-VAL` + `PS-08` | `CV-S` | Planned: `EP-VAL` | None | Not run |
| `CP-08/ERR` | `LP-ERR` + `PS-08` | `CV-S` | Planned: `EP-ERR` | `BCG-007` | Blocked |
| `CP-08/UNK` | `LP-UNK` + `PS-08` | `CV-S` | Planned: `EP-UNK` | None | Not run |
| `CP-08/STA` | `LP-STA` + `PS-08` | `CV-S` | Planned: `EP-STA` | None | Not run |
| `CP-08/AUT` | `LP-AUT` + `PS-08` | `CV-S` | Planned: `EP-AUT` | `BCG-003`, `005` | Blocked |
| `CP-08/EXT` | `LP-EXT` + `PS-08` | `CV-S` | Planned: `EP-EXT` | None | Not run |
| `CP-09/CHK` | `LP-CHK` + `PS-09` | `CV-C` | Planned: `EP-CHK` | `BCG-001`, `003`, `010` | Blocked |
| `CP-09/EMP` | `LP-EMP` + `PS-09` | `CV-C` | Planned: `EP-EMP` | None | Not run |
| `CP-09/SUC` | `LP-SUC` + `PS-09` | `CV-C` | Planned: `EP-SUC` | `BCG-005`, `010` | Blocked |
| `CP-09/VAL` | `LP-VAL` + `PS-09` | `CV-C` | Planned: `EP-VAL` | None | Not run |
| `CP-09/ERR` | `LP-ERR` + `PS-09` | `CV-C` | Planned: `EP-ERR` | `BCG-007` | Blocked |
| `CP-09/UNK` | `LP-UNK` + `PS-09` | `CV-C` | Planned: `EP-UNK` | `BCG-010` | Blocked |
| `CP-09/STA` | `LP-STA` + `PS-09` | `CV-C` | Planned: `EP-STA` | `BCG-010` | Blocked |
| `CP-09/AUT` | `LP-AUT` + `PS-09` | `CV-C` | Planned: `EP-AUT` | `BCG-003`, `005` | Blocked |
| `CP-09/EXT` | `LP-EXT` + `PS-09` | `CV-C` | Planned: `EP-EXT` | None | Not run |
| `CP-10/CHK` | `LP-CHK` + `PS-10` | `CV-S` | Planned: `EP-CHK` | `BCG-001`, `003` | Blocked |
| `CP-10/EMP` | `LP-EMP` + `PS-10` | `CV-S` | Planned: `EP-EMP` | None | Not run |
| `CP-10/SUC` | `LP-SUC` + `PS-10` | `CV-S` | Planned: `EP-SUC` | `BCG-005`, `006`, `014` | Blocked |
| `CP-10/VAL` | `LP-VAL` + `PS-10` | `CV-S` | Planned: `EP-VAL` | None | Not run |
| `CP-10/ERR` | `LP-ERR` + `PS-10` | `CV-S` | Planned: `EP-ERR` | `BCG-007` | Blocked |
| `CP-10/UNK` | `LP-UNK` + `PS-10` | `CV-S` | Planned: `EP-UNK` | `BCG-006` | Blocked |
| `CP-10/STA` | `LP-STA` + `PS-10` | `CV-S` | Planned: `EP-STA` | `BCG-014` | Blocked |
| `CP-10/AUT` | `LP-AUT` + `PS-10` | `CV-S` | Planned: `EP-AUT` | `BCG-003`, `005` | Blocked |
| `CP-10/EXT` | `LP-EXT` + `PS-10` | `CV-S` | Planned: `EP-EXT` | None | Not run |
| `CP-11/CHK` | `LP-CHK` + `PS-11` | `CV-S` | Planned: `EP-CHK` | `BCG-001`, `003` | Blocked |
| `CP-11/EMP` | `LP-EMP` + `PS-11` | `CV-S` | Planned: `EP-EMP` | None | Not run |
| `CP-11/SUC` | `LP-SUC` + `PS-11` | `CV-S` | Planned: `EP-SUC` | `BCG-005` | Blocked |
| `CP-11/VAL` | `LP-VAL` + `PS-11` | `CV-S` | Planned: `EP-VAL` | None | Not run |
| `CP-11/ERR` | `LP-ERR` + `PS-11` | `CV-S` | Planned: `EP-ERR` | `BCG-007` | Blocked |
| `CP-11/UNK` | `LP-UNK` + `PS-11` | `CV-S` | Planned: `EP-UNK` | None | Not run |
| `CP-11/STA` | `LP-STA` + `PS-11` | `CV-S` | Planned: `EP-STA` | None | Not run |
| `CP-11/AUT` | `LP-AUT` + `PS-11` | `CV-S` | Planned: `EP-AUT` | `BCG-003`, `005` | Blocked |
| `CP-11/EXT` | `LP-EXT` + `PS-11` | `CV-S` | Planned: `EP-EXT` | None | Not run |
| `CP-12/CHK` | `LP-CHK` + `PS-12` | `CV-C` | Planned: `EP-CHK` | `BCG-001`, `003`, `008` | Blocked |
| `CP-12/EMP` | `LP-EMP` + `PS-12` | `CV-C` | Planned: `EP-EMP` | `BCG-008` | Blocked |
| `CP-12/SUC` | `LP-SUC` + `PS-12` | `CV-C` | Planned: `EP-SUC` | `BCG-005`, `008`, `010`, `014` | Blocked |
| `CP-12/VAL` | `LP-VAL` + `PS-12` | `CV-C` | Planned: `EP-VAL` | None | Not run |
| `CP-12/ERR` | `LP-ERR` + `PS-12` | `CV-C` | Planned: `EP-ERR` | `BCG-007` | Blocked |
| `CP-12/UNK` | `LP-UNK` + `PS-12` | `CV-C` | Planned: `EP-UNK` | `BCG-008`, `010` | Blocked |
| `CP-12/STA` | `LP-STA` + `PS-12` | `CV-C` | Planned: `EP-STA` | `BCG-008`, `014` | Blocked |
| `CP-12/AUT` | `LP-AUT` + `PS-12` | `CV-C` | Planned: `EP-AUT` | `BCG-003`, `005` | Blocked |
| `CP-12/EXT` | `LP-EXT` + `PS-12` | `CV-C` | Planned: `EP-EXT` | None | Not run |
| `CP-13/CHK` | `LP-CHK` + `PS-13` | `CV-C` | Planned: `EP-CHK` | `BCG-001`, `003`, `011` | Blocked |
| `CP-13/EMP` | `LP-EMP` + `PS-13` | `CV-C` | Planned: `EP-EMP` | `BCG-011` | Blocked |
| `CP-13/SUC` | `LP-SUC` + `PS-13` | `CV-C` | Planned: `EP-SUC` | `BCG-005`, `011`, `014` | Blocked |
| `CP-13/VAL` | `LP-VAL` + `PS-13` | `CV-C` | Planned: `EP-VAL` | None | Not run |
| `CP-13/ERR` | `LP-ERR` + `PS-13` | `CV-C` | Planned: `EP-ERR` | `BCG-007` | Blocked |
| `CP-13/UNK` | `LP-UNK` + `PS-13` | `CV-C` | Planned: `EP-UNK` | None | Not run |
| `CP-13/STA` | `LP-STA` + `PS-13` | `CV-C` | Planned: `EP-STA` | `BCG-011`, `014` | Blocked |
| `CP-13/AUT` | `LP-AUT` + `PS-13` | `CV-C` | Planned: `EP-AUT` | `BCG-003`, `005` | Blocked |
| `CP-13/EXT` | `LP-EXT` + `PS-13` | `CV-C` | Planned: `EP-EXT` | None | Not run |
| `CP-14/CHK` | `LP-CHK` + `PS-14` | `CV-C` | Planned: `EP-CHK` | `BCG-001`, `003` | Blocked |
| `CP-14/EMP` | `LP-EMP` + `PS-14` | `CV-C` | Planned: `EP-EMP` | None | Not run |
| `CP-14/SUC` | `LP-SUC` + `PS-14` | `CV-C` | Planned: `EP-SUC` | `BCG-005` | Blocked |
| `CP-14/VAL` | `LP-VAL` + `PS-14` | `CV-C` | Planned: `EP-VAL` | None | Not run |
| `CP-14/ERR` | `LP-ERR` + `PS-14` | `CV-C` | Planned: `EP-ERR` | `BCG-007` | Blocked |
| `CP-14/UNK` | `LP-UNK` + `PS-14` | `CV-C` | Planned: `EP-UNK` | None | Not run |
| `CP-14/STA` | `LP-STA` + `PS-14` | `CV-C` | Planned: `EP-STA` | None | Not run |
| `CP-14/AUT` | `LP-AUT` + `PS-14` | `CV-C` | Planned: `EP-AUT` | `BCG-003`, `005` | Blocked |
| `CP-14/EXT` | `LP-EXT` + `PS-14` | `CV-C` | Planned: `EP-EXT` | `BCG-003` | Blocked |

The rows above establish shared state-lane coverage. Their dependency column is the union of blockers encountered by
indexed actions, not the status of every action in that lane. The action rows below are the release cells for
operation-specific dependencies; each inherits the process's `CHK`, `ERR`, `AUT`, and `EXT` coverage without inheriting
another action's blocker.

| Action row | Surface and action | AC and evidence | Dependency | Status |
| --- | --- | --- | --- | --- |
| `CP-01/A01` | Login: submit credentials | `PS-01` + `LP-SUC`; `EP-SUC` | `BCG-001` | Blocked |
| `CP-01/A02` | Recovery: request email | `PS-01` + `LP-SUC`; `EP-SUC` | None | Not run |
| `CP-01/A03` | Reset: replace password | `PS-01` + `LP-SUC`; `EP-SUC` | None | Not run |
| `CP-01/A04` | MFA: challenge and enrollment | `PS-01` + `LP-SUC`; `EP-SUC` | `BCG-009` | Blocked |
| `CP-02/A01` | Continue working | `PS-02` + `LP-SUC`; `EP-SUC` | `BCG-001` | Blocked |
| `CP-02/A02` | Logout and anonymous confirmation | `PS-02` + `LP-EXT`; `EP-EXT` | `BCG-001` | Blocked |
| `CP-02/A03` | Resume active tutoring | `PS-02` + `LP-SUC`; `EP-SUC` | `BCG-002`, `003` | Blocked |
| `CP-03/A01` | Edit course preparation | `PS-03` + `LP-SUC`; `EP-SUC` | None | Not run |
| `CP-03/A02` | Upload and finalize course material | `PS-03` + `LP-UNK`; `EP-UNK` | None | Not run |
| `CP-03/A03` | Approve or revoke material | `PS-03` + `LP-STA`; `EP-STA` | None | Not run |
| `CP-03/A04` | Activate course | `PS-03` + `LP-SUC`; `EP-SUC` | `BCG-011` | Blocked |
| `CP-04/A01` | Create and upload private material | `PS-04` + `LP-UNK`; `EP-UNK` | None | Not run |
| `CP-04/A02` | Finalize or repair private material | `PS-04` + `LP-STA`; `EP-STA` | None | Not run |
| `CP-04/A03` | Select private material for tutoring | `PS-04` + `LP-SUC`; `EP-SUC` | None | Not run |
| `CP-04/A04` | Delete private material | `PS-04` + `LP-SUC`; `EP-SUC` | None | Not run |
| `CP-05/A01` | Start tutoring session | `PS-05` + `LP-UNK`; `EP-UNK` | `BCG-002`, `011`, `012` | Blocked |
| `CP-05/A02` | Send or queue message | `PS-05` + `LP-UNK`; `EP-UNK` | `BCG-012` | Blocked |
| `CP-05/A03` | Stop response | `PS-05` + `LP-STA`; `EP-STA` | `BCG-012` | Blocked |
| `CP-05/A04` | Retry exact attempt | `PS-05` + `LP-UNK`; `EP-UNK` | `BCG-012` | Blocked |
| `CP-05/A05` | Finish tutoring session | `PS-05` + `LP-SUC`; `EP-SUC` | `BCG-012` | Blocked |
| `CP-06/A01` | Review completed transcript | `PS-06` + `LP-SUC`; `EP-SUC` | None | Not run |
| `CP-06/A02` | Correct or regenerate summary | `PS-06` + `LP-STA`; `EP-STA` | `BCG-004` | Blocked |
| `CP-07/A01` | Student creates mentoring request | `PS-07` + `LP-SUC`; `EP-SUC` | `BCG-013` | Blocked |
| `CP-07/A02` | Triage, respond, or schedule | `PS-07` + `LP-SUC`; `EP-SUC` | None | Not run |
| `CP-07/A03` | Remove mentor assignment | `PS-07` + `LP-STA`; `EP-STA` | `BCG-014` | Blocked |
| `CP-07/A04` | Mentor completes scheduled work | `PS-07` + `LP-UNK`; `EP-UNK` | `BCG-016` | Blocked |
| `CP-07/A05` | Resolve target and grant mentor role | `PS-07` + `LP-STA`; `EP-STA` | `BCG-014`, `017` | Blocked |
| `CP-08/A01` | Student views read-only self profile | `PS-08` + `LP-SUC`; `EP-SUC` | None | Not run |
| `CP-08/A02` | Staff edits own profile | `PS-08` + `LP-SUC`; `EP-SUC` | None | Not run |
| `CP-08/A03` | Supervisor edits student profile | `PS-08` + `LP-SUC`; `EP-SUC` | None | Not run |
| `CP-08/A04` | Create, resend, or verify mobile change | `PS-08` + `LP-UNK`; `EP-UNK` | `BCG-015` | Blocked |
| `CP-08/A05` | Discover or manage own MFA | `PS-08` + `LP-STA`; `EP-STA` | `BCG-009` | Blocked |
| `CP-08/A06` | Change locale or time zone | `PS-08` + `LP-SUC`; `EP-SUC` | None | Not run |
| `CP-09/A01` | Set temporary student password | `PS-09` + `LP-SUC`; `EP-SUC` | None | Not run |
| `CP-09/A02` | Reset student or staff MFA | `PS-09` + `LP-UNK`; `EP-UNK` | `BCG-010` | Blocked |
| `CP-09/A03` | Ban or unban student | `PS-09` + `LP-SUC`; `EP-SUC` | None | Not run |
| `CP-10/A01` | Create or resend invitation | `PS-10` + `LP-UNK`; `EP-UNK` | `BCG-006` | Blocked |
| `CP-10/A02` | Accept invitation | `PS-10` + `LP-UNK`; `EP-UNK` | None | Not run |
| `CP-10/A03` | Revoke or delete faulty invitation | `PS-10` + `LP-STA`; `EP-STA` | `BCG-014` | Blocked |
| `CP-11/A01` | Request or retry speech | `PS-11` + `LP-UNK`; `EP-UNK` | None | Not run |
| `CP-11/A02` | Retrieve and play speech | `PS-11` + `LP-SUC`; `EP-SUC` | `BCG-005` | Blocked |
| `CP-12/A01` | List or inspect accounts | `PS-12` + `LP-SUC`; `EP-SUC` | `BCG-008` | Blocked |
| `CP-12/A02` | Grant permanent role | `PS-12` + `LP-STA`; `EP-STA` | `BCG-008`, `014` | Blocked |
| `CP-12/A03` | Reset staff MFA | `PS-12` + `LP-UNK`; `EP-UNK` | `BCG-010` | Blocked |
| `CP-12/A04` | Delete account or course | `PS-12` + `LP-STA`; `EP-STA` | `BCG-008`, `014` | Blocked |
| `CP-12/A05` | Review jobs or audit records | `PS-12` + `LP-SUC`; `EP-SUC` | None | Not run |
| `CP-12/A06` | Remove course supervisor | `PS-12` + `LP-STA`; `EP-STA` | `BCG-014` | Blocked |
| `CP-13/A01` | Provision student | `PS-13` + `LP-SUC`; `EP-SUC` | `BCG-011` | Blocked |
| `CP-13/A02` | Add existing student | `PS-13` + `LP-STA`; `EP-STA` | `BCG-011` | Blocked |
| `CP-13/A03` | Remove course membership | `PS-13` + `LP-STA`; `EP-STA` | `BCG-014` | Blocked |
| `CP-14/A01` | List or inspect private material | `PS-14` + `LP-SUC`; `EP-SUC` | None | Not run |
| `CP-14/A02` | Download authorized private material | `PS-14` + `LP-SUC`; `EP-SUC` | `BCG-005` | Blocked |
| `CP-14/A03` | Return to managed-student context | `PS-14` + `LP-EXT`; `EP-EXT` | None | Not run |

Pairwise sampling MAY reduce combinations only after every process has passed at 320 effective CSS pixels in all three
text modes and every locale has passed representative long-content fixtures. The sampling rule and uncovered
combinations MUST be documented as coverage residual risks.

During planning, required rows and mappings MUST exist, but Result may be `Not run` or `Blocked`, Evidence may be
`Planned`, and no implementation-only artifact is required. Before release, every required cell must contain actual
repeatable evidence and Pass.

## WCAG 2.2 A/AA Traceability Matrix

Each criterion is ungrouped below. `All CP` means `CP-01` through `CP-14`, including all nine atomic lanes above.
`Core` means all release surfaces. `AO` is the Accessibility owner. Applicability rationales remain subject to release
review. `Blocked` is not Pass; it means a mapped complete-process dependency prevents complete evidence.

### Criterion Mapping and Status

| SC | Level | Applicability or specific rationale | AC IDs | CP or surfaces | Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| 1.1.1 | A | Applicable | `AC-006` | `CP-01`, `03`, `04`, `08`, `09`, `12`-`14`; images | AO | Blocked |
| 1.2.1 | A | Applicable; generated speech has equivalent text | `AC-018` | `CP-11`; speech | AO | Not run |
| 1.2.2 | A | Not applicable; no synchronized prerecorded video | `AC-019` | Media inventory | AO | Not run |
| 1.2.3 | A | Not applicable; no synchronized prerecorded video | `AC-019` | Media inventory | AO | Not run |
| 1.2.4 | AA | Not applicable; no synchronized live media | `AC-019` | Media inventory | AO | Not run |
| 1.2.5 | AA | Not applicable; no prerecorded video | `AC-019` | Media inventory | AO | Not run |
| 1.3.1 | A | Applicable | `AC-003`, `008`, `015` | All CP; Core, rich content | AO | Blocked |
| 1.3.2 | A | Applicable | `AC-003`, `015`, `016` | All CP; Core, rich content | AO | Blocked |
| 1.3.3 | A | Applicable | `AC-002`, `003`, `008` | All CP; instructions, status | AO | Blocked |
| 1.3.4 | AA | Applicable; orientation cannot gate access | `AC-001`, `002` | All CP; Core | AO | Blocked |
| 1.3.5 | AA | Applicable | `AC-010` | `CP-01`, `02`, `08`-`10`, `12`, `13`; forms | AO | Blocked |
| 1.4.1 | A | Applicable | `AC-002`, `005` | All CP; status, links | AO | Blocked |
| 1.4.2 | A | Applicable; authored audio never autoplays | `AC-018` | `CP-11`; speech | AO | Not run |
| 1.4.3 | AA | Applicable | `AC-002` | All CP; Core | AO | Blocked |
| 1.4.4 | AA | Applicable | `AC-001`, `002` | All CP; Core | AO | Blocked |
| 1.4.5 | AA | Applicable; text images are prohibited | `AC-002`, `006` | All CP; images | AO | Blocked |
| 1.4.10 | AA | Applicable | `AC-001`, `002`, `015` | All CP; Core, rich content | AO | Blocked |
| 1.4.11 | AA | Applicable | `AC-002`, `004` | All CP; controls, states | AO | Blocked |
| 1.4.12 | AA | Applicable | `AC-002` | All CP; Core | AO | Blocked |
| 1.4.13 | AA | Applicable | `AC-009` | All CP; tooltips, disclosures | AO | Blocked |
| 2.1.1 | A | Applicable | `AC-004`, `009`, `014`, `017`, `018` | All CP; actions | AO | Blocked |
| 2.1.2 | A | Applicable | `AC-007` | All CP; dialogs, rich controls | AO | Blocked |
| 2.1.4 | A | Applicable; required character shortcuts are prohibited | `AC-004` | All CP; composer | AO | Blocked |
| 2.2.1 | A | Applicable; reviewed timer exceptions | `AC-007`, `011` | `CP-01`, `02`, `08`, `09` | AO | Blocked |
| 2.2.2 | A | Applicable | `AC-005`, `013`, `014` | All CP; waits, stream, upload | AO | Blocked |
| 2.3.1 | A | Applicable | `AC-005` | All CP; generated and UI content | AO | Blocked |
| 2.4.1 | A | Applicable | `AC-003` | All CP; routes, repeated blocks | AO | Blocked |
| 2.4.2 | A | Applicable | `AC-003`, `016` | All CP; routes | AO | Blocked |
| 2.4.3 | A | Applicable | `AC-003`, `004`, `007`, `013` | All CP; routes and state changes | AO | Blocked |
| 2.4.4 | A | Applicable | `AC-003`, `015` | All CP; navigation, rich links | AO | Blocked |
| 2.4.5 | AA | Applicable | `AC-003` | All CP; navigation and Home | AO | Blocked |
| 2.4.6 | AA | Applicable | `AC-003`, `008`, `015`, `017` | All CP; headings, labels | AO | Blocked |
| 2.4.7 | AA | Applicable | `AC-004` | All CP; focusable controls | AO | Blocked |
| 2.4.11 | AA | Applicable | `AC-004`, `007` | All CP; sticky layers, dialogs | AO | Blocked |
| 2.5.1 | A | Applicable; no path gesture required | `AC-004`, `014` | `CP-03`, `04`; pointer actions | AO | Blocked |
| 2.5.2 | A | Applicable | `AC-004`, `007` | All CP; pointer and dialogs | AO | Blocked |
| 2.5.3 | A | Applicable | `AC-003`, `004`, `009` | All CP; named controls | AO | Blocked |
| 2.5.4 | A | Applicable; motion actuation is not used | `AC-004` | All CP; input inventory | AO | Blocked |
| 2.5.7 | AA | Applicable | `AC-004`, `014` | `CP-03`, `04`; all drag affordances | AO | Blocked |
| 2.5.8 | AA | Applicable | `AC-004` | All CP; pointer targets | AO | Blocked |
| 3.1.1 | A | Applicable | `AC-016` | All CP; document root | AO | Blocked |
| 3.1.2 | AA | Applicable | `AC-015`, `016` | All CP; authored and rich blocks | AO | Blocked |
| 3.2.1 | A | Applicable | `AC-003`, `004`, `009` | All CP; controls | AO | Blocked |
| 3.2.2 | A | Applicable | `AC-003`, `008`, `010` | All CP; forms | AO | Blocked |
| 3.2.3 | AA | Applicable | `AC-003`, `016` | All CP; navigation | AO | Blocked |
| 3.2.4 | AA | Applicable | `AC-003`, `016` | All CP; repeated components | AO | Blocked |
| 3.2.6 | A | Applicable | `AC-003`, `009`, `016` | All CP; contextual help | AO | Blocked |
| 3.3.1 | A | Applicable | `AC-008` | All CP; form validation | AO | Blocked |
| 3.3.2 | A | Applicable | `AC-008`, `010` | All CP; forms and authentication | AO | Blocked |
| 3.3.3 | AA | Applicable | `AC-008` | All CP; corrective errors | AO | Blocked |
| 3.3.4 | AA | Applicable | `AC-007`, `008` | Consequential actions in all CP | AO | Blocked |
| 3.3.7 | A | Applicable; security review of deletion re-entry | `AC-010` | `CP-12`; deletions | AO | Blocked |
| 3.3.8 | AA | Applicable | `AC-010`, `011`, `017` | `CP-01`, `02`, `08`-`10`, `12`, `13` | AO | Blocked |
| 4.1.1 | Obsolete | Not applicable; WCAG 2.2 removed it, so no requirement remains | `AC-019` | DOM | AO | Not run |
| 4.1.2 | A | Applicable | `AC-007`, `015`, `018` | All CP; custom and native controls | AO | Blocked |
| 4.1.3 | AA | Applicable | `AC-008`, `012`, `013`, `014`, `017` | All CP; async states | AO | Blocked |

### Planned Evidence

Evidence IDs identify future repeatable scripts and fixtures. `AE-*` runs in bundled Chromium on developer macOS.
`ME-*` records current Chrome, Edge, Safari, and VoiceOver versions where the criterion requires those lanes.

| SC | Planned automated evidence | Planned manual evidence | Evidence |
| --- | --- | --- | --- |
| 1.1.1 | `AE-111` image-state accessible-name fixtures | `ME-111` VoiceOver image purpose | Planned |
| 1.2.1 | `AE-121` speech/text-equivalence fixture | `ME-121` audio-only alternative review | Planned |
| 1.2.2 | `AE-122` synchronized-media inventory | `ME-122` confirm no prerecorded video | Planned |
| 1.2.3 | `AE-123` synchronized-media inventory | `ME-123` confirm no media needing description | Planned |
| 1.2.4 | `AE-124` live-media inventory | `ME-124` confirm no live media | Planned |
| 1.2.5 | `AE-125` video inventory | `ME-125` confirm no prerecorded video | Planned |
| 1.3.1 | `AE-131` landmarks, headings, table, form semantics | `ME-131` VoiceOver structure review | Planned |
| 1.3.2 | `AE-132` DOM and visual-order fixtures | `ME-132` reading-order script | Planned |
| 1.3.3 | `AE-133` non-sensory instruction fixtures | `ME-133` instruction comprehension | Planned |
| 1.3.4 | `AE-134` orientation-free reflow fixtures | `ME-134` orientation access review | Planned |
| 1.3.5 | `AE-135` autocomplete-token inventory | `ME-135` autofill and password manager | Planned |
| 1.4.1 | `AE-141` forced-colors and non-color states | `ME-141` state and link review | Planned |
| 1.4.2 | `AE-142` no-autoplay fixture | `ME-142` native audio start and stop | Planned |
| 1.4.3 | `AE-143` text contrast scan | `ME-143` contrast exception review | Planned |
| 1.4.4 | `AE-144` 200% zoom flows | `ME-144` browser zoom scripts | Planned |
| 1.4.5 | `AE-145` text-image inventory | `ME-145` essential-text-image review | Planned |
| 1.4.10 | `AE-1410` direct 320 and 400% flows | `ME-1410` complete-process reflow | Planned |
| 1.4.11 | `AE-1411` component contrast and forced colors | `ME-1411` control-state contrast | Planned |
| 1.4.12 | `AE-1412` simultaneous spacing overrides | `ME-1412` text-spacing flows | Planned |
| 1.4.13 | `AE-1413` hover/focus persistence fixtures | `ME-1413` pointer and keyboard script | Planned |
| 2.1.1 | `AE-211` keyboard path suite | `ME-211` keyboard-only complete processes | Planned |
| 2.1.2 | `AE-212` dialog and rich-control escape | `ME-212` no-trap keyboard script | Planned |
| 2.1.4 | `AE-214` shortcut and IME fixtures | `ME-214` character-key review | Planned |
| 2.2.1 | `AE-221` authoritative timer fixtures | `ME-221` timer expiry and restart | Planned |
| 2.2.2 | `AE-222` pause and static-wait fixtures | `ME-222` moving-content controls | Planned |
| 2.3.1 | `AE-231` flash-threshold fixtures | `ME-231` flashing review | Planned |
| 2.4.1 | `AE-241` bypass and landmark suite | `ME-241` skip-link keyboard script | Planned |
| 2.4.2 | `AE-242` localized-title suite | `ME-242` route-title review | Planned |
| 2.4.3 | `AE-243` route, dialog, state focus order | `ME-243` keyboard focus-order script | Planned |
| 2.4.4 | `AE-244` contextual link-purpose fixtures | `ME-244` link-list and context review | Planned |
| 2.4.5 | `AE-245` route and Home-path inventory | `ME-245` multiple-way navigation | Planned |
| 2.4.6 | `AE-246` heading and label inventory | `ME-246` heading and label review | Planned |
| 2.4.7 | `AE-247` visible-focus geometry | `ME-247` browser focus visibility | Planned |
| 2.4.11 | `AE-2411` sticky-layer focus geometry | `ME-2411` zoomed focus-obscuring | Planned |
| 2.5.1 | `AE-251` pointer-gesture inventory | `ME-251` simple-pointer alternatives | Planned |
| 2.5.2 | `AE-252` pointer cancellation fixtures | `ME-252` down-event cancellation | Planned |
| 2.5.3 | `AE-253` label-in-name checks | `ME-253` speech-input label review | Planned |
| 2.5.4 | `AE-254` motion-input inventory | `ME-254` alternative-input review | Planned |
| 2.5.7 | `AE-257` drag-alternative fixtures | `ME-257` non-drag operation | Planned |
| 2.5.8 | `AE-258` target geometry and spacing | `ME-258` target exception review | Planned |
| 3.1.1 | `AE-311` launch-locale root-language suite | `ME-311` VoiceOver language review | Planned |
| 3.1.2 | `AE-312` block-language and direction suite | `ME-312` mixed-language reading | Planned |
| 3.2.1 | `AE-321` focus side-effect fixtures | `ME-321` focus-context script | Planned |
| 3.2.2 | `AE-322` input side-effect fixtures | `ME-322` input-context script | Planned |
| 3.2.3 | `AE-323` navigation-order fixtures | `ME-323` consistent navigation | Planned |
| 3.2.4 | `AE-324` component-name inventory | `ME-324` consistent identification | Planned |
| 3.2.6 | `AE-326` help-location inventory | `ME-326` consistent help review | Planned |
| 3.3.1 | `AE-331` error identification fixtures | `ME-331` VoiceOver error script | Planned |
| 3.3.2 | `AE-332` label and instruction associations | `ME-332` form instruction review | Planned |
| 3.3.3 | `AE-333` corrective suggestion fixtures | `ME-333` correction script | Planned |
| 3.3.4 | `AE-334` review, confirm, reverse fixtures | `ME-334` consequential-action script | Planned |
| 3.3.7 | `AE-337` re-entry and retained-value fixtures | `ME-337` deletion security review | Planned |
| 3.3.8 | `AE-338` paste and credential-control fixtures | `ME-338` accessible-authentication script | Planned |
| 4.1.1 | `AE-411` obsolete-criterion registry check | `ME-411` confirm WCAG 2.2 removal | Planned |
| 4.1.2 | `AE-412` name, role, value, state suite | `ME-412` VoiceOver control script | Planned |
| 4.1.3 | `AE-413` live-region transition suite | `ME-413` status announcement script | Planned |

Every `AC-*` ID MUST map to at least one applicable criterion, `CP-*` process and state, and planned evidence method.
Every applicable criterion MUST map back to one or more `AC-*` IDs. `Not run` is valid while planning; Pass requires
completed evidence and review. A Blocked dependency remains visible in both directions and cannot be sampled away.

The inventory MUST include every A/AA criterion in WCAG 2.2, including criteria commonly missed by component scanners:
complete processes, reflow, text spacing, content on hover or focus, status messages, accessible authentication, focus
not obscured, dragging movements, and target size. Superseded criteria MUST be recorded according to WCAG 2.2 rather
than silently omitted.

The WCAG 3.3.7 row MUST record exact username or course-name re-entry for high-impact deletion. The reviewed security
rationale is prevention of unintended irreversible deletion and must be assessed under the criterion's essential or
security exception. The authoritative value remains visible and selectable, paste is permitted, mismatch is associated
with the field, and the entered value remains only while the still-authorized dialog is open. If review rejects that
exception rationale, the row fails and the deletion design requires a Product Owner decision before release.

## Coverage Residual Risks

Residual risks describe evidence limits, not exceptions to conformance:

- Automation exercises Playwright bundled Chromium only on developer macOS.
- Safari conformance evidence depends on repeatable Product Owner manual testing, including VoiceOver.
- Chrome and Edge manual evidence covers only Product Owner environments actually available and recorded for release.
- Uncovered Chrome and Edge platform or accessibility-API combinations remain named platform coverage risks.
- Forced-colors automation emulates the media feature on macOS and does not validate actual Windows system rendering.
- Firefox has no support or test commitment, except that general standards, security, and accessibility defects remain
  defects regardless of where they are reported.
- System-font and assistive-technology differences outside recorded environments remain unautomated.
- Automated scanners cannot establish complete WCAG 2.2 AA conformance or live-region usability.

A residual risk MUST name its owner, impact, mitigation, evidence gap, and review date. It MUST NOT be used to close an
observed A/AA failure, mark an untested criterion Pass, or imply non-macOS automation.

## Open Acceptance Dependencies (AC-019)

[`BCG-007`](BACKEND-CONTRACT-GAPS.md#bcg-007-bounded-and-safe-complete-error-body-disclosure) canonically owns the
complete raw-error dependency. It includes aggregate byte bounds, UTF-8 decoding, media behavior, neutral
existence-hiding content, forbidden sensitive data, proxy behavior, and the `BCG-005` no-store policy. Until it closes,
affected error-disclosure and complete-process rows remain Blocked. The frontend MUST NOT truncate, redact, reinterpret,
or silently discard a body while labelling it complete.

### BCG-015: Mobile-Verification Lifecycle and Resend Observability

`BCG-015` blocks the mobile-verification timer cells in `CP-08`. The current empty challenge representation cannot
support truthful expiry, resend availability, reload recovery, or concurrent invalidation without client inference.

Closure requires an opaque challenge identity, authoritative `expires_at` and `resend_available_at` UTC instants on
creation and resend, and a safe read or reconciliation operation. Resend sends the existing code and returns its
unchanged expiry. The backend must define whether resend resets or preserves the failure count without exposing that
count. It must distinguish current, cooldown, resend-submitting, resend-outcome-unknown, verify-submitting,
verify-outcome-unknown, expired, invalidated, completed, access-lost, and unavailable outcomes, apply
`Cache-Control: no-store`, and reveal no account or mobile existence beyond the authorized profile flow. Tests must
cover
creation, unchanged resend expiry, reload, delayed timers, the defined failure-count behavior, five failures, supervisor
mobile change, account-security change, ambiguous resend/verification, denial, and concurrent invalidation.

The frontend MUST NOT derive either instant from local receipt time, persist challenge state, probe verification or
resend, or interpret a rejected mutation as timer discovery. The authoritative blocker ledger owns closure evidence;
this accessibility contract neither narrows nor replaces it.

### Blocker-to-Process Alignment

The complete blocker alignment is:

| Gap | Directly affected process rows |
| --- | --- |
| `BCG-001` | `CP-01`, `CP-02`; authentication gates in `CP-03` through `CP-14` |
| `BCG-002` | `CP-02`, `CP-05` |
| `BCG-003` | Authorized shell and scope in `CP-02` through `CP-14` |
| `BCG-004` | `CP-05`, `CP-06` |
| `BCG-005` | Sensitive or protected responses in `CP-01` through `CP-14` |
| `BCG-006` | `CP-10` |
| `BCG-007` | Backend-error states in `CP-01` through `CP-14` |
| `BCG-008` | `CP-12` |
| `BCG-009` | `CP-01`, `CP-08` |
| `BCG-010` | `CP-09`, `CP-12` |
| `BCG-011` | `CP-03`, `CP-05`, `CP-13` |
| `BCG-012` | `CP-05` |
| `BCG-013` | `CP-07` |
| `BCG-014` | Consequential state-dependent mutation cells in `CP-07`, `CP-10`, `CP-12`, and `CP-13` |
| `BCG-015` | Mobile verification and resend lifecycle cells in `CP-08` |
| `BCG-016` | Mentor-completion eligibility and reconciliation cells in `CP-07` |
| `BCG-017` | Supervisor-safe mentor-role target and grant cells in `CP-07` |

Every listed dependency remains a genuine acceptance gap for its affected cells. This contract neither duplicates the
backend observable contracts nor converts a blocker into an accessibility exception. If the backend register changes,
the alignment and complete-process matrix MUST be reviewed together before an affected row can pass.

## Acceptance Record

Before release, the accessibility owner and release owner MUST sign an acceptance record containing:

- the commit and build tested;
- completed WCAG and complete-process matrices;
- automated and manual commands, scripts, versions, and evidence locations;
- zero unresolved A/AA failures;
- a list of fixed defects and successful retests;
- approved not-applicable rationales; and
- separately accepted coverage residual risks.

If any applicable A or AA row is Fail, Blocked, unreviewed, or lacks repeatable evidence, the release criterion is not
met.
