#!/usr/bin/env bash
#
# Download the licensed Tailwind Plus component library into ./tailwindplus/
#
# The library is gitignored and never committed: the Tailwind Plus licence permits
# use in this project but forbids redistributing the component source. Every
# developer runs this once, and again when Tailwind Plus ships updates.
#
# Credentials are read from ~/.config/tailwindplus/credentials.json:
#   {"email": "you@example.com", "password": "..."}
# The downloader saves a session beside it, so credentials are rarely re-read.
#
set -euo pipefail

cd "$(dirname "$0")/.."

CONFIG_DIR="${TWP_CONFIG_DIR:-$HOME/.config/tailwindplus}"
CREDENTIALS="$CONFIG_DIR/credentials.json"
SESSION="$CONFIG_DIR/session.json"
OUTPUT="tailwindplus"

if [[ ! -f "$CREDENTIALS" ]]; then
    cat >&2 <<EOF
error: no Tailwind Plus credentials at $CREDENTIALS

Create it with your subscription login, readable only by you:

    mkdir -p "$CONFIG_DIR" && chmod 700 "$CONFIG_DIR"
    printf '{"email": "%s", "password": "%s"}\n' 'you@example.com' 'your-password' \\
        > "$CREDENTIALS"
    chmod 600 "$CREDENTIALS"

Keep it outside the repository. Never commit it.
EOF
    exit 1
fi

# Pinned to a tag rather than a branch so a download is reproducible.
# '#latest' floats onto each new release; bump deliberately, not implicitly.
DOWNLOADER="github:richardkmichael/tailwindplus-downloader#latest"

echo "Downloading Tailwind Plus components to $OUTPUT/ ..."
npx -y "$DOWNLOADER" \
    --credentials "$CREDENTIALS" \
    --session "$SESSION" \
    --output-format=dir \
    --output="$OUTPUT" \
    --overwrite

# A fresh download may add or remove components, so resync the skill's catalog.
./scripts/twp-catalog.sh

echo
echo "Done. Library version: $(python3 -c 'import json;print(json.load(open("tailwindplus/metadata.json"))["version"])')"
echo "Agents access it via the 'tailwind-plus' skill in .agents/skills/."
