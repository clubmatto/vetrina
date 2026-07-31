---
title: "FakeData Pro v0.2.0 — ClickHouse support"
platform: linkedin
topics:
  - fakedata
  - fakedata-pro
  - clickhouse
  - release
---

FakeData Pro v0.2.0 is out with ClickHouse support!

ClickHouse is a different beast: no foreign keys, no auto-increment columns, and its own type system. FakeData Pro introspects your schema via system tables and maps everything to the right generators:

- MergeTree, Enum, DateTime64, Decimal, IPv4/IPv6, Nullable, LowCardinality — all handled
- No FK constraints means a flat topology: every table generates independently and concurrently
- 1,000,000 rows across 3 tables in ~2.6 seconds, using native batch inserts

We also tightened up the overall experience:

- The progress bar now moves live as rows are generated (it used to sit still and jump at the end)
- Ctrl+C is always respected — transactional databases roll back cleanly, and on non-transactional ones we tell you partial data may remain

```
fakedata --dsn clickhouse://localhost:9000/default -t users:400000 -t orders:300000 -t events:300000
```

Check it out: https://matto.club/products/fakedata/
