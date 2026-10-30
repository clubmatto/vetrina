---
title: "perfFriday, part 1: a docs-only change and the 7m41s build"
platforms:
  - twitter
  - linkedin
image: https://github.com/clubmatto/vetrina/blob/main/website/src/assets/writing/perffriday-docs-only-change.png
publish_date: 2026-10-30
topics:
  - ci
  - gradle
  - how-we-work
---

## Twitter

### 1

A few weeks ago, something a bit silly started annoying us: a docs-only
change to our private monorepo still ran the full 7m41s CI build.

So we had to look into it and learned a lot of things on this journey.

### 2

Now we want to bring you on the journey with us. Meet perfFriday: a short
series we'll run every Friday on CI optimizations 🤓.

### 3

First move: ./gradlew --profile. One command, and the build tells you where
the time goes: startup 11s, configuration 50s, task execution 370s.

Inside the tasks: e2e tests 161s (44%), docker pushes 88s (24%), Go builds
52s (14%), 21s checking 1,106 tasks are up to date.

### 4

Every number had a story. Most weren't expected.

The e2e suite wasn't flaky: it was starving for memory. The daemon wasn't
slow: Jenkins killed it after every step. And docs changes? Every commit
looked like a release!

### 5

First installment next Friday: the tests were fine, the machine wasn't. The
e2e suite, the memory, and the daemons.

Until then: run ./gradlew --profile on your build. Don't optimize anything
yet. Find out where your seven minutes are.

#perfFriday

## LinkedIn

A few weeks ago, something a bit silly started annoying us: a docs-only
change to our private monorepo still ran the full 7m41s CI build. Change a
paragraph, wait for a pipeline that behaves as if every project had changed.

So we had to look into it, and it became a journey: the build, the machine it
runs on, the way we publish, and the optimizations we refused along the way.
Now we want to bring you on the journey with us. Meet perfFriday: a short
series we'll run every Friday on CI optimizations.

First move: ./gradlew --profile. One command, and the build tells you where
the time goes: startup 11s, configuration 50s, task execution 370s. Inside
the tasks: e2e tests 161s (44%), docker pushes 88s (24%), Go builds 52s
(14%), 21s checking that 1,106 tasks are up to date.

Every number had a story. Most weren't expected. The e2e suite wasn't flaky:
it was starving for memory. The daemon wasn't slow: Jenkins killed it after
every step. And docs changes? Every commit looked like a release — stamps
carried HEAD, not the project's last change.

First installment next Friday: the tests were fine, the machine wasn't. Until
then: run ./gradlew --profile on your build. Don't optimize anything yet.
Find out where your seven minutes are.

The setup story — why a two-person company self-hosts its CI at all:
https://github.com/clubmatto/vetrina/blob/main/mercato/posts/2026-10-02-why-we-use-jenkins-instead-of-github-actions.md
