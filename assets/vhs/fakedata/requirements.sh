#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

setup() {
  local project_dir="$1"
  shift
  local demos=("$@")

  local schema_sqlite="$project_dir/schema-pro.sql"
  local needs_sqlite=false
  local needs_ch=false

  for demo in "${demos[@]}"; do
    if [[ "$demo" == pro-* && -f "$schema_sqlite" ]] && [[ "$demo" != pro-clickhouse ]]; then
      needs_sqlite=true
    fi
    if [[ "$demo" == pro-clickhouse ]]; then
      needs_ch=true
    fi
  done

  if $needs_sqlite; then
    echo "Setting up SQLite database for pro demos..."
    rm -f "$project_dir/pro.db"
    sqlite3 "$project_dir/pro.db" < "$schema_sqlite"
    echo "  -> $project_dir/pro.db created"
  fi

  if $needs_ch; then
    echo "Setting up local ClickHouse..."
    "$SCRIPT_DIR/clickhouse-local.sh" "$project_dir" start
  fi
}

cleanup() {
  local project_dir="$1"
  shift
  local demos=("$@")

  local needs_sqlite=false
  local needs_ch=false

  for demo in "${demos[@]}"; do
    if [[ "$demo" == pro-* && -f "$project_dir/schema-pro.sql" ]] && [[ "$demo" != pro-clickhouse ]]; then
      needs_sqlite=true
    fi
    if [[ "$demo" == pro-clickhouse ]]; then
      needs_ch=true
    fi
  done

  $needs_sqlite && rm -f "$project_dir/pro.db" && echo "Cleaned up pro.db"
  if $needs_ch; then
    "$SCRIPT_DIR/clickhouse-local.sh" "$project_dir" stop
  fi
}
