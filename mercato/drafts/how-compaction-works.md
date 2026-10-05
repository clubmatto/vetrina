---
title: "How compaction works, and which algorithm wins"
platforms:
  - linkedin
  - twitter
publish_date: 2026-10-06
image: https://github.com/clubmatto/vetrina/blob/main/website/src/assets/writing/how-compaction-works.png
topics:
  - agents
  - ai
  - open-source
---

## LinkedIn

📢 How coding agents work: compaction 📢

Every agent eventually runs out of context window. We read ten open-source agents to see how they squeeze a conversation back under budget: when they trigger, what they keep, what they summarize.

Seven strategies, one shared skeleton. Compaction is a model call, so it can fail, and it busts the token cache. So which algorithm wins?

Read it here: https://matto.club/writing/how-coding-agents-work/how-compaction-works/

## Twitter

📢 How coding agents work: compaction 📢

Every agent compacts the same way: drop cheap tokens, keep the recent tail, summarize when you must. Seven strategies split from there, and the cache bill decides.

https://matto.club/writing/how-coding-agents-work/how-compaction-works/
