---
title: "A comparative analysis of 10 open source coding agents"
description: We put ten open-source coding agents side by side — where their
  loops live, how they answer safety, context, sub-agents and sessions — and
  what actually separates them.
date: 2026-09-17
draft: true
tags:
  - ai
  - agents
---

In the [first post of this
series](/writing/how-coding-agents-work/) we shortlisted ten open-source coding
agents that we want to understand in depth. A week ago we built
[Pinocchio](/writing/how-coding-agents-work/building-pinocchio/),
a real coding agent in a few hundred lines of Go: a loop, three tools, a y/N
permission prompt, a context squeeze, and a JSONL session file.

Pinocchio is many things — a teaching device, a demystification exercise, a
puppet — but the useful part is the mental model it leaves behind. Once you
have seen the whole anatomy laid out in one file, the ten harnesses stop
looking like opaque products and start looking like ten different sets of
answers to the same handful of questions. That is what this post is: the
shortlist, read in depth, and compared with each other.

The anatomy was five components, so that is the shape of this post. We read the
source of all ten and went through them in the same order we built Pinocchio:
the loop, tool calls, permissions, context management, and sessions. Two more
things turned out to matter enough to compare on their own, and they come after
the five.

## Three buckets

Before the details, the one pattern that survived every comparison. However we
sliced the ten — by architecture, by safety model, by session storage — the
same three groups kept falling out:

- **The pair-programmers: Aider and Pi.** A human-gated conversation. No
  sub-agents, minimal tools, the human drives every turn. Aider is the wise old
  craftsman; Pi is the opinionated minimalist with the richest extension system
  of the bunch.
- **The autonomous loops: OpenCode, DeepSeek Harness, Crush, and Codex.**
  Built for durable, observable, resumable autonomy: conversation as data,
  safety as a first-class subsystem, long runs as the normal case.
- **The platforms: Qwen Code, Goose, and OpenHands.** Optimized for breadth: IM
  channels, desktop apps, SDKs, recipes, hosting other agents.

The three groups differ on almost everything, and they differ in the same
direction every time. They are also a good reminder that "coding agent" is
three products wearing one name.

The contestants, one more time. As a reminder, the selection criteria are the
ones we [went through in the first
post](/writing/how-coding-agents-work/#how-we-chose-10-coding-agents): open
source, multi-provider, no lock-in.

- [OpenCode](https://github.com/anomalyco/opencode) (SST)
- [Aider](https://github.com/Aider-AI/aider)
- [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (DeepSeek)
- [Qwen Code](https://github.com/QwenLM/qwen-code) (Alibaba)
- [Pi](https://github.com/earendil-works/pi)
- [Kimi Code CLI](https://github.com/MoonshotAI/kimi-code) (Moonshot AI)
- [Crush](https://github.com/charmbracelet/crush) (Charmbracelet)
- [OpenHands](https://github.com/OpenHands/OpenHands) (All Hands AI)
- [Goose](https://github.com/aaif-goose/goose) (Block)
- [Codex CLI](https://github.com/openai/codex) (OpenAI)

## The loop, and the parts it moves

**The finding, up front:** the loop is nearly identical everywhere, and message
parts are where the real divergence lives. Nine of the ten run an ordinary loop;
Aider replaces it with a REPL and a text edit protocol. In all ten the loop is a
small part of the codebase, and the interesting decisions are made one level
down, in what the loop reads and what it writes down.

<details class="analysis">
<summary>Where each harness keeps its loop</summary>
<div class="agent-table-wrapper">
  <table class="agent-table agent-table--rows">
    <thead>
      <tr>
        <th>Agent</th>
        <th>The loop</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="agent-name">OpenCode</td>
        <td>A plain <code>while(true)</code> over parts persisted as SQLite rows.</td>
      </tr>
      <tr>
        <td class="agent-name">Aider</td>
        <td>A chat REPL with a text edit protocol; no tool loop at all.</td>
      </tr>
      <tr>
        <td class="agent-name">DeepSeek Harness</td>
        <td><code>while (await turn())</code>, event-driven, fully plugin-composable.</td>
      </tr>
      <tr>
        <td class="agent-name">Qwen Code</td>
        <td>A recursive async generator feeding a streaming UI.</td>
      </tr>
      <tr>
        <td class="agent-name">Pi</td>
        <td>A double <code>while</code>: inner for tool calls, outer for follow-ups that arrive after the agent would have stopped.</td>
      </tr>
      <tr>
        <td class="agent-name">Kimi Code CLI</td>
        <td>A step machine. Each step reads the context, records what happened, and returns; the loop itself keeps no history.</td>
      </tr>
      <tr>
        <td class="agent-name">Goose</td>
        <td>Two loops in one repository: a 6,000-line legacy loop and a new state machine, live side by side during a migration.</td>
      </tr>
      <tr>
        <td class="agent-name">Codex CLI</td>
        <td>A background submission loop plus a per-turn runner, speaking a single event protocol to every client.</td>
      </tr>
      <tr>
        <td class="agent-name">Crush<span class="byline">outside the repo</span></td>
        <td>The loop is <code>charm.land/fantasy</code> (<a href="https://github.com/charmbracelet/fantasy">charmbracelet/fantasy</a>), a library Crush depends on but doesn't vendor. Crush still decides everything around the loop, and calling into a shared loop is a deliberate trade: one implementation, fixed once for everyone who uses it.</td>
      </tr>
      <tr>
        <td class="agent-name">OpenHands<span class="byline">outside the repo</span></td>
        <td>A separate Python agent server owns the loop; the repository we read is the Agent Canvas control plane, a TypeScript frontend watching that server's event stream. The server itself lives in <a href="https://github.com/OpenHands/software-agent-sdk">OpenHands/software-agent-sdk</a>.</td>
      </tr>
    </tbody>
  </table>
</div>
</details>

The more interesting story is what the loop moves. A model's reply is not one
block of text. It arrives as a series of separate pieces, each with its own
type. Some are prose. Some are the model thinking out loud. One might be an
instruction to run a tool, and the next the output of that tool. Another might
be an image.

The types are what let the agent act halfway through a reply. The moment a
piece saying "run this command" arrives, the agent can run the command and feed
the result back into the conversation, without waiting for the rest of the reply
to finish. Codex defines eighteen kinds of these pieces for a single
conversation. That is why the loop can stay small while the system around it
grows.

There is a second thing to notice. When the agent asks the model for the next
step, it builds that request from its own copy of the conversation — and that
copy is not the same thing as the saved history. The two can drift apart.
DeepSeek Harness and Codex are the two that do not let them.

DeepSeek Harness states it as a rule: anything the model can see must already be
in the saved session, and a request is frozen once it goes out. Codex gets there
from the other side, by storing the conversation as a list of items it can read
back or branch.

This matters later, not now. When the request and the history drift apart,
nothing crashes; what breaks are the features that read the history afterwards.
Resuming replays it. Branching copies it. Sub-agents inherit it. And compaction
edits it, which makes the history its input, its output, and its subject — the
one place where getting this wrong compounds. We will come back to compaction
in its own post.

Three ways we saw the drift happen:

- **Tool results flatten into text.** Aider's transcripts are markdown files,
  and its parser turns every message into a role and a string. A tool result
  becomes a block of text with nothing saying which call produced it, and there
  is nowhere to put an image.
- **Reasoning gets thrown away.** Codex keeps an `encrypted_content` blob on its
  reasoning items, because some providers want their own reasoning sent back
  with the next request. It cannot rebuild that blob, only keep it and return
  it. Aider strips reasoning out of the reply before saving it.
- **Deleting to save space can delete the original.** DeepSeek Harness moves
  large tool output to a side store and leaves a reference; Kimi replaces old
  images with a marker telling the model to re-read the file. Once the original
  is gone and only a summary remains, the record has stopped describing what
  happened. Kimi's version is the one that handles this well: if a provider
  rejects the request as too large even after the images are gone, it replaces
  the markers too, so the degradation has stages and the first one is
  recoverable.

This is why "the loop is a few dozen lines" keeps being true and keeps being
unhelpful. The problems in the next sections are all about these pieces and what
happens to them over a long session. The loop just keeps asking for the next
one.

## Tool calls

**The finding, up front:** the loop above does not know what a file is. Tools
are how an agent does anything at all, and the ten differ on two things: which
tools exist, and which of them the model can see at once. A tool is a name, a
JSON schema, and a function to run.

OpenCode ships about fifteen of them: read, write, edit, patch, shell, glob,
grep, task, plan, skill, LSP, web fetch, web search, todo, and a couple more.
Codex has its own list, plus a tool that reports how much context window is
left. DeepSeek Harness has no single list at all: every tool is its own
installable package, so one deployment gets bash and web search and another does
not. Goose is the furthest out — its extensions _are_ MCP servers, so the MCP
ecosystem is its tool set, and installing a tool means installing a server.
Kimi lets the model choose: it ships a `select-tools` tool the model can call to
change which other tools it has.

The second difference is visibility. Nobody hands the model everything at once,
because a hundred tool schemas would swamp the conversation before it starts.
Codex is the most explicit about it, with three levels: a tool is in the model's
initial list, or registered but left out until the model searches for it, or
reachable only as a nested call. OpenCode filters the list per agent, which is
how a read-only explorer sub-agent becomes read-only. Kimi's `select-tools` puts
the same decision in the model's hands.

Two implementations are worth a note. In DeepSeek Harness's Code Mode, the model
stops calling tools directly and writes a small program that calls them, with
every sub-call going through the same permission checks. OpenHands can run a
tool in your browser instead of on the machine running the agent, which lets the
agent drive its own UI.

## Permissions, or who stands between the model and your machine

**The finding, up front:** almost everyone answers with prompts and rules — the
same strategy, taken much further than a y/N prompt. Only DeepSeek Harness and
Codex make _isolation_ the default. Aider answers differently: not with
permissions at all, but with reversibility.

The same tool — "run a bash command" — means something different in every one
of the ten:

<details class="analysis">
<summary>The ten one-line safety models</summary>

```
Pi        no permission system at all; bash runs freely
Aider     per-action confirmations; git is the safety net
Kimi      approval prompts plus a permission policy chain
Crush     61 banned commands + safe-command auto-approval + hooks
OpenCode  allow/ask/deny rules, ask by default, no sandbox
Goose     Auto/Approve/SmartApprove/Chat modes + an LLM judge
Qwen      a layered cascade + a fail-closed LLM classifier
OpenHands server-side policies + LLM analyzer + Docker runtime
dsh       a real OS sandbox (bwrap/Landlock/Seatbelt/ACL), fails closed
Codex     OS sandboxes + exec policy + LLM guardian + network MITM proxy
```

</details>

Pi's README says it plainly: there is no built-in permission system, and the
process runs with the permissions of whoever launched it. A permission gate
exists only as an example extension.

Notice the shape of the list: most of it is _prompt-based_ safety, rules and
questions. Only DeepSeek Harness and Codex make _isolation_ the default — dsh
wraps every command in an operating-system sandbox and _fails closed_ when none
is available: if the OS can't confine the command, the command never runs. Codex
goes further still, enforcing network policy through an in-process
man-in-the-middle proxy and hardening its own process before `main()` runs.

And notice how many rows now contain an LLM making safety decisions. Goose's
SmartApprove, Qwen's AUTO mode, and Codex's "guardian" all make hidden model
calls to judge whether a tool call is safe. Qwen's classifier is a two-stage
setup: a fast, cheap first pass whose allow path returns in roughly 300ms, plus
a full review for the calls that first pass wants to block — and it fails
closed, so an API error, a timeout, or a malformed response all mean "block,"
not "allow." Safety decisions becoming model calls is a fascinating and
slightly unsettling trend: your safety net now has its own failure modes,
latency, and token bill — and a prompt, however terse, never hallucinates.

Worth a special mention: Aider's answer is _reversibility_ instead of
permissioning. It commits your dirty files before editing, auto-commits every
AI edit with a message written by a small model, and gates `/undo` on session
ownership. Git as a safety net — the oldest harness on the list, and arguably
the only one with a genuinely different answer to "what if the agent does
something wrong?"

## The context tax

**The finding, up front:** context management is the field's universal problem,
and the ten have converged on one shape — drop the cheap stuff first, keep the
recent tail verbatim, and only summarize when you must. The personality shows
in the ordering, not in the strategy. The single most elegant implementation is
OpenCode's: compaction is just another hidden agent.

Every one of the ten does some version of the same trick: when the conversation
outgrows a budget, throw away the parts you can afford to lose and keep the
recent tail. This is the most universal problem in the field — long sessions
overflow, and the trigger is usually a fraction of the context window rather
than a fixed size.

The refinement axes are where the personalities show.

<details class="analysis">
<summary>The four refinement axes</summary>

- **Dropping old tool output before summarizing.** The bloat is mostly tool
  output, and old tool outputs can be dropped or truncated _without a model
  call_. OpenCode prunes old tool results first and only then summarizes what
  remains; dsh spills oversized output to a side store and leaves a reference
  behind; Goose summarizes old tool-call/result pairs. Do the cheap thing first.
- **Keeping the recent tail verbatim.** OpenCode reserves the last quarter of
  the usable window; dsh keeps 16%. Whole-transcript summarization exists (Crush does it, with a prompt that bluntly
  tells the model the summary will be
  its _only_ context) but tail-preservation is the dominant design.
- **Updating, not regenerating.** Pi refines its existing summary incrementally
  instead of re-summarizing from scratch every time.
- **Compaction as an agent.** Our favorite implementation detail of the whole
  study: OpenCode implements summarization as a hidden agent — no tools, its own
  prompt, deny-by-default permissions. Compaction is just another model call,
  which makes it testable and overridable like any other agent.

</details>

And before compaction even enters the picture, there's the question of what
context to assemble in the first place. Most of the ten leave it to the agent
at runtime: grep, glob, LSP lookups, paid per token. Aider is the exception. It
builds a _repo map_: it parses the codebase with tree-sitter, builds a graph of
definition/reference edges, runs PageRank on it (a search engine's algorithm
deciding what code the model should see), and renders a token-budgeted skeleton
of the important signatures. It's the only pre-built index on the list.

## Sessions, or where the conversation lives

**The finding, up front:** there are only three answers — a database, an
append-only log, or a server. The conversation is also the one component where
the three buckets separate perfectly, with no exceptions.

<details class="analysis">
<summary>The three answers, and where each harness lands</summary>

1. **The database is the truth.** OpenCode persists messages and their parts as
   SQLite rows, which makes resuming a `SELECT` and the TUI a database view.
   Crush does the same with a 33ms write debounce. Codex keeps a SQLite index
   alongside its transcripts.
2. **The append-only log is the truth.** dsh, Qwen, Pi, and Kimi write event logs
   and rebuild state by replaying them. dsh is the purest expression: the session _is_ the log, and history, resume,
   forking, and telemetry are all projections
   of the same event stream.
3. **The server is the truth.** OpenHands keeps conversations on the agent
   server; the control-plane client is a view.

Resume quality varies accordingly, from trivial (re-read SQLite) to lossy (Aider restores a session by replaying a
markdown transcript — every message
becomes plain text, so images and structured parts don't survive the round
trip). When we squint at persistence and architecture together, the three
buckets we opened with line up exactly: the pair-programmers keep files, the
autonomous loops either own a database or own an event log, and the platforms
push the session onto a server. OpenHands is the clearest case — its
conversations live on the agent server, and the repository we read is the view.

</details>

The config models deserve a footnote of their own, because they say a lot about
each project: config as data (JSON/YAML/TOML), config as code (Crush's `crushrc`
is a _bash script_ executed by the same interpreter as its bash tool), config as
composition (dsh composes profiles out of plugin bundles and patch layers — even
its agent loop is a replaceable row), and config as god-object (Qwen's central
`Config` class is nearly 9,000 lines).

## Beyond the five components

Two more things are not part of the anatomy above, but they are where the ten
diverge most, so they get their own sections: how agents hand work to other
agents, and how well they avoid locking you to one model.

## Sub-agents, or the org chart

The five-component anatomy treats an agent as one actor. This chapter is about
what happens when it is not.

**The finding, up front:** eight of the ten let the model delegate, and they
have converged so tightly that the interesting part is the exceptions. Aider
and Pi have no sub-agents by design. The other eight agree on the shape — a
task-style tool, a built-in read-only explorer, a depth limit — and differ
mainly in what a sub-agent _is_: a session, a forked thread, or a budget.

The eight that do have converged on a recognizable pattern: a `task`-style tool (a prompt plus an agent type), built-in
specialized agents (always a read-only
explorer, sometimes a planner), foreground or background execution, and depth
limits so delegation can't recurse forever. Goose allows exactly one level — a
delegate that tries to spawn its own delegate gets an error, and nested
delegation is a supervised "CRITICAL" failure in Goose's own self-test suite.
dsh defaults to three.

The implementations reveal the personalities.

<details class="analysis">
<summary>What a sub-agent actually is, per harness</summary>

Crush makes every sub-agent a _real database session_ linked to its parent,
with the child's cost rolling up to the parent. Codex _forks_ sub-agents from
the parent's persisted history, so a sub-agent is a full thread with its own
rollout file. Kimi adds a "swarm" tool for parallel batches, plus a "btw"
side-channel: a forked child agent restricted to the read-only tools, answering
your side questions without interrupting the main run. Qwen goes furthest, with
git-worktree isolation, team agents, and a full goal system — a state machine
that keeps the agent looping toward an objective even after it would otherwise
have stopped, with an independent LLM verifier deciding whether the goal is
actually done. It is budgeted rather than iteration-capped: a 30M-token default
budget, an optional turn budget, and a stop after three consecutive failed
evidence checkpoints.

Which brings us to the two that ship nothing: **Aider and Pi deliberately have
no sub-agents** — the cleanest philosophical split in the whole comparison:
task-tree orchestration versus a single, human-steerable conversation.

One more nuance most users never see: "parallel" usually means _parallel tool
calls inside a sequential loop_ — and often less than that. Codex sets
`parallel_tool_calls: true` in the prompt it sends the model, but at execution
time each tool has to opt in: parallel-capable tools share a read lock, and
everything else takes the write lock, which makes the default serial. Prompt
permission and runtime behaviour are two different switches.

</details>

## How multi-provider is each, really

**The finding, up front:** all ten clear the bar, and none of them clears it the
same way. Three treat model-agnosticism as the architecture, two maintain a
protocol shim, one routes through its own adapter layer, and one treats it as a
config detail. The sharpest lesson is that the provider layer leaks into the
loop: the model you pick changes the tools the agent uses.

Multi-provider is easy to claim and hard to do well: an OpenAI-compatible
endpoint is a one-line change, a genuinely provider-neutral agent is not. All
ten pass our multi-provider bar, but the _quality_ of the agnosticism varies
more than we expected.

<details class="analysis">
<summary>How each harness reaches other providers</summary>

For Aider, Pi, and Crush, model-agnosticism is the architecture: dedicated
gateway layers (LiteLLM, Pi's own `pi-ai`, Crush's `catwalk`) built for exactly
this. For OpenCode and Qwen it's a maintained shim with real per-protocol
engineering behind it — Qwen (which began life as a fork of Google's Gemini CLI
before diverging) converts every provider's responses into Gemini-shaped types
internally. DeepSeek Harness reaches multi-provider the other way around,
through its own plugin and adapter layers rather than a gateway library: one
adapter speaks DeepSeek directly, and a second one (`llm-pi-ai`) carries the
rest, routing requests through pi-ai's provider catalogs, OpenAI-compatible
gateways, and hand-declared custom routes. Both ship in the default composition.
And for Codex it's a config detail: OpenAI-protocol first, everything else
squeezed through custom provider definitions.

The provider layer leaks into the loop more than you'd expect. OpenCode swaps
its `edit`/`write` tools for `apply_patch` when it detects a GPT-class model.
Aider stores a per-model `edit_format` and picks its text protocol accordingly.
Multi-provider is not a login screen; it changes what the agent does.

</details>

## Three philosophies, one fork in the road

Three groups, and each optimizes for a different thing:

- **The pair-programmers.** Aider and Pi are built around a human-gated
  conversation: no sub-agents, minimal tools, the human drives every turn. They
  win on ergonomics and lose on unattended work.
- **The autonomous loops.** OpenCode, DeepSeek Harness, Codex, and Crush build
  for durable, observable, resumable autonomy: conversation as data, safety as a
  first-class subsystem, long runs as the normal case. OpenCode is the
  disciplined engineer, dsh the principled researcher, Crush the polished
  harness-maker, Codex the security appliance.
- **The platforms.** Qwen, Goose, and OpenHands optimize for breadth: IM
  channels, desktop apps, SDKs, recipes, hosting other agents. Impressive
  surfaces — and, we suspect, the most expensive to maintain.

We opened this series by explaining that our agentic programming is a close
collaboration: we drive, the agent executes, nobody runs unsupervised for hours.
Reading the source confirmed that this is a real fork in the road, not a
preference dial — the pair-programmer harnesses are built differently, down to
their session model.

The biggest lesson of the whole exercise is the one the anatomy hinted at:
**the hard problems are not in the loop, they are in the edges.** Context
overflow, permission negotiation, sub-agent lifecycles, session resume, provider
drift, doom-loop detection — that's where the ten harnesses diverge, that's
where their bug trackers live, and that's where the quality of your daily
experience is decided. The loop itself is a few dozen lines of code. Everything
else is the product.

## What's next

The plan for the next posts is to publish our per-agent deep dives, one harness
at a time, starting with the one we run ourselves:
[OpenCode](https://github.com/anomalyco/opencode). If the first two posts were
the anatomy class, the deep dives are the dissections.

Follow along on the [series page](/writing/how-coding-agents-work/)
