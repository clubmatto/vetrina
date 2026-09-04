---
title: "How coding agents work: A new series"
description: An intro to a new series of blog posts where we intend to
  understand coding agents in depth.
date: 2026-09-04
draft: true
tags:
  - ai
  - agents
  - meta
---

It's not a secret that we practice agentic programming on a daily basis. At the
time of writing this article, we use [OpenCode](https://opencode.ai) as our main
agent and [DeepSeek](https://deepseek.com/en/) v4 flash 0731 as our main LLM.

In the past few months, we've been asking ourselves if there's room to improve
our setup. We care deeply about the quality of the human-machine interaction
(see [what's agentic programming?](#whats-agentic-programming)), token
efficiency, tool usage. We also have to admit that, for a long time (in AI time
😉), we've been just end users of these magical boxes where you put words in and
you get actions out.

At Club Matto we like tools that just work™ but we don't love magic. Experience
has taught us that when things look magical on the outside, they often have
lots to teach you as you look deeper into them.

So today we're kicking off a series on agentic programming. The goal of the
series is to learn in depth how coding agents work, where they differ, and what
that means for our agentic workflows. Given the scope and the very (very!)
fast-moving landscape, expect frequent posts!

As a first step, we looked at what the coding agent market has to offer and made
a shortlist of ten open-source agents we want to focus on.

Before we go on to explain how we chose agents for our list, let us spend a few
words on what agentic programming means to Club Matto.

## What's agentic programming?

These days, we do all our coding tasks via a coding agent. The agent
does all the typing, we do all the reading. These are active sessions: we don't
let the agents go on for hours and commit their work. We actively steer the
agents toward verification loops we're most comfortable with (in short: end-to-end
tests, sometimes with ad-hoc scripts, and very aggressive linting phases). We drive the interaction, the agent executes it. This also explains our
love for DeepSeek v4 flash 0731. It's _really_ fast and _really_ cheap.

We find this workflow quite productive but we can see some obvious limitations. For
example, coding editors don't make much sense in this context. They're optimized
for, well, editing but we're now mostly looking at diffs since agents do all our
typing. One other limitation we feel a lot is remote pair programming support in
these tools. We often find ourselves wanting to collaborate with the agents and
we have yet to come across a solution that works for us.

The point we're trying to stress is that we think of agentic programming as a
close collaboration between humans and machines which is why we focus a lot on
the ergonomics of the workflows that different coding agents may unlock. We
really think of agents as extremely fast and smart typists, researchers,
debuggers but we're the authors and ultimately responsible for the code the
agents produce.

## How we chose 10 coding agents

When we set out to explore the coding agent market, we used the following
criteria:

- The project _must_ be open-source. We want to know how things work in detail,
  we want to look at the code.
- The project _must_ be multi-provider. We want harnesses we can point at
  whatever model we like (BYO key / OpenAI-compatible / local), no lock-in.

While definitely more subjective, we also tried to select agents that focus
**on simplicity/performance**.

Last but not least, we warmly welcome projects from the **Chinese ecosystem**. Three of the ten are official harnesses from Chinese AI labs
(DeepSeek, Alibaba, Moonshot AI) and all three are multi-provider. If you only
follow Western launches, you're missing a lot of the experimentation happening
in this space.

## The list

Now that we've clarified how we selected each project, it's time to look at the
list!

<div class="agent-table-wrapper">
  <table class="agent-table">
    <thead>
      <tr>
        <th>Agent</th>
        <th>Language</th>
        <th>License</th>
        <th>Models</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="agent-name">
          <a href="https://github.com/sst/opencode">OpenCode</a>
          <span class="byline">by SST</span>
        </td>
        <td class="nw">TypeScript</td>
        <td class="nw">MIT</td>
        <td>BYO, OpenAI-compatible</td>
      </tr>
      <tr class="agent-notes-row">
        <td colspan="4">Model-agnostic and fast. The harness we run ourselves.</td>
      </tr>
      <tr>
        <td class="agent-name"><a href="https://github.com/paul-gauthier/aider">Aider</a></td>
        <td class="nw">Python</td>
        <td class="nw">Apache-2.0</td>
        <td>BYO via LiteLLM</td>
      </tr>
      <tr class="agent-notes-row">
        <td colspan="4">The pioneer of repo maps and git-integrated diffs.</td>
      </tr>
      <tr>
        <td class="agent-name">
          <a href="https://github.com/deepseek-ai/deepseek-harness">DeepSeek Harness</a>
          <span class="byline">by DeepSeek</span>
        </td>
        <td class="nw">TypeScript</td>
        <td class="nw">MIT</td>
        <td>Multi-protocol</td>
      </tr>
      <tr class="agent-notes-row">
        <td colspan="4">Everything is a plugin.</td>
      </tr>
      <tr>
        <td class="agent-name">
          <a href="https://github.com/QwenLM/qwen-code">Qwen Code</a>
          <span class="byline">by Alibaba</span>
        </td>
        <td class="nw">TypeScript</td>
        <td class="nw">Apache-2.0</td>
        <td>Multi-protocol</td>
      </tr>
      <tr class="agent-notes-row">
        <td colspan="4">Speaks OpenAI, Anthropic, and Gemini protocols.</td>
      </tr>
      <tr>
        <td class="agent-name"><a href="https://github.com/earendil-works/pi">Pi</a></td>
        <td class="nw">TypeScript</td>
        <td class="nw">MIT</td>
        <td>BYO, 40+ providers</td>
      </tr>
      <tr class="agent-notes-row">
        <td colspan="4">A minimal harness on a unified LLM API.</td>
      </tr>
      <tr>
        <td class="agent-name">
          <a href="https://github.com/MoonshotAI/kimi-code">Kimi Code CLI</a>
          <span class="byline">by Moonshot AI</span>
        </td>
        <td class="nw">TypeScript</td>
        <td class="nw">MIT</td>
        <td>Kimi, Claude, OpenAI-compatible</td>
      </tr>
      <tr class="agent-notes-row">
        <td colspan="4">Multi-provider out of the box.</td>
      </tr>
      <tr>
        <td class="agent-name">
          <a href="https://github.com/charmbracelet/crush">Crush</a>
          <span class="byline">by Charmbracelet</span>
        </td>
        <td class="nw">Go</td>
        <td class="nw">FSL-1.1-MIT*</td>
        <td>BYO</td>
      </tr>
      <tr class="agent-notes-row">
        <td colspan="4">Premium TUI, your LLM of choice.</td>
      </tr>
      <tr>
        <td class="agent-name">
          <a href="https://github.com/All-Hands-AI/OpenHands">OpenHands</a>
          <span class="byline">by All Hands AI</span>
        </td>
        <td class="nw">TypeScript, Python</td>
        <td class="nw">MIT</td>
        <td>BYO via LiteLLM</td>
      </tr>
      <tr class="agent-notes-row">
        <td colspan="4">A full platform with a Docker-sandboxed runtime.</td>
      </tr>
      <tr>
        <td class="agent-name">
          <a href="https://github.com/block/goose">Goose</a>
          <span class="byline">by Block</span>
        </td>
        <td class="nw">Rust</td>
        <td class="nw">Apache-2.0</td>
        <td>BYO</td>
      </tr>
      <tr class="agent-notes-row">
        <td colspan="4">Local-first and extensible.</td>
      </tr>
      <tr>
        <td class="agent-name">
          <a href="https://github.com/openai/codex">Codex CLI</a>
          <span class="byline">by OpenAI</span>
        </td>
        <td class="nw">Rust</td>
        <td class="nw">Apache-2.0</td>
        <td>BYO, OpenAI-compatible</td>
      </tr>
      <tr class="agent-notes-row">
        <td colspan="4">Extensible via custom providers; built-in Ollama, LM Studio, and Bedrock.</td>
      </tr>
    </tbody>
  </table>
</div>
<p class="agent-table-footnote">
  * FSL-1.1-MIT is the Functional Source License: source-available today, MIT after two years.
</p>

## What's next

In the next post, we'll do a comparative analysis of "our" coding agents on the
main components that make up such a project:
core agent loop, tool and permission model, context and memory handling,
sub-agents, and sessions.

Follow along on the [series page](/writing/tags/agents/)
