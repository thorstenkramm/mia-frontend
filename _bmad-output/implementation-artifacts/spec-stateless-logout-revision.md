---
title: 'Accept the reduced stateless logout guarantee'
type: 'chore'
created: '2026-09-27'
status: 'done'
baseline_commit: '5679af564b825e797c2f57724e4713330210efad'
route: 'dispatch'
review_loop_iteration: 0
---

<frozen-after-approval reason="owner-directed documentation revision; proceed checkpoints preapproved">

## Intent

On 2026-09-27 the owner instructed: "frontend’s logout requirements shall be revised", choosing the backend's
documented reduced stateless guarantee over strengthening the backend. Revise directly affected frontend contracts
so implementers do not promise universal prevention of authentication restoration after logout.

Accept that delayed login, MFA-completion, and password-change responses admitted before logout may restore
authentication. There is no server-side per-browser revocation or durable guarantee across suspended or terminated
contexts. Keep local shielding, quiescence of known transitions, backend `204` plus subsequent anonymous discovery,
independent tab checks, explicit reconciliation after late transitions, truthful copy, and no automatic unsafe replay.

## Boundaries & Constraints

Always reference maintained backend product requirements and OpenAPI for behavior and transport. Record the dated
owner decision in the frontend product contract and reconcile its dependants. Close only the logout product conflict
inside BCG-001; retain its MFA, CSRF, deadline-header, SSE, lifetime-wording, and evidence questions. Story 1-2's wired
canonical entry remains blocked. Preserve existing reconciliation records, story/application work, and sprint tracking.

Never edit the backend, implement application behavior, duplicate transport schemas, commit, claim shielding revokes
cookies, or infer resolution of unspecified product questions. Historical reviews remain evidence of their date,
not current requirements. If independent review is unavailable, provide a complete supervisor-dispatch prompt and
leave review pending.

</frozen-after-approval>

## Code Map

- `mia/docs/product-requirements.md` §Authentication session lifetime and `mia/api-doc/paths/auth.yaml`
  (`sessionDiscovery`, `logout`), plus root OpenAPI `sessionCookie`: read-only authorities. Clean backend revision
  `0626b751558c8baa7e4645708ef588b309446ed8`.
- `mia/internal/auth/auth_test.go` `TestLogoutReorderingUsesReducedStatelessGuarantee`: cookie-pair simulation
  confirms the accepted limitation, not browser lifecycle evidence.
- UX contract directory: `_bmad-output/planning-artifacts/ux-designs/ux-mia-frontend-2026-09-12/`.
  `FRONTEND-PRD-FOUNDATION.md` owns the decision; `SECURITY-PRIVACY-ACCEPTANCE.md` owns detailed logout acceptance.
  `EXPERIENCE.md`, `FRONTEND-STATE-MACHINES.md`, `ACCESSIBILITY-ACCEPTANCE.md`, and `BACKEND-CONTRACT-GAPS.md`
  contain the obsolete universal anti-restoration requirement. Inspect route/surface companions for consistency.
- `.agents/rules/security-privacy.md` summarizes logout mechanics and needs the same limited confirmation semantics.
- `_bmad-output/planning-artifacts/epics.md`, architecture `ARCHITECTURE-SPINE.md`, and
  `_bmad-output/specs/spec-mia-frontend/SPEC.md`: propagate the binding decision through references where needed.
- Existing `spec-bcg-001-contract-reconciliation.md`, its review record, Story 1-2, sprint bookkeeping, and staged
  application files are prior work. Preserve them; do not reinterpret their recorded checks as this task's evidence.

## Tasks & Acceptance

### Execution

- [x] Update `FRONTEND-PRD-FOUNDATION.md` with dated source instruction and replace impossible logout guarantees.
- [x] Reconcile `SECURITY-PRIVACY-ACCEPTANCE.md`, `EXPERIENCE.md`, `FRONTEND-STATE-MACHINES.md`, and
  `ACCESSIBILITY-ACCEPTANCE.md` so confirmation, late-transition recovery, focus, copy, and negative tests agree.
- [x] Update only BCG-001's logout-conflict assessment and acceptance expectations in `BACKEND-CONTRACT-GAPS.md`.
- [x] Align `.agents/rules/security-privacy.md` and directly affected architecture/spec/epic references; search all
  frontend planning and instructions for surviving stronger claims without rewriting historical evidence.
- [x] Run `./run-all-tests.sh`, inspect diff integrity and backend cleanliness, and arrange independent review or
  record the full fallback prompt.

### Acceptance Criteria

- Given the owner's instruction, when a frontend implementer reads the contracts, then late authentication transitions
  are explicitly allowed to restore authentication and no universal revocation guarantee is required.
- Given known in-flight transitions, when logout begins, then admission closes and confirmation waits for their
  settlement, backend `204`, and subsequent anonymous discovery; abort alone is not proof of settlement.
- Given a late transition after confirmation, when it is observed, then the UI shields, withdraws current confirmation,
  and requires explicit session reconciliation without unsafe replay or automatic protected reveal.
- Given another tab or a suspended context, when it resumes or receives a logout notification, then it cannot treat
  the notification as authority; each tab needs its own permitted discovery before confirmation.
- Given a logout failure or ambiguous result, when the privacy screen renders, then it states that content is hidden
  locally and logout is unconfirmed, with explicit safe recovery and no cookie-revocation claim.
- Given this documentation revision, when BCG-001 is assessed, then only the product conflict is closed and the
  composite blocker and Story 1-2 wired-entry restriction remain open.

## Implementation Notes

Investigation found no missing owner choice or irreversible operation. The footprint spans linked binding documents,
so use the full dispatch spec rather than a small-change oneshot. The renderer succeeded without cache repair.

- Implemented the linked contracts and added a reconciliation-needed state plus matching restricted logout surface and
  route references. The security companion owns detailed recovery; backend schemas remain referenced, not duplicated.
- Searched frontend planning, canonical specs, agent rules, and OpenCode instructions for logout, pre-logout,
  anti-resurrection, atomic ordering, cookie absence, and authentication-restoration claims. Remaining stronger wording
  in historical PRD review reports (especially `review-downstream.md` and its HTML validation report) is a quotation of
  the superseded contract, not a current requirement. Preserved those reports and the prior reconciliation records.
- `npx markdownlint --fix .agents/rules/security-privacy.md` and `./run-all-tests.sh` passed on 2026-09-27. No suite
  components skipped: typecheck, lint/architecture, formatting, 30 unit/component tests, build, bundle size, seven ICU
  catalogs, three Chromium E2E tests, duplication markers/scan, npm audit, Trivy, Tailwind Plus catalog, Markdown lint.
  Planning/implementation artifacts are exempt from Markdown lint by policy. These scaffold tests do not establish
  logout browser acceptance. Backend evidence was inspected, not rerun.
- `git diff --check` passed. No application, Story 1-2, sprint bookkeeping, prior reconciliation record, or backend
  edits were made by this task; no commit or staging was performed. Normal ignored build/test outputs were regenerated.
- Independent Blind Hunter, Edge Case Hunter, and Verification Gap reviews remain pending because no subagent tool is
  available. The standalone prompts are `review-stateless-logout-blind-hunter.md`,
  `review-stateless-logout-edge-case-hunter.md`, and `review-stateless-logout-verification-gap.md` beside this record.
  Author checks are not independent review. The workflow stops at this gate for supervisor dispatch and returned findings.

## Spec Change Log

## Review Triage Log

### 2026-09-27 — Independent review returned through supervisor

All required layers returned: Blind Hunter reported finding 1, Edge Case Hunter reported findings 2 and 3, and
Verification Gap Reviewer reported no gaps. These are independent results supplied by the user, not author self-review.
The pending-review note above is superseded. The user explicitly authorized fixing these concrete inconsistencies
within the accepted decision using existing serialization/privacy rules; no new product decision was needed.

- **High — patch — finding 1, pending-dispatch reconciliation ordering.** Confirmed that the security companion offered
  Refresh immediately after dispatch while also requiring an exclusive lease through confirmation. Clarified pending
  dispatch/confirmation, a local reconciliation marker, same-attempt outcome bookkeeping, fencing of ended/superseded
  callbacks and stale discovery, lease release before recovery, and serialized explicit Refresh/Retry. Added acceptance
  sequences for pending POST, `204`, non-`204`, ambiguous outcomes, and a transition during discovery. This applies the
  existing single-attempt barrier and no-replay rules without adding transport or a new product policy.
- **High — patch — finding 2, receiving logout participant bypass.** Confirmed that generic security-epoch handling
  allowed the ordinary mount gate despite the logout flow requiring reconciliation and Retry for authenticated state.
  Made retained local logout flow take precedence, including withdrawal of confirmation, deferral behind an active
  barrier, and explicit discovery without protected reveal. Updated both logout and security-epoch acceptance checks;
  message shapes and notification-only authority are unchanged.
- **Medium — patch — finding 3, reload assertion exceeded accepted guarantee.** Confirmed that the blanket
  no-protected-content assertion contradicted fresh-document entry after late authentication restoration. Restricted
  that assertion to stale pre-logout content; retained/BFCache documents keep local logout recovery, while fresh
  documents use the full ordered authorization gate and may display newly fetched authorized content. No durable
  logout state or universal revocation claim was introduced.

Only the security companion, state-machine companion, and this build/review record were edited for these findings.
The original standalone reviewer prompts remain historical inputs. BCG-001 and the Story 1-2 wired-entry blocker
remain open; independent review completion does not supply missing backend/browser acceptance evidence.

### Completion

All three concrete findings were accepted and patched; none was deferred and no additional owner decision was needed.
The documentation build/review is complete. `./run-all-tests.sh` passed after the review fixes on 2026-09-27 with
30 unit/component tests and three Chromium E2E tests; every configured component ran, with no failures or skips.
`git diff --check` passed. Planning/implementation Markdown remains exempt from lint by repository policy, and the
existing scaffold tests are not logout browser acceptance evidence. Backend status remained clean at
`0626b751558c8baa7e4645708ef588b309446ed8`; backend tests were not rerun. No staging or commit was performed.

## Verification

- `./run-all-tests.sh`: report each failure or skip; its application tests are not logout implementation evidence.
- `git diff --check`: no whitespace defects.
- Search active frontend contracts and instructions for universal anti-restoration, atomic logout, cookie-absence,
  and all-context guarantees. Classify historical review quotations separately.
- Confirm unchanged backend revision and clean status; preserve pre-existing staged and unstaged work.
