---
title: "Fakedata v0.2.0 — ClickHouse support"
platform: linkedin
topics:
  - fakedata
  - fakedata-pro
  - clickhouse
  - release
---

Fakedata v0.2.0 is out with ClickHouse support!

Point fakedata at any ClickHouse instance and it will:

- Introspect your schema via system tables (MergeTree, Enum, DateTime64, Decimal, IPv4/IPv6, Nullable, LowCardinality — all handled)
- Generate production-like data with proper type mapping
- Backfill your dev/QA databases in one command

No FK constraints in ClickHouse means the topology is flat — every table generates independently and concurrently.

```
fakedata --dsn clickhouse://localhost:9000/default --dry-run
fakedata --dsn clickhouse://localhost:9000/default -t events:1000
```

Works alongside our existing Postgres, SQLite, and MySQL adapters.

Install: go install matto.club/vetrina/fakedata@latest
