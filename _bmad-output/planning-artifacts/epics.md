---
name: MIA tutoring-first MVP delivery plan
updated: 2026-10-06
status: approved
source: sprint-change-proposal-2026-10-06.md
---

# MIA — tutoring-first MVP epics

## Delivery objective

Prove that a student can use MIA for tutoring with a supervisor-prepared course. Authentication and administration
support that journey; completing their entire release-one inventory is not the next milestone.

Owner authority: `tmp/epic-re-planning.md`, the instruction to apply the replan, and the explicit choice to use the
existing backend student-provisioning flow. Scope authority is the 2026-10-06 amendment in
`ux-designs/ux-mia-frontend-2026-09-12/FRONTEND-PRD-FOUNDATION.md`.

Execution order is Epic 2 → 3 → 4 → 5 → 6. Epics 7–9 are later work, not prerequisites for the tutoring demonstration.
**Next story: 2-1-basic-capability-driven-navigation.** No future story is marked ready-for-dev merely by this replan.

The dependency chain is deliberate: a supervisor joins before being assigned to a new course; a course is prepared and
active before that supervisor provisions students. Students then sign in and replace temporary passwords. There is no
administrator student-invitation endpoint and no anonymous student registration.

New students and supervisors use username/password without enrolling in MFA. Existing accounts that already have MFA
still follow the server's required challenge; no frontend bypass or automatic factor removal is introduced.

## Planning conventions

- Epic 1's completed story IDs and evidence are unchanged. Unstarted Epics 2–6 are reorganized below. The original
  backlog and acceptance criteria are preserved in `archive/epics-before-tutoring-mvp-2026-10-06.md`.
- Requirement IDs (`FFR`, `AD`, `AC`, `UXS`, `BCG`) and canonical routes are not renumbered. New story IDs supersede old
  unstarted story IDs; the change proposal contains their migration map.
- Use existing session, API, route, localization, and Tailwind Plus infrastructure. No authentication rewrite,
  new framework, generic workflow engine, or optional MFA expansion is required.
- Each feature owns its canonical route/resource/action gate and dependent reads as it lands, using the shared ordered
  gate. Story 2.2 covers common routing for existing surfaces, not speculative authorization for future surfaces.
- Escaped text through `UserText` is available now; the locked rich Markdown renderer is not. Story 4.4 implements the
  first needed AD-6 boundary, reused by 6.3. Earlier slices may use escaped text without claiming rich-rendering completion.
- Build only the controls needed for each outcome. Do not expose unfinished or unauthorized navigation destinations.
- Preserve authorization, no unsafe replay, truthful persisted/streamed state, sensitive-data handling, and usable
  keyboard/error/recovery paths. MVP scope reduction is not permission to weaken those boundaries.
- Verify the exact OpenAPI operations a story needs when preparing it. An open BCG entry blocks only its dependent
  operation; reconcile stale entries against current transport instead of requiring unrelated gaps to close first.
  No BCG is closed by this plan. Backend completion remains separately owned.
- Story 2.1's shared-session remediation is bounded to retrospective C1 and C3 below. Other demonstrated integration
  defects belong to the affected feature; an all-auth/MFA corrective batch is not a navigation prerequisite.
  Retrospective actions stay visible and are not silently marked done.
- Existing repository verification rules still apply. Proposed workflow optimizations require a separate rule change.

## Epic 1: Enter MIA — implemented foundation

All nine stories remain done in sprint tracking. The retrospective remains completed with a rejected acceptance verdict
and open corrective actions; this replan neither overrides that verdict nor requires restarting the epic.

### Story 1.1: Project scaffold with enforced architecture

Completed. Preserve the original story specification and verification evidence.

### Story 1.2: Localized anonymous entry

Completed. Preserve the original story specification and verification evidence.

### Story 1.3: Password sign-in with restricted-stage isolation

Completed. Reuse for the username/password MVP path.

### Story 1.4: MFA challenge and recovery-code sign-in

Completed. Retain for accounts that already have MFA; not required for the new MVP participants.

### Story 1.5: Forced password replacement

Completed. Reuse for provisioned students' first sign-in.

### Story 1.6: Password recovery and token reset

Completed. Retain implemented recovery behavior.

### Story 1.7: Invitation preview and acceptance

Completed. Reuse for supervisor onboarding.

### Story 1.8: Session lifecycle — idle warning, expiry shield, logout (BCG-001-gated closure)

Completed story evidence retained. Correct demonstrated shared-shell defects in the stories that reuse this behavior.

### Story 1.9: TOTP enrollment and recovery codes

Completed. Existing functionality remains; more MFA work is outside the tutoring-first critical path.

Epic 1's unchanged acceptance details are in its implemented specs and the historical epic baseline. Its original
coverage remains FFR-101..110, FFR-114..118, and FFR-208, subject to recorded partial-slice approvals.

## Epic 2: Navigate the application

Outcome: signed-in users can move around the implemented application safely. No full Home aggregation or profile project.

### Story 2.1: Basic capability-driven navigation

As a signed-in user, I want visible navigation to the actions I can use, so I can reach the working application.

- Given an authenticated account, when its current capability and scope checks succeed, then one shared shell exposes
  only authorized, implemented destinations, Home, and Sign out, with no role switcher.
- Given an anonymous or restricted session, when a protected destination is requested, then only the permitted focused
  flow renders; no shell or protected identity is exposed.
- Given shell use, when keyboard navigation, sign-out, or delayed Refresh followed by hiding occurs, then focus remains
  usable and content remains protected. Repair C1 hidden-during-recovery fencing and C3 logout-confirmation retry
  (`204 → confirmation unavailable → anonymous retry`) with focused regressions under the accepted logout contract.
- Given Home without implemented continuation data, when it renders, then it is a neutral entry surface with navigation,
  not a fabricated empty-work result, dashboard, metric, or comprehensive cross-role task aggregator.

Reuse `app/routes`, `SessionProvider`, `SessionLifecycle`, `HomeEntryRoute`, and the existing capability read. Bind the
application-shell blueprint. Coverage: FFR-201/206, NFR-3/16..19, AD-4/5/7, UX-DR12/45.
Other auth/MFA retrospective corrections are outside this story; their existing actions remain open.

### Story 2.2: Working routes and parent navigation

As a user, I want links, parent navigation, Back, Forward, and Reload to work on the implemented surfaces.

- Given an implemented route, when entering directly, returning through history, or reloading, then its ordered gate
  runs and restores only authorized state without repeating a mutation.
- Given a child surface, when leaving, then a visible parent/Home route is available and route-local protected state is
  cleared according to its contract; title precedes route announcement and heading focus.
- Given an unavailable route chunk or failed read, when it fails, then a localized recovery surface remains operable
  without a blank application or automatic unsafe retry.

Reuse shared route sequencing and recovery on existing surfaces only. Future features add their own canonical
`ROUTE-INVENTORY.md` paths, resource/action gates, and dependent reads under the planning convention above.
Coverage: FFR-207, AD-3/4/13, UX-DR44..46.

## Epic 3: Bring a supervisor into MIA

Outcome: the CLI-created administrator can invite a supervisor, who completes account setup and signs in without MFA.

### Story 3.1: Administrator invites a supervisor

As an administrator, I want to send and inspect a supervisor invitation so someone can prepare a course.

- Given invitation authority, when I submit a supervisor email, then one contracted invitation creation is sent and its
  persisted delivery/lifecycle result is displayed without claiming account creation or email receipt.
- Given the scoped invitation list/detail, when I inspect it, then I can distinguish pending, accepted, faulty, and
  revoked state and use only permitted explicit resend/revoke recovery with required current preconditions.
- Given uncertain delivery or mutation outcome, when it is reported, then I can deliberately reconcile without replay.
  Student, mentor, and additional-administrator invitation creation are not part of this slice.

Reuse `platform/api` and existing public acceptance. Coverage: FFR-801..804 invitation subset, FFR-116..118;
check BCG-006 and current invitation OpenAPI. Do not block on account-directory or jobs/audit surfaces.

### Story 3.2: Supervisor account setup and password-only entry

As an invited supervisor, I want to accept my invitation and enter MIA using my chosen username and password.

- Given a valid supervisor invitation, when I complete the existing acceptance flow and sign in, then account setup
  uses its required fields and reaches the authorized shell without any MFA-enrollment prerequisite.
- Given a fresh supervisor without MFA, when signing in, then the password-only journey succeeds; given an account with
  an existing factor, then its authoritative challenge is respected rather than bypassed.
- Given the new invitation-management UI, when testing its handoff, then the full administrator-to-supervisor journey
  works with the existing acceptance implementation, not a second registration flow.

Prerequisite: 3.1. This is a small handoff integration of completed Stories 1.3/1.7, reusing their fixtures and evidence;
repair only demonstrated integration defects. No acceptance/sign-in reimplementation or mandatory security setup.

## Epic 4: Prepare an active, teachable course

Outcome: an administrator assigns a joined supervisor; that supervisor uploads material, approves its brief, and activates
a usable course. This deliberately combines the prerequisite portions of the old course and material epics.

### Story 4.1: Administrator creates a course with a supervisor

As an administrator, I want to create a course and assign at least one existing supervisor.

- Given course-creation authority and an eligible joined supervisor, when I create a course, then it appears only after
  definitive backend success with at least one supervisor assigned.
- Given administrator account-collection authority, when selecting that supervisor, then a minimal selector uses
  `GET /api/v1/users` (`listAdministrationAccounts`) with `filter[role]=supervisor`, contracted account-state rules and
  bounded pagination. Selection does not replace authoritative assignment eligibility or creation validation.
- Given the administrator course list/detail, when I return or reload, then the persisted course and assignments are
  reachable. The assigned supervisor can discover that course in Prepare.
- Given no eligible supervisor, when creation is attempted, then the prerequisite is explained with a route to the
  invitation flow; the client does not guess eligible accounts or enumerate unauthorized data.

Coverage: FFR-301 and the course list subset of FFR-801. Defer deletion and assignment removal; retain backend rules.
Prerequisite/reuse: joined supervisor from 3.2 and existing API/session owners. New work includes the minimal selector
and `POST /api/v1/courses` using `CourseCreateRequestDocument`'s required `relationships.supervisors.data` (at least one
`UserIdentifier`). Check the relevant BCG-008 collection/filter/state/pagination slice against
`mia/api-doc/paths/users.yaml` and current course transport; the full account-directory UX remains later 9.5.

### Story 4.2: Supervisor edits course teaching fields

As an assigned supervisor, I want to edit the fields needed for activation and see what remains to prepare.

- Given my assigned course, when I open its preparation hub, then authoritative readiness identifies unmet prerequisites
  without percentages or invented completion scores. It may show all authoritative blockers but links only implemented
  destinations; upload and brief-resolution links arrive with 4.3 and 4.4 respectively.
- Given details, curriculum, learning goals, AI instructions, and language, when I save valid edits, then confirmed
  values and validation feedback are shown. Learning goals and AI instructions remain distinct.
- Given a denied or changed assignment, when accessing the course, then unauthorized content is not fetched or shown.

Coverage: FFR-302/304/305 and required-field portion of FFR-303. Logo/avatar work and rich template polish are later.
Use existing guided-field patterns; check BCG-011 against current readiness transport before dependent wiring.

### Story 4.3: Supervisor creates material and uploads files

As an assigned supervisor, I want to upload course-wide teaching material through a draft I can review.

- Given a material draft, when uploading with the native picker, then supported formats and limits precede selection,
  each file's progress/failure is visible, mixed-format constraints are enforced, and only persisted files enter review.
- Given an interrupted upload, when recovering, then only a deliberate contract-supported new attempt is offered;
  no unsafe replay or invented successful file exists.
- Given material lists and details, when leaving and returning, then saved drafts remain discoverable with the proper
  course scope. State the existing malware/external-fetch limitations accurately.

Coverage: course-wide portions of FFR-401..404, AD-14. `platform/transfer` currently contains only an ownership README:
this story implements the required upload transport there, reusing existing API/session owners for dispatch security,
epoch fencing and teardown. Add the preparation-hub upload link with the working surface. Student-private material and
drag-and-drop are deferred to 9.2; this milestone uses the native picker only.

### Story 4.4: Process material and approve its brief

As a supervisor, I want to finalize files, inspect processing, correct the brief, and approve the material for tutoring.

- Given a reviewed draft, when I explicitly finalize, then processing begins only after definitive success; waiting and
  failure use backend state and explicit Refresh, not polling or fabricated progress.
- Given a processed file, when I inspect and correct its brief, then untrusted content uses the locked renderer, and
  technical readiness and educational approval stay distinct.
- Given a ready brief, when I approve it, then the approved state is authoritative; changing approved content revokes
  approval according to backend behavior and requires a new deliberate approval.

Coverage: FFR-401/403/405. Use local provider fakes in automation; no paid provider calls from tests.
Prerequisite: 4.3's persisted material/files. As the first rich-content consumer, this story implements the minimal
required locked `platform/markdown` AD-6 boundary and its applicable security/accessibility fixtures, then uses it for
brief review and adds the hub's brief link. The current README/`UserText` is not that implementation. Reuse it in 6.3;
no separate infrastructure epic or unrelated renderer polish is included, and AD-6 is not weakened.

### Story 4.5: Activate the ready course

As a supervisor, I want to activate a course once it can support students and tutoring.

- Given the required fields, at least one supervisor, and approved ready file-backed course material, when readiness
  authorizes activation and I activate, then the persisted active state is shown.
- Given unmet prerequisites, when reviewing readiness, then each missing item has an actionable link; activation is
  unavailable and the client does not substitute local guesses for server eligibility.
- Given definitive activation success, when returning to the preparation hub, then authoritative active state is shown;
  this story ends there. Roster and provisioning entry are owned by 5.1 when that surface lands.

Coverage: FFR-302/303; BCG-011-dependent readiness must be reconciled to implemented transport.
Reuse readiness from 4.2 and approved material from 4.4. Deactivation/reactivation and deletion are deferred to 9.2.

## Epic 5: Get a student into the prepared course

Outcome: an assigned supervisor provisions a student; that student signs in with the chosen temporary password,
replaces it, and sees the joined course. No email invitation or MFA is required for this new student.

### Story 5.1: Supervisor provisions a student into the active course

As an assigned supervisor, I want to create a student with a username and temporary password and see the membership.

- Given my active course, when I provide the contracted student fields and temporary password, then one provisioning
  request creates the account/membership only after definitive success.
- Given credentials I chose, when completing or leaving the form, then they are not returned by the backend, retained,
  restored, logged, or automatically copied; I am told to communicate them outside MIA.
- Given the course roster, when returning or refreshing, then only authorized students appear with bounded pagination
  and no active transcript content. Inactive-course and denial outcomes do not leak student existence.

Coverage: FFR-503 and roster subset of FFR-504; `POST /courses/{id}/students` with `mode: provision`.
Adding an existing student to another course and support/security operations are later work.

### Story 5.2: Student first sign-in and joined-course entry

As a newly provisioned student, I want to set my own password and reach my course so I can start learning.

- Given a provisioned account without MFA, when I sign in using the temporary password, then the existing restricted
  replacement flow runs before any protected application content; no MFA enrollment is requested.
- Given successful replacement and complete authorization, when I enter Learn, then my joined-course list and course
  detail expose only authorized active-course actions and material metadata.
- Given later sign-in or reload, when I return, then my membership is discovered from backend state without provisioning
  again or implying a second account. A changed/denied membership gets the fixed safe presentation.

Reuse Stories 1.3/1.5. Coverage: FFR-101..103, student course discovery needed by FFR-601.

## Epic 6: Demonstrate student tutoring end to end

Outcome: a student starts, uses, resumes, and finishes tutoring with prepared material, then starts a second session.
This is the MVP milestone, not completion of every history, oversight, or speech feature.

### Story 6.1: Start or resume the student's tutoring session

- Given a joined eligible course, when the student starts with optional approved material, then one authoritative
  session is created using `client_request_id` and optional material relationships from
  `TutoringSessionCreateRequestDocument`. Start carries no intent or message content and never implicitly sends.
  Existing active work leads to discovery/resume, not a second session.
- Given backend start denial or ambiguity, when handling it, then no session is fabricated and no unsafe request is
  repeated. Cross-course active-session discovery follows BCG-002 and start readiness follows BCG-011.
- Given the workspace, when entering, then fixed localized copy explains AI tutoring, no live human monitoring, and
  supervisor access after completion. The deliberate first composer send, free text, and static starters belong to 6.2.

Coverage: FFR-601/602/610..613 entry subset. Reuse session/API owners and canonical Learn/session routes; this story
creates/discovers/resumes and may show escaped persisted text. Rich transcript integration belongs to 6.3 using 4.4's
boundary. The complete UX remains `EXPERIENCE.md` Flow 1: starters never auto-submit; Pablo sends through the composer.

### Story 6.2: Send messages and show the single queued message

- Given an active session from 6.1, when the student deliberately sends the first composer message or a subsequent one,
  then one immutable payload/request identity is submitted and only authoritative persisted or streamed state renders.
  Free text is available; localized static starters insert editable text or guide selection, never auto-submit.
- Given an ongoing answer, when a message is queued, then the single queued state is distinct; no second generation
  or additional queued message is invented. Enter inserts a newline and Send/Queue is visibly labelled.
- Given network ambiguity, when displaying the result, then it is outcome unknown with explicit reconciliation and
  no automatic replay.

Coverage: FFR-601 and state machines §1–2; AD-2/12. This is a real backend send path, not a chat mockup.
This story owns BCG-012/current-work integration from first send: reconcile `getTutoringSessionCurrentWork` for
authoritative queue capacity/action eligibility and ambiguous-send results using the retained request identity.
Never infer idle/capacity or absence from transcript pagination. Reuse this integration in 6.4/6.5, not a finish-only
dependency; validate the exact needed contract before wiring it. Escaped text is sufficient until 6.3's rich stream UI.

### Story 6.3: Stream answers without disrupting reading

- Given a generating answer, when snapshot/events arrive, then the authorized feature-owned stream applies current
  epochs only and renders through the locked Markdown boundary, with stable turn identity and bounded updates.
- Given reading earlier content, when new text arrives, then focus and scroll position are preserved; a visible action
  reaches unseen content. Announcements describe transitions rather than speaking every token.
- Given terminal completion, when reconciling, then backend persisted content replaces the incremental representation.
- Given stream loss, when detected, then close the connection and fence its epoch immediately; no browser-native or
  application automatic reconnect is allowed from this first streaming slice. Explicit recovery controls arrive in 6.4.

Coverage: FFR-607..609, AD-6/8, UX-DR47/64/75. Reuse 4.4's locked renderer and extend its fixtures for streaming/chunk
boundaries. Current `mia/api-doc/schemas/resources/resources.yaml#/TutorResponseEventStream` already defines snapshot,
event payloads, and a heartbeat comment after 15 seconds without an event. Check exact remaining event identity/ordering,
authorization and stream-health requirements against current transport; resolve only evidenced gaps, never guess them
or describe the heartbeat/snapshot contract as absent.

### Story 6.4: Recover, stop, and deliberately retry tutoring work

- Given stream loss or tab-return/lifecycle signals, when observed, then mark revalidation needed and retain the required
  shield; signals are notification-only and send no authenticated request or replacement stream.
- Given explicit Refresh/Try now, when recovering, then fresh ordered session, capability/scope, route-resource and
  current-work checks precede draft reveal and at most one new stream epoch. Sign-in recovery and reload discover the
  same session through their permitted entry gates without duplicate messages, sessions, or provider work.
- Given a running answer, when Stop is activated, then persisted partial content/history remain; a retry is explicit.
- Given reconnect availability, when Try now is activated, then one contracted access cycle and stream epoch begins;
  timers never reconnect or renew sign-in automatically.

Coverage: FFR-602/607/608, UX-DR63/66, no-replay invariant. Preserve working lifecycle infrastructure, repair only
demonstrated integration defects. A tutoring session does not expire from inactivity.

### Story 6.5: Finish and show the completed transcript

- Given no generating response or queued message and authoritative finish eligibility, when the student finishes, then
  the completed state and persisted transcript render only after definitive success.
- Given work in flight or denied eligibility, when viewing Finish, then it remains unavailable; no force-finish,
  abandonment, discard, or delete-session substitute exists.
- Given a finished session, when returning, then it accepts no new messages; starting the next permitted session is
  possible. Summary pending/failure is distinguished from session completion if summary metadata is shown.

Coverage: FFR-603..605 and completed-transcript subset of FFR-601; BCG-012 for authoritative work/finish actions.
Full learning-history browsing, summary regeneration, and supervisor correction remain later scope.

### Story 6.6: Prove the complete tutoring journey

- Given the built frontend served by the backend and a controlled operator-approved setup, when an administrator invites
  a supervisor, that supervisor joins and prepares a course, provisions a student, and the student completes setup,
  then the student can tutor, finish, and begin a second session through the UI without database edits or ad hoc curl.
- Given automated verification, when running the same functional chain, then local SMTP/provider fakes supply deterministic
  outcomes; automated tests never call paid or production providers. Separately record an operator-run real deployment
  demonstration if authorized; a mocked UI alone is not proof of working frontend/backend integration.
- Given an interruption or another user's scope, when exercising recovery/denial, then there is no unsafe replay or
  unauthorized educational content. Report remaining release evidence honestly rather than asserting perfect software.

This milestone may record nonblocking defects. It cannot claim success without a usable student tutoring session.
Reuse accumulated story evidence and existing fixtures; add one backend-connected chain and focused integration
recovery/denial evidence. Do not repeat every auth suite or Epic 10 release-evidence matrix as new story work; required
repository checks still apply, and the broader release evidence stays in Epic 10.

**Owner decision, 2026-10-13 (Story 6.6 only):** Set aside the automated real-backend test requirement, including the
backend-served setup, backend-connected chain, and "mocked UI alone is not proof" clause, for this milestone. Prove one
consolidated UI journey with existing local-fake E2E infrastructure and focused fake-backed recovery/denial evidence;
record explicitly that real frontend/backend integration is **not proven**. The operator-run real-deployment demonstration
is not authorized and is **not performed**. This exception does not change the remaining story scope or Epic 10 release
evidence obligations.

## Epic 7: Course preparation clarity

Assigned supervisors see at a glance what blocks activation and act on it; the readiness review and activation
confirmation explain themselves. Presentation only, on top of Stories 4.2 and 4.5. Added by sprint change proposal
2026-10-14 (`sprint-change-proposal-2026-10-14.md`); the redesign package `tmp/course-preparation-redesign/` carries
the binding state model (HUB-1..6, RDY-1/2, ACT-1..7), UX specification, backend-contract evidence and copy deck.

### Story 7.1: Status-first preparation hub

As an assigned supervisor, I want the preparation hub to tell me first where my course stands and what to do next, so
that I can prepare and activate it without hunting through equal-looking buttons.

- Given an `inactive_incomplete` course with two reported blockers, when the hub loads, then the amber status panel
  reads "2 items block activation", the section "Blocking activation" lists exactly those two blockers in server order
  with one action each, and no activation entry is shown.
- Given a reported `supervisor_presence` blocker, when it renders, then it shows administrator guidance and no link or
  button.
- Given an `inactive_activatable` course with `activation.eligible = true` and no lifecycle instants, when the hub
  loads, then the indigo panel offers "Review and activate", which opens the readiness review.
- Given an eligible course with `activated_at` or `deactivated_at` set, when the hub loads, then the gray panel
  explains that reactivation is not available on this surface and no activation entry exists.
- Given an `active_accepting` course, when the hub loads, then the green panel shows the activation instant and the
  students card reads "Create student accounts or add existing students."
- Given an `active_not_accepting` course, when the hub loads, then the amber panel states that sessions in progress
  continue and the blockers appear under "Blocking new tutoring sessions".
- Given the course read returns `503 course_readiness_unavailable`, when the hub renders, then no course name, field
  value, state pill or entry card appears, the breadcrumb ends in Course preparation, and "Check again" repeats the
  read in the current admission epoch.
- Given any state with course data, when the course setup renders, then each row shows the persisted value or its
  empty text, and the blocker badge appears only for server-reported blocker IDs.
- Given the course setup list, when the course language row renders, then it shows the display name in the interface
  language and the stored BCP 47 tag, for example "English (en)".
- Given the hub loads, when network traffic is inspected, then only the course read is requested; no material, student
  or supervisor collection is read.
- Given a viewport of 390 CSS pixels, when the hub renders, then setup rows stack and nothing scrolls horizontally.

Covers CPR-FR-01..08 and CPR-NFR-01..07 from the redesign package; states HUB-1..6.

### Story 7.2: Readiness review and activation confirmation

As an assigned supervisor, I want the readiness review and the activation confirmation to explain what is missing,
what activation changes and what happened to my attempt, so that I activate deliberately and never misread an outcome.

- Given an inactive course with `activation.eligible = false`, when the readiness review loads, then it shows
  "Activation unavailable", the unmet prerequisites with their actions, and the static explanation without any status
  icons or checkmarks.
- Given an eligible first activation, when the readiness review loads, then "Continue to activation" opens the
  activation confirmation.
- Given the activation confirmation, when it loads in ACT-1, then it shows course, current state, "None reported", the
  three "What changes" items, Cancel and Confirm activation.
- Given the supervisor confirms, when the pre-dispatch read runs or the request is in flight, then Confirm activation
  is disabled and the status text matches ACT-2 or ACT-3.
- Given the pre-dispatch read returns changed facts, when the form re-renders, then the alert "Course facts changed"
  appears, the changed row carries the badge Changed, and no request is sent until the supervisor confirms again.
- Given a `409` response, when it arrives, then the red alert appears with "Review current readiness" and technical
  details, and no form is shown.
- Given a lost response, an undeclared `5xx` or Stop waiting, when the attempt ends, then the amber unknown-outcome
  alert offers Refresh course and Abandon unknown attempt, and nothing is retried automatically.
- Given a validated `200` response, when it arrives, then the app navigates to the hub, which shows HUB-4 or HUB-5
  from its own read, and success is announced once.

Covers CPR-FR-08..11; states RDY-1/2 and ACT-1..7. Depends on 7.1 for the shared status panel and blocker card.

### Story 7.3: Move the build identifier into the sidebar footer

As any signed-in user, I want the build identifier out of the page content, so that content pages carry only course
and account information.

- Given any authenticated application surface, when the shell renders, then the build identifier appears in the
  sidebar footer and no longer below the page content.
- Given a narrow viewport, when the shell renders, then its existing narrow-width behavior is preserved.

Application-shell presentation change only; no route, capability or content change.

## Epic 8: Mentoring — after the tutoring milestone

Deferred in its entirety; no mentor invitations, assignment UI, or mentoring controls are prerequisites for Epics 2–6.
Keep existing backend data/permissions intact. Original acceptance details remain in the historical baseline.

### Story 8.1: Request mentoring
### Story 8.2: Triage and assign requests
### Story 8.3: Respond and schedule
### Story 8.4: Reschedule, cancel, complete (BCG-016-gated closure)
### Story 8.5: Grant the mentor role (BCG-017-blocked)

## Epic 9: Deferred supporting surfaces and operations

After the tutoring milestone; these are backlog scope, not ready implementation specs. Reuse the original acceptance
contracts for each retained slice; refine when selected rather than designing them all before tutoring works.

### Story 9.1: Complete Home aggregation and profile surfaces

Full continuation/attention aggregation, student read-only profile, staff profile editing and mobile/avatar support.
Original 2.2/2.4/2.5; preserve FFR-111..113/202..205 when these surfaces are built.

### Story 9.2: Extended course and material management

Logos, supervisor relationship removal, course deactivation/reactivation and deletion, private student materials,
download/deletion, and drag-and-drop/upload enhancements. Original 3.3/3.5, remaining 3.4 lifecycle scope and remaining
4.1..4.5; BCG-014 still gates consequential mutations.

### Story 9.3: Student support and supervisor oversight

Add existing student by exact username; profile/security support, membership removal, session-status oversight,
completed transcripts and summary correction. Original 5.2..5.5; never show active chats to supervisors.

### Story 9.4: Learning history and optional speech

Full history browser, summaries, follow-ups and speech controls. Original 6.7 speech portion and 6.8;
basic completed transcript already belongs to new 6.5.

### Story 9.5: Account administration and operational tools

Broader account/role management, non-supervisor invitations, course administration beyond creation, jobs and audit.
Original 8.1..8.4 minus the supervisor invitation/course creation subsets moved earlier.

### Story 9.6: Additional MFA management and remaining auth follow-up

Optional replacement, disable, SMS/mobile prerequisites and remaining MFA-specific retrospective follow-up.
No role-based enrollment requirement. Preserve implemented flows and record real security issues; do not use this
deferral to bypass a factor already required by the server.

## Epic 10: Complete release evidence

Formal release readiness follows the functional demonstration; checks required for implemented stories still run as they
are built. The tutoring milestone is not a claim that every original release-one surface or manual criterion is complete.

### Story 10.1: Performance harness and budget evidence
### Story 10.2: Accessibility evidence matrix
### Story 10.3: Localization and reflow release checks
### Story 10.4: Security acceptance suites
### Story 10.5: Manual release evidence

Original detailed acceptance remains in the historical baseline and binding companions. No existing release/security
gate is waived. Deferred BCG work blocks its dependent feature, not every independent story in this plan.

## Requirement coverage after replanning

- FFR-101..110/114..118/208: completed Epic 1, reused by 3.2 and 5.2; later MFA expansion in 9.6.
- FFR-201/206/207: Epic 2. FFR-202..205 and FFR-111..113: later 9.1.
- FFR-301..305: Epic 4's teaching/activation subset; remaining lifecycle/logos/destructive management in 9.2.
- FFR-401..405: Epic 4's course-wide upload/processing/approval subset; private/download/delete extensions in 9.2.
- FFR-503 and scoped roster: Epic 5. Remaining FFR-501/502/504..506 support/oversight in 9.3.
- FFR-601..613: Epic 6's core session/safe reading/recovery/completion subset; optional speech and full history in 9.4.
- FFR-302/303 presentation refinement (status-first hub, explanatory readiness review and
  activation confirmation): Epic 7, on top of Epic 4's implemented behavior.
- FFR-701..705: Epic 8, later. FFR-801..804: Epic 3 and 4 minimum administration, remaining operations in 9.5.
- FFR-951..956 and cross-cutting NFR/AD/AC obligations: applied to implemented paths; comprehensive release evidence
  in Epic 10. Unimplemented later surfaces are not recorded as tested or complete.
