#!/usr/bin/env bash
# Explicitly retry only a failed at submission for an already accepted ref.
set -euo pipefail
umask 077
[[ "$(id -un)" == git && $# == 1 && "$1" =~ ^[0-9a-f]{40}$ ]] || exit 2
sha=$1
repo=${MIA_QA_REPO:-"$HOME/mia-frontend.git"}
home=${MIA_QA_HOME:-"$HOME/.local/share/mia-qa"}
receipt="$home/results/$sha.receipt"
status="$home/results/$sha.status"
[[ -f "$receipt" && -f "$status" ]] || { echo 'QA receipt/status missing.' >&2; exit 1; }
[[ "$(git --git-dir="$repo" rev-parse --verify "refs/qa/commits/$sha")" == "$sha" ]] || exit 1
grep -qx "revision=$sha" "$receipt"
grep -qx "ref=refs/qa/commits/$sha" "$receipt"
job=$(sed -n 's/^job=//p' "$receipt")
[[ "$job" =~ ^[0-9]{12}$ ]] || exit 1
(
  flock -x 9
  if ! grep -qx 'status=failed' "$status" || ! grep -qx 'reason=dispatch-failed' "$status"; then
    echo 'Only failed dispatches can be recovered; test failures require a new commit.' >&2
    exit 1
  fi
  [[ ! -e "$home/queue/$job" ]] || exit 1
  printf '%s %s\n' "$sha" "refs/qa/commits/$sha" > "$home/queue/$job.tmp"
  mv "$home/queue/$job.tmp" "$home/queue/$job"
  printf 'status=queued\nrevision=%s\njob=%s\nreason=explicit-recovery\n' "$sha" "$job" > "$status.tmp"
  mv "$status.tmp" "$status"
) 9>"$home/queue.lock"
if ! printf '%q %q --drain\n' "$repo/hooks/qa-worker.sh" "$repo" | at now 2>/dev/null; then
  (
    flock -x 9
    if [[ -f "$home/queue/$job" ]] && grep -qx 'status=queued' "$status"; then
      rm -- "$home/queue/$job"
      printf 'status=failed\nrevision=%s\nreason=dispatch-failed\n' "$sha" > "$status.tmp"
      mv "$status.tmp" "$status"
    fi
  ) 9>"$home/queue.lock"
  echo 'QA dispatch recovery failed; status remains visible.' >&2
  exit 1
fi
echo "QA dispatch resubmitted for $sha; inspect status (submission is not a pass)."
