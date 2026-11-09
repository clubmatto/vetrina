---
title: "Sub-agents: a context window you rent"
platforms:
  - linkedin
  - twitter
publish_date: 2026-11-10
topics:
  - agents
  - from-the-series
  - open-source
---

## LinkedIn

📢 New deep dive: sub-agents. 📢

A sub-agent looks like delegation. It behaves like context management.

The pitch says you brief a colleague and the answer comes back. The reality is
closer to opening a clean editor buffer: the child is the same kind of loop as
its parent, pointed at a narrower job, and the point is what never enters the
parent's context window.

We read ten open-source harnesses to see who spawns children and what the
parent gets back. The answers surprised us. Nobody's sub-agent is smarter than
its parent. Only the report travels home, never the transcript. Goose forces
every child into automatic mode, because an approval prompt with no human
watching would hang forever. Kimi CLI enforces a 200-character minimum on
reports, because a too-short summary usually skipped something.

One honest caveat: we have not run the fan-out measurement yet. Same task, one
child versus four, tokens and wall clock. The article says so too, and we
would rather publish numbers than estimates.

Read it here: https://matto.club/writing/how-coding-agents-work/sub-agents/

## Twitter

📢 A sub-agent looks like delegation. It behaves like context management.

New deep dive: who spawns children, what comes back (only the report), and
when the trick pays. Ten open-source harnesses, one thesis.

https://matto.club/writing/how-coding-agents-work/sub-agents/
