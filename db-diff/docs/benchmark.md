# What db-diff costs

Measured numbers for the claims this tool makes, so the next person does not have to guess. Run
[benchmark.sh](benchmark.sh) to reproduce them; it starts its own engine container and needs
nothing but Docker.

## The setup

Two databases of the same engine in one container, on the same machine as the client. A single
`orders` table with an integer `id`, six columns, one million rows on each side. The client is the
released `db-diff v0.0.5` on macOS on Apple silicon.

Three cases, all with exactly 1000 differing rows on the target side:

- **identical**: the two tables match.
- **clustered drift**: the 1000 differences are one contiguous block of ids, so they span few
  segments.
- **scattered drift**: every 1000th id differs, so every segment of 10000 contains ten
  differences.

## Results

One million rows, wall clock, one run each. `10000` is the default.

| Engine | Case | `--segment-size 10000` | `--segment-size 100000` |
|---|---|---|---|
| PostgreSQL 16 | identical | 10.49s | 3.67s |
| | clustered drift | 10.61s | 4.81s |
| | scattered drift | 21.78s | 14.88s |
| MySQL 8.4 | identical | 9.11s | 14.29s |
| | clustered drift | 9.31s | 17.13s |
| | scattered drift | 22.91s | 18.78s |
| ClickHouse 24.8 | identical | 4.37s | 3.22s |
| | clustered drift | 4.34s | 3.50s |
| | scattered drift | 8.97s | 6.40s |

Baselines on the same machine, one side:

| Engine | Stream every row out |
|---|---|
| PostgreSQL (`COPY (SELECT * FROM orders) TO STDOUT`) | 0.57s |
| MySQL (`SELECT * FROM orders`) | 0.86s |
| ClickHouse (`SELECT * FROM orders`) | 0.59s |
| PostgreSQL, `SELECT md5(customer::text) FROM orders` | 0.015s |

## What the numbers say

**The cost is the number of segments, not the number of rows hashed.** On PostgreSQL, 200
checksum queries take 10.5s where 20 take 3.7s, for the same million rows. PostgreSQL hashes a
million values in 15 milliseconds, so hashing is not the bottleneck. The per-segment query is.

**The segment size that helps is not the same on every engine.** This is the finding that
matters most, because it rules out a single better default. On PostgreSQL, raising the segment
size to 100000 made the identical case 2.9 times faster. On ClickHouse it helped more modestly,
3.22s against 4.37s. On MySQL it made the identical case **56 percent slower**, 14.29s against
9.11s. A default cannot be right for all three.

**Bigger segments are a trade-off even where they help.** A differing segment is read whole, so a
larger segment reads more rows when it differs. On MySQL at 100000 rows, clustered drift was
slower with larger segments (1.83s against 1.02s). The right value depends on how much drift you
expect and how it is spread.

**Scattered drift is the worst case everywhere.** When every segment contains a difference, every
row is read and the narrowing buys nothing: 21.78s on PostgreSQL, 22.91s on MySQL, 8.97s on
ClickHouse at the default.

**ClickHouse is the fastest of the three**, at roughly a third of the PostgreSQL time on the
identical case. It is also the engine where the fold and the byte order needed the most care.

**On one machine, streaming both tables raw is faster than diffing them.** One side streams in
0.57s to 0.86s and does no hashing. db-diff on the same data takes 4.37s to 10.49s. The tool's
value is not raw throughput on a local pair. It is that a client never has to hold or transfer
two datasets, that a matching table costs a bounded number of aggregates rather than a full
transfer to a client, and that a difference comes back as primary keys rather than as two files
to diff. On a remote pair, where the transfer is the expensive part and the client is not the
database, the comparison changes; that is the case this tool is for, and it is not what this
benchmark measured.

## Caveats

- Localhost. The baselines are flattered by the transfer being nearly free, and db-diff would
  look better against remote databases.
- One run per cell, in a container sharing the machine with the client. Treat these as magnitudes
  rather than precise timings.
- A million rows is small. The per-segment overheads that dominate here matter more as the table
  grows, which is worth remembering when a default is applied to ten million rows.
