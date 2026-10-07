#!/usr/bin/env bash
set -euo pipefail

# A diff needs two databases, so every engine gets one container holding two:
# src holds the original rows, dst holds the drifted copy. Container names and
# host ports are fixed so the tapes can source env.sh instead of parsing docker
# output.
#
# Data lives in the container for the whole generation run. The demos only read,
# so seeding once is enough, and cleanup removes everything at the end.

DEMO_DIR="/tmp/db-diff-demo"
DB_DIFF_SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../db-diff" && pwd)"

PG_CONTAINER="db-diff-demo-postgres"
MYSQL_CONTAINER="db-diff-demo-mysql"
CH_CONTAINER="db-diff-demo-clickhouse"

PG_PORT=15432
MYSQL_PORT=13306
CH_PORT=19000

setup() {
  local project_dir="$1"
  shift

  build_binary
  seed_postgres "$project_dir"
  seed_mysql "$project_dir"
  seed_clickhouse "$project_dir"
  write_env

  echo "  -> demo environment ready at $DEMO_DIR/env.sh"
}

build_binary() {
  echo "Building db-diff..."
  mkdir -p "$DEMO_DIR/bin"
  (cd "$DB_DIFF_SRC_DIR" && go build -o "$DEMO_DIR/bin/db-diff" .)
  echo "  -> $DEMO_DIR/bin/db-diff"
}

# wait_for polls until a command succeeds, so a slow container start does not
# turn into a confusing failure halfway through seeding.
wait_for() {
  local description="$1"
  shift
  local attempt
  for attempt in $(seq 60); do
    if "$@" >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done
  echo "timed out waiting for $description" >&2
  return 1
}

# The drift is the same on every engine: one row changes, one disappears, one
# exists only on the drifted side.
drift_postgres() {
  docker exec -i "$PG_CONTAINER" psql -q -U postgres -d dst -v ON_ERROR_STOP=1 <<'SQL'
UPDATE bookmark SET title = 'Changed' WHERE id = 2;
DELETE FROM bookmark WHERE id = 3;
INSERT INTO bookmark (id, url, title, unread, note)
  VALUES (4, 'https://example.com/4', 'Example 4', true, NULL);
SQL
}

drift_mysql() {
  docker exec -i "$MYSQL_CONTAINER" mysql -uroot -psecret dst <<'SQL'
UPDATE bookmark SET title = 'Changed' WHERE id = 2;
DELETE FROM bookmark WHERE id = 3;
INSERT INTO bookmark (id, url, title, unread, note)
  VALUES (4, 'https://example.com/4', 'Example 4', true, NULL);
SQL
}

# ClickHouse applies updates and deletes as mutations, so mutations_sync makes
# each one land before the next statement runs.
drift_clickhouse() {
  docker exec -i "$CH_CONTAINER" clickhouse-client --password secret --database dst --multiquery <<'SQL'
ALTER TABLE bookmark UPDATE title = 'Changed' WHERE id = 2 SETTINGS mutations_sync = 2;
ALTER TABLE bookmark DELETE WHERE id = 3 SETTINGS mutations_sync = 2;
INSERT INTO bookmark (id, url, title, unread, note)
  VALUES (4, 'https://example.com/4', 'Example 4', true, NULL);
SQL
}

seed_postgres() {
  local project_dir="$1"

  echo "Starting Postgres..."
  docker rm -f "$PG_CONTAINER" >/dev/null 2>&1 || true
  docker run -d --name "$PG_CONTAINER" \
    -e POSTGRES_PASSWORD=secret \
    -e POSTGRES_USER=postgres \
    -p "$PG_PORT:5432" \
    postgres:17-alpine >/dev/null

  wait_for "Postgres" docker exec "$PG_CONTAINER" pg_isready -U postgres

  local database
  for database in src dst; do
    docker exec "$PG_CONTAINER" createdb -U postgres "$database"
    docker exec -i "$PG_CONTAINER" psql -q -U postgres -d "$database" -v ON_ERROR_STOP=1 \
      < "$project_dir/seed-postgres.sql"
  done

  drift_postgres
  echo "  -> Postgres ready on port $PG_PORT"
}

seed_mysql() {
  local project_dir="$1"

  echo "Starting MySQL..."
  docker rm -f "$MYSQL_CONTAINER" >/dev/null 2>&1 || true
  docker run -d --name "$MYSQL_CONTAINER" \
    -e MYSQL_ROOT_PASSWORD=secret \
    -p "$MYSQL_PORT:3306" \
    mysql:8 >/dev/null

  # mysqladmin ping answers as soon as the temporary init server is up, before
  # the root password exists, so poll an authenticated query instead.
  wait_for "MySQL" docker exec "$MYSQL_CONTAINER" mysql -uroot -psecret -e "SELECT 1"

  docker exec "$MYSQL_CONTAINER" mysql -uroot -psecret \
    -e "CREATE DATABASE src; CREATE DATABASE dst;"

  local database
  for database in src dst; do
    docker exec -i "$MYSQL_CONTAINER" mysql -uroot -psecret "$database" \
      < "$project_dir/seed-mysql.sql"
  done

  drift_mysql
  echo "  -> MySQL ready on port $MYSQL_PORT"
}

seed_clickhouse() {
  local project_dir="$1"

  echo "Starting ClickHouse..."
  docker rm -f "$CH_CONTAINER" >/dev/null 2>&1 || true
  docker run -d --name "$CH_CONTAINER" \
    -e CLICKHOUSE_USER=default \
    -e CLICKHOUSE_PASSWORD=secret \
    -e CLICKHOUSE_DEFAULT_ACCESS_MANAGEMENT=1 \
    -p "$CH_PORT:9000" \
    clickhouse/clickhouse-server:24.8 >/dev/null

  wait_for "ClickHouse" docker exec "$CH_CONTAINER" \
    clickhouse-client --password secret --query "SELECT 1"

  docker exec "$CH_CONTAINER" clickhouse-client --password secret \
    --query "CREATE DATABASE IF NOT EXISTS src; CREATE DATABASE IF NOT EXISTS dst"

  local database
  for database in src dst; do
    docker exec -i "$CH_CONTAINER" clickhouse-client --password secret \
      --database "$database" --multiquery \
      < "$project_dir/seed-clickhouse.sql"
  done

  drift_clickhouse
  echo "  -> ClickHouse ready on port $CH_PORT"
}

write_env() {
  cat > "$DEMO_DIR/env.sh" <<EOF
export PG_SRC="postgres://postgres:secret@127.0.0.1:$PG_PORT/src?sslmode=disable"
export PG_DST="postgres://postgres:secret@127.0.0.1:$PG_PORT/dst?sslmode=disable"
export MYSQL_SRC="root:secret@tcp(127.0.0.1:$MYSQL_PORT)/src?parseTime=true"
export MYSQL_DST="root:secret@tcp(127.0.0.1:$MYSQL_PORT)/dst?parseTime=true"
export CH_SRC="clickhouse://default:secret@127.0.0.1:$CH_PORT/src"
export CH_DST="clickhouse://default:secret@127.0.0.1:$CH_PORT/dst"
EOF
}

cleanup() {
  echo "Removing demo containers..."
  docker rm -f "$PG_CONTAINER" "$MYSQL_CONTAINER" "$CH_CONTAINER" >/dev/null 2>&1 || true
  rm -rf "$DEMO_DIR"
}
