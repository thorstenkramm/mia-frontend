#!/usr/bin/env bash
set -euo pipefail

temporary_directory="$(mktemp -d "${TMPDIR:-/tmp}/mia-api-types.XXXXXX")"
temporary_file="$temporary_directory/generated.ts"
trap 'rm -rf "$temporary_directory"' EXIT

./node_modules/.bin/openapi-typescript mia/api-doc/openapi.yaml -o "$temporary_file"
./node_modules/.bin/prettier --write "$temporary_file" >/dev/null

if ! cmp -s src/platform/api/generated.ts "$temporary_file"; then
  echo "src/platform/api/generated.ts does not match mia/api-doc/openapi.yaml."
  echo "Run npm run generate:api and commit the generated result."
  exit 1
fi

echo "Generated API wire types match the implemented OpenAPI contract."
