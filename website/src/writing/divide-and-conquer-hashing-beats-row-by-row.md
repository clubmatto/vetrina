---
title: "Divide and conquer: why hashing beats row by row comparison"
description: Comparing two tables row by row costs the size of the table every
  time. Hashing on the server costs the number of segments when the tables
  match, which is the case you run most often.
date: 2026-10-20
draft: true
image: /assets/writing/divide-and-conquer-hashing-beats-row-by-row.png
image_width: 2400
image_height: 1260
tags:
  - db-diff
  - golang
  - postgres
  - launch
---

The first version of any data comparison is the same. Read every row, put it in
a map, walk the other side, print what does not line up. It works, it is twenty
lines, and it is the wrong shape for the problem.

The problem is a table with millions of rows in two places that should hold the
same thing. A replica that may have fallen behind. A migration that moved data
and not just schema. An ingestion pipeline that was rewritten and has to be
proven equivalent to the old one. In every one of those cases the answer you
expect is "they match", and the answer you expect is wrong exactly once, on the
day it matters.

## What row by row costs

Read both tables and compare them in memory and you pay for the table twice
before you learn anything. If both sides are in the same process, that is
memory plus time. If one side is remote, it is the entire table over the wire.
The cost does not depend on whether the tables agree. Two identical tables cost
exactly as much as two tables where every row differs, which is a strange
property for a tool whose most common answer is "no differences".

There is a second cost that is easier to miss. A row by row comparison has to
decide what "equal" means for every column, in the client, for every type your
schema uses. Decimals, timestamps, byte arrays, nulls. That is a type system you
now maintain, and every place it disagrees with the database is a false
positive.

## Push the comparison into the database

The idea behind [db-diff](https://matto.club/vetrina/db-diff/) is to never move
a row that does not need moving. The databases already know how to compare their
own values, and they are very fast at it. So ask them.

The table is cut into segments of primary keys, ten thousand by default. For
each segment, each database computes one 64-bit checksum over the rows it holds.
If the two checksums are equal, the segment is skipped and not a single row is
read. If they differ, that segment is read row by row, and the primary keys that
actually differ come back.

The cost profile falls out of that. Matching tables cost two aggregate queries
per segment and nothing else crosses the wire. Drifted tables cost the segments
that differ, times the segment size, which is the price of finding out _which_
rows moved rather than just that something did.

## The property that makes it possible

One checksum per segment is only useful if the segment checksum and the row
checksums are related. Otherwise the tool would have to read the rows to check
the checksum, and the whole thing collapses.

The relation is a fold. Each row has a checksum. The segment checksum is the
XOR of the row checksums it contains. That gives one property db-diff leans on
hard: if the segment checksums match, the row checksums match as a set, and the
tool can stop without reading anything. A conformance test asserts the fold
against real engines, because it is the assumption everything else rests on.

XOR is also order independent, which matters more than it looks. A query plan
can change, a physical layout can change, and ClickHouse will merge parts in the
background while you are reading. If the fold depended on the order rows came
back in, the checksums would disagree for reasons that have nothing to do with
the data.

## Building a row checksum that cannot lie

The row checksum is where the design gets careful, because the failure mode is
silent. A checksum that maps two different rows to the same value reports the
tables as matching when they are not, and a tool that says "no differences" when
there are differences is worse than no tool at all.

Two decisions carry most of the weight.

**Every column is hashed separately, then folded.** A row digest is the MD5 of a
fixed-width concatenation: one character per column for nulls, then one MD5 hex
digest per column, then the digests of those digests. Fixed width matters,
because joining values with a separator is how you get a row where a comma
shifts from one column to the next and two different rows hash alike.

**Null is not the empty string.** A null bitmap, one `0` or `1` per column, goes
in front of the digest. Plenty of comparison tools use `COALESCE(col, '')` and
lose the distinction. In an ingestion verification that distinction is usually
exactly the bug you are looking for: a column that is `NULL` on one side and `''`
on the other is a real difference, and folding the two together hides it.

## What it still cannot do

Being honest about the limits is part of the design.

A 64-bit accumulator can collide. For a ten thousand row segment the probability
of a colliding fold is around 2.7 × 10⁻¹², and across ten thousand segments
around 2.7 × 10⁻⁸. That is accepted deliberately, and widening the accumulator
is a contained change in one expression per engine.

A differing segment is read whole rather than split again. Ten thousand rows is
fast in practice, and recursion would add a second code path to a place where
being wrong is expensive.

The comparison is not a snapshot. Rows written while it runs can show up as
differences, so run it against a quiesced replica when that matters.

And the rendering has to agree. PostgreSQL formats a `timestamptz` in the
session timezone, MySQL decodes text in the connection charset, ClickHouse
formats a `DateTime` in the column timezone. Two connections with different
settings will hash identical data differently. That is the most likely source of
false positives in the field, and db-diff does not pin those settings for you.

## Why comparing across engines is its own problem

Everything above compares a database with a database of the same engine, because
that is the case where the checksum can be trusted. Across engines it cannot:
a boolean is `true` in PostgreSQL and `1` in MySQL, a decimal pads differently,
a float is spelled three ways. Hash the engine's own rendering and the two
sides disagree about every row, which is a worse answer than refusing.

Fixing it means reducing each value to a canonical form first, and then the
question changes from "how do I encode this" to "are these two columns
comparable at all". A wall clock reading and an instant are different things
even when the digits match. A type one engine does not have cannot be compared
honestly. Those are contract decisions, and getting them wrong looks exactly
like a difference in the data.

That work is [db-diff Pro](https://matto.club/products/db-diff/), and it is the
subject of its own post.

## The tool is out

db-diff v0 is released: PostgreSQL, MySQL and ClickHouse, one checksum contract
across all three, checksums only when the tables match, and the differing
primary keys when they do not.

Install:

```bash
go install matto.club/vetrina/db-diff@latest
```

Or read the [source and the algorithm
notes](https://github.com/clubmatto/vetrina/tree/main/db-diff).
