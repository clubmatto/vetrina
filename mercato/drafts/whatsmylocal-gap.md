---
title: "whatsmylocal.ai tells you how far off you are"
platforms:
  - twitter
  - linkedin
publish_date: 2026-11-18
topics:
  - whatsmylocalai
  - local-ai
image: https://github.com/clubmatto/vetrina/blob/main/whatsmylocalai/docs/assets/gap-out-of-reach.png
---

## Twitter

A no is only useful with a number.

What's my local AI? now shows how many GB short each model is, sorted by the smallest gap. On a 16 GB M1, the closest miss is about 2.5 GB.

https://whatsmylocal.ai

## LinkedIn

A no is only useful when it comes with a number.

A model list usually tells you a model doesn't fit and stops there. You are left guessing whether you are 1 GB away or 20, and whether another machine is worth it.

What's my local AI? now shows the gap for every model that does not fit, sorted by the smallest gap.

On a 16 GB M1, 46 models fit and 46 do not. The closest are about 2.5 GB short. Qwen3-30B-A3B needs about 4.5 GB more.

The gap is the Q4 weight requirement at 8k context, single device. It is an estimate, not a promise that 2.5 GB more memory makes a model fast.

The cost post lands Thursday. v2 launches on Product Hunt Monday.

Check it out: https://whatsmylocal.ai
