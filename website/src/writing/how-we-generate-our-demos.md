---
title: How we generate our demos
description: A quick look at our VHS-powered pipeline for producing terminal
  recordings
date: 2026-07-21
tags:
  - vetrina
  - golang
image: /assets/writing/demo-light.gif
image_width: 1300
image_height: 650
---

A number of our [open source projects](/vetrina) and [products](/products)
showcases features via short terminal demo videos.

People often ask us how we generate such beautiful demos 💅 so we thought we'd
take a bit of time to explain the process.

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

You run it with `vhs demo.tape` and the result looks like this:

<div class="ds-terminal__gif">
  <img class="theme-light" src="/assets/writing/demo-light.gif" alt="VHS demo recording (light theme)" />
  <img class="theme-dark" src="/assets/writing/demo-dark.gif" alt="VHS demo recording (dark theme)" />
</div>

Try switching themes to see the difference:

<button class="ds-btn ds-btn-outline" onclick="toggleDemoTheme()" style="width: auto; display: inline-block; margin: 0 0 var(--ds-space-8) 0;">
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

Club Matto ships many projects and each requires many demos that we ship
both in light and dark mode, which is kind of a standard nowadays (even GitHub
READMEs support it!).

We also crafted a specific look and feel for such demos and this requires
lots of custom configuration like fonts, default speeds, colors. Moreover,
this looks and feel needs to be consistent across all demos.

Fortunately, VHS can source other tapes so each recording is assembled from
three files at generation time:

- `config.tape`: shared base settings (font, size, padding, typing speed).
- `config-{theme}.tape`: the light/dark colour palette.
- `<demo>.tape`: the actual demo.

This allows us to add new demos by focusing only on the content, it's a
productive setup. In the first iterations, we had a bash
script to glue everything together but, as it often happens, the script
soon stopped scaling.

## VHS generate tool

[Vetrina](https://github.com/clubmatto/vetrina) is a monorepo and a core
advantage of monorepos is that they allow you to build tooling around
your workflow in a very productive manner. So when regenerating all our demos
was taking too long and iterating over our demo setup became too painful, we
rewrote the script in Go.

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
go run tools/vhs-generate/main.go fakedata
```

Running a specific demo in light mode only:

```bash
go run tools/vhs-generate/main.go -t light fakedata basic
```

If you'd like to use our generate tool, please reach out and we'll package
it as a small, installable CLI.
