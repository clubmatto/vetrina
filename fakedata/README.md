# FakeData

[![Go](https://img.shields.io/badge/Go-1.25.0-00ADD8?logo=go)](https://go.dev) [![License](https://img.shields.io/github/license/clubmatto/vetrina)](../LICENSE)

CLI tool to generate fake data rows for testing and development.

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="../assets/vhs/fakedata/basic-dark.gif">
  <img alt="FakeData basic usage" src="../assets/vhs/fakedata/basic-light.gif">
</picture>

## Table of Contents

- [Install](#install)
- [Quick Start](#quick-start)
- [Exploring Generators](#exploring-generators)
- [Column Spec](#column-spec)
- [Templates](#templates)
- [Advanced Features](#advanced-features)
- [Shell Completion](#shell-completion)
- [Development](#development)
- [License](#license)

## Install

```bash
go install matto.club/vetrina/fakedata@latest
```

Or via Homebrew:

```bash
brew tap clubmatto/vetrina https://github.com/clubmatto/vetrina
brew install clubmatto/vetrina/fakedata
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

## Exploring Generators

List all available generators:

```bash
fakedata --generators
```

Show details and sample output for a specific generator:

```bash
fakedata -g email
fakedata -g int
fakedata -g polygon
```

Custom generators (those accepting options) are marked with `*` in the list.

Use country-specific generators by appending the 2-letter country code:

```bash
fakedata phone_it city_de phone_jp
```

> TODO: add `--browse` GIF here once the interactive TUI browser is implemented

## Column Spec

The column spec syntax is `[name:][generator[:options]]`:

| Spec | Meaning |
|------|---------|
| `email` | Column "email" using email generator |
| `int:10,20` | Column "int" using int generator, range 10-20 |
| `login:email` | Column "login" using email generator |
| `count:int:10,20` | Column "count" using int generator, range 10-20 |

The parser disambiguates 2-part specs: if the first part is a known generator and the second is not, both are treated as generator and options (e.g. `int:10,20`). Otherwise the first part is the column name and the second is the generator (e.g. `login:email`).

Custom generators and their option formats:

| Generator | Options | Example | Default |
|-----------|---------|---------|---------|
| `int` | `min,max` | `int:10,20` | `0,1000` |
| `float` | `precision,scale` | `float:6,2` | normal distribution, 4 decimals |
| `enum` | `v1,v2,...` | `enum:red,green,blue` | `foo,bar,baz` |
| `file` | path | `file:./names.txt` | required |
| `date` | `min,max` (YYYY-MM-DD) | `date:2024-01-01,2024-12-31` | last 365 days |
| `datetime` | `min,max` (YYYY-MM-DD) | `datetime:2024-01-01,` | last year, output YYYY-MM-DD HH:MM:SS |
| `timestamp` | `min,max` (YYYY-MM-DD) | `timestamp:2024-01-01,` | last year, output RFC3339Nano |
| `phone_number` | digit count | `phone_number:10` | 8 digits |

## Templates

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="../assets/vhs/fakedata/custom-output-dark.gif">
  <img alt="FakeData templates" src="../assets/vhs/fakedata/custom-output-light.gif">
</picture>

Templates let you define custom output layouts. Pass a `.tmpl` file with `-T` or pipe a template via stdin.

Generator names use CamelCase in templates — for example `first_name` becomes `{{FirstName}}`, `country_code` becomes `{{CountryCode}}`.

### Template File

```bash
cat > user.tmpl << 'EOF'
{"name": "{{FirstName}} {{LastName}}", "email": "{{Email}}", "country": "{{Country}}"}
EOF

fakedata -T user.tmpl -n 5
```

### Pipe Mode

```bash
echo '{{FirstName}} {{LastName}} <{{Email}}>' | fakedata -n 5
```

### Template Functions

Built-in functions for control flow:

| Function | Description | Example |
|----------|-------------|---------|
| `Loop` | Returns slice `[0..n)` for iteration | `{{range $i := Loop 5}}...{{end}}` |
| `Loop min,max` | Random count between min and max | `{{range $i := Loop 1 5}}...{{end}}` |
| `Odd i` | True if i is odd | `{{if Odd $i}}...{{end}}` |
| `Even i` | True if i is even | `{{if Even $i}}...{{end}}` |
| `Int a,b` | Random integer in range | `{{Int 10 20}}` |
| `Enum a,b,c` | Random value from list | `{{Enum "red" "green" "blue"}}` |
| `File path` | Random line from file | `{{File "names.txt"}}` |
| `Date min,max` | Random date | `{{Date "2024-01-01" "2024-12-31"}}` |

### Generator Names in Templates

Every non-custom generator is available as a template function using CamelCase:

| CLI name | Template function |
|----------|-------------------|
| `first_name` | `{{FirstName}}` |
| `last_name` | `{{LastName}}` |
| `country_code` | `{{CountryCode}}` |
| `programming_language` | `{{ProgrammingLanguage}}` |

### Examples

**CSV row over 5 iterations:**

```go
{{range $i := Loop 5}}{{$i}},{{FirstName}},{{Email}},{{Country}}
{{end}}
```

**JSON lines:**

```go
{{range $i := Loop 3}}{"name":"{{FirstName}}","email":"{{Email}}"}
{{end}}
```

**Markdown table:**

```go
| Name | Email | Country |
|------|-------|---------|
{{range $i := Loop 5}}| {{FirstName}} {{LastName}} | {{Email}} | {{Country}} |
{{end}}
```

## Advanced Features

### Country-Specific Generators

Country-specific generators are hidden by default but usable in column specs. They filter data to a specific country using 2-letter codes (lowercase):

```bash
fakedata phone_it city_de
fakedata state_de city_it phone_jp
fakedata phone_us city_gb
```

Available variants: `city_<cc>`, `state_<cc>`, `phone_<cc>` (where `<cc>` is any lowercase 2-letter country code from the dataset).

### Ordered Column Pairs

When two columns follow start/end naming conventions, the generated values are automatically ordered so the start always comes before the end. The mechanism is purely lexicographic — any generator works, not just dates.

```bash
fakedata -H start_date:date end_date:date
fakedata -H begin_at:timestamp finish_at:timestamp
fakedata -H date_from:date date_to:date
fakedata -H departure:date arrival:date
fakedata -H created_at:date updated_at:date
```

Recognized start variants: `start_`, `begin_`, `departure`, `opening`, `opened`, `created`, `_from` suffix.  
Recognized end variants: `end_`, `finish_`, `arrival`, `closing`, `closed`, `updated`, `_to`, `_until` suffix.  
The pair is matched by the shared base name (e.g. `start_date` and `end_date` both have base `date`). If the end value is lexicographically smaller than the start value, they are swapped.

### Deterministic Seeding

```bash
# Same seed always produces the same output
fakedata --seed 42 -n 3 email country
fakedata --seed 42 -n 3 email country
```

### Streaming

```bash
# Generate rows indefinitely (Ctrl+C to stop)
fakedata --stream email

# Combine with template
echo '{{.Email}}' | fakedata --stream
```

### Output Formats

| Flag | Format | Example |
|------|--------|---------|
| (default) | Tab-separated columns | `fakedata email country` |
| `-s ","` | Custom separator (CSV) | `fakedata -H -s "," email country` |
| `--format ndjson` | Newline-delimited JSON | `fakedata --format ndjson -n 3 email country` |

PostgreSQL-compatible generators (usable in column mode or templates):

| Generator | Description | Example output |
|-----------|-------------|----------------|
| `json` | JSON object | `{"key": "foo", "value": 42}` |
| `jsonb_array` | JSONB array | `[{"id": 42, "active": true}]` |
| `pg_array_int` | PostgreSQL integer array | `{1,2,3}` |
| `pg_array_text` | PostgreSQL text array | `{"foo","bar"}` |

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

# Run unit + integration tests
make test

# Unit tests only
make unit

# Integration tests only
make integration

# Combined coverage report
make coverage

# Benchmarks
make bench

# Lint
make lint

# Import data sources
make import
```

### Data Sources

The import tool (`tools/import/`) pulls from three sources:

- [dariusk/corpora](https://github.com/dariusk/corpora) — names, animals, food, culture
- [dr5hn/world](https://github.com/dr5hn/countries-states-cities-database) — countries, states, cities, timezones
- [sigpwned/names](https://github.com/sigpwned/names) — first/last name frequencies per country

Data is pre-processed into Go source files under `data/`. Run `make import` to refresh.

### Adding a Generator

1. Add a function in the appropriate `core/<category>.go`
2. Call `r.Register(Generator{Name, Desc, Func})` in the category's `register*` function
3. The generator becomes available in column specs, templates (as CamelCase), and `--generators`
4. To accept options, set `CustomFunc` instead of `Func`

## License

MIT
