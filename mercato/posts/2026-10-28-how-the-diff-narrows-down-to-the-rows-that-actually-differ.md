---
title: "How the diff narrows down to the rows that actually differ"
platforms:
  - twitter
  - linkedin
publish_date: 2026-10-28
image: https://github.com/clubmatto/vetrina/blob/main/website/src/assets/writing/divide-and-conquer-hashing-beats-row-by-row.png
topics:
  - db-diff
  - from-the-series
  - open-source
---

## Twitter

DB Diff never reads a matching row. The table is cut into segments, each side
checksums a segment, and the checksum is the XOR of its row checksums. An equal
checksum is enough evidence to skip the segment — only a differing one gets
read, row by row.

https://matto.club/writing/divide-and-conquer-hashing-beats-row-by-row/

## LinkedIn

Comparing two tables usually means reading both and comparing rows. At millions
of rows the cost never goes away, even when the tables match.

DB Diff cuts the table into segments and checksums each segment on the server.
The checksum is the XOR of its row checksums, so an equal checksum is strong
evidence a segment matches without reading a row. Only a differing segment is
read row by row, down to the primary keys that drifted.

Read it here: https://matto.club/writing/divide-and-conquer-hashing-beats-row-by-row/
