---
name: MIA Frontend State Machines
status: draft
sources:
  - .memlog.md
  - DESIGN.md
  - EXPERIENCE.md
  - FRONTEND-PRD-FOUNDATION.md
  - ACCESSIBILITY-ACCEPTANCE.md
  - SECURITY-PRIVACY-ACCEPTANCE.md
  - SURFACE-STATE-MATRIX.md
  - BACKEND-CONTRACT-GAPS.md
  - mia/docs/product-requirements.md
  - mia/docs/api.md
  - mia/api-doc/openapi.yaml
  - mia/api-doc/paths/*.yaml
  - mia/api-doc/schemas/**/*.yaml
updated: 2026-09-13
---

<!-- markdownlint-disable MD013 -->

# MIA Frontend State Machines

## Purpose and Authority

These tables specify observable frontend behavior. Product requirements own behavior; OpenAPI owns transport.
`BACKEND-CONTRACT-GAPS.md` owns backend dependency status. Reviews are provenance, not normative sources.

A `BLOCKED` transition names its canonical BCG ID and topic. This document does not copy the blocker total from the gap
register. The frontend must not infer, probe, or invent absent state while its owning BCG entry remains open.

Blocking is action scoped. A blocked state or mutation stays checking or unavailable without hiding independently
authorized content or actions on the same surface. Every applicable release-evidence cell must Pass; `BLOCKED` records a
dependency and prevents release rather than satisfying acceptance.

`401` means sign-in loss. Existence-hiding `403` or `404` clears protected content before safe routing. A successful
session check alone never authorizes a route: capability/scope, route resource, and dependent state must also resolve.

## 1. Authentication Bootstrap, Stages, and CSRF

| State | Trigger | UI | Permitted action | Authoritative recovery |
| --- | --- | --- | --- | --- |
| Cold | App starts | Neutral shell | Bootstrap only | Session-discovery operation |
| Checking | Entry or explicit revalidation | Checking sign-in | Cancel old read | Latest session response |
| Signed out | Anonymous result | Public auth | One unsafe request | Current CSRF cookie |
| MFA required | Stage `mfa` | Focused MFA | Named MFA actions | Challenge ID and fresh CSRF |
| Password change | Stage says so | Focused replacement | Replace or logout | Fresh CSRF and new stage |
| Access checking | Authenticated stage | Neutral shell | No protected action | Capability and route checks |
| Authenticated | All gates pass | Authorized route | Authorized actions | Fresh resource responses |
| Rotating | Auth transition | Controls disabled | No queued mutation | Reread CSRF cookie |
| Restricted expired | Auth loss | Neutral login | Sign in | Clear protected memory |
| Logout start | User activates logout | Local privacy shield | Broadcast start; abort work | Origin request barrier |
| Logout quiescing | Start received | Initiating/live receiving tabs shielded | No new authenticated request | Known shared leases settle |
| Logout dispatch | Exclusive barrier acquired | Logout in progress; retain pending reconciliation marker if signaled | One logout request; no Refresh or Retry while pending | Own attempt result recorded; marked reconciliation waits until phase ends |
| Logout confirming | Active attempt returns `204` without reconciliation marker | Still shielded | Anonymous non-refreshing check; no overlapping Refresh or Retry | Current anonymous result; a late transition fences the read |
| Logout confirmed | Anonymous confirmed | Neutral login | Broadcast confirmed | Release barrier signed out |
| Logout unconfirmed | Phase fails | Privacy screen | `Retry logout` or close browser | New barrier cycle |
| Logout reconciliation needed | Late transition or security epoch in retained logout flow; active phase ended | Privacy screen; withdraw confirmation | Serialized explicit Refresh; Retry only after read ends; no unsafe replay | Current session discovery |

The session-discovery operation, anonymous CSRF issuance, stages, expiries, and safe logout recovery are `BLOCKED` on
`BCG-001: Anonymous CSRF and authentication-session discovery`. Protected responses also depend on
`BCG-005: Shared-device no-store response policy`.

Auth transitions are serialized per tab. Every unsafe request reads CSRF immediately before dispatch. Rotation cancels
older queued mutations. No unsafe request is automatically replayed after `csrf_invalid` or an ambiguous result.

Every same-origin request that can carry or reissue an authenticated cookie, including login, MFA completion, and
password replacement, must hold a shared lease from one origin-wide request coordinator. Logout start closes admission,
shields initiating and live receiving tabs, aborts abortable work, waits for known pre-logout leases to settle, and holds
an exclusive barrier through logout and anonymous confirmation. Abort alone does not prove transition settlement;
unknown outcomes remain shielded and unconfirmed. Content-free
`logout-start`, `logout-confirmed`, and `logout-unconfirmed` phases coordinate tabs; no outcome phase reveals content.
The browser mechanism coordinates known live work, not suspended or terminated contexts. The 2026-09-27 owner decision
in `FRONTEND-PRD-FOUNDATION.md` accepts the backend's reduced stateless guarantee: delayed authentication transitions
may restore authentication; there is no server-side per-browser revocation. `BCG-001` remains open for remaining
transport and evidence obligations. Confirmation requires `204` and subsequent anonymous discovery, independently
checked per tab; it is an observation, not permanent revocation. A late transition, including a security-epoch signal
received by a tab retaining its logout flow, marks reconciliation needed and withdraws current confirmation. While
dispatch or confirmation is active, retain that phase and barrier: no Refresh or Retry can dispatch. Accept the active
POST's own result by attempt nonce for bookkeeping only; a marked attempt does not automatically start confirmation.
After the phase ends and its exclusive lease is released, enter Logout reconciliation needed behind the retained
shield and ordinary-request admission block. Stale discovery results and ended/superseded attempt callbacks cannot
confirm logout. Serialize explicit reconciliation and any subsequent explicitly activated Retry logout; never queue
disabled actions for later replay. The security companion owns the exact success, failure, and ambiguity handling.
Explicit Refresh returning anonymous restores confirmation only with a prior `204` and settled known transitions;
any other stage or failed check keeps logout unconfirmed. `SECURITY-PRIVACY-ACCEPTANCE.md` owns detailed recovery.
An unconfirmed outcome keeps ordinary request admission closed and participating tabs shielded; only `Retry logout`
starts a new barrier cycle. Explicit reconciliation uses the phase-specific discovery exception above.
Retained logout participants use this recovery instead of the ordinary protected gate after a security-epoch signal.
BFCache retains local flow state. A fresh document has no durable logout record and uses the ordinary ordered mount
gate; a restored session may authorize newly fetched content, but never stale pre-logout content or prior-logout success.

## 2. Session and Message Request-ID Lifecycle

| State | Trigger | UI | Permitted action | Authoritative recovery |
| --- | --- | --- | --- | --- |
| Editable | No attempt | Editable input | Edit or submit | Create UUID before dispatch |
| Queued locally | Submit chosen | Bound input locked | Cancel before dispatch | Remove ID; return Editable |
| In flight | First byte dispatched | Submitting | Stop waiting only | Response or Outcome unknown |
| Confirmed | `200` or `201` | Server resource | Retire attempt | Returned resource |
| Rejected | Definitive error | Safe input and error | Correct with new ID | Fresh state before submit |
| ID conflict | Same ID, new content | Locked conflict | Discard attempt | Session or transcript read |
| Outcome unknown | Response lost | Saved state unknown | Reconcile only | Fresh session, scope, domain state |
| Retry eligible | Fresh checks pass | Exact attempt locked | `Retry exact attempt` | Same ID and content |
| Abandonable unknown | Reconcile is inconclusive | Exact attempt locked | Abandon unknown attempt | Fresh eligibility |
| Unknown abandoned | User abandons after checks | No outcome claim | Compose when eligible | New ID on submit |
| Reloaded unknown | Attempt memory gone | No outcome claim | Review server state | No replay; user decides |
| Account or scope changed | Reconciliation differs | Clear bound attempt | Safe navigation | New authenticated epoch |

Request-ID replay is always user initiated. Before enabling `Retry exact attempt`, revalidate session, current account,
capability/scope, route resource, security epoch, and tutoring work state. Idempotency never creates an automatic-replay
exception.

`Abandon unknown attempt` is available only after authoritative reconciliation remains inconclusive and current action
eligibility is known. It destroys the retained ID and payload, makes no saved-or-unsaved claim, and permits a later
submission to receive a new ID. It never resends the abandoned payload.

`Cancel` is available only before dispatch and destroys the unused ID. At or after dispatch, the action is `Stop
waiting`; it aborts the local wait, enters Outcome unknown, keeps the immutable ID and content in page memory, and does
not claim that the session or message was cancelled.

After reload, request IDs and message bodies are absent because they are never persisted in browser storage. The user
reviews the authoritative active session, current work, and transcript and then chooses to continue. The frontend does
not correlate an old attempt, replay it, or claim whether it was saved. This is non-blocking safe reconciliation.
Cross-course session recovery remains `BLOCKED` on
`BCG-002: Cross-course active tutoring-session discovery`.

## 3. SSE Connection Epoch and Terminal Reconciliation

| State | Trigger | UI | Permitted action | Authoritative recovery |
| --- | --- | --- | --- | --- |
| Disconnected | Work is active | Persisted content | Open epoch | SSE events route |
| Awaiting snapshot | Epoch opens | Connecting | Buffer later events | First valid snapshot |
| Snapshot installed | Active snapshot | Replace data model | Apply epoch buffer | Snapshot baseline |
| Streaming | Started or delta | Append once | Stop or compose | Current epoch only |
| Superseded | New epoch | No visible change | None | Ignore old callbacks |
| Terminal known | Terminal event or snapshot | Final state; content unconfirmed | Fetch turn | Close and fence SSE |
| Terminal pending | Turn read in flight | Reconciling final response | Stop waiting | Transcript turn |
| Terminal paused | User stops turn read | Snapshot visibly unconfirmed | Retry turn fetch | Fresh authorized read |
| Terminal offline | Turn read loses network | Snapshot marked unconfirmed | Retry turn fetch | Never reopen SSE |
| Terminal auth loss | Turn read returns `401` | Clear; neutral login | Sign in | Auth machine |
| Terminal scope loss | Turn read is hidden | Clear response | Safe navigation | Terminal-resource machine |
| Terminal protocol error | Turn ID mismatch | Safe status only | Refresh transcript | Fresh transcript |
| Terminal rendered | Turn read succeeds | Stable final attempt | Eligible domain action | In-place DOM reconciliation |
| Presentation paused | User pauses updates | Stable rendered text | Resume presentation | Buffered current epoch |

A snapshot atomically replaces the response data model; it never appends to old content. A terminal snapshot follows
the same path as a terminal event. Heartbeats change no state and do not reset reconnect attempts.

Each attempt owns one stable keyed article for its lifetime. Terminal reconciliation updates that article and unchanged
semantic descendants in place. It never remounts the transcript or earlier turns. If changed markup cannot preserve the
reading anchor, focus stays put and a labelled `Final response available` control moves to the reconciled attempt.

Malformed JSON, unknown event types, wrong response identity, delta before a valid snapshot, conflicting duplicates,
regressive state, and illegal ordering fence the epoch without applying the event. Events after terminal are ignored.
Only the last authoritative content remains, and recovery is a fresh authorized work or turn read. Exact duplicate event
IDs are ignored. Presentation pause buffers bounded current-epoch text without cancelling tutor work; Resume installs
the latest safe accumulated value without replaying announcements.

## 4. SSE Reconnect Bound and Online Restoration

| State | Trigger | UI | Permitted action | Authoritative recovery |
| --- | --- | --- | --- | --- |
| Transport lost | Online stream fails | Connection lost | Pause retries | Schedule availability delay |
| Retry waiting | Attempt remains | Retry delay shown | Try now or pause | Delays: 1, 2, then 4 seconds |
| Retry ready | Delay ends | Reconnect available | Try now; Continue working | No automatic request |
| Retry opening | User activates reconnect | Reconnecting | Stop waiting | One connection only |
| Opening stopped | Stop waiting | Closed; paused | Resume retries; Refresh | Remaining bound |
| First opening failed | No valid snapshot | Connection lost | Wait for next availability | Schedule only 2 seconds |
| Second opening failed | No valid snapshot | Connection lost | Wait for next availability | Schedule only 4 seconds |
| Retry restored | Valid snapshot | Connected | Normal actions | Reset bound to zero |
| Retries exhausted | Third lacks snapshot | Attempts exhausted | Try again; Refresh | New bound; no timer |
| Retry paused | User pauses | Reconnection paused | Resume retries; Refresh transcript | Remaining bound |
| Offline | Browser offline | Offline; draft covered | Wait | `online` marks revalidation needed |
| Revalidation needed | Lifecycle event | Neutral checking shell | Continue working; Refresh | No automatic request |
| Online restored | All checks pass | Restore page-local draft | Open one SSE epoch | Current work representation |
| Online transport unavailable | Read fails | Offline cover; draft retained | Retry or wait | Non-refreshing cycle |
| Online sign-in lost | Session says anonymous | Clear protected draft | Sign in | Auth recovery |
| Online scope lost | Authoritative scope denial | Clear protected draft | Safe exit | Scope recovery |

Reconnect accounting permits exactly three user-activated opening attempts after the failed connection, gated by 1, 2,
and 4 second availability delays with no jitter. A delay ending makes the next attempt available; it never opens an
EventSource. Only one timer and one connection may exist. A valid snapshot alone resets the attempt bound; socket open
and heartbeat do not. Manual `Try again` after exhaustion begins a new three-attempt bound.

Every opening consumes its attempt before a valid snapshot can arrive. Any close, error, timeout, protocol fence, or
other failure before that snapshot schedules only the next unused availability delay: 2 seconds after the first opening
and 4 seconds after the second. Failure of the third opening exhausts the bound and schedules no timer. `Stop waiting`
closes the sole opening connection, cancels the sole timer if present, and enters Retry paused without refunding the
attempt or opening another connection. Resume continues the remaining bound; only Try again after exhaustion creates a
new bound.

`Try now` during a pending delay cancels that timer, consumes its scheduled attempt, and opens at most one replacement
EventSource after the explicit non-refreshing access cycle succeeds. It neither resets the bound nor opens a second
EventSource. Continue working first completes its one activity-refresh operation, then may open the same single
replacement through non-refreshing dependent reads. Reset occurs only after a valid snapshot or a manual new bound.

`online`, visibility, focus, and pageshow coalesce only as revalidation-needed signals and issue no authenticated
request. Explicit Refresh or Try now starts the order: non-refreshing auth session, account capability/scope, route
resource, tutoring work state, page-local draft reveal, then at most one SSE epoch. Continue working starts with its
single activity-refresh response, then uses the same non-refreshing dependent order. These transports remain blocked on
BCG-001; when unavailable, remain shielded.

## 5. Composer Send, Queue, and Authoritative Work State

| State | Trigger | UI | Permitted action | Authoritative recovery |
| --- | --- | --- | --- | --- |
| Work checking | Entry or return | Composer covered | Refresh only | Current-work representation |
| Idle | Server says no work | Composer; `Send` | Submit once | Message POST |
| Slot free | One generating, none queued | `Queue message` | Queue once | Message POST |
| Queue full | Generating plus queued | Draft; submit disabled | Stop or Refresh | Current-work representation |
| Submission unknown | Response lost | Bound text locked | Reconcile | Machine 2 |
| Slot lost | `tutoring_work_busy` | Draft; other context used slot | Refresh | Current-work representation |
| Queued stopped | Stop confirmed | Message kept; interrupted | Send or retry | Current-work state |
| Completed | Session completed | Read-only; no composer | None | Session resource |

Idle, queue capacity, active response identity, and finish eligibility cannot be proven from paginated transcript rows.
They are `BLOCKED` on `BCG-012: Authoritative tutoring work and action eligibility`. Do not scan transcript pages or
infer absence as idle.

The label is `Send` only in authoritative Idle and `Queue message` only in authoritative Slot free. Enter inserts a
newline; the visible button is the baseline submission action. IME composition never submits.

## 6. Cross-Response Queue Handoff

| State | Trigger | UI | Permitted action | Authoritative recovery |
| --- | --- | --- | --- | --- |
| First terminal | Active response ends | First attempt reconciling | No Send, Retry, or Finish | Machine 3 turn fetch |
| Handoff checking | First turn reconciled | Checking queued work | Refresh only | Current-work representation |
| Next queued | Server names queued response | Queued attempt block | Stop queued response | Open one epoch for its ID |
| Next generating | Server names response | Generating attempt | Stop; no second queue | Open its epoch |
| Next terminal | Server names terminal response | Terminal state | Fetch its turn | Do not open SSE |
| No next work | Server says idle | Composer becomes Send | Send or Finish | Current-work representation |
| Handoff unknown | Work read fails | Controls disabled | Refresh | Repeat work-state read |
| Handoff denied | Auth or scope loss | Clear transcript | Sign in or exit | Auth/scope recovery |

The old response epoch closes and is fenced before handoff. Its authoritative target turn is resolved before current
work is mapped to a different queued or generating response. Exactly one epoch then opens for the named next response.
This machine is `BLOCKED` with machine 5 on `BCG-012: Authoritative tutoring work and action eligibility`.

## 7. Stop Response and Ambiguous Outcome

| State | Trigger | UI | Permitted action | Authoritative recovery |
| --- | --- | --- | --- | --- |
| Stoppable | Work state names queued/generating ID | `Stop response` | Submit once | Interruption POST |
| Stop submitting | POST dispatched | Stopping; Stop disabled | Stop waiting | Response or unknown |
| Stop outcome unknown | `204` lost | Interruption unknown | Reconcile only | Target turn plus current work |
| Still stoppable | Server says active | Stop not confirmed | Explicit Stop retry | New interruption POST |
| Interrupted | Server confirms it | Incomplete attempt kept | Continue or retry | Response state |
| Too late | Server says terminal | Current terminal state | Continue or retry | Transcript turn |
| Stop denied | Auth or scope loss | No interruption claim | Sign in or safe exit | Terminal teardown |

Stop is never replayed automatically. A lost `204` does not imply cancellation. Reconciliation and explicit retry are
`BLOCKED` on `BCG-012: Authoritative tutoring work and action eligibility`. Reconciliation resolves the targeted
response as interrupted, completed, failed, or still stoppable independently of any queued response that has since
started. Current work controls queue and composer state; it never supplies the stopped response's outcome.

## 8. Finish-Session Race and Prevalidation

| State | Trigger | UI | Permitted action | Authoritative recovery |
| --- | --- | --- | --- | --- |
| Work checking | Entry or work change | Finish disabled | Refresh | Current-work representation |
| Ineligible | Server reports active work | Disabled with reason | Stop or continue | Current-work representation |
| Locally eligible | Server reports idle | Finish enabled | Open dialog | Begin fresh prevalidation |
| Prevalidating | User reviews dialog | Confirm disabled | Cancel | Session, account, scope, work |
| State changed | Prevalidation differs | Clear typed confirmation | Review new state | Latest representations |
| Confirmable | All gates still match and idle | Exact consequence | Confirm or cancel | Completion POST |
| Completing | POST dispatched | Finishing; locked | Stop waiting | Response or outcome unknown |
| Lost race | `tutoring_busy` | Focus new work | Continue or Stop | Fresh current-work state |
| Completed | `200` or session read completed | Read-only transcript | View summary state | Session resource |
| Outcome unknown | Completion response lost | No completion claim | Reconcile only | Session plus work state |

The final prevalidation reads account/scope, session, and authoritative work state immediately before enabling Confirm.
This is `BLOCKED` on `BCG-012: Authoritative tutoring work and action eligibility`. Backend completion remains final.

## 9. Route, Visibility, Pageshow, and Cross-Tab Security

| State | Trigger | UI | Permitted action | Authoritative recovery |
| --- | --- | --- | --- | --- |
| Entering | Protected route entry | Neutral shell | Safe exit | Ordered access cycle |
| Visible stale | Tab becomes visible | Protected content covered | Continue working; Refresh | Revalidation needed |
| BFCache restored | Persisted `pageshow` | Neutral shell | Continue working; Refresh | Revalidation needed |
| Page hiding | Protected `pagehide` | Install privacy shield | Abort or suspend work | Shield enters BFCache |
| Focus pending | Focus without covered signal | Protected content covered | Continue working; Refresh | No request |
| Signal coalesced | Cycle pending or active | Keep cover | No duplicate request | Latest state |
| Security epoch changed | Content-free tab signal | Immediate privacy shield | Continue working; Refresh | No request |
| Read in flight | Explicit cycle active | Checking access | Coalesce signals | Highest sequence wins |
| Superseded read | New cycle starts | No regression | None | Abort or ignore old read |
| Fresh | Latest cycle succeeds | Reveal authorized state | Normal actions | Set last-checked time |
| Access lost | Any gate denies | Clear before route | Sign in or safe exit | Authorize parent/Home |

The ordered cycle is session stage, account capability/scope, route resource, then dependent state. Lifecycle events
only mark revalidation needed and retain the cover. Explicit Refresh starts non-refreshing reads; Continue working uses
its one activity-refresh response before non-refreshing dependent reads. This is `BLOCKED` on
`BCG-001: Anonymous CSRF and authentication-session discovery` and
`BCG-003: Server-authored current-account capabilities and scope`.

The shield is installed synchronously on `pagehide`, before BFCache eligibility. Persisted `pageshow`, visibility,
focus, and security-epoch signals coalesce behind it without sending a request. That boundary prevents duplicate reads
but is never authorization; only explicit Continue working or Refresh starts a new cycle.

Logout start, login completion, stage transition, and detected account change broadcast a content-free security epoch.
Every live tab shields immediately, aborts work, and marks revalidation needed without issuing a request. The signal
contains no account, route, or resource data.

## 10. One-File Upload Request Queue

| State | Trigger | UI | Permitted action | Authoritative recovery |
| --- | --- | --- | --- | --- |
| Selected | File added | Name, size, format | Remove or queue | Server still validates |
| Queued | Earlier request | Ordered row | Cancel before dispatch | Remove local row |
| Uploading | Request dispatched | Real or indeterminate progress | Stop waiting | Response or unknown |
| Verifying | Bytes sent | Verifying upload | Stop waiting | `201` with file ID |
| Uploaded | `201` | Server file row | Delete in draft | Refresh file list |
| Rejected | Definitive error | File error | Remove or correct | Refresh on state conflict |
| Outcome unknown | Wait stopped or response lost | No outcome claim | Reconcile server list | GET material and files |
| Queue paused | Any row outcome unknown | Later queued files retained | Cancel queued rows | Page-memory handles only |
| User review | Fresh list loaded | Server rows plus unknown row | Resolve explicitly | Current read sequence |
| Unknown abandonable | List read cannot correlate attempt | No outcome claim | Abandon unknown attempt | Current list |
| Unknown abandoned | User abandons local row | Server rows only | Review complete list | Current read sequence |
| List reviewable | No unknowns | Server file list | Accept authoritative file list | Current read sequence |
| List accepted | User accepts list | Finalize may be eligible | Finalize or edit | Accepted read sequence |
| Upload as a new file | User accepts duplicate risk | New queued request | Dispatch once | New upload response |
| Remove chosen row | User selects exact server file ID | Delete confirmation | Delete that row | DELETE response |
| Frozen elsewhere | State conflict | Queue disabled | Review list | GET material and files |

Uploads are serialized per material in one tab. After dispatch, `Stop waiting` enters Outcome unknown; it does not
cancel
the server commit. The frontend never matches by filename, size, or media type and never reuploads or deletes
automatically. The user may `Abandon unknown attempt`, select an exact listed file to remove without correlating it
to the attempt, or knowingly `Upload as a new file` that may duplicate prior bytes. Finalize stays disabled until each
unknown attempt is abandoned and the complete server list is reviewed. After Reload, no unknown row or file handle
survives.
This is non-blocking safe reconciliation.

An outcome-unknown row pauses all later dispatches. Queued handles remain only in the current page and may be cancelled
before dispatch. `Retry` is limited to a definitive pre-dispatch or rejected-file state; the duplicate-risk action is
only `Upload as a new file`. `Accept authoritative file list` records the latest successful material-and-files read
sequence after all unknown attempts are abandoned. Any newer list, queue edit, or upload invalidates acceptance.
Finalize is
available only from the accepted current sequence and authoritative material eligibility. Accepted extensions, media
types, count, and size limits come from the current documented contract; client checks are advisory and the server still
validates content signatures and material-wide format rules.

Queued, uploading, and uploaded use polite per-file/state status. Rejected and outcome-unknown use assertive alerts.
Serialize announcements: coalesce ordinary progress to the newest status but never suppress a rejected or unknown
outcome. The localized announcement states the filename and state without technical response content.

## 11. Material Technical and Approval States

| State | Trigger | UI | Permitted action | Authoritative recovery |
| --- | --- | --- | --- | --- |
| Draft | `state=draft` | Technical Draft | Files; finalize | Material and files |
| Processing | `state=processing` | Processing; last checked | Leave or Refresh | Material and jobs |
| Failed | `state=failed` | Failed; unusable | Edit if allowed; finalize | Material and files |
| Ready private | Private ready | Ready; no approval | Use or delete | Material read |
| Ready unapproved | Course-wide; not approved | Ready; approval required | Review; approve | POST response |
| Ready approved | Course-wide; approved | Two separate labels | Revoke or edit | Mutation response |
| Approval revoked | Revoke or changed brief | Approval required | Review; approve | Returned material |
| Unchanged brief | PATCH stays approved | No revoke claim | Continue | Returned material |
| Approved link | Ready approved link | Not qualifying file material | View or revoke | Backend readiness |
| Unavailable | Hidden denial | Clear protected data | Safe navigation | Authorize parent |

Technical state and approval remain independent. Material rows never determine course readiness or activation.

## 12. Course Readiness and New-Session Eligibility

| State | Trigger | UI | Permitted action | Authoritative recovery |
| --- | --- | --- | --- | --- |
| Checking | Course or material changes | Readiness checking | No activate or Start | Readiness representation |
| Inactive incomplete | Server reports blockers | Named blocker links | Resolve named items | Fresh readiness read |
| Inactive activatable | Server says eligible | Ready to activate | Activate | Activation response |
| Active accepting | Server says eligible | Active; sessions available | Start session | Session creation response |
| Active blocked | Server blocks starts | Existing work continues | Continue existing | Fresh readiness |
| Access lost | Hidden denial | Clear course state | Safe navigation | Authorize parent |

These states are `BLOCKED` on `BCG-011: Course readiness and session-start eligibility`. Do not count material rows,
inspect nullable fields, or probe activation or session creation to discover readiness.

## 13. Tutor Attempt Lineage and Stable DOM

| State | Trigger | UI | Permitted action | Authoritative recovery |
| --- | --- | --- | --- | --- |
| Queued | Response queued | Number; waiting | Stop | Work state |
| Generating | Response generating | Number; partial label | Stop; queue if free | SSE and work state |
| Completed | Response completed | Immutable complete block | Speech or continue | Transcript turn |
| Interrupted | Response interrupted | Immutable incomplete block | Eligible latest retry | Retry POST |
| Failed | Response failed | Incomplete block and reason | Eligible latest retry | Retry POST |
| Earlier attempt | Higher attempt exists | Read-only lineage | None | Retry link and order |
| Retry queued | Retry returns `201` | New linked attempt | Stop | Response and work state |
| Session completed | Session completed | All attempts read-only | Completed speech only | Session and transcript |

Every attempt is one stable article keyed by response ID with a heading containing speaker, attempt number, and state.
Status and content use stable child regions. Deltas update content without focus movement. Terminal reconciliation
retains
the article and unchanged descendants. Earlier attempts never receive controls.

Retry eligibility is `BLOCKED` on `BCG-012: Authoritative tutoring work and action eligibility`.

## 14. Used-Material Live Records

| State | Trigger | UI | Permitted action | Authoritative recovery |
| --- | --- | --- | --- | --- |
| Checking | Used-material surface opens | Checking records | Refresh | Authorized collection |
| Returned record | Collection includes it | Name, kind, scope | Open offered source | Fresh authorization |
| Empty | Collection returns none | No used records available | Return to transcript | Collection response |
| Link unavailable | Source link is hidden | Source unavailable | Return to history | Safe response |
| Partial collection | More pages or read fails | Returned records only | Continue or retry | No absence inference |
| Record absent later | Full snapshot omits it | Remove without history claim | View transcript | Full collection |
| Access lost | Collection denies | Clear all records | Safe navigation | Auth/scope recovery |

The UI renders only live records returned by the authorized used-material collection. It removes a former row only when
a complete fresh collection snapshot omits it, never from a partial page or failed read, and never invents a
deleted-material tombstone. Opening a source requires fresh source authorization; unavailable source content does not
remove or rewrite the completed transcript. Historical quotations remain immutable content without a source link or
deleted-source label.

## 15. Summary Lifecycle

| State | Trigger | UI | Permitted action | Authoritative recovery |
| --- | --- | --- | --- | --- |
| Completion accepted | Completion succeeds | Transcript available | Refresh status | Summary representation |
| Queued | Server reports queued | Summary queued | Refresh or leave | Summary representation |
| Generating | Server reports generating | Generating; last checked | Refresh or leave | Summary representation |
| Retry scheduled | Server reports retry | Retry time if authorized | Refresh or leave | Summary representation |
| Available generated | Generated summary exists | Summary and attribution | Correct if allowed | Session response |
| Corrected | Source is supervisor | Corrected attribution | Replace if allowed | PATCH response |
| Terminal failure | Attempts exhausted | Failed; chat available | Eligible regenerate | Eligibility field |
| Regeneration eligible | Server permits action | `Generate summary again` | Submit once | Regeneration response |
| Regeneration submitting | User activates | Action disabled; chat remains | Stop waiting | Response or unknown |
| Regeneration unknown | Response lost | No admission claim | Reconcile lifecycle | Summary representation |
| Correction submitting | User confirms replacement | Existing summary remains | Stop waiting | Response or unknown |
| Correction unknown | PATCH response lost | No replacement claim | Reconcile summary | Fresh session summary |
| Lifecycle reconciling | Fresh read in flight | Action disabled | Stop waiting | Lifecycle and eligibility |
| Unavailable | Hidden denial | Clear protected data | Safe navigation | Resource recovery |

All lifecycle and regeneration states are `BLOCKED` on
`BCG-004: Tutoring-summary lifecycle and regeneration eligibility`. Null summary fields, generic jobs, elapsed time,
and mutation probing are forbidden substitutes.

No summary mutation is replayed automatically. After ambiguous regeneration, the action remains disabled until the
authoritative lifecycle reports queued, generating, available, terminally failed with fresh eligibility, or unavailable.
After ambiguous correction, retain the prior summary as unconfirmed and install only a fresh authoritative summary.

## 16. Speech Media Type, Failure, and Expiry

| State | Trigger | UI | Permitted action | Authoritative recovery |
| --- | --- | --- | --- | --- |
| Not requested | Completed response | Request speech | POST speech | Status and JSON resource |
| Request submitting | User requests speech | Request disabled | Stop waiting | Response or unknown |
| Request outcome unknown | POST response lost | No admission claim | Reconcile only | Authorized speech GET |
| GET reconciling | Fresh speech read | Request disabled | Stop waiting | JSON state, MP3, or absence |
| Generating | `202` or JSON state | Generating; last checked | Refresh or leave | GET speech |
| Available | POST reports available | Ready to retrieve | Play or Download | GET `audio/mpeg` |
| Playing | Valid MP3 URL | Native controls and text | Pause, seek, stop | Revoke on player teardown |
| Failed | JSON says failed | Safe failure | Explicit POST retry | Same cache row |
| Expired or hidden | GET `404` | Audio no longer available | Revalidate then request | Response and POST |
| Voice required | `422` code | Voice required | Authorized profile flow | Profile then speech |
| Service unavailable | `503` code | Speech unavailable | Later explicit request | Speech response |
| Protocol error | Bad type or body | No player | Refresh | Authorized GET |
| Access lost | Auth or scope loss | Stop; revoke; clear | Sign in or exit | Fresh authorization |

Inspect status and `Content-Type` before parsing. Access does not extend expiry. A `404` never distinguishes expiry,
deletion, or hidden scope. A media URL remains only while its mounted player uses that source. Teardown stops playback,
removes `src`, reloads the player, and revokes the URL. No nonexistent download-completion event is inferred.

Generated-speech Download prefers direct same-origin navigation. If it requires a blob, the complete validated response
is activated synchronously and its URL is revoked in the next macrotask, or sooner on teardown.

An ambiguous creation response never enables another POST. The authorized GET must first establish absent, generating,
available, failed, expired, or hidden. Only a backend-reported failed state may label a later POST as Retry.

Speech response caching remains `BLOCKED` on `BCG-005: Shared-device no-store response policy`.

## 17. Durable Automatic Retry and Domain Retry

| State | Trigger | UI | Permitted action | Authoritative recovery |
| --- | --- | --- | --- | --- |
| First queued | No prior attempt | Queued | Refresh | Job or domain |
| Running | Job running | Processing; no percent | Refresh | Job or domain |
| Retry scheduled | Admin sees queued retry | Retry time | Refresh | Count and availability |
| Safe queued | Supervisor sees queued | No retry inference | Refresh | Safe job state |
| Succeeded | Job or domain succeeds | Domain success | Continue | Domain resource |
| Terminal failed | Attempts exhausted | Failed | Permitted domain retry | Domain and mutation |
| Cancelled | Job cancelled | Cancelled | Return to domain | Job and domain |
| Domain retry pending | Domain mutation succeeds | Domain action pending | Refresh | New domain or job state |

There is no generic job retry. Admin `Retry scheduled` requires `state=queued`, prior attempts, and future
`available_at`. Safe supervisor jobs expose no inferred provider detail or retry time. Material domain retry is
`Finalize and process`; tutor and speech retries are explicit feature actions; summary retry follows machine 15.

## 18. Dirty Input and Post-Save Staleness

| State | Trigger | UI | Permitted action | Authoritative recovery |
| --- | --- | --- | --- | --- |
| Clean | Matches baseline | Normal navigation | Navigate | Destination revalidates |
| Dirty safe | Local form changed | Unsaved indicator | Save, discard, edit | Server baseline |
| Dirty sensitive | Protected input changed | Memory-only indicator | Submit, discard, edit | Never persist |
| In-app leave | Route selected | Stay/Discard dialog | Stay or discard | Navigate after discard |
| Browser unload | Browser navigation | Native prompt | Browser choice | No preservation claim |
| Server rejected stale | Backend reports conflict | Conflict and local values | Review or discard | Fresh resource |
| Save accepted | Mutation succeeds | Install returned state | Continue checking | Returned resource |
| Save outcome unknown | Response lost | Submitted values unconfirmed | Reconcile only | Fresh resource read |
| Reconciling form | Fresh read in flight | Prior applied view; input retained | Stop waiting | Current resource |
| Read matches submit | Current resource equals submit | Install confirmed values | Continue | New baseline |
| Read differs | Resource differs | Keep unconfirmed input | Review current or discard | Current resource |
| Post-save newer | Later read differs | Newer values replaced display | Review latest state | Latest resource |
| Security override | Auth loss or logout | Clear; no Stay | Safe surface | Auth machine |
| Scope override | Target lost | Clear; no Stay | Safe navigation | Machine 22 |

Only a backend-reported conflict is labelled a conflict. A lost response makes the submitted values unconfirmed and
causes no automatic replay. Reconciliation keeps the prior applied view and page-local edited values distinct until a
fresh resource read matches the submission or presents current server values for review. A later read may replace only
the applied display, never silently overwrite dirty input or claim which tab or person won. Security and scope loss
override dirty-input prompts.

## 19. External Mentoring Local Time and DST

| State | Trigger | UI | Permitted action | Authoritative recovery |
| --- | --- | --- | --- | --- |
| Editing local | Date/time input | IANA zone and offset | Edit or validate | Browser zone rules |
| DST gap | No instant exists | Time does not exist | Choose another time | No API request |
| DST overlap | Two instants exist | Two offset-labelled choices | Choose one | Choice fixes UTC instant |
| Review | Valid instant | Local, zone, offset, UTC | Confirm or edit | Freeze instant |
| Zone checking | Before submit | Confirm disabled | Cancel | Fetch profile zone |
| Zone changed | Zone differs | Reconfirmation needed | Reconfirm or edit | Select instant again |
| Submitting | User confirms | Fields locked | Stop waiting | UTC `Z` request |
| Submission unknown | Response lost | Frozen instant unconfirmed | Reconcile only | Fresh mentoring request |
| Reconciling schedule | Fresh target read | Prior plus pending values | Stop waiting | Current request version |
| Saved | Success resource | Instant in viewer zone | Allowed actions | Returned instant |
| Rejected | Backend error | Local input preserved safely | Correct or Refresh | Error or session read |

A DST gap is rejected locally because no instant exists. A DST overlap requires an explicit choice between both numeric
UTC offsets; locale labels such as standard or daylight time may supplement but never replace the offsets. A saved
one-time appointment remains the same instant after later profile-zone changes.

The frozen instant and request target remain page-local after an ambiguous response, with no save claim and no automatic
replay. A fresh request representation either confirms the instant or presents current scheduling data. Any new submit
requires fresh review and confirmation against that current representation.

## 20. Mentoring Eligibility and Neutral Triage

| State | Trigger | UI | Permitted action | Authoritative recovery |
| --- | --- | --- | --- | --- |
| Eligibility checking | Mentoring opens | Checking availability | Existing work only | Eligibility state |
| Request available | Server permits creation | New request action | Create request | POST response |
| Creation blocked | Eligibility unavailable | Existing records remain | Refresh eligibility | BCG-013 representation |
| Existing work only | Creation disallowed | No new action | Open existing record | Collection |
| Mutation submitting | User starts allowed mutation | Affected controls disabled | Stop waiting | Response or unknown |
| Mutation outcome unknown | Response lost | No create or change claim | Reconcile record | Fresh collection/detail |
| Awaiting assignment | Mentor is null | Awaiting assignment | Assign if allowed | Mutation response |
| Removal confirmed here | Removal succeeds | Returned after removal | Continue triage | Mutation response |
| Refreshed unassigned | Later mentor is null | Awaiting assignment | Assign if allowed | Current resource |
| Scheduled | Server state scheduled | Current time and meeting facts | Allowed update or cancel | Resource response |
| Completion checking | Detail opens or schedule changes | Complete unavailable | Refresh | Eligibility representation |
| Completion waiting | Not yet allowed | Recheck instant | Explicit Recheck | Server eligibility |
| Completion clock uncertain | Clock mismatch or sleep | Complete unavailable | Recheck | Server eligibility |
| Completion prevalidating | User starts completion | Confirm disabled | Cancel | Detail plus eligibility reread |
| Completion confirmable | Fresh result allows | Exact consequence | Confirm or cancel | PATCH once |
| Completion in flight | PATCH dispatched | Completing; locked | Stop waiting | Response or unknown |
| Completion outcome unknown | Response lost | No completion claim | Reconcile only | Fresh mentoring detail |
| Completion denied | Rejected or changed | Current state; no success | Recheck if offered | Fresh eligibility |
| Completion reconciled open | Detail remains open | No completion claim | Recheck later | Detail and eligibility |
| Completion succeeded | Definitive response or completed read | Completed state | Continue | Returned/current detail |
| Access lost | Hidden denial | Clear briefing | Safe navigation | Auth/scope recovery |

Creation visibility is `BLOCKED` on `BCG-013: Student mentoring-request eligibility`. Do not enumerate mentors, infer
profile fields, or probe POST.

Mentor completion visibility and prevalidation are `BLOCKED` on
`BCG-016: Authoritative mentor-completion eligibility`. A local clock, timer, `scheduled_for`, browser wake, stale
schedule, or failed PATCH never enables or proves completion. The backend supplies the allowed action and any UTC
recheck instant. Reaching that instant only permits an explicit recheck. Immediately before Confirm, reread detail and
eligibility. No completion PATCH replays automatically; an unknown outcome reconciles to current detail and eligibility.

The BCG-013 blocker applies only to new-request creation. Independently authorized existing mentoring collections,
detail,
scheduling, response, reassignment, and triage actions remain available from their own authoritative resources.
No mentoring mutation replays automatically after an ambiguous response. Keep safe page-local values unconfirmed and
derive creation, assignment, response, schedule, reassignment, removal, or cancellation state only from a fresh
authorized collection or detail representation.

`Returned after mentor removal` is shown only in the successful removal flow. A later or unrelated read uses the neutral
label `Awaiting supervisor assignment`. Preserved response and absent schedule are current facts, not inferred history.

## 21. Atomic Locale and Time-Zone Update

| State | Trigger | UI | Permitted action | Authoritative recovery |
| --- | --- | --- | --- | --- |
| Editing | Fields change | Exact values kept | Save or cancel | PATCH `/users/me` |
| Saving | PATCH sent | Stable UI; save disabled | Stop waiting | Returned user or unknown |
| Save outcome unknown | PATCH response lost | Edited values unconfirmed | Reconcile only | Fresh profile read |
| Reconciling preferences | Fresh profile read | Prior locale stays applied | Stop waiting | Current preferences |
| Read matches edit | Both fields match | Apply both atomically | Continue | New profile baseline |
| Read differs | Either field differs | Current pair plus unconfirmed edit | Review or discard | Current profile |
| Rejected | Definitive error | Input and errors | Correct or recover | Error and profile read |
| Applying | Success response | Atomic render boundary | None | Install both preferences |
| Applied | Catalog and zone set | Re-render owned content | Continue | Returned profile |
| Changed elsewhere | Return finds change | Apply before focus | Continue | Latest profile |
| Access lost | Read or save denies | Clear profile and dialogs | Exit or sign in | Auth/scope recovery |

Atomic application updates document language, catalog strings, validation, statuses, numbers, times, and dialogs before
one announcement. It preserves field bytes. Authored text, tutor output, course material, and raw backend text are not
translated. Existing appointments are reformatted, not moved.

An ambiguous PATCH keeps the prior locale and time zone applied while retaining the edited pair only as unconfirmed
page-local input. It never replays automatically. A fresh profile read applies both returned preferences atomically when
they match; when they differ, the current pair is shown alongside the unconfirmed edit for explicit review.

## 22. Terminal Resource and Destructive Outcome Unknown

| State | Trigger | UI | Permitted action | Authoritative recovery |
| --- | --- | --- | --- | --- |
| Available | Authorized read | Protected detail | Authorized actions | Revalidation |
| Dialog checking | Destructive dialog opens | Final action hidden | Cancel | Fresh target read |
| Pre-dispatch checking | User completes confirmation | Dispatch disabled | Cancel | Target, account, and scope reread |
| Ready to dispatch | Non-BCG-014 facts match | Consequence frozen | Dispatch once | Checked target state |
| Precondition bound | BCG-014 version matches | Consequence frozen | Dispatch once | Atomic precondition |
| State changed | Any checked fact differs | Clear typed confirmation | Review again | Latest target state |
| Destructive in flight | Request dispatched | Pending; no removal | Stop waiting | Response or unknown |
| Role grant retained | Grant succeeds | Returned account and roles | Continue on detail | Revalidate capabilities |
| Invitation revoked | Revoke succeeds | Retained invitation: Revoked | Continue | Returned invitation |
| Relationship removed | Removal succeeds | Parent updates in place | Continue | Returned parent/state |
| Terminal deletion | Physical delete succeeds | Deletion and cascade | Navigate safely | Authorize parent/Home |
| Outcome unknown | Success response lost | Action not confirmed | Reconcile target | Fresh target read |
| Target remains | Fresh target exists | Action not confirmed | Abandon old attempt | Repeat full confirmation |
| Target unavailable | Fresh read is hidden | Item no longer available | Safe navigation | Terminal teardown |
| Teardown | Terminal state entered | Clear names, data, and title | None | Cancel, close, revoke |
| Late result | Old callback | No render | None | Epoch fence discards |

Only the original operation-specific definitive success response may show its committed effect. Permanent role grant
retains the account detail. Invitation revocation retains the invitation detail. Course-supervisor, membership, and
mentor removal update the retained parent and relationship state in place. Only physical deletion of a faulty
invitation, account, or course enters Terminal deletion, performs terminal teardown, and navigates. An unavailable
reconciliation never proves this tab's action succeeded. It shows only `This item is no longer available` and follows
the ordinary access-loss exit without a mutation-success claim.

This machine's BCG-014 precondition applies only to invitation Revoke/Delete faulty, permanent role grant,
course-supervisor removal, membership removal, mentor removal, account deletion, and course deletion. Immediately before
final dispatch, reread the target representation and account/scope epoch. Bind confirmation and each inventoried
mutation atomically to a server version or state precondition covering identity, state, cascade, and blockers. A changed
or failed precondition clears exact-name input and requires new review. A GET followed by an unconditional mutation is
insufficient. This atomic transport guarantee is `BLOCKED` on
`BCG-014: Atomic intent binding for consequential state-dependent mutations`.

Other mutations are not blocked by BCG-014. They use their own authorization, stale-state, eligibility, ambiguity, and
domain contracts; machine 22 must not add a general precondition requirement to them.

Outcome unknown retains no success or cascade claim and never replays automatically. If the target remains, the old
attempt must be explicitly abandoned before a new dialog performs the complete read, review, and precondition cycle.

## 23. No-Notification and Last-Checked Behavior

| State | Trigger | UI | Permitted action | Authoritative recovery |
| --- | --- | --- | --- | --- |
| Never checked | Surface opens | Status not checked | Check | Foreground read |
| Checking | Entry, post-mutation, or explicit Refresh | Prior state plus checking | Leave or coalesce | Latest read |
| Current | Read succeeds | State and last-checked time | Refresh or continue | Receipt time |
| Aging | No new trigger | Same state; no threshold | Refresh | Timer makes no request |
| Changed | Read finds change | Replace; announce once | New state actions | Latest resource |
| Check failed | Transport fails | Last state labelled old | Refresh | Next success |
| Access lost | Read denies | Clear state and time | Safe recovery | Auth/scope machine |

Long-running material, summary, speech, mentoring, jobs, and Home say MIA sends no ordinary workflow notifications.
No hidden polling, badge, timer request, or keepalive simulates delivery. State changes are claimed only after a
permitted read. Summary status follows its blocker topic.

## 24. Local Inactivity Warning and Cross-Tab Security

| State | Trigger | UI | Permitted action | Authoritative recovery |
| --- | --- | --- | --- | --- |
| Baseline current | Explicit activity request succeeds | No warning | Continue | Returned authoritative deadlines |
| Warning due | Five-minute threshold passes | Non-modal status | Continue working or sign out | No request |
| Continue dispatching | Continue working activated | Banner disabled | Stop waiting | One activity-refresh response |
| Continue succeeded | Idle and absolute deadlines returned | Banner removed | Continue | Install both deadlines |
| Continue retryable | Pre-dispatch failure | Warning retained | Retry Continue | New explicit dispatch |
| Continue outcome unknown | Response lost | Privacy shield; no claim | Refresh; Retry Continue | Explicit action |
| Continue reconciling | User activates Refresh | Checking behind shield | Stop waiting | Non-refreshing session read |
| Continue denied | Session response is anonymous/denied | Clear protected state | Sign in | Auth machine |
| Continue error | Explicit read fails | Shield; warning unavailable | Refresh; Retry Continue | Explicit action only |
| Lifecycle pending | Automatic return trigger | Privacy cover | Continue working; Refresh | No request |
| Idle deadline reached | Idle expiry reached | Privacy shield | Reauthenticate | Fresh access cycle |
| Absolute deadline reached | Absolute expiry reached | Privacy shield | Reauthenticate | Fresh access cycle |
| Wake deadline uncertain | Sleep, late timer, rollback | Privacy shield | Continue; Refresh | Explicit access cycle |
| Security epoch changed | Security signal | Privacy shield | Continue working; Refresh | Machine 9 explicit cycle |
| Other-tab activity unknown | No activity signal | Keep local baseline | Check explicitly | Session response |
| Offline | Explicit check loses network | Shield; unsaved work may be lost | Retry explicitly | Explicit access cycle |
| Sign-in lost | Check reports anonymous/expired | Clear sensitive input | Sign in | Auth machine |

Each tab owns one local baseline and never broadcasts an activity pulse. Continue working is one explicit
user-initiated operation. Its definitive success must return the refreshed authoritative idle deadline and unchanged
absolute deadline together; no second automatic deadline read follows. If its outcome is unknown, retain the privacy
shield at the existing deadline and make no refresh claim. Explicit Refresh reconciles with a BCG-001 non-refreshing
session read; explicit Retry Continue starts a new activity-refresh attempt. The absolute deadline never moves.

Schedule the ordinary polite warning five minutes before the earlier authoritative idle or absolute deadline. If the
deadlines arrive inside that threshold, show it immediately; at or beyond the earlier deadline, skip the warning and
shield. Recheck locally on every timer wake, focus, visibility return, and pageshow without issuing a request. Clock
rollback, sleep, suspension, or a late callback shields immediately rather than extending either deadline. Revealing
protected content requires an explicit fresh session and complete access cycle.

The advance warning is a persistent non-modal banner that does not obscure focus. It uses status/polite semantics with
reachable `Continue working` and `Sign out` actions; appearance does not move focus or trap Tab. Alert/assertive
semantics are reserved for the separate urgent transition where a deadline correction requires immediate shielding.

Cross-tab security messages contain only the fixed version, event kind, and random nonce. They contain no activity
timestamp. Activity in another tab does not alter this tab's local baseline; explicit Refresh or Continue working may
correct a stale warning. Background work, SSE events, typing, and polling do not update the baseline. Deadlines remain
`BLOCKED` on `BCG-001: Anonymous CSRF and authentication-session discovery`.

## 25. Optional Provider State Distinctions

| State | Trigger | UI | Permitted action | Authoritative recovery |
| --- | --- | --- | --- | --- |
| Unknown | No operation tried | No availability claim | Start operation | Operation response |
| SMS setup unavailable | MFA enrollment code | SMS unavailable; TOTP unaffected | Choose TOTP | Later attempt |
| Active SMS unavailable | Resend error | Keep challenge and expiry | Recovery or lost factor | Challenge response |
| Mobile SMS unavailable | Mobile error code | Verification unavailable | Keep profile | Later attempt |
| Voice missing | Speech voice code | Voice required | Authorized profile flow | Profile then speech |
| Speech unavailable | Speech service code | Text tutoring unaffected | Later explicit request | Speech response |
| Tutor unavailable | OpenAI failure | Partial kept; incomplete | Explicit retry if eligible | Transcript/retry |
| OCR failure | Material failed | Processing failed | Eligible refinalize | Material/job state |
| Summary failure | Summary failed | Chat remains | Eligible regenerate | Summary state |
| Provider pending | Backend reports pending | No invented provider stage | Refresh or leave | Domain or job state |

Provider absence affects only dependent operations. The frontend does not preflight a general provider status. Safe job
views never infer a provider. Tutor and speech request paths never retry automatically. Durable material and summary
jobs
use their backend retry lifecycle.

## 26. Account Administration and MFA State Availability

| State | Trigger | UI | Permitted action | Authoritative recovery |
| --- | --- | --- | --- | --- |
| Checking accounts | Admin surface opens | Neutral list shell | None | Account collection read |
| Account available | Read returns account | Authorized detail | Returned eligible actions | Account detail read |
| Mentor target empty | Supervisor grant opens | Exact user-ID form | Enter one ID | No collection request |
| Mentor target checking | Exact ID submitted | Checking target | Stop waiting | BCG-017 resolution |
| Mentor target confirmed | Minimal target returned | Review permanent grant | Confirm/cancel | Fresh precondition |
| Mentor target unavailable | Hidden result | Fixed unavailable | Enter another exact ID | Clear rejected identity |
| Mentor grant unavailable | BCG-017 unresolved | Grant unavailable | Use other mentoring work | Contract closure |
| Checking MFA | Security surface opens | MFA state checking | None | Active and pending factor read |
| Mobile checking | Create, reload, or explicit Refresh | Verification checking | Cancel only | Challenge read |
| Mobile create ready | Valid new mobile entered | Current profile retained | Submit once | Create response |
| Mobile create submitting | Request dispatched | Creating verification | Stop waiting | Response or unknown |
| Mobile create pre-dispatch failure | No bytes dispatched | No server-attempt claim | Retry creation | New dispatch |
| Mobile create unknown | Response lost after dispatch | Creation unknown | Reconcile only | Profile/challenge read |
| Mobile create provider failure | Provider fails | Mobile unchanged | Later explicit retry | Error/profile read |
| Mobile active | Challenge returned | Expiry and code input | Verify; cancel | No code/destination returned |
| Mobile cooldown | Resend not yet eligible | Availability instant visible | Verify; cancel | Challenge read |
| Mobile hourly throttled | Backend reports hourly limit | Resend unavailable | Verify; cancel | Challenge read |
| Mobile daily throttled | Backend reports daily limit | Resend unavailable | Verify; cancel | Challenge read |
| Mobile resend submitting | User activates Resend | Resending existing code | Stop waiting | Resend response |
| Mobile resend unknown | Resend response lost | Code/expiry unknown | Reconcile only | Fresh challenge read |
| Mobile resend confirmed | Resend succeeds | Original expiry unchanged | Verify | Returned challenge state |
| Mobile resend provider failure | Provider fails | Code and expiry retained | Later Resend | Challenge read |
| Mobile verify submitting | Code submitted | Verifying | Stop waiting | Verify response |
| Mobile verify rejected | Invalid code | Correctable error | Retry; resend if eligible | Challenge read |
| Mobile five-failure invalidated | Fifth rejection | Challenge invalidated | Start new change | Profile read |
| Mobile verify unknown | Verify response lost | Verification unknown | Reconcile only | Profile/challenge read |
| Mobile verified | Profile confirms change | Verified profile state | Continue | Profile read |
| Mobile expired | Authoritative expiry reached | Verification expired | Start new change | Challenge read |
| Mobile invalidated | Backend reports invalidation | Verification unavailable | Return to profile | Profile read |
| Mobile unavailable | Provider or contract failure | Verification unavailable | Cancel | Later explicit action |
| Mobile access lost | Auth or scope denial | Clear challenge state | Sign in or safe exit | Auth/scope machine |
| No factor | Server reports absence | MFA not configured | Start enrollment | Enrollment POST |
| Factor available | Factor ID returned | Method and actions | Disable or replace | Factor state |
| Reset eligible | Server permits reset | Exact reset consequence | Confirm reset | Reset mutation |
| Action ineligible | Server reports no action | Disabled reason | Safe navigation | Fresh representation |
| Access lost | Read denies | Clear protected state | Safe navigation | Auth/scope recovery |

Account reads are `BLOCKED` on `BCG-008: Account-administration collection and detail reads`. MFA overview and factor
identity are `BLOCKED` on `BCG-009: Current and pending MFA-factor discovery`. Student and staff reset are `BLOCKED` on
`BCG-010: Authorized student and staff MFA-reset operations`. Role inference and mutation probing are forbidden.

Supervisor mentor-role targeting is `BLOCKED` on
`BCG-017: Supervisor-safe registered-staff targeting for direct mentor-role grants`. It accepts one exact bounded user
ID and yields only a minimal confirmed target or one fixed unavailable state. It never calls BCG-008 account collection
or detail operations, searches relationships, offers suggestions, enumerates IDs, or probes the grant mutation. A
confirmed target continues through machine 22 and BCG-014 atomic binding. This blocker disables only direct mentor-role
grant;
existing mentoring work and unrelated administrator account reads remain usable.

Mobile verification needs authoritative expiry, cooldown, hourly and daily throttle state, and reconciliation after
initial creation, resend, verification ambiguity, provider failure, five-failure invalidation, and concurrent change.
Resend sends the existing code without extending its original expiry. No state returns or renders the code or
destination. The UI makes no claim whether resend resets or preserves the failure count until the backend defines it.
Until supplied, expiry and Resend remain unavailable; local receipt time is not authority. This lifecycle and timer
state is `BLOCKED` on
`BCG-015: Mobile-verification lifecycle and resend observability`.

## 27. Invitation Acceptance and Delivery Ambiguity

| State | Trigger | UI | Permitted action | Authoritative recovery |
| --- | --- | --- | --- | --- |
| Checking | Create, resend, or entry | Delivery status checking | None | Invitation representation |
| Acceptance ready | Valid preview and fields | Invited role and entered values | Submit once | Acceptance request |
| Acceptance submitting | First byte dispatched | Submitting; fields locked | Stop waiting | Response or unknown |
| Acceptance pre-dispatch failure | No bytes sent | No server attempt | Retry acceptance | Same token |
| Acceptance rejected | Response rejects | No creation claim | Reopen email link | New token capture |
| Acceptance succeeded | Definitive `201` | Account created; no session claim | Sign in | Created account identity |
| Acceptance outcome unknown | Response lost | No creation claim | Sign in or reopen email | Explicit action |
| Consumed-token ambiguity | Reopened link invalid | Uniform invalid result | Sign in | Auth result only |
| Pending confirmed | Admission confirmed | Pending invitation | Resend or revoke | Fresh invitation |
| Pending unconfirmed | Timeout reported | Delivery unconfirmed | Resend or revoke | Fresh invitation |
| Faulty | Definite initial failure | Faulty; token unusable | Delete if authorized | Fresh invitation read |
| Resend in flight | User confirms Resend | Prior link may be invalidated | Stop waiting | Response or immediate read |
| Resend failed | Definite SMTP failure | Faulty; token unusable | Delete | Fresh invitation read |
| Resend unknown | Response lost | Delivery and token state unknown | Reconcile only | Fresh invitation read |
| Accepted or revoked | Server reports terminal state | Current terminal label | No resend | Invitation read |
| Access lost | Hidden denial | Clear invitation data | Safe navigation | Auth/scope recovery |

Administrative pending-delivery confirmation, resend, and their ambiguous outcomes are `BLOCKED` on
`BCG-006: Pending invitation SMTP ambiguity`. Public preview and acceptance remain independently implementable. The
frontend never maps all pending invitations to sent, automatically resends, or claims an old link remains valid.
Revoke and Delete faulty remain independently `BLOCKED` on
`BCG-014: Atomic intent binding for consequential state-dependent mutations`; invitation reads and unrelated actions
remain available.

Invitation acceptance is never replayed automatically. Before dispatch, failure means no server attempt and permits an
explicit retry while the route-local token remains. At first-byte dispatch, drop the application-reachable token;
`Stop waiting` or a lost response enters Acceptance outcome unknown. A definitive `201` confirms account creation but
never authentication or session creation; a definitive rejection makes no account or session claim. After ambiguity,
safe next actions are explicit sign-in with the chosen credentials or reopening the original email link. Neither action
proves account creation or invitation consumption. An invalid reopened link after ambiguity is Consumed-token ambiguity,
not proof that the prior acceptance succeeded.
This safe recovery creates no additional backend blocker because it promises no deterministic outcome discovery.

## 28. Cross-Domain Announcements

| State | Trigger | UI | Permitted action | Authoritative recovery |
| --- | --- | --- | --- | --- |
| Initial render | Static state appears | Ordinary visible status | Normal actions | No announcement |
| Requested pending | User starts action | Visible pending | Cancel or leave | Polite per operation ID |
| Background changed | Read finds change | New status | New actions | Polite per resource/state |
| Correctable failure | Action fails | Error near source | Correct or retry | Assertive per error |
| Security expiry | Security flow expires | Expiry and restart | Restart or sign in | Assertive per epoch |
| Approval revoked | Confirmed | Approval required | Review/approve | Polite per material/version |
| Urgent approval correction | Invalid submission/use must stop | Blocking status | Review | Assertive; move focus |
| Summary available | Read confirms it | Summary available | Open summary | Polite per version |
| Speech ready | Fresh read reports available | Audio available | Play | Polite once per speech ID |
| Destructive success | Definitive response succeeds | Confirmed outcome | Safe navigation | Polite once per mutation |
| Provider unavailable | Operation reports it | Scoped message | Valid alternative | Assertive per operation |
| Refresh unchanged | User Refresh finds same state | Last checked updates | Continue | No state announcement |

One owner updates one dedicated live region. Polite transitions use `role=status`; urgent correctable or security
failures use `role=alert`. Dedupe keys suppress reconnect, snapshot, and repeated-read duplicates.
Focus never moves for an announcement alone. User-requested Refresh follows the same state-change rule.

Approval revocation is polite once per material/version whether learned by mutation or read. It becomes assertive only
when a narrow corrective transition must stop an invalid in-progress submission or prevent use of revoked content; that
transition moves focus to its visible blocking status and retains the same dedupe key. Upload announcements follow
machine 10's explicit modes and per-file/state key. No auto-started moving, blinking, or scrolling presentation
continues beyond five seconds without a pause, stop, or hide control. Streaming text offers presentation pause from
machine 3 without cancelling tutor work; static persisted content remains readable throughout.

## 29. Raw Error Disclosure Dependency

| State | Trigger | UI | Permitted action | Authoritative recovery |
| --- | --- | --- | --- | --- |
| Backend error | Body received | Summary; details collapsed | Reveal details | One `Response.text()` call |
| Details open | User reveals | Pre-wrap and emergency word break | Select or copy | Preserve source string unchanged |
| Copy success | Clipboard accepts | Copied confirmation | Close or continue | One polite announcement |
| Copy denied | Clipboard rejects | Copy failed | Select manually | Body remains visible |
| Unsafe contract absent | Invariant unverified | Release dependency | None | Close gap topic |

Visual wrapping never changes the untouched string returned by calling `Response.text()` exactly once or the string used
by selection and `Copy technical details`. The body bound, UTF-8/media contract, proxy behavior, secret-free content,
and error `no-store` policy are `BLOCKED` on `BCG-007: Bounded and safe complete error-body disclosure` and
`BCG-005: Shared-device no-store response policy`.

## 30. TOTP Enrollment Secret Visibility

| State | Trigger | UI | Permitted action | Authoritative recovery |
| --- | --- | --- | --- | --- |
| Enrollment received | Valid provisioning response | Setup masked pending validation | None | Canonical URI parser |
| URI rejected | Grammar or policy mismatch | Setup unavailable | Cancel | No QR, copy, or app link |
| Setup visible | Validation succeeds | QR and selectable manual values | Copy or verify | Route-local values only |
| Temporarily hidden | Temporary `pagehide` | Setup masked; copy suspended | Return | Revalidate pending factor |
| Reveal checking | Visible return | Setup remains masked | Cancel | Same pending enrollment ID |
| Setup restored | Same factor authorized | Original values visible | Copy or verify | Route-local secret |
| Setup destroyed | Terminal event or departure | No provisioning data | Start if eligible | BCG-009 state |

The bounded parser accepts only canonical `otpauth://totp/...` input with no credentials or fragment, one value for each
allowed query field, valid percent encoding, bounded issuer and account label, a valid Base32 secret, and the product's
fixed SHA-1, six-digit, 30-second policy. It rejects missing, duplicate, conflicting, unknown, malformed, or
out-of-policy fields before deriving QR, manual values, copy text, or an app link. Derivation makes no network request.

Temporary page hiding masks but does not destroy the still-live route-local secret. Return reveals the same values only
after BCG-009 confirms the same pending enrollment and current access; mismatch destroys them. Reload, route departure,
unload, activation, definitive cancellation or expiry, account/security epoch change, and unreconcilable state always
destroy all reachable provisioning values.

Every MFA, mobile, or recovery security code uses one native text control for the complete value. Visual character
grouping is presentational only and creates no additional focus stop, value, correction behavior, or paste target.

## 31. Browser-Owned Privacy Boundaries

| State | Trigger | UI | Permitted action | Authoritative recovery |
| --- | --- | --- | --- | --- |
| Inline image gated | Protected view authorized | Placeholder | Fetch image | Current image authorization |
| Inline image visible | Complete valid image received | Avatar or course logo | Continue | Epoch-bound object URL |
| Inline image denied | Hidden denial or bad media | Neutral placeholder | None | No existence distinction |
| App download fetching | Explicit warned click | Preparing download | Cancel wait | Epoch-bound fetch |
| App download activated | Complete blob validated | Browser handoff | None | Revoke next macrotask |
| Direct download handed off | Warned navigation | Browser owns transfer | Browser controls only | No cancel claim |
| Recovery print prepared | Explicit print | Codes-only app DOM | Print or cancel | Neutral title and URL |
| External link ready | Safe HTTPS target | Host plus opens-in-new-tab text | Activate | Isolated new context |
| Fragment captured | Earliest bootstrap | Neutral shell | Replace current URL | Route-local token only |

Inline images are not intentional file downloads. After the protected mount gate, fetch avatars and course logos through
their authorized operations, validate the complete response, and expose an epoch-bound object URL. Never use an
ungated direct `src`, preload, service-worker cache, or stale blob. Denial, replacement, page hide, route departure, or
teardown removes `src`, drops decoded references, and revokes the URL. Cache behavior remains `BLOCKED` on
`BCG-005: Shared-device no-store response policy`, including any narrowly non-sensitive image exception.

An app-managed download can promise abort and epoch teardown only until synchronous browser activation of its complete
validated blob. A direct navigation or activated blob then belongs to browser download UI; MIA cannot reliably cancel,
erase, or observe completion. The pre-download warning states that boundary. Blob URLs still revoke in the next
macrotask, or sooner before activation when teardown occurs.

Recovery-code print requirements cover only application-authored DOM and CSS. Use a neutral title and content-free live
URL and warn that browser settings may add a URL, title, date, header, footer, or page number that MIA cannot suppress.

Every allowed external link has localized visible and programmatic `opens in a new tab` text before activation, not a
title-only or hover-only hint. Fragment bootstrap removes the token from the live address and application-controlled
current history entry before app startup. It does not claim erasure from browser pre-script history, sync, screenshots,
crash metadata, or other browser-owned artifacts.

## Accessibility Evidence Alignment

- `SM-AC-01`: Every applicable release evidence cell must Pass. `BLOCKED` prevents release; it is not a passing result.
- `SM-AC-02`: CP-13 covers Create student, Add existing student, roster and membership detail, uniform ineligible
  outcomes, temporary-password privacy, and membership removal. CP-14 covers assigned-supervisor private-material list,
  detail, bounded navigation, authorized download, denial, scope loss, and return to student context.
- `SM-AC-03`: Every release-one surface and complete process preserves content and functionality at 200% browser zoom,
  320 effective CSS pixels, and every built-in text size. Criticality may add depth but never remove 200% coverage.
- `SM-AC-04`: The field inventory records `name`, `email`, `tel`, `country` or `country-name`, `username`,
  `current-password`, `new-password`, and `one-time-code` where the field collects that purpose for the current user.
  A field about another account records why applying the current user's autocomplete purpose would be incorrect.
- `SM-AC-05`: Security codes follow machine 30's single-native-control requirement.
- `SM-AC-06`: Auto-updating and moving presentation follows machine 28's five-second and presentation-pause rule.
- `SM-AC-07`: External links follow machine 31's visible and programmatic new-context disclosure.
- `SM-AC-08`: Each `SM-AC-*` ID maps to its applicable WCAG criterion, complete process and states, automated or manual
  evidence method, and Pass, Fail, Blocked, or Not run status. Every ID requires coverage; Not run is valid only during
  planning.

## Blocker Topic Alignment

| Canonical BCG topic | Machines affected |
| --- | --- |
| BCG-001: Anonymous CSRF and authentication-session discovery | 1, 4, 9, 24 |
| BCG-002: Cross-course active tutoring-session discovery | 2 |
| BCG-003: Server-authored current-account capabilities and scope | 1, 2, 4, 8, 9 |
| BCG-004: Tutoring-summary lifecycle and regeneration eligibility | 15, 17, 23, 25 |
| BCG-005: Shared-device no-store response policy | 1, 9, 16, 22, 29, 31 |
| BCG-006: Pending invitation SMTP ambiguity | 27 |
| BCG-007: Bounded and safe complete error-body disclosure | 29 |
| BCG-008: Account-administration collection and detail reads | 26 |
| BCG-009: Current and pending MFA-factor discovery | 26, 30 |
| BCG-010: Authorized student and staff MFA-reset operations | 26 |
| BCG-011: Course readiness and session-start eligibility | 12 |
| BCG-012: Authoritative tutoring work and action eligibility | 2, 4-8, 13 |
| BCG-013: Student mentoring-request eligibility | 20 |
| BCG-014: Atomic intent binding for consequential state-dependent mutations | 22, 27 |
| BCG-015: Mobile-verification lifecycle and resend observability | 26 |
| BCG-016: Authoritative mentor-completion eligibility | 20 |
| BCG-017: Supervisor-safe registered-staff targeting for direct mentor-role grants | 22, 26 |

This index intentionally carries no blocker count. `BACKEND-CONTRACT-GAPS.md` remains authoritative for registration and
closure. No BCG entry may be bypassed by role inference, collection scanning, nullable-field inference, mutation
probing, stale client state, or an undocumented route.
