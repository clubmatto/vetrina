---
title: "Two compilers, one -Xmx apart"
platforms:
  - twitter
  - linkedin
topics:
  - ci
  - gradle
  - how-we-work
publish_date: 2026-11-27
---

## Twitter

### 1

At one point our build had three Kotlin compiler JVMs alive at once: 3.78, 1.90 and 1.23GB of heap on an 11.9GB box. Nothing was obviously misconfigured.

### 2

A Kotlin build is not one process. Gradle runs the build in a long-lived JVM (the Gradle daemon) and the Kotlin plugin compiles in another. Both are meant to outlive the build, so the next one starts warm.

### 3

Warm only if they are reused, and reuse is decided by matching JVM arguments. Ours differed by a single `-Xmx`, so each variation started a new compiler instead of joining the one already there.

### 4

Three JVMs on a machine that also runs the tests is how a box gets crowded, and crowding is what made the OOM kills possible.

### 5

Aligning the arguments brought it back to one compiler JVM at 1.5GB.

### 6

There was a decoy too. `KOTLIN_DAEMON_JVM_OPTS` looked like the setting that bounded the compiler. Gradle never read it, so we deleted it.

### 7

Reuse is a matching problem, not a caching one. Same arguments, one JVM. Different arguments, silently another.

### 8

Next Friday: up to date is a promise you write in the build file. One measured CI fix every Friday, so follow us and catch the next one.

## LinkedIn

At one point our build had three Kotlin compiler JVMs alive at once: 3.78, 1.90 and 1.23GB of heap on an 11.9GB box. Nothing was obviously misconfigured.

A Kotlin build is not one process. Gradle runs the build in a long-lived JVM, the Gradle daemon, and the Kotlin plugin compiles in another. Both are meant to outlive the build so the next one starts warm.

They are only warm if they get reused, and reuse is decided by matching JVM arguments. Ours differed by a single `-Xmx`, so instead of joining the JVM that was already there, each variation started another.

The cost is not only memory: three JVMs on a machine that also runs the tests is how a box gets crowded, which is what made the OOM kills possible.

Aligning the arguments brought it back to one compiler JVM at 1.5GB.

There was a decoy too. `KOTLIN_DAEMON_JVM_OPTS` looked like the setting that bounded the compiler, and Gradle never read it. We deleted it.

Reuse is a matching problem, not a caching one. Same arguments, one JVM. Different arguments, silently another.

Next Friday: up to date is a promise you write in the build file. One measured CI fix every Friday, so follow us and catch the next one.
