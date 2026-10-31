---
title: "Reshare: tuning a slow Postgres query"
platforms:
  - twitter
  - linkedin
image: https://github.com/clubmatto/vetrina/blob/main/assets/vhs/fakedata/basic-dark.gif
publish_date: 2026-11-01
topics:
  - fakedata
  - postgres
  - performance
  - reshare
---

## Twitter

We wrote this a few months ago and it's still our favorite way to hunt query
performance: 5M realistic order lines into Postgres with one command, then
EXPLAIN ANALYZE until the query is fast.

Slow queries are conceptually simple. The hard part is realistic data to
reason about.

https://matto.club/writing/tuning-slow-postgres-queries-with-fakedata-pro/

## LinkedIn

A few months ago we wrote one of our favorite pieces of practical content: how
to tune a slow Postgres query when you don't have production data lying
around.

Slow queries are conceptually simple — find the slowest piece, make it faster.
The hard part is having realistic data to reason about. In the article we
generate five million realistic order lines into Postgres with a single
command, then walk through EXPLAIN ANALYZE until the query is fast.

It pairs well with the database posts we've been running this week.

Read it
here: https://matto.club/writing/tuning-slow-postgres-queries-with-fakedata-pro/
