---
name: MIA Requirement Flow Matrix
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
updated: 2026-10-07
---

# MIA Requirement Flow Matrix

## Purpose

This matrix closes source-to-frontend traceability without changing backend behavior. The source PRD provides no
separate names for FR, NFR, or AS entries, so their stable identifiers are used verbatim. User-journey names are quoted
verbatim. A mapping means only the steps or contract named here; it does not imply that an entire source journey is
present in an existing key flow.

Traceability here is one-directional by design: every source requirement maps to a frontend flow, but a flow is a
journey narrative rather than a testable obligation. Since `FRONTEND-PRD-FOUNDATION.md` now carries stable `FFR-*`
identifiers, this matrix should gain an `FFR-*` column binding each source requirement to the frontend obligations that
satisfy it, plus a reverse index that makes an `FFR-*` serving no source requirement detectable. That work is
deliberately deferred until story planning begins, so each binding can be confirmed against real story work instead of
inferred in bulk across 84 functional, 11 non-functional, and 32 acceptance entries. Until then, a story author citing
a source requirement must still read the owning obligation out of the PRD.

## Coverage Vocabulary

### Existing key flows

- `KF-1`: Pablo completes and safely resumes independent tutoring.
- `KF-2`: Elena prepares the first-rollout English course.
- `KF-3`: Rosa confirms an external mentoring meeting.
- `KF-4`: Diego completes consequential administration unambiguously.

### Supporting flows

- `SF-1`: Priya recovers staff access and manages MFA safely.
- `SF-2`: Lucía prepares, uses, and deletes private material.
- `SF-3`: Marcus updates his staff profile and verifies a mobile number.
- `SF-4`: Elena reviews a completed tutoring session and corrects its summary.
- `SF-5`: Elena performs a separate student security action.
- `SF-6`: Pablo requests mentoring and Elena triages it.
- `SF-7`: Diego manages a staff invitation through its lifecycle.
- `SF-8`: Pablo requests and revisits generated speech.
- `SF-9`: Elena updates a student-only account's non-security profile.
- `SF-10`: Pablo learns from tutor-discovered authorized material.
- `SF-11`: Elena grants the mentor role to one registered staff account by exact user ID.

### Cross-cutting contracts and classifications

- `XC-1`: Authorization, capability scope, existence hiding, and protected-cache clearing (`BCG-003`, `BCG-005`).
- `XC-2`: Authentication stages, CSRF rotation, shared-device clearing, and secret handling (`BCG-001`, `BCG-005`).
- `XC-3`: Input grammar, Unicode and byte bounds, validation, and null semantics.
- `XC-4`: Backend truth, stale-state revalidation, idempotency, offline handling, and exact error presentation
  (`BCG-007`).
- `XC-5`: Accessibility, localization, time-zone display, and safe untrusted-content rendering.
- `XC-6`: Long-running work, provider degradation, no-notification discovery, and explicit domain retry.
- `XC-7`: Destructive-action confirmation, terminal resource loss, and local-only deletion disclosure.
- `BO`: Backend-only or operator-only behavior with no frontend surface.

### Backend contract blockers

- `BCG-001`: Anonymous CSRF and authentication-session discovery.
- `BCG-002`: Cross-course active tutoring-session discovery.
- `BCG-003`: Server-authored current-account capabilities and scope.
- `BCG-004`: Tutoring-summary lifecycle and regeneration eligibility.
- `BCG-005`: Shared-device no-store response policy.
- `BCG-006`: Pending invitation SMTP ambiguity.
- `BCG-007`: Bounded and safe complete error-body disclosure.
- `BCG-008`: Account-administration collection and detail reads.
- `BCG-009`: Current and pending MFA-factor discovery.
- `BCG-010`: Authorized student and staff MFA-reset operations.
- `BCG-011`: Course readiness and session-start eligibility.
- `BCG-012`: Authoritative tutoring work and action eligibility.
- `BCG-013`: Student mentoring-request eligibility.
- `BCG-014`: Atomic intent binding for consequential state-dependent mutations.
- `BCG-015`: Mobile-verification lifecycle and resend observability.
- `BCG-016`: Authoritative mentor-completion eligibility.
- `BCG-017`: Supervisor-safe registered-staff targeting for direct mentor-role grants.

A `BCG-*` blocker takes precedence over the flow named after the arrow. The flow defines the intended experience but
must not be implemented by guessing transport. `BACKEND-CONTRACT-GAPS.md` owns blocker status and closure.

BCG-014 applies only to invitation Revoke/Delete faulty, permanent role grant, course-supervisor removal, membership
removal, mentor removal, account deletion, and course deletion. It does not block unrelated mutations.

### Accessibility complete processes

| ID | Critical | Flow mapping | Included process |
| --- | --- | --- | --- |
| `CP-01` | Yes | `SF-1`, `KF-1` | Login, recovery, reset, restricted stages, MFA |
| `CP-02` | Yes | `KF-1`, `XC-2` | Shared-device expiry, logout, sign-in, resume |
| `CP-03` | Yes | `KF-2` | Course preparation, material, readiness, activation |
| `CP-04` | No | `SF-2` | Private material create, upload, process, use, delete |
| `CP-05` | Yes | `KF-1`, `SF-10` | Tutoring start, stream, queue, recover, retry, finish |
| `CP-06` | No | `SF-4` | Completed-session review and summary correction |
| `CP-07` | No | `SF-6`, `SF-11`, `KF-3` | Mentor role grant, request, triage, schedule, complete |
| `CP-08` | No | `SF-3`, `SF-9`, `KF-1` | Student self, staff, and managed-student profiles; preferences |
| `CP-09` | Yes | `SF-5` | Student password recovery, MFA reset, ban, unban |
| `CP-10` | No | `SF-7` | Invitation create, accept, resend, revoke, delete |
| `CP-11` | No | `SF-8` | Speech request, wait, play, expire, retry |
| `CP-12` | Yes | `KF-4` | Accounts, courses, roles, jobs, audit, deletion |
| `CP-13` | Yes | `KF-2`, `SF-5` | Roster, provision student, add existing, membership, remove |
| `CP-14` | Yes | `SF-4`, `XC-1` | Supervisor private material, denial, scope loss, managed-student return |

These IDs are defined by `ACCESSIBILITY-ACCEPTANCE.md`. A backend blocker makes the affected process Blocked, never
Pass, without changing its required accessibility evidence lanes.

## User Journeys

| ID | Source name | Mapping |
| --- | --- | --- |
| UJ-1 | Ana the administrator sets up a course | `KF-4`; bootstrap step is `BO` |
| UJ-2 | Sofía the supervisor prepares and activates the course | `KF-2` |
| UJ-3 | Sofía provisions students | `KF-2`, steps 9–10; `KF-1`, step 2; recovery is `SF-5` |
| UJ-4 | Mia the student holds a tutoring session | `KF-1`, `SF-2`, and `SF-10` |
| UJ-5 | Marco the mentor handles an escalation | `SF-6` then `KF-3` |
| UJ-6 | Sofía reviews and fine-tunes | `SF-4`, `KF-2`, and `SF-9` |

## Functional Requirements

The mapping is deliberately narrow. A flow reference covers only its stated steps; contracts cover behavior applied to
every relevant surface.

| ID | Mapping | ID | Mapping |
| --- | --- | --- | --- |
| FR-1 | `XC-3` | FR-43 | `BCG-014` → `KF-4`, `XC-7` |
| FR-2 | `XC-3` | FR-44 | `BCG-011` → `KF-2`, `KF-1` |
| FR-3 | `SF-3`, `SF-7`, `XC-3` | FR-45 | `KF-2`, `SF-2`, `XC-3` |
| FR-4 | `SF-3`, `XC-3` | FR-46 | `KF-2`, `XC-4` |
| FR-5 | `XC-3` | FR-47 | `SF-2`, `XC-1` |
| FR-6 | `SF-7`; no public sign-up surface | FR-48 | `KF-2`, `SF-2`, `XC-6` |
| FR-7 | `BO` | FR-49 | `KF-2`, `SF-2`, `XC-3` |
| FR-8 | `SF-7` | FR-50 | `KF-2`, `SF-2`, `XC-3` |
| FR-9 | `BCG-006` → `SF-7` | FR-51 | `KF-2`, `XC-5` |
| FR-10 | `BCG-014` → `SF-7`, `XC-7` | FR-52 | `SF-2`, `XC-7` |
| FR-11 | `SF-7`, `XC-1` | FR-53 | `KF-2`, `SF-2`, `XC-1` |
| FR-12 | `SF-7` | FR-54 | `BCG-002`, `BCG-011` → `KF-1` |
| FR-13 | `BCG-017`, `BCG-014` → `SF-11`; `BCG-008`, `BCG-014` → `KF-4` | FR-55 | `BCG-002`, `BCG-012` → `KF-1` |
| FR-14 | `SF-1`, `SF-7`, `XC-2` | FR-56 | `KF-1`, `XC-4` |
| FR-15 | `KF-2`, `SF-5`, `XC-2` | FR-57 | `KF-1`; context assembly is `BO` |
| FR-16 | `KF-2`, `XC-1` | FR-58 | `BO`; visible failures use `XC-6` |
| FR-17 | `KF-2`, `XC-7` | FR-59 | `BO`; citations surface in `SF-10` |
| FR-18 | `SF-1`, `SF-5`, `SF-7`, `XC-3` | FR-60 | `BCG-012` → `KF-1`, `XC-3`, `XC-4` |
| FR-19 | `SF-5`, `XC-2` | FR-61 | `BCG-012` → `KF-1`, `XC-4`, `XC-6` |
| FR-20 | `SF-1`, `XC-1`, `XC-2` | FR-62 | `BCG-012` → `KF-1`, `XC-4` |
| FR-21 | `SF-1`, `XC-6` | FR-63 | `BCG-004` → `KF-1`, `SF-4` |
| FR-22 | `BCG-001` → `KF-1`, `SF-1`, `XC-2` | FR-64 | `BO`; resulting failures use `KF-1`/`XC-6` |
| FR-23 | `BCG-001`, `BCG-003`, `XC-1`, `XC-2` | FR-65 | `BO`; suggestion and safety copy use `SF-6` |
| FR-24 | `BCG-001` → `KF-1`, `SF-1`, `XC-2` | FR-66 | `BCG-013` → `SF-6`, `XC-1` |
| FR-25 | `KF-1`, `XC-2` | FR-67 | `SF-6`, `KF-3`, `XC-1` |
| FR-26 | `BCG-009` → `SF-1` | FR-68 | `SF-6`, `KF-3` |
| FR-27 | `BCG-009` → `SF-1`, `SF-3`, `XC-2` | FR-69 | `BCG-016` → `SF-6`, `KF-3`, `XC-4` |
| FR-28 | `BCG-009` → `SF-1`, `SF-3`, `XC-4` | FR-70 | `BCG-014` → `SF-6`, `KF-3`, `XC-7` |
| FR-29 | `BCG-009` → `SF-1`, `XC-2` | FR-71 | `BCG-013` → `SF-6`, `KF-3`, `XC-4` |
| FR-30 | `BCG-009` → `SF-1`, `XC-2` | FR-72 | `SF-8`, `XC-6` |
| FR-31 | `BCG-009` → `SF-1`, `SF-3`, `SF-5`, `XC-2` | FR-73 | `SF-8`, `XC-6` |
| FR-32 | `BCG-008`, `BCG-010` → `SF-1`, `SF-5`, `KF-4`; sole-admin command is `BO` | FR-74 | `SF-5`, `XC-1`, `XC-4` |
| FR-33 | `SF-3`; MFA revalidation is `BCG-009` | FR-75 | `XC-7`; no data-export surface |
| FR-34 | `SF-9`; request: `BCG-013` → `SF-6`; `SF-5`, `XC-1` | FR-76 | `BCG-008`, `BCG-014` → `KF-4`, `XC-7` |
| FR-35 | `BCG-015` → `SF-3`, `XC-6`; MFA revalidation is `BCG-009` | FR-77 | `BCG-014` → `KF-4`, `XC-7` |
| FR-36 | `SF-3`, `KF-2`, `XC-3`, `XC-5` | FR-78 | `BO`; terminal UI uses `XC-7` |
| FR-37 | `BCG-011` → `KF-2`; `KF-4` | FR-79 | `KF-4`, `XC-1` |
| FR-38 | `KF-4`, `XC-7`; supervisor removal is `BCG-014` | FR-80 | `XC-1`, `XC-2`, `XC-5` |
| FR-39 | `BCG-011` → `KF-2` | FR-81 | `KF-3`, `SF-3`, `XC-5` |
| FR-40 | `BCG-011` → `KF-2`, `KF-1`, `XC-4` | FR-82 | `XC-6` |
| FR-41 | `BCG-011` → `KF-2`, `XC-4` | FR-83 | `KF-4`, `KF-2`, `XC-6` |
| FR-42 | `BCG-014` → `KF-2`, `XC-7` | FR-84 | `BO`; authorized state uses `XC-6` |

## Non-Functional Requirements

| ID | Mapping | ID | Mapping |
| --- | --- | --- | --- |
| NFR-1 | `BCG-003`, `BCG-005`, `XC-1` | NFR-12 | `BO`; visible bound failures use `XC-6` |
| NFR-2 | `BCG-007`, `XC-1` | NFR-13 | `BCG-007`, `XC-3` |
| NFR-3 | `XC-1`, `XC-5` | NFR-14 | `BO` |
| NFR-4 | `BO`; frontend bearer handling uses `XC-2` | NFR-15 | `BO`; visible failures use `XC-6` |
| NFR-5 | `BO`; operator disclosure has no app action | NFR-16 | `BO`; recovery uses `KF-1` |
| NFR-6 | `BCG-007`, `XC-1`, `XC-2` | NFR-17 | `XC-6` |
| NFR-7 | `BO` | NFR-18 | `XC-4`, `XC-6` |
| NFR-8 | `BCG-005`, `XC-2`, `XC-5`; local commands are `BO` | NFR-19 | `BO` |
| NFR-9 | `XC-1`, `XC-4` | NFR-20 | `BO` |
| NFR-10 | `SF-1`, `SF-3`, `SF-7`, `XC-4` | NFR-21 | `BO` |
| NFR-11 | `BO`; visible cooldowns use `XC-4` | | |

## Acceptance Scenarios

The scenario wording below is preserved verbatim from the backend PRD.

1. `AS-1` — An administrator creates a course with supervisors; without a supervisor assignment they cannot reach
   student-private material. Mapping: `KF-4`, `XC-1`.
2. `AS-2` — A supervisor prepares and activates a course only after goals, instructions, language, and approved
   material exist. Mapping: `BCG-011` → `KF-2`.
3. `AS-3` — Revoking material approval immediately blocks student access and tutor retrieval. Mapping: `KF-2`, `XC-1`.
4. `AS-4` — A student uploads private material, uses it unapproved, and later deletes it without deleting completed
   chats. Mapping: `SF-2`.
5. `AS-5` — Assigned supervisors can inspect that private material and session history; mentors and unrelated users
   cannot. Mapping: `SF-2`, `SF-4`, `XC-1`.
6. `AS-6` — An intent-only session start leads the tutor to discover authorized material, request a bounded excerpt,
   and cite its location. Mapping: `SF-10`; retrieval authorization is `BO`.
7. `AS-7` — MIA rejects model requests for unapproved, non-ready, cross-course, or other-student material. Mapping:
   `BO`; visible safe failure is `KF-1`, `XC-1`.
8. `AS-8` — No second session can start while one is active — including from a second device.
   Mapping: `BCG-002` → `KF-1`.
9. `AS-9` — Users in different time zones see the same instant rendered in their own zones. Mapping: `KF-3`, `XC-5`.
10. `AS-10` — Provider and processing failures stay visible; nothing ever looks successful when it was not. Mapping:
    `XC-6`.
11. `AS-11` — No new mentoring request is possible without an assigned mentor; existing triaged work stays visible.
    Mapping: `BCG-013` → `SF-6`.
12. `AS-12` — Disabling `mentoring_requests_allowed` blocks new requests without cancelling existing work. Mapping:
    `BCG-013` → `SF-6`, `SF-9`.
13. `AS-13` — Mentor removal returns open work to triage without losing the topic or the immutable prior response.
    Mapping: `BCG-014` → `SF-6`, `KF-3`, `XC-7`.
14. `AS-14` — Unauthenticated throttling never reveals account or invitation existence. Mapping: `SF-1`, `SF-7`,
    `XC-1`.
15. `AS-15` — Login failures cause temporary throttling, never permanent lockout. Mapping: `SF-1`, `XC-4`.
16. `AS-16` — Student deletion removes operational data everywhere; only a content-free audit record remains. Mapping:
    `BCG-014` → `KF-4`, `XC-7`.
17. `AS-17` — Course deletion removes course-scoped data; accounts and other-course data survive. Mapping:
    `BCG-014` → `KF-4`, `XC-7`.
18. `AS-18` — A supervisor corrects a session summary without changing the chat; the correction is audited. Mapping:
    `BCG-004` → `SF-4`.
19. `AS-19` — A distress message gets supportive guidance with no automated alert and no monitoring claim. Mapping:
    `KF-1`, `SF-6`, `XC-5`.
20. `AS-20` — There is no public self-registration path. Mapping: `SF-7`; absence is part of `XC-1`.
21. `AS-21` — Bootstrap is unreachable remotely and unavailable once an administrator exists. Mapping: `BO`.
22. `AS-22` — A newly provisioned student must replace the temporary password before anything else. Mapping:
    `BCG-001` → `KF-1`, `SF-5`.
23. `AS-23` — A 12-character composition-free password is accepted; an equally long known-common password is rejected.
    Mapping: `SF-1`, `SF-5`, `SF-7`, `XC-3`.
24. `AS-24` — Browser sessions expire after 30 idle minutes and never exceed 12 hours. Mapping: `BCG-001`, `XC-2`.
25. `AS-25` — One account on two devices still holds only one concurrent tutoring session.
    Mapping: `BCG-002` → `KF-1`.
26. `AS-26` — Revoking the last material approval blocks new sessions without deactivation; re-approval restores them.
    Mapping: `BCG-011` → `KF-2`, `KF-1`.
27. `AS-27` — An administrator cannot delete an active course or one with an active session. Mapping:
    `BCG-014` → `KF-4`, `XC-7`.
28. `AS-28` — A supervisor sees active-session status but no messages until completion. Mapping: `SF-4`, `XC-1`.
29. `AS-29` — A tutoring session stays active through extended inactivity and keeps blocking a second session.
    Mapping: `BCG-002` → `KF-1`.
30. `AS-30` — A student resumes the same active session from another device without creating a second one. Mapping:
    `BCG-002` → `KF-1`.
31. `AS-31` — Neither supervisors nor administrators can finish a student's active session. Mapping: `SF-4`, `XC-1`.
32. `AS-32` — A provider failure after partial output preserves the failed response; an explicit retry links a new
    response without rewriting history. Mapping: `KF-1`, `XC-4`, `XC-6`.

## Supporting Flow Details

### SF-1: Priya recovers staff access and manages MFA safely

Priya is a mentor who forgot her password and later replaces her TOTP factor.

1. Priya submits her complete username and receives the same public outcome regardless of account or delivery state.
2. She opens the fragment-token reset link; the frontend removes the fragment before rendering or calling the API.
3. She chooses a policy-compliant password, signs in, and completes any restricted stage in backend-required order.
4. From MFA settings she verifies her current password and factor, then starts and verifies a replacement factor.
5. She records the ten recovery codes shown once and acknowledges departure risks on a shared device.
6. **Climax:** the replacement is authoritative, the old factor and codes are invalid, and no secret remains in
   app state.

Failure path: uniform recovery copy reveals nothing; expired or invalid challenges return to the safe entry. Provider
failure does not claim delivery. Reload reconstruction remains blocked by `BCG-001`; MFA state by `BCG-009`.

### SF-2: Lucía prepares, uses, and deletes private material

Lucía is a student adding a homework image to her course.

1. During an active tutoring session, Lucía opens Private material, creates a student-private draft, and adds at least
   one supported same-format file.
2. She reviews the authoritative file list and finalizes; processing remains distinct from ready and never needs
   approval.
3. After Refresh status reports ready, she returns to tutoring, selects the material, and sees its identity and brief.
4. After finishing the session, she returns to the material detail and requests deletion.
5. The confirmation states that source and brief are removed while completed chat and summary may retain quotations.
6. **Climax:** backend success removes the material and routes to the private-material list with terminal confirmation.

Failure path: upload ambiguity triggers file-list reconciliation and an explicit user decision, never a retry claim.
The user may accept the server list or start a warned new upload. Processing failure permits only backend-authorized
draft repair or re-finalization. Selection by an active session blocks deletion without changing state.

### SF-3: Marcus updates his staff profile and verifies a mobile number

Marcus is a supervisor configuring his profile for SMS MFA and local-time display.

1. Marcus edits only staff-writable profile fields; username, email, roles, ban, and password state remain read-only.
2. He submits a strict E.164 mobile and receives a pending verification challenge rather than an immediate profile
   change.
3. He enters the six-digit code or requests a bounded resend of the existing code without extending its expiry.
4. On success, the profile revalidates and explains that pending SMS factors were invalidated.
5. He may later remove the profile mobile; an active SMS factor keeps its immutable enrolled destination.
6. **Climax:** the authoritative profile shows the verified mobile state and current preferred locale and IANA zone.

Failure path: absent or failed ClickSend leaves the current mobile unchanged. Expiry, cooldown, reload recovery,
failure-count behavior after resend, and concurrent invalidation remain blocked by `BCG-015`; the UI never claims
whether
resend reset or preserved prior failures. Five failures or a concurrent supervisor-managed change requires a fresh
authoritative profile read.

### SF-4: Elena reviews a completed tutoring session and corrects its summary

Elena is an assigned supervisor reviewing Lucía's work after completion.

1. Elena opens Student oversight and sees only active-session status, start time, and last activity while work is
   active.
2. She cannot fetch or view messages, used material, or private content until the owning student finishes.
3. Once completed, she opens the immutable transcript, used material, summary, and follow-up within assigned scope.
4. She edits only summary and follow-up, reviews attribution, and submits without changing chat history.
5. **Climax:** the corrected values and supervisor attribution are authoritative and the transcript remains unchanged.

Failure path: scope loss clears protected content and exits safely. Missing-summary states and regeneration eligibility
must not be inferred from null fields; their UI remains blocked by `BCG-004`.

### SF-5: Elena performs a separate student security action

Elena is a supervisor helping a student-only account with access while sharing an assigned course.

1. Elena opens Student security separately from profile editing and revalidates student-only and shared-course scope.
2. For password recovery, she enters and confirms a temporary policy-compliant password and submits it once.
3. For lost MFA, `BCG-010` blocks the distinct reset that removes the factor and codes and forces fresh-login
   replacement until its mutation exists.
4. For conduct access, she uses the separate ban or unban action and reviews its effect on the student's active session.
5. **Climax:** backend state confirms exactly one action; secrets are gone and affected cookies fail on the next
   request.

Failure path: stale role, account, ban, or assignment state invalidates the confirmation and reveals no hidden account
detail. Staff accounts cannot be handled through student-only actions.

### SF-6: Pablo requests mentoring and Elena triages it

Pablo is a student who needs educational help after the AI tutor's meaningful attempts; Elena is his supervisor.

1. After the tutor's required educational attempts, `BCG-013` supplies whether Pablo may see Request mentoring from
   the combined course, setting, and mentor-assignment state.
2. He enters a topic and may propose one appointment instant, then submits an unassigned request.
3. Elena opens Mentoring triage and assigns one of Pablo's assigned course mentors before response or scheduling.
4. The request then enters Rosa's `KF-3` response and scheduling steps; existing work stays visible if new work is
   disabled.
5. **Climax:** Pablo sees the authoritative assigned or scheduled state without exposure of chat or private material.

Failure path: unavailable eligibility blocks only creation; existing work remains. A successful removal flow may say it
returned work to triage, but later reads use neutral Awaiting supervisor assignment. Direct reassignment preserves
details. Cancellation follows actor/state rules. Mentor completion follows `BCG-016` prevalidation and reconciliation,
and mentoring is never presented as emergency support.

### SF-7: Diego manages a staff invitation through its lifecycle

Diego is an administrator inviting a new supervisor; the same scoped rules apply to authorized mentor inviters.

1. Diego creates an invitation for an unregistered email and sees its authoritative pending state.
2. The invitee previews only MIA and the invited role, then chooses credentials and required profile fields.
3. After acceptance, the invitee signs in explicitly; only authenticated current-account state exposes granted roles.
4. Diego may resend a pending invitation, knowingly rotating the token, or revoke it through the state-dependent delete.
5. **Climax:** list and detail agree on pending, accepted, revoked, or faulty without implying an unconfirmed delivery.

Failure path: token holders receive one invalid-invitation result for revoked, faulty, accepted, and unknown tokens. A
faulty invitation can be physically deleted, while accepted/revoked deletion is rejected. SMTP ambiguity is blocked by
`BCG-006`; atomically preserving the reviewed Revoke or Delete faulty intent is blocked by `BCG-014`. The 2026-10-07
Story 3.1 decisions (`BACKEND-CONTRACT-GAPS.md` §BCG-006, §BCG-014) lift both for supervisor-invitation create,
resend, and pending Revoke; Delete faulty stays blocked.

### SF-8: Pablo requests and revisits generated speech

Pablo is a student requesting audio for one completed tutor response with a configured voice.

1. Pablo activates Request speech only for an eligible completed response.
2. The control distinguishes voice missing, service unavailable, generating, available, failed, and expired.
3. When available, he plays or downloads the MP3 while the original text remains present.
4. If retained audio expires, the player is removed and a new authorized request may regenerate it.
5. **Climax:** audio and text identify the same completed response and no state implies retention was extended by
   access.

Failure path: failed or interrupted responses are ineligible. Provider failure remains failed until explicit request;
authorization loss removes media and revokes local object URLs.

### SF-9: Elena updates a student-only account's non-security profile

Elena is an assigned supervisor tailoring Lucía's global student profile for future tutoring.

1. Elena opens Lucía's profile from a shared assigned course and confirms that the account is student-only.
2. She edits only the authorized non-security fields, including student AI instructions and mentoring permission.
3. If she sets or clears mobile, the value is immediate and invalidates pending mobile challenges and SMS factors.
4. She reviews that the change affects Lucía's global profile and therefore every course, then submits.
5. **Climax:** the authoritative profile shows the corrected values without exposing password, MFA, role, or ban edits.

Failure path: a concurrent staff-role grant or loss of shared-course scope rejects the update, clears protected data,
and does not expose whether an out-of-scope account exists. An active SMS factor retains its enrolled destination.

### SF-10: Pablo learns from tutor-discovered authorized material

Pablo is a student starting tutoring with an intent but no selected material.

1. Pablo starts one session in a joined active course and writes only, "Let's learn vocabulary."
2. The tutor clarifies his intent; MIA performs local search and every retrieval authorization on the backend.
3. The tutor receives only bounded excerpts from qualifying course-wide or Pablo-owned private material.
4. The transcript identifies the material and cites its chapter or section without calling OCR position a printed page.
5. **Climax:** Pablo follows the cited source while Used material records only content sent to the model.

Failure path: rejected unapproved, non-ready, link-only, cross-course, or other-student retrieval never exposes hidden
material. The tutor continues or fails safely without presenting a forbidden source as used.

### SF-11: Elena grants mentor role by exact user ID

Elena is a supervisor granting an additional permanent mentor role to a registered staff account.

1. Elena opens the dedicated Prepare route without receiving the administrator account collection or account detail.
2. She enters one exact opaque user ID; no search, suggestion, autocomplete, pagination, or partial match is available.
3. `BCG-017` resolves only a minimal eligible-target confirmation or the fixed unavailable result for unknown,
   ineligible, out-of-scope, and throttled input.
4. Elena reviews that the role is permanent and immediate. `BCG-014` binds that reviewed target state to one grant.
5. **Climax:** definitive success reports the mentor role as granted or already present without exposing other roles,
   assignments, profile fields, or administrator-only account metadata.

Failure path: denial, target ambiguity, stale target state, or an unknown mutation outcome never triggers directory
enumeration or automatic replay. BCG-017 blocks only this target-resolution and grant flow; existing mentoring work and
unrelated administrator-authorized account reads remain usable.

## Unmappable Source Requirements

No source identifier is unmapped. `FR-7`, parts of `FR-32`, `FR-58`, `FR-59`, `FR-64`, `FR-65`, `FR-78`, `FR-84`,
and backend-only NFRs are intentionally classified `BO`, not omitted. Every ledger blocker is mapped; affected
flows cannot be implemented faithfully until OpenAPI and backend evidence close the named contract gaps.
