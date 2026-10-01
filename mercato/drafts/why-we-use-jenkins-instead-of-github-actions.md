---
title: "Why we use Jenkins instead of GitHub Actions"
platforms:
  - linkedin
  - twitter
publish_date: 2026-10-02
topics:
  - clubmatto
  - how-we-work
---

## LinkedIn

People ask why a two-person company self-hosts Jenkins.

GitHub Actions choked on our Kotlin monorepo: hosted runners don't give a Gradle build the 6.5Gi of memory it wants. So we run a persistent agent on a Contabo box, behind a firewall we control, with the pipeline decoupled from Kubernetes entirely.

It is one more server to care for. We ship seven products. The trade pays for itself every day.

Check it out: https://github.com/clubmatto/vetrina

## Twitter

People ask why a two-person company self-hosts Jenkins.

Hosted runners starved our Kotlin monorepo, so a persistent agent runs on a Contabo box: 6.5Gi, our own firewall, no Kubernetes plugin.

One more server to care for. Seven products ship through it.

https://github.com/clubmatto/vetrina
