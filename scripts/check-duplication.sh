#!/usr/bin/env bash
#
# Duplication detection over logic, not presentation. JSX is structurally repetitive by
# design and the Tailwind Plus blueprints are near-identical to each other on purpose, so
# clone detection over components produces findings whose only remedy is an ignore marker.
# See .agents/rules/duplication.md.
#
set -euo pipefail

cd "$(dirname "$0")/.."

source_files=()
while IFS= read -r file; do
  source_files+=("$file")
done < <(git ls-files --cached --others --exclude-standard \
  -- 'src/**/*.ts' 'src/**/*.tsx' \
  ':(exclude)src/**/components/**' \
  ':(exclude)src/platform/api/generated.ts' \
  ':(exclude)src/**/*.test.ts' ':(exclude)src/**/*.test.tsx')

if [[ ${#source_files[@]} -eq 0 ]]; then
  echo "No source files found for duplication detection."
  exit 1
fi

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
