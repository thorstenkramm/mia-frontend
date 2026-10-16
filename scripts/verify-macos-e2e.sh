#!/usr/bin/env bash
# Verify an exact committed tree, never the current mutable worktree.
set -euo pipefail
umask 077
sha=${1:-$(git rev-parse HEAD)}
[[ "$sha" =~ ^[0-9a-f]{40}$ ]] || exit 2
[[ "$(uname -s)" == Darwin ]] || { echo 'macOS required.' >&2; exit 1; }
git cat-file -e "$sha^{commit}"
evidence=${MIA_MACOS_EVIDENCE_HOME:-"$HOME/.local/share/mia-qa/macos"}
mkdir -p "$evidence"
if [[ -f "$evidence/$sha.receipt" ]] && grep -qx "revision=$sha" "$evidence/$sha.receipt" &&
  grep -qx 'status=passed' "$evidence/$sha.receipt" && grep -qx 'mode=full' "$evidence/$sha.receipt" &&
  grep -q '^platform=macOS-' "$evidence/$sha.receipt"; then
  echo "Existing exact-revision macOS full-matrix pass: $sha"
  exit 0
fi
root=$(mktemp -d "${TMPDIR:-/tmp}/mia-macos-e2e.XXXXXXXX")
runner=''
cleanup() {
  if [[ -n "$runner" ]]; then
    kill -TERM "$runner" 2>/dev/null || :
    wait "$runner" 2>/dev/null || :
  fi
  rm -f -- "$evidence/$sha.receipt.tmp"
  rm -rf -- "$root"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
git clone --quiet --no-checkout --no-local "$(git rev-parse --show-toplevel)" "$root/checkout"
git -C "$root/checkout" checkout --quiet --detach "$sha"
[[ "$(git -C "$root/checkout" rev-parse HEAD)" == "$sha" ]] || exit 1
helper="$root/checkout/scripts/mac-e2e-owned-runner.mjs"
[[ -f "$helper" ]] || { echo 'Requested commit does not contain the macOS E2E runner.' >&2; exit 1; }
started=$(date -u +%FT%TZ)
started_seconds=$(date +%s)
node "$helper" "$root/checkout" "$evidence/$sha.log" &
runner=$!
code=0
wait "$runner" || code=$?
runner=''
if [[ "$code" != 0 ]]; then
  echo "macOS full-matrix check failed; log: $evidence/$sha.log" >&2
  exit 1
fi
{
  printf 'revision=%s\nstatus=passed\nmode=full\nstarted=%s\nended=%s\nduration_seconds=%s\n' \
    "$sha" "$started" "$(date -u +%FT%TZ)" "$(($(date +%s) - started_seconds))"
  printf 'platform=macOS-%s\nnode=%s\nplaywright=%s\n' "$(sw_vers -productVersion)" "$(node --version)" \
    "$(node -p "require('$root/checkout/package.json').devDependencies['@playwright/test']")"
  printf 'log=%s\n' "$evidence/$sha.log"
} > "$evidence/$sha.receipt.tmp"
mv "$evidence/$sha.receipt.tmp" "$evidence/$sha.receipt"
echo "macOS full-matrix pass for $sha ($evidence/$sha.receipt)"
