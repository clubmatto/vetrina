---
title: "Give an agent fewer, better tools"
platforms:
  - twitter
  - linkedin
image: https://github.com/clubmatto/vetrina/blob/main/website/src/assets/writing/comparative-analysis-of-coding-agents.png
topics:
  - agents
  - from-the-series
---

## Twitter

The best agents we read curate their tools ruthlessly.

Same rename task, same correct answer: 25k input tokens with one tool, 227k
with 28 declared. The catalogue is a bill you pay on every turn.

https://matto.club/writing/how-coding-agents-work/tools/

## LinkedIn

Give an agent fewer, better tools.

We read ten open-source coding agents, and the tool catalogues span the whole
spectrum: Pi ships four by default. Goose deliberately omits read and grep and
points the model at cat, sed and rg through the shell. DeepSeek Harness goes
all the way to a single code tool. Qwen Code declares twenty-eight.

The bill is real. The full catalogue serialises to about 15,000 tokens of
schema, sent on every single turn. We ran the same rename task through one
harness with three tool surfaces, and every configuration got the right
answer. What changed was the invoice: three tool calls and about 25,600 input
tokens with one shell tool, twenty-six calls and about 227,000 with everything
declared.

A smaller catalogue is a feature. Less tax per turn, fewer chatty results
crowding the context, a narrower blast radius, and approvals that stay
readable because each tool is one readable action.

The honest caveat: single runs, so read the gaps as an order-of-magnitude
signal.

So when you evaluate an agent, don't count the tools. Read the shape of the
list.

Read it here: https://matto.club/writing/how-coding-agents-work/tools/
