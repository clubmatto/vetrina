---
title: "ai-kit v0.1.1 — a rules refresh"
platforms:
  - twitter
  - linkedin
topics:
  - ai-kit
  - release
  - open-source
image: https://github.com/clubmatto/vetrina/blob/main/assets/posts/ai-kit-v0-1-1-card.png
---

## Twitter

🚀 ai-kit v0.1.1 is out 🚀

Go rules now default to flat domain packages instead of internal/, pkg/, or cmd/
scaffolding. The editorial profile gained positive moves, not just bans.

Install: npm install -g @clubmatto/ai-kit
https://matto.club/vetrina/ai-kit/

## LinkedIn

🚀 ai-kit v0.1.1 is out 🚀

Rules-only release. Two changes stand out.

Go: the default layout is now flat domain packages named for what they do, like
`fakedata/` and `db-diff/`. `internal/`, `pkg/`, and `cmd/` appear only when a
concrete need does: a second binary, code that must stay private while the
module is importable, or a public API. Existing projects are told to match
their current layout, not restructure it.

Writing: the editorial profile gained positive moves, not just bans. Announce
the shape before the detail ("We found four differences"). Name a section after
the reader's question. Write the connective you would say out loud. Put a
person or thing in the sentence.

The CLI itself did not change. Install it, or run `ai-kit sync --all-rules` in a
project that already has it.

One caveat: when the packaged rules change, sync overwrites edits you made to
rule files. Commit yours first.

Check it out: https://matto.club/vetrina/ai-kit/
