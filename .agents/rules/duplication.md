# Code duplication

`run-all-tests.sh` runs JSCPD at `--threshold 0`, so any reported clone fails the project check. This document governs
how to react to a report. It applies to every change, not to a dedicated remediation task.

## Scope: logic, not presentation

The gate covers **logic**: hooks, the API client, state machines, validation, formatting, and other non-presentational
modules. Presentational components are excluded.

That exclusion is deliberate and it is not laziness. JSX is structurally repetitive by design, and this project
inherits the Tailwind Plus library wholesale — six dialog variants that differ only in button arrangement are supposed
to look nearly identical. Running clone detection over them would produce a wall of findings whose only available
remedy is an ignore marker, which trains everyone to ignore the gate. Worse, "deduplicating" adapted blueprints by
extracting a shared wrapper breaks the exact-blueprint binding that `DESIGN.md` requires.

Presentational duplication is still reviewable by humans. It is simply not machine-gated.

If a presentational component starts carrying real branching logic, that logic belongs in a hook or a module — where
the gate does apply.

## The gate

Never raise `--threshold`, `--min-lines`, or `--min-tokens`, and never add a whole-file ignore outside generated or
third-party code. Those values define what the project considers acceptable duplication; changing them needs an
explicit human decision, not a quiet edit to make a report pass.

Run the check before finishing work that adds or moves code. A gate nobody invokes does not hold — on the MIA backend,
the duplication check stayed red across four consecutive stories because it was never run, and the accumulated clones
then had to be cleared in one separate task.

## Deciding between a refactor and a marker

Assess every reported clone for one concrete shared responsibility before touching it.

**Refactor** when the duplicated sequence really is one responsibility. Look for an existing owner first — the shared
behavior often already exists and is simply unused at one site. That is a half-converted pattern, not separate
ownership.

Place shared behavior with the layer that owns it. Transport and JSON:API concerns belong with the API client, session
and stage rules with the auth layer, sanitization with the single locked sanitizer boundary. Never create a `util` or
`misc` module to hold it, and never invent an abstraction that only a duplication report asks for.

**Mark the clone instead** when the two sites own different authorization, security, lifecycle, provider, or domain
contracts, or when a type fixes both shapes and neither can differ. Unifying such code moves decisions away from the
module responsible for them, which is worse than the duplication.

Two state machines from `FRONTEND-STATE-MACHINES.md` with similar-looking transition tables are a common false
positive. They are separate contracts even when their code rhymes.

## Writing a marker

Use only `jscpd:ignore-start` and `jscpd:ignore-end`, covering the smallest range that suppresses the report.

Marking one side suppresses the whole pair, so add one marker range and state the reason in a comment immediately
adjacent to it. Put a short note at the other site naming where the marker lives, so a reader there is not left
wondering why matching code is unmarked.

> [!IMPORTANT]
> A `jscpd:ignore-start` without its matching `jscpd:ignore-end` silently suppresses detection to the end of that file
> and still exits successfully. A dropped marker is indistinguishable from a clean result, so `run-all-tests.sh` checks
> marker balance before running the scan. Never remove that check.

Marking also shrinks the reported denominator, because a file whose entire tokenizable content is ignored drops out of
the analyzed set. Treat the reported percentage as an indicator, not a target.

## When duplicated sites disagree

Duplication can hide a latent defect. If the copies differ in error handling, authorization, cleanup, or any other
behavior, that divergence is a finding that needs a decision. It is not something to preserve, and the majority
spelling does not win by count.

Decide on correctness, apply one behavior, and record the change and its reason where reviewers will see it. Never
encode the weaker behavior into a shared helper merely to keep a refactor behavior-neutral, and never split a helper in
two to keep an unexplained inconsistency alive. Pin the resulting behavior with a test, since duplication that nothing
tested is how the inconsistency survived.

Stop and ask instead of deciding alone when the divergence touches an authorization, security, or data-lifecycle
contract, or when resolving it needs a product decision.

## After refactoring

Re-run the check. A refactor can trade one clone for a larger one. Measuring catches that; assuming does not.

Never reformat, rename, or reorder code to evade detection. That defeats the check while leaving the duplication in
place. Equally, do not force duplication to zero by merging unrelated code — `AGENTS.md` stands, and removing
duplication is worthwhile only when one abstraction has a clear responsibility.
