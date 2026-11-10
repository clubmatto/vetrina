#!/usr/bin/env bash
# Run one fan-out cell.
#
#   ./run.sh <1|2|4> <label> [max_turns]
#
# Requires Qwen Code 0.27.1 on PATH (or QWEN=/path/to/qwen) and a DeepSeek key
# in DEEPSEEK_API_KEY. Set DRY_RUN=1 to prepare the cell and print the command
# without calling the model.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CHILDREN="${1:?usage: run.sh <1|2|4> <label> [max_turns]}"
LABEL="${2:?usage: run.sh <1|2|4> <label> [max_turns]}"
TURNS="${3:-60}"
QWEN="${QWEN:-qwen}"
DRY_RUN="${DRY_RUN:-0}"

case "$CHILDREN" in
  1|2|4) ;;
  *) echo "children must be 1, 2, or 4" >&2; exit 2 ;;
esac

PROMPT="$HERE/prompts/$CHILDREN.md"
FIXTURE="$HERE/fixtures/rename-fanout"
[ -f "$PROMPT" ] || { echo "missing prompt: $PROMPT" >&2; exit 2; }
[ -d "$FIXTURE" ] || { echo "missing fixture: $FIXTURE (run ./make-fixture.sh)" >&2; exit 2; }

RUNS="$HERE/runs"
RUNDIR="$RUNS/$LABEL"
OUT="$RUNS/$LABEL.jsonl"
SPANS="$RUNS/$LABEL-spans.jsonl"
LOGS="$RUNS/$LABEL-logs"
WALL="$RUNS/$LABEL.wall"
ERR="$RUNS/$LABEL.err"
QHOME="$RUNS/$LABEL-home"

mkdir -p "$RUNS"
rm -rf "$RUNDIR" "$LOGS" "$OUT" "$SPANS" "$WALL" "$ERR" "$QHOME"
cp -R "$FIXTURE" "$RUNDIR"
mkdir -p "$RUNDIR/.qwen" "$QHOME"
cp "$HERE/modes/fanout.json" "$RUNDIR/.qwen/settings.json"

CMD=(
  "$QWEN" -p "$(cat "$PROMPT")"
  --output-format stream-json
  --yolo
  --max-session-turns "$TURNS"
  --max-subagent-depth 1
  --openai-logging --openai-logging-dir "$LOGS"
  --telemetry --telemetry-outfile "$SPANS"
)

if [ "$DRY_RUN" = "1" ]; then
  printf 'prepared %s\n' "$RUNDIR"
  printf 'prompt   %s\n' "$PROMPT"
  printf 'command  cd %q && %q -p "$(cat %q)" ' "$RUNDIR" "$QWEN" "$PROMPT"
  printf '%q ' "${CMD[@]:3}"
  printf '\n'
  exit 0
fi

if [ -f "$HERE/.env.local" ]; then
  set -a
  # shellcheck disable=SC1091
  . "$HERE/.env.local"
  set +a
fi

: "${DEEPSEEK_API_KEY:?set DEEPSEEK_API_KEY before running}"
command -v "$QWEN" >/dev/null || {
  echo "qwen not found: $QWEN (install @qwen-code/qwen-code@0.27.1 or set QWEN)" >&2
  exit 2
}

export QWEN_CODE_SUPPRESS_YOLO_WARNING=1

start="$(python3 -c 'import time; print(time.time())')"
set +e
( cd "$RUNDIR" && HOME="$QHOME" "${CMD[@]}" > "$OUT" 2> "$ERR" )
status=$?
set -e
end="$(python3 -c 'import time; print(time.time())')"

python3 - "$WALL" "$start" "$end" <<'PY'
import sys
open(sys.argv[1], "w").write(f"{float(sys.argv[3]) - float(sys.argv[2]):.3f}\n")
PY

echo "$LABEL: children=$CHILDREN wall=$(cat "$WALL")s status=$status"

if [ "$status" -ne 0 ]; then
  echo "qwen exited $status; see $ERR" >&2
  exit "$status"
fi

python3 "$HERE/extract.py" --no-write --expect "$CHILDREN" "$LABEL"
