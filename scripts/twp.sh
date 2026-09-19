#!/usr/bin/env bash
#
# Locate components in the licensed Tailwind Plus library at ./tailwindplus/.
#
# The library is gitignored, which makes it invisible to agent Glob tools. Grep and
# Read work on it normally; this script covers the listing and name-search that Glob
# would otherwise do.
#
#   twp.sh list <Product/Category/Group>   component names in a group
#   twp.sh find <term> [term ...]          components whose path matches all terms
#   twp.sh path <Product/Category/Group/Component>
#                                          resolved file path for MIA's format, to Read
#
# MIA's format is fixed: Tailwind v4, React, light mode.
#   Application UI, Marketing -> v4/react-light.jsx
#   Ecommerce (no modes)      -> v4/react.jsx
#
set -euo pipefail

cd "$(dirname "$0")/.."

LIBRARY="tailwindplus"

if [[ ! -d "$LIBRARY" ]]; then
    echo "error: $LIBRARY/ not found. Run ./scripts/twp-download.sh first." >&2
    exit 1
fi

usage() {
    sed -n '3,17p' "$0" | sed 's/^# \{0,1\}//'
    exit "${1:-1}"
}

# Application UI and Marketing carry mode variants; Ecommerce does not.
component_file() {
    local component_dir="$1"
    if [[ "$component_dir" == Ecommerce/* ]]; then
        echo "$LIBRARY/$component_dir/v4/react.jsx"
    else
        echo "$LIBRARY/$component_dir/v4/react-light.jsx"
    fi
}

cmd="${1:-}"
[[ -z "$cmd" ]] && usage 1
shift || true

case "$cmd" in
list)
    [[ $# -eq 1 ]] || usage 1
    group="${1%/}"
    if [[ ! -d "$LIBRARY/$group" ]]; then
        echo "error: no such group: $group" >&2
        echo "hint: groups are Product/Category/Group, e.g. 'Application UI/Overlays/Modal Dialogs'" >&2
        exit 1
    fi
    find "$LIBRARY/$group" -mindepth 1 -maxdepth 1 -type d | sed 's|.*/||' | sort
    ;;

find)
    [[ $# -ge 1 ]] || usage 1
    # Every component directory, as Product/Category/Group/Component.
    matches=$(find "$LIBRARY" -mindepth 4 -maxdepth 4 -type d -name 'v[34]' -prune -o \
        -mindepth 4 -maxdepth 4 -type d -print |
        sed "s|^$LIBRARY/||" | sort)
    for term in "$@"; do
        matches=$(printf '%s\n' "$matches" | grep -i -F -- "$term" || true)
    done
    if [[ -z "$matches" ]]; then
        echo "No components match: $*" >&2
        exit 1
    fi
    printf '%s\n' "$matches"
    ;;

path)
    [[ $# -eq 1 ]] || usage 1
    component="${1%/}"
    file=$(component_file "$component")
    if [[ ! -f "$file" ]]; then
        if [[ -d "$LIBRARY/$component" ]]; then
            echo "error: no v4 React light variant for: $component" >&2
            echo "available files:" >&2
            ls "$LIBRARY/$component"/v4 >&2 2>/dev/null || ls "$LIBRARY/$component" >&2
        else
            echo "error: no such component: $component" >&2
            echo "hint: ./scripts/twp.sh find $(basename "$component")" >&2
        fi
        exit 1
    fi
    echo "$PWD/$file"
    ;;

-h | --help | help)
    usage 0
    ;;

*)
    echo "error: unknown command: $cmd" >&2
    usage 1
    ;;
esac
