---
title: "Your data drifts; you just don't know it yet"
platforms:
  - twitter
  - linkedin
topics:
  - db-diff
  - take
image: https://github.com/clubmatto/vetrina/blob/main/website/src/assets/writing/db-diff-one-million-rows.png
publish_date: 2026-11-07
---

## Twitter

Your data drifts and nothing tells you. No monitor alerts on a row that changed in staging and not in production, or a hotfix applied by hand that never made it back to the migration.

You find out from a bug report. A diff is how you notice instead.

https://matto.club/vetrina/db-diff/

## LinkedIn

Your data drifts and nothing tells you.

Nobody alerts on the row that was updated in production during an incident and never made it back to the migration. Nobody notices a hotfix applied by hand three deploys ago, or a fixture that grew a column the schema does not have. You find out months later, from a bug report that does not look like a data problem at all.

That is the whole argument for a diff: not to prove two databases are identical, but to be told which rows differ before a customer tells you.

The way we do it is cheap because most of your data has not drifted. DB Diff cuts the table into segments, checksums each one on both sides, and reads row by row only where the checksums disagree. An identical table costs one query per side per segment; drift comes back as the primary keys that moved.

On one million rows, Postgres goes from 10.5 seconds when the tables agree to 21.8 when the drift is scattered, MySQL from 9.1 to 22.9, ClickHouse from 4.4 to 9.0. Look at the shape rather than the ranking: an identical table costs scanning, scattered drift costs round trips, and the engines do not hold the same order across the two.

Either way it is cheap enough that a comparison can be a step in a deploy, or a nightly job that tells you two environments diverged today, instead of an investigation you open once a bug report lands.

https://matto.club/vetrina/db-diff/
