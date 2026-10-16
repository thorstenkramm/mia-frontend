#!/usr/bin/env bash
# Runs only under scripts/owned-preview.mjs after the one gate build.
set -euo pipefail
if [[ "${MIA_PRESENTATION_MATRIX-full}" != story && "${MIA_PRESENTATION_MATRIX-full}" != full ]]; then
  echo 'Invalid presentation matrix mode.' >&2
  exit 2
fi
npx playwright install chromium
started=$SECONDS
npm run test:e2e:owned
echo "BROWSER E2E passed."
echo "TIMING stage=npm:test:e2e:built seconds=$((SECONDS - started))"
