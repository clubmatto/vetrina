---
title: DB Diff and DB Diff Pro are out
platforms:
  - twitter
  - linkedin
image: https://github.com/clubmatto/vetrina/blob/main/assets/vhs/db-diff/basic-postgres-light.gif
topics:
  - db-diff
  - open-source
  - pro
  - launch
---

## Twitter

### 1

🚀 DB Diff is out 🚀

Compare tables across two databases by checksumming. Matching segments cost
one query per side; differing segments return the primary keys that drifted.

Free and open source, or Pro for cross-engine diffs.
https://matto.club/vetrina/db-diff/

### 2

The free tool keeps the comparison in the database. It cuts the table into
segments, checksums each one on both sides, and reads only the segments that
differ. A matching table costs two aggregate queries per segment, not a full
dump.

### 3

DB Diff Pro removes the engine boundary. PostgreSQL, MySQL and ClickHouse render
values differently, so Pro reduces every value to a canonical form before
hashing. A boolean, a decimal or a timestamp means the same on both sides.

### 4

Pro is free during early access: no key, no account, no checkout. Ask for a
build and we will send one: https://matto.club/products/db-diff/

The open source tool is MIT:
https://github.com/clubmatto/vetrina

## LinkedIn

🚀 DB Diff is out 🚀

DB Diff compares tables across two databases and tells you which rows
drifted. It does the work inside the database: the table is cut into segments,
each side checksums its segments, and only the segments that differ are read row
by row. A matching table costs a handful of queries, not a full dump. You
get the primary keys that changed, not a yes or no.

It is built for the case a dump and compare cannot handle: a replica that may
have fallen behind, a migration that moved data and not just schema, or a table
with millions of rows where you need to know which ones changed.

The open source tool is free and MIT licensed. It compares within the same
engine: PostgreSQL, MySQL or ClickHouse.

DB Diff Pro adds the thing the free tool refuses: cross-engine comparison.
PostgreSQL, MySQL and ClickHouse render values differently, so Pro reduces every
value to a canonical form before hashing. A boolean, a decimal or a timestamp
means the same on both sides.

Pro is free during early access: no key or account. Ask for a build and we will
send one.

Read it here: https://matto.club/products/db-diff/
