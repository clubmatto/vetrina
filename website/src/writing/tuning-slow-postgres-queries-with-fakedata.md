---
title: Tuning a Slow Postgres Query With Fake Data
description: Fakedata loads a realistic Postgres fact table in one command, so
  EXPLAIN ANALYZE stops being a guessing game
date: 2026-08-05
draft: true
tags:
  - fakedata
  - postgres
  - performance
---

Query performance like all performance challenges is a conceptually simple task:
Take a slow query, find the slowest piece of the puzzle, make it faster.
Iterate.

But as it often happens with performance problems, it's the practice that is
tricky. You need lots of data, shaped like production, possibly sitting next to
you so you can iterate quickly in a controlled environment. Getting all these
things together is a challenge so we thought we'd share how we use FakeData Pro
to help us out with such a task.

If you're not familiar with it, FakeData is a little CLI application (it's open
source, check it out here TODO add link) that generates data straight in your
terminal. The Pro version can connect to a database and ✨magically✨ generate
data for you, foreign keys resolved and constraints respected.

Let's see it in action it!

## Putting data together

Say we're building the analytics side of an e-commerce backend. The core table
is an over-familiar `line_items` example table:

```sql
CREATE TABLE line_items (
    id         UUID PRIMARY KEY,
    order_id   UUID             NOT NULL,
    product_id UUID             NOT NULL,
    date       DATE             NOT NULL,
    quantity   INTEGER          NOT NULL,
    total      DOUBLE PRECISION NOT NULL
);
```

Create the database, apply the schema, and point fakedata at it:

```bash
createdb perf
psql -d perf -f schema/line_items.sql

fakedata --dsn postgres://localhost/perf --schema public -t line_items:5000000
```

That's it. Fakedata connects, introspects the schema, and picks a sensible
generator for each column based on its name and type: a UUID gets a UUID, a
`DATE` gets a date, a `DOUBLE PRECISION` a float, and so on. If a table has
foreign keys, they're resolved automatically — a fact table references real
parents, not dangling rows.

For this table we want a bit more control, because `order_id` and `product_id`
should draw from _pools_ of IDs so we can control the cardinality (50k orders,
10k products) instead of every row being a unique value or, worse, a constant.
One flag per column:

```bash
fakedata -n 50000 uuidv4 > orders.txt
fakedata -n 10000 uuidv4 > products.txt

fakedata --dsn postgres://localhost/perf --schema public \
  -t line_items:5000000 \
  -c "public.line_items.order_id=file:orders.txt" \
  -c "public.line_items.product_id=file:products.txt" \
  -c "public.line_items.date=date:2025-01-01,2026-08-01" \
  -c "public.line_items.quantity=int:1,10" \
  -c "public.line_items.total=float:8,2"
```

Before committing to a load that takes minutes, it's worth checking what
fakedata thinks each column should become. `--dry-run` prints the whole mapping
without writing a single row — instant, and free:

```text
→ Would generate: 1 tables, 5,000,000 rows total

  line_items
  rows: 5000000
    id uuid → uuid
    order_id uuid → file:orders.txt
    date date → date:2025-01-01,2026-08-01
    quantity integer → int:1,10
    total double precision → float:8,2
    product_id uuid → file:products.txt
```

Every column shows its generator — our overrides (`order_id`, `date`,
`total`, …) and the default fakedata picked for `id`. If a mapping looks wrong,
fix the override _before_ the load, not after.

The whole thing, from schema to a query over freshly generated data:

<div class="ds-terminal__body ds-terminal__gif">
  <video autoplay loop muted playsinline class="theme-light" aria-label="Fakedata generating data into a Postgres database (light theme)">
    <source src="/assets/vhs/fakedata/pro-postgres-light.mp4" type="video/mp4">
  </video>
  <video autoplay loop muted playsinline class="theme-dark" aria-label="Fakedata generating data into a Postgres database (dark theme)">
    <source src="/assets/vhs/fakedata/pro-postgres-dark.mp4" type="video/mp4">
  </video>
</div>

That loaded 5,000,000 rows into a fresh database in about four and a half
minutes on my laptop — most of it the write itself, fakedata generated the rows
in ~14 seconds. Five million rows, half a gigabyte of data, no export/import
ceremony.

## Asking the database what a query does

Now we have data. The dashboard shows monthly KPIs, and a first pass at the
query computes the whole history — 19 months of order lines — on every load:

```sql
SELECT
    date_trunc('month', date) AS month,
       count(DISTINCT order_id)  AS orders,
       sum(total)                AS total
FROM
    line_items
GROUP BY 1
ORDER BY 1;
```

Let's ask Postgres what it does with it, via `EXPLAIN (ANALYZE, BUFFERS)`:

```text
GroupAggregate  (actual time=3740.742..4443.227 rows=19.00 loops=1)
   Group Key: (date_trunc('month'::text, (date)::timestamp with time zone))
   Buffers: shared hit=16068 read=44935, temp read=50401 written=50489
   ->  Sort  (actual time=3695.007..4146.101 rows=5000000.00 loops=1)
         Sort Key: (date_trunc('month'::text, (date)::timestamp with time zone)), order_id
         Sort Method: external merge  Disk: 201632kB
         Buffers: shared hit=16068 read=44935, temp read=50401 written=50489
         ->  Seq Scan on line_items  (actual time=0.121..1458.250 rows=5000000.00 loops=1)
               Buffers: shared hit=16062 read=44935
```

About four and a half seconds to return 19 numbers. The plan spells out the two
problems:

1. **`Seq Scan`** — Postgres reads the entire table, every row of every column,
   even though the query touches three of the six. Half a gigabyte of I/O to
   answer a question that needs a few hundred bytes per month.
2. **`Sort Method: external merge Disk: 201632kB`** — `count(DISTINCT order_id)`
   means sorting 5M UUIDs, and the sort doesn't fit in memory, so Postgres
   spills ~200MB to disk.

Both habits are common: read everything, sort everything.

## A narrower question, then an index

The first improvement isn't technical. No dashboard shows 19 months of history
at once — the product shows a range, say the last three months. So the honest
query is scoped, and once the question is narrower the aggregation can be
simpler too:

```sql
SELECT
    date_trunc('month', date) AS month,
       count(*)                  AS line_items,
       sum(total)                AS total
FROM
    line_items
WHERE
    date BETWEEN '2026-05-01'
    AND '2026-08-01'
GROUP BY 1
ORDER BY 1;
```

Now the interesting part. Even scoped to three months — roughly 15% of the
table — `EXPLAIN (ANALYZE, BUFFERS)` shows Postgres _still_ scanning the whole
table to find them:

```text
Parallel Seq Scan on line_items  (actual time=0.101..148.899 rows=265618.00 loops=3)
      Filter: ((date >= '2026-05-01'::date) AND (date <= '2026-08-01'::date))
      Rows Removed by Filter: 1401049
      Buffers: shared hit=15946 read=45127
```

The whole table — ~477MB, 61,000 pages — read to keep the ~800k rows that match
and throw away the other 4.2M. There's no index on `date`, so Postgres has no
choice.

Before reaching for the index, notice why an index would even help: three months
of nineteen is _selective_ — it matches roughly 15% of the rows, and a B-tree
shines when a filter narrows things down. That selectivity came from the data,
not the query: we generated `date` across nineteen months
(`date:2025-01-01,2026-08-01`), so each month holds about a twentieth of the
rows. Had we generated all five million rows inside a single month, the same
three-month window would match the entire table and Postgres would rightly
refuse an index.

That's the quiet, practical reason to care about the inputs you feed fakedata:
the generator range models the _selectivity_ of your real data, and selectivity
is exactly what decides whether an index gets used at all. You're not picking a
nice-looking interval — you're choosing how selective your filters are. The same
holds for the ID pools: `product_id` draws from ten thousand UUIDs, so a
`WHERE product_id = ?` filter is one-in-ten-thousand, comfortably index-worthy.
Give it a pool of five and the same filter is one-in-five, and Postgres will
prefer a scan.

The fix is an index — but notice what the query needs: filter on `date`, then
`count(*)` and `sum(total)`. Put the needed columns in the index:

```sql
CREATE INDEX idx_line_items_date_covering ON line_items (date) INCLUDE (total);
```

The `INCLUDE` part is the point. A plain index on `date` would find the rows,
then Postgres would have to go back to the table to fetch the other column — a
second read per row. By storing it in the index itself, the query becomes an
_index-only scan_: Postgres answers it entirely from the index and never touches
the half-gigabyte table again.

```text
Parallel Index Only Scan using idx_line_items_date_covering on line_items
      Index Cond: ((date >= '2026-05-01'::date) AND (date <= '2026-08-01'::date))
      Heap Fetches: 0
      Buffers: shared hit=551 read=3054
```

`Heap Fetches: 0` is the sentence to look at: zero reads of the table itself.
The query now touches a few thousand index pages instead of the table's 61,000.

## The numbers are a side effect

| query                                      | time    | buffers |
|--------------------------------------------|---------|---------|
| monthly KPI, full history                  | 4,551ms | 61,000  |
| monthly KPI, last 3 months, no index       | 222ms   | 61,000  |
| monthly KPI, last 3 months, covering index | 113ms   | 3,600   |

On a warm laptop, 222ms to 113ms is almost a shrug, and honestly the wall-clock
is not the point of this post. The point is twofold.

First, the query went from reading ~477MB to ~28MB to produce the same answer.
That number scales: on a production table with hundreds of millions of rows, the
read-volume gap is the difference between seconds and tens of seconds. I've
tuned exactly this class of KPI query in real systems, and the pattern is always
the same — a wide scan answering a narrow question.

Second, and more importantly: none of this required _finding_ data. The schema
and one command later, we had half a gigabyte of realistic order lines to point
Postgres at. `EXPLAIN` needs data the way `git bisect` needs a bug — you can't
cheat your way around it, you just need the thing to be cheap to get. Fakedata
makes getting it the boring part.

Want to know how the query behaves at 50M rows? Change the `-t` count and
re-run. Wonder if the window makes the index worth it? Try both. Generate, load,
explain, repeat — the data is one command away, so the question stops being a
guessing game and becomes a measurement.
