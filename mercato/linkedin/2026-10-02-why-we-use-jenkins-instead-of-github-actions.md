---
title: "Why we use Jenkins instead of GitHub Actions"
platform: linkedin
image: https://github.com/clubmatto/vetrina/blob/main/website/src/assets/writing/why-we-use-jenkins-instead-of-github-actions.png
topics:
    - clubmatto
    - how-we-work
---

People ask why a two-person company self-hosts its CI.

Our monorepo builds with Gradle, and Gradle performs best with a warm build cache and a persistent daemon. Hosted
runners give you neither. They are ephemeral, so every job starts on an empty machine: the daemon boots cold and the
cache is empty. You can persist a cache between runs, but you pay to upload it when the job ends and download it when
the next one starts, so part of what you saved goes back out in transfer time.

Add runner startup, daemon boot and cache bookkeeping together and we were spending a lot of time on every build on
things that had nothing to do with our code.

A persistent agent has none of that overhead: the daemon is already running, the cache is already on
disk, and there is no runner to start. The cherry on top: the cache is backed up in an R2 bucket, so intermediate
artifacts are shared between us and local builds start warm too.

Only one honest downside: the hosted runners were more stable when memory-constrained. In our first Jenkins setup,
hitting the memory limit would result in the agent being OOM killed. In contrast, hosted runners being memory-hungry
meant simply a slower build. The solution though was to be more explicit about the memory caps for each toolchain and
process, and the problem disappeared.

Once ported, the build got much faster. It is one more server to care for, but it pays for itself every day.

If you need help with your CI/CD setup and like our approach, we're always happy to talk:
https://matto.club/contact/

