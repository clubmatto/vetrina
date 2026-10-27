---
title: "Divide and conquer: why hashing beats row by row comparison"
description: "A data migration or a test environment rebuilt from production needs to know whether two tables match. DB Diff checksums segments on the server, so matching tables send checksums, not rows."
date: 2026-10-27
image: /assets/writing/divide-and-conquer-hashing-beats-row-by-row.png
image_width: 2400
image_height: 1260
tags:
  - db-diff
  - golang
  - launch
---

I wrote the first version of DB Diff to check a large migration between
platforms. Both sides ran the same engine. The test infrastructure was rebuilt
from production at the same time, and the only question that mattered was
whether the two sides held the same rows. You can get away with an in-memory
comparison on small tables, but at scale it stops working.

The problem DB Diff solves is conceptually simple: a table with millions of
rows in two places that should hold the same thing. A replica that may have
fallen behind. A migration that moved the data. A test environment that has to
be proven faithful. An ingestion pipeline that was rewritten and has to be
proven equivalent to the old one. In every one of those cases you want to verify
that the tables match, and if they don't, you want to know what's wrong.

We've seen many ad-hoc solutions for this problem. DB Diff solves this with a
simple CLI.

This article explains how DB Diff diffs tables across two databases of the same
engine.

## What row by row costs

The first naive approach is to go row by row and compare them in memory. This
works for a small dataset.

The approach breaks down as soon as you reach a relatively large number of rows
(in the millions, it is already too slow). The problem, as is often the case
with performance-related issues, lies in repeated costs. Even when both tables
are local, the cost of comparing each row adds up. It gets worse when the
databases are remote, where network costs dominate.

We have to think about the problem differently to solve it.

## Make the databases do the work

The idea behind [DB Diff](https://matto.club/vetrina/db-diff/) is to offload most
of the comparison cost to the databases themselves. They are good at comparing
values, after all.

Here's the core idea:

- The table is cut into segments of the integer `id`, ten thousand primary keys
  by default.
- For each segment, each database computes one 64-bit checksum over the rows it
  holds.
- If the two checksums are equal, DB Diff pulls no rows and moves on.
- The databases do scan the segment to compute the checksum, but no row is sent
  anywhere.
- If the checksums differ, that segment's rows are hashed one by one, and the
  primary keys that actually differ come back.

A matching table costs two aggregate queries per segment, and nothing but the
checksums crosses the wire, which matters when the databases are remote. A
drifted table costs two row-level queries per differing segment, each returning
up to the segment size in `(id, hash)` pairs.

The "divide and conquer" happens in that order. The segment checksum narrows the
table to the segments that differ. The row hashes narrow a differing segment to
the rows that differ.

## The property that makes it possible

One checksum per segment is only useful if the segment checksum and the row
checksums are related. Otherwise the tool would have to read the rows to check
the checksum, and the whole thing gets slow again.

The relation is a fold. Each row has a checksum. The segment checksum is the XOR
of the row checksums it contains. That gives one property DB Diff leans on hard:
if the segment checksums match, the row checksums fold to the same accumulator,
and DB Diff can stop without pulling a row. Equal folds are not proof that the
rows match. They are evidence strong enough to skip the row comparison, with the
collision budget below.

XOR is also order-independent, which matters more than it might seem at first. A
query plan can change; a physical layout can change. There are also
engine-specific behaviors. For example, ClickHouse may merge parts in the
background while you are reading. If the fold depended on the order in which rows
came back, the checksums would disagree for reasons that have nothing to do with
the data.

## Building a row checksum that cannot lie

The row checksum is where the design gets careful, because the failure mode is
silent. A row checksum collision can hide a difference and report the tables as
matching when they are not.

A tool that says "no differences" when there are differences is worse than no
tool at all, so we have to be careful.

Two decisions carry most of the weight:

- **Every column is hashed separately, then combined.** A row digest is the MD5
  of a fixed-width string: one character per column for nulls, then one MD5 hex
  digest per column. The row checksum is the first 8 bytes of that digest, read
  as a 64-bit integer. Fixed width matters, because joining values with a
  separator is how you get a row where a comma shifts from one column to the
  next and two different rows hash alike.
- **Null is not the empty string.** A null bitmap, one `0` or `1` per column,
  goes in front of the digest. Plenty of comparison tools use
  `COALESCE(col, '')` and lose the distinction. In an ingestion verification
  that distinction is usually exactly the bug you are looking for: a column that
  is `NULL` on one side and `''` on the other is a real difference, and treating
  the two as the same hides it.


## Why comparing across engines is its own problem

Everything above compares a database with a database of the same engine. While
tricky, this is still a relatively simple problem. Comparing tables across
engines is a much harder problem because each engine has its own data type
system. For example, a boolean is `true` in PostgreSQL and `1` in MySQL.

To make this work, you need to reduce each value to a canonical form first, and
then the question changes from "how do I encode this" to "are these two columns
comparable at all". A wall-clock reading and an instant are different things even
when the digits match. A type that one engine does not have cannot be compared
honestly. Those are contract decisions, and getting them wrong looks exactly
like a difference in the data.

DB Diff Pro does that. It is a commercial product built on top of DB Diff, and it
is free during early access. Check it out:
[DB Diff Pro](https://matto.club/products/db-diff/).

## The tool is out

DB Diff v0 is out: PostgreSQL 14+, MySQL, and ClickHouse, one checksum contract
across all three, only checksums crossing the wire when the tables match, and the
differing primary keys when they do not.

Install:

```bash
go install matto.club/vetrina/db-diff@latest
```

Or read the [source and the algorithm notes](https://github.com/clubmatto/vetrina/tree/main/db-diff).
