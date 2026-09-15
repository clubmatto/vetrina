---
title: "Building Pinocchio, a coding agent in five versions"
description: We build Pinocchio, a tiny coding agent in Go, one version at a
  time — the loop, tool calls, a permission prompt, context squeezing, and a
  session file. The whole anatomy of a coding agent.
date: 2026-09-15
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
agent. While they're all different in the details, they share the
anatomy.

We will build a tiny coding agent, purposely
simplified for educational purposes. We call it **Pinocchio**: a little
puppet that wants to be a real agent. A
puppet is a good metaphor of how we
think about coding agents in [our own
workflow](/writing/how-coding-agents-work/#whats-agentic-programming): an
extremely fast, extremely tireless apprentice that only moves when we pull the
strings. And like any good puppet story, this one comes with a lesson about
what's real and what's wood.

We're building it in Go because it's the simplest language we know
and we pretty much default to it every time we're building a CLI. Also for
simplicity's sake, Pinocchio integrates only with DeepSeek, our daily driver.

## Why 5 versions?

A coding agent is, at its very core, a program you use to ask LLMs to
execute actions on your behalf.

While you don't need that much code to build a (radically) simple version
there's a lot going on conceptually so we'll break how we build this in 5 steps:

1. **The loop**: A puppet that can't move yet: you can talk to Pinocchio, it'll
   talk back but it won't execute any action for you.
2. **Tool calls**: With tools, Pinocchio can do things on your behalf.
3. **Permissions**: Unless you constrain it, Pinocchio will happily set your
   computer on fire.
4. **Context management**: The longer you talk, the more Pinocchio has to
   remember so context management gives it a better memory.
5. **Sessions**: Pinocchio is never tired but now if you want you can take a
   break and then resume the conversation.

## Version 1: the loop

The most basic version of an agent loop is... a loop. The user (you) asks
one question and the agent (Pinocchio) gives you one answer. We call this
exchange a turn.

Here's the anatomy that matters: the shape of a message, the question we
send, the answer we get back, and the loop itself. The HTTP call lives in a
small `chat` helper we leave out of the way — you can [read the full
source](https://github.com/clubmatto/vetrina/blob/main/website/src/writing/pinocchio/v1/main.go).

{% codefile "writing/pinocchio/v1/main.go" "message" "request" "main" %}

You may be tempted to think that this code is overly simplified for
editorial reasons but the truth is **the agent loop is genuinely tiny**. In
a production grade coding agent the part that take thousands of engineering
hours lives _around_ the loop.

Also notice that the conversation has strictly defined roles for each message so
it can tell who's who (human, system, assistant, tools). More on this later.

Now let's try it:

```text
go run v1/main.go
> review v1/main.go in this directory
I don’t have access to your local filesystem or
directory contents, so I can’t open or
review `v1/main.go` directly.

Please paste the code from `v1/main.go` here,
and let me know what kind of review you’re looking for,
for example:

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
but it's all talk and no action. This is where tools come in.

## Version 2: tools

Tools draw the line that separates an AI chat from an agent. Tools is how
LLMs gain the ability to execute actions for you.

It works this way: you pass tool definitions to the LLM along with your
messages so it knows what kind of actions are available.

If needed, the LLM adds tool calls to its answers. Then the agent is
responsible for executing the calls and append call results to the
message chain.

This has a deep implication on the structure of the agent loop code because, in
order to achieve "autonomous actions", the LLM and the agent may have to
exchange messages within the same turn. In practice, this means we need to
add an inner loop inside the main loop.

This may be harder to explain in words than in code so let us show you how
we added three tools (read/write/list files) to Pinocchio.

First of all, we need to hand to the model a JSON schema
definition of the tools Pinocchio supports and update our message
definitions for the HTTP calls to the LLM:

{% diff "writing/pinocchio/v1/main.go" "writing/pinocchio/v2/main.go" "tools"
"message" "request" %}

Then we introduce the inner loop that manages the tool calls and their
executions:

{% diff "writing/pinocchio/v1/main.go" "writing/pinocchio/v2/main.go" "main" %}

The code shows how "autonomous actions" work (it's just a loop!). One
notable aspect is how the loop breaks: it happens once there are no more
tool calls to execute. At that point the agent gives back control to the user.

The implementation of the tools is up to the agent and in Pinocchio's case
that happens inside the `runTool` function:

{% codefile "writing/pinocchio/v2/main.go" "runTool" %}

Now you could follow the "use bash for everything" approach, meaning you
pass only one tool called "bash" to the LLM, or you could go much more
granular. Moreover, the implementation of each tools can follow different
paths: you can do it "natively" using the stdlib of the language the agent
is written in, you can fork into a subprocess and delegate to a different
program (it's common for search where agents may use `rg`), you can use a MCP
or anything you can think of.

For the sake of our conversation, the actual implementation
of the tools we passed doesn't matter. The LLM output is somewhat of a
"suggestion" but it can only be as good as the tool definitions it receives. The
topic is too large for a comprehensive conversation so we'll write about it in a
separate post of this
series.

Let's now look at an example of what Pinocchio can do now that it has access
to tools. In the working directory there's a Go program (`greet.go`) that
greets people and defaults to `world` for empty names. To demonstrate that
Pinocchio can _actually_ do things we ask it questions it can only answer by
leveraging tools:

```text
> what does greet.go do?
>> list_dir
greet.go

>> read_file

It's a tiny program: greet falls back to "world" for an empty name,
then main prints the greeting for both "Ada" and "".

> change the empty-name fallback from "world" to "stranger"
>> write_file
wrote greet.go
Done. Empty names now greet as "stranger".
```

It works 🎉 but.. notice what never happened in the conversation: nobody
asked you anything. Between Pinocchio deciding to call `write_file` and
`greet.go` changing on disk there was no question, no confirmation: just the
model's intent and your full permissions. That's where permissions model
comes in.

## Version 3: asking permission

Real world coding agents approach permissions in very different ways. Here's
a few common strategies:

1. Rule/policy-based ask-approval: deterministic per-call allow|ask|deny
   engine, "ask" escalates to a human prompt with once/session/always
   persistence.
2. OS-level sandboxing: real kernel boundary as the baseline.
3. LLM-as-judge: hidden model call classifies tool-call risk.
4. No-permission/delegation by design/YOLO: runs with full privileges. Yes some
   do this and it works for them!

For the sake of simplicity, Pinocchio implements a gated `write_file` which is a
radically simple version of the rule-based ask-approval strategy.

Here's how it looks like:

{% diff "writing/pinocchio/v2/main.go" "writing/pinocchio/v3/main.go" %}

and here's how it works:

```text
> count files in this directory and show names

Here are the results:

**Total files: 5**

File names:
1. `go.mod` (root)
2. `v1/main.go`
3. `v2/main.go`
4. `v2/demo/greet.go`
5. `v3/main.go`

The directory also contains subdirectories `v1/`, `v2/`, and `v3/` (plus `v2/demo/`),
which contain these files.
> now write v4/main.go from v3

run "write_file v4/main.go"? [y/N]
```

It works 🎉 now Pinocchio asks for permission to write files!

## Version 4: compaction

Interacting with LLMs is stateless. In fact, if you recall the core agent
loop, it contains these lines:

```go
messages = append(messages, Message{Role: "user", Content: text})

response, err := chat(messages)
if err != nil {
panic(err)
}
messages = append(messages, response)
```

We store the entire conversation so we can keep sending it to the LLM at
every turn.

Now, all LLMs have a "natural" limit called context window (unit of measure:
tokens). If you exceed this window, the LLM provider api will reject your call
point-blank. It's clear that an agent needs a strategy to pass the history
of the conversation to the LLM without exceeding this limit. This is what
context compaction is about.

Real world agents can get quite creative with their compaction strategy.
Just an example: the 10 agents in our short list use
seven different strategies. But they all have in common one thing:
summarization is a dedicated step (meaning there's a LLM call specialised into
compacting
the history of the conversation). What makes up so many different strategies is
the when and how, we will go into details into an upcoming article.

Pinocchio does the simplest thing that works: when the conversation grows past
a certain fixed budget, Pinocchio summarizes the first half with one extra
model call and keeps the recent stuff. Here's the code:

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

## Version 5: a session file

Pinocchio has no storage. The entire conversation lives in an in-memory
array of messages and has no chance of surviving a restart or a crash.

Real world coding agents may use a sqlite database or a slightly more
elaborated solution but, for the sake of simplicity, Pinocchio will use a
simple append-only file. Every message exchanged in the conversation gets
appended to a file: one JSON document per line. We pass the session file
as an argument at startup and replay it back into `messages`:

{% diff "writing/pinocchio/v4/main.go" "writing/pinocchio/v5/main.go" %}

Let's see it in action:

```text
go run v5/main.go pinocchio.jsonl
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

go run v5/main.go pinocchio.jsonl
> what were we doing?
assistant: We were changing greet.go so empty names greet as "stranger"
instead of "world" — and we already wrote the fix before the session ended.
```

## Pinocchio ain't real

Pinocchio isn't a real coding agent. It's been a fun didactic expedient to
explain how the core functionality of an agent looks like. Of course we left a
tons of things out by choice,
here's a short list of the obvious things we will come back to throughout
the series:

- **System prompts**: we've debated including system prompts in this first
  article about Pinocchio but their role in coding agents has changed
  over the past year so we will have to dedicate a whole article to them.
- **Streaming**: Pinocchio stares at you in silence until the full reply
  arrives. This is highly distressing as a user and of course no real world
  coding agent works this way.
- **Sub-agents**: most coding agents have a way to delegate work to "copies"
  of themselves (often with a different system prompt, permission model).
- **Provider abstraction**: While we love DeepSeek and rely on it for most
  of our work, a real world coding agent can't be this opinionated.
- **Extensibility**: no plugins, no MCP, no way to teach Pinocchio a new
  trick without recompiling it.

In the next post, we'll apply the five-point framework to the shortlist of
coding agents we introduced in the opening article of the series. The goal
is to make a comparative analysis of real world agents to understand their
relative strengths and weaknesses.

Follow along on the [series page](/writing/how-coding-agents-work/)
