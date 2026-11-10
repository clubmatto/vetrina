---
title: "Sub-agents: a context window you rent"
platforms:
  - linkedin
  - twitter
publish_date: 2026-11-10
image: https://github.com/clubmatto/vetrina/blob/main/website/src/assets/writing/sub-agents.png
topics:
  - agents
  - from-the-series
  - open-source
---

## LinkedIn

📢 New deep dive: sub-agents. 📢

A sub-agent looks like delegation but behaves like context management.

You may think of it like a manager handing work to a report: you brief a
colleague, they do the research, and the answer comes back. The reality is
closer to opening a clean editor buffer: the sub-agent is the same kind of loop
as its parent, pointed at a narrower job. The point is what the parent never
has to see.

In short, it is not a smarter agent. It is a fresh context window with a
narrower job, and if anything, it often knows less (which arguably makes it
dumber).

We read ten open-source harnesses to see who spawns sub-agents and what comes
back. Only the report travels back, never the full transcript. Some start from
the brief; Codex forks the parent's turns.

Harnesses differ on four dials: foreground or background, isolation, depth, and
permissions. Our favorite: Goose forces every sub-agent into automatic
mode, because an approval prompt with no human watching would hang forever.

One small experiment: the same rename task with one, two, or four sub-agents.
Four cost 73% more input and 69% more output, and saved 13% of the wall clock.
The article has the table and the caveats.

Read it here: https://matto.club/writing/how-coding-agents-work/sub-agents/

## Twitter

📢 A sub-agent looks like delegation. It behaves like context management. 📢

New deep dive: who spawns sub-agents, what comes back (only the report), and
when the trick pays. Ten open-source harnesses, one thesis.

https://matto.club/writing/how-coding-agents-work/sub-agents/
