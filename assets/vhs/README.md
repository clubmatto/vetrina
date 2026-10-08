# VHS Demos

This directory contains [VHS](https://github.com/charmbracelet/vhs) tape files and a
Go generator tool for producing terminal demo recordings (MP4 + optional GIF) for
the Club Matto website and READMEs.

Each subdirectory is a **project** (e.g., `fakedata`, `ai-kit`). Each `.tape` file
inside is a **demo** — a sequence of terminal commands and output to record.

## Quick Start

The generator is a Go tool at `tools/vhs-generate/`. You can invoke it directly,
or use the `generate.sh` compat wrapper for convenience:

```bash
# Generate all demos for a project (both dark and light themes)
go run -C tools/vhs-generate . fakedata
./generate.sh fakedata              # equivalent

# Generate specific demos only
./generate.sh fakedata basic custom-output

# Generate for a single theme
./generate.sh -t light fakedata

# List available projects
./generate.sh --list

# One-shot a self-contained tape (no config split)
./generate.sh --tape my-clip.tape
```

Output files (MP4s, GIFs) are written into the project directory alongside the tapes.

## Prerequisites

- [VHS](https://github.com/charmbracelet/vhs) — install via `brew install vhs`
- SQLite (only needed for `pro-*` demos that use a database)
- Docker (only needed for the `db-diff` demos, which start one container per engine)

VHS checks the `ttyd` version before recording and rejects a version string it cannot parse.
Homebrew's build currently reports `1.7.7-unknown`, which it reads as `<nil>`, so a wrapper that
answers `ttyd --version` with a plain `1.7.x` and delegates everything else to the real binary is
enough to get past it.

## How Tapes Work

Each recording is assembled from three files concatenated at generation time:

1. **`config.tape`** — shared base settings (font, size, padding, typing speed)
2. **`config-{theme}.tape`** — theme colors (dark or light)
3. **`<demo>.tape`** — the demo commands

This keeps the demo tapes theme-agnostic. The same `.tape` file produces both a
dark and a light version.

## Directory Structure

```
assets/vhs/
├── config.tape                  # Base settings (shared across projects)
├── config-dark.tape             # Dark theme colors
├── config-light.tape            # Light theme colors
├── generate.sh                  # Compat wrapper (delegates to Go tool)
├── fakedata/                    # FakeData CLI demos
│   ├── basic.tape               # Demo commands (theme-agnostic)
│   ├── formats.tape
│   ├── streaming.tape
│   ├── ...
│   ├── gifs.txt                 # Demos that also produce GIFs
│   ├── requirements.sh          # Setup/cleanup lifecycle hooks
│   ├── schema-pro.sql           # DB schema for pro demos
│   └── *.tmpl                   # Template files used in demos
├── db-diff/                     # DB Diff demos, one per engine
│   ├── basic-postgres.tape      # Demo commands (theme-agnostic)
│   ├── basic-mysql.tape
│   ├── basic-clickhouse.tape
│   ├── include-exclude.tape
│   ├── cross-engine.tape
│   ├── gifs.txt
│   ├── requirements.sh          # Starts a container per engine, seeds src and dst
│   └── seed-*.sql               # Schema and rows, one file per engine
├── ai-kit/                      # AI Kit CLI demos
│   ├── basic.tape
│   ├── ...
│   ├── gifs.txt
│   └── requirements.sh
└── README.md
```

## Generator (`tools/vhs-generate/`)

Written in Go (stdlib only). Run via `go run -C tools/vhs-generate .` or the
`generate.sh` compat wrapper. Demos run in parallel across projects (up to 4
concurrent VHS processes).

```
Usage: go run -C tools/vhs-generate . [OPTIONS] <PROJECT> [DEMO...]

Arguments:
  PROJECT     Project directory (e.g., fakedata)

Options:
  -t, --theme THEME    Generate only for theme: dark, light, or all (default: all)
  -l, --list           List available projects
      --tape FILE      One-shot: pipe a self-contained tape directly to VHS
  -h, --help           Show this help

Examples:
  go run -C tools/vhs-generate . fakedata               # All demos, both themes
  go run -C tools/vhs-generate . -t light fakedata      # Light theme only
  go run -C tools/vhs-generate . fakedata basic         # Specific demo, both themes
  go run -C tools/vhs-generate . --tape my-clip.tape    # One-shot recording
```

### What Gets Generated

- **MP4** — every demo, every theme
- **GIF** — only demos listed in the project's `gifs.txt`, both themes

### Lifecycle Hooks

If a project directory contains `requirements.sh`, the generator sources it and
calls these optional functions via `bash -c`:

| Function | When Called | Purpose |
|----------|-------------|---------|
| `setup` | Before any tapes are generated | Build CLIs, create temp dirs, seed databases |
| `before_each` | Before each individual demo | Per-demo setup (create project scaffold) |
| `after_each` | After each individual demo | Per-demo teardown |
| `cleanup` | After all tapes are generated | Remove temp files, databases |

All hooks receive `(project_dir, demo_names...)`. `before_each` and `after_each`
also receive the current `theme` as a third argument.

## Available Demos

### FakeData

| Demo | Description |
|------|-------------|
| `basic` | Column names, named columns, enum values |
| `custom-output` | Custom Go template output |
| `streaming` | Infinite data stream for load testing |
| `formats` | TSV, CSV, NDJSON output formats |
| `use-case-testing` | CSV export, seeds, reproducible data |
| `use-case-load-testing` | High-volume streaming demo |
| `use-case-development` | API mock data generation |
| `pro-generate` | DB-native generation with FK resolution |
| `pro-dry-run` | Preview generators and schema before insert |
| `pro-override` | Column-level generator overrides with `-c` |

### DB Diff

| Demo | Description |
|------|-------------|
| `basic-postgres` | 100k rows, a matching table, and the rows that drifted |
| `basic-mysql` | The same comparison against MySQL |
| `basic-clickhouse` | The same comparison against ClickHouse |
| `include-exclude` | Excluding the changed column narrows the result |
| `cross-engine` | A cross engine pair is refused before it connects |

`requirements.sh` starts one container per engine, creates `src` and `dst` in each, and seeds
both with 100,000 rows in `orders` and 100,000 in `line_items`. `orders` stays identical on both
sides so a demo can show the matching path; `line_items` drifts on `dst` (one row changed, one
removed, one added).

Seeded timestamps are fixed literals rather than `now()`. The two databases are seeded by
separate client runs, so a `now()` default differs between them and every row compares as
drifted, which is exactly the false signal the demo is supposed to rule out.

The build goes to `/tmp/db-diff-demo/bin`, and the DSNs plus a client per engine go to
`/tmp/db-diff-demo/env.sh`, which every tape sources.

### AI Kit

| Demo | Description |
|------|-------------|
| `basic` | One-command AI setup for any project |
| `use-case-languages` | Language detection and all-rules mode |
| `use-case-skills` | Skills and commands installation |
| `use-case-smart-updates` | Hash-based conflict detection |
| `use-case-options` | Advanced CLI options (monorepo, skip-opencode) |
| `use-case-writing` | Writing rule installed in every project |

## One-Off Recordings (`--tape`)

For social clips, ads, or any throwaway recording, create a self-contained
`.tape` file with all settings embedded and pass it to the generator:

```bash
# Use an absolute path to the tape file
go run -C tools/vhs-generate . --tape /path/to/my-clip.tape
```

The generator pipes the file directly to VHS (no config split, no theme
duplication — produces exactly one file). The tape must include `Output`,
`Set Theme`, and all other settings:

```
Output my-clip.gif
Set FontFamily "JetBrainsMono Nerd Font"
Set FontSize 22
Set Width 1300
Set Height 650
Set Padding 10
Set TypingSpeed 50ms
Set Theme {"name":"Vetrina Light",...}
Set Framerate 30
Set WindowBar Colorful

Sleep 1s
Type "your-command --here"
Enter
Sleep 2s

Type "# closing message"
Enter
Sleep 1s
```

The file extension in `Output` determines the format (`.gif`, `.mp4`, etc.).
These make good short GIFs for social media. Save the tape anywhere and run
it through the generator — no project scaffolding needed.

## LinkedIn / Social Clips

For social announcements (LinkedIn, Twitter), record a one-off GIF — **do not**
add the demo to the project's `gifs.txt` or generate MP4s. Project demos serve
the website and READMEs; social clips are throwaway.

1. Create a self-contained tape at `assets/vhs/<clip>.tape` with all settings
   embedded (see One-Off Recordings above) and `Output <clip>-light.gif`.
   Use the light theme — it's what social previews show.
2. Keep it short, roughly **half** of a project demo: ~10 seconds. Trim `Sleep`
   pauses and speed up typing with `Set TypingSpeed 20ms`.
3. Generate it with an absolute path:
   `./generate.sh --tape /Users/.../assets/vhs/<clip>.tape`
4. Reference the resulting GIF in the post.

Existing example: `assets/vhs/pro-clickhouse.tape`, `assets/vhs/distinct.tape`.

## GIF Manifest (`gifs.txt`)

Each project can have a `gifs.txt` listing demos that should also produce GIF
output (both themes). Demos not in the list produce MP4 only — avoiding the
slow GIF generation for website-only use.

```
# fakedata/gifs.txt
basic          # referenced in README
custom-output  # referenced in README
```

## How Recordings Are Used

- **Landing pages** — MP4 (light/dark via `prefers-color-scheme`)
- **READMEs** — GIF (light/dark via `<picture>` element)
- **OG images** — GIF (light version for social preview)

Generated files live alongside the tapes in the project directory. The website
serves them via Eleventy passthrough copy — no manual copying needed.

## Writing a Demo

A demo tape carries the story, not the settings. The generator concatenates
`config.tape`, then `config-{theme}.tape`, then your `<demo>.tape`, so font, size,
padding, theme and the 50ms base typing speed come from the shared files. A tape
that repeats them goes stale the next time the shared files change.

Two directives do belong in a tape:

- **`Set TypingSpeed`** — pacing. Narration and short commands inherit the 50ms
  default so they can be read; a long command that is unreadable while it types
  drops to `5ms` and is restored to `50ms` immediately after. `fakedata/pro-generate.tape`
  is the shape to copy.
- **`Wait+Screen`** — prefer it to a fixed `Sleep` whenever the command prints
  something you can wait for, so a slow run does not show a half-drawn result and
  a fast one does not leave dead air:

  ```
  Type "db-diff --source=$PG_SRC --target=$PG_DST --table=orders"
  Enter

  Wait+Screen@60s /no differences/

  Set TypingSpeed 50ms
  ```

### The shell prompt is not pinned

Recordings inherit whatever prompt the shell has when the generator runs. Nothing
in this repository sets it, so a recording made from an interactive shell shows
that shell's prompt, and one made from a script, a container or a sandbox shows
the shell's default.

This is not hypothetical. The db-diff demos were once regenerated from a bare
bash and shipped with `bash-5.3$` in every frame, while every other project showed
the interactive prompt. It is visible in the first second of a recording and
nowhere else, which is exactly the kind of difference that survives review.

So run the generator from your interactive shell, and look at the first frame of
a new recording before committing it.

## Adding a New Demo

1. Create `<demo>.tape` in the project directory with demo commands only — see
   Writing a Demo above for the two directives that are the exception
2. If it should also produce GIFs, add its name to `gifs.txt`
3. Run `./generate.sh <project> <demo>` (or `go run -C tools/vhs-generate . <project> <demo>`)
4. Check the first frame for the prompt, and that the pacing reads well

The script discovers all `.tape` files automatically (excluding `config*`).

## Adding a New Project

1. Create a subdirectory with your `.tape` files
2. Optionally add `requirements.sh` with `setup` / `cleanup` / `before_each` / `after_each` functions (see Lifecycle Hooks above)
3. Optionally add `gifs.txt` for GIF generation
