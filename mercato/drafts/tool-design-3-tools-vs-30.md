---
title: "Tool design: the difference between 3 tools and 30"
platforms:
  - linkedin
  - twitter
publish_date: 2026-10-23
topics:
  - agents
  - from-the-series
  - open-source
---

## LinkedIn

🤔 We were curious to understand how different strategies for handing tools to
LLMs compare. So we ran an experiment aimed at comparing the key performance
metrics where the only two things that change are the number of tools the LLM
sees, and how the LLM finds them. The results were surprising.

We picked one agent, Qwen Code, and one model, DeepSeek's deepseek-flash, so the
only things left to vary were the number of tools and the way the LLM finds
them. Two tasks: a rename of a configuration key across six files, and a lookup
of every caller of a function. Both problems had a decoy planted in the
repository to see if we could catch the LLM off-guard and thus identify
strategies that were clearly not good enough.

We ran every task in three ways: with a shell as the only tool, with the full
catalogue of 28 tools declared upfront, and with 2 tools declared while the rest
sit behind a search the LLM has to call. The lookup got one more run with a
language server switched on.

On the rename:

• Shell only: 3 calls, 25,643 input tokens, 11.8 seconds
• 28 tools declared: 26 calls, 227,537 input tokens, 32.8 seconds
• 2 tools plus search: 20 calls, 150,423 input tokens, 43 seconds

All three answered correctly, decoys included. The traps we planted to catch a
blunt approach caught nobody, which says as much about the models as about the
tools: this generation is careful enough that a decoy does not separate a blunt
toolset from a granular one, at least at this task size. What did separate them
was cost. 28 declarations serialise to about 15,000 tokens of schema, paid again
on every turn, and the full catalogue spent roughly 9x the calls and 9x the
tokens for the same result.

Two things complicate the picture. Declaring 2 tools instead of 28 cut the first
turn by about 2/3, but fetching a tool costs an extra turn, and with 92-98% of
the input tokens billed as cache reads, a token saving is not the same as a
dollar saving. And the precise tool lost: on the lookup, the shell needed 3
calls, while the language server run needed 10, because the model read 7 files
before it thought to call findReferences.

None of that cost us precision: all three approaches led to the same answer. It
cost time instead. On the rename, the same answer took roughly 3x as long with
the full catalogue, and 3.6x with the search setup. We ran each configuration
once, so take the seconds as an indication, not a measurement.

Our takeaway: for simple problems, a shell looks like a much more efficient tool
surface than a fuller toolbelt, for the current generation of coding agents. We
will keep digging into the topic with more complex problems, to see whether
there is a threshold beyond which that richness starts to pay off.

Read the full post on tools for more information:
https://matto.club/writing/how-coding-agents-work/tools/

## Twitter

### 1

🤔 We wanted to compare how different ways of handing tools to an LLM perform in
practice, changing only which tools it sees and how it finds them. So we ran an
experiment with one agent and one model. The results were surprising.

### 2

One agent (Qwen Code), one model (DeepSeek's deepseek-flash). Two tasks: rename
a config key across 6 files, and find every caller of a function. Both had a
decoy planted, to see if we could catch the LLM off-guard.

### 3

3 ways to run each task: a shell as the only tool, 28 tools declared upfront,
and 2 tools with the rest behind a search the LLM has to call. The lookup also
got a run with a language server.

### 4

On the rename:

• shell only: 3 calls, 25,643 tokens, 11.8s
• 28 tools: 26 calls, 227,537 tokens, 32.8s
• 2 tools + search: 20 calls, 150,423 tokens, 43s

### 5

All 3 answered correctly, decoys included. The traps caught nobody: this
generation is careful enough that a decoy does not separate a blunt toolset from
a granular one, at this task size. What separated them was cost: 9x the calls
and 9x the tokens.

### 6

Declaring 2 tools instead of 28 cut the first turn by about 2/3, but fetching a
tool costs a turn. 92 to 98% of input tokens were cache reads, so fewer tokens
is not proportionally fewer dollars. No precision loss, but 3x to 3.6x the wall
clock.

### 7

For simple problems, a shell looks like a much more efficient tool surface than
a fuller toolbelt, for the current generation. We will keep digging with more
complex ones to find where that richness pays off.

https://matto.club/writing/how-coding-agents-work/tools/
