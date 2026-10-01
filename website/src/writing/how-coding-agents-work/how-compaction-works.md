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
---

Two articles ago, [Pinocchio](/writing/how-coding-agents-work/building-pinocchio/)
hit its fourth version: the conversation grew past a fixed budget, so it
summarized the first half with one extra model call and kept the recent
stuff. While building it we noticed that the ten agents in
[our shortlist](/writing/how-coding-agents-work/) use seven different
compaction strategies, and we promised to look at the details. The
[comparative analysis](/writing/how-coding-agents-work/a-comparative-analysis/)
then compressed the whole story into one sentence: drop the cheap stuff
first, keep the recent tail verbatim, and only summarize when you must.

This is the promised deep dive. Compaction is where several threads we have
been pulling meet: the [system prompt](/writing/how-coding-agents-work/the-system-prompt/)
article showed how token caching makes the front of a request a priced
object, and the comparative analysis left a promise open about what
compaction does to the session record. Both come to a head here.

## Why compaction exists at all

LLMs are stateless. Every request replays the whole conversation from zero,
and every reply only exists because the harness appended it to the messages
it sent. The conversation is the agent's only memory, and the context window
is a hard provider limit: exceed it and the API rejects the call
point-blank. There is no paging, no spilling to disk the model can read
later. What doesn't fit simply doesn't exist.

Two things make this acute for coding agents in particular:

- **Tool output is the bloat.** Every `read_file`, every test run, every
  grep lands in the conversation verbatim and stays there. A single
  unfortunate `cat` on a generated file can outweigh an hour of chat.
- **Sessions are long.** An agent that works all afternoon on one task
  accumulates hundreds of messages. Reaching the window is not an edge
  case, it's a Tuesday.

So every harness needs an answer, and the ten we read all converge on the
same skeleton before diverging on the details.

## The skeleton every harness shares

:::note[TL;DR]
Trigger before overflow, throw away cheap tokens first, keep the recent
tail verbatim, summarize what remains with a dedicated model call, and
reassemble the conversation.
:::

Strip the branding off the ten implementations and four moments remain:

1. **A trigger decides it's time.** Nothing compacts "when the context
   window fills": by then the next request would fail. Every harness
   watches a token estimate against a budget and fires well before the
   cliff.
2. **Cheap relief comes first.** Most of the bulk is old tool output, and
   tool output can be truncated or deleted without asking a model. The
   harnesses that respect your bill do this before anything else.
3. **The recent tail survives verbatim.** What the agent did in the last
   few turns is what it needs most, and no summary preserves it as well as
   the original text. Everything before the tail gets summarized.
4. **Summarization is a dedicated step.** A separate model call, with its
   own prompt, compresses the head of the conversation. This was the one
   thing all ten had in common, and the reason is mundane: only a model
   call can decide what matters.

What differs is every parameter around that skeleton: when the trigger
fires, how big the tail is, who writes the summary, what happens to the
original record, and who pays.

## The when

:::note[TL;DR]
Thresholds cluster around 0.8–0.85 of the context window. Some agents only
react to an overflow error, and one compacts before it even adds your
message to the history.
:::

The trigger is the most uniform decision in the whole pipeline:

| Agent | When it compacts |
|---|---|
| DeepSeek Harness | At 0.8 of the model's context window (`thresholdRatio`) |
| Goose | At 0.8 (`GOOSE_AUTO_COMPACT_THRESHOLD`), reactively on overflow, capped at 2 attempts |
| Kimi CLI | At ~0.85 (`compactionTriggerRatio`), or manually via `/compact` |
| Crush | When 20k tokens remain on >200k windows, or 20% on smaller ones |
| OpenCode | When overflow is detected at step finish, auto-compaction is enqueued |
| Qwen Code | On `token_limit`, detected from the API response or estimated |
| Codex | Before sampling, when the pending tokens would overflow the budget |
| Aider | In a background thread when history exceeds a small budget (1/16 of the window) |

The clustering around 0.8 is not a coincidence. The summarizer needs room
to work: the compaction call itself sends the history out and expects a
summary back, so firing at 99% would mean asking a model to summarize a
prompt that barely fits. Aider is the outlier in the other direction: its
budget is deliberately tiny because it summarizes in the background, at
leisure, while you type the next message.

The interesting split is **proactive versus reactive**. The table above is
proactive: watch the estimate, fire early. The reactive path handles the
case where the estimate was wrong. Goose caps reactive compaction at two
attempts per session, which is an honest admission that if you overflowed
twice in a row, summarizing a third time is probably not the fix. Codex has
the most defensive position of all: it compacts *pre-sampling*, before the
new user message is even added to the history, so the overflow error never
reaches the model.

## The how: seven strategies

:::note[TL;DR]
The ten agents implement seven distinct strategies, and most of them layer
several. No single trick carries the load.
:::

Here is the catalog, grounded in each implementation.

### 1. Prune before you summarize

The cheapest token is the one you never send to the summarizer. Old tool
output is enormous, replaceable (the file is still on disk), and can be
dropped with plain code:

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

### 2. Budget the tail, summarize the head

The textbook algorithm. Pick how much recent context survives verbatim,
summarize the rest:

- **OpenCode** reserves the last 25% of the usable window (capped between
  2k and 15k tokens) and splits an over-budget turn at a message boundary.
- **DeepSeek Harness** keeps 16% (`retainRatio`) and gives the summarizer
  8192 tokens to work with.
- **Kimi CLI** selects a head and a tail within a token budget, inserts an
  elision marker between them, and rebuilds the history as `[kept head,
  marker, kept tail, summary]`.
- **Pi** keeps 20k tokens of recent history with `findCutPoint()` snapping
  the cut to entry boundaries so the summary never lands mid-operation.

The ratios look arbitrary but they encode the same bet: the recent quarter
of the conversation decides what the agent does next, and the older three
quarters only need to be *recallable*, not verbatim.

### 3. Summarize everything

**Crush** is the purist: when the window fills, the whole transcript gets
summarized and the history is truncated hard at the summary message. Its
summary prompt is admirably blunt about the stakes: "This summary will be
the ONLY context available when the conversation resumes". There is no
tail-preservation, no prune. The trade is simplicity for fidelity: one
code path, and whatever the summary misses is gone. Crush then re-queues
the interrupted turn, so the agent continues from a clean slate without
dropping your request.

### 4. Use the weak model, in the background

**Aider** never compacts in your way. When its history budget (1/16 of the
window, by default) is exceeded, a background thread starts summarizing
while you keep working: it recursively splits the history into head and
tail, summarizes only the head using the *weak model* (the same cheap one
that writes its commit messages), and keeps the tail verbatim. Summarization
becomes a chore delegated to the intern, not a roadblock.

### 5. Update the summary, don't regenerate it

**Pi** is the only harness that treats the summary as a living document.
Instead of re-summarizing from scratch every time, it updates the existing
summary incrementally, in a structured format (goal, constraints, progress,
decisions, next steps, critical context), and tracks which files were read
or modified across compaction boundaries. The savings compound: a
re-summarize costs a full read of the head; an update costs roughly the
size of the summary.

### 6. Degrade instead of delete

Deleting context is irreversible, so some harnesses degrade it in stages
instead:

- **Goose** never deletes compacted messages. It flips their visibility:
  old messages stay in the session but become invisible *to the model*,
  and an agent-only continuation message stitches the tail back together.
  Your last prompt is always preserved verbatim.
- **Kimi CLI** has the most elaborate ladder we saw: oversized media first
  becomes a marker telling the model to re-read the file; if the request
  *still* fails, the markers are replaced too. Normal, degraded, stripped:
  each stage is recoverable from the one before.

This is also where the
[drift problem](/writing/how-coding-agents-work/a-comparative-analysis/)
from the comparative analysis gets interesting: a harness that degrades
instead of deleting keeps its record describing what actually happened.

### 7. Let the server do it

- **OpenHands** doesn't compact at all on the client: the agent-server has
  a condenser, the client just receives `CondensationEvent`s and renders
  them as collapsible sections in the chat.
- **Codex** ships *both*: client-side compaction and `compact_remote*.rs`
  variants that delegate to the provider, with a model fallback for when
  the summarizer model is unavailable.

Codex's dual path is worth pausing on. If the provider compacts your
context server-side, the harness's job shrinks to bookkeeping. It's the
clearest sign of where the industry is drifting: context management as a
managed service, the way caching went.

## Compaction is a model call, and model calls fail

:::note[TL;DR]
The compaction call has its own prompt, cost, latency, and failure modes.
OpenCode makes it a hidden agent; Kimi wraps it in retries and shrink
logic; Codex falls back to another model.
:::

Everything above glosses over the funniest property of the whole mechanism:
the fix for "the model call is too big" is another model call. That call
has a prompt (Qwen Code's compression prompt is a structured nine-section
state snapshot; Pi's is a rigid Goal/Constraints/Progress format; Crush's
is the "you are the only context" ultimatum), a token budget, and a
latency bill paid at the worst possible moment: right when the agent was
busy.

It also has failure modes, and the harnesses engineer for them:

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

## The cache bill

The [system prompt article](/writing/how-coding-agents-work/the-system-prompt/)
ended on a warning: compaction "is what eventually rewrites the history
and decimates the cache hit ratio". Here's why that happens.

The cached prefix covers everything up to the first differing token. A
summary lands at the *front* of the history, so after compaction the first
differing token is early and the entire rest of the conversation is
reprocessed at full price. The first request after compaction is the most
expensive request of the session, and every request until the cache warms
again pays a premium.

This turns the trigger threshold into an economic dial, not just a safety
one:

- Trigger **too eagerly** and you pay the summarizer plus a cold cache
  more often than you need to.
- Trigger **too lazily** and you risk the overflow error, which costs more
  than any summary.

DeepSeek Harness makes the mechanics visible: its derived messages carry an
incremental cache that is explicitly *invalidated by compaction
generations*. The event log keeps flowing; the cheap path restarts. This
is also why the model-free strategies of section 1 matter so much: pruning
old tool output changes tokens near the *end* of the history, which costs
nothing in cache terms, while a full summary invalidates everything.

## What compaction does to the record

:::note[TL;DR]
Compaction edits the conversation, and the conversation is the source of
truth for resume, undo and branching. Harnesses with an event log keep the
original; the others lose what the summary loses.
:::

The comparative analysis promised the concrete consequences of history
drift, and compaction is where they land. Resuming replays the record,
undo walks it backwards, branching copies it. If compaction has rewritten
the record, every one of those features operates on the squeezed version:

- **The event-sourced harnesses never lose anything.** DeepSeek Harness
  enforces "model-visible ⟺ logged" as a runtime invariant: compaction is
  a *projection* over the log, a surface replacement, and the original
  events are all still on disk. Kimi logs compaction as typed records on
  its wire log, so a resumed session rebuilds not just the messages but
  the compaction state itself. Pi records a `CompactionEntry` per squeeze.
- **The others lose what the summary loses.** Aider's markdown transcript
  drops tool messages on replay entirely. Codex keeps reasoning blobs it
  cannot rebuild. Kimi's `/undo` deliberately stops at compaction
  boundaries, because rolling back past a summary would mean resurrecting
  context the summary replaced.

The lesson generalizes beyond compaction: **the conversation the model sees
and the record the user keeps are two different things**, and the harnesses
that keep them separate recover gracefully from every squeeze. The ones
that conflate them bet their session on the quality of one summary.

## Which algorithm wins

:::note[TL;DR]
No single algorithm wins; the *pipeline* does. Prune first, keep the tail,
summarize what remains, update rather than regenerate, degrade in stages.
By implementation: Kimi is the most complete, OpenCode the most elegant,
Pi the cheapest to run, Crush the simplest and the most lossy.
:::

If we rank the strategies by how much engineering respect they earned from
us reading the code:

- **Most complete: Kimi CLI.** Trigger ratio, head/tail budget, overflow
  shrink, staged media degradation, post-compaction reinjection, deferred
  input replay. Its `FullCompaction` was the most thorough implementation
  we saw anywhere in the review. It's also the most code, and Kimi pays
  for the robustness with complexity.
- **Most elegant: OpenCode.** Prune-first relief, a properly budgeted
  tail, and compaction-as-a-hidden-agent that is testable and overridable.
  It's the design we'd copy if we were extending Pinocchio's v4 today,
  because every piece of it can be swapped without touching the loop.
- **Cheapest steady state: Pi.** Update-in-place summaries and structured
  formats mean the longer the session, the bigger the advantage over
  re-summarizing from scratch.
- **Most future-proof: Codex.** Client and server compaction side by side
  is the shape of things to come, even if the two code paths must be kept
  in sync by hand today.
- **Simplest that works: Crush.** One strategy, one prompt, hard
  truncation. It gives up the most fidelity per squeeze, but there's
  something to be said for a compaction story you can hold in your head.

The honest answer to "which algorithm wins" is that the question is a
trap. Every harness that does this well layers at least three strategies:
Goose runs threshold compaction *plus* tool-pair summarization *plus*
visibility degradation. DeepSeek Harness runs prune *plus* spill *plus*
budgeted summarization. The winning algorithm is a pipeline, and the
ordering is what matters: **cheap and reversible first, expensive and
lossy last, and never delete what you can degrade.**

Pinocchio, for the record, does exactly one of the seven: summarize the
first half at a fixed budget. That's fine for a puppet. The real agents
are what happens when "it works" meets a session that has to survive all
week.

## Conclusions

Compaction is the clearest example yet of the lesson this series keeps
running into: the hard problems are not in the loop, they are in the
edges. The trigger threshold you pick decides your cache bill. The
tail you keep decides how well the agent steers after the squeeze. The
summary format decides what your agent remembers for the rest of the
session. And whether the record and the conversation are the same file
decides how much of a long session survives a resume.

Next time we'll keep digging into the anatomy of a coding agent, one
component at a time.
