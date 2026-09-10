---
title: "Building Pinocchio, a coding agent in five versions"
description: We build Pinocchio, a tiny coding agent in Go, one version at a
  time — the loop, tool calls, a permission prompt, context squeezing, and a
  session file. The whole anatomy of a coding agent.
date: 2026-09-10
draft: true
tags:
  - ai
  - agents
image: /assets/writing/building-pinocchio.png
image_width: 2400
image_height: 1260
---

In the [first post of this series](/writing/how-coding-agents-work/) we
shortlisted ten open-source coding agents that we want to understand in depth.
Before we get there, we have to explain the general architecture of a coding
agent. While they're obviously all different in the details, they share the
anatomy.

The way we'll do this is by building a tiny coding agent, purposely
simplified for educational purposes. We call it **Pinocchio**: a little
puppet that wants to be a real agent. A
puppet is a good metaphor of how we
think about coding agents in [our own
workflow](/writing/how-coding-agents-work/#whats-agentic-programming): an
extremely fast, extremely tireless apprentice that only moves when we pull the
strings. And like any good puppet story, this one comes with a lesson about
what's real and what's wood.

We're building it Go because it's the simplest language we know
and we pretty much default to it every time we're building a CLI.

## Why 5 versions?

A coding agent is, at its very core, a program you use to ask LLMs to
execute actions like read, write, change files on your behalf.

While you don't need that much code to build a (radically) simple version
there's a lot going on conceptually so we'll break how we build this in 5 steps:

1. **The loop**: A chat with amnesia. You can talk to Pinocchio, it'll
   talk back but it won't remember anything and won't be able to execute any
   actions for you.
2. **Tool calls**: With tools, Pinocchio can do things on your behalf.
3. **Permissions**: Unless you constrain it, Pinocchio will happily overwrite
   your files.
4. **Context management**: The longer you talk, the more Pinocchio has to
   remember so context management gives it a better memory.
5. **Sessions**: You can now start and stop talking to Pinocchio at will.

Pinocchio integrates only with DeepSeek, our daily driver, for simplicity sake.

## Version 1: the loop

While we're building a "toy" agent, you will notice that **the agent loop is
genuinely tiny**. We're trying to keep the code short here: in a production
grade coding agent the part that take thousands of engineering hours lives
_around_ the loop.

The v1 version beautifully explains the human-agent interaction at its most
fundamental level:

- The conversation has roles for each message so it can tell who's who (human,
  system, assistant, tools. More on this later).
- Each "request/response" cycle, meaning every time you get control back
  from the agent, is called a turn.

Here's the anatomy that matters: the shape of a message, the request we send,
and the loop itself. The HTTP call lives in a small `chat` helper we leave out
of the way:

{% codefile "writing/pinocchio/v1/main.go" "message" "request" "main" %}

Now let's try it:

```bash
go run v1/main.go
> review v1/main.go in this directory
I don’t have access to your local filesystem or directory contents, so I can’t open or review `v1/main.go` directly.

Please paste the code from `v1/main.go` here, and let me know what kind of review you’re looking for, for example:

- Bug fixes
- Code style / Go best practices
- Performance improvements
- Concurrency safety
- API design
- Testing suggestions

Once I can see the code, I’ll give you a detailed review.
```

It works 🎉 but... we hit the most obvious limitation. Our v1 program is
nothing more than a repackaged chat. You can ask questions, you get answers
but the agent can't execute any actions for you. This is where tools come in.

## Version 2: tools

Tools draw the line that separates an AI chat from an agent. Tools is how
LLMs gain the ability to execute actions for you.

It works this way: you pass available tools along with your messages to LLM aso
that LLM knows what kind of actions can perform.

Of course LLM sees only the definition of the available tools (a
structured description) which uses to output tool calls. The agent is
responsible for the actual execution of said calls.

This has a deep implication on the structure of the agent loop code because, in
order to achieve "autonomous actions", the LLM and the agent may have to
exchange messages within the same turn. In practice, this means we need an
an inner loop inside the main loop to handle tool calls.

This may be harder to explain in words than in code. First the schema we hand to
the model: since Pinocchio is purposely simple it has just three tools, each
with a name, a description, and a JSON schema for its arguments.

{% codefile "writing/pinocchio/v2/main.go" "tools" %}

Then the conversation itself grows. Messages make room for the tool calls the
model asks for and for the results we hand back, and the request gets a
`tools` field:

{% diff "writing/pinocchio/v1/main.go" "writing/pinocchio/v2/main.go" "message"
"request" %}

The inner loop is the other half of the change. It lives inside `main`, keeps
calling the model for as long as it asks for tools, and passes the tools to
`chat` on every call:

{% diff "writing/pinocchio/v1/main.go" "writing/pinocchio/v2/main.go" "main" %}

As you can see, here we have the two major differences that transform a chat
bot into an agent:

- We pass the tools schema to the LLM.
- The inner action loop.

The tools schema call is trivial but the inner loop contains the "meat" of
what implementing tools in an agent is about. That `runTool` function is
where the agent, in this case pinocchio, will execute actions on behalf of
the LLM and give back to the LLM the result:

{% codefile "writing/pinocchio/v2/main.go" "runTool" %}

Now you could follow the "use bash for everything" approach, meaning you
pass only one tool called "bash" to the LLM, or you could go much more
granular. Moreover, the implementation of each tools can follow different
paths: you can do it "natively" using the stdlib of the language the agent
is written in, you can fork into a subprocess and delegate to a different
program (it's common for search where some agents like to use `rg` for
search), you can use a MCP or anything you can think of. The point is that,
for the sake of our conversation, the actual implementation of the tools we
passed (read, write, list) doesn't matter. The topic is too large for a
comprehensive conversation so we'll write about it in a separate post of this
series.

Let's now look at an example of what pinocchio can do now that it has access
to tools. In the working directory there's a one-file program — `greet.go`
greets an empty name as `world`. We ask two things in a row: what it does,
then to change the fallback to `stranger`:

```text
> what does greet.go do?
>> list_dir
greet.go

>> read_file
package main

import "fmt"

func greet(name string) string {
	if name == "" {
		name = "world"
	}
	return fmt.Sprintf("Hello, %s!", name)
}

func main() {
	for _, n := range []string{"Ada", ""} {
		fmt.Println(greet(n))
	}
}

It's a tiny program: greet falls back to "world" for an empty name,
then main prints the greeting for both "Ada" and "".

> change the empty-name fallback from "world" to "stranger"
>> write_file
wrote greet.go
Done. Empty names now greet as "stranger".
```

Notice what never happened in that conversation: nobody asked you anything.
Between Pinocchio deciding to call `write_file` and `greet.go` changing on
disk there was no question, no confirmation — just the model's intent and
your full permissions. That's exactly what the next version has to deal
with.

## Version 3: asking permission

Real world coding agents approach permissions in very different ways. Here's
a few common strategies:

1. Rule/policy-based ask-approval: deterministic per-call allow|ask|deny
   engine, "ask" escalates to a human prompt with once/session/always
   persistence.
2. OS-level sandboxing: real kernel boundary as the baseline.
3. LLM-as-judge: hidden model call classifies tool-call risk.
4. No-permission/delegation by design — runs with full privileges. Yes some
   do this and it works for them!

For the sake of brevity, pinocchio implements a gated write_file which is a
radically simple version of the rule based ask approval strategy.

Here's how it looks like:

{% diff "writing/pinocchio/v2/main.go" "writing/pinocchio/v3/main.go" %}

and here's how it works:

```bash
> count files in this directory and show names

Here are the results:

**Total files: 5**

File names:
1. `go.mod` (root)
2. `v1/main.go`
3. `v2/main.go`
4. `v2/demo/greet.go`
5. `v3/main.go`

The directory also contains subdirectories `v1/`, `v2/`, and `v3/` (plus `v2/demo/`), which contain these files.
> now write v4/main.go from v3

run "write_file v4/main.go"? [y/N]
```

It works 🎉 now pinocchio asks for permission to write files!

## Version 4: compaction

Now that pinocchio has more features, we may be tempted to have a long
conversation with it. That's where context compaction comes in.

All LLMs have a "natural" limit called context window (unit of measure: tokens).
If you exceed this window, the LLM provider api will just reject your call.
It's clear that an agent can't really be functional unless it has a strategy
to deal with this problem.

Real world agents can get quite creative with their compaction strategy.
Just an example: our ten coding agent lists from the series intro counts seven
different strategies. But they all have in common one thing: summarization
is a dedicated step (meaning there's a LLM call specialised into compacting
the summary). What makes up so many different strategies is the when and how.
We'll go into details into an upcoming article.

Pinocchio does the simplest thing that works: when the conversation grows past
a budget, it summarizes the first half with one extra model call and keep the
recent stuff. Here's the code:

{% diff "writing/pinocchio/v3/main.go" "writing/pinocchio/v4/main.go" %}

As you can see this is a simple and practical solution. Now let's see it in
action:

```text
go run v4/main.go
> let's review the project, read the code of v1, v2 and v3
>> list_dir
v1/main.go
v2/main.go
v3/main.go
v4/main.go

>> read_file
(...)
...
> and what's new in v4?
(...)
...   // tool outputs keep piling up, every read_file lives in the conversation
>> over budget (104,210 chars): summarized 26 of 52 messages into one (41,020 chars left)

> thanks, let's continue the review
assistant: Happy to. What should we look at next — the permission gate in
v3, or how v4 decides when to summarize?
```

The first 26 messages collapse into a ten-bullet summary while the recent
half survives untouched, and the conversation carries on under the budget.
That `summarize` call is the price of the trick: one extra model call
instead of a brick wall of API rejections.

## Version 5: a session file

Ctrl-C happens. Terminals close. Laptops reboot mid-refactor. As far as
Pinocchio is concerned, none of it ever happened: the whole conversation
lives in `messages`, which dies with the process. Compaction buys you a
longer afternoon, not a tomorrow.

One append-only file fixes that. Every message is saved to `pinocchio.jsonl`
the moment it's appended — one JSON document per line — and a `--resume`
flag replays the file back into `messages` at startup:

{% diff "writing/pinocchio/v4/main.go" "writing/pinocchio/v5/main.go" %}

The save itself is seven lines and that's the whole trick; the rest of the
diff is the replay — a flag, a file read, one JSON unmarshal per line.
Let's see it in action:

```text
go run v5/main.go
> fix the typo in greet.go: empty names should greet as "stranger"
>> list_dir
greet.go

>> read_file
package main

import "fmt"

func greet(name string) string {
	if name == "" {
		name = "world"
	}
	return fmt.Sprintf("Hello, %s!", name)
}

func main() {
	for _, n := range []string{"Ada", ""} {
		fmt.Println(greet(n))
	}
}

>> write_file
run "write_file greet.go"? [y/N] y
wrote greet.go
Done. Empty names now greet as "stranger".

# ctrl-c happens. terminals close. you come back tomorrow.
^C

go run v5/main.go --resume
> what were we doing?
assistant: We were changing greet.go so empty names greet as "stranger"
instead of "world" — and we already wrote the fix before the session ended.
```

JSONL is crash-safe by construction: a torn last line costs you one message,
not the file, and it's queryable with `grep`, which is more than we can say
for most databases we've loved. Yes, we're ignoring every error. Yes, you
should fix that before copying this into production. It's nine lines to be a
real agent and thirty to be a _good_ Unix citizen; the article is about the
first part.

## Pinocchio ain't real

**Pinocchio isn't a real coding agent.** It reads your code, edits it,
runs your
tests, reads the failures, tries again, remembers what happened yesterday, and
asks before it does anything dangerous.

It's been a fun didactic expedient to explain how the very core functionality
of an agent looks like. Of course we left a tons of things out by choice,
here's a short list of obvious things we may want to expand on in the rest
of the series:

- **System prompts**: we've debated including system prompts in this first
  article about pinocchio but system prompts have changed significantly
  their role in coding agents recently so we plan to write about them soon.
- **Streaming**: Pinocchio stares at you in silence until the full reply
  arrives. This is highly distressing as a user and of course no real world
  coding agent works this way.
- **Sub-agents**: Most coding agents have a way to delegate work to "copies"
  of themselves (often with a different system prompt, permission model).
- **Provider abstraction**: While we love DeepSeek and rely on it for most
  of our work, a real world coding agent can't be this opinionated.
- **Extensibility** — no plugins, no MCP, no way to teach Pinocchio a new
  trick without recompiling it.

That's the map for the next post: we take the ten coding agents from our
[first post](/writing/how-coding-agents-work/) and compare them on exactly
these edges, with Pinocchio as the measuring stick. The loop, it turns out, is
the easy part.

Follow along on the [series page](/writing/how-coding-agents-work/)
