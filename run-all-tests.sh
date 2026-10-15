#!/usr/bin/env bash
#
# The complete MIA frontend check and the authoritative quality gate.
#
# The npm scripts are the fast subset for iterating. This script is not optional before
# reporting work complete: it also enforces checks that no npm script covers.
#
# The application is greenfield, so components whose tooling does not exist yet are
# skipped and reported as skipped. A skipped component is never a pass.
#
set -euo pipefail

skipped=()

skip() {
  echo "SKIPPED: $1"
  skipped+=("$1")
}

has_script() {
  [[ -f package.json ]] && node -e \
    "process.exit(require('./package.json').scripts?.['$1'] ? 0 : 1)" 2>/dev/null
}

# ---------------------------------------------------------------------------
# Application checks
# ---------------------------------------------------------------------------

if [[ ! -f package.json ]]; then
  skip "all npm checks (no package.json yet)"
else
  if [[ ! -d node_modules ]]; then
    echo "Installing dependencies ..."
    npm ci
  fi

  built=0
  for target in typecheck check:typecheck-coverage lint format:check test build check:bundle-size check:i18n check:api-types; do
    if has_script "$target"; then
      echo "Running npm run $target ..."
      npm run "$target"
      if [[ "$target" == "build" ]]; then built=1; fi
    else
      skip "npm run $target (script not defined)"
    fi
  done

  # End-to-end tests need browsers installed; keep them a separate, explicit component.
  if [[ "$built" -eq 0 ]]; then
    skip "E2E and secret hygiene (no build produced by this gate)"
  else
    if has_script "test:e2e:built"; then
      echo "Running npm run test:e2e:built (using this gate's build) ..."
      npm run test:e2e:built
    else
      skip "npm run test:e2e:built (script not defined)"
    fi

    if has_script "check:secret-hygiene:built"; then
      echo "Running npm run check:secret-hygiene:built (using this gate's build) ..."
      npm run check:secret-hygiene:built
    else
      skip "npm run check:secret-hygiene:built (script not defined)"
    fi
  fi
fi

# ---------------------------------------------------------------------------
# Duplication
# ---------------------------------------------------------------------------

./scripts/check-duplication.sh

# ---------------------------------------------------------------------------
# Dependency and secret scanning
# ---------------------------------------------------------------------------

if [[ -f package-lock.json ]]; then
  echo "Running npm audit ..."
  npm audit --audit-level=high
else
  skip "npm audit (no package-lock.json yet)"
fi

if command -v trivy >/dev/null 2>&1; then
  ./scripts/check-trivy.sh
else
  skip "Trivy scan (trivy not installed)"
fi

# ---------------------------------------------------------------------------
# Tailwind Plus catalog
# ---------------------------------------------------------------------------

if [[ -d tailwindplus ]]; then
  echo "Checking Tailwind Plus catalog ..."
  ./scripts/twp-catalog.sh --check
else
  skip "Tailwind Plus catalog check (library not downloaded)"
fi

# ---------------------------------------------------------------------------
# Markdown
# ---------------------------------------------------------------------------

./scripts/check-markdown.sh

# ---------------------------------------------------------------------------
# Result
# ---------------------------------------------------------------------------

echo
if [[ ${#skipped[@]} -gt 0 ]]; then
  echo "Completed with ${#skipped[@]} skipped component(s):"
  for item in "${skipped[@]}"; do
    echo "  - $item"
  done
  echo
  echo "A skipped component is not a pass. Report skips explicitly."
else
  echo "🥳🥳 All tests passed. 🎉🎉 "
fi
