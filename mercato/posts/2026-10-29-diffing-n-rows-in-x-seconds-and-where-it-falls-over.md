---
title: "Diffing N rows in X seconds, and where it falls over"
platforms:
  - twitter
  - linkedin
image: https://github.com/clubmatto/vetrina/blob/main/website/src/assets/writing/db-diff-one-million-rows.png
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

Numbers and
method: https://github.com/clubmatto/vetrina/blob/main/db-diff/docs/benchmark.md

### 2

The finding is very interesting: no fixed segment size helps. It's too
engine dependent. Raising it to 100000 made the identical case 2.9x faster on
PostgreSQL and 26% faster on ClickHouse but 56% slower on MySQL.

### 3

Scattered drift is bad everywhere though: a difference in
every segment means every row is read. Locally streaming both tables
out raw is actually faster than diffing.

## LinkedIn

We measured DB Diff on one million rows: PostgreSQL, MySQL and ClickHouse, three
drift patterns, two segment sizes. The identical case runs in 10.5s, 9.1s and
4.4s.

The finding is very interesting: no fixed segment size helps. It's too engine
dependent. Raising it to 100000 made the identical case 2.9x faster on
PostgreSQL and 26% faster on ClickHouse but 56% slower on MySQL. No single
default is right for all three.

Scattered drift is bad everywhere though: a difference in every segment means
every row is read. And locally, streaming both tables out raw is actually
faster than diffing. What DB Diff offers is what crosses the wire — checksums
when the tables match, and the primary keys that drifted when they don't.

Read it
here: https://github.com/clubmatto/vetrina/blob/main/db-diff/docs/benchmark.md
