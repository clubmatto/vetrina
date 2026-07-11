# VHS Demos

This directory contains [VHS](https://github.com/charmbracelet/vhs) tape files for generating demo recordings. Each subdirectory contains tapes for a specific project.

## Prerequisites

Install VHS:

```bash
brew install vhs
```

SQLite is required for demos that use a database (`pro-*`).

## Directory Structure

```
assets/vhs/
├── config.tape              # Dark theme settings (OneDark, shared across projects)
├── config-light.tape        # Light theme settings (Catppuccin Latte, shared across projects)
├── fakedata/                # FakeData CLI demos
│   ├── *.tape               # Demo commands (theme-agnostic)
│   ├── *.tmpl               # Template files used in demos
│   ├── schema-pro.sql       # DB schema for pro demos
│   └── requirements.sh      # Prerequisites (setup/cleanup functions)
├── ai-kit/                  # AI Kit CLI demos
│   └── *.tape               # Demo commands (theme-agnostic)
├── linkedin.tape            # Reusable template for social media demos
├── generate.sh              # Script to generate all recordings
└── README.md                # This file
```

## Generate Recordings

Generates MP4s (both themes) and GIFs (both themes for demos listed in `gifs.txt`).

### All Demos (Both Themes)

```bash
./generate.sh fakedata
```

### Specific Demos

```bash
./generate.sh fakedata basic templates
```

### Single Theme

```bash
./generate.sh -t dark fakedata      # Dark theme only
./generate.sh -t light fakedata     # Light theme only
./generate.sh -t all fakedata basic # Both themes, specific demo
```

### List Available Projects

```bash
./generate.sh --list
```

## Available Demos

| Demo | Description |
|------|-------------|
| `linkedin` | Short social media demo (uses [`linkedin.tape`](linkedin.tape) template) |
| `basic` | Column names, named columns, enum values |
| `templates` | Custom Go template output |
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

## Themes

| Config File | Theme | Used For |
|-------------|-------|----------|
| `config.tape` | Vetrina Dark | Dark mode MP4s + GIFs (if listed in `gifs.txt`) |
| `config-light.tape` | Vetrina Light | Light mode MP4s + GIFs (if listed in `gifs.txt`) |

## Using Recordings

Generated files are served directly by the website via 11ty passthrough copy. No manual copying needed.

- **Landing pages** — Uses MP4 (both light and dark, theme-aware)
- **README** — Uses GIF (both light and dark, theme-aware via `<picture>` element)
- **OG image** — Uses GIF (light version, for social preview)

## Adding New Demos

1. Create a new `.tape` file in the project directory with demo commands only
2. If the demo should also produce GIFs (for README use), add its name to `gifs.txt` (one per line, `#` comments supported)
3. Run `./generate.sh <project> <demo-name>` to generate

The script automatically discovers all `.tape` files (except `config*.tape`) — no need to register them manually.

### GIF Manifest (`gifs.txt`)

Each project can have a `gifs.txt` file listing demos that should generate GIF output (both themes). Demos not in this list only produce MP4s. This avoids the expensive GIF generation for tapes that are only used on the website (which serves MP4s).

```text
# examples/gifs.txt
basic          # referenced in README
custom-output  # referenced in README
streaming      # (not currently used but GIF-ready)
```

## Adding New Projects

1. Create a subdirectory with your `.tape` files
2. If the project needs setup or teardown before/after generation, add `requirements.sh`:
   ```bash
   setup()   { ... }  # called before generation
   cleanup() { ... }  # called after generation
   ```
   Both receive the project directory path and list of demo names as arguments.
   `generate.sh` sources `requirements.sh` automatically if present.
