#!/usr/bin/env bash
# Owned process group for one exact queued ref; invoked by qa-worker.sh.
set -euo pipefail
[[ $# == 4 ]] || exit 2
repo=$1 checkout=$2 ref=$3 sha=$4
# Also support direct, controlled job invocation outside the at worker.
while IFS= read -r git_variable; do unset "$git_variable"; done < <(git rev-parse --local-env-vars)
git init --quiet "$checkout"
git -C "$checkout" fetch --quiet "$repo" "$ref"
git -C "$checkout" checkout --quiet --detach "$sha"
[[ "$(git -C "$checkout" rev-parse HEAD)" == "$sha" ]]
[[ -f "$checkout/.localgit/post-receive-run.sh" ]]
[[ -f "$checkout/.localgit/qa-browser-session.sh" ]]
cd "$checkout"
exec bash .localgit/post-receive-run.sh "$sha"
