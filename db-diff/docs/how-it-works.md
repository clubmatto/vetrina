# How it works

> `db-diff` is inspired by [data-diff](https://github.com/datafold/data-diff), a tool by
> datafold (now archived), and by the divide and conquer approach it popularised.

`db-diff` compares one table in two databases. When the tables match, it answers with a handful
of checksum queries. When they do not, it narrows down to the exact rows that differ.

## Overview

The table is cut into **segments** of `--segment-size` primary keys. Each segment is checksummed
on both sides. When two checksums are equal the segment is skipped; when they differ, the rows
of that segment are pulled from both sides and compared row by row.

```
source                                target
┌────────────────┐                    ┌────────────────┐
│ segment 1..N   │  checksum equal    │ segment 1..N   │   skip
│ segment N..2N  │  checksum differs  │ segment N..2N  │   read both sides, compare rows
│ segment 2N..3N │  checksum equal    │ segment 2N..3N │   skip
└────────────────┘                    └────────────────┘
```

The cost is proportional to *the number of differing segments*, not to the size of the table.
Reading a whole table over the wire is what this avoids.

## The checksum

Everything rests on one property: **the checksum of a segment equals the XOR fold of the row
checksums it contains**, and two rows checksum the same exactly when their compared columns
hold the same values. If that property fails, `db-diff` reports "no differences" about tables
that differ, which is the worst thing a diff tool can do.

The row checksum is built per column, not over the joined values, and it starts with a bitmap
of which columns are NULL:

```
md5( <null bitmap> || md5(COALESCE(col_a, '')) || md5(COALESCE(col_b, '')) || ... )
  -> first 8 bytes
```

The bitmap is one character per column, `0` for NULL and `1` otherwise. It is what separates
NULL from the empty string, which both otherwise render as nothing. That distinction is real
data — a column that is NULL on one side and empty on the other is the classic replication
artifact — so folding the two together would be a false negative.

Hashing each column separately is what makes the concatenation unambiguous. Every digest is a
fixed 32 hex characters, so no row can produce the same concatenation as another row by moving
a delimiter between columns. Joining the raw values first would allow exactly that: `('a','bc')`
and `('ab','c')` join to the same string.

The first 8 bytes of the digest are read as an unsigned 64 bit integer. The segment checksum is
the bitwise XOR of those integers, rendered as 16 hex digits.

Each engine derives the same 64 bit value, byte for byte, which the golden checksum test pins:
a fixture's checksum is computed in Go and compared against what all three engines produce.

XOR is commutative, which matters for a reason that is easy to miss: **the database is not
asked to return rows in any particular order**. A plain concatenation of per-row hashes would
depend on the order rows came back in, and three things can change that order — the query plan,
the physical layout, and, in ClickHouse, background merges of table parts. XOR has no such
dependency.

## Collisions

The accumulator is 64 bits wide. Folding *n* rows into 64 bits means two different sets of rows
can in principle produce the same checksum.

For a segment of 10 000 rows the probability that any two row checksums collide inside one
segment is about 2.7 × 10⁻¹², and the probability that two *different* sets of rows fold to the
same accumulator is of the same order. A table of a hundred million rows is about 10 000
segments, so the chance of missing a difference anywhere in that table is around 3 × 10⁻⁸. For
a data verification tool that is the right trade: the alternative, a 128 bit accumulator, needs
unsigned 128 bit arithmetic that not every supported engine makes pleasant.

Widening the accumulator is a contained change. Each dialect builds one expression, and the
conformance suite checks the fold property rather than a specific width.

## Tuning `--segment-size`

The default is 10 000 primary keys per segment, and it trades two costs against each other:

- **Larger segments** mean fewer queries, so less round trip overhead, but a differing segment
  pulls that many rows from both sides to compare in memory.
- **Smaller segments** mean more queries, but a much smaller read when something differs.

If you expect few differences in a very large table, a larger segment is faster. If you expect
scattered differences, or you are diffing over a slow link, a smaller segment avoids reading
rows you do not need.

## Performance notes

- Index the primary key. Every query filters on it, and the range scan is the whole cost.
- Compare fewer columns when you can. `--include` and `--exclude` are the biggest lever: a
  narrow checksum reads far less data.
- If you only care *whether* something changed, `--exclude` everything but the primary key. The
  check then becomes a presence check, which is the cheapest comparison there is.
- The comparison is not a snapshot. Rows changed while it runs can be reported as differences.
- Make sure both connections render values the same way. A `timestamptz` compared across two
  PostgreSQL sessions with different `TimeZone` settings will report every row as changed.

## Why the same engine only

Each engine renders values as text its own way. A boolean is `t` in PostgreSQL and `1` in MySQL;
a timestamp carries different precision; a decimal pads differently. Checking the same logical
value across engines therefore hashes two different strings, and the diff reports every row as
changed.

There is a second, sharper reason. Each engine renders a value using its session settings:
PostgreSQL formats a `timestamptz` in the session `TimeZone`, MySQL decodes text in the
connection charset, ClickHouse formats a `DateTime` in the column timezone. Two databases with
different settings hash identical rows differently, so even a same engine comparison needs the
two connections to agree. `db-diff` does not pin these settings for you.

Fixing all of that means defining a canonical text form per type and having each dialect
produce it, which is the type aware work behind cross engine support. Until then `db-diff`
refuses a cross engine run rather than guess, and compares a database against a database of the
same engine.

## Glossary

| Term | Meaning |
|---|---|
| **Segment** | a contiguous range of primary keys, `--segment-size` wide |
| **Row checksum** | the 64 bit digest of one row's compared columns |
| **Chunk checksum** | the XOR fold of the row checksums in a segment |
| **Fold** | reducing many row checksums to one accumulator value |
