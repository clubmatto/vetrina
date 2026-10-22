---
title: "How we generate our demos — VHS-powered terminal recordings"
platforms:
  - twitter
  - linkedin
topics:
  - vetrina
  - vhs
  - open-source
---

## Twitter

We wrote about our demo pipeline: VHS tapes + a Go tool that runs them in
parallel, handles light/dark themes, and more.

https://matto.club/writing/how-we-generate-our-demos/

## LinkedIn

We just published a blog post about how we produce our terminal demo recordings.

We use VHS by charm.sh, a tool that turns a script into a screencast. Think of
it as a code-defined video recorder.

The setup evolved from a fragile bash script into a small Go tool that runs
recordings in parallel, handles lifecycle hooks (databases, fresh builds), and
supports light/dark theme variants.

The post covers our full pipeline, including the config structure and the
generate tool we built.

Read it here: https://matto.club/writing/how-we-generate-our-demos/
