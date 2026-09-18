---
title: "A comparative analysis of 10 open source coding agents"
description: We read ten open-source coding agents through the same five
  components — the loop, tools, permissions, context, sessions — and found
  where they agree on the anatomy and split on everything else.
date: 2026-09-17
draft: true
tags:
  - ai
  - agents
---

In the [first post of this
series](/writing/how-coding-agents-work/) we shortlisted ten open-source coding
agents. The idea is to use them as a reference of how coding agents work. A week
ago we built
[Pinocchio](/writing/how-coding-agents-work/building-pinocchio/),
a tiny coding agent so we could have a better
understanding of the anatomy of a coding agent. That exercise landed us on
five fundamental components:

1. The loop
2. Tool calls
3. Permissions
4. Context management
5. Sessions

We analysed the source code of our shortlisted coding agents through the
lenses of these five components so our comparison is grounded in the same (we
argue simple) mental model we used to build Pinocchio.

As a reminder, the selection criteria are the
ones we [went through in the first
post](/writing/how-coding-agents-work/#how-we-chose-10-coding-agents): open
source, multi-provider, no lock-in.

## The loop

:::note[TL;DR]
the loop is nearly identical everywhere, and message
parts are where the real divergence lives. Nine of the ten run an ordinary loop;
Aider replaces it with a REPL and a text edit protocol. In all ten the loop is a
small part of the codebase, and the interesting decisions are made one level
down, in what the loop reads and what it writes down. The loop is the same
everywhere because there is only one thing for it to speak: all ten send the
same
request-parts-answer shape, because that is what the model APIs hand them. What
differs is what a part is allowed to be and where the parts are kept, which is
exactly what the rest of this section is about.
:::

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
        <td class="agent-name" data-label="Agent">OpenCode</td>
        <td data-label="The loop">A plain <code>while(true)</code> over parts persisted as SQLite rows.</td>
      </tr>
      <tr>
        <td class="agent-name" data-label="Agent">Aider</td>
        <td data-label="The loop">A chat REPL with a text edit protocol; no tool loop at all.</td>
      </tr>
      <tr>
        <td class="agent-name" data-label="Agent">DeepSeek Harness</td>
        <td data-label="The loop"><code>while (await turn())</code>, event-driven, fully plugin-composable.</td>
      </tr>
      <tr>
        <td class="agent-name" data-label="Agent">Qwen Code</td>
        <td data-label="The loop">A recursive async generator feeding a streaming UI.</td>
      </tr>
      <tr>
        <td class="agent-name" data-label="Agent">Pi</td>
        <td data-label="The loop">A double <code>while</code>: inner for tool calls, outer for follow-ups that arrive after the agent would have stopped.</td>
      </tr>
      <tr>
        <td class="agent-name" data-label="Agent">Kimi Code CLI</td>
        <td data-label="The loop">A step machine. Each step reads the context, records what happened, and returns; the loop itself keeps no history.</td>
      </tr>
      <tr>
        <td class="agent-name" data-label="Agent">Goose</td>
        <td data-label="The loop">Two loops in one repository: a 6,000-line legacy loop and a new state machine, live side by side during a migration.</td>
      </tr>
      <tr>
        <td class="agent-name" data-label="Agent">Codex CLI</td>
        <td data-label="The loop">A background submission loop plus a per-turn runner, speaking a single event protocol to every client.</td>
      </tr>
      <tr>
        <td class="agent-name" data-label="Agent">Crush<span class="byline">outside the repo</span></td>
        <td data-label="The loop">The loop is <code>charm.land/fantasy</code> (<a href="https://github.com/charmbracelet/fantasy">charmbracelet/fantasy</a>), a library Crush depends on but doesn't vendor. Crush still decides everything around the loop, and calling into a shared loop is a deliberate trade: one implementation, fixed once for everyone who uses it.</td>
      </tr>
      <tr>
        <td class="agent-name" data-label="Agent">OpenHands<span class="byline">outside the repo</span></td>
        <td data-label="The loop">A separate Python agent server owns the loop; the repository we read is the Agent Canvas control plane, a TypeScript frontend watching that server's event stream. The server itself lives in <a href="https://github.com/OpenHands/software-agent-sdk">OpenHands/software-agent-sdk</a>.</td>
      </tr>
    </tbody>
  </table>
</div>

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

:::note[TL;DR]
the loop above does not know what a file is. Tools
are how an agent does anything at all, and the ten differ on two things: which
tools exist, and which of them the model can see at once. A tool is a name, a
JSON schema, and a function to run — and that abstraction is identical
everywhere, because there is one tool-call protocol to speak. What differs is
how much surface each agent chooses to expose to the model, and how carefully it
hides the rest. That is a question of ambition rather than category, which is
why
the names below do not sort into tidy groups.
:::

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

## Permissions

:::note[TL;DR]
Almost every agent deals with some variation of gated rules. Only DeepSeek
Harness and Codex make _isolation_ the default. Aider/Pi have no rules.
:::

In the first post we laid out the four strategies real agents use: rule-based
ask-approval, where a per-call engine answers allow, ask, or deny; OS-level
sandboxing, where a kernel boundary is the baseline; LLM-as-judge, where a
hidden
model call classifies the risk; and no permission by design, where the agent
runs
with full privileges. All ten land in the table below, and all four strategies
have practitioners among them. What is worth watching is not which strategy a
harness picks, but how far it takes it.

The same tool — "run a bash command" — means something different in every one
of the ten:

<div class="agent-table-wrapper">
  <table class="agent-table agent-table--rows">
    <thead>
      <tr>
        <th>Agent</th>
        <th>Strategy</th>
        <th>Detail</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="agent-name" data-label="Agent">Pi</td>
        <td data-label="Strategy">None by design</td>
        <td data-label="Detail">No permission system at all; bash runs freely.</td>
      </tr>
      <tr>
        <td class="agent-name" data-label="Agent">Aider</td>
        <td data-label="Strategy">Reversibility</td>
        <td data-label="Detail">Per-action confirmations with git as the safety net, rather than a permission gate.</td>
      </tr>
      <tr>
        <td class="agent-name" data-label="Agent">Kimi</td>
        <td data-label="Strategy">Rule-based</td>
        <td data-label="Detail">Approval prompts plus a permission policy chain.</td>
      </tr>
      <tr>
        <td class="agent-name" data-label="Agent">Crush</td>
        <td data-label="Strategy">Rule-based</td>
        <td data-label="Detail">61 banned commands, safe-command auto-approval, and hooks.</td>
      </tr>
      <tr>
        <td class="agent-name" data-label="Agent">OpenCode</td>
        <td data-label="Strategy">Rule-based</td>
        <td data-label="Detail">Allow/ask/deny rules, ask by default, no sandbox.</td>
      </tr>
      <tr>
        <td class="agent-name" data-label="Agent">Goose</td>
        <td data-label="Strategy">Rule-based + LLM judge</td>
        <td data-label="Detail">Auto/Approve/SmartApprove/Chat modes plus an LLM judge.</td>
      </tr>
      <tr>
        <td class="agent-name" data-label="Agent">Qwen</td>
        <td data-label="Strategy">LLM-as-judge</td>
        <td data-label="Detail">A layered cascade with a fail-closed LLM classifier.</td>
      </tr>
      <tr>
        <td class="agent-name" data-label="Agent">OpenHands</td>
        <td data-label="Strategy">Rule-based + LLM judge</td>
        <td data-label="Detail">Server-side policies, an LLM analyzer, and a Docker runtime.</td>
      </tr>
      <tr>
        <td class="agent-name" data-label="Agent">DeepSeek Harness</td>
        <td data-label="Strategy">OS-level sandboxing</td>
        <td data-label="Detail">A real OS sandbox (bwrap/Landlock/Seatbelt/ACL); fails closed.</td>
      </tr>
      <tr>
        <td class="agent-name" data-label="Agent">Codex</td>
        <td data-label="Strategy">OS-level sandboxing</td>
        <td data-label="Detail">OS sandboxes, exec policy, an LLM guardian, and a network MITM proxy.</td>
      </tr>
    </tbody>
  </table>
</div>

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
ownership. Five strategies, then: that one is not a stricter or looser version
of the other four, which is why it gets its own paragraph. Git as a safety net —
the oldest harness on the list, and arguably the only one with a genuinely
different answer to "what if the agent does something wrong?"

## Context management

:::note[TL;DR]
Our ten coding agents solve context management in a conceptually identical
manner: drop the cheap stuff first, keep the
recent tail verbatim, and only summarize when you must. The how and then
when though is where they differ.
:::

Every one of the ten does some version of the same trick: when the conversation
outgrows a budget, throw away the parts you can afford to lose and keep the
recent tail. This is the most universal problem in the field — long sessions
overflow, and the trigger is usually a fraction of the context window rather
than a fixed size. The convergence is not surprising: a context window is a hard
limit handed to every harness by the provider, and no design can argue with it.
Whatever an agent believes about who drives the conversation, the cheapest
tokens
to drop are the same tokens. The one place design does reach in is what gets
assembled before compaction ever runs, and there Aider stands alone — which is
where this section ends.

The refinement axes are where the personalities show.

- **Dropping old tool output before summarizing.** The bloat is mostly tool
  output, and old tool outputs can be dropped or truncated _without a model
  call_. OpenCode prunes old tool results first and only then summarizes what
  remains; dsh spills oversized output to a side store and leaves a reference
  behind; Goose summarizes old tool-call/result pairs. Do the cheap thing first.
- **Keeping the recent tail verbatim.** OpenCode reserves the last quarter of
  the usable window; dsh keeps 16%. Whole-transcript summarization exists (Crush
  does it, with a prompt that bluntly
  tells the model the summary will be
  its _only_ context) but tail-preservation is the dominant design.
- **Updating, not regenerating.** Pi refines its existing summary incrementally
  instead of re-summarizing from scratch every time.
- **Compaction as an agent.** Our favorite implementation detail of the whole
  study: OpenCode implements summarization as a hidden agent — no tools, its own
  prompt, deny-by-default permissions. Compaction is just another model call,
  which makes it testable and overridable like any other agent.

And before compaction even enters the picture, there's the question of what
context to assemble in the first place. Most of the ten leave it to the agent
at runtime: grep, glob, LSP lookups, paid per token. Aider is the exception. It
builds a _repo map_: it parses the codebase with tree-sitter, builds a graph of
definition/reference edges, runs PageRank on it (a search engine's algorithm
deciding what code the model should see), and renders a token-budgeted skeleton
of the important signatures. It's the only pre-built index on the list.

## Sessions

:::note[TL;DR]
there are only three answers — a database, an
append-only log, or a server. Nowhere else in this comparison do the answers
separate so perfectly, with no exceptions: where the conversation lives is the
purest expression of what each agent thinks it is for. An agent that imagines
a
human and a machine working through a problem together keeps a file they can
both
read. An agent that imagines running for hours keeps a record it can
replay. An agent that imagines many surfaces sharing one brain keeps the
conversation somewhere central and lets the surfaces stay views.
:::

1. **The database is the truth.** OpenCode persists messages and their parts as
   SQLite rows, which makes resuming a `SELECT` and the TUI a database view.
   Crush does the same with a 33ms write debounce. Codex keeps a SQLite index
   alongside its transcripts.
2. **The append-only log is the truth.** dsh, Qwen, Pi, and Kimi write event
   logs
   and rebuild state by replaying them. dsh is the purest expression: the
   session _is_ the log, and history, resume,
   forking, and telemetry are all projections
   of the same event stream.
3. **The server is the truth.** OpenHands keeps conversations on the agent
   server; the control-plane client is a view.

Resume quality varies accordingly, from trivial (re-read SQLite) to lossy (Aider
restores a session by replaying a
markdown transcript — every message
becomes plain text, so images and structured parts don't survive the round
trip). When we squint at persistence and architecture together, the three
answers line up with what each harness is for: the pair-programmers keep files,
the autonomous loops either own a database or own an event log, and the
platforms
push the session onto a server. OpenHands is the clearest case — its
conversations live on the agent server, and the repository we read is the view.

The config models deserve a footnote of their own, because they say a lot about
each project: config as data (JSON/YAML/TOML), config as code (Crush's `crushrc`
is a _bash script_ executed by the same interpreter as its bash tool), config as
composition (dsh composes profiles out of plugin bundles and patch layers — even
its agent loop is a replaceable row), and config as god-object (Qwen's central
`Config` class is nearly 9,000 lines).

## Conclusions

The biggest lesson of the whole exercise is the one the anatomy hinted at:
**the hard problems are not in the loop, they are in the edges.** Context
overflow, permission negotiation, sub-agent lifecycles, session resume, provider
drift, doom-loop detection — that's where the ten harnesses diverge, that's
where their bug trackers live, and that's where the quality of your daily
experience is decided. The loop itself is a few dozen lines of code. Everything
else is the product.

The plan for the next posts is to publish our per-agent deep dives, one harness
at a time, starting with the one we run ourselves:
[OpenCode](https://github.com/anomalyco/opencode). If the first two posts were
the anatomy class, the deep dives are the dissections.

Follow along on the [series page](/writing/how-coding-agents-work/)
