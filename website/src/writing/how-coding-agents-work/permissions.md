---
title: "How coding agents work, deep dive: Permissions"
description:
  A coding agent acts on your machine, so something has to decide what
  it may do. We read ten open-source agents to see how that decision evolved from
  asking about everything to bounding what is possible.
date: 2026-11-03
tags:
  - ai
  - agents
series: how-coding-agents-work
draft: true
---

:::note[On timing]
This piece is a snapshot. The opening is about a release from late October
2026, and the ten harnesses it compares are described as we read them then.
Sandboxes, policy formats and model behaviour all move quickly, so read the
specifics as of that date, and the reasoning as the part that is meant to last.
:::

Anthropic recently open-sourced its sandbox runtime
([repository](https://github.com/anthropics/sandbox-runtime)), the one that runs
behind Claude Code. It denies filesystem writes outside the paths you allow,
denies network access, and runs the agent's commands inside an operating-system
sandbox: `sandbox-exec` on macOS, `bubblewrap` on Linux.

The first of those is Apple's own sandboxing facility, the second is a tool that
puts a process in a restricted namespace. Both are old pieces of system
software. What is new is a coding agent shipping with one.

Why would an agent need that? Because a coding agent does not only answer
questions. It runs commands, edits files, fetches pages and calls servers.
Before any of that happens, something has to decide whether it is allowed. That
decision is what this article is about.

Nobody designed it in one go. In the ten harnesses we read, the same set of
answers reappears, and each one arrives because the previous one stopped
working. What they are all trading against is the same pair of failures: ask
too much and the gate becomes a keystroke, ask too little and the machine does
things nobody intended.

## The decision, and why it is not a yes or no

The model proposes a tool call, and the harness has three options: let it run,
refuse it, or ask a person. Asking is the interesting one, because it turns a
machine decision into a human one, and the human has a limited amount of
patience.

What makes the decision hard is that the person is shown a _proposal_, not a
result. A tool call says `bash("rm -rf build")` or `bash("rm -rf ~")`, and the
difference between those two is one character. An `edit` call names a path, and
the path alone does not tell you whether that file is generated or hand-written.
The call is a description of an action, not a statement of its consequences.
And the decisions that most need a person are exactly the ones that cost a
person the most to make: if the case were easy, you would not need the human in
it.

So every permission system works from a proxy: something it can see about the
call, which it hopes correlates with what the call will do. The rest of this
article is the set of techniques harnesses use to make that proxy good enough
to keep the burden off a person, in roughly the order they were forced on
them.

## Step one: ask about everything

The simplest answer is to ask before every action.

Aider is the purest example. It has no sandbox and no policy file. Every edit
goes through a confirmation, every command goes through one, and it also asks
whether it may edit a given file at all. Its safety is interaction rather than
isolation.

It works, in the sense that nothing happens without a person seeing it. It does
not work for long, because the requests arrive faster than the attention
required to answer them. A session where the agent needs to run twenty commands
in a row produces twenty prompts, and by the tenth the person is pressing yes
without reading. The record then says every action was approved by a human,
which is true and means nothing.

This is the first thing to understand about permissions: a gate that relies on
attention decays. Not because people are careless, but because attention does
not refill on demand. Every step after this one exists to ask less.

## Step two: stop asking the same question twice

The first reduction is to remember an answer.

Goose keeps a `permission.yaml` with three lists: `always_allow`, `ask_before`
and `never_allow`. When a person answers a prompt with always-allow or
always-deny, the answer is written into that file, so the next session starts
from a slightly better position.

Codex approaches the same goal from the runtime side. A request that has been
approved once is memoised, so an identical call does not produce a second
prompt. DeepSeek Harness goes further and records the decision in the session
log, then reuses it when the session resumes.

This cuts noise, and it runs into the shape of the problem. The next action is
almost never identical to the last one. `npm test` and `npm test -- --watch`
are different strings, and a rule that matches the first does not match the
second. Models make that worse: they are not deterministic, so the same
intention can arrive as a slightly different command every time. Remembering
answers gets you from twenty prompts to fifteen, not to zero.

## Step three: decide some of it in advance

The next reduction is to stop asking about the actions that cannot hurt you.

Qwen Code keeps a list of tools that are read-only by construction: reading a
file, searching, globbing, asking the language server. Those are approved
silently, without a person and without a model call. Goose does something
similar, but lets the tool say so itself, through annotations such as read-only
or destructive.

This is the first step that is not just bookkeeping, and it is also the first
one that depends on the tool surface. A typed tool is legible: `Read` reads, and
`Grep` searches, and neither of them can delete a directory. A shell is not
legible in that way. `bash` can do anything, so there is no read-only variant of
it, and an annotation on a shell tool means whatever its author decided it
means.

Which is why the next two steps exist, and why both of them are about the shell.

## Step four: try to read the command

If the person cannot be asked about every command, and the tool cannot be
trusted to describe itself, the harness can try to read the command string.

Crush does this with a deny-list. Around sixty commands are banned outright, and
a second layer of argument blockers catches dangerous subcommands. The list
travels in the tool description itself, so the model can see what it must avoid.

Qwen Code tries something harder. It splits compound shell commands and maps
each part to a virtual tool, so `cat` becomes a virtual read and `sed -i`
becomes a virtual write, and the permission rules run against those virtual
operations instead of the raw string. The mapping can escalate a decision, so a
command that looks like a read but writes still gets blocked, but it cannot
downgrade one: once a rule says no, the analysis cannot say yes back.

Both approaches are heuristics, and both are limited by what somebody thought
of. A wrapper script, an alias, a command nobody has seen before, and the rule
is silent. Reading a command is a cheap approximation of understanding it, and
it stops working exactly where commands stop being simple.

## Step five: stop reading, start bounding

The next step gives up on understanding the action and makes it harmless
instead.

An operating-system sandbox does not decide whether a command is safe. It
decides what the command can reach, and the kernel enforces the limit: the
process runs, but opening a socket or writing outside an allowed directory
returns an error. DeepSeek Harness is the clearest case: every
confined command is wrapped in a platform runner, `bubblewrap` with Landlock on
Linux, Seatbelt on macOS, and a restricted token runner on Windows. The runners
are checked at startup, and if the right one is missing the command does not run
at all. Codex does the same with a per-execution choice between no sandbox,
Seatbelt, a Linux seccomp sandbox and a Windows restricted token, and it routes
network traffic through a proxy that enforces a domain policy.

The appeal is that a sandbox does not care what the model meant, what the tool
annotation claims, or whether the command parses. It enforces a boundary the
kernel can check.

It also cannot tell a legitimate build from a malicious one. `make` that writes
to a temp directory and `make` that writes to your home directory look the same
to the sandbox, so the choice is between allowing both and blocking both. That
is where the legitimate work starts failing, and where harnesses look for
something in between. Codex turns a denial into a question. When a command fails
because the sandbox blocked it, Codex can retry the same command without the
sandbox, and that retry goes through approval with the denial reason attached,
so the person sees why it was blocked before saying yes. Under an approval
policy that never asks, it does not retry at all and reports the denial instead.
The guarantee is not dropped quietly; it is traded for a prompt.

## Step six: put a model in the gap

The latest step, and one only a few of the ten have, is to ask a model whether
the action is acceptable.

Goose's `SmartApprove` sends tools it cannot infer anything about to a hidden
model call that decides whether the request is read-only. Read-only requests are
allowed, everything else asks, and the answer is cached so the same tool does
not get re-judged forever. OpenHands runs an LLM security analyzer and only asks
the person when the risk lands above a high threshold.

Qwen Code stacks the previous steps and puts a classifier at the end. Its `AUTO`
mode first allows edits inside the workspace, then the read-only tools, then
blocks a set of known destructive commands with a deterministic pattern, and
only then asks a model to judge the remainder. The judgement runs in two stages:
a cheap first pass that answers only "block or not", and a second, slower pass
that runs only when the first says block. The second pass can overturn the
first, which makes the whole thing biased toward letting things through, and
every failure of the judging call itself results in a block.

There is a catch here, and it is about which model does the judging. Qwen Code's
documentation is explicit: the classifier uses the configured fast model, and
when none is configured it uses the session's main model. Goose resolves the
judge through the session's own model configuration too. So in the common setup
the model that proposed the action is the one asked whether the action is safe.
It gets a different prompt, with instructions to judge rather than to act, which
is a real difference. A separate judge would be a stronger arrangement, and most
of the ten have no judge at all.

The other cost is the usual one for model calls: it happens on every ambiguous
action, it takes time, and it is not deterministic. Qwen Code admits as much in
its own design: after three consecutive blocks, or twenty in a session, it stops
trusting the classifier for a turn and asks a person instead.

## Where this is going

Put the steps side by side and a direction shows up. The harnesses that went
furthest end in the same arrangement: rules for the routine, a sandbox under
everything irreversible, a classifier for the ambiguous middle, and a person for
the actions that would be expensive to get wrong.

Two things point forward. The first is the convergence on operating-system
primitives. Anthropic's runtime, Codex and DeepSeek Harness all build on
`sandbox-exec` and `bubblewrap`, which suggests the industry has settled on
where the last line of defence lives. The second is the slow movement of
decisions out of the prompt and into the harness, which is the same movement the
[tools post](/writing/how-coding-agents-work/tools/) described: the harness
decides, the model proposes.

What is still missing is the piece that would make the whole thing legible to a
person. None of the ten shows what an action will do before you approve it. You
get a command string or a path, and you are expected to reconstruct the
consequences in your head. A plan, a diff, a list of the files that will change:
any of those would be a better thing to approve than a string, and none of the
harnesses reviewed here does it.

## What this means for you

The question is not which harness is most secure. It is which arrangement
matches how you work, because your tolerance and your mode of interaction set
what is affordable.

If you work interactively, alongside the agent, prompts are cheap enough to be
worth having, and asking about the big actions is the right trade. If you run
agents unattended, in batches or overnight, prompts are not an option at all:
nobody is there, and the harness will either deny or allow, so what matters is
the sandbox and the rules behind it. If you are just trying to get a feature out
of the door, you will end up in one of the looser modes, and the only thing
protecting you is the boundary under it.

Whichever you pick, ask two questions of your harness. What does it use for the
actions that matter: a rule, a sandbox, a classifier, or you. And what does one
yes cover. The documentation will tell you that it asks before running. It will
not tell you whether that covers one file or the whole repository.

Read the series from the start:
[how coding agents work](/writing/how-coding-agents-work/).
