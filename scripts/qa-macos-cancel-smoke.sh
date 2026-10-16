#!/usr/bin/env bash
set -euo pipefail
root=$(mktemp -d)
trap 'rm -rf -- "$root"' EXIT
mkdir -p "$root/bin" "$root/evidence" "$root/temp"
source_root=$(git rev-parse --show-toplevel)
prior_sha=$(git rev-parse HEAD)
if MIA_MACOS_EVIDENCE_HOME="$root/evidence" TMPDIR="$root/temp" \
  "$source_root/scripts/verify-macos-e2e.sh" "$prior_sha" > "$root/absent-helper.log" 2>&1; then
  echo 'Old commit verified using current-worktree helper'; exit 1
fi
grep -q 'Requested commit does not contain the macOS E2E runner' "$root/absent-helper.log"
[[ ! -e "$root/evidence/$prior_sha.receipt" ]]
echo 'Exact commit missing helper fails closed despite mutable helper: pass'

mkdir -p "$root/source/scripts"
cp "$source_root/scripts/mac-e2e-owned-runner.mjs" "$root/source/scripts/"
git init --quiet "$root/source"
git -C "$root/source" add scripts/mac-e2e-owned-runner.mjs
git -C "$root/source" -c user.name=QA -c user.email=qa@example.invalid commit --quiet -m synthetic-helper
fixture_sha=$(git -C "$root/source" rev-parse HEAD)
cat > "$root/bin/npm" <<'FAKE'
#!/usr/bin/env bash
node -e '
  const { spawn } = require("node:child_process");
  const child = spawn(process.execPath, ["-e", `
    const fs = require("node:fs");
    const net = require("node:net");
    const server = net.createServer();
    server.listen(0, "127.0.0.1", () => fs.writeFileSync(process.env.MIA_TEST_PORT_FILE, String(server.address().port)));
  `], { detached: true, stdio: "ignore" });
  process.on("SIGTERM", () => {
    process.kill(-child.pid, "SIGTERM");
    setTimeout(() => process.exit(0), 500);
  });
  setInterval(() => {}, 1000);
'
FAKE
chmod +x "$root/bin/npm"
export MIA_TEST_PORT_FILE="$root/port" MIA_MACOS_EVIDENCE_HOME="$root/evidence" TMPDIR="$root/temp"
(
  cd "$root/source"
  PATH="$root/bin:$PATH" "$source_root/scripts/verify-macos-e2e.sh" "$fixture_sha"
) > "$root/verifier.log" 2>&1 &
verifier=$!
deadline=$((SECONDS + 30))
until [[ -f "$root/port" ]]; do
  ((SECONDS < deadline)) || { echo 'verifier child startup timeout'; kill -TERM "$verifier"; wait "$verifier" || :; exit 1; }
  sleep 1
done
kill -TERM "$verifier"
wait "$verifier" || code=$?
[[ "${code:-}" == 143 ]]
port=$(cat "$root/port")
node -e 'const s=require("node:net").connect(Number(process.argv[1]),"127.0.0.1");s.once("connect",()=>process.exit(1));s.once("error",()=>process.exit(0))' "$port"
[[ -z "$(find "$root/temp" -mindepth 1 -maxdepth 1 -print -quit)" ]]
[[ -z "$(find "$root/evidence" -name '*.receipt' -print -quit)" ]]
echo 'macOS verifier TERM: owned descendants/checkout cleaned; no success receipt'
