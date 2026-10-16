#!/usr/bin/env bash
set -euo pipefail
root=$(mktemp -d)
trap 'rm -rf -- "$root"' EXIT
export MIA_MACOS_EVIDENCE_HOME="$root"
sha=$(git rev-parse HEAD)
line="refs/tags/smoke $sha refs/tags/smoke 0000000000000000000000000000000000000000"
if printf '%s\n' "$line" | .localgit/pre-push origin git@github.com:example/test.git >/dev/null 2>&1; then
  echo 'missing exact commit receipt was accepted'; exit 1
fi
printf '%s\n' "$line" | .localgit/pre-push qa git@odroid:mia-frontend.git
printf '%s\n' '(delete) 0000000000000000000000000000000000000000 refs/tags/old '"$sha" | \
  .localgit/pre-push origin git@github.com:example/test.git
printf 'revision=%s\nstatus=passed\nmode=full\nplatform=macOS-test\n' 0000000000000000000000000000000000000000 > "$root/$sha.receipt"
if printf '%s\n' "$line" | .localgit/pre-push origin https://github.com/example/test.git >/dev/null 2>&1; then
  echo 'stale receipt was accepted'; exit 1
fi
if printf '%s\n' "$line" | .localgit/pre-push origin ssh://git@github.com:22/example/test.git >/dev/null 2>&1; then
  echo 'explicit-port GitHub URL bypassed the guard'; exit 1
fi
if printf '%s\n' "$line" | .localgit/pre-push origin https://user@GitHub.COM/example/test.git >/dev/null 2>&1; then
  echo 'GitHub URL with user/case bypassed the guard'; exit 1
fi
if printf '%s\n' "$line" | .localgit/pre-push origin git@github.com:example/test.git >/dev/null 2>&1; then
  echo 'stale exact SHA receipt was accepted'; exit 1
fi
mkdir -p "$root/bin"
cat > "$root/bin/ssh" <<'SSH'
#!/usr/bin/env bash
[[ "$1" == -G ]] && printf 'hostname github.com\n'
SSH
chmod +x "$root/bin/ssh"
if printf '%s\n' "$line" | PATH="$root/bin:$PATH" .localgit/pre-push origin git@github-alias:example/test.git >/dev/null 2>&1; then
  echo 'configured GitHub SSH alias bypassed the guard'; exit 1
fi
printf 'revision=%s\nstatus=passed\nmode=full\nplatform=macOS-test\n' "$sha" > "$root/$sha.receipt"
printf '%s\n' "$line" | .localgit/pre-push git@github.com:example/test.git git@github.com:example/test.git
echo 'Push guard: missing/stale blocked, matching and private QA allowed'
