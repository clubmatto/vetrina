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
understanding of the anatomy of a coding agent. That exercise thought us
coding agents have five fundamental components:

1. The loop
2. Tool calls
3. Permissions
4. Context management
5. Sessions

We analysed the source code of our shortlisted coding agents through the
lenses of these five components so our comparison is grounded in the same (we
argue simple) mental model we used to explain what a coding agent is made of.

## The loop

:::note[TL;DR]
The loop is nearly identical in structure across the whole list.
:::

In all of them, the loop is a
small part of the codebase, and the interesting decisions are made _around_
the loop. The coding agent is the product _around_ a simple question/answer
loop.

What the loop carries around is where the comparison starts. A model's reply is
not one block of text: it arrives as parts, each with its own type, and the type
is what lets the agent act halfway through the reply instead of waiting for it
to finish. That is what keeps the loop small while everything around it grows.

There is a second thing the loop carries, and this is where the ten part ways.
The conversation it sends the model is built from its own copy of the session,
and that copy is not the same thing as the saved history. Most of the ten let
the two drift apart; only DeepSeek Harness and Codex refuse. DeepSeek Harness
states it as a rule — anything the model can see must already be in the saved
session, and a request is frozen once it goes out — while Codex gets there from
the other side, storing the conversation as a list of items it can read back or
branch.

It matters because of what reads the history afterwards. Resuming replays it,
branching copies it, sub-agents inherit it, and compaction edits it, so a
history that has stopped matching what was actually sent degrades every one of
those features. The agents built for long unattended runs are the two that
refuse the drift, which is not a coincidence.

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

## Tool calls

:::note[TL;DR]
The ten agree on what a tool _is_ — a name, a schema, a function — and split on
how much of that surface the model gets to see. Some hand over the whole set.
Some hide most of it until the model asks. Aider has none at all.
:::

Tool handling is where the list stops looking uniform, because the catalogues
differ by an order of magnitude and the selection policies disagree about how
much the model should be trusted with.

<div class="agent-table-wrapper">
  <table class="agent-table agent-table--rows">
    <thead>
      <tr>
        <th>Agent</th>
        <th>Tool catalogue</th>
        <th>How the model sees them</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="agent-name" data-label="Agent">OpenCode</td>
        <td data-label="Tool catalogue">~15 built-ins, plus MCP and plugins</td>
        <td data-label="How the model sees them">Filtered per agent; GPT-class models get <code>apply_patch</code> instead of <code>edit</code>/<code>write</code></td>
      </tr>
      <tr>
        <td class="agent-name" data-label="Agent">Aider</td>
        <td data-label="Tool catalogue">None: text edit protocols</td>
        <td data-label="How the model sees them">No tool calls at all. The model writes SEARCH/REPLACE blocks or fenced shell and the parser applies them</td>
      </tr>
      <tr>
        <td class="agent-name" data-label="Agent">DeepSeek Harness</td>
        <td data-label="Tool catalogue">A shipped bundle plus installable packages</td>
        <td data-label="How the model sees them">Code Mode: only <code>run_code</code> is native, and every sub-call re-enters the same guarded pipeline</td>
      </tr>
      <tr>
        <td class="agent-name" data-label="Agent">Qwen Code</td>
        <td data-label="Tool catalogue">~30, with wildcard-expanded families</td>
        <td data-label="How the model sees them">Deferred tools stay hidden until <code>tool_search</code> loads them, budget-checked to keep the prompt prefix stable</td>
      </tr>
      <tr>
        <td class="agent-name" data-label="Agent">Pi</td>
        <td data-label="Tool catalogue">7</td>
        <td data-label="How the model sees them">All of them. No visibility mechanism</td>
      </tr>
      <tr>
        <td class="agent-name" data-label="Agent">Kimi CLI</td>
        <td data-label="Tool catalogue">Built-ins, user tools, and MCP</td>
        <td data-label="How the model sees them">Progressive disclosure: MCP and deferred tools load on demand through <code>select_tools</code></td>
      </tr>
      <tr>
        <td class="agent-name" data-label="Agent">Crush</td>
        <td data-label="Tool catalogue">~16 built-ins, plus LSP and MCP resources</td>
        <td data-label="How the model sees them">Scoped per agent; the <code>task</code> agent is restricted to read-only tools</td>
      </tr>
      <tr>
        <td class="agent-name" data-label="Agent">OpenHands</td>
        <td data-label="Tool catalogue">A default trio, plus conditional sets and browser tools</td>
        <td data-label="How the model sees them">Declared by the client per conversation, gated on what the server advertises as usable</td>
      </tr>
      <tr>
        <td class="agent-name" data-label="Agent">Goose</td>
        <td data-label="Tool catalogue">Whatever the extensions provide</td>
        <td data-label="How the model sees them">Everything installed. No visibility mechanism</td>
      </tr>
      <tr>
        <td class="agent-name" data-label="Agent">Codex</td>
        <td data-label="Tool catalogue">~15 handler families: apply_patch, exec, plan, collaboration</td>
        <td data-label="How the model sees them">One static list per turn. No deferral</td>
      </tr>
    </tbody>
  </table>
</div>

## Permissions

:::note[TL;DR]
Almost every agent deals with some variation of gated rules. Only DeepSeek
Harness and Codex make _isolation_ the default. Aider and Pi have no policy
engine: Aider gates actions case by case, and Pi does not gate them at all.
:::

In the first post we laid out the four strategies real agents use:

- **Rule-based ask-approval.** A per-call engine answers allow, ask, or deny.
- **OS-level sandboxing.** A kernel boundary is the baseline.
- **LLM-as-judge.** A hidden model call classifies the risk.
- **No permission by design.** The agent runs with full privileges.

All ten land in the table below, and all four strategies have practitioners
among them. What is worth watching is not which strategy a harness picks, but how far it takes it.

The same tool — "run a bash command" — means something different in each of the
ten:

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

Even from a glance at the table you can tell the default is _prompt-based_
safety: rules and questions. Only two agents make _isolation_ the default:

- **DeepSeek Harness** wraps every command in an operating-system sandbox and
  _fails closed_ when none is available, so if the OS can't confine the command,
  the command never runs.
- **Codex** goes further still, enforcing network policy through an in-process
  man-in-the-middle proxy and hardening its own process before `main()` runs.

Also noticeable: many agents ask an LLM making safety decisions. Goose's
SmartApprove, Qwen's AUTO mode, and Codex's "guardian" all make hidden model
calls to judge whether a tool call is safe. Qwen's classifier is a two-stage
setup: a fast, cheap first pass whose allow path returns in roughly 300ms, plus
a full review for the calls that first pass wants to block — and it fails
closed, so an API error, a timeout, or a malformed response all mean "block,"
not "allow." Safety decisions becoming model calls is a fascinating and
slightly unsettling trend: your safety net now has its own failure modes,
latency, and token bill — and a prompt, however terse, never hallucinates.

Last but not least: Aider's answer is _reversibility_
instead of permissions. It commits your dirty files before editing,
auto-commits every AI edit with a message written by a small model, and gates
`/undo` on session
ownership.

## Context management

:::note[TL;DR]
Our ten coding agents solve context management in a conceptually identical
manner: drop the cheap stuff first, keep the
recent tail verbatim, and only summarize when you must. The how and then
when though is where they differ.
:::

Every agent in the list does some version of the same trick: when the
conversation outgrows a budget, throw away the parts you can afford to lose and
keep the
recent tail.

The convergence is not surprising: a context window is a hard
limit handed to every harness by the provider, and no design can ignore the
limit. Whatever an agent believes about who drives the conversation, the
cheapest tokens to drop are the same tokens. The one place design does reach in
is what gets
assembled before compaction ever runs, and there Aider stands alone — which is
where this section ends.

Four choices are where the personalities show: when to drop old output, how
much recent tail to keep, whether to rewrite the summary or refine it, and
whether compaction is an agent in its own right.

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

There's the question of what context to assemble in the first place. Most of
the ten leave it to the agent at runtime: grep, glob, LSP lookups, paid per
token. Aider is the _only_ exception as it builds a _repo map_: it parses the
codebase with tree-sitter, builds a graph of definition/reference edges, runs
PageRank on it (a search engine's algorithm
deciding what code the model should see), and renders a token-budgeted skeleton
of the important signatures.

## Sessions

:::note[TL;DR]
Three distinct approaches: use a database, use an append-only log, or delegate
to a server.
:::

Sessions are where the conversation stops being a live process and becomes
something you can point at. The moment that happens, every harness has to
decide what the session _is_, and there are only three answers: a database, an
append-only log, or a server. The choice decides what the harness can do with a
session afterwards. A database makes resuming a query and the interface a view
of it. An append-only log makes resume, branching and telemetry projections of
one stream. A server makes the client a client.

<div class="agent-table-wrapper">
  <table class="agent-table agent-table--rows">
    <thead>
      <tr>
        <th>Agent</th>
        <th>Where the conversation lives</th>
        <th>What that buys</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="agent-name" data-label="Agent">OpenCode</td>
        <td data-label="Where the conversation lives">SQLite rows for messages and their parts</td>
        <td data-label="What that buys">Resuming is a <code>SELECT</code>; the TUI is a view of the database</td>
      </tr>
      <tr>
        <td class="agent-name" data-label="Agent">Crush</td>
        <td data-label="Where the conversation lives">SQLite rows, written behind a 33ms debounce</td>
        <td data-label="What that buys">The same, without paying for a write on every token</td>
      </tr>
      <tr>
        <td class="agent-name" data-label="Agent">Codex</td>
        <td data-label="Where the conversation lives">A SQLite index alongside its transcripts</td>
        <td data-label="What that buys">The conversation is both durable and queryable</td>
      </tr>
      <tr>
        <td class="agent-name" data-label="Agent">DeepSeek Harness</td>
        <td data-label="Where the conversation lives">An event log</td>
        <td data-label="What that buys">History, resume, forking and telemetry are all projections of one stream</td>
      </tr>
      <tr>
        <td class="agent-name" data-label="Agent">Qwen, Pi, Kimi</td>
        <td data-label="Where the conversation lives">Event logs, replayed to rebuild state</td>
        <td data-label="What that buys">State is derivable rather than stored</td>
      </tr>
      <tr>
        <td class="agent-name" data-label="Agent">Aider</td>
        <td data-label="Where the conversation lives">A markdown transcript: one line per message</td>
        <td data-label="What that buys">A log you can read, at the cost of structure</td>
      </tr>
      <tr>
        <td class="agent-name" data-label="Agent">OpenHands</td>
        <td data-label="Where the conversation lives">The agent server</td>
        <td data-label="What that buys">The client is a view, so many surfaces share one session</td>
      </tr>
    </tbody>
  </table>
</div>

Those three answers are also a good summary of what each harness is for. Aider's
transcript makes resume lossy — every message becomes plain text, so images and
structured parts do not survive the round trip — while the database systems
re-read and the log systems replay. The pattern underneath is the working
rhythm: a single conversation between one human and one agent stays in a local
file you can read, an agent you expect to run for hours gets a durable log it
can replay, and a system that answers from several surfaces pushes the session
onto a server. OpenHands is the clearest case, because the repository we read is
only the view.

## Conclusions

The biggest lesson of the whole exercise is the one the anatomy hinted at:
**the hard problems are not in the loop, they are in the edges.** Context
overflow, permission negotiation, sub-agent lifecycles, session resume, provider
drift, doom-loop detection — that's where the ten harnesses diverge, that's
where their bug trackers live, and that's where the quality of your daily
experience is decided. The loop itself is a few dozen lines of code. Everything
else is the product.

In the upcoming articles, we'll start digging into specific parts of the
anatomy of a coding agent so stay tuned for more content!

Follow along on the [series page](/writing/how-coding-agents-work/).
