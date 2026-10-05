---
title: "How compaction works, and which algorithm wins"
description: Every coding agent eventually runs out of context window. We
  read ten open-source agents to see how they squeeze a conversation back
  under budget. When they trigger, what they keep, what they summarize, and
  what the whole operation costs.
date: 2026-10-06
draft: true
tags:
  - ai
  - agents
series: how-coding-agents-work
image: /assets/writing/how-compaction-works.png
image_width: 2400
image_height: 1260
---

In this article of the series, we'll finally deep-dive into how compaction
works. We explained briefly in the past that compaction isn't a feature
coding agents have but an actual budget limitation models come with. So
there's no work around it. You *must* deal with context management to keep
your sessions within budget.

## Why compaction exists at all

LLMs are stateless. Every request replays the whole conversation from zero,
and every reply only exists because the harness appended it to the messages
it sent. The conversation is the agent's only memory, and the context window
is a hard provider limit: exceed it and the API rejects the call
point-blank. There is no paging, no spilling to disk the model can read
later. What doesn't fit simply doesn't exist.

Two things make this acute for coding agents in particular:

- **Tool output is the bloat.** Every `read_file`, every test run, every
  grep lands in the conversation verbatim and stays there.
- **Sessions are long.** An agent that works all afternoon on one task
  accumulates hundreds of messages. Reaching the window is not an edge
  case, it's a Tuesday.

So every harness needs an answer, and as we'll see in the article there are
many different strategies you can employ.

## Conceptually, a simple problem (but simple ain't easy)

// TODO what makes tokens cheap?

:::note[TL;DR]
Trigger before overflow, throw away cheap tokens first,
keep the recent bits of conversation, summarize what remains with a dedicated
model call, and finally reassemble the context.
:::

Four things stand out:

- **A trigger decides it's time.** Every harness
  watches a token estimate against a budget and fires well before the
  cliff. No agent compacts "when the context window fills": by then the next
  request would fail.
- **Cheap relief comes first.** Most of the bulk is old tool output,
  and tool output can be truncated or deleted as is.
- **The recent tail survives verbatim.** The most recent context is the most
  important so it stays verbatim because no summary preserves it as well as
  the original text. Everything before "the tail" gets summarized.
- **Summarization is a dedicated step.** A separate model call compresses the
  head of the conversation.

As much as this is a simple problem conceptually, there's a lot of nuance
in the when and the how compaction runs. In real world coding agents, we'll
see lots of different strategies at play.

## The when

When to trigger is the most uniform decision across agents:

// TODO in alphabetical order

| Agent                | When it compacts                                                    |
|----------------------|---------------------------------------------------------------------|
| DeepSeek Harness     | At 0.8 of the model's context window                                |
| (`thresholdRatio`)   |                                                                     |
| Goose                | At 0.8 (`GOOSE_AUTO_COMPACT_THRESHOLD`), reactively on overflow,    |
| capped at 2 attempts |                                                                     |
| Kimi CLI             | At ~0.85 (`compactionTriggerRatio`), or manually via                |
| `/compact`           |                                                                     |
| Crush                | When 20k tokens remain on >200k windows, or 20% on smaller ones     |
| OpenCode             | When overflow is detected at step finish, auto-compaction is        |
| enqueued             |                                                                     |
| Qwen Code            | On `token_limit`, detected from the API response or estimated       |
| Codex                | Before sampling, when the pending tokens would overflow the budget  |
| Aider                | In a background thread when history exceeds a small budget (1/16 of |
| the window)          |                                                                     |

Clustering around 0.8 is not a coincidence. The summarizer needs room
to work: the compaction call sends the history out and expects a
summary back, so firing at 99% would mean asking a model to summarize a
prompt that barely fits.

## The how

:::note[TL;DR]
In theory, compaction is just: keep the recent messages, summarize the rest.
In practice, most agents employ more than one strategy to compact a session.
:::

### Prune before you summarize

The cheapest token is the one you never send to the summarizer. Old tool
output is large, replaceable (the file is still on disk), and can be
dropped without LLM calls:

// TODO alphabetical order

- **OpenCode** clears old tool results once more than 40k tokens of them
  accumulate, until at least 20k are freed. No model call, no summary, the
  file stays on disk if the model needs it again.
- **DeepSeek Harness** truncates oversized tool results (head 4096, tail
  1024 chars) and *spills* anything over 50KB to a side store, leaving a
  locator behind. The conversation keeps a pointer; the bytes move out.
- **Qwen Code** calls its version *microcompaction*: old tool results and
  media become `[Old tool result content cleared]`, keeping the recent
  five, triggered by idle time or size.
- **Goose** summarizes old tool-call/result *pairs* into a chain summary.

This is the closest thing to a consensus move in the whole list: four of
the ten implement a model-free relief valve, and they all reach for it
before the expensive step.

// TODO this para and the previous one should switch so it flows more logically

### Budget the tail, summarize the head

The textbook "obvious" algorithm: Pick how much recent context survives
verbatim, summarize the rest. Here's some examples of how agents implement
this strategy:

- **OpenCode** reserves the last 25% of the usable window (capped between
  2k and 15k tokens) and splits an over-budget turn at a message boundary.
- **DeepSeek Harness** keeps 16% (`retainRatio`) and gives the summarizer
  8192 tokens to work with.
- **Kimi CLI** selects a head and a tail within a token budget, inserts an
  elision marker between them, and rebuilds the history as `[kept head,
  marker, kept tail, summary]`.
- **Pi** keeps 20k tokens of recent history with `findCutPoint()` snapping
  the cut to entry boundaries so the summary never lands mid-operation.

As you can see here, even the simplest algorithm can be implemented in
vastly different ways.

### Summarize everything

**Crush** is the purist: when the window fills, the whole transcript gets
summarized and the history is truncated hard at the summary message. Its
summary prompt is admirably blunt about the stakes: "This summary will be
the ONLY context available when the conversation resumes". There is no
tail-preservation, no prune. The trade is simplicity for fidelity: one
code path, and whatever the summary misses is gone. Crush then re-queues
the interrupted turn, so the agent continues from a clean slate without
dropping your request.

### Use a cheap model in the background

**Aider** never compacts in your way. When its history budget (1/16 of the
window, by default) is exceeded, a background thread starts summarizing
while you keep working: it recursively splits the history into head and
tail, summarizes only the head using the *weak model* (the same cheap one
that writes its commit messages), and keeps the tail verbatim.

### Always update the summary

**Pi** is the only harness that treats the summary as a living document.
Instead of re-summarizing from scratch every time, it updates the existing
summary incrementally, in a structured format (goal, constraints, progress,
decisions, next steps, critical context), and tracks which files were read
or modified across compaction boundaries.

### Degrade instead of delete

Deleting context is irreversible, so some harnesses degrade it in stages
instead:

- **Goose** never deletes compacted messages. It flips their visibility:
  old messages stay in the session but become invisible *to the model*,
  and an agent-only continuation message stitches the tail back together.
  Your last prompt is always preserved verbatim.
- **Kimi CLI** has the most elaborate ladder we saw: oversized media first
  becomes a marker telling the model to re-read the file; if the request *still*
  fails, the markers are replaced too. Normal, degraded, stripped:
  each stage is recoverable from the one before.

This is also where the
[drift problem](/writing/how-coding-agents-work/a-comparative-analysis/)
from the comparative analysis gets interesting: a harness that degrades
instead of deleting keeps its record describing what actually happened.

## Compaction is a model call, and model calls fail

:::note[TL;DR]
The compaction call has its own prompt, cost, latency, and failure modes.
Each agent has its own coping mechanisms.
:::

There's some sort of memeable lesson into compaction: the fix for "the model
call is too big" is another model call.

That call has a prompt, a token budget, and a
latency bill paid at the worst possible moment: right when the agent was
busy.

Since compaction is "just" an API call... it can fail so the harnesses take
that into account:

// TODO reorder

- **Kimi** treats compaction as a full LLM call with retry logic and
  *overflow-shrink*: if the summarizer input is itself too large, it
  shrinks it and tries again. Media gets stripped along the way.
- **Codex** has a model fallback: if the summarizer model is unavailable,
  another one takes the call. Pre- and post-compaction hooks let external
  code intercept the whole thing.
- **OpenCode** takes the most elegant architectural position: compaction
  is a *hidden agent*, with zero tools, its own prompt, and a pinned
  model. It's testable like any agent, overridable like any agent, and
  plugins can veto the auto-continue message that keeps the loop going
  after the squeeze.

The prompt design matters more than it looks. The summary is the only
survivor of everything the conversation used to be, so its format decides
what the agent "remembers" for the rest of the session. A harness that
summarizes into a state snapshot preserves intent; one that summarizes
into prose preserves vibes.

## What compaction does to the record

:::note[TL;DR]
Compaction edits the conversation, and the conversation is the source of
truth for resume, undo and branching. Harnesses with an event log keep the
original; the others lose what the summary loses.
:::

When we first did a comparative analysis of coding agents, we explained that
one big challenge of such systems is that they drift. Now, looking at how
they deal with compaction, it should be a little clearer why this happens.

No matter the approach, summarizing rewrites the history of a conversation
so a few (more advanced?) coding agents remember everything.

In our research, we found that DeepSeek Harness has the most
interesting approach. It enforces" model-visible ⟺ logged" as a runtime
invariant: compaction is
a *projection* over the log, a surface replacement, and the original
events are all still on disk. Kimi logs compaction as typed records on
its wire log, so a resumed session rebuilds not just the messages but
the compaction state itself.

The lesson generalizes beyond compaction: **the conversation the model sees
and the record the user keeps are two different things**. Te harnesses
keep them separate recover gracefully from every squeeze.

## Conclusions

Compaction is the clearest example yet of the lesson this series keeps
running into: the hard problems are not in the loop, they are in the
edges. The trigger threshold you pick decides your cache bill. The
tail you keep decides how well the agent steers after compaction runs. The
summary format decides what your agent remembers for the rest of the
session. And whether the record and the conversation are the same file
decides how much of a long session survives a resume.
