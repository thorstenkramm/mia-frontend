#!/usr/bin/env bash
# Two SSH phases: prepare queues an at job, inspect runs only after disconnect.
set -euo pipefail
case "${1:-}" in
  prepare)
    [[ $# == 2 && "$2" =~ ^[0-9a-f]{40}$ ]] || exit 2
    umask 077
    command -v dbus-run-session >/dev/null
    command -v dbus-send >/dev/null
    root=$(mktemp -d "$HOME/.local/share/mia-qa/smoke-browser.XXXXXX")
    git init --quiet "$root/checkout"
    sha=$2
    git -C "$root/checkout" fetch --quiet "$HOME/mia-frontend.git" "refs/qa/commits/$sha"
    git -C "$root/checkout" checkout --quiet --detach "$sha"
    [[ "$(git -C "$root/checkout" rev-parse HEAD)" == "$sha" ]]
    cp "$HOME/mia-frontend.git/hooks/qa-browser-session.sh" "$root/helper.sh"
    (cd "$root/checkout" && npm ci && npm run build) > "$root/setup.log" 2>&1
    cat > "$root/job.sh" <<'JOB'
#!/usr/bin/env bash
set -uo pipefail
umask 077
root=${MIA_QA_BROWSER_SMOKE_ROOT:?}
cd "$root/checkout" || exit 1
code=0
(
  [[ "${DBUS_SESSION_BUS_ADDRESS:-}" == 'unix:path=/nonexistent-mia-qa-transient-bus' ]] || exit 2
  [[ "${XDG_RUNTIME_DIR:-}" == '/nonexistent-mia-qa-transient-runtime' ]] || exit 2
  printf 'inherited-transient-bus=present\n'
  bash "$root/helper.sh" "$root/runtime" bash -c '
    set -euo pipefail
    [[ "$XDG_RUNTIME_DIR" == "$1" ]]
    [[ -n "${DBUS_SESSION_BUS_ADDRESS:-}" && "$DBUS_SESSION_BUS_ADDRESS" != "$2" ]]
    dbus-send --session --type=method_call --dest=org.freedesktop.DBus / org.freedesktop.DBus.ListNames > /dev/null
    sleep 25
    dbus-send --session --type=method_call --dest=org.freedesktop.DBus / org.freedesktop.DBus.ListNames > /dev/null
    printf "job-bus-still-live-after-disconnect=pass\n"
    exec env MIA_PRESENTATION_MATRIX=full node scripts/owned-preview.mjs -- \
      node_modules/.bin/playwright test e2e/scaffold.spec.ts \
      --grep "all text modes reflow at actual 200% Chromium browser zoom" --workers=1
  ' -- "$root/runtime" "$DBUS_SESSION_BUS_ADDRESS"
) > "$root/run.log" 2>&1 || code=$?
printf 'exit=%s\n' "$code" > "$root/run.exit.tmp"
mv "$root/run.exit.tmp" "$root/run.exit"
JOB
    chmod 700 "$root/job.sh"
    printf 'exec /bin/bash %q\n' "$root/job.sh" > "$root/dispatch.sh"
    MIA_QA_BROWSER_SMOKE_ROOT="$root" \
      DBUS_SESSION_BUS_ADDRESS=unix:path=/nonexistent-mia-qa-transient-bus \
      XDG_RUNTIME_DIR=/nonexistent-mia-qa-transient-runtime \
      at -f "$root/dispatch.sh" now > "$root/at.log" 2>&1
    printf 'smoke_state=%s\n' "$root"
    ;;
  inspect)
    [[ $# == 2 && -d "$2/checkout" ]] || exit 2
    root=$2
    deadline=$((SECONDS + 120))
    until [[ -f "$root/run.exit" ]]; do
      ((SECONDS < deadline)) || { echo 'asynchronous browser smoke timeout'; exit 1; }
      sleep 2
    done
    grep -qx 'exit=0' "$root/run.exit" || { echo 'asynchronous browser smoke failed'; exit 1; }
    grep -qx 'inherited-transient-bus=present' "$root/run.log"
    grep -qx 'job-bus-still-live-after-disconnect=pass' "$root/run.log"
    grep -Eq '^[[:space:]]+1 passed \(' "$root/run.log"
    ! grep -q 'FATAL:dbus/bus.cc' "$root/run.log"
    echo 'Detached at job: isolated bus survives session disconnect; actual 200% Chromium zoom passed (1 test)'
    ;;
  cancel)
    [[ $# == 2 && -d "$2/checkout/dist" ]] || exit 2
    root=$2
    cd "$root/checkout"
    MIA_QA_BROWSER_SMOKE_ROOT="$root" setsid timeout --signal=TERM --kill-after=15s 60 \
      bash "$root/helper.sh" "$root/cancel-runtime" \
      node scripts/owned-preview.mjs -- node -e \
      'require("node:fs").writeFileSync(process.env.MIA_QA_BROWSER_SMOKE_ROOT+"/owned-child.pid",String(process.pid));setInterval(()=>{},1000)' \
      > "$root/cancel.log" 2>&1 &
    leader=$!
    deadline=$((SECONDS + 20))
    until [[ -f "$root/owned-child.pid" ]]; do
      ((SECONDS < deadline)) || { echo 'owned preview did not start'; exit 1; }
      sleep 0.2
    done
    owned=$(cat "$root/owned-child.pid")
    kill -TERM -- "-$leader"
    wait "$leader" || :
    deadline=$((SECONDS + 20))
    while kill -0 -- "-$leader" 2>/dev/null; do
      ((SECONDS < deadline)) || { echo 'owned bus/preview group survived cancellation'; exit 1; }
      sleep 0.2
    done
    if kill -0 "$owned" 2>/dev/null; then
      state=$(ps -o stat= -p "$owned" || :)
      [[ -z "$state" || "$state" == Z* ]] || { echo 'owned child survived cancellation'; exit 1; }
    fi
    node -e 'const s=require("node:net").connect(4173,"127.0.0.1");s.once("connect",()=>process.exit(1));s.once("error",()=>process.exit(0))'
    echo 'TERM drains the job-owned D-Bus/preview group; owned child and port cleaned'
    ;;
  *) exit 2 ;;
esac
