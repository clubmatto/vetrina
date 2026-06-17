# VHS Demos

This directory contains [VHS](https://github.com/charmbracelet/vhs) tape files for generating GIF demos. Each subdirectory contains tapes for a specific project.

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
├── generate.sh              # Script to generate all GIFs
└── README.md                # This file
```

## Generate GIFs

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

## Themes

| Config File | Theme | Used For |
|-------------|-------|----------|
| `config.tape` | Vetrina Dark | Dark mode GIFs |
| `config-light.tape` | Vetrina Light | Light mode GIFs, README |

## Using GIFs

Generated GIFs are served directly by the website via 11ty passthrough copy. No manual copying needed.

- **Landing pages** — Uses both light and dark versions (theme-aware)
- **README** — Uses light version (GitHub has white background)

## Adding New Demos

1. Create a new `.tape` file in the project directory with demo commands only
2. Run `./generate.sh <project> <demo-name>` to generate

The script automatically discovers all `.tape` files (except `config*.tape`) — no need to register them manually.

## Adding New Projects

1. Create a subdirectory with your `.tape` files
2. If the project needs setup or teardown before/after generation, add `requirements.sh`:
   ```bash
   setup()   { ... }  # called before generation
   cleanup() { ... }  # called after generation
   ```
   Both receive the project directory path and list of demo names as arguments.
   `generate.sh` sources `requirements.sh` automatically if present.
