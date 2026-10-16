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

# Content-free per-stage timing (measurement for the test-suite speedup plan in
# tmp/improve-tests.md). One greppable line per stage; labels are stage names only.
stage_start=0
time_stage() {
  # $1 = content-free stage label; prints elapsed time for the previous stage.
  if [[ -n "${timed_stage:-}" ]]; then
    echo "TIMING stage=$timed_stage seconds=$((SECONDS - stage_start))"
  fi
  timed_stage="$1"
  stage_start=$SECONDS
}

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

  if has_script "test:hygiene-runner"; then
    time_stage "npm:test:hygiene-runner"
    npm run test:hygiene-runner
  else
    skip "npm run test:hygiene-runner (script not defined)"
  fi

  if has_script "check:hygiene-inventory"; then
    time_stage "npm:check:hygiene-inventory"
    npm run check:hygiene-inventory
  else
    skip "npm run check:hygiene-inventory (script not defined)"
  fi

  built=0
  for target in typecheck check:typecheck-coverage lint format:check test build check:bundle-size check:i18n check:api-types; do
    if has_script "$target"; then
      echo "Running npm run $target ..."
      time_stage "npm:$target"
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
    if has_script "check:browser-gate:built"; then
      echo "Running npm run check:browser-gate:built (using this gate's build) ..."
      time_stage "npm:browser-gate:built"
      npm run check:browser-gate:built
    else
      skip "npm run check:browser-gate:built (script not defined)"
    fi
  fi
fi

# ---------------------------------------------------------------------------
# Duplication
# ---------------------------------------------------------------------------

time_stage "duplication"
./scripts/check-duplication.sh

# ---------------------------------------------------------------------------
# Dependency and secret scanning
# ---------------------------------------------------------------------------

if [[ -f package-lock.json ]]; then
  echo "Running npm audit ..."
  time_stage "npm-audit"
  npm audit --audit-level=high
else
  skip "npm audit (no package-lock.json yet)"
fi

if command -v trivy >/dev/null 2>&1; then
  time_stage "trivy"
  ./scripts/check-trivy.sh
else
  skip "Trivy scan (trivy not installed)"
fi

# ---------------------------------------------------------------------------
# Tailwind Plus catalog
# ---------------------------------------------------------------------------

if [[ -d tailwindplus ]]; then
  echo "Checking Tailwind Plus catalog ..."
  time_stage "tailwind-catalog"
  ./scripts/twp-catalog.sh --check
else
  skip "Tailwind Plus catalog check (library not downloaded)"
fi

# ---------------------------------------------------------------------------
# Markdown
# ---------------------------------------------------------------------------

time_stage "markdown"
./scripts/check-markdown.sh

# ---------------------------------------------------------------------------
# Result
# ---------------------------------------------------------------------------

time_stage ""
echo "TIMING stage=total seconds=$SECONDS"
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
