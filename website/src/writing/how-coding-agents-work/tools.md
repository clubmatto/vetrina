---
title: "How coding agents work, deep dive: Tools"
description: Every coding agent's capability is its tool list. We read ten
  open-source agents to see how they declare tools, what that costs in context,
  and why there is no single right answer.
date: 2026-10-13
draft: true
tags:
  - ai
  - agents
series: how-coding-agents-work
---

We started this series by shortlisting [ten open-source coding
agents](/writing/how-coding-agents-work/), then we built
[Pinocchio](/writing/how-coding-agents-work/building-pinocchio/) to find the
anatomy they share. We have since taken the [system
prompt](/writing/how-coding-agents-work/the-system-prompt/) apart, and how
[compaction](/writing/how-coding-agents-work/how-compaction-works/) works. This
piece is about tool calls, which is where an agent's agency actually lives. Take
the tools away and you are left with a chat model and a terminal.

## The tradeoff, stated plainly

Tools cost context, and they cost it twice.

The first cost is the declaration. Every tool the model can see is a name, a
description and a parameter schema sitting in the prompt, and the prompt goes out
again on every turn. A catalogue of thirty tools is a permanent tax on every
request, whether the model uses them or not.

The second cost is the result. A tool call returns content into the conversation,
and the conversation is what the next turn reads back. One careless search over a
large repository can fill the window you needed for the actual task.

So the design question is not "which tools should the agent have". It is how much
of the model's window we spend telling it what it *could* do, against the window
it needs to do what we asked.

There is no right answer here, and that is the point of this piece. A rename
across four file types and a semantic lookup in a large codebase want different
surfaces, and the same configuration can be wrong for one and right for the
other. What follows is the space, the two ends of it, and the tricks harnesses
invent to work around the cost without giving up the capability.

## What a tool is

Every harness in our shortlist agrees on the shape, and the shape has five parts.

**Declaration.** A name, a description and a parameter schema, sent in the
prompt. The extras differ. Some harnesses attach a per-tool output cap and a
truncation strategy, some an execution mode that says whether the tool may run
alongside others, and some a category the permission layer reads.

**Call.** The model answers with a tool name and a JSON argument object. Because
replies arrive as typed parts rather than one block of text, an agent can act in
the middle of a reply instead of waiting for it to finish.

**Dispatch.** The harness inspects the call before anything runs. Is this
allowed, does it need approval, does it need a timeout, does a guard deny it
outright. This layer is what makes a tool call a proposal rather than an action.

**Execution.** Native code inside the harness, a subprocess, a remote server over
a protocol, or a program the model wrote.

**Result.** Content plus metadata, truncated to a budget the harness chose, then
appended to the conversation.

Two of those five touch the model. The declaration lives in the prompt, and the
call plus its result live in the conversation. Everything else belongs to the
harness, and that is where permission, truncation, concurrency and caching are
decided.

One consequence is worth stating, because it is the difference between a tool and
a prompt. A rule in a system prompt is a preference, and the model may ignore it.
A tool call is validated. If the model invents a tool name, or sends arguments
that do not match the schema, the harness refuses to run it. The tool list is the
one part of an agent where capability is enforced rather than requested.

## The spectrum of declaration

Harnesses sit all over the place, and the spread is wider than we expected.

| Surface | Harnesses | What the model sees |
|---|---|---|
| One general tool | bash-only setups, DeepSeek Harness in Code Mode | a shell, or a single code tool plus a generated SDK document |
| No tools at all | Aider | edit formats: search and replace blocks, unified diffs, whole file rewrites |
| A small curated set | Pi, Goose, OpenHands | four to eight tools. Goose ships no `read` and no `grep` on purpose |
| A large catalogue | Crush, OpenCode, Codex, Qwen | roughly fifteen to thirty tools, plus MCP servers and plugins |

Aider is the interesting outsider. It has no tool registry at all. The model
emits a textual edit protocol and the harness parses it, which is the same job as
a tool call with none of the structure. Its shell access works the same way: a
fenced code block in the reply is a request to run something.

The two ends buy different things, and both pay for them.

A large granular catalogue buys legibility. Each action is a small typed request,
so the harness can validate it, gate it per tool, ask for approval on the
dangerous ones and leave the read-only ones alone. It also buys guardrails that
the model cannot skip: a read-before-edit rule is enforceable when reading and
editing are separate tools, and it is only a suggestion when a single shell
command does both.

It pays in prefix tokens on every turn, in round trips, and in context noise, because
each result is a message that stays in the conversation.

One general tool buys the opposite. A tiny prefix, one round trip for work that
would take several calls otherwise, no intermediate results in the window, and
complete freedom of composition. It pays in validation, because the harness can
only see that a program ran; in permission granularity, because allow or deny now
applies to the shell as a whole; in feedback, because there is nothing to inspect
until the command finishes; and in blast radius, because a mistake lands
everywhere at once.

## The two tasks we compare

We wanted numbers rather than opinions, so we designed two tasks with a trap
each. The traps matter more than the tasks.

**Task A, the rename.** Rename the configuration key `DB_HOST` to
`DATABASE_HOST` across a compose file, a Terraform file, a `.env` file and some
documentation. The repository also contains `DB_HOST_OLD`, which must not be
touched. The trap punishes regex overreach: the shell answer is a one line `rg`
and `sed`, and a slightly wrong pattern silently rewrites the wrong key.

**Task B, the lookup.** Answer which functions call `getUserById`, in a
repository where that name exists in two modules and also appears in comments and
documentation. The trap punishes text search's false positives: `rg` returns
every mention, real call site or not, and something has to disambiguate them.

The two tasks point in opposite directions. On A, the shell pole is cheap and one
mistake from being wrong, while the granular pole pays in context for edits it can
review one file at a time. On B, the shell pole spends turns sifting hits, while a
single reference lookup answers precisely.

We are deliberately not claiming that the shell *cannot* do either task. It can
approximate both. The question is what each approach costs in turns and tokens,
and what it does to the odds of getting the right answer.

## How we measure it

Running this comparison across different products would prove nothing, since
their loops, prompts and caching all differ. So we hold everything constant but
the tool surface, and use one harness for both tasks: Qwen Code, pointed at the
same DeepSeek model we use every day.

That harness can be configured into the three surfaces we care about:

| Mode | Configuration | What the model sees |
|---|---|---|
| Bash only | whole-tool deny rules for everything except the shell | one general tool |
| All declared | every tool listed as eager | the whole catalogue, upfront |
| On demand | the eager list left empty | the core tools, with the rest behind a tool search |

The second and third modes are the same catalogue with different visibility,
which is what makes the pair interesting: same tools, same capability, different
bill. For task B the specialized tool is the harness's own language server
integration, which is why we picked this harness over the others.

Per run we record the model turns, the tool calls, input, output and cached
tokens, wall clock, and whether the trap survived. Latency we report as a
function of turns rather than as a measured time, because provider latency
dominates it.

<!-- RESULTS PENDING
We run both tasks in all three modes and fill this in. Nothing in the argument
depends on the direction of the numbers, but the article should not ship without
them.
-->

## Progressive disclosure, by break-even

Hiding tools behind a search sounds like a free win. It is not, and the reason is
arithmetic rather than taste.

Hiding a set of tools saves S tokens of schema in the prefix, on every turn.
Discovering a tool costs one extra turn, carrying D tokens of request and
response. So hiding pays off once a session runs longer than D/S turns.

Both numbers are easy to obtain without running an agent. You can count the
schema tokens of a real tool catalogue, and you can read the size of a discovery
call from any log. As an illustration, if hiding forty tools saves a few thousand
tokens per turn and a discovery turn costs a few hundred, the trade pays off
somewhere around the sixth turn of a session. Short sessions lose, long ones win.

There is a second-order effect that flips part of this. If the prefix is cached,
those S tokens are billed at the cached rate, which moves the break-even further
out. A long, warm, cached session is exactly the case where revealing tools late
saves the least, because the thing you are saving was already cheap.

That is why harnesses carrying large MCP surfaces hide tools and small ones do
not. It is also why the all-or-nothing reveal exists in the harnesses that do:
if you are going to invalidate your cached prefix by adding schemas to it, you
may as well add all of them at once.

## Can you get away from bash?

No. Every harness ships a general tool, and it is the fallback whenever the
catalogue misses. What you choose is its role.

**Escape hatch.** Most harnesses take this route: specialized tools for the
common cases, a shell for everything else. The model reaches for the shell when
nothing else fits.

**Substrate.** Goose inverts it. It ships no `read` and no `grep` on purpose, and
the prompt tells the model to use `cat`, `sed` and `rg` through the shell
instead. The instruction is the tool.

Once the shell is the substrate, granularity has to be rebuilt inside it. Crush
bans a list of commands outright and auto-approves the ones it trusts, which is
command line pattern matching standing in for per-tool permissions. The approval
prompt degrades in the same way: "edit this file" becomes "run this program".

There are two ways out that are not a shell. You can grow the catalogue at
runtime, usually through MCP, which we come back to below. Or you can let the
model write a program, which is what DeepSeek Harness does in Code Mode: one code
tool, a generated SDK document describing the available operations, and the model
composes the call it needs. The prefix stays small and the composition stays
expressive, but the harness can no longer see the intent inside the program.

## Performance: file search is the clearest case

Search is where the trade shows up first, and it is worth walking through because
everyone has an intuition about it.

Bash plus `rg` answers a search in one round trip with full composition: filter,
count, sort, pipe. The catch is that the output is unbounded unless the model
shapes it. One naive repository-wide search can put thousands of lines into the
window, and nothing stops it except the model remembering to pipe through `head`.

A specialized search tool is also one round trip, but the harness runs it, returns
structured matches and applies its own truncation budget. The context cost is
bounded by design, and it does not depend on the model doing the right thing under
pressure.

The granular path costs more turns and buys a different thing: glob to find
candidates, grep to narrow, read to inspect. Several round trips for what one
pipeline answers, in exchange for every step being visible and gated.

Specialized search can also do what text search cannot. A language server or an
index answers "who references this symbol" with types and scopes, which is a
capability difference rather than a performance one.

Policy follows the same split. A read-only search tool can be auto-approved,
because the harness knows what it does. A shell search is indistinguishable from a
shell `rm` until you parse the command line, so it is either gated wholesale or
pattern-matched.

## MCP: when the catalogue is not yours

The tool list is not fixed at build time. MCP is the usual way to extend it at
runtime with a subprocess over stdio or a remote server over HTTP, which means the
model can call tools the harness author never wrote.

They land in the same list as the built-ins, namespaced per server to avoid
collisions. Three costs come with them.

**Prefix.** Their schemas sit in the prompt like any other tool, so a busy server
changes the request size and the cached prefix. This is the cost that pushed the
bigger harnesses towards deferred loading.

**Discovery.** The model has to know the tool exists before it can use it, which is
the problem progressive disclosure solves and the turn it costs.

**Trust.** The descriptions are third-party text entering the prompt, and
annotations like read-only or destructive are claims by the server, not guarantees
the harness can verify. An MCP server is a new trust boundary, and the mitigation
is permissions rather than prose: annotate the tool, gate it, and do not rely on
the model to treat the description as harmless.

Harnesses handle this differently. Some key permissions off the annotations, some
keep an allowlist that skips approval prompts, some only offer what the server
advertises as usable, and some let the catalogue be overridden per agent. Pi
declines the whole thing by design and argues that CLI tools and extensions cover
the same ground, which sidesteps the prefix and the trust problem at once.

## Tricks that work around the tradeoff

Step back and the pattern is that the tool split is doing three jobs at the same
time. It is the permission model, because granularity is what makes per-tool
policy possible. It is the cache surface, because the declarations are part of the
prefix that caching depends on. And it is the feedback surface, because the results
are what the model gets to reason with next.

You cannot tune one without moving the others, which is why the interesting work in
these harnesses is a set of tricks rather than a single design.

- **Reveal late.** Deferred tools keep schemas out of the prompt until the model
  asks for them, with an all-or-nothing reveal so the cached prefix is broken once
  rather than repeatedly.
- **Scope per agent.** A sub-agent gets a filtered catalogue, often read-only, so
  the dangerous tools are simply not in its list.
- **Wire per model.** Tool formats follow what a model was trained on, which is why
  one harness hands patch-style edits to some models and string replacement to
  others.
- **Annotate for policy.** Read-only and destructive hints let the harness approve
  the safe calls and ask about the rest, without a human reading every description.
- **Keep the privileged tool out of the filter.** The one tool that can run code
  sits outside the layers other tools are filtered by, because scoping it in the
  usual way would be meaningless.

None of these is a solution to the tradeoff. They are ways of paying less for it.

## What we take from this

Tools are where an agent's capability is enforced, and they are also the largest
controllable cost in the request. That combination is why there is no single right
answer: every harness is choosing what to spend the window on, and different
workloads deserve different answers.

If you are evaluating an agent, the tool list is the first thing worth reading.
Not the count, but the shape: how much is declared, what is deferred, what is
gated, and what happens when nothing in the catalogue fits.

<!-- TODO: link the next deep dive once it exists. -->

Follow along on the [series page](/writing/how-coding-agents-work/).
