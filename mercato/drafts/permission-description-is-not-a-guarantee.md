---
title: "A description is not a guarantee"
platforms:
  - twitter
  - linkedin
publish_date: 2026-11-04
topics:
  - agents
  - from-the-series
---

## Twitter

### 1

When an agent asks for permission, what you approve is a proposal, not a
result. bash("rm -rf build") and bash("rm -rf ~") are one word apart, and
reconstructing what they'll do is on you.

### 2

Almost none of the ten harnesses we read try to tell you what an action will
do before you approve it. You get a command string or a path.

The exception: DeepSeek Harness requires a prose description with every shell
command, and shows it at the approval.

### 3

The description helps. But a description is not a guarantee: it is written by
the same model proposing the command. The describer is the proposer.

Legibility up. Verifiability unchanged.

### 4

What bounds the blast radius is still the boundary under the yes. Two
questions for your harness: what backs the actions that matter, and what does
one yes cover?

https://matto.club/writing/how-coding-agents-work/permissions/

## LinkedIn

When an agent asks for permission, what you approve is a proposal, not a
result. A tool call says bash("rm -rf build") or bash("rm -rf ~"), and the
difference between the two is yours to reconstruct. Almost none of the ten
harnesses we read for our permissions chapter try to tell you what an action
will do before you approve it: you get a command string or a path, and you
rebuild the consequences in your head.

The exception is interesting. DeepSeek Harness requires the model to attach a
prose description to every shell command, and shows that description at the
approval. It reads like the missing piece.

It helps. But a description is not a guarantee, because the describer is the
proposer. The same model that wants the command wrote the text explaining the
command. Legibility goes up; verifiability stays exactly where it was.

So treat the description as interface, not as assurance. What still bounds the
blast radius is the boundary under the yes — the sandbox, the rules, the blast
radius one approval actually covers. Two questions worth asking of any
harness: what backs the actions that matter, and what does one yes cover.

Read it
here: https://matto.club/writing/how-coding-agents-work/permissions/
