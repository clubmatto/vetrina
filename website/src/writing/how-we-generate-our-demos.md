---
title: How We Generate Our Demos
description: A look at our VHS-powered pipeline for producing terminal recordings
date: 2026-07-16
draft: true
tags:
  - vetrina
  - golang
---

A number of our [open source projects](/vetrina) and [products](/products) 
showcases features and use-cases via terminal demo videos. A short recording 
showing
the tool in action in both light and dark variants.

People often ask us how we generate such beautiful demos (and they're 
beautiful 💅) so we thought we'd take a bit of time to explain the process. 
It's also a good excuse to go over how we do monorepo at Club Matto before 
we have the time to properly write about that.

Generating them used to 
be a 
chore. Now 
it's a single command.

Here's how we do it.

## The tools

We use [VHS](https://github.com/charmbracelet/vhs), a terminal recorder that
takes a script file (a "tape") describing what to type and when, then produces
an MP4 or GIF. Think of it as a screencast you write in code.

Tapes look like this:

```bash
Type "fakedata email country"
Enter

Sleep 2s

Type "# Test data in seconds"
Enter

Sleep 3s
```

VHS handles the timing, the cursor, the window style (which we use on 
socials). You just write the
script.

## The config split

We have many demos across multiple projects and each demo needs to be recorded
in two themes. Hardcoding settings into every tape would be a maintenance trap.

Instead, each recording is assembled from three files at generation time:

* `config.tape`: shared base settings (font, size, padding, typing speed)
* `config-{theme}.tape`: the colour palette (dark or light)
* `<demo>.tape`: just the commands

The demo tapes are theme-agnostic. The same file produces both a dark and a
light recording. Adding a new theme means writing one config file, not touching
every demo.

## The generator

The three files are concatenated and piped to VHS by a small Go tool at
`tools/vhs-generate/`. It lives in the monorepo alongside the tapes.

It does a few useful things:

- **Parallel generation** — up to four VHS processes run concurrently, cutting
  total time significantly
- **Lifecycle hooks** — a `requirements.sh` per project can define `setup`,
  `before_each`, `after_each`, and `cleanup` functions. Needed when a demo
  requires a database or a freshly built binary
- **Selective output** — every demo produces an MP4; only demos listed in
  `gifs.txt` also produce a GIF (GIF generation is slow and we only need it for
  READMEs)

Running all demos for a project:

```bash
./generate.sh fakedata
```

Running a specific demo in light mode only:

```bash
./generate.sh -t light fakedata basic
```

## How a demo is made

Let's walk through a real example. The `fakedata basic` demo shows column
generators, named columns, and enum values.

The tape is sixteen lines:

```bash
Type "# FakeData CLI generates realistic test data with intuitive column names"
Enter

Sleep 1s

Type "fakedata email country"
Enter

Sleep 2s

Type "# You can name columns for clarity"
Enter

Sleep 1s

Type "fakedata login:email user:first_name status:enum:active,inactive"
Enter

Sleep 500ms

Type "# Test data in seconds"
Enter

Sleep 3s
```

The generator prepends `config.tape` and `config-light.tape` (or
`config-dark.tape`), adds an `Output` directive pointing to the right filename,
and sends the result to VHS. Two recordings, one tape.

Here's another example — the dry-run demo for FakeData Pro. It previews data
before inserting it into the database:

```bash
Type "# No surprises with dry-run"
Enter

Sleep 1s

Type "fakedata --dsn sqlite:pro.db -t users:5 -t products:5 -t orders:10 --dry-run"
Enter

Sleep 500ms

Type "# Confidence before insertion"
Enter

Sleep 3s
```

The `pro-dry-run` demo also needs a SQLite database with the right schema. The
`requirements.sh` script handles that: it detects when a `pro-*` demo is being
generated and seeds the database before running VHS.

## One-shot recordings

Sometimes we need a single recording for a LinkedIn post or an ad, not a full
project demo. For those cases the generator has a `--tape` flag that pipes a
self-contained tape directly to VHS — no config split, no project scaffolding.

```bash
go run -C tools/vhs-generate . --tape my-clip.tape
```

The tape must include all its settings inline. We use light theme, 30fps, and
the colourful window bar for social media clips. The flag makes it easy to
throw together a quick recording without setting up a project directory.

## Why this matters

Before we built this pipeline, making a demo was a manual process: start a
terminal, record, crop, render, repeat for each theme. It was the kind of task
you put off.

Now it's automated. Adding a new demo means writing a short tape file. The
generator handles the rest — themes, formats, lifecycle. It runs in CI, it runs
locally, and it gives us consistent, good-looking recordings across the entire
site.

If you're using VHS for your own projects, I hope this gives you some ideas.
The full source is in our
[monorepo](https://github.com/clubmatto/vetrina).
