# Lean story execution

This protocol is the single execution contract shared by the three epic agents. The current `epics.md` and sprint tracker
own story identity and priority; binding product companions own behavior. This protocol never waives product requirements.
Use these agents instead of nesting complete BMAD build/review loops. Standalone BMAD skills remain separately available.

## Models and startup

Starting settings: solver Claude Sonnet 5.5 medium; worker Claude Opus 5.5 high; reviewer GPT-6 Astra high. These are trial
settings, not a performance ranking. A primary session keeps its selected model: explicitly select Sonnet 5.5 medium when
starting the solver; choosing its agent name alone does not change an existing session's model. Children use their pinned
models. Verify availability before a run. Never silently substitute an unavailable model.

The user approved cross-provider fallback after an actual provider failure: worker → `openai/gpt-6.1-sol#high`, reviewer
→ `anthropic/claude-opus-5-5#high` in a fresh review session. Resolve exact available IDs before use. A fallback reviewer
must not be the implementation session even if model families coincide. Sonnet coordinator outage can resume in an
explicitly selected Astra session using this same checkpoint. No automatic benchmarking or paid model comparison runs.

Before an unattended batch, agree its story/epic boundary and whether per-story commits are authorized. For known approved
worktree changes preserve the baseline; unknown overlapping changes require one grouped question. Never demand a clean
tree by committing someone else's work. Default to sequential stories in this workspace, not parallel writers/worktrees.

## Phase ownership

1. Solver selects `next_story` or explicit user selection. Worker prepares only that story's detailed spec and prerequisites.
2. Solver records ready decisions, sets in-progress, dispatches worker implementation and obtains the scoped diff/manifest.
3. Independent reviewer evaluates the spec, actual diff and evidence once. No mandatory extra review lenses.
4. Solver groups genuine findings by root cause; same worker repairs, same reviewer checks the affected boundaries.
   At most two unsuccessful repair batches per blocker, then checkpoint/escalate. Do not auto-accept blockers.
5. Worker runs one authoritative final verification for the final input fingerprint. Evidence is reusable while those
   inputs are unchanged. If fixes change inputs, targeted checks precede a new final gate. No simultaneous checks.
6. On successful review and verification, solver prepares a `commit-pending` checkpoint. If committing is authorized,
   solver sets the story done in the working tracker, worker commits that tracker/spec plus story files as one change,
   and returns the full SHA. Until the commit is confirmed the execution state remains commit-pending and no next story
   starts. On known commit failure restore story review status. On uncertain outcome inspect log/diff before retry.
   On resume reconcile a done tracker against the pending commit and actual history, never treating it alone as closure.
   If commits were not authorized, leave story review and report verified/uncommitted instead of asking repeatedly.
7. After commit confirmation, solver writes committed SHA to the operational checkpoint and updates `next_story` to the
   next unfinished story within the approved batch/milestone. Tracking-only updates need planning consistency, no full gate.
   Checkpoint bookkeeping may remain dirty; it is not application work or a reason to stage unrelated files.

## Persistent checkpoint and interruption recovery

Solver owns `_bmad-output/implementation-artifacts/execution/<full-story-key>.yaml`, created only when the story starts:

```yaml
story: <full-story-key>
phase: prepare # prepare | implement | review | fix | verify | commit-pending | complete | blocked
spec: <path>
baseline_commit: <full-sha>
pre_existing_changes: []
files: [] # explicit story-owned paths, including new files
worker_session: null
reviewer_session: null
models: {} # actual model/variant per phase, including fallback
completed_blocks: []
repair_queue: [] # finding, root cause, disposition, evidence
last_verification: null # input fingerprint, commands, pass/fail/skip, log paths
resume_attempts: 0
commit: null # intended message then confirmed full SHA
next_action: <one concrete action>
blocked_on: null
```

Record at phase transitions and actual failures; worker spec notes cover progress within long calls. Session IDs and file
paths are operational metadata; never record fixture secrets, prompts containing protected content, or tokens. Summarize
accepted-story elapsed time/repair rounds/valid findings/provider failures locally in this record when measurable; do not
invent totals from commit timestamps or introduce product telemetry.

On rate limit, timeout or interruption: report stopped/unknown status immediately, inspect the diff and completed blocks,
and make one bounded resume attempt only after the prior call's state is known. Respect provider retry-after; no tight
loop, periodic polling or three-minute kill. If still unavailable, use the approved fallback with spec/checkpoint/current
diff and exact remaining work, not the original task from scratch. A timed-out tool call may leave child work running:
never launch a replacement writer until the original session/process is confirmed stopped through supported controls.
If the runtime cannot establish or stop it, report that blocker honestly. Do not invent cancel/heartbeat tools.

## Verification and environment

Prepare checks tools once per batch. Install dependencies only when missing or lockfile changes; install Chromium before
the first browser run. Use local cached tooling where available; network failures are infrastructure failures, not product
decisions. Do not kill an unknown preview server to free a port. Report it or use a deliberately configured isolated port.
The reviewer cannot run shell: worker supplies scoped diff and reproducible check evidence. This is read-only isolation,
not a claim that worker evidence is independently executed. The reviewer must inspect test quality and missing boundaries.

`AGENTS.md` owns the gate. Documentation-only changes use applicable lint/consistency checks; application changes get the
final full gate. Build once inside that gate, reuse it only within the same invocation, and preserve self-contained public
standalone commands. Skipped tooling stays explicit; no model or coordinator can convert it into a pass.
