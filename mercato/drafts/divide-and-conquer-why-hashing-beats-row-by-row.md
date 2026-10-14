---
title: "Divide and conquer: why hashing beats row by row comparison"
platforms:
  - twitter
  - linkedin
publish_date: 2026-10-20
image: https://github.com/clubmatto/vetrina/blob/main/website/src/assets/writing/divide-and-conquer-hashing-beats-row-by-row.png
topics:
  - db-diff
  - postgres
  - golang
---

## Twitter

Row by row comparison costs the size of the table every time, even when the tables match.

How db-diff makes matching tables cost segments instead of rows: https://matto.club/writing/divide-and-conquer-hashing-beats-row-by-row/

## LinkedIn

Every data comparison starts the same way: read both tables and compare in memory. That does not scale to a table with millions of rows.

db-diff never moves a row that does not need moving. The table is cut into segments of primary keys, each database checksums a segment, and an equal checksum means the segment is skipped. Only the segments that differ are read row by row, so you get the primary keys that changed.

Why that checksum can be trusted: https://matto.club/writing/divide-and-conquer-hashing-beats-row-by-row/
