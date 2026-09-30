---
title: "Same model, different writer"
platforms:
  - linkedin
  - twitter
publish_date: 2026-10-03
image: https://github.com/clubmatto/vetrina/blob/main/website/src/assets/writing/comparative-analysis-of-coding-agents.png
topics:
  - agents
  - ai
  - open-source
---

## LinkedIn

We recently started evaluating DeepSeek Harness, and the first thing we noticed had nothing to do with capability: the writing style changed.

Same model as before, DeepSeek V4.1 Flash. More verbose, denser, more jargon. We kept stopping to work out what a reply actually meant. In OpenCode that happened less.

We weren't sure this was just an impression, so we went and read the respective system prompts, the obvious first candidates for the discrepancy.

OpenCode ships a tone section in the prompt DeepSeek models get. Minimize output tokens. Answer in fewer than four lines unless asked for detail. No introductions, no conclusions, no preamble or postamble. It even carries few-shot examples of one word answers.

DeepSeek Harness ships a single identity sentence and nothing about style. Its prompt is a template, and style arrives through configuration.

We tested the mechanism directly. We added one line, that it should use a slightly dry language, and suddenly it felt like talking to a different person. The replies got short enough to skim again.

The lesson: the harness carries more responsibility for your final experience than you might think.

We are updating our ai-kit rules to operationalize this, so our agents keep the voice we want without renegotiating it every session.

If you are curious about what actually goes into that prompt, we published a deep dive today on how coding agents work.

## Twitter

### 1

We moved from OpenCode to DeepSeek Harness, same model underneath, and the writing style changed: more verbose, denser, harder to parse.

### 2

So we read the two system prompts. OpenCode's says minimize output tokens, answer in under four lines, no preamble. DeepSeek Harness ships one identity sentence and no style rules.

### 3

Same model. Different writer. More on what goes into that prompt: https://matto.club/writing/how-coding-agents-work/a-comparative-analysis/
