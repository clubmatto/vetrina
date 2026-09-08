---
title: "How coding agents work: A comparative analysis of 10 open source coding agents"
description: We put ten open-source coding agents side by side — where their
  loops live, how they answer safety, context, sub-agents and sessions — and
  measure everything against Pinocchio, our 100-line coding agent.
date: 2026-09-14
draft: true
tags:
  - ai
  - agents
---

Two posts ago we [shortlisted ten open-source coding
agents](/writing/how-coding-agents-work/) that we want to understand in depth.
Last Thursday we built [Pinocchio](/writing/a-coding-agent-in-100-lines-of-code/),
a real coding agent in about a hundred lines of Go: a loop, three tools, a y/N
permission prompt, a context squeeze, and a JSONL session file.

Pinocchio is many things — a teaching device, a demystification exercise, a
puppet — but let's be honest about what it is not: a tool you want in your
daily driver seat. The gap between Pinocchio and the agents we actually use is
the subject of this post. We read the source code of all ten harnesses (the
latest snapshot of each, no marketing, no changelogs) and compared them on the
exact edges where Pinocchio stopped: whose loop is it, what stands between the
model and your machine, where the context goes, how agents spawn agents, and
where the conversation lives.

Keep Pinocchio in your head as the measuring stick. For every component,
here's what a hundred lines grows into when a team maintains it for years.

The contestants, one more time with links: [OpenCode](https://github.com/sst/opencode)
(SST), [Aider](https://github.com/paul-gauthier/aider),
[DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (DeepSeek),
[Qwen Code](https://github.com/QwenLM/qwen-code) (Alibaba),
[Pi](https://github.com/earendil-works/pi),
[Kimi Code CLI](https://github.com/MoonshotAI/kimi-code) (Moonshot AI),
[Crush](https://github.com/charmbracelet/crush) (Charmbracelet),
[OpenHands](https://github.com/All-Hands-AI/OpenHands) (All Hands AI),
[Goose](https://github.com/block/goose) (Block), and
[Codex CLI](https://github.com/openai/codex) (OpenAI). Same selection criteria
as always: open source, multi-provider, no lock-in.

One honesty note before we start. We read shallow clones — the current source,
not the full history — and in two cases an important piece lives outside the
repo entirely. Everything below is grounded in code we actually read, and
where something can't be verified from the source, we flag it. That honesty
turns out to be a finding of its own.

## Where the loop lives

Pinocchio's loop is a `while` you could fit on a business card, and it lives
in `main.go` where you can point at it. That turns out to be worth something.
Here's where the ten keep theirs:

<div class="agent-table-wrapper">
  <table class="agent-table">
    <thead>
      <tr>
        <th>Agent</th>
        <th>The loop</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="agent-name">Pinocchio<span class="byline">our 100-line baseline</span></td>
        <td>The <code>while</code> from Thursday's post: one HTTP call, a tool dispatch, done.</td>
      </tr>
      <tr>
        <td class="agent-name">OpenCode<span class="byline">in-repo</span></td>
        <td>A plain <code>while(true)</code> over SQLite-backed message parts.</td>
      </tr>
      <tr>
        <td class="agent-name">Aider<span class="byline">in-repo</span></td>
        <td>A chat REPL with a text edit protocol; no tool loop at all.</td>
      </tr>
      <tr>
        <td class="agent-name">DeepSeek Harness<span class="byline">in-repo</span></td>
        <td><code>while (await turn())</code>, event-driven, fully plugin-composable.</td>
      </tr>
      <tr>
        <td class="agent-name">Qwen Code<span class="byline">in-repo</span></td>
        <td>A recursive async generator feeding a streaming UI.</td>
      </tr>
      <tr>
        <td class="agent-name">Pi<span class="byline">in-repo</span></td>
        <td>A double <code>while</code>: inner for tool calls, outer for follow-ups.</td>
      </tr>
      <tr>
        <td class="agent-name">Kimi Code CLI<span class="byline">in-repo</span></td>
        <td>A stateless step loop; all state lives in the Agent around it.</td>
      </tr>
      <tr>
        <td class="agent-name">Crush<span class="byline">external</span></td>
        <td>The loop lives in <code>charm.land/fantasy</code>, a library Crush doesn't vendor. When the loop misbehaves, the buck stops outside the repo.</td>
      </tr>
      <tr>
        <td class="agent-name">OpenHands<span class="byline">external</span></td>
        <td>A separate Python agent-server owns the loop; the repo we reviewed is the React frontend watching its event stream.</td>
      </tr>
      <tr>
        <td class="agent-name">Goose<span class="byline">in-repo, twice</span></td>
        <td>A 6,000-line legacy loop and a new state machine, live side by side during a migration.</td>
      </tr>
      <tr>
        <td class="agent-name">Codex CLI<span class="byline">in-repo</span></td>
        <td>A background submission loop plus a per-turn runner, speaking a single event protocol to every client.</td>
      </tr>
    </tbody>
  </table>
</div>

At Club Matto we don't love magic, so we'll be honest about our bias: being
able to point at the line of code where your agent decides what to do next is
worth something to us. Two of ten harnesses fail that test from within their
own repository — not a dealbreaker, but a real mark against.

A detail Pinocchio shares with all ten: the model's output streams into the
conversation as first-class data, not as a finished blob. The most disciplined
version we found is DeepSeek Harness, which enforces a runtime invariant that
anything the model can see _must_ be reconstructable from the session log.
Nothing reaches a model request that isn't also written down. Pinocchio
accidentally satisfies this invariant, which we choose to read as a compliment.

## The safety spectrum

We gave Pinocchio a y/N prompt and called it a day. Here's what the ten build
instead. The same tool — "run a bash command" — means ten different things
depending on which harness is asking:

```
Pi        no permission system at all; bash runs freely
Pinocchio one y/N question before every command
Aider     per-action confirmations; git is the safety net
Kimi      approval prompts plus a permission policy chain
Crush     ~60 banned commands + safe-command auto-approval + hooks
OpenCode  allow/ask/deny rules, deny by default, no sandbox
Goose     Auto/Approve/SmartApprove/Chat modes + an LLM judge
Qwen      a five-level cascade + a fail-closed LLM classifier
OpenHands server-side policies + LLM analyzer + Docker runtime
dsh       a real OS sandbox (bwrap/Landlock/Seatbelt/ACL), fails closed
Codex     OS sandboxes + exec policy + LLM guardian + network MITM proxy
```

Pinocchio sits one rung above the bottom, and we're fine with that — it only
exists to be read. But notice the shape of the list. Most of it is
_prompt-based_ safety: rules and questions, Pinocchio's strategy taken to its
logical conclusion. Only DeepSeek Harness and Codex make _isolation_ the
default — dsh wraps every command in an operating-system sandbox and _fails
closed_ when none is available: if the OS can't confine the command, the
command never runs. Codex goes further still, enforcing network policy through
an in-process man-in-the-middle proxy and hardening its own process before
`main()` runs.

And notice how many rows now contain an LLM making safety decisions. Goose's
SmartApprove, Qwen's AUTO mode, and Codex's "guardian" all make hidden model
calls to judge whether a tool call is safe — Qwen's classifier runs a fast
check (~300ms) that can escalate to a full review, and it fails closed when
the judge is unavailable. Safety decisions becoming model calls is a
fascinating and slightly unsettling trend: your safety net now has its own
failure modes, latency, and token bill. Pinocchio's y/N prompt never hallucinates.

Worth a special mention: Aider's answer is _reversibility_ instead of
permissioning. It commits your dirty files before editing, auto-commits every
AI edit with a message written by a small model, and gates `/undo` on session
ownership. Git as a safety net — the oldest harness on the list, and
arguably the only one with a genuinely different answer to "what if the agent
does something wrong?"

## The context tax

Pinocchio's context strategy is fifteen lines: when the conversation outgrows
a budget, summarize the first half, keep the second half. Every one of the ten
does a more sophisticated version of the same thing, because this is the most
universal problem in the field — long sessions overflow, and triggers cluster
around 80–85% of the context window.

The refinement axes are where the personalities show:

- **Summarize less, not more.** The bloat is mostly tool output, and old tool
  outputs can be dropped or truncated _without a model call_. OpenCode prunes
  old tool results first and only then summarizes what remains; dsh spills
  outputs over 50KB into a side store and leaves a locator behind; Goose
  summarizes old tool-call/result pairs. Do the cheap thing first — Pinocchio
  readers will recognize the advice.
- **Keep the recent tail verbatim.** OpenCode reserves the last quarter of the
  usable window; dsh keeps 16%. Whole-transcript summarization exists (Crush
  does it, with a prompt that bluntly tells the model the summary will be its
  _only_ context) but tail-preservation is the dominant design.
- **Update, don't regenerate.** Pi refines its existing summary incrementally
  instead of re-summarizing from scratch every time.
- **Compaction as an agent.** Our favorite implementation detail of the whole
  study: OpenCode implements summarization as a hidden agent — zero tools, a
  pinned model, its own prompt. Compaction is just another model call, which
  makes it testable and overridable like any other agent.

And before compaction even enters the picture, there's the question of what
context to assemble in the first place. Pinocchio assembles nothing; you paste
what matters. Aider builds a _repo map_: it parses the codebase with
tree-sitter, builds a graph of definition/reference edges, runs PageRank on it
(a search engine's algorithm deciding what code the model should see), and
renders a token-budgeted skeleton of the important signatures. It's the only
pre-built index on the list. Everyone else treats repo understanding as a
runtime activity: grep, glob, LSP lookups, paid per token.

## Sub-agents, or the org chart

Pinocchio has no way for the model to delegate work to another copy of
itself. Eight of the ten harnesses do, and they've converged on a recognizable
pattern: a `task`-style tool (a prompt plus an agent type), built-in
specialized agents (always a read-only explorer, sometimes a planner),
foreground or background execution, and depth limits so delegation can't
recurse forever — Goose allows exactly one level (nested delegation is treated
as a critical failure in its own test suite), dsh allows three.

The implementations reveal the personalities. Crush makes every sub-agent a
_real database session_ linked to its parent, with the child's cost rolling up
to the parent. Codex _forks_ sub-agents from the parent's persisted history,
so a sub-agent is a full thread with its own rollout file. Kimi adds a "swarm"
tool for parallel batches, plus a "btw" side-channel: a tools-disabled child
agent that answers your side questions without interrupting the main run.
Qwen goes furthest, with git-worktree isolation, team agents, and a full goal
system — a state machine that keeps the agent looping toward an objective
(LLM-verified, capped at 50 iterations) even after it would otherwise have
stopped.

Which brings us to the two that ship nothing: **Aider and Pi deliberately
have no sub-agents** — the cleanest philosophical split in the whole
comparison: task-tree orchestration versus a single, human-steerable
conversation. Pinocchio sits on their side of the fence, not by conviction
but by budget.

One more nuance most users never see: "parallel" usually means _parallel tool
calls inside a sequential loop_ — and sometimes not even that. Codex's prompt
tells the model `parallel_tool_calls: true`, but the runtime holds a lock and
executes them one at a time: determinism over throughput. Cancellation is a
hidden differentiator too; dsh is refreshingly honest about its limit —
same-process tools cannot be hard-killed.

## Where the conversation lives

Pinocchio appends JSON lines to `pinocchio.jsonl` and replays the file on
`--resume`. It turns out there are only three answers to this problem in the
whole industry, and Pinocchio speaks one of them:

1. **The database is the truth.** OpenCode persists every message part —
   every token delta, effectively — as SQLite rows, which makes resuming a
   `SELECT` and the TUI a database view. Crush does the same with a 33ms write
   debounce. Codex keeps a SQLite index next to its transcripts.
2. **The append-only log is the truth.** dsh, Qwen, Pi, Kimi — and Pinocchio —
   write event logs and rebuild state by replaying them. dsh is the purest
   expression: the session _is_ the log, and history, resume, forking, and
   telemetry are all projections of the same event stream.
3. **The server is the truth.** OpenHands's frontend keeps almost nothing
   locally; conversations live on the agent-server and the client is a view.

Resume quality varies accordingly, from trivial (re-read SQLite) to lossy
(Aider restores a session by replaying a markdown transcript — images and
structured parts don't survive). When we squint at persistence and
architecture together, four families emerge: the database people (OpenCode,
Crush), the event-sourced people (dsh, Codex), the file-backed
conversationalists (Aider, Qwen, Kimi, Pi — with honors, Pinocchio), and the
control planes (OpenHands, Goose, which are less "one harness" and more "a
surface for many agents" — OpenHands hosts external agents like Claude Code or
Codex over a protocol, Goose runs other agent CLIs _as providers_).

The config models deserve a footnote of their own, because they say a lot
about each project: config as data (JSON/YAML/TOML, like Pinocchio's three
environment variables), config as code (Crush's `crushrc` is a _bash script_
executed by the same interpreter as its bash tool), config as composition
(dsh composes profiles out of plugin bundles and patch layers — even its agent
loop is a replaceable row), and config as god-object (Qwen's central `Config`
class is about 9,200 lines; Pinocchio has three env vars and we're smug about
it).

## How multi-provider is each, really

Pinocchio achieves multi-provider in one line: the endpoint is an environment
variable, because OpenAI-compatible is the lingua franca. All ten pass our
multi-provider bar too, but the _quality_ of the agnosticism varies more than
we expected.

For Aider, Pi, and Crush, model-agnosticism is the architecture: dedicated
gateway layers (LiteLLM with 100+ providers, Pi's own `pi-ai` with 40+, Crush's
`catwalk`) built for exactly this. For OpenCode and Qwen it's a maintained
shim with real per-protocol engineering behind it — Qwen, a fork of Google's
Gemini CLI, converts every provider's responses into Gemini-shaped types
internally. For DeepSeek Harness it's currently a _promise_: the architecture
is a clean adapter registry, but only the DeepSeek adapter has shipped; the
multi-provider layer sits dormant in the codebase. And for Codex it's a config
detail: OpenAI-protocol first, everything else squeezed through custom
provider definitions.

The provider layer leaks into the loop more than you'd expect, which
Pinocchio users never see. OpenCode swaps its `edit`/`write` tools for
`apply_patch` when it detects a GPT-class model. Aider stores a per-model
`edit_format` and picks its text protocol accordingly. Multi-provider is not a
login screen; it changes what the agent does.

## One-of-a-kind bits

Every harness we read had at least one idea nobody else had. Our favorites:

- **Aider's repo map**: tree-sitter plus PageRank — a search engine's
  algorithm deciding what code the model should see.
- **dsh's Code Mode**: the model stops calling tools and starts writing
  programs that call tools; every sub-call re-enters the same guarded
  pipeline.
- **dsh's fail-closed sandbox**: if the OS can't confine the command, the
  command doesn't run. No exceptions.
- **Crush's bash config**: your `crushrc` is a shell script, executed by the
  same interpreter as the agent's own bash tool.
- **OpenCode's compaction-as-agent**: summarization as a first-class, pinned,
  overridable hidden agent.
- **Kimi's media recovery**: when a provider rejects a request for being too
  large, it degrades gracefully — older images become text markers, then
  disappear — instead of just failing.
- **OpenHands's client tools**: tools whose code runs _in your browser_, so
  the agent can drive the UI panel or spawn child conversations.
- **Qwen's goal system**: a state machine with LLM-verified objectives that
  keeps the agent on task for up to 50 iterations.
- **Goose's everything-is-MCP**: extensions _are_ MCP servers, so the whole
  MCP ecosystem is its tool ecosystem.
- **Codex's transport-level policy**: a man-in-the-middle proxy enforcing
  network rules on the agent's traffic, plus process hardening before `main`.

## Three philosophies

After all the components and all the comparisons, three genuinely different
philosophies remain, and the ten sort into them almost perfectly:

- **The pair-programmers.** Aider and Pi are built around a human-gated
  conversation: no sub-agents, minimal tools, the human drives every turn.
  Aider is the wise old craftsman; Pi is the opinionated minimalist with the
  richest extension system of the bunch. (Pinocchio lives here too — not by
  conviction, but by budget.)
- **The autonomous loops.** OpenCode, DeepSeek Harness, Codex, and Crush build
  for durable, observable, resumable autonomy: conversation as data, safety as
  a first-class subsystem, long runs as the normal case. OpenCode is the
  disciplined engineer, dsh the principled researcher, Crush the polished
  harness-maker, Codex the security appliance.
- **The platforms.** Qwen, Goose, and OpenHands optimize for breadth: IM
  channels, desktop apps, SDKs, recipes, hosting other agents. Impressive
  surfaces — and, we suspect, the most expensive to maintain.

We opened this series by explaining that our agentic programming is a close
collaboration: we drive, the agent executes, nobody runs unsupervised for
hours. Reading the source confirmed that this is a real fork in the road, not
a preference dial — the pair-programmer harnesses are built differently, down
to their session model.

But the biggest lesson of the whole exercise is one Pinocchio already taught
us: **the hard problems are not in the loop, they are in the edges.** Context
overflow, permission negotiation, sub-agent lifecycles, session resume,
provider drift, doom-loop detection — that's where the ten harnesses diverge,
that's where their bug trackers live, and that's where the quality of your
daily experience is decided. The loop itself is fifty lines of `while(true)`.
Pinocchio proves it. Everything else is the product.

## What's next

The plan for the next posts is to publish our per-agent deep dives, one
harness at a time, starting with the one we run ourselves:
[OpenCode](https://github.com/sst/opencode). If Pinocchio was the anatomy
class, the deep dives are the dissections.

Follow along on the [series page](/writing/tags/agents/)
