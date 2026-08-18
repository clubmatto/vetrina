---
title: "FakeData v0.1.3: distinct values"
platform: linkedin
topics:
  - fakedata
  - release
  - open-source
---

🚀 FakeData v0.1.3 is out! 🚀

This small release is all about `distinct` values. Sometimes you want a bit more
control over the cardinality of your columns: with
`distinct` you sample from a fixed pool of N values produced by any generator,
so you control a column's cardinality instead of leaving it to chance.

`fakedata order_id:distinct:50000:uuidv4`

Install: `go install matto.club/vetrina/fakedata@latest`

Check it out here: https://github.com/clubmatto/vetrina/blob/main/fakedata/README.md
