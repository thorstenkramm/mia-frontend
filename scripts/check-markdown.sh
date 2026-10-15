#!/usr/bin/env bash
#
# Markdown lint over tracked and untracked, non-ignored Markdown, respecting the
# directory exemptions in .agents/rules/markdown.md.
#
set -euo pipefail

cd "$(dirname "$0")/.."

markdown_files=()
while IFS= read -r file; do
  markdown_files+=("$file")
done < <(git ls-files --cached --others --exclude-standard -- '*.md' \
  ':(exclude)_bmad/**' ':(exclude)_bmad-output/**' ':(exclude).agents/skills/**' \
  ':(exclude).opencode/**' ':(exclude)tailwindplus/**' ':(exclude)tmp/**')

if [[ ${#markdown_files[@]} -eq 0 ]]; then
  echo "No Markdown files found for linting."
  exit 1
fi

echo "Running Markdown lint ..."
npx --yes markdownlint-cli@0.49.1 "${markdown_files[@]}"
