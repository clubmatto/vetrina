---
title: "Meet Guido, your personal race engineer"
description: "We're launching Guido: the spare phone on your sim rig becomes a
  live race dashboard and a voice co-driver for Gran Turismo 7. Local, private,
  zero setup."
date: 2026-09-09
draft: true
tags:
  - guido
  - launch
  - sim-racing
image: /assets/writing/meet-guido.png
image_width: 1200
image_height: 1200
---

Every real race driver has someone on the radio. A race engineer reads the
telemetry, does the mental math mid-race, and tells the driver what matters
when it matters: fuel, tyres, gaps, strategy. The driver drives; the engineer
talks.

Sim racers have dashboards instead. Gran Turismo 7 happily streams its live
telemetry over the network, and a healthy ecosystem of second-screen apps will
render it on a phone next to your wheel. We used several of them, and we kept
running into the same gap: they show you numbers, but a number only helps if
you look at it, at the right moment, and do the math in your head. At 250 km/h,
that's a tall order.

So we built the thing we actually wanted: not another dashboard, but a
co-driver. Today we're releasing him. His name is
[Guido](/products/guido/).

## A dashboard you don't have to read

Guido turns a spare phone or tablet into a full-screen, landscape race
dashboard for [Gran Turismo 7](https://www.gran-turismo.com/): a 16-LED rev bar
with shift lights, a gear and speed readout big enough to parse with peripheral
vision, per-tire temperature gradients, red downshift cues beside the gear
indicator, and the live status of your assists. It finds your PS5 on the
network by itself — no IP addresses, no port forwarding — and stays in
landscape, always-on, for as long as the race lasts.

That part we're confident is already useful. But it's the half of the product
we care about less.

## The engineer in your ear

Guido watches the race the way an engineer would. As the telemetry streams in,
he builds a model of your session: which lap you're on, how much fuel the car
actually burns per lap — learned from your driving, not a lookup table — and
how many laps the tank will stretch to. When the math stops working in your
favor, he speaks up: _"Box this lap."_

It goes both ways, too. Hold the push-to-talk button and ask. How much fuel is
left? How many laps to go? What's the advice? Guido answers out loud, in
natural sentences, while your hands stay on the wheel. He's also polite about
it: if you just asked about fuel, he won't interrupt you a lap later to say
the thing you already know.

The part we're proudest of: none of that leaves your Wi-Fi. The speech
recognition runs on your device, the telemetry runs on your network, and there
is no cloud in the middle. Your races belong to you.

## Under the hood

Guido is our first Kotlin Multiplatform product: one codebase, written in
Kotlin with Compose, driving the Android app we're launching today, the
iPhone build currently going through the App Store, and a desktop app running
from the same code. GT7's Salsa20-encrypted UDP
telemetry protocol is decoded in its own module, and a little desktop studio we
built for development records real race sessions and replays them frame by
frame — it's how we test without a PS5 idling in the office, and, in a fun
recursion, how we render our own store screenshots from the real app UI.

## Free and Pro

The dashboard and push-to-talk questions are free, no account needed. Signing
in with an email unlocks Pro, which adds hands-free voice activation — you
just talk to Guido instead of reaching for a button, which mid-corner is most
of the point.

## What's next

Guido speaks GT7 today, and he's not staying monolingual for long: Le Mans
Ultimate is the most likely next stop, quite possibly with the Assetto Corsa
family in the same release, and more sims queued up behind those. The
engineer keeps learning too: tyre and shift
intelligence, richer race strategy, more questions he can answer. The
[product page](/products/guido/) stays current as that lands.

The beta is live on Google Play. If you race, give Guido a seat on your rig
and tell us what he should learn next — we read everything at
[hello@matto.club](mailto:hello@matto.club).
