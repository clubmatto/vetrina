#!/usr/bin/env bash
#
# Measures db-diff on one table across two databases, in the three cases that
# matter: the tables match, the differences are clustered, and the differences
# are scattered.
#
# It starts its own PostgreSQL container, so it needs Docker and nothing else.
# Results as measured on 14 October 2026 are in benchmark.md.
#
#   ./benchmark.sh                 # 1M rows, the default
#   ROWS=100000 ./benchmark.sh     # a quick run
#
set -euo pipefail

ROWS=${ROWS:-1000000}
PORT=${PORT:-55432}
NAME=${NAME:-dbdiff-bench}
SEGMENT_SIZES=${SEGMENT_SIZES:-"10000 100000"}
DRIFT=${DRIFT:-1000}

db() { docker exec -i "$NAME" psql -U postgres -d "$1" -q -c "$2" >/dev/null; }
dsn() { echo "postgres://postgres:postgres@127.0.0.1:${PORT}/$1?sslmode=disable"; }

if ! command -v db-diff >/dev/null; then
  echo "db-diff is not on PATH. go install matto.club/vetrina/db-diff@latest" >&2
  exit 1
fi

echo "starting $NAME on port $PORT"
docker rm -f "$NAME" >/dev/null 2>&1 || true
docker run -d --name "$NAME" -e POSTGRES_PASSWORD=postgres -p "${PORT}:5432" postgres:16 >/dev/null

for _ in $(seq 1 60); do
  docker exec "$NAME" pg_isready -U postgres >/dev/null 2>&1 && break
  sleep 1
done

SCHEMA="CREATE TABLE orders (id BIGINT PRIMARY KEY, customer TEXT NOT NULL, email TEXT NOT NULL,
status TEXT NOT NULL, total_cents INTEGER NOT NULL, placed_at TIMESTAMP NOT NULL);"
SEED="INSERT INTO orders SELECT g, 'customer-'||g, 'customer'||g||'@example.com', 'paid',
(g*37)%100000, TIMESTAMP '2026-06-01' - (g%365)*interval '1 day'
FROM generate_series(1,${ROWS}) g;"

echo "seeding ${ROWS} rows into src, dst and dst2"
for d in src dst dst2; do
  db postgres "CREATE DATABASE $d"
  db "$d" "$SCHEMA"
  db "$d" "$SEED"
done

# dst: every DRIFT-th row differs, so every segment contains a difference.
db dst "UPDATE orders SET total_cents = total_cents + 1 WHERE id % ${DRIFT} = 0;"
# dst2: one contiguous block differs, so only the segments it spans are read.
db dst2 "UPDATE orders SET total_cents = total_cents + 1 WHERE id BETWEEN $((ROWS / 2 + 1)) AND $((ROWS / 2 + DRIFT));"

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
echo "db-diff $(db-diff --version | awk '{print $2}'), ${ROWS} rows, PostgreSQL 16, localhost"
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
  docker exec -i "$NAME" psql -U postgres -d "$d" -c "COPY (SELECT * FROM orders) TO STDOUT" >/dev/null
  end=$(python3 -c 'import time;print(time.time())')
  python3 -c "print(f'  COPY $d: {$end-$start:6.2f}s')"
done

echo
echo "leave the container up for the next run, or: docker rm -f $NAME"
