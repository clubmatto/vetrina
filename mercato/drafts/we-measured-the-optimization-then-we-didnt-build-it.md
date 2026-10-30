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

Our CI build was one number: 7m41s. The profile splits it: 44% e2e tests,
24% docker pushes, 14% Go builds, and 6% — 21 seconds — spent checking that
1,106 tasks are up to date.

### 2

We had an idea for that 6%: a gate that prunes tasks before Gradle gets
there. Do the arithmetic first: a change can never return more than the share
of time it touches. Perfect execution buys 21 seconds on a 7m41s build.

### 3

We wrote the number down and didn't build it.

That's the rule worth stealing: compute the ceiling before the code. A no with
a number attached is an asset — when the idea comes back, nobody re-litigates
it.

## LinkedIn

Until last week our CI build was one number: 7m41s. Then we read the profile,
and it stopped being one number. 44% is the end-to-end suite, 24% is docker
pushes, 14% is Go builds, and 6% — 21 seconds — is Gradle checking that 1,106
tasks are up to date.

We had an idea for that 6%: a gate that prunes tasks before Gradle gets there.
Before building it we did the arithmetic every optimization makes possible: a
change can never return more than the share of time it touches. This one
touches 6%. Flawless execution takes the build from 7m41 to 7m20.

So we wrote the number down and didn't build it.

That's the part worth stealing: compute the ceiling before the code. Most
optimization ideas die in code review; these can die in arithmetic, which is
cheaper. And a no with a number attached is an asset — when the idea comes
back in six months, nobody re-litigates it.

The 21 seconds are still there. The minutes we recovered that week came from
elsewhere in the same profile.
