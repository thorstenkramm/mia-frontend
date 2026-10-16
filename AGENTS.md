# Repository guidance

## Precedence

- Follow user instructions first, then this file, then the scoped rules in `.agents/rules/`.
- More specific rules override general rules when both apply.
- Product documentation defines intended behavior. Agent rules govern how work is performed; they must not invent
  product behavior.
- If documents conflict, identify the conflict and ask which behavior is authoritative before implementing it.

## Authorization and assumptions

- When the user asks a question or requests a review, do not make code changes unless they explicitly request them.
- Bug reports, logs, reproduction steps, and statements that something appears broken are requests for diagnosis, not
  implicit authorization to edit.
- When the user explicitly asks to change, fix, or implement something, carry the work through implementation and
  verification.
- Do not guess at missing product behavior, authorization boundaries, data lifecycle rules, or security requirements.
  Ask concise, grouped questions when answers are required to proceed safely.
- If requested constraints cannot all hold, stop and explain the exact conflict. Do not silently relax a constraint or
  implement an approximation.
- If an instruction appears mistaken or conflicts with established behavior, state that directly instead of silently
  working around it.
- Do not add speculative abstractions or compatibility layers. Add indirection only for a current, concrete need.
- Keep one source of truth. Do not duplicate a contract that an authoritative document already owns; reference it.
- If the user refers to the latest screenshot, use the newest file in `./tmp/screenshots/`.

## Current project state

- This repository is the MIA frontend. The backend is maintained and released from a separate repository, checked out
  alongside this one and reachable at `./mia`.
- The frontend is greenfield. There is no `package.json`, build tooling, or application code yet. Planning artifacts
  are complete enough to implement from.
- MIA is a self-hosted server used through a desktop browser. It is not a desktop or mobile application.
- The backend serves the built static assets from a configured document root, with SPA fallback outside `/api`.
- The licensed Tailwind Plus component library is downloaded to `tailwindplus/` and is gitignored. Use the
  `tailwind-plus` skill to retrieve components; never invent markup that imitates one.

## Authoritative documents

Planning artifacts live in `_bmad-output/planning-artifacts/ux-designs/ux-mia-frontend-2026-09-12/`. They are the
frontend's binding contracts. Read the relevant one before implementing; do not re-derive their content from the
backend repository.

- `FRONTEND-PRD-FOUNDATION.md` — frontend requirements, scope, and exclusions.
- `EXPERIENCE.md` — behavior and navigation spine.
- `ROUTE-INVENTORY.md` — canonical client paths, route presentation, protected gates, and safe fallbacks.
- `DESIGN.md` — visual contract and the Tailwind Plus inheritance rule.
- `FRONTEND-STATE-MACHINES.md` — 31 numbered state machines. Binding for observable state behavior.
- `SURFACE-STATE-MATRIX.md` — per-surface state coverage.
- `ACCESSIBILITY-ACCEPTANCE.md` — WCAG 2.2 AA acceptance criteria `AC-001`..`AC-019` and processes `CP-01`..`CP-14`.
- `SECURITY-PRIVACY-ACCEPTANCE.md` — frontend security and privacy acceptance, with named negative-test suites.
- `BACKEND-CONTRACT-GAPS.md` — open backend dependencies. An entry that is still open blocks the work that needs it.

The backend's own contracts live in `./mia`: `docs/product-requirements.md` for product behavior and
`api-doc/openapi.yaml` for transport. Read them when a question is genuinely about backend behavior. Do not copy their
content into this repository.

## Product invariants the UI must not violate

These are the cross-cutting rules that are easy to breach without noticing. Everything else lives in the authoritative
documents above.

- The implemented OpenAPI contract owns paths, methods, schemas, media types, pagination, status codes, stable error
  codes, security, and CSRF requirements. Never guess unresolved transport. If a required operation or field is absent,
  the work is blocked on OpenAPI, not on a client-side assumption. Silence is unresolved, not permission to assume.
- Never substitute cookie inspection, a guessed route, denial probing, enumeration, null-state inference, or a trial
  request for an authoritative contract.
- Login has restricted `mfa` and `password-change` stages before `authenticated`. MFA precedes password replacement
  when both apply. Restricted stages render only their focused flow plus logout, with no application navigation and no
  protected title, breadcrumb, cached name, or prefetch.
- A successful session check alone never authorizes a protected mount. The ordered gate is session stage, then account
  capability and scope, then route resource, then dependent data.
- Sessions expire after 30 minutes idle and no later than 12 hours after authentication. The absolute deadline never
  moves, and a client clock never extends a server-authored deadline.
- Each tab owns its idle baseline. The approved Continue-only renewal contract in `SECURITY-PRIVACY-ACCEPTANCE.md`
  governs it. Ordinary requests, background reads, lifecycle checks, focus, visibility, SSE traffic, and reconnects
  must never act as a keepalive.
- No unsafe request is ever replayed automatically — not after timeout, network loss, abort, `401`, `403`,
  `csrf_invalid`, tab return, or token rotation. Request-ID idempotency creates no exception.
- Render only authoritative persisted or streamed state. Optimistic updates are forbidden, and destructive mutations
  update the interface only after a definitive backend success.
- Existence-hiding is a single fixed presentation. Unknown, out-of-scope, ineligible, revoked, and throttled causes
  must be indistinguishable in copy, focus, actions, URL, title, announcement, and timing.
- Model output is untrusted text. It never creates controls and never authorizes a platform action.
- Students cannot change their own profile fields. A student has one active tutoring session that never expires from
  inactivity, at most one generating response and one queued message, and may finish only when no work is in flight.
- Release one is light-theme only, has no public sign-up, no dark mode, no offline mode, no analytics or telemetry, no
  notification center, and no gamification. See `FRONTEND-PRD-FOUNDATION.md` for the complete exclusion list.

## Vocabulary

Use these terms exactly as the backend does. Divergence between the two repositories is a defect.

- **AI tutor** means the model-driven tutoring behavior. It is not a user role.
- **Administrator** means a user with named global platform capabilities.
- **Supervisor** means a user assigned responsibility for a course.
- **Mentor** means a user assigned to support a specific student in a course.
- **Student** means a user receiving tutoring in joined courses.
- Authorization is never determined by role alone. Course assignment, student assignment, resource ownership, and the
  requested action are all part of the decision.
- Call authentication expiry **sign-in expiry**, never tutoring-session expiry. The two are unrelated.

## Security and privacy baseline

MIA processes sensitive educational data and may serve minors. Treat security and privacy as product constraints, not
optional hardening. `.agents/rules/security-privacy.md` carries the full contract; these are the non-negotiables.

- Never persist protected content or secrets in local storage, session storage, IndexedDB, the Cache API, a service
  worker, URL text, or form restoration.
- Never log or expose passwords, MFA values, recovery codes, tokens, cookies, authorization headers, prompts, message
  bodies, or provider payloads.
- Never put names, topics, messages, filenames, email, or mobile data in a path, query, hash, or `history.state`.
- Never render untrusted content as HTML. Model output, user text, filenames, OCR text, and backend error bodies all
  pass through the locked sanitizer or are rendered as escaped text.
- Never overfetch and hide. A field the user may not see must not enter network traffic, memory, caches, the
  accessibility tree, or the DOM.
- Release one ships no analytics, telemetry, session replay, third-party error reporting, remote fonts, or remote
  scripts.

## General coding priorities

- Prefer simple, readable code and the smallest coherent local change.
- Keep changes scoped, but make touched code internally consistent. Do not leave half-converted patterns in the same
  responsibility.
- Follow established local style when it remains compatible with current rules.
- Do not rewrite useful user-authored comments unless the change makes them inaccurate.
- Prefer clear control flow over blanket rules about early returns or nesting.
- Extract a helper when it creates a meaningful abstraction, is reused, or substantially improves readability. Do not
  add forwarding helpers that merely rename one call.
- Make I/O and other side effects visible at appropriate boundaries.
- Do not force zero duplication. Remove duplication when one abstraction has a clear responsibility and improves
  maintenance. Follow `.agents/rules/duplication.md`.

## Errors and invariants

- Distinguish normal conditions, invalid input, expected concurrent or stale state, dependency failures, and true
  internal invariant violations.
- An ambiguous outcome is its own state, not a success and not a failure. Model it explicitly and never resolve it by
  guessing.
- Do not add silent fallback or no-op behavior for unspecified states.
- Do not swallow errors with empty catch blocks, discarded promises, or debug-only logging.
- Preserve error identity when callers need programmatic handling, and add useful context when wrapping.
- Never commit `throw new Error("TODO")` or an equivalent placeholder for unresolved behavior. Ask for the missing
  decision or leave that work unimplemented.

## Frontend guidance

Read the scoped rule before writing code in its area:

| Area                          | Rule                                |
| ----------------------------- | ----------------------------------- |
| Stack, versions, npm          | `.agents/rules/techstack.md`        |
| TypeScript                    | `.agents/rules/typescript.md`       |
| React                         | `.agents/rules/react.md`            |
| Tailwind and styling          | `.agents/rules/tailwind.md`         |
| Accessibility                 | `.agents/rules/accessibility.md`    |
| Calling the backend           | `.agents/rules/api-client.md`       |
| Security and privacy          | `.agents/rules/security-privacy.md` |
| Testing                       | `.agents/rules/testing.md`          |
| Duplication                   | `.agents/rules/duplication.md`      |
| Markdown                      | `.agents/rules/markdown.md`         |

## Testing

- Test observable behavior, state-machine transitions, authorization-driven visibility, accessibility semantics, and
  security boundaries. Do not add tests that mirror constants or freeze incidental implementation details.
- Never call paid or production providers from automated tests.
- Use synthetic fixtures and never commit real credentials or protected records. Private test failure output may contain
  synthetic data; test application privacy sinks directly rather than scanning test artifacts for fixture markers.
- Follow `.agents/rules/testing.md` for the required categories and the Playwright scope.

## Workflow and verification

- Work from the repository root unless a command requires a narrower working directory.
- Inspect existing files and nearby conventions before editing.
- Do not revert or overwrite unrelated user changes.
- Do not hide warnings with `eslint-disable`, `@ts-expect-error`, `@ts-ignore`, or similar suppression unless the user
  explicitly approves it and the reason is recorded next to it.
- Fix new findings in touched code. Report unrelated existing findings rather than broadening the task without
  authorization.
- Clean up temporary byproducts. Preserve intended generated artifacts and mention them in the result.
- Never commit the `tailwindplus/` library or any credential. See `.gitignore`.

Once the application exists, run the applicable checks while iterating on a change:

1. `npm run typecheck`
2. `npm run lint`
3. `npm test`
4. `npm run build`

Do not run overlapping checks against the same workspace. If a required tool or script does not exist yet, state that
verification was not applicable rather than inventing project setup.

### Full project check

`./run-all-tests.sh` is the complete suite and the authoritative gate. The commands above are the fast subset for
iterating; they are not sufficient on their own, because the script also enforces checks that no npm script covers.
Run it before reporting work complete whenever a change touches application source, tests, executable scripts,
build/test configuration, or dependencies.

Documentation-only changes, including Markdown, agent instructions, and planning or sprint-tracking files, require
only applicable Markdown lint and planning-consistency checks. Respect the Markdown rule's directory exemptions.
Do not run application tests or builds for these changes. Updating verification notes after a completed full gate
does not require rerunning that gate unless executable code, configuration, or dependencies also changed.

GitHub Actions (`.github/workflows/checks.yml`) mirrors the gate stage by stage, but only after a push. It does not
replace running the script before reporting work complete. On the backend, skipping the equivalent script is how the
duplication gate stayed red across four consecutive stories. When a gate stage changes, update `run-all-tests.sh` and
the workflow together.

The script skips components whose tooling is not installed yet and says so. When a component cannot run, name it and
say it was skipped instead of implying the full suite passed.

## More rules

Read and apply all rules in `.agents/rules/*.md`.
