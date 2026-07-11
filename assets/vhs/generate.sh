#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

THEMES=(
  dark
  light
)

usage() {
  cat <<EOF
Usage: $(basename "$0") [OPTIONS] <PROJECT> [DEMO...]

Generate demo tapes using VHS.

Arguments:
  PROJECT     Project directory (e.g., fakedata)

Options:
  -t, --theme THEME    Generate only for theme: dark, light, or all (default: all)
  -l, --list           List available projects
  -h, --help           Show this help

Examples:
  $(basename "$0") fakedata               # Generate all fakedata demos, both themes
  $(basename "$0") -t light fakedata      # Light theme only
  $(basename "$0") fakedata basic         # Generate specific demos
EOF
  exit 0
}

list_projects() {
  echo "Available projects:"
  for dir in "$SCRIPT_DIR"/*/; do
    project="$(basename "$dir")"
    tapes=()
    for tape in "$dir"/*.tape; do
      name="$(basename "$tape" .tape)"
      [[ "$name" != config* ]] && tapes+=("$name")
    done
    if [[ ${#tapes[@]} -gt 0 ]]; then
      echo "  - $project"
    fi
  done
  exit 0
}

generate() {
  local demo="$1"
  local theme="$2"
  local output_file="${demo}-${theme}.mp4"
  local config_file="$SCRIPT_DIR/config.tape"
  local theme_file="$SCRIPT_DIR/config-${theme}.tape"

  if [[ ! -f "$theme_file" ]]; then
    echo "  Skipping $theme (no config found)"
    return
  fi

  local tape_file="$PROJECT_DIR/${demo}.tape"
  if [[ ! -f "$tape_file" ]]; then
    echo "Error: Tape file not found: $tape_file"
    return 1
  fi

  if [[ "$(type -t before_each)" == "function" ]]; then
    before_each "$PROJECT_DIR" "$demo" "$theme"
  fi

  echo "Generating $output_file..."
  (cd "$PROJECT_DIR" && vhs <(echo "Output $output_file"; cat "$config_file"; echo ""; cat "$theme_file"; echo ""; cat "$tape_file"))
  echo "  -> $PROJECT_DIR/$output_file"

  if [[ "$(type -t after_each)" == "function" ]]; then
    after_each "$PROJECT_DIR" "$demo" "$theme"
  fi

  # Generate GIF for demos listed in gifs.txt (both themes)
  local is_gif=0
  for gif_demo in "${GIF_DEMOS[@]}"; do
    [[ "$gif_demo" == "$demo" ]] && is_gif=1 && break
  done
  if [[ "$is_gif" -eq 1 ]]; then
    if [[ "$(type -t before_each)" == "function" ]]; then
      before_each "$PROJECT_DIR" "$demo" "$theme"
    fi

    local gif_file="${demo}-${theme}.gif"
    echo "Generating $gif_file..."
    (cd "$PROJECT_DIR" && vhs <(echo "Output $gif_file"; cat "$config_file"; echo ""; cat "$theme_file"; echo ""; cat "$tape_file"))
    echo "  -> $PROJECT_DIR/$gif_file"

    if [[ "$(type -t after_each)" == "function" ]]; then
      after_each "$PROJECT_DIR" "$demo" "$theme"
    fi
  fi
}

# Parse arguments
THEME="all"
PROJECT=""
SELECTED_DEMOS=()

while [[ $# -gt 0 ]]; do
  case $1 in
    -t|--theme)
      THEME="$2"
      shift 2
      ;;
    -l|--list)
      list_projects
      ;;
    -h|--help)
      usage
      ;;
    -*)
      echo "Unknown option: $1"
      usage
      ;;
    *)
      if [[ -z "$PROJECT" ]]; then
        PROJECT="$1"
      else
        SELECTED_DEMOS+=("$1")
      fi
      shift
      ;;
  esac
done

if [[ -z "$PROJECT" ]]; then
  echo "Error: No project specified."
  echo ""
  list_projects
fi

PROJECT_DIR="$SCRIPT_DIR/$PROJECT"
if [[ ! -d "$PROJECT_DIR" ]]; then
  echo "Error: Project directory not found: $PROJECT_DIR"
  exit 1
fi

# Load GIF demos manifest (one demo name per line, # comments ignored)
GIF_DEMOS=()
if [[ -f "$PROJECT_DIR/gifs.txt" ]]; then
  while IFS= read -r line; do
    line="${line%%#*}"  # strip comments
    line="${line//[[:space:]]/}"  # strip whitespace
    [[ -n "$line" ]] && GIF_DEMOS+=("$line")
  done < "$PROJECT_DIR/gifs.txt"
fi

# Discover demos from tape files (excluding config*.tape)
ALL_DEMOS=()
for tape in "$PROJECT_DIR"/*.tape; do
  name="$(basename "$tape" .tape)"
  [[ "$name" != config* ]] && ALL_DEMOS+=("$name")
done

if [[ ${#SELECTED_DEMOS[@]} -eq 0 ]]; then
  SELECTED_DEMOS=("${ALL_DEMOS[@]}")
fi

# Validate theme
if [[ "$THEME" != "all" && "$THEME" != "dark" && "$THEME" != "light" ]]; then
  echo "Error: Invalid theme '$THEME'. Must be: dark, light, or all"
  exit 1
fi

# Source project requirements if present
if [[ -f "$PROJECT_DIR/requirements.sh" ]]; then
  source "$PROJECT_DIR/requirements.sh"
  setup "$PROJECT_DIR" "${SELECTED_DEMOS[@]}"
fi

# Determine themes to generate
if [[ "$THEME" == "all" ]]; then
  SELECTED_THEMES=("${THEMES[@]}")
else
  SELECTED_THEMES=("$THEME")
fi

# Generate tapes
for demo in "${SELECTED_DEMOS[@]}"; do
  for theme in "${SELECTED_THEMES[@]}"; do
    generate "$demo" "$theme"
  done
done

# Cleanup
if [[ -f "$PROJECT_DIR/requirements.sh" ]]; then
  cleanup "$PROJECT_DIR" "${SELECTED_DEMOS[@]}"
fi

echo ""
echo "Done! Tapes generated in $PROJECT_DIR/"
