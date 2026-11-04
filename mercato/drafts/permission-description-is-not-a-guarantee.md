---
title: "A description is not a guarantee"
platforms:
  - linkedin
  - twitter
topics:
  - agents
  - from-the-series
images:
  - https://github.com/clubmatto/vetrina/blob/main/website/src/assets/writing/permissions-approval-dialog.png
publish_date: 2026-11-04
---

## LinkedIn

While working on a cross-repo task with DeepSeek Harness the other day, we noticed a permission dialog different than what we're used to see. What is it and what's the benefit?

When trying to execute shell commands that cross the safe permission boundary, DSH shows a description of the command rather than the command itself. That is a real gain in legibility. `find . -name '*.tmp' -delete` is exact and opaque. "Delete the temporary files this build left behind" is something a person can actually judge.

How does that work? DeepSeek Harness asks for a description with every shell command. It is required by the tool schema, so a call without one does not validate. At approval time the command is the title and the description is the prose underneath it.

Very clever, though we'd argue it does not fully close the effective gap in safety. The description is written by the model that wants to run the command. It is the interested party's account of what it is about to do, submitted for your approval. When the account is accurate you gain readability. But when it's not you obtain a smokescreen.

In other words, nothing checks the prose against the command's results. A description can say "clean up build artifacts" while the command removes a directory that is not a build artifact.

Compare that with what a sandbox does. It does not describe, it constrains, and the constraint is deterministic and fixed. One is a claim, the other is a strict boundary.

What would close the gap is not better writing but prose that is derived from the command's output rather than the command itself: a diff, a plan, the list of paths it would touch. None of the harnesses we analyzed produces that. Mind, not that it would be easy anyway.

You can read a deeper dive on coding agent's permission systems here: https://matto.club/writing/how-coding-agents-work/permissions/

## Twitter

### 1

A permission dialog we had not seen before: when a shell command crosses the safety boundary, DeepSeek Harness shows a description of what the command does instead of the command.

### 2

It works because the description is required by the tool schema. At approval time the command is the title and the model's prose sits underneath it.

### 3

That is a real gain in legibility. `find . -name '*.tmp' -delete` is exact and opaque. "Delete the temporary files this build left behind" is something a person can judge.

### 4

But the description is written by the model that wants to run the command: the interested party's account of what it is about to do.

### 5

Nothing checks the prose against the outcome. A description can say "clean up build artifacts" while the command removes something that is not a build artifact.

### 6

A sandbox does not describe. It constrains, deterministically and in a way that does not depend on anyone's sentence. One is a claim, the other a boundary.

### 7

What would close the gap is prose derived from the command's output rather than the command: a diff, a plan, the paths it would touch. None of the harnesses we analyzed produces that.

https://matto.club/writing/how-coding-agents-work/permissions/
