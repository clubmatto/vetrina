---
title: "How coding agents work, deep dive: The system prompt"
description: Every request to a coding agent carries instructions you never
  typed. We read ten open-source agents to see what goes into that text, how the
  tools are taught, and what it costs to keep it stable.
date: 2026-09-30
tags:
  - ai
  - agents
series: how-coding-agents-work
---

We started this series by shortlisting [ten open-source coding
agents](/writing/how-coding-agents-work/), then we built
[Pinocchio](/writing/how-coding-agents-work/building-pinocchio/) to find the
anatomy they share: the loop, tool calls, permissions, context management, and
sessions.

There is a sixth thing in every request: the system prompt. And we left it
out on purpose.

The five components above are the skeleton: each one is a mechanism you can
point at in
the agent's architecture, which is what makes them comparable across ten
codebases.

The system prompt is not that. It is data rather than machinery, and
understanding its
content doesn't change the overall picture of how the "bones" of this
skeleton compose into a complete body. Yet, the content of the system prompt is
foundational to the well-functioning of
the harness. It's information that
decides who the agent thinks it is, what it knows about your machine, and how it
uses its tools. Not only that, but
its role and shape changed significantly over the past few years, as
we'll see in a moment.

In short, it was hard to summarize the role of the system prompt in a
paragraph so we decided it was worth its own deep dive. We went back to the
source code of our shortlisted coding agents and looked at how each one builds
its system prompt.

:::note[TL;DR]
None harnesses ships a single prompt string. Each of them assembles the
prompt from parts, and they diverge on two things: how the tool surface is
exposed and what
belongs to the stable context prefix.
:::

## A brief history of system prompts

The system prompt is not a fixed idea. Its job has changed twice, and the prompt
had to change with it. Two motions drove this evolution: training made models
far better at
following instructions, and the APIs grew a proper channel to send them.

Before chat models, instructions were just more text. You wrote them next to
your input and hoped, because the completion endpoint saw a single string and
had no dedicated channel for special instructions. Getting a model to follow the
user's will was a matter of phrasing, examples, and luck.

The first change was training. Scaling a model up did not make it better at
following instructions, which is why prompting carried so much weight. But
training a
model to follow them instead did. In
2022, [InstructGPT](https://arxiv.org/abs/2203.02155)
had people compare two models side by side: a 1.3B model tuned to follow
instructions, and the untuned 175B GPT-3. The tuned one won. Instruction
following
stopped being something you coaxed out of a model and became something the model
was trained to do.

The second change was the API shape. Chat-tuned models shipped with
roles for the first time in 2023, and the system role gave instructions a
place to live, separate from the conversation. For a while the results were
mixed, and a whole craft grew around
closing the gap: persona paragraphs, examples smuggled into the system message,
reassurance
that the model was allowed to answer at all. That era gave us the phrase "prompt
engineering".

Then two things happened at once. First, the latest rounds of tuning, the ones
that turn a text predictor into an assistant, kept absorbing the behaviour
people used to write into prompts. Second, providers started formalizing
what a system prompt is: not a magic trick, but an instruction channel with a
defined rank in
the model's attention. Instructions
in lower ranks cannot override a contradicting statement in a higher rank.

OpenAI's [Model Spec](https://model-spec.openai.com/), first published in May
2024, spells this chain of command out: root, then system, then developer, then
user, then guidelines. At this point the slot stopped being
the model's personality and became the application's configuration.

A note about naming here: OpenAI's newer models call the channel you write to
_developer_ messages rather than _system_
messages, because the spec gave the name
"system" to OpenAI's own tier above it. That is _API vocabulary_, not _harness
vocabulary_ though. Every harness we read calls the text it assembles the system
prompt,
but its role is inconsistent across coding agents: some send it as a system
message, and others switch to developer when the model supports it, or send it
in a
top-level field instead of a message at all. Both terms express the same
concept.

The economics moved too. Google shipped context caching for Gemini in May 2024,
and Anthropic and OpenAI followed later that year, which turned the front of the
request into a priced object (more on this in a moment).
That shift is subtle, because it happens in the deeper layers of the model
rather
than in the text you write. It is also significant: it changed what a good
system
prompt looks like and put a definite price distinction between good and bad
prompts.

So the prompt did not become less important over time. It changed shape.

## So what is a system prompt, anyway?

If you take one thing from this article, take this: on a modern model the system
prompt is where the agent gets configured, and it enhances and guards everything
the user types.

The system prompt is where the agent learns about you. Project conventions live
there, or in the files the harness reads into it. This is, for example, why an
agent with a weak prompt asks where the
tests are,
invents a command your repository does not use, and writes commit messages in a
style inconsistent with past history.
When people say an agent "gets" their repo, most of the time it's because the
harness puts `AGENTS.md` and a git
status in front
of the user input on every turn. You feel this the moment you switch agents and
your carefully written instructions become invisible.

The system prompt is also where the agent learns what it can do. Tool
descriptions and
the guidance for using them travel in the same document, and that decides
whether the
model reaches for a tool at all, and whether it uses the tool the way its author
meant.

Maybe even more importantly, thanks to the ranking system the system prompt
enables harnesses to behave the same way
for every user who talks to them. The same system also enables blocking users
from bypassing the
harness' developer message, as the model is trained to refuse arguments that try
to reinterpret a higher-level instruction.

Note, though, that one thing the system prompt cannot do (yet?) is to ensure its
instructions are followed to the
letter. It is still text fed to the model and not a fixed code path in the LLM.
So whether a rule holds is
probabilistic, and even the Model Spec admits that production models "do not yet
fully reflect" the intended behaviour.
Beyond the ranking, the
system prompt gets no special treatment: the model processes it like any other
input. You might be tempted to think tool
calls are more deterministic in nature, but it's not true at the LLM level:
instead, it's the harness that validates the
name and arguments against the schema it declared, rejecting invalid calls.

## OK cool, but what does it look like?

The system prompt is not a static text field. Every API offers a way to pass
it although providers do not agree on a standard (jokes about standards
write themselves 😉):

- **A top-level parameter.** Anthropic's Messages API takes a `system` parameter
  next to the messages, and there is deliberately no `system` role in the
  message
  list. OpenAI's Responses API takes `instructions` in the same place. Gemini
  takes a `systemInstruction` field.
- **A message role.** OpenAI's Chat Completions API puts it in the message list
  as `role: "system"`, and its newer models name the same channel `developer`.
  DeepSeek does the same: a system message inside `messages`, named `system`.

What the harness assembles into it varies just as much:

- Aider is the most
  explicit about the order: eight chunks, `system`, `examples`,
  `readonly_files`, `repo`,
  `done`,`chat_files`, `cur`, `reminder`, shaped per model by `ModelSettings`.
  Aider
  leans on the same trick whenever it needs to
  put something in the conversation that has no dedicated slot: a user message
  plus an
  assistant` "Ok."` agreeing to it. That is how file contents, the done-turn
  markers, and the system text itself travel when `use_system_prompt` is off.
- Qwen Code renders five layers separated by `---`: a base section with
  identity,
  mandates
  and tool guidance, then context files, an appended prompt, git status, and the
  auto-memory section.
- Crush renders a Go template filled with the date, the git
  status,
  the context files it finds on disk and the available skills as XML.
- DeepSeek
  Harness
  reassembles the prompt per step from sections, contexts, tools and variables,
  and Codex
  assembles the system text, the context and the thread items in one pass.
- Kimi
  CLI works
  from a resolved profile that carries the prompt, the tool list and the model
  preference.
- OpenHands builds it server-side, out of the client's reach. Different shapes
  for the same job.

The same differences show up in what goes in but three ingredients show
up in almost every harness:

- **Where it is.** The working directory, the date, the OS, and the git
  status of
  the repository. Qwen adds the workspace structure. Goose prepends a
  `<turn-context>`
  block with the current time, the working directory, the compaction status and
  the turn
  budget.
- **Your rules.** Every harness needs a way to hand it project instructions, and
  every harness invented a file name for it. Crush reads the widest set:
  `AGENTS.md`, `CLAUDE.md`, `CRUSH.md`, `GEMINI.md`, `.cursor/rules`, plus
  configured `context_paths` and the global `~/.config/crush/CRUSH.md` and
  `~/.config/AGENTS.md`. Qwen Code walks a `QWEN.md` hierarchy. OpenCode injects
  per-session instructions, skills and MCP instructions. Aider takes the files
  you
  add to the chat, pastes them in full, and adds a repo map on top. That the
  harnesses read each other's file names is the pragmatic move, and also
  a statement that none of those names "won", so they read all of them.
- **What it learned.** Qwen scores memories lexically, has the model judge
  relevance, then injects the survivors into the prompt. Goose keeps a
  top-of-mind block and a recall extension. Pi injects skills as `<skill>` XML
  blocks. The prompt is the delivery mechanism for all of it.

## System prompts and token caching

Earlier we brushed over a topic that has been assuming increasing relevance in
the last months: token caching. It's
worth understanding how it works here because system prompts have the strongest
influence on cache hit ratios, and
in turn the cache hit ratio influences your inference provider's bill and the
perceived speed of the model/harness
combination.

A caching mechanism for input tokens is a smart idea because a model starts
every request from zero. It has no memory of
the previous request, so the whole conversation goes out again, prompt and
all. To produce the first token, the model has to
read that entire input and build the internal state it will reuse while
generating the rest. That state is the key/value
cache, and it is why a long prompt has a higher time to first token than a short
one: there is more input to process
before anything comes out.

Keeping this internal state means that if the next request starts
with the same tokens, on the same model, with the same tools, the provider skips
the work and bills the reused tokens at a fraction of the input price. The
discount on cached input varies
significantly by provider, within a range of ~10-50x cheaper than non-cached
input, so the impact on the user's cost
is significant. Moreover, the more tokens are cached, the faster an answer is
produced.

The downside of this mechanism is that the match is literal and it stops at the
first difference. Change one token near
the front and everything after it is processed and paid for again even if it's
the same as the previous turn. The system
prompt sits at the front by construction, so in this regard it can provide the
biggest benefits and the most
disruption if not managed carefully.

If you want to know more about the mechanics of token (aka KV) caching, read Sam
Rose's [Prompt
caching: 10x cheaper LLM tokens, but
how?](https://ngrok.com/blog/prompt-caching). We won't delve deeper into the
technical functioning of token caching
but we'll instead turn our attention to the practical consequences for the user
and the implications for the
dynamic management of system prompts.

## Token caching and the bill

A stable prompt is cheap, but a prompt that never changes is a prompt that
cannot
tell the model anything new. Similarly, the more context you give to the LLM the
better its output, but the fewer
tokens remain available for the user input. These are fundamental and
unavoidable tensions that stem from the nature
of a LLM, and every harness employs one or more techniques to strike a balance
between these three competing
factors:

- **Stability.** Every token before the first difference is billed at the cached
  rate. Keep the prefix identical and you keep hitting the cache.
- **Freshness.** The most useful parts of a prompt are often the ones that
  change and adapt to the current request: the current branch, the file you just
  touched, the todo list.
- **Budget.** Everything in the prompt is context window you cannot spend on the
  conversation. A long prompt is cheap to reuse and narrows down the LLM's range
  of action, but it also brings the
  compaction threshold closer, and compaction is what eventually rewrites the
  history and decimates the cache hit ratio.

## Tricks that keep the prefix warm

Every harness resends the whole prefix on every turn, so anything it chooses to
put in that prefix is a cache decision.
That is why the strategy the agents employ is to stop treating the prompt as one
string and split it into blocks with
different change rates. No matter the specific steps each harness takes, they
all really stem from the same
handful of principles:

- **Stable first, volatile last.** Instructions and reference material at the
  front, changing content at the end. OpenAI's guide says it plainly: timestamps
  and user-specific content belong at the end rather than the beginning. Goose
  is explicit about the split: the current branch, the file it just touched and
  the
  compaction state go in a per-turn `<turn-context>` block, and nothing in that
  block can live in a cached prefix, so the prefix stays stable and only the
  tail changes.
- **Do not touch the tool list.** Tool definitions are part of the prefix, so
  adding, removing, renaming or reordering them changes it. Scope instead of
  rewriting: Crush filters the list per agent and restricts its `task` agent to
  read-only tools, so an agent gets fewer tools without the declarations
  changing. Qwen Code's `tool_search` works from the other end, keeping the
  declaration
  list stable on purpose and appending deferred tools at the end.
- **Append, do not rewrite.** Rewriting a line near the front of the prompt
  invalidates everything after it, so new rules and new context go at the end.
  Qwen Code assembles its prompt in layers and the third layer is
  `appendPrompt`, which is what `--append-system-prompt` feeds: your additions
  extend the prompt
  instead of editing it.
- **Clear the minimum cacheable length.** Anything shorter than what a model
  declares as the minimum cacheable number of tokens is not cached at all, so a
  shared block just below the
  threshold caches nothing. As counterintuitive that might sound, adding
  genuinely useful stable material can
  be cheaper than leaving it out.
- **Put the breakpoint where the stability ends.** A breakpoint caches
  everything up to its own position, so it belongs at the end of the content you
  want
  reused: the tail is then processed at the normal rate instead of being
  written to the
  cache on every call. Writing a breakpoint can cost a little more than ordinary
  input, though. Aider marks the last message of each stable chunk, so the
  system prompt,
  the examples, the repo map and the files in chat stay cached while the current
  turn does not.
- **Keep the session warm.** Caches are maintained per session and expire in
  minutes. An agent that sits idle for an hour pays full price on the next turn,
  which is why Aider pings the
  thread every few minutes to keep the cache alive.

## Conclusions

The five components we wrote about are the machinery. The system prompt is the
configuration, and after analysing ten codebases, reading about it is
the first thing we will do when checking out a new agent: it says what the tool
thinks it is, what it assumes about your repository, and what it will do without
asking.

It is also where the edges of the design show up first. Cache stability,
instruction-file conventions and compaction all meet in the prompt. Yet the
problem of striking a balance between
the various tensions converging into the system prompt is complex enough that
the ten harnesses agree on the need for a system prompt but employ different
techniques to manage it.

In the next posts we will keep digging into parts of a coding agent's
anatomy.
