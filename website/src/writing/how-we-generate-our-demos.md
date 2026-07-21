---
title: How We Generate Our Demos
description: A quick look at our VHS-powered pipeline for producing terminal 
  recordings
date: 2026-07-21
draft: true
tags:
  - vetrina
  - golang
image: /assets/writing/demo-light.gif
image_width: 1300
image_height: 650
---

A number of our [open source projects](/vetrina) and [products](/products)
showcases features and use-cases via terminal demo videos. A short recording
showing
the tool in action in both light and dark variants.

People often ask us how we generate such beautiful demos 💅 so we thought we'd
take a bit of time to explain the process.
It's also a good excuse to go over how we do monorepo at Club Matto before
we have the time to properly write about that.

## The tooling

We use [VHS](https://github.com/charmbracelet/vhs), a small terminal recorder
written in Go by the amazing [charm.sh](https://charm.sh) team. VHS takes a
script file (a "tape") describing what to type and when, then produces
an MP4 or GIF.

Think of it as a screencast you write with code. A tape looks like this:

```bash
Type "echo 'VHS is cool'"
Enter

Sleep 2s
```

and you run it like this:

```bash
vhs demo.tape
```

and get this:

<div class="ds-terminal__gif">
  <img class="theme-light" src="/assets/writing/demo-light.gif" alt="VHS demo recording (light theme)" />
  <img class="theme-dark" src="/assets/writing/demo-dark.gif" alt="VHS demo recording (dark theme)" />
</div>

Try switching themes to see the difference:

<button class="ds-btn ds-btn-outline" onclick="toggleDemoTheme()" style="width: auto; display: inline-block; margin: 0;">
Toggle theme</button>

<script>
function toggleDemoTheme() {
  const current = localStorage.getItem('theme') || 'system';
  const next = current === 'light' ? 'dark' : 'light';
  const resolved = next === 'dark' ? 'dark' : 'light';
  localStorage.setItem('theme', next);
  document.documentElement.style.setProperty('color-scheme', resolved);
  document.documentElement.setAttribute('data-color-scheme', resolved);
}
</script>

VHS can handle typing speed, color schemes, windows styles, and much more.
It's a lovely little tool!

## Real world demos

We have many demos across multiple projects and each demo needs to be recorded
in two themes (because light/dark mode is kind of a standard nowadays isn't
it?). So as you can imagive we've got lots of configuration like fonts,
default speeds, colors.

Fortunately, VHS can source other tapes so each recording is assembled from
three files at generation time:

* `config.tape`: shared base settings (font, size, padding, typing speed).
* `config-{theme}.tape`: the light/dark colour palette.
* `<demo>.tape`: just the commands.

This approach allows us to add new demos by focusing only on the demo
content, it's a productive setup. In the first iteration, we had a bash
script to glue everything together but, as it often happens, we kept adding
demos and the script stopped scaling.

## VHS generate tool

[Vetrina](https://github.com/clubmatto/vetrina) is a monorepo and one of the
main advantages of monorepos is that they allow you to build tooling around
your workflow in a very productive manner. So when we started realising our
bash script was becoming painful, mainly because regenerating all our demos
was taking too long, we rewrote the script in Go.

VHS generate does a few useful things:

- **Parallel generation** — up to four VHS processes run concurrently, cutting
  total time significantly.
- **Lifecycle hooks** — a `requirements.sh` per project can define `setup`,
  `before_each`, `after_each`, and `cleanup` functions. Needed when a demo
  requires a database or a freshly built binary.
- **Selective output** — every demo produces an MP4 for web use; only demos
  listed in a `gifs.txt` manifesto also produce a GIF (which we use in
  readmes and preview links).
- **One-shot recordings** — the `--tape` flag pipes a self-contained tape
  directly to VHS with no project directory needed. Useful for social media
  posts.

Running all demos for a project:

```bash
./generate.sh fakedata
```

Running a specific demo in light mode only:

```bash
./generate.sh -t light fakedata basic
```

The current bash script is just a wrapper around `go run`.

If you'd like to use our generate tool, please reach out and we'll package
it as a small, installable CLI.
