#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TAPE_DIR="$SCRIPT_DIR/fakedata"

# Demo names (without .tape extension)
DEMOS=(
  basic
  templates
  streaming
  formats
  use-case-testing
  use-case-load-testing
  use-case-development
  pro-generate
  pro-dry-run
  pro-override
)

# Theme configs
declare -A THEMES=(
  [dark]="config.tape"
  [light]="config-light.tape"
)

usage() {
  cat <<EOF
Usage: $(basename "$0") [OPTIONS] [DEMO...]

Generate GIF demos using VHS.

Options:
  -t, --theme THEME    Generate only for theme: dark, light, or all (default: all)
  -l, --list           List available demos
  -h, --help           Show this help

Examples:
  $(basename "$0")                    # Generate all demos, both themes
  $(basename "$0") basic templates    # Generate only basic and templates
  $(basename "$0") -t light           # Generate all demos, light theme only
EOF
  exit 0
}

list_demos() {
  echo "Available demos:"
  for demo in "${DEMOS[@]}"; do
    echo "  - $demo"
  done
  exit 0
}

generate() {
  local demo="$1"
  local theme="$2"
  local config_file="${THEMES[$theme]}"
  local output_file="${demo}-${theme}.gif"
  local tape_file="$TAPE_DIR/${demo}.tape"

  if [[ ! -f "$tape_file" ]]; then
    echo "Error: Tape file not found: $tape_file"
    return 1
  fi

  echo "Generating $output_file..."

  # Generate GIF using process substitution
  (cd "$TAPE_DIR" && vhs <(echo "Output $output_file"; cat "$config_file"; echo ""; cat "$tape_file"))

  echo "  -> $TAPE_DIR/$output_file"
}

# Parse arguments
THEME="all"
SELECTED_DEMOS=()

while [[ $# -gt 0 ]]; do
  case $1 in
    -t|--theme)
      THEME="$2"
      shift 2
      ;;
    -l|--list)
      list_demos
      ;;
    -h|--help)
      usage
      ;;
    -*)
      echo "Unknown option: $1"
      usage
      ;;
    *)
      SELECTED_DEMOS+=("$1")
      shift
      ;;
  esac
done

# Default to all demos if none selected
if [[ ${#SELECTED_DEMOS[@]} -eq 0 ]]; then
  SELECTED_DEMOS=("${DEMOS[@]}")
fi

# Validate theme
if [[ "$THEME" != "all" && "$THEME" != "dark" && "$THEME" != "light" ]]; then
  echo "Error: Invalid theme '$THEME'. Must be: dark, light, or all"
  exit 1
fi

# Check if any pro demos are selected and set up the database
PRO_DEMOS=("pro-generate" "pro-dry-run" "pro-override")
needs_db=false
for demo in "${SELECTED_DEMOS[@]}"; do
  for pd in "${PRO_DEMOS[@]}"; do
    [[ "$demo" == "$pd" ]] && needs_db=true && break
  done
done

if $needs_db; then
  echo "Setting up SQLite database for pro demos..."
  schema="$TAPE_DIR/schema-pro.sql"
  if [[ ! -f "$schema" ]]; then
    echo "Error: Schema file not found: $schema"
    exit 1
  fi
  rm -f "$TAPE_DIR/pro.db"
  sqlite3 "$TAPE_DIR/pro.db" < "$schema"
  echo "  -> $TAPE_DIR/pro.db created"
fi

# Generate GIFs
for demo in "${SELECTED_DEMOS[@]}"; do
  if [[ "$THEME" == "all" ]]; then
    generate "$demo" "dark"
    generate "$demo" "light"
  else
    generate "$demo" "$THEME"
  fi
done

# Cleanup
$needs_db && rm -f "$TAPE_DIR/pro.db" && echo "Cleaned up pro.db"

echo ""
echo "Done! GIFs generated in $TAPE_DIR/"
