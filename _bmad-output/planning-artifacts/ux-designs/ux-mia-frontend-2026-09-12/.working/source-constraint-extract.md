# Frontend Source Constraint Extract

This working extract identifies frontend-relevant facts from the approved backend sources. It does not replace those sources.
The referenced source wins if this extract becomes stale or incomplete.

## Evidence Hierarchy

1. `mia/docs/product-requirements.md` defines authoritative product behavior.
2. `mia/_bmad-output/planning-artifacts/prds/prd-mia-2026-08-29/prd.md` consolidates the product requirements for planning.
3. `mia/docs/api.md` is a draft workflow and route-family description; OpenAPI will own implemented transport details.
4. The architecture spine and PRD addendum constrain delivery and integration but do not invent product behavior.

## Authorization Model

- Effective authorization combines roles, course assignment, student assignment, ownership, resource state, and action.
- Multiple roles grant a union of permissions without broadening course or student scope.
- A student sees their own joined courses, private material, tutoring sessions, summaries, and eligible mentoring work.
- A supervisor acts only within assigned courses and the students and material inside that scope.
- A mentor sees minimal identity for assigned students and their mentoring work, but no private uploads or tutoring chats.
- An administrator has named global administration powers but no automatic access to private course or student content.
- The local operator is not an application role; bootstrap and sole-administrator MFA recovery have no frontend surface.
- The UI must not disclose whether an out-of-scope sensitive resource exists.

Sources: `mia/docs/product-requirements.md:77-121`, `mia/docs/product-requirements.md:162-243`.

## Required Journey Families

- Staff invitation preview and acceptance, with no public registration.
- Password login followed by optional MFA and mandatory temporary-password replacement in that fixed order.
- Staff password recovery and role-appropriate MFA management and recovery.
- Administrator course creation with at least one supervisor.
- Supervisor course preparation, readiness assessment, activation, and deactivation.
- Material drafting, file management, finalization, processing, brief correction, approval, failure recovery, and deletion.
- Supervisor student provisioning or exact-username course enrollment.
- Student course choice, optional material choice, tutoring, interruption, retry, reconnection, resumption, and completion.
- Student and supervisor post-session summary and review journeys with different content visibility.
- Student mentoring request, supervisor triage, mentor response, scheduling, reassignment, cancellation, and completion.
- Scoped account, role, invitation, course, membership, material, job, and audit administration.

Sources: `mia/docs/product-requirements.md:326-395`, `mia/docs/product-requirements.md:445-469`,
`mia/docs/product-requirements.md:560-682`, `mia/docs/product-requirements.md:700-901`,
`mia/docs/product-requirements.md:1080-1309`.

## Authentication And Session Constraints

- Login progression is `mfa`, then `password-change`, then `authenticated` when those stages apply.
- Restricted stages expose only their required action and logout.
- Restricted stages expire after 30 non-refreshing minutes.
- Full sessions expire after 30 minutes of inactivity and no later than 12 hours after authentication.
- Session and CSRF state must be refreshed after login completion, logout, and every stage transition.
- MFA codes are text values that preserve leading zeroes. Five failed submissions invalidate a challenge.
- MFA recovery codes are displayed exactly once; losing that response requires factor replacement.
- Invitation and reset tokens arrive in URL fragments and must be removed immediately before API submission.

Sources: `mia/docs/product-requirements.md:524-654`, `mia/docs/api.md:100-127`, `mia/docs/api.md:210-234`.

## Long-Running And Ambiguous States

- Material readiness and supervisor approval are separate dimensions.
- Material lifecycle is `draft`, `processing`, `ready`, or `failed`; partial success must never appear ready.
- Tutor responses can be queued, generating, completed, interrupted, or failed.
- A session permits at most one generating response and one queued student message.
- Disconnecting does not cancel tutor generation; reconnecting starts with a persisted snapshot.
- Failed or interrupted tutor text remains visible. Retry is explicit and creates linked history.
- Summary generation and speech generation are asynchronous and can fail independently.
- SMTP timeout leaves an invitation or reset link potentially valid despite unknown delivery outcome.
- Optional-provider absence disables only dependent functionality.
- MIA sends no workflow notifications; users discover state while using the application.

Sources: `mia/docs/product-requirements.md:355-373`, `mia/docs/product-requirements.md:737-753`,
`mia/docs/product-requirements.md:868-893`, `mia/docs/product-requirements.md:1174-1256`,
`mia/docs/product-requirements.md:1311-1319`, `mia/docs/product-requirements.md:1359-1369`,
`mia/docs/product-requirements.md:1405-1428`, `mia/docs/api.md:589-676`.

## Destructive-Action Distinctions

- Private-material deletion, course-membership removal, account deletion, and course deletion have different cascades.
- Material selected by an active tutoring session cannot be deleted.
- Student removal from a course is blocked by an active session and deletes only that student's course-scoped data.
- Staff deletion requires another administrator and is blocked for the last administrator or a sole course supervisor.
- Course deletion requires an inactive course with no active tutoring sessions.
- Local deletion does not remove provider copies or operator-controlled backups.
- Removing a mentor clears future scheduling and returns open work to triage; direct reassignment preserves details.
- Late provider results cannot recreate deleted state.

Sources: `mia/docs/product-requirements.md:374-429`, `mia/docs/product-requirements.md:768-788`,
`mia/docs/product-requirements.md:847-866`, `mia/docs/product-requirements.md:1281-1336`,
`mia/docs/product-requirements.md:1474-1530`.

## Client Integration Constraints

- MIA is a same-origin responsive browser application; there is no CORS integration.
- JSON resources use JSON:API; uploads, downloads, PNG, NDJSON, MP3, and SSE use specialized media types.
- IDs are opaque and reveal no type, scope, ownership, or authorization.
- Optional text uses JSON `null` as its absent representation.
- Collections use bounded pagination and do not promise exact totals.
- Client-generated lowercase UUID v4 request IDs remain stable across transport retries.
- Tutor streaming uses SSE snapshot, delta, and terminal events; reconnecting obtains a fresh snapshot.
- Downloads and media are authorized operations rather than public static files.
- The CSP forbids arbitrary external scripts, fonts, frames, and connections unless explicitly justified.
- Passwords and messages preserve spaces, Unicode, line endings, and surrounding whitespace exactly.
- Code-point limits cannot be implemented with JavaScript string length alone.
- API instants are UTC and display in the viewer's preferred IANA time zone.

Sources: `mia/docs/api.md:27-98`, `mia/docs/api.md:115-138`, `mia/docs/api.md:584-676`,
`mia/docs/product-requirements.md:135-158`, `mia/docs/product-requirements.md:508-522`,
`mia/docs/product-requirements.md:1082-1093`, `mia/docs/product-requirements.md:1213-1223`,
`mia/docs/product-requirements.md:1338-1357`, `mia/docs/product-requirements.md:1433-1446`.

## Safety And Trust Constraints

- The frontend must not retain secrets, bearer tokens, private prompts, provider payloads, or unauthorized content in logs,
  telemetry, URLs, or persistent storage.
- MIA must not be presented as an emergency service or imply that anyone was notified or is monitoring a conversation.
- Mentoring is not an emergency channel.
- Self-hosting must not be described as keeping all processing local; relevant data is sent to external providers.
- Backend denials remain authoritative when assignments, roles, bans, course state, or material state change concurrently.

Sources: `mia/docs/product-requirements.md:1359-1399`, `mia/docs/product-requirements.md:1568-1585`.

## UX Decisions Still Required

- Primary personas, contexts of use, and emotional outcomes.
- Navigation and dashboard composition across single-role and multi-role accounts.
- Supported browsers, viewport floor, and responsive priorities.
- Accessibility conformance target, keyboard behavior, screen-reader behavior, focus management, motion, and contrast.
- Frontend localization scope and locale formatting beyond time-zone conversion.
- Session-expiry warning behavior.
- Polling and revalidation behavior where workflow notifications do not exist.
- User-facing treatment of sanitized provider failures, rate limits, and unknown delivery outcomes.
- Recovery-code acknowledgement and save/print affordances.
- Actionable presentation of course activation prerequisites.
- Distinction between material readiness and approval.
- Precise confirmation language for destructive cascades and local-only deletion.
- External mentoring-link safety treatment.
- Visual language, UI system, branding, layout, density, and motion posture.
