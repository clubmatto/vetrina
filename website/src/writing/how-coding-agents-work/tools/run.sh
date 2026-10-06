#!/usr/bin/env bash
# Run one cell of the tools experiment.
#
#   run.sh <rename|references> <one-tool|all-declared|on-demand> <label> "<prompt>" [max_turns] [extra qwen flags...]
#
# Requires the Qwen Code CLI on PATH (`npm install @qwen-code/qwen-code`) and a
# DeepSeek API key in DEEPSEEK_API_KEY. Nothing is written outside runs/.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
: "${DEEPSEEK_API_KEY:?set DEEPSEEK_API_KEY before running}"
QWEN="${QWEN:-qwen}"

fixture="$1"; mode="$2"; label="$3"; prompt="$4"; turns="${5:-40}"
shift 5 || true

rundir="$HERE/runs/$label"
out="$HERE/runs/$label.jsonl"

export QWEN_CODE_SUPPRESS_YOLO_WARNING=1

rm -rf "$rundir" "$HERE/runs/$label-logs"
cp -R "$HERE/fixtures/$fixture" "$rundir"
mkdir -p "$rundir/.qwen"
cp "$HERE/modes/$mode.json" "$rundir/.qwen/settings.json"

start=$(date +%s)
( cd "$rundir" && "$QWEN" -p "$prompt" --output-format stream-json --yolo \
    --max-session-turns "$turns" \
    --openai-logging --openai-logging-dir "$HERE/runs/$label-logs" \
    "$@" > "$out" 2> "$HERE/runs/$label.err" ) || true
end=$(date +%s)

echo "$label: fixture=$fixture mode=$mode wall=$((end-start))s events=$(wc -l < "$out" | tr -d ' ')"
