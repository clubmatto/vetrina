---
title: "How the diff narrows down to the rows that actually differ"
platforms:
  - twitter
publish_date: 2026-10-28
topics:
  - db-diff
  - from-the-series
  - open-source
---

## Twitter

db-diff never reads a matching row. The table is cut into segments, each side
checksums a segment, and the checksum is the XOR of its row checksums. Equal
checksums mean the rows match as a set — only a differing segment gets read,
row by row.

https://matto.club/writing/divide-and-conquer-hashing-beats-row-by-row/
