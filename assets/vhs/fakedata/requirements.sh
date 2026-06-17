#!/usr/bin/env bash
set -euo pipefail

setup() {
  local project_dir="$1"
  shift
  local demos=("$@")

  local schema_file="$project_dir/schema-pro.sql"
  local needs_db=false

  for demo in "${demos[@]}"; do
    if [[ "$demo" == pro-* && -f "$schema_file" ]]; then
      needs_db=true
      break
    fi
  done

  if $needs_db; then
    echo "Setting up SQLite database for pro demos..."
    rm -f "$project_dir/pro.db"
    sqlite3 "$project_dir/pro.db" < "$schema_file"
    echo "  -> $project_dir/pro.db created"
  fi
}

cleanup() {
  local project_dir="$1"
  shift
  local demos=("$@")

  local needs_db=false
  for demo in "${demos[@]}"; do
    if [[ "$demo" == pro-* && -f "$project_dir/schema-pro.sql" ]]; then
      needs_db=true
      break
    fi
  done

  $needs_db && rm -f "$project_dir/pro.db" && echo "Cleaned up pro.db"
}
