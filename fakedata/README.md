# FakeData

[![Go](https://img.shields.io/badge/Go-1.25.0-00ADD8?logo=go)](https://go.dev) [![License](https://img.shields.io/github/license/clubmatto/vetrina)](../LICENSE)

CLI tool to generate fake data rows for testing and development.

![FakeData basic usage](../assets/vhs/fakedata/basic-light.gif)

## Table of Contents

- [Install](#install)
- [Quick Start](#quick-start)
- [Generators](#generators)
- [Advanced Usage](#advanced-usage)
  - [Custom Generators](#custom-generators)
  - [Templates](#templates)
  - [Column Naming](#column-naming)
- [Shell Completion](#shell-completion)
- [Development](#development)
- [License](#license)

## Install

```bash
go install matto.club/vetrina/fakedata@latest
```

Or via Homebrew:

```bash
brew install clubmatto/tap/fakedata
```

## Quick Start

```bash
fakedata email country
```

Generate 5 rows with header:

```bash
fakedata -n 5 -H email country
```

CSV output:

```bash
fakedata -H -s "," email country
```

NDJSON output:

```bash
fakedata --format ndjson -n 3 email country
```

Streaming mode:

```bash
fakedata --stream email
```

Deterministic output:

```bash
fakedata --seed 42 email country
```

## Generators

Browse all 80+ generators interactively at [matto.club/vetrina/fakedata/#generators](https://matto.club/vetrina/fakedata/#generators).

### People
- `email`, `first_name`, `last_name`, `full_name`, `username`

### Geography
- `country`, `city`, `state`, `address`, `phone`

### Web & Network
- `url`, `domain_name`, `ipv4`, `ipv6`, `mac`

### Time
- `date`, `datetime`, `timestamp`, `time`, `epoch`

### Types & Data
- `int`, `float`, `boolean`, `uuid`, `json`

### Culture & Fun
- `programming_language`, `animal`, `dinosaur`, `fruit`, `tea`

### Planned
- `password`, `credit_card`, `iban`, `paragraph`

## Advanced Usage

### Custom Generators

```bash
# Integer between 10 and 20
fakedata int:10,20

# Pick from custom list
fakedata enum:red,green,blue

# Read from file (one value per line)
fakedata file:./data.txt

# Float with precision
fakedata float:8:2
```

### Templates

![FakeData templates](../assets/vhs/fakedata/custom-output-light.gif)

```bash
# Create a template file
cat > user.tmpl << 'EOF'
{"name": "{{.FirstName}} {{.LastName}}", "email": "{{.Email}}", "country": "{{.Country}}"}
EOF

# Use the template
fakedata -T user.tmpl -n 5
```

### Column Naming

```bash
# Name columns for header output
fakedata login:email count:int:1,100 status:enum:active,inactive
```

## Shell Completion

```bash
# Bash
fakedata -C bash > /etc/bash_completion.d/fakedata

# Zsh
fakedata -C zsh > /usr/local/share/zsh/site-functions/_fakedata

# Fish
fakedata -C fish > ~/.config/fish/completions/fakedata.fish
```

## Development

```bash
# Build
make

# Run tests
make test

# Run linter
make lint
```

## License

MIT
