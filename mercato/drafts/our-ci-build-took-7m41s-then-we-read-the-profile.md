---
title: "Our CI build took 7m41s. Then we read the profile"
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

Our CI build took 7m41s, and if you had asked where the time went, the honest
answer would have been a guess.

One command changed that: ./gradlew --profile.

### 2

The report splits the build into startup 11s, configuration 50s, task
execution 370s. Inside the tasks: e2e tests 161s (44%), docker pushes 88s
(24%), Go builds 52s (14%), and 21s checking that 1,106 tasks are up to date.

### 3

Every number has a story, and most were not the stories we expected. The e2e
suite wasn't flaky — it was starving for memory. Part of the "build time" was
Jenkins killing our daemon at the end of every step.

### 4

We're going to walk through them one post at a time: one number, what it cost,
what we did about it.

If you run a Gradle build: run ./gradlew --profile today. Don't optimize
anything yet. Find out where your seven minutes are.

## LinkedIn

Our CI build took 7m41s, and for a long time that was the only number we had.
If you had asked where the time went, the honest answer would have been a
guess.

One command fixed that: ./gradlew --profile. The report splits the build into
startup (11s), configuration (50s) and task execution (370s). Inside the
tasks: the e2e suite is 161s (44%), docker pushes are 88s (24%), Go builds are
52s (14%), and 21 seconds go to checking that 1,106 tasks are still up to
date.

Reading it changed the plan. The biggest slice, the e2e suite, was not a
testing problem: it was running out of memory. The daemon was not slow —
Jenkins was killing it at the end of every step. And the optimization we had
designed for the 21-second slice can never return more than 21 seconds, so we
wrote the number down and didn't build it.

This is the first post of a series. One number at a time: what it cost, what
we did, and what we'd do differently. The setup story — why a two-person
company self-hosts its CI at all — is here:
https://github.com/clubmatto/vetrina/blob/main/mercato/posts/2026-10-02-why-we-use-jenkins-instead-of-github-actions.md

If you run a Gradle build, run ./gradlew --profile on it today. Don't optimize
anything yet. Find out where your seven minutes are.
