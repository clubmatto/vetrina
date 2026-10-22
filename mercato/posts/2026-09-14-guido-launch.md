---
title: "Guido is here: your personal race engineer"
platforms:
  - twitter
  - linkedin
  - reddit
topics:
  - guido
  - launch
  - sim-racing
---

## Twitter

### 1/5

🚀 We just released Guido: your personal race engineer for Gran Turismo 7 🚀

Not another second-screen dashboard — a co-driver. A thread on what it does 👇

### 2/5

The dashboard: a spare phone becomes a full-screen race display. 16-LED shift
lights, gear and speed at peripheral-vision size, per-tire temps, downshift
cues, assist status.

Zero setup: Guido finds your PS5 on the network by itself.

### 3/5

The engineer: Guido learns how much fuel your car actually burns per lap, and
when the tank stops covering the distance Guido says it out loud: "Box this
lap."

Hold push-to-talk to ask — fuel left? laps to go? — it answers while you
drive.

### 4/5

Private by design: telemetry stays on your network, speech recognition runs
on your device. No cloud, no ads, no analytics.

Dashboard + push-to-talk are free. Pro (paid; free in beta + 6 months after
launch) unlocks hands-free voice.

### 5/5

Our first Kotlin Multiplatform product: one codebase, Android in closed beta
today, iPhone right behind it (in App Store review now), desktop too.

Join the beta testing program: https://matto.club/products/guido/#beta-testing-program
The story: https://matto.club/writing/meet-guido/

## LinkedIn

🚀 Today we're releasing Guido: your personal race engineer 🚀

Every race driver has someone on the radio: a person who reads the telemetry
and does the math mid-race so the driver can just drive. Sim racers got
dashboards instead: numbers on a second screen you have to read while racing.
We thought the spare phone on our rigs deserved better, so we built the
co-driver we were missing.

Guido turns that phone into a live race dashboard with the usual shift lights,
gear, speed, tire temperatures, assist status. But that's just a bonus: the
core feature is that Guido is an engineer you *can* talk to:

- Guido learns how much fuel *your* car burns per lap and calls "box this lap"
  before you run dry.
- You hold push-to-talk and ask: fuel left? laps to go?
- Guido answers out loud while you keep your eyes on the track.

And everything stays home: telemetry never leaves your network, speech
recognition runs on your device, no cloud, no ads, no analytics!

The dashboard and push-to-talk are free. Hands-free voice activation is Pro:
paid, free during the beta, and free for 6 months after launch if you join now.

Guido is out today on Android as a closed beta, with the iPhone release right
behind it. It's our first Kotlin Multiplatform product: one codebase driving
all three platforms.

Want in? Join the beta testing program:
https://matto.club/products/guido/#beta-testing-program
The story: https://matto.club/writing/meet-guido/

Racers: what sim should Guido learn next? 👇

## Reddit

**TL;DR:** We built Guido, an Android app that turns a spare phone into a GT7
race dashboard *and* a voice co-driver: it learns your car's fuel burn, calls
"box this lap" before you run dry, and answers your questions over
push-to-talk while you drive. Free tier covers the dashboard and
push-to-talk. No cloud: everything runs on your network and your device.
Beta link at the bottom. We'd love *any* kind of feedback!

---

Like a lot of you, we run a second screen on the rig for GT7. And like a lot
of you, we noticed we don't really *read* it mid-race: it's distracting. You're
not going to look at a fuel number on a phone mounted next to you at 250 km/h
and do "okay, 12.4 liters, that's 9 laps at this burn rate" in your head.
Real-world drivers don't do that math either: their engineer does it and the
answer arrives on the radio.

So we built the engineer instead of just another dashboard. Guido is an Android
app (an iPhone build is in App Store review and will follow soon!) that:

**Watches the race like an engineer would.** It reads GT7's telemetry over
your local network (the Salsa20-encrypted UDP stream, decoded on-device) and
builds a model of your session: current lap, how much fuel the car actually
burned on your previous laps — learned from your driving, not a database —
and how many laps the tank will stretch to. When remaining fuel drops below
what the race distance needs, it says "Box this lap" out loud.

**Answers questions over push-to-talk.** Hold the PTT button, ask "how much
fuel do I have left?" or "how many laps to go?", get a spoken answer. Speech
recognition runs entirely on the phone: no audio leaves your device, which
also means it works with no internet. It also won't nag you: if you
just asked about fuel, it won't pipe up a lap later with the same "box this
lap" you already heard.

**Shows a dashboard built for racing.** 16-LED rev bar with shift lights,
gear and speed readout big enough for peripheral vision, per-tire temperature
gradients, red downshift cues, TCS/ABS/ASM status. Landscape, always-on, edge
to edge.

**Zero setup.** It scans your LAN until the PS5 running GT7 shows up: no IP
entry, no port forwarding. Manual override is there if you want it.

Honest bits:

- GT7 only for now, Android only for now. The iPhone build is in App Store
  review and should follow right behind. The next sim isn't decided yet:
  Le Mans Ultimate is the most likely, and the Assetto Corsa family may land
  in the same release. Guido was built with multi-sim in mind, so it's a
  matter of wiring each one in.
- Free tier: full dashboard + proactive calls + PTT, no account needed.
  There's a Pro tier — paid, but free for everyone during the beta, and free
  for 6 months after public launch if you join now — that adds hands-free
  voice activation, so you can just talk instead of reaching for a button
  mid-corner.
- No ads, no analytics, no cloud server anywhere. Telemetry stays on your
  LAN.

Join the beta testing program:
https://matto.club/products/guido/#beta-testing-program

If you try it, we want to hear the rough edges, especially from endurance
racers, since fuel strategy is the feature closest to our hearts. We'll
answer any comment you have, so ask away!
