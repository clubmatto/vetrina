---
title: "\"Human in the loop\" only means something if a wrong yes stays small"
platforms:
  - twitter
  - linkedin
image: https://github.com/clubmatto/vetrina/blob/main/website/src/assets/writing/permissions.png
topics:
  - agents
  - reshare
  - from-the-series
---

## Twitter

"Human in the loop" only works if agents ask for permission when it really
matters.

So when does it really matter?

Read more here: https://matto.club/writing/how-coding-agents-work/permissions/

## LinkedIn

"Human in the loop" only works if agents ask for permission when it really
matters.

So when does it really matter?

If the agent asks too often, approval becomes a reflex. If it asks
too rarely, the agent may end up deleting a dir it really shouldn't have.

That tension is why the ten open-source harnesses we read share no single
permissions model: prompts, allowlists, sandboxes. Anthropic open-sourced the
sandbox runtime behind Claude Code, which denies filesystem writes and network
by default. The best answer seems to be: limit the kind of damage an agent can
do.

But there's lot of nuance. Read more here: https://matto.club/writing/how-coding-agents-work/permissions/
