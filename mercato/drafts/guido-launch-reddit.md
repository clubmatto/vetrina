---
title: "We built a voice race engineer for Gran Turismo 7 — a spare phone on your rig that watches your fuel and talks to you"
platform: reddit
topics:
  - guido
  - launch
  - sim-racing
---

**TL;DR:** We built Guido, an Android app that turns a spare phone into a GT7
race dashboard *and* a voice co-driver: it learns your car's fuel burn, calls
"box this lap" before you run dry, and answers your questions over
push-to-talk while you drive. Free tier covers the dashboard and PTT; no
cloud, everything runs on your network and your device. Beta link at the
bottom — we'd love feedback from people who actually race.

---

Like a lot of you, we run a second screen on the rig for GT7. And like a lot
of you, we noticed we never actually *read* it mid-race. You're not going to
look at a fuel number on a phone mounted next to you at 250 km/h and do
"okay, 12.4 liters, that's 9 laps at this burn rate" in your head. Real
drivers don't do that math either — their engineer does it and the answer
arrives on the radio.

So we built the engineer instead of another dashboard. Guido is an Android
app (an iPhone build is in App Store review right now, with a desktop app
running from the same code behind it) that:

**Watches the race like an engineer would.** It reads GT7's telemetry over
your local network (the Salsa20-encrypted UDP stream, decoded on-device) and
builds a model of your session: current lap, how much fuel the car actually
burned on your previous laps — learned from your driving, not a database —
and how many laps the tank will stretch to. When remaining fuel drops below
what the race distance needs, it says "Box this lap" out loud.

**Answers questions over push-to-talk.** Hold the PTT button, ask "how much
fuel do I have left?" or "how many laps to go?", get a spoken answer. Speech
recognition runs entirely on the phone — no audio leaves your device, which
also means it works with no internet at all. It also won't nag you: if you
just asked about fuel, it won't pipe up a lap later with the same "box this
lap" you already heard.

**Shows a dashboard built for racing.** 16-LED rev bar with shift lights,
gear and speed readout big enough for peripheral vision, per-tire temperature
gradients, red downshift cues, TCS/ABS/ASM status. Landscape, always-on, edge
to edge.

**Zero setup.** It scans your LAN until the PS5 running GT7 shows up — no IP
entry, no port forwarding. (Manual override is there if you want it.)

Honest bits:

- GT7 only for now, Android only for now. The iPhone build is in App Store
  review and should follow right behind. The next sim isn't decided yet:
  Le Mans Ultimate is the most likely, and the Assetto Corsa family may land
  in the same release — the protocol layer was built multi-sim from day one,
  so it's a matter of wiring each one in.
- Free tier: full dashboard + proactive calls + PTT, no account needed.
  There's a Pro tier (free email sign-in) that adds hands-free voice
  activation, so you can just talk instead of reaching for a button
  mid-corner.
- No ads, no analytics, no cloud server anywhere. Telemetry stays on your
  LAN.

It's on Google Play as a beta:
https://play.google.com/store/apps/details?id=club.matto.guido

If you try it, we want to hear the rough edges — especially from endurance
racers, since fuel strategy is the feature closest to our hearts. We'll be in
the comments all day.
