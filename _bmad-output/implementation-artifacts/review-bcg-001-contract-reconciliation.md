# BCG-001 reconciliation — independent Blind Hunter review

Run this prompt in a separate, context-free session at the same model level as the authoring session. Return findings
as text; do not edit files or commit. The backend is read-only. Existing application, sprint-status, and Story 1-2 edits
belong to other work and are outside this review's change scope.

## Prompt

Conduct a review of CONTENT.
Look for what's missing, not only what's wrong.
Compute your finding floor N from the size of the changes: N = min(floor(sqrt(kB) + 1), 10), where kB is the changed
content's size in kilobytes. State the arithmetic in one line, then find at least N issues to fix or improve.
Output a Markdown list of findings only — no severity, priority, or ranking.
If the content is empty, stop and say so.
If you have zero findings, re-check and keep thinking; do not stop with an empty list.

CONTENT:
The documentation changes for BCG-001 reconciliation in the current worktree at
`/Users/thorsten/projects/thorsten/mia-frontend`. Inspect them directly before reviewing:

- `_bmad-output/planning-artifacts/ux-designs/ux-mia-frontend-2026-09-12/BACKEND-CONTRACT-GAPS.md`
  (the diff for BCG-001 and the update date).
- `_bmad-output/implementation-artifacts/spec-bcg-001-contract-reconciliation.md`
  (the new execution record).

Use the maintained contracts and referenced evidence in `mia/` to verify claims; the handoff
`tmp/backend-contract-entry-response.md` is not authoritative. Inspect relevant binding frontend artifacts and rules.
Check stage discovery, CSRF, restricted/authenticated deadlines, non-refreshing reads/SSE, Continue working, late-response
logout ordering, and the sufficiency of evidence. Verify that product conflicts remain explicit, no whole-gap closure
or partial-closure permission is invented, and the Story 1-2 canonical entry resumption decision follows existing rules.
Do not review unrelated staged application/story changes as changes made by this task.

Generated-cache repair is supporting context: source/configuration/renderer hashes and expected rendered hashes matched
the existing manifest; eight generated Markdown files had formatting differences. Only the corrupt generation directory
`_bmad/render/bmad-build/mia-frontend-73443eb46a23/6cd94fe1833de1db8700/` was regenerated using the unchanged renderer.
Its output integrity was checked after the frontend full check. Do not edit source skill instructions or integrity checks.

Do not invoke any skill, and do not spawn subagents of your own — you are the reviewer. Return your findings as text in
your final message; do not route them through any findings-reporting tool the host may offer.
