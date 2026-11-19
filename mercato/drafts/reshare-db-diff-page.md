---
title: "Reshare: the DB Diff product page"
platforms:
  - twitter
  - linkedin
topics:
  - db-diff
  - reshare
image: https://github.com/clubmatto/vetrina/blob/main/assets/vhs/db-diff/basic-postgres-light.gif
---

## Twitter

DB Diff compares two databases by checksumming: cut the table into segments, hash each one on both sides, read row by row only what differs. You get the primary keys that moved.

Free and MIT for one engine, Pro cross-engine.

https://matto.club/products/db-diff/

## LinkedIn

DB Diff tells you which rows differ between two databases, and it does the work inside them. Each table is cut into segments, both sides checksum theirs, and only the segments that disagree are read row by row. A matching table costs a handful of queries, and a differing one gives you the primary keys that moved.

It exists for the case a dump and compare cannot touch: a replica that may have lagged, a migration that moved data and not just schema, a table with millions of rows.

The open source tool is MIT and compares tables within one engine. DB Diff Pro removes that boundary, because PostgreSQL, MySQL and ClickHouse render values differently, so it canonicalises each value before hashing. Pro is free during early access: no key, no account, ask and we send a build.

https://matto.club/products/db-diff/
