#!/usr/bin/env bash
set -euo pipefail
case "${1:-}" in
  enqueue)
    root=$(mktemp -d "$HOME/.local/share/mia-qa/smoke-queue.XXXXXX")
    git init --quiet --bare "$root/runner.git"
    cp "$HOME/mia-frontend.git/hooks/"{post-receive,update,qa-worker.sh,qa-job.sh,qa-recover.sh} "$root/runner.git/hooks/"
    git init --quiet "$root/source"
    mkdir -p "$root/source/.localgit"
    cd "$root/source"
    printf '#!/usr/bin/env bash\nsleep 2\necho synthetic-check-passed\n' > .localgit/post-receive-run.sh
    git add .localgit/post-receive-run.sh
    git -c user.name=QA -c user.email=qa@example.invalid commit --quiet -m first
    sha1=$(git rev-parse HEAD)
    printf 'a\n' > marker
    git add marker
    git -c user.name=QA -c user.email=qa@example.invalid commit --quiet -m second
    sha2=$(git rev-parse HEAD)
    export MIA_QA_HOME="$root/state"
    git push --quiet "$root/runner.git" "$sha1:refs/qa/commits/$sha1"
    git push --quiet "$root/runner.git" "$sha2:refs/qa/commits/$sha2"
    printf '%s\n%s\n' "$sha1" "$sha2" > "$root/revisions"
    echo "smoke_state=$root"
    exit 0
    ;;
  inspect)
    [[ $# == 2 && -d "$2/source" ]] || exit 2
    root=$2
    cd "$root/source"
    read -r sha1 < "$root/revisions"
    sha2=$(tail -1 "$root/revisions")
    export MIA_QA_HOME="$root/state"
    ;;
  quarantine)
    [[ $# == 2 && -d "$2/source" ]] || exit 2
    root=$2
    cd "$root/source"
    export MIA_QA_HOME="$root/state"
    cat > .localgit/post-receive-run.sh <<'JOB'
#!/usr/bin/env bash
trap '' TERM
while :; do sleep 1; done
JOB
    git add .localgit/post-receive-run.sh
    git -c user.name=QA -c user.email=qa@example.invalid commit --quiet -m forced-timeout
    sha8=$(git rev-parse HEAD)
    PATH="$root/bin:$PATH" git push --quiet "$root/runner.git" "$sha8:refs/qa/commits/$sha8"
    printf '#!/usr/bin/env bash\necho unexpected-next-job\n' > .localgit/post-receive-run.sh
    git add .localgit/post-receive-run.sh
    git -c user.name=QA -c user.email=qa@example.invalid commit --quiet -m quarantined-successor
    sha9=$(git rev-parse HEAD)
    PATH="$root/bin:$PATH" git push --quiet "$root/runner.git" "$sha9:refs/qa/commits/$sha9"
    if MIA_QA_JOB_TIMEOUT_SECONDS=1 "$root/runner.git/hooks/qa-worker.sh" "$root/runner.git" --drain; then
      echo 'forced cleanup was incorrectly accepted'; exit 1
    fi
    grep -qx 'status=canceled' "$root/state/results/$sha8.status"
    grep -qx 'reason=cleanup-unconfirmed' "$root/state/results/$sha8.status"
    grep -qx 'status=queued' "$root/state/results/$sha9.status"
    [[ -f "$root/state/cleanup-unconfirmed" && -d "$root/state/workspaces/000000000009" ]]
    if "$root/runner.git/hooks/qa-worker.sh" "$root/runner.git" --drain; then
      echo 'quarantine allowed another worker'; exit 1
    fi
    echo 'Forced cleanup quarantined; next job and owned workspace preserved: pass'
    exit 0
    ;;
  handoff)
    [[ $# == 2 && -d "$2/source" ]] || exit 2
    root=$2
    cd "$root/source"
    export MIA_QA_HOME="$root/state"
    cat > "$root/bin/setsid" <<'SHIM'
#!/usr/bin/env bash
# Hold the exact forked child before it becomes a new session. Ignore TERM so
# a group-only signal cannot accidentally make this regression pass.
trap '' TERM
printf '%s\n' "$BASHPID" > "$MIA_QA_HOME/pre-session.pid"
while [[ ! -e "$MIA_QA_HOME/release-session" ]]; do sleep 0.1; done
exec /usr/bin/setsid "$@"
SHIM
    chmod +x "$root/bin/setsid"
    cat > .localgit/post-receive-run.sh <<'JOB'
#!/usr/bin/env bash
node -e 'require("node:fs").writeFileSync(process.env.MIA_QA_HOME+"/late-job","yes");require("node:net").createServer().listen(4174,"127.0.0.1");setTimeout(()=>{},30000)'
JOB
    git add .localgit/post-receive-run.sh
    git -c user.name=QA -c user.email=qa@example.invalid commit --quiet -m pre-session-handoff
    sha8=$(git rev-parse HEAD)
    PATH="$root/bin:$PATH" git push --quiet "$root/runner.git" "$sha8:refs/qa/commits/$sha8"
    PATH="$root/bin:$PATH" "$root/runner.git/hooks/qa-worker.sh" "$root/runner.git" --drain &
    worker=$!
    deadline=$((SECONDS + 20))
    until [[ -f "$root/state/pre-session.pid" ]]; do
      ((SECONDS < deadline)) || { echo 'setsid shim never reached'; exit 1; }
      sleep 0.1
    done
    shim=$(cat "$root/state/pre-session.pid")
    [[ -d "$root/state/workspaces/000000000008" ]]
    kill -TERM "$worker"
    # If the checkout disappears while the shim is still alive, the worker
    # released its lock before its owned child could be stopped.
    for ((attempt = 0; attempt < 20; attempt++)); do
      if kill -0 "$shim" 2>/dev/null; then
        [[ -d "$root/state/workspaces/000000000008" ]] || {
          echo 'workspace removed while pre-session child was alive'; exit 1;
        }
        if flock -n "$root/state/worker.lock" -c ':'; then
          echo 'worker lock released while pre-session child was alive'; exit 1
        fi
      fi
      sleep 0.1
    done
    touch "$root/state/release-session"
    deadline=$((SECONDS + 20))
    while kill -0 "$worker" 2>/dev/null; do
      ((SECONDS < deadline)) || { echo 'worker failed to stop after pre-session TERM'; exit 1; }
      sleep 0.1
    done
    wait "$worker" || :
    grep -qx 'status=canceled' "$root/state/results/$sha8.status"
    [[ ! -d "$root/state/workspaces/000000000008" && ! -f "$root/state/late-job" ]]
    ! kill -0 "$shim" 2>/dev/null
    node -e 'const s=require("node:net").connect(4174,"127.0.0.1");s.once("connect",()=>process.exit(1));s.once("error",()=>process.exit(0))'
    echo 'Pre-session TERM: owned shim stopped before workspace release; no late job/listener: pass'
    exit 0
    ;;
  *) exit 2 ;;
esac
deadline=$((SECONDS + 120))
until grep -qx 'status=passed' "$root/state/results/$sha1.status" &&
  grep -qx 'status=passed' "$root/state/results/$sha2.status"; do
  for revision in "$sha1" "$sha2"; do
    if grep -Eq '^status=(failed|canceled)$' "$root/state/results/$revision.status"; then
      echo 'queued job failed before FIFO proof'; exit 1
    fi
  done
  ((SECONDS < deadline)) || { echo 'queue timeout'; exit 1; }
  sleep 2
done
grep -qx "revision=$sha1" "$root/state/results/$sha1.status"
grep -qx "revision=$sha2" "$root/state/results/$sha2.status"
grep -qx "ref=refs/qa/commits/$sha1" "$root/state/results/$sha1.status"
grep -qx "ref=refs/qa/commits/$sha2" "$root/state/results/$sha2.status"
first_end=$(sed -n 's/^ended=//p' "$root/state/results/$sha1.status")
second_start=$(sed -n 's/^started=//p' "$root/state/results/$sha2.status")
[[ "$second_start" > "$first_end" || "$second_start" == "$first_end" ]]
[[ ! -d "$root/state/workspaces/000000000001" && ! -d "$root/state/workspaces/000000000002" ]]
echo 'FIFO two commits: pass, isolated workspaces cleaned'
if git push --quiet --force "$root/runner.git" "$sha2:refs/qa/commits/$sha1" 2>/dev/null; then
  echo 'immutable QA ref was rewritten'; exit 1
fi
[[ "$(git --git-dir="$root/runner.git" rev-parse "refs/qa/commits/$sha1")" == "$sha1" ]]
if git push --quiet "$root/runner.git" ":refs/qa/commits/$sha1" 2>/dev/null; then
  echo 'immutable QA ref was deleted'; exit 1
fi
echo 'Immutable QA refs: pass'

mkdir -p "$root/bin"
printf '#!/usr/bin/env bash\ncat >/dev/null\nexit 1\n' > "$root/bin/at"
chmod +x "$root/bin/at"
printf 'b\n' >> marker
git add marker
git -c user.name=QA -c user.email=qa@example.invalid commit --quiet -m failed-dispatch
sha3=$(git rev-parse HEAD)
PATH="$root/bin:$PATH" git push --quiet "$root/runner.git" "$sha3:refs/qa/commits/$sha3" 2>/dev/null || :
grep -qx 'status=failed' "$root/state/results/$sha3.status"
echo 'Failed at submission visible after accepted push: pass'
rm -- "$root/bin/at"
MIA_QA_REPO="$root/runner.git" "$root/runner.git/hooks/qa-recover.sh" "$sha3"
deadline=$((SECONDS + 120))
until grep -qx 'status=passed' "$root/state/results/$sha3.status"; do
  ((SECONDS < deadline)) || { echo 'explicit recovery timeout'; exit 1; }
  sleep 2
done
grep -qx 'synthetic-check-passed' "$root/state/results/$sha3.log"
echo 'Failed dispatch explicitly recovered without ref rewrite: pass'

# Controlled pre-assignment TERM: mock successful submission, run worker ourselves.
# Finish any atd workers from the previous phase before taking ownership here.
deadline=$((SECONDS + 30))
until [[ -z "$(atq)" ]]; do
  ((SECONDS < deadline)) || { echo 'earlier at jobs did not drain'; exit 1; }
  sleep 1
done
flock -x "$root/state/worker.lock" -c ':'
printf '#!/usr/bin/env bash\ncat >/dev/null\nexit 0\n' > "$root/bin/at"
chmod +x "$root/bin/at"
cat > .localgit/post-receive-run.sh <<'JOB'
#!/usr/bin/env bash
set -euo pipefail
echo launched > "$MIA_QA_HOME/launched"
JOB
git add .localgit/post-receive-run.sh
git -c user.name=QA -c user.email=qa@example.invalid commit --quiet -m pre-assignment-term
sha4=$(git rev-parse HEAD)
PATH="$root/bin:$PATH" git push --quiet "$root/runner.git" "$sha4:refs/qa/commits/$sha4"
mkfifo "$root/pre-spawn.fifo"
export MIA_QA_TEST_BEFORE_SPAWN_FIFO="$root/pre-spawn.fifo"
"$root/runner.git/hooks/qa-worker.sh" "$root/runner.git" --drain &
worker=$!
deadline=$((SECONDS + 20))
until grep -qx 'status=running' "$root/state/results/$sha4.status"; do
  ((SECONDS < deadline)) || { echo 'worker startup timeout'; exit 1; }
  sleep 1
done
kill -TERM "$worker"
printf 'release\n' > "$root/pre-spawn.fifo"
wait "$worker" || :
grep -qx 'status=canceled' "$root/state/results/$sha4.status"
[[ ! -d "$root/state/workspaces/000000000004" ]]
[[ ! -e "$root/state/launched" ]]
grep -qx 'Job canceled before launch.' "$root/state/results/$sha4.log"
unset MIA_QA_TEST_BEFORE_SPAWN_FIFO
echo 'Pre-assignment TERM: no child launched, canceled and cleaned'

# The direct timeout-owned process delays teardown of a detached listener.
# A following job must not inherit its occupied port. This fixture is wholly
# synthetic and creates no dependency on a previous baseline checkout.
cat > delayed-preview.mjs <<'NODE'
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
const child = spawn(process.execPath, ["-e", `
  const fs = require("node:fs");
  const net = require("node:net");
  net.createServer().listen(4173, "127.0.0.1", () =>
    fs.writeFileSync(process.env.MIA_QA_HOME + "/listener-ready", String(process.pid)));
`], { detached: true, stdio: "ignore" });
process.on("SIGTERM", () => {
  setTimeout(() => {
    process.kill(-child.pid, "SIGTERM");
    child.once("exit", () => {
      writeFileSync(process.env.MIA_QA_HOME + "/listener-closed", "yes");
      process.exit(0);
    });
  }, 2000);
});
NODE
cat > .localgit/post-receive-run.sh <<'JOB'
#!/usr/bin/env bash
set -euo pipefail
exec node delayed-preview.mjs
JOB
git add .localgit/post-receive-run.sh delayed-preview.mjs
git -c user.name=QA -c user.email=qa@example.invalid commit --quiet -m delayed-timeout
sha5=$(git rev-parse HEAD)
PATH="$root/bin:$PATH" git push --quiet "$root/runner.git" "$sha5:refs/qa/commits/$sha5"
cat > .localgit/post-receive-run.sh <<'JOB'
#!/usr/bin/env bash
set -euo pipefail
node -e 'const s=require("node:net").connect(4173,"127.0.0.1");s.once("connect",()=>process.exit(7));s.once("error",()=>process.exit(0))'
JOB
git add .localgit/post-receive-run.sh
git -c user.name=QA -c user.email=qa@example.invalid commit --quiet -m next-job-port-check
sha6=$(git rev-parse HEAD)
PATH="$root/bin:$PATH" git push --quiet "$root/runner.git" "$sha6:refs/qa/commits/$sha6"
MIA_QA_JOB_TIMEOUT_SECONDS=3 "$root/runner.git/hooks/qa-worker.sh" "$root/runner.git" --drain
grep -qx 'status=canceled' "$root/state/results/$sha5.status"
grep -qx 'status=passed' "$root/state/results/$sha6.status"
[[ -f "$root/state/listener-ready" && -f "$root/state/listener-closed" ]]
timeout_end=$(sed -n 's/^ended=//p' "$root/state/results/$sha5.status")
success_start=$(sed -n 's/^started=//p' "$root/state/results/$sha6.status")
[[ "$success_start" > "$timeout_end" || "$success_start" == "$timeout_end" ]]
[[ ! -d "$root/state/workspaces/000000000005" && ! -d "$root/state/workspaces/000000000006" ]]
echo 'Timeout waits for delayed detached teardown before next job: pass'

printf '#!/usr/bin/env bash\necho synthetic-failure\nexit 7\n' > .localgit/post-receive-run.sh
git add .localgit/post-receive-run.sh
git -c user.name=QA -c user.email=qa@example.invalid commit --quiet -m failed-check
sha7=$(git rev-parse HEAD)
PATH="$root/bin:$PATH" git push --quiet "$root/runner.git" "$sha7:refs/qa/commits/$sha7"
"$root/runner.git/hooks/qa-worker.sh" "$root/runner.git" --drain
grep -qx 'status=failed' "$root/state/results/$sha7.status"
grep -qx 'exit=7' "$root/state/results/$sha7.status"
grep -qx 'synthetic-failure' "$root/state/results/$sha7.log"
[[ ! -d "$root/state/workspaces/000000000007" ]]
echo 'Failed check retains attributable log and cleans workspace: pass'
