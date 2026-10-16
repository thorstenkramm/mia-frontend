#!/usr/bin/env bash
# Installed beside post-receive in the bare repository. Runs only as git.
set -euo pipefail
umask 077
[[ "$(id -un)" == git ]] || { echo 'QA must run as git.' >&2; exit 1; }
[[ "${2:-}" == --drain && $# == 2 ]] || exit 2
repo=$1
home=${MIA_QA_HOME:-"$HOME/.local/share/mia-qa"}
# at inherits the push hook's bare-repository Git environment. Every job uses
# an explicit repository/checkout path; inherited GIT_DIR would hijack git -C.
while IFS= read -r git_variable; do unset "$git_variable"; done < <(git rev-parse --local-env-vars)
timeout_seconds=${MIA_QA_JOB_TIMEOUT_SECONDS:-7200}
[[ "$timeout_seconds" =~ ^[0-9]+$ && "$timeout_seconds" -ge 1 && "$timeout_seconds" -le 7200 ]] || exit 2
mkdir -p "$home/workspaces"
exec 8>"$home/worker.lock"
flock -x 8
if [[ -f "$home/cleanup-unconfirmed" ]]; then
  echo 'Previous QA cleanup is unconfirmed; no further jobs may start.' >&2
  exit 1
fi
interrupted=0
child=''
child_start=''
group_signaled=0
worker_pid=$BASHPID
owned_child_alive() {
  [[ -n "$child" && -r "/proc/$child/stat" ]] || return 1
  local snapshot
  snapshot=$(awk '{ print $4, $22, $3 }' "/proc/$child/stat" 2>/dev/null) || return 1
  [[ "$snapshot" == "$worker_pid "* && "$snapshot" != *' Z' ]] || return 1
  # TERM can interrupt the first snapshot after $!; learn the start time
  # only while the PID still belongs to this worker.
  if [[ -z "$child_start" ]]; then child_start=$(awk '{ print $22 }' "/proc/$child/stat" 2>/dev/null || :); fi
  [[ "$snapshot" == "$worker_pid $child_start "* && "$snapshot" != *' Z' ]]
}
signal_owned_child() {
  owned_child_alive || return 0
  # Only signal a group after its *owned, live* leader is actually in it.
  if [[ "$(awk -v parent="$worker_pid" -v start="$child_start" -v pid="$child" \
    '$4 == parent && $22 == start && $3 != "Z" && $5 == pid && $6 == pid { print "owned" }' \
    "/proc/$child/stat" 2>/dev/null)" == owned ]]; then
    if kill -TERM -- "-$child" 2>/dev/null; then group_signaled=1; fi
  else
    # A pre-setsid child has no cleanup group yet. Stop its exact PID before
    # it can exec the job; never signal its inherited (possibly shared) group.
    if owned_child_alive; then kill -KILL "$child" 2>/dev/null || :; fi
  fi
}
cancel_job() {
  interrupted=1
  # setsid may still be a direct child, not yet a process-group leader.
  signal_owned_child
}
trap cancel_job TERM INT
while :; do
  (
    flock -x 9
    shopt -s nullglob
    jobs=("$home"/queue/[0-9]*)
    if ((${#jobs[@]})); then printf '%s\n' "${jobs[0]}"; fi
  ) 9>"$home/queue.lock" > "$home/next.tmp"
  read -r entry < "$home/next.tmp" || break
  [[ -f "$entry" ]] || break
  read -r sha ref < "$entry"
  job=${entry##*/}
  workspace="$home/workspaces/$job"
  status="$home/results/$sha.status"
  log="$home/results/$sha.log"
  if grep -qx 'status=running' "$status"; then
    printf 'status=canceled\nrevision=%s\njob=%s\nreason=previous-worker-interrupted\n' "$sha" "$job" > "$status.tmp"
    mv "$status.tmp" "$status"
    rm -rf -- "$workspace"
    rm -- "$entry"
    continue
  fi
  start=$(date -u +%FT%TZ)
  start_seconds=$(date +%s)
  queued_epoch=$(sed -n 's/^queued_epoch=//p' "$home/results/$sha.receipt")
  queue_seconds=$((start_seconds - queued_epoch))
  os_id=$(sed -n 's/^ID=//p' /etc/os-release | tr -d '"')
  os_version=$(sed -n 's/^VERSION_ID=//p' /etc/os-release | tr -d '"')
  environment="$os_id-$os_version-$(uname -m)"
  checks='npm-ci,build,chromium-full-matrix-e2e;other-gate-inputs-not-supplied'
  printf 'status=running\nrevision=%s\nref=%s\njob=%s\nstarted=%s\nqueue_seconds=%s\nenvironment=%s\nchecks=%s\n' \
    "$sha" "$ref" "$job" "$start" "$queue_seconds" "$environment" "$checks" > "$status.tmp"
  mv "$status.tmp" "$status"
  mkdir -p "$workspace"
  code=0
  forced_cleanup=0
  child=''
  child_start=''
  group_signaled=0
  # A test-only FIFO makes the pre-assignment TERM window deterministic.
  if [[ -n "${MIA_QA_TEST_BEFORE_SPAWN_FIFO:-}" ]]; then
    read -r _ < "$MIA_QA_TEST_BEFORE_SPAWN_FIFO" || :
  fi
  if [[ "$interrupted" == 0 ]]; then
    # One owned process group, bounded even during fetch or lockfile installation.
    setsid timeout --signal=TERM --kill-after=15s "$timeout_seconds" bash "$repo/hooks/qa-job.sh" \
      "$repo" "$workspace/checkout" "$ref" "$sha" > "$log" 2>&1 &
    child=$!
    child_start=$(awk -v parent="$worker_pid" '$4 == parent { print $22 }' "/proc/$child/stat" 2>/dev/null || :)
    # TERM may arrive between the guard and PID assignment.
    if [[ "$interrupted" != 0 ]]; then signal_owned_child; fi
    wait "$child" || code=$?
  else
    code=143
    printf 'Job canceled before launch.\n' > "$log"
  fi
  if [[ -n "$child" && ( "$interrupted" != 0 || "$code" == 124 || "$code" == 137 ) ]]; then
    # A trapped signal can interrupt wait before the direct child exits or
    # becomes its own session. Never release the checkout on that early return.
    for ((attempt = 0; attempt < 50; attempt++)); do
      if [[ "$interrupted" != 0 && "$group_signaled" == 0 ]]; then signal_owned_child; fi
      if ! owned_child_alive && ! kill -0 "$child" 2>/dev/null &&
        ! kill -0 -- "-$child" 2>/dev/null; then break; fi
      sleep 0.2
    done
    if owned_child_alive; then
      forced_cleanup=1
      # This is still the exact child we spawned (parent and start time match).
      kill -KILL "$child" 2>/dev/null || :
    fi
    # An interrupted wait can return before the child exits. Reap before any
    # workspace removal; if the leader vanished but its group remains, keep
    # the checkout quarantined rather than guessing which descendants to kill.
    if [[ -z "$child_start" ]] && kill -0 "$child" 2>/dev/null; then forced_cleanup=1; fi
    wait "$child" 2>/dev/null || :
    if owned_child_alive || kill -0 -- "-$child" 2>/dev/null; then forced_cleanup=1; fi
    if [[ -z "$child_start" ]]; then forced_cleanup=1; fi
  fi
  child=''
  end=$(date -u +%FT%TZ)
  outcome=passed
  [[ "$code" == 0 ]] || outcome=failed
  [[ "$code" != 124 && "$code" != 137 && "$interrupted" == 0 ]] || outcome=canceled
  printf 'status=%s\nrevision=%s\nref=%s\njob=%s\nstarted=%s\nended=%s\nqueue_seconds=%s\nduration_seconds=%s\nexit=%s\nenvironment=%s\nchecks=%s\nlog=%s\n' \
    "$outcome" "$sha" "$ref" "$job" "$start" "$end" "$queue_seconds" "$(($(date +%s) - start_seconds))" "$code" \
    "$environment" "$checks" "$log" > "$status.tmp"
  if [[ "$code" == 137 || "$forced_cleanup" == 1 ]]; then
    printf 'reason=cleanup-unconfirmed\n' >> "$status.tmp"
  fi
  mv "$status.tmp" "$status"
  if [[ "$code" == 137 || "$forced_cleanup" == 1 ]]; then
    printf 'revision=%s\nworkspace=%s\n' "$sha" "$workspace" > "$home/cleanup-unconfirmed.tmp"
    mv "$home/cleanup-unconfirmed.tmp" "$home/cleanup-unconfirmed"
    rm -- "$entry"
    echo 'QA cleanup unconfirmed; owned workspace retained, queue halted.' >&2
    exit 1
  fi
  rm -rf -- "$workspace"
  rm -- "$entry"
  [[ "$interrupted" == 0 ]] || exit 143
done
rm -f -- "$home/next.tmp"
