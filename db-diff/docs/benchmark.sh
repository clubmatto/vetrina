#!/usr/bin/env bash
#
# Measures db-diff on one table across two databases, in the three cases that
# matter: the tables match, the differences are clustered, and the differences
# are scattered.
#
# It starts its own engine container, so it needs Docker and nothing else.
# Results as measured on 14 October 2026 are in benchmark.md.
#
#   ./benchmark.sh                        # PostgreSQL, 1M rows
#   ENGINE=mysql ./benchmark.sh           # MySQL, 1M rows
#   ENGINE=clickhouse ./benchmark.sh      # ClickHouse, 1M rows
#   ROWS=100000 ./benchmark.sh            # a quick run
#
set -euo pipefail

ENGINE=${ENGINE:-postgres}
ROWS=${ROWS:-1000000}
PORT=${PORT:-55432}
NAME=${NAME:-dbdiff-bench-${ENGINE}}
SEGMENT_SIZES=${SEGMENT_SIZES:-"10000 100000"}
DRIFT=${DRIFT:-1000}

if [ "$ENGINE" = postgres ]; then
  IMAGE=postgres:16
  PORTMAP="${PORT}:5432"
  CREATE_DB="CREATE DATABASE"
  SCHEMA="CREATE TABLE orders (id BIGINT PRIMARY KEY, customer TEXT NOT NULL, email TEXT NOT NULL,
status TEXT NOT NULL, total_cents INTEGER NOT NULL, placed_at TIMESTAMP NOT NULL);"
  SEED="INSERT INTO orders SELECT g, 'customer-'||g, 'customer'||g||'@example.com', 'paid',
(g*37)%100000, TIMESTAMP '2026-06-01' - (g%365)*interval '1 day'
FROM generate_series(1,${ROWS}) g;"
  admin_sql() { docker exec -i "$NAME" psql -U postgres -q -c "$1" >/dev/null; }
  exec_sql() { docker exec -i "$NAME" psql -U postgres -d "$1" -q -c "$2" >/dev/null; }
  ready() { docker exec "$NAME" pg_isready -U postgres >/dev/null 2>&1; }
  dsn() { echo "postgres://postgres:postgres@127.0.0.1:${PORT}/$1?sslmode=disable"; }
  # COPY is the fastest way to stream every row out of PostgreSQL.
  stream() { docker exec -i "$NAME" psql -U postgres -d "$1" -c "COPY (SELECT * FROM orders) TO STDOUT"; }
  RUN_ARGS=(-e POSTGRES_PASSWORD=postgres)
elif [ "$ENGINE" = mysql ]; then
  IMAGE=mysql:8.4
  PORTMAP="${PORT}:3306"
  CREATE_DB="CREATE DATABASE IF NOT EXISTS"
  SCHEMA="CREATE TABLE orders (id BIGINT PRIMARY KEY, customer VARCHAR(64) NOT NULL,
email VARCHAR(128) NOT NULL, status VARCHAR(16) NOT NULL, total_cents INT NOT NULL,
placed_at DATETIME NOT NULL);"
  SEED="SET SESSION cte_max_recursion_depth = $((ROWS + 10));
INSERT INTO orders (id, customer, email, status, total_cents, placed_at)
WITH RECURSIVE seq(n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM seq WHERE n < ${ROWS})
SELECT n, CONCAT('customer-', n), CONCAT('customer', n, '@example.com'), 'paid',
(n * 37) % 100000, TIMESTAMPADD(DAY, -(n % 365), CAST('2026-06-01 00:00:00' AS DATETIME)) FROM seq;"
  admin_sql() { docker exec -i -e MYSQL_PWD=root "$NAME" mysql -uroot -e "$1" >/dev/null 2>&1; }
  # The password warning is left on stderr: a failed seed has to be loud rather
  # than a benchmark that quietly measured an empty table.
  exec_sql() { docker exec -i -e MYSQL_PWD=root "$NAME" mysql -uroot -D "$1" -e "$2" >/dev/null; }
  ready() { docker exec -e MYSQL_PWD=root "$NAME" mysqladmin ping -uroot >/dev/null 2>&1; }
  dsn() { echo "root:root@tcp(127.0.0.1:${PORT})/$1"; }
  stream() { docker exec -i -e MYSQL_PWD=root "$NAME" mysql -uroot -D "$1" -e "SELECT * FROM orders"; }
  RUN_ARGS=(-e MYSQL_ROOT_PASSWORD=root)
elif [ "$ENGINE" = clickhouse ]; then
  IMAGE=clickhouse/clickhouse-server:24.8
  PORTMAP="${PORT}:9000"
  CREATE_DB="CREATE DATABASE IF NOT EXISTS"
  SCHEMA="CREATE TABLE orders (id Int64, customer String, email String, status String,
total_cents Int32, placed_at DateTime) ENGINE = MergeTree ORDER BY id"
  SEED="INSERT INTO orders SELECT number + 1, concat('customer-', toString(number + 1)),
concat('customer', toString(number + 1), '@example.com'), 'paid',
toInt32((number + 1) * 37 % 100000),
toDateTime('2026-06-01 00:00:00') - toIntervalDay((number + 1) % 365) FROM numbers(${ROWS})"
  admin_sql() { ch "default" "$1"; }
  exec_sql() { ch "$1" "$2"; }
  ready() { ch default "SELECT 1" >/dev/null 2>&1; }
  dsn() { echo "clickhouse://default:default@127.0.0.1:${PORT}/$1"; }
  stream() { docker exec -i "$NAME" clickhouse-client --user default --password default \
    --database "$1" --query "SELECT * FROM orders"; }
  # Mutations are asynchronous, so every update has to ask for itself to be
  # finished before the timing starts, or the benchmark measures nothing.
  ch() {
    docker exec -i "$NAME" clickhouse-client --user default --password default \
      --database "$1" --multiquery --query "SET mutations_sync = 1; $2" >/dev/null
  }
  RUN_ARGS=(-e CLICKHOUSE_USER=default -e CLICKHOUSE_PASSWORD=default -e CLICKHOUSE_DEFAULT_ACCESS_MANAGEMENT=1)
else
  echo "ENGINE must be postgres, mysql or clickhouse, got '$ENGINE'" >&2
  exit 1
fi

if ! command -v db-diff >/dev/null; then
  echo "db-diff is not on PATH. go install matto.club/vetrina/db-diff@latest" >&2
  exit 1
fi

echo "starting ${NAME} (${IMAGE}) on port ${PORT}"
docker rm -f "$NAME" >/dev/null 2>&1 || true
docker run -d --name "$NAME" "${RUN_ARGS[@]}" -p "$PORTMAP" "$IMAGE" >/dev/null

for _ in $(seq 1 90); do ready && break; sleep 2; done
ready || { echo "engine did not come up" >&2; exit 1; }

echo "seeding ${ROWS} rows into src, dst and dst2"
seed_all() {
  for d in src dst dst2; do
    admin_sql "$CREATE_DB $d" || true
    if [ "$ENGINE" != postgres ]; then exec_sql "$d" "DROP TABLE IF EXISTS orders"; fi
    exec_sql "$d" "$SCHEMA" || return 1
    exec_sql "$d" "$SEED" || return 1
  done
}
# MySQL's entrypoint starts a bootstrap server and then restarts into the real
# one, so a connection that answers is not yet the server that keeps the data.
for attempt in 1 2 3 4 5; do
  seed_all && break
  echo "  seeding attempt ${attempt} failed, retrying" >&2
  sleep 5
done

count_rows() {
  if [ "$ENGINE" = postgres ]; then
    docker exec -i "$NAME" psql -U postgres -d "$1" -tAc "SELECT count(*) FROM orders"
  elif [ "$ENGINE" = mysql ]; then
    docker exec -i -e MYSQL_PWD=root "$NAME" mysql -uroot -D "$1" -N -B -e "SELECT count(*) FROM orders" 2>/dev/null
  else
    docker exec -i "$NAME" clickhouse-client --user default --password default \
      --database "$1" --query "SELECT count(*) FROM orders"
  fi
}
for d in src dst dst2; do
  got=$(count_rows "$d")
  [ "$got" = "$ROWS" ] || { echo "$d holds '$got' rows, expected ${ROWS}" >&2; exit 1; }
done
echo "  verified ${ROWS} rows on all three databases"

# dst: every DRIFT-th row differs, so every segment contains a difference.
# dst2: one contiguous block differs, so only the segments it spans are read.
# ClickHouse spells an update as a mutation rather than as an UPDATE statement.
if [ "$ENGINE" = clickhouse ]; then
  UPDATE_STMT="ALTER TABLE orders UPDATE"
else
  UPDATE_STMT="UPDATE orders SET"
fi
exec_sql dst "${UPDATE_STMT} total_cents = total_cents + 1 WHERE id % ${DRIFT} = 0"
exec_sql dst2 "${UPDATE_STMT} total_cents = total_cents + 1 WHERE id BETWEEN $((ROWS / 2 + 1)) AND $((ROWS / 2 + DRIFT))"

timeit() {
  local label=$1 src=$2 target=$3 size=$4 start end code
  start=$(python3 -c 'import time;print(time.time())')
  set +e
  db-diff --source "$(dsn "$src")" --target "$(dsn "$target")" --table orders \
    --segment-size "$size" >/dev/null 2>&1
  code=$?
  set -e
  end=$(python3 -c 'import time;print(time.time())')
  python3 -c "print(f'  {\"$label\":<16} {$end-$start:6.2f}s  exit=$code')"
}

echo
echo "db-diff $(db-diff --version | awk '{print $2}'), ${ROWS} rows, ${IMAGE}, localhost"
for size in $SEGMENT_SIZES; do
  echo "segment-size ${size}"
  timeit "identical" src src "$size"
  timeit "clustered drift" src dst2 "$size"
  timeit "scattered drift" src dst "$size"
done

echo
echo "baseline: stream every row from one side, no hashing"
for d in src dst; do
  start=$(python3 -c 'import time;print(time.time())')
  stream "$d" >/dev/null
  end=$(python3 -c 'import time;print(time.time())')
  python3 -c "print(f'  stream $d: {$end-$start:6.2f}s')"
done

echo
echo "leave the container up for the next run, or: docker rm -f $NAME"
