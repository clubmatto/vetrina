---
title: "How coding agents work, deep dive: Sub-agents"
description:
  A sub-agent looks like delegation and behaves like context management. We
  read ten open-source agents to see who spawns children, what the parent gets
  back, and when the trick pays for itself.
date: 2026-11-10
tags:
  - ai
  - agents
series: how-coding-agents-work
draft: true
---

A sub-agent looks like delegation. It behaves like context management.

The pitch suggests a manager handing work to a report: you brief a colleague,
the colleague goes off and does the research, and the answer comes back. The
reality is closer to opening a clean editor buffer. The child is the same kind
of loop as its parent, pointed at a narrower job, and the point of the whole
exercise is what never enters the parent's context window.

That is the thesis of this post, and it is also the answer to most of the
confusion we had before we read the ten agents in
[our comparative analysis](/writing/how-coding-agents-work/a-comparative-analysis/)
closely. A sub-agent is not a smarter agent. It is a fresh context window with
a narrower job.

## Why the trick exists

Every reason we found, across the ten harnesses, is a reason about context or
about blast radius:

- **Keep the parent's window clean.** Intermediate tool output stays in the
  child. The parent sees the report, not the forty file reads behind it.
- **Narrow the job and the tools.** A child often gets a filtered catalogue,
  frequently read-only. Crush builds its `task` agent from a separate config
  with read-only tools and a minimal prompt.
- **Run work in parallel.** Several children at once trade tokens for wall
  clock.
- **Put a cheaper model on grunt work.** Kimi CLI can bind a sub-agent to a
  secondary model, reserving the expensive one for the parent.
- **Shrink the blast radius.** A read-only child can wander without being able
  to break anything.

Notice what is not on the list: intelligence. Nobody's sub-agent is smarter
than its parent. If anything, the child knows less.

## Who decides, and who spawns

In every harness we read, the model decides and the harness spawns. The model
calls a tool: `task` in OpenCode and Crush, `Agent` in Kimi CLI, `spawn_agent`
in Codex, `delegate` in Goose's Summon extension. The harness then builds the
child with its own session, its own prompt and its own tool list, runs its
loop, and returns one thing to the parent: the final report, as a tool result.

Only the report travels back. Never the child's transcript. That single
constraint is what makes the trick work, and also where it loses information,
which we will come back to.

There are two families. A **fresh child** starts from the brief alone: clean,
cheap, ignorant. A **forked child** is seeded with the parent's turns, as in
Codex, where sub-agents are forked threads with a link to the parent. The
choice is the whole trade-off in miniature: context the child must be given
versus context it already has.

One exception charmed us. Kimi CLI has a "btw" side-channel: a lightweight
child created outside the model's decision, with tools disabled through a
deny-all permission policy, whose only job is to answer a side question from
the user without interrupting the main agent. Delegation reduced to its
smallest useful form.

## The spectrum

The ten agents do not agree on whether any of this is worth having.

| Harness | Sub-agents |
| --- | --- |
| Aider | None. The closest thing is a sequential architect/editor pipeline. |
| Pi | None. No task tool, no nested sessions. |
| Goose | One level, via the Summon extension: separate session, hard-linked to the parent. |
| OpenCode | `task` tool, plus built-in `explore` and `general` sub-agents. |
| Qwen Code | Markdown-defined agents, managed by a sub-agent manager. |
| Kimi CLI | `Agent` and `AgentSwarm` tools, foreground or background. |
| Crush | `agent` tool running a read-only `task` agent in parallel. |
| OpenHands | Off by default; enabled with a setting. |
| Codex | `spawn_agent`, forked threads, a rollout budget. |
| DeepSeek Harness | A provider registry: spawn, fork, or out-of-process children, depth capped at 3. |

Aider and Pi are minimal by design, and their absence is an argument: if your
loop is tight and your sessions are short, you may not need children at all.
Aider's substitute is telling. Its architect mode has a strong model produce a
plan, then synchronously starts a new coder on that plan. Two agents in
sequence, no parallelism, no swarms. Delegation without the machinery.

## The four dials

Where harnesses differ is in what a parent can tune:

**Foreground or background.** Kimi CLI's children either block the parent's
turn or detach and get polled later. Codex's `followup_task` is the same idea
with a different name.

**Isolation.** Fresh or forked, as above. DeepSeek Harness makes this a
registry choice per spawn: in-process children, or out-of-process backends
including Claude Code and Codex itself.

**Depth.** A child spawning a child spawning a child is how a session eats a
machine. DeepSeek Harness caps delegation depth at three and persists the
accounting in the session header.

**Permissions.** Here is our favorite detail in the whole survey. Goose forces
every sub-agent into its automatic mode regardless of the parent's setting,
and the code explains why: an approval prompt with no human watching would
hang forever. A child cannot ask the user anything. Permission systems, which
we took apart [in the previous post](/writing/how-coding-agents-work/permissions/),
silently degrade the moment delegation enters.

## What the child costs

The bill has more lines on it than most pitches admit:

- the brief you write for the child,
- the child's own baseline: system prompt and tool catalogue, paid whatever
  the size of the job,
- the child's loop itself,
- the report, and
- the verification, because a lossy report should be checked.

The child also starts a cold prefix. The parent's prompt cache, whatever it
has accumulated over the session, does not follow it in. And fan-out
multiplies the baseline per child, which is the trap: five sub-agents on a
one-line question each is five baselines for five answers the parent could
have produced in one turn.

The harnesses know. Codex gives spawned agents a rollout budget. Kimi CLI
enforces a 200-character minimum on sub-agent summaries, and if the child
turns in something shorter, it gets one more turn to expand it. Our reading of
that rule: reports that are too short are usually reports that skipped
something.

These are mechanics, not measurements. We have not yet run the fan-out
experiment (same task, one child versus two versus four, tokens and wall
clock), and we would rather publish those numbers than estimate them.

## The turn

Halfway through this survey we noticed we had stopped thinking about
sub-agents as small managers and started thinking about them as garbage
collection for context. The vocabulary of the implementations agrees. The
child does not know what the parent knows, so a good brief duplicates the
context it needs. The report is lossy, so the parent must decide how much to
trust it. The child cannot ask a question, so ambiguity becomes guessing.

Delegation, in a human team, exists to add capability. Here it exists to
subtract context. Once you read it that way, the design decisions stop looking
arbitrary: the depth caps, the read-only catalogues, the forced automatic
mode, the summary minimums. All of them are containment for a thing whose
purpose is containment.

## When to spawn one

Delegate when the parent work avoided is bigger than the bill: brief, child
baseline, loop, report, verification. In practice that means long,
self-contained, narrow work. Exploration pays: "find every caller of this
function and summarize why they call it" is forty tool results the parent
never has to see. One-line questions lose. And if the parent has to hand over
most of its own context for the child to function, the fresh window has
bought nothing.

Which is the thesis again, from the other side: a sub-agent is a context
window you rent. Rent it when the mess would otherwise be yours.
