#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

exec go run -C "$SCRIPT_DIR/../../tools/vhs-generate" . "$@"
