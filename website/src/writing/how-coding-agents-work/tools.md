---
title: "How coding agents work, deep dive: Tools"
description: A coding agent is only as capable as the tools it can call, and the
  tool list is the largest cost its author directly controls. We read ten
  open-source agents to see how much they declare, what it costs, and why there
  is no single right answer.
date: 2026-10-13
draft: true
tags:
  - ai
  - agents
series: how-coding-agents-work
---

We started this series by shortlisting [ten open-source coding
agents](/writing/how-coding-agents-work/), then we built
[Pinocchio](/writing/how-coding-agents-work/building-pinocchio/) to discover the
anatomy they share: the loop, tool calls, permissions, context management, and
sessions. We have since taken the [system
prompt](/writing/how-coding-agents-work/the-system-prompt/) apart, and looked at how
[compaction](/writing/how-coding-agents-work/how-compaction-works/) works.

It's now time we take a look at tools, the one component that gives an agent real agency (pun intended). Without 
tools, the LLM has no means to get the agent perform actions on its behalf, so all we're left with is a chat bot. 

Most of what we'll discuss below stems out of a fundamental tension: tools mean capability, but also mean more 
tokens eaten up from the available context (and in turn a direct impact on the bill, see our [system prompt deep 
dive](/writing/how-coding-agents-work/the-system-prompt/) to understand why). 
Harnesses set each other apart in the way they navigate this tension.

:::note[TL;DR]
Harnesses pretty much all disagree on how many tools to let the LLM choose from. The spread runs from a
single general tool to roughly thirty. We ran two tasks through three
configurations of one harness, and every one of them got the right answer,
including the traps we planted. What changed was the bill. A full catalogue costs
around 15,000 tokens of schema on every turn, and the same rename task took three tool
calls with just a shell available, and twenty-six with everything declared.
:::

## What is a tool, anyway?

Every harness in our shortlist agrees on the shape, and the shape has five parts.
There is a declaration: a name, a description and a parameter schema, sent in the
prompt. There is a call: the model answers with a tool name and a JSON argument
object. Because replies arrive as typed parts rather than one block of text, an
agent can act in the middle of a reply instead of waiting for it to finish. Then
comes dispatch, where the harness inspects the call before anything runs. Is this
allowed, does it need approval, does it need a timeout, does a guard deny it
outright. Then execution: native code inside the harness, a subprocess, a remote
server over a protocol, or a program the model wrote. Finally the result: content
plus metadata, truncated to a budget the harness chose, appended to the
conversation.

Only two of those five touch the model. The declaration lives in the prompt, and
the call plus its result live in the conversation. Everything else belongs to the
harness, and that is where permission, truncation, concurrency and caching are
decided.

One consequence is worth stating, because it is the difference between a tool and
a prompt. A rule in a system prompt is a preference, and the model may ignore it.
A tool call is validated. If the model invents a tool name, or sends arguments
that do not match the schema, the harness refuses to run it. The tool list is the
one part of an agent where capability is enforced rather than requested, and it is
also the reason a harness can promise things a prompt cannot.

## How much surface do you declare?

Harnesses sit all over the place, and the spread is wider than we expected when we
started counting.

At one end, a single general tool. Some setups run with a shell and nothing else,
and DeepSeek Harness takes the idea further with Code Mode: one code tool, plus a
generated SDK document describing the operations the model can call, so the model
composes the call it needs instead of picking one from a list.

Aider is the outsider here, because it has no tool registry at all. The model
emits a textual edit protocol, one of several formats Aider can parse, and the
harness turns it into a file change. Shell access works the same way: a fenced
code block in the reply is a request to run something.

In the middle, a small curated set. Pi ships four tools by default and eight in
its coding-agent set, with a read-only subset for plan mode. Goose ships `write`,
`edit`, `shell`, `tree` and `read_image`, and deliberately no `read` and no
`grep`: the prompt tells the model to use `cat`, `sed` and `rg` through the shell
instead. OpenHands starts from terminal, file editor and task tracker, and gates
the browser and delegation toolsets separately.

At the other end, a wide catalogue. Crush carries about sixteen built-in tools
plus a set of language-server tools behind configuration. OpenCode is in the same
range, and swaps its edit tools for a patch-style tool when the model was trained
on that shape. Codex does not present a flat list at all: it exposes handler
families for patching, executing, planning, permissions, images and more, with
some of them reachable only through a search. Qwen Code tops the count at around
thirty, counting its wildcard families as one.

The two ends buy different things, and both pay for them.

A large granular catalogue buys legibility. Each action is a small typed request,
so the harness can validate it, gate it per tool, ask for approval on the
dangerous ones and leave the read-only ones alone. Qwen Code keeps a safe list of
read-only tools that skips approval entirely. It also buys guardrails the model
cannot skip: telling a model to read a file before editing it is a suggestion in a
prompt, but the harness can enforce it when reading and editing are separate
tools. And it buys a narrower blast radius, because a tool that can only write one
file cannot also delete your branch.

Granularity pays in prefix tokens on every turn, in round trips, and in context
noise, since every result is a message that stays in the conversation. That last
one is easy to underestimate: thirty declarations are a permanent tax, and thirty
chatty results will crowd out the task itself.

One general tool buys the opposite, and it is not only about cost. A tiny prefix,
one round trip for work that would take several calls otherwise, no intermediate
results in the window, and complete freedom of composition. What it pays is
validation, because the harness can only see that a program ran. Permission
granularity, because allow or deny now applies to the shell as a whole. Feedback,
because there is nothing to inspect until the command finishes. And blast radius,
because a mistake lands everywhere at once.

## Two tasks, two traps

We wanted numbers rather than opinions, so we designed two tasks, each with a
trap. The traps matter more than the tasks, because they are what separate the two
approaches on something other than taste.

The first task is a rename: change the configuration key `DB_HOST` to
`DATABASE_HOST` across a compose file, a Terraform file, a `.env` file and some
documentation. The repository also contains `DB_HOST_OLD`, which must not be
touched. The trap punishes regex overreach. The shell answer is a one-line `rg` and
`sed`, which is exactly why it is tempting and exactly how it goes wrong.

The second task is a lookup: work out which functions call `getUserById`, in a
repository where that name exists in two modules and also shows up in comments and
documentation. The trap punishes text search's false positives. `rg` returns every
mention, real call site or not, and something has to disambiguate them.

The two tasks point in opposite directions on purpose. On the rename, the shell
pole is cheap and one mistake away from being wrong, while granular tools pay in
context for edits you can review one file at a time. On the lookup, the shell pole
spends turns sifting hits while a single reference lookup answers precisely.

We are not claiming the shell cannot do either task. It can approximate both, and
that is the whole point: the question is what each approach costs in turns and
tokens, and what it does to the odds of getting the right answer.

## How we measured it

Running this across different products would prove nothing, since their loops,
prompts, compaction and caching all differ, and any difference we found could
belong to any of them. So we hold everything constant but the tool surface, and use
one harness for both tasks: Qwen Code, pointed at the same DeepSeek model we use
every day.

That harness can be configured into the three surfaces we care about:

- **One tool.** Every tool but the shell disabled in the registry, so the model
  sees exactly one generic command.
- **Everything declared.** The deferred-preload budget raised until the whole
  catalogue lands in the first request: 28 tool schemas instead of the 14 the
  harness ships with by default.
- **On demand.** The declaration allowlist left empty, so nothing but the search
  bridge is declared and every other tool waits behind it.

The second and third configurations are the same catalogue with different
visibility, which is what makes the pair worth running: same tools, same
capability, different bill. For the lookup task we also ran a fourth
configuration with the harness's language server support switched on, which is
behind an experimental flag, to see what the model does when a precise tool is
sitting next to a searchable one.

Per run we recorded the model turns, the tool calls, input, output and cached
tokens, wall clock, and whether the traps survived. We report turns next to the
wall clock because provider latency is a large part of the elapsed time, and we
would rather show both than attribute the difference to the tools.

The fixtures, the three configurations and the script that pulls the numbers out
of a session are in the repository, under
[tools/](https://github.com/clubmatto/vetrina/tree/main/website/src/writing/how-coding-agents-work/tools).

## What came out of it

Every configuration answered both tasks correctly. The rename landed all eight
occurrences and left `DB_HOST_OLD` alone, in all three modes, and the lookup
named `HandleProfile` and `BuildReport` as the only callers of
`users.Store.GetUserByID` while explicitly excluding the same-named method in
`billing`. Two traps, six runs, nobody caught.

So the surface did not change the answer at this size of task. It changed the
shape of the work and the bill.

| Configuration | Declared tools | Turns | Tool calls | Input tokens | Cached | Output | Wall clock |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Task A, shell only | 1 | 4 | 3 | 25,643 | 23,680 | 1,900 | 11.8s |
| Task A, all declared | 28 | 9 | 26 | 227,537 | 222,720 | 6,129 | 32.8s |
| Task A, on demand | 2 | 11 | 20 | 150,423 | 142,080 | 8,355 | 43.0s |
| Task B, shell only | 1 | 4 | 3 | 24,739 | 22,528 | 1,170 | 8.4s |
| Task B, all declared | 28 | 3 | 6 | 64,201 | 62,464 | 982 | 7.0s |
| Task B, on demand | 2 | 4 | 6 | 31,508 | 27,904 | 931 | 7.2s |
| Task B, all declared plus language server | 29 | 4 | 10 | 91,445 | 78,592 | 1,559 | 10.3s |

Three things stand out.

**The schema tax is bigger than we assumed.** The full catalogue serialises to
about 62,000 characters of tool definitions, roughly 15,000 tokens, and it goes
out on every single turn. Hidden behind the search bridge, the same harness
declares two tools and about 600 tokens. That is the S from the arithmetic
section below, and it is not a rounding error.

**The shell wins on calls, and it is not close.** On the rename, one shell
command found the occurrences, one rewrote them, one verified: three calls for
eight edits across six files. With everything declared, the same job took
twenty-six calls, mostly a `read_file` per file and an `edit` per change. Same
outcome, different amount of work.

**The language server did not pay for itself here.** With `gopls` available the
model still started by reading files, seven of them, before it thought to call
`findReferences` on the ninth of ten calls. It got the same answer as the
configuration that only had search, and spent more tokens doing it. A precise
tool is not a shortcut if the model's habit is to read first.

One more number worth staring at: 92 to 98 percent of the input tokens in every
run were cache reads. The schema tax is real, but on a warm session most of it is
billed at the cached rate, which is the thing that makes the arithmetic in the
next section less obvious than it looks.

The honest caveat is that each configuration ran once. These are single
observations, not averages, and a model is not a deterministic machine. The token
differences are an order of magnitude and survive that. The wall clock numbers do
not, so read them as illustration rather than measurement.

## Hiding tools is arithmetic

Hiding tools behind a search looks like a free win. The arithmetic says it mostly
is, and it is still not free.

Hiding saves S tokens of schema in the prefix, on every turn. Discovering a tool
costs one extra turn carrying D tokens. So the question is whether a session runs
longer than D/S turns, and our own runs answer it better than a guess would.

Declared, the catalogue cost 20,528 input tokens on the first turn of the rename,
with an empty conversation behind it. The same first turn, hidden, cost 6,519.
That puts S at roughly 14,000 tokens, and it is the tool schemas, since nothing
else differs.

The discovery turn cost 6,669 tokens. So D/S is about half a turn, and the trade
pays off immediately rather than after some long session. The rest of the run
agrees: 150,423 input tokens on demand against 227,537 declared, over eleven turns
against nine.

What hiding does not save is turns. The rename took two more turns and ten more
seconds on demand, because a tool has to be fetched before it can be used. The
window gets smaller and the session gets longer.

Then caching takes a bite out of the money. Between 92 and 98 percent of the input
tokens in our runs were cache reads, and a cached token costs a fraction of a
fresh one, so a saving measured in input tokens is not the same as a saving in
dollars. It is still a saving in window, which is the thing the model actually
runs out of.

That is why the harnesses carrying large MCP surfaces hide tools and the small
ones do not. It is also why the all-or-nothing reveal exists in the harnesses that
do: if you are going to break your cached prefix by adding schemas to it, you may
as well add all of them at once, which is how this harness does it.

## Can you get away from bash?

No. Every harness ships a general tool, and it is the fallback whenever the
catalogue misses. What you choose is its role.

Most harnesses take the escape hatch route: specialized tools for the common
cases, a shell for everything else. The model reaches for the shell when nothing
else fits, and the catalogue stays honest about what it covers.

Goose inverts it. It ships no `read` and no `grep` on purpose and the prompt tells
the model to use `cat`, `sed` and `rg` instead, which makes the instruction the
tool. Once the shell is the substrate, granularity has to be rebuilt inside it:
Crush bans a list of commands outright and auto-approves the ones it trusts, which
is command-line pattern matching standing in for per-tool permissions. The
approval prompt degrades in the same way, from "edit this file" to "run this
program".

There are two ways out that are not a shell. You can grow the catalogue at runtime,
usually through MCP, which we come back to below. Or you can let the model write a
program, which is what Code Mode does. The prefix stays small and the composition
stays expressive, but the harness can no longer see the intent inside the program,
only that it ran.

## Search is where it shows first

Search is the clearest case of the trade, and it is worth walking through because
everyone has an intuition about it.

Bash plus `rg` answers a search in one round trip with full composition: filter,
count, sort, pipe. The catch is that the output is unbounded unless the model
shapes it. One naive repository-wide search can put thousands of lines into the
window, and nothing stops it except the model remembering to pipe through `head`
while it is busy thinking about something else.

A specialized search tool is also one round trip, but the harness runs it, returns
structured matches and applies its own truncation budget. The context cost is
bounded by design, and it does not depend on the model doing the right thing under
pressure. Qwen Code goes further and lets each tool declare its own output cap and
whether truncation keeps the head, the tail or both.

The granular path costs more turns and buys a different thing: glob to find
candidates, grep to narrow, read to inspect. Several round trips for what one
pipeline answers, in exchange for every step being visible and gated.

Specialized search can also do what text search cannot. A language server or an
index answers "who references this symbol" with types and scopes, which is a
capability difference rather than a performance one. We expected that difference to
carry the lookup task. It did not, and the results below show why.

Policy follows the same split. A read-only search tool can be auto-approved,
because the harness knows what it does. A shell search is indistinguishable from a
shell `rm` until you parse the command line, so it is either gated wholesale or
pattern-matched, which is the compromise Crush made.

## The tool list is not yours

The tool list is not fixed at build time either. MCP is the usual way to extend it
at runtime, with a subprocess over stdio or a remote server over HTTP, which means
the model can call tools the harness author never wrote and never read.

They land in the same list as the built-ins, namespaced per server to avoid
collisions. Three costs come with them.

Their schemas sit in the prompt like any other tool, so a busy server changes the
request size and the cached prefix, which is the cost that pushed the bigger
harnesses towards deferred loading. The model has to know the tool exists before it
can use it, which is the problem progressive disclosure solves and the turn it
costs. And the descriptions are third-party text entering the prompt, where
annotations like read-only or destructive are claims by the server rather than
guarantees the harness can verify. An MCP server is a trust boundary, and the
mitigation is permissions rather than prose: annotate the tool, gate it, and do not
rely on the model to treat a description as harmless. Goose keys permissions off
those annotations, Crush keeps an allowlist that skips approval for the tools it
trusts, OpenHands only offers what the server advertises as usable, and Kimi CLI
keeps MCP tools out of the request until the model asks for them by name.

Pi declines the whole thing by design, and argues that CLI tools and extensions
cover the same ground. It is a coherent position: no MCP means no third-party
schemas in the prefix, and no third-party text in the prompt.

## Tricks that keep the bill down

Step back and the pattern is that the tool split is doing three jobs at once. It is
the permission model, because granularity is what makes per-tool policy possible.
It is the cache surface, because the declarations are part of the prefix that
caching depends on. And it is the feedback surface, because the results are what
the model gets to reason with next.

You cannot tune one without moving the others, which is why the interesting work in
these harnesses is a set of tricks rather than a single design decision.

- **Reveal late.** Deferred tools keep schemas out of the prompt until the model
  asks for them, and the reveal is all-or-nothing so the cached prefix breaks once
  rather than on every step.
- **Scope per agent.** A sub-agent gets a filtered catalogue, often read-only, so
  the dangerous tools are simply not in its list. Crush restricts its `task` agent
  this way, and OpenCode's plan mode denies every edit tool.
- **Wire per model.** Tool formats follow what a model was trained on, which is why
  OpenCode hands a patch-style edit to the models that expect one and string
  replacement to the rest.
- **Annotate for policy.** A tool that declares itself read-only can be approved
  automatically, while a destructive one gets a prompt, and a human never has to
  read thirty descriptions to decide.
- **Keep the privileged tool out of the filter.** The one tool that can run code
  tends to sit outside the layers the others are filtered by, because scoping it
  the same way would be meaningless.

None of these is a solution to the tradeoff. They are ways of paying less for it,
and they all come with the same string attached: the more the harness hides from
the model, the more the harness has to decide on its behalf.

## Conclusions

Tools are where an agent's capability is enforced, and they are also the largest
cost in the request that its author can directly control. That combination is why
there is no single right answer: every harness is choosing what to spend the window
on, and different workloads deserve different answers.

If you are evaluating an agent, the tool list is the first thing worth reading. Not
the count, but the shape of it: how much is declared, what is deferred, what is
gated, and what happens when nothing in the catalogue fits.

In the next posts we will keep digging into parts of a coding agent's anatomy.
