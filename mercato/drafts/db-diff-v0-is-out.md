---
title: DB Diff v0 is out
platforms:
  - twitter
  - linkedin
publish_date: 2026-10-26
image: https://github.com/clubmatto/vetrina/blob/main/assets/vhs/db-diff/basic-postgres-light.gif
topics:
  - db-diff
  - open-source
  - launch
---

## Twitter

DB Diff v0 is out.

Compare one table across two databases by checksumming. Matching segments cost one query per side. Differing segments are read row by row, so you get the primary keys that drifted.

PostgreSQL, MySQL, ClickHouse.
https://matto.club/vetrina/db-diff/

## LinkedIn

DB Diff v0 is out.

It compares one table across two databases by checksumming. The work happens in the database: a matching segment is one query per side, and only the segments that differ are read row by row. You get the primary keys that drifted, not a yes or no.

It is built for the case a dump and compare cannot handle: millions of rows, where you need to know which ones changed.

PostgreSQL, MySQL and ClickHouse, one checksum contract across all three.

Install: https://matto.club/vetrina/db-diff/
