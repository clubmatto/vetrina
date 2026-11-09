---
title: "The checker that keeps our content board honest"
platforms:
  - twitter
  - linkedin
publish_date: 2026-11-09
topics:
  - clubmatto
  - how-we-work
  - open-source
---

## Twitter

We run our entire content plan on a kanban board. 131 cards, 52 published
posts, drafts, dates. Two people, no content team: drift was constant.

Shipped posts left sitting in drafts. Cards in the wrong column. Drafts
nobody referenced anymore.

So we wrote a checker. It fetches the board, diffs it against the repo, and
exits red when they disagree:

https://github.com/clubmatto/vetrina/blob/main/mercato/docs/invariants.py

It runs in one command. This week alone it caught three posts we had shipped
without moving their files.

## LinkedIn

We run our entire content plan on a kanban board: every post is a card, every
card has a date, and every draft is a file in the repo. Two people, no content
team. That combination drifts. Posts get published and their files stay in the
drafts folder. Cards end up in the wrong column. A draft sticks around after
its card moved on.

For a while we fixed this by memory, which is exactly as reliable as it
sounds.

So we did what we always do: we wrote a small tool. A checker that fetches the
board through its API, reads the repo, and verifies the invariants — every
published card points at a real post file, every draft belongs to a card that
isn't published yet, no publish date has quietly passed, every image URL
resolves, every tweet fits in 280 characters. It exits non-zero when the board
and the repo disagree, so it can run unattended.

It runs in one command, and it lives in the repo:

https://github.com/clubmatto/vetrina/blob/main/mercato/docs/invariants.py

This week alone it caught three posts we had shipped without moving their
files. The board still drifts. The difference is that now we hear about it.
