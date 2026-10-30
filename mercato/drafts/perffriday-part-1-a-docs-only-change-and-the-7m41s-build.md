---
title: "perfFriday, part 1: a docs-only change and the 7m41s build"
platforms:
  - twitter
  - linkedin
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

This started with something that felt silly: a docs-only change — no code
touched — still ran the full 7m41s CI build. Change a paragraph, wait for a
pipeline that behaves as if every project had changed.

So we went looking, and it turned into a journey: the build, the machine it
runs on, the way we publish, and the optimizations we refused along the way.
We're going to open it up one Friday at a time. We're calling it perfFriday.

Step one was reading the profile instead of guessing: ./gradlew --profile, one
command, zero setup. It splits the build into startup (11s), configuration (50s)
and task execution (370s). Inside the tasks: the e2e suite is 161s (44%), docker
pushes are 88s (24%), Go builds are 52s (14%), and 21 seconds go
to checking that 1,106 tasks are still up to date.

Every number had a story, and most were not the stories we expected. The e2e
suite was not flaky; it was starving for memory. The daemon was not slow;
Jenkins was killing it at the end of every step. Docs changes triggered
everything because every commit looked like a release — stamps carried HEAD,
not the project's last change. And the optimization we had designed for the
21-second slice has a hard ceiling of 21 seconds, so we wrote the number down
and didn't build it.

First installment next Friday: the tests were fine, the machine wasn't. Until
then, run ./gradlew --profile on your own build. Don't optimize anything yet.
Find out where your seven minutes are.

The setup story — why a two-person company self-hosts its CI at all:
https://github.com/clubmatto/vetrina/blob/main/mercato/posts/2026-10-02-why-we-use-jenkins-instead-of-github-actions.md
