---
title: "The compiler is not the IDE"
description:
  We spent a series reading coding agents from the inside. Our conclusion, and
  it is an opinion, is that an agent is the compiler of this era, and the IDE
  that goes with it has not been built yet.
date: 2026-11-17
tags:
  - ai
  - agents
  - meta
series: how-coding-agents-work
image: /assets/writing/the-compiler-is-not-the-ide.png
image_width: 1280
image_height: 720
draft: true
---

So far in this series we have spent time looking inside coding agents. That work
is done now, but that doesn't mean there's nothing left to say. While reflecting
on what we have learned, we realized that understanding the technical part made us form a clear opinion about coding
harnesses as a product and as a market.
Yet we haven't mentioned any of it anywhere. Until now.

This post is going to be different from what you're used to reading on this
blog, as we're going to expose our opinions. We'll talk about where coding
harnesses stand with respect to what we believe agentic coding could become as a
practice. We don't claim to own the truth, so treat the following words as one
opinion among many, and feel free to reach out to disagree and discuss.

## What the products seem to assume

Nobody said out loud that coding agents are meant to replace editors and IDEs, yet here we are. If we look at the way
we structure our days, it's clear most of the time is spent inside an harness. Established players in the IDE landscape
seem to agree with us, as they reshape their true-and-tested UI to fit the new paradigm.

Yet our deep dives and daily experience made us reach the conclusion that coding harnesses, as they stand today, are
**not** a replacement for an IDE. This is not to say we need both though; we rather think that the innovation
brought by LLMs and agentic loops opened up the need for redefining the UX patterns we're used to. What has worked so
far is not sufficient anymore, and incremental improvements won't cut it either. We need to rethink our interaction
model with code and command lines from the ground up.

## Agents are compilers, not editors

To understand the point better, it's useful to make a comparison with the past. Think about the move from assembly to
high-level languages. The compiler made
that possible, and it changed the job of developing programs: fewer people hand-wrote every
instruction, more people expressed intent and let a program expand it to something usable by the machine.

Yet, this didn't wipe out the need for looking at, and touching, code. Raising the level of abstraction allowed for far
more complex code and applications to reach the production stage, and this additional complexity required additional
tools to manage it. Editors evolved into (or got replaced by) IDEs with syntax highlighting, contextual navigation,
refactoring operations and so on.

If we transpose this transition to the present era, we argue that coding harnesses as they stand today are more like
compilers than IDEs. They raise the level of abstraction and they act as output multipliers, but they
don't yet provide the tools for users to interact effectively at this new level of abstraction and output speed.

## The feature gap, concretely

Let's consider again the core components every harness has: permission design, compaction,
sub-agents, tool surfaces, system prompts. Every one of them makes a single
conversation better. Yet not one of them makes it **more** than a conversation.

To make an illustrative example, let's take some common actions one normally does with an IDE: edit some code, rename a
symbol, jump
to
a definition, make a commit and push it. In an IDE these are all "first-class citizens", meaning that they're embedded
in the application's UX: the biggest screen portion is literally a text editor, and for the other operations you press
a button or click a link to perform them.

In contrast, for coding agents these operations are indistinguishable from any other prompt, because that's all the
current mainstream UI supports: user input sent to the LLM as a prompt with proper context around.

Note that this distinction carries a real cost: in an IDE renaming a symbol doesn't cost you anything, while in a
coding harness it necessarily means invoking an LLM and spend tokens on it.

Moreover, there's a subtler point. In theory nothing prevents anyone to stop using a coding agent for trivial
operations and go back to an IDE. But in our direct experience, the money math doesn't match the math on the cognitive
load. Leaving the harness, switching to a different app, doing the thing, switching back has a perceived cost that's
higher than the cost of spending a few more turns with an LLM and waiting for it to be done.

To be fair, we mostly use DeepSeek and GLM as our models, and their price point makes it so that we don't think much
about the extra spend. We'd be curious to hear from people who spend real money on
inference, hundreds a month and more: does it feel the same for you, or do the
unit economics land harder, hard enough to change how you work? We would
genuinely like to know.

Another caveat worth mentioning is that these considerations are heavily dependent on the way we work. If
you hand the agent everything and let it build the whole thing, the missing IDE
features say very little to you, and that is a legitimate way to work.

## Plugins will not save us

There is a healthy market of plugins, tools and add-ons around every harness,
and most of it is good work. We do not think it can fix any of this.

The improvements land at the edges. As long as the loop stays the same, and everything
still has to pass through the model, there is very little room to improve the
ratio between what you spend and what you get out of it. Good technology keeps hitting
below its weight, held back by the structure of the loop and by extension points
that are too narrow to carry it. To understand the point, let's again consider two concrete examples.

The first one is session handover: in our daily work, we'd find it extremely useful to pass around a complete session
to the other person. We tried to do this in OpenCode but the only way to make this work was clunky and error-prone. And
it couldn't be an actual command, since commands are none other than masked pre-baked prompts.

The second one is codebase indexing. With all said and done, the best way as of today to let models gather knowledge
about a codebase is to give them access to grep and the filesystem. To be sure, there are outliers out there that
attempt at doing proper semantic indexing of the codebase, and even some harnesses that take this concept as a
first-class algorithm. But none of this is mainstream, and our intuition tells us this is because harnesses see context
management purely from the point of view of the conversation and the context window limit, not from the point of view
of crafting the optimal set of information for the prompt being sent.

## What this all adds up to

These considerations make us believe that the next generation of coding harnesses will need to do a few things
differently to address the gap that autonomous coding opened with respect to the existing toolset.

First, they will have to treat the "agentic loop" with the LLM as one tool among others, and not the only one. There's
plenty of existing patterns and algorithms that are fast and don't cost tokens, and the fact that IDEs are becoming
obsolete as a tool doesn't mean everything inside them is.

Second, the concept of coding harness as a **product** will have to evolve to do much more heavy lifting than "just"
coordinating and instrumenting a loop between itself, the user and a LLM. We believe there are technologies out there
that can help make the coding experience better independently from further model improvements, but this requires
rethinking the agentic loop as the product's core. (To be clear though: we don't mean to say that the existing work
done on all the core components is useless, quite the contrary. That would be like saying we don't need compilers
because IDEs can do the job!)

Third, we believe the next generation of products will have to literally invent new UX patterns that haven't been
discovered yet,
in order to manage the additional complexity and the paradigm shift enabled by agentic coding. This applies both to
individual coding and to teamwork, which we'll look at next.

## The developer is now a manager

A second useful metaphor that helps identify another important friction point is that of the individual contributor and
the manager. The shift that agentic coding introduced at the individual level is very close to the shift one
experiences when moving from an IC role to that of a manager. Suddenly, the work is not so much anymore about being an
expert of a specific piece of a codebase, but you rather need to be able to stay on top of, and steer, many different
projects and activities at the same time.

If you have ever worked on multiple parallel coding sessions at the same time, you might have felt the same struggle:
context switching between vastly different topics, having to find your bearings within a task again, deciding on
priorities and where to direct your attention. They all require effort, introduce fatigue and slow you down. Not to
mention that keeping everything in your head as a coherent picture becomes a real challenge.

Again, our point here is that the current generation of coding harnesses don't offer the tools necessary to tame this
level of complexity. They all think in terms of sessions and the conversations that form them. But a manager needs
boards and proper visualization of the work in order to be effective.

## What about actual teamwork?

Note that so far we remained within the sphere of a two-actor relationship: that of the developer with its coding
agent. But what about good, old teamwork? Teams and larger organization structures didn't disappear with the
introduction of LLMs, yet it seems to us that the community hardly talks about adapting coding harnesses to work inside
a team.

Our intuition and experience as a team of two tells us the gap is real. Even among us we're constantly left wanting a
way to share a conversation between us and the agent, handover tasks at stage boundaries or collecting
findings, knowledge and best practices outside our monorepo.

To be fair, we do see some movement in this space with the topic of software factories. We also see that big
enterprises understood the problem and are already working to build internal infrastructure to tackle these exact needs
at scale. But they're all still "snowflakes", and they're also tackling the problem at a vast scale. In other
words, there seem to be an untamed market space for agentic teamwork at the small and medium scale. We think the next
generation of coding harnesses will solve these needs too, at least partially.

## The future, reimagined

We don't pretend to have the answer to all the gaps we exposed, and we also don't want to diminish in any way the work
done so far to bring coding harnesses where they are today. The innovations brought about to transform a generic
text interaction with an text predictor into something bound to supplant IDEs changed developer's lives across the
world forever. We'd like though to make our idea of the future more concrete with a few suggestions of features we'd
like to see in the next generation of harnesses.

**Visualisation of work in flight.** Parallel work streams require a good way to keep the overall picture in your
head: where the agents are, what is waiting, how much work is left to complete a task.

**Visualization of work done** Reading _all_ the code is getting harder and harder, and to some extent it's a
self-defeating proposition: a single human will never be as fast as even a single agent so it risks becoming a
bottleneck. Ignoring the details is no solution either. We need to visualize the work at the right level of detail with
diagrams and summaries that find a balance between overwhelming and not presenting enough information.

**Session sharing.** Not cloud agents, not remote sessions. Two
people, different schedules, work that has to keep moving. Right now, even if two developers share
enough context to carry a conversation forward alone there is no way to
share that conversation between them.

**Collaborative sessions.** In a sense an extension of the above, though not necessarily a replacement. Right now
there's a 1:1 relationship between an agent and a session. But what if a session is joined by multiple agents and
multiple users working as a coordinated team?

**More channels to interact with agents.** Working from a laptop _or_ from a mobile chat is a limiting factor both
ways. What if an agent (or a team of agents) was reachable over multiple shared channels? What if we could start a
conversation to explore a task over Slack, and continue that conversation over the harnesses' UI when ready to do so?

**Leverage of local models.** Local models are on the rise, and rightly so. The potential to offload at least part of
the work to the local machine before handing over to a costly LLM is huge. The field is extremely active right now and
we believe we just started to scratch the surface. One example: a native commit command that uses a local model for
generating the commit message.

The list is by no means complete, but it should give a sense of the future we're seeing in front of us. And we hope it
excites you as much as it excites us.

## Why aren't we there yet?

LLMs have brought about a pace of change truly unseen before, and it seems to be accelerating rather than abating. So
why does it look like coding harnesses are not changing as fast?

We cannot in all honesty claim to know the answer to this question, but we made an educated guess based on some
factual observations.

Harnesses tend to come from one of two places: either an open source project, or
a company whose business is inference rather than tooling. OpenCode is an example that might not be that obvious: it
started as an open-source coding harness, but Anomaly, the company built around it, makes money selling inference of
open models for cheaper than the original providers.

We argue that when the money is in tokens, the tool is a way to bring people to the tokens, and the incentive and
focus to build the layer above the session is simply not there.

To be clear, this is not a hit job. The people at Anomaly, DeepSeek, Z.ai and the others are doing a great deal
of serious work on the harness, the models and the inference infrastructure. Our point is simply that we believe a
dedicated product focus is necessary in order to let the current generation harnesses take a leap from where we are.

We would be happy to be proven wrong, of course. If we're missing important context in this analysis, we're happy to 
receive feedback. And if you know of a company shipping a harness with a different take, one closer to ours, we're 
happy to know about it even more. So if you think we're wrong, or if you know something we don't, feel free to reach 
out. 

## Where this leaves us

This ends our journey inside coding harnesses, but it does not mean we're done exploring the AI space; if anything, the
opposite.

We are already on another train, and we will talk about it soon. Follow us and
stay tuned.
