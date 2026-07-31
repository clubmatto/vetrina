#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CH_TCP_PORT="${CLICKHOUSE_TCP_PORT:-9000}"
CH_HTTP_PORT="${CLICKHOUSE_HTTP_PORT:-8123}"

project_dir="${1:?usage: clickhouse-local.sh <project_dir> <start|stop>}"
cmd="${2:-start}"

CH_DIR="$project_dir/.clickhouse"

is_running() {
  clickhouse client --port "$CH_TCP_PORT" --query "SELECT 1" >/dev/null 2>&1
}

apply_schema() {
  if [ ! -f "$SCRIPT_DIR/schema-clickhouse.sql" ]; then
    return 0
  fi

  echo "  -> Creating schema..."
  clickhouse client --port "$CH_TCP_PORT" --multiquery --query "$(cat "$SCRIPT_DIR/schema-clickhouse.sql")"
  echo "  -> Schema created"
}

start() {
  if is_running; then
    echo "  -> ClickHouse already running on port $CH_TCP_PORT"
    apply_schema

    return 0
  fi

  if ! command -v clickhouse >/dev/null 2>&1; then
    echo "  -> clickhouse not found. Install with: brew install clickhouse" >&2
    exit 1
  fi

  mkdir -p "$CH_DIR/data"

  cat > "$CH_DIR/config.xml" <<EOF
<clickhouse>
    <logger>
        <level>warning</level>
        <console>1</console>
    </logger>
    <http_port>$CH_HTTP_PORT</http_port>
    <tcp_port>$CH_TCP_PORT</tcp_port>
    <listen_host>127.0.0.1</listen_host>
    <path>$CH_DIR/data/</path>
    <tmp_path>$CH_DIR/data/tmp/</tmp_path>
    <user_directories>
        <users_xml>
            <path>$CH_DIR/users.xml</path>
        </users_xml>
    </user_directories>
</clickhouse>
EOF

  cat > "$CH_DIR/users.xml" <<'EOF'
<clickhouse>
    <profiles><default><max_memory_usage>10000000000</max_memory_usage></default></profiles>
    <users>
        <default>
            <password></password>
            <networks><ip>127.0.0.1</ip></networks>
            <profile>default</profile>
            <quota>default</quota>
        </default>
    </users>
    <quotas>
        <default><interval><duration>3600</duration><queries>0</queries><errors>0</errors><result_rows>0</result_rows><read_rows>0</read_rows><execution_time>0</execution_time></interval></default>
    </quotas>
</clickhouse>
EOF

  echo "  -> Starting ClickHouse (data dir: $CH_DIR)..."
  clickhouse server --config-file="$CH_DIR/config.xml" > "$CH_DIR/server.log" 2>&1 &
  echo $! > "$CH_DIR/clickhouse.pid"

  for i in $(seq 1 30); do
    if is_running; then
      break
    fi
    sleep 1
  done

  if ! is_running; then
    echo "  -> ClickHouse failed to start; see $CH_DIR/server.log" >&2
    exit 1
  fi

  echo "  -> ClickHouse ready on port $CH_TCP_PORT"
  apply_schema
}

stop() {
  if [ ! -f "$CH_DIR/clickhouse.pid" ]; then
    return 0
  fi

  pid="$(cat "$CH_DIR/clickhouse.pid")"
  if kill "$pid" 2>/dev/null; then
    echo "  -> Stopped ClickHouse"
  fi
  rm -f "$CH_DIR/clickhouse.pid"
  rm -rf "$CH_DIR/data"
}

case "$cmd" in
  start) start ;;
  stop) stop ;;
  *) echo "unknown command: $cmd" >&2; exit 1 ;;
esac
