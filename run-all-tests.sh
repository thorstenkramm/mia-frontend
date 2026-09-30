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

  for target in typecheck lint format:check test build check:bundle-size check:i18n check:api-types; do
    if has_script "$target"; then
      echo "Running npm run $target ..."
      npm run "$target"
    else
      skip "npm run $target (script not defined)"
    fi
  done

  # End-to-end tests need browsers installed; keep them a separate, explicit component.
  if has_script "test:e2e"; then
    echo "Running npm run test:e2e ..."
    npm run test:e2e
  else
    skip "npm run test:e2e (script not defined)"
  fi

  if has_script "check:secret-hygiene"; then
    echo "Running npm run check:secret-hygiene ..."
    npm run check:secret-hygiene
  else
    skip "npm run check:secret-hygiene (script not defined)"
  fi
fi

# ---------------------------------------------------------------------------
# Duplication
#
# Scope is logic, not presentation. JSX is structurally repetitive by design and the
# Tailwind Plus blueprints are near-identical to each other on purpose, so clone
# detection over components produces findings whose only remedy is an ignore marker.
# See .agents/rules/duplication.md.
# ---------------------------------------------------------------------------

source_files=()
while IFS= read -r file; do
  source_files+=("$file")
done < <(git ls-files --cached --others --exclude-standard \
  -- 'src/**/*.ts' 'src/**/*.tsx' \
  ':(exclude)src/**/components/**' \
  ':(exclude)src/platform/api/generated.ts' \
  ':(exclude)src/**/*.test.ts' ':(exclude)src/**/*.test.tsx')

if [[ ${#source_files[@]} -eq 0 ]]; then
  skip "duplication detection (no source files yet)"
else
  # An ignore-start without a matching ignore-end silently suppresses duplication
  # detection to the end of that file and still exits successfully, so unbalanced
  # markers must fail before the scan can report a clean result.
  echo "Checking duplication marker balance ..."
  unbalanced=0
  for file in "${source_files[@]}"; do
    starts="$(grep -c 'jscpd:ignore-start' "$file" || true)"
    ends="$(grep -c 'jscpd:ignore-end' "$file" || true)"
    if [[ "$starts" -ne "$ends" ]]; then
      echo "$file has $starts jscpd:ignore-start and $ends jscpd:ignore-end markers"
      unbalanced=1
    fi
  done
  if [[ "$unbalanced" -ne 0 ]]; then
    echo "Unbalanced duplication markers hide later clones in the same file."
    exit 1
  fi

  echo "Running code duplication search ..."
  npx --yes jscpd@5.1.2 --min-lines 10 --min-tokens 50 --threshold 0 \
    --reporters console --no-tips \
    --format typescript,tsx \
    "${source_files[@]}"
fi

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
  echo "Running Trivy vulnerability and secret scan ..."
  trivy fs . --skip-dirs .agents --skip-dirs tailwindplus --skip-dirs _bmad-output
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

markdown_files=()
while IFS= read -r file; do
  markdown_files+=("$file")
done < <(git ls-files --cached --others --exclude-standard -- '*.md' \
  ':(exclude)_bmad/**' ':(exclude)_bmad-output/**' ':(exclude).agents/skills/**' \
  ':(exclude).opencode/**' ':(exclude)tailwindplus/**' ':(exclude)tmp/**')

if [[ ${#markdown_files[@]} -eq 0 ]]; then
  skip "Markdown lint (no tracked Markdown)"
else
  echo "Running Markdown lint ..."
  npx --yes markdownlint-cli@0.49.1 "${markdown_files[@]}"
fi

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
