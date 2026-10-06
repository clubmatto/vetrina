---
title: "How coding agents work, deep dive: Compaction"
description: Every coding agent eventually runs out of context. We
  read ten open-source agents to see how they squeeze a conversation back
  under budget. When they trigger, what they keep, what they summarize, and
  what the whole operation costs.
date: 2026-10-06
tags:
  - ai
  - agents
series: how-coding-agents-work
image: /assets/writing/how-compaction-works.png
image_width: 2400
image_height: 1260
---

This installment is the deep dive on compaction we promised in [the comparative
analysis](/writing/how-coding-agents-work/a-comparative-analysis/). That article
covered the shape of it; here is how the ten actually do it.

Compaction is interesting because it's not a feature coding agents choose to
have. The context window is a budget limitation models come with. There's no
workaround: you _must_ deal with context management to keep your sessions
within budget. Before we get to the how, the why.

## Why compaction exists at all

LLMs are stateless. Every API request to the LLM provider replays the whole
conversation from zero: the harness appends the whole session to every request
it sends. The conversation is the agent's only memory and the context window is
a hard provider limit: exceed it and the API rejects the call point-blank.
There is no paging, no spilling to disk the model can read later. What doesn't
fit won't get processed.

Two things make this limitation sharper for coding agents:

- **Tool output is the bloat.** Every `read_file`, every test run, every
  grep lands in the conversation verbatim and stays there.
- **Sessions are long.** An agent that works all afternoon on one task
  accumulates hundreds of messages. Reaching the window is not an edge
  case, it's a Tuesday.

So every harness needs an answer, and the answers mix a handful of moves.

## Conceptually, a simple problem (but simple ain't easy)

:::note[TL;DR]
Trigger before overflow, keep the recent bits of conversation, summarize what
remains with a dedicated model call, and finally reassemble the context.
:::

Let's break this down a bit:

- **A trigger decides it's time.** Every harness
  watches a token estimate against a budget and fires well before the
  cliff. No agent compacts "when the context window fills": by then the next
  request would fail.
- **The recent tail survives verbatim.** The most recent context matters
  most, and no summary preserves it as well as the original text.
- **Summarization is a dedicated step.** A separate model call compresses the
  head of the conversation.

Simple conceptually, but there is a lot of nuance in when and how compaction
runs. In real agents, both the when and the how have lots of settings and
variety in the implementation so let's dig deeper.

## The when

When to trigger is the most uniform decision across agents:

| Agent            | When it compacts                                                                      |
|------------------|---------------------------------------------------------------------------------------|
| Aider            | In a background thread when history exceeds a small budget (1/16 of the window)       |
| Codex            | Before sampling, when the pending tokens would overflow the budget                    |
| Crush            | When 20k tokens remain on >200k windows, or 20% on smaller ones                       |
| DeepSeek Harness | At 0.8 of the model's context window (`thresholdRatio`)                               |
| Goose            | At 0.8 (`GOOSE_AUTO_COMPACT_THRESHOLD`), reactively on overflow, capped at 2 attempts |
| Kimi Code CLI    | At ~0.85 (`compactionTriggerRatio`), or manually via `/compact`                       |
| OpenCode         | When overflow is detected at step finish; auto-compaction is enqueued                 |
| OpenHands        | When the event stream exceeds a fixed event count (`max_size`), checked every step    |
| Qwen Code        | On `token_limit`, detected from the API response or estimated                         |

Not every agent fires on a ratio. Codex checks the budget before every model
call, OpenCode waits for an actual overflow and reacts, OpenHands counts events
instead of tokens. The majority curates the budget ahead of time; the minority
treats compaction as emergency response. That split, curate versus react, is
the first real difference between these agents, and it won't be the last.

Clustering around 0.8 is not a coincidence, and it's not the only tradeoff
hiding in the trigger. The summarizer needs room to work: the compaction call
sends the history out and expects a summary back, so firing at 99% would mean
asking a model to summarize a prompt that barely fits. There's also a cache
bill to consider. The API replays the whole conversation on every request,
and providers cache long prefixes and bill them cheaper. A compacted context
is a brand-new prefix: every squeeze throws the cache away. Fire too eagerly
and you pay that bill over and over. Fire too late and the next request
fails.

The "when" is interesting also from a user perspective: most harnesses
summarize in the foreground, stalling the session while the call runs. But
some agents, like Aider, never compact in your way: a background thread
summarizes while you keep working.

We also like **OpenCode**'s approach. It makes the summarizer a _hidden
agent_: zero tools, its own prompt, a pinned model. That makes compaction
testable and overridable like any other agent.

Now that we know when agents decide it's time to compact, we can look at how
they actually do it.

## The how

As we said, the algorithm is conceptually simple: free what you can afford to
lose, keep the recent tail, summarize the rest. Every agent runs
that same pass and brings its own answers to each step.

### Free the cheap stuff first

Not all tokens cost the same to keep. What makes a token cheap is whether you
can re-derive it. A file's content is cheap: the file is still on disk. A test
run is cheap: you can run it again. What the user asked for, the decisions made
along the way, the constraints discovered the hard way: nothing can regenerate
those, so they stay expensive no matter how old they are. Compaction strategies
often exploit this difference: handle the cheap tokens with deletion and spend
the model call on the expensive ones.

Lots of agents make a coarse assessment of the context so they can throw away
the cheap tokens without too much finesse. Here are a few examples:

- **DeepSeek Harness** truncates oversized tool results (head 4096, tail 1024
  chars) and spills anything over 50KB to a side store, leaving a locator
  behind.
- **Goose** compresses old tool-call/result pairs into a chain summary, the one
  relief here that is not model-free.
- **OpenCode** clears old tool results once more than 40k tokens of them
  accumulate, until at least 20k have been freed.
- **Qwen Code** calls its version _microcompaction_: old tool results and media
  become `[Old tool result content cleared]`, keeping the recent five.

### Keep the tail verbatim

Keeping the recent tail is the closest thing to a consensus move in the whole
article: Crush is the only harness we saw skipping it. The most recent context is
the most important part of the conversation, and no summary preserves it as
well as the original text, so it stays. What differs is how much survives and
where the cut lands:

- **DeepSeek Harness** keeps 16% of the window (`retainRatio`) and gives the
  summarizer 8192 tokens to work with.
- **OpenCode** reserves the last 25% of the usable window (capped between 2k
  and 15k tokens) and splits an over-budget turn at a message boundary.
- **Pi** keeps 20k tokens, with `findCutPoint()` snapping the cut to entry
  boundaries so the summary never lands mid-operation.
- **Kimi CLI** keeps a head and a tail within a token budget and puts an
  elision marker between them.
- **OpenHands** keeps the first events and the recent tail.

### Summarize the rest

Everything that is still there after the coarse cuts goes to a summarizer: a
dedicated model call, with its own prompt and its own budget, whose output
replaces the head of the conversation. The operation is lossy by construction: a
summary cannot keep everything, and deleting context is irreversible.

What the summary looks like is where the design philosophies part ways. Here
are a couple of example that highlight how far you can go in either direction:

- **Pi** treats the summary as a living document. Instead of re-summarizing from
  scratch every time, it updates the existing summary incrementally, in a
  structured format (goal, constraints, progress, decisions, next steps,
  critical context), and it tracks which files were read or modified across
  compaction boundaries.
- **Crush** makes the whole transcript become one prose dump, guided by a prompt
  admirably blunt about the stakes ("This summary
  will be the ONLY context available when the conversation resumes").

The prompt design matters more than it looks, because the summary is the only
survivor of everything the conversation used to be. Its format decides what the
agent remembers for the rest of the session.

## What compaction does to the record

:::note[TL;DR]
Compaction edits the conversation, and the conversation is the source of
truth for resume, undo and branching. Harnesses with an event log keep the
original; the others lose what the summary loses.
:::

Summarizing rewrites the history of a conversation, which is where the drift we
described in the
[comparative analysis](/writing/how-coding-agents-work/a-comparative-analysis/)
becomes concrete: the record stops describing what actually happened.

No matter the approach, the rewrite is lossy. A few coding agents refuse to
accept that and keep the original record around.

DeepSeek Harness has the most interesting approach. It enforces "model-visible
⟺ logged" as a runtime invariant: compaction is a _projection_ over the log, a
surface replacement, and the original events are all still on disk.

Kimi Code CLI logs compaction as typed records on its wire log, so a resumed
session rebuilds not just the messages but the compaction state itself.

The lesson generalizes beyond compaction: **the conversation the model sees
and the record the user keeps are two different things**. The harnesses
that keep them separate recover gracefully from every squeeze.

## Compaction is a model call, and model calls fail

:::note[TL;DR]
The compaction call has its own prompt, cost, latency, and failure modes. Each
agent has its own coping mechanisms.
:::

There's a memeable lesson in compaction: the fix for "the model call is too
big" is another model call.

That call has a prompt, a token budget, and a latency bill paid at the worst
possible moment: right when the agent was busy. The cost is real. You pay to
send the history to the summarizer, you pay again for the summary that comes
back, and the session stalls while both happen.

Since compaction is "just" an API call, it can fail. The harnesses account for
that:

- **Codex** has a model fallback: if the summarizer model is unavailable,
  another one takes the call. Pre- and post-compaction hooks let external
  code intercept the whole thing.
- **Kimi Code CLI** treats compaction as a full LLM call with retry logic and
  _overflow-shrink_: if the summarizer input is itself too large, it
  shrinks it and tries again.
- **OpenCode** lets plugins veto the auto-continue message that keeps the loop
  going after the squeeze, so a bad summary doesn't silently drive the next
  turn.

## So which one wins?

By now the uncomfortable answer should be visible: no algorithm wins,
because the algorithm is not where the differences are. The quantitative
choices all converge. Most fire early, everyone reaches for cheaper relief
before the expensive step, almost everyone keeps a tail and summarizes the
head. You could probably swap one agent's compaction into another and you
wouldn't notice too much (maybe worth a real test, actually).

The differences that survive contact with a long session are qualitative:

- **What the summary preserves.** Pi writes a state snapshot that keeps
  updating; Crush writes one prose dump. Both get a summary of course but
  the output will look _and_ feel very different.
- **Whether the squeeze is recoverable.** Kimi Code CLI degrades in stages; Crush
  truncates hard and whatever the summary missed is gone.
- **Whether the record survives.** DeepSeek Harness treats compaction as a
  projection over a log it keeps; most harnesses edit the history in place,
  and the rewrite _is_ the history.

The thresholds and the budgets are settings. These three choices are
design decisions about what a harness thinks a conversation is: a plan to
keep, a transcript to compress, or a log to project. That's where coding
agents qualitatively differ: not in the math, in the philosophy.

## Conclusions

Compaction is the clearest example yet of the lesson this series keeps
hitting: the hard problems are not in the loop, they are in the edges.

We also hope that it's clear by now that such a wide spectrum of strategies
means coding agents stay within the same budget in vastly different ways, and
those differences are exactly what the end user feels. Which is why we
encourage you to test agents often and come to your own conclusions.

Read the series from the start:
[how coding agents work](/writing/how-coding-agents-work/).
