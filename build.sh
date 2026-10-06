#!/usr/bin/env bash
# Build the static frontend from a Git checkout. Requires the Node.js and npm
# versions declared in package.json; no Node.js runtime is needed on the server.
set -euo pipefail

cd -- "$(dirname -- "${BASH_SOURCE[0]}")"

# Build tooling is needed even when the caller has NODE_ENV=production set.
npm ci --include=dev
npm run build

cat <<'EOF'

Frontend built in dist/.
Deploy its contents as the web server's document root, served at /.
Serve index.html for client-side routes, but never for /api requests.
When using a separate static server, proxy /api to the MIA backend on the same origin.
EOF
