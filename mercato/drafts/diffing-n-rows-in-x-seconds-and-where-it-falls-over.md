---
title: "Diffing N rows in X seconds, and where it falls over"
platforms:
  - twitter
  - linkedin
publish_date: 2026-10-29
topics:
  - db-diff
  - we-measured
  - open-source
---

## Twitter

### 1

We measured DB Diff on one million rows: PostgreSQL, MySQL and ClickHouse, three
drift patterns, two segment sizes. The identical case runs in 10.5s, 9.1s and
4.4s.

Numbers and method: https://github.com/clubmatto/vetrina/blob/main/db-diff/docs/benchmark.md

### 2

The finding that matters: the segment size that helps depends on the engine.
Raising it to 100000 made the identical case 2.9x faster on PostgreSQL and 26%
faster on ClickHouse — and 56% slower on MySQL. No single default can be right
for all three.

### 3

Two honest ones. Scattered drift is the worst case everywhere: a difference in
every segment means every row is read. And on localhost, streaming both tables
out raw is faster than diffing. The value is what crosses the wire — and the
primary keys that come back.

## LinkedIn

We measured DB Diff on one million rows: PostgreSQL, MySQL and ClickHouse,
identical tables, clustered and scattered drift, two segment sizes.

The finding that matters: the segment size that helps depends on the engine.
Raising it to 100000 made the identical case 2.9x faster on PostgreSQL and 26%
faster on ClickHouse — and 56% slower on MySQL. No single default is right for
all three.

The honest part: on localhost, streaming both tables raw is faster than
diffing. What DB Diff offers is what crosses the wire — checksums when the
tables match, and the primary keys that drifted when they don't.

Read it here: https://github.com/clubmatto/vetrina/blob/main/db-diff/docs/benchmark.md
