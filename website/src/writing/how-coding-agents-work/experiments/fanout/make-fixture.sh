#!/usr/bin/env bash
# Build four identical copies of the rename fixture, one per sub-agent slice.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SRC="$HERE/../tools/fixtures/rename"
DST="$HERE/fixtures/rename-fanout"

[ -d "$SRC" ] || { echo "missing source fixture: $SRC" >&2; exit 1; }

rm -rf "$DST"
mkdir -p "$DST"
for s in a b c d; do
  cp -R "$SRC" "$DST/svc-$s"
done

echo "wrote $DST (svc-a, svc-b, svc-c, svc-d)"
