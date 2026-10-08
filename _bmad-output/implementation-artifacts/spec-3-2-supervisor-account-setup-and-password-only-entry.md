---
title: Supervisor account setup and password-only entry (Story 3.2)
type: story
story: 3-2-supervisor-account-setup-and-password-only-entry
created: 2026-10-07
status: done
baseline_commit: 9469ea34b58115c20bbafbec5b6d903cddddd1a0
prepare_model: openai/gpt-6.1-sol
configured_worker_variant: high
---

# Story 3.2 — Supervisor account setup and password-only entry

## Identity, authorization, and scope

Exact story: `_bmad-output/planning-artifacts/epics.md:151-163`; Epic 3 outcome at 133-135. The working tracker's
`next_story` agrees. Prerequisite 3.1 is committed at the baseline above (parent
`cc135de863a6e436c73ec484335c0d2def46cf89`). Its passed 645-unit/143-browser gate is historical evidence for 3.1,
not verification of this story. User authorizes separate reviewed, verified story commits, no push, and stopping at
Epic 3 end. Preparation was read-only apart from this spec. The subsequent approved **implement** dispatch authorizes
the bounded test/hygiene manifest and targeted checks, but no independent review launch, full gate, commit, or push.

Deliver a small handoff integration of completed 1.3/1.7 and new 3.1: administrator creates/inspects a supervisor
invitation → the recipient opens the emailed link in the existing public flow → required account fields → explicit
normal username/password sign-in → currently authorized shell. A fresh supervisor has no MFA-enrollment prerequisite.
An existing factor still produces the server-authored restricted challenge; optional enrollment is not a bypass.

Static inspection found no demonstrated production integration defect. The default implementation is **integration
tests and their actual-case hygiene wiring**, not an authentication rewrite. If a focused test establishes a real
handoff defect, report its reproduction/root cause and amend this manifest before editing its established owner.
Correct existing behavior is preserved. No product decision remains open.

Excluded: Epic 4/course assignment or preparation; supervisor/mentor management; student provisioning; account directory;
additional invitations/roles; faulty deletion; mandatory security setup; MFA enrollment/management/reset/SMS expansion;
auth rewrites; generic workflow/fake engines; dependencies or regenerated API types; CSP changes; baseline retrospective
C2/C5/C6/C7 corrections or compliance closure. Existing field-purpose/lifecycle shortcomings are not silently fixed or
claimed compliant. Do not reinterpret a supervisor role as course authority or introduce a Prepare link before Epic 4.

## Baseline and preserved changes

HEAD: `9469ea34b58115c20bbafbec5b6d903cddddd1a0`; index empty. Exhaustive pre-existing frontend dirt:

- Modified `.opencode/agents/epic-solver.md`.
- Modified `.opencode/agents/epic-worker.md`.
- Modified `.opencode/opencode.json` (approved OpenAI HTTP transport).
- Modified `.opencode/story-execution.md`.
- Modified `_bmad-output/implementation-artifacts/execution/2-1-basic-capability-driven-navigation.yaml`.
- Modified `_bmad-output/implementation-artifacts/execution/2-2-working-routes-and-parent-navigation.yaml`.
- Modified `_bmad-output/implementation-artifacts/execution/3-1-administrator-invites-a-supervisor.yaml`.
- Modified `_bmad-output/implementation-artifacts/sprint-status.yaml` (parent/solver bookkeeping).
- Untracked `_bmad-output/implementation-artifacts/epic-2-retro-2026-10-07.md`.

Backend `mia` HEAD: `63c99925e5995fe2e2467f4f894976dfd4c0d297`. Preserved dirt: modified
`.agents/skills/bmad-brainstorming/assets/brain-methods.csv`, untracked `docs/api-authentication-and-user-invitation.md`.
No backend write. The untracked guide does not replace committed OpenAPI or PRD. No unknown overlap found.
Content-free dirty-file SHA-256 records are in `tmp/agent-execution/3-2-supervisor-account-setup-and-password-only-entry/prepare-context.json`.
Never include these parent changes in the story diff. Solver alone writes tracking/checkpoints; later staging needs
explicit approval of only story-related tracking hunks, preserving unrelated working-tree bookkeeping.

## Tool and model availability

Checked without installs or tests: Node 24.21.0, npm 11.19.0; installed TypeScript 5.9.3, ESLint 9.39.5, Vitest 5.0.1,
Vite 8.3.0, Playwright 1.63.0, Prettier 3.9.8, axe Playwright 4.13.0; bundled Chromium `chromium-1243` executable exists;
Trivy 0.75.0 installed. Declared package/lockfile, normal Playwright config and full gate are unchanged from HEAD.
Licensed library `2026-09-13-083323` is present, and the existing Simple card, labelled input, Simple native select,
With actions alert and Simple sidebar exact `v4/react-light.jsx` paths resolve. No new UI blueprint is needed.
If a demonstrated UI repair becomes necessary, read its exact licensed source before changing markup; current stack
rules/design win over older stack-version prose in the retrieval skill.

Runtime catalog: active `openai/gpt-6.1-sol`, `openai/gpt-6-astra` each support `high` (also low/medium/xhigh/max), and
active `mistral/mistral-medium-2604` supports `high` (also none). Configured/pinned worker is
`openai/gpt-6.1-sol#high`; solver/reviewer `openai/gpt-6-astra#high`; approved cross-provider fallback for each is
`mistral/mistral-medium-2604#high`. Runtime identifies this worker as GPT-6.1 Sol; catalog/config inspection is not
independent observation of its reasoning variant, quota, or HTTP-provider execution health. No paid availability probe.
Follow `.opencode/story-execution.md` on an actual provider failure; no Anthropic default/fallback or retry loop.

## Binding references and prerequisite assessment

Frontend companion paths below are relative to
`_bmad-output/planning-artifacts/ux-designs/ux-mia-frontend-2026-09-12/`. Reference these decisions; do not copy or reopen them.

- `FRONTEND-PRD-FOUNDATION.md:101-129` tutoring-first amendment and FFR-101/102, FFR-114/116..118.
- `EXPERIENCE.md` Public/Restricted entry, invitation ambiguity (244-248), and fragment/secrets boundary (501 onward).
- `ROUTE-INVENTORY.md:13-54,58-151` public, token and restricted paths; current Home is the approved neutral shell.
- `FRONTEND-STATE-MACHINES.md` §1, §9, §27 (including the 1.7 retention amendment), §28 and §29; existing lifecycle
  owners are reused rather than expanded.
- `SURFACE-STATE-MATRIX.md` profiles G/F/T and Public entry/Restricted login, CP-01/02/10, Invitations slice.
- `SECURITY-PRIVACY-ACCEPTANCE.md` Protected Mount, Fragment Bearer Tokens, CSRF, Ambiguous Mutation, Least Data,
  Credential Lifecycle, Existence Hiding, Raw Error, and Test/Diagnostic Secret Hygiene (922-941).
- `ACCESSIBILITY-ACCEPTANCE.md` AC-001..004, AC-008/010/012/016/019; CP-01/02/10. Automation is scoped evidence,
  not complete release conformance or mandatory manual Safari/password-manager/AT evidence.
- `DESIGN.md:85-100,131-149,163-200` and existing source blueprint-binding comments.
- `BACKEND-CONTRACT-GAPS.md` BCG-001 cold/login/1.4/1.7/lifecycle slice decisions, BCG-003 entry guidance and 3.1 O2,
  BCG-006/014 Story 3.1 decisions. These remain globally open; no reconciliation document changes are needed here.

Actual committed backend prerequisites were inspected (not inferred from role or nullable MFA state):

- `mia/api-doc/openapi.yaml:42-89` maps all required operations. `paths/invitations.yaml:1-88,143-206` owns management
  create/list/detail and public preview/acceptance; `schemas/requests/requests.yaml:209-258` owns required acceptance
  attributes; `schemas/resources/resources.yaml:255-317,541-557` owns identity-only creation, session stages and preview.
- `paths/auth.yaml:1-104` owns username/password login, sole-authority discovery, and the authenticated → capabilities
  ordering. Existing challenge verification uses its already-implemented OpenAPI operation; no enrollment read is a gate.
- `paths/users.yaml` capabilities and `resources.yaml` AccountCapabilities own complete catalog/scope; the existing
  minimized entry parser consumes them. Do not fetch `/users/me` or enumerate users to discover authentication.
- `mia/docs/product-requirements.md:354-429,630-649` owns invitation-only staff setup, required profile fields, single-use
  invitation, no course assignment from acceptance, and optional MFA for every role. The acceptance response is not a
  role/scope payload; test only identity-only `201`, then authoritative login/access outcomes.

Required operations already exist in generated types and implemented owners. BCG-001 approved entry/1.3/1.4/1.7/1.8
slices are sufficient for reuse; no new lifecycle/SSE transport. BCG-003's current entry slice is reused for Home;
the settled `accounts.administer` + available + global mapping applies **only to the administrator**. BCG-006/014
3.1 approval covers management handoff; no new resend/revoke semantics. BCG-005/007 broader release obligations remain,
with current no-store/error-disclosure behavior reused under existing slice evidence. BCG-008 account-directory and
BCG-009 additional MFA settings are not prerequisites. No new blocker or owner decision was identified.

## Existing owner and symbol map (read-only unless a defect is demonstrated)

- `src/main.tsx`, `platform/session/linkFragment.ts`, `platform/session/invitationLink.ts`: pre-app capture/strip,
  `InvitationLink`, `invitationSurface`, acceptance outcome/teardown states.
- `src/features/auth/InvitationEntryRoute.tsx`: `InvitationPreview`, `AcceptanceForm`, six required visible fields;
  `NewPasswordFields.tsx`/`passwordRules.ts` validate chosen passwords.
- `src/platform/api/entry.ts`: `previewInvitation`, `acceptInvitation`, `loginWithPassword`, discovery and capabilities.
  The acceptance parser validates identity-only `201` and returns no retained account/profile resource.
- `src/features/auth/LinkFlowParts.tsx`: `SuccessResult` has an explicit **document** `/login` link; no auto-login.
- `src/features/auth/PasswordSignInForm.tsx`, `MfaEntryRoute.tsx`, `MfaVerificationForm.tsx`: existing entry/challenge.
- `src/platform/session/sessionController.ts`: `runPublicMutation`, password login, `applySession` stage switch,
  capability identity validation, security epochs; only authenticated invokes capability discovery, never factor lookup.
- `src/app/App.tsx`, `routes/entryRoutes.tsx`, `ApplicationShell.tsx`: canonical stage dispatch and minimized authorized
  navigation. Current supervisor Home can have Home, permitted Profile/security and Sign out; optional MFA navigation
  is not an enrollment prerequisite. No Administer for this supervisor and no speculative course link.
- `src/platform/api/invitations.ts`, `src/app/routes/AdminInvitationRoute.tsx`, `src/features/invitations/*Route.tsx`:
  committed management UI reused without changing create/delivery/refresh/authorization contracts.

## Exhaustive planned implementation manifest

Worker-owned story files (one new spec, five existing test/harness files; no production source edits planned):

1. `_bmad-output/implementation-artifacts/spec-3-2-supervisor-account-setup-and-password-only-entry.md` — this spec/progress.
2. `e2e/scaffold.spec.ts` — one bounded `supervisor onboarding handoff` describe, using local completed 1.3/1.7
   `mockSession`, `mockCapabilities`, `installInvitationMocks`, `openInvitationLink`, `acceptByKeyboard`, keyboard,
   paste, axe/reflow and browser-zoom helpers. No fixture extraction/refactoring of unrelated suites. Minimal optional
   fake hooks may connect the existing acceptance mock to the created invitation and supplied per-run CSRF without
   changing historical defaults. Keep existing auth/recovery/MFA tests otherwise unchanged.
3. `e2e/routeSecretHygiene.ts` — add only onboarding live-input/raw-error checkpoints, boolean observations and teardown
   support needed by the actual new cases. Reuse generated markers; no new global fixture store.
4. `scripts/route-secret-hygiene-cases.ts` — inventory every new secret-bearing browser test once with exact public
   titles/checkpoints, alongside inherited cases; no test name derived from fixture data.
5. `scripts/check-route-secret-hygiene.mjs` — additionally inventory only the new scaffold describe via a bounded
   `--list --grep` invocation (not all historical scaffold tests); combine it with the existing inventory and retain
   exact equality checks. Add explicit `supervisor-onboarding` scope for focused checks; default gate still covers all.
6. `playwright.route-secret-hygiene.config.ts` — permit the scaffold file for exact inventoried-title probes, retaining
   one actual test, no retry, screenshots/trace/video off, original reports and explicit failure identity.

Reused, unchanged fixtures: `e2e/invitationFixtures.ts` (`invitationBackend`/`invitationRoutes` with actual create
dispatch counters/returned records), `e2e/routeFixtures.ts`, `e2e/secretAssertions.ts`, `test/mfaFixtures.ts`.
No new production/test infrastructure, dependency, API, route, catalog, blueprint, gate bypass, or unit-only mock engine.
The only harness extension is registering/probing these actual joined browser cases; the current gate already invokes it.

Solver-owned, separately approved closure paths (not worker edits):

- `_bmad-output/implementation-artifacts/execution/3-2-supervisor-account-setup-and-password-only-entry.yaml`.
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — only Story 3.2/Epic 3 closure hunks later approved by solver.

Operational evidence stays under `tmp/agent-execution/3-2-supervisor-account-setup-and-password-only-entry/`, never staged.
Any additional file needs an evidence-backed manifest amendment reported before editing; no speculative source allowance.

## Implementation blocks and acceptance coverage

### B1 — Join the existing fixtures at the real public boundary

Use isolated administrator and recipient browser contexts. Administrator setup begins authenticated with the approved
global invitation capability; recipient begins anonymous. Connect a synthetic **email delivery fixture**, not a new UI
link/control: management OpenAPI never returns the bearer token and the frontend must never fetch or manufacture it.
Generate the token only inside the local protocol fake. Connect it to the backend-created opaque invitation record,
not by email matching in the client. No SMTP/paid provider or backend mutation is needed for browser integration tests.

For each Standard/Large/Extra-large happy-path test at direct 320 CSS pixels:

- Use actual management UI create/detail and its one `POST`; observe Pending/Queued, no account or mail-receipt claim.
- Open that fixture-delivered link in the recipient context; preview reveals Supervisor only (no email/inviter/record).
  Prove synchronous hash/history cleanup before render/request using the existing 1.7 instrumentation.
- Complete the existing form by keyboard/paste: username, both password fields, language, country, time zone. Check
  prefilled/changeable locale/time zone and required fields, exact JSON:API envelope/attributes and fresh CSRF as
  booleans/fingerprints only. An incomplete/local-invalid form dispatches nothing.
- On definitive `201`, fake persistence consumes the invitation but keeps recipient anonymous. Account-created result
  has explicit Sign in; no auto-login/capability/MFA operation, password/token controls gone. Follow the actual `/login`
  document link and deliberately submit the same chosen credentials; exact-byte comparison is boolean only.
- Login returns authenticated; hold capabilities pending and prove no shell until resolved for that same account.
  Resolve supervisor-scoped capabilities; Home shell and Sign out appear, no Administer/Invitations, no enrollment
  prerequisite/read/mutation, no unimplemented course destination. Count forbidden operations at actual requests.
- Administrator explicitly Refreshes the invitation to observe Accepted; it does not infer acceptance from recipient
  navigation or polling. Reload/history reconstruction sends no acceptance/login/create replay and restores no secrets.

Maps to story AC1/AC3 and the password-only half of AC2. This is protocol-fake frontend evidence, not SMTP, CLI,
backend account-role transaction, or full cross-browser release evidence.

### B2 — Meaningful first-pass handoff boundaries

Include new actual cases for:

- **Loading/hidden/stale:** after chosen-password login, delay capabilities; no shell or protected chunks/title. Hide
  while pending, then release the old result: privacy shield remains, no automatic reveal/request/replay; explicit
  Refresh alone may re-establish current access. No changes to deferred C2/C5/C6/C7 semantics.
- **Failed/denied access:** fail the capability read after login; no shell from successful credentials alone. Explicit
  retry is a read, never a login repeat. Supervisor direct administrator URL falls back under current capabilities
  without invitation reads/probing; test after the handoff, not by a role flag.
- **Existing factor:** password login returns `mfa` with authoritative challenge ID. Only method-neutral challenge plus
  logout, no shell/capability read/enrollment; one explicit verification then authenticated capability gate. The fresh
  supervisor variant never enrolls a factor to reach Home. Maps to remaining AC2, without broader MFA test expansion.
- **Ambiguous acceptance:** commit the fake acceptance then lose its response **after request dispatch**. Observe one
  actual acceptance, unknown result/no success claim, no resubmit/auto-login/replay on lifecycle/history/reload. A
  reopened consumed link has the existing fixed invalid presentation, not proof of earlier success. Explicit chosen-
  credential sign-in can enter only through its own authoritative result; administrator explicit read may show Accepted.
- **Management invalidation:** administrator Revoke through its existing reviewed UI makes the fixture-delivered link
  invalid; no acceptance/login attempt and no public lifecycle/email disclosure. Reuse uniform invalid-link evidence
  from 1.7 rather than rebuilding its complete invalid-cause matrix. No new revoke feature work.

Exercise keyboard focus/title-before-focus, one main/H1 and safe parent/Sign in exits at joined transitions. Reuse axe
on representative acceptance/signed-out/shell states with no scanner-rule suppression. Add bounded joined-process
locale/text-mode smoke across seven launch locales and actual 200% browser zoom in all three text modes, using existing
zoom helpers (no application CSS counter-scaling). Existing 1.3/1.7/2.1/3.1 gate suites retain their deeper isolated
spacing, forced-colors, reduced-motion and 400% coverage; this story does not relaunch all release-process work manually.

### B3 — Actual-case deliberate failures and scoped evidence

Before handing off implementation, register each new test and every relevant live-secret point in the existing checker.
Planned public IDs: `supervisor-handoff-{standard,large,extra-large}`, `supervisor-gate-hidden`,
`supervisor-gate-recovery`, `supervisor-existing-factor`, `supervisor-acceptance-unknown`, `supervisor-revoked-link`,
`supervisor-locales`, `supervisor-zoom`. If case grouping changes during implementation, update this inventory to the
actual exact titles, not a promised count. No review-finding/count quota.

Secret-bearing deliberate-failure inventory:

- All cases create CSRF cookies: probe settled `complete` for each actual case, including cookie-only revoked-link case.
- Happy/text/locale/zoom cases: probe administrator `invitation-email`/`invitation-detail`, recipient
  `onboarding-acceptance-input` (new password and confirmation live), and `onboarding-login-input` (chosen password live).
- Gate-hidden/recovery cases: probe `onboarding-login-input`; recovery also probes `onboarding-gate-error` with the
  generated raw error actually revealed in its escaped disclosure (never the announcement).
- Existing-factor case: probe `onboarding-login-input`, then `onboarding-mfa-input` while the generated code is live.
- Unknown case: probe acceptance/password and later sign-in/password; prove actual one-dispatch counters after loss.
  Reopened-link/terminal teardown assertions inspect marker absence through booleans, never serialize a protected DOM.

Generate every secret marker per run with `routeSecretFixture`; the harness knows all cookies/tokens/password/code/email/
raw-body markers. For multiple contexts thread each relevant fixture to the checkpoint page or checkpoint the actual
owning page so the point cannot silently pass. Do not create a secret outside the scanner envelope. Disable automatic
artifacts for every new test/context, close every owned context and drop fixture references in `finally` even on early
failure. Console/storage/title/URL/history/live-region checks return only booleans/counts; never persist captured bodies.

Deliberately fail the **actual test at each live point**, require the checkpoint file and exact controlled failure identity,
and reject an early-failure canary. Scan complete original stdout/stderr and every generated artifact before parsing,
summarizing or deletion; save content-free digests/counts/dispositions only. A skipped probe, missing checkpoint, leaked
marker or unrelated failure is not passed. Do not substitute inherited fixed canaries for these actual new tests.

## Checks and evidence plan (not executed in prepare)

During implement, sequentially:

1. `npm run typecheck`, `npm run lint`, `npm run format:check` for changed test/script/config inputs.
2. Focused inherited unit regression: `npx vitest run src/app/App.test.tsx src/platform/session/invitationLink.test.ts`
   `src/platform/api/entry.test.ts` (no new secret-bearing unit test planned).
3. One targeted build, then `npx playwright test e2e/scaffold.spec.ts --grep 'supervisor onboarding handoff'`.
   Run affected inherited invitation/sign-in browser cases if their shared fake defaults were touched.
4. `MIA_ROUTE_HYGIENE_SCOPE=supervisor-onboarding MIA_ROUTE_HYGIENE_REPORT=tmp/agent-execution/3-2-supervisor-account-setup-and-password-only-entry/logs/targeted-hygiene.json node scripts/check-route-secret-hygiene.mjs`.
   Scanner uses the targeted build; do not overlap preview servers/checks or kill unknown servers.

After implement/fix, save the complete tracked-plus-new story diff (no staging, exclude all baseline parent edits), exact
manifest, changed-input hashes and content-free command/results logs under this story's `tmp/agent-execution` directory:
`story.diff`, `manifest.json`, `logs/targeted-*.log`, `logs/targeted-hygiene.json`. Independent review inspects this actual
diff and test boundaries, not an implementation narrative. Solver dispatches it; worker does not launch another agent.

Verify phase inspects final diff and runs `./run-all-tests.sh` once for the final application/test/script/config/dependency
fingerprint including new files and read-only backend OpenAPI inputs. Capture before/after hashes, full baseline SHA,
commands, content-free logs and exact pass/fail/skip dispositions. One build within that gate; no redundant build afterward.
Any source/config change invalidates this evidence. Manual supported-browser/AT/password-manager release work is not run
or claimed passed. Trivy/network/tool failure is reported, not converted to a pass. No required tooling currently missing.

This spec is Markdown-rule exempt (`_bmad-output`); preparation requires planning consistency only, not app lint/tests/builds.

## Risks and settled decisions

- Independent fakes can create a falsely connected journey. Tie delivered token validity and acceptance persistence to
  the actual created opaque record, and normal login eligibility to completed fake registration; never return success
  unconditionally for unrelated credentials. Assert exact wire equality without printing bytes.
- Existing fixture clocks differ. Use a coherent test-only instant/deadlines for all contexts and transitions; do not
  alter application expiry policy or freeze away a boundary under test. Reuse the current controlled-clock patterns.
- Cross-tab security messages can distort a multi-role test. Separate contexts isolate unrelated accounts; same-origin
  channel behavior remains untouched and inherited coverage stays in the final gate.
- New tests inside scaffold must not make its hundreds of historical cases new hygiene scope. Select the one named new
  describe for inventory, then exact actual titles for probes; retain inherited route inventory equality and early canary.
- Existing field-purpose/deferred auth findings and release BCGs stay open; this spec does not promise full CP-01/CP-10
  closure merely because the handoff works. No new product/API decision, dependency or source repair is presently needed.

## Progress log

- 2026-10-08 verify complete: independent reviewer `ses_ee5ee34abffe0Zt0Hy7yi0zjeS` PASS with zero findings/reproduction
  requests supplied by solver. Current six-file hashes and executable diff matched that reviewed state before running
  **one** `./run-all-tests.sh`, 05:57:02.307Z–06:16:35.261Z, exit 0. All stages passed; no skipped/not-reached components.
  Unit suite: 645 tests / 22 files; bundled Chromium: 153 tests; failed/skipped tests zero. Exactly one build inside the
  gate, reused by browser and hygiene. Binding gzip budget: 241968/256000 bytes; seven ICU catalogs and API type comparison
  passed. Typecheck/coverage canaries, lint/architecture, formatting, zero-clone duplication over 70 logic files, npm audit,
  installed Trivy 0.75.0 vulnerability/secret scan, licensed catalog and Markdown checks all executed successfully.
- 2026-10-08 all-case hygiene: five-browser/seven-unit dedicated deliberate-failure cases passed with their early canaries
  rejected. Actual-case scan covered **all 46** inventoried browser cases, **94** live-secret checkpoints and one rejected
  route early canary, zero leaks in full original stdout/stderr/artifacts. The new story accounts for 10 cases / 50 points
  within that run, not an additional total. Final gate log and route evidence: `logs/verify-full-gate.log` and
  `logs/verify-route-hygiene.json` under this story's evidence directory.
- 2026-10-08 verify identity/preservation: 184 application/test/script/config/dependency/backend-contract inputs have equal
  before/after membership and exact hashes, fingerprint `eb6997b4ce3cc5fd1c5350d7c7ca9ce3192d16bd13c0855d673dd1c919c88b2c`.
  New spec was independently hashed before/after the gate and unchanged, then only these reporting notes/status changed.
  Parent/backend files and solver checkpoint/tracker still match verify-start hashes; index empty, HEAD unchanged.
  Spec/report-only updates do not invalidate the gate. No second gate/build/tests, application edit, staging, commit or push.
- 2026-10-08 authorized advisories substantiated: unchanged package/lock/KaTeX versions identify LOW
  `CVE-2026-103923` / `GHSA-238p-pmpm-9mq7` (four npm chain entries; nested 0.16.47, fixed 0.18.2); remains unresolved under
  the permitted Story 3.1 disposition. The sole MEDIUM `sendgrid-api-token` finding is the exact 249-unique-country static
  list in `dist/assets/InvitationEntryRoute-D9L7hnDA.js`, byte range [532,1278), reported offset 1123. Source/consumer
  hashes match Story 3.1 and baseline; no credential, suppression or dependency change. Details: `verify-advisory-dispositions.json`.
  Existing Vite >500kB, jsdom navigation, Vitest worker-reuse and Playwright slow-file advisories remain reported, not hidden.
- 2026-10-08 final verify handoff: `verify-report.json`, `verify-manifest.json`, `verify-story.diff`,
  `verify-commit-ready-manifest.json` and `proposed-checkpoint-closure.json` contain exact dispositions/hashes/scope.
  Solver alone records verification, prepares commit-pending and approves exact Story 3.2/Epic 3 tracker hunks, then dispatches
  the separate commit phase. No real backend/SMTP/provider transaction or manual supported-browser/AT release evidence claimed;
  protocol-fake integration and deferred baseline/open-release obligations remain the declared scope. Blockers: none.
- 2026-10-08 final implementation handoff: final-state typecheck, lint/architecture, formatting and diff-whitespace checks
  passed after temporary wrapper cleanup. Eight captured parent files still match preparation hashes; the sprint tracker
  changed only through the solver's dispatch bookkeeping and is excluded together with the solver's new 3.2 checkpoint.
  Index remains empty; baseline and backend dirt unchanged. Actual six-file unified diff, exhaustive ownership manifest,
  input fingerprints and per-run results are in `story.diff`, `manifest.json`, `input-fingerprint.json`, and
  `implement-report.json` under this story's `tmp/agent-execution` directory. Next action is solver-dispatched independent
  review, followed by a separate authoritative verify phase; status implemented does not mean verified or done.
- 2026-10-08 implement B1/B2 complete: final connected suite passed 10 tests, including three direct-320 text modes,
  21 locale/text combinations inside one case, all-three-mode actual 200% zoom inside one case, delayed/hidden/failed
  admission, existing-factor challenge, committed-but-lost acceptance, consumed link, and management revocation.
  Administrator and new supervisor now have distinct account identities; login/capability/challenge use the new one.
  Actual request counters and protected Home chunk counts prove gate order/non-fetch/no unsafe replay. No production
  defect demonstrated or source repair needed. A separate earlier five-test run passed the strengthened chunk boundaries;
  it overlaps the 10-case suite and is not added to a total. Separate inherited sign-in/acceptance run: 17 tests passed.
- 2026-10-08 implement B3 complete: final deliberate-failure scan inventoried 46 actual browser cases, selected only the
  10 new handoff cases, and passed all 50 live-secret checkpoints plus a rejected early-failure canary. Complete original
  stdout/stderr and generated artifacts were scanned before summaries/deletion, with zero leaks. Earlier pre-account-
  separation scan is retained separately, not counted twice. Final evidence: `logs/targeted-hygiene.{json,log}`.
- 2026-10-08 targeted checks: three inherited unit files passed 262 tests in one run; targeted build passed with the
  existing >500kB Vite advisory. Typecheck and lint/architecture passed; formatting required a second deterministic
  formatter pass before passing. A later lint failure was confined to the temporary uncommitted log wrapper's Node
  imports; corrected without suppression or configuration change. Duplication marker balance passed over 73 input paths,
  and the unchanged authoritative source scan found zero clones in 70 analyzed logic files (tests/harness are outside
  that mechanical scope). Final source-state static results and exhaustive hashes are supplied in the handoff report.
  No full gate, independent review, commit, push, tracking write, retrospective closure or Epic 4 execution.
- 2026-10-08 initial targeted browser run: failed all 10 cases; scanner withheld original output because a fixture marker
  appeared in generated failure evidence. Unsafe artifacts were inspected only through sanitized diagnostics and removed.
  Root causes were test setup (paste appended to an already-filled password) and an incorrect revoked-result assertion,
  not a production defect. Corrected only those test sites; pass-through snapshot-disable environment is now explicit
  for focused and hygiene child processes. Initial evidence remains failed, never counted as passing coverage.
- 2026-10-08 implement code block B1/B2/B3: added the bounded scaffold describe and connected state. The token belongs
  to the actual management-created record; strict acceptance consumes it and enables only matching chosen-password
  login; existing-factor verification is challenge/state/wire-gated. Existing 1.7 fixture defaults remain unchanged.
  Added actual title inventory, password/confirmation/login/MFA/raw-error checkpoints and focused hygiene scope.
  Production sources/dependencies/parent files remain untouched. Initial typecheck and lint/architecture passed;
  browser/failure-scan execution and final handoff evidence still pending. No completion or full-gate claim.
- 2026-10-08 implement resume: parent confirmed the interrupted session absent from active sessions. Inspected disk,
  checkpoint and process list: no application/harness edit had completed, only prepare-context.json exists, and no
  surviving Playwright/Vitest/Vite/npm/gate process was observed. Baseline unchanged; solver checkpoint/tracker now
  implement/in-progress, preserved. Continuing the approved manifest without restarting preparation or settled decisions.

- 2026-10-07 prepare block 1 complete: inspected HEAD/history/index/worktree and approved parent/backend dirt; story
  identity/prerequisite confirmed, no unknown overlap. Preserved all pre-existing files; solver bookkeeping untouched.
- 2026-10-07 prepare block 2 complete: read AGENTS/all scoped rules/protocol, story/current binding companion slices,
  actual committed OpenAPI/PRD and established auth/acceptance/management source and fixtures. No demonstrated production
  integration defect or new dependent transport gap; scope is test-first handoff integration with established owners.
- 2026-10-07 prepare block 3 complete: checked installed tooling/Chromium/licensed paths and active exact model/variant
  availability without installations or paid probes. Wrote bounded manifest, acceptance/first-pass boundary coverage,
  actual-case failure inventory and evidence plan. Status ready, open decisions none. No implementation/test/build/review/
  gate/commit performed. Next action: solver records ready checkpoint and dispatches implement for this spec only.
- 2026-10-07 prepare consistency: spec/manifest paths and exact current story/next-story agree; HEAD/index and every
  captured dirty frontend file remain unchanged. Content-free prepare report JSON parsed successfully. Spec remains
  Markdown-exempt; application checks intentionally not run. No blocker or extra file added to implementation scope.
