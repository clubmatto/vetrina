---
title: "Divide and conquer: why hashing beats row by row comparison"
platforms:
  - twitter
  - linkedin
publish_date: 2026-10-27
image: https://github.com/clubmatto/vetrina/blob/main/website/src/assets/writing/divide-and-conquer-hashing-beats-row-by-row.png
topics:
  - db-diff
  - postgres
  - golang
---

## Twitter

Data migrations and large test environments ask one question: do these two tables match? Row by row reads both tables. DB Diff checksums segments on the server, so matching tables send only checksums: https://matto.club/writing/divide-and-conquer-hashing-beats-row-by-row/

## LinkedIn

We wrote the first version of DB Diff to check a large migration between platforms. Both sides ran the same engine. The test infrastructure was rebuilt from production at the same time, and the only question that mattered was whether the two sides held the same rows.

Reading both tables and comparing them in memory does not scale to millions of rows. DB Diff cuts the table into segments of the integer id. Each database checksums a segment, and if the checksums match, the client pulls no rows. Only a differing segment has its rows hashed one by one, and the primary keys that differ come back.

The checksum is the part that makes it work. Read it here: https://matto.club/writing/divide-and-conquer-hashing-beats-row-by-row/
