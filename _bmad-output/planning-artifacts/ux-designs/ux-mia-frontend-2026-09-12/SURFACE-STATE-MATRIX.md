---
name: MIA Surface State Matrix
status: draft
sources:
  - mia/docs/product-requirements.md
  - mia/_bmad-output/planning-artifacts/prds/prd-mia-2026-08-29/prd.md
  - EXPERIENCE.md
  - FRONTEND-PRD-FOUNDATION.md
  - FRONTEND-STATE-MACHINES.md
  - ACCESSIBILITY-ACCEPTANCE.md
  - SECURITY-PRIVACY-ACCEPTANCE.md
  - BACKEND-CONTRACT-GAPS.md
  - .working/source-constraint-extract.md
  - REQUIREMENT-FLOW-MATRIX.md
updated: 2026-09-13
---

# MIA Surface State Matrix

## Reading the Matrix

Every concrete surface named in `EXPERIENCE.md` Information Architecture appears below. Every row inherits `G`, then
adds the listed profiles. A row therefore covers cold/loading, empty, focus, validation, backend error, offline,
denied/existence-hidden, stale/concurrent state, domain state, exits, and companion contracts without repeating unsafe
generic prose in every cell.

No row creates an action. Controls exist only where the product requirements and implemented OpenAPI authorize them.
`BCG-*` references use the exact authoritative IDs in `BACKEND-CONTRACT-GAPS.md`. Blocking is action and topic scoped:
only dependent state or controls use neutral checking or unavailable treatment. Independently authorized content and
actions remain usable; the frontend never probes a mutation or derives blocked state from partial data.

## Shared State Profiles

### G: Global surface states

- **Cold/loading:** resolve sign-in stage, current-account capability/scope, route authorization, and dependent state in
  that order before mounting protected content. Show structural loading without fabricated records or shell
  capabilities. This is blocked by `BCG-001` and `BCG-003` where applicable.
- **Empty:** explain authoritative absence and offer at most one currently authorized next action. Empty collections are
  not errors and never invent totals.
- **Focus:** direct entry and full route changes focus the page heading; dialogs contain and restore focus; collection
  updates use a stable collection target. No stale protected identity remains in titles or breadcrumbs.
- **Validation:** associate each field with corrective text, preserve valid safe values, and expose no hidden cause.
- **Backend error:** show a localized plain-language explanation, exact HTTP status, and complete untranslated response
  body as escaped inert text under technical details collapsed by default. Malformed JSON, proxy HTML, and non-JSON
  bodies remain complete plain text. Never render the body as HTML, Markdown, links, or live announcements. Follow
  `SECURITY-PRIVACY-ACCEPTANCE.md`; safe complete disclosure is release-blocked by `BCG-007`.
- **Offline:** state that the server has not confirmed the action. Preserve only permitted page-local input and never
  auto-replay unsafe work.
- **Denied/existence-hidden:** clear content, blobs, titles, breadcrumbs, caches, and stale names before one fixed safe
  result. Unknown, out-of-scope, deleted, and ineligible causes must not differ in copy, focus, actions, or timing
  hints.
- **Stale/concurrent:** revalidate on entry, after mutation, or explicit Refresh. Visible-tab return, persisted page
  restore, and reconnection only mark revalidation needed and issue no authenticated request. A content-free cross-tab
  security epoch immediately shields other tabs after logout, login, stage, or account change. Sequence responses so an
  older read cannot replace newer truth.
- **Exit:** every detail has a freshly authorized parent or Home. Logout, expiry, denial, deletion, and security change
  override dirty-state preservation and synchronously remove sensitive state.

### L: Collection

Cold load uses a list skeleton; empty means the authorized collection has no records. Pagination follows OpenAPI links
without a fabricated total. Concurrent removal replaces the list from backend truth and moves focus to collection
context. Exit is the capability parent or Home.

### F: Form

Cold load waits for writable identity and current values. Validation is colocated and summarized when multiple fields
fail. Offline or backend failure preserves only non-secret page-local values. Show a conflict only when the backend
reports one. Install a successful response, then sequence any required revalidation; if it returns newer values, explain
that they replaced the display without claiming whose edit won. Exit uses Save, Cancel, or a dirty-form decision.

### D: Protected detail

Cold load withholds record content until scope is confirmed. Empty applies to optional sections, not a missing target.
Denial, deletion, or scope loss uses the same terminal unavailable result and routes to an authorized parent. No
protected prefetch, overfetch-and-hide, or ID-only cache key is permitted.

### W: Long-running work

States are only those exposed by backend fields: queued, running/processing/generating, retry scheduled when authorized
attempt/time fields support it, succeeded/ready/available, failed, or cancelled. Show Last checked and Refresh status;
there is no workflow notification or continuous polling. Provider absence and runtime failure stay distinct.

### X: Consequential or destructive mutation

The confirmation names current scope, blockers, cascade, preserved data, irreversibility, and local-only deletion.
Before dispatch, reread the target plus account and scope. Any changed identity, state, cascade, or blocker clears
confirmation.
No optimistic removal occurs. A lost response enters outcome unknown. If the target remains, offer a newly revalidated
dialog; if unavailable, clear it without a success claim. Only definitive success shows the terminal cascade summary.
Where the executed effect can differ from the reviewed state, `BCG-014` blocks only that mutation until the backend
atomically binds intent; a final reread alone is not a substitute.

### T: Token or restricted authentication

Fragment tokens are read once and synchronously removed before app render. Credentials, codes, provisioning URI,
recovery codes, and MFA proof remain ephemeral and never enter general caches, logs, URLs, diagnostics, or history.
Restricted stages expose only the required action and logout. Reload recovery and CSRF bootstrap are blocked by
`BCG-001`.

### U: Upload and untrusted content

A native file picker is primary and drag/drop is an enhancement. Each request has a local row: queued, uploading,
verifying, outcome unknown, uploaded with server identity, rejected, or pre-dispatch cancelled with no server attempt.
After dispatch, `Stop waiting` enters outcome unknown. Read the authoritative list but never correlate by metadata. The
user may choose `Abandon unknown attempt`, accept the list, remove a chosen server ID, or start a warned new upload;
none is called a retry. Finalize remains disabled until unknown attempts are abandoned and the server list is reviewed.
This is not a backend blocker.

### P: Provider-dependent operation

Not configured, temporarily unavailable, ambiguous request outcome, active work, and terminal failure are different.
Only the dependent operation degrades. Request-path provider calls are not represented as automatically retried; expose
only backend-authorized user or domain retry.

### R: Deletion terminal state

Physical resource deletion waits for backend confirmation. The target detail becomes terminal, streams and requests
close, protected caches and rendered identity clear, and navigation goes to the nearest authorized parent or Home. Late
provider work is never shown as recreating the target. Role grants and invitation revocation retain their details;
relationship removals update the retained parent and relationship state in place. Existence-hidden loss clears unsafe
content but does not claim deletion or mutation success.

## Companion Contracts

- `AUTH`: `XC-1`, `XC-2`, `BCG-001`, `BCG-003`, and `BCG-005`.
- `INPUT`: `XC-3` and the exact OpenAPI request bounds.
- `TRUTH`: `XC-4`, `XC-6`, `BCG-007`, and sequenced authoritative reconciliation.
- `ACCESS`: `XC-5`, `ACCESSIBILITY-ACCEPTANCE.md`, and complete processes `CP-01` through `CP-14`.
- `DELETE`: `XC-7`, `X`, and `R`.
- `TUTOR`: `KF-1`, `BCG-002`, `BCG-012`, SSE reconciliation, request IDs, queue, and attempt contracts.
- `MATERIAL`: `KF-2`, `SF-2`, `BCG-011`, readiness/approval separation, `U`, and provider disclosure.
- `MENTOR`: `KF-3`, `SF-6`, `BCG-013`, `BCG-016`, `BCG-017`, actor/state permissions, time-zone entry, and link safety.
- `ADMIN`: `KF-4`, `SF-5`, `SF-7`, `BCG-008`, `BCG-010`, scoped relationships, and blockers.
- `PROFILE`: `SF-3`, mobile/SMS invalidation, locale/time-zone replacement, avatar, and voice rules.
- `REVIEW`: `SF-4`, active/completed visibility separation, immutable chat, and `BCG-004`.
- `SPEECH`: `SF-8`, `P`, retention, media-type branching, and object-URL teardown.

## Surface Inventory

Short domain text is authoritative state, not a proposed control. `None` means no additional domain state beyond the
profiles, not that empty/error states are absent.

### Complete-process coverage

- `CP-01`: Public entry, Restricted login, MFA settings, and relevant Profile security surfaces.
- `CP-02`: Public entry, Restricted login, Home, and Session recovery under global security teardown.
- `CP-03`: Prepare courses, Course content, Course material, and course activation/deactivation.
- `CP-04`: Private material, relevant Learn courses, Session start, and deletion terminal states.
- `CP-05`: Session start, Tutoring workspace, Learning history, and current-work reconciliation.
- `CP-06`: Learning history and Student oversight completed-session and summary surfaces.
- `CP-07`: Student mentoring, Mentor assignment, Mentoring triage, and Mentor work.
- `CP-08`: Student read-only self-profile, staff Profile, and Student oversight profile, mobile, locale, and time zone.
- `CP-09`: Student security plus the relevant restricted password and lost-factor surfaces.
- `CP-10`: Public invitation entry and acceptance plus Invitations administration.
- `CP-11`: Learning history generated speech and relevant Profile voice surfaces.
- `CP-12`: Account administration, staff MFA reset, Course administration, Operations, and destructive terminal states.
- `CP-13`: Course roster, Create student, Add existing student, Membership detail, Student security, and removal.
- `CP-14`: Assigned-supervisor Student material list, detail, download, denial, scope loss, and managed-student return.

`ACCESSIBILITY-ACCEPTANCE.md` owns the included variants and evidence lanes. `CP-01`, `CP-02`, `CP-03`, `CP-05`,
`CP-09`, `CP-12`, `CP-13`, and `CP-14` are critical. A backend blocker makes an affected process Blocked, never Pass.

### Public entry

| Surface | Profiles | Domain states | Exit | Companion |
| --- | --- | --- | --- | --- |
| Login | `G,F,T` | anonymous; throttled; `mfa`; password change; authenticated | restricted step or Home | `AUTH` |
| Recovery | `G,F,T,P` | uniform accepted; SMTP outcome hidden; throttled-identical | Login | `AUTH` |
| Reset | `G,F,T` | token valid/invalid; expired; policy error; consumed | Login | `AUTH,INPUT` |
| Invitation preview | `G,T` | valid role; uniform invalid token | acceptance or Login | `AUTH,ADMIN` |
| Invitation acceptance | `G,F,T,P` | submit; reject; unknown; token ambiguity; no claim | Login | `AUTH,ADMIN` |

Pre-dispatch failure means no server attempt and permits explicit retry with the route-local token. After dispatch, the
token is dropped and no request replays automatically. Definitive rejection and outcome unknown make no account or
session claim. Explicit sign-in with the chosen credentials or reopening the original email link is permitted, but
neither proves acceptance, token consumption, authentication, or session creation.

### Restricted login

| Surface | Profiles | Domain states | Exit | Companion |
| --- | --- | --- | --- | --- |
| MFA challenge | `G,F,T,P` | TOTP/SMS; cooldown; five-failure invalid; expired | next stage or logout | `AUTH` |
| MFA recovery code | `G,F,T` | unused; consumed; invalid; challenge expired | next stage or logout | `AUTH` |
| Required password replacement | `G,F,T` | required; policy error; complete | Home or logout | `AUTH,INPUT` |
| Restricted logout | `G,T,P` | submitting; confirmed; unconfirmed failure | Login/privacy screen | `AUTH` |

### Home

| Surface | Profiles | Domain states | Exit | Companion |
| --- | --- | --- | --- | --- |
| Authorized continuation | `G,D,W` | no work; session; attention; access changed | destination | `AUTH,TRUTH` |
| Attention items | `G,L,W` | preparation; failure; review; mentoring; operations | item detail | `TRUTH` |

Home and the shell cannot be implemented as specified until `BCG-002` and `BCG-003` resolve active-session and
capability discovery. Home shows its own Last checked time and does not imply pushed updates.

### Learn courses

| Surface | Profiles | Domain states | Exit | Companion |
| --- | --- | --- | --- | --- |
| Joined courses | `G,L` | none joined; active only | Home or course | `AUTH` |
| Course detail | `G,D` | `BCG-011` blocked: checking; accepting; not accepting | joined courses | `AUTH,MATERIAL` |
| Approved material list | `G,L` | empty; approved ready file-backed; approved link-only | course | `MATERIAL` |
| Course-material download | `G,D,U` | available; revoked; unavailable | material/course | `AUTH,MATERIAL` |

### Private material

| Surface | Profiles | Domain states | Exit | Companion |
| --- | --- | --- | --- | --- |
| Private-material list | `G,L,W` | empty; draft; processing; ready; failed | Learn or detail | `MATERIAL` |
| Create private draft | `G,F,U` | new; name/format conflict; created | files or list | `MATERIAL,INPUT` |
| Private files | `G,D,U` | editable draft; upload states; frozen processing/ready | review or detail | `MATERIAL` |
| Private upload review | `G,D,U,X` | incomplete; finalizable; stale file set | files or processing | `MATERIAL` |
| Private processing | `G,D,W,P` | processing; retry scheduled; ready; failed | detail/list | `MATERIAL,TRUTH` |
| Private-material detail | `G,D,W` | draft; processing; ready; failed; selected | list/session | `MATERIAL` |
| Delete private material | `G,D,X,R` | allowed; selection-blocked; deleted | list | `DELETE,MATERIAL` |

Private downloads additionally warn that the browser-created local copy survives logout and MIA deletion. They occur
only after explicit activation and fresh authorization; object URLs are revoked after use or scope loss.

### Session start

| Surface | Profiles | Domain states | Exit | Companion |
| --- | --- | --- | --- | --- |
| Course choice | `G,L` | `BCG-011` blocked: checking; eligible; not eligible | Learn/Home | `TUTOR,MATERIAL` |
| Optional material choice | `G,L,D` | none; link-only; source-backed; private ready | course | `TUTOR` |
| Static starters | `G,D` | five localized starters; inserted, never submitted | intent | `TUTOR,ACCESS` |
| Free-form intent | `G,F` | empty; valid; bounded; submission outcome unknown | workspace | `TUTOR,INPUT` |

Current active-session detection, creation-conflict recovery, and cross-device continuation remain blocked by
`BCG-002`. Session-start readiness remains blocked by `BCG-011`.

### Tutoring workspace

| Surface | Profiles | Domain states | Exit | Companion |
| --- | --- | --- | --- | --- |
| Transcript | `G,D,U,W` | empty; queued; generating; reconciling; complete/interrupted/failed | session | `TUTOR` |
| Composer | `G,F` | `BCG-012` blocked: checking; idle; slot free/full; outcome unknown | transcript | `TUTOR,INPUT` |
| Queue | `G,D,W` | `BCG-012` blocked: checking; absent; queued; handoff; generating | transcript | `TUTOR` |
| SSE state | `G,D,W,P` | snapshot; live; retrying/paused/exhausted; offline; terminal | transcript/login | `TUTOR` |
| Retry response | `G,D,X,P` | `BCG-012` blocked: checking; eligible; busy; completed | transcript | `TUTOR` |
| Stop response | `G,D,X,P` | `BCG-012`: checking; stoppable/submitting/unknown/terminal | transcript | `TUTOR` |
| Finish session | `G,D,X` | `BCG-012`: checking; eligible/busy/prevalidating/unknown | history | `TUTOR,DELETE` |
| Session recovery | `G,D,W` | checking; found; none; sign-in expired; unavailable | workspace/Home | `TUTOR,AUTH` |

Incremental content does not steal focus or reading position. Terminal reconciliation preserves a reading anchor and
announces each state transition once. Auth expiry is called sign-in expiry, not tutoring-session expiry.

After Reload, unpersisted request IDs and message bodies are gone. The frontend renders authoritative session, work, and
transcript state without claiming whether an absent attempt was saved and without offering exact replay. This safe
outcome-unknown treatment is not a separate backend blocker; `BCG-002` and `BCG-012` still govern the required reads.

### Learning history

| Surface | Profiles | Domain states | Exit | Companion |
| --- | --- | --- | --- | --- |
| Completed-session history | `G,L` | loading; empty; paginated; denied/scope lost | courses/Home | `TUTOR,AUTH` |
| Completed session | `G,D` | completed read-only; deleted/unavailable terminal | history list/course | `TUTOR` |
| Summary and follow-up | `G,D,W,P` | `BCG-004`: blocked lifecycle and eligibility | session | `REVIEW` |
| Used material | `G,L,D` | none; live record; link unavailable; later absent | session/material | `TUTOR,MATERIAL` |
| Generated speech | `G,D,W,P` | new; no voice; unavailable; generating; ready; failed; expired | session | `SPEECH` |

No summary state or regeneration action may be inferred from nullable fields while `BCG-004` remains open. Used-material
history renders only returned records; absent later records and transcript quotations never become invented tombstones.

### Student mentoring

| Surface | Profiles | Domain states | Exit | Companion |
| --- | --- | --- | --- | --- |
| Student requests | `G,L` | `BCG-013`: blocked eligibility; existing work remains | Learn/detail | `MENTOR` |
| Create request | `G,F` | `BCG-013`: blocked checking/allowed/neutral disabled/access lost | detail/list | `MENTOR` |
| Student request detail | `G,D,W` | awaiting assignment; assigned; scheduled; cancelled; completed | list | `MENTOR` |
| Student schedule | `G,F,D` | proposed; scheduled; reschedule; DST invalid/ambiguous | detail | `MENTOR,ACCESS` |
| Student cancellation | `G,D,X` | unscheduled; future; stale/blocked | detail/list | `MENTOR` |
| Student meeting link | `G,D,U` | absent; HTTPS destination present; cancelled/completed | detail | `MENTOR` |

### Prepare courses

| Surface | Profiles | Domain states | Exit | Companion |
| --- | --- | --- | --- | --- |
| Assigned-course list | `G,L` | `BCG-011` blocked: inactive/active; accepting/not accepting | Home or hub | `AUTH` |
| Preparation hub | `G,D,W` | `BCG-011`: checking/incomplete/activatable/active states | list/item | `MATERIAL` |
| Readiness review | `G,D,W` | `BCG-011`: blocked prerequisites and action eligibility | hub/item | `MATERIAL` |
| Course activation | `G,D,X` | `BCG-011` blocked: checking; eligible; ineligible; active | hub | `MATERIAL` |
| Course deactivation | `G,D,X` | active; deactivated; stale assignment | hub | `MATERIAL` |

An active course with no approved, ready, file-backed course-wide material remains active but blocks new sessions.
Approval restoration permits starts without another activation.

### Course content

| Surface | Profiles | Domain states | Exit | Companion |
| --- | --- | --- | --- | --- |
| Course details | `G,F,D` | incomplete/complete; inactive/active | hub | `MATERIAL,INPUT` |
| Course logo | `G,F,D,U` | absent; available; invalid upload; removed | details | `MATERIAL,INPUT` |
| Curriculum | `G,F` | absent; valid; stale edit | hub | `MATERIAL,INPUT` |
| Learning goals | `G,F` | absent; valid; over bounds; stale edit | hub | `MATERIAL,INPUT` |
| AI instructions | `G,F` | absent; valid; over bounds; stale edit | hub | `MATERIAL,INPUT` |
| Course language | `G,F` | absent/invalid; canonical valid | hub | `MATERIAL,ACCESS` |

### Course material

| Surface | Profiles | Domain states | Exit | Companion |
| --- | --- | --- | --- | --- |
| Course-material list | `G,L,W` | empty; draft; processing; ready; failed; approval | hub/detail | `MATERIAL` |
| Course-material draft | `G,F,U` | file-backed or link-only; scope fixed; editable | files/brief | `MATERIAL` |
| Course-material detail | `G,D,W` | draft; processing; ready; failed; approved/unapproved | list/hub | `MATERIAL` |
| Course-material files | `G,D,U` | draft upload states; frozen; source-backed | review/detail | `MATERIAL` |
| Course-material processing | `G,D,W,P` | processing; retry scheduled; ready; failed | detail/list | `MATERIAL,TRUTH` |
| Material brief review | `G,F,D` | generated; corrected; unchanged; ungroundable failure | detail | `MATERIAL,INPUT` |
| Material approval | `G,D,X` | ineligible; unapproved; approved; revoked by meaningful edit | detail/hub | `MATERIAL` |
| Revoke material approval | `G,D,X` | approved; revoked; new-session impact | detail/hub | `MATERIAL` |
| Delete course material | `G,D,X,R` | allowed; active-selection blocked; deleted terminal | list | `DELETE,MATERIAL` |

File-backed ready material can provide retrievable content. Approved link-only material is student-visible but has no
retrievable content and satisfies neither activation nor new-session readiness. Mistral absence affects only OCR-backed
processing; local formats and unrelated features do not inherit that outage.

### Course students

| Surface | Profiles | Domain states | Exit | Companion |
| --- | --- | --- | --- | --- |
| Course roster | `G,L` | empty; current memberships; no global directory | hub/member | `AUTH,ADMIN` |
| Create student | `G,F,T` | valid; username conflict; password policy; created | member/roster | `ADMIN,INPUT` |
| Add existing student | `G,F` | exact username; uniform ineligible; idempotent member | member/roster | `ADMIN,AUTH` |
| Membership detail | `G,D` | current; active-session status; stale/removed | roster | `ADMIN,REVIEW` |
| Remove membership | `G,D,X` | `BCG-014`: active-session/cascade bound; removed in place | roster | `DELETE,ADMIN` |

Temporary-password fields are destroyed after success, cancel, logout, or scope loss and are never restored from browser
history. Membership removal never implies global account deletion.

### Student oversight

| Surface | Profiles | Domain states | Exit | Companion |
| --- | --- | --- | --- | --- |
| Student profile | `G,F,D` | student-only writable; staff read-only; global-effect warning | member | `PROFILE,AUTH` |
| Student material | `G,L,D,U` | empty; draft/processing/ready/failed; download | member/material | `MATERIAL,AUTH` |
| Student session status | `G,L,D` | none; active with times; completed | member/session | `REVIEW` |
| Completed-session review | `G,D,W` | chat/used material; `BCG-004` summary blocked | member/session | `REVIEW` |
| Summary correction | `G,F,D` | generated; supervisor-corrected; conflict; saved | review | `REVIEW` |

Active-session surfaces never request message, used-material, private-content, or summary detail. Completion opens only
the endpoints authorized for assigned supervisors.

### Student security

| Surface | Profiles | Domain states | Exit | Companion |
| --- | --- | --- | --- | --- |
| Temporary password | `G,F,T,X` | student-only; submitted; cookies invalidated; gated | student | `ADMIN,AUTH` |
| Student MFA reset | `G,D,T,X` | `BCG-010`: blocked checking/eligibility/reset | student | `ADMIN,AUTH` |
| Ban and unban | `G,D,X` | unbanned; banned; in-flight work unaffected; unbanned | student detail | `ADMIN,AUTH` |

A banned student cannot use the active tutoring session and therefore cannot finish it; membership removal stays blocked
until unban or account deletion. Granting a staff role also requires prior unban.

### Mentor assignment

| Surface | Profiles | Domain states | Exit | Companion |
| --- | --- | --- | --- | --- |
| Grant mentor role | `G,F,D,X` | `BCG-017`: exact ID; checking; confirmed; hidden; granted | Prepare | `MENTOR` |
| Course mentors | `G,L` | empty; assigned; removed | course hub | `MENTOR,ADMIN` |
| Student mentors | `G,L` | empty/new requests disabled; assigned | student detail | `MENTOR` |
| Add course mentor | `G,F` | eligible registered mentor; idempotent; assigned | course mentors | `MENTOR` |
| Assign student mentor | `G,F` | course mentor required; assigned; idempotent | student mentors | `MENTOR` |
| Direct reassignment | `G,F,X` | eligible assignee; details/authorship preserved | request detail | `MENTOR` |
| Remove mentor | `G,D,X` | `BCG-014`: triage/schedule cascade bound; removed in place | mentor list | `DELETE,MENTOR` |

### Mentoring triage

| Surface | Profiles | Domain states | Exit | Companion |
| --- | --- | --- | --- | --- |
| Triage request list | `G,L,W` | empty; awaiting assignment; assigned | Prepare/detail | `MENTOR` |
| Triage request detail | `G,D,W` | topic/prior response; no private data; state | list | `MENTOR,AUTH` |
| Triage assignment | `G,F` | eligible assigned mentor; assigned; stale conflict | detail | `MENTOR` |
| Triage reassignment | `G,F,X` | preserve schedule/details/prior authorship | detail | `MENTOR` |
| Supervisor cancellation | `G,D,X` | unscheduled only; cancelled; stale/blocked | detail/list | `MENTOR` |

### Mentor work

| Surface | Profiles | Domain states | Exit | Companion |
| --- | --- | --- | --- | --- |
| Assigned request list | `G,L,W` | empty; assigned; scheduled; cancelled; completed | Mentor/detail | `MENTOR` |
| Mentor briefing | `G,D` | minimal identity/topic only; stale assignment unavailable | list | `MENTOR,AUTH` |
| Mentor response | `G,F` | absent; saved; immutable prior authorship after reassignment | detail | `MENTOR` |
| Mentor scheduling | `G,F,D` | proposed; scheduled; rescheduled; DST invalid/ambiguous | detail | `MENTOR,ACCESS` |
| Mentor completion | `G,D,X` | `BCG-016`: check; wait; prevalidate; unknown; deny; complete | detail/list | `MENTOR` |

### Profile

| Surface | Profiles | Domain states | Exit | Companion |
| --- | --- | --- | --- | --- |
| Self profile | `G,F,D` | student-only read-only; staff writable subset; fixed read-only fields | Home | `PROFILE` |
| Staff avatar | `G,F,D,U` | absent; available; rejected; replaced; removed | profile | `PROFILE,INPUT` |
| Preferred language | `G,F` | current; changed; interface atomically rerendered | profile | `PROFILE,ACCESS` |
| Country | `G,F` | canonical value; validation error | profile | `PROFILE,INPUT` |
| Time zone | `G,F` | current IANA zone; changed; instants reformatted, not moved | profile | `PROFILE,ACCESS` |
| Voice | `G,F,P` | absent; configured; cleared; provider availability separate | profile | `PROFILE,SPEECH` |
| Mobile verification | `G,F,T,P` | `BCG-015`: create/throttle/resend/verify/unknown/invalid | profile | `PROFILE` |
| Remove mobile | `G,D,X` | present; removed; pending invalidated; active retained | profile | `PROFILE` |

A successful staff mobile change or removal invalidates pending mobile challenges and pending SMS enrollments or
replacements. A supervisor-entered student mobile is immediately verified and has the same pending-state invalidation.
Neither operation moves an active SMS factor's immutable enrolled destination.

Student-only self-profile requests do not create form state or expose profile mutations. Staff-only Profile child
surfaces remain unavailable to student-only accounts unless a separate product capability, such as own MFA management,
authorizes that exact child route.

### MFA settings

| Surface | Profiles | Domain states | Exit | Companion |
| --- | --- | --- | --- | --- |
| MFA overview | `G,D` | `BCG-009` blocked: checking; none; active TOTP/SMS; pending | Profile | `AUTH` |
| Start MFA enrollment | `G,F,T,P` | `BCG-009`: blocked checking/eligibility/pending/replace | verify | `AUTH,PROFILE` |
| Verify MFA enrollment | `G,F,T,P` | `BCG-009` blocked: pending; cooldown; expired; invalid; active | codes | `AUTH` |
| Recovery codes | `G,D,T,X` | shown once; acknowledged; irretrievable after departure/loss | MFA overview | `AUTH` |
| Replace MFA | `G,F,T,P,X` | `BCG-009` blocked: proof valid/expired; active/pending; replaced | codes | `AUTH` |
| Disable MFA | `G,F,T,X` | `BCG-009` blocked: checking; proof valid/expired; active; disabled | overview | `AUTH` |
| Lost-factor route | `G,D,T` | `BCG-010` blocked: student/staff reset; sole admin `BO` | login/profile | `AUTH,ADMIN` |

SMS enrollment invalidated by profile-mobile change or removal disappears only after authoritative revalidation. An
active SMS login challenge remains bound to its enrolled destination; provider unavailability must retain recovery-code
and lost-factor paths rather than hide the challenge.

### Account administration

| Surface | Profiles | Domain states | Exit | Companion |
| --- | --- | --- | --- | --- |
| Accounts list | `G,L` | `BCG-008`: blocked checking/empty/paginated/unavailable | Administer/detail | `ADMIN,AUTH` |
| Account detail | `G,D` | `BCG-008` read; `BCG-010` staff reset blocked | list | `ADMIN` |
| Grant role | `G,F,X` | `BCG-008` read; `BCG-014` bound ban/staff/coupled grant | detail | `ADMIN` |
| Delete account | `G,D,X,R` | `BCG-008` read; `BCG-014` bound class/blockers/cascade | list | `DELETE,ADMIN` |

Student-only deletion removes all operational data. Staff deletion requires a different administrator and applies
assignment cleanup and mentoring triage atomically. Only content-free audit records remain; provider copies and backups
are outside MIA's live-local deletion.

### Invitations

| Surface | Profiles | Domain states | Exit | Companion |
| --- | --- | --- | --- | --- |
| Invitation list | `G,L,W,P` | `BCG-006`: blocked pending confirmation; terminal states | Admin/detail | `ADMIN` |
| Create invitation | `G,F,P` | `BCG-006` blocked: pending confirmed/unconfirmed; faulty | detail/list | `ADMIN` |
| Invitation detail | `G,D,W,P` | `BCG-006` blocked: pending confirmed/unconfirmed; terminal states | list | `ADMIN` |
| Resend invitation | `G,D,X,P` | `BCG-006`: blocked checking/confirmed/unconfirmed/faulty/unknown | detail | `ADMIN` |
| Revoke invitation | `G,D,X` | `BCG-014` blocked atomic pending-to-revoked intent | detail/list | `ADMIN` |
| Delete faulty invitation | `G,D,X,R` | `BCG-014` blocked atomic faulty-deletion intent | list | `DELETE,ADMIN` |

Pending, accepted, revoked, and faulty are persisted lifecycle states. SMTP timeout is neither sent nor faulty: the
invitation stays pending and usable with unconfirmed delivery and no automatic retry. Current OpenAPI cannot represent
that independent ambiguity, so affected list/detail/create/resend treatment remains blocked by `BCG-006`.
Invitation lifecycle content and unaffected actions remain available. `BCG-014` separately blocks Revoke and Delete
faulty until either action cannot change meaning between confirmation and execution.

### Course administration

| Surface | Profiles | Domain states | Exit | Companion |
| --- | --- | --- | --- | --- |
| Courses list | `G,L` | empty; inactive; active; `BCG-011` blocked start-readiness | Administer/detail | `ADMIN` |
| Create course | `G,F,X` | requires one or more existing supervisors; inactive success | detail/list | `ADMIN,INPUT` |
| Course admin detail | `G,D` | inactive; active; supervisor relationships; deletion blockers | list | `ADMIN` |
| Course supervisors | `G,L,F,X` | add; `BCG-014` bound removal/sole-supervisor blocker | course detail | `ADMIN` |
| Delete course | `G,D,X,R` | `BCG-014` bound activity/session/cascade; deleted | list | `DELETE,ADMIN` |

Course deletion removes course-scoped data while preserving accounts and other-course data. It never waits for provider
work or presents late results as restored data.

### Operations

| Surface | Profiles | Domain states | Exit | Companion |
| --- | --- | --- | --- | --- |
| Jobs list | `G,L,W,P` | empty; queued; running; retry; success; failed; cancelled | Admin/detail | `TRUTH,ADMIN` |
| Job detail | `G,D,W,P` | authorized diagnostics; cumulative usage; no generic retry | list/subject | `TRUTH,ADMIN` |
| Audit records | `G,L,D` | empty; paginated; de-identified/deleted actor or subject | Administer | `AUTH,ADMIN` |

Supervisor-facing subject status never exposes provider diagnostics. Administrators see only documented operational
fields; usage is not represented as billing. Domain retry remains Finalize and process or Generate summary again only
when its authoritative preconditions are exposed.

## Provider Availability Matrix

| Provider | Affected surfaces | Distinct states and permitted recovery |
| --- | --- | --- |
| OpenAI | tutoring; summary; brief | work/failure visible; partial text retained; no false success |
| Mistral | PDF/image processing | draft retained; background attempts visible when exposed; domain re-finalize only |
| SMTP | recovery; invitation | definite failure versus timeout ambiguity; no automatic request-path retry |
| ClickSend | mobile; SMS MFA | not configured, send failure, cooldown, active challenge, alternate recovery paths |
| ElevenLabs | speech | voice missing, service unavailable, generating, available, failed, expired |

Provider availability is never a startup prerequisite visible to the frontend. An outage affects only dependent
operations and cannot be generalized into a platform-wide unavailable state.

## Consequential Outcome Matrix

| Target | Preserved | Removed | Definitive-success result |
| --- | --- | --- | --- |
| Private material | chats/summaries; content-free audit | source, brief, retrieval, jobs | material list |
| Course membership | account, profile, other-course data | student-owned course data | update parent in place |
| Student account | de-identified content-free audit only | all operational data across courses | accounts list |
| Staff account | de-identified history; other accounts | account/data/assignments; work triaged | accounts list |
| Course | user accounts and other-course data | all course-scoped data | courses list |
| Faulty invitation | content-free audit | invitation row | invitation list |
| Mentor assignment | history; topic/prior response | assignment; future schedule details | update parent in place |

These outcomes are displayed only after authoritative success. Only physical deletion uses `R` and automatic terminal
navigation. A concurrent `404` or scope loss clears unsafe content without identifying a terminal cause or claiming that
the mutation succeeded.

## Blocked Surface States

Every concrete IA surface has a row. The following required state topics are mapped but not implementable from current
OpenAPI or response policy:

- `BCG-001`: anonymous CSRF bootstrap, session stage, restricted-stage expiry, and authenticated expiry.
- `BCG-002`: cross-course active-session recovery and creation-conflict reconciliation.
- `BCG-003`: current-account capability and scope for shell, route, and action discovery.
- `BCG-004`: summary lifecycle, correction attribution, and regeneration eligibility.
- `BCG-005`: no-store protection for sensitive responses, errors, downloads, SSE, media, and one-time secrets.
- `BCG-006`: confirmed versus unconfirmed pending invitation delivery.
- `BCG-007`: bounded, UTF-8, media-defined, neutral, safe complete API and proxy error bodies.
- `BCG-008`: account-administration collection, detail, target state, and action eligibility.
- `BCG-009`: current and pending MFA factors, their IDs, expiry, relationships, and action eligibility.
- `BCG-010`: authorized student and staff MFA-reset mutations and ambiguous-outcome reconciliation.
- `BCG-011`: course readiness, activation eligibility, and new-session eligibility.
- `BCG-012`: tutoring current work, queue capacity, handoff, action eligibility, and finish prevalidation.
- `BCG-013`: combined student mentoring-request eligibility while preserving existing work.
- `BCG-014`: atomic binding only for invitation Revoke/Delete faulty, permanent role grant, course-supervisor removal,
  membership removal, mentor removal, account deletion, and course deletion.
- `BCG-015`: mobile-verification lifecycle, unchanged resend expiry, cooldown, reload recovery, resend failure-count
  semantics, and concurrent invalidation observability.
- `BCG-016`: server-evaluated mentor-completion action, recheck instant, prevalidation, and unknown reconciliation.
- `BCG-017`: supervisor-safe exact-ID registered-staff targeting for direct mentor-role grant without directory access.

No frontend state or action approximates these topics. Upload ambiguity and post-reload message ambiguity are not
backend blockers. Both use the safe frontend outcome-unknown treatments above and make no success or retry claim.

BCG-017 blocks only target resolution and direct mentor-role grant. Existing mentoring collections, detail, response,
scheduling, assignment, reassignment, removal, triage, and administrator-authorized account reads remain independently
usable under their own contracts.
