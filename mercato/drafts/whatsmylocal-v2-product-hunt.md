---
title: "What's my local AI? v2: fit, speed, cost, and what to run it on"
platforms:
  - producthunt
publish_date: 2026-11-23
topics:
  - whatsmylocalai
  - launch
  - open-source
---

## Product Hunt

### Product Hunt Launch — What's my local AI? v2

**Name:** What's my local AI?
**URL:** https://whatsmylocal.ai
**Launch day:** 2026-11-23

### Tagline (≤ 60 chars)

Local AI: what fits, how fast, what it costs

### Tagline options

- Which local AI fits, and at what speed?
- Fit, speed, and cost for local AI
- Stop guessing what your machine can run
- The local AI model your machine can actually run

### Description

In August, What's my local AI? answered one question: which local models can your machine actually run? v2 answers the next four: how far off the ones that do not fit are, how fast they run, what local costs against GPT-5.5 and DeepSeek, and what to run it on.

Detection stays in your browser. No install, no account, nothing uploaded. 90+ Q4 models, Ollama and LM Studio, refreshed weekly. Free and open source.

### Topics

ai, developer-tools, artificial-intelligence, open-source

### First comment

We built v1 in August because "can my machine run this?" was a guessing game. It answered fit. The next questions were always the same: how far off am I, how fast will it actually run, is the hardware worth it, and what should I buy?

v2 answers those four.

The gap is the one I use most. A no without a number is useless. Every model that does not fit now shows the GB short, sorted by the closest miss. On a 16 GB M1, 46 models fit and 46 do not; the closest are about 2.5 GB short.

Speed is an estimate, not a benchmark. It uses the llmspeed bandwidth model for a single device at 8k context, and shows a band because real numbers move with the engine, drivers, and thermals. The terminal streams at that speed so the number is something you feel.

The cost page compares the same tokens, not the same quality. Local is a fixed cost with a low marginal cost; GPT-5.5 and DeepSeek are marginal. The calculator has two modes, payback, the usage crossover, and a 12-month chart with the crossings marked.

The setups are the last piece. Four machines that clear 20 tok/s at the low end, with the model and speed computed from the catalog: Mac mini M4, MacBook Pro M4 Pro, RTX 4060 Ti, and RTX 4090. Vendor links and prices are public; no affiliate money.

Everything runs in the browser. No install, no account, nothing uploaded. 90+ Q4 models, Ollama and LM Studio, open source.

What does it detect on your machine? I would love to see the specs and the pick.
