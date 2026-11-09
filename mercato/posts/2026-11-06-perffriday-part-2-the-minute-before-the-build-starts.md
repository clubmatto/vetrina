---
title: "perfFriday, part 2: the minute before the build starts"
platforms:
  - twitter
  - linkedin
topics:
  - ci
  - gradle
  - how-we-work
image: https://github.com/clubmatto/vetrina/blob/main/website/src/assets/writing/perffriday-build-distribution.png
---

## Twitter

### 1

A no-brainer change gave us back 88% of the wait before a build does anything. Turned out the daemon we thought was helping was never being reused. One environment variable fixed that.

### 2

Last week we opened the series by running `./gradlew --profile` on a docs-only change that still took 7m41s. One thing immediately caught our eye: 11 seconds of startup and 50 seconds of configuration, before a single task ran.

### 3

A minute of nothing. Our experience made us smell a cheap win rather than a hard problem, and we weren't wrong.

### 4

Gradle runs your build inside a daemon: a long-lived JVM that keeps the classloader, the plugins and the configuration warm, so the next build does not pay for any of it again. That is why it exists. Ours never survived long enough to help.

### 5

The root cause was Jenkins, which kills the process tree it started when a step ends. Six seconds after our daemon went idle it got a SIGTERM, and the next build began from cold.

### 6

The dead daemons then sat there forever, unused but eating memory. 184 logs, zero clean shutdowns, every one `exit(143)`.

### 7

The fix is one variable. `JENKINS_NODE_COOKIE=dontKillMe` tells Jenkins to leave the daemon alone. Same 538 tasks, same 14 executed: 1m54 became 13s, then 13 again on the next build.

### 8

This was the first, easy step. Next week we take the difficulty up a notch. Stay tuned, and if you like where this is going, follow us.

## LinkedIn

A no-brainer change gave us back 88% of the wait before a build does anything. It cost one environment variable, and it exists because a daemon we thought was helping was never being reused.

Last week we opened this series by running `./gradlew --profile` on a docs-only change that still took 7m41s. One thing immediately caught our eye: 11 seconds of startup and 50 seconds of configuration, before a single task ran.

A minute of nothing. Our experience made us smell a cheap win rather than a hard problem, and we weren't wrong.

Gradle runs your build inside a daemon: a long-lived JVM that keeps the classloader, the plugins and the configuration warm, so the next build does not pay for any of it again. That is the entire reason it exists. Ours never survived long enough to help though.

The root cause was Jenkins, which kills the process tree it started when a pipeline step ends. Six seconds after our daemon went idle it received a SIGTERM, and the next build began from cold and paid the whole setup cost over again. Not only that, but the old daemons would sit there forever, unused but eating up precious memory.

The fix is one variable. `JENKINS_NODE_COOKIE=dontKillMe` tells Jenkins to leave the daemon alone. Same 538 tasks, same 14 executed: 1m54 became 13 seconds, then 13 again on the next build.

This was the first, easy step. Next week we'll take the difficulty up a notch. Stay tuned, and if you like where this is going, feel free to follow us.
