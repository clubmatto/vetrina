---
title: "A comparative analysis of 10 open source coding agents"
description: We read ten open-source coding agents through the same five
  components — the loop, tools, permissions, context, sessions — and found
  where they agree on the anatomy and split on everything else.
date: 2026-09-22
tags:
  - ai
  - agents
image: /assets/writing/comparative-analysis-of-coding-agents.png
image_width: 2400
image_height: 1260
---

In the [first post of this
series](/writing/how-coding-agents-work/) we shortlisted ten open-source coding
agents. The idea is to use them as a reference to learn how coding agents work. A week
ago we built
[Pinocchio](/writing/how-coding-agents-work/building-pinocchio/),
a tiny coding agent, so we could have a better
understanding of the anatomy it shares with the others. That exercise taught us
coding agents have five fundamental components:

1. The loop
2. Tool calls
3. Permissions
4. Context management
5. Sessions

We analysed the source code of every project in our shortlist through the
lens of these five components, so our comparison is grounded in the same (simple) mental model we used to explain
what a coding agent is made of.

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
The conversation sent to the model is built from the agent's own copy of the session,
and that copy may or might not be the same thing as the saved history. The two can drift
apart, and most of the ten do nothing to stop them. DeepSeek Harness enforces the
opposite as a rule: anything the model can see must already be in the saved
session, and a request is frozen once it goes out. Codex gets there from the
other side, storing the conversation as a list of items it can read back or
branch. OpenCode takes a third route, rebuilding the request from the stored
parts on each turn rather than keeping its own copy to edit.

It matters because of how the history is used afterwards. Resuming replays it,
branching copies it, sub-agents inherit it, and compaction edits it, so a
history that has stopped matching what was actually sent degrades every one of
those features. The agents built for long unattended runs are the two that
refuse the drift, which is not a coincidence.

In practice, there are several symptoms such a drift is happening. More on that
later, when we discuss [compaction](#context-management).

## Tool calls

:::note[TL;DR]
The ten agree on what a tool _is_ — a name, a schema, a function — and split on
how much of that surface the model gets to see. Some hand over the whole set.
Some hide most of it until the model asks. Aider has none at all.
:::

Tool handling is where the list stops looking uniform, because the catalogues
differ by an order of magnitude and the selection policies disagree about how
much the model should be trusted with upfront.

<div class="agent-table-wrapper">
  <table class="agent-table agent-table--rows">
    <thead>
      <tr>
        <th>Agent</th>
        <th>Catalogue</th>
        <th>How the model sees them</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="agent-name" data-label="Agent">Aider</td>
        <td data-label="Catalogue">None: text edit protocols</td>
        <td data-label="How the model sees them">No tool calls at all. The model writes SEARCH/REPLACE blocks or fenced shell scripts and the parser applies them</td>
      </tr>
      <tr>
        <td class="agent-name" data-label="Agent">Codex</td>
        <td data-label="Catalogue">~15 handler families: apply_patch, exec, plan, collaboration</td>
        <td data-label="How the model sees them">Three ways a tool gets exposed: in the initial list, deferred into a namespace until the model searches for it, or reachable only as a nested call</td>
      </tr>
      <tr>
        <td class="agent-name" data-label="Agent">Crush</td>
        <td data-label="Catalogue">~16 built-ins, plus LSP and MCP resources</td>
        <td data-label="How the model sees them">Scoped per agent; the <code>task</code> agent is restricted to read-only tools</td>
      </tr>
      <tr>
        <td class="agent-name" data-label="Agent">DeepSeek Harness</td>
        <td data-label="Catalogue">A shipped bundle plus installable packages</td>
        <td data-label="How the model sees them">Code Mode: only <code>run_code</code> is native, and every sub-call re-enters the same guarded pipeline</td>
      </tr>
      <tr>
        <td class="agent-name" data-label="Agent">Goose</td>
        <td data-label="Catalogue">Whatever the extensions provide</td>
        <td data-label="How the model sees them">Everything installed. No visibility control mechanism</td>
      </tr>
      <tr>
        <td class="agent-name" data-label="Agent">Kimi CLI</td>
        <td data-label="Catalogue">Built-ins, user tools, and MCP</td>
        <td data-label="How the model sees them">Progressive disclosure: MCP and deferred tools load on demand through <code>select_tools</code></td>
      </tr>
      <tr>
        <td class="agent-name" data-label="Agent">OpenCode</td>
        <td data-label="Catalogue">~15 built-ins, plus MCP and plugins</td>
        <td data-label="How the model sees them">Filtered per agent; GPT-class models get <code>apply_patch</code> instead of <code>edit</code>/<code>write</code></td>
      </tr>
      <tr>
        <td class="agent-name" data-label="Agent">OpenHands</td>
        <td data-label="Catalogue">A default trio, plus conditional sets and browser tools</td>
        <td data-label="How the model sees them">Declared by the client per conversation, gated on what the server advertises as usable</td>
      </tr>
      <tr>
        <td class="agent-name" data-label="Agent">Pi</td>
        <td data-label="Catalogue">7</td>
        <td data-label="How the model sees them">All of them. No visibility control mechanism</td>
      </tr>
      <tr>
        <td class="agent-name" data-label="Agent">Qwen Code</td>
        <td data-label="Catalogue">~30, with wildcard-expanded families</td>
        <td data-label="How the model sees them">Deferred tools stay hidden until <code>tool_search</code> loads them, budget-checked to keep the prompt prefix stable</td>
      </tr>
    </tbody>
  </table>
</div>

## Permissions

:::note[TL;DR]
Almost every agent deals with some variation of gated rules. Only DeepSeek
Harness and Codex make _isolation_ the default. Aider gates actions case by case, and Pi does not gate them at all.
:::

In the first post we laid out the four general strategies currently employed by the coding agents in the shortlist:

- **Rule-based ask-approval.** A per-call engine answers allow, ask, or deny.
- **OS-level sandboxing.** A kernel boundary is the baseline.
- **LLM-as-judge.** A hidden model call classifies the risk.
- **No permission by design.** The agent runs with full privileges.

Let's see concretely which strategy each agent picks:

<div class="agent-table-wrapper">
  <table class="agent-table agent-table--rows">
    <thead>
      <tr>
        <th>Agent</th>
        <th>Strategy</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="agent-name" data-label="Agent">Aider</td>
        <td data-label="Strategy">Reversibility</td>
      </tr>
      <tr>
        <td class="agent-name" data-label="Agent">Codex</td>
        <td data-label="Strategy">OS-level sandboxing</td>
      </tr>
      <tr>
        <td class="agent-name" data-label="Agent">Crush</td>
        <td data-label="Strategy">Rule-based</td>
      </tr>
      <tr>
        <td class="agent-name" data-label="Agent">DeepSeek Harness</td>
        <td data-label="Strategy">OS-level sandboxing</td>
      </tr>
      <tr>
        <td class="agent-name" data-label="Agent">Goose</td>
        <td data-label="Strategy">Rule-based + LLM judge</td>
      </tr>
      <tr>
        <td class="agent-name" data-label="Agent">Kimi</td>
        <td data-label="Strategy">Rule-based</td>
      </tr>
      <tr>
        <td class="agent-name" data-label="Agent">OpenCode</td>
        <td data-label="Strategy">Rule-based</td>
      </tr>
      <tr>
        <td class="agent-name" data-label="Agent">OpenHands</td>
        <td data-label="Strategy">Rule-based + LLM judge</td>
      </tr>
      <tr>
        <td class="agent-name" data-label="Agent">Pi</td>
        <td data-label="Strategy">None by design</td>
      </tr>
      <tr>
        <td class="agent-name" data-label="Agent">Qwen</td>
        <td data-label="Strategy">LLM-as-judge</td>
      </tr>
    </tbody>
  </table>
</div>

Pi's README says it plainly: there is no built-in permission system, and the
process runs with the permissions of whoever launched it. A permission gate
exists only as an example extension.

Almost everything else in the table is some variation of the same idea. OpenCode
evaluates "allow", "ask" and "deny" rules and asks by default. Kimi layers approval
prompts on top of a permission policy chain. Crush bans sixty commands outright
and auto-approves the ones it knows are safe. OpenHands moves the whole question
server-side, with policies written by the client and a Docker runtime
underneath.
Only two agents make _isolation_ the default:

- **DeepSeek Harness** wraps every command in an operating-system sandbox and _fails closed_ when none is available, so
  if the OS can't confine the command, the command never runs.
- **Codex** goes further still, enforcing network policy through an in-process
  man-in-the-middle proxy and hardening its own process before `main()` runs.

Also noticeable: many agents ask an LLM making safety decisions. Goose's
SmartApprove, Qwen's AUTO mode, and Codex's "guardian" all make hidden model
calls to judge whether a tool call is safe. Qwen's classifier is a two-stage
setup: a fast, cheap first pass whose allow path returns in roughly 300ms, plus
a full review for the calls that first pass wants to block.

Safety decisions becoming model calls is a fascinating and slightly
unsettling trend: your safety net now has its own failure modes,
latency, and token bill.

Last but not least: Aider's answer is _reversibility_
instead of permissions. It commits your dirty files before editing,
auto-commits every AI edit with a message written by a small model, and gates
`/undo` on session ownership. We have not used Aider yet, so it is still unclear
to us how it deals with state that is not in git.

## Context management

:::note[TL;DR]
Our ten coding agents solve context management in a conceptually identical
manner: drop the cheap stuff first, keep the
recent tail verbatim, and only summarize when you must. How and when this happens, though, is where they differ.
:::

Every agent in the list does some version of the same trick: when the
conversation outgrows a budget, throw away the parts you can afford to lose and
keep the recent tail. The convergence is not surprising: context window is a
hard provider limit, and no design can ignore it.

Four choices are where the coding agent personalities show: when to drop old
output, how much recent tail to keep, whether to rewrite the summary or refine
it, and
whether compaction is an agent in its own right.

- **Dropping old tool output before summarizing.** The bloat is mostly tool
  output, and old tool outputs can be dropped or truncated _without a model
  call_. OpenCode prunes old tool results first and only then summarizes what
  remains; dsh spills oversized output to a side store and leaves a reference
  behind; Goose summarizes old tool-call/result pairs.
- **Keeping the recent tail verbatim.** OpenCode reserves the last quarter of
  the usable window; dsh keeps 16%. Whole-transcript summarization exists (Crush
  does it, with a prompt that bluntly tells the model the summary will be its _only_ context) but tail-preservation is
  the dominant design.
- **Updating, not regenerating.** Pi refines its existing summary incrementally
  instead of re-summarizing from scratch every time.
- **Compaction as an agent.** One very cool implementation detail: OpenCode
  implements summarization as a hidden agent — no tools, its own
  prompt, deny-by-default permissions. Compaction is just another model call,
  which makes it testable and overridable.

Context compaction is very important because, as explained, it's a limit you
can't avoid dealing with. But equally important is the
question of what context to assemble in the first place. Most agents abdicate
the decision to the LLM at runtime: a specialized prompt the answer of which dictates what goes inside the initial
context.

Aider is the _only_ exception as it builds a _repo map_: it parses the
codebase with tree-sitter, builds a graph of definition/reference edges, runs
PageRank on it (a search engine's algorithm
deciding what code the model should see. We're not convinced this is the
right algorithm but love the general strategy), and renders a token-budgeted
skeleton of the important signatures.

As we said earlier, context compaction is where the eventual drift between conversation and session histories have a
concrete and visible impact:

- **Tool results never make it back at all.** Aider's transcripts are markdown
  files, written one fragment at a time. Replaying one turns every message into
  a role and a string, and tool messages are dropped outright — so a resumed
  session has no record of what ran, let alone which call produced it, and
  there is nowhere to put an image.
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

## Sessions

:::note[TL;DR]
Three distinct approaches: use a database, use an append-only log, or delegate
to a server.
:::

Sessions are how coding agents persist your conversations. That means every
harness has to decide how to persist, and our list gave us three
answers: a database, an append-only log, or a server.

As every programming decision, this leads to different tradeoffs. With a database, resuming session only takes a query
and the agent interface can become a simple view on top of the raw tables. An append-only log makes resuming, branching
and telemetry projections of one stream. Delegating to a server makes the agent a "dumb" client that
doesn't need to know anything about where sessions are and how they're stored.

Here's the overview:

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
        <td class="agent-name" data-label="Agent">Aider</td>
        <td data-label="Where the conversation lives">A markdown transcript: one line per message</td>
        <td data-label="What that buys">A log you can read, at the cost of structure</td>
      </tr>
      <tr>
        <td class="agent-name" data-label="Agent">Codex</td>
        <td data-label="Where the conversation lives">A SQLite index alongside its transcripts</td>
        <td data-label="What that buys">The conversation is both durable and queryable</td>
      </tr>
      <tr>
        <td class="agent-name" data-label="Agent">Crush</td>
        <td data-label="Where the conversation lives">SQLite rows, written behind a 33ms debounce</td>
        <td data-label="What that buys">The same, without paying for a write on every token</td>
      </tr>
      <tr>
        <td class="agent-name" data-label="Agent">DeepSeek Harness</td>
        <td data-label="Where the conversation lives">An event log</td>
        <td data-label="What that buys">History, resume, forking and telemetry are all projections of the same stream</td>
      </tr>
      <tr>
        <td class="agent-name" data-label="Agent">OpenCode</td>
        <td data-label="Where the conversation lives">SQLite rows for messages and their parts</td>
        <td data-label="What that buys">Resuming is a <code>SELECT</code>; the TUI is a view of the database</td>
      </tr>
      <tr>
        <td class="agent-name" data-label="Agent">OpenHands</td>
        <td data-label="Where the conversation lives">The agent server</td>
        <td data-label="What that buys">The client is a view, so many surfaces share one session</td>
      </tr>
      <tr>
        <td class="agent-name" data-label="Agent">Qwen, Pi, Kimi</td>
        <td data-label="Where the conversation lives">Event logs, replayed to rebuild state</td>
        <td data-label="What that buys">State is derivable rather than stored</td>
      </tr>
    </tbody>
  </table>
</div>

## Conclusions

The biggest lesson of the whole exercise is the one the anatomy hinted at:
**the hard problems are not in the loop, they are in the edges.** Context
overflow, permission negotiation, sub-agent lifecycles, session resume, provider
drift, doom-loop detection — that's where the ten harnesses diverge, where most of the time spent developing them goes,
and ultimately that's where the quality of your daily
experience is decided. The loop itself is a few dozen lines of code. Everything
else is the product.

It's worth noting that so far we still only scratched the surface of what there's to know on each subject. That's
why in the upcoming articles, we'll start digging into specific parts of the
anatomy of a coding agent, so stay tuned for more content!

Follow along on the [series page](/writing/how-coding-agents-work/).
