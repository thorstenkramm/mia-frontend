#!/usr/bin/env bash
#
# Trivy vulnerability and secret scan of the working tree.
#
set -euo pipefail

cd "$(dirname "$0")/.."

echo "Running Trivy vulnerability and secret scan ..."
trivy fs . --skip-dirs .agents --skip-dirs tailwindplus --skip-dirs _bmad-output
