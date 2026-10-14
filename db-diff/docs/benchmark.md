# What db-diff costs

Measured numbers for the claims this tool makes, so the next person does not have to guess. Run
[benchmark.sh](benchmark.sh) to reproduce them.

## The setup

Two PostgreSQL 16 databases in one container, on the same machine as the client. A single
`orders` table with an integer `id`, six columns, one million rows on each side. The client is
the released `db-diff v0.0.5` on macOS on Apple silicon.

Three cases, all with exactly 1000 differing rows on the target side:

- **identical**: the two tables match.
- **clustered drift**: the 1000 differences are one contiguous block of ids, so they span few
  segments.
- **scattered drift**: every 1000th id differs, so every segment of 10000 contains ten
  differences.

## Results

One million rows, wall clock, one run each:

| Case | `--segment-size 10000` (default) | `--segment-size 100000` |
|---|---|---|
| identical | 10.49s | 3.67s |
| clustered drift | 10.61s | 4.81s |
| scattered drift | 21.78s | 14.88s |

Two baselines on the same machine:

| Baseline | Time |
|---|---|
| Stream every row from one side (`COPY (SELECT * FROM orders) TO STDOUT`) | 0.57s |
| `SELECT md5(customer::text) FROM orders`, one million rows | 0.015s |

## What the numbers say

**The cost is the number of segments, not the number of rows hashed.** 200 checksum queries take
10.5s while 20 take 3.7s, for the same million rows. PostgreSQL itself hashes a million values in
15 milliseconds, so hashing is not the bottleneck. The per-segment query is.

**The default segment size is a poor fit for a large table.** At a million rows the default turns
the table into 100 segments and pays 200 queries for it. Raising `--segment-size` to 100000 made
the identical case 2.9 times faster.

**Segment size is a real trade-off, not a knob to turn up.** The same larger segments made
clustered drift *slower* at 100000 rows (2.19s against 1.24s), because a differing segment is read
whole. Larger segments mean fewer queries when the tables match and more rows read when they do
not. The right value depends on how much drift you expect and how it is distributed.

**Scattered drift is the worst case.** When every segment contains a difference, every row is
read and the narrowing buys nothing: 21.78s, twice the identical case.

**On one machine, streaming both tables raw is faster than diffing them.** `COPY` moves a million
rows in 0.57s and does no hashing. db-diff on the same data takes 10.49s. The tool's value is not
raw throughput on a local pair. It is that a client never has to hold or transfer two datasets,
that a matching table costs a bounded number of aggregates rather than a full transfer to a
client, and that a difference comes back as primary keys rather than as a diff to compute. On a
remote pair, where the transfer is the expensive part and the client is not the database, the
comparison changes; that is the case this tool is for, and it is not what this benchmark
measured.

## Caveats

- Localhost. The baseline is flattered by the transfer being nearly free, and db-diff would look
  better against remote databases.
- PostgreSQL only. MySQL and ClickHouse are not measured here.
- One run per cell, no repetitions, in a container sharing the machine with the client. Treat
  these as magnitudes rather than precise timings.
- A million rows is small. The per-segment overheads that dominate here matter more as the table
  grows, which is worth remembering when the default is applied to ten million rows.

## What this changed

The product page said "blazing fast when tables match". These numbers do not support that against
a local baseline, so the claim is gone. What the tool actually offers is the property the
[README](../README.md) states: only checksums cross the wire when the tables match, and a
differing table comes back as the primary keys that drifted.

The default `--segment-size` is worth revisiting. The measurement says the default is tuned for
small tables, and a large table pays for it.
