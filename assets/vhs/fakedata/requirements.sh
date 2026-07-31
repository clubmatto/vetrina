#!/usr/bin/env bash
set -euo pipefail

setup() {
  local project_dir="$1"
  shift
  local demos=("$@")

  local schema_sqlite="$project_dir/schema-pro.sql"
  local needs_sqlite=false

  for demo in "${demos[@]}"; do
    if [[ "$demo" == pro-* && -f "$schema_sqlite" ]]; then
      needs_sqlite=true
    fi
  done

  if $needs_sqlite; then
    echo "Setting up SQLite database for pro demos..."
    rm -f "$project_dir/pro.db"
    sqlite3 "$project_dir/pro.db" < "$schema_sqlite"
    echo "  -> $project_dir/pro.db created"
  fi
}

cleanup() {
  local project_dir="$1"
  shift
  local demos=("$@")

  local needs_sqlite=false

  for demo in "${demos[@]}"; do
    if [[ "$demo" == pro-* && -f "$project_dir/schema-pro.sql" ]]; then
      needs_sqlite=true
    fi
  done

  $needs_sqlite && rm -f "$project_dir/pro.db" && echo "Cleaned up pro.db"
}
