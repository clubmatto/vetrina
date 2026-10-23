---
title: "A coding agent's context window is a fridge"
platforms:
  - linkedin
  - twitter
image: https://github.com/clubmatto/vetrina/blob/main/website/src/assets/writing/the-system-prompt-cache.png
topics:
  - agents
  - ai
  - open-source
---

## LinkedIn

A coding agent's context window is like a fridge 💡.

Everything goes in and nothing comes out on its own. A system prompt, a tool
result, a decision you made three hours ago: it all stays, and it all takes up
space. At every turn you open the door and pay for what is inside, not for what
you need.

At some point you are binning leftovers to make room for the weekly
groceries.

Every harness performs the same clean-out: throw away what can be re-derived,
keep the last few turns intact, and summarize what came before. That is not
where agents differ.

What separates them is where they draw the line between cheap and expensive.
Cheap means re-derivable. The milk you can buy again, a file you can re-read, a
test run you can repeat. The stock you simmered all Sunday is not cheap, and
neither is the constraint you discovered the hard way at 4pm. Both require time
to obtain again, so you probably want to keep them as long as possible.

Drawing that line between cheap and expensive, though, is rarely a judgment
about meaning. It is usually a rule about size or age: truncate the oversized
tool result, discard the oldest entries, and let the model call, which is the
expensive step, handle what survives.

But when to do the cleanup? Some harnesses fire on a ratio and wait until the
window is about 80% full, while a few react only when a request would overflow.

Compaction is lossy over time by necessity, so the only way to keep something
available is to put it outside the session: a file, a note, the repository. The
window stays a working set, and everything the model reasons with has to be
loaded back into it, so persistence buys you durability rather than room. Keep
what matters somewhere you can re-read it, in pieces small enough to fit.

Read more about compaction on our blog: https://matto.club/writing/how-coding-agents-work/how-compaction-works/

## Twitter

### 1

A coding agent's context window is a fridge.

Everything goes in, nothing comes out on its own, and one day you are binning
leftovers to make room for the weekly groceries. Every turn you pay for what is
inside, not for what you need.

### 2

Every harness performs the same clean-out: throw away what can be re-derived,
keep the last few turns, summarize what came before.

What separates them is where they draw the line. Milk you can buy again is
cheap. Stock you simmered all Sunday is not.

### 3

Drawing that line is rarely a judgment about meaning. It is usually a rule about
size or age: truncate the oversized result, discard the oldest entries, and the
model call handles what survives.

### 4

But when to do the cleanup? Some harnesses fire on a ratio, once the window is
about 80% full. A few only react when a request would overflow.

### 5

Compaction is lossy over time. If something has to stay available, keep it
outside the session: a file, a note, the repo.

It stays a working set: what the model reasons with has to fit in it again.

https://matto.club/writing/how-coding-agents-work/how-compaction-works/
