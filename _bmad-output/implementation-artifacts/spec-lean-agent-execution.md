---
title: Lean, resumable story execution
type: chore
created: 2026-10-06
status: done
route: dispatch
review_loop_iteration: 0
baseline_commit: 839220d961973b163f12027d93afeeca9490c3d9
context:
  - AGENTS.md
  - _bmad-output/implementation-artifacts/epic-1-retro-2026-10-06.md
---

<frozen-after-approval reason="User approved the preceding recommendations and requested implementation">

## Intent

Make story implementation fast and resumable by assigning phase ownership, removing redundant review and verification,
and making the verification gate trustworthy. The user approved the model starting points, workflow simplification,
V2 agent alignment, checkpoints/fallbacks, and gate repairs together. Existing uncommitted planning, AGENTS.md, retro,
and build.sh work is known conversation work to preserve, not a new reason to request approval.

## Boundaries & Constraints

Keep the tutoring-first backlog and completed story history unchanged. Do not implement Story 2.1 or the auth defect
backlog, weaken checks, add suppressions, call paid providers in tests, push, or commit this change. Existing application
TypeScript errors exposed by the corrected gate may receive minimal type-correct repairs, without behavior redesign.
Installed BMAD sources are update-owned: use supported team overrides. Step ordering not exposed by customization is
not safely overridable; the epic agents must use a standalone bounded phase protocol rather than nesting full workflows.
Read-only reviewer permissions must cover shell writes as well as edit tools. Runtime validation must be content-free.

## Acceptance Criteria

- Given the current replanned backlog, when the solver selects work, then it honors next_story and exact numeric IDs
  without requiring future entries in Epic 1's historical stories.yaml or restarting completed stories.
- Given a story, when executed, then one worker implements, one reviewer reviews, one final gate verifies, and closure
  is recorded only with recoverable commit confirmation; repairs reuse the worker and do not reset settled decisions.
- Given a stopped/failed worker, when recovery starts, then a checkpoint identifies landed work, one bounded resume is
  attempted, and any approved provider fallback starts only after the original writer is known to be stopped.
- Given a review with no demonstrated defects, when returning its result, then zero findings is valid; no finding quota
  or automatic wholesale rewrite applies to the epic loop.
- Given a type error in an included application or tooling file, when running typecheck, then it fails. A negative canary
  verifies both project coverage paths without leaving invalid source behind.
- Given the complete gate, when it runs, then E2E and hygiene consume the one build from that invocation. Standalone
  commands remain self-contained. Given early failure in a hygiene case, the gate rejects it rather than counting it as
  the deliberate post-secret failure. Verification output must never print fixture secrets.

</frozen-after-approval>

## Code Map

- `.opencode/agent/*.md`: legacy definitions, inconsistent ownership/model labels, obsolete story mapping, polling deadline.
- `.opencode/opencode.json`: legacy plugin/depth fields; verify supported V2 configuration before adapting.
- `_bmad/custom/`: supported sparse TOML team overrides; installed customize.toml exposes keyed review layers/handoffs.
- `package.json`, `run-all-tests.sh`, `tsconfig*.json`: repeated builds and ineffective solution typecheck.
- `scripts/check-secret-hygiene.mjs` and its fixtures: failed-test count lacks checkpoint/failure identity proof.
- `.agents/rules/security-privacy.md`: stale idle-renewal and URI summaries; align by reference to approved contracts.

## Tasks & Acceptance

- [x] Verification worker: repair package scripts/full gate, actual TypeScript coverage and surfaced compiler errors,
  add negative coverage canaries, prove hygiene checkpoint identity and rejection of early failures. Read relevant rules
  before editing. Do not edit agent definitions, BMAD overrides, this spec, AGENTS.md, or planning/tracking files.
- [x] Parent: migrate/enable agents under V2, pin approved models, implement lean phase instructions and checkpoint
  protocol, safe permissions, scoped fallback and runtime validation; correct the two stale security-rule summaries.
- [x] Parent: add sparse BMAD review overrides permitting zero findings and conditional additional lenses; document the
  boundary between standalone BMAD workflows and epic agents rather than pretending unsupported step hooks exist.
- [x] Verify effective overrides, runtime discovery/permissions, full gate, focused independent review, and preserve all
  unrelated changes. Update this spec with exact results and any limits.

## Implementation Notes

Dispatch the verification task first. It owns targeted checks only and reports results; the parent owns the final full
gate after all edits, so no checks overlap. No application product requirements change. Models are initial trial settings,
not claims of measured superiority. The user approval covers the cohesive recommendation package and routine checkpoints.

Implemented: V2 `.opencode/agents/` discovery, explicit model variants and permissions, shared standalone phase/checkpoint
protocol, one read-only reviewer, quota-free sparse overrides for all three BMAD review entry points, corrected idle/TOTP
instruction references, one-build gate, real project typechecks and negative canaries, per-case secret-hygiene checkpoint
and deliberate-failure identity. Initial runtime: OpenCode v2.0.22; `debug agents` discovered exactly the three new agents
with the intended model variants and effective permission lists. No model benchmark or unattended story run was performed.

BMAD customization exposes review layers, not arbitrary step routing. The epic loop therefore does not invoke complete
BMAD workflows; its in-place repair policy is implemented in the shared protocol. Standalone BMAD workflows keep their
installed step routing, with quota-free review layers and local-repair guidance. No installed skill source was patched.

The previous preview listener on 4173 was an orphaned `npm run preview`/Vite child (parent PID 1), consistent with the
earlier interrupted suite. Those two identified processes were stopped before the final gate; no other processes changed.
The hygiene preview now uses its own 4174 port and never reuses an arbitrary existing server.

## Review Triage Log

- Independent reviewer `ses_eef0872fbffev2LpkNFGUh7GxM`: pass, zero findings. Read the complete scoped diff/new files,
  configuration, overrides, gate/canaries, type repairs and idle-rule alignment. No application checks repeated by reviewer.
  Final full gate pending at review time. No extra review lens was required for this tooling-focused scope.

## Verification

Use runtime agent/config inspection without launching paid model work, customization resolver/render checks, negative
verification-canary tests, relevant lint/typecheck, then one final `./run-all-tests.sh`. Report skipped tools distinctly.
Documentation-only follow-up after the final gate does not rerun application tests.

### Completed verification

- `opencode debug agents` on v2.0.22: exactly the three epic agents discovered, with Sonnet 5.5 medium, Opus 5.5 high,
  Astra high. Resolved solver/reviewer permissions deny shell/execute and allow their declared read/coordination tools.
  This verifies loaded configuration, not an end-to-end paid-model story run. No models were benchmarked.
- Customization resolver for bmad-build, bmad-build-auto and bmad-code-review: all active primary review instructions
  quota-free; additional interaction lens conditional; redundant lenses disabled. V2 frontmatter parses successfully.
- `./run-all-tests.sh`: completed, 529 unit/component and 97 Chromium tests passed. Actual app/tooling typecheck, both
  negative typecheck canaries, lint/format, API types, i18n, bundle budget and zero-duplication checks passed.
- Full-gate log confirms exactly one production build. E2E and hygiene used that invocation's build. All 12 deliberate
  hygiene cases reached their required checkpoints/failure identities; both injected early-failure canaries were rejected.
- Markdown lint passed. Four existing low transitive KaTeX advisories remain. Trivy was skipped because not installed;
  no claim of a passing Trivy scan. No application changes were made after this full gate.
- Detailed gate log: harness temp directory `lean-agent-final-gate.log`; runtime snapshots `agents-final.txt`. These are
  local verification byproducts, not committed deliverables. Changed tracked/new tooling files are the intended artifacts.
- Pre-existing planning, retrospective, tracker and build wrapper changes were preserved. No commit or push performed.
