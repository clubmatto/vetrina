# FakeData

CLI tool to generate fake data rows for testing and development.

## Features

- **80+ generators**: email, names, addresses, UUIDs, dates, JSON, and more
- **Multiple formats**: Tab-separated, CSV, NDJSON
- **Streaming**: Generate data indefinitely for load testing
- **Templates**: Custom output with Go templates
- **Deterministic**: Seed for reproducible results
- **Shell completion**: Bash, zsh, fish support
- **Zero config**: No setup required, just name the columns you need

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
# Basic usage
fakedata email country

# Generate 5 rows with header
fakedata -n 5 -H email country

# CSV output
fakedata -H -s "," email country

# NDJSON output
fakedata --format ndjson -n 3 email country

# Streaming mode
fakedata --stream email

# Deterministic output
fakedata --seed 42 email country
```

## Demos

### Basic Usage

![FakeData basic usage](../assets/vhs/fakedata/basic-light.gif)

### Templates

![FakeData templates](../assets/vhs/fakedata/templates-light.gif)

## Generators

### People
- `email`, `first_name`, `last_name`, `full_name`
- `username`, `slug`, `hex`, `hex_color`

### Geography
- `country`, `country_code`, `city`, `state`, `address`
- `latitude`, `longitude`, `timezone`, `capital`
- `phone`, `phone_number`, `nationality`

### Web & Network
- `url`, `domain_name`, `tld`, `company`
- `ipv4`, `ipv6`, `mac`, `http_method`

### Time
- `date`, `datetime`, `timestamp`, `time`, `epoch`

### Types & Data
- `int`, `float`, `boolean`, `enum`, `file`
- `json`, `jsonb_array`, `uuid`, `uuidv1`, `uuidv4`, `uuidv6`, `uuidv7`

### Culture & Fun
- `programming_language`, `job_title`, `sport`, `music_genre`
- `animal`, `cat`, `dog`, `dinosaur`, `fish`, `flower`
- `fruit`, `vegetable`, `tea`, `spice`

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

## Generating Demos

GIF demos are generated with [VHS](https://github.com/charmbracelet/vhs). See [`assets/vhs/fakedata/`](../assets/vhs/fakedata/) for tape files.

```bash
# Generate all demos (dark and light themes)
cd assets/vhs/fakedata
for tape in *.tape; do vhs "$tape"; done
```

## License

MIT
