# VHS Demos

This directory contains [VHS](https://github.com/charmbracelet/vhs) tape files for generating GIF demos. Each subdirectory contains tapes for a specific project.

## Prerequisites

Install VHS:

```bash
brew install vhs
```

## Directory Structure

```
assets/vhs/
├── fakedata/              # FakeData CLI demos
│   ├── *.tape             # Demo commands (theme-agnostic)
│   ├── config.tape        # Dark theme settings (OneDark)
│   ├── config-light.tape  # Light theme settings (Catppuccin Latte)
│   └── *.tmpl             # Template files used in demos
├── generate.sh            # Script to generate all GIFs
└── README.md              # This file
```

## Generate GIFs

### All Demos (Both Themes)

```bash
./generate.sh
```

### Specific Demos

```bash
./generate.sh basic templates
```

### Single Theme

```bash
./generate.sh -t dark      # Dark theme only
./generate.sh -t light     # Light theme only
./generate.sh -t all basic # Both themes, specific demo
```

### List Available Demos

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

## Themes

| Config File | Theme | Used For |
|-------------|-------|----------|
| `config.tape` | OneDark | Dark mode GIFs |
| `config-light.tape` | Catppuccin Latte | Light mode GIFs, README |

## Using GIFs

Generated GIFs are served directly by the website via 11ty passthrough copy. No manual copying needed.

- **Landing pages** — Uses both light and dark versions (theme-aware)
- **README** — Uses light version (GitHub has white background)

## Adding New Demos

1. Create a new `.tape` file in `fakedata/` with demo commands only
2. Add the demo name to the `DEMOS` array in `generate.sh`
3. Run `./generate.sh <demo-name>` to generate
