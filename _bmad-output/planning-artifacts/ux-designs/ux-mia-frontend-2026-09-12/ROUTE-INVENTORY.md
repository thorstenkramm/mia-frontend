---
name: MIA Frontend Route Inventory
status: draft
sources:
  - EXPERIENCE.md
  - SURFACE-STATE-MATRIX.md
  - FRONTEND-PRD-FOUNDATION.md
updated: 2026-09-13
---

# MIA Frontend Route Inventory

## Contract

This inventory binds every concrete surface in `EXPERIENCE.md` and `SURFACE-STATE-MATRIX.md` to its canonical
client-side location. It defines browser routes only. It does not define, imply, or guess backend routes, methods,
schemas, capability field names, or authorization responses. Those remain owned by the implemented OpenAPI contract.

There are 128 surface mappings below. Multiple surface regions may intentionally share one page path. For example, the
tutoring transcript, composer, queue, and connection state belong to one workspace route. A shared path is not an alias.
No route aliases are required for release one.

Every parameter value is an opaque backend-issued identifier. Parameter names describe only the client-side resource
type: `courseId`, `materialId`, `sessionId`, `studentId`, `requestId`, `accountId`, `invitationId`, and `jobId`. Values
must never be derived from or replaced by names, usernames, topics, filenames, email addresses, mobile numbers, message
content, or other protected content. Query strings, fragments, and `history.state` follow the same prohibition.

For every mapping, the title pattern is `<localized route title> | MIA`. The listed title is a localization message, not
literal fixed English. The `h1` has the same localized subject but may use longer purpose-focused wording. Protected
names may appear only after the complete protected-mount gate succeeds. Before that point, the title is `MIA`, the h1 is
the localized equivalent of `Checking access`, and no protected route identity, breadcrumb, or scope is exposed.

The gate labels below are semantic frontend requirements, not proposed backend capability strings:

- `Public` requires no authenticated session.
- `Token` requires a route-local invitation or reset token captured from the fragment.
- `Restricted` requires the named authoritative authentication stage and exposes only that flow plus logout.
- `Learn`, `Prepare`, `Mentor`, `Administer`, and `Profile` require an authenticated session plus the corresponding
  current capability and complete scope from authoritative discovery.
- A scope in parentheses is conjunctive. Resource and action authorization must succeed before dependent data mounts.

Public invitation and reset links use only `#token=<canonical-lowercase-UUID-v4>`. Synchronous pre-application bootstrap
reads the fragment at most once and removes the complete fragment with `history.replaceState` before router startup,
React mount, API work, diagnostics, or optional scripts. Unknown, malformed, uppercase, duplicate, and additional
fragment data is also removed. A valid token survives only in the route-local ephemeral flow object.

Restricted-stage paths contain no protected destination, resource identity, return path, or scope in the path, query,
fragment, or `history.state`. Authentication completion uses authoritative capability and scope discovery to select
Home or the still-active tutoring session; it never restores a protected route identity retained by a restricted flow.

`Fallback` is the terminal or safe client destination after protected state has first been synchronously cleared.
Unknown, denied, deleted, revoked, ineligible, and out-of-scope sensitive resources receive the one fixed
existence-hidden treatment before navigation. Physical deletion redirects only after definitive backend success. An
unknown mutation outcome remains on its owning route without success copy until explicit authoritative reconciliation.

## Public Entry

### Login

- Path: `/login`
- Parent: none
- Title: `Sign in`
- H1 purpose: sign into MIA without public-registration language.
- Gate: `Public`; an authenticated or restricted stage is dispatched without exposing protected identity.
- Fallback: `/login`; confirmed authentication continues through authoritative stage and access discovery.

### Recovery

- Path: `/login/recovery`
- Parent: `/login`
- Title: `Recover access`
- H1 purpose: request the uniform staff password-recovery response.
- Gate: `Public`.
- Fallback: `/login` after the uniform accepted result or cancellation.

### Reset

- Path: `/password-reset#token=<token>` on entry, synchronously normalized to `/password-reset`. This is the path the
  backend emails (Story 1-6 decision, `BACKEND-CONTRACT-GAPS.md` §BCG-001).
- Parent: `/login`
- Title: `Reset password`
- H1 purpose: replace a password using the captured reset token.
- Gate: `Public + Token(reset)`. A link opened in stage `mfa`, `password-change`, or `authenticated` shows only the
  focused sign-out-first interstitial on this path; Go back drops the token and dispatches to the current stage.
- Fallback: no automatic redirect. Success stays on `/password-reset` with an explicit Sign in action to `/login`. The
  one uniform invalid-or-unusable result, shared by every unusable token and by a missing or lost token, offers
  `/login/recovery` and `/login`. Outcome unknown offers `/login` and `/login/recovery`.

### Invitation Preview

- Path: `/invitation#token=<token>` on entry, synchronously normalized to `/invitation`.
- Parent: `/login`
- Title: `Invitation`
- H1 purpose: preview the invited role without exposing invitation identity.
- Gate: `Public + Token(invitation)`.
- Fallback: `/login` for the fixed invalid or unavailable result.

### Invitation Acceptance

- Path: `/invitation/accept`
- Parent: `/invitation`
- Title: `Accept invitation`
- H1 purpose: create credentials and required profile values for the invited role.
- Gate: `Public + Token(invitation)` retained only by the active invitation flow.
- Fallback: `/login` after success, rejection, token ambiguity, or explicit abandonment.

## Restricted Login

### MFA Challenge

- Path: `/auth/mfa`
- Parent: none; the only alternate action is restricted logout.
- Title: `Verify sign-in`
- H1 purpose: complete the authoritative MFA challenge.
- Gate: `Restricted(mfa)`.
- Method-neutral: one six-digit code field plus the recovery-code path; no factor inference or Resend control.
- Fallback: `/login` on expiry or logout; the next stage is selected authoritatively.

### MFA Recovery Code

- Path: `/auth/mfa/recovery`
- Parent: `/auth/mfa`
- Title: `Use a recovery code`
- H1 purpose: verify sign-in with one unused recovery code.
- Gate: `Restricted(mfa)`.
- Entry normalization: remove hyphens and whitespace and apply ASCII uppercase before local wire-pattern validation.
- Fallback: `/auth/mfa` for a correctable result, otherwise `/login` on expiry or logout.

### Required Password Replacement

- Path: `/auth/password-change`
- Parent: none; the only alternate action is restricted logout.
- Title: `Choose a new password`
- H1 purpose: replace the required temporary or invalidated password.
- Gate: `Restricted(password-change)`.
- Fallback: `/login` on expiry or logout; completion enters fresh access discovery.

### Restricted Logout

- Path: `/auth/logout`
- Parent: the active restricted route.
- Title: `Sign out`
- H1 purpose: confirm or safely recover restricted-stage logout.
- Gate: `Restricted(mfa or password-change)`.
- Fallback: `/login` only after logout confirmation under `SECURITY-PRIVACY-ACCEPTANCE.md` §Logout and Privacy Screen
  (`204` plus subsequent independent anonymous discovery); otherwise remain on the privacy screen. A detected late
  authentication transition returns to that shield for explicit reconciliation, not protected navigation.

## Home

### Authorized Continuation

- Path: `/`
- Parent: none
- Title: `Home`
- H1 purpose: continue the highest-priority authorized work.
- Gate: `Authenticated + current capabilities + complete scope`.
- Fallback: `/login` on sign-in loss; otherwise remain at `/` with changed-capability state.

### Attention Items

- Path: `/`
- Parent: none
- Title: `Home`
- H1 purpose: expose authorized attention items within Home without becoming a dashboard.
- Gate: `Authenticated + current capabilities + complete scope` for each returned item.
- Fallback: `/` after stale or lost item scope; `/login` on sign-in loss.

## Learn Courses

### Joined Courses

- Path: `/learn/courses`
- Parent: `/`
- Title: `Courses`
- H1 purpose: choose from the student's joined active courses.
- Gate: `Learn(courses)`.
- Fallback: `/`.

### Course Detail

- Path: `/learn/courses/:courseId`
- Parent: `/learn/courses`
- Title: `Course`
- H1 purpose: show one authorized joined course and whether it accepts a new session.
- Gate: `Learn(course :courseId)`.
- Fallback: `/learn/courses`, or `/` if Learn access is lost.

### Approved Material List

- Path: `/learn/courses/:courseId/materials`
- Parent: `/learn/courses/:courseId`
- Title: `Course materials`
- H1 purpose: list approved material visible to the student in the course.
- Gate: `Learn(course :courseId, approved material list)`.
- Fallback: `/learn/courses/:courseId`, then `/learn/courses` if course scope is lost.

### Course-Material Download

- Path: `/learn/courses/:courseId/materials/:materialId`
- Parent: `/learn/courses/:courseId/materials`
- Title: `Course material`
- H1 purpose: identify authorized material and offer an explicitly initiated download when available.
- Gate: `Learn(course :courseId, material :materialId, download)`.
- Fallback: `/learn/courses/:courseId/materials`; never retain or expose the unavailable material identity.

## Private Material

### Private-Material List

- Path: `/learn/courses/:courseId/private-materials`
- Parent: `/learn/courses/:courseId`
- Title: `My materials`
- H1 purpose: list the student's private material in one joined course.
- Gate: `Learn(course :courseId, own private material)`.
- Fallback: `/learn/courses/:courseId`, then `/learn/courses` if course scope is lost.

### Create Private Draft

- Path: `/learn/courses/:courseId/private-materials/new`
- Parent: `/learn/courses/:courseId/private-materials`
- Title: `Create private material`
- H1 purpose: create one private material draft.
- Gate: `Learn(course :courseId, create own private material)`.
- Fallback: `/learn/courses/:courseId/private-materials`.

### Private Files

- Path: `/learn/courses/:courseId/private-materials/:materialId/files`
- Parent: `/learn/courses/:courseId/private-materials/:materialId`
- Title: `Private material files`
- H1 purpose: manage draft files for one owned private material.
- Gate: `Learn(course :courseId, own material :materialId, edit files)`.
- Fallback: `/learn/courses/:courseId/private-materials`, after clearing upload-local state.

### Private Upload Review

- Path: `/learn/courses/:courseId/private-materials/:materialId/review`
- Parent: `/learn/courses/:courseId/private-materials/:materialId/files`
- Title: `Review private material files`
- H1 purpose: review the authoritative file set before finalization.
- Gate: `Learn(course :courseId, own material :materialId, finalize)`.
- Fallback: the files route; after definitive finalization, the processing route.

### Private Processing

- Path: `/learn/courses/:courseId/private-materials/:materialId/processing`
- Parent: `/learn/courses/:courseId/private-materials/:materialId`
- Title: `Private material processing`
- H1 purpose: show truthful processing state and permitted recovery.
- Gate: `Learn(course :courseId, own material :materialId)`.
- Fallback: the private-material list; ready work continues to material detail.

### Private-Material Detail

- Path: `/learn/courses/:courseId/private-materials/:materialId`
- Parent: `/learn/courses/:courseId/private-materials`
- Title: `Private material`
- H1 purpose: inspect one owned private material and its authoritative state.
- Gate: `Learn(course :courseId, own material :materialId)`.
- Fallback: the private-material list.

### Delete Private Material

- Path: `/learn/courses/:courseId/private-materials/:materialId/delete`
- Parent: `/learn/courses/:courseId/private-materials/:materialId`
- Title: `Delete private material`
- H1 purpose: review blockers and consequences before deleting private material.
- Gate: `Learn(course :courseId, own material :materialId, delete)`.
- Fallback: material detail on cancel or unknown outcome; list only after definitive deletion.

## Session Start

### Course Choice

- Path: `/learn/start`
- Parent: `/learn/courses`
- Title: `Start a tutoring session`
- H1 purpose: choose an eligible joined course or continue an active session.
- Gate: `Learn(start session, joined-course scope)`.
- Fallback: `/learn/courses`, or `/` when no course action remains authorized.

### Optional Material Choice

- Path: `/learn/start/:courseId/material`
- Parent: `/learn/start`
- Title: `Choose material`
- H1 purpose: optionally select one authorized ready material for session start.
- Gate: `Learn(course :courseId, start session, eligible material)`.
- Fallback: `/learn/start`; access loss returns to `/learn/courses`.

### Static Starters

- Path: `/learn/start/:courseId/intent`
- Parent: `/learn/start/:courseId/material`
- Title: `Choose how to begin`
- H1 purpose: choose a localized starter or proceed with free-form intent.
- Gate: `Learn(course :courseId, start session)`.
- Fallback: the material-choice route, or `/learn/start` if course eligibility changes.

### Free-Form Intent

- Path: `/learn/start/:courseId/intent`
- Parent: `/learn/start/:courseId/material`
- Title: `Choose how to begin`
- H1 purpose: edit and submit the initial tutoring intent.
- Gate: `Learn(course :courseId, start session)`.
- Fallback: remain on the route for unknown outcome; definitive success enters the workspace.

## Tutoring Workspace

### Transcript

- Path: `/learn/sessions/:sessionId`
- Parent: `/learn/courses`
- Title: `Tutoring session`
- H1 purpose: read the authoritative transcript for the student's active session.
- Gate: `Learn(own session :sessionId, transcript)`.
- Fallback: `/` after safe active-session recovery, or `/learn/courses` when none exists.

### Composer

- Path: `/learn/sessions/:sessionId`
- Parent: `/learn/courses`
- Title: `Tutoring session`
- H1 purpose: compose one bounded message within the active workspace.
- Gate: `Learn(own active session :sessionId, submit message)`.
- Fallback: remain for outcome reconciliation; completed state uses the history detail route.

### Queue

- Path: `/learn/sessions/:sessionId`
- Parent: `/learn/courses`
- Title: `Tutoring session`
- H1 purpose: expose authoritative queued-message state in the workspace.
- Gate: `Learn(own active session :sessionId, current work)`.
- Fallback: remain on the workspace; scope or sign-in loss follows protected teardown.

### SSE State

- Path: `/learn/sessions/:sessionId`
- Parent: `/learn/courses`
- Title: `Tutoring session`
- H1 purpose: expose transcript connection and reconciliation state without fake progress.
- Gate: `Learn(own active session :sessionId, stream)`.
- Fallback: remain for explicit recovery; `/login` only after authoritative sign-in loss.

### Retry Response

- Path: `/learn/sessions/:sessionId`
- Parent: `/learn/courses`
- Title: `Tutoring session`
- H1 purpose: offer explicit retry only for an authoritatively eligible response attempt.
- Gate: `Learn(own active session :sessionId, retry response)`.
- Fallback: remain on the workspace with unchanged authoritative transcript.

### Stop Response

- Path: `/learn/sessions/:sessionId`
- Parent: `/learn/courses`
- Title: `Tutoring session`
- H1 purpose: stop an authoritatively stoppable response without claiming cancellation early.
- Gate: `Learn(own active session :sessionId, stop response)`.
- Fallback: remain on the workspace for terminal or outcome-unknown reconciliation.

### Finish Session

- Path: `/learn/sessions/:sessionId/finish`
- Parent: `/learn/sessions/:sessionId`
- Title: `Finish tutoring session`
- H1 purpose: review and confirm completion when no work is in flight.
- Gate: `Learn(own active session :sessionId, finish)`.
- Fallback: workspace on cancel or unknown outcome; history detail only after definitive completion.

### Session Recovery

- Path: `/learn/session`
- Parent: `/`
- Title: `Resume tutoring`
- H1 purpose: discover and resume authoritative active-session work without a retained session identity.
- Gate: `Learn(active-session discovery)`.
- Fallback: `/` when none exists; an authorized result replaces the route with the workspace path.

## Learning History

### Completed-Session History

- Path: `/learn/history`
- Parent: `/learn/courses`
- Title: `Learning history`
- H1 purpose: list the student's own completed tutoring sessions for read-only review.
- Gate: `Learn(own completed-session collection)` after session, capability, and complete student scope all succeed.
- States: neutral access/loading; empty history; paginated history; backend error; offline; denial or scope loss.
- Fallback: `/learn/courses`, or `/` if Learn access is lost; stale history identity is cleared before navigation.

### Completed Session

- Path: `/learn/history/:sessionId`
- Parent: `/learn/history`
- Title: `Completed tutoring session`
- H1 purpose: review one completed read-only session.
- Gate: `Learn(own completed session :sessionId)`.
- Fallback: `/learn/history`, or `/learn/courses` if history access is lost.

### Summary and Follow-Up

- Path: `/learn/history/:sessionId/summary`
- Parent: `/learn/history/:sessionId`
- Title: `Session summary`
- H1 purpose: show authoritative summary, strengths, improvements, and follow-up state.
- Gate: `Learn(own completed session :sessionId, summary)`.
- Fallback: completed-session detail.

### Used Material

- Path: `/learn/history/:sessionId/materials`
- Parent: `/learn/history/:sessionId`
- Title: `Materials used`
- H1 purpose: list material records actually used in the completed session.
- Gate: `Learn(own completed session :sessionId, used material)`.
- Fallback: completed-session detail; unavailable material remains non-navigable.

### Generated Speech

- Path: `/learn/history/:sessionId/speech`
- Parent: `/learn/history/:sessionId`
- Title: `Session audio`
- H1 purpose: request, play, or recover generated speech for authorized tutor content.
- Gate: `Learn(own completed session :sessionId, speech)`.
- Fallback: completed-session detail after media and object-URL teardown.

## Student Mentoring

### Student Requests

- Path: `/learn/mentoring`
- Parent: `/learn/courses`
- Title: `Mentoring requests`
- H1 purpose: list the student's authorized existing mentoring requests.
- Gate: `Learn(own mentoring requests)`.
- Fallback: `/learn/courses`, or `/` if Learn access is lost.

### Create Request

- Path: `/learn/courses/:courseId/mentoring/new`
- Parent: `/learn/mentoring`
- Title: `Request mentoring`
- H1 purpose: create educational mentoring work when authoritatively allowed.
- Gate: `Learn(course :courseId, create own mentoring request)`.
- Fallback: `/learn/mentoring`; remain on route for an unknown outcome.

### Student Request Detail

- Path: `/learn/mentoring/:requestId`
- Parent: `/learn/mentoring`
- Title: `Mentoring request`
- H1 purpose: inspect one owned mentoring request and its authoritative state.
- Gate: `Learn(own mentoring request :requestId)`.
- Fallback: `/learn/mentoring`.

### Student Schedule

- Path: `/learn/mentoring/:requestId/schedule`
- Parent: `/learn/mentoring/:requestId`
- Title: `Mentoring schedule`
- H1 purpose: review the request's proposed or confirmed appointment in the viewer's time zone.
- Gate: `Learn(own mentoring request :requestId, schedule visibility or action)`.
- Fallback: request detail.

### Student Cancellation

- Path: `/learn/mentoring/:requestId/cancel`
- Parent: `/learn/mentoring/:requestId`
- Title: `Cancel mentoring request`
- H1 purpose: review and confirm cancellation when the request is eligible.
- Gate: `Learn(own mentoring request :requestId, cancel)`.
- Fallback: request detail; list only after definitive cancellation when detail is no longer applicable.

### Student Meeting Link

- Path: `/learn/mentoring/:requestId`
- Parent: `/learn/mentoring`
- Title: `Mentoring request`
- H1 purpose: expose an inspectable authorized external meeting destination within request detail.
- Gate: `Learn(own mentoring request :requestId, meeting details)`.
- Fallback: request detail with no link; never fetch or open the destination automatically.

## Prepare Courses

### Assigned-Course List

- Path: `/prepare/courses`
- Parent: `/`
- Title: `Prepare courses`
- H1 purpose: list courses assigned to the current supervisor.
- Gate: `Prepare(assigned courses)`.
- Fallback: `/`.

### Preparation Hub

- Path: `/prepare/courses/:courseId`
- Parent: `/prepare/courses`
- Title: `Course preparation`
- H1 purpose: show one assigned course and every authoritative preparation prerequisite.
- Gate: `Prepare(assigned course :courseId)`.
- Fallback: `/prepare/courses`, or `/` if Prepare access is lost.

### Readiness Review

- Path: `/prepare/courses/:courseId/readiness`
- Parent: `/prepare/courses/:courseId`
- Title: `Course readiness`
- H1 purpose: review technical readiness, approval, and activation eligibility separately.
- Gate: `Prepare(assigned course :courseId, readiness)`.
- Fallback: preparation hub.

### Course Activation

- Path: `/prepare/courses/:courseId/activate`
- Parent: `/prepare/courses/:courseId/readiness`
- Title: `Activate course`
- H1 purpose: confirm activation only when every prerequisite is authoritatively satisfied.
- Gate: `Prepare(assigned course :courseId, activate)`.
- Fallback: readiness review; definitive success returns to the preparation hub.

### Course Deactivation

- Path: `/prepare/courses/:courseId/deactivate`
- Parent: `/prepare/courses/:courseId`
- Title: `Deactivate course`
- H1 purpose: review and confirm authorized course deactivation.
- Gate: `Prepare(assigned course :courseId, deactivate)`.
- Fallback: preparation hub for cancellation, unknown outcome, or definitive success.

## Course Content

### Course Details

- Path: `/prepare/courses/:courseId/details`
- Parent: `/prepare/courses/:courseId`
- Title: `Course details`
- H1 purpose: view and edit authorized core course details.
- Gate: `Prepare(assigned course :courseId, edit details)`.
- Fallback: preparation hub.

### Course Logo

- Path: `/prepare/courses/:courseId/details/logo`
- Parent: `/prepare/courses/:courseId/details`
- Title: `Course logo`
- H1 purpose: add, replace, or remove the authorized course logo.
- Gate: `Prepare(assigned course :courseId, edit logo)`.
- Fallback: course details after upload-local and image state is cleared.

### Curriculum

- Path: `/prepare/courses/:courseId/curriculum`
- Parent: `/prepare/courses/:courseId`
- Title: `Curriculum`
- H1 purpose: edit the course curriculum text.
- Gate: `Prepare(assigned course :courseId, edit curriculum)`.
- Fallback: preparation hub through the dirty-form decision.

### Learning Goals

- Path: `/prepare/courses/:courseId/learning-goals`
- Parent: `/prepare/courses/:courseId`
- Title: `Learning goals`
- H1 purpose: edit and preview bounded course learning goals.
- Gate: `Prepare(assigned course :courseId, edit learning goals)`.
- Fallback: preparation hub through the dirty-form decision.

### AI Instructions

- Path: `/prepare/courses/:courseId/ai-instructions`
- Parent: `/prepare/courses/:courseId`
- Title: `AI instructions`
- H1 purpose: edit and preview bounded course AI instructions.
- Gate: `Prepare(assigned course :courseId, edit AI instructions)`.
- Fallback: preparation hub through the dirty-form decision.

### Course Language

- Path: `/prepare/courses/:courseId/language`
- Parent: `/prepare/courses/:courseId`
- Title: `Course language`
- H1 purpose: choose the canonical course language.
- Gate: `Prepare(assigned course :courseId, edit language)`.
- Fallback: preparation hub through the dirty-form decision.

## Course Material

### Course-Material List

- Path: `/prepare/courses/:courseId/materials`
- Parent: `/prepare/courses/:courseId`
- Title: `Course materials`
- H1 purpose: list course-wide material and separate processing from approval state.
- Gate: `Prepare(assigned course :courseId, material list)`.
- Fallback: preparation hub.

### Course-Material Draft

- Path: `/prepare/courses/:courseId/materials/new`
- Parent: `/prepare/courses/:courseId/materials`
- Title: `Create course material`
- H1 purpose: create a file-backed or link-only course-material draft.
- Gate: `Prepare(assigned course :courseId, create material)`.
- Fallback: course-material list; created file-backed work continues to its files route.

### Course-Material Detail

- Path: `/prepare/courses/:courseId/materials/:materialId`
- Parent: `/prepare/courses/:courseId/materials`
- Title: `Course material`
- H1 purpose: inspect one authorized course-wide material and its processing and approval state.
- Gate: `Prepare(assigned course :courseId, material :materialId)` after the complete protected-mount gate succeeds.
- States: neutral access/loading; optional sections empty; draft; processing; ready; failed; backend error; offline;
  denial, deletion, or scope loss.
- Fallback: the course-material list, or the preparation hub if material-list scope is lost; clear stale identity first.

### Course-Material Files

- Path: `/prepare/courses/:courseId/materials/:materialId/files`
- Parent: `/prepare/courses/:courseId/materials/:materialId`
- Title: `Course material files`
- H1 purpose: manage the authoritative draft file set before finalization.
- Gate: `Prepare(assigned course :courseId, material :materialId, edit files)`.
- Fallback: material detail or course-material list after upload-local state is cleared.

### Course-Material Processing

- Path: `/prepare/courses/:courseId/materials/:materialId/processing`
- Parent: `/prepare/courses/:courseId/materials/:materialId`
- Title: `Course material processing`
- H1 purpose: show truthful processing state and permitted domain recovery.
- Gate: `Prepare(assigned course :courseId, material :materialId)`.
- Fallback: material detail or course-material list.

### Material Brief Review

- Path: `/prepare/courses/:courseId/materials/:materialId/brief`
- Parent: `/prepare/courses/:courseId/materials/:materialId`
- Title: `Review material brief`
- H1 purpose: inspect and correct the generated brief before approval.
- Gate: `Prepare(assigned course :courseId, material :materialId, review brief)`.
- Fallback: material detail through the dirty-form decision.

### Material Approval

- Path: `/prepare/courses/:courseId/materials/:materialId/approval`
- Parent: `/prepare/courses/:courseId/materials/:materialId`
- Title: `Material approval`
- H1 purpose: inspect and change educational approval independently of readiness.
- Gate: `Prepare(assigned course :courseId, material :materialId, approve)`.
- Fallback: material detail or preparation hub after authoritative reconciliation.

### Revoke Material Approval

- Path: `/prepare/courses/:courseId/materials/:materialId/approval/revoke`
- Parent: `/prepare/courses/:courseId/materials/:materialId/approval`
- Title: `Revoke material approval`
- H1 purpose: confirm approval revocation and its new-session impact.
- Gate: `Prepare(assigned course :courseId, material :materialId, revoke approval)`.
- Fallback: approval route on cancel or unknown outcome; detail after definitive success.

### Delete Course Material

- Path: `/prepare/courses/:courseId/materials/:materialId/delete`
- Parent: `/prepare/courses/:courseId/materials/:materialId`
- Title: `Delete course material`
- H1 purpose: review blockers and consequences before deleting course-wide material.
- Gate: `Prepare(assigned course :courseId, material :materialId, delete)`.
- Fallback: detail on cancel or unknown outcome; list only after definitive deletion.

## Course Students

### Course Roster

- Path: `/prepare/courses/:courseId/students`
- Parent: `/prepare/courses/:courseId`
- Title: `Course students`
- H1 purpose: list current student memberships without a global directory.
- Gate: `Prepare(assigned course :courseId, roster)`.
- Fallback: preparation hub.

### Create Student

- Path: `/prepare/courses/:courseId/students/new`
- Parent: `/prepare/courses/:courseId/students`
- Title: `Create student`
- H1 purpose: provision a student-only account and add it to the active course.
- Gate: `Prepare(assigned active course :courseId, create student)`.
- Fallback: roster; definitive success enters membership detail without retaining credentials.

### Add Existing Student

- Path: `/prepare/courses/:courseId/students/add`
- Parent: `/prepare/courses/:courseId/students`
- Title: `Add existing student`
- H1 purpose: add one eligible account by exact username without search or autocomplete.
- Gate: `Prepare(assigned active course :courseId, add existing student)`.
- Fallback: roster; definitive success enters membership detail.

### Membership Detail

- Path: `/prepare/courses/:courseId/students/:studentId`
- Parent: `/prepare/courses/:courseId/students`
- Title: `Student membership`
- H1 purpose: inspect one student's membership and authorized course-scoped actions.
- Gate: `Prepare(assigned course :courseId, student :studentId, membership)`.
- Fallback: roster, or assigned-course list if course scope is lost.

### Remove Membership

- Path: `/prepare/courses/:courseId/students/:studentId/remove`
- Parent: `/prepare/courses/:courseId/students/:studentId`
- Title: `Remove student from course`
- H1 purpose: review the course-scoped cascade before removing membership.
- Gate: `Prepare(assigned course :courseId, student :studentId, remove membership)`.
- Fallback: membership on cancel or unknown outcome; roster only after definitive success.

## Student Oversight

### Student Profile

- Path: `/prepare/courses/:courseId/students/:studentId/profile`
- Parent: `/prepare/courses/:courseId/students/:studentId`
- Title: `Student profile`
- H1 purpose: inspect or edit the authorized non-security profile subset.
- Gate: `Prepare(assigned course :courseId, student :studentId, profile representation)`.
- Fallback: membership detail.

### Student Material

- Path: `/prepare/courses/:courseId/students/:studentId/materials`
- Parent: `/prepare/courses/:courseId/students/:studentId`
- Title: `Student materials`
- H1 purpose: list and inspect this student's private material within the assigned course.
- Gate: `Prepare(assigned course :courseId, student :studentId, private material oversight)`.
- Fallback: membership detail; a material denial returns to this list without stale identity.

### Student Session Status

- Path: `/prepare/courses/:courseId/students/:studentId/sessions`
- Parent: `/prepare/courses/:courseId/students/:studentId`
- Title: `Student sessions`
- H1 purpose: show active status without chat, or list authorized completed sessions.
- Gate: `Prepare(assigned course :courseId, student :studentId, session status)`.
- Fallback: membership detail.

### Completed-Session Review

- Path: `/prepare/courses/:courseId/students/:studentId/sessions/:sessionId`
- Parent: `/prepare/courses/:courseId/students/:studentId/sessions`
- Title: `Review completed session`
- H1 purpose: review authorized completed chat and used-material data.
- Gate: `Prepare(assigned course :courseId, student :studentId, completed session :sessionId)`.
- Fallback: student sessions, after clearing completion-gated content.

### Summary Correction

- Path: `/prepare/courses/:courseId/students/:studentId/sessions/:sessionId/summary`
- Parent: `/prepare/courses/:courseId/students/:studentId/sessions/:sessionId`
- Title: `Correct session summary`
- H1 purpose: review and correct the authoritative completed-session summary.
- Gate: `Prepare(assigned course :courseId, student :studentId, session :sessionId, correct summary)`.
- Fallback: completed-session review through the dirty-form decision.

## Student Security

### Temporary Password

- Path: `/prepare/courses/:courseId/students/:studentId/security/password`
- Parent: `/prepare/courses/:courseId/students/:studentId`
- Title: `Set temporary password`
- H1 purpose: set a temporary password and explain the resulting security requirements.
- Gate: `Prepare(shared assigned course :courseId, student-only account :studentId, reset password)`.
- Fallback: membership detail after immediate secret teardown; unknown outcome remains shielded locally.

### Student MFA Reset

- Path: `/prepare/courses/:courseId/students/:studentId/security/mfa-reset`
- Parent: `/prepare/courses/:courseId/students/:studentId`
- Title: `Reset student MFA`
- H1 purpose: review and perform the separate lost-factor security reset.
- Gate: `Prepare(shared assigned course :courseId, student-only account :studentId, reset MFA)`.
- Fallback: membership detail; unknown outcome remains on the safe reconciliation state.

### Ban and Unban

- Path: `/prepare/courses/:courseId/students/:studentId/security/access`
- Parent: `/prepare/courses/:courseId/students/:studentId`
- Title: `Student account access`
- H1 purpose: review and change the authoritative student-only ban state.
- Gate: `Prepare(shared assigned course :courseId, student-only account :studentId, ban state)`.
- Fallback: membership detail after authoritative reconciliation.

## Mentor Assignment

### Grant Mentor Role

- Path: `/prepare/mentors/grant-role`
- Parent: `/prepare/courses`
- Title: `Grant mentor role`
- H1 purpose: resolve one registered staff account by exact user ID and grant its permanent mentor role.
- Gate: `Prepare(supervisor, direct mentor-role grant)`; target resolution and grant stay blocked by `BCG-017`, and
  final state binding also follows `BCG-014`.
- States: empty exact-ID form; bounded target checking; minimal confirmed target; fixed unavailable target; submitting;
  stale precondition; outcome unknown; definitive idempotent success; backend error; denial or capability loss.
- Fallback: `/prepare/courses`; clear target identity and input before denial or scope-loss navigation.

### Course Mentors

- Path: `/prepare/courses/:courseId/mentors`
- Parent: `/prepare/courses/:courseId`
- Title: `Course mentors`
- H1 purpose: list registered mentors assigned to the course.
- Gate: `Prepare(assigned course :courseId, course mentors)`.
- Fallback: preparation hub.

### Student Mentors

- Path: `/prepare/courses/:courseId/students/:studentId/mentors`
- Parent: `/prepare/courses/:courseId/students/:studentId`
- Title: `Student mentor`
- H1 purpose: inspect the student's current mentor assignment and request availability.
- Gate: `Prepare(assigned course :courseId, student :studentId, mentor assignment)`.
- Fallback: membership detail.

### Add Course Mentor

- Path: `/prepare/courses/:courseId/mentors/add`
- Parent: `/prepare/courses/:courseId/mentors`
- Title: `Add course mentor`
- H1 purpose: add an eligible registered mentor to the assigned course.
- Gate: `Prepare(assigned course :courseId, add course mentor)`.
- Fallback: course-mentor list.

### Assign Student Mentor

- Path: `/prepare/courses/:courseId/students/:studentId/mentors/assign`
- Parent: `/prepare/courses/:courseId/students/:studentId/mentors`
- Title: `Assign student mentor`
- H1 purpose: assign one course mentor to the student.
- Gate: `Prepare(assigned course :courseId, student :studentId, assign mentor)`.
- Fallback: student-mentor detail.

### Direct Reassignment

- Path: `/prepare/courses/:courseId/mentoring/:requestId/reassign`
- Parent: `/prepare/courses/:courseId/mentoring/:requestId`
- Title: `Reassign mentoring request`
- H1 purpose: choose a new eligible assignee while preserving request details and authorship.
- Gate: `Prepare(assigned course :courseId, request :requestId, reassign)`.
- Fallback: request detail for cancellation, unknown outcome, or definitive success.

### Remove Mentor

- Path: `/prepare/courses/:courseId/mentors/:accountId/remove`
- Parent: `/prepare/courses/:courseId/mentors`
- Title: `Remove course mentor`
- H1 purpose: review triage and schedule consequences before removing a mentor.
- Gate: `Prepare(assigned course :courseId, mentor account :accountId, remove)`.
- Fallback: mentor list after authoritative reconciliation; no deletion of the account is implied.

## Mentoring Triage

### Triage Request List

- Path: `/prepare/mentoring`
- Parent: `/prepare/courses`
- Title: `Mentoring triage`
- H1 purpose: list mentoring work within the supervisor's current assigned-course scope.
- Gate: `Prepare(assigned-course mentoring triage)`.
- Fallback: `/prepare/courses`, or `/` if Prepare access is lost.

### Triage Request Detail

- Path: `/prepare/courses/:courseId/mentoring/:requestId`
- Parent: `/prepare/mentoring`
- Title: `Mentoring request triage`
- H1 purpose: inspect an authorized request without unrelated private student data.
- Gate: `Prepare(assigned course :courseId, request :requestId, triage representation)`.
- Fallback: `/prepare/mentoring`.

### Triage Assignment

- Path: `/prepare/courses/:courseId/mentoring/:requestId/assign`
- Parent: `/prepare/courses/:courseId/mentoring/:requestId`
- Title: `Assign mentoring request`
- H1 purpose: assign an eligible course mentor to open work.
- Gate: `Prepare(assigned course :courseId, request :requestId, assign)`.
- Fallback: request detail for cancellation, conflict, or definitive success.

### Triage Reassignment

- Path: `/prepare/courses/:courseId/mentoring/:requestId/reassign`
- Parent: `/prepare/courses/:courseId/mentoring/:requestId`
- Title: `Reassign mentoring request`
- H1 purpose: reassign open work while preserving schedule, details, response, and authorship.
- Gate: `Prepare(assigned course :courseId, request :requestId, reassign)`.
- Fallback: request detail for cancellation, unknown outcome, or definitive success.

### Supervisor Cancellation

- Path: `/prepare/courses/:courseId/mentoring/:requestId/cancel`
- Parent: `/prepare/courses/:courseId/mentoring/:requestId`
- Title: `Cancel mentoring request`
- H1 purpose: confirm supervisor cancellation when the request is authoritatively eligible.
- Gate: `Prepare(assigned course :courseId, request :requestId, cancel)`.
- Fallback: request detail; list only if definitive state makes detail unavailable.

## Mentor Work

### Assigned Request List

- Path: `/mentor/requests`
- Parent: `/`
- Title: `Assigned mentoring requests`
- H1 purpose: list only work assigned to the current mentor.
- Gate: `Mentor(assigned requests)`.
- Fallback: `/`.

### Mentor Briefing

- Path: `/mentor/requests/:requestId`
- Parent: `/mentor/requests`
- Title: `Mentoring request`
- H1 purpose: show the compact authorized briefing for one assigned request.
- Gate: `Mentor(assigned request :requestId, minimal briefing)`.
- Fallback: `/mentor/requests`, after clearing all briefing data.

### Mentor Response

- Path: `/mentor/requests/:requestId/response`
- Parent: `/mentor/requests/:requestId`
- Title: `Mentor response`
- H1 purpose: write or inspect the authorized response for assigned work.
- Gate: `Mentor(assigned request :requestId, response action)`.
- Fallback: request detail through the dirty-form decision.

### Mentor Scheduling

- Path: `/mentor/requests/:requestId/schedule`
- Parent: `/mentor/requests/:requestId`
- Title: `Schedule mentoring`
- H1 purpose: schedule an external meeting with explicit time-zone and destination review.
- Gate: `Mentor(assigned request :requestId, schedule action)`.
- Fallback: request detail through the dirty-form decision.

### Mentor Completion

- Path: `/mentor/requests/:requestId/complete`
- Parent: `/mentor/requests/:requestId`
- Title: `Complete mentoring request`
- H1 purpose: recheck, prevalidate, and explicitly complete eligible assigned work.
- Gate: `Mentor(assigned request :requestId, server-authorized completion)`.
- Fallback: request detail or list; unknown outcome remains unconfirmed pending explicit reconciliation.

## Profile

### Self Profile

- Path: `/profile`
- Parent: `/`
- Title: `Profile`
- H1 purpose: inspect the current account's authorized self-profile; expose editing only for staff accounts.
- Gate: `Profile(own self-profile)` with authoritative account capabilities and representation scope.
- States: neutral access/loading; student-only read-only profile; staff editable profile; backend error; offline;
  denial or capability loss. Student-only accounts receive no profile-edit control, form state, or mutation path.
- Fallback: `/`.

### Staff Avatar

- Path: `/profile/avatar`
- Parent: `/profile`
- Title: `Profile picture`
- H1 purpose: add, replace, or remove the current staff account's avatar.
- Gate: `Profile(own staff avatar)`.
- Fallback: `/profile` after upload-local and image state is cleared.

### Preferred Language

- Path: `/profile/language`
- Parent: `/profile`
- Title: `Language`
- H1 purpose: change the preferred interface language atomically.
- Gate: `Profile(own staff language)`; student-only accounts cannot mutate profile preferences.
- Fallback: `/profile` through the dirty-form decision.

### Country

- Path: `/profile/country`
- Parent: `/profile`
- Title: `Country`
- H1 purpose: change the current staff account's canonical country value.
- Gate: `Profile(own staff country)`.
- Fallback: `/profile` through the dirty-form decision.

### Time Zone

- Path: `/profile/time-zone`
- Parent: `/profile`
- Title: `Time zone`
- H1 purpose: change the display time zone without moving saved appointment instants.
- Gate: `Profile(own staff time zone)`.
- Fallback: `/profile` through the dirty-form decision.

### Voice

- Path: `/profile/voice`
- Parent: `/profile`
- Title: `Voice`
- H1 purpose: configure or clear the current staff account's optional generated-speech voice.
- Gate: `Profile(own staff voice)`.
- Fallback: `/profile`; provider absence affects only this operation.

### Mobile Verification

- Path: `/profile/mobile`
- Parent: `/profile`
- Title: `Mobile number`
- H1 purpose: create, resend, verify, or reconcile a staff mobile challenge.
- Gate: `Profile(own staff mobile verification)`.
- Fallback: `/profile`; route-local codes and challenge input are cleared on departure.

### Remove Mobile

- Path: `/profile/mobile/remove`
- Parent: `/profile/mobile`
- Title: `Remove mobile number`
- H1 purpose: confirm removal and explain pending-factor invalidation.
- Gate: `Profile(own verified staff mobile, remove)`.
- Fallback: mobile route on cancel or unknown outcome; profile after definitive success.

## MFA Settings

### MFA Overview

- Path: `/profile/security/mfa`
- Parent: `/profile`
- Title: `Multi-factor authentication`
- H1 purpose: inspect authoritative current and pending MFA state.
- Gate: `Profile(own MFA state)`.
- Fallback: `/profile`.

Until `/profile` is implemented, Home `/` is the parent and safe fallback under the 2026-10-07 owner decision in
`BACKEND-CONTRACT-GAPS.md` §BCG-009 Story 1-9 TOTP-enrollment-slice decision. No `/profile` surface is added by Story 2.2.

### Start MFA Enrollment

- Path: `/profile/security/mfa/enroll`
- Parent: `/profile/security/mfa`
- Title: `Set up multi-factor authentication`
- H1 purpose: choose and begin an eligible MFA enrollment or replacement.
- Gate: `Profile(own MFA, enroll or replace)`.
- Fallback: MFA overview after pending secret teardown.

### Verify MFA Enrollment

- Path: `/profile/security/mfa/verify`
- Parent: `/profile/security/mfa/enroll`
- Title: `Verify multi-factor authentication`
- H1 purpose: verify the route-local pending TOTP or SMS enrollment.
- Gate: `Profile(own pending MFA enrollment, verify)`.
- Fallback: MFA overview after cancellation, expiry, loss, or unreconcilable ambiguity.

### Recovery Codes

- Path: `/profile/security/mfa/recovery-codes`
- Parent: `/profile/security/mfa`
- Title: `MFA recovery codes`
- H1 purpose: reveal, copy, print, and acknowledge the single-use recovery-code set once.
- Gate: `Profile(own newly activated MFA, one-time codes)`.
- Fallback: MFA overview with history replacement and complete code teardown.

### Replace MFA

- Path: `/profile/security/mfa/replace`
- Parent: `/profile/security/mfa`
- Title: `Replace multi-factor authentication`
- H1 purpose: prove current access and replace the active factor.
- Gate: `Profile(own MFA, replace, route-local management proof)`.
- Fallback: MFA overview after proof teardown; success continues once to recovery codes.

### Disable MFA

- Path: `/profile/security/mfa/disable`
- Parent: `/profile/security/mfa`
- Title: `Disable multi-factor authentication`
- H1 purpose: prove current access and confirm factor disablement.
- Gate: `Profile(own MFA, disable, route-local management proof)`.
- Fallback: MFA overview after proof teardown and authoritative reconciliation.

### Lost-Factor Route

- Path: `/profile/security/mfa/lost`
- Parent: `/profile/security/mfa`
- Title: `Lost access to MFA`
- H1 purpose: explain the authorized student, staff, or local-operator recovery path.
- Gate: `Profile(own MFA recovery context)`; restricted login uses `/auth/mfa` without protected identity.
- Fallback: MFA overview when authenticated, otherwise `/login` without a protected return target.

## Account Administration

### Accounts List

- Path: `/admin/accounts`
- Parent: `/`
- Title: `Accounts`
- H1 purpose: list the authorized paginated account-administration representation.
- Gate: `Administer(accounts)`.
- Fallback: `/`.

### Account Detail

- Path: `/admin/accounts/:accountId`
- Parent: `/admin/accounts`
- Title: `Account`
- H1 purpose: inspect one account and its currently authorized administrative actions.
- Gate: `Administer(account :accountId)`.
- Fallback: `/admin/accounts`.

### Grant Role

- Path: `/admin/accounts/:accountId/roles/grant`
- Parent: `/admin/accounts/:accountId`
- Title: `Grant permanent role`
- H1 purpose: review and grant an authorized permanent role to a registered staff account.
- Gate: `Administer(account :accountId, grant role)`.
- Fallback: account detail after authoritative reconciliation.

This administrator route depends on the administrator account collection and detail contract. Supervisors never use it
to grant mentor role; their separate exact-ID flow is `/prepare/mentors/grant-role` and remains blocked by `BCG-017`.

### Delete Account

- Path: `/admin/accounts/:accountId/delete`
- Parent: `/admin/accounts/:accountId`
- Title: `Delete account`
- H1 purpose: review account class, blockers, cascade, preservation, and irreversibility.
- Gate: `Administer(account :accountId, delete)`.
- Fallback: detail on cancel or unknown outcome; account list only after definitive deletion.

## Invitations

### Invitation List

- Path: `/admin/invitations`
- Parent: `/`
- Title: `Invitations`
- H1 purpose: list authorized invitations with persisted lifecycle and delivery state.
- Gate: `Administer(invitations within current management scope)`.
- Fallback: `/`.

### Create Invitation

- Path: `/admin/invitations/new`
- Parent: `/admin/invitations`
- Title: `Create invitation`
- H1 purpose: invite one new administrator, supervisor, or mentor account.
- Gate: `Administer(create invitation for the selected role and scope)`.
- Fallback: invitation list; definitive creation may enter detail without claiming delivery.

### Invitation Detail

- Path: `/admin/invitations/:invitationId`
- Parent: `/admin/invitations`
- Title: `Invitation details`
- H1 purpose: inspect one manageable invitation's lifecycle and delivery state.
- Gate: `Administer(invitation :invitationId within management scope)`.
- Fallback: invitation list.

### Resend Invitation

- Path: `/admin/invitations/:invitationId/resend`
- Parent: `/admin/invitations/:invitationId`
- Title: `Resend invitation`
- H1 purpose: explicitly resend an eligible invitation without automatic retry.
- Gate: `Administer(invitation :invitationId, resend)`.
- Fallback: invitation detail for every terminal or unknown delivery outcome.

### Revoke Invitation

- Path: `/admin/invitations/:invitationId/revoke`
- Parent: `/admin/invitations/:invitationId`
- Title: `Revoke invitation`
- H1 purpose: review and atomically bind pending-invitation revocation.
- Gate: `Administer(invitation :invitationId, revoke)`.
- Fallback: invitation detail or list after authoritative reconciliation; revocation retains detail.

### Delete Faulty Invitation

- Path: `/admin/invitations/:invitationId/delete`
- Parent: `/admin/invitations/:invitationId`
- Title: `Delete faulty invitation`
- H1 purpose: review and atomically bind physical deletion of a faulty invitation.
- Gate: `Administer(invitation :invitationId, delete faulty)`.
- Fallback: detail on cancel or unknown outcome; invitation list only after definitive deletion.

## Course Administration

### Courses List

- Path: `/admin/courses`
- Parent: `/`
- Title: `Courses`
- H1 purpose: list the authorized paginated course-administration representation.
- Gate: `Administer(courses)`.
- Fallback: `/`.

### Create Course

- Path: `/admin/courses/new`
- Parent: `/admin/courses`
- Title: `Create course`
- H1 purpose: create an inactive course with at least one existing supervisor.
- Gate: `Administer(create course and assign initial supervisors)`.
- Fallback: course list; definitive success enters course admin detail.

### Course Admin Detail

- Path: `/admin/courses/:courseId`
- Parent: `/admin/courses`
- Title: `Course administration`
- H1 purpose: inspect one course, supervisor relationships, and deletion blockers.
- Gate: `Administer(course :courseId)`.
- Fallback: course list.

### Course Supervisors

- Path: `/admin/courses/:courseId/supervisors`
- Parent: `/admin/courses/:courseId`
- Title: `Course supervisors`
- H1 purpose: add supervisors or review an atomically bound removal.
- Gate: `Administer(course :courseId, supervisor relationships)`.
- Fallback: course admin detail after authoritative reconciliation.

### Delete Course

- Path: `/admin/courses/:courseId/delete`
- Parent: `/admin/courses/:courseId`
- Title: `Delete course`
- H1 purpose: review activity, session blockers, cascade, preservation, and irreversibility.
- Gate: `Administer(course :courseId, delete)`.
- Fallback: detail on cancel or unknown outcome; course list only after definitive deletion.

## Operations

### Jobs List

- Path: `/admin/operations/jobs`
- Parent: `/`
- Title: `Jobs`
- H1 purpose: list authorized durable operational work without a generic retry action.
- Gate: `Administer(operational jobs)`.
- Fallback: `/`.

### Job Detail

- Path: `/admin/operations/jobs/:jobId`
- Parent: `/admin/operations/jobs`
- Title: `Job details`
- H1 purpose: inspect one authorized job's state, diagnostics, and cumulative usage.
- Gate: `Administer(job :jobId)`.
- Fallback: jobs list; an authorized subject route may be offered only from returned relationships.

### Audit Records

- Path: `/admin/operations/audit`
- Parent: `/`
- Title: `Audit records`
- H1 purpose: inspect the authorized paginated content-free audit representation.
- Gate: `Administer(audit records)`.
- Fallback: `/`.

## Navigation Binding

The application shell derives its groups from authoritative capabilities and scope. Route prefixes organize the unified
workspace; they are not role switches and never authorize a request:

- Learn navigation links only to authorized `/learn/...` surfaces.
- Prepare navigation links only to authorized `/prepare/...` surfaces.
- Mentor navigation links only to authorized `/mentor/...` surfaces.
- Administer navigation links only to authorized `/admin/...` surfaces.
- Profile and security links only to authorized `/profile/...` surfaces.

Multi-role accounts receive the union of currently authorized links in the same shell. Course, student, ownership,
assignment, resource-state, and action scope remain conjunctive. A stale visible link grants no access. No protected
route is prefetched, and route construction never uses content-bearing display values.
