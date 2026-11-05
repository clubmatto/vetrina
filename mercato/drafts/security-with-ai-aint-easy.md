---
title: "Security with AI ain't easy"
platforms:
  - linkedin
  - twitter
topics:
  - security
  - agents
publish_date: 2026-11-05
---

## LinkedIn

One of our agents leaked a credential last week. The way this happened is an interesting cautionary tale on AI security.

The command was a one-liner the agent had written before: `eval $(cat .env)` to pull the variables into the shell. It's meant to be safe, meaning the credentials won't end up in the prompt and cross over to the LLM. This time though it failed, because things like `access-key-id` and `secret-access-key` are not valid shell identifiers, but they are valid dotenv keys. The problem is not the failure, but what happened next.

Bash, explaining the failure, printed the assignment it could not parse:

`bash: export: 'secret-access-key=...': not a valid identifier`

The error contained the value. Since this was a tool's output, it ended up in the context window for subsequent LLM evaluation. The security we thought we had vanished in a poof.

This is a perfect example of the conundrum we exposed in both our tools and permissions deep dives: giving a harness access to a shell unlocks a world of possibilities and can make the agent so much "smarter", but it also makes the failure modes combinatorial, meaning it becomes impossible to safeguard from all of them deterministically.

It's a good thing that our harness recognized the mistake and let us know, but let's be honest: the chances such a mistake goes unnoticed on either side of the conversation are significantly higher than zero. And even so, the maintenance burden of rotating a credential immediately is a cost as well.

If you want to understand the mechanics of this problem better, check out our deep dives: https://matto.club/writing/how-coding-agents-work/tools/ and https://matto.club/writing/how-coding-agents-work/permissions/

## Twitter

### 1

One of our agents leaked a credential last week. The leak was an error message.

### 2

The command was `eval $(cat .env)`, chosen precisely so the secrets would not enter the prompt. It failed: `access-key-id` and `secret-access-key` are valid dotenv keys but not valid shell identifiers.

### 3

Bash, explaining the failure, printed the assignment it could not parse, value included. That error is tool output, and tool output goes into the context window.

### 4

So the safeguard was the thing that leaked. The failure is not the interesting part. The reporting of the failure is.

### 5

It is the conundrum from our deep dives: a shell makes an agent capable and its failure modes combinatorial, so no deterministic rule set covers all of them.

### 6

Our harness caught it and said so. But the chances one goes unnoticed on either side of the conversation are well above zero, and rotating a credential on the spot is a real cost.

### 7

The mechanics behind this, in two deep dives:

https://matto.club/writing/how-coding-agents-work/tools/
https://matto.club/writing/how-coding-agents-work/permissions/
