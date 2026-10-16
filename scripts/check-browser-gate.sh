#!/usr/bin/env bash
# Runs only under scripts/hygiene-preview.mjs after the one gate build.
set -euo pipefail
stage=browser-install
trap 'echo "GATE_FAILURE stage=$stage" >&2' ERR
npx playwright install chromium
stage=e2e
started=$SECONDS
npm run test:e2e:owned
echo "BROWSER E2E passed."
echo "TIMING stage=npm:test:e2e:built seconds=$((SECONDS - started))"
started=$SECONDS
report_dir=tmp/agent-execution/spec-hygiene-runner-batching
mkdir -p "$report_dir"
stage=secret-hygiene
MIA_ROUTE_HYGIENE_REPORT="$report_dir/route.json" \
MIA_COURSE_HYGIENE_REPORT="$report_dir/course-unit.json" \
  npm run check:secret-hygiene:owned
stage=evidence-compare
node scripts/compare-hygiene-evidence.mjs "$report_dir"
echo "BROWSER secret hygiene passed."
echo "TIMING stage=npm:check:secret-hygiene:built seconds=$((SECONDS - started))"
