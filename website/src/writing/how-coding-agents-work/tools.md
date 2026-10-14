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
prompt](/writing/how-coding-agents-work/the-system-prompt/) apart, and looked at
how [compaction](/writing/how-coding-agents-work/how-compaction-works/) works.

It's now time we take a look at tools, the one component that gives an agent
real agency (pun intended). Without tools, the LLM has no means to get the agent
perform actions on its behalf, so all we're left with is a chat bot.

Most of what we'll discuss below stems out of a fundamental tension: tools mean
capability, but they also mean more tokens eaten up from the available context
(and in turn a direct impact on the bill, see our [system prompt deep
dive](/writing/how-coding-agents-work/the-system-prompt/) to understand why).
Harnesses set each other apart in the way they navigate this tension.

:::note[TL;DR]
Harnesses pretty much all disagree on how many tools to let the LLM choose from.
The spread runs from a single general tool to roughly thirty. We ran two tasks
through three configurations of one harness, and every one of them got the right
answer, avoiding the traps we planted. What changed was the bill. A full
catalogue costs around 15,000 tokens of schema on every turn, and the same
rename task took three tool calls with just a shell available, and twenty-six
with everything declared.
:::

## What is a tool, anyway?

Five parts can be used to describe what a tool is and how it behaves:

- **declaration**: a name, a description and a parameter schema, sent in the
  prompt.
- **call**: the model answers with a tool name and a JSON argument object, as
  its own typed part of the reply rather than inside a block of text, so the
  harness reads the call instead of parsing prose.
- **dispatch**: the harness inspects the call before anything runs. Is this
  allowed? Does it need approval? Does it need a timeout? Does a guard deny it
  outright?
- **execution**: native code inside the harness, a subprocess, a remote server
  over a protocol, or a program the model wrote.
- **result**: content plus metadata, truncated to a budget the harness chooses,
  appended to the conversation.

Only two of those five touch the model. The declaration lives in the prompt, and
the call plus its result live in the conversation. Everything else belongs to
the harness, and that is where permission, truncation, concurrency and caching
are decided.

One consequence is worth stating, because it is the difference between a _tool_
and a _prompt_. A rule in a system prompt is a preference, and the model may
ignore it. A tool call is validated. If the model invents a tool name, or sends
arguments that do not match the schema, the harness refuses to run it. The tool
list is the one part of an agent where capability is enforced rather than
requested.

## How much surface do you declare?

Harnesses take very different approaches, and the spread is wider than we
expected.

At one end, a single general tool. Some setups run with a shell and nothing
else, and DeepSeek Harness takes the idea further with Code Mode: one code tool,
plus a generated SDK document describing the operations the model can call, so
the model composes the call it needs instead of picking one from a list.

In the middle, a small curated set. Pi ships four tools by default and eight in
its coding-agent set, with a read-only subset for plan mode. Goose ships
`write`, `edit`, `shell`, `tree` and `read_image`, and deliberately no `read`
and no `grep`: the prompt tells the model to use `cat`, `sed` and `rg` through
the shell instead. OpenHands starts from terminal, file editor and task tracker,
and gates the browser and delegation toolsets separately.

At the other end, a wide catalogue. Crush carries about sixteen built-in tools
plus a set of language-server tools behind configuration. OpenCode is in the
same range, and swaps its edit tools for a patch-style tool when the model was
trained on that shape. Codex builds its model-visible list from a registry of
handlers, one per operation: patching, shell and execution, planning,
permissions, image viewing, MCP and collaboration tools. Qwen Code tops the
count: fourteen tools out of the box, twenty-eight once its deferred set is
preloaded.

Aider is the outsider here, because it has no tool registry at all. The model
emits a textual edit protocol, one of several formats Aider can parse, and the
harness turns it into a file change. Shell access works the same way: a fenced
code block in the reply is a request to run something.

The two ends of the spectrum have both their own set of benefits and related
costs.

A large granular catalogue buys legibility. Each action is a small typed
request, so the harness can validate it, gate it per tool, ask for approval on
the dangerous ones and leave the read-only ones alone. Qwen Code keeps a safe
list of read-only tools that skips approval entirely. It also buys guardrails
the model cannot skip: telling a model to read a file before editing it is a
suggestion in a prompt, but the harness can enforce it when reading and editing
are separate tools. And it buys a narrower blast radius, because a tool that can
only write one file cannot also delete your branch.

Granularity pays in prefix tokens on every turn, in round trips, and in context
noise, since every result is a message that stays in the conversation. That last
one is easy to underestimate: thirty declarations are a permanent tax, and
thirty chatty results will crowd out the task itself.

One general tool buys the opposite, and it is not only about cost. A tiny
prefix, work done in one round trip instead of several calls, no
intermediate results in the window, and complete freedom of composition. What it
pays is validation, because the harness can only see that a program ran.
Permission granularity, because allow or deny now applies to the shell as a
whole. Feedback, because there is nothing to inspect until the command finishes.
And blast radius, because a mistake can land anywhere.

## An experiment: Two tasks, two traps

We were curious to understand what the trade looks like in practice, so we
designed two tasks and ran each one in every configuration. If the control that
granularity buys amounts to anything, it should show up as fewer wrong answers,
so each task hides a decoy: a detail that looks like the target, where a blunt
move fails and a careful one does not. That is what the decoys are for, and it
is why they matter more than the tasks themselves.

The first task is a rename: change a configuration key `DB_HOST` to
`DATABASE_HOST` across a compose file, a Terraform file, a `.env` file and some
documentation. The repository also contains `DB_HOST_OLD`, which must not be
touched. The trap punishes regex overreach: the shell answer is a one-line `rg`
and `sed`, and `DB_HOST_OLD` is why that line is harder to get right than it
looks.

The second task is a reference lookup: work out which functions call
`getUserById`, in a repository where that name exists in two modules and also
shows up in comments and documentation. The trap punishes text search's false
positives. `rg` returns every mention, real call site or not, and something has
to disambiguate them.

The two tasks point in opposite directions on purpose. On the rename, using the
shell is cheap but one careless pattern can make the model fall into the trap,
while a granular catalogue pays in context for edits you can review one file at
a time. On the reference lookup, the shell approach has to disambiguate the hits
for itself, while a language server answers directly.

We are not claiming the shell cannot do either task. It solved both in our runs,
without falling for our tricks, and so did every other configuration. What this
piece is about is the cost. What neither task can tell us is whether a harder
challenge would significantly change the answers as well as the bill.

## How we measured it

Running this across different products would prove nothing, since their loops,
prompts, compaction and caching all differ, and any difference we found could
belong to any of them. So we hold everything constant but the tool surface, and
use one harness for both tasks: Qwen Code, pointed at the same DeepSeek model we
use every day.

That harness can be configured into the three surfaces we care about:

- **One tool.** Every tool but the shell disabled in the registry, so the model
  sees exactly one generic command.
- **Everything declared.** 28 tool schemas instead of the 14 the
  harness ships with by default.
- **On demand.** Nothing but the search bridge is declared upfront, and every
  other tool needs to be discovered using it.

The second and third configurations are the same catalogue with different
visibility, which is what makes the pair worth running: same tools, same
capability, different bill. For the reference lookup we also ran a fourth
configuration with the harness's language server support switched on, which is
behind an experimental flag, to see what the model does when a precise tool is
available.

For every run we recorded the turns spent on the problem, the tool calls, the
input and cached tokens, the wall clock, and whether the agent fell into the
trap. The complete experiment's harness is available [in the
repository](https://github.com/clubmatto/vetrina/tree/main/website/src/writing/how-coding-agents-work/tools).

## What came out of it

Every configuration answered both tasks correctly. The rename landed all eight
occurrences and left `DB_HOST_OLD` alone, in all three modes; the reference
lookup correctly identified the only two callers of the designated function
while explicitly excluding the same-named method in the second module. Six runs
and two traps couldn't catch the agent off guard.

Where the tool surface did make a difference is on time and tokens spent on the
problem:

**Rename**

<div class="agent-table-wrapper">
  <table class="agent-table agent-table--rows">
    <thead>
      <tr>
        <th></th>
        <th>Shell only</th>
        <th>All declared</th>
        <th>On demand</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="agent-name">Declared tools</td>
        <td class="nw" data-label="Shell only">1</td>
        <td class="nw" data-label="All declared">28</td>
        <td class="nw" data-label="On demand">2</td>
      </tr>
      <tr>
        <td class="agent-name">Turns</td>
        <td class="nw" data-label="Shell only">4</td>
        <td class="nw" data-label="All declared">9</td>
        <td class="nw" data-label="On demand">11</td>
      </tr>
      <tr>
        <td class="agent-name">Tool calls</td>
        <td class="nw" data-label="Shell only">3</td>
        <td class="nw" data-label="All declared">26</td>
        <td class="nw" data-label="On demand">20</td>
      </tr>
      <tr>
        <td class="agent-name">Input tokens</td>
        <td class="nw" data-label="Shell only">25,643</td>
        <td class="nw" data-label="All declared">227,537</td>
        <td class="nw" data-label="On demand">150,423</td>
      </tr>
      <tr>
        <td class="agent-name">Cache reads</td>
        <td class="nw" data-label="Shell only">92%</td>
        <td class="nw" data-label="All declared">98%</td>
        <td class="nw" data-label="On demand">94%</td>
      </tr>
      <tr>
        <td class="agent-name">Wall clock</td>
        <td class="nw" data-label="Shell only">11.8s</td>
        <td class="nw" data-label="All declared">32.8s</td>
        <td class="nw" data-label="On demand">43.0s</td>
      </tr>
    </tbody>
  </table>
</div>

**Reference lookup**

<div class="agent-table-wrapper">
  <table class="agent-table agent-table--rows">
    <thead>
      <tr>
        <th></th>
        <th>Shell only</th>
        <th>All declared</th>
        <th>On demand</th>
        <th>With gopls</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="agent-name">Declared tools</td>
        <td class="nw" data-label="Shell only">1</td>
        <td class="nw" data-label="All declared">28</td>
        <td class="nw" data-label="On demand">2</td>
        <td class="nw" data-label="With gopls">29</td>
      </tr>
      <tr>
        <td class="agent-name">Turns</td>
        <td class="nw" data-label="Shell only">4</td>
        <td class="nw" data-label="All declared">3</td>
        <td class="nw" data-label="On demand">4</td>
        <td class="nw" data-label="With gopls">4</td>
      </tr>
      <tr>
        <td class="agent-name">Tool calls</td>
        <td class="nw" data-label="Shell only">3</td>
        <td class="nw" data-label="All declared">6</td>
        <td class="nw" data-label="On demand">6</td>
        <td class="nw" data-label="With gopls">10</td>
      </tr>
      <tr>
        <td class="agent-name">Input tokens</td>
        <td class="nw" data-label="Shell only">24,739</td>
        <td class="nw" data-label="All declared">64,201</td>
        <td class="nw" data-label="On demand">31,508</td>
        <td class="nw" data-label="With gopls">91,445</td>
      </tr>
      <tr>
        <td class="agent-name">Cache reads</td>
        <td class="nw" data-label="Shell only">91%</td>
        <td class="nw" data-label="All declared">97%</td>
        <td class="nw" data-label="On demand">89%</td>
        <td class="nw" data-label="With gopls">86%</td>
      </tr>
      <tr>
        <td class="agent-name">Wall clock</td>
        <td class="nw" data-label="Shell only">8.4s</td>
        <td class="nw" data-label="All declared">7.0s</td>
        <td class="nw" data-label="On demand">7.2s</td>
        <td class="nw" data-label="With gopls">10.3s</td>
      </tr>
    </tbody>
  </table>
</div>

Three things stand out.

**The schema tax is bigger than we assumed.** The full catalogue serialises to
about 62,000 characters of tool definitions, roughly 15,000 tokens, and it goes
out on every single turn. Hidden behind the search bridge, the same harness
declares two tools and about 600 tokens.

**The shell wins on calls, and it is not even close.** On the rename, one shell
command found the occurrences, one rewrote them, one verified: three calls for
eight edits across six files. With everything declared, the same job took
twenty-six calls, mostly a `read_file` per file and an `edit` per change. Same
outcome, different amount of work.

**The language server did not pay for itself here.** With `gopls` available the
model still started by reading files, seven of them, before it thought to call
`findReferences` on the ninth of ten calls. It got the same answer as the
configuration that only had search, and spent more tokens doing it. A precise
tool is not a shortcut if the model's habit is to read first.

The honest caveat is that each configuration ran once. These are single
observations, not averages, and a model is not a deterministic machine. The
token differences are an order of magnitude so the indication is clear. That
doesn't hold true for the wall clock numbers though, so read them as
illustration rather than measurement.

## Is it worth deferring tools discovery?

The question comes up because the catalogue is not fixed at build time. MCP
attaches tools at runtime, over a subprocess or an HTTP server, and they land in
the same list as the built-ins. Declaring all of them would abdicate control of
the prefix to whoever wrote the servers, so hiding is how a harness keeps a say
in what goes into the request. It also means those descriptions are third-party
text: an annotation like "read-only" or "destructive" is a claim by the server,
not something the harness can verify, and it requires a permission scheme to
mitigate potential mistakes.

Note however that while hiding tools behind a search looks like a free win, it
is not. Whether it is worth it comes down to two quantities pulling in opposite
directions: the tokens you save at every turn by not declaring the catalogue,
and the extra turn it costs to fetch a tool before you can use it.

Our experiment puts a number on each. Declaring the catalogue made the first
turn about three times larger, and that gap is paid again on every turn of the
session. Fetching a tool costs one extra turn, roughly half of what a turn of
declarations costs, and it is paid once.

On that comparison, hiding pays for itself almost immediately: across the whole
run it used about a third fewer input tokens.

But as the numbers show, the token saving is paid somewhere else. Discovering
tools on the fly requires more turns, and the total time spent on the problem
can increase significantly.

To complicate matters further, we need to factor in the cheaper price of cached
tokens. Between 86 and 98 percent of the input tokens in our runs were cache
reads, so a saving in tokens might still not convert into a significant saving
in dollars.

The bottom line is that we cannot determine in absolute terms if tools discovery
is worth its cost. What decides it is the size of the catalogue. The saving
grows with every tool kept out of the prompt, while the cost of fetching one
stays around a turn. The margin is thin enough that the harnesses optimize it
from different angles.

Put our two tasks together, though, and the numbers point one way: the single
shell was the cheapest on both, in calls and in tokens, and it got the answers
right. On that reading, the shell is the clear winner.

But is it?

## Bash: jack of all trades?

So is a single shell tool the winner? Not necessarily. What a shell costs you is
mostly qualitative rather than quantitative: an approval that covers a whole
program instead of a readable action, no structured feedback between one step
and the next, and a blast radius that can potentially be larger than what the
task at hand would require. None of these aspect would surface in a turn count
or a token total.

But given this huge potential for mistakes, it's worth looking at the other side
of the spectrum and ask ourselves: can we instead get away from bash? The answer
is a resounding no. In fact, every harness ships a general tool, though its role
is not the same everywhere.

Most harnesses take the escape hatch route: specialized tools for the common
cases, and a shell as a last resort when nothing else fits. Some harnesses seem
instead to lean heavily on a shell as the main vehicle for performing actions on
the machine. DeepSeek Harness goes as far as adopting it as its only tool.

Note though that letting an LLM compose arbitrary shell scripts poses a new
challenge to the harness. If approvals are left at the tool level, then the only
possible permission for such scripts is to "run this program"; in other words,
the user is forced to give or refuse a blanket permission on the whole script,
without a say on the individual actions. That's why, for example, Crush "parses"
the script and bans a list of commands outright and auto-approves the ones it
trusts. But it's no silver bullet and it's hard to get right.

There are currently only two ways out that are not a shell. You can grow the
catalogue at runtime, usually through MCP. Or you can let the model write a
program, which is what Code Mode does. The prefix stays small and the
composition stays expressive, but the problem of a blanket approval remains.

## Tricks that keep the bill down

It should be clear by now that no matter which approach we take, the tradeoffs
involved in declaring a tools catalogue keep us searching for a balanced
approach. The result of this search is a set of techniques that harnesses use in
different combinations:

- **Reveal late.** Deferred tools keep schemas out of the prompt until the model
  asks for them, so the prefix stays small and only the tools in play are paid
  for.
- **Bound the result.** A specialized tool can truncate its own output to a
  budget the harness chose, while a shell pipeline returns whatever it prints
  and the model has to remember to pipe it through `head`. Qwen Code lets each
  tool declare its own cap, and whether truncation keeps the head, the tail or
  both.
- **Scope per agent.** A sub-agent gets a filtered catalogue, often read-only,
  so the dangerous tools are simply not in its list. Crush restricts its `task`
  agent this way, and OpenCode's plan mode denies every edit tool.
- **Wire per model.** Tool formats follow what a model was trained on, which is
  why OpenCode hands a patch-style edit to the models that expect one and string
  replacement to the rest.
- **Annotate for policy.** A tool that declares itself read-only can be approved
  automatically, while a destructive one gets a prompt, and a human never has to
  read thirty descriptions to decide.

None of these is a "solution" to the tradeoffs involved. They are ways of paying
less for them, and they all come with the same string attached: the more the
harness hides from the model, the more the harness has to decide on its behalf.

## Conclusions

Tools are where an agent's capability is enforced, and they are also the largest
cost in the request that its authors can directly control. That combination is
why there is no single right approach: every harness is choosing what to spend
their context budget on, and different workloads deserve different answers.

If you are evaluating an agent, the tool list is the first thing worth reading.
Not the count, but the shape of it: how much is declared, what is deferred, what
is gated, and what happens when nothing in the catalogue fits.

We're now well on our way to a general understanding of coding agents. Follow
along for the missing parts in the upcoming posts.
