#!/usr/bin/env bash
set -euo pipefail
usage() { echo 'Usage: scripts/remote-qa.sh enqueue SHA | recover SHA | status SHA | logs SHA | wait SHA [seconds]' >&2; exit 2; }
[[ $# -ge 2 ]] || usage
action=$1 sha=$2
[[ "$sha" =~ ^[0-9a-f]{40}$ ]] || usage
host=${MIA_QA_HOST:-git@odroid}
remote_url=${MIA_QA_URL:-git@odroid:mia-frontend.git}
ssh_args=(-o BatchMode=yes -o ConnectTimeout=10 -o ServerAliveInterval=10 -o ServerAliveCountMax=2)
remote_result() {
  ssh "${ssh_args[@]}" "$host" bash -s -- "$sha" "$1" <<'REMOTE'
set -euo pipefail
base=".local/share/mia-qa/results/$1"
case "$2" in
  both) cat "$base.receipt" "$base.status" ;;
  status|log) cat "$base.$2" ;;
  *) exit 2 ;;
esac
REMOTE
}
case "$action" in
  enqueue)
    [[ $# == 2 ]] || usage
    [[ "$(git cat-file -t "$sha")" == commit ]] || { echo 'QA revision must be a commit.' >&2; exit 2; }
    if git remote get-url qa >/dev/null 2>&1; then
      [[ "$(git remote get-url qa)" == "$remote_url" && "$(git remote get-url --push qa)" == "$remote_url" ]] || {
        echo 'qa fetch/push remote differs; left untouched.' >&2; exit 1;
      }
    else
      git remote add qa "$remote_url"
    fi
    git push qa "$sha:refs/qa/commits/$sha"
    # Post-receive runs after acceptance: independently confirm its receipt and state.
    receipt=$(remote_result both) || {
      echo 'QA push accepted but receipt/status missing; QA is not confirmed.' >&2; exit 1;
    }
    [[ "$(printf '%s\n' "$receipt" | grep -xc "revision=$sha" || :)" == 2 &&
       ( "$receipt" == *"status=queued"* || "$receipt" == *"status=running"* || "$receipt" == *"status=passed"* ) ]] || {
      echo 'QA dispatch failed or receipt invalid; inspect remote status.' >&2; exit 1;
    }
    printf '%s\n' "$receipt"
    ;;
  recover)
    [[ $# == 2 ]] || usage
    ssh "${ssh_args[@]}" "$host" bash -s -- "$sha" <<'REMOTE'
set -euo pipefail
exec "$HOME/mia-frontend.git/hooks/qa-recover.sh" "$1"
REMOTE
    remote_result both
    ;;
  status|logs)
    [[ $# == 2 ]] || usage
    suffix=status
    [[ "$action" != logs ]] || suffix=log
    remote_result "$suffix"
    ;;
  wait)
    [[ $# == 3 && "$3" =~ ^[0-9]+$ && "$3" -le 14400 ]] || usage
    deadline=$((SECONDS + $3))
    while :; do
      state=$(remote_result status) || exit 1
      [[ "$state" == *"revision=$sha"* ]] || { echo 'QA status revision mismatch.' >&2; exit 1; }
      case "$state" in
        *'status=passed'*) printf '%s\n' "$state"; exit 0 ;;
        *'status=failed'*|*'status=canceled'*) printf '%s\n' "$state"; exit 1 ;;
      esac
      ((SECONDS < deadline)) || { echo 'QA wait timed out; job still pending.' >&2; exit 124; }
      sleep 10
    done
    ;;
  *) usage ;;
esac
