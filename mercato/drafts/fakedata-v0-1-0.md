---
title: "FakeData v0.1.0 — interactive browser, contextual help, and more"
platform: linkedin
topics:
  - fakedata
  - release
  - open-source
---

FakeData v0.1.0 is out!

This release brings a few things I've wanted for a while:

- Interactive generator browser (--explore / -e): browse and preview all generators in a TUI before picking one
- Contextual help: fakedata help &lt;topic&gt; — no more tabbing out to docs
- Ordered column pairs: start_date/end_date, begin_at/finish_at — always in the right order
- More consistent float options and better error messages

Also cleaned up the Homebrew tap — it's now colocated in the repo. One less external dependency to worry about.

Install: go install matto.club/vetrina/fakedata@latest
or: brew tap clubmatto/vetrina && brew install clubmatto/vetrina/fakedata

Docs: https://github.com/clubmatto/vetrina/blob/main/fakedata/README.md
