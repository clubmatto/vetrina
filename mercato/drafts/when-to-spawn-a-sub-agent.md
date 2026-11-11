---
title: "When to spawn a sub-agent, and when it just costs money"
platforms:
  - twitter
  - linkedin
publish_date: 2026-11-11
image: https://github.com/clubmatto/vetrina/blob/main/website/src/assets/writing/sub-agents-report-only.png
topics:
  - agents
  - from-the-series
---

## Twitter

Four sub-agents finished our rename test 11 seconds faster than one. The input
bill was 73% higher.

The rule from our sub-agents deep dive: spawn when the parent work you avoid is
bigger than the bill. Exploration pays, one-line questions lose.

https://matto.club/writing/how-coding-agents-work/sub-agents/

## LinkedIn

Four sub-agents finished our test 11 seconds faster than one. The input bill
was 73% higher.

We took the rename task from our tools experiment, copied it across four
identical services, and had Qwen Code delegate it to one, two, or four fresh
sub-agents on DeepSeek's deepseek-flash. All three runs got the rename right.
The wall clock went from 82.2s to 71.2s. The tokens went the other way: 73%
more input, 69% more output.

The reason is the bill every sub-agent pays alone: its own system prompt, tool
catalogue, loop, and report, all on a cold prefix. Fan-out multiplies it. The
input did not grow 4x only because 96% of it was cache reads.

The rule: spawn a sub-agent when the parent work you avoid is bigger than the
bill: brief, baseline, loop, report, verification. In practice that means
long, self-contained, narrow work.
Exploration pays: "find every caller of this function and summarize why" is
forty tool results the parent never sees. One-line questions lose. And if you
have to hand over most of your own context first, the fresh window bought
nothing.

One run per configuration, one harness, one task: a signpost, not a
benchmark.

Read it here: https://matto.club/writing/how-coding-agents-work/sub-agents/
