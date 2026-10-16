# Lean story execution

This protocol is the single execution contract shared by the epic agents. The current `epics.md` and sprint tracker
own story identity and priority; binding product companions own behavior. This protocol never waives product requirements.
Use these agents instead of nesting complete BMAD build/review loops. Standalone BMAD skills remain separately available.

## Models and startup

Owner provider decision, 2026-10-07: use OpenAI and Mistral. Anthropic is no longer a default or fallback for this workflow.

| Role | Default | Provider-failure fallback |
| --- | --- | --- |
| Solver | `openai/gpt-6-astra#high` | `mistral/mistral-medium-2604#high` |
| Worker | `openai/gpt-6-sol#high` | `mistral/mistral-medium-2604#high` |
| Reviewer | `openai/gpt-6-sol#high` | `mistral/mistral-medium-2604#high` |

Re-verified against the runtime catalog on 2026-10-12: `gpt-6.1-sol` drifted out of the dispatch-resolvable set and the
worker/reviewer pins moved to `gpt-6-sol` (owner decision). A running session resolves agent pins against its startup
catalog, so catalog drift surfaces as dispatch rejection until opencode restarts — verify pins after any catalog change.
Mistral Medium 3.5 is active, not the beta Large 4.
Catalog availability does not establish quota or successful execution. Verify availability during preparation, without
paid benchmarking calls. A primary session keeps its selected model: explicitly select the solver model at launch;
choosing the agent alone does not change it. Explicitly select the chosen model on every child dispatch/resume, including
after interruptions, rather than relying on a saved session or stale agent catalog. Record the actual model in the checkpoint.

On observed `429` / `provider.rate-limit`, stop the affected execution and use the other approved provider immediately;
do not deliberately retry the same provider. Keep that fallback for the rest of the batch. If both providers fail, checkpoint
and report blocked, without bouncing between them. An old Anthropic session must be stopped and resumed on the OpenAI default.
Confirm inactivity first and preserve code and verification evidence. A fallback reviewer always uses an independent review
session, never the implementation session. Coordinator recovery needs the parent/operator to select the fallback explicitly.

Before an unattended batch, agree its story/epic boundary and whether per-story commits are authorized. For known approved
worktree changes preserve the baseline; unknown overlapping changes require one grouped question. Never demand a clean
tree by committing someone else's work. Default to sequential stories in this workspace, not parallel writers/worktrees.

## Phase ownership

### Human-interaction notifications

Before asking the owner a question or stopping for owner intervention, the agent must send:

```sh
pushover "interaction needed: <story ID> — <brief blocker and requested action>"
```

The notifier binary is `pushover`, resolved via PATH (currently `~/bin/pushover`); never hardcode `$HOME/.local/bin/pushover` —
that path does not exist on the owner's machine and silently broke worker notifications (exit 127) until 2026-10-13.

The literal lowercase prefix `interaction needed:` is mandatory. This covers product/contract decisions, conflicting
requirements, unknown overlapping edits, approvals, unresolved problems, exhausted repair attempts, and provider/quota,
rate-limit, authentication or tooling failures that need the owner to unblock them. Send it when the need is identified,
before returning a blocked report or asking the question; do not wait for another status request. Group related questions
in one notification. Use content-free wording: no credentials, protected content, user data or raw error payloads.

The agent detecting the need sends the notification and reports whether delivery succeeded. The solver sends it if a
child could not, including when a provider failure prevents that child from executing tools. Avoid duplicate alerts for
the same pending question already delivered; a new required action or blocker warrants a new alert. Include the full
question and context in chat/report, not solely in Pushover. A delivery failure is reported once in chat and never retried
in a loop; continue independent work when possible.

Routine phase changes and successful automatic fallback do not themselves require this prefix. If fallback cannot
proceed without the owner, use it. Model instructions cannot deliver a notification while the model itself is stalled;
the parent/operator must handle observed runtime failures under the interruption procedure below.

1. Solver selects `next_story` or explicit user selection. Worker prepares only that story's detailed spec and prerequisites.
2. Solver records ready decisions, sets in-progress, dispatches worker implementation and obtains the scoped diff/manifest.
3. Independent reviewer evaluates the spec, actual diff and affected-check selection once. Reviewer may request and
   run focused verification where permitted; no mandatory extra review lenses.
4. Solver groups genuine findings by root cause; same worker repairs, same reviewer checks the affected boundaries.
   At most two unsuccessful repair batches per blocker, then checkpoint/escalate. Do not auto-accept blockers.
5. Worker runs one local affected verification (`./run-all-tests.sh --affected-e2e` with explicit selected specs and
   optional grep) for the final input fingerprint. Every non-browser stage stays complete; the selected browser count
   and command are recorded. Evidence is reusable while inputs are unchanged. If fixes change inputs, affected checks
   precede a new local verification. No simultaneous checks.
6. On successful review and affected local verification, solver prepares a `commit-pending` checkpoint. If committing
   is authorized, solver sets the story QA pending in the working tracker, worker commits that tracker/spec plus story files,
   and returns the full SHA. Until the commit is confirmed the execution state remains commit-pending and no next story
   starts. On known commit failure restore story review status. On uncertain outcome inspect log/diff before retry.
   On resume reconcile a QA-pending tracker against the pending commit and actual history, never treating it alone as closure.
   If commits were not authorized, leave story review and report verified/uncommitted instead of asking repeatedly.
7. After commit confirmation, solver records the exact SHA as QA pending and dispatches the read-only `epic-qa` agent
   to enqueue complete-matrix Ubuntu E2E. Only a matching passed remote result resolves QA pending; failed, canceled,
   or missing receipts require repair, a new reviewed and verified commit, and a new job. After matching success the
   solver marks the story done with its QA revision. The next independent story may start while QA is pending: update
   `next_story` after confirmed commit and account for failures in dependent work. Record remote queue and execution
   times, environment, checks and skipped inputs.
   Tracking-only updates need planning consistency, no full gate. Checkpoint bookkeeping may remain dirty; it is not
   application work or a reason to stage unrelated files.
8. Before marking an epic complete, have the worker run `scripts/verify-macos-e2e.sh <exact-committed-SHA>` and inspect
   its matching pass receipt; a successful Ubuntu job cannot substitute. The local pre-push guard enforces the same
   exact-revision macOS Chromium full matrix for normal GitHub pushes, including tags and direct URLs. Manual Safari
   and other release-browser evidence remains separately required. A GitHub push is not evidence that its CI passed.

## Persistent checkpoint and interruption recovery

Solver owns `_bmad-output/implementation-artifacts/execution/<full-story-key>.yaml`, created only when the story starts:

```yaml
story: <full-story-key>
phase: prepare # prepare | implement | review | fix | verify | commit-pending | qa-pending | complete | blocked
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
qa: null # exact commit, queued/start/end, environment, selected checks, result and log path; pending is not complete
macos_e2e: null # exact revision, complete-matrix pass receipt before epic completion or GitHub push
next_action: <one concrete action>
blocked_on: null
```

Record at phase transitions and actual failures; worker spec notes cover progress within long calls. Session IDs and file
paths are operational metadata; never record real credentials, protected production content, or tokens in these
checkpoints. Synthetic values in private test failures need no artifact-marker scan; operational handoffs remain
content-free. For retained privacy checks, name the concrete application harm and cheapest adequate owning layer. Summarize
accepted-story elapsed time/repair rounds/valid findings/provider failures locally in this record when measurable; do not
invent totals from commit timestamps or introduce product telemetry.

On rate limit, timeout or interruption: report stopped/unknown status immediately and inspect the diff and completed blocks.
For rate limits use the approved cross-provider policy above; for other failures make one bounded resume attempt only
after the prior call's state is known. Respect provider retry-after; no tight
loop, periodic polling or three-minute kill. If still unavailable, use the approved fallback with spec/checkpoint/current
diff and exact remaining work, not the original task from scratch. A timed-out tool call may leave child work running:
never launch a replacement writer until the original session/process is confirmed stopped through supported controls.
If the runtime cannot establish or stop it, report that blocker honestly. Do not invent cancel/heartbeat tools.

### Status diagnosis and safe interruption

On a user status request or a delivered failure event, inspect the owned child using the documented local API, once:

```sh
opencode api get /api/session/active
opencode api get /api/session/ses_CHILD/message?order=desc\&limit=3
```

Replace `ses_CHILD` with the checkpoint's actual session ID. Inspect execution activity and the latest message's `retry`
and error metadata together. Session summary `outcome`/`idle` may describe an earlier dispatch; local test logs only prove
completed checks. Report provider waiting separately from tool execution, review, verification and owner waiting. Do not
repeat an "implementation underway" claim based solely on unchanged files. Summarize metadata only; never copy raw
message bodies, provider payloads or reasoning into reports. If the API is unavailable, say current execution is unknown.

For a confirmed provider failure in an owned child:

```sh
opencode api post /api/session/ses_CHILD/interrupt?resume=false
opencode api get /api/session/active
```

Proceed only after that child is absent from active sessions (and any owned mutating tool has stopped). Record the error,
retry attempt, interruption result and chosen fallback. Resume the same worker/checkpoint with explicit model selection;
use a fresh independent context if switching the reviewer. No service restart, unrelated session interruption, concurrent
writer, recurring poll, or arbitrary timeout. Notify the owner via chat/Pushover on the failure and recovery transition.

These agent settings prevent selecting the exhausted Anthropic provider; they do not disable OpenCode's internal retry
mechanism. The documented V2 configuration exposes no rate-limit retry-count switch. While a child is inside a tool call,
the model cannot observe an undelivered retry event. Do not claim autonomous event-driven failover or a watchdog exists.

## Verification and environment

Prepare checks tools once per batch. Install dependencies only when missing or lockfile changes; install Chromium before
the first browser run. Use local cached tooling where available; network failures are infrastructure failures, not product
decisions. Do not kill an unknown preview server to free a port. Report it or use a deliberately configured isolated port.
The reviewer has read tools only and cannot run shell checks. It assesses the explicit affected-test selection and
requests a precise worker reproduction if evidence is missing. The worker executes it sequentially and returns the
result for review. No reviewer runs the full gate.

`AGENTS.md` owns the local gate. Documentation-only changes use applicable lint/consistency checks; application changes
get the final affected-local mode (complete non-browser stages plus explicitly selected E2E) before commit. The bare
complete gate remains available. Build once inside a gate invocation, and preserve self-contained public standalone
commands. Skipped tooling stays explicit; no model or
coordinator can convert it into a pass. Remote QA is independent and asynchronous, never a local gate replacement.
