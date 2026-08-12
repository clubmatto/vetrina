#!/usr/bin/env bash
set -euo pipefail

setup() {
  local project_dir="$1"
  shift
  local demos=("$@")

  local schema_sqlite="$project_dir/schema-pro.sql"
  local schema_postgres="$project_dir/schema-pro-postgres.sql"
  local needs_sqlite=false
  local needs_postgres=false

  for demo in "${demos[@]}"; do
    if [[ "$demo" == pro-* && -f "$schema_sqlite" ]]; then
      needs_sqlite=true
    fi
    if [[ "$demo" == "pro-postgres" && -f "$schema_postgres" ]]; then
      needs_postgres=true
    fi
  done

  if $needs_sqlite; then
    echo "Setting up SQLite database for pro demos..."
    rm -f "$project_dir/pro.db"
    sqlite3 "$project_dir/pro.db" < "$schema_sqlite"
    echo "  -> $project_dir/pro.db created"
  fi

  if $needs_postgres; then
    echo "Setting up Postgres database for pro-postgres demo..."
    reset_pro_demo "$project_dir"
    echo "  -> pro_demo created"
  fi
}

reset_pro_demo() {
  local project_dir="$1"
  dropdb --if-exists pro_demo
  createdb pro_demo
  psql -d pro_demo -q -f "$project_dir/schema-pro-postgres.sql"
}

before_each() {
  local project_dir="$1"
  local demo="$2"
  if [[ "$demo" == "pro-postgres" ]]; then
    reset_pro_demo "$project_dir"
  fi
}

after_each() {
  local project_dir="$1"
  local demo="$2"
  local theme="$3"
  if [[ "$demo" == "pro-postgres" ]]; then
    local raw="$project_dir/pro-postgres-$theme.mp4"
    local tmp="${raw}.tmp"
    echo "  -> fast-forwarding $raw"
    bash "$project_dir/postprocess-speedup.sh" "$raw" "$tmp" "${TMPDIR:-/tmp}/pro-postgres-speedup-$theme"
    mv "$tmp" "$raw"
  fi
}

cleanup() {
  local project_dir="$1"
  shift
  local demos=("$@")

  local needs_sqlite=false
  local needs_postgres=false

  for demo in "${demos[@]}"; do
    if [[ "$demo" == pro-* && -f "$project_dir/schema-pro.sql" ]]; then
      needs_sqlite=true
    fi
    if [[ "$demo" == "pro-postgres" ]]; then
      needs_postgres=true
    fi
  done

  $needs_sqlite && rm -f "$project_dir/pro.db" && echo "Cleaned up pro.db"
  $needs_postgres && dropdb --if-exists pro_demo && echo "Cleaned up pro_demo"
}
