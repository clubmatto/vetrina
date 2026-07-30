#!/usr/bin/env bash
set -euo pipefail

CH_CTR=fakedata-clickhouse

setup() {
  local project_dir="$1"
  shift
  local demos=("$@")

  local schema_sqlite="$project_dir/schema-pro.sql"
  local schema_ch="$project_dir/schema-clickhouse.sql"
  local needs_sqlite=false
  local needs_ch=false

  for demo in "${demos[@]}"; do
    if [[ "$demo" == pro-* && -f "$schema_sqlite" ]] && [[ "$demo" != pro-clickhouse ]]; then
      needs_sqlite=true
    fi
    if [[ "$demo" == pro-clickhouse && -f "$schema_ch" ]]; then
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
    echo "Starting ClickHouse container..."
    docker rm -f "$CH_CTR" 2>/dev/null || true
    docker run -d --name "$CH_CTR" \
      -p 19000:9000 \
      clickhouse/clickhouse-server:24.8
    echo "  -> Waiting for ClickHouse to be ready..."
    for i in $(seq 1 30); do
      if docker exec "$CH_CTR" clickhouse-client --query "SELECT 1" 2>/dev/null; then
        break
      fi
      sleep 1
    done
    echo "  -> ClickHouse ready, creating schema..."
    docker exec -i "$CH_CTR" clickhouse-client --query "$(cat "$schema_ch")"
    echo "  -> Schema created"
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
    if [[ "$demo" == pro-clickhouse && -f "$project_dir/schema-clickhouse.sql" ]]; then
      needs_ch=true
    fi
  done

  $needs_sqlite && rm -f "$project_dir/pro.db" && echo "Cleaned up pro.db"
  if $needs_ch; then
    docker rm -f "$CH_CTR" 2>/dev/null && echo "Cleaned up ClickHouse container" || true
  fi
}
