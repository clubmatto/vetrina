---
title: "We measured the optimization. Then we didn't build it."
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

Our CI build takes 7m41s. Before optimizing anything we read the profile:
e2e tests 44%, docker pushes 24%, Go builds 14%, and 6% — 21 seconds — is
Gradle checking that 1,106 tasks are up to date.

### 2

We had an optimization ready for that 6%: a gate that prunes tasks before
Gradle gets there. It was a good idea with a ceiling: at best it recovers
those 21 seconds on a build that is 44% end-to-end tests.

### 3

We wrote it down and dropped it.

Measuring first doesn't always tell you what to build. Sometimes it tells you
what not to build, and that's the cheaper answer.

## LinkedIn

We almost optimized our CI build last week. We measured first, and the
measurement said no.

The build takes 7m41s. The profile says where the time goes: 44% is the
end-to-end suite, 24% is docker pushes, 14% is Go builds, and 6% — 21 seconds —
is Gradle checking that 1,106 tasks are up to date.

We had an idea for that 6%: a gate that decides which tasks need running
before Gradle gets there. It was a good idea. It also had a ceiling: at best it
recovers those 21 seconds plus part of the configuration, on a build that is
44% end-to-end tests.

So we wrote it down and dropped it.

The instinct to optimize is fine. The expensive version of it is optimizing
before you know where the time actually goes. Sometimes the most valuable
output of a measurement is a no.
