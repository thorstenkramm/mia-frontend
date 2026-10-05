---
name: MIA
status: draft
sources:
  - mia/docs/product-requirements.md
  - mia/docs/api.md
  - mia/_bmad-output/planning-artifacts/prds/prd-mia-2026-08-29/prd.md
  - mia/_bmad-output/planning-artifacts/prds/prd-mia-2026-08-29/addendum.md
  - mia/_bmad-output/planning-artifacts/architecture/architecture-mia-2026-08-29/ARCHITECTURE-SPINE.md
updated: 2026-09-13
---

# MIA Experience Spine

## Foundation

MIA is a same-origin browser application for a self-hosted Linux server. Release one is a desktop-browser product and
does not provide phone-specific workflows. Tailwind's default `lg` breakpoint and 1024 CSS pixels are optimization
contexts, not functionality floors. Every complete process reflows and remains functional at 320 effective CSS pixels.
A larger-window advisory is supplemental and never blocks or reduces functionality.

The application is a client-rendered React 19.2 SPA using strict TypeScript, Vite 8, Tailwind CSS 4.2, licensed
Tailwind Plus React components, and Playwright. `DESIGN.md` owns visual identity and component appearance; this document
owns navigation, behavior, state, interaction, accessibility, and journeys. The frontend is light-theme only. Browser
Back, Forward, Reload, zoom, and ordinary text selection remain supported.

MIA assumes every student works alone. The product does not require, detect, or represent an accompanying person and
has no special onboarding session. Release one uses one age-inclusive interface and does not alter presentation or
workflow using `year_of_birth`.

Product behavior and authorization come from `mia/docs/product-requirements.md`. The backend PRD consolidates that
contract. `mia/docs/api.md` explains route families, while the implemented OpenAPI 3.2 description owns paths, methods,
schemas, status codes, stable errors, media types, security requirements, and request bounds. The architecture spine
constrains integration. This spine adds only captured frontend experience decisions. Where transport is not yet
concrete, implementation depends on OpenAPI and must not infer it.

The companion contracts close detail that should not bloat this spine:

- `BACKEND-CONTRACT-GAPS.md` owns accepted release-blocking backend and OpenAPI gaps and their unblock criteria.
- `REQUIREMENT-FLOW-MATRIX.md` traces source requirements and acceptance scenarios to end-to-end flows.
- `SURFACE-STATE-MATRIX.md` binds every inventory surface to global, domain, denial, and recovery states.
- `ROUTE-INVENTORY.md` binds every concrete surface to its canonical client path, parent, title, h1, gate, and fallback.
- `ACCESSIBILITY-ACCEPTANCE.md` owns observable WCAG 2.2 AA criteria, test matrices, and release evidence.
- `SECURITY-PRIVACY-ACCEPTANCE.md` owns browser containment, secret, cache, download, and diagnostics criteria.
- `FRONTEND-STATE-MACHINES.md` owns deterministic auth, request, stream, queue, and async transition tables.

`BACKEND-CONTRACT-GAPS.md` is the sole authoritative inventory of accepted release blockers, affected work, and unblock
evidence. It includes the backend error-body safety blocker required by the approved disclosure below. No cookie
inspection, route guessing, denial probing, course enumeration, null inference, or trial-request workaround is
permitted.

## Information Architecture

### Navigation Model

One capability-driven application shell serves every role combination. There is no role switcher and no duplicated
workspace. Navigation shows only currently authorized capabilities and groups them as Learn, Prepare, Mentor,
Administer, and Profile and security. Role union never broadens course, student, ownership, or action scope.

Home is a calm continuation surface, not an analytics dashboard. It prioritizes an active tutoring session, then
course preparation, failed processing, pending review, mentoring, and operational work by urgency and consequence.
It contains no rankings, streaks, activity feed, vanity metrics, or notification badges.

### Surface Inventory

The coverage column names a key flow or supporting scope. `REQUIREMENT-FLOW-MATRIX.md` supplies complete FR, NFR, AS,
and source-journey traceability. `SURFACE-STATE-MATRIX.md` supplies per-surface state applicability and exits.

| Surface family | Included surfaces | Coverage |
| --- | --- | --- |
| Public entry | Login; recovery; reset; invitation preview and acceptance | Diego flow; support |
| Restricted login | MFA challenge and recovery code; required password replacement; logout | Pablo flow; support |
| Home | Authorized continuation and attention items across all capabilities | All four flows |
| Learn courses | Joined courses; course detail; approved material list and authorized downloads | Pablo flow |
| Private material | List; create draft; files; review; processing; detail; delete | Pablo flow; support |
| Session start | Course choice; optional material choice; static starters; free-form intent | Pablo flow |
| Tutoring workspace | Transcript; composer; queue; SSE state; retry; stop; finish; recovery | Pablo flow |
| Learning history | Completed-session history and detail; summary; used material; generated speech | Pablo flow |
| Student mentoring | Requests; create; detail; schedule; cancel; meeting link | Rosa flow; support |
| Prepare courses | Assigned-course list; preparation hub; readiness review; activation and deactivation | Elena flow |
| Course content | Details; logo; curriculum; goals; AI instructions; language | Elena flow |
| Course material | List; draft; detail and files; processing; brief review; approval; revoke; delete | Elena flow |
| Course students | Roster; create student; add existing; membership detail and removal | Elena flow; support |
| Student oversight | Profile; material; session status and review; correction | Elena flow; support |
| Student security | Temporary password; MFA reset; ban and unban | Elena flow; support |
| Mentor assignment | Grant role; course/student mentors; assignment lifecycle | Rosa flow; support |
| Mentoring triage | Request list and detail; assignment; reassignment; cancellation | Rosa flow; support |
| Mentor work | Assigned request list; briefing; response; scheduling; completion | Rosa flow |
| Profile | Student read-only or staff-editable self-profile; staff avatar, preferences, voice, mobile | Support |
| MFA settings | Enroll; verify; recovery codes; replace; disable; lost-factor routes | Diego flow; support |
| Account administration | Paginated accounts; account detail; role grant; deletion | Diego flow |
| Invitations | Paginated list; create; detail; resend; revoke or faulty deletion | Diego flow; support |
| Course administration | Paginated courses; create; detail; supervisors; delete | Diego and Elena flows |
| Operations | Paginated jobs; job detail; audit records | Diego flow |

The local `bootstrap-admin` and sole-administrator `reset-admin-mfa` commands have no frontend surfaces. There is no
public sign-up, global supervisor student directory, live mentor channel, notification center, data export, guardian
area, emergency channel, generic job retry, ready-material editor, or inactive-course tutoring preview.

Stable URLs identify surfaces and visible scope. Reload reconstructs authoritative state without duplicating sessions
or messages. Every detail surface provides a parent route; browser history is never the only exit. Navigation is
intercepted only when unsaved local input would be lost. `ROUTE-INVENTORY.md` is binding for client-side path templates,
opaque parameters, route parentage, localized titles, page-heading purpose, protected-mount gates, and safe fallbacks.

## Voice and Tone

Interface copy is formal but warm, direct, and calm. Student-facing language uses short sentences and familiar words.
It treats mistakes as expected learning input without calling them failures of the person. It never sounds colloquial,
childish, clinical, controlling, or promotional.

| Prefer | Avoid |
| --- | --- |
| "The AI tutor is preparing a response." | "Thinking..." with no further context |
| "Your session and saved messages remain available." | "Your session may have been lost." |
| "Approval is required before this material can support new sessions." | "Material invalid." |
| "That explanation connects the part to its purpose." | Empty or invented praise such as "Amazing progress!" |
| "MIA could not complete this action." | Blame, internal stage jargon, or false certainty |
| "Open the meeting link in a new browser tab." | "Join your MIA call." |

Tutor praise is warm, specific, and evidence-based. It may recognize effort, strategy, correction, or demonstrated
understanding. It compares with earlier work only when supplied history supports that statement. It never invents
progress, mastery, grades, scores, or longitudinal knowledge. Exam simulation reports measured results and limitations
without celebration or gamification.

MIA is transparently AI-powered. It must not imply that the AI tutor is a person, conscious, emotionally attached,
monitoring the student, or notifying a human. Mentoring is educational support, not an emergency or safeguarding
channel. MIA never claims that anyone has been alerted.

## Component Patterns

Behavioral rules are below. Visual rules live under the identically named entries in `DESIGN.md.Components`.

| Canonical component ID | Behavioral rules |
| --- | --- |
| `application-shell` | Show authorized groups only; retain scope; provide Home, skip link, and logout. |
| `page-header` | Name surface, parent, scope, and state; keep consequential actions out of crowded rows. |
| `action-card` | Show one current item and one direct resolution route; remove after authoritative success. |
| `guided-field` | Persist label and essential help; reveal examples; use tooltips only for supplemental help. |
| `data-list` | Use bounded pagination; no invented total; supported filters and sorts only. |
| `status-indicator` | Render authoritative state as ordinary text; live-announce only a defined transition. |
| `alert-banner` | Explain impact, continuation, and action; do not announce repeated revalidation. |
| `confirmation-dialog` | Revalidate before submit; scale friction; require exact name for high-impact deletion. |
| `error-disclosure` | Show the approved two-layer error treatment and strict disclosure boundary below. |
| `file-upload` | Native picker is primary; drop is optional; each file retains its own state and actions. |
| `rich-transcript` | Retain stable turn nodes and anchors; scroll automatically only while already at the end. |
| `message-composer` | Preserve bytes; Enter inserts a newline; visible Send or Queue is the baseline action. |
| `static-session-starter` | Insert editable text or guide the next step; never submit automatically. |
| `readiness-checklist` | Link every unmet item to resolution; keep processing and approval separate. |
| `pagination-controls` | Follow OpenAPI links; announce collection context; apply deterministic focus fallback. |
| `security-code-input` | Use one native text input for the full pasteable code and preserve leading zeroes. |
| `recovery-code-panel` | Reveal once; explicit copy/print; warn accurately; tear down on departure. |
| `date-time-field` | Resolve gaps and overlaps; show zone/offset; review the fixed instant before submit. |
| `external-meeting-link` | Parse HTTPS; expose normalized host and destination; never fetch or auto-open. |
| `media-control` | Request explicitly; distinguish all speech states; revoke stale object URLs. |
| `loading-skeleton` | Match expected structure, remain unfocusable, and initialize without announcement. |
| `help-tooltip` | Open on hover and focus, remain hoverable, dismiss with Escape, and associate to trigger. |
| `content-disclosure` | Expose expanded state, preserve focus, and keep content in reading order. |
| `form-error-summary` | Link errors in DOM order; move focus only under the deterministic form rules. |
| `copy-control` | Use an object-specific label and announce one resettable success or failure result. |
| `safe-markdown-table` | Supply caption and headers; use labeled keyboard-accessible overflow if required. |
| `safe-markdown-code` | Preserve plain text; label known language; wrap or use contained accessible overflow. |
| `safe-markdown-math` | Supply tested accessible semantics plus meaningful copy and speech text. |
| `idle-warning` | Non-modal, tab-local inactivity status; focus stays put and actions remain keyboard discoverable. |
| `privacy-screen` | Block protected rendering when logout is unconfirmed; offer safe retry and guidance. |

`error-disclosure` preserves the Product Owner-approved exact raw backend response-body decision. It shows a localized
plain-language explanation followed by technical details that are collapsed by default and contain the exact HTTP
status and complete backend response body. Backend text remains untranslated. The body is rendered verbatim only as
safe escaped text: malformed, non-JSON, HTML-looking, and other unexpected bodies remain inert text and are never parsed
as markup or executed. Details visually pre-wrap and break long tokens without changing selected or copied text, never
cause page-level horizontal scrolling, and are never live-announced.

The copy action warns users to review the details before sharing. The disclosure never includes request or response
headers, cookies, tokens, credentials, frontend-captured secrets, or provider payloads. Backend error-body safety is a
release invariant: the backend must never place forbidden sensitive data in any response body. Its blocker is owned by
`BACKEND-CONTRACT-GAPS.md`; failure blocks release rather than authorizing client redaction or replacement. Disclosure,
reflow, malformed-body, copy, and shared-device detail belongs to `SECURITY-PRIVACY-ACCEPTANCE.md` and
`ACCESSIBILITY-ACCEPTANCE.md`.

Tutor output never creates dynamic answer buttons. Release one streams unstructured text, so only `Static session
starter` instances are interactive. Tutor replies use the ordinary `Message composer`. Structured tutor choices depend
on a future bounded backend schema.

## State Patterns

`SURFACE-STATE-MATRIX.md` is the exhaustive per-surface contract. `FRONTEND-STATE-MACHINES.md` owns transition guards,
concurrency, announcements, focus results, stale-response fencing, and recovery actions. The patterns here are the
shared UX vocabulary, not permission to collapse distinct domain states. For backend errors, the approved exact-body
rule in `error-disclosure` and `SECURITY-PRIVACY-ACCEPTANCE.md` overrides generic error-state shorthand.

### Global States

| State | Treatment |
| --- | --- |
| Cold load | Skeleton or plain loading label matching the expected structure; no fabricated content. |
| Empty | Explain what absence means and offer one authorized next action when one exists. |
| Focus | Visible focus; reading-order traversal; route and dialog focus managed deliberately. |
| Validation error | Colocated corrective text; summary focus only when needed; preserve valid input. |
| Backend error | Use `Error disclosure`; preserve safe local input and offer only valid recovery. |
| Offline | State that connection is unavailable; preserve page-local drafts; do not claim server save. |
| Permission denied | Remove stale protected content immediately; use existence-hiding treatment. |
| Stale data | Revalidate, replace with authoritative state, and explain invalidated local action. |
| Long-running | Truthful state, last-checked time, explicit Refresh status, and safe leave-and-return copy. |
| Optional feature unavailable | Hide impossible creation or show a stable unavailable explanation in context. |
| Sign-in expired | Clear protected state, show neutral login, and avoid implying the tutoring session ended. |

### Surface State Coverage

| Surface family | Required states beyond global patterns |
| --- | --- |
| Public and restricted auth | Uniform invalid token/account; throttled; expired stage; ambiguous delivery; success. |
| Home and navigation | No current work; changed capability; stale scope; active-session continuation. |
| Profile and MFA | Read-only; pending; cooldown; expired; invalidated; codes shown once. |
| Courses and rosters | No assigned/joined courses; inactive; active; blocked new sessions; idempotent membership. |
| Materials | Draft; uploading; review; processing; ready; failed; approval; deletion blocked. |
| Tutoring | Starting; active idle; queued; generating; completed; interrupted; failed; reconnecting; retry eligible. |
| Summary and speech | Queued; generating; available; failed; corrected; regeneration eligible; expired speech. |
| Mentoring | Disabled new request; unassigned; assigned; scheduled; cancelled; completed; returned to triage. |
| Administration | Empty; paginated; conflict; blocked deletion; ambiguous or faulty invitation. |
| Jobs and audit | Queued; running; retrying; succeeded; failed; deleted subject reference; no generic retry. |

Material readiness and educational approval are independent. Course-wide material follows prepare files, finalize and
process, review brief, then approve. Editing meaningful validated brief content revokes approval; unchanged content does
not. Active courses lacking qualifying material remain active but reject new sessions while existing sessions may
finish. Never collapse these states into one generic "ready" badge.

The surface matrix explicitly binds banned and unbanned student security; pending, accepted, revoked, faulty, and
delivery-ambiguous invitations; mobile and pending-SMS-factor invalidation; and link-only versus file-backed material.
The backend gaps contract blocks states that current OpenAPI cannot represent rather than permitting frontend inference.

Canonical `/profile` is capability-adaptive. A student-only account can inspect only its authorized self-profile and
receives no edit control or mutation path. A staff account can edit only the staff-writable subset; username, immutable
email, roles, security state, and other non-writable fields remain read-only. Staff-only child routes do not become
available merely because the shared parent mounted.

Invitation acceptance distinguishes ready, submitting, definitive pre-dispatch failure, definitive rejection, outcome
unknown, and consumed-token ambiguity. It never replays automatically or claims account, authentication, or session
creation. After ambiguity, the invitee may explicitly sign in with the chosen credentials or reopen the original email
link; neither action is proof of the prior result.

Tutoring shows only persisted or currently streamed MIA state. It does not show percentages, invented model stages,
hidden reasoning, or fake progress. Partial content remains visible when interrupted or failed. Retry is explicit and
preserves linked history. A terminal event triggers an authoritative re-render.

Each transcript turn and tutor-response attempt retains stable DOM identity through streaming, reconnection, and
terminal reconciliation. Unchanged earlier turns are never remounted. New content follows the viewport only when the
user was already at the end; otherwise scroll and focus stay fixed and a keyboard-reachable control leads to the first
unseen content. Stable-reading mode pauses visual DOM updates without cancelling tutor work, buffers incoming content,
and reconciles it only when the user resumes. `ACCESSIBILITY-ACCEPTANCE.md` owns exact behavior and evidence.

## Interaction Primitives

- Click, keyboard activation, Tab, Shift+Tab, Enter, Space, Escape, and ordinary browser navigation are sufficient.
- No required keyboard shortcut, hover-only action, drag-only action, gesture, or hidden browser feature exists.
- Drag-and-drop supplements, but never replaces, the file picker.
- Escape closes transient UI only when doing so cannot silently discard a consequential action.
- Destructive mutations update the interface only after backend success. Optimistic deletion is forbidden.
- Surface entry and mutation completion may start their required reads. Tab return, online, focus, visibility,
  `pageshow`, and transport loss only coalesce and mark revalidation needed; they issue no authenticated request.
- A privacy shield offers explicit Refresh and Sign out, with no Sign out for an anonymous-origin shield.
  Continue working exists only in the visible idle-governed warning. Refresh or Try now starts the applicable ordered
  cycle. Try now opens at most one replacement EventSource after the non-refreshing access checks succeed.
- There is no continuous global polling. Background activity must not keep the backend idle session alive.
- Tutoring uses SSE. Reconnection starts from the authoritative snapshot and must not create a duplicate response.
- Session and message request IDs remain stable across transport retry according to OpenAPI.
- Static session starters are homework help, topic practice, explanation, exam preparation, and a free-form question.
- A starter guides the next step or inserts editable composer text. It never sends a message automatically.
- Finishing is explicit, secondary to learning, and enabled only with no generating response or queued message.
- Links expose destination and do not open automatically. External meeting content is never embedded or fetched.
- Full route changes focus the page heading; in-place updates use the component-specific target in the state contract.
- Dialogs, forms, dirty navigation, locale changes, and DST handling always follow deterministic outcomes.

`FRONTEND-STATE-MACHINES.md` defines auth and CSRF rotation, request-ID ownership, SSE epochs, composer queue states,
finish races, upload ambiguity, summaries, speech, provider availability, invitation delivery, revalidation ordering,
dirty forms, dialogs, and local-time conversion. Implementations must not add ad hoc transitions or automatic replay of
unsafe mutations.

## Shared-Device Sessions

Assume a school desktop may be shared. Logout is visible for signed-in stages and ends only the current browser session. Each tab's
`idle-warning` follows its last observed server-authored deadlines, never ordinary request activity. The 2026-10-05
decision in `FRONTEND-PRD-FOUNDATION.md` approves the existing auth/Home lifecycle slice. The non-modal warning
neither moves focus nor displays a countdown. Continue working exists only in the visible idle-governed warning.
An absolute-governed warning offers Sign out only and explains that sign-in cannot be extended and will end soon.
The shield permits Refresh and Sign out (Refresh only for anonymous-origin shielding). Only deliberate Continue working
refreshes idle expiry. Success returns the refreshed authoritative idle deadline and unchanged absolute deadline in
that same response and updates only that tab's observed deadlines. No second automatic deadline read follows. A definitive pre-dispatch failure permits explicit
retry;
an outcome-unknown response (including `5xx`) immediately shields and permits only explicit recovery without replay.
Denial clears protected state. Passive activity never sends a keepalive.

Focus, online, visibility, and supported network changes shield authenticated protected content. Other stages only
recheck their observed deadlines locally, preserving typed credentials while switching to an authenticator or password
manager. Pagehide still synchronously shields and clears mounted credentials and ephemeral link tokens in every stage.

The ordinary polite warning appears five minutes before the earlier authoritative idle or absolute deadline, or
immediately when newly returned deadlines are already inside that threshold. At or beyond the deadline, the privacy
shield replaces it. Alert/assertive semantics apply only to an urgent deadline correction that requires immediate
shielding and corrective focus.

Once authoritative idle and absolute deadlines are available, the earlier deadline applies a local `privacy-screen`.
Clock rollback, sleep, wake, suspended timers, and delayed callbacks lock rather than extend it. Protected content
returns only after explicit Refresh and fresh session and complete access discovery. The discovered stage determines
whether credentials are needed; another tab may have renewed the shared session. `BACKEND-CONTRACT-GAPS.md` owns
the remaining transport and release evidence obligations.

A content-free cross-tab security epoch signals logout start, login completion, restricted-stage transition, and
detected account change. It carries no account, route, resource, or scope data. Every receiving tab immediately applies
the neutral privacy shield, aborts protected work, and marks the protected-render gate for explicit revalidation before
exposing content or allowing mutation. `SECURITY-PRIVACY-ACCEPTANCE.md` owns transport, ordering, deduplication, and
teardown detail.

Logout start shields the initiating and live receiving tabs and quiesces known in-flight work, including authentication
transitions, until the initiating logout reaches a terminal outcome. The 2026-09-27 owner decision in
`FRONTEND-PRD-FOUNDATION.md` accepts that delayed login, MFA-completion, or password-change responses admitted before
logout may restore authentication. There is no server-side per-browser revocation or guarantee across suspended or
terminated contexts. Local shielding hides content; it does not revoke cookies. `BCG-001` remains open for remaining
transport and evidence obligations.

On logout, expiry, authorization loss, or security-generation rejection, synchronously clear protected trees,
sensitive memory, scoped caches, titles, breadcrumbs, history state, streams, media, partial downloads, and object URLs
before showing neutral UI. Never persist unsent chat drafts, passwords, MFA values, recovery codes, invitation or reset
tokens, private content, or authenticated API bodies in browser storage. A chat draft may survive only page-local
reconnection while that page remains open and authorization remains confirmed.

Logout confirmation requires known transitions to settle, backend `204`, and subsequent authoritative anonymous-session
discovery. Each tab independently checks before showing neutral login with confirmation of that observed state, not
permanent revocation. A late transition retains or reinstalls `privacy-screen`, withdraws current confirmation, and
offers explicit session reconciliation; it never automatically reveals protected content or replays an unsafe request.
Failure states that logout is unconfirmed and content is hidden locally, retries only through explicit safe CSRF
recovery, and provides close-browser or operator guidance without promising cookie revocation. Detailed recovery and
truthful copy are owned by `SECURITY-PRIVACY-ACCEPTANCE.md` §Logout and Privacy Screen.

Device-local locale and Standard, Large, or Extra large text size may persist because they are not account content.
After reauthentication, route the student to any still-active tutoring session and restore authoritative saved work
without duplication. An unretained ambiguous local attempt receives no saved or unsaved claim.

Protected content renders only after authenticated session, current capabilities and complete scope, route authorization
context, and dependent resource authorization all succeed. Cold load, Reload, BFCache restoration, reconnection, and a
security-epoch change use this conjunctive gate. `SECURITY-PRIVACY-ACCEPTANCE.md` owns exact secret lifecycle,
scope-aware purge, logout failure, and browser-artifact boundaries.

Before a protected document enters BFCache, `pagehide` installs a content-free privacy shield that remains in the cached
document. A persisted `pageshow`, online, visibility, or focus event only marks revalidation needed behind that shield.
It sends no authenticated request. Explicit Refresh and Try now use the BCG-001 non-refreshing contract; Continue
working uses its single activity-refresh response before non-refreshing dependent reads.

## Safe Rich Content

Tutor output supports a strict safe Markdown subset: paragraphs, headings, emphasis, lists, block quotes, tables, and
code. Accessible math is rendered locally. Raw HTML, scripts, frames, forms, media, remote images, and model-defined
controls are excluded. Links expose their destinations and never open automatically.

Streaming content is escaped text or the complete accumulated string is reparsed through one locked allowlist. Raw HTML,
input SVG or MathML, IDs, styles, classes, event attributes, remote resources, dangerous URL schemes, and model controls
never reach the DOM. Incomplete structures remain plain text. Terminal state reconciles once with authoritative content.

Model headings are nested beneath the message heading without skips. Speaker and attempt state remain semantic context.
External links are parsed HTTPS only, show an inspectable destination and normalized ASCII host, and use explicit
activation with no opener or referrer. Tables, code, and math use the three canonical safe-Markdown components. Copy and
speech use meaningful text. `ACCESSIBILITY-ACCEPTANCE.md` and `SECURITY-PRIVACY-ACCEPTANCE.md` own exact mappings,
adversarial fixtures, and chunk-boundary acceptance. Library selection remains an implementation decision constrained
by the backend CSP and these contracts.

## Accessibility Floor

WCAG 2.2 AA is a release requirement across all surfaces, locales, text sizes, and supported desktop viewports.
Visual contrast requirements live in `DESIGN.md`. `ACCESSIBILITY-ACCEPTANCE.md` is the auditable release contract for
all applicable A and AA criteria, complete processes, browser and assistive-technology pairings, fixtures, evidence,
owners, and a zero-unresolved-failure exit gate.

- Every action is keyboard operable without a required shortcut. Focus follows reading order and is always visible.
- Route changes focus the page title or main heading. Dialogs trap and restore focus. Validation moves focus helpfully.
- Streaming output is not announced token by token. Announce concise transitions such as generating, complete, failed,
  interrupted, reconnected, queued, and summary available.
- Safe Markdown uses semantic headings, lists, tables, quotes, and code. Tables include headers and a usable
  reading order.
- Status never depends on color, hover, motion, sound, mascot imagery, or iconography alone.
- Reduced motion disables smooth scrolling, route and dialog animation, skeleton shimmer, and nonessential status
  animation while preserving immediate state and focus changes. MIA does not use flashing content.
- Standard, Large, and Extra large text settings reflow without clipping, hidden actions, or page-level horizontal
  scrolling at supported desktop widths. Browser zoom remains available.
- Pointer targets and spacing meet WCAG 2.2 AA. Error identification, labels, instructions, and autocomplete semantics
  are supplied where applicable.
- Security codes support paste and preserve leading zeroes. Recovery codes have accessible copy and print output.
- Generated audio never becomes the only representation of tutor content.
- Every complete process works at 320 effective CSS pixels and 1280 CSS pixels at 400% zoom in all text modes.
- Password managers, autofill, and paste work at every authentication stage with correct autocomplete purposes.
- Password reveal exposes its name and state; MFA is one pasteable text value, not separate memory-test controls.
- TOTP setup pairs its QR image with selectable issuer, account, and manual setup information derived locally from the
  provisioning URI; secret handling follows `SECURITY-PRIVACY-ACCEPTANCE.md`.
- Route-local TOTP setup data remains available after a correctable failure while the same authorized pending enrollment
  remains valid. Page hide masks it and suspends copy; return requires fresh authorization before reveal. It is removed
  after activation, cancellation, expiry, Reload, departure, authentication change, or unreconcilable ambiguity.
- Avatars and course logos use empty alternatives when adjacent programmatic names provide the same information;
  otherwise use localized functional alternatives from authoritative context, never filenames. A future mascot is
  decorative unless approved information is unavailable in adjacent text.
- The first focusable control skips repeated navigation; landmarks, localized titles, one page heading, and current
  navigation are programmatically exposed.
- Modal dialogs have one title and description, inert background, deterministic initial and return focus, contained Tab
  order, and a visible cancel or back action. Escape behavior is defined per dialog type.
- Invalid fields expose invalid state and associated correction. A linked DOM-order summary receives focus only after a
  submitted multi-field failure; otherwise focus remains on the triggering control or first invalid field.
- Focus is not obscured by persistent navigation, composer, banners, dialogs, or status surfaces.
- Text-spacing overrides, forced colors, reduced motion, target size, clipboard denial, and mixed directionality are
  included in release evidence.

`ACCESSIBILITY-ACCEPTANCE.md` owns stable `AC-*` requirement IDs and `CP-*` complete-process coverage. Every applicable
WCAG 2.2 A/AA criterion maps to those IDs, process states, and evidence; a blocked cell blocks release and never counts
as passing. Coverage includes every release surface, student provisioning and membership, supervisor access to private
student material, and each complete process at 200% zoom, 320 effective CSS pixels, and 400% zoom.

Mobile verification exposes initial-create, pre-dispatch failure, outcome unknown, provider failure, cooldown, hourly
and daily throttling, verification, five-failure invalidation, expiry, and concurrent invalidation only from backend
state. Resend sends the existing code without extending its original expiry and returns neither code nor destination.
The UI makes no claim whether the failure count resets or carries forward until BCG-015 defines it. Local receipt-time
inference remains forbidden.

## Responsive & Platform

| Range | Required behavior |
| --- | --- |
| `lg` and above | Optimization context; persistent navigation where the selected blueprint supports it. |
| Below `lg` to 320 px | Reflow every process; advisory may supplement but never reduce functionality. |

No custom breakpoint or physical-resolution detection is used. Full HD and 1024 CSS pixels are optimization contexts,
not gates. Complete-process reflow at 320 effective CSS pixels is an accessibility requirement, not a phone-support
claim. Phones may receive SMS codes or run an authenticator app, but release one has no supported or optimized
phone-browser workflow.

Release one supports current stable Chrome and Edge and current stable Safari on macOS. A browser/OS pairing is
supported only when release evidence records its browser and OS versions, date, tester, critical workflows,
accessibility checks, and result. Product Owner manual Safari evidence is mandatory. Firefox is unsupported but is not
proactively blocked; reports are change requests unless they expose a general standards, accessibility, or security
defect.

Playwright E2E uses bundled Chromium on developer macOS. It does not substitute for the explicit manual evidence
required for other supported browser/OS pairings. `ACCESSIBILITY-ACCEPTANCE.md` owns the release evidence matrix.

Layouts must tolerate operating-system font metric variation through intrinsic sizing and reflow rather than pixel
assumptions. Cross-platform rendering remains a documented residual risk, not an automated release guarantee.

## Localization and Time

Launch locales are `en-US`, `de-DE`, `fr-FR`, `pt-PT`, `pt-BR`, `es-ES`, and `es-AR`. Before login, browser language
negotiation selects the closest supported locale and a visible selector remains available. Exact matches win. Other
English, German, and French variants use the supported locale for that language. `pt-BR` remains Brazilian; other
Portuguese variants use `pt-PT`. `es-AR` remains Argentinian; other Spanish variants use `es-ES`. Unsupported languages
use `en-US`.

After login, preferred language applies immediately to interface strings, validation, dates, numbers, and frontend
explanations. Backend technical error text, authored content, course material, and tutor output are not translated.
Catalog completeness is release-checked, including every text-size mode.

An authoritative locale change atomically updates `<html lang>` to the exact active BCP 47 tag and rerenders all
frontend-owned copy and formatting before one concise announcement and focus restoration. It preserves entered bytes,
expanded state, and the currently focused logical control. Authored, tutor, material, and raw backend text remain
unchanged and receive known-language metadata when available. Untrusted text uses automatic direction plus Unicode
isolation at boundaries; usernames, codes, URLs, identifiers, and technical details remain directionally stable.

Display API instants in the viewer's preferred IANA time zone with visible zone context where ambiguity matters.
One-time mentoring appointments keep the same instant when a profile time zone changes. Input conversion and exact API
format are OpenAPI dependencies. Local-time entry shows the IANA zone and resolved offset, rejects daylight-saving gaps,
requires an explicit offset choice for overlaps, freezes the reviewed instant, and reconfirms if the authoritative zone
changes before submission. `FRONTEND-STATE-MACHINES.md` owns the exact locale, focus, and time transition tables.

## Product-Specific Boundaries

### Authorization and Privacy

Hide capabilities the current account cannot perform. A stale visible control never grants authority. On denial,
remove protected content and use the same safe outcome for unknown and out-of-scope sensitive resources. Administrator
status alone does not expose private course or student content. Mentors receive only the confirmed compact request
briefing and minimal assigned-student identity; they never receive chats, summaries, private material, or briefs.

The frontend must not overfetch and hide. Active-supervisor surfaces never request completion-gated transcript or used-
material data; mentor surfaces request only mentor-scoped identity and mentoring representations. Protected resources
are never prefetched speculatively. Network traffic, accessibility trees, retained state, caches, and diagnostics must
contain no unauthorized field even when CSS or conditional rendering would hide it. Scope-aware fetch and purge
acceptance lives in `SECURITY-PRIVACY-ACCEPTANCE.md`.

Any supervisor may grant the permanent mentor role to registered staff by user ID, but supervisors do not gain the
administrator account directory or account detail. The dedicated Prepare flow accepts one exact opaque user ID and
requires a bounded, existence-hiding, non-enumerable target-resolution contract before showing only the minimum target
confirmation needed for deliberate review. This flow and its grant action remain blocked by `BCG-017`; account
administration and unrelated mentoring work remain independently usable.

Release one includes no analytics, telemetry, session replay, third-party error-reporting SDK, remote font, or remote
script. Local diagnostics are redacted and never record request or response bodies, sensitive routes or content,
credentials, token fragments, roles, or scope. Any future external SDK or CSP relaxation is a security-reviewed product
change and cannot enter release one as an implementation convenience.

Before application rendering or optional script loading, synchronous bootstrap reads an invitation or reset fragment at
most once and removes every known, unknown, malformed, or duplicate fragment with `history.replaceState`. A canonical
valid token survives only in one ephemeral flow object. Reset links use the backend's emailed
`/password-reset#token=<uuid>` path, normalized to `/password-reset`. Passwords, temporary passwords, MFA values, TOTP provisioning
URIs, recovery codes, and MFA-management proofs stay outside URLs, normalized caches, global state, form restoration,
instrumentation, and diagnostics. TOTP data follows the correctable-failure retention rule in Accessibility; all
teardown detail belongs to `SECURITY-PRIVACY-ACCEPTANCE.md`.

Every protected download begins with explicit user activation and fresh scope authorization. Downloads are never
prefetched or reused from authenticated caches. Partial bodies are discarded and object URLs are revoked after use,
failure, denial, logout, departure, or scope change. The first sensitive download in a shared-device session warns that
MIA cannot remove a browser-saved copy. Printing protected surfaces is suppressed by default; only explicitly approved
print views are available. User-initiated copy and print warnings accurately state that MIA cannot clear the operating-
system clipboard, print spool, printer output, screenshots, or saved files.

App-managed fetch/blob transfers remain bound to the initiating security epoch and are aborted and discarded on loss.
After an explicit browser-managed download begins, control has passed to the browser; MIA cannot reliably cancel or
erase it. The pre-transfer warning states this boundary without promising post-handoff cleanup.

Authorized inline avatars and course logos are not downloads. They render only after the protected gate, follow the
backend image cache policy, make no speculative request, and disappear on denial or security-epoch change. The
`BACKEND-CONTRACT-GAPS.md` image-policy dependency governs caching; the security companion owns retrieval and teardown.

### Destructive Actions

Confirmations state exact scope, preserved data, blockers, irreversibility, and that local deletion does not guarantee
provider-copy or backup deletion. Account and course deletion require the exact username or course name. Student course
removal, private-material deletion, mentor removal, direct reassignment, security reset, and global account deletion use
distinct language because their cascades differ.

BCG-014 atomic intent binding applies only to invitation Revoke/Delete faulty, permanent role grant,
course-supervisor removal, membership removal, mentor removal, account deletion, and course deletion. Their effect,
cascade, preservation, or irreversibility can diverge from reviewed state. A final reread alone is not a precondition;
changed or failed preconditions require a fresh review and confirmation. Other mutations remain governed by their own
authorization, stale-state, eligibility, and domain contracts and are not blocked by BCG-014.

### Course Preparation

Preparation is a hub, not a linear wizard. It permits a sensible non-linear order, preserves drafts, shows every
activation prerequisite, returns to items needing attention, and ends with a readiness review. Learning goals and AI
instructions are separate guided plain-text fields with templates, examples, code-point and byte feedback, exact
read-only preview, and warnings against secrets and unnecessary personal data.

### Mentoring

Release one provides the complete lifecycle in a compact, functional form. Student creation actions are hidden when
new requests are unavailable, while existing work remains visible as authorized. MIA schedules and communicates an
external meeting but neither hosts nor records it. Direct reassignment preserves current details; removing a mentor
clears future schedule details and returns open work to triage.

Mentor completion is enabled only by a fresh server-evaluated allowed action. Any recheck instant only makes an explicit
eligibility read available; local clock comparison, timer wake, browser sleep recovery, or PATCH probing never enables
the action. Schedule change restarts checking. Completion has prevalidation, in-flight, outcome-unknown, reconciliation,
denial, and definitive-success states and never replays automatically. This contract is blocked by `BCG-016`.

Direct mentor-role grant is separate from invitation, course assignment, student assignment, and the administrator
account directory. It resolves one exact registered-staff user ID through `BCG-017`, shows no search suggestions or
collection, and discloses no reason when the target is unknown, ineligible, or out of scope. `BCG-014` still binds the
reviewed target state to final grant dispatch. Neither blocker disables existing mentoring records or other authorized
mentor-management actions.

## Inspiration & Anti-patterns

- ChatGPT and Claude inform conversational focus, visible generation state, and readable rich text, not their brand.
- Calm Notebook selects patient rhythm and a quiet workspace; it does not supply a custom palette or serif type.
- Open Desk selects explicit sections and practical hierarchy for staff work; it does not turn learning into a console.
- Reject gamification, dashboards, rankings, streaks, reward motion, social feeds, and age-coded childish styling.
- Reject dynamic controls parsed from model output, fake processing stages, hidden reasoning, and invented percentages.
- Reject automatic link opening, external previews, raw HTML rendering, and browser-storage persistence of
  sensitive data.

Exploratory references are linked in `DESIGN.md`. They are non-interactive visual studies, not implementation,
interaction, or accessibility evidence. The paired spines win over those files and the discovery import on conflict.

## Key Flows

The named flows preserve the source journeys while using the confirmed frontend protagonists. They illustrate the
highest-value through-lines; `REQUIREMENT-FLOW-MATRIX.md` supplies complete source UJ, FR-1 through FR-84, NFR-1 through
NFR-21, and AS-1 through AS-32 coverage without duplicating every supporting journey here.

| Source journey | Frontend flow |
| --- | --- |
| UJ-1: Ana the administrator sets up a course | Diego completes consequential administration unambiguously |
| UJ-2: Sofía the supervisor prepares and activates the course | Elena prepares the first-rollout English course |
| UJ-3: Sofía provisions students | Elena prepares the first-rollout English course |
| UJ-4: Mia the student holds a tutoring session | Pablo completes and safely resumes independent tutoring |
| UJ-5: Marco the mentor handles an escalation | Rosa confirms an external mentoring meeting |
| UJ-6: Sofía reviews and fine-tunes | Elena prepares the first-rollout English course |

### Flow 1: Pablo completes and safely resumes independent tutoring

Pablo is a student using a shared school desktop in rural Argentina after class.

1. Pablo opens MIA, confirms the negotiated locale, and signs in with password-manager, autofill, and paste support.
2. If required, he completes MFA and then replaces his temporary password without seeing internal stage names.
3. Home routes him to an existing active session or to Learn, where he chooses one joined active course.
4. He may select ready authorized material, choose a localized static starter, or write a free-form question.
5. A starter inserts editable text or guides selection and never submits. Pablo sends through the composer.
6. The transcript streams safe Markdown and names generating, queued, failed, interrupted, and reconnecting states.
7. If the connection drops or the browser closes, the active session and authoritative saved transcript reopen without
   duplication. An ambiguous local attempt that was not retained receives no saved or unsaved claim.
8. Pablo continues with free text, optionally stops or explicitly retries an eligible response, and receives specific,
   evidence-based praise without scores or invented progress.
9. When no work is queued or generating, he confirms Finish session. The transcript becomes read-only and summary
   generation appears as a separate truthful state.
10. **Climax:** Pablo sees the completed transcript and, when available, strengths, improvement areas, and follow-ups,
    then logs out knowing his work is complete and the shared desktop retains no sensitive session state.

Failure path: an expired browser session clears sensitive frontend state and returns to neutral login. Reauthentication
resumes authoritative saved session work without duplication. An unretained ambiguous attempt remains outcome unknown.
A provider failure preserves authoritative partial text and offers only an authorized explicit retry when idle.

Slow-entry path: the local `idle-warning` explains that unsaved input may be lost. Continue working performs one
user-initiated auth-session operation that returns refreshed idle and unchanged absolute deadlines together; passive
typing or streaming never extends the idle lifetime.

Source coverage: backend UJ-4; tutoring, private-material, summary, speech, authentication, and recovery requirements.

### Flow 2: Elena prepares the first-rollout English course

Elena is a teacher preparing an English course on a desktop and expects to succeed without a separate manual.

1. Elena opens Home and follows the English course item into its preparation hub.
2. The hub shows inactive state and separate prerequisites for language, learning goals, AI instructions, supervisors,
   and qualifying course-wide material.
3. She writes learning goals and AI instructions in separate guided plain-text fields, using revealable examples and
   checking exact previews, code-point limits, and byte limits.
4. She creates course-wide material, reviews declared formats and current backend limits, uploads same-format files,
   reviews the file list, and chooses Finalize and process.
5. Elena leaves the page. On return or Refresh status, she sees truthful processing state and last-checked time.
6. When processing is ready, she reviews and corrects the generated brief, then explicitly approves the material.
7. The readiness review separates technical readiness from educational approval and links every remaining issue.
8. Elena activates the course only when the authoritative prerequisites permit it.
9. She creates a student or adds an existing student by exact username, keeping temporary credentials outside MIA.
10. **Climax:** the hub states that English is active and ready for new tutoring sessions, with every prerequisite
    understandable and no hidden warning or separate user guide required.

Failure path: upload or processing failure keeps the material non-ready and points to recoverable draft correction or
authorized re-finalization. Meaningful editing of an approved brief revokes approval and the hub immediately explains
why new-session readiness may be lost.

Source coverage: backend UJ-2, UJ-3, and UJ-6; course, material, roster, oversight, and summary-correction requirements.

### Flow 3: Rosa confirms an external mentoring meeting

Rosa is a retired Mexican nurse volunteering as a mentor from a desktop computer.

1. Rosa accepts a mentor invitation, choosing credentials and required profile values without public-sign-up language.
2. After login, Home shows assigned mentoring work but no tutoring chat, summary, private material, or generated brief.
3. She opens one request and sees the compact authorized briefing: minimal identity, student-written topic, course,
   scheduling context, status, prior response authorship, and meeting details.
4. Rosa writes a response, chooses a local date and time with visible IANA zone context, and enters an HTTPS meeting URL
   or instructions. MIA explains that it neither hosts nor records the meeting.
5. She reviews the converted appointment and submits. The detail revalidates from backend state.
6. **Climax:** the request clearly shows Scheduled, the same appointment instant in Rosa's local zone, her response,
   and an inspectable external destination, so she knows exactly what the student will see and what happens next.
7. At the server-provided recheck instant, Rosa explicitly rechecks eligibility. A fresh allowed result enables final
   prevalidation and one completion submission.

Failure path: stale assignment or authorization removes protected briefing data and returns a safe result. A save error
preserves Rosa's local form input. Mentor removal returns open work to supervisor triage and clears future scheduling;
direct reassignment instead preserves existing details and authorship. Clock disagreement, sleep, schedule change,
denial, or a lost completion response keeps completion unconfirmed and follows `BCG-016` reconciliation.

Source coverage: backend UJ-5; invitation, profile, mentor assignment, mentoring lifecycle, and time requirements.

### Flow 4: Diego completes consequential administration unambiguously

Diego is a technically confident administrator handling account and platform operations.

1. Diego signs in and Home surfaces current administrative work without a dashboard or invented totals.
2. He uses paginated account, invitation, course, job, and audit lists with only OpenAPI-supported filters and sorts.
3. He creates an inactive course and assigns at least one existing supervisor in one operation.
4. If Diego is also assigned as supervisor, the unified shell takes him directly into preparation without a role switch.
5. He grants a permanent role only through the supported registered-staff flow or creates the appropriate invitation for
   a new staff account; invitation ambiguity and faulty state remain explicit.
6. For a consequential action, detail context explains authorization, scope, blockers, cascades, and preserved data.
7. Diego types the exact username or course name when the action is account or course deletion and confirms the precise
   action label.
8. The interface waits for backend success, revalidates, and removes the item only after the authoritative response.
9. **Climax:** the detail and relevant list agree on the final state, with no ambiguity about whether the action
   occurred,
   what local data was deleted, or what provider copies and backups may remain.

Failure path: last-administrator, sole-supervisor, active-course, or active-session blockers leave all visible state
unchanged and explain only the safe actionable condition. Backend failure uses the exact status and complete response
body through `Error disclosure` without exposing headers, cookies, or tokens.

Source coverage: backend UJ-1; administration, invitation, role, deletion, job, audit, and authorization requirements.

## Open Questions

1. Which OpenAPI client generation or runtime-validation approach will frontend architecture select?
2. Which safe Markdown, sanitizer, and local math libraries satisfy the accepted semantics, security tests, and CSP?
