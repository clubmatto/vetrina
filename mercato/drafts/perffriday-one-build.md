---
title: "One build, and nothing else waits"
platforms:
  - twitter
  - linkedin
topics:
  - ci
  - gradle
  - how-we-work
image: https://github.com/clubmatto/vetrina/blob/main/website/src/assets/writing/perffriday-one-build.png
publish_date: 2026-11-13
---

## Twitter

### 1

In our monorepo, one broken project used to withhold everyone else's deploy. Every project shares one build graph, and the Gradle default is that a failure anywhere ends the graph and nothing else finishes.

### 2

The typical fix is to break projects apart and give each of them its own Jenkins pipeline. It works in principle, but it defeats the purpose of a tool like Gradle.

### 3

Having a single graph is what lets the build skip what did not change, run independent work in parallel, and work out which projects are actually affected.

### 4

Split it into N pipelines and you are back to orchestrating N builds that know nothing about each other.

### 5

No solution then? Not quite.

### 6

`--continue` keeps independent projects going after a failure, though only because the graph already knows which work belongs to which project.

### 7

A publish task is skipped unless its own project's check passed, so the failing project stays unpushed and the others ship. Without that, the flag does not isolate the failure, it ships it.

### 8

Next Friday: the OOM kill dressed like a test failure. One measured CI fix every Friday, numbers included. Give us a follow so the next one finds you.

## LinkedIn

In our monorepo, one broken project used to withhold everyone else's deploy.

Every project shares one build graph, and the Gradle default is that a failure anywhere ends the graph and nothing else finishes.

The typical fix is to break projects apart and give each of them its own Jenkins pipeline. It works in principle, but it defeats the purpose of a tool like Gradle. Having a single graph is what lets the build skip what did not change, run independent work in parallel, and work out which projects are actually affected. Split it into N pipelines and you are back to orchestrating N builds that know nothing about each other.

No solution then? Not quite.

`--continue` keeps independent projects going after a failure, though only because the graph already knows which work
belongs to which project. A publish task is skipped unless its own project's check passed, so the failing project stays unpushed and the others ship.

Next Friday: the OOM kill dressed like a test failure. We post one measured CI fix every Friday, numbers included, so give us a follow and the next one will find you.
