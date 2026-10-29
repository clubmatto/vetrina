---
title: "How coding agents work, deep dive: Permissions"
description: Every coding agent has to decide what it may do before it does it.
  We read ten open-source agents to see how that decision is made, what each
  approach costs, and why none of them can answer it by looking at the call.
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

Anthropic open-sourced its sandbox runtime: filesystem writes denied, network
denied, and only the holes you explicitly poke. The mechanism is not new. It is
`sandbox-exec` and Seatbelt profiles on macOS, `bubblewrap` on Linux.

You find the same two elsewhere. Codex self-invokes a sandbox binary that builds
a `bubblewrap` wrapper with a seccomp filter on Linux, and applies Seatbelt
policies on macOS. DeepSeek Harness wraps every confined command in
`bubblewrap` and Landlock on Linux and Seatbelt on macOS, and refuses to run at
all when the sandbox is unavailable.

Three harnesses, three codebases, one answer. That convergence is the
interesting part, and it starts from a question: what is a permission actually
approving?

## Everything the model proposes, something has to allow

We built [Pinocchio](/writing/how-coding-agents-work/building-pinocchio/) to
watch the loop in the open, and the shape never changed: the model proposes a
call, the harness decides what to do with it. In the [tools
post](/writing/how-coding-agents-work/tools/) we split that call into five
parts, and put one of them aside: dispatch, where the harness inspects a call
before anything runs. Is this allowed? Does it need approval? Does a guard deny
it outright?

This article is about that inspection, and about why ten harnesses do it ten
different ways.

## The predicament

Before any machinery, there is a judgement about people. A permission check
exists to answer a question the user cannot answer for themselves, and it can be
wrong in two directions.

Ask too much and you bother the user. Every prompt interrupts, and attention is
a budget that does not refill on demand. A person asked twenty times a day stops
reading somewhere around the fifth, and every prompt after that is worth less
than the one before it. The gate is still there. It just stops being a gate.

Ask too little and the agent oversteps. Some of what it can do cannot be undone,
and the damage lands on a codebase nobody was watching.

Neither failure is hypothetical. Both poles ship as first-class settings. Qwen
Code has a `YOLO` mode that approves everything except the tool that asks the
user a question, and it has a `PLAN` mode that blocks every tool which is not
read-only. Aider does the opposite and has no policy engine at all: its own
design notes say safety is interaction, not isolation.

The middle is not a technical question first. It is a judgement about what a
person will tolerate, and every mechanism below is an attempt to move the
decision away from that person without losing the judgement.

## What a check is made of

A permission is one decision about one call, taken before execution. It has
three moving parts.

The first is the evidence. Whatever a harness decides, it decides from
something it can see, and the things it can see cost different amounts:

- the tool name, which is free and means almost nothing on its own
- the arguments, which are cheap when the tool is typed
- the path, which is cheap when the call names one
- the command line, which is expensive because it can contain anything

The second is the answer, and there are only three: allow, deny, ask.

The third is the record, which most harnesses keep and which almost nobody
reads until something goes wrong. DeepSeek Harness logs an `approval/asked` and
`approval/decided` pair inside every turn that asks.

All five words worth knowing come out of those three parts. An **approval** is
an ask that reaches a person. A **policy** is a rule that answers without one. A
**sandbox** does not answer at all, it bounds what the process can do once it
runs. An **annotation** is metadata a tool declares about itself. And **blast
radius** is what one yes reaches.

One case shapes everything that follows. With nobody at the keyboard, `ask` has
nowhere to go, so it becomes one of the other two. Every harness that supports
headless runs has already decided which, and it is usually deny.

## Why the middle is hard to hit

Here is the awkward part. What you care about is whether the action can be
undone and how far it reaches. Neither is in the call.

`bash("rm -rf build")` says nothing about whether `build` is a scratch directory
or the only copy of something. `edit(path, content)` says nothing about whether
the path is `src/` or `.git/`. A harness that only reads the call is guessing,
and it is guessing about the two things that matter most.

So every decision is made on a proxy for what the call will do, and the four
strategies in this article are four different proxies. Each one is better at
some of it and worse at the rest, which is why no harness uses only one.

## You can only gate what you can see

The quality of a proxy depends on how much the call tells you, and that is a
property of the tool surface rather than the permission system. The
[granularity trade](/writing/how-coding-agents-work/tools/) reappears one layer
down.

A typed call is legible. It has a name and arguments that fit a schema, which is
why Qwen Code can keep a safe list of read-only tools and approve them silently.
`Read`, `Grep`, `Glob` and the language server calls are not ambiguous.

A shell command is not legible. It is a string that contains a program, and the
program can do anything. Qwen Code tries anyway: it splits compound commands and
maps each operation to a virtual tool, so `cat` becomes a virtual read and `sed
-i` becomes a virtual write. That analysis can escalate a decision but never
downgrade one, which is an honest description of how much it is worth.

Crush reaches the same conclusion from the other side. It bans around sixty
commands outright and adds argument blockers for dangerous subcommands, and the
banned list travels in the tool's own description rather than the system prompt.

This is the ceiling. Gating precision stops where the call stops being
legible, and everything after this section is what harnesses do about it.

## The four proxies

| Proxy        | Decides on                  | When   | Precision                              | Cost                    | Failure                |
| ------------ | --------------------------- | ------ | -------------------------------------- | ----------------------- | ---------------------- |
| a person     | judgement                   | before | high, variable                         | attention               | rubber-stamping        |
| a rule       | tool, args, path, command   | before | high for typed tools, poor for a shell | parsing and maintenance | blind spots            |
| capability   | what the OS allows          | during | strong guarantee, blunt                | setup, false denials    | blocks legitimate work |
| a classifier | a model's reading of intent | before | flexible                               | a model call            | wrong both ways        |

The table hides the two real axes. The first is what you constrain: intent or
capability. A policy and a classifier try to read what the model means, while a
sandbox ignores meaning and bounds what the process can do. The second is when
you decide: policy and sandbox are deterministic and ahead of execution, while a
classifier or a human bring context at the cost of determinism.

## A person

Asking is the oldest answer and still the default everywhere.

Aider gives it the whole job. There is no sandbox and no policy file, only
`confirm_ask` gates before edits and before commands, plus a confirmation for
each file it is allowed to edit.

Codex gives asking a hierarchy. A request goes through policy, then a reviewer,
then a guardian, and only then reaches the user, and a request that has been
approved once is memoised so an identical call does not prompt twice.

OpenHands puts the same idea behind a confirmation policy: never confirm, always
confirm, or confirm the risky ones. Goose asks by default and writes the answer
back: `AlwaysAllow` goes into `permission.yaml` as an `always_allow` entry, so
the next session does not ask again.

The cost is attention, and every harness above pays part of it by trying not to
ask twice. The failure is the one from the previous section: a person who is
asked too often stops reading, and the approval becomes a keystroke.

## A rule

Rules are what you build when you decide the human should not see most of this.

Goose reads `always_allow`, `ask_before` and `never_allow` from a
`permission.yaml`. OpenCode carries `ask`, `allow` and `deny` rulesets per
agent, and prompts separately when a path leaves the workspace. Qwen Code merges
persistent and session rules and resolves conflicts by priority: deny, then ask,
then the default, then allow.

Kimi Code CLI gives every sub-agent its own permission manager with a parent
reference, so rules inherit downwards, and it can drop a whole class of tools
for a side-channel agent that has no business touching anything.

Rules are cheap at runtime, deterministic, and precise exactly as far as the
call is legible. Their blind spot is the same as their strength: a rule can only
match what somebody thought of when they wrote it. Shell parsing is where that
shows first, and the escalation-only virtual operations in Qwen Code are the
most honest version of the compromise.

## Capability

Sandboxing stops trying to read the intent and bounds what the process can do
instead. It is the only proxy that does not care whether the command was
understood.

DeepSeek Harness is the most thorough example. Every confined command is wrapped
in a platform runner: `bubblewrap` plus Landlock on Linux, Seatbelt on macOS, a
restricted token runner on Windows. Candidates are probed once at startup, and a
runner that is missing or unusable fails closed with `SANDBOX_UNAVAILABLE`, so
the command never runs.

Codex picks a sandbox per execution from `None`, `MacosSeatbelt`,
`LinuxSeccomp` and `WindowsRestrictedToken`, and routes network traffic through
an in-process proxy that enforces a domain policy, which is what makes network
access a decision rather than a side effect.

Anthropic's runtime is the same idea packaged: writes denied outside what you
allow, network denied, and the same two primitives underneath.

Two costs come with it. The first is false denials: a sandbox cannot tell a
legitimate build step from a malicious one, so some real work fails. The second
is the escape hatch that follows from it. Codex retries without the sandbox when
the sandbox denies a call. That is a reasonable way to keep working, and it is
also the moment the guarantee evaporates.

## A classifier

If a rule is too brittle and a sandbox too blunt, the obvious remaining move is
to ask a model.

Goose's `SmartApprove` mode does exactly that. Unannotated tools go to a hidden
model call that classifies them as read-only or not, read-only calls are allowed
automatically, and everything else is cached as `AskBefore`.

Qwen Code runs a chain. A fast path allows edits inside the workspace that are
not on a protected list, a safe allowlist covers read-only tools, a
deterministic guard blocks known destructive commands, and only then does an LLM
classifier see the call. That classifier is two-stage and fails closed, so a
timeout or an error means block rather than allow.

OpenHands offers `ConfirmRisky`, which runs an LLM security analyzer and asks
the user only above a high risk threshold.

The costs here are the ones models always have: a call per decision, a latency
floor, and answers that are not reproducible. Qwen Code's own design admits the
last one: after three consecutive blocks, or twenty in a session, `AUTO` mode
downgrades the next call to manual approval.

## Trust is cheap, verification is not

There is a quieter trade running through the two last proxies. An annotation is
a claim, and a sandbox is a verification.

Goose keys part of its permission layer off `ToolAnnotations`: a tool says
whether it is read-only, destructive, idempotent or open-world, and the harness
believes it. That is cheap, and it works right up until a tool lies.

MCP makes lying easy, because the annotations now come from a server somebody
else wrote. We covered that in the tools post, and it is the same trust
boundary: permissions are only as good as the claims they are built on, unless
the containment underneath makes the claims irrelevant.

## The gate that stops being a gate

Everything above assumes the decision is reached and then respected. The
practical failure is that the decision stops being made.

The evidence is in the settings. Qwen Code ships `YOLO` as a supported mode.
Goose ships `Auto`, which allows everything, and `Chat`, which runs with no tool
execution at all, so the agent cannot act but also cannot help. Codex memoises
approvals. DeepSeek Harness accepts a mode that turns every ask into a
deterministic rejection.

None of these are mistakes. They are what happens when the friction is set
wrong: people route around it. Which leads to the design conclusion repeated by
almost every harness reviewed here. Push the routine decisions down into rules
and sandboxes, and keep the human for the calls where the blast radius is large.
A prompt is worth what the reading is worth.

## Blast radius, ordered

The last piece to make concrete. What one yes reaches, worst last.

**A read of a named file.** Cheap to allow, and the basis of every read-only
allowlist. Qwen Code approves these silently.

**A write to a named file.** Still narrow: a tool that can only write one file
cannot also delete your branch.

**A path outside the workspace.** OpenCode stops assuming at this point and
prompts, because the boundary it was using no longer applies.

**A shell command.** Anything the binary can do, which is the whole problem.
Crush spends a deny-list and an argument blocker on it, and Qwen Code spends a
parser.

**A network call.** Reach outside the machine, and the only harness in this
group that treats it as a first-class decision is Codex, through a proxy that
enforces a domain policy.

**A sub-agent.** A second context with its own tool list, and a blast radius
that compounds. Kimi Code CLI handles the cheap end of this by giving a
side-channel agent no tools at all.

Two harnesses opt out of the whole spectrum. Pi has no built-in permission
system and delegates safety to extensions. Aider has no sandbox and no policy,
and treats safety as a conversation.

## What this means if you are picking an agent

The differences that survive are not strict against permissive. Every harness
can be configured to be permissive, and most can be made strict.

What differs is where the decision is made and what evidence it is made from.
Ask your harness two questions. Which proxy does it use for the calls that
matter, and what does one yes cover. The documentation will tell you it asks
before running. It will not tell you what the ask is attached to.

That is the whole trade in one sentence: the closer the proxy gets to what the
call will actually do, the more it costs to compute and the more it rejects
legitimate work, and you can only compute it as far as the tool surface lets you
see.

Read the series from the start:
[how coding agents work](/writing/how-coding-agents-work/).
