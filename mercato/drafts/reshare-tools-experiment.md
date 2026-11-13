---
title: "Reshare: the tools experiment"
platforms:
  - twitter
  - linkedin
image: https://github.com/clubmatto/vetrina/blob/main/website/src/assets/writing/tools-tokens.png
publish_date: 2026-11-12
topics:
  - agents
  - reshare
  - from-the-series
---

## Twitter

Yesterday's we run an experiment based on one first ran in
October. The original is worth a read!

Same task, same correct answer, and the tool
catalogue alone moved the bill from 25k to 227k input tokens.

https://matto.club/writing/how-coding-agents-work/tools/

## LinkedIn

Yesterday's experiment reused one we first ran in October. The original is
worth your time!

In the tools deep dive we ran two tasks, a rename and a reference lookup, each
hiding a trap, through one harness with three tool surfaces: a single shell,
all twenty-eight tools declared, and discovery on demand. Every configuration
answered both tasks correctly. The bill moved anyway: the rename cost 25,643
input tokens with the shell and 227,537 with the full catalogue, three tool
calls versus twenty-six. The schema alone is about 15,000 tokens, paid on
every turn.

The same rename came back yesterday with sub-agents, where fanning out to four
cost 73% more input and saved 13% of the wall clock. Same lesson both times:
the agent usually gets it right; the setup decides the bill.

The honest caveat stands: single runs, so read the token gaps as an
order-of-magnitude signal.

Read it here: https://matto.club/writing/how-coding-agents-work/tools/
