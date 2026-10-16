#!/usr/bin/env bash
# The tested commit supplies this check list. No licensed/backend files are copied.
set -euo pipefail
[[ $# == 1 && "$1" =~ ^[0-9a-f]{40}$ && "$(git rev-parse HEAD)" == "$1" ]] || exit 2
echo "revision=$1 environment=$(uname -s) node=$(node --version) npm=$(npm --version)"
echo 'checks=lockfile-install,build,bundled-chromium,complete-matrix-e2e'
echo 'not-run=typecheck,lint,unit,duplication,audit,trivy,api-types(no-backend),tailwind-catalog(no-licence)'
npm ci
echo "playwright=$(node -p "require('./package.json').devDependencies['@playwright/test']")"
npx playwright install chromium
npm run build
echo 'Running complete-matrix Chromium; result is recorded by the worker.'
# Replace the timeout-owned process with the preview owner. timeout cannot
# finish until its direct child has cleaned up detached preview/browser groups.
exec env MIA_PRESENTATION_MATRIX=full node scripts/owned-preview.mjs -- node_modules/.bin/playwright test --workers=1
