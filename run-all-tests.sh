#!/usr/bin/env bash
#
# The bare complete MIA frontend gate; --affected-e2e retains every non-browser stage.
#
# The npm scripts are the fast subset for iterating. Per-story verification uses
# an explicit affected-browser selection here, never a guessed or empty one.
#
# The application is greenfield, so components whose tooling does not exist yet are
# skipped and reported as skipped. A skipped component is never a pass.
#
set -euo pipefail

usage() {
  echo 'Usage: ./run-all-tests.sh [--full-matrix] | --affected-e2e e2e/NAME.spec.ts [e2e/NAME.spec.ts ...] [--grep PATTERN]' >&2
  exit 2
}
mode=story
gate=complete
browser_args=()
if [[ ${1:-} == --full-matrix ]]; then
  [[ $# == 1 ]] || usage
  mode=full
elif [[ ${1:-} == --affected-e2e ]]; then
  gate=affected-local
  shift
  [[ $# -gt 0 ]] || usage
  while [[ $# -gt 0 && "$1" != --grep ]]; do
    [[ "$1" =~ ^e2e/[A-Za-z0-9._/-]+\.spec\.ts$ && -f "$1" ]] || usage
    browser_args+=("$1")
    shift
  done
  [[ ${#browser_args[@]} -gt 0 ]] || usage
  if [[ $# -gt 0 ]]; then
    [[ $# == 2 && "$1" == --grep && -n "$2" ]] || usage
    browser_args+=("$1" "$2")
  fi
elif [[ $# -gt 0 ]]; then
  usage
fi
if [[ -n "${MIA_PRESENTATION_MATRIX+x}" && "${MIA_PRESENTATION_MATRIX}" != "$mode" ]]; then
  echo 'Conflicting presentation matrix mode.' >&2
  exit 2
fi
export MIA_PRESENTATION_MATRIX="$mode" MIA_AUTHORITATIVE_GATE=1
echo "GATE mode=$gate presentation-matrix=$mode."
[[ "$gate" != affected-local || -f package.json ]] || { echo 'Affected mode requires npm tooling.' >&2; exit 2; }

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

  if [[ "$gate" == affected-local ]]; then
    printf 'AFFECTED E2E explicit selection: '
    printf '%q ' "${browser_args[@]}"
    echo
    # Listing registers the exact locale/text-mode selection without launching a browser.
    # A zero-match grep or erroneous path must fail instead of silently omitting E2E.
    list=$(node_modules/.bin/playwright test --list "${browser_args[@]}") || {
      echo 'Affected E2E selection failed to list tests.' >&2
      exit 1
    }
    count=$(printf '%s\n' "$list" | sed -nE 's/^Total: ([0-9]+) tests? in .*/\1/p' | tail -1)
    [[ -n "$count" && "$count" -gt 0 ]] || { echo 'Affected E2E selected zero tests.' >&2; exit 2; }
    echo "AFFECTED E2E selected-count=$count"
    printf 'AFFECTED E2E command: npm run check:browser-gate:built -- '
    printf '%q ' "${browser_args[@]}"
    echo
  fi

  if has_script "test:preview-runner"; then
    time_stage "npm:test:preview-runner"
    npm run test:preview-runner
  else
    skip "npm run test:preview-runner (script not defined)"
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
    [[ "$gate" != affected-local ]] || { echo 'Affected E2E requires a build.' >&2; exit 1; }
    skip "E2E (no build produced by this gate)"
  else
    if has_script "check:browser-gate:built"; then
      echo "Running npm run check:browser-gate:built (using this gate's build) ..."
      time_stage "npm:browser-gate:built"
      npm run check:browser-gate:built -- "${browser_args[@]}"
    else
      [[ "$gate" != affected-local ]] || { echo 'Affected E2E browser script is unavailable.' >&2; exit 1; }
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
  if [[ "$gate" == affected-local ]]; then
    echo "Affected E2E selected-count=$count ran; complete browser suite not run."
  fi
else
  if [[ "$gate" == affected-local ]]; then
    echo "Affected local verification passed (selected E2E count=$count); complete E2E remains remote QA pending."
  else
    echo "🥳🥳 All tests passed. 🎉🎉 "
  fi
fi
