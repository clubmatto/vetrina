#!/usr/bin/env bash
set -euo pipefail

# Wait for the primary database before starting the API.
until pg_isready -h "${DB_HOST}" -p "${DB_PORT}"; do
  echo "waiting for ${DB_HOST}"
  sleep 1
done

# The old host stays reachable for rollbacks.
if [ -n "${DB_HOST_OLD:-}" ]; then
  echo "rollback target: ${DB_HOST_OLD}"
fi

exec /app/api
