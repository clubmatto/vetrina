---
title: "The OOM kill dressed like a test failure"
platforms:
  - twitter
  - linkedin
topics:
  - ci
  - gradle
  - we-measured
image: https://github.com/clubmatto/vetrina/blob/main/website/src/assets/writing/perffriday-oom-kill.png
publish_date: 2026-11-20
---

## Twitter

### 1

A test that fails in CI and passes locally looks flaky. Ours was an out-of-memory kill.

### 2

Five failures across 13.9 minutes, none reproducible on our laptops. The worker had 978MB free on a 12GB machine, against the 6GB the suite expected.

### 3

Memory was one problem here, and we will come back to it. The other one was the failure mode: the build died, the Jenkins agent died with it, and the controller sat waiting for an agent that was never coming back.

### 4

The build stalled for a long time, then failed anyway.

### 5

One part of the fix is a memory budget. Easy to set, harder to place, because the number describes the machine, not the project.

### 6

In the repo's `gradle.properties` it would leak one worker's limits onto every laptop. So we split it: the repo declares a floor that holds for everyone, and the CI agent writes the real budget into the machine's `~/.gradle/gradle.properties`.

### 7

Same suite, no test edited: 6,025MB peak, 41 passing, 2.6 minutes, zero OOM kills.

### 8

The other part was the policy. `OOMPolicy` was `kill`, so a dying Gradle process took the Jenkins agent that spawned it with it.

### 9

It is `continue` now, with `MemoryHigh` at 9G and `MemoryMax` at 10G on that same 12GB machine. Pressure slows a build before it kills one, and a build that overshoots dies while the agent keeps running.

### 10

Next Friday: two compilers, one `-Xmx` apart. One measured CI fix every Friday, so follow us and catch the next one.

## LinkedIn

A test that fails in CI and passes locally looks flaky. Ours was an out-of-memory kill.

Five failures in 13.9 minutes, none reproducible locally. The worker had 978MB free on a 12GB machine, against the 6GB the suite expected. Memory was a problem in itself, and we will come back to it. The bigger issue was how the build failed.

The kernel has to kill something, but how it does so depends on the policies around it. Here the build died and the Jenkins agent died with it, leaving the controller waiting for an agent that was never coming back. The build stalled for a long time and then failed anyway.

One part of the solution is a memory budget. Easy on paper, but deciding where the declaration belongs is the work, because the number describes the machine, not the project. Put it in the repo and one worker's limits leak onto every laptop. So we split it: the repo declares a floor that holds for everyone, and the CI agent writes the real budget into the machine's `~/.gradle/gradle.properties`.

Same suite, no test edited: 6,025MB peak, 41 passing, 2.6 minutes, zero OOM kills.

The other part was the policy. `OOMPolicy` was `kill`, so a dying Gradle process took the Jenkins agent that spawned it with it. It is `continue` now, with `MemoryHigh` at 9G and `MemoryMax` at 10G on that same 12GB machine. Pressure slows a build before it kills one, and a build that overshoots dies while the agent keeps running.

Next Friday: two compilers, one `-Xmx` apart. One measured CI fix every Friday, so follow us and catch the next one.
