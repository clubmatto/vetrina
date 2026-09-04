---
title: Tuning a slow Postgres query with FakeData Pro
description: Fakedata loads a realistic Postgres fact table in one command, so
  EXPLAIN ANALYZE stops being a guessing game
date: 2026-08-12
tags:
  - fakedata-pro
  - postgres
  - performance
---

Query performance like all performance challenges is a conceptually simple task:
Take a slow query, find the slowest piece of the puzzle, make it faster.
Iterate.

But as it often happens with performance problems, it's the practice that is
tricky. You need lots of data, shaped like production, possibly sitting next to
you so you can iterate quickly in a controlled environment. Getting all these
things together is a challenge so we thought we'd share how we've been using
FakeData Pro to help us out with such a task.

If you're not familiar with it, FakeData is a
little [open source](https://github.com/clubmatto/vetrina/blob/main/fakedata/README.md)
CLI application that generates data straight in your terminal. The Pro version
can connect to a database and ✨magically✨ generate data for you, foreign keys
resolved and constraints respected.

Let's see how we can use FakeData Pro for query performance then!

## Putting data together

> For the purpose of this conversation, we'll purposely create a one table, no
> indexes database which is clearly not a real-world scenario. The reason is that
> we want to focus on the principles (get a slow query, analyze it, break it
> down, make it parts of it faster) and the tooling used (FakeData Pro).

Say we're building the analytics side of an e-commerce backend. The core table
is an over-familiar `line_items` table. Let's create a `perf`
database with the table in it:

```bash
createdb perf
psql -d perf <<'SQL'
CREATE TABLE line_items (
    id         UUID PRIMARY KEY,
    order_id   UUID             NOT NULL,
    product_id UUID             NOT NULL,
    date       DATE             NOT NULL,
    quantity   INTEGER          NOT NULL,
    total      DOUBLE PRECISION NOT NULL
);
SQL
```

Now you could just point FakeData Pro like this
`fakedata --dsn postgres://localhost/perf --schema public -t line_items:5000000`
and be done with it. Fakedata Pro would connect to the database, introspect the
schema, and pick a sensible generator for each column based on its name and type.
Instead let's `--dry-run` to get a sense of what FakeData Pro would do first:

```bash
fakedata --dsn postgres://localhost/perf -t line_items:5000000 --dry-run
→ Would generate: 1 tables, 5,000,000 rows total

  line_items
  rows: 5000000
    id uuid → uuid
    order_id uuid → uuid
    product_id uuid → uuid
    date date → date
    quantity integer → int
    total double precision → float
```

You can see that FakeData Pro chose sensible defaults but, in the context of a
query performance task though, we want a bit more control:
`order_id`
and `product_id` should draw from _pools_ of IDs so we can control the
cardinality (50k orders, 10k products) instead of every row being a unique value
or, worse, a constant.

To achieve that, we use column options in combination with the `--dry-run`
option to get a sense of what FakeData Pro would actually do:

```bash
fakedata --dsn postgres://localhost/perf --dry-run \
  -t line_items:5000000 \
  -c "line_items.order_id=distinct:50000:uuidv4" \
  -c "line_items.product_id=distinct:10000:uuidv4" \
  -c "line_items.date=date:2025-01-01,2026-08-01" \
  -c "line_items.quantity=int:1,10" \
  -c "line_items.total=float:8,2"
→ Would generate: 1 tables, 5,000,000 rows total

  line_items
  rows: 5000000
    id uuid → uuid
    order_id uuid → distinct:50000:uuidv4
    product_id uuid → distinct:10000:uuidv4
    date date → date:2025-01-01,2026-08-01
    quantity integer → int:1,10
    total double precision → float:8,2
```

FakeData Pro shows every column with the generator it picked, or the one we
overrode, so we can tweak the generation before we run it.

Once we're ready, we run the command without dry run and we get something like
this:

<div class="ds-terminal__body ds-terminal__gif">
  <video autoplay loop muted playsinline class="theme-light" aria-label="Fakedata generating data into a Postgres database (light theme)">
    <source src="/assets/vhs/fakedata/pro-postgres-light.mp4" type="video/mp4">
  </video>
  <video autoplay loop muted playsinline class="theme-dark" aria-label="Fakedata generating data into a Postgres database (dark theme)">
    <source src="/assets/vhs/fakedata/pro-postgres-dark.mp4" type="video/mp4">
  </video>
</div>

## Explain it

Now we have data so we can finally look at that query that backs our shiny
orders/total KPIs by month dashboard:

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

Before we try to make it faster let's ask Postgres what it does with it, via
`EXPLAIN (ANALYZE, BUFFERS)`:

```text
GroupAggregate  (actual time=3187.538..3909.379 rows=19 loops=1)
   Group Key: (date_trunc('month'::text, (date)::timestamp with time zone))
   Buffers: shared hit=13481 read=43344, temp read=25695 written=25706
   ->  Sort  (actual time=3147.668..3621.192 rows=5000000 loops=1)
         Sort Key: (date_trunc('month'::text, (date)::timestamp with time zone)), order_id
         Sort Method: external merge  Disk: 205560kB
         Buffers: shared hit=13481 read=43344, temp read=25695 written=25706
         ->  Seq Scan on line_items  (actual time=0.025..1354.101 rows=5000000 loops=1)
               Buffers: shared hit=13475 read=43344
```

The plan spells out the two problems:

1. **`Seq Scan`**: Postgres reads the entire table, every row of every column,
   even though the query touches three of the six. Nearly half a gigabyte of I/O
   to answer a question that needs a few hundred bytes per month.
2. **`Sort Method: external merge Disk: 205560kB`** — `count(DISTINCT order_id)`
   means sorting 5M UUIDs, and the sort doesn't fit in memory, so Postgres
   spills ~200MB to disk.

Both are common problems: read everything, sort everything.

## Improve it

The first improvement isn't technical, it's just the most obvious product
feature: no dashboard shows **all** months of history at once. What we want is a
range like the last three months. That makes query scoped, and because the
question we're asking now is narrower, the aggregation is simpler too:

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

Now things get interesting because `EXPLAIN (ANALYZE, BUFFERS)` shows Postgres
is _still_ scanning the whole table to find the right rows:

```text
Parallel Seq Scan on line_items  (actual time=1.508..158.882 rows=266012 loops=3)
      Filter: ((date >= '2026-05-01'::date) AND (date <= '2026-08-01'::date))
      Rows Removed by Filter: 1400655
      Buffers: shared hit=13523 read=43312
```

We need to read the whole table (~444MB, 57,000 pages) just to keep the ~800k
rows that match (we throw away the other 4.2M!). There's no index on
`date`, so Postgres has no choice.

Before reaching for the index, notice why an index would even help: three months
of nineteen is _selective_: it matches roughly 15% of the rows, and a B-tree
shines when a filter narrows things down. That selectivity came from the data,
not the query: we generated `date` across nineteen months
(`date:2025-01-01,2026-08-01`), so each month holds about a twentieth of the
rows. Had we generated all five million rows inside a single month, the same
three-month window would match the entire table and Postgres would rightly
refuse an index.

That's the quiet, practical reason to care about the inputs you feed FakeData
Pro: the generator range models the _selectivity_ of your data, and selectivity
is exactly what decides whether an index gets used at all.

The fix is an index but notice what the query needs: filter on `date`, then
`count(*)` and `sum(total)`. Put the needed columns in the index:

```sql
CREATE INDEX idx_line_items_date_covering ON line_items (date) INCLUDE (total);
```

The `INCLUDE` part is the point. A plain index on `date` would find the rows,
then Postgres would have to go back to the table to fetch the other column — a
second read per row. By storing it in the index itself, the query becomes an
_index-only scan_: Postgres answers it entirely from the index and never touches
the 444MB table.

Now EXPLAIN gives us this:

```text
Parallel Index Only Scan using idx_line_items_date_covering on line_items
      Index Cond: ((date >= '2026-05-01'::date) AND (date <= '2026-08-01'::date))
      Heap Fetches: 0
      Buffers: shared hit=3610
```

`Heap Fetches: 0` is the fix! Zero reads of the table itself. The query now
touches a few thousand index pages instead of the table's 57k.

## Conclusions

| query                                      | time    | buffers |
| ------------------------------------------ | ------- | ------- |
| monthly KPI, full history                  | 3,911ms | 56,800  |
| monthly KPI, last 3 months, no index       | 188ms   | 56,800  |
| monthly KPI, last 3 months, covering index | 109ms   | 3,600   |

On a warm laptop, 188ms to 109ms is almost a shrug but the wall-clock is not the
point of this post. The point is twofold.

First, the query went from reading ~444MB to ~28MB to produce the same answer.
That number scales: on a production table with hundreds of millions of rows, the
read-volume gap is the difference between seconds and tens of seconds.

Second, none of this required _finding_ data. We created the db locally and one
command later, we had nearly half a gigabyte of realistic order lines to point
Postgres at.

Want to know how the query behaves at 50M rows? Change the `-t` count and
re-run. Wonder if the window makes the index worth it? Try both. Generate, load,
explain, repeat: the data is one command away, so the question stops being a
guessing game and becomes a measurement.
