---
title: "How coding agents work, deep dive: Sub-agents"
description:
  A sub-agent looks like delegation and behaves like context management. We
  read ten open-source agents to see who spawns sub-agents, what the parent gets
  back, and when the trick pays for itself.
date: 2026-11-10
tags:
  - ai
  - agents
series: how-coding-agents-work
image: /assets/writing/sub-agents-report-only.png
image_width: 2400
image_height: 1260
---

A sub-agent looks like delegation but it behaves like context management.

You may think of sub-agent workflows like a manager handing work to a report:
you brief a colleague, the colleague goes off and does the research, and the
answer comes back.

The reality is closer to opening a clean editor buffer: the sub-agent is the
same kind of loop as its parent, pointed at a narrower job, and the point is
the sub-agent often has no access to the parent's context window.

In short, this is what we learned: a sub-agent is not a smarter agent. It is
"just" a fresh context window with a narrower job. Now let's look at the details.

## Why a fresh context?

Every harness in our shortlist spawns sub-agents for reasons mostly related to
context management:

- **Keep the parent's window clean.** Intermediate tool output stays in the
  sub-agent. The parent agent sees the end results, not the forty file reads
  that the sub-agent needed to get there.
- **Narrow the job and the tools.** A sub-agent often gets a filtered catalogue,
  frequently read-only. Crush builds its `task` agent from a separate config
  with read-only tools and a minimal prompt.
- **Run work in parallel.** Several sub-agents at once trade tokens for wall
  clock.
- **Put a cheaper model on grunt work.** Kimi CLI can bind a sub-agent to a
  secondary model, reserving the expensive one for the parent.
- **Shrink the blast radius.** A read-only sub-agent can wander without being
  able to break anything.

Notice what is not on the list: intelligence. Nobody's sub-agent is smarter
than its parent. If anything, the sub-agent often knows less (which arguably
makes it dumber).

## Who decides, and who spawns

In every harness we read, the model decides and the harness spawns. The model
calls a tool: `task` in OpenCode and Crush, `Agent` in Kimi CLI, `spawn_agent`
in Codex, `delegate` in Goose's Summon extension. The harness then builds the
sub-agent with its own session, its own prompt and its own tool list, runs its
loop, and returns one thing to the parent: the final report, as a tool result.

Only the report travels back. Never the sub-agent's full session transcript.
That single constraint is what makes the trick work. Of course it's a lossy
trick, more on this in a moment.

Not all sub-agents start completely fresh, though. There are in fact two
approaches:

- A **fresh sub-agent** starts from the brief alone: clean, cheap, ignorant.
- A **forked sub-agent** is seeded with the parent's turns, as in
  Codex, where sub-agents are forked threads with a link to the parent. The
  choice is the whole trade-off in miniature: context the sub-agent must be
  given versus context it already has.

One exception charmed us. Kimi CLI has a "btw" side-channel: a lightweight
sub-agent created outside the model's decision, with tools disabled through a
deny-all permission policy, whose only job is to answer a side question from
the user without interrupting the main agent. Delegation reduced to its
smallest useful form.

## The spectrum

The ten agents do not agree on whether any of this is worth having.

| Harness          | Sub-agents                                                                        |
| ---------------- | --------------------------------------------------------------------------------- |
| Aider            | None. The closest thing is a sequential architect/editor pipeline.                |
| Pi               | None. No task tool, no nested sessions.                                           |
| OpenHands        | Off by default; enabled with a setting.                                           |
| Goose            | One level, via the Summon extension: separate session, hard-linked to the parent. |
| OpenCode         | `task` tool, plus built-in `explore` and `general` sub-agents.                    |
| Crush            | `agent` tool running a read-only `task` agent in parallel.                        |
| Qwen Code        | Markdown-defined agents, managed by a sub-agent manager.                          |
| Kimi CLI         | `Agent` and `AgentSwarm` tools, foreground or background.                         |
| Codex            | `spawn_agent`, forked threads, a rollout budget.                                  |
| DeepSeek Harness | A provider registry: spawn, fork, or external one-shot backends; depth default 1. |

Aider and Pi are minimal by design, and their absence stems directly from
their philosophy: if your loop is tight and your sessions are short, you may not
need sub-agents at all. Aider's substitute is telling. Its architect mode has a
strong model produce a plan, then synchronously starts a new coder on that plan.
Two agents in sequence, no parallelism, no swarms. Delegation without the machinery.

## The four dials

We found four core differences in how harnesses tune their sub-agents:

- **Foreground or background.** Kimi CLI's sub-agents either block the parent's
  turn or detach and get polled later. Codex's `followup_task` is the same idea
  with a different name.
- **Isolation.** Fresh or forked, as above. DeepSeek Harness is a provider
  registry: each delegation tool is bound to one backend, so a deployment can
  expose spawn and fork in-process, or ACP, DSH SDK, Codex, and Claude Code as
  external one-shot providers. Codex and Claude Code are optional bundles, and
  each run gets a fresh process.
- **Depth.** A sub-agent spawning another sub-agent, which spawns another,
  is how a session eats a machine. DeepSeek Harness defaults to one level and
  lets each tool raise the cap; external providers can manage their own budget.
- **Permissions.** Here is our favorite detail in the research. Goose
  forces every sub-agent into its automatic mode regardless of the parent's
  setting, and the code explains why: an approval prompt with no human
  watching would hang forever. A sub-agent cannot ask the user anything.
  Permission systems, which we took apart
  [in the previous post](/writing/how-coding-agents-work/permissions/),
  silently degrade the moment delegation enters.

## How much does spawning cost?

The bill has more lines on it than you'd probably guess:

- The brief the harness writes for the sub-agent
- The sub-agent's own token baseline: system prompt and tool catalogue, paid
  whatever the size of the job
- The sub-agent's loop itself, of course
- The output report
- The verification its parent does, because a lossy report must be checked

The sub-agent also starts without the parent's prefix. The parent's prompt
cache, whatever it has accumulated over the session, does not follow it in.
And fan-out multiplies the baseline per sub-agent, which is the main trap:
five sub-agents on a one-line question, and you can see how quickly things add
up.

The harnesses know this and budget for it: Codex gives spawned agents a
rollout budget. Kimi CLI enforces a 200-character minimum on sub-agent
summaries, and if the sub-agent turns in something shorter, it gets one more
turn to expand it. Our reading of that rule: reports that are too short are
usually reports that skipped something.

These are mechanics, so we ran a small experiment to get a sense of the bill.
We reused the rename task from the
[tools experiment](/writing/how-coding-agents-work/tools/), copied it across
four identical services, and had Qwen Code delegate it to one, two, or four
fresh sub-agents. Each configuration ran once on DeepSeek's `deepseek-flash`;
all three produced the correct rename.

<div class="agent-table-wrapper">
  <table class="agent-table agent-table--rows">
    <thead>
      <tr>
        <th></th>
        <th>1 sub-agent</th>
        <th>2 sub-agents</th>
        <th>4 sub-agents</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="agent-name">Input tokens</td>
        <td class="nw" data-label="1 sub-agent">477,782</td>
        <td class="nw" data-label="2 sub-agents">671,972</td>
        <td class="nw" data-label="4 sub-agents">826,825</td>
      </tr>
      <tr>
        <td class="agent-name">Cache reads</td>
        <td class="nw" data-label="1 sub-agent">94%</td>
        <td class="nw" data-label="2 sub-agents">95%</td>
        <td class="nw" data-label="4 sub-agents">96%</td>
      </tr>
      <tr>
        <td class="agent-name">Uncached input</td>
        <td class="nw" data-label="1 sub-agent">26,838</td>
        <td class="nw" data-label="2 sub-agents">33,636</td>
        <td class="nw" data-label="4 sub-agents">36,425</td>
      </tr>
      <tr>
        <td class="agent-name">Output tokens</td>
        <td class="nw" data-label="1 sub-agent">14,521</td>
        <td class="nw" data-label="2 sub-agents">20,004</td>
        <td class="nw" data-label="4 sub-agents">24,570</td>
      </tr>
      <tr>
        <td class="agent-name">Wall clock</td>
        <td class="nw" data-label="1 sub-agent">82.2s</td>
        <td class="nw" data-label="2 sub-agents">75.9s</td>
        <td class="nw" data-label="4 sub-agents">71.2s</td>
      </tr>
      <tr>
        <td class="agent-name">Rename correct</td>
        <td class="nw" data-label="1 sub-agent">yes</td>
        <td class="nw" data-label="2 sub-agents">yes</td>
        <td class="nw" data-label="4 sub-agents">yes</td>
      </tr>
    </tbody>
  </table>
</div>

Four sub-agents cost 73% more input and 69% more output than one, and saved
13% of the wall clock. The input bill is not 4x because 96% of it was cache
reads: each sub-agent pays the same system prompt and tool catalogue on every
turn, and the provider caches that repeated prefix even though the parent's
conversation does not follow it in. Uncached input grew 36%. That is the
fan-out tax on a small task. One run per configuration, one harness, one task,
so read the timings as a signpost, not a benchmark. The crossover for long
work is still the open question. The harness is
[in the repository](https://github.com/clubmatto/vetrina/tree/main/website/src/writing/how-coding-agents-work/experiments/fanout).

## The turn

Halfway through this research we noticed we had stopped thinking about
sub-agents as small managers and started thinking about them as garbage
collection for context. The vocabulary of the implementations helped us see
things this way. The sub-agent does not know what the parent knows, so a good
brief duplicates the context it needs. The report is lossy, so the parent must
decide how much to trust it. A sub-agent cannot ask a question, so ambiguity
becomes guessing.

Delegation, in a human team, exists to add capability. Here it exists to
subtract context, so to speak. Once you read it that way, the design decisions
stop looking arbitrary: the depth caps, the read-only catalogues, the forced
automatic mode, the summary minimums. All of them are containment for a thing
whose purpose is containment. So it feels a lot like garbage collection for
context.

## When to spawn one

Delegate when the parent work avoided is bigger than the bill: brief, sub-agent
baseline, loop, report, verification. In practice that means long,
self-contained, narrow work. Exploration pays: "find every caller of this
function and summarize why they call it" is forty tool results the parent
never has to see. One-line questions lose. And if the parent has to hand over
most of its own context for the sub-agent to function, the fresh window has
bought nothing.

Which is the thesis again, from the other side: a sub-agent is a context
window you rent. Rent it when the mess would otherwise be yours.
