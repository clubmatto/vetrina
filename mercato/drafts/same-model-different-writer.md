---
title: "Same model, different writer?"
platforms:
  - linkedin
  - twitter
publish_date: 2026-10-03
image: https://github.com/clubmatto/vetrina/blob/main/website/src/assets/writing/the-system-prompt.png
topics:
  - agents
  - ai
  - open-source
---

## LinkedIn

We recently started evaluating DeepSeek Harness, and the first thing we noticed had nothing to do with capability: 
the writing style changed from what we were used to.

Same model as before, DeepSeek V4.1 Flash. More verbose, denser, more jargon. To the point we had to spend many 
turns on each reply to work out what it actually meant. In OpenCode that happened less, if at all.

We weren't sure this was just an impression, so we went and read the respective system prompts, the obvious first candidates for the discrepancy.

It turns out, OpenCode ships a tone section in its system prompt: minimize output tokens, answer in fewer 
than four lines unless asked for detail. No introductions, no conclusions, no preamble or postamble. It even carries few-shot examples of one word answers.

On the contrary, DeepSeek Harness ships a single identity sentence and nothing about style. Its prompt is a template, 
and style arrives through configuration.

We then counterchecked by asking DeepSeek Harness to use a slightly dry language with as little adjectives as 
possible, and suddenly it felt like talking to a different person. The replies got short enough that the 
conversation got flowing again.

What to take out of this anecdote: the harness carries more responsibility for your final experience than you might 
think.

The outcome for us is that we are updating our ai-kit rules to operationalize this, so our agents keep the voice we 
want without renegotiating it every session. Release coming soon so stay tuned :)

And if you are curious about what actually goes into that prompt, feel free to check out our deep dive into system 
prompts: https://matto.club/writing/how-coding-agents-work/the-system-prompt/

## Twitter

### 1

We started evaluating DeepSeek Harness. Same model as in OpenCode, DeepSeek V4.1 Flash. The writing came back completely different.

### 2

More verbose, denser, more jargon. We spent turn after turn working out what a reply actually meant. For the model everyone calls interchangeable.

### 3

So we read the two system prompts.

OpenCode's: minimize output tokens, under four lines unless asked, no preamble, no postamble. It even ships few-shot examples of one-word answers.

DeepSeek Harness's: one identity sentence. No style rules at all.

### 4

We then asked DSH for slightly dry language, as few adjectives as possible. Felt like talking to a different person, and the conversation started flowing again.

### 5

Takeaway: the harness shapes your experience more than the model does.

We're updating our ai-kit rules so our agents keep the voice we want. Release soon.

What goes into that prompt: https://matto.club/writing/how-coding-agents-work/the-system-prompt/
