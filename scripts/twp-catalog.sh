#!/usr/bin/env bash
#
# Keep the component catalog in .agents/skills/tailwind-plus/SKILL.md in sync with the
# downloaded library, so the skill cannot claim components that are not on disk.
#
#   twp-catalog.sh           rewrite the catalog section in SKILL.md in place
#   twp-catalog.sh --check   exit 1 if SKILL.md is stale (does not modify it)
#   twp-catalog.sh --print   write the generated catalog to stdout
#
# The section is delimited in SKILL.md by the BEGIN/END marker comments below.
#
set -euo pipefail

cd "$(dirname "$0")/.."

LIBRARY="tailwindplus"
SKILL=".agents/skills/tailwind-plus/SKILL.md"
BEGIN="<!-- BEGIN GENERATED CATALOG -->"
END="<!-- END GENERATED CATALOG -->"

if [[ ! -d "$LIBRARY" ]]; then
    echo "error: $LIBRARY not found. Run ./scripts/twp-download.sh first." >&2
    exit 1
fi

python3 - "$LIBRARY" "$SKILL" "$BEGIN" "$END" "${1:---write}" <<'PY'
import collections, pathlib, sys

library, skill_path, begin, end, mode = (
    pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2]), sys.argv[3], sys.argv[4], sys.argv[5]
)

groups = collections.defaultdict(collections.Counter)
for v4 in library.glob("*/*/*/*/v4"):
    product, category, group = v4.parent.parts[1:4]
    groups[(product, category)][group] += 1

if not groups:
    sys.exit(f"error: no components found under {library}/")

lines, current = [], None
for (product, category), members in sorted(groups.items()):
    if product != current:
        lines.append(f"\n### {product}")
        current = product
    listed = ", ".join(f"{name} ({n})" for name, n in sorted(members.items()))
    lines.append(f"- **{category}** — {listed}")
catalog = "\n".join(lines).strip()

if mode == "--print":
    print(catalog)
    sys.exit(0)

text = skill_path.read_text()
try:
    head, rest = text.split(begin, 1)
    _, tail = rest.split(end, 1)
except ValueError:
    sys.exit(f"error: markers {begin} / {end} not found in {skill_path}")

updated = f"{head}{begin}\n\n{catalog}\n\n{end}{tail}"

if mode == "--check":
    if updated != text:
        sys.exit(
            f"error: catalog in {skill_path} is stale.\n"
            "  Regenerate with: ./scripts/twp-catalog.sh"
        )
    print(f"Catalog in {skill_path} matches the downloaded library.")
elif mode == "--write":
    if updated == text:
        print(f"Catalog in {skill_path} already up to date.")
    else:
        skill_path.write_text(updated)
        print(f"Rewrote catalog in {skill_path}.")
else:
    sys.exit(f"usage: {sys.argv[0]} [--write|--check|--print]")
PY
