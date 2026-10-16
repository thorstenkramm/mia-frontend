#!/usr/bin/env bash
# Run Chromium on a job-owned session bus, never an inherited login bus.
set -euo pipefail
[[ $# -ge 2 && "$1" == /* ]] || exit 2
runtime=$1
shift
mkdir -m 700 -- "$runtime"
exec env -u DBUS_SESSION_BUS_ADDRESS -u DBUS_STARTER_ADDRESS -u DBUS_STARTER_BUS_TYPE \
  XDG_RUNTIME_DIR="$runtime" dbus-run-session -- "$@"
