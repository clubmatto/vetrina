---
title: "No surprises with FakeData Pro dry-run"
platform: linkedin
topics:
  - fakedata
  - fakedata-pro
  - dry-run
---

It's always a little scary to have a program write to your database.

That's why FakeData Pro has dry-run ✨

Before generating a single row, check what FakeData Pro would generate:
tables, row counts, column types, mapped generators, and foreign key
relationships. Here's an example command:

fakedata --dsn sqlite:pro.db -t users:5 -t products:5 -t orders:10 --dry-run

You can iterate on your configuration with column-level overrides, then run 
without --dry-run when everything looks right.

Check out https://matto.club/products/fakedata/ for more info!
