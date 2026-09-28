---
title: "The system prompt, across 10 coding agents"
description: Every request to a coding agent carries instructions you never
  typed. We read ten open-source agents to see what goes into that text, how the
  tools are taught, and what it costs to keep it stable.
date: 2026-09-29
draft: true
tags:
  - ai
  - agents
image: /assets/writing/the-system-prompt.png
image_width: 2400
image_height: 1260
---

We started this series by shortlisting [ten open-source coding
agents](/writing/how-coding-agents-work/), then we built
[Pinocchio](/writing/how-coding-agents-work/building-pinocchio/) to find the
anatomy they share: the loop, tool calls, permissions, context management, and
sessions.

There is a sixth thing in every request, and we left it out on purpose. The five
components above are the skeleton: each one is a mechanism you can point at in
the loop, which is what makes them comparable across ten codebases. The system
prompt is not that. It is data rather than machinery, every harness assembles it
its own way, and reading it tells you much less about how an agent is put
together. For a post about the bare bones, it was a poor fit. //TODO unclear 
what this "less about" comparison is

// TODO would drop the first sentence here. Also the word document may be 
out of place in the agents vocabulary (I'd use context... but maybe that's 
also inaccurate)

None of that is an argument against the prompt. Before a message reaches the
model, the harness puts a document in front of it. You never type that document
and you rarely read it, but it decides who the agent thinks it is, what it knows
about your machine, and how it uses its tools. It kept turning up inside other
sections. Under context management, because the prompt is part of what the
context manager assembles. Under tool calls, because the tool catalogue travels
in the same request. It deserved better than a paragraph in a section about 
something else, so it gets a deep dive of its own.

So we went back to the source of all ten and looked at how each one builds its
system prompt.

:::note[TL;DR]
None of them ship a single prompt string. Every harness assembles the prompt from
parts, and they disagree on three things: how the tool surface is exposed, what
belongs in the stable prefix, and how much of it you can see.
:::

## How we got here

The system prompt is not a fixed idea. Its job has changed twice, and the prompt
had to change with it. Two things drove that: training made models far better at
following instructions, and the APIs grew a proper channel to send them.

Before chat models, instructions were just more text. You wrote them next to your
input and hoped, because the completion endpoint saw a single string and had no
dedicated channel for them. Getting a model to follow a rule was a matter of
phrasing, examples, and luck.

The first change was training. Scaling a model up did not make it better at
following instructions, which is why prompting carried so much weight. Training a
model to follow them did. In 2022, [InstructGPT](https://arxiv.org/abs/2203.02155)
had people compare two models side by side: a 1.3B model tuned to follow
instructions, and the untuned 175B GPT-3. The tuned one won. Instruction following
stopped being something you coaxed out of a model and became something the model
was trained to do.

The second change was the API shape. Chat-tuned models shipped with
roles for the first time in 2023, and the system role gave instructions a 
place to live, separate from the conversation. For a while the results were mixed, and a whole craft grew around
it: persona paragraphs, examples smuggled into the system message, reassurance
that the model was allowed to answer at all. That era gave us the phrase prompt
engineering.

Then two things happened at once. First, the later rounds of tuning, the ones
that turn a text predictor into an assistant, kept absorbing the behaviour people
used to write into prompts. Second, providers started formalizing what a system
prompt is: not a magic trick, but an instruction channel with a defined rank.
OpenAI's [Model Spec](https://model-spec.openai.com/), first published in May
2024, spells the chain of command out: root, then system, then developer, then
user, then guidelines. The naming followed. OpenAI's newer models call that
channel developer messages rather than system messages, which is a fair summary
of what happened. The slot stopped being the model's personality and became the
application's configuration.

The economics moved too. Anthropic and OpenAI shipped prompt caching in the
second half of 2024 and turned the front of the request into a priced object.
That shift is subtle, because it happens in the deeper layers of the model rather
than in the text you write. It is also significant: it changed what a good system
prompt looks like.

So the prompt did not become less important over time. It changed shape.

## Why it still matters

If you take one thing from this piece, take this: on a modern model the system
prompt is where the agent gets configured, and it is the part of the request with
the best ratio of effect to effort.

The system prompt is where the agent learns about you. Project conventions live 
there,
or in the
files the harness reads into it, which is why an agent with a weak prompt asks
where the tests are, invents a command your repository does not use, and writes
commit messages in a style nobody here has ever written. When people say an agent
"gets" their repo, most of the time they mean the harness puts `AGENTS.md` and a
git status in front of the model on every turn. You feel this the moment you
switch agents and your carefully written instructions become invisible.

The system prompt is where the agent learns what it can do. Tool descriptions 
and 
the guidance
for using them travel in the same document, and that is what decides whether the
model reaches for a tool at all, whether it uses the tool the way its author
meant, and whether it checks a file before editing it. What the prompt does not
do is enforce anything. Allow/ask/deny rules, sandboxes and the LLM judges from
the comparative analysis all run in the harness, outside the model's context, and
when a model call is part of a safety decision it is a separate call with its own
prompt. Harnesses do describe the policy to the model, which is a nudge rather
than a boundary: DeepSeek Harness injects the active sandbox mode as a
runtime-context section, and its approval sentence tells the model not to ask for
an escalation it would not get. A rule the model ignores is a bug. A rule the
harness enforces cannot be ignored.

// TODO not sure I get any of this

It is also where you pay, and the reason has nothing to do with how well the text
is written. That is worth two minutes, so it comes next.

And it is the trust boundary. Instructions in the prompt outrank the user, which
is what makes prompt injection worth worrying about: a file or a web page can
contain text shaped like an instruction, and it has no rank at all in the chain
of command. A coding agent reads files all day, so none of the ten get to ignore
this.

The uncomfortable part is that none of it announces itself. A good system prompt
produces an agent that feels like it has already read your notes. A bad one
produces an agent that forgets, oversteps, or gets expensive. There is no error
message for a mediocre system prompt, which is the worst property a thing this
consequential can have.

## What a cached token is

// TODO here feels like there's a bit of a gap with the prev para

A model starts every request from zero. It has no memory of the last one, so the
whole conversation goes out again, prompt and all. To produce the first token,
the model has to read that entire input and build the internal state it will
reuse while generating the rest. That state is the key/value cache, and it is why
a long prompt has a higher time to first token than a short one: there is more
input to read before anything comes out.

Providers keep that state for the prefix of a request. If the next request starts
with the same tokens, on the same model, with the same tools, the provider skips
the work and bills the reused tokens at a fraction of the input price. Cached
input currently costs a tenth of what normal input costs on both OpenAI and
Anthropic, and skipping the read is where the latency win comes from.

The match is literal and it stops at the first difference. Change one token near
the front and everything after it is processed and paid for again. The system
prompt sits at the front by construction, which is why the prompt, more than
anything else in the request, is a caching decision.

If you want the mechanism rather than the summary, read Sam Rose's [Prompt
caching: 10x cheaper LLM tokens, but
how?](https://ngrok.com/blog/prompt-caching). It goes from tokens to attention to
the exact tensors that get stored, and it is the clearest explanation we have
read. Everything below assumes that picture.

## Where the prompt goes, and who outranks whom

// TODO not worth a para. I'd use this as an excuse to remind the reader 
it's not static (next para) and where it goes

Every API has somewhere to put this text, and they do not agree on the shape.

- **A top-level parameter.** Anthropic's Messages API takes a `system` parameter
  next to the messages, and there is deliberately no `system` role in the message
  list. OpenAI's Responses API takes `instructions` in the same place. Gemini
  takes a `systemInstruction` field.
- **A message role.** OpenAI's Chat Completions API puts it in the message list as
  `role: "system"`, and its newer models name the same channel `developer`. The
  Model Spec uses that split to separate the platform's own instructions from
  yours: `system` is what OpenAI sends, `developer` is what you send.

The shape matters less than the rank. Wherever the text lives, it is an
instruction channel with a higher authority than the user's messages. The Model
Spec makes the order explicit: root, then system, then developer, then user, then
guidelines. A user cannot ask the model to ignore your developer message, and the
spec instructs the model to refuse arguments that try to reinterpret a
higher-level instruction. That privilege is the point: it is how you make an
agent behave the same way for every user who talks to it.

Two caveats come with it. The enforcement is a training property, not a switch,
and the Model Spec says outright that production models "do not yet fully
reflect" it, so a prompt is a strong preference rather than a guarantee. And the
same privilege is what makes prompt injection interesting: text from a file, a
tool result or a web page has no rank, so a harness that mixes it into the prompt
is relying on the model to keep the two apart.

## The prompt is assembled, not written

// TODO probably a short reminder that the system prompt isn't static helps 
here with the flow

Aider is the most explicit about the shape. It builds the prompt as eight ordered
chunks: `system`, `examples`, `readonly_files`, `repo`, `done`, `chat_files`,
`cur`, `reminder`. The context blocks are wrapped as a user message plus an
assistant message agreeing to it, because the protocol has nowhere else to put
them.

Qwen Code layers five sections separated by `---`: a base section with identity,
mandates and tool guidance, then context files, an appended prompt, git status,
and the auto-memory section. Environment context adds the working directory, the
date, the OS, the workspace structure, and the available skills.

Crush renders a Go template. `templates/coder.md.tpl` is filled with the date,
the git status (branch, `git status --short | head -20`, recent commits), the
context files it finds on disk, and the available skills as XML.

DeepSeek Harness assembles the prompt per step from sections, contexts, tools and
variables. Codex's `build_prompt` assembles the system text, the context, and the
thread items in one pass.

Four different shapes for the same job, and that is half the list:

<div class="agent-table-wrapper">
  <table class="agent-table agent-table--rows">
    <thead>
      <tr>
        <th>Agent</th>
        <th>Assembled from</th>
        <th>Where the text lives</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="agent-name" data-label="Agent">Aider</td>
        <td data-label="Assembled from">Eight ordered chunks: system, examples, read-only files, repo map, done, chat files, current turn, reminder</td>
        <td data-label="Where the text lives"><code>coders/chat_chunks.py</code>, shaped per model by <code>ModelSettings</code></td>
      </tr>
      <tr>
        <td class="agent-name" data-label="Agent">Codex</td>
        <td data-label="Assembled from">System text, context, and thread items</td>
        <td data-label="Where the text lives"><code>session/turn.rs</code>, <code>build_prompt</code></td>
      </tr>
      <tr>
        <td class="agent-name" data-label="Agent">Crush</td>
        <td data-label="Assembled from">A Go template filled with date, git status, context files, skills</td>
        <td data-label="Where the text lives"><code>internal/agent/prompt/prompt.go</code>, <code>templates/coder.md.tpl</code></td>
      </tr>
      <tr>
        <td class="agent-name" data-label="Agent">DeepSeek Harness</td>
        <td data-label="Assembled from">Sections, contexts, tools and variables</td>
        <td data-label="Where the text lives"><code>packages/core/system-prompt</code></td>
      </tr>
      <tr>
        <td class="agent-name" data-label="Agent">Goose</td>
        <td data-label="Assembled from">Prompt parts contributed by extensions, plus a per-turn context block</td>
        <td data-label="Where the text lives"><code>agents/moim.rs</code> and the platform extensions</td>
      </tr>
      <tr>
        <td class="agent-name" data-label="Agent">Kimi CLI</td>
        <td data-label="Assembled from">A resolved profile: system prompt, tool list, model preference</td>
        <td data-label="Where the text lives"><code>session/subagent-host.ts</code></td>
      </tr>
      <tr>
        <td class="agent-name" data-label="Agent">OpenCode</td>
        <td data-label="Assembled from">Environment info, instructions, skills, MCP instructions</td>
        <td data-label="Where the text lives"><code>src/session/prompt.ts</code></td>
      </tr>
      <tr>
        <td class="agent-name" data-label="Agent">OpenHands</td>
        <td data-label="Assembled from">Built server-side, per conversation</td>
        <td data-label="Where the text lives">Not in the client we reviewed</td>
      </tr>
      <tr>
        <td class="agent-name" data-label="Agent">Pi</td>
        <td data-label="Assembled from">Session state, plus <code>promptSnippet</code> and <code>promptGuidelines</code> from extensions</td>
        <td data-label="Where the text lives"><code>packages/coding-agent/src/core/agent-session.ts</code></td>
      </tr>
      <tr>
        <td class="agent-name" data-label="Agent">Qwen Code</td>
        <td data-label="Assembled from">Five layers: base, context files, appended prompt, git status, auto-memory</td>
        <td data-label="Where the text lives"><code>packages/core/src/core/prompts.ts</code></td>
      </tr>
    </tbody>
  </table>
</div>

## What the agent knows about you

Three ingredients show up in almost every harness.

**Where it is.** The working directory, the date, the OS, and the git status of
the repository. Crush shells out for the branch, a short status and the recent
commits. Qwen adds the workspace structure and the available skills. Goose
prepends a `<turn-context>` block with the current time, the working directory,
the compaction status and the turn budget.

**Your rules.** Every harness needs a way to hand it project instructions, and
every harness invented a file name for it. Crush reads the widest set:
`AGENTS.md`, `CLAUDE.md`, `CRUSH.md`, `GEMINI.md`, `.cursor/rules`, plus
configured `context_paths` and the global `~/.config/crush/CRUSH.md` and
`~/.config/AGENTS.md`. Qwen Code walks a `QWEN.md` hierarchy. OpenCode injects
per-session instructions, skills and MCP instructions. Aider takes the files you
add to the chat, pastes them in full, and adds a repo map on top.

That the harnesses read each other's file names is the pragmatic move, and also
a confession: none of those names won, so they read all of them.

**What it learned.** Qwen scores memories lexically, has the model judge
relevance, then injects the survivors into the prompt. Goose keeps a
top-of-mind block and a recall extension. Pi injects skills as `<skill>` XML
blocks. The prompt is the delivery mechanism for all of it.

## How the tools are exposed

The tool list is a schema, but the teaching happens in two other places.

The first is the tool description. Crush makes this explicit: tool descriptions
are templated documents (`bash.md.tpl`, `edit.md.tpl`, and so on) that carry
behavioral contracts into the model context, from banned commands to
read-before-edit rules. Combined with the coder template, Crush teaches the same
conventions twice. Pi does the same at a smaller scale: an extension registers a
tool and contributes its `promptSnippet` and `promptGuidelines` with it.

The second place is the prompt covering for a tool that is not there. Goose ships
no `read` and no `grep` on purpose. The system prompt tells the model to use
`cat`, `sed` and `rg` through `shell` instead. The instruction is the tool.

Two harnesses go the other way and shrink the surface instead. DeepSeek Harness
in Code Mode exposes a single `run_code` tool plus a generated SDK prompt, so the
model writes a program instead of choosing from a catalogue. Qwen hides deferred
tools until `tool_search` loads them, which keeps the declaration list, and
therefore the prompt prefix, stable across turns.

## KV caching and the bill

A stable prompt is cheap, but a prompt that never changes is a prompt that cannot
tell the model anything new. Three pressures pull against each other, and every
harness in the list makes their own tradeoff.

**Stability.** Every token before the first difference is billed at the cached
rate. Keep the prefix identical and you keep hitting the cache.

**Freshness.** The most useful parts of a prompt are often the ones that change:
the current branch, the file you just touched, the todo list, the compaction
state, the time. Goose puts all of it in a per-turn `<turn-context>` block, and
nothing in that block can live in a cached prefix.

**Budget.** Everything in the prompt is context window you cannot spend on the
conversation. A long prompt is cheap to reuse, but it also brings the compaction
threshold closer, and compaction is what eventually rewrites the history and
takes the cache with it. Goose skips its context block entirely below a 32k
window, trading information for room.

The strategy the agents employ is to stop treating the prompt as one 
string and split it
into blocks with different change rates. DeepSeek Harness reassembles the prompt
on every step, but only re-logs the request header when the system, the tools or
the config actually changed, and it persists the runtime context as a snapshot so
that replaying a session rebuilds the same policy. Kimi CLI refreshes the prompt
after compaction and reinjects the reminders the summary dropped, the goal and
the loadable-tools manifest. That is the honest cost of compaction: you buy
window back and you lose your prefix. Aider pins cache-control headers on its
chunks so the early ones stay stable across turns.

## Tricks that keep the prefix warm

// TODO this should be merged with the cache para?

None of this is exotic. It is the same handful of moves, whether you write a
harness or an application.

- **Stable first, volatile last.** Instructions and reference material at the
  front, changing content at the end. OpenAI's guide says it plainly: timestamps
  and user-specific content belong at the end rather than the beginning.
- **Do not touch the tool list.** Tool definitions are part of the prefix, so
  adding, removing, renaming or reordering them changes it. To disable tools for
  one call, pass `tool_choice: "none"` instead of dropping the definitions, or
  restrict the callable set with `allowed_tools`. Qwen Code's `tool_search` is
  the same idea from the other direction: it keeps the declaration list stable on
  purpose and appends deferred tools at the end.
- **Append, do not rewrite.** Editing, trimming or summarising an earlier message
  changes the prefix. That is the hidden bill for compaction, and it is why the
  harnesses that compact are careful about when they do it.
- **Clear the minimum cacheable length.** Anything shorter than that is not
  cached at all, so a shared block just below the threshold caches nothing.
  Adding genuinely useful stable material can be cheaper than leaving it out,
  which is a strange sentence that the pricing makes true.
- **Put the breakpoint where the stability ends.** A breakpoint at the boundary
  between the stable block and the volatile tail means the tail is processed at
  the normal rate instead of being written to the cache on every call. Writing a
  breakpoint can cost a little more than ordinary input, so it should sit in
  front of content you will actually reuse.
- **Keep the session warm.** Caches expire in minutes. An agent that sits idle
  for an hour pays full price on the next turn, which is why Aider pings the
  thread every few minutes to keep the cache alive.

## What you cannot see

// TODO would drop this

The prompt is the part of the agent you are most likely to tune and the part that
is easiest to hide.

OpenHands builds prompts server-side. The client we reviewed declares tools per
conversation and lets the agent server own the text, so the assembly is not in
the repository we read. Crush is the mirror image: its step loop lives in an
external library, but the prompt does not, so the interesting part stayed
reviewable.

Aider makes the visibility question configurable per model.
`use_system_prompt` decides whether a system message is used at all,
`examples_as_sys_msg` decides whether the edit examples travel as system
messages, and `reminder` decides whether the reminder arrives as a system or a
user message.

## Conclusions

The five components we wrote about are the machine. The system prompt is the
configuration, and after reading ten codebases it is the first file we would open
in a new agent: it says what the tool thinks it is, what it assumes about your
repository, and what it will do without asking.

It is also where the edges of the design show up first. Cache stability,
instruction-file conventions and compaction all meet in the prompt, which is why
the ten harnesses agree on the ingredients and split on everything that happens
around them.

In the next posts we will keep digging into single parts of the anatomy.

Follow along on the [series page](/writing/how-coding-agents-work/).
