---
title: "\"Human in the loop\" is meaningless without a blast radius"
platforms:
  - twitter
  - linkedin
publish_date: 2026-11-24
image: https://github.com/clubmatto/vetrina/blob/main/website/src/assets/writing/permissions.png
topics:
  - agents
  - reshare
  - from-the-series
---

## Twitter

"Human in the loop" is meaningless without a blast radius.

A permission prompt shows a proposal, not a result: `rm -rf build` and `rm -rf
~` differ by four characters and by everything.

https://matto.club/writing/how-coding-agents-work/permissions/

## LinkedIn

"Human in the loop" is meaningless without a blast radius.

Every coding agent asks permission at some point, and the prompt makes it look
like a human decision. What lands in front of you is a proposal, not a result:
`bash("rm -rf build")` and `bash("rm -rf ~")` differ by four characters and by
everything else.

The decisions that most need a person are exactly the ones that cost that
person the most to evaluate. Ask too often and approval becomes a reflex. Ask
too rarely and one bad judgment takes out a directory you cared about.

That tension is why the ten open-source harnesses we read share no single
permissions model: prompts, allowlists, sandboxes. Anthropic open-sourced the
sandbox runtime behind Claude Code, which denies filesystem writes and network
by default. That is the honest admission: the real answer is to shrink what a
wrong yes can do.

Read it here: https://matto.club/writing/how-coding-agents-work/permissions/
