#!/usr/bin/env bash
# Run the 1, 2, 4 conditions. REPS=3 runs three repetitions per condition.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPS="${REPS:-1}"

case "$REPS" in
  ''|*[!0-9]*) echo "REPS must be a positive integer" >&2; exit 2 ;;
esac
[ "$REPS" -ge 1 ] || { echo "REPS must be a positive integer" >&2; exit 2; }

labels=()
for children in 1 2 4; do
  for rep in $(seq 1 "$REPS"); do
    label="fanout-$children-r$rep"
    "$HERE/run.sh" "$children" "$label"
    labels+=("$label")
  done
done

python3 "$HERE/extract.py" "${labels[@]}"
