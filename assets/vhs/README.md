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

### AI Kit

| Demo | Description |
|------|-------------|
| `basic` | One-command AI setup for any project |
| `use-case-languages` | Language detection and all-rules mode |
| `use-case-skills` | Skills and commands installation |
| `use-case-smart-updates` | Hash-based conflict detection |
| `use-case-options` | Advanced CLI options (monorepo, skip-opencode) |

## One-Off Recordings (`--tape`)

For social clips, ads, or any throwaway recording, create a self-contained
`.tape` file with all settings embedded and pass it to the generator:

```bash
go run -C tools/vhs-generate . --tape my-clip.tape
```

The generator pipes the file directly to VHS (no config split). The tape must
include its own `Output`, `Set Theme`, etc. This convention works well:

```
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

These make good short GIFs for social media. Save the tape anywhere and run
it through the generator — no project scaffolding needed.

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

## Adding a New Demo

1. Create `<demo>.tape` in the project directory with demo commands only
2. If it should also produce GIFs, add its name to `gifs.txt`
3. Run `./generate.sh <project> <demo>` (or `go run -C tools/vhs-generate . <project> <demo>`)

The script discovers all `.tape` files automatically (excluding `config*`).

## Adding a New Project

1. Create a subdirectory with your `.tape` files
2. Optionally add `requirements.sh` with `setup` / `cleanup` / `before_each` / `after_each` functions (see Lifecycle Hooks above)
3. Optionally add `gifs.txt` for GIF generation
